import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types';
import { FolderTree, Layers, Grip } from 'lucide-react';

const SubcollectionNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  // Check if a field is an array or subcollection type
  const isArrayField = (field: any) => field.type === 'array' || field.type === 'subcollection';

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-sm min-w-[280px] border border-orange-300 dark:border-orange-700 hover:shadow-md transition-all duration-200">
      <div className="bg-orange-100 dark:bg-orange-900/40 px-4 py-2 rounded-t-lg border-b border-orange-200 dark:border-orange-700 flex items-center justify-between">
        <FolderTree className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        <span className="font-medium text-sm text-orange-700 dark:text-orange-300">{data.label || 'Subcollection'}</span>
        <Layers className="w-4 h-4 text-orange-500 dark:text-orange-400 opacity-60" />
      </div>

      {/* Body with fields */}
      <div className="px-4 py-2">
        {data.fields && data.fields.length > 0 ? (
          <div className="space-y-2">
            {data.fields.map((field, index) => (
              <div key={index} className="text-xs flex justify-between items-center relative py-1.5 px-2 mb-1 rounded hover:bg-orange-100/50 dark:hover:bg-orange-800/30 transition-colors">
                <div className="flex items-center space-x-2">
                  <Grip className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-600 dark:text-orange-400">{field.name}</span>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-800/30 text-orange-600 dark:text-orange-400">{field.type}</span>
                {/* Add output handles for array/subcollection fields */}
                {isArrayField(field) && (
                  <>
                    <Handle
                      type="source"
                      position={Position.Left}
                      id={`array-field-${index}-left`}
                      style={{
                        left: '-10px',
                        top: `${60 + index * 52 + 26}px`,
                        background: '#fb923c',
                        width: '12px',
                        height: '12px',
                        border: '2px solid white'
                      }}
                      title={`Connect ${field.name} (output)`}
                    />
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`array-field-${index}-right`}
                      style={{
                        right: '-10px',
                        top: `${60 + index * 52 + 26}px`,
                        background: '#fb923c',
                        width: '12px',
                        height: '12px',
                        border: '2px solid white'
                      }}
                      title={`Connect ${field.name} (output)`}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-orange-500">
            <FolderTree className="w-8 h-8 mx-auto mb-2 text-orange-300" />
            <p className="text-xs">No nested items</p>
          </div>
        )}
      </div>

      {/* Connection handles like Process nodes - 4 handles */}
      {/* Top Handle - Input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#ea580c',
          width: '14px',
          height: '14px',
          border: '3px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        title="Input"
      />
      {/* Left Handle - Input */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: '#ea580c',
          width: '14px',
          height: '14px',
          border: '3px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        title="Input"
      />
      {/* Right Handle - Output */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: '#ea580c',
          width: '14px',
          height: '14px',
          border: '3px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        title="Output"
      />
      {/* Bottom Handle - Output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#ea580c',
          width: '14px',
          height: '14px',
          border: '3px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        title="Output"
      />
    </div>
  );
});

SubcollectionNode.displayName = 'SubcollectionNode';

export default SubcollectionNode;
