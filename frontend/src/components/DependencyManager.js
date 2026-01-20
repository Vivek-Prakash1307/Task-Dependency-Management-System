import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';

const DependencyManager = ({ task, onClose, onSuccess }) => {
  const { tasks, addDependency, removeDependency, loading } = useTask();
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter available tasks (exclude self and existing dependencies)
  useEffect(() => {
    const existingDependencyIds = task.dependencies?.map(dep => dep.id) || [];
    const available = tasks.filter(t => 
      t.id !== task.id && 
      !existingDependencyIds.includes(t.id)
    );
    setAvailableTasks(available);
  }, [tasks, task]);

  // Handle adding dependency
  const handleAddDependency = async () => {
    if (!selectedTaskId) {
      setError('Please select a task');
      return;
    }

    // Prevent self-dependency (additional check)
    if (parseInt(selectedTaskId) === task.id) {
      setError('A task cannot depend on itself');
      return;
    }

    try {
      setIsAdding(true);
      setError('');
      setSuccess('');
      
      await addDependency(task.id, parseInt(selectedTaskId));
      
      setSelectedTaskId('');
      setSuccess('Dependency added successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      onSuccess();
    } catch (error) {
      if (error.message.includes('Circular dependency')) {
        setError('Cannot add dependency: This would create a circular dependency');
      } else if (error.message.includes('already exists')) {
        setError('This dependency already exists');
      } else {
        setError(error.message || 'Failed to add dependency');
      }
    } finally {
      setIsAdding(false);
    }
  };

  // Handle removing dependency
  const handleRemoveDependency = async (dependencyId) => {
    try {
      setIsRemoving(dependencyId);
      setError('');
      setSuccess('');
      
      // Find the dependency relationship
      const dependency = task.dependencies?.find(dep => dep.id === dependencyId);
      if (!dependency) return;

      // We need to find the TaskDependency ID, not the task ID
      // For now, we'll use the task ID and let the backend handle it
      await removeDependency(task.id, dependencyId);
      
      setSuccess('Dependency removed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
      onSuccess();
    } catch (error) {
      setError(error.message || 'Failed to remove dependency');
    } finally {
      setIsRemoving(null);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get status color class
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'blocked':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div 
      className="modal-overlay fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 slide-in">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Manage Dependencies: {task.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Dependencies */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Current Dependencies ({task.dependencies?.length || 0})
            </h3>
            
            {task.dependencies && task.dependencies.length > 0 ? (
              <div className="space-y-2">
                {task.dependencies.map((dep) => (
                  <div
                    key={dep.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dep.status)}`}>
                        {dep.status.replace('_', ' ')}
                      </span>
                      <span className="font-medium text-gray-900">{dep.title}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveDependency(dep.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center space-x-1"
                      disabled={loading || isRemoving === dep.id}
                    >
                      {isRemoving === dep.id && <div className="spinner-sm"></div>}
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">🔗</div>
                <p>This task has no dependencies</p>
              </div>
            )}
          </div>

          {/* Add New Dependency */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Add New Dependency
            </h3>
            
            {availableTasks.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select a task that this task depends on:
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="select-field"
                    disabled={isAdding}
                  >
                    <option value="">Choose a task...</option>
                    {availableTasks.map((availableTask) => (
                      <option key={availableTask.id} value={availableTask.id}>
                        {availableTask.title} ({availableTask.status.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddDependency}
                  disabled={!selectedTaskId || isAdding || loading}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding && <div className="spinner"></div>}
                  <span>{isAdding ? 'Adding...' : 'Add Dependency'}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <p>No more tasks available to add as dependencies</p>
              </div>
            )}
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 flex items-center">
                <span className="mr-2">✅</span>
                {success}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 flex items-center">
                <span className="mr-2">❌</span>
                {error}
              </p>
            </div>
          )}

          {/* Task Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Task Status Information</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>Current Status:</strong> {task.status.replace('_', ' ')}
              </p>
              <p>
                <strong>Can Start:</strong> {task.can_start ? 'Yes' : 'No'}
              </p>
              <p>
                <strong>Is Blocked:</strong> {task.is_blocked ? 'Yes' : 'No'}
              </p>
              {task.dependencies && task.dependencies.length > 0 && (
                <p className="mt-2">
                  <strong>Note:</strong> This task will automatically update its status based on dependency completion.
                </p>
              )}
            </div>
          </div>

          {/* Dependents Info */}
          {task.dependents && task.dependents.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                Tasks Depending on This Task ({task.dependents.length})
              </h4>
              <div className="text-sm text-yellow-800">
                <div className="space-y-1">
                  {task.dependents.map((dependent) => (
                    <div key={dependent.id} className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dependent.status)}`}>
                        {dependent.status.replace('_', ' ')}
                      </span>
                      <span>{dependent.title}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2">
                  <strong>Note:</strong> These tasks will be affected when this task's status changes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DependencyManager;