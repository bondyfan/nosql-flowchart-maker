import React, { useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { Trash2, Plus, X, Database, Key, GripVertical, Brackets, Pencil, Check } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { NodeData } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableFieldItemProps {
  field: { name: string; type: string };
  index: number;
  onRemove: (index: number) => void;
  onEdit: (index: number, field: { name: string; type: string }) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ field, index, onRemove, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `field-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(field.name);
  const [editType, setEditType] = useState(field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all ${isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </div>
      <div className="flex-1 flex items-center justify-between py-1">
        {isEditing ? (
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 text-gray-900 dark:text-white"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Field name"
            />
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 text-gray-900 dark:text-white"
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
              <option value="array">Array</option>
              <option value="subcollection">Subcollection</option>
              <option value="object">Object</option>
            </select>
          </div>
        ) : (
          <>
            <span className="font-medium text-gray-900 dark:text-white">
              {field.name}
            </span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
              {field.type}
            </span>
          </>
        )}
      </div>
      <button
        onClick={() => onRemove(index)}
        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
        title="Remove field"
      >
        <Trash2 size={16} />
      </button>
      {isEditing ? (
        <button
          onClick={() => {
            const updated = { name: editName.trim() || field.name, type: editType };
            onEdit(index, updated);
            setIsEditing(false);
          }}
          className="opacity-100 p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ml-2"
          title="Save changes"
        >
          <Check size={16} />
        </button>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ml-2"
          title="Edit field"
        >
          <Pencil size={16} />
        </button>
      )}
    </div>
  );
};

interface PropertiesModalProps {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteNode?: (nodeId: string) => void;
}

const PropertiesModal: React.FC<PropertiesModalProps> = ({ node, isOpen, onClose, onDeleteNode }) => {
  const { updateNodeData, removeNode, collections, addNode, nodes } = useDatabase();
  const [label, setLabel] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [fields, setFields] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [processDescription, setProcessDescription] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [selectedDocumentForField, setSelectedDocumentForField] = useState('');
  const [selectedFieldIndex, setSelectedFieldIndex] = useState('');
  const [fieldValueType, setFieldValueType] = useState<'dynamic' | 'fixed'>('dynamic');
  const [fieldFixedValue, setFieldFixedValue] = useState('');
  const [processActions, setProcessActions] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const modalRef = useRef<HTMLDivElement>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get existing document nodes (for document actions)
  const documentNodes = nodes.filter(n => n.type === 'document');
  
  // Get existing document and array nodes (for field actions)
  const fieldableNodes = nodes.filter(n => n.type === 'document' || n.type === 'array');
  
  // Get fields from selected node (document or array)
  const selectedNode = nodes.find(n => n.id === selectedDocumentForField);
  const availableFields = selectedNode?.data.fields || [];

  // Sync state when node changes
  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setFields(node.data.fields || []);
      setSelectedCollectionId(node.data.collectionId || '');
      setProcessDescription(node.data.properties?.description || '');
      setProcessActions(node.data.properties?.processActions || []);
      setSelectedColor(node.data.properties?.color || 'yellow');
    }
  }, [node]);

  // Handle clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !node) {
    return null;
  }

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    updateNodeData(node.id, { label: newLabel });
  };

  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    updateNodeData(node.id, { collectionId: collectionId || undefined });
  };

  const handleAddField = () => {
    if (newFieldName.trim()) {
      const newFields = [...fields, { name: newFieldName, type: newFieldType }];
      setFields(newFields);
      updateNodeData(node.id, { fields: newFields });
      setNewFieldName('');
      setNewFieldType('string');
    }
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    updateNodeData(node.id, { fields: newFields });
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      if (onDeleteNode) {
        onDeleteNode(node.id);
      } else {
      removeNode(node.id);
      }
      onClose();
    }
  };

  const handleProcessDescriptionChange = (description: string) => {
    setProcessDescription(description);
    updateNodeData(node.id, { 
      properties: { 
        ...node.data.properties, 
        description 
      } 
    });
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    updateNodeData(node.id, { 
      properties: { 
        ...node.data.properties, 
        color 
      } 
    });
  };

  const handleSaveAction = (type: 'document' | 'field') => {
    if (type === 'document' && selectedDocumentId) {
      const selectedDoc = nodes.find(n => n.id === selectedDocumentId);
      if (selectedDoc) {
        // Save node action to process actions list
        const newAction = {
          id: `action_${Date.now()}`,
          type: 'document', // Keep as 'document' for backward compatibility, but description will clarify
          nodeId: selectedDocumentId,
          label: selectedDoc.data.label,
          description: `${selectedDoc.type === 'document' ? 'Document' : 'Array'}: ${selectedDoc.data.label}`,
          savedAt: new Date().toISOString()
        };
        
        const updatedActions = [...processActions, newAction];
        setProcessActions(updatedActions); // Update local state immediately
        
        updateNodeData(node!.id, { 
          properties: { 
            ...node!.data.properties,
            processActions: updatedActions
          }
        });
        
        setSelectedDocumentId('');
        console.log(`✅ Saved ${selectedDoc.type} action "${selectedDoc.data.label}" to process`);
      }
    } else if (type === 'field' && selectedDocumentForField && selectedFieldIndex !== '') {
      const selectedDoc = nodes.find(n => n.id === selectedDocumentForField);
      const fieldIndex = parseInt(selectedFieldIndex);
      const selectedField = selectedDoc?.data.fields?.[fieldIndex];
      
      if (selectedDoc && selectedField) {
        // Save field action to process actions list
        const newAction = {
          id: `action_${Date.now()}`,
          type: 'field',
          nodeId: selectedDocumentForField,
          fieldIndex: fieldIndex,
          label: `${selectedField.name} (${selectedDoc.data.label})`,
          description: `Field: ${selectedField.name} (${selectedField.type}) from ${selectedDoc.data.label}`,
          fieldName: selectedField.name,
          fieldType: selectedField.type,
          documentLabel: selectedDoc.data.label,
          valueType: fieldValueType,
          ...(fieldValueType === 'fixed' && { fixedValue: fieldFixedValue }),
          savedAt: new Date().toISOString()
        };
        
        const updatedActions = [...processActions, newAction];
        setProcessActions(updatedActions); // Update local state immediately
        
        updateNodeData(node!.id, { 
          properties: { 
            ...node!.data.properties,
            processActions: updatedActions
          }
        });
        
        setSelectedDocumentForField('');
        setSelectedFieldIndex('');
        setFieldValueType('dynamic');
        setFieldFixedValue('');
        console.log(`✅ Saved field action "${selectedField.name}" from "${selectedDoc.data.label}" to process`);
      }
    }
  };

  const handleRemoveAction = (actionId: string) => {
    const updatedActions = processActions.filter(action => action.id !== actionId);
    setProcessActions(updatedActions); // Update local state immediately
    
    updateNodeData(node!.id, { 
      properties: { 
        ...node!.data.properties,
        processActions: updatedActions
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const activeIndex = parseInt(active.id.toString().replace('field-', ''));
      const overIndex = parseInt(over!.id.toString().replace('field-', ''));

      const newFields = arrayMove(fields, activeIndex, overIndex);
      setFields(newFields);
      updateNodeData(node!.id, { fields: newFields });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              {node.type === 'document' ? (
                <Database size={20} className="text-blue-600 dark:text-blue-400" />
              ) : node.type === 'process' ? (
                <Key size={20} className="text-purple-600 dark:text-purple-400" />
              ) : (
                <Key size={20} className="text-green-600 dark:text-green-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {node.type === 'document' ? 'Document Properties' : 
                 node.type === 'process' ? 'Process Properties' : 'Array Properties'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure {node.type} settings and properties
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Node Label */}
          <div className="space-y-2">
            <label htmlFor="node-label" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Node Label
            </label>
            
            {/* Show auto-naming info for array nodes */}
            {node.type === 'array' && node.data._isAutoNamed && (
              <div className="mb-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-200 flex items-center">
                  <Brackets size={14} className="mr-2" />
                  This array node's name is automatically set based on the connected field: <strong>{node.data._connectedFieldName}</strong>
                </p>
              </div>
            )}
            
            <input
              type="text"
              id="node-label"
              className={`block w-full rounded-xl border shadow-sm px-4 py-3 text-sm transition-all ${
                node.type === 'array' && node.data._isAutoNamed
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-opacity-20'
              } placeholder-gray-500 dark:placeholder-gray-400`}
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Enter a descriptive label"
              readOnly={node.type === 'array' && node.data._isAutoNamed}
              title={node.type === 'array' && node.data._isAutoNamed ? 'Array node names are automatically assigned based on connected fields' : undefined}
            />
          </div>

          {/* Collection selection for document nodes */}
          {node.type === 'document' && (
            <div className="space-y-2">
              <label htmlFor="collection-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Collection Assignment
              </label>
              <select
                id="collection-select"
                value={selectedCollectionId}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
              >
                <option value="">Choose a collection...</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              {collections.length === 0 && (
                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    No collections available. Create one in the Collections tab.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Process description for process nodes */}
          {node.type === 'process' && (
            <div className="space-y-2">
              <label htmlFor="process-description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Process Description
              </label>
              <textarea
                id="process-description"
                rows={4}
                className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all resize-none"
                value={processDescription}
                onChange={(e) => handleProcessDescriptionChange(e.target.value)}
                placeholder="Describe what this process does..."
              />
            </div>
          )}

          {/* Process Actions for process nodes */}
          {node.type === 'process' && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Key size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Process Actions</h4>
              </div>
              
              {/* Show Existing Actions */}
              {processActions.length > 0 && (
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Saved Actions</h5>
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                      {processActions.length} action{processActions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {processActions.map((action, index) => (
                      <div key={action.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md ${
                        action.type === 'document' 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' 
                          : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                            action.type === 'document'
                              ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300'
                          }`}>
                            #{index + 1}
                          </div>
                          {action.type === 'document' ? (
                            <Database size={18} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Key size={18} className="text-violet-600 dark:text-violet-400" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {action.label}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                              <span>{action.description}</span>
                              <span>•</span>
                              <span>{new Date(action.savedAt).toLocaleTimeString()}</span>
                              {action.type === 'field' && action.valueType && (
                                <>
                                  <span>•</span>
                                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                                    action.valueType === 'fixed' 
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                  }`}>
                                    {action.valueType === 'fixed' ? `Fixed: "${action.fixedValue}"` : 'Dynamic'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAction(action.id)}
                          className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Remove action"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Document Action */}
              <div className="space-y-3">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Add Document Action</span>
                </h5>
                <div className="flex space-x-3">
                  <select
                    value={selectedDocumentId}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                  >
                    <option value="">Choose document...</option>
                    {documentNodes.map((docNode) => (
                      <option key={docNode.id} value={docNode.id}>
                        {docNode.data.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSaveAction('document')}
                    disabled={!selectedDocumentId}
                    className="inline-flex items-center px-4 py-3 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all disabled:opacity-50"
                  >
                    <Plus size={16} className="mr-2" />
                    Add
                  </button>
                </div>
                {documentNodes.length === 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      No document nodes available. Create document nodes first.
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Field Action */}
              <div className="space-y-3">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <Key size={16} className="text-violet-600 dark:text-violet-400" />
                  <span>Add Field Action</span>
                </h5>
                <div className="space-y-3">
                  <select
                    value={selectedDocumentForField}
                    onChange={(e) => {
                      setSelectedDocumentForField(e.target.value);
                      setSelectedFieldIndex(''); // Reset field selection when document changes
                    }}
                    className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-violet-500 focus:ring-violet-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                  >
                    <option value="">Choose node...</option>
                    {fieldableNodes.map((node) => {
                      // Create descriptive label for arrays
                      if (node.type === 'array') {
                        if (node.data._isAutoNamed && node.data._sourceDocumentLabel) {
                          return (
                            <option key={node.id} value={node.id}>
                              [Array] {node.data.label} (from {node.data._sourceDocumentLabel})
                            </option>
                          );
                        } else {
                          return (
                            <option key={node.id} value={node.id}>
                              [Array] {node.data.label}
                            </option>
                          );
                        }
                      } else {
                        return (
                          <option key={node.id} value={node.id}>
                            {node.data.label}
                      </option>
                        );
                      }
                    })}
                  </select>
                  
                  {selectedDocumentForField && (
                    <>
                      <select
                        value={selectedFieldIndex}
                        onChange={(e) => setSelectedFieldIndex(e.target.value)}
                        className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-violet-500 focus:ring-violet-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                      >
                        <option value="">Choose field...</option>
                        {availableFields.map((field, index) => (
                          <option key={index} value={index.toString()}>
                            {field.name} ({field.type})
                          </option>
                        ))}
                      </select>

                      {selectedFieldIndex !== '' && (
                        <>
                          {/* Value Type Selection */}
                          <select
                            value={fieldValueType}
                            onChange={(e) => setFieldValueType(e.target.value as 'dynamic' | 'fixed')}
                            className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-violet-500 focus:ring-violet-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                          >
                            <option value="dynamic">Dynamic Value</option>
                            <option value="fixed">Fixed Value</option>
                          </select>

                          {/* Fixed Value Input */}
                          {fieldValueType === 'fixed' && (
                            <input
                              type="text"
                              value={fieldFixedValue}
                              onChange={(e) => setFieldFixedValue(e.target.value)}
                              placeholder="Enter fixed value..."
                              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-violet-500 focus:ring-violet-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
                            />
                          )}

                          {/* Add Button */}
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSaveAction('field')}
                              disabled={!selectedDocumentForField || selectedFieldIndex === '' || (fieldValueType === 'fixed' && !fieldFixedValue.trim())}
                              className="inline-flex items-center px-4 py-3 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all disabled:opacity-50"
                            >
                              <Key size={16} className="mr-2" />
                              Add Field
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                  
                  {selectedDocumentForField && availableFields.length === 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Selected node has no fields. Add fields to the node first.
                      </p>
                    </div>
                  )}
                </div>
                
                {fieldableNodes.length === 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      No document or array nodes available. Create document or array nodes first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fields/Properties section - only for non-process nodes */}
          {node.type !== 'process' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Key size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Fields & Properties
                  </h3>
                </div>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="Delete node"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map((_, index) => `field-${index}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields.map((field, index) => (
                      <SortableFieldItem
                        key={index}
                        field={field}
                        index={index}
                        onRemove={handleRemoveField}
                        onEdit={(idx, updatedField) => {
                          const newFields = fields.map((f, i) => (i === idx ? updatedField : f));
                          setFields(newFields);
                          updateNodeData(node!.id, { fields: newFields });
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                {fields.length === 0 && (
                  <div className="p-6 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Key size={24} className="mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No fields added yet. Create your first field below.
                    </p>
                  </div>
                )}
              </div>

              {/* Add new field */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add New Field</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Field name"
                    className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddField();
                      }
                    }}
                  />
                  
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-2 focus:ring-opacity-20 px-4 py-3 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                    <option value="array">Array</option>
                    <option value="subcollection">Subcollection</option>
                    <option value="object">Object</option>
                  </select>
                  
                  <button
                    onClick={handleAddField}
                    disabled={!newFieldName.trim()}
                    className="inline-flex justify-center items-center px-4 py-3 border border-transparent shadow-sm text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all disabled:opacity-50"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Field
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete button for process nodes */}
          {node.type === 'process' && (
            <>
              {/* Color selection for process nodes */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Process Color
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { name: 'yellow', bg: 'bg-yellow-500', border: 'border-yellow-500', label: 'Yellow' },
                    { name: 'blue', bg: 'bg-blue-500', border: 'border-blue-500', label: 'Blue' },
                    { name: 'green', bg: 'bg-green-500', border: 'border-green-500', label: 'Green' },
                    { name: 'purple', bg: 'bg-purple-500', border: 'border-purple-500', label: 'Purple' },
                    { name: 'red', bg: 'bg-red-500', border: 'border-red-500', label: 'Red' },
                    { name: 'orange', bg: 'bg-orange-500', border: 'border-orange-500', label: 'Orange' },
                    { name: 'pink', bg: 'bg-pink-500', border: 'border-pink-500', label: 'Pink' },
                    { name: 'indigo', bg: 'bg-indigo-500', border: 'border-indigo-500', label: 'Indigo' }
                  ].map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleColorChange(color.name)}
                      className={`group relative flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        selectedColor === color.name
                          ? `${color.border} bg-white dark:bg-gray-800 shadow-lg`
                          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${color.bg} shadow-sm mb-2`}></div>
                      <span className={`text-xs font-medium transition-colors ${
                        selectedColor === color.name
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                      }`}>
                        {color.label}
                      </span>
                      {selectedColor === color.name && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-white dark:bg-gray-900 rounded-full border-2 border-current shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-3 border border-red-300 dark:border-red-700 shadow-sm text-sm font-semibold rounded-xl text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Process Node
              </button>
            </div>
            </>
          )}

          {/* Footer info */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Changes are automatically saved to Firestore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesModal; 