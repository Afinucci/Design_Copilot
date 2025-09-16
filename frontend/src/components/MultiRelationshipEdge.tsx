import React from 'react';
import { 
  EdgeProps, 
  EdgeLabelRenderer,
  BaseEdge,
  getStraightPath,
  useStore,
  Node,
  Edge
} from 'reactflow';
import PersonnelFlowIcon from './PersonnelFlowIcon';
import GuidedModeEdge from './GuidedModeEdge';
import { 
  EDGE_SPACING, 
  DEFAULT_NODE_WIDTH, 
  DEFAULT_NODE_HEIGHT, 
  ARROW_SIZE,
  EDGE_FONT_SIZE,
  EDGE_FONT_WEIGHT,
  EDGE_BORDER_RADIUS
} from '../constants/edgeConstants';

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
  creationDirection?: 'source-to-target' | 'target-to-source';
  // When true, render this edge as an icon-only indicator (used in guided mode)
  renderAsIcon?: boolean;
  // Mode information passed through edge data
  mode?: 'creation' | 'guided';
}


// Helper function to calculate intersection point on node boundary
const getNodeIntersectionPoint = (
  nodeX: number, 
  nodeY: number, 
  nodeWidth: number, 
  nodeHeight: number, 
  lineX: number, 
  lineY: number
): { x: number; y: number } => {
  // Calculate center of node
  const centerX = nodeX + nodeWidth / 2;
  const centerY = nodeY + nodeHeight / 2;
  
  // Calculate direction vector from node center to line endpoint
  const dx = lineX - centerX;
  const dy = lineY - centerY;
  
  // Calculate intersection with node boundary
  const halfWidth = nodeWidth / 2;
  const halfHeight = nodeHeight / 2;
  
  // Find which edge of the rectangle the line intersects
  if (Math.abs(dx) / halfWidth > Math.abs(dy) / halfHeight) {
    // Intersects with left or right edge
    const x = centerX + (dx > 0 ? halfWidth : -halfWidth);
    const y = centerY + (dy * halfWidth) / Math.abs(dx);
    return { x, y };
  } else {
    // Intersects with top or bottom edge
    const x = centerX + (dx * halfHeight) / Math.abs(dy);
    const y = centerY + (dy > 0 ? halfHeight : -halfHeight);
    return { x, y };
  }
};

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
  source,
  target,
}) => {
  // Always call hooks at the top level (required by React)
  // Get individual nodes directly - more efficient than complex selector
  const sourceNode = useStore((state) => state.nodeInternals.get(source));
  const targetNode = useStore((state) => state.nodeInternals.get(target));
  
  // Get edges between the same nodes for parallel edge calculation
  const parallelEdges = useStore(
    (state) => state.edges.filter((edge: Edge) => 
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source)
    ),
    (a, b) => a.length === b.length && a.every((edge, i) => edge.id === b[i]?.id)
  );
  
  // Ensure we have valid data before rendering
  if (!data || data.relationshipIndex === undefined) {
    console.warn('Edge missing required data:', { id, data });
    return null;
  }
  
  if (sourceX === targetX && sourceY === targetY) return null;
  
  // If we're in guided mode, use the specialized GuidedModeEdge component
  if (data.mode === 'guided') {
    return (
      <GuidedModeEdge
        id={id}
        sourceX={sourceX}
        sourceY={sourceY}
        targetX={targetX}
        targetY={targetY}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        style={style}
        data={data}
        label={label}
        labelStyle={labelStyle}
        labelShowBg={labelShowBg}
        labelBgStyle={labelBgStyle}
        labelBgPadding={labelBgPadding}
        labelBgBorderRadius={labelBgBorderRadius}
        source={source}
        target={target}
      />
    );
  }
  
  // For creation mode, continue with original line-based rendering below
  
  // Get node dimensions directly from nodes
  const sourceDimensions = sourceNode ? {
    width: sourceNode.data?.width || DEFAULT_NODE_WIDTH,
    height: sourceNode.data?.height || DEFAULT_NODE_HEIGHT
  } : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  
  const targetDimensions = targetNode ? {
    width: targetNode.data?.width || DEFAULT_NODE_WIDTH,
    height: targetNode.data?.height || DEFAULT_NODE_HEIGHT
  } : { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  
  // parallelEdges already calculated above with useStore
  
  // Calculate proper offset for multiple relationships
  const edgeCount = parallelEdges.length;
  const edgeIndex = parallelEdges.findIndex((edge: Edge) => edge.id === id);
  
  // Calculate offset: center multiple lines around the direct line
  const offset = edgeCount > 1 ? 
    (edgeIndex - Math.floor(edgeCount / 2)) * EDGE_SPACING + 
    (edgeCount % 2 === 0 ? EDGE_SPACING / 2 : 0) : 0;
  
  // Calculate direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance === 0) return null;
  
  // Unit vectors
  const ux = dx / distance;
  const uy = dy / distance;
  
  // Perpendicular unit vector for offset
  const perpUx = -uy;
  const perpUy = ux;
  
  // Validate nodes exist before proceeding
  
  if (!sourceNode || !targetNode) return null;
  
  // Get actual node positions and dimensions
  const sourceNodeX = sourceNode.position.x;
  const sourceNodeY = sourceNode.position.y;
  const targetNodeX = targetNode.position.x;
  const targetNodeY = targetNode.position.y;
  
  // Calculate intersection points on node boundaries
  const sourceIntersection = getNodeIntersectionPoint(
    sourceNodeX, 
    sourceNodeY, 
    sourceDimensions.width, 
    sourceDimensions.height, 
    targetX, 
    targetY
  );
  
  const targetIntersection = getNodeIntersectionPoint(
    targetNodeX, 
    targetNodeY, 
    targetDimensions.width, 
    targetDimensions.height, 
    sourceX, 
    sourceY
  );
  
  // Apply offset to intersection points
  const offsetSourceX = sourceIntersection.x + perpUx * offset;
  const offsetSourceY = sourceIntersection.y + perpUy * offset;
  const offsetTargetX = targetIntersection.x + perpUx * offset;
  const offsetTargetY = targetIntersection.y + perpUy * offset;
  
  // Create straight line path using ReactFlow's getStraightPath
  const [edgePath] = getStraightPath({
    sourceX: offsetSourceX,
    sourceY: offsetSourceY,
    targetX: offsetTargetX,
    targetY: offsetTargetY,
  });
  
  // Label position at center of line
  const labelX = offsetSourceX + (offsetTargetX - offsetSourceX) * 0.5;
  const labelY = offsetSourceY + (offsetTargetY - offsetSourceY) * 0.5;
  
  // Helper function to determine if arrows should be shown
  const shouldShowArrows = () => {
    return data.relationshipType === 'MATERIAL_FLOW' || data.relationshipType === 'PERSONNEL_FLOW';
  };
  
  // Helper function to determine arrow configuration
  const getArrowConfig = () => {
    if (!shouldShowArrows()) return { showSourceArrow: false, showTargetArrow: false };
    
    const isBidirectional = data.flowDirection === 'bidirectional';
    const isUnidirectional = data.flowDirection === 'unidirectional';
    
    if (isBidirectional) {
      return { showSourceArrow: true, showTargetArrow: true };
    } else if (isUnidirectional) {
      return { showSourceArrow: false, showTargetArrow: true };
    } else {
      return { showSourceArrow: false, showTargetArrow: true };
    }
  };
  
  // Helper function to create arrow marker
  const createArrowMarker = (direction: 'source' | 'target') => {
    const arrowId = `arrow-${direction}-${id}`;
    
    return (
      <defs>
        <marker
          id={arrowId}
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          refX={direction === 'target' ? ARROW_SIZE - 1 : 1}
          refY={ARROW_SIZE / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={direction === 'target' ? 
              `M0,0 L0,${ARROW_SIZE} L${ARROW_SIZE},${ARROW_SIZE/2} z` : 
              `M${ARROW_SIZE},0 L${ARROW_SIZE},${ARROW_SIZE} L0,${ARROW_SIZE/2} z`}
            fill={style.stroke || '#000'}
            stroke={style.stroke || '#000'}
          />
        </marker>
      </defs>
    );
  };
  
  const { showSourceArrow, showTargetArrow } = data?.renderAsIcon
    ? { showSourceArrow: false, showTargetArrow: false }
    : getArrowConfig();
  
  return (
    <>
      {!data?.renderAsIcon && (
        <>
          <svg>
            {showSourceArrow && createArrowMarker('source')}
            {showTargetArrow && createArrowMarker('target')}
          </svg>
          <BaseEdge
            id={id}
            path={edgePath}
            style={{
              ...style,
              markerStart: showSourceArrow ? `url(#arrow-source-${id})` : undefined,
              markerEnd: showTargetArrow ? `url(#arrow-target-${id})` : undefined,
              cursor: 'pointer',
            }}
          />
        </>
      )}
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer' }}
        className="react-flow__edge-interaction"
      />
      {data?.renderAsIcon && data?.relationshipType === 'PERSONNEL_FLOW' ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
            aria-label="personnel flow"
            title="Personnel movement"
          >
            <svg width="60" height="40" style={{ overflow: 'visible' }}>
              <PersonnelFlowIcon
                x={30}
                y={20}
                direction={
                  data.flowDirection === 'bidirectional' 
                    ? 'bidirectional' 
                    : data.creationDirection === 'target-to-source' 
                      ? 'backward' 
                      : 'forward'
                }
                size={20}
                color={style.stroke || '#ff9800'}
              />
            </svg>
          </div>
        </EdgeLabelRenderer>
      ) : label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: EDGE_FONT_SIZE,
              fontWeight: EDGE_FONT_WEIGHT,
              color: style.stroke || '#000',
              background: labelShowBg ? (labelBgStyle?.fill || '#fff') : 'transparent',
              padding: labelBgPadding ? `${labelBgPadding[1]}px ${labelBgPadding[0]}px` : '2px 4px',
              borderRadius: labelBgBorderRadius || EDGE_BORDER_RADIUS,
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

export default React.memo(MultiRelationshipEdge);