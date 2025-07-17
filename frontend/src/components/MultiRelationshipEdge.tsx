import React from 'react';
import { 
  EdgeProps, 
  getBezierPath, 
  EdgeLabelRenderer,
  BaseEdge 
} from 'reactflow';

interface MultiRelationshipEdgeData {
  relationshipType: string;
  priority: number;
  reason: string;
  relationshipIndex: number;
  doorType?: string;
  minDistance?: number;
  maxDistance?: number;
  flowDirection?: string;
  flowType?: string;
}

const MultiRelationshipEdge: React.FC<EdgeProps<MultiRelationshipEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
}) => {
  const relationshipIndex = data?.relationshipIndex ?? 0;
  
  console.log('MultiRelationshipEdge rendering:', {
    id,
    relationshipIndex,
    relationshipType: data?.relationshipType,
    sourceX,
    sourceY,
    targetX,
    targetY,
    edgeCount: data ? 'data present' : 'no data'
  });
  
  // Ensure we have valid data before rendering
  if (!data || data.relationshipIndex === undefined) {
    console.warn('Edge missing required data:', { id, data });
    return null;
  }
  
  if (sourceX === targetX && sourceY === targetY) return null;
  
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return null;
  
  // Unit vector
  const ux = dx / distance;
  const uy = dy / distance;
  
  // Perp unit vector
  const perpUx = -uy;
  const perpUy = ux;
  
  // Calculate curvature with better distribution for multiple edges
  const isEven = relationshipIndex % 2 === 0;
  const direction = isEven ? 1 : -1;
  const magnitude = Math.ceil((relationshipIndex + 1) / 2);
  
  // Increased curvature for better visibility
  const baseCurvature = Math.min(distance * 0.3, 100); // Scale with distance but cap at 100
  const curvature = magnitude * baseCurvature * direction;
  
  console.log(`Edge ${id}: index=${relationshipIndex}, magnitude=${magnitude}, direction=${direction}, curvature=${curvature}`);
  
  // Center point
  const centerX = sourceX + dx * 0.5;
  const centerY = sourceY + dy * 0.5;
  
  // Offset control point
  const controlX = centerX + perpUx * curvature;
  const controlY = centerY + perpUy * curvature;
  
  // Create path
  const edgePath = `M${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
  
  // Label position at t=0.5 on the quadratic bezier curve
  const t = 0.5;
  const labelX = (1 - t) * (1 - t) * sourceX + 2 * (1 - t) * t * controlX + t * t * targetX;
  const labelY = (1 - t) * (1 - t) * sourceY + 2 * (1 - t) * t * controlY + t * t * targetY;
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
      />
      {/* Debug indicator showing relationship index */}
      <circle
        cx={labelX + (relationshipIndex * 10)}
        cy={labelY - 20}
        r="5"
        fill="red"
        stroke="white"
        strokeWidth="1"
      />
      <text
        x={labelX + (relationshipIndex * 10)}
        y={labelY - 15}
        fontSize="10"
        fill="white"
        textAnchor="middle"
        fontWeight="bold"
      >
        {relationshipIndex}
      </text>
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              fontWeight: 500,
              color: style.stroke || '#000',
              background: labelShowBg ? (labelBgStyle?.fill || '#fff') : 'transparent',
              padding: labelBgPadding ? `${labelBgPadding[1]}px ${labelBgPadding[0]}px` : '2px 4px',
              borderRadius: labelBgBorderRadius || 2,
              border: labelShowBg ? `1px solid ${style.stroke || '#000'}` : 'none',
              pointerEvents: 'all',
              ...labelStyle,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default MultiRelationshipEdge;