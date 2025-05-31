import React, { useState, useRef } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import { Separator as SeparatorType } from '../types';

interface SeparatorProps {
  separator: SeparatorType;
  onUpdate: (id: string, updates: Partial<Omit<SeparatorType, 'id'>>) => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onSelect: (id: string) => void;
}

const Separator: React.FC<SeparatorProps> = ({ 
  separator, 
  onUpdate, 
  onDelete, 
  selected,
  onSelect 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, separatorX: 0 });
  const [editLabel, setEditLabel] = useState(separator.label);
  const [editColor, setEditColor] = useState(separator.color);
  const lineRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      separatorX: separator.x
    });
    onSelect(separator.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const newX = Math.max(50, dragStart.separatorX + deltaX); // Minimum 50px from left
    onUpdate(separator.id, { x: newX });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditLabel(separator.label);
    setEditColor(separator.color);
  };

  const handleSave = () => {
    onUpdate(separator.id, { 
      label: editLabel.trim() || 'Separator',
      color: editColor 
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLabel(separator.label);
    setEditColor(separator.color);
    setIsEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this separator?')) {
      onDelete(separator.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      ref={lineRef}
      className="absolute top-0 bottom-0 flex flex-col items-center z-10"
      style={{ 
        left: separator.x,
        transform: 'translateX(-50%)',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Vertical Line */}
      <div
        className={`w-1 h-full transition-all duration-200 ${
          selected ? 'shadow-lg' : ''
        }`}
        style={{ 
          backgroundColor: separator.color,
          opacity: selected ? 1 : 0.7,
          width: selected ? 3 : 2
        }}
        onMouseDown={handleMouseDown}
      />
      
      {/* Label Container */}
      <div
        className={`absolute top-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border transition-all duration-200 ${
          selected 
            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20' 
            : 'border-gray-200 dark:border-gray-700'
        }`}
        style={{ 
          borderColor: selected ? separator.color : undefined,
          transform: 'translateX(-50%)'
        }}
        onClick={() => onSelect(separator.id)}
      >
        {isEditing ? (
          <div className="p-3 space-y-2 min-w-[200px]">
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Separator label"
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">Color:</label>
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-8 h-6 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex justify-end space-x-1">
              <button
                onClick={handleCancel}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: separator.color }}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {separator.label}
            </span>
            {selected && (
              <div className="flex space-x-1">
                <button
                  onClick={handleEdit}
                  className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  title="Edit separator"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  title="Delete separator"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Separator; 