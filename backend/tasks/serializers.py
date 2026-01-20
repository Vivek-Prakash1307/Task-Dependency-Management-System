"""
Serializers for the tasks API.
"""
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Task, TaskDependency, TaskStatus


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model."""
    
    dependencies = serializers.SerializerMethodField()
    dependents = serializers.SerializerMethodField()
    can_start = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'version',
            'created_at', 'updated_at', 'dependencies', 
            'dependents', 'can_start', 'is_blocked'
        ]
        read_only_fields = ['created_at', 'updated_at', 'can_start', 'is_blocked', 'version']

    def get_dependencies(self, obj):
        """Get list of tasks this task depends on."""
        return [
            {
                'id': dep.id,
                'title': dep.title,
                'status': dep.status
            }
            for dep in obj.get_dependencies()
        ]

    def get_dependents(self, obj):
        """Get list of tasks that depend on this task."""
        return [
            {
                'id': dep.id,
                'title': dep.title,
                'status': dep.status
            }
            for dep in obj.get_dependents()
        ]

    def get_can_start(self, obj):
        """Check if task can start."""
        return obj.can_start()

    def get_is_blocked(self, obj):
        """Check if task is blocked."""
        return obj.is_blocked()

    def validate_status(self, value):
        """Validate status transitions."""
        if self.instance:
            old_status = self.instance.status
            
            # Prevent invalid status transitions
            if old_status == TaskStatus.COMPLETED and value != TaskStatus.COMPLETED:
                raise serializers.ValidationError(
                    "Cannot change status of a completed task."
                )
                
            # Allow manual status changes but warn about dependencies
            # Users should be able to set in_progress even with incomplete dependencies
            # The automatic status update logic will handle the rest
                
        return value


class TaskDependencySerializer(serializers.ModelSerializer):
    """Serializer for TaskDependency model."""
    
    task_title = serializers.CharField(source='task.title', read_only=True)
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)

    class Meta:
        model = TaskDependency
        fields = [
            'id', 'task', 'depends_on', 'created_at',
            'task_title', 'depends_on_title'
        ]
        read_only_fields = ['created_at']

    def validate(self, data):
        """Validate the dependency relationship."""
        task = data.get('task')
        depends_on = data.get('depends_on')
        
        if task == depends_on:
            raise serializers.ValidationError(
                "A task cannot depend on itself."
            )
        
        # Check if dependency already exists
        if TaskDependency.objects.filter(task=task, depends_on=depends_on).exists():
            raise serializers.ValidationError(
                "This dependency already exists."
            )
        
        # Create a temporary dependency to check for circular dependencies
        temp_dependency = TaskDependency(task=task, depends_on=depends_on)
        cycle_path = temp_dependency.detect_circular_dependency()
        
        if cycle_path:
            raise serializers.ValidationError({
                'error': 'Circular dependency detected',
                'path': cycle_path
            })
        
        return data


class AddDependencySerializer(serializers.Serializer):
    """Serializer for adding a dependency to a task."""
    
    depends_on_id = serializers.IntegerField()

    def validate_depends_on_id(self, value):
        """Validate that the dependency task exists."""
        try:
            Task.objects.get(id=value)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task does not exist.")
        return value

    def validate(self, data):
        """Validate the dependency relationship."""
        task_id = self.context['task_id']
        depends_on_id = data['depends_on_id']
        
        if task_id == depends_on_id:
            raise serializers.ValidationError(
                "A task cannot depend on itself."
            )
        
        # Check if dependency already exists
        if TaskDependency.objects.filter(
            task_id=task_id, 
            depends_on_id=depends_on_id
        ).exists():
            raise serializers.ValidationError(
                "This dependency already exists."
            )
        
        return data


class TaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for task lists."""
    
    dependency_count = serializers.SerializerMethodField()
    dependent_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 
            'created_at', 'updated_at', 'dependency_count', 'dependent_count'
        ]

    def get_dependency_count(self, obj):
        """Get count of dependencies."""
        return obj.dependencies.count()

    def get_dependent_count(self, obj):
        """Get count of dependents."""
        return obj.dependent_tasks.count()


class DependencyGraphSerializer(serializers.Serializer):
    """Serializer for dependency graph data."""
    
    nodes = serializers.ListField(child=serializers.DictField())
    edges = serializers.ListField(child=serializers.DictField())
    
    def to_representation(self, instance):
        """Convert tasks and dependencies to graph format."""
        tasks = Task.objects.all()
        dependencies = TaskDependency.objects.select_related('task', 'depends_on').all()
        
        # Create nodes
        nodes = []
        for task in tasks:
            nodes.append({
                'id': task.id,
                'title': task.title,
                'status': task.status,
                'x': 0,  # Will be calculated by frontend layout
                'y': 0,  # Will be calculated by frontend layout
            })
        
        # Create edges
        edges = []
        for dep in dependencies:
            edges.append({
                'id': dep.id,
                'source': dep.depends_on_id,
                'target': dep.task_id,
            })
        
        return {
            'nodes': nodes,
            'edges': edges
        }