import React, { useEffect, useState, useRef } from 'react';
import { useTask } from '../contexts/TaskContext';
import TaskList from './TaskList';
import TaskForm from './TaskForm';
import TaskGraph from './TaskGraph';
import TaskStats from './TaskStats';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const TaskDashboard = () => {
  const { 
    loading, 
    error, 
    refreshData, 
    clearError 
  } = useTask();
  
  const [activeTab, setActiveTab] = useState('list');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [success, setSuccess] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef(null);

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && globalSearch) {
        setGlobalSearch('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [globalSearch]);

  // Handle error dismissal
  const handleErrorDismiss = () => {
    clearError();
  };

  // Handle refresh with loading state
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setSuccess('');
      await refreshData();
      setSuccess('Data refreshed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle fix data
  const handleFixData = async () => {
    try {
      setIsRefreshing(true);
      setSuccess('');
      const { taskAPI } = await import('../services/api');
      const response = await taskAPI.fixData();
      setSuccess(`${response.data.message}. Please refresh to see changes.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Failed to fix data:', error);
      setSuccess('Failed to fix data. Please try again.');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle debug data
  const handleDebugData = async () => {
    try {
      const { taskAPI } = await import('../services/api');
      const response = await taskAPI.getFirstTask();
      console.log('First task debug data:', response.data);
      setSuccess(`Debug data logged to console. Check browser console.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to get debug data:', error);
    }
  };

  // Handle fix task 31
  const handleFixTask31 = async () => {
    try {
      setIsRefreshing(true);
      setSuccess('');
      const { taskAPI } = await import('../services/api');
      const response = await taskAPI.fixTask31();
      setSuccess(`Task 31 fixed: ${response.data.message}. Please refresh to see changes.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Failed to fix task 31:', error);
      setSuccess('Failed to fix task 31. Please try again.');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle fix all tasks
  const handleFixAllTasks = async () => {
    try {
      setIsRefreshing(true);
      setSuccess('');
      const { taskAPI } = await import('../services/api');
      const response = await taskAPI.fixAllTasks();
      setSuccess(`${response.data.message}. Please refresh to see changes.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Failed to fix all tasks:', error);
      setSuccess('Failed to fix tasks. Please try again.');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle task form success
  const handleTaskFormSuccess = () => {
    setShowTaskForm(false);
    setSuccess('Task saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
    refreshData();
  };

  // Tab configuration
  const tabs = [
    { id: 'list', label: 'Task List', icon: '📋' },
    { id: 'graph', label: 'Dependency Graph', icon: '🔗' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 flex items-center">
            <span className="mr-2">✅</span>
            {success}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={handleErrorDismiss}
        />
      )}

      {/* Header Actions */}
      <div className="space-y-4">
        {/* Global Search Bar */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-lg">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search all tasks by title or description... (Ctrl+K)"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="input-field pl-10 pr-10 w-full"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                title="Clear search (Esc)"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation and Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDebugData}
              className="btn-secondary flex items-center space-x-2"
              title="Debug current task data (check console)"
            >
              <span>🐛</span>
              <span>Debug</span>
            </button>

            <button
              onClick={handleFixAllTasks}
              disabled={loading || isRefreshing}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fix ALL problematic tasks (recommended)"
            >
              {(loading || isRefreshing) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span>🔧</span>
              )}
              <span>Fix All Tasks</span>
            </button>

            <button
              onClick={handleFixTask31}
              disabled={loading || isRefreshing}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fix the problematic Task 31"
            >
              {(loading || isRefreshing) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span>🔧</span>
              )}
              <span>Fix Task 31</span>
            </button>

            <button
              onClick={handleFixData}
              disabled={loading || isRefreshing}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fix any tasks with missing priority or estimated hours data"
            >
              {(loading || isRefreshing) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span>🔧</span>
              )}
              <span>Fix Data</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(loading || isRefreshing) ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span>🔄</span>
              )}
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => setShowTaskForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <span>➕</span>
              <span>New Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
            <span className="ml-3 text-gray-600">Loading tasks...</span>
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'list' && <TaskList globalSearch={globalSearch} />}
            {activeTab === 'graph' && <TaskGraph globalSearch={globalSearch} />}
            {activeTab === 'stats' && <TaskStats globalSearch={globalSearch} />}
          </>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onClose={() => setShowTaskForm(false)}
          onSuccess={handleTaskFormSuccess}
        />
      )}
    </div>
  );
};

export default TaskDashboard;