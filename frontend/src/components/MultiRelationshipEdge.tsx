import React, { useMemo } from 'react';
import {
  EdgeProps,
  EdgeLabelRenderer,
  BaseEdge,
  getStraightPath,
  getBezierPath,
  useStore,
  Node,
  Edge
} from 'reactflow';
import { shallow } from 'zustand/shallow';
import PersonnelFlowIcon from './PersonnelFlowIcon';
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
  // Edge style: straight or curved
  edgeStyle?: 'straight' | 'curved';
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
  // Optimized: Use memoized selector with shallow comparison
  const edgeSelector = useMemo(
    () => (state: any) =>
      state.edges.filter((edge: Edge) =>
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source)
      ),
    [source, target]
  );

  const parallelEdges = useStore(edgeSelector, shallow);
  
  // Ensure we have valid data before rendering
  if (!data || data.relationshipIndex === undefined) {
    console.warn('Edge missing required data:', { id, data });
    return null;
  }
  
  if (sourceX === targetX && sourceY === targetY) return null;
  
  
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

  // ReactFlow already provides sourceX, sourceY, targetX, targetY as the handle positions
  // So we can use them directly instead of recalculating intersection points
  // This fixes the issue where edges don't connect to handle points

  // Apply offset to handle positions for multiple parallel edges
  const offsetSourceX = sourceX + perpUx * offset;
  const offsetSourceY = sourceY + perpUy * offset;
  const offsetTargetX = targetX + perpUx * offset;
  const offsetTargetY = targetY + perpUy * offset;

  // Determine edge style (default to straight if not specified)
  const currentEdgeStyle = data.edgeStyle || 'straight';

  // Create edge path based on style
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (currentEdgeStyle === 'curved') {
    // Use Bezier curve for curved edges
    const [bezierPath, labelXPos, labelYPos] = getBezierPath({
      sourceX: offsetSourceX,
      sourceY: offsetSourceY,
      sourcePosition,
      targetX: offsetTargetX,
      targetY: offsetTargetY,
      targetPosition,
    });
    edgePath = bezierPath;
    labelX = labelXPos;
    labelY = labelYPos;
  } else {
    // Use straight line for straight edges
    const [straightPath] = getStraightPath({
      sourceX: offsetSourceX,
      sourceY: offsetSourceY,
      targetX: offsetTargetX,
      targetY: offsetTargetY,
    });
    edgePath = straightPath;
    // Label position at center of line
    labelX = offsetSourceX + (offsetTargetX - offsetSourceX) * 0.5;
    labelY = offsetSourceY + (offsetTargetY - offsetSourceY) * 0.5;
  }
  
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