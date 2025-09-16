import React, { useMemo, useEffect, useRef } from 'react';
import { EdgeProps, EdgeLabelRenderer, useStore, ReactFlowState, Node } from 'reactflow';
import { 
  SwapHoriz, 
  Room, 
  Warning, 
  ArrowForward,
  CompareArrows,
  LocalShipping,
  Engineering,
  CleaningServices,
  ElectricalServices
} from '@mui/icons-material';
import { Box, Tooltip } from '@mui/material';
import { 
  GUIDED_MODE_COLORS,
  GUIDED_RELATIONSHIP_LABELS, 
  OVERLAP_OFFSET_RATIO,
  MIN_DISTANCE_MULTIPLIER,
  GUIDED_CHIP_HEIGHT,
  GUIDED_CHIP_MIN_WIDTH,
  GUIDED_BORDER_WIDTH,
  GUIDED_BORDER_RADIUS,
  GUIDED_BOX_SHADOW,
  GUIDED_BOX_SHADOW_HOVER,
  GUIDED_FONT_SIZE,
  GUIDED_FONT_WEIGHT,
  GUIDED_ICON_SIZE,
  GUIDED_MODE_SCALE_HOVER,
  GUIDED_EDGE_Z_INDEX,
  GUIDED_EDGE_HOVER_Z_INDEX,
  GUIDED_EDGE_CRITICAL_Z_INDEX,
  RELATIONSHIP_PRIORITY_Z_INDEX,
  CRITICAL_OVERLAP_RATIO,
  ICON_COLLISION_RADIUS,
  MINIMUM_BOUNDARY_CLEARANCE,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT
} from '../constants/edgeConstants';
import './GuidedModeEdge.css';
import { nodeToShapeGeometry, detectCollision, ShapeGeometry } from '../utils/shapeCollision';

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
  renderAsIcon?: boolean;
}

interface GuidedModeEdgeProps extends EdgeProps<MultiRelationshipEdgeData> {}

// Enhanced icon mapping with pharmaceutical-specific design
const getRelationshipIcon = (type: string, isDirectional: boolean = false) => {
  const iconStyle = {
    fontSize: GUIDED_ICON_SIZE + 'px',
    color: 'inherit',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', // Add subtle shadow for depth
    transition: 'all 0.2s ease-in-out'
  };

  const getIcon = () => {
    switch (type) {
      case 'MATERIAL_FLOW':
        // Enhanced material flow icons based on pharmaceutical context
        return isDirectional ? <LocalShipping sx={iconStyle} /> : <SwapHoriz sx={iconStyle} />;
      case 'PERSONNEL_FLOW':
        // Personnel movement with pharmaceutical safety context
        return <Engineering sx={iconStyle} />;
      case 'ADJACENT_TO':
        // Spatial adjacency in pharmaceutical facilities
        return <Room sx={iconStyle} />;
      case 'REQUIRES_ACCESS':
        // Critical access requirements (cleanroom entry, etc.)
        return <CleaningServices sx={iconStyle} />;
      case 'SHARES_UTILITY':
        // Shared utilities (HVAC, water, electrical, etc.)
        return <ElectricalServices sx={iconStyle} />;
      case 'PROHIBITED_NEAR':
        // Critical separation requirements for pharmaceutical safety
        return <Warning sx={{...iconStyle, filter: iconStyle.filter + ' hue-rotate(15deg)'}} />;
      default:
        return <Room sx={iconStyle} />;
    }
  };

  return getIcon();
};

// Get relationship color based on type - Enhanced for guided mode
const getRelationshipColor = (type: string): string => {
  return GUIDED_MODE_COLORS[type as keyof typeof GUIDED_MODE_COLORS] || GUIDED_MODE_COLORS.DEFAULT;
};

// Get relationship label - Enhanced for pharmaceutical context in guided mode
const getRelationshipLabel = (type: string): string => {
  return GUIDED_RELATIONSHIP_LABELS[type as keyof typeof GUIDED_RELATIONSHIP_LABELS] || GUIDED_RELATIONSHIP_LABELS.DEFAULT;
};

// Dynamic z-index calculation based on relationship priority and overlap severity
const calculateDynamicZIndex = (
  relationshipType: string,
  overlapSeverity: number,
  iconCount: number = 0,
  isHovering: boolean = false
) => {
  const baseZIndex = GUIDED_EDGE_Z_INDEX;
  
  // Higher priority for critical relationships
  const typePriority = RELATIONSHIP_PRIORITY_Z_INDEX[relationshipType as keyof typeof RELATIONSHIP_PRIORITY_Z_INDEX] || 0;
  
  // Boost for severely overlapping scenarios
  const overlapBoost = Math.floor(overlapSeverity * 50);
  
  // Slight boost for icons in crowded areas
  const densityBoost = Math.min(iconCount * 5, 25);
  
  // Hover state gets highest priority
  const hoverBoost = isHovering ? 200 : 0;
  
  // Critical overlaps get priority positioning
  const criticalBoost = overlapSeverity > 0.8 ? 100 : 0;
  
  return baseZIndex + typePriority + overlapBoost + densityBoost + hoverBoost + criticalBoost;
};

// Enhanced overlap detection using collision detection system
const detectAdvancedOverlap = (sourceNode: any, targetNode: any) => {
  // Try to use precise collision detection first
  const sourceGeometry = nodeToShapeGeometry(sourceNode as any);
  const targetGeometry = nodeToShapeGeometry(targetNode as any);
  
  if (sourceGeometry && targetGeometry) {
    const collision = detectCollision(sourceGeometry, targetGeometry, 5);
    
    return {
      isOverlapping: collision.isColliding,
      overlapSeverity: collision.collisionType === 'body-overlap' ? 1.0 : 
                      collision.collisionType === 'edge-contact' ? 0.8 :
                      collision.collisionType === 'near-proximity' ? 0.5 : 0.0,
      collisionType: collision.collisionType,
      distance: collision.distance,
      collisionPoints: collision.collisionPoints
    };
  } else {
    // Fallback to enhanced geometric calculation
    const sourceWidth = (sourceNode.data as any)?.width || DEFAULT_NODE_WIDTH;
    const sourceHeight = (sourceNode.data as any)?.height || DEFAULT_NODE_HEIGHT;
    const targetWidth = (targetNode.data as any)?.width || DEFAULT_NODE_WIDTH;
    const targetHeight = (targetNode.data as any)?.height || DEFAULT_NODE_HEIGHT;
    
    const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
    const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
    const targetCenterX = targetNode.position.x + targetWidth / 2;
    const targetCenterY = targetNode.position.y + targetHeight / 2;
    
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Enhanced overlap detection with better thresholds
    const maxNodeSize = Math.max(sourceWidth, sourceHeight, targetWidth, targetHeight);
    const criticalDistance = maxNodeSize * CRITICAL_OVERLAP_RATIO;
    const normalOverlapDistance = maxNodeSize * MIN_DISTANCE_MULTIPLIER;
    
    let overlapSeverity = 0;
    let collisionType: 'body-overlap' | 'edge-contact' | 'near-proximity' | 'separated' = 'separated';
    
    if (distance < criticalDistance) {
      overlapSeverity = 1.0 - (distance / criticalDistance);
      collisionType = distance < maxNodeSize * 0.5 ? 'body-overlap' : 'edge-contact';
    } else if (distance < normalOverlapDistance) {
      overlapSeverity = 0.3;
      collisionType = 'near-proximity';
    }
    
    return {
      isOverlapping: distance < normalOverlapDistance,
      overlapSeverity: Math.max(0, overlapSeverity),
      collisionType,
      distance,
      collisionPoints: []
    };
  }
};

// Compute the midpoint of the overlapping boundary when two polygon edges are collinear and overlap
// Falls back to the first detected intersection point when only a single edge contact exists
const getSharedBoundaryMidpoint = (
  sourceGeometry: ShapeGeometry | null,
  targetGeometry: ShapeGeometry | null,
  fallbackPoint?: { x: number; y: number }
): { x: number; y: number } | null => {
  if (!sourceGeometry || !targetGeometry) return null;

  // Helper to check near zero
  const nearlyZero = (n: number, eps = 1e-6) => Math.abs(n) < eps;

  // For each pair of edges, check for collinearity and overlapping segment
  for (const e1 of sourceGeometry.edges) {
    const v1x = e1.end.x - e1.start.x;
    const v1y = e1.end.y - e1.start.y;
    const v1len2 = v1x * v1x + v1y * v1y;
    if (nearlyZero(v1len2)) continue;

    for (const e2 of targetGeometry.edges) {
      const v2x = e2.end.x - e2.start.x;
      const v2y = e2.end.y - e2.start.y;

      // Check if edges are parallel: cross product ~ 0
      const cross = v1x * v2y - v1y * v2x;
      if (!nearlyZero(cross)) continue;

      // Check if they are on the same infinite line: (e2.start - e1.start) parallel to v1 (cross ~ 0)
      const sdx = e2.start.x - e1.start.x;
      const sdy = e2.start.y - e1.start.y;
      const crossStart = sdx * v1y - sdy * v1x;
      if (!nearlyZero(crossStart)) continue;

      // Project e2's endpoints onto e1 to find overlap interval in t-space [0,1]
      const dot = (ax: number, ay: number, bx: number, by: number) => ax * bx + ay * by;
      const t1 = dot(e2.start.x - e1.start.x, e2.start.y - e1.start.y, v1x, v1y) / v1len2;
      const t2 = dot(e2.end.x - e1.start.x, e2.end.y - e1.start.y, v1x, v1y) / v1len2;

      const tMin = Math.max(0, Math.min(t1, t2));
      const tMax = Math.min(1, Math.max(t1, t2));

      if (tMax >= tMin) {
        // There is an overlapping segment; take its midpoint
        const tMid = (tMin + tMax) / 2;
        return {
          x: e1.start.x + v1x * tMid,
          y: e1.start.y + v1y * tMid
        };
      }
    }
  }

  // Fallback to provided contact point if available
  return fallbackPoint || null;
};

// Enhanced positioning algorithm that considers edge connection points and provides better overlap handling
const calculateOptimalPosition = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  sourcePosition?: string,
  targetPosition?: string,
  existingIconPositions: { x: number; y: number }[] = []
) => {
  // Calculate center positions
  const sourceCenterX = sourceX + sourceWidth / 2;
  const sourceCenterY = sourceY + sourceHeight / 2;
  const targetCenterX = targetX + targetWidth / 2;
  const targetCenterY = targetY + targetHeight / 2;

  // Calculate connection points based on actual edge positions
  const getConnectionPoint = (nodeX: number, nodeY: number, nodeWidth: number, nodeHeight: number, position?: string) => {
    const centerX = nodeX + nodeWidth / 2;
    const centerY = nodeY + nodeHeight / 2;
    
    switch (position) {
      case 'top':
        return { x: centerX, y: nodeY };
      case 'bottom':
        return { x: centerX, y: nodeY + nodeHeight };
      case 'left':
        return { x: nodeX, y: centerY };
      case 'right':
        return { x: nodeX + nodeWidth, y: centerY };
      default:
        return { x: centerX, y: centerY };
    }
  };

  const sourceConnection = getConnectionPoint(sourceX, sourceY, sourceWidth, sourceHeight, sourcePosition);
  const targetConnection = getConnectionPoint(targetX, targetY, targetWidth, targetHeight, targetPosition);

  // Calculate midpoint between actual connection points
  const midX = (sourceConnection.x + targetConnection.x) / 2;
  const midY = (sourceConnection.y + targetConnection.y) / 2;

  // Calculate distance between nodes
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Enhanced overlap detection
  const combinedSize = Math.max(sourceWidth + targetWidth, sourceHeight + targetHeight) / 2;
  const isCriticalOverlap = distance < combinedSize * MIN_DISTANCE_MULTIPLIER * 0.6;
  const isOverlapping = distance < combinedSize * MIN_DISTANCE_MULTIPLIER;

  let finalX = midX;
  let finalY = midY;

  if (isCriticalOverlap || isOverlapping) {
    // Determine optimal positioning strategy based on node layout
    const maxNodeSize = Math.max(sourceWidth, sourceHeight, targetWidth, targetHeight);
    const baseOffset = maxNodeSize * (isCriticalOverlap ? CRITICAL_OVERLAP_RATIO : OVERLAP_OFFSET_RATIO);
    
    // Try multiple positioning strategies
    const strategies = [
      // Primary: perpendicular to connection line
      { 
        x: midX + dy / distance * baseOffset * (dy !== 0 ? Math.sign(dy) : 1), 
        y: midY - dx / distance * baseOffset * (dx !== 0 ? Math.sign(dx) : 1) 
      },
      // Secondary: opposite perpendicular
      { 
        x: midX - dy / distance * baseOffset * (dy !== 0 ? Math.sign(dy) : 1), 
        y: midY + dx / distance * baseOffset * (dx !== 0 ? Math.sign(dx) : 1) 
      },
      // Tertiary: along connection line
      { 
        x: midX + (distance > 0 ? dx / distance : 1) * baseOffset * 0.7, 
        y: midY + (distance > 0 ? dy / distance : 0) * baseOffset * 0.7 
      },
      // Quaternary: opposite along connection line
      { 
        x: midX - (distance > 0 ? dx / distance : 1) * baseOffset * 0.7, 
        y: midY - (distance > 0 ? dy / distance : 0) * baseOffset * 0.7 
      }
    ];

    // Handle case where nodes are exactly on top of each other
    if (distance === 0) {
      strategies.push(
        { x: midX + baseOffset, y: midY },
        { x: midX - baseOffset, y: midY },
        { x: midX, y: midY + baseOffset },
        { x: midX, y: midY - baseOffset }
      );
    }

    // Find the best position that avoids collisions with existing icons
    let bestPosition = strategies[0];
    let maxMinDistance = -1;

    for (const strategy of strategies) {
      let minDistanceToExisting = Infinity;
      
      for (const existing of existingIconPositions) {
        const distToExisting = Math.sqrt(
          Math.pow(strategy.x - existing.x, 2) + Math.pow(strategy.y - existing.y, 2)
        );
        minDistanceToExisting = Math.min(minDistanceToExisting, distToExisting);
      }
      
      // Prefer positions that are farther from existing icons
      if (existingIconPositions.length === 0 || minDistanceToExisting > maxMinDistance) {
        maxMinDistance = minDistanceToExisting;
        bestPosition = strategy;
      }
      
      // If we found a position with sufficient spacing, use it
      if (minDistanceToExisting >= ICON_COLLISION_RADIUS) {
        bestPosition = strategy;
        break;
      }
    }

    finalX = bestPosition.x;
    finalY = bestPosition.y;
  }

  // Ensure the position is not inside either node
  const distanceToSource = Math.sqrt(Math.pow(finalX - sourceCenterX, 2) + Math.pow(finalY - sourceCenterY, 2));
  const distanceToTarget = Math.sqrt(Math.pow(finalX - targetCenterX, 2) + Math.pow(finalY - targetCenterY, 2));
  
  const minDistanceFromSource = Math.max(sourceWidth, sourceHeight) / 2 + 20;
  const minDistanceFromTarget = Math.max(targetWidth, targetHeight) / 2 + 20;
  
  if (distanceToSource < minDistanceFromSource || distanceToTarget < minDistanceFromTarget) {
    // Push the icon further out if it's too close to either node
    const pushDirection = distanceToSource < distanceToTarget ? 
      { x: finalX - sourceCenterX, y: finalY - sourceCenterY } :
      { x: finalX - targetCenterX, y: finalY - targetCenterY };
    
    const pushLength = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.y * pushDirection.y);
    if (pushLength > 0) {
      const pushUnit = { x: pushDirection.x / pushLength, y: pushDirection.y / pushLength };
      const requiredDistance = Math.max(minDistanceFromSource, minDistanceFromTarget);
      finalX = (distanceToSource < distanceToTarget ? sourceCenterX : targetCenterX) + pushUnit.x * requiredDistance;
      finalY = (distanceToSource < distanceToTarget ? sourceCenterY : targetCenterY) + pushUnit.y * requiredDistance;
    }
  }

  return {
    x: finalX,
    y: finalY,
    isOverlapping: isOverlapping,
    isCriticalOverlap: isCriticalOverlap
  };
};

const GuidedModeEdge: React.FC<GuidedModeEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  source,
  target,
}) => {
  // All hooks must be called unconditionally at the top
  // Get node information and existing guided edges from store
  const { sourceNode, targetNode, existingGuidedIcons } = useStore((state: ReactFlowState) => {
    const nodes = state.getNodes();
    const edges = Array.from(state.edges.values());
    
    // Find existing guided mode edges to avoid icon collisions
    const guidedEdges = edges.filter((edge: any) => 
      edge.data?.mode === 'guided' && edge.id !== id
    );
    
    return {
      sourceNode: nodes.find((n: any) => n.id === source),
      targetNode: nodes.find((n: any) => n.id === target),
      existingGuidedIcons: guidedEdges.map((edge: any) => {
        const sourceN = nodes.find((n: any) => n.id === edge.source);
        const targetN = nodes.find((n: any) => n.id === edge.target);
        if (sourceN && targetN) {
          // Calculate where this edge's icon would be positioned (simplified)
          const srcCenterX = sourceN.position.x + (sourceN.data?.width || DEFAULT_NODE_WIDTH) / 2;
          const srcCenterY = sourceN.position.y + (sourceN.data?.height || DEFAULT_NODE_HEIGHT) / 2;
          const tgtCenterX = targetN.position.x + (targetN.data?.width || DEFAULT_NODE_WIDTH) / 2;
          const tgtCenterY = targetN.position.y + (targetN.data?.height || DEFAULT_NODE_HEIGHT) / 2;
          return {
            x: (srcCenterX + tgtCenterX) / 2,
            y: (srcCenterY + tgtCenterY) / 2
          };
        }
        return null;
      }).filter(Boolean) as { x: number; y: number }[]
    };
  });

  // Animation control with proper cleanup
  const pulseRef = useRef<HTMLDivElement>(null);
  const warningRef = useRef<HTMLDivElement>(null);

  // Always call useEffect, but conditionally clean up
  useEffect(() => {
    const pulseElement = pulseRef.current;
    const warningElement = warningRef.current;

    // Cleanup function to remove animation classes
    return () => {
      if (pulseElement) {
        pulseElement.classList.remove('guided-edge-pulse');
      }
      if (warningElement) {
        warningElement.classList.remove('guided-edge-warning');
      }
    };
  }, [data?.relationshipType]); // Re-run when relationship type changes

  // Enhanced position calculation with advanced collision detection and multi-icon management
  const positionData = useMemo(() => {
    // Handle missing nodes or data within the memoization
    if (!sourceNode || !targetNode) {
      return { x: 0, y: 0, isOverlapping: false, overlapSeverity: 0, collisionType: 'separated', dynamicZIndex: GUIDED_EDGE_Z_INDEX };
    }

    // Use advanced overlap detection
    const overlapData = detectAdvancedOverlap(sourceNode, targetNode);
    
    // Calculate dynamic z-index based on overlap and relationship priority
    const dynamicZIndex = calculateDynamicZIndex(
      data?.relationshipType || 'ADJACENT_TO',
      overlapData.overlapSeverity,
      existingGuidedIcons.length
    );

    const sourceWidth = sourceNode.data?.width || DEFAULT_NODE_WIDTH;
    const sourceHeight = sourceNode.data?.height || DEFAULT_NODE_HEIGHT;
    const targetWidth = targetNode.data?.width || DEFAULT_NODE_WIDTH;
    const targetHeight = targetNode.data?.height || DEFAULT_NODE_HEIGHT;

    let basePosition = calculateOptimalPosition(
      sourceNode.position.x,
      sourceNode.position.y,
      targetNode.position.x,
      targetNode.position.y,
      sourceWidth,
      sourceHeight,
      targetWidth,
      targetHeight,
      sourcePosition,
      targetPosition,
      existingGuidedIcons
    );

    // If the nodes share an edge (edge alignment/contact), place the icon on the shared boundary midpoint
    if (overlapData.collisionType === 'edge-alignment' || overlapData.collisionType === 'edge-contact') {
      const sGeom = nodeToShapeGeometry(sourceNode as any);
      const tGeom = nodeToShapeGeometry(targetNode as any);
      const fallback = overlapData.collisionPoints && overlapData.collisionPoints.length > 0
        ? overlapData.collisionPoints[0]
        : undefined;
      const sharedMid = getSharedBoundaryMidpoint(sGeom, tGeom, fallback);
      if (sharedMid) {
        basePosition = {
          ...basePosition,
          x: sharedMid.x,
          y: sharedMid.y
        };
      }
    }

    return {
      ...basePosition,
      ...overlapData,
      dynamicZIndex
    };
  }, [sourceNode, targetNode, sourcePosition, targetPosition, existingGuidedIcons, data?.relationshipType]);

  // Enhanced error handling with logging
  if (!data || !sourceNode || !targetNode) {
    console.warn('GuidedModeEdge: Missing required data', { 
      id, 
      source, 
      target, 
      hasData: !!data, 
      hasSourceNode: !!sourceNode, 
      hasTargetNode: !!targetNode 
    });
    return null;
  }

  // Debug logging for positioning (remove in production)
  if (positionData.overlapSeverity > 0) {
    console.log(`GuidedModeEdge ${id}: Overlap detected`, {
      relationshipType: data.relationshipType,
      overlapSeverity: positionData.overlapSeverity,
      position: { x: positionData.x, y: positionData.y },
      existingIcons: existingGuidedIcons.length
    });
  }

  // Validate relationship type
  if (!data.relationshipType) {
    console.warn('GuidedModeEdge: Missing relationship type', { id, data });
    return null;
  }

  const relationshipType = data.relationshipType;
  const isDirectional = data.flowDirection === 'unidirectional';
  const isBidirectional = data.flowDirection === 'bidirectional';
  const color = getRelationshipColor(relationshipType);
  const label = getRelationshipLabel(relationshipType);

  // Enhanced styling with modern pharmaceutical design system
  const chipStyle = {
    backgroundColor: color,
    color: 'white',
    fontWeight: GUIDED_FONT_WEIGHT,
    fontSize: GUIDED_FONT_SIZE,
    height: `${GUIDED_CHIP_HEIGHT}px`,
    minWidth: `${GUIDED_CHIP_MIN_WIDTH}px`,
    // Dynamic styling based on overlap severity
    boxShadow: positionData.overlapSeverity > 0.8 ? GUIDED_BOX_SHADOW_HOVER : 
               positionData.overlapSeverity > 0.3 ? '0 4px 16px rgba(0,0,0,0.3)' : GUIDED_BOX_SHADOW,
    border: `${GUIDED_BORDER_WIDTH}px solid rgba(255,255,255,${positionData.overlapSeverity > 0.5 ? 1 : 0.9})`,
    // Use dynamic z-index calculated from overlap and relationship priority
    zIndex: positionData.dynamicZIndex,
    position: 'absolute' as const,
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    borderRadius: `${GUIDED_BORDER_RADIUS}px`,
    backdropFilter: 'blur(8px)', // Modern glass effect
    WebkitBackdropFilter: 'blur(8px)', // Safari support
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transitions
    // Enhanced visibility for overlapped icons - critical overlaps get full opacity
    opacity: positionData.overlapSeverity > 0.8 ? 1 : 
             positionData.overlapSeverity > 0.3 ? 0.98 : 0.95,
    // Add subtle glow effect for severe overlaps to increase visibility
    filter: positionData.overlapSeverity > 0.7 ? 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' : 'none',
    '&:hover': {
      boxShadow: GUIDED_BOX_SHADOW_HOVER,
      transform: `translate(-50%, -50%) scale(${GUIDED_MODE_SCALE_HOVER})`,
      zIndex: positionData.dynamicZIndex + 200, // Boost z-index on hover
      opacity: 1
    }
  };

  // Add directional indicators for flow relationships
  const getDirectionalIndicator = () => {
    if (relationshipType === 'MATERIAL_FLOW' || relationshipType === 'PERSONNEL_FLOW') {
      if (isBidirectional) {
        return <CompareArrows sx={{ fontSize: '16px', ml: 0.5 }} />;
      } else if (isDirectional) {
        return <ArrowForward sx={{ fontSize: '16px', ml: 0.5 }} />;
      }
    }
    return null;
  };

  // Enhanced tooltip content for pharmaceutical context
  const getTooltipContent = () => {
    const flowInfo = data.flowDirection ? ` (${data.flowDirection})` : '';
    const reason = data.reason ? `\nReason: ${data.reason}` : '';
    const distance = data.minDistance && data.maxDistance 
      ? `\nDistance: ${data.minDistance}m - ${data.maxDistance}m` 
      : data.minDistance 
        ? `\nMin distance: ${data.minDistance}m`
        : data.maxDistance 
          ? `\nMax distance: ${data.maxDistance}m`
          : '';
    
    return `${label}${flowInfo}${reason}${distance}`;
  };

  return (
    <EdgeLabelRenderer>
      <Tooltip 
        title={getTooltipContent()}
        placement="top"
        arrow
        enterDelay={500}
        leaveDelay={200}
        slotProps={{
          tooltip: {
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              fontSize: '12px',
              maxWidth: '300px',
              whiteSpace: 'pre-line'
            }
          },
          arrow: {
            sx: { color: 'rgba(0, 0, 0, 0.9)' }
          }
        }}
      >
        <Box
        sx={chipStyle}
        className={`guided-edge-hover ${
          positionData.overlapSeverity > 0.8 ? 'guided-edge-critical-overlap' : 
          positionData.overlapSeverity > 0 ? 'guided-edge-overlap' : ''
        }`}
        style={{
          left: positionData.x,
          top: positionData.y,
        }}
        role="button"
        tabIndex={0}
        aria-label={`${label} relationship between ${sourceNode.data?.name || 'source node'} and ${targetNode.data?.name || 'target node'} in pharmaceutical facility design`}
        aria-describedby={`edge-tooltip-${id}`}
        onClick={(e) => {
          e.preventDefault();
          console.log('Clicked relationship:', relationshipType, id);
          // TODO: Add proper click handler for relationship editing/viewing
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            console.log('Keyboard activated relationship:', relationshipType, id);
            // TODO: Add proper keyboard handler
          }
        }}
        onFocus={(e) => {
          e.currentTarget.classList.add('guided-edge-focus');
        }}
        onBlur={(e) => {
          e.currentTarget.classList.remove('guided-edge-focus');
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            px: 1.5,
            py: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mr: '6px' }}>
            {getRelationshipIcon(relationshipType, isDirectional)}
          </Box>
          <Box 
            component="span" 
            sx={{ 
              fontSize: GUIDED_FONT_SIZE, 
              fontWeight: GUIDED_FONT_WEIGHT,
              letterSpacing: '0.5px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {label}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
            {getDirectionalIndicator()}
          </Box>
        </Box>
        
        {/* Add a controlled pulse animation for active flows */}
        {(relationshipType === 'MATERIAL_FLOW' || relationshipType === 'PERSONNEL_FLOW') && (
          <Box
            ref={pulseRef}
            className="guided-edge-pulse"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 'inherit',
              background: `linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)`,
              pointerEvents: 'none' // Don't interfere with clicks
            }}
          />
        )}

        {/* Warning indicator for prohibited relationships */}
        {relationshipType === 'PROHIBITED_NEAR' && (
          <Box
            ref={warningRef}
            className="guided-edge-warning"
            sx={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              backgroundColor: '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: '#d32f2f',
              fontWeight: 'bold',
              pointerEvents: 'none' // Don't interfere with clicks
            }}
            aria-label="Warning: Prohibited relationship"
          >
            !
          </Box>
        )}
        </Box>
      </Tooltip>
    </EdgeLabelRenderer>
  );
};

export default GuidedModeEdge;