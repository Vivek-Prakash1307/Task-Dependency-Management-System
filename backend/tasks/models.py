"""
Task and TaskDependency models for the task management system.
"""
from django.db import models, transaction
from django.core.exceptions import ValidationError
from typing import List, Set, Dict, Optional


class TaskPriority(models.IntegerChoices):
    """Task priority choices (1-5, where 5 is highest priority)."""
    LOW = 1, 'Low (1)'
    MEDIUM_LOW = 2, 'Medium-Low (2)'
    MEDIUM = 3, 'Medium (3)'
    MEDIUM_HIGH = 4, 'Medium-High (4)'
    HIGH = 5, 'High (5)'


class TaskStatus(models.TextChoices):
    """Task status choices."""
    PENDING = 'pending', 'Pending'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    BLOCKED = 'blocked', 'Blocked'


class Task(models.Model):
    """
    Task model representing a single task in the system.
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING
    )
    priority = models.IntegerField(
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
        help_text="Task priority from 1 (Low) to 5 (High)"
    )
    estimated_hours = models.PositiveIntegerField(
        default=8,
        help_text="Estimated hours to complete this task"
    )
    version = models.PositiveIntegerField(default=1)  # For optimistic locking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def get_dependencies(self) -> List['Task']:
        """Get all tasks this task depends on."""
        return [dep.depends_on for dep in self.dependencies.all()]

    def get_dependents(self) -> List['Task']:
        """Get all tasks that depend on this task."""
        return [dep.task for dep in self.dependent_tasks.all()]

    def can_start(self) -> bool:
        """Check if task can start (all dependencies completed)."""
        dependencies = self.get_dependencies()
        if not dependencies:
            return True
        return all(dep.status == TaskStatus.COMPLETED for dep in dependencies)

    def get_estimated_completion_time(self) -> dict:
        """
        Calculate estimated completion time based on dependencies.
        Returns dict with total_hours and critical_path.
        """
        if self.status == TaskStatus.COMPLETED:
            return {
                'total_hours': 0,
                'critical_path': [self.id],
                'can_start_immediately': True
            }
        
        # Build dependency graph
        visited = set()
        
        def calculate_path_time(task_id: int) -> tuple:
            """Returns (max_hours_to_completion, critical_path)"""
            if task_id in visited:
                return (0, [])  # Avoid cycles
            
            visited.add(task_id)
            
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                return (0, [])
            
            if task.status == TaskStatus.COMPLETED:
                return (0, [])
            
            # Get dependencies
            dependencies = task.get_dependencies()
            
            if not dependencies:
                # No dependencies, just this task's time
                return (task.estimated_hours, [task_id])
            
            # Find the longest dependency path
            max_dep_time = 0
            critical_dep_path = []
            
            for dep in dependencies:
                if dep.status != TaskStatus.COMPLETED:
                    dep_time, dep_path = calculate_path_time(dep.id)
                    if dep_time > max_dep_time:
                        max_dep_time = dep_time
                        critical_dep_path = dep_path
            
            # Add this task's time to the critical path
            total_time = max_dep_time + task.estimated_hours
            full_path = critical_dep_path + [task_id]
            
            return (total_time, full_path)
        
        total_hours, critical_path = calculate_path_time(self.id)
        
        return {
            'total_hours': total_hours,
            'critical_path': critical_path,
            'can_start_immediately': self.can_start()
        }

    def is_blocked(self) -> bool:
        """Check if task is blocked by any dependency."""
        dependencies = self.get_dependencies()
        return any(dep.status == TaskStatus.BLOCKED for dep in dependencies)

    def update_status_based_on_dependencies(self) -> bool:
        """
        Update task status based on dependency states.
        Returns True if status was changed.
        
        Status Update Rules:
        - If ALL dependencies are 'completed' → set status to 'in_progress' (ready to work)
        - If ANY dependency is 'blocked' → set status to 'blocked'
        - If dependencies exist but not all completed → status remains 'pending'
        """
        old_status = self.status
        
        if self.status == TaskStatus.COMPLETED:
            # Don't change completed tasks
            return False
            
        # Rule 2: If ANY dependency is 'blocked' → set status to 'blocked'
        if self.is_blocked():
            self.status = TaskStatus.BLOCKED
        # Rule 1: If ALL dependencies are 'completed' → set status to 'in_progress'
        elif self.can_start():
            # Only auto-promote to in_progress if currently pending or blocked
            if self.status in [TaskStatus.PENDING, TaskStatus.BLOCKED]:
                self.status = TaskStatus.IN_PROGRESS
        # Rule 3: If dependencies exist but not all completed → status remains 'pending'
        else:
            dependencies = self.get_dependencies()
            if dependencies and self.status == TaskStatus.IN_PROGRESS:
                # Demote from in_progress to pending if dependencies are no longer satisfied
                self.status = TaskStatus.PENDING
            
        if old_status != self.status:
            self.save(update_fields=['status', 'updated_at'])
            return True
        return False

    def save(self, *args, **kwargs):
        """Override save to handle version control and status propagation."""
        is_new = self.pk is None
        old_status = None
        
        if not is_new:
            # Check for concurrent modifications
            expected_version = getattr(self, '_expected_version', None)
            if expected_version is not None:
                current_task = Task.objects.filter(pk=self.pk, version=expected_version).first()
                if not current_task:
                    from django.core.exceptions import ValidationError
                    raise ValidationError(
                        "This task was modified by another user. Please refresh and try again.",
                        code='concurrent_modification'
                    )
            
            # Get old status for propagation
            old_instance = Task.objects.get(pk=self.pk)
            old_status = old_instance.status
            
            # Increment version on update
            self.version += 1
            
        super().save(*args, **kwargs)
        
        # Temporarily disable automatic status propagation to avoid interference
        # with manual updates. Users should have full control over task status.
        # if not is_new and old_status != self.status:
        #     self.propagate_status_update()

    def propagate_status_update(self):
        """
        Propagate status changes to dependent tasks recursively.
        """
        dependents = self.get_dependents()
        for dependent in dependents:
            if dependent.update_status_based_on_dependencies():
                # Recursively update dependents if status changed
                dependent.propagate_status_update()

    def update_with_version_check(self, **fields):
        """Update task with version checking for concurrent modification detection."""
        if 'version' in fields:
            self._expected_version = fields.pop('version')
        
        for field, value in fields.items():
            setattr(self, field, value)
        
        self.save()


class TaskDependency(models.Model):
    """
    TaskDependency model representing dependency relationships between tasks.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependencies'
    )
    depends_on = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependent_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_dependencies'
        unique_together = ['task', 'depends_on']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['depends_on']),
        ]

    def __str__(self):
        return f"{self.task.title} depends on {self.depends_on.title}"

    def clean(self):
        """Validate the dependency relationship."""
        if self.task_id == self.depends_on_id:
            raise ValidationError("A task cannot depend on itself.")
        
        # Check for circular dependencies
        cycle_path = self.detect_circular_dependency()
        if cycle_path:
            raise ValidationError(
                f"Circular dependency detected: {' -> '.join(map(str, cycle_path))}"
            )

    def save(self, *args, **kwargs):
        """Override save to validate and update task status."""
        self.full_clean()
        
        with transaction.atomic():
            super().save(*args, **kwargs)
            # Update the task status based on new dependency
            self.task.update_status_based_on_dependencies()

    def detect_circular_dependency(self) -> Optional[List[int]]:
        """
        Detect circular dependencies using DFS.
        Returns the cycle path if found, None otherwise.
        
        Time Complexity: O(V + E) where V is tasks, E is dependencies
        Space Complexity: O(V) for recursion stack and visited set
        """
        if not self.task_id or not self.depends_on_id:
            return None
            
        # Build adjacency list for the graph including the new dependency
        graph = self._build_dependency_graph()
        
        # Add the new dependency to the graph
        if self.task_id not in graph:
            graph[self.task_id] = set()
        graph[self.task_id].add(self.depends_on_id)
        
        # Use DFS to detect cycles
        visited = set()
        rec_stack = set()
        path = []
        
        def dfs(node: int) -> Optional[List[int]]:
            """DFS helper function to detect cycles."""
            if node in rec_stack:
                # Found a cycle, return the cycle path
                cycle_start = path.index(node)
                return path[cycle_start:] + [node]
            
            if node in visited:
                return None
                
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            # Visit all neighbors
            for neighbor in graph.get(node, []):
                cycle = dfs(neighbor)
                if cycle:
                    return cycle
            
            rec_stack.remove(node)
            path.pop()
            return None
        
        # Check for cycles starting from the task
        return dfs(self.task_id)

    def _build_dependency_graph(self) -> Dict[int, Set[int]]:
        """Build adjacency list representation of the dependency graph."""
        graph = {}
        
        # Get all existing dependencies
        dependencies = TaskDependency.objects.all()
        
        for dep in dependencies:
            if dep.task_id not in graph:
                graph[dep.task_id] = set()
            graph[dep.task_id].add(dep.depends_on_id)
            
        return graph

    @classmethod
    def get_dependency_graph(cls) -> Dict[int, List[int]]:
        """
        Get the complete dependency graph as adjacency list.
        Used by the frontend for visualization.
        """
        graph = {}
        dependencies = cls.objects.select_related('task', 'depends_on').all()
        
        for dep in dependencies:
            if dep.task_id not in graph:
                graph[dep.task_id] = []
            graph[dep.task_id].append(dep.depends_on_id)
            
        return graph