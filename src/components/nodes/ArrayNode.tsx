import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Brackets, Link, Zap } from 'lucide-react';
import { NodeData } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';

const ArrayNode: React.FC<NodeProps<NodeData>> = ({ data, selected, id }) => {
  const { edges } = useDatabase();
  const isAutoNamed = data._isAutoNamed;
  const connectedFieldName = data._connectedFieldName;
  const sourceDocumentLabel = data._sourceDocumentLabel;

  // Get highlighting information from data (same as DocumentNode)
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
      className={`px-4 py-2 rounded-lg shadow-md border transition-all duration-200 w-[280px] ${
        isDocumentAction 
          ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20' 
          : isAutoNamed 
            ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
      } ${selected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
    >
      {/* Dual handles for array node - both are INPUTS positioned at header level */}
      {!isHandleConnected('right') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-purple-500"
          id="left"
          style={{
            left: -12,
            top: 20, // Position at header level
            transform: 'none'
          }}
        />
      )}
      
      {!isHandleConnected('left') && (
        <Handle
          type="target"
          position={Position.Right}
          className="w-3 h-3 bg-purple-500"
          id="right"
          style={{
            right: -12,
            top: 20, // Position at header level
            transform: 'none'
          }}
        />
      )}
      
      <div className="flex items-center">
        <Brackets size={18} className={`mr-2 ${
          isDocumentAction 
            ? 'text-orange-600 dark:text-orange-400' 
            : isAutoNamed 
              ? 'text-purple-700 dark:text-purple-300' 
              : 'text-purple-600 dark:text-purple-400'
        }`} />
        <div className={`font-medium truncate max-w-[200px] ${
          isDocumentAction 
            ? 'text-orange-800 dark:text-orange-200 font-bold' 
            : isAutoNamed 
              ? 'text-purple-800 dark:text-purple-200' 
              : 'text-gray-800 dark:text-white'
        }`}>
          {data.label}
        </div>
        {isAutoNamed && (
          <div title="Auto-named from connected field">
            <Link size={14} className="ml-2 text-purple-600 dark:text-purple-400" />
          </div>
        )}
      </div>
      
      {/* Show connection info for auto-named arrays */}
      {isAutoNamed && connectedFieldName && sourceDocumentLabel && (
        <div className={`mt-2 pt-2 ${
          isDocumentAction ? 'border-t border-orange-200 dark:border-orange-700' : 'border-t border-purple-200 dark:border-purple-700'
        }`}>
          <div className={`text-xs ${
            isDocumentAction 
              ? 'text-orange-700 dark:text-orange-300' 
              : 'text-purple-700 dark:text-purple-300'
          }`}>
            <div className="flex items-center justify-between">
              <span>Connected to:</span>
              <span className="font-medium">{connectedFieldName}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>From document:</span>
              <span className="font-medium truncate max-w-[120px]">{sourceDocumentLabel}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Display array fields */}
      {data.fields && data.fields.length > 0 && (
        <div className={`mt-2 pt-2 ${
          isDocumentAction 
            ? 'border-t border-orange-200 dark:border-orange-700' 
            : isAutoNamed 
              ? 'border-t border-purple-200 dark:border-purple-700' 
              : 'border-t border-gray-200 dark:border-gray-700'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${
            isDocumentAction 
              ? 'text-orange-700 dark:text-orange-300' 
              : isAutoNamed 
                ? 'text-purple-700 dark:text-purple-300' 
                : 'text-gray-700 dark:text-gray-300'
          }`}>
            Array Elements:
          </div>
          {data.fields.map((field, index) => {
            const isReferencedField = referencedFields.has(field.name);
            const fieldValue = fieldValues.get(field.name);
            const isArrayField = field.type === 'array';
            return (
              <div key={index} className="text-xs flex justify-between items-center py-1 relative">
                <div className="flex items-center space-x-1 flex-1">
                  <span className={`${
                    isReferencedField 
                      ? 'text-orange-700 dark:text-orange-300 font-bold' 
                      : isDocumentAction 
                        ? 'text-orange-700 dark:text-orange-300' 
                        : isAutoNamed 
                          ? 'text-purple-700 dark:text-purple-300' 
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
                  <span className={`font-medium ${
                    isReferencedField 
                      ? 'text-orange-600 dark:text-orange-400 font-bold' 
                      : isDocumentAction 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : isAutoNamed 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-purple-600 dark:text-purple-400'
                  }`}>
                    {field.type}
                  </span>
                  
                  {/* Add connection points for array fields within array node - both are OUTPUTS */}
                  {isArrayField && (
                    <>
                      {!isHandleConnected(`array-field-${index}-right`) && (
                        <Handle
                          type="source"
                          position={Position.Left}
                          className="w-3 h-3 bg-purple-500"
                          id={`array-field-${index}-left`}
                          style={{
                            left: -30,
                            top: 'auto',
                            transform: 'none'
                          }}
                        />
                      )}
                      
                      {!isHandleConnected(`array-field-${index}-left`) && (
                        <Handle
                          type="source"
                          position={Position.Right}
                          className="w-3 h-3 bg-purple-500"
                          id={`array-field-${index}-right`}
                          style={{
                            right: -22,
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
      
      {/* Show info for unconnected arrays */}
      {!isAutoNamed && !connectedFieldName && data.fields?.length === 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Connect from a document array field
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ArrayNode);