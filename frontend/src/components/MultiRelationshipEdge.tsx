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
}

// Helper function to get node dimensions from store
const getNodeDimensions = (nodeId: string, nodes: Node[]): { width: number; height: number } => {
  const node = nodes.find((n: Node) => n.id === nodeId);
  if (!node) return { width: 120, height: 80 }; // Default size
  
  const nodeData = node.data;
  return {
    width: nodeData?.width || 120,
    height: nodeData?.height || 80
  };
};

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
  // Remove unused variable warning
  // const relationshipIndex = data?.relationshipIndex ?? 0;
  
  // Get all nodes and edges from the store
  const nodes = useStore((state) => state.getNodes());
  const edges = useStore((state) => state.edges);
  
  // Ensure we have valid data before rendering
  if (!data || data.relationshipIndex === undefined) {
    console.warn('Edge missing required data:', { id, data });
    return null;
  }
  
  if (sourceX === targetX && sourceY === targetY) return null;
  
  // Get node dimensions
  const sourceDimensions = getNodeDimensions(source, nodes);
  const targetDimensions = getNodeDimensions(target, nodes);
  
  // Find all edges between the same nodes (bidirectional)
  const parallelEdges = edges.filter((edge: Edge) => 
    (edge.source === source && edge.target === target) ||
    (edge.source === target && edge.target === source)
  );
  
  // Calculate proper offset for multiple relationships
  const edgeCount = parallelEdges.length;
  const edgeIndex = parallelEdges.findIndex((edge: Edge) => edge.id === id);
  
  // Calculate offset: center multiple lines around the direct line
  const offsetAmount = 15; // 15px spacing between parallel lines
  const offset = edgeCount > 1 ? 
    (edgeIndex - Math.floor(edgeCount / 2)) * offsetAmount + 
    (edgeCount % 2 === 0 ? offsetAmount / 2 : 0) : 0;
  
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
  
  // Calculate node boundary intersection points
  const sourceNode = nodes.find((n: Node) => n.id === source);
  const targetNode = nodes.find((n: Node) => n.id === target);
  
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
    const arrowSize = 8;
    const arrowId = `arrow-${direction}-${id}`;
    
    return (
      <defs>
        <marker
          id={arrowId}
          markerWidth={arrowSize}
          markerHeight={arrowSize}
          refX={direction === 'target' ? arrowSize - 1 : 1}
          refY={arrowSize / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={direction === 'target' ? 
              `M0,0 L0,${arrowSize} L${arrowSize},${arrowSize/2} z` : 
              `M${arrowSize},0 L${arrowSize},${arrowSize} L0,${arrowSize/2} z`}
            fill={style.stroke || '#000'}
            stroke={style.stroke || '#000'}
          />
        </marker>
      </defs>
    );
  };
  
  const { showSourceArrow, showTargetArrow } = getArrowConfig();
  
  return (
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
      {/* Invisible wider path for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        style={{ cursor: 'pointer' }}
        className="react-flow__edge-interaction"
      />
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

export default React.memo(MultiRelationshipEdge);