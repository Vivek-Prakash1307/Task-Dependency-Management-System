"""
API views for the tasks application.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Task, TaskDependency
from .serializers import (
    TaskSerializer, TaskListSerializer, TaskDependencySerializer,
    AddDependencySerializer, DependencyGraphSerializer
)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks.
    
    Provides CRUD operations for tasks and dependency management.
    """
    queryset = Task.objects.all()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer

    def perform_update(self, serializer):
        """Override update to handle status propagation and version checking."""
        old_instance = self.get_object()
        old_status = old_instance.status
        
        # Check for version in request data for concurrent update detection
        version = self.request.data.get('version')
        if version is not None:
            try:
                version = int(version)
                if version != old_instance.version:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({
                        'error': 'This task was modified by another user. Please refresh and try again.',
                        'current_version': old_instance.version,
                        'provided_version': version
                    })
            except (ValueError, TypeError):
                pass  # Ignore invalid version values
        
        # Save the updated instance
        instance = serializer.save()
        
        # If status changed, propagate to dependents
        if old_status != instance.status:
            instance.propagate_status_update()

    def perform_destroy(self, instance):
        """Override destroy to handle dependent tasks."""
        dependents = instance.get_dependents()
        if dependents:
            # Update dependent tasks before deletion
            for dependent in dependents:
                dependent.update_status_based_on_dependencies()
        
        instance.delete()

    @action(detail=True, methods=['get'])
    def dependencies(self, request, pk=None):
        """Get all dependencies for a task."""
        task = self.get_object()
        dependencies = TaskDependency.objects.filter(task=task).select_related('depends_on')
        serializer = TaskDependencySerializer(dependencies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_dependency(self, request, pk=None):
        """Add a dependency to a task."""
        task = self.get_object()
        serializer = AddDependencySerializer(
            data=request.data,
            context={'task_id': task.id}
        )
        
        if serializer.is_valid():
            depends_on_id = serializer.validated_data['depends_on_id']
            depends_on = get_object_or_404(Task, id=depends_on_id)
            
            # Check for circular dependencies before creating
            temp_dependency = TaskDependency(task=task, depends_on=depends_on)
            cycle_path = temp_dependency.detect_circular_dependency()
            
            if cycle_path:
                return Response(
                    {
                        'error': 'Circular dependency detected',
                        'path': cycle_path
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                with transaction.atomic():
                    dependency = TaskDependency.objects.create(
                        task=task,
                        depends_on=depends_on
                    )
                    
                    # Return the created dependency
                    response_serializer = TaskDependencySerializer(dependency)
                    return Response(
                        response_serializer.data,
                        status=status.HTTP_201_CREATED
                    )
                    
            except DjangoValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], url_path='dependencies/(?P<dependency_id>[^/.]+)')
    def remove_dependency(self, request, pk=None, dependency_id=None):
        """Remove a dependency from a task."""
        task = self.get_object()
        
        try:
            dependency = TaskDependency.objects.get(
                id=dependency_id,
                task=task
            )
            
            with transaction.atomic():
                dependency.delete()
                # Update task status after removing dependency
                task.update_status_based_on_dependencies()
                
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except TaskDependency.DoesNotExist:
            return Response(
                {'error': 'Dependency not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def dependents(self, request, pk=None):
        """Get all tasks that depend on this task."""
        task = self.get_object()
        dependents = TaskDependency.objects.filter(depends_on=task).select_related('task')
        serializer = TaskDependencySerializer(dependents, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark a task as completed and update dependent tasks."""
        task = self.get_object()
        
        if not task.can_start():
            return Response(
                {'error': 'Cannot complete task with incomplete dependencies'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            task.status = 'completed'
            task.save()
            
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def graph(self, request):
        """Get dependency graph data for visualization."""
        serializer = DependencyGraphSerializer({})
        return Response(serializer.to_representation(None))

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get task statistics."""
        total_tasks = Task.objects.count()
        pending_tasks = Task.objects.filter(status='pending').count()
        in_progress_tasks = Task.objects.filter(status='in_progress').count()
        completed_tasks = Task.objects.filter(status='completed').count()
        blocked_tasks = Task.objects.filter(status='blocked').count()
        
        return Response({
            'total': total_tasks,
            'pending': pending_tasks,
            'in_progress': in_progress_tasks,
            'completed': completed_tasks,
            'blocked': blocked_tasks,
        })


class TaskDependencyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing task dependencies.
    
    Provides read-only access to dependency relationships.
    """
    queryset = TaskDependency.objects.all().select_related('task', 'depends_on')
    serializer_class = TaskDependencySerializer

    @action(detail=False, methods=['get'])
    def graph_data(self, request):
        """Get dependency graph as adjacency list."""
        graph = TaskDependency.get_dependency_graph()
        return Response({'graph': graph})