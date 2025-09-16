import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Node } from 'reactflow';
import { apiService } from '../services/api';
import { CustomShapeData } from '../types';
import { 
  nodeToShapeGeometry, 
  SpatialIndex, 
  findCollisions, 
  detectCollision,
  ShapeGeometry
} from '../utils/shapeCollision';

export interface PhysicalConstraintResult {
  canPlace: boolean;
  blockedBy: string[];
  lastValidPosition?: { x: number; y: number };
  constrainedPosition?: { x: number; y: number };
  reason?: string;
}

export interface AdjacencyCache {
  [key: string]: {
    canBeAdjacent: boolean;
    relationshipType?: string;
    reason: string;
    timestamp: number;
  };
}

export interface UsePhysicalConstraintsOptions {
  enabled: boolean;
  mode: 'creation' | 'guided';
  touchTolerance?: number;
  cacheExpiryMs?: number;
}

/**
 * Enhanced hook for physical constraint enforcement during drag operations
 * Provides real-time, synchronous collision detection with position caching
 */
export function usePhysicalConstraints(
  nodes: Node[],
  options: UsePhysicalConstraintsOptions
) {
  const {
    enabled,
    mode,
    touchTolerance = 2,
    cacheExpiryMs = 30000 // 30 seconds cache expiry
  } = options;

  const [spatialIndex] = useState(() => new SpatialIndex(50));
  const [adjacencyCache, setAdjacencyCache] = useState<AdjacencyCache>({});
  const [lastValidPositions, setLastValidPositions] = useState<Record<string, { x: number; y: number }>>({});
  const validationInProgressRef = useRef<Set<string>>(new Set());

  // Convert nodes to shape geometries for collision detection
  const shapeGeometries = useMemo(() => {
    const geometries: ShapeGeometry[] = [];
    
    for (const node of nodes) {
      const geometry = nodeToShapeGeometry(node);
      if (geometry) {
        geometries.push(geometry);
      }
    }
    
    return geometries;
  }, [nodes]);

  // Update spatial index when shapes change
  useEffect(() => {
    spatialIndex.clear();
    shapeGeometries.forEach(geometry => spatialIndex.add(geometry));
  }, [shapeGeometries, spatialIndex]);

  // Store valid positions as nodes are placed
  useEffect(() => {
    const validPositions: Record<string, { x: number; y: number }> = {};
    
    nodes.forEach(node => {
      if (node.type === 'customShape' && node.position) {
        validPositions[node.id] = { ...node.position };
      }
    });
    
    setLastValidPositions(prev => ({
      ...prev,
      ...validPositions
    }));
  }, [nodes]);

  /**
   * Get cached adjacency result or fetch from backend
   */
  const getCachedAdjacency = useCallback(async (
    nodeId1: string,
    nodeId2: string
  ): Promise<{ canBeAdjacent: boolean; relationshipType?: string; reason: string }> => {
    const cacheKey = `${nodeId1}:${nodeId2}`;
    const reverseCacheKey = `${nodeId2}:${nodeId1}`;
    const now = Date.now();

    // Check cache for either direction
    const cached = adjacencyCache[cacheKey] || adjacencyCache[reverseCacheKey];
    if (cached && (now - cached.timestamp) < cacheExpiryMs) {
      return {
        canBeAdjacent: cached.canBeAdjacent,
        relationshipType: cached.relationshipType,
        reason: cached.reason
      };
    }

    try {
      const result = await apiService.checkAdjacency(nodeId1, nodeId2);
      
      // Cache the result
      const cacheEntry = {
        canBeAdjacent: result.canBeAdjacent,
        relationshipType: result.relationshipType,
        reason: result.reason,
        timestamp: now
      };

      setAdjacencyCache(prev => ({
        ...prev,
        [cacheKey]: cacheEntry
      }));

      return {
        canBeAdjacent: result.canBeAdjacent,
        relationshipType: result.relationshipType,
        reason: result.reason
      };
    } catch (error) {
      console.error('Error checking adjacency:', error);
      return {
        canBeAdjacent: false,
        reason: 'Error checking adjacency - blocked for safety'
      };
    }
  }, [adjacencyCache, cacheExpiryMs]);

  /**
   * Synchronously check if a position would cause collision violations
   * This is the main constraint enforcement function
   */
  const checkPositionConstraints = useCallback(async (
    shapeId: string,
    position: { x: number; y: number }
  ): Promise<PhysicalConstraintResult> => {
    // If not enabled or in creation mode, allow all positions
    if (!enabled || mode === 'creation') {
      return { canPlace: true, blockedBy: [] };
    }

    const targetNode = nodes.find(n => n.id === shapeId);
    if (!targetNode || targetNode.type !== 'customShape') {
      return { canPlace: true, blockedBy: [] };
    }

    const targetData = targetNode.data as CustomShapeData;
    
    // If shape has no Neo4j assignment, allow placement
    if (!targetData.assignedNodeId) {
      return { canPlace: true, blockedBy: [] };
    }

    // Create temporary geometry at the new position
    const tempNode = { ...targetNode, position };
    const tempGeometry = nodeToShapeGeometry(tempNode);
    
    if (!tempGeometry) {
      return { canPlace: true, blockedBy: [] };
    }

    // Find nearby shapes using spatial index
    const nearbyGeometries = spatialIndex.findNearbyShapes(tempGeometry);
    const blockedBy: string[] = [];
    const violationReasons: string[] = [];

    // Check each nearby shape for collision and adjacency rules
    const collisionChecks = await Promise.all(
      nearbyGeometries.map(async (nearbyGeometry) => {
        const nearbyNode = nodes.find(n => n.id === nearbyGeometry.id);
        if (!nearbyNode || nearbyNode.id === shapeId) return { allowed: true, nodeId: nearbyGeometry.id };

        const nearbyData = nearbyNode.data as CustomShapeData;
        
        // Perform detailed collision detection
        const collision = detectCollision(tempGeometry, nearbyGeometry, touchTolerance);
        
        // If no collision or sufficient separation, allow
        if (!collision.isColliding && collision.collisionType === 'separated') {
          return { allowed: true, nodeId: nearbyGeometry.id };
        }

        // Check adjacency relationship if both nodes have assignments
        let canBeAdjacent = false;
        let relationshipReason = 'No relationship defined';
        
        if (targetData.assignedNodeId && nearbyData.assignedNodeId) {
          const adjacency = await getCachedAdjacency(
            targetData.assignedNodeId,
            nearbyData.assignedNodeId
          );
          canBeAdjacent = adjacency.canBeAdjacent;
          relationshipReason = adjacency.reason || 'No relationship defined';
        }

        // Apply rules based on collision type and adjacency
        let allowed = false;
        let reason = '';

        switch (collision.collisionType) {
          case 'body-overlap':
            // Never allow body overlap
            allowed = false;
            reason = 'Shape bodies cannot overlap';
            break;
            
          case 'edge-alignment':
          case 'edge-contact':
            // Only allow edge contact if shapes can be adjacent
            if (canBeAdjacent) {
              allowed = true;
              reason = 'Edge-to-edge contact allowed for adjacent shapes';
            } else {
              allowed = false;
              reason = `Edge contact not allowed: ${relationshipReason}`;
            }
            break;
            
          case 'near-proximity':
            // Check minimum separation for non-adjacent shapes
            if (!canBeAdjacent && collision.distance < 10) {
              allowed = false;
              reason = `Minimum separation (10px) required for non-adjacent shapes`;
            } else {
              allowed = true;
            }
            break;
            
          case 'separated':
            // Sufficient separation, always allow
            allowed = true;
            break;
            
          default:
            allowed = true;
        }

        return {
          allowed,
          nodeId: nearbyGeometry.id,
          reason,
          collisionType: collision.collisionType,
          distance: collision.distance
        };
      })
    );

    // Collect blocked shapes and reasons
    collisionChecks.forEach(check => {
      if (!check.allowed) {
        blockedBy.push(check.nodeId);
        if (check.reason) {
          violationReasons.push(check.reason);
        }
      }
    });

    const canPlace = blockedBy.length === 0;
    const lastValidPosition = lastValidPositions[shapeId];

    return {
      canPlace,
      blockedBy,
      lastValidPosition,
      constrainedPosition: canPlace ? position : lastValidPosition,
      reason: !canPlace ? violationReasons.join('; ') : undefined
    };
  }, [enabled, mode, nodes, spatialIndex, touchTolerance, getCachedAdjacency, lastValidPositions]);

  /**
   * Find the closest valid position by constraining movement
   * This implements smart position adjustment when hitting constraints
   */
  const findConstrainedPosition = useCallback((
    shapeId: string,
    targetPosition: { x: number; y: number },
    lastValidPosition: { x: number; y: number }
  ): { x: number; y: number } => {
    const targetNode = nodes.find(n => n.id === shapeId);
    if (!targetNode || targetNode.type !== 'customShape') {
      return targetPosition;
    }

    // Calculate movement vector
    const moveX = targetPosition.x - lastValidPosition.x;
    const moveY = targetPosition.y - lastValidPosition.y;

    // If no movement, return current position
    if (Math.abs(moveX) < 1 && Math.abs(moveY) < 1) {
      return lastValidPosition;
    }

    // Try constraining movement in smaller increments
    const steps = 10;
    const stepX = moveX / steps;
    const stepY = moveY / steps;

    let bestPosition = lastValidPosition;
    
    // Step through movement incrementally to find maximum allowed displacement
    for (let i = 1; i <= steps; i++) {
      const testPosition = {
        x: lastValidPosition.x + (stepX * i),
        y: lastValidPosition.y + (stepY * i)
      };

      // Create temporary geometry at test position
      const tempNode = { ...targetNode, position: testPosition };
      const tempGeometry = nodeToShapeGeometry(tempNode);
      
      if (!tempGeometry) continue;

      // Quick collision check without backend validation
      const nearbyGeometries = spatialIndex.findNearbyShapes(tempGeometry);
      const collisions = findCollisions(tempGeometry, nearbyGeometries, touchTolerance);

      // If no collisions, this position is potentially valid
      if (collisions.length === 0) {
        bestPosition = testPosition;
      } else {
        // Hit a collision, stop here
        break;
      }
    }

    return bestPosition;
  }, [nodes, spatialIndex, touchTolerance]);

  /**
   * Clear cache entries older than expiry time
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    setAdjacencyCache(prev => {
      const cleaned: AdjacencyCache = {};
      Object.entries(prev).forEach(([key, value]) => {
        if ((now - value.timestamp) < cacheExpiryMs) {
          cleaned[key] = value;
        }
      });
      return cleaned;
    });
  }, [cacheExpiryMs]);

  // Periodic cache cleanup
  useEffect(() => {
    const interval = setInterval(cleanupCache, cacheExpiryMs);
    return () => clearInterval(interval);
  }, [cleanupCache, cacheExpiryMs]);

  /**
   * Get real-time visual feedback for shape dragging
   */
  const getVisualFeedback = useCallback((
    shapeId: string,
    position: { x: number; y: number }
  ): {
    isBlocked: boolean;
    blockedBy: string[];
    showWarning: boolean;
    feedbackMessage?: string;
  } => {
    if (!enabled || mode === 'creation') {
      return { isBlocked: false, blockedBy: [], showWarning: false };
    }

    const targetNode = nodes.find(n => n.id === shapeId);
    if (!targetNode || targetNode.type !== 'customShape') {
      return { isBlocked: false, blockedBy: [], showWarning: false };
    }

    const targetData = targetNode.data as CustomShapeData;
    if (!targetData.assignedNodeId) {
      return { isBlocked: false, blockedBy: [], showWarning: false };
    }

    // Create temporary geometry
    const tempNode = { ...targetNode, position };
    const tempGeometry = nodeToShapeGeometry(tempNode);
    
    if (!tempGeometry) {
      return { isBlocked: false, blockedBy: [], showWarning: false };
    }

    // Find collisions
    const nearbyGeometries = spatialIndex.findNearbyShapes(tempGeometry);
    const collisions = findCollisions(tempGeometry, nearbyGeometries, touchTolerance);

    const collidingShapes = collisions.map(c => c.shape.id);
    
    return {
      isBlocked: collidingShapes.length > 0,
      blockedBy: collidingShapes,
      showWarning: collidingShapes.length > 0,
      feedbackMessage: collidingShapes.length > 0 
        ? `Cannot overlap with ${collidingShapes.length} shape(s) - no adjacent relationship`
        : undefined
    };
  }, [enabled, mode, nodes, spatialIndex, touchTolerance]);

  return {
    checkPositionConstraints,
    findConstrainedPosition,
    getVisualFeedback,
    lastValidPositions,
    adjacencyCache: Object.keys(adjacencyCache).length,
    clearCache: () => setAdjacencyCache({})
  };
}