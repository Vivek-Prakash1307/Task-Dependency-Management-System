import React from 'react';

const ErrorMessage = ({ message, onDismiss, type = 'error' }) => {
  const typeClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconMap = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className={`p-4 border rounded-lg ${typeClasses[type]} fade-in`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg">{iconMap[type]}</span>
          <div>
            <p className="font-medium">
              {type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information'}
            </p>
            <p className="mt-1 text-sm">{message}</p>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 ml-4"
            aria-label="Dismiss"
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;