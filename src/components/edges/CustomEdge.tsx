import React from 'react';
import { EdgeProps, getSmoothStepPath, getStraightPath, BaseEdge, EdgeLabelRenderer } from 'reactflow';
import { X } from 'lucide-react';

interface CustomEdgeProps extends EdgeProps {
  selected?: boolean;
  onDelete?: (edgeId: string) => void;
}

// Snapping threshold - edges will snap to straight lines if they're within this distance
const SNAP_THRESHOLD = 10;

const CustomEdge: React.FC<CustomEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected = false,
  data,
}) => {
  // Check if this edge has snapping information
  const snapType = data?.snapType;
  
  // Calculate if the edge should snap to a straight line (fallback for existing edges)
  const shouldSnapToStraight = () => {
    if (snapType) return snapType; // Use stored snap type if available
    
    const deltaX = Math.abs(targetX - sourceX);
    const deltaY = Math.abs(targetY - sourceY);
    
    // Snap to horizontal if the vertical difference is small AND we're connecting horizontally
    if (deltaY <= SNAP_THRESHOLD && deltaX > SNAP_THRESHOLD && 
        (sourcePosition === 'right' || sourcePosition === 'left' || 
         targetPosition === 'right' || targetPosition === 'left')) {
      return 'horizontal';
    }
    
    // Snap to vertical if the horizontal difference is small AND we're connecting vertically
    if (deltaX <= SNAP_THRESHOLD && deltaY > SNAP_THRESHOLD && 
        (sourcePosition === 'top' || sourcePosition === 'bottom' || 
         targetPosition === 'top' || targetPosition === 'bottom')) {
      return 'vertical';
    }
    
    return null;
  };

  const snapResult = shouldSnapToStraight();
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  // Always respect the actual connection handle positions for snapped edges
  if (snapResult === 'horizontal') {
    // Force perfectly horizontal straight line - use source Y coordinate
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY: sourceY, // Force same Y coordinate for perfect horizontal line
    });
  } else if (snapResult === 'vertical') {
    // Force perfectly vertical straight line - use source X coordinate
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX: sourceX, // Force same X coordinate for perfect vertical line
      targetY,
    });
  } else {
    // Use smooth step path for non-snapped edges
    [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <>
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#ef4444' : style.stroke || '#3b82f6',
          filter: selected ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))' : 'none',
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-all duration-200 border-2 border-white hover:scale-110"
              title="Delete edge (or press Delete/Backspace)"
            >
              <X size={12} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;