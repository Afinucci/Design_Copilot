import { useCallback, useEffect, useState, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { PERFORMANCE_CONSTANTS } from '../utils/performance';
import { getAutoConnectors } from '../services/connectorLogic';
import { 
  detectEdgeProximity, 
  calculateRepulsionForce, 
  calculateAttractionForce,
  findAllEdgeProximities 
} from '../services/edgeDetection';

interface SnapPoint {
  x: number;
  y: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  nodeId: string;
}

interface UseSnapToGridProps {
  nodes: Node[];
  edges: Edge[];
  gridSize?: number;
  snapDistance?: number;
  onSnapConnection?: (sourceId: string, targetId: string, snapSide: string) => void;
  // When true, adjacency relationships should not be visualized as edges,
  // but overlapping is allowed only if ADJACENT_TO is valid between nodes
  guidedNoAdjacencyEdges?: boolean;
  // Functions to check adjacency rules in guided mode
  canNodesBeAdjacent?: (nodeId1: string, nodeId2: string) => boolean;
  areNodesProhibited?: (nodeId1: string, nodeId2: string) => boolean;
}

export const useSnapToGrid = ({
  nodes,
  edges,
  gridSize = PERFORMANCE_CONSTANTS.GRID_SIZE,
  snapDistance = PERFORMANCE_CONSTANTS.SNAP_DISTANCE,
  onSnapConnection,
  guidedNoAdjacencyEdges = false,
  canNodesBeAdjacent,
  areNodesProhibited,
}: UseSnapToGridProps) => {
  const [snapGuides, setSnapGuides] = useState<SnapPoint[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  
  // Ref to track mount status for cleanup
  const mountedRef = useRef(true);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Calculate snap points for all nodes
  const calculateSnapPoints = useCallback((excludeNodeId?: string) => {
    const points: SnapPoint[] = [];
    
    nodes.forEach((node) => {
      if (node.id === excludeNodeId) return;
      
      const nodeWidth = node.data?.width || 120;
      const nodeHeight = node.data?.height || 80;
      
      // Top side
      points.push({
        x: node.position.x + nodeWidth / 2,
        y: node.position.y,
        side: 'top',
        nodeId: node.id,
      });
      
      // Bottom side
      points.push({
        x: node.position.x + nodeWidth / 2,
        y: node.position.y + nodeHeight,
        side: 'bottom',
        nodeId: node.id,
      });
      
      // Left side
      points.push({
        x: node.position.x,
        y: node.position.y + nodeHeight / 2,
        side: 'left',
        nodeId: node.id,
      });
      
      // Right side
      points.push({
        x: node.position.x + nodeWidth,
        y: node.position.y + nodeHeight / 2,
        side: 'right',
        nodeId: node.id,
      });
    });
    
    return points;
  }, [nodes]);

  // Snap position to grid
  const snapToGrid = useCallback((position: { x: number; y: number }) => {
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  }, [gridSize]);

  // Find nearby snap points
  const findNearbySnapPoints = useCallback(
    (position: { x: number; y: number }, nodeWidth: number, nodeHeight: number, nodeId: string) => {
      const snapPoints = calculateSnapPoints(nodeId);
      const nearbyPoints: SnapPoint[] = [];
      
      // Check each side of the dragged node
      const nodeSides = [
        { x: position.x + nodeWidth / 2, y: position.y, side: 'top' as const },
        { x: position.x + nodeWidth / 2, y: position.y + nodeHeight, side: 'bottom' as const },
        { x: position.x, y: position.y + nodeHeight / 2, side: 'left' as const },
        { x: position.x + nodeWidth, y: position.y + nodeHeight / 2, side: 'right' as const },
      ];
      
      nodeSides.forEach((nodeSide) => {
        snapPoints.forEach((snapPoint) => {
          const distance = Math.sqrt(
            Math.pow(nodeSide.x - snapPoint.x, 2) + Math.pow(nodeSide.y - snapPoint.y, 2)
          );
          
          if (distance < snapDistance) {
            // Check if sides are compatible for snapping
            const compatible = isSnapCompatible(nodeSide.side, snapPoint.side);
            if (compatible) {
              nearbyPoints.push(snapPoint);
            }
          }
        });
      });
      
      return nearbyPoints;
    },
    [calculateSnapPoints, snapDistance]
  );

  // Check if two sides are compatible for snapping
  const isSnapCompatible = (side1: string, side2: string): boolean => {
    const opposites: Record<string, string> = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left',
    };
    
    return opposites[side1] === side2;
  };

  // Calculate snapped position based on nearby snap points and edge validation
  const getSnappedPosition = useCallback(
    (position: { x: number; y: number }, nodeWidth: number, nodeHeight: number, nodeId: string) => {
      // First check for edge proximity using our new edge detection
      const draggedNode = nodes.find(n => n.id === nodeId);
      if (draggedNode) {
        // Create a temporary node with the new position for edge detection
        const tempNode = { ...draggedNode, position };
        const edgeProximities = findAllEdgeProximities(tempNode, nodes, snapDistance);
        
        // Apply forces based on edge validation
        let forceAdjustment = { x: 0, y: 0 };
        
        for (const proximity of edgeProximities) {
          if (!proximity.isWithinThreshold) continue;
          
          const targetNode = nodes.find(n => n.id === proximity.targetNodeId);
          if (!targetNode) continue;
          
          // Check relationship type using provided functions or connector logic
          let relationshipType: 'ADJACENT_TO' | 'PROHIBITED_NEAR' | 'UNDEFINED' = 'UNDEFINED';
          
          if (canNodesBeAdjacent && areNodesProhibited) {
            const hasAdjacency = canNodesBeAdjacent(nodeId, proximity.targetNodeId);
            const isProhibited = areNodesProhibited(nodeId, proximity.targetNodeId);
            
            if (hasAdjacency) relationshipType = 'ADJACENT_TO';
            else if (isProhibited) relationshipType = 'PROHIBITED_NEAR';
          } else {
            // Fallback to connector logic
            const movingCategory = draggedNode?.data?.category;
            const targetCategory = targetNode?.data?.category;
            
            if (movingCategory && targetCategory) {
              const auto = getAutoConnectors(movingCategory, targetCategory);
              if (auto.relationships.some((r) => r.type === 'ADJACENT_TO')) {
                relationshipType = 'ADJACENT_TO';
              } else if (auto.relationships.some((r) => r.type === 'PROHIBITED_NEAR')) {
                relationshipType = 'PROHIBITED_NEAR';
              }
            }
          }
          
          // Apply forces based on relationship
          if (relationshipType === 'ADJACENT_TO' && proximity.canSuperimpose) {
            // Apply magnetic attraction
            const attractionForce = calculateAttractionForce(proximity);
            forceAdjustment.x += attractionForce.x;
            forceAdjustment.y += attractionForce.y;
          } else if (relationshipType === 'PROHIBITED_NEAR') {
            // Apply repulsion force
            const repulsionForce = calculateRepulsionForce(proximity);
            forceAdjustment.x += repulsionForce.x;
            forceAdjustment.y += repulsionForce.y;
          }
        }
        
        // Apply force adjustments to position
        position = {
          x: position.x + forceAdjustment.x,
          y: position.y + forceAdjustment.y
        };
      }
      
      // Continue with original snap point logic
      const nearbyPoints = findNearbySnapPoints(position, nodeWidth, nodeHeight, nodeId);
      
      if (nearbyPoints.length === 0) {
        return snapToGrid(position);
      }
      
      // Find the closest snap point
      let closestPoint: SnapPoint | null = null;
      let minDistance = Infinity;
      let draggedSide: string | null = null;
      
      const nodeSides = [
        { x: position.x + nodeWidth / 2, y: position.y, side: 'top' },
        { x: position.x + nodeWidth / 2, y: position.y + nodeHeight, side: 'bottom' },
        { x: position.x, y: position.y + nodeHeight / 2, side: 'left' },
        { x: position.x + nodeWidth, y: position.y + nodeHeight / 2, side: 'right' },
      ];
      
      nearbyPoints.forEach((snapPoint) => {
        nodeSides.forEach((nodeSide) => {
          if (isSnapCompatible(nodeSide.side, snapPoint.side)) {
            const distance = Math.sqrt(
              Math.pow(nodeSide.x - snapPoint.x, 2) + Math.pow(nodeSide.y - snapPoint.y, 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              closestPoint = snapPoint;
              draggedSide = nodeSide.side;
            }
          }
        });
      });
      
      if (!closestPoint || !draggedSide) {
        return snapToGrid(position);
      }
      
      // Type assertion since we know closestPoint is not null here
      const snapPoint = closestPoint as SnapPoint;
      
      // Calculate snapped position based on the closest point
      let snappedPosition = { ...position };
      let spacing: number = PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING; // default gap between snapped nodes

      // Enhanced spacing logic with edge validation
      if (guidedNoAdjacencyEdges) {
        try {
          // Check for edge proximity between these specific nodes
          const sourceNode = nodes.find(n => n.id === nodeId);
          const targetNode = nodes.find(n => n.id === snapPoint.nodeId);
          
          if (sourceNode && targetNode) {
            const edgeProximities = detectEdgeProximity(sourceNode, targetNode, snapDistance);
            
            if (edgeProximities.length > 0) {
              // Use provided adjacency functions if available
              if (canNodesBeAdjacent && areNodesProhibited) {
                const hasAdjacency = canNodesBeAdjacent(nodeId, snapPoint.nodeId);
                const isProhibited = areNodesProhibited(nodeId, snapPoint.nodeId);
                const nonAdjacentBuffer = Math.max(PERFORMANCE_CONSTANTS.NON_ADJACENT_BUFFER, PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING);

                if (hasAdjacency && !isProhibited) {
                  // Only allow zero spacing when edges are compatible and aligned (edge-touch)
                  // With rectangle sides and compatible sides, snapping math ensures alignment
                  spacing = 0;
                } else if (isProhibited) {
                  // Enforce a larger fixed buffer for prohibited relationships
                  spacing = Math.max(nonAdjacentBuffer, PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING * 2);
                } else {
                  // Undefined relationship: enforce fixed non-adjacent buffer
                  spacing = nonAdjacentBuffer;
                }
              } else {
                // Fallback to connector logic
                const movingCategory = sourceNode?.data?.category;
                const targetCategory = targetNode?.data?.category;

                if (movingCategory && targetCategory) {
                  const auto = getAutoConnectors(movingCategory, targetCategory);
                  const hasAdjacency = auto.relationships.some((r) => r.type === 'ADJACENT_TO');
                  const isProhibited = auto.relationships.some((r) => r.type === 'PROHIBITED_NEAR');
                  const nonAdjacentBuffer = Math.max(PERFORMANCE_CONSTANTS.NON_ADJACENT_BUFFER, PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING);

                  if (hasAdjacency && !isProhibited) {
                    spacing = 0;
                  } else if (isProhibited) {
                    spacing = Math.max(nonAdjacentBuffer, PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING * 2);
                  } else {
                    spacing = nonAdjacentBuffer;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Fallback to default spacing on errors
          spacing = Math.max(PERFORMANCE_CONSTANTS.NON_ADJACENT_BUFFER, PERFORMANCE_CONSTANTS.MINIMUM_NODE_SPACING);
        }
      }
      
      switch (draggedSide) {
        case 'top':
          snappedPosition.y = snapPoint.y + spacing;
          snappedPosition.x = snapPoint.x - nodeWidth / 2;
          break;
        case 'bottom':
          snappedPosition.y = snapPoint.y - nodeHeight - spacing;
          snappedPosition.x = snapPoint.x - nodeWidth / 2;
          break;
        case 'left':
          snappedPosition.x = snapPoint.x + spacing;
          snappedPosition.y = snapPoint.y - nodeHeight / 2;
          break;
        case 'right':
          snappedPosition.x = snapPoint.x - nodeWidth - spacing;
          snappedPosition.y = snapPoint.y - nodeHeight / 2;
          break;
      }
      
      // Trigger snap connection callback
      if (onSnapConnection && minDistance < snapDistance / 2) {
        onSnapConnection(nodeId, snapPoint.nodeId, draggedSide);
      }
      
      return snapToGrid(snappedPosition);
    },
    [findNearbySnapPoints, snapToGrid, snapDistance, onSnapConnection, guidedNoAdjacencyEdges, nodes, canNodesBeAdjacent, areNodesProhibited, isSnapCompatible]
  );

  // Handle node drag start
  const handleNodeDragStart = useCallback((nodeId: string) => {
    console.log('🎯 useSnapToGrid: Drag started for node:', nodeId);
    if (mountedRef.current) {
      setIsDragging(true);
      setDraggedNodeId(nodeId);
      setSnapGuides(calculateSnapPoints(nodeId));
    }
  }, [calculateSnapPoints]);

  // Handle node drag
  const handleNodeDrag = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !mountedRef.current) return position;
      
      const nodeWidth = node.data?.width || 120;
      const nodeHeight = node.data?.height || 80;
      
      return getSnappedPosition(position, nodeWidth, nodeHeight, nodeId);
    },
    [nodes, getSnappedPosition]
  );

  // Handle node drag stop
  const handleNodeDragStop = useCallback(() => {
    console.log('🎯 useSnapToGrid: Drag stopped');
    if (mountedRef.current) {
      setIsDragging(false);
      setDraggedNodeId(null);
      setSnapGuides([]);
    }
  }, []);

  // Get visual guides for rendering
  const getVisualGuides = useCallback(() => {
    if (!isDragging || !draggedNodeId) return [];
    
    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    if (!draggedNode) return [];
    
    const nodeWidth = draggedNode.data?.width || 120;
    const nodeHeight = draggedNode.data?.height || 80;
    const nearbyPoints = findNearbySnapPoints(
      draggedNode.position,
      nodeWidth,
      nodeHeight,
      draggedNodeId
    );
    
    return nearbyPoints.map((point) => ({
      ...point,
      isActive: true,
    }));
  }, [isDragging, draggedNodeId, nodes, findNearbySnapPoints]);

  return {
    snapToGrid,
    getSnappedPosition,
    handleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop,
    getVisualGuides,
    isDragging,
    draggedNodeId,
  };
};