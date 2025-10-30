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
    // Use assignedNodeName for type-based connectivity checking
    const sourceNodeName = sourceShape.assignedNodeName!;
    const targetNodeName = targetShape.assignedNodeName!;

    console.log('🔍 Type-based validation attempt:', {
      source: {
        shapeName: sourceShape.name,
        assignedNodeName: sourceNodeName
      },
      target: {
        shapeName: targetShape.name,
        assignedNodeName: targetNodeName
      }
    });

    // Check if nodes of these types can connect (type-based, not instance-based)
    const connectivityData = await apiService.canNodesConnect(sourceNodeName, targetNodeName);

    console.log('📊 Connectivity data received:', {
      canConnect: connectivityData.canConnect,
      relationshipsCount: connectivityData.relationships.length,
      relationships: connectivityData.relationships
    });

    // If nodes cannot connect
    if (!connectivityData.canConnect || connectivityData.relationships.length === 0) {
      return {
        status: 'prohibited',
        canConnect: false,
        allowedFlowTypes: [],
        message: `No adjacency relationship found between ${sourceNodeName} and ${targetNodeName}`,
        details: 'These room types are not configured to be adjacent in the knowledge graph',
      };
    }

    // Check for prohibited relationships
    const prohibitedRels = connectivityData.relationships.filter(
      (rel: any) => rel.type === 'PROHIBITED_NEAR' || rel.type === 'CANNOT_CONNECT_TO'
    );

    if (prohibitedRels.length > 0) {
      return {
        status: 'prohibited',
        canConnect: false,
        allowedFlowTypes: [],
        message: `Connection prohibited: ${sourceNodeName} cannot be adjacent to ${targetNodeName}`,
        details: prohibitedRels[0]?.reason || 'GMP compliance violation',
      };
    }

    // Determine allowed flow types based on relationships
    const allowedFlowTypes: Set<DoorFlowType> = new Set();

    connectivityData.relationships.forEach((rel: any) => {
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
    if (allowedFlowTypes.size === 0 && connectivityData.relationships.length > 0) {
      // Check if rooms are generally compatible (not prohibited)
      const hasAdjacencyRel = connectivityData.relationships.some(
        (rel: any) => rel.type === 'ADJACENT_TO' || rel.type === 'REQUIRES_ACCESS'
      );

      if (hasAdjacencyRel) {
        allowedFlowTypes.add('material');
        allowedFlowTypes.add('personnel');
      }
    }

    // Valid connection with allowed flow types
    return {
      status: 'valid',
      canConnect: true,
      allowedFlowTypes: Array.from(allowedFlowTypes),
      message: `Valid connection: Allowed flow types - ${Array.from(allowedFlowTypes).join(', ')}`,
      details: `Based on ${connectivityData.relationships.length} relationship type(s) in knowledge graph`,
    };

  } catch (error) {
    console.error('❌ Error validating door connection:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      sourceName: sourceShape.assignedNodeName,
      targetName: targetShape.assignedNodeName,
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
  const tolerance = 10; // Increased tolerance for edge alignment detection

  // Calculate shape centers for adjacency validation
  const shape1Center = {
    x: shape1.x + (shape1.width || 120) / 2,
    y: shape1.y + (shape1.height || 80) / 2
  };
  const shape2Center = {
    x: shape2.x + (shape2.width || 120) / 2,
    y: shape2.y + (shape2.height || 80) / 2
  };

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

  // Helper function to check if edge is actually between the shapes
  // Uses shape extents (bounds) instead of just centers for more robust detection
  const isEdgeBetweenShapes = (
    edgeY: number | null,
    edgeX: number | null,
    isHorizontal: boolean
  ): boolean => {
    const shapeTolerance = 10; // Tolerance for edge positioning

    if (isHorizontal && edgeY !== null) {
      // For horizontal edge: check if edge Y is between the shapes' vertical extents
      const shape1Top = shape1.y;
      const shape1Bottom = shape1.y + (shape1.height || 80);
      const shape2Top = shape2.y;
      const shape2Bottom = shape2.y + (shape2.height || 80);

      // Edge should be between the top of one shape and bottom of the other
      const edgeBetweenShape1 = edgeY >= shape1Top - shapeTolerance && edgeY <= shape1Bottom + shapeTolerance;
      const edgeBetweenShape2 = edgeY >= shape2Top - shapeTolerance && edgeY <= shape2Bottom + shapeTolerance;

      // One shape should be mostly above the edge, the other mostly below
      const shape1Above = shape1Center.y < edgeY - shapeTolerance;
      const shape2Above = shape2Center.y < edgeY - shapeTolerance;
      const shape1Below = shape1Center.y > edgeY + shapeTolerance;
      const shape2Below = shape2Center.y > edgeY + shapeTolerance;

      return (edgeBetweenShape1 || edgeBetweenShape2) &&
             ((shape1Above && shape2Below) || (shape1Below && shape2Above));
    } else if (!isHorizontal && edgeX !== null) {
      // For vertical edge: check if edge X is between the shapes' horizontal extents
      const shape1Left = shape1.x;
      const shape1Right = shape1.x + (shape1.width || 120);
      const shape2Left = shape2.x;
      const shape2Right = shape2.x + (shape2.width || 120);

      // Edge should be between the left of one shape and right of the other
      const edgeBetweenShape1 = edgeX >= shape1Left - shapeTolerance && edgeX <= shape1Right + shapeTolerance;
      const edgeBetweenShape2 = edgeX >= shape2Left - shapeTolerance && edgeX <= shape2Right + shapeTolerance;

      // One shape should be mostly left of the edge, the other mostly right
      const shape1LeftOfEdge = shape1Center.x < edgeX - shapeTolerance;
      const shape2LeftOfEdge = shape2Center.x < edgeX - shapeTolerance;
      const shape1RightOfEdge = shape1Center.x > edgeX + shapeTolerance;
      const shape2RightOfEdge = shape2Center.x > edgeX + shapeTolerance;

      return (edgeBetweenShape1 || edgeBetweenShape2) &&
             ((shape1LeftOfEdge && shape2RightOfEdge) || (shape1RightOfEdge && shape2LeftOfEdge));
    }
    return false;
  };

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

          // Validate that this edge is actually between the shapes
          if (isEdgeBetweenShapes(midY, null, true)) {
            return {
              point1: { x: overlapStart, y: midY },
              point2: { x: overlapEnd, y: midY },
              midpoint: { x: midX, y: midY },
              edge1Index: edge1.index,
              edge2Index: edge2.index
            };
          }
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

          // Validate that this edge is actually between the shapes
          if (isEdgeBetweenShapes(null, midX, false)) {
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
  }

  // Find overlapping edges (original behavior when indices not specified)
  // Prioritize horizontal edges first (for vertical stacking), then vertical edges

  // First pass: Look for horizontal edges (vertical stacking)
  for (const edge1 of shape1Edges) {
    for (const edge2 of shape2Edges) {
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

          // Validate that this edge is actually between the shapes
          if (isEdgeBetweenShapes(midY, null, true)) {
            return {
              point1: { x: overlapStart, y: midY },
              point2: { x: overlapEnd, y: midY },
              midpoint: { x: midX, y: midY },
              edge1Index: edge1.index,
              edge2Index: edge2.index
            };
          }
        }
      }
    }
  }

  // Second pass: Look for vertical edges (horizontal stacking)
  for (const edge1 of shape1Edges) {
    for (const edge2 of shape2Edges) {
      const isVertical1 = Math.abs(edge1.p2.x - edge1.p1.x) < tolerance;
      const isVertical2 = Math.abs(edge2.p2.x - edge2.p1.x) < tolerance;

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

          // Validate that this edge is actually between the shapes
          if (isEdgeBetweenShapes(null, midX, false)) {
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
