import React, { useState } from 'react';
import { 
  Database, Layers, Box, Key, Circle, Hash, List, Server,
  Search, Plus, X, Zap, Minus as SeparatorIcon, Trash2, Brackets
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

interface SidebarProps {
  onAddNode: (type: string) => void;
  selectedProcessNode?: string | null;
  onDeleteSeparator: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddNode, selectedProcessNode, onDeleteSeparator }) => {
  const { 
    nodes, 
    dbType, 
    addNode, 
    collections, 
    addCollection, 
    removeCollection,
    separators,
    addSeparator,
    updateSeparator
  } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'nodes' | 'collections' | 'separators'>('nodes');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newSeparatorLabel, setNewSeparatorLabel] = useState('');
  const [newSeparatorColor, setNewSeparatorColor] = useState('#3b82f6');
  
  // Find the selected node
  const selectedNode = nodes.find(node => node.id === selectedProcessNode);
  
  // Filter nodes based on search term
  const filteredNodes = nodes.filter(node => 
    node.data.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Determine which node types to show based on the selected database type
  const getNodeTypesForDbType = () => {
    const baseNodes = [
      { type: 'document', icon: <Database size={18} />, label: 'Document', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
      { type: 'array', icon: <Brackets size={18} />, label: 'Array', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
      { type: 'process', icon: <Zap size={18} />, label: 'Process', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' }
    ];

    switch (dbType) {
      case 'document':
        return baseNodes.filter(node => ['document', 'array', 'process'].includes(node.type));
      case 'graph':
        return [
          { type: 'node', icon: <Circle size={18} />, label: 'Node', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
          { type: 'relationship', icon: <Hash size={18} />, label: 'Relationship', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200' },
          { type: 'property', icon: <Key size={18} />, label: 'Property', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
          { type: 'process', icon: <Zap size={18} />, label: 'Process', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' }
        ];
      case 'key-value':
        return [
          { type: 'keyspace', icon: <Box size={18} />, label: 'Keyspace', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
          { type: 'key', icon: <Key size={18} />, label: 'Key', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' },
          { type: 'value', icon: <List size={18} />, label: 'Value', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
          { type: 'process', icon: <Zap size={18} />, label: 'Process', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' }
        ];
      default:
        return baseNodes;
    }
  };

  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      addCollection(newCollectionName.trim());
      setNewCollectionName('');
    }
  };

  const handleAddSeparator = () => {
    const label = newSeparatorLabel.trim() || 'Section';
    addSeparator(300, label, newSeparatorColor); // Add at x=300 by default
    setNewSeparatorLabel('');
    setNewSeparatorColor('#3b82f6');
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-200">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 mb-4">
          <button
            className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'nodes'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('nodes')}
          >
            Nodes
          </button>
          <button
            className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'collections'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('collections')}
          >
            Collections
          </button>
          <button
            className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'separators'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('separators')}
          >
            Separators
          </button>
        </div>
        
        {activeTab === 'nodes' && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm placeholder-gray-400 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setSearchTerm('')}
              >
                <X size={16} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'nodes' ? (
        <>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Add Node
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {getNodeTypesForDbType().map((nodeType) => (
                <div
                  key={nodeType.type}
                  className={`flex items-center p-2 rounded-md cursor-grab ${nodeType.color}`}
                  onDragStart={(event) => onDragStart(event, nodeType.type)}
                  draggable
                >
                  <div className="mr-2">{nodeType.icon}</div>
                  <span className="text-sm font-medium">{nodeType.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Existing Nodes ({filteredNodes.length})
            </h3>
            {filteredNodes.length > 0 ? (
              <div className="space-y-2">
                {filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedProcessNode === node.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <div className="mr-2">
                      {node.type === 'document' ? (
                        <Database size={16} className="text-green-600 dark:text-green-400" />
                      ) : node.type === 'process' ? (
                        <Zap size={16} className="text-yellow-600 dark:text-yellow-400" />
                      ) : node.type === 'array' ? (
                        <Brackets size={16} className="text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Key size={16} className="text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <span className="text-sm truncate text-gray-900 dark:text-white">{node.data.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Server className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No nodes found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try a different search term' : 'Start by adding a node to your diagram'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={() => {
                        // Add a default node in the center of the viewport
                        onAddNode('document');
                      }}
                    >
                      <Plus className="-ml-0.5 mr-2 h-4 w-4" />
                      Add Document
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'collections' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Add Collection
            </h3>
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Collection name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCollection();
                  }
                }}
              />
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleAddCollection}
                disabled={!newCollectionName.trim()}
              >
                <Plus size={14} className="mr-1" />
                Add
              </button>
            </div>
          </div>
          
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Collections ({collections.length})
          </h3>
          {collections.length > 0 ? (
            <div className="space-y-2">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center">
                    <Layers size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{collection.name}</span>
                  </div>
                  <button
                    onClick={() => removeCollection(collection.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
                    title="Delete collection"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Layers className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No collections yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Collections organize your documents
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Add Separator
            </h3>
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Separator label"
                value={newSeparatorLabel}
                onChange={(e) => setNewSeparatorLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSeparator();
                  }
                }}
              />
              <input
                type="color"
                className="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={newSeparatorColor}
                onChange={(e) => setNewSeparatorColor(e.target.value)}
              />
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={handleAddSeparator}
              >
                <Plus size={14} className="mr-1" />
                Add
              </button>
            </div>
          </div>
          
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Separators ({separators.length})
          </h3>
          {separators.length > 0 ? (
            <div className="space-y-2">
              {separators.map((separator) => (
                <div
                  key={separator.id}
                  className="flex items-center justify-between p-3 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center">
                    <SeparatorIcon size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{separator.label}</span>
                  </div>
                  <button
                    onClick={() => onDeleteSeparator(separator.id)}
                    className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete separator"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <SeparatorIcon className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No separators yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Separators help organize your diagram
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;