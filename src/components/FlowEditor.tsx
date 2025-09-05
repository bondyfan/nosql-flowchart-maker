import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  addEdge, 
  useReactFlow, 
  Edge, 
  Connection,
  ConnectionMode,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';
import Sidebar from './Sidebar';
import CollectionNode from './nodes/CollectionNode';
import ArrayNode from './nodes/ArrayNode';
import ProcessNode from './nodes/ProcessNode';
import CustomEdge from './edges/CustomEdge';
import PropertiesModal from './PropertiesModal';
import Separator from './Separator';
import { NodeData } from '../types';

const nodeTypes = {
  document: CollectionNode,
  collection: CollectionNode,
  array: ArrayNode,
  process: ProcessNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

interface FlowEditorProps {
  sidebarOpen: boolean;
  onUndoRedoChange?: (undoFn: () => void, redoFn: () => void, canUndo: boolean, canRedo: boolean) => void;
}

const FlowEditor: React.FC<FlowEditorProps> = ({ sidebarOpen, onUndoRedoChange }) => {
  const { 
    nodes, 
    edges, 
    separators,
    setNodes, 
    setEdges, 
    updateSeparator,
    removeSeparator
  } = useDatabase();
  const { theme } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedSeparator, setSelectedSeparator] = useState<string | null>(null);
  const [selectedProcessNode, setSelectedProcessNode] = useState<string | null>(null);
  const [modalNode, setModalNode] = useState<Node<NodeData> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [undoHistory, setUndoHistory] = useState<Array<{
    type: string;
    data: any;
    timestamp: number;
  }>>([]);
  const [redoHistory, setRedoHistory] = useState<Array<{
    type: string;
    data: any;
    timestamp: number;
  }>>([]);
  const { project } = useReactFlow();

  // Filter nodes and their fields based on selected process
  const getVisibleNodesWithFilteredFields = () => {
    if (!selectedProcessNode) {
      // No process selected, show all nodes with all fields
      return { nodes, cumulativeReferencedDocuments: new Set(), cumulativeReferencedFields: new Map() };
    }

    // Get all process nodes and build connection graph
    const processNodes = nodes.filter(n => n.type === 'process');
    const processConnections = new Map(); // processId -> [connected process IDs]
    const incomingConnections = new Map(); // processId -> [source process IDs]
    
    // Build connection maps from edges - only consider valid directional connections
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode?.type === 'process' && targetNode?.type === 'process') {
        // Only count connections from output ports (right/bottom) to input ports (left/top)
        const isValidConnection = 
          (edge.sourceHandle === 'right' || edge.sourceHandle === 'bottom') &&
          (edge.targetHandle === 'left' || edge.targetHandle === 'top');
          
        if (isValidConnection) {
          // Outgoing connections
        if (!processConnections.has(edge.source)) {
          processConnections.set(edge.source, []);
        }
        processConnections.get(edge.source).push(edge.target);
          
          // Incoming connections
          if (!incomingConnections.has(edge.target)) {
            incomingConnections.set(edge.target, []);
          }
          incomingConnections.get(edge.target).push(edge.source);
        }
      }
    });

    // Find the starting process (one with no incoming process connections)
    const findStartingProcess = () => {
      for (const processNode of processNodes) {
        if (!incomingConnections.has(processNode.id) || incomingConnections.get(processNode.id).length === 0) {
          return processNode.id;
        }
      }
      // If no clear start found (circular references), use the first process
      return processNodes[0]?.id;
    };

    // Build the complete flow chain from the starting process
    const buildFlowChain = () => {
      const startingProcessId = findStartingProcess();
      if (!startingProcessId) return [];
      
      const visited = new Set();
      const chain = [];
      
      const traverse = (processId) => {
        if (visited.has(processId)) return;
        visited.add(processId);
        chain.push(processId);
        
        const connections = processConnections.get(processId) || [];
        // Sort connections to ensure consistent order
        connections.sort().forEach(connectedId => {
          if (processNodes.find(p => p.id === connectedId)) {
            traverse(connectedId);
          }
        });
      };
      
      traverse(startingProcessId);
      return chain;
    };

    // Get the complete flow chain
    const completeFlowChain = buildFlowChain();
    
    // Debug logging
    console.log('🔍 Flow Debug:', {
      selectedProcess: selectedProcessNode,
      allProcesses: processNodes.map(p => p.id),
      processConnections: Object.fromEntries(processConnections),
      incomingConnections: Object.fromEntries(incomingConnections),
      completeFlowChain,
      relevantEdges: edges.filter(e => {
        const source = nodes.find(n => n.id === e.source);
        const target = nodes.find(n => n.id === e.target);
        return source?.type === 'process' && target?.type === 'process';
      }).map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
    });
    
    console.log('🔗 All Process Edges:', edges.filter(e => {
      const source = nodes.find(n => n.id === e.source);
      const target = nodes.find(n => n.id === e.target);
      return source?.type === 'process' || target?.type === 'process';
    }).map(e => ({
      id: e.id,
      source: `${e.source} (${nodes.find(n => n.id === e.source)?.data.label})`,
      target: `${e.target} (${nodes.find(n => n.id === e.target)?.data.label})`,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      sourceType: nodes.find(n => n.id === e.source)?.type,
      targetType: nodes.find(n => n.id === e.target)?.type,
      isValidProcessConnection: (e.sourceHandle === 'right' || e.sourceHandle === 'bottom') &&
                               (e.targetHandle === 'left' || e.targetHandle === 'top') &&
                               nodes.find(n => n.id === e.source)?.type === 'process' &&
                               nodes.find(n => n.id === e.target)?.type === 'process'
    })));
    
    // Find processes up to and including the selected one in flow order
    const selectedProcessIndex = completeFlowChain.indexOf(selectedProcessNode);
    let relevantProcessIds = [];
    
    if (selectedProcessIndex >= 0) {
      // Take processes up to and including the selected one
      relevantProcessIds = completeFlowChain.slice(0, selectedProcessIndex + 1);
    } else {
      // If selected process not in main chain, build a chain starting from the selected process
      console.warn(`⚠️ Selected process "${selectedProcessNode}" not found in main flow chain!`);
      console.log('🔧 Building chain from selected process instead...');
      
      // Find all processes that lead TO the selected process (working backwards)
      const buildBackwardsChain = (processId, visited = new Set()) => {
        if (visited.has(processId)) return [];
        visited.add(processId);
        
        const predecessors = incomingConnections.get(processId) || [];
        let chain = [];
        
        // Add all predecessors first (recursively)
        for (const pred of predecessors) {
          chain.push(...buildBackwardsChain(pred, visited));
        }
        
        // Then add this process
        chain.push(processId);
        return chain;
      };
      
      // Build chain including all processes that lead to the selected one
      relevantProcessIds = buildBackwardsChain(selectedProcessNode);
      
      console.log('🔧 Built backwards chain:', relevantProcessIds.map(id => {
        const node = nodes.find(n => n.id === id);
        return `${id} (${node?.data.label})`;
      }));
    }
    
    console.log('📊 Relevant Process IDs:', relevantProcessIds);
    console.log('📊 Selected Process Index:', selectedProcessIndex);
    console.log('📊 Complete Flow Chain:', completeFlowChain);
    
    const referencedDocuments = new Set();
    const documentsWithDocumentActions = new Set(); // Only documents with actual document-level actions
    const documentFieldsMap = new Map(); // documentId -> Set of field names
    const cumulativeFieldValues = new Map(); // documentId -> Map(fieldName -> { valueType, fixedValue })

    // Collect actions from all relevant processes in correct flow order
    relevantProcessIds.forEach(processId => {
      const processNode = nodes.find(n => n.id === processId);
      const processActions = processNode?.data.properties?.processActions || [];
      
      console.log(`🔄 Processing ${processActions.length} actions from process "${processNode?.data.label}" (${processId})`);
      
      // Sort actions within this process by their creation timestamp to ensure proper order
      const sortedActions = [...processActions].sort((a, b) => {
        const timeA = new Date(a.savedAt || 0).getTime();
        const timeB = new Date(b.savedAt || 0).getTime();
        return timeA - timeB; // Earlier actions first
      });
      
      console.log(`🔄 Processing actions for process "${processNode?.data.label}" (${processId}):`, 
        sortedActions.map(a => ({
          type: a.type,
          nodeId: a.nodeId,
          fieldName: a.fieldName || 'N/A',
          valueType: a.valueType || 'N/A',
          fixedValue: a.fixedValue || 'N/A',
          savedAt: a.savedAt,
          documentLabel: a.documentLabel || 'N/A'
        }))
      );
      
      sortedActions.forEach(action => {
        if (action.type === 'document') {
          referencedDocuments.add(action.nodeId);
          documentsWithDocumentActions.add(action.nodeId); // Track document-level actions separately
          console.log(`  📄 Added document action for ${action.nodeId} - ${action.documentLabel}`);
        } else if (action.type === 'field') {
          referencedDocuments.add(action.nodeId); // Add the document
          
          // Track which fields are referenced for this document
          if (!documentFieldsMap.has(action.nodeId)) {
            documentFieldsMap.set(action.nodeId, new Set());
          }
          documentFieldsMap.get(action.nodeId).add(action.fieldName);

          // Track cumulative field values - later values override earlier ones (flow order)
          if (action.valueType) {
            if (!cumulativeFieldValues.has(action.nodeId)) {
              cumulativeFieldValues.set(action.nodeId, new Map());
            }
            const prevValue = cumulativeFieldValues.get(action.nodeId).get(action.fieldName);
            cumulativeFieldValues.get(action.nodeId).set(action.fieldName, {
              valueType: action.valueType,
              fixedValue: action.fixedValue
            });
            
            console.log(`  📝 Field "${action.fieldName}" value updated:`, 
              prevValue ? `${prevValue.valueType}${prevValue.fixedValue ? `:"${prevValue.fixedValue}"` : ''}` : 'none',
              '→',
              `${action.valueType}${action.fixedValue ? `:"${action.fixedValue}"` : ''}`
            );
          }
        }
      });
    });
    
    console.log('🎯 Final cumulative document actions:', Array.from(documentsWithDocumentActions));
    console.log('📋 Final cumulative field values:', 
      Object.fromEntries(
        Array.from(cumulativeFieldValues.entries()).map(([docId, fieldMap]) => [
          docId,
          Object.fromEntries(fieldMap.entries())
        ])
      )
    );

    // Filter and modify nodes
    const filteredNodes = nodes.map(node => {
      if (node.type === 'process') {
        return node; // Always show all process nodes
      }
      
      if ((node.type === 'document' || node.type === 'collection') && referencedDocuments.has(node.id)) {
        // Show document but filter its fields
        const referencedFields = documentFieldsMap.get(node.id);
        if (referencedFields && referencedFields.size > 0) {
          // Filter fields to only show referenced ones
          const filteredFields = node.data.fields?.filter(field => 
            referencedFields.has(field.name)
          ) || [];
          
          return {
            ...node,
            data: {
              ...node.data,
              fields: filteredFields,
              _cumulativeFieldValues: cumulativeFieldValues.get(node.id) || new Map()
            }
          };
        }
        return {
          ...node,
          data: {
            ...node.data,
            _cumulativeFieldValues: cumulativeFieldValues.get(node.id) || new Map()
          }
        }; // Show document with all fields if no specific fields referenced
      }
      
      if (node.type === 'array' && referencedDocuments.has(node.id)) {
        return node; // Show field nodes that are referenced
      }
      
      return null; // Hide non-referenced nodes
    }).filter(node => node !== null);

    return { 
      nodes: filteredNodes, 
      cumulativeReferencedDocuments: referencedDocuments, 
      cumulativeDocumentsWithDocumentActions: documentsWithDocumentActions,
      cumulativeReferencedFields: documentFieldsMap 
    };
  };

  const { nodes: visibleNodes, cumulativeReferencedDocuments, cumulativeDocumentsWithDocumentActions, cumulativeReferencedFields } = getVisibleNodesWithFilteredFields();

  // Snapping threshold - edges will snap to straight lines if they're within this distance
  const SNAP_THRESHOLD = 10;

  // Function to update array node names based on connected fields
  const updateArrayNodeNames = useCallback(() => {
    setNodes(currentNodes => {
      return currentNodes.map(node => {
        if (node.type !== 'array') return node;
        
        // Find edges connecting TO this array node (incoming connections to either left or right)
        const connectingEdge = edges.find(edge => 
          edge.target === node.id && (edge.targetHandle === 'left' || edge.targetHandle === 'right' || edge.targetHandle === 'input')
        );
        
        console.log(`🔍 Checking array node "${node.data.label}" (${node.id}):`, {
          connectingEdge: connectingEdge ? {
            id: connectingEdge.id,
            source: connectingEdge.source,
            sourceHandle: connectingEdge.sourceHandle,
            target: connectingEdge.target,
            targetHandle: connectingEdge.targetHandle
          } : null,
          allIncomingEdges: edges.filter(e => e.target === node.id).map(e => ({
            source: e.source,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle
          }))
        });
        
        if (connectingEdge) {
          // Find the source node
          const sourceNode = currentNodes.find(n => n.id === connectingEdge.source);
          
          if (sourceNode && (sourceNode.type === 'document' || sourceNode.type === 'collection') && connectingEdge.sourceHandle?.startsWith('array-')) {
            // Handle connections from document array fields
            const handleParts = connectingEdge.sourceHandle.split('-');
            const fieldIndex = parseInt(handleParts[1]);
            const field = sourceNode.data.fields?.[fieldIndex];
            
            console.log(`📄 Document connection: field index ${fieldIndex}, field:`, field);
            
            if (field && field.type === 'array') {
              // Update array node name to match the field name
              const newLabel = field.name;
              
              if (node.data.label !== newLabel) {
                console.log(`🔄 Auto-updating array node "${node.data.label}" → "${newLabel}" (from document)`);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: newLabel,
                    _connectedFieldName: field.name,
                    _sourceDocumentLabel: sourceNode.data.label,
                    _isAutoNamed: true
                  }
                };
              }
            }
          } else if (sourceNode && sourceNode.type === 'array' && connectingEdge.sourceHandle?.startsWith('array-field-')) {
            // Handle connections from array node internal fields to other array nodes
            const handleParts = connectingEdge.sourceHandle.split('-');
            const fieldIndex = parseInt(handleParts[2]); // array-field-{index}-right
            const field = sourceNode.data.fields?.[fieldIndex];
            
            console.log(`🔗 Array field connection: field index ${fieldIndex}, field:`, field);
            
            if (field && field.type === 'array') {
              // Update array node name to match the field name from the source array
              const newLabel = field.name;
              
              if (node.data.label !== newLabel) {
                console.log(`🔄 Auto-updating array node "${node.data.label}" → "${newLabel}" (from array field)`);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label: newLabel,
                    _connectedFieldName: field.name,
                    _sourceDocumentLabel: `${sourceNode.data.label} → ${field.name}`,
                    _isAutoNamed: true
                  }
                };
              }
            }
          }
        } else {
          // No connection found - reset to default name if it was auto-named
          if (node.data._isAutoNamed) {
            const defaultLabel = 'Unconnected Array';
            console.log(`🔄 Resetting array node name: "${node.data.label}" → "${defaultLabel}"`);
            return {
              ...node,
              data: {
                ...node.data,
                label: defaultLabel,
                _connectedFieldName: undefined,
                _sourceDocumentLabel: undefined,
                _isAutoNamed: false
              }
            };
          }
        }
        
        return node;
      });
    });
  }, [edges]);


  // Update array node names when edges change
  useEffect(() => {
    updateArrayNodeNames();
  }, [edges, updateArrayNodeNames]);

  // Save current state for undo
  const saveStateForUndo = (actionType: string, data: any) => {
    const action = {
      type: actionType,
      data,
      timestamp: Date.now()
    };
    
    setUndoHistory(prev => [...prev.slice(-19), action]); // Keep last 20 actions
    setRedoHistory([]); // Clear redo history when new action is performed
  };

  // Undo function
  const performUndo = () => {
    if (undoHistory.length === 0) return;
    
    const lastAction = undoHistory[undoHistory.length - 1];
    
    switch (lastAction.type) {
      case 'DELETE_NODE':
        // Restore deleted node
        setNodes(nds => [...nds, lastAction.data.node]);
        // Restore edges connected to the node
        if (lastAction.data.edges && lastAction.data.edges.length > 0) {
          setEdges(eds => [...eds, ...lastAction.data.edges]);
        }
        break;
        
      case 'DELETE_EDGE':
        // Restore deleted edge
        setEdges(eds => [...eds, lastAction.data]);
        break;
        
      case 'DELETE_SEPARATOR':
        // Restore deleted separator
        updateSeparator(lastAction.data.id, lastAction.data);
        break;
        
      case 'ADD_NODE':
        // Remove added node
        setNodes(nds => nds.filter(n => n.id !== lastAction.data.id));
        break;
        
      case 'ADD_EDGE':
        // Remove added edge
        setEdges(eds => eds.filter(e => e.id !== lastAction.data.id));
        break;
    }
    
    // Move action to redo history
    setRedoHistory(prev => [...prev, lastAction]);
    setUndoHistory(prev => prev.slice(0, -1));
  };

  // Redo function
  const performRedo = () => {
    if (redoHistory.length === 0) return;
    
    const lastRedoAction = redoHistory[redoHistory.length - 1];
    
    switch (lastRedoAction.type) {
      case 'DELETE_NODE':
        // Re-delete the node
        setNodes(nds => nds.filter(n => n.id !== lastRedoAction.data.node.id));
        // Re-delete connected edges
        if (lastRedoAction.data.edges && lastRedoAction.data.edges.length > 0) {
          const edgeIds = lastRedoAction.data.edges.map(e => e.id);
          setEdges(eds => eds.filter(e => !edgeIds.includes(e.id)));
        }
        break;
        
      case 'DELETE_EDGE':
        // Re-delete the edge
        setEdges(eds => eds.filter(e => e.id !== lastRedoAction.data.id));
        break;
        
      case 'DELETE_SEPARATOR':
        // Re-delete the separator
        removeSeparator(lastRedoAction.data.id);
        break;
        
      case 'ADD_NODE':
        // Re-add the node
        setNodes(nds => [...nds, lastRedoAction.data]);
        break;
        
      case 'ADD_EDGE':
        // Re-add the edge
        setEdges(eds => [...eds, lastRedoAction.data]);
        break;
    }
    
    // Move action back to undo history
    setUndoHistory(prev => [...prev, lastRedoAction]);
    setRedoHistory(prev => prev.slice(0, -1));
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      // Add debug logging
      console.log('🔗 Connection attempt:', {
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        sourceNode: nodes.find(n => n.id === params.source)?.type,
        targetNode: nodes.find(n => n.id === params.target)?.type
      });

      // First, validate handle directions to prevent React Flow errors
      const sourceHandle = params.sourceHandle;
      const targetHandle = params.targetHandle;
      
      // Define valid handle directions
      const validSourceHandles = ['right', 'bottom']; // Standard output handles
      const validTargetHandles = ['left', 'top']; // Standard input handles
      
      // Check if handles are valid for their roles
      // Allow array field handles as valid source handles
      const isValidSourceHandle = !sourceHandle || 
        validSourceHandles.includes(sourceHandle) || 
        sourceHandle.startsWith('array-') ||
        sourceHandle.startsWith('array-field-');
      
      if (!isValidSourceHandle) {
        console.warn(`Connection rejected: Invalid source handle "${sourceHandle}". Source must be 'right', 'bottom', or an array field handle.`);
        return;
      }
      
      // Allow "input", "left", "right" as valid target handles for array nodes  
      const isValidTargetHandle = !targetHandle || 
        validTargetHandles.includes(targetHandle) || 
        targetHandle === 'input' ||
        targetHandle === 'left' ||
        targetHandle === 'right';
      
      if (!isValidTargetHandle) {
        console.warn(`Connection rejected: Invalid target handle "${targetHandle}". Target must be 'left', 'top', 'right', or 'input'.`);
        return;
      }
      
      // Validate nodes exist
      const sourceNode = nodes.find(node => node.id === params.source);
      const targetNode = nodes.find(node => node.id === params.target);
      
      if (!sourceNode || !targetNode) {
        console.warn('Connection rejected: Source or target node not found');
        return;
      }
      
      // Prevent self-connections
      if (params.source === params.target) {
        console.warn('Connection rejected: Cannot connect node to itself');
        return;
      }
      
      // Check if trying to connect from document array field to array node
      if ((sourceNode.type === 'document' || sourceNode.type === 'collection') && targetNode.type === 'array') {
        // Check if the source handle corresponds to an array field
        if (sourceHandle && sourceHandle.startsWith('array-')) {
          const handleParts = sourceHandle.split('-');
          const fieldIndex = parseInt(handleParts[1]);
          const field = sourceNode.data.fields?.[fieldIndex];
          if (!field || field.type !== 'array') {
            console.warn('Connection rejected: Source handle does not correspond to an array field');
            return;
          }
          // Both left and right handles are valid for array nodes (both are inputs)
          if (targetHandle !== 'left' && targetHandle !== 'right') {
            console.warn('Connection rejected: Target handle must be left or right for array nodes');
            return;
          }
        } else {
          console.warn('Connection rejected: Source handle must be an array field handle');
          return;
        }
      } else if (sourceNode.type === 'array' && targetNode.type === 'array') {
        // Allow connections between array nodes via internal array fields
        if (sourceHandle === 'right' || sourceHandle === 'left') {
          // BLOCK connections from array general handles - they are inputs
          console.warn('Connection rejected: Cannot connect from array general handles - they are inputs, not outputs');
          return;
        }
        if (!sourceHandle?.startsWith('array-field-')) {
          console.warn('Connection rejected: Source handle must be an array field handle from array node');
          return;
        }
        if (targetHandle !== 'left' && targetHandle !== 'right') {
          console.warn('Connection rejected: Target handle must be left or right for array nodes');
          return;
        }
      } else if (sourceNode.type === 'array' && targetNode.type === 'document') {
        // BLOCK array to document connections - wrong data flow direction
        console.warn('Connection rejected: Cannot connect from array node to document - data must flow FROM fields TO arrays');
        return;
      } else if (targetNode.type === 'document' && targetHandle?.startsWith('array-')) {
        // BLOCK connections TO document array fields - they are outputs, not inputs
        console.warn('Connection rejected: Cannot connect to document array fields - they are outputs, not inputs');
        return;
      } else if (sourceNode.type === 'process' || targetNode.type === 'process') {
        // Allow process nodes to connect to any other node type with valid handles
        // Process nodes have top, left, right, bottom handles which are already validated above
        console.log('✅ Process connection allowed');
      } else if (((sourceNode.type === 'document' || sourceNode.type === 'collection' || sourceNode.type === 'array') && 
                 (targetNode.type === 'document' || targetNode.type === 'collection' || targetNode.type === 'array'))) {
        // Reject other connections between document/array nodes that don't follow the rules above
        console.warn('Connection rejected: Invalid connection between document and array nodes');
        return;
      }

      const newEdge = {
      ...params,
        id: `edge-${Date.now()}`,
      type: 'custom',
      animated: true,
      } as Edge;

      // Save state for undo
      saveStateForUndo('ADD_EDGE', newEdge);

      setEdges((eds) => {
        // Handle snapping logic
        if (sourceNode && targetNode) {
          // Only snap for valid directional connections (output to input)
          const isValidHorizontalConnection = sourceHandle === 'right' && targetHandle === 'left';
          const isValidVerticalConnection = sourceHandle === 'bottom' && targetHandle === 'top';
          
          if (isValidHorizontalConnection) {
            const yDiff = Math.abs(sourceNode.position.y - targetNode.position.y);
            if (yDiff <= SNAP_THRESHOLD) {
              // Move target node to align with source horizontally
              setNodes(nds => nds.map(node => 
                node.id === targetNode.id 
                  ? { ...node, position: { ...node.position, y: sourceNode.position.y } }
                  : node
              ));
            }
          } else if (isValidVerticalConnection) {
            const xDiff = Math.abs(sourceNode.position.x - targetNode.position.x);
            if (xDiff <= SNAP_THRESHOLD) {
              // Move target node to align with source vertically
              setNodes(nds => nds.map(node => 
                node.id === targetNode.id 
                  ? { ...node, position: { ...node.position, x: sourceNode.position.x } }
                  : node
              ));
            }
          }
        }

        return addEdge(newEdge, eds);
      });
    },
    [nodes, setEdges]
  );

  const createNode = (type: string, position?: { x: number; y: number }) => {
    const nodePosition = position || project({ x: 100, y: 100 });
    let label = 'New Node';
    let properties = {};
    let fields: any[] = [];

    switch (type) {
      case 'document':
      case 'collection':
        label = 'New Collection';
        properties = {};
        fields = [];
        break;
      case 'array':
        label = 'Unconnected Array';
        properties = {};
        fields = [];
        break;
      case 'process':
        label = 'New Process';
        properties = { description: '' };
        fields = [];
        break;
      default:
        label = 'New Node';
        properties = {};
        fields = [];
    }

    const newNode: Node<NodeData> = {
      id: `${type}-${Date.now()}`,
      type,
      position: nodePosition,
      data: {
        label,
        type,
        fields,
        properties
      },
    };

    // Save state for undo
    saveStateForUndo('ADD_NODE', newNode);

    setNodes((nds) => nds.concat(newNode));
  };

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (reactFlowWrapper.current) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const nodeType = event.dataTransfer.getData('application/reactflow');
        
        // check if the dropped element is valid
        if (!nodeType) {
          return;
        }

        const position = project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        createNode(nodeType, position);
      }
    },
    [project, createNode]
  );

  const onNodesChange = useCallback(
    (changes) => {
      // Apply snapping during node drag
      const snappedChanges = changes.map(change => {
        if (change.type === 'position' && change.dragging && change.position) {
          const nodeId = change.id;
          const newPosition = change.position;
          
          // Find other nodes to snap against
          const otherNodes = nodes.filter(n => n.id !== nodeId);
          let snappedPosition = { ...newPosition };
          
          // Check for horizontal alignment
          for (const otherNode of otherNodes) {
            const otherCenterY = otherNode.position.y + (otherNode.height || 100) / 2;
            const currentCenterY = newPosition.y + (otherNode.height || 100) / 2;
            
            if (Math.abs(otherCenterY - currentCenterY) <= SNAP_THRESHOLD) {
              // Snap to horizontal alignment
              snappedPosition.y = otherNode.position.y;
              break;
            }
          }
          
          // Check for vertical alignment
          for (const otherNode of otherNodes) {
            const otherCenterX = otherNode.position.x + (otherNode.width || 200) / 2;
            const currentCenterX = newPosition.x + (otherNode.width || 200) / 2;
            
            if (Math.abs(otherCenterX - currentCenterX) <= SNAP_THRESHOLD) {
              // Snap to vertical alignment
              snappedPosition.x = otherNode.position.x;
              break;
            }
          }
          
          return { ...change, position: snappedPosition };
        }
        return change;
      });
      
      setNodes((nds) => applyNodeChanges(snappedChanges, nds));
      
      // Update edge snap types after node movement
      setTimeout(() => {
        setEdges((eds) => eds.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (sourceNode && targetNode) {
            const sourceX = sourceNode.position.x + (sourceNode.width || 200) / 2;
            const sourceY = sourceNode.position.y + (sourceNode.height || 100) / 2;
            const targetX = targetNode.position.x + (targetNode.width || 200) / 2;
            const targetY = targetNode.position.y + (targetNode.height || 100) / 2;
            
            const deltaX = Math.abs(targetX - sourceX);
            const deltaY = Math.abs(targetY - sourceY);
            
            let snapType = null;
            if (deltaY <= SNAP_THRESHOLD && deltaX > SNAP_THRESHOLD &&
                edge.sourceHandle === 'right' && edge.targetHandle === 'left') {
              snapType = 'horizontal';
            } else if (deltaX <= SNAP_THRESHOLD && deltaY > SNAP_THRESHOLD &&
                       edge.sourceHandle === 'bottom' && edge.targetHandle === 'top') {
              snapType = 'vertical';
            }
            
            return {
              ...edge,
              data: { ...edge.data, snapType }
            };
          }
          return edge;
        }));
      }, 0);
    },
    [setNodes, setEdges, nodes]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: { id: string, type?: string }) => {
    if (node.type === 'process') {
      // Toggle process selection
      if (selectedProcessNode === node.id) {
        setSelectedProcessNode(null); // Deselect if already selected
      } else {
        setSelectedProcessNode(node.id); // Select new process
      }
    }
    
    setSelectedNode(node.id);
    setSelectedEdge(null);
    setSelectedSeparator(null);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null); // Clear node selection when clicking edge
    setSelectedSeparator(null); // Clear separator selection when clicking edge
  };

  const onNodeDoubleClick = (_: React.MouseEvent, node: Node<NodeData>) => {
    // Open modal for document, array, and process nodes
    if (node.type === 'document' || node.type === 'array' || node.type === 'process') {
      setModalNode(node);
      setIsModalOpen(true);
    }
  };

  const onPaneClick = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setSelectedSeparator(null);
    setSelectedProcessNode(null); // Deselect process when clicking empty area
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalNode(null);
  };

  const handleSeparatorSelect = (separatorId: string) => {
    setSelectedSeparator(separatorId);
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  const handleDeleteSeparator = (separatorId: string) => {
    const separatorToDelete = separators.find(s => s.id === separatorId);
    if (separatorToDelete) {
      // Save state for undo
      saveStateForUndo('DELETE_SEPARATOR', separatorToDelete);
      
      // Remove separator
      removeSeparator(separatorId);
    }
  };

  // Handle keyboard events for deleting selected edge or separator
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedEdge) {
          setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge));
          setSelectedEdge(null);
        } else if (selectedSeparator) {
          handleDeleteSeparator(selectedSeparator);
          setSelectedSeparator(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedEdge, selectedSeparator, setEdges, handleDeleteSeparator]);

  const deleteEdge = (edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setSelectedEdge(null);
  };

  // Update edges with selection styling
  const edgesWithSelection = edges.map((edge) => ({
    ...edge,
    selected: selectedEdge === edge.id,
    data: {
      ...edge.data,
      onDelete: deleteEdge,
    },
    style: {
      ...edge.style,
      stroke: selectedEdge === edge.id ? '#ef4444' : '#3b82f6',
      strokeWidth: selectedEdge === edge.id ? 3 : 2,
    },
    animated: true, // All edges should be animated
  }));

  // Update nodes with selection styling and process highlighting
  const nodesWithSelection = visibleNodes.map((node) => {
    let isDocumentAction = false;
    let referencedFields = new Set();
    let fieldValues = new Map(); // fieldName -> { valueType, fixedValue }
    
    // Use different logic for highlighting vs cumulative values
    if (selectedProcessNode) {
      // HIGHLIGHTING: Only show actions from the CURRENTLY SELECTED process (orange highlighting)
      const selectedProcess = nodes.find(n => n.id === selectedProcessNode);
      const selectedProcessActions = selectedProcess?.data.properties?.processActions || [];
      
      selectedProcessActions.forEach(action => {
        if (action.nodeId === node.id) {
          if (action.type === 'document') {
            isDocumentAction = true;
          } else if (action.type === 'field') {
            referencedFields.add(action.fieldName);
          }
        }
      });

      // FIELD VALUES: Use cumulative field values from all processes up to the selected one
      if (node.data._cumulativeFieldValues) {
        fieldValues = node.data._cumulativeFieldValues;
      }
    }
    
    return {
      ...node,
      selected: selectedNode === node.id,
      data: {
        ...node.data,
        _isDocumentAction: isDocumentAction,
        _referencedFields: referencedFields,
        _fieldValues: fieldValues,
      },
      style: {
        ...node.style,
        // If a process is selected, show full opacity for all visible nodes
        // (since visibleNodes already contains only nodes that should be visible at this process step)
        opacity: 1,
        border: selectedProcessNode === node.id ? '2px solid #3b82f6' : 
                isDocumentAction ? '2px solid #f97316' : undefined,
      }
    };
  });

  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        performUndo();
      } else if (((event.metaKey || event.ctrlKey) && event.key === 'y') || 
                 ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey)) {
        event.preventDefault();
        performRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoHistory, redoHistory]);

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    deletedNodes.forEach(node => {
      // Find edges connected to this node
      const connectedEdges = edges.filter(edge => 
        edge.source === node.id || edge.target === node.id
      );
      
      // Save state for undo
      saveStateForUndo('DELETE_NODE', {
        node: node,
        edges: connectedEdges
      });
    });
    
    // Remove nodes
    setNodes((nds) => nds.filter((n) => !deletedNodes.some(dn => dn.id === n.id)));
    
    // Remove connected edges
    const nodeIds = deletedNodes.map(n => n.id);
    setEdges((eds) => eds.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)));
  }, [edges]);

  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(edge => {
      // Save state for undo
      saveStateForUndo('DELETE_EDGE', edge);
    });
    
    setEdges((eds) => eds.filter((e) => !deletedEdges.some(de => de.id === e.id)));
  }, []);

  const handleDeleteNode = (nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (nodeToDelete) {
      // Find connected edges
      const connectedEdges = edges.filter(edge => 
        edge.source === nodeId || edge.target === nodeId
      );
      
      // Save state for undo
      saveStateForUndo('DELETE_NODE', {
        node: nodeToDelete,
        edges: connectedEdges
      });
      
      // Remove node and connected edges
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    }
  };

  // Notify parent component when undo/redo state changes
  useEffect(() => {
    if (onUndoRedoChange) {
      onUndoRedoChange(
        performUndo, 
        performRedo, 
        undoHistory.length > 0, 
        redoHistory.length > 0
      );
    }
  }, [undoHistory, redoHistory, onUndoRedoChange]);

  // Clean up invalid edges that reference non-existent handles
  const cleanupInvalidEdges = useCallback(() => {
    const validHandles = new Set<string>();
    
    // Collect all valid handles from all nodes
    nodes.forEach(node => {
      if (node.type === 'process') {
        validHandles.add(`${node.id}:top`);
        validHandles.add(`${node.id}:left`);
        validHandles.add(`${node.id}:right`);
        validHandles.add(`${node.id}:bottom`);
      } else if (node.type === 'array') {
        validHandles.add(`${node.id}:left`);
        validHandles.add(`${node.id}:right`);
        // Array node field handles (both left and right - all outputs)
        if (node.data.fields) {
          node.data.fields.forEach((field, index) => {
            if (field.type === 'array') {
              validHandles.add(`${node.id}:array-field-${index}-left`);
              validHandles.add(`${node.id}:array-field-${index}-right`);
            }
          });
        }
      } else if (node.type === 'document' || node.type === 'collection') {
        // Document/Collection node array field handles (outputs only)
        if (node.data.fields) {
          node.data.fields.forEach((field, index) => {
            if (field.type === 'array') {
              validHandles.add(`${node.id}:array-${index}-left`);
              validHandles.add(`${node.id}:array-${index}-right`);
            }
          });
        }
      }
    });
    
    // Filter out edges with invalid handles
    const validEdges = edges.filter(edge => {
      const sourceKey = `${edge.source}:${edge.sourceHandle || 'undefined'}`;
      const targetKey = `${edge.target}:${edge.targetHandle || 'undefined'}`;
      
      const isValidSource = validHandles.has(sourceKey);
      const isValidTarget = validHandles.has(targetKey);
      
      if (!isValidSource || !isValidTarget) {
        console.log(`🧹 Removing invalid edge:`, {
          id: edge.id,
          source: sourceKey,
          target: targetKey,
          sourceValid: isValidSource,
          targetValid: isValidTarget
        });
        return false;
      }
      
      return true;
    });
    
    if (validEdges.length !== edges.length) {
      console.log(`🧹 Cleaned up ${edges.length - validEdges.length} invalid edges`);
      setEdges(validEdges);
    }
  }, [nodes, edges, setEdges]);

  // Run cleanup when component loads or when nodes change
  useEffect(() => {
    cleanupInvalidEdges();
  }, [cleanupInvalidEdges]);

  return (
    <div className="flex-1 flex">
      {sidebarOpen && (
        <Sidebar 
          onAddNode={createNode}
          selectedProcessNode={selectedProcessNode}
          onDeleteSeparator={handleDeleteSeparator}
        />
      )}
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Render separators */}
        {separators.map((separator) => (
          <Separator
            key={separator.id}
            separator={separator}
            onUpdate={updateSeparator}
            onDelete={handleDeleteSeparator}
            selected={selectedSeparator === separator.id}
            onSelect={handleSeparatorSelect}
          />
        ))}

        <ReactFlow
          nodes={nodesWithSelection}
          edges={edgesWithSelection}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{ type: 'custom', animated: true }}
          fitView
          className={theme === 'dark' ? 'dark-theme' : 'light-theme'}
        >
          <Background color={theme === 'dark' ? '#374151' : '#9ca3af'} gap={16} />
          <Controls />
          <MiniMap 
            nodeStrokeColor={theme === 'dark' ? '#ffffff20' : '#00000020'} 
            nodeColor={theme === 'dark' ? '#1e293b' : '#f8fafc'}
            className="rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <Panel position="top-center" className="mt-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm text-sm text-gray-600 dark:text-gray-300">
              {selectedProcessNode ? (
                <span>
                  Showing state at: <strong>{nodes.find(n => n.id === selectedProcessNode)?.data.label}</strong> • Click empty area to show all
                </span>
              ) : (
                <span>
                  Click a process node to see state at that point • Double-click to edit • Delete/Backspace to remove
                </span>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <PropertiesModal 
        node={modalNode}
        isOpen={isModalOpen}
        onClose={closeModal}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  );
};

export default FlowEditor;