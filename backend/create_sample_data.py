#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_management.settings')
django.setup()

from tasks.models import Task, TaskDependency

def create_sample_data():
    """Create sample tasks and dependencies for demonstration."""
    
    # Clear existing data
    TaskDependency.objects.all().delete()
    Task.objects.all().delete()
    
    # Create sample tasks
    tasks = []
    
    # Project setup tasks
    task1 = Task.objects.create(
        title="Setup Development Environment",
        description="Install Python, Django, and required dependencies",
        status="completed"
    )
    tasks.append(task1)
    
    task2 = Task.objects.create(
        title="Design Database Schema",
        description="Create ERD and define table relationships",
        status="completed"
    )
    tasks.append(task2)
    
    task3 = Task.objects.create(
        title="Implement User Authentication",
        description="Create login, registration, and session management",
        status="in_progress"
    )
    tasks.append(task3)
    
    task4 = Task.objects.create(
        title="Create Task Management API",
        description="Build REST API endpoints for task CRUD operations",
        status="pending"
    )
    tasks.append(task4)
    
    task5 = Task.objects.create(
        title="Implement Dependency Logic",
        description="Add circular dependency detection and status propagation",
        status="pending"
    )
    tasks.append(task5)
    
    task6 = Task.objects.create(
        title="Build Frontend Components",
        description="Create React components for task management UI",
        status="pending"
    )
    tasks.append(task6)
    
    task7 = Task.objects.create(
        title="Add Graph Visualization",
        description="Implement Canvas-based dependency graph",
        status="pending"
    )
    tasks.append(task7)
    
    task8 = Task.objects.create(
        title="Write Unit Tests",
        description="Create comprehensive test suite for backend and frontend",
        status="pending"
    )
    tasks.append(task8)
    
    task9 = Task.objects.create(
        title="Deploy to Production",
        description="Setup production environment and deploy application",
        status="pending"
    )
    tasks.append(task9)
    
    task10 = Task.objects.create(
        title="User Documentation",
        description="Write user manual and API documentation",
        status="pending"
    )
    tasks.append(task10)
    
    # Create dependencies
    dependencies = [
        (task3, task1),  # Auth depends on setup
        (task3, task2),  # Auth depends on schema
        (task4, task2),  # API depends on schema
        (task4, task3),  # API depends on auth
        (task5, task4),  # Dependency logic depends on API
        (task6, task3),  # Frontend depends on auth
        (task6, task4),  # Frontend depends on API
        (task7, task6),  # Graph depends on frontend
        (task7, task5),  # Graph depends on dependency logic
        (task8, task5),  # Tests depend on dependency logic
        (task8, task7),  # Tests depend on graph
        (task9, task8),  # Deploy depends on tests
        (task10, task9), # Documentation depends on deploy
    ]
    
    for task, depends_on in dependencies:
        TaskDependency.objects.create(task=task, depends_on=depends_on)
    
    print(f"Created {len(tasks)} tasks and {len(dependencies)} dependencies")
    
    # Update task statuses based on dependencies
    for task in Task.objects.all():
        task.update_status_based_on_dependencies()
    
    print("Sample data created successfully!")
    print("\nTask Status Summary:")
    for status in ['pending', 'in_progress', 'completed', 'blocked']:
        count = Task.objects.filter(status=status).count()
        print(f"  {status.replace('_', ' ').title()}: {count}")

if __name__ == '__main__':
    create_sample_data()