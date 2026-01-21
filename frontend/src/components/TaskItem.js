import React, { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { apiUtils } from '../services/api';

const TaskItem = ({ task, onEdit, onDelete, onManageDependencies }) => {
  const { updateTask, markTaskCompleted } = useTask();
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState('');

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      setSuccess('');
      
      if (newStatus === 'completed') {
        await markTaskCompleted(task.id);
        setSuccess('Task marked as completed!');
      } else {
        // Include priority and estimated_hours to avoid validation issues
        const updateData = {
          status: newStatus,
          priority: task.priority || 3,
          estimated_hours: task.estimated_hours || 8
        };
        
        await updateTask(task.id, updateData);
        setSuccess(`Status updated to ${apiUtils.formatStatus(newStatus)}!`);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      console.error('Error details:', {
        response: error.response,
        message: error.message,
        taskId: task.id,
        newStatus: newStatus
      });
      // You could add error state here if needed
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get priority indicator
  const getPriorityIndicator = (priority) => {
    // Ensure priority is a number and handle null/undefined values
    let numPriority;
    if (priority === null || priority === undefined) {
      numPriority = 3; // Default to medium priority
    } else {
      numPriority = typeof priority === 'string' ? parseInt(priority, 10) : priority;
      // Ensure it's a valid number between 1-5
      if (isNaN(numPriority) || numPriority < 1 || numPriority > 5) {
        numPriority = 3; // Default to medium priority
      }
    }
    
    const indicators = {
      1: { icon: '🔵', color: 'text-blue-500', label: 'Low' },
      2: { icon: '🟢', color: 'text-green-500', label: 'Medium-Low' },
      3: { icon: '🟡', color: 'text-yellow-500', label: 'Medium' },
      4: { icon: '🟠', color: 'text-orange-500', label: 'Medium-High' },
      5: { icon: '🔴', color: 'text-red-500', label: 'High' },
    };
    return { ...indicators[numPriority], priority: numPriority };
  };

  // Memoize the priority indicator to avoid recalculation
  const priorityIndicator = React.useMemo(() => getPriorityIndicator(task.priority), [task.priority]);

  // Format estimated completion time
  const formatEstimatedTime = (estimatedCompletion) => {
    if (!estimatedCompletion) return null;
    
    const { total_hours, can_start_immediately } = estimatedCompletion;
    
    if (total_hours === 0) return 'Ready to complete';
    
    const days = Math.ceil(total_hours / 8); // Assuming 8 hours per day
    const timeText = days === 1 ? '1 day' : `${days} days`;
    
    return can_start_immediately 
      ? `~${timeText} (can start now)`
      : `~${timeText} (waiting for dependencies)`;
  };

  // Get status badge classes
  const getStatusBadgeClass = (status) => {
    const baseClass = 'status-badge';
    switch (status) {
      case 'pending':
        return `${baseClass} status-pending`;
      case 'in_progress':
        return `${baseClass} status-in-progress`;
      case 'completed':
        return `${baseClass} status-completed`;
      case 'blocked':
        return `${baseClass} status-blocked`;
      default:
        return `${baseClass} status-pending`;
    }
  };

  // Check if status change is allowed
  const canChangeStatus = (currentStatus, newStatus) => {
    // Allow all status changes - users should have full control
    // The backend and automatic status update logic will handle business rules
    return true;
  };

  return (
    <div className="card p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {task.title}
            </h3>
            <span className={getStatusBadgeClass(task.status)}>
              {apiUtils.getStatusIcon(task.status)} {apiUtils.formatStatus(task.status)}
            </span>
            {/* Priority Indicator */}
            <span className={`flex items-center space-x-1 ${priorityIndicator.color}`} title={`Priority: ${priorityIndicator.label}`}>
              <span>{priorityIndicator.icon}</span>
              <span className="text-xs font-medium">P{priorityIndicator.priority}</span>
            </span>
          </div>

          {task.description && (
            <p className="text-gray-600 mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Task Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>📅 Created: {formatDate(task.created_at)}</span>
            <span>🔄 Updated: {formatDate(task.updated_at)}</span>
            <span>⏱️ Est: {task.estimated_hours || 8}h</span>
            
            {task.estimated_completion && formatEstimatedTime(task.estimated_completion) && (
              <span className="text-blue-600 font-medium">
                ⏰ {formatEstimatedTime(task.estimated_completion)}
              </span>
            )}
            
            {task.dependencies && task.dependencies.length > 0 && (
              <span className="flex items-center">
                <span className="mr-1">🔗</span>
                {task.dependencies.length} dependencies
              </span>
            )}
            
            {task.dependents && task.dependents.length > 0 && (
              <span className="flex items-center">
                <span className="mr-1">📌</span>
                {task.dependents.length} dependents
              </span>
            )}
          </div>

          {/* Dependency Status Indicators */}
          {task.dependencies && task.dependencies.length > 0 && (
            <div className="mt-3">
              <div className="text-sm text-gray-600 mb-1">Dependencies:</div>
              <div className="flex flex-wrap gap-2">
                {task.dependencies.map((dep) => (
                  <span
                    key={dep.id}
                    className={`text-xs px-2 py-1 rounded-full ${apiUtils.getStatusColor(dep.status)}`}
                  >
                    {dep.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 flex items-center">
                <span className="mr-2">✅</span>
                {success}
              </p>
            </div>
          )}

          {/* Status Warnings */}
          {task.is_blocked && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                🚫 This task is blocked by incomplete dependencies
              </p>
            </div>
          )}

          {task.status === 'pending' && task.can_start && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                ✅ This task is ready to start
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 ml-6">
          {/* Status Selector */}
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className="select-field text-sm w-32 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option 
              value="pending" 
              disabled={!canChangeStatus(task.status, 'pending')}
            >
              Pending
            </option>
            <option 
              value="in_progress" 
              disabled={!canChangeStatus(task.status, 'in_progress')}
            >
              In Progress
            </option>
            <option 
              value="completed" 
              disabled={!canChangeStatus(task.status, 'completed')}
            >
              Completed
            </option>
            <option 
              value="blocked" 
              disabled={!canChangeStatus(task.status, 'blocked')}
            >
              Blocked
            </option>
          </select>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={onEdit}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              title="Edit task"
            >
              ✏️ Edit
            </button>
            
            <button
              onClick={onManageDependencies}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              title="Manage dependencies"
            >
              🔗 Deps
            </button>
            
            <button
              onClick={onDelete}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
              title="Delete task"
            >
              🗑️ Delete
            </button>
          </div>

          {/* Quick Complete Button */}
          {task.status !== 'completed' && task.can_start && (
            <button
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
              className="btn-success text-sm py-1 px-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              {isUpdating ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>Complete</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;