import React, { useEffect } from 'react';
import { useTask } from '../contexts/TaskContext';

const TaskStats = () => {
  const { stats, tasks, loadStats } = useTask();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Calculate additional statistics
  const additionalStats = React.useMemo(() => {
    if (tasks.length === 0) {
      return {
        avgDependencies: 0,
        maxDependencies: 0,
        tasksWithDependencies: 0,
        tasksWithDependents: 0,
        completionRate: 0,
      };
    }

    const dependencyCounts = tasks.map(task => task.dependencies?.length || 0);
    const dependentCounts = tasks.map(task => task.dependents?.length || 0);

    return {
      avgDependencies: dependencyCounts.reduce((a, b) => a + b, 0) / tasks.length,
      maxDependencies: Math.max(...dependencyCounts),
      tasksWithDependencies: tasks.filter(task => task.dependencies?.length > 0).length,
      tasksWithDependents: tasks.filter(task => task.dependents?.length > 0).length,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    };
  }, [tasks, stats]);

  // Status distribution data for chart
  const statusData = [
    { label: 'Pending', value: stats.pending, color: 'bg-gray-500', lightColor: 'bg-gray-100' },
    { label: 'In Progress', value: stats.in_progress, color: 'bg-blue-500', lightColor: 'bg-blue-100' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-500', lightColor: 'bg-green-100' },
    { label: 'Blocked', value: stats.blocked, color: 'bg-red-500', lightColor: 'bg-red-100' },
  ];

  // Calculate percentages for progress bar
  const getPercentage = (value) => {
    return stats.total > 0 ? (value / stats.total) * 100 : 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Task Statistics</h3>
        <button
          onClick={loadStats}
          className="btn-secondary text-sm py-1 px-3"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500">
                {additionalStats.completionRate.toFixed(1)}% complete
              </p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
            </div>
            <div className="text-3xl">🔄</div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Blocked</p>
              <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
            </div>
            <div className="text-3xl">🚫</div>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="card p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h4>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex h-4 bg-gray-200 rounded-full overflow-hidden">
            {statusData.map((status, index) => (
              <div
                key={status.label}
                className={status.color}
                style={{ width: `${getPercentage(status.value)}%` }}
                title={`${status.label}: ${status.value} tasks (${getPercentage(status.value).toFixed(1)}%)`}
              />
            ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusData.map((status) => (
            <div key={status.label} className="text-center">
              <div className={`w-4 h-4 ${status.color} rounded-full mx-auto mb-2`}></div>
              <p className="text-sm font-medium text-gray-900">{status.label}</p>
              <p className="text-lg font-bold text-gray-700">{status.value}</p>
              <p className="text-xs text-gray-500">
                {getPercentage(status.value).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dependency Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Dependency Analysis</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tasks with dependencies:</span>
              <span className="font-medium">{additionalStats.tasksWithDependencies}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tasks with dependents:</span>
              <span className="font-medium">{additionalStats.tasksWithDependents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average dependencies per task:</span>
              <span className="font-medium">{additionalStats.avgDependencies.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Maximum dependencies:</span>
              <span className="font-medium">{additionalStats.maxDependencies}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Progress Insights</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completion rate:</span>
              <span className="font-medium text-green-600">
                {additionalStats.completionRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tasks ready to start:</span>
              <span className="font-medium text-blue-600">
                {tasks.filter(task => task.can_start && task.status === 'pending').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Blocked tasks:</span>
              <span className="font-medium text-red-600">{stats.blocked}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Remaining work:</span>
              <span className="font-medium">
                {stats.total - stats.completed} tasks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Tasks</h4>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks
              .slice(0, 5)
              .map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      task.status === 'completed' ? 'bg-green-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' :
                      task.status === 'blocked' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(task.updated_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <p className="text-gray-600">No tasks to analyze yet</p>
          </div>
        )}
      </div>

      {/* Performance Indicators */}
      {stats.total > 0 && (
        <div className="card p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Indicators</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {((stats.completed / stats.total) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-green-700">Completion Rate</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.in_progress + (tasks.filter(t => t.can_start && t.status === 'pending').length)}
              </div>
              <div className="text-sm text-blue-700">Active Tasks</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {((stats.blocked / stats.total) * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-red-700">Blocked Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskStats;