import React from 'react';
import { TaskProvider } from './contexts/TaskContext';
import TaskDashboard from './components/TaskDashboard';
import './App.css';

function App() {
  return (
    <TaskProvider>
      <div className="App min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                  Task Dependency Manager
                </h1>
              </div>
              <div className="text-sm text-gray-500">
                Production-Ready System
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TaskDashboard />
        </main>
      </div>
    </TaskProvider>
  );
}

export default App;