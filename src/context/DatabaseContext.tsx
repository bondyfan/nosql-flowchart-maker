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

  // Auto-save function with debouncing
  const autoSave = useCallback(async () => {
    if (!isInitialized.current || !isConnected) {
      console.log('🔄 Auto-save skipped - not initialized or not connected');
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
        await FirestoreService.saveFlowchart(nodes, edges, dbType, collections, separators);
        console.log('✅ Auto-saved to Firestore');
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
        const data = await FirestoreService.loadFlowchart();
        
        if (data) {
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          const loadedCollections = data.collections || [];
          setSeparators(data.separators || []);
          
          // Create a default collection if none exist
          if (loadedCollections.length === 0) {
            const defaultCollection = {
              id: generateUniqueId(),
              name: 'Default',
              description: 'Default collection for documents'
            };
            setCollections([defaultCollection]);
          } else {
            setCollections(loadedCollections);
          }
          
          setDbType(data.dbType || 'document');
          console.log('✅ Loaded data from Firestore:', data.nodes?.length || 0, 'nodes');
        } else {
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
        setIsConnected(false);
      } finally {
        setIsLoading(false);
        // Set initialization flag after a small delay to ensure all state updates are complete
        setTimeout(() => {
          isInitialized.current = true;
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
               type === 'array' ? 'New Array' : 'New Process',
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

  const saveToFirestore = async () => {
    try {
      await FirestoreService.saveFlowchart(nodes, edges, dbType, collections, separators);
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
        setEdges(data.edges || []);
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