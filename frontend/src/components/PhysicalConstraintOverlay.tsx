import React, { useMemo } from 'react';
import { Node } from 'reactflow';
import { CustomShapeData } from '../types';

export interface BlockedZone {
  shapeId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  reason: string;
}

export interface PhysicalConstraintOverlayProps {
  nodes: Node[];
  draggedNodeId: string | null;
  dragPosition: { x: number; y: number } | null;
  blockedBy: string[];
  isBlocked: boolean;
  feedbackMessage?: string;
  enabled: boolean;
}

/**
 * Visual overlay that shows blocked areas and constraint violations during drag operations
 */
export const PhysicalConstraintOverlay: React.FC<PhysicalConstraintOverlayProps> = ({
  nodes,
  draggedNodeId,
  dragPosition,
  blockedBy,
  isBlocked,
  feedbackMessage,
  enabled
}) => {
  // Calculate blocked zones around shapes that are causing violations
  const blockedZones = useMemo(() => {
    if (!enabled || !draggedNodeId || blockedBy.length === 0) {
      return [];
    }

    const zones: BlockedZone[] = [];

    blockedBy.forEach(shapeId => {
      const node = nodes.find(n => n.id === shapeId);
      if (node && node.type === 'customShape') {
        const data = node.data as CustomShapeData;
        const shapePoints = data.shapePoints || [];
        
        if (shapePoints.length > 0) {
          // Calculate bounding box of the shape
          const minX = Math.min(...shapePoints.map(p => p.x));
          const maxX = Math.max(...shapePoints.map(p => p.x));
          const minY = Math.min(...shapePoints.map(p => p.y));
          const maxY = Math.max(...shapePoints.map(p => p.y));
          
          // Add padding for blocked zone
          const padding = 10;
          
          zones.push({
            shapeId,
            position: {
              x: node.position.x + minX - padding,
              y: node.position.y + minY - padding
            },
            size: {
              width: (maxX - minX) + (padding * 2),
              height: (maxY - minY) + (padding * 2)
            },
            reason: `Cannot overlap - no ADJACENT_TO relationship with ${data.assignedNodeName || shapeId}`
          });
        }
      }
    });

    return zones;
  }, [enabled, draggedNodeId, blockedBy, nodes]);

  // Calculate dragged shape outline if blocked
  const draggedShapeOutline = useMemo(() => {
    if (!enabled || !draggedNodeId || !dragPosition || !isBlocked) {
      return null;
    }

    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedNode || draggedNode.type !== 'customShape') {
      return null;
    }

    const data = draggedNode.data as CustomShapeData;
    const shapePoints = data.shapePoints || [];
    
    if (shapePoints.length === 0) {
      return null;
    }

    // Transform shape points by drag position
    const transformedPoints = shapePoints.map(point => ({
      x: dragPosition.x + point.x,
      y: dragPosition.y + point.y
    }));

    return transformedPoints;
  }, [enabled, draggedNodeId, dragPosition, isBlocked, nodes]);

  if (!enabled) {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-50"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Blocked zones - highlight shapes that cannot be overlapped */}
      {blockedZones.map(zone => (
        <div
          key={zone.shapeId}
          className="absolute border-2 border-red-500 bg-red-200 bg-opacity-20 rounded"
          style={{
            left: zone.position.x,
            top: zone.position.y,
            width: zone.size.width,
            height: zone.size.height,
            transform: 'translate(0, 0)', // Ensure exact positioning
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
          title={zone.reason}
        >
          {/* Blocked zone indicator */}
          <div className="absolute top-0 right-0 transform translate-x-1 -translate-y-1">
            <div className="bg-red-500 text-white text-xs px-1 py-0.5 rounded shadow-md">
              BLOCKED
            </div>
          </div>
        </div>
      ))}

      {/* Dragged shape outline when blocked */}
      {draggedShapeOutline && (
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <polygon
            points={draggedShapeOutline.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgba(239, 68, 68, 0.1)"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="animate-pulse"
          />
          
          {/* Collision indicators at intersection points */}
          {draggedShapeOutline.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#ef4444"
              className="animate-ping"
            />
          ))}
        </svg>
      )}

      {/* Feedback message */}
      {isBlocked && feedbackMessage && dragPosition && (
        <div
          className="absolute z-60 bg-red-500 text-white text-sm px-3 py-2 rounded shadow-lg max-w-xs"
          style={{
            left: dragPosition.x + 20,
            top: dragPosition.y - 40,
            transform: 'translate(0, 0)'
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{feedbackMessage}</span>
          </div>
          
          {/* Arrow pointing to drag position */}
          <div 
            className="absolute w-2 h-2 bg-red-500 transform rotate-45"
            style={{
              left: '12px',
              bottom: '-4px'
            }}
          />
        </div>
      )}

      {/* Success indicator when placement is valid */}
      {!isBlocked && draggedNodeId && dragPosition && (
        <div
          className="absolute z-60 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-md"
          style={{
            left: dragPosition.x,
            top: dragPosition.y - 30,
            transform: 'translate(-50%, 0)'
          }}
        >
          ✓ Valid placement
        </div>
      )}

      {/* Embedded CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .animate-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};