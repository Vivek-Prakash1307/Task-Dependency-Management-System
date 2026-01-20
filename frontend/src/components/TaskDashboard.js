import React, { useEffect, useState } from 'react';
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

  // Load initial data
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
            {activeTab === 'list' && <TaskList />}
            {activeTab === 'graph' && <TaskGraph />}
            {activeTab === 'stats' && <TaskStats />}
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