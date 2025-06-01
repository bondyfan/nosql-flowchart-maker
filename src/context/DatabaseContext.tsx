import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { generateUniqueId } from '../utils/helpers';
import { NodeData, DatabaseType, Collection, Separator } from '../types';
import { FirestoreService } from '../services/firestoreService';

interface DatabaseContextType {
  nodes: Node<NodeData>[];
  edges: Edge[];
  collections: Collection[];
  separators: Separator[];
  dbType: DatabaseType;
  isLoading: boolean;
  isConnected: boolean;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setDbType: (type: DatabaseType) => void;
  addNode: (type: string, position: { x: number, y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  addCollection: (name: string, description?: string) => string;
  updateCollection: (id: string, data: Partial<Omit<Collection, 'id'>>) => void;
  removeCollection: (id: string) => void;
  addSeparator: (x: number, label?: string, color?: string) => string;
  updateSeparator: (id: string, data: Partial<Omit<Separator, 'id'>>) => void;
  removeSeparator: (id: string) => void;
  clearAll: () => void;
  exportFlow: () => string;
  importFlow: (data: string) => void;
  exportBackup: () => string;
  importBackup: (backupData: string) => void;
  saveToFirestore: () => Promise<void>;
  loadFromFirestore: () => Promise<void>;
}

const initialNodes: Node<NodeData>[] = [];
const initialEdges: Edge[] = [];

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [separators, setSeparators] = useState<Separator[]>([]);
  const [dbType, setDbType] = useState<DatabaseType>('document');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to track if we should auto-save (to prevent saving during initial load)
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isPageVisible = useRef(true);

  // Track page visibility to prevent background tab saves
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasHidden = !isPageVisible.current;
      isPageVisible.current = !document.hidden;
      console.log('👁️ Page visibility changed:', isPageVisible.current ? 'visible' : 'hidden');
      
      // Show warning when tab becomes visible again
      if (wasHidden && isPageVisible.current && isInitialized.current) {
        console.log('⚠️ Tab became visible again - checking for conflicts...');
        setTimeout(() => {
          // Check if Firebase has newer data
          const checkForConflicts = async () => {
            try {
              const currentData = await FirestoreService.loadFlowchart();
              const lastKnownUpdate = localStorage.getItem('lastDataUpdate');
              
              if (currentData && currentData.updatedAt && lastKnownUpdate) {
                const currentTimestamp = new Date(currentData.updatedAt).getTime();
                const ourTimestamp = new Date(lastKnownUpdate).getTime();
                
                if (currentTimestamp > ourTimestamp) {
                  const shouldRefresh = window.confirm(
                    '🔄 TAB BECAME ACTIVE\n\n' +
                    'Firebase has newer data than this tab.\n' +
                    'This might be from another tab or device.\n\n' +
                    'Click OK to REFRESH and load the newer data\n' +
                    'Click Cancel to continue with current data (risky)'
                  );
                  
                  if (shouldRefresh) {
                    window.location.reload();
                  }
                }
              }
            } catch (error) {
              console.error('Failed to check for conflicts:', error);
            }
          };
          
          checkForConflicts();
        }, 1000); // Small delay to ensure page is fully visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-save function with debouncing
  const autoSave = useCallback(async () => {
    if (!isInitialized.current || !isConnected) {
      console.log('🔄 Auto-save skipped - not initialized or not connected');
      return;
    }
    
    // Skip auto-save if page is not visible (background tab)
    if (!isPageVisible.current) {
      console.log('🔄 Auto-save skipped - page not visible (background tab)');
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving to Firestore...', { 
          nodesCount: nodes.length, 
          edgesCount: edges.length,
          processNodes: nodes.filter(n => n.type === 'process').map(n => ({ 
            id: n.id, 
            label: n.data.label, 
            actionsCount: n.data.properties?.processActions?.length || 0 
          }))
        });
        
        // Check for conflicts before saving
        const currentData = await FirestoreService.loadFlowchart();
        const lastKnownUpdate = localStorage.getItem('lastDataUpdate');
        
        if (currentData && currentData.updatedAt && lastKnownUpdate) {
          const currentTimestamp = new Date(currentData.updatedAt).getTime();
          const ourTimestamp = new Date(lastKnownUpdate).getTime();
          
          if (currentTimestamp > ourTimestamp) {
            console.warn('⚠️ CONFLICT DETECTED: Firebase has newer data!', {
              firebaseTime: currentData.updatedAt,
              ourTime: lastKnownUpdate,
              difference: (currentTimestamp - ourTimestamp) / 1000 + ' seconds'
            });
            
            // Show user-friendly warning
            const shouldOverwrite = window.confirm(
              '⚠️ DATA CONFLICT DETECTED!\n\n' +
              'Firebase has newer data than your current session.\n' +
              'This might be from another tab or device.\n\n' +
              'Firebase data updated: ' + new Date(currentData.updatedAt).toLocaleString() + '\n' +
              'Your session started: ' + new Date(lastKnownUpdate).toLocaleString() + '\n\n' +
              'Click OK to OVERWRITE Firebase data (you might lose recent changes)\n' +
              'Click Cancel to REFRESH and load the newer data'
            );
            
            if (!shouldOverwrite) {
              console.log('🔄 User chose to load newer data instead of overwriting');
              // Reload the page to get fresh data
              window.location.reload();
              return;
            } else {
              console.log('⚠️ User confirmed overwrite of newer Firebase data');
            }
          }
        }
        
        await FirestoreService.saveFlowchart(nodes, edges, dbType, collections, separators);
        
        // Track last successful save
        const saveTime = new Date().toISOString();
        localStorage.setItem('lastDataUpdate', saveTime);
        localStorage.setItem('lastDataSnapshot', JSON.stringify({
          nodes: nodes.length,
          edges: edges.length,
          collections: collections.length,
          separators: separators.length,
          timestamp: saveTime
        }));
        
        console.log('✅ Auto-saved to Firestore at', saveTime);
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 1000); // Debounce for 1 second
  }, [nodes, edges, collections, separators, dbType, isConnected]);

  // Load data from Firestore on initialization
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Loading initial data from Firestore...');
        
        // Check what we had before
        const lastSnapshot = localStorage.getItem('lastDataSnapshot');
        if (lastSnapshot) {
          console.log('📄 Last known data snapshot:', JSON.parse(lastSnapshot));
        }
        
        const data = await FirestoreService.loadFlowchart();
        
        if (data) {
          console.log('📥 Loaded data from Firestore:', {
            nodes: data.nodes?.length || 0,
            edges: data.edges?.length || 0,
            collections: data.collections?.length || 0,
            separators: data.separators?.length || 0,
            updatedAt: data.updatedAt,
            createdAt: data.createdAt
          });
          
          setNodes(data.nodes || []);
          
          // Validate and clean edges before setting them
          const validEdges = (data.edges || []).filter(edge => {
            // Define valid handle directions based on new architecture:
            // - All field handles (document & array internal) are OUTPUTS (source)
            // - All array node handles are INPUTS (target)
            const validSourceHandles = ['right', 'bottom'];
            const validTargetHandles = ['left', 'top'];
            
            // Check handle validity - allow all array field handles as valid source handles
            const hasValidSourceHandle = !edge.sourceHandle || 
              validSourceHandles.includes(edge.sourceHandle) || 
              edge.sourceHandle.startsWith('array-') || // Document array field handles
              edge.sourceHandle.startsWith('array-field-'); // Array node internal array field handles
            
            // Check target handle validity - allow array node handles as valid targets
            const hasValidTargetHandle = !edge.targetHandle || 
              validTargetHandles.includes(edge.targetHandle) || 
              edge.targetHandle === 'input' ||
              edge.targetHandle === 'left' || // Array node left handle (input)
              edge.targetHandle === 'right'; // Array node right handle (input)
            
            // Check if nodes exist
            const sourceExists = (data.nodes || []).some(node => node.id === edge.source);
            const targetExists = (data.nodes || []).some(node => node.id === edge.target);
            
            const isValid = hasValidSourceHandle && hasValidTargetHandle && sourceExists && targetExists;
            
            if (!isValid) {
              console.warn('🧹 Removing invalid edge:', {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                reasons: {
                  invalidSource: !hasValidSourceHandle,
                  invalidTarget: !hasValidTargetHandle,
                  missingSourceNode: !sourceExists,
                  missingTargetNode: !targetExists
                }
              });
            }
            
            return isValid;
          });
          
          if (validEdges.length !== (data.edges || []).length) {
            console.log(`🧹 Cleaned ${(data.edges || []).length - validEdges.length} invalid edges`);
          }
          
          setEdges(validEdges);
          
          const loadedCollections = data.collections || [];
          setSeparators(data.separators || []);
          
          // Create a default collection if none exist
          if (loadedCollections.length === 0) {
            console.log('🆕 Creating default collection (none found in Firebase)');
            const defaultCollection = {
              id: generateUniqueId(),
              name: 'Default',
              description: 'Default collection for documents'
            };
            setCollections([defaultCollection]);
          } else {
            console.log('📚 Using collections from Firebase:', loadedCollections);
            setCollections(loadedCollections);
          }
          
          setDbType(data.dbType || 'document');
          console.log('✅ Successfully loaded data from Firestore');
        } else {
          console.log('⚠️ No data found in Firebase - creating fresh state');
          // Create a default collection for new users
          const defaultCollection = {
            id: generateUniqueId(),
            name: 'Default',
            description: 'Default collection for documents'
          };
          setCollections([defaultCollection]);
        }
        
        setIsConnected(true);
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        
        // Log more details about the error
        if (error instanceof Error) {
          console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        
        setIsConnected(false);
      } finally {
        setIsLoading(false);
        // Set initialization flag after a small delay to ensure all state updates are complete
        setTimeout(() => {
          isInitialized.current = true;
          console.log('🎯 Database context initialized');
        }, 100);
      }
    };

    loadInitialData();
  }, []);

  // Auto-save when nodes, edges, or dbType change
  useEffect(() => {
    autoSave();
  }, [autoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const addNode = (type: string, position: { x: number, y: number }) => {
    const newNode: Node<NodeData> = {
      id: generateUniqueId(),
      type: type as 'document' | 'array' | 'process',
      position,
      data: {
        label: type === 'document' ? 'New Document' : 
               type === 'array' ? 'Unconnected Array' : 'New Process',
        type: type as 'document' | 'array' | 'process',
        fields: [],
        properties: type === 'process' ? { description: '' } : {},
      },
    };
    
    console.log('🆕 Adding new node:', newNode);
    setNodes((nds) => nds.concat(newNode));
    return newNode.id;
  };

  const updateNodeData = (nodeId: string, data: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...data,
              // Handle properties merging properly
              properties: data.properties ? {
                ...node.data.properties,
                ...data.properties
              } : node.data.properties
            },
          };
          console.log('🔄 Updating node data:', nodeId, data, 'Result:', updatedNode);
          return updatedNode;
        }
        return node;
      })
    );
  };

  const removeNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    // Also remove connected edges
    setEdges((eds) => eds.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
    setCollections([]);
    setSeparators([]);
  };

  const exportFlow = () => {
    return JSON.stringify({ nodes, edges, collections, separators, dbType });
  };

  const importFlow = (data: string) => {
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.nodes && parsedData.edges) {
        setNodes(parsedData.nodes);
        setEdges(parsedData.edges);
        if (parsedData.collections) {
          setCollections(parsedData.collections);
        }
        if (parsedData.separators) {
          setSeparators(parsedData.separators);
        }
        if (parsedData.dbType) {
          setDbType(parsedData.dbType);
        }
      }
    } catch (error) {
      console.error('Failed to import flow data:', error);
    }
  };

  const exportBackup = () => {
    const backupData = {
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
    
    return JSON.stringify(backupData, null, 2);
  };

  const importBackup = (backupData: string) => {
    try {
      const parsedData = JSON.parse(backupData);
      
      // Validate backup data structure
      if (!parsedData.data || !parsedData.version) {
        throw new Error('Invalid backup file format');
      }
      
      const { 
        nodes: importNodes, 
        edges: importEdges, 
        collections: importCollections, 
        separators: importSeparators, 
        dbType: importDbType 
      } = parsedData.data;
      
      // Apply imported data
      if (importNodes) setNodes(importNodes);
      if (importEdges) setEdges(importEdges);
      if (importCollections) setCollections(importCollections);
      if (importSeparators) setSeparators(importSeparators);
      if (importDbType) setDbType(importDbType);
      
      // Update local storage with current time
      localStorage.setItem('lastDataUpdate', new Date().toISOString());
      
      console.log('✅ Backup imported successfully via context');
      
    } catch (error) {
      console.error('❌ Failed to import backup data:', error);
      throw error;
    }
  };

  const saveToFirestore = async () => {
    try {
      // Check for conflicts before manual save
      const currentData = await FirestoreService.loadFlowchart();
      const lastKnownUpdate = localStorage.getItem('lastDataUpdate');
      
      if (currentData && currentData.updatedAt && lastKnownUpdate) {
        const currentTimestamp = new Date(currentData.updatedAt).getTime();
        const ourTimestamp = new Date(lastKnownUpdate).getTime();
        
        if (currentTimestamp > ourTimestamp) {
          console.warn('⚠️ MANUAL SAVE CONFLICT: Firebase has newer data!');
          
          const shouldOverwrite = window.confirm(
            '⚠️ DATA CONFLICT DETECTED!\n\n' +
            'Firebase has newer data than your current session.\n' +
            'This might be from another tab or device.\n\n' +
            'Firebase data updated: ' + new Date(currentData.updatedAt).toLocaleString() + '\n' +
            'Your session started: ' + new Date(lastKnownUpdate).toLocaleString() + '\n\n' +
            'Click OK to OVERWRITE Firebase data (you might lose recent changes)\n' +
            'Click Cancel to REFRESH and load the newer data'
          );
          
          if (!shouldOverwrite) {
            window.location.reload();
            return;
          }
        }
      }
      
      await FirestoreService.saveFlowchart(nodes, edges, dbType, collections, separators);
      
      // Update last save time
      const saveTime = new Date().toISOString();
      localStorage.setItem('lastDataUpdate', saveTime);
      
      console.log('✅ Manual save successful');
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      throw error;
    }
  };

  const loadFromFirestore = async () => {
    try {
      setIsLoading(true);
      const data = await FirestoreService.loadFlowchart();
      
      if (data) {
        setNodes(data.nodes || []);
        
        // Validate and clean edges before setting them
        const validEdges = (data.edges || []).filter(edge => {
          // Define valid handle directions based on new architecture:
          // - All field handles (document & array internal) are OUTPUTS (source)
          // - All array node handles are INPUTS (target)
          const validSourceHandles = ['right', 'bottom'];
          const validTargetHandles = ['left', 'top'];
          
          // Check handle validity - allow all array field handles as valid source handles
          const hasValidSourceHandle = !edge.sourceHandle || 
            validSourceHandles.includes(edge.sourceHandle) || 
            edge.sourceHandle.startsWith('array-') || // Document array field handles
            edge.sourceHandle.startsWith('array-field-'); // Array node internal array field handles
          
          // Check target handle validity - allow array node handles as valid targets
          const hasValidTargetHandle = !edge.targetHandle || 
            validTargetHandles.includes(edge.targetHandle) || 
            edge.targetHandle === 'input' ||
            edge.targetHandle === 'left' || // Array node left handle (input)
            edge.targetHandle === 'right'; // Array node right handle (input)
          
          // Check if nodes exist
          const sourceExists = (data.nodes || []).some(node => node.id === edge.source);
          const targetExists = (data.nodes || []).some(node => node.id === edge.target);
          
          const isValid = hasValidSourceHandle && hasValidTargetHandle && sourceExists && targetExists;
          
          if (!isValid) {
            console.warn('🧹 Manual load: Removing invalid edge:', {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle
            });
          }
          
          return isValid;
        });
        
        if (validEdges.length !== (data.edges || []).length) {
          console.log(`🧹 Manual load: Cleaned ${(data.edges || []).length - validEdges.length} invalid edges`);
        }
        
        setEdges(validEdges);
        setCollections(data.collections || []);
        setSeparators(data.separators || []);
        setDbType(data.dbType || 'document');
      }
      
      setIsConnected(true);
    } catch (error) {
      console.error('❌ Manual load failed:', error);
      setIsConnected(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addCollection = (name: string, description?: string) => {
    const newCollection: Collection = {
      id: generateUniqueId(),
      name,
      description,
    };
    
    console.log('🆕 Adding new collection:', newCollection);
    setCollections((collections) => collections.concat(newCollection));
    return newCollection.id;
  };

  const updateCollection = (id: string, data: Partial<Omit<Collection, 'id'>>) => {
    setCollections((collections) =>
      collections.map((collection) => {
        if (collection.id === id) {
          return {
            ...collection,
            ...data,
          };
        }
        return collection;
      })
    );
  };

  const removeCollection = (id: string) => {
    setCollections((collections) => collections.filter((collection) => collection.id !== id));
  };

  const addSeparator = (x: number, label?: string, color?: string) => {
    const newSeparator: Separator = {
      id: generateUniqueId(),
      x,
      label: label || 'Section',
      color: color || '#3b82f6',
    };
    
    console.log('🆕 Adding new separator:', newSeparator);
    setSeparators((separators) => separators.concat(newSeparator));
    return newSeparator.id;
  };

  const updateSeparator = (id: string, data: Partial<Omit<Separator, 'id'>>) => {
    setSeparators((separators) =>
      separators.map((separator) => {
        if (separator.id === id) {
          return {
            ...separator,
            ...data,
          };
        }
        return separator;
      })
    );
  };

  const removeSeparator = (id: string) => {
    setSeparators((separators) => separators.filter((separator) => separator.id !== id));
  };

  return (
    <DatabaseContext.Provider 
      value={{ 
        nodes, 
        edges, 
        collections,
        separators,
        dbType,
        isLoading,
        isConnected,
        setNodes, 
        setEdges, 
        setDbType,
        addNode, 
        updateNodeData, 
        removeNode, 
        clearAll,
        exportFlow,
        importFlow,
        exportBackup,
        importBackup,
        saveToFirestore,
        loadFromFirestore,
        addCollection,
        updateCollection,
        removeCollection,
        addSeparator,
        updateSeparator,
        removeSeparator
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};