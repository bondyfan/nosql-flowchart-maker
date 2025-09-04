import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, ChevronRight, ChevronDown } from 'lucide-react';
import { NodeData } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';

const ProcessNode: React.FC<NodeProps<NodeData>> = ({ data, id, selected }) => {
  const { updateNodeData } = useDatabase();
  const [label, setLabel] = useState(data.label || 'Process');
  const [description, setDescription] = useState(
    typeof data.properties?.description === 'string' ? data.properties.description : ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const editableRef = useRef<HTMLDivElement>(null);

  // Get the selected color or default to yellow
  const nodeColor = typeof data.properties?.color === 'string' ? data.properties.color : 'yellow';
  
  // Define color classes - all using gray for lower contrast
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-300 dark:border-yellow-600',
      ring: 'ring-yellow-400',
      handle: 'bg-yellow-500',
      icon: 'text-yellow-600 dark:text-yellow-400',
      focus: 'focus:ring-yellow-400'
    },
    blue: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    green: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    purple: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    red: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    orange: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    pink: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    },
    indigo: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      ring: 'ring-gray-400',
      handle: 'bg-gray-500',
      icon: 'text-gray-600 dark:text-gray-400',
      focus: 'focus:ring-gray-400'
    }
  } as const;

  const currentColors = colorClasses[nodeColor as keyof typeof colorClasses] || colorClasses.yellow;

  // Sync state with data changes only when NOT editing
  useEffect(() => {
    if (!isEditing) {
    setLabel(data.label || 'Process');
      setDescription(
        typeof data.properties?.description === 'string' ? data.properties.description : ''
      );
    }
  }, [data.label, data.properties?.description, isEditing]);

  // Reset editing state when node is deselected
  useEffect(() => {
    if (!selected) {
      setIsEditing(false);
    }
  }, [selected]);

  // Focus and position cursor when editing starts
  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Set the initial editing value
      setEditingValue(label);
      
      // Set the actual text content of the editable div
      editableRef.current.textContent = label;
      
      // Focus and position cursor at the end after a small delay
      setTimeout(() => {
        if (editableRef.current) {
          editableRef.current.focus();
          
          // Place cursor at the end of the text
          const textNode = editableRef.current.firstChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStart(textNode, textNode.textContent?.length || 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      }, 0);
    }
  }, [isEditing, label]);

  const handleLabelEdit = (evt: React.FormEvent<HTMLDivElement>) => {
    const newValue = evt.currentTarget.textContent || '';
    setEditingValue(newValue);
    // Don't update the database immediately, wait for blur or Enter
  };

  const finishEditing = () => {
    const finalValue = editingValue.trim() || 'Process';
    setLabel(finalValue);
    updateNodeData(id, { label: finalValue });
    setIsEditing(false);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLDivElement>) => {
    if (evt.key === 'Enter') {
      evt.preventDefault();
      finishEditing();
    }
    if (evt.key === 'Escape') {
      evt.preventDefault();
      // Restore original value
      setEditingValue(label);
      setIsEditing(false);
    }
  };

  const handleDescriptionChange = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = evt.target.value;
    setDescription(newDescription);
    updateNodeData(id, { properties: { ...data.properties, description: newDescription } });
  };

  const handleFieldDoubleClick = (evt: React.MouseEvent) => {
    if (selected) {
      evt.stopPropagation();
      setIsEditing(true);
    }
  };

  const hasDescription = description.length > 0;

  return (
    <div 
      className={`relative px-4 py-2 rounded-lg shadow-sm border ${currentColors.border} ${currentColors.bg} transition-all duration-200 w-[250px] cursor-pointer ${
        selected ? `ring-2 ${currentColors.ring} shadow-md` : ''
      }`}
    >
      {/* Top Handle - Input */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} 
        id="top"
      >
        <div className="pointer-events-none">
          <ChevronDown size={10} className="text-white" />
        </div>
      </Handle>
      {/* Left Handle - Input */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} 
        id="left"
      >
        <div className="pointer-events-none">
          <ChevronRight size={10} className="text-white" />
        </div>
      </Handle>
      {/* Right Handle - Output */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} 
        id="right"
      >
        <div className="pointer-events-none">
          <ChevronRight size={10} className="text-white font-bold" />
        </div>
      </Handle>
      {/* Bottom Handle - Output */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} 
        id="bottom"
      >
        <div className="pointer-events-none">
          <ChevronDown size={10} className="text-white" />
        </div>
      </Handle>
      
      <div className="flex items-center mb-2">
        <Zap size={18} className={`${currentColors.icon} mr-2`} />
        {isEditing ? (
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning={true}
            onInput={handleLabelEdit}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            className={`font-semibold text-gray-800 dark:text-white w-full focus:outline-none ${currentColors.focus}`}
            style={{ 
              margin: 0,
              padding: '0.125rem 0.25rem',
              border: 'none',
              boxSizing: 'border-box',
              lineHeight: '1.5rem',
              height: '1.75rem',
              fontSize: 'inherit',
              fontWeight: '600',
              borderRadius: '0.25rem',
              backgroundColor: 'transparent',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              wordBreak: 'keep-all',
              display: 'block'
            }}
          />
        ) : (
          <div 
            className={`font-semibold text-gray-800 dark:text-white w-full ${selected ? 'cursor-text' : ''}`}
            onDoubleClick={handleFieldDoubleClick}
            style={{ 
              margin: 0,
              padding: '0.125rem 0.25rem',
              border: 'none',
              boxSizing: 'border-box',
              lineHeight: '1.5rem',
              height: '1.75rem',
              fontSize: 'inherit',
              fontWeight: '600',
              borderRadius: '0.25rem',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              wordBreak: 'keep-all',
              display: 'block'
            }}
          >
            {label}
          </div>
        )}
      </div>
      
      {/* Description Section - only show if there's content */}
      {hasDescription && (
        <>
          {isEditing ? (
      <textarea
        value={description}
        onChange={handleDescriptionChange}
              className={`w-full h-20 p-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 ${currentColors.focus} resize-none`}
        placeholder="Enter process description..."
              onBlur={() => setIsEditing(false)}
            />
          ) : (
            <div 
              className={`w-full h-20 p-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md whitespace-pre-wrap overflow-hidden ${selected ? 'cursor-text' : ''}`}
              onDoubleClick={handleFieldDoubleClick}
            >
              {description}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default memo(ProcessNode); 