import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
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
  
  // Define color classes for different color options
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-300 dark:border-yellow-600',
      ring: 'ring-yellow-500',
      handle: 'bg-yellow-500',
      icon: 'text-yellow-600 dark:text-yellow-400',
      focus: 'focus:ring-yellow-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-300 dark:border-blue-600',
      ring: 'ring-blue-500',
      handle: 'bg-blue-500',
      icon: 'text-blue-600 dark:text-blue-400',
      focus: 'focus:ring-blue-500'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-600',
      ring: 'ring-green-500',
      handle: 'bg-green-500',
      icon: 'text-green-600 dark:text-green-400',
      focus: 'focus:ring-green-500'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      border: 'border-purple-300 dark:border-purple-600',
      ring: 'ring-purple-500',
      handle: 'bg-purple-500',
      icon: 'text-purple-600 dark:text-purple-400',
      focus: 'focus:ring-purple-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-300 dark:border-red-600',
      ring: 'ring-red-500',
      handle: 'bg-red-500',
      icon: 'text-red-600 dark:text-red-400',
      focus: 'focus:ring-red-500'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/30',
      border: 'border-orange-300 dark:border-orange-600',
      ring: 'ring-orange-500',
      handle: 'bg-orange-500',
      icon: 'text-orange-600 dark:text-orange-400',
      focus: 'focus:ring-orange-500'
    },
    pink: {
      bg: 'bg-pink-50 dark:bg-pink-900/30',
      border: 'border-pink-300 dark:border-pink-600',
      ring: 'ring-pink-500',
      handle: 'bg-pink-500',
      icon: 'text-pink-600 dark:text-pink-400',
      focus: 'focus:ring-pink-500'
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
      border: 'border-indigo-300 dark:border-indigo-600',
      ring: 'ring-indigo-500',
      handle: 'bg-indigo-500',
      icon: 'text-indigo-600 dark:text-indigo-400',
      focus: 'focus:ring-indigo-500'
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
      className={`px-4 py-2 rounded-lg shadow-md border ${currentColors.border} ${currentColors.bg} transition-all duration-200 w-[250px] cursor-pointer ${
        selected ? `ring-2 ${currentColors.ring} shadow-lg` : ''
      }`}
    >
      {/* Top Handle - Input */}
      <Handle type="target" position={Position.Top} className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} id="top">
        <ChevronDown size={14} className="text-white" />
      </Handle>
      {/* Left Handle - Input */}
      <Handle type="target" position={Position.Left} className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} id="left">
        <ChevronRight size={14} className="text-white" />
      </Handle>
      {/* Right Handle - Output */}
      <Handle type="source" position={Position.Right} className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} id="right">
        <ChevronRight size={14} className="text-white font-black" />
      </Handle>
      {/* Bottom Handle - Output */}
      <Handle type="source" position={Position.Bottom} className={`w-4 h-4 ${currentColors.handle} flex items-center justify-center`} id="bottom">
        <ChevronDown size={14} className="text-white" />
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