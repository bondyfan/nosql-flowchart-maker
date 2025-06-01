import React, { useState, useEffect, useRef } from 'react';
import { Database, Moon, Sun, Menu, X, Cloud, CloudOff, Undo2, Redo2, Bug, AlertTriangle, Download, Upload } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDatabase } from '../context/DatabaseContext';

export interface HeaderProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
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
  const { 
    isConnected, 
    saveToFirestore, 
    loadFromFirestore, 
    nodes, 
    edges, 
    collections, 
    separators, 
    dbType,
    setNodes,
    setEdges,
    setCollections,
    setSeparators,
    setDbType
  } = useDatabase();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [multipleTabsDetected, setMultipleTabsDetected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect multiple tabs
  useEffect(() => {
    const tabId = Date.now().toString();
    const STORAGE_KEY = 'activeTabIds';
    
    // Add our tab ID
    const addTabId = () => {
      const existingTabs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const updatedTabs = [...existingTabs.filter(t => Date.now() - t.timestamp < 10000), { id: tabId, timestamp: Date.now() }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTabs));
      setMultipleTabsDetected(updatedTabs.length > 1);
    };

    // Update tab timestamp periodically
    const interval = setInterval(addTabId, 3000);
    addTabId(); // Initial call

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      const existingTabs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const filteredTabs = existingTabs.filter(t => t.id !== tabId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTabs));
    };
  }, []);

  const handleThemeToggle = () => {
    console.log('Theme toggle clicked, current theme:', theme);
    toggleTheme();
    console.log('Theme toggle called');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveToFirestore();
      console.log('✅ Manual save completed');
    } catch (error) {
      console.error('❌ Manual save error:', error);
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async () => {
    try {
      setIsLoading(true);
      await loadFromFirestore();
      console.log('✅ Manual load completed');
    } catch (error) {
      console.error('❌ Manual load error:', error);
      alert(`Load failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDebugInfo = () => {
    console.log('🐛 DEBUG INFO:', {
      timestamp: new Date().toISOString(),
      isConnected,
      dataCount: {
        nodes: nodes.length,
        edges: edges.length,
        collections: collections.length,
        separators: separators.length
      },
      sampleProcessNode: nodes.find(n => n.type === 'process'),
      lastUpdate: localStorage.getItem('lastDataUpdate') || 'Never'
    });
    
    // Check Firebase connection
    import('../services/firestoreService').then(({ FirestoreService }) => {
      FirestoreService.loadFlowchart().then(data => {
        console.log('🔍 Current Firebase data:', data);
        if (data) {
          console.log('📊 Firebase data summary:', {
            nodes: data.nodes?.length || 0,
            edges: data.edges?.length || 0,
            collections: data.collections?.length || 0,
            separators: data.separators?.length || 0,
            lastUpdated: data.updatedAt
          });
        } else {
          console.log('⚠️ No data found in Firebase');
        }
      }).catch(error => {
        console.error('❌ Firebase read error:', error);
      });
    });
  };

  const handleExport = () => {
    try {
      setIsExporting(true);
      
      // Create export data with metadata
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          collectionCount: collections.length,
          separatorCount: separators.length
        },
        data: {
          nodes,
          edges,
          collections,
          separators,
          dbType
        }
      };
      
      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `nosql-flowchart-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      // Cleanup
      URL.revokeObjectURL(link.href);
      
      console.log('✅ Export completed successfully');
      alert('Backup exported successfully!');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data structure
      if (!importData.data || !importData.version) {
        throw new Error('Invalid backup file format');
      }
      
      const { nodes: importNodes, edges: importEdges, collections: importCollections, separators: importSeparators, dbType: importDbType } = importData.data;
      
      // Show confirmation dialog with import info
      const confirmMessage = `Import backup from ${new Date(importData.exportedAt).toLocaleString()}?\n\n` +
        `This will replace all current data:\n` +
        `• ${importNodes?.length || 0} nodes\n` +
        `• ${importEdges?.length || 0} edges\n` +
        `• ${importCollections?.length || 0} collections\n` +
        `• ${importSeparators?.length || 0} separators\n\n` +
        `Current data will be lost!`;
      
      if (!window.confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }
      
      // Import data using database context
      
      // Apply imported data
      if (importNodes) setNodes(importNodes);
      if (importEdges) setEdges(importEdges);
      if (importCollections) setCollections(importCollections);
      if (importSeparators) setSeparators(importSeparators);
      if (importDbType) setDbType(importDbType);
      
      // Update local storage with current time
      localStorage.setItem('lastDataUpdate', new Date().toISOString());
      
      console.log('✅ Import completed successfully');
      alert('Backup imported successfully!');
      
    } catch (error) {
      console.error('❌ Import error:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
        
        {/* Right side buttons */}
        <div className="flex items-center space-x-1">
          {/* Multiple Tabs Warning */}
          {multipleTabsDetected && (
            <div 
              className="flex items-center px-3 py-2 bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg"
              title="Multiple tabs detected! Close other tabs to prevent data conflicts."
            >
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mr-2" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Multiple Tabs
              </span>
            </div>
          )}

          {/* Undo/Redo Buttons */}
          {(onUndo || onRedo) && (
            <>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded-md transition-colors ${
                  canUndo
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded-md transition-colors ${
                  canRedo
                    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={18} />
              </button>
            </>
          )}
        </div>
        
        {/* Debug Button */}
        <button
          onClick={handleDebugInfo}
          className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Debug Firebase Connection"
        >
          <Bug size={18} />
        </button>

        {/* Manual Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !isConnected}
          className={`p-2 rounded-md transition-colors ${
            isSaving || !isConnected
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
          title="Manual Save to Firebase"
        >
          <Cloud size={18} />
        </button>

        {/* Manual Load Button */}
        <button
          onClick={handleLoad}
          disabled={isLoading || !isConnected}
          className={`p-2 rounded-md transition-colors ${
            isLoading || !isConnected
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20'
          }`}
          title="Manual Load from Firebase"
        >
          <Database size={18} />
        </button>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`p-2 rounded-md transition-colors ${
            isExporting
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20'
          }`}
          title="Export Backup (JSON)"
        >
          <Download size={18} />
        </button>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={isImporting}
          className={`p-2 rounded-md transition-colors ${
            isImporting
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20'
          }`}
          title="Import Backup (JSON)"
        >
          <Upload size={18} />
        </button>

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Firestore Connection Status */}
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {isConnected ? (
              <>
                <Cloud size={14} />
                <span>Connected</span>
              </>
            ) : (
              <>
                <CloudOff size={14} />
                <span>Offline</span>
              </>
            )}
          </div>
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