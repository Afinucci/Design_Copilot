import { DoorConnection } from '../types';
import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';

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
