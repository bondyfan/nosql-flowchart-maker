import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Brackets } from 'lucide-react';
import { NodeData } from '../../types';

const ArrayNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  return (
    <div 
      className={`px-4 py-2 rounded-lg shadow-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 transition-all duration-200 ${
        selected ? 'ring-2 ring-blue-500 shadow-lg' : ''
      }`}
    >
      {/* Single Left Handle for input from array fields */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
        id="input"
      />
      
      <div className="flex items-center">
        <Brackets size={18} className="text-purple-600 dark:text-purple-400 mr-2" />
        <div className="font-medium text-gray-800 dark:text-white truncate max-w-[150px]">
          {data.label}
        </div>
      </div>
      
      {data.fields && data.fields.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-300 flex justify-between">
            <span>Type</span>
            <span className="text-purple-600 dark:text-purple-400">
              {data.fields[0]?.type || 'string'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ArrayNode);