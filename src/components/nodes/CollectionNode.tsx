import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Zap, Crown } from 'lucide-react';
import { NodeData } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';

const CollectionNode: React.FC<NodeProps<NodeData>> = ({ data, selected, id }) => {
  const { collections, edges } = useDatabase();
  
  // Find the collection for this document
  const collection = data.collectionId 
    ? collections.find(c => c.id === data.collectionId)
    : null;

  // Get highlighting information from data
  const isDocumentAction = data._isDocumentAction || false;
  const referencedFields = data._referencedFields || new Set();
  const fieldValues = data._fieldValues || new Map();

  // Helper function to check if a handle is connected
  const isHandleConnected = (handleId: string) => {
    const connected = edges.some(edge => 
      (edge.source === id && edge.sourceHandle === handleId) ||
      (edge.target === id && edge.targetHandle === handleId)
    );
    
    return connected;
  };

  return (
    <div 
      className={`relative rounded-xl shadow-2xl border-2 transition-all duration-200 min-w-[340px] transform hover:scale-[1.02] ${
        isDocumentAction 
          ? 'border-orange-500 dark:border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-900/50' 
          : 'border-emerald-600 dark:border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950'
      } ${selected ? 'ring-4 ring-emerald-400 ring-opacity-60 shadow-2xl' : ''}`}
    >
      {/* Header with strong gradient */}
      <div className={`px-4 py-3 rounded-t-lg ${
        isDocumentAction
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-700 dark:to-amber-700'
          : 'bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-700 dark:to-green-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database size={20} className="text-white mr-2" />
            <div className="text-white font-bold text-base tracking-wide">
              {data.label || 'Collection'}
            </div>
          </div>
          <Crown size={16} className="text-yellow-300" />
        </div>
      </div>
      
      {/* Body content */}
      <div className="px-4 py-3">
        {/* Show collection name if assigned */}
        {collection && (
          <div className={`mb-2 text-sm font-semibold ${
            isDocumentAction 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            in {collection.name}
          </div>
        )}
      
        {data.fields && data.fields.length > 0 && (
          <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
          {data.fields.sort((a, b) => a.name.localeCompare(b.name)).map((field, index) => {
            const isReferencedField = referencedFields.has(field.name);
            const fieldValue = fieldValues.get(field.name);
            const isArrayField = field.type === 'array';
            return (
              <div key={index} className="text-sm flex justify-between items-center relative py-1.5 px-2 rounded hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30">
                <div className="flex items-center space-x-1 flex-1">
                  <span className={`font-medium ${
                    isReferencedField 
                      ? 'text-orange-700 dark:text-orange-300 font-bold' 
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    {field.name}
                  </span>
                  {fieldValue && (
                    <span className="text-xs">
                      {fieldValue.valueType === 'fixed' ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          ["{fieldValue.fixedValue}"]
                        </span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400">
                          <Zap size={10} className="inline" />
                        </span>
                      )}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    field.type === 'array' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : field.type === 'timestamp'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : field.type === 'string'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : field.type === 'number'
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      : field.type === 'boolean'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : field.type === 'object'
                      ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  } ${isReferencedField ? 'font-bold ring-2 ring-orange-300' : ''}`}>
                    {field.type}
                  </span>
                  
                  {/* Add connection points for array/subcollection fields - both are OUTPUTS */}
                  {isArrayField && (
                    <>
                      {!isHandleConnected(`array-${index}-right`) && (
                        <Handle
                          type="source"
                          position={Position.Left}
                          className="w-3 h-3 bg-purple-500"
                          id={`array-${index}-left`}
                          style={{
                            left: -30,
                            top: 'auto',
                            transform: 'none'
                          }}
                        />
                      )}
                      
                      {!isHandleConnected(`array-${index}-left`) && (
                        <Handle
                          type="source"
                          position={Position.Right}
                          className="w-3 h-3 bg-purple-500"
                          id={`array-${index}-right`}
                          style={{
                            right: -16,
                            top: 'auto',
                            transform: 'none'
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(CollectionNode);