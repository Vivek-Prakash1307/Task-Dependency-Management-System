import React, { useState, useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';

const TaskForm = ({ task, onClose, onSuccess }) => {
  const { createTask, updateTask, loading } = useTask();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 3,
    estimated_hours: 8,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Initialize form data when editing
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 3,
        estimated_hours: task.estimated_hours || 8,
      });
    }
  }, [task]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert numeric fields to numbers
    let processedValue = value;
    if (name === 'priority' || name === 'estimated_hours') {
      processedValue = parseInt(value, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    // Description validation
    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    // Status validation (for editing)
    if (task && !['pending', 'in_progress', 'completed', 'blocked'].includes(formData.status)) {
      newErrors.status = 'Invalid status selected';
    }

    // Priority validation
    if (!formData.priority || isNaN(formData.priority) || formData.priority < 1 || formData.priority > 5) {
      newErrors.priority = 'Priority must be between 1 and 5';
    }

    // Estimated hours validation
    if (!formData.estimated_hours || isNaN(formData.estimated_hours) || formData.estimated_hours < 1 || formData.estimated_hours > 200) {
      newErrors.estimated_hours = 'Estimated hours must be between 1 and 200';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setSuccess('');
      
      // Ensure numeric fields are numbers
      const submitData = {
        ...formData,
        priority: parseInt(formData.priority, 10),
        estimated_hours: parseInt(formData.estimated_hours, 10)
      };
      
      let result;
      if (task) {
        // Update existing task
        result = await updateTask(task.id, submitData);
        setSuccess('Task updated successfully!');
      } else {
        // Create new task
        result = await createTask(submitData);
        setSuccess('Task created successfully!');
      }
      
      // Clear success message after 2 seconds and close
      setTimeout(() => {
        setSuccess('');
        onSuccess(result);
      }, 1500);
      
    } catch (error) {
      console.error('Failed to save task:', error);
      
      // Better error handling
      let errorMessage = 'Failed to save task';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          // Handle field-specific errors
          const fieldErrors = [];
          Object.keys(error.response.data).forEach(field => {
            if (Array.isArray(error.response.data[field])) {
              fieldErrors.push(`${field}: ${error.response.data[field].join(', ')}`);
            } else {
              fieldErrors.push(`${field}: ${error.response.data[field]}`);
            }
          });
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          }
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-overlay fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 slide-in">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title Field */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`input-field ${errors.title ? 'border-red-500' : ''}`}
              placeholder="Enter task title"
              maxLength={255}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={`input-field resize-none ${errors.description ? 'border-red-500' : ''}`}
              placeholder="Enter task description (optional)"
              maxLength={1000}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formData.description.length}/1000 characters
            </p>
          </div>

          {/* Priority and Estimated Hours Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority Field */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className={`select-field ${errors.priority ? 'border-red-500' : ''}`}
              >
                <option value={1}>1 - Low</option>
                <option value={2}>2 - Medium-Low</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Medium-High</option>
                <option value={5}>5 - High</option>
              </select>
              {errors.priority && (
                <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
              )}
            </div>

            {/* Estimated Hours Field */}
            <div>
              <label htmlFor="estimated_hours" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours *
              </label>
              <input
                type="number"
                id="estimated_hours"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                min="1"
                max="200"
                step="1"
                className={`input-field ${errors.estimated_hours ? 'border-red-500' : ''}`}
                placeholder="8"
              />
              {errors.estimated_hours && (
                <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>
              )}
            </div>
          </div>

          {/* Status Field (only for editing) */}
          {task && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="select-field"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">
                  In Progress
                </option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 flex items-center">
                <span className="mr-2">✅</span>
                {success}
              </p>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 flex items-center">
                <span className="mr-2">❌</span>
                {errors.submit}
              </p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || isSubmitting}
            >
              {(loading || isSubmitting) && <div className="spinner"></div>}
              <span>
                {isSubmitting 
                  ? (task ? 'Updating...' : 'Creating...') 
                  : (task ? 'Update Task' : 'Create Task')
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;