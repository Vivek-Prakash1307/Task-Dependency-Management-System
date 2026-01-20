"""
Admin configuration for tasks app.
"""
from django.contrib import admin
from .models import Task, TaskDependency


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """Admin interface for Task model."""
    
    list_display = ['title', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    """Admin interface for TaskDependency model."""
    
    list_display = ['task', 'depends_on', 'created_at']
    list_filter = ['created_at']
    search_fields = ['task__title', 'depends_on__title']
    readonly_fields = ['created_at']
    
    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        return super().get_queryset(request).select_related('task', 'depends_on')