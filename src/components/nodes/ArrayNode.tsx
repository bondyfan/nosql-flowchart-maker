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
      className={`px-4 py-2 rounded-lg shadow-sm border transition-all duration-200 w-[280px] ${
        isDocumentAction 
          ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
          : isAutoNamed 
            ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/10'
      } ${selected ? 'ring-2 ring-purple-500 shadow-md' : ''}`}
    >
      {/* Dual handles for array node - both are INPUTS positioned at header level */}
      {!isHandleConnected('right') && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-gray-500"
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
          className="w-3 h-3 bg-gray-500"
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
            ? 'text-purple-600 dark:text-purple-400' 
            : isAutoNamed 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-purple-600 dark:text-purple-400'
        }`} />
        <div className={`font-medium truncate max-w-[200px] ${
          isDocumentAction 
            ? 'text-gray-700 dark:text-gray-300' 
            : isAutoNamed 
              ? 'text-gray-700 dark:text-gray-300' 
              : 'text-gray-700 dark:text-gray-300'
        }`}>
          {data.label}
        </div>
        {isAutoNamed && (
          <div title="Auto-named from connected field">
            <Link size={14} className="ml-2 text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Show connection info for auto-named arrays */}
      {isAutoNamed && connectedFieldName && sourceDocumentLabel && (
        <div className={`mt-2 pt-2 ${
          isDocumentAction ? 'border-t border-gray-200 dark:border-gray-700' : 'border-t border-gray-200 dark:border-gray-700'
        }`}>
          <div className={`text-xs ${
            isDocumentAction 
              ? 'text-gray-600 dark:text-gray-400' 
              : 'text-gray-600 dark:text-gray-400'
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
            ? 'border-t border-gray-200 dark:border-gray-700' 
            : isAutoNamed 
              ? 'border-t border-gray-200 dark:border-gray-700' 
              : 'border-t border-gray-200 dark:border-gray-700'
        }`}>
          <div className={`text-xs font-semibold mb-2 ${
            isDocumentAction 
              ? 'text-gray-600 dark:text-gray-400' 
              : isAutoNamed 
                ? 'text-gray-600 dark:text-gray-400' 
                : 'text-gray-600 dark:text-gray-400'
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
                      ? 'text-gray-700 dark:text-gray-300 font-semibold' 
                      : isDocumentAction 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : isAutoNamed 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-600 dark:text-gray-400'
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
                  } ${isReferencedField ? 'font-bold ring-2 ring-purple-300' : ''}`}>
                    {field.type}
                  </span>
                  
                  {/* Add connection points for array fields within array node - both are OUTPUTS */}
                  {isArrayField && (
                    <>
                      {!isHandleConnected(`array-field-${index}-right`) && (
                        <Handle
                          type="source"
                          position={Position.Left}
                          className="w-3 h-3 bg-gray-500"
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
                          className="w-3 h-3 bg-gray-500"
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