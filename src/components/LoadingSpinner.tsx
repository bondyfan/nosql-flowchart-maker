import React from 'react';
import { Database } from 'lucide-react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="relative">
          <Database className="text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-pulse" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Loading NoSQL Flowchart
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Syncing with Firestore database...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner; 