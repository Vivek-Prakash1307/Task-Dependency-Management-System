"""
URL configuration for tasks app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, TaskDependencyViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'dependencies', TaskDependencyViewSet)

urlpatterns = [
    path('', include(router.urls)),
]