import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowEditor from './components/FlowEditor';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './context/ThemeContext';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [undoFn, setUndoFn] = useState<(() => void) | null>(null);
  const [redoFn, setRedoFn] = useState<(() => void) | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const { isLoading } = useDatabase();

  const handleUndoRedoChange = (undo: () => void, redo: () => void, undoAvailable: boolean, redoAvailable: boolean) => {
    setUndoFn(() => undo);
    setRedoFn(() => redo);
    setCanUndo(undoAvailable);
    setCanRedo(redoAvailable);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Header 
            sidebarOpen={sidebarOpen} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onUndo={undoFn}
            onRedo={redoFn}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <main className="flex-1 flex overflow-hidden">
            <ReactFlowProvider>
              <FlowEditor 
                sidebarOpen={sidebarOpen} 
                onUndoRedoChange={handleUndoRedoChange}
              />
            </ReactFlowProvider>
          </main>
        </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </ThemeProvider>
  );
}

export default App;