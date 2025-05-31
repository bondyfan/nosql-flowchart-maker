import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Zap } from 'lucide-react';
import { NodeData } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';

const DocumentNode: React.FC<NodeProps<NodeData>> = ({ data, selected, id }) => {
  const { collections } = useDatabase();
  
  // Find the collection for this document
  const collection = data.collectionId 
    ? collections.find(c => c.id === data.collectionId)
    : null;

  // Get highlighting information from data
  const isDocumentAction = data._isDocumentAction || false;
  const referencedFields = data._referencedFields || new Set();
  const fieldValues = data._fieldValues || new Map();

  return (
    <div 
      className={`px-4 py-2 rounded-lg shadow-md border transition-all duration-200 w-[320px] ${
        isDocumentAction 
          ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      } ${selected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
    >
      <div className="flex items-center">
        <Database size={18} className={`mr-2 ${
          isDocumentAction 
            ? 'text-orange-600 dark:text-orange-400' 
            : 'text-green-600 dark:text-green-400'
        }`} />
        <div className={`font-medium truncate max-w-[280px] ${
          isDocumentAction 
            ? 'text-orange-800 dark:text-orange-200 font-bold' 
            : 'text-gray-800 dark:text-white'
        }`}>
          {data.label}
        </div>
      </div>
      
      {/* Show collection name if assigned */}
      {collection && (
        <div className={`mt-1 text-xs font-medium ${
          isDocumentAction 
            ? 'text-orange-600 dark:text-orange-400' 
            : 'text-blue-600 dark:text-blue-400'
        }`}>
          in {collection.name}
        </div>
      )}
      
      {data.fields && data.fields.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {data.fields.map((field, index) => {
            const isReferencedField = referencedFields.has(field.name);
            const fieldValue = fieldValues.get(field.name);
            const isArrayField = field.type === 'array';
            return (
              <div key={index} className="text-xs flex justify-between items-center relative py-1">
                <div className="flex items-center space-x-1 flex-1">
                  <span className={`${
                    isReferencedField 
                      ? 'text-orange-700 dark:text-orange-300 font-bold' 
                      : 'text-gray-600 dark:text-gray-300'
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
                  <span className={`${
                    isReferencedField 
                      ? 'text-orange-600 dark:text-orange-400 font-bold' 
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {field.type}
                  </span>
                  
                  {/* Add connection point for array fields only - positioned after the type label */}
                  {isArrayField && (
                    <div className="relative w-6 flex justify-end">
                      <Handle
                        type="source"
                        position={Position.Right}
                        className="w-3 h-3 bg-purple-500 static"
                        id={`array-${index}`}
                        style={{
                          position: 'relative',
                          right: 0,
                          top: 0,
                          transform: 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(DocumentNode);