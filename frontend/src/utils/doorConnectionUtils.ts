import apiService from '../services/api';
import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';
import { DoorFlowType, DoorConnection } from '../types';

export type DoorValidationStatus = 'valid' | 'no-neo4j-assignment' | 'prohibited' | 'flow-mismatch';

export interface DoorValidationResult {
  status: DoorValidationStatus;
  canConnect: boolean;
  allowedFlowTypes: DoorFlowType[];
  message: string;
  details?: string;
}

/**
 * Validates if two shapes can be connected via a door based on Neo4j relationships
 */
export async function validateDoorConnection(
  sourceShape: ShapeProperties,
  targetShape: ShapeProperties
): Promise<DoorValidationResult> {
  // Check if both shapes have Neo4j node assignments
  // We need at least the assignedNodeName to proceed (assignedNodeId can be derived)
  const sourceHasNeo4j = !!sourceShape.assignedNodeName;
  const targetHasNeo4j = !!targetShape.assignedNodeName;

  console.log('🔍 Validation Debug:', {
    source: { name: sourceShape.name, assignedNodeName: sourceShape.assignedNodeName, assignedNodeId: sourceShape.assignedNodeId },
    target: { name: targetShape.name, assignedNodeName: targetShape.assignedNodeName, assignedNodeId: targetShape.assignedNodeId },
    sourceHasNeo4j,
    targetHasNeo4j
  });

  // Case 1: One or both shapes don't have Neo4j assignments
  if (!sourceHasNeo4j || !targetHasNeo4j) {
    const missingShapes = [];
    if (!sourceHasNeo4j) missingShapes.push(sourceShape.name);
    if (!targetHasNeo4j) missingShapes.push(targetShape.name);

    return {
      status: 'no-neo4j-assignment',
      canConnect: false,
      allowedFlowTypes: [],
      message: `Warning: ${missingShapes.join(' and ')} ${missingShapes.length > 1 ? 'are' : 'is'} not assigned to Neo4j nodes`,
      details: 'Assign Neo4j functional areas to enable validation',
    };
  }

  try {
    // Use assignedNodeName (preferred) because it matches Neo4j node names better than slugified IDs
    // Fall back to assignedNodeId only if name is not available
    const sourceNodeIdentifier = sourceShape.assignedNodeName || sourceShape.assignedNodeId!;
    const targetNodeIdentifier = targetShape.assignedNodeName || targetShape.assignedNodeId!;

    console.log('🔍 Validation attempt:', {
      source: {
        shapeName: sourceShape.name,
        assignedNodeName: sourceShape.assignedNodeName,
        assignedNodeId: sourceShape.assignedNodeId,
        identifier: sourceNodeIdentifier
      },
      target: {
        shapeName: targetShape.name,
        assignedNodeName: targetShape.assignedNodeName,
        assignedNodeId: targetShape.assignedNodeId,
        identifier: targetNodeIdentifier
      }
    });

    // Fetch relationships for the source node from Neo4j
    const nodeData = await apiService.getNodeWithRelationships(sourceNodeIdentifier);
    const relationships = nodeData.relationships;

    console.log('📊 Node data received:', {
      node: nodeData.node,
      relationshipsCount: relationships.length,
      relationships
    });

    // Find relationships to the target node
    // Check both toId/fromId and toName/fromName since we might be using names
    const relToTarget = relationships.filter(
      (rel: any) =>
        rel.toId === targetNodeIdentifier ||
        rel.fromId === targetNodeIdentifier ||
        rel.toName === targetShape.assignedNodeName ||
        rel.fromName === targetShape.assignedNodeName
    );

    console.log('🔗 Relationships to target:', relToTarget);

    // Check for prohibited relationships
    const prohibitedRels = relToTarget.filter(
      (rel: any) => rel.type === 'PROHIBITED_NEAR' || rel.type === 'CANNOT_CONNECT_TO'
    );

    if (prohibitedRels.length > 0) {
      return {
        status: 'prohibited',
        canConnect: false,
        allowedFlowTypes: [],
        message: `Connection prohibited: ${sourceShape.name} cannot be adjacent to ${targetShape.name}`,
        details: prohibitedRels[0]?.reason || 'GMP compliance violation',
      };
    }

    // Determine allowed flow types based on relationships
    const allowedFlowTypes: Set<DoorFlowType> = new Set();

    relToTarget.forEach((rel: any) => {
      if (rel.type === 'MATERIAL_FLOW') {
        allowedFlowTypes.add('material');
      }
      if (rel.type === 'PERSONNEL_FLOW') {
        allowedFlowTypes.add('personnel');
      }
      // ADJACENT_TO allows both material and personnel by default
      if (rel.type === 'ADJACENT_TO') {
        allowedFlowTypes.add('material');
        allowedFlowTypes.add('personnel');
      }
    });

    // If there are explicit relationships but no flow types, check for general adjacency
    if (allowedFlowTypes.size === 0 && relToTarget.length > 0) {
      // Check if rooms are generally compatible (not prohibited)
      const hasAdjacencyRel = relToTarget.some(
        (rel: any) => rel.type === 'ADJACENT_TO' || rel.type === 'REQUIRES_ACCESS'
      );

      if (hasAdjacencyRel) {
        allowedFlowTypes.add('material');
        allowedFlowTypes.add('personnel');
      }
    }

    // If no relationships found at all, rooms are not explicitly allowed to connect
    if (relToTarget.length === 0) {
      return {
        status: 'prohibited',
        canConnect: false,
        allowedFlowTypes: [],
        message: `No adjacency relationship found between ${sourceShape.name} and ${targetShape.name}`,
        details: 'These rooms are not configured to be adjacent in the knowledge graph',
      };
    }

    // Valid connection with allowed flow types
    return {
      status: 'valid',
      canConnect: true,
      allowedFlowTypes: Array.from(allowedFlowTypes),
      message: `Valid connection: Allowed flow types - ${Array.from(allowedFlowTypes).join(', ')}`,
      details: `Based on ${relToTarget.length} relationship(s) in knowledge graph`,
    };

  } catch (error) {
    console.error('❌ Error validating door connection:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      sourceIdentifier: sourceShape.assignedNodeId || sourceShape.assignedNodeName,
      targetIdentifier: targetShape.assignedNodeId || targetShape.assignedNodeName,
      error
    });
    return {
      status: 'prohibited',
      canConnect: false,
      allowedFlowTypes: [],
      message: 'Unable to validate connection',
      details: `Error: ${error instanceof Error ? error.message : 'Failed to fetch from Neo4j'}`,
    };
  }
}

/**
 * Validates if a specific flow type is allowed for a door connection
 */
export async function validateDoorFlowType(
  sourceShape: ShapeProperties,
  targetShape: ShapeProperties,
  requestedFlowType: DoorFlowType
): Promise<DoorValidationResult> {
  const baseValidation = await validateDoorConnection(sourceShape, targetShape);

  if (!baseValidation.canConnect) {
    return baseValidation;
  }

  // Check if requested flow type is in allowed list
  if (!baseValidation.allowedFlowTypes.includes(requestedFlowType)) {
    return {
      status: 'flow-mismatch',
      canConnect: false,
      allowedFlowTypes: baseValidation.allowedFlowTypes,
      message: `${requestedFlowType} flow not allowed between ${sourceShape.name} and ${targetShape.name}`,
      details: `Allowed flow types: ${baseValidation.allowedFlowTypes.join(', ') || 'none'}`,
    };
  }

  return baseValidation;
}

/**
 * Get color for shape based on validation status
 */
export function getValidationColor(status: DoorValidationStatus): string {
  switch (status) {
    case 'valid':
      return '#4CAF50'; // Green
    case 'no-neo4j-assignment':
      return '#FF9800'; // Orange
    case 'prohibited':
    case 'flow-mismatch':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Gray
  }
}

/**
 * Compute relative points for a shape (handles different shape types)
 */
const computePointsRelative = (shape: ShapeProperties): { x: number; y: number }[] => {
  if (shape.customProperties?.pointsRelative) {
    return shape.customProperties.pointsRelative;
  }

  // Default rectangle if no custom points
  return [
    { x: 0, y: 0 },
    { x: shape.width || 120, y: 0 },
    { x: shape.width || 120, y: shape.height || 80 },
    { x: 0, y: shape.height || 80 }
  ];
};

/**
 * Find the shared edge between two shapes
 * Returns the edge start/end points and midpoint
 */
export const findSharedEdge = (
  shape1: ShapeProperties,
  shape2: ShapeProperties,
  edge1Index?: number,
  edge2Index?: number
): {
  point1: { x: number; y: number };
  point2: { x: number; y: number };
  midpoint: { x: number; y: number };
  edge1Index: number;
  edge2Index: number;
} | null => {
  const shape1Points = computePointsRelative(shape1);
  const shape2Points = computePointsRelative(shape2);
  const tolerance = 5;

  // Convert relative points to absolute coordinates
  const shape1Edges = shape1Points.map((p, i) => ({
    p1: { x: shape1.x + p.x, y: shape1.y + p.y },
    p2: {
      x: shape1.x + shape1Points[(i + 1) % shape1Points.length].x,
      y: shape1.y + shape1Points[(i + 1) % shape1Points.length].y
    },
    index: i
  }));

  const shape2Edges = shape2Points.map((p, i) => ({
    p1: { x: shape2.x + p.x, y: shape2.y + p.y },
    p2: {
      x: shape2.x + shape2Points[(i + 1) % shape2Points.length].x,
      y: shape2.y + shape2Points[(i + 1) % shape2Points.length].y
    },
    index: i
  }));

  // If edge indices are provided, use them to find the specific edge
  if (edge1Index !== undefined && edge2Index !== undefined) {
    const edge1 = shape1Edges[edge1Index];
    const edge2 = shape2Edges[edge2Index];

    if (edge1 && edge2) {
      const isVertical1 = Math.abs(edge1.p2.x - edge1.p1.x) < tolerance;
      const isVertical2 = Math.abs(edge2.p2.x - edge2.p1.x) < tolerance;
      const isHorizontal1 = Math.abs(edge1.p2.y - edge1.p1.y) < tolerance;
      const isHorizontal2 = Math.abs(edge2.p2.y - edge2.p1.y) < tolerance;

      // Check for horizontal overlap
      if (isHorizontal1 && isHorizontal2 && Math.abs(edge1.p1.y - edge2.p1.y) < tolerance) {
        const minX1 = Math.min(edge1.p1.x, edge1.p2.x);
        const maxX1 = Math.max(edge1.p1.x, edge1.p2.x);
        const minX2 = Math.min(edge2.p1.x, edge2.p2.x);
        const maxX2 = Math.max(edge2.p1.x, edge2.p2.x);

        const overlapStart = Math.max(minX1, minX2);
        const overlapEnd = Math.min(maxX1, maxX2);

        if (overlapStart < overlapEnd) {
          const midX = (overlapStart + overlapEnd) / 2;
          const midY = (edge1.p1.y + edge2.p1.y) / 2;
          return {
            point1: { x: overlapStart, y: midY },
            point2: { x: overlapEnd, y: midY },
            midpoint: { x: midX, y: midY },
            edge1Index: edge1.index,
            edge2Index: edge2.index
          };
        }
      }

      // Check for vertical overlap
      if (isVertical1 && isVertical2 && Math.abs(edge1.p1.x - edge2.p1.x) < tolerance) {
        const minY1 = Math.min(edge1.p1.y, edge1.p2.y);
        const maxY1 = Math.max(edge1.p1.y, edge1.p2.y);
        const minY2 = Math.min(edge2.p1.y, edge2.p2.y);
        const maxY2 = Math.max(edge2.p1.y, edge2.p2.y);

        const overlapStart = Math.max(minY1, minY2);
        const overlapEnd = Math.min(maxY1, maxY2);

        if (overlapStart < overlapEnd) {
          const midX = (edge1.p1.x + edge2.p1.x) / 2;
          const midY = (overlapStart + overlapEnd) / 2;
          return {
            point1: { x: midX, y: overlapStart },
            point2: { x: midX, y: overlapEnd },
            midpoint: { x: midX, y: midY },
            edge1Index: edge1.index,
            edge2Index: edge2.index
          };
        }
      }
    }

    return null;
  }

  // Find overlapping edges (original behavior when indices not specified)
  for (const edge1 of shape1Edges) {
    for (const edge2 of shape2Edges) {
      const isVertical1 = Math.abs(edge1.p2.x - edge1.p1.x) < tolerance;
      const isVertical2 = Math.abs(edge2.p2.x - edge2.p1.x) < tolerance;
      const isHorizontal1 = Math.abs(edge1.p2.y - edge1.p1.y) < tolerance;
      const isHorizontal2 = Math.abs(edge2.p2.y - edge2.p1.y) < tolerance;

      // Check for horizontal overlap
      if (isHorizontal1 && isHorizontal2 && Math.abs(edge1.p1.y - edge2.p1.y) < tolerance) {
        const minX1 = Math.min(edge1.p1.x, edge1.p2.x);
        const maxX1 = Math.max(edge1.p1.x, edge1.p2.x);
        const minX2 = Math.min(edge2.p1.x, edge2.p2.x);
        const maxX2 = Math.max(edge2.p1.x, edge2.p2.x);

        const overlapStart = Math.max(minX1, minX2);
        const overlapEnd = Math.min(maxX1, maxX2);

        if (overlapStart < overlapEnd) {
          const midX = (overlapStart + overlapEnd) / 2;
          const midY = (edge1.p1.y + edge2.p1.y) / 2;
          return {
            point1: { x: overlapStart, y: midY },
            point2: { x: overlapEnd, y: midY },
            midpoint: { x: midX, y: midY },
            edge1Index: edge1.index,
            edge2Index: edge2.index
          };
        }
      }

      // Check for vertical overlap
      if (isVertical1 && isVertical2 && Math.abs(edge1.p1.x - edge2.p1.x) < tolerance) {
        const minY1 = Math.min(edge1.p1.y, edge1.p2.y);
        const maxY1 = Math.max(edge1.p1.y, edge1.p2.y);
        const minY2 = Math.min(edge2.p1.y, edge2.p2.y);
        const maxY2 = Math.max(edge2.p1.y, edge2.p2.y);

        const overlapStart = Math.max(minY1, minY2);
        const overlapEnd = Math.min(maxY1, maxY2);

        if (overlapStart < overlapEnd) {
          const midX = (edge1.p1.x + edge2.p1.x) / 2;
          const midY = (overlapStart + overlapEnd) / 2;
          return {
            point1: { x: midX, y: overlapStart },
            point2: { x: midX, y: overlapEnd },
            midpoint: { x: midX, y: midY },
            edge1Index: edge1.index,
            edge2Index: edge2.index
          };
        }
      }
    }
  }

  return null;
};

/**
 * Update door connections' edge points based on current shape positions
 * This should be called whenever shapes are moved/updated
 */
export const updateDoorConnectionsEdgePoints = (
  connections: DoorConnection[],
  shapes: ShapeProperties[]
): DoorConnection[] => {
  return connections.map(connection => {
    const fromShape = shapes.find(s => s.id === connection.fromShape.shapeId);
    const toShape = shapes.find(s => s.id === connection.toShape.shapeId);

    // If either shape is missing, return connection unchanged
    if (!fromShape || !toShape) {
      return connection;
    }

    // Recalculate the shared edge using the stored edge indices
    const sharedEdge = findSharedEdge(
      fromShape,
      toShape,
      connection.fromShape.edgeIndex,
      connection.toShape.edgeIndex
    );

    // If shared edge can't be found, return connection unchanged
    if (!sharedEdge) {
      return connection;
    }

    // Update the connection with new edge points and midpoint
    return {
      ...connection,
      fromShape: {
        ...connection.fromShape,
        x: sharedEdge.midpoint.x,
        y: sharedEdge.midpoint.y,
      },
      toShape: {
        ...connection.toShape,
        x: sharedEdge.midpoint.x,
        y: sharedEdge.midpoint.y,
      },
      edgeStartPoint: sharedEdge.point1,
      edgeEndPoint: sharedEdge.point2,
    };
  });
};
