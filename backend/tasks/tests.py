"""
Tests for the tasks application.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Task, TaskDependency, TaskStatus


class TaskModelTest(TestCase):
    """Test cases for Task model."""

    def setUp(self):
        """Set up test data."""
        self.task1 = Task.objects.create(
            title="Task 1",
            description="First task"
        )
        self.task2 = Task.objects.create(
            title="Task 2",
            description="Second task"
        )

    def test_task_creation(self):
        """Test task creation with default values."""
        self.assertEqual(self.task1.status, TaskStatus.PENDING)
        self.assertEqual(str(self.task1), "Task 1 (Pending)")

    def test_can_start_no_dependencies(self):
        """Test task can start when it has no dependencies."""
        self.assertTrue(self.task1.can_start())

    def test_can_start_with_completed_dependencies(self):
        """Test task can start when all dependencies are completed."""
        self.task2.status = TaskStatus.COMPLETED
        self.task2.save()
        
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        self.assertTrue(self.task1.can_start())

    def test_cannot_start_with_incomplete_dependencies(self):
        """Test task cannot start when dependencies are incomplete."""
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        self.assertFalse(self.task1.can_start())

    def test_is_blocked(self):
        """Test task is blocked when dependency is blocked."""
        self.task2.status = TaskStatus.BLOCKED
        self.task2.save()
        
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        self.assertTrue(self.task1.is_blocked())


class TaskDependencyModelTest(TestCase):
    """Test cases for TaskDependency model."""

    def setUp(self):
        """Set up test data."""
        self.task1 = Task.objects.create(title="Task 1")
        self.task2 = Task.objects.create(title="Task 2")
        self.task3 = Task.objects.create(title="Task 3")

    def test_dependency_creation(self):
        """Test dependency creation."""
        dep = TaskDependency.objects.create(
            task=self.task1,
            depends_on=self.task2
        )
        self.assertEqual(str(dep), "Task 1 depends on Task 2")

    def test_self_dependency_validation(self):
        """Test that self-dependency is prevented."""
        dep = TaskDependency(task=self.task1, depends_on=self.task1)
        with self.assertRaises(ValidationError):
            dep.full_clean()

    def test_circular_dependency_detection(self):
        """Test circular dependency detection."""
        # Create: task1 -> task2 -> task3
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        TaskDependency.objects.create(task=self.task2, depends_on=self.task3)
        
        # Try to create: task3 -> task1 (creates cycle)
        dep = TaskDependency(task=self.task3, depends_on=self.task1)
        cycle_path = dep.detect_circular_dependency()
        
        self.assertIsNotNone(cycle_path)
        self.assertIn(self.task1.id, cycle_path)
        self.assertIn(self.task3.id, cycle_path)

    def test_no_circular_dependency(self):
        """Test that valid dependencies don't trigger cycle detection."""
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        
        dep = TaskDependency(task=self.task3, depends_on=self.task2)
        cycle_path = dep.detect_circular_dependency()
        
        self.assertIsNone(cycle_path)


class TaskAPITest(APITestCase):
    """Test cases for Task API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.task1 = Task.objects.create(
            title="Task 1",
            description="First task"
        )
        self.task2 = Task.objects.create(
            title="Task 2",
            description="Second task"
        )

    def test_list_tasks(self):
        """Test listing all tasks."""
        url = '/api/tasks/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_create_task(self):
        """Test creating a new task."""
        url = '/api/tasks/'
        data = {
            'title': 'New Task',
            'description': 'A new task'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Task')
        self.assertEqual(response.data['status'], 'pending')

    def test_update_task(self):
        """Test updating a task."""
        url = f'/api/tasks/{self.task1.id}/'
        data = {
            'title': 'Updated Task',
            'status': 'in_progress'
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Task')
        self.assertEqual(response.data['status'], 'in_progress')

    def test_delete_task(self):
        """Test deleting a task."""
        url = f'/api/tasks/{self.task1.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=self.task1.id).exists())

    def test_add_dependency(self):
        """Test adding a dependency to a task."""
        url = f'/api/tasks/{self.task1.id}/add_dependency/'
        data = {'depends_on_id': self.task2.id}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            TaskDependency.objects.filter(
                task=self.task1,
                depends_on=self.task2
            ).exists()
        )

    def test_add_circular_dependency(self):
        """Test that circular dependencies are rejected."""
        # Create task1 -> task2
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        
        # Try to create task2 -> task1 (circular)
        url = f'/api/tasks/{self.task2.id}/add_dependency/'
        data = {'depends_on_id': self.task1.id}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_get_dependency_graph(self):
        """Test getting dependency graph data."""
        TaskDependency.objects.create(task=self.task1, depends_on=self.task2)
        
        url = '/api/tasks/graph/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('nodes', response.data)
        self.assertIn('edges', response.data)
        self.assertEqual(len(response.data['nodes']), 2)
        self.assertEqual(len(response.data['edges']), 1)

    def test_get_task_stats(self):
        """Test getting task statistics."""
        url = '/api/tasks/stats/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('pending', response.data)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['pending'], 2)