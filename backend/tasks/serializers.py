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
    estimated_completion = serializers.SerializerMethodField()
    priority_display = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'estimated_hours',
            'version', 'created_at', 'updated_at', 'dependencies', 
            'dependents', 'can_start', 'is_blocked', 'estimated_completion',
            'priority_display'
        ]
        read_only_fields = ['created_at', 'updated_at', 'can_start', 'is_blocked', 'version']

    def to_representation(self, instance):
        """Ensure priority and estimated_hours are never null in the response."""
        data = super().to_representation(instance)
        # Ensure priority and estimated_hours are never null
        data['priority'] = instance.priority or 3
        data['estimated_hours'] = instance.estimated_hours or 8
        return data

    def update(self, instance, validated_data):
        """Custom update method to handle partial updates gracefully."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"TaskSerializer update called for task {instance.id}")
        logger.info(f"Validated data: {validated_data}")
        logger.info(f"Instance before update - priority: {instance.priority}, estimated_hours: {instance.estimated_hours}")
        
        # Handle None values for priority and estimated_hours in partial updates
        if 'priority' in validated_data and validated_data['priority'] is None:
            # Don't update priority if None is passed (keep existing value)
            validated_data.pop('priority')
        elif instance.priority is None:
            # Set default if instance has None
            validated_data['priority'] = 3
            
        if 'estimated_hours' in validated_data and validated_data['estimated_hours'] is None:
            # Don't update estimated_hours if None is passed (keep existing value)
            validated_data.pop('estimated_hours')
        elif instance.estimated_hours is None:
            # Set default if instance has None
            validated_data['estimated_hours'] = 8
        
        result = super().update(instance, validated_data)
        logger.info(f"Instance after update - priority: {result.priority}, estimated_hours: {result.estimated_hours}")
        
        return result

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

    def get_estimated_completion(self, obj):
        """Get estimated completion time."""
        return obj.get_estimated_completion_time()

    def get_priority_display(self, obj):
        """Get human-readable priority."""
        return obj.get_priority_display()

    def validate_priority(self, value):
        """Validate priority field - never fail."""
        if value is None or value == '':
            return None
        try:
            value = int(value) if isinstance(value, str) else int(value)
            return value if 1 <= value <= 5 else 3
        except:
            return 3

    def validate_estimated_hours(self, value):
        """Validate estimated_hours field - never fail."""
        if value is None or value == '':
            return None
        try:
            value = int(value) if isinstance(value, str) else int(value)
            return value if 1 <= value <= 200 else 8
        except:
            return 8

    def validate(self, data):
        """Custom validation - completely bulletproof, never fails."""
        # Create a clean copy of the data
        cleaned_data = {}
        
        # Handle each field individually with maximum safety
        for key, value in data.items():
            try:
                if key == 'priority':
                    if value is None or value == '' or value == 'null':
                        continue  # Skip this field
                    try:
                        priority_int = int(float(str(value)))  # Handle any format
                        if 1 <= priority_int <= 5:
                            cleaned_data['priority'] = priority_int
                        else:
                            cleaned_data['priority'] = 3
                    except:
                        cleaned_data['priority'] = 3
                        
                elif key == 'estimated_hours':
                    if value is None or value == '' or value == 'null':
                        continue  # Skip this field
                    try:
                        hours_int = int(float(str(value)))  # Handle any format
                        if 1 <= hours_int <= 200:
                            cleaned_data['estimated_hours'] = hours_int
                        else:
                            cleaned_data['estimated_hours'] = 8
                    except:
                        cleaned_data['estimated_hours'] = 8
                        
                elif key == 'status':
                    valid_statuses = ['pending', 'in_progress', 'completed', 'blocked']
                    if value in valid_statuses:
                        cleaned_data['status'] = value
                    # Skip invalid statuses
                    
                elif key in ['title', 'description']:
                    # Handle text fields
                    if value is not None:
                        cleaned_data[key] = str(value)
                        
                else:
                    # Copy other fields as-is
                    cleaned_data[key] = value
                    
            except Exception as e:
                # If any field processing fails, just skip it
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Skipping field {key} due to error: {e}")
                continue
        
        return cleaned_data

    def validate_status(self, value):
        """Validate status transitions."""
        # Allow all status transitions - users should have full control
        # The automatic status update logic will handle dependency-based updates
        valid_statuses = ['pending', 'in_progress', 'completed', 'blocked']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")
        
        # Note: We removed the dependency check for completed status to allow manual overrides
        # Users should have full control over task status
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
    priority_display = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 'estimated_hours',
            'created_at', 'updated_at', 'dependency_count', 'dependent_count',
            'priority_display'
        ]

    def to_representation(self, instance):
        """Ensure priority and estimated_hours are never null in the response."""
        data = super().to_representation(instance)
        # Ensure priority and estimated_hours are never null
        data['priority'] = instance.priority or 3
        data['estimated_hours'] = instance.estimated_hours or 8
        return data

    def get_dependency_count(self, obj):
        """Get count of dependencies."""
        return obj.dependencies.count()

    def get_dependent_count(self, obj):
        """Get count of dependents."""
        return obj.dependent_tasks.count()

    def get_priority_display(self, obj):
        """Get human-readable priority."""
        return obj.get_priority_display()


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
                'priority': task.priority or 3,  # Ensure priority is never null
                'estimated_hours': task.estimated_hours or 8,  # Ensure estimated_hours is never null
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