/**
 * API service for communicating with the Django backend.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

// Helper function to create request with timeout
function createRequestWithTimeout(url, options, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Helper function to retry failed requests
async function retryRequest(requestFn, maxRetries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or network errors
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      if (error.isNetworkError && attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
}

// Helper function to handle HTTP requests with enhanced error handling
async function apiRequest(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  return retryRequest(async () => {
    try {
      const response = await createRequestWithTimeout(`${API_BASE_URL}${url}`, config);
      
      // Handle non-JSON responses (like 204 No Content)
      if (response.status === 204) {
        return { status: response.status };
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // Handle non-JSON responses
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = {};
      }
      
      if (!response.ok) {
        // Enhanced error handling for different status codes
        const error = new Error(data.error || data.message || `HTTP ${response.status}`);
        error.response = { status: response.status, data };
        throw error;
      }
      
      return { data, status: response.status };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout: The server is taking too long to respond. Please try again.');
        timeoutError.isTimeoutError = true;
        throw timeoutError;
      }
      
      throw error;
    }
  });
}

// Task API endpoints
export const taskAPI = {
  // Get all tasks
  getTasks: () => apiRequest('/tasks/'),
  
  // Get a specific task
  getTask: (id) => apiRequest(`/tasks/${id}/`),
  
  // Create a new task
  createTask: (taskData) => apiRequest('/tasks/', {
    method: 'POST',
    body: JSON.stringify(taskData),
  }),
  
  // Update a task
  updateTask: (id, taskData) => apiRequest(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(taskData),
  }),
  
  // Delete a task
  deleteTask: (id) => apiRequest(`/tasks/${id}/`, {
    method: 'DELETE',
  }),
  
  // Get task dependencies
  getDependencies: (id) => apiRequest(`/tasks/${id}/dependencies/`),
  
  // Add a dependency to a task
  addDependency: (taskId, dependsOnId) => apiRequest(`/tasks/${taskId}/add_dependency/`, {
    method: 'POST',
    body: JSON.stringify({ depends_on_id: dependsOnId }),
  }),
  
  // Remove a dependency from a task
  removeDependency: (taskId, dependencyId) => apiRequest(`/tasks/${taskId}/dependencies/${dependencyId}/`, {
    method: 'DELETE',
  }),
  
  // Get tasks that depend on this task
  getDependents: (id) => apiRequest(`/tasks/${id}/dependents/`),
  
  // Mark task as completed
  markCompleted: (id) => apiRequest(`/tasks/${id}/mark_completed/`, {
    method: 'POST',
  }),
  
  // Get dependency graph data
  getGraphData: () => apiRequest('/tasks/graph/'),
  
  // Get task statistics
  getStats: () => apiRequest('/tasks/stats/'),
};

// Dependency API endpoints
export const dependencyAPI = {
  // Get all dependencies
  getDependencies: () => apiRequest('/dependencies/'),
  
  // Get dependency graph as adjacency list
  getGraphData: () => apiRequest('/dependencies/graph_data/'),
};

// Utility functions for API responses
export const apiUtils = {
  // Extract error message from API response
  getErrorMessage: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
  
  // Check if error is a circular dependency error
  isCircularDependencyError: (error) => {
    const message = apiUtils.getErrorMessage(error);
    return message.toLowerCase().includes('circular dependency');
  },
  
  // Extract circular dependency path from error
  getCircularDependencyPath: (error) => {
    if (error.response?.data?.path) {
      return error.response.data.path;
    }
    return null;
  },
  
  // Format task status for display
  formatStatus: (status) => {
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'blocked': 'Blocked',
    };
    return statusMap[status] || status;
  },
  
  // Get status color class
  getStatusColor: (status) => {
    const colorMap = {
      'pending': 'text-gray-600 bg-gray-100',
      'in_progress': 'text-blue-600 bg-blue-100',
      'completed': 'text-green-600 bg-green-100',
      'blocked': 'text-red-600 bg-red-100',
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  },
  
  // Get status icon
  getStatusIcon: (status) => {
    const iconMap = {
      'pending': '⏳',
      'in_progress': '🔄',
      'completed': '✅',
      'blocked': '🚫',
    };
    return iconMap[status] || '❓';
  },
};