import React, { useState } from 'react';
import { Database, Moon, Sun, Menu, X, Cloud, CloudOff, Undo2, Redo2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';

interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  onUndo?: (() => void) | null;
  onRedo?: (() => void) | null;
  canUndo?: boolean;
  canRedo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  sidebarOpen, 
  toggleSidebar, 
  onUndo, 
  onRedo, 
  canUndo = false, 
  canRedo = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isConnected, isLoading } = useDatabase();

  const handleThemeToggle = () => {
    console.log('Theme toggle clicked, current theme:', theme);
    toggleTheme();
    console.log('Theme toggle called');
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-4 transition-colors duration-200">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar} 
          className="mr-4 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="flex items-center">
          <Database className="text-blue-600 dark:text-blue-400 mr-2" size={24} />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">NoSQL Flowchart Maker</h1>
        </div>
        
        {/* Undo/Redo Controls */}
        <div className="ml-6 flex items-center space-x-1">
          <button
            onClick={onUndo || undefined}
            disabled={!canUndo || !onUndo}
            className={`p-2 rounded-md transition-colors duration-150 ${
              canUndo && onUndo
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          
          <button
            onClick={onRedo || undefined}
            disabled={!canRedo || !onRedo}
            className={`p-2 rounded-md transition-colors duration-150 ${
              canRedo && onRedo
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Redo (Ctrl+Y)"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={18} />
          </button>
        </div>
        
        {/* Firestore Connection Status */}
        <div className="ml-4 flex items-center">
          {isLoading ? (
            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-xs hidden sm:inline">Syncing...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <Cloud size={16} className="mr-1" />
              <span className="text-xs hidden sm:inline">Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <CloudOff size={16} className="mr-1" />
              <span className="text-xs hidden sm:inline">Offline</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          onClick={handleThemeToggle}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

export default Header;