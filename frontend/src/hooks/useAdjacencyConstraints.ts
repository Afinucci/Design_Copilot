import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Node } from 'reactflow';
import { apiService } from '../services/api';
import { CustomShapeData } from '../types';
import { 
  nodeToShapeGeometry, 
  SpatialIndex, 
  findCollisions, 
  ShapeGeometry,
  CollisionResult
} from '../utils/shapeCollision';

export interface ConstraintViolation {
  shapeId: string;
  targetShapeId: string;
  reason: string;
  severity: 'error' | 'warning';
  collisionType: 'overlap' | 'edge-touch' | 'near-proximity';
  canBeResolved: boolean;
}

export interface AdjacencyConstraintResult {
  canPlace: boolean;
  violations: ConstraintViolation[];
  warnings: string[];
  validPlacements: Array<{ x: number; y: number; reason: string }>;
}

export interface UseAdjacencyConstraintsOptions {
  mode: 'creation' | 'guided';
  touchTolerance?: number;
  enableRealTimeValidation?: boolean;
  debounceMs?: number;
}

export function useAdjacencyConstraints(
  nodes: Node[],
  options: UseAdjacencyConstraintsOptions
) {
  const {
    mode,
    touchTolerance = 2,
    enableRealTimeValidation = true,
    debounceMs = 150
  } = options;

  const [violations, setViolations] = useState<ConstraintViolation[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [spatialIndex] = useState(() => new SpatialIndex(100));
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  /**
   * Validate shape position against adjacency constraints
   */
  const validateShapePosition = useCallback(async (
    shapeId: string,
    position: { x: number; y: number },
    skipDebounce = false
  ): Promise<AdjacencyConstraintResult> => {
    // In creation mode, always allow placement
    if (mode === 'creation') {
      return {
        canPlace: true,
        violations: [],
        warnings: [],
        validPlacements: []
      };
    }

    const targetNode = nodes.find(n => n.id === shapeId);
    if (!targetNode || targetNode.type !== 'customShape') {
      return {
        canPlace: true,
        violations: [],
        warnings: ['Shape not found or not a custom shape'],
        validPlacements: []
      };
    }

    const targetData = targetNode.data as CustomShapeData;
    
    // If shape has no Neo4j assignment, allow placement with warning
    if (!targetData.assignedNodeId) {
      return {
        canPlace: true,
        violations: [],
        warnings: ['Shape not assigned to Neo4j node - adjacency constraints not enforced'],
        validPlacements: []
      };
    }

    try {
      setIsValidating(true);

      // Create temporary geometry at the new position
      const tempNode = {
        ...targetNode,
        position
      };

      const tempGeometry = nodeToShapeGeometry(tempNode);
      if (!tempGeometry) {
        return {
          canPlace: true,
          violations: [],
          warnings: ['Unable to calculate shape geometry'],
          validPlacements: []
        };
      }

      // Find nearby shapes using spatial index
      const nearbyGeometries = spatialIndex.findNearbyShapes(tempGeometry);
      const collisions = findCollisions(tempGeometry, nearbyGeometries, touchTolerance);

      if (collisions.length === 0) {
        return {
          canPlace: true,
          violations: [],
          warnings: [],
          validPlacements: []
        };
      }

      // Prepare collision data for backend validation
      const nearbyShapes = collisions.map(collision => {
        const collisionNode = nodes.find(n => n.id === collision.shape.id);
        const collisionData = collisionNode?.data as CustomShapeData;

        return {
          id: collision.shape.id,
          assignedNodeId: collisionData?.assignedNodeId,
          geometry: {
            vertices: collision.shape.vertices,
            boundingBox: collision.shape.boundingBox
          },
          distance: collision.collision.distance,
          collisionType: collision.collision.collisionType
        };
      });

      // Call backend for adjacency validation
      const validationResponse = await apiService.validateShapePosition({
        shapeId,
        position,
        shapeGeometry: {
          vertices: tempGeometry.vertices,
          boundingBox: tempGeometry.boundingBox
        },
        assignedNodeId: targetData.assignedNodeId,
        nearbyShapes
      });

      const constraintViolations: ConstraintViolation[] = validationResponse.violations.map(violation => ({
        shapeId,
        targetShapeId: violation.shapeId,
        reason: violation.reason,
        severity: violation.severity,
        collisionType: violation.collisionType,
        canBeResolved: violation.severity === 'warning'
      }));

      return {
        canPlace: validationResponse.canPlace,
        violations: constraintViolations,
        warnings: validationResponse.warnings,
        validPlacements: [] // TODO: Implement placement suggestions
      };

    } catch (error) {
      console.error('Error validating shape position:', error);
      return {
        canPlace: false,
        violations: [{
          shapeId,
          targetShapeId: '',
          reason: 'Error validating adjacency constraints - placement blocked for safety',
          severity: 'error',
          collisionType: 'overlap',
          canBeResolved: false
        }],
        warnings: [],
        validPlacements: []
      };
    } finally {
      setIsValidating(false);
    }
  }, [nodes, mode, touchTolerance, spatialIndex]);

  /**
   * Debounced validation for real-time drag operations
   */
  const validateShapePositionDebounced = useCallback((
    shapeId: string,
    position: { x: number; y: number }
  ): Promise<AdjacencyConstraintResult> => {
    return new Promise((resolve) => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(async () => {
        const result = await validateShapePosition(shapeId, position, true);
        resolve(result);
      }, debounceMs);
    });
  }, [validateShapePosition, debounceMs]);

  /**
   * Check if a specific node can connect to another based on adjacency
   */
  const canShapesTouch = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<{
    canTouch: boolean;
    reason: string;
    relationshipType?: string;
  }> => {
    // In creation mode, allow all connections
    if (mode === 'creation') {
      return {
        canTouch: true,
        reason: 'Creation mode allows all connections'
      };
    }

    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      return {
        canTouch: false,
        reason: 'One or both shapes not found'
      };
    }

    const sourceData = sourceNode.data as CustomShapeData;
    const targetData = targetNode.data as CustomShapeData;

    // If either shape doesn't have Neo4j assignment, allow connection
    if (!sourceData.assignedNodeId || !targetData.assignedNodeId) {
      return {
        canTouch: true,
        reason: 'One or both shapes not assigned to Neo4j nodes'
      };
    }

    try {
      const adjacencyResult = await apiService.checkAdjacency(
        sourceData.assignedNodeId,
        targetData.assignedNodeId
      );

      return {
        canTouch: adjacencyResult.canBeAdjacent,
        reason: adjacencyResult.reason,
        relationshipType: adjacencyResult.relationshipType
      };
    } catch (error) {
      console.error('Error checking adjacency:', error);
      return {
        canTouch: false,
        reason: 'Error checking adjacency rules - connection blocked for safety'
      };
    }
  }, [nodes, mode]);

  /**
   * Validate all current shape positions
   */
  const validateAllPositions = useCallback(async (): Promise<void> => {
    if (mode !== 'guided' || !enableRealTimeValidation) {
      setViolations([]);
      return;
    }

    const allViolations: ConstraintViolation[] = [];

    // Process all custom shapes with Neo4j assignments
    const customShapes = nodes.filter(n => 
      n.type === 'customShape' && 
      (n.data as CustomShapeData).assignedNodeId
    );

    for (const shape of customShapes) {
      try {
        const result = await validateShapePosition(shape.id, shape.position, true);
        allViolations.push(...result.violations);
      } catch (error) {
        console.error(`Error validating shape ${shape.id}:`, error);
      }
    }

    setViolations(allViolations);
  }, [nodes, mode, enableRealTimeValidation, validateShapePosition]);

  /**
   * Get violations for a specific shape
   */
  const getShapeViolations = useCallback((shapeId: string): ConstraintViolation[] => {
    return violations.filter(v => v.shapeId === shapeId || v.targetShapeId === shapeId);
  }, [violations]);

  /**
   * Get visual feedback data for a shape at a specific position
   */
  const getVisualFeedback = useCallback((
    shapeId: string,
    position: { x: number; y: number }
  ): {
    showProximityWarning: boolean;
    proximityShapes: string[];
    blockedZones: Array<{ x: number; y: number; radius: number }>;
    allowedZones: Array<{ x: number; y: number; radius: number }>;
  } => {
    // Find shapes that would be in collision at this position
    const targetNode = nodes.find(n => n.id === shapeId);
    if (!targetNode || targetNode.type !== 'customShape') {
      return {
        showProximityWarning: false,
        proximityShapes: [],
        blockedZones: [],
        allowedZones: []
      };
    }

    const tempNode = { ...targetNode, position };
    const tempGeometry = nodeToShapeGeometry(tempNode);
    if (!tempGeometry) {
      return {
        showProximityWarning: false,
        proximityShapes: [],
        blockedZones: [],
        allowedZones: []
      };
    }

    const nearbyGeometries = spatialIndex.findNearbyShapes(tempGeometry);
    const collisions = findCollisions(tempGeometry, nearbyGeometries, touchTolerance);

    const proximityShapes = collisions.map(c => c.shape.id);
    const hasProximityWarning = collisions.some(c => 
      c.collision.collisionType === 'near-proximity' || 
      c.collision.collisionType === 'edge-contact' ||
      c.collision.collisionType === 'edge-alignment'
    );

    return {
      showProximityWarning: hasProximityWarning,
      proximityShapes,
      blockedZones: [], // TODO: Implement blocked zone calculation
      allowedZones: []   // TODO: Implement allowed zone calculation
    };
  }, [nodes, spatialIndex, touchTolerance]);

  // Auto-validate when nodes change
  useEffect(() => {
    if (enableRealTimeValidation && mode === 'guided') {
      validateAllPositions();
    }
  }, [enableRealTimeValidation, mode, validateAllPositions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return {
    violations,
    isValidating,
    validateShapePosition,
    validateShapePositionDebounced,
    canShapesTouch,
    validateAllPositions,
    getShapeViolations,
    getVisualFeedback
  };
}