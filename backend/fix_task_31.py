#!/usr/bin/env python
"""
Direct database fix for problematic tasks.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'task_management.settings')
django.setup()

from tasks.models import Task

def fix_problematic_tasks():
    """Fix tasks that are causing 400 errors."""
    
    print("Fixing problematic tasks...")
    
    # Get task 31 specifically
    try:
        task_31 = Task.objects.get(id=31)
        print(f"Task 31 before fix:")
        print(f"  ID: {task_31.id}")
        print(f"  Title: {task_31.title}")
        print(f"  Priority: {task_31.priority} (type: {type(task_31.priority)})")
        print(f"  Estimated Hours: {task_31.estimated_hours} (type: {type(task_31.estimated_hours)})")
        print(f"  Status: {task_31.status}")
        
        # Fix the data
        if task_31.priority is None or not (1 <= task_31.priority <= 5):
            task_31.priority = 3
            print("  Fixed priority to 3")
            
        if task_31.estimated_hours is None or task_31.estimated_hours <= 0:
            task_31.estimated_hours = 8
            print("  Fixed estimated_hours to 8")
            
        task_31.save()
        print("  Task 31 saved successfully!")
        
    except Task.DoesNotExist:
        print("Task 31 not found")
    except Exception as e:
        print(f"Error fixing task 31: {e}")
    
    # Fix all tasks with problematic data
    print("\nFixing all tasks with null/invalid data...")
    
    # Fix null priorities
    null_priority_tasks = Task.objects.filter(priority__isnull=True)
    count = null_priority_tasks.update(priority=3)
    print(f"Fixed {count} tasks with null priority")
    
    # Fix invalid priorities
    invalid_priority_tasks = Task.objects.exclude(priority__in=[1, 2, 3, 4, 5])
    count = invalid_priority_tasks.update(priority=3)
    print(f"Fixed {count} tasks with invalid priority")
    
    # Fix null estimated_hours
    null_hours_tasks = Task.objects.filter(estimated_hours__isnull=True)
    count = null_hours_tasks.update(estimated_hours=8)
    print(f"Fixed {count} tasks with null estimated_hours")
    
    # Fix invalid estimated_hours
    invalid_hours_tasks = Task.objects.filter(estimated_hours__lte=0)
    count = invalid_hours_tasks.update(estimated_hours=8)
    print(f"Fixed {count} tasks with invalid estimated_hours")
    
    print("\nAll tasks fixed!")
    
    # Show current state of all tasks
    print("\nCurrent task data:")
    for task in Task.objects.all():
        print(f"Task {task.id}: priority={task.priority}, hours={task.estimated_hours}, status={task.status}")

if __name__ == '__main__':
    fix_problematic_tasks()