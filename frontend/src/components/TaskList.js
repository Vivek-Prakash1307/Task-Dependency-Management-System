import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import TaskItem from './TaskItem';
import TaskForm from './TaskForm';
import DependencyManager from './DependencyManager';
import ConfirmDialog from './ConfirmDialog';

const TaskList = () => {
  const { tasks, deleteTask, refreshData } = useTask();
  const [editingTask, setEditingTask] = useState(null);
  const [managingDependencies, setManagingDependencies] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [success, setSuccess] = useState('');

  // Filter and sort tasks
  const filteredAndSortedTasks = React.useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'created_at':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'updated_at':
          return new Date(b.updated_at) - new Date(a.updated_at);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tasks, filterStatus, sortBy]);

  // Handle task deletion
  const handleDeleteTask = async () => {
    if (!deletingTask || isDeleting) return;

    try {
      setIsDeleting(true);
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
      setSuccess(`Task "${deletingTask.title}" deleted successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit success
  const handleEditSuccess = () => {
    setEditingTask(null);
    setSuccess('Task updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
    refreshData();
  };

  // Handle dependency management success
  const handleDependencySuccess = () => {
    setManagingDependencies(null);
    setSuccess('Dependencies updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
    refreshData();
  };

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: 'All Tasks' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'blocked', label: 'Blocked' },
  ];

  // Sort options
  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Updated Date' },
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
  ];

  return (
    <div className="p-6">
      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center">
            <span className="mr-2">✅</span>
            {success}
          </p>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select-field w-40"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select-field w-40"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task List */}
      {filteredAndSortedTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filterStatus === 'all' ? 'No tasks yet' : `No ${filterStatus.replace('_', ' ')} tasks`}
          </h3>
          <p className="text-gray-600">
            {filterStatus === 'all' 
              ? 'Create your first task to get started'
              : 'Try changing the filter to see more tasks'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeletingTask(task)}
              onManageDependencies={() => setManagingDependencies(task)}
            />
          ))}
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Dependency Manager Modal */}
      {managingDependencies && (
        <DependencyManager
          task={managingDependencies}
          onClose={() => setManagingDependencies(null)}
          onSuccess={handleDependencySuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTask && (
        <ConfirmDialog
          title="Delete Task"
          message={
            <div>
              <p>Are you sure you want to delete "{deletingTask.title}"?</p>
              {deletingTask.dependents && deletingTask.dependents.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This task has {deletingTask.dependents.length} dependent task(s):
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700">
                    {deletingTask.dependents.map(dep => (
                      <li key={dep.id}>• {dep.title}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-yellow-800">
                    These tasks will be updated after deletion.
                  </p>
                </div>
              )}
            </div>
          }
          confirmText={isDeleting ? "Deleting..." : "Delete"}
          confirmButtonClass="btn-danger"
          onConfirm={handleDeleteTask}
          onCancel={() => setDeletingTask(null)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default TaskList;