import { Node } from 'reactflow';
import { CustomShapeData, ShapePoint } from '../types';

export interface CollisionResult {
  isColliding: boolean;
  collisionType: 'body-overlap' | 'edge-contact' | 'edge-alignment' | 'separated' | 'near-proximity' | 'none';
  distance: number;
  collisionPoints: ShapePoint[];
  isEdgeOnly?: boolean; // True if collision is only at edges, not body overlap
  hasValidAdjacency?: boolean; // True if shapes can be adjacent based on relationship
}

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ShapeGeometry {
  id: string;
  type: 'rectangle' | 'polygon' | 'custom';
  boundingBox: BoundingBox;
  vertices: ShapePoint[];
  edges: Array<{ start: ShapePoint; end: ShapePoint }>;
}

/**
 * Convert a ReactFlow node to shape geometry for collision detection
 */
export function nodeToShapeGeometry(node: Node): ShapeGeometry | null {
  if (node.type !== 'customShape') {
    return null;
  }

  const data = node.data as CustomShapeData;
  if (!data.shapePoints || data.shapePoints.length < 2) {
    return null;
  }

  // Transform shape points by node position
  let transformedPoints = data.shapePoints.map(point => ({
    x: (node.position?.x || 0) + point.x,
    y: (node.position?.y || 0) + point.y
  }));

  // Special handling for rectangles: shapePoints often store only top-left and bottom-right.
  // Construct full rectangle vertices in clockwise order to enable accurate edge collision checks.
  if ((data.shapeType === 'rectangle' || data.shapeType === 'custom') && data.shapePoints.length === 2) {
    const p0 = transformedPoints[0]; // assumed top-left
    const p1 = transformedPoints[1]; // assumed bottom-right
    const topLeft = { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) };
    const bottomRight = { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) };
    const topRight = { x: bottomRight.x, y: topLeft.y };
    const bottomLeft = { x: topLeft.x, y: bottomRight.y };
    transformedPoints = [topLeft, topRight, bottomRight, bottomLeft];
  }

  const boundingBox = calculateBoundingBox(transformedPoints);

  // Generate edges from consecutive vertices
  const edges: Array<{ start: ShapePoint; end: ShapePoint }> = [];
  for (let i = 0; i < transformedPoints.length; i++) {
    const start = transformedPoints[i];
    const end = transformedPoints[(i + 1) % transformedPoints.length];
    edges.push({ start, end });
  }

  return {
    id: node.id,
    type: data.shapeType === 'rectangle' ? 'rectangle' : 'polygon',
    boundingBox,
    vertices: transformedPoints,
    edges
  };
}

/**
 * Calculate bounding box for a set of points
 */
export function calculateBoundingBox(points: ShapePoint[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Check if two bounding boxes intersect (fast preliminary check)
 */
export function boundingBoxesIntersect(bbox1: BoundingBox, bbox2: BoundingBox, tolerance: number = 0): boolean {
  return (
    bbox1.minX <= bbox2.maxX + tolerance &&
    bbox1.maxX >= bbox2.minX - tolerance &&
    bbox1.minY <= bbox2.maxY + tolerance &&
    bbox1.maxY >= bbox2.minY - tolerance
  );
}

/**
 * Check if two line segments intersect
 */
export function lineSegmentsIntersect(
  line1Start: ShapePoint,
  line1End: ShapePoint,
  line2Start: ShapePoint,
  line2End: ShapePoint
): { intersects: boolean; point?: ShapePoint } {
  const x1 = line1Start.x, y1 = line1Start.y;
  const x2 = line1End.x, y2 = line1End.y;
  const x3 = line2Start.x, y3 = line2Start.y;
  const x4 = line2End.x, y4 = line2End.y;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  
  if (Math.abs(denominator) < 1e-10) {
    return { intersects: false }; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const intersectionX = x1 + t * (x2 - x1);
    const intersectionY = y1 + t * (y2 - y1);
    return {
      intersects: true,
      point: { x: intersectionX, y: intersectionY }
    };
  }

  return { intersects: false };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: ShapePoint, polygon: ShapePoint[]): boolean {
  let inside = false;
  const { x, y } = point;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Calculate minimum distance between a point and a line segment
 */
export function pointToLineDistance(point: ShapePoint, lineStart: ShapePoint, lineEnd: ShapePoint): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return Math.sqrt(Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2));
  }
  
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)));
  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;
  
  return Math.sqrt(Math.pow(point.x - projectionX, 2) + Math.pow(point.y - projectionY, 2));
}

/**
 * Find the minimum distance between two polygons
 */
export function polygonDistance(shape1: ShapeGeometry, shape2: ShapeGeometry): number {
  let minDistance = Infinity;
  
  // Check distance from each vertex of shape1 to each edge of shape2
  for (const vertex of shape1.vertices) {
    for (const edge of shape2.edges) {
      const distance = pointToLineDistance(vertex, edge.start, edge.end);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  // Check distance from each vertex of shape2 to each edge of shape1
  for (const vertex of shape2.vertices) {
    for (const edge of shape1.edges) {
      const distance = pointToLineDistance(vertex, edge.start, edge.end);
      minDistance = Math.min(minDistance, distance);
    }
  }
  
  return minDistance;
}

/**
 * Check if two shapes are colliding or touching
 */
export function detectCollision(shape1: ShapeGeometry, shape2: ShapeGeometry, touchTolerance: number = 2): CollisionResult {
  // Quick bounding box check
  if (!boundingBoxesIntersect(shape1.boundingBox, shape2.boundingBox, touchTolerance)) {
    const distance = polygonDistance(shape1, shape2);
    return {
      isColliding: false,
      collisionType: distance > 10 ? 'separated' : 'near-proximity',
      distance,
      collisionPoints: [],
      isEdgeOnly: false
    };
  }

  const collisionPoints: ShapePoint[] = [];
  let hasIntersection = false;
  let hasBodyOverlap = false;
  let isEdgeContact = false;

  // Check for edge intersections
  for (const edge1 of shape1.edges) {
    for (const edge2 of shape2.edges) {
      const intersection = lineSegmentsIntersect(edge1.start, edge1.end, edge2.start, edge2.end);
      if (intersection.intersects && intersection.point) {
        collisionPoints.push(intersection.point);
        hasIntersection = true;
        
        // Check if this is just edge contact (edges touching but not crossing)
        const edgeDistance = pointToLineDistance(edge1.start, edge2.start, edge2.end);
        if (edgeDistance <= touchTolerance) {
          // Edge contact detected
          isEdgeContact = true;
        }
      }
    }
  }

  // Check for vertex containment (body overlap)
  for (const vertex of shape1.vertices) {
    if (pointInPolygon(vertex, shape2.vertices)) {
      hasBodyOverlap = true;
      break;
    }
  }

  if (!hasBodyOverlap) {
    for (const vertex of shape2.vertices) {
      if (pointInPolygon(vertex, shape1.vertices)) {
        hasBodyOverlap = true;
        break;
      }
    }
  }

  // Determine collision type based on what we found
  if (hasBodyOverlap) {
    return {
      isColliding: true,
      collisionType: 'body-overlap',
      distance: 0,
      collisionPoints,
      isEdgeOnly: false
    };
  }

  if (hasIntersection && !hasBodyOverlap) {
    // Check if edges are perfectly aligned (for valid adjacency)
    const areAligned = shape1.edges.some(e1 => 
      shape2.edges.some(e2 => {
        const dist1 = pointToLineDistance(e1.start, e2.start, e2.end);
        const dist2 = pointToLineDistance(e1.end, e2.start, e2.end);
        return dist1 <= touchTolerance && dist2 <= touchTolerance;
      })
    );

    return {
      isColliding: true,
      collisionType: areAligned ? 'edge-alignment' : 'edge-contact',
      distance: 0,
      collisionPoints,
      isEdgeOnly: true
    };
  }

  // Check for near proximity
  const distance = polygonDistance(shape1, shape2);
  if (distance <= touchTolerance) {
    return {
      isColliding: true,
      collisionType: 'near-proximity',
      distance,
      collisionPoints: [],
      isEdgeOnly: false
    };
  }

  // Shapes are separated
  if (distance <= 10) { // Within minimum separation distance
    return {
      isColliding: false,
      collisionType: 'near-proximity',
      distance,
      collisionPoints: [],
      isEdgeOnly: false
    };
  }

  return {
    isColliding: false,
    collisionType: 'separated',
    distance,
    collisionPoints: [],
    isEdgeOnly: false
  };
}

/**
 * Find all shapes that a given shape is colliding with
 */
export function findCollisions(
  targetShape: ShapeGeometry,
  allShapes: ShapeGeometry[],
  touchTolerance: number = 2
): Array<{ shape: ShapeGeometry; collision: CollisionResult }> {
  const collisions: Array<{ shape: ShapeGeometry; collision: CollisionResult }> = [];
  
  for (const shape of allShapes) {
    if (shape.id === targetShape.id) continue;
    
    const collision = detectCollision(targetShape, shape, touchTolerance);
    if (collision.isColliding) {
      collisions.push({ shape, collision });
    }
  }
  
  return collisions;
}

/**
 * Spatial index for efficient collision detection with many shapes
 */
export class SpatialIndex {
  private gridSize: number;
  private grid = new Map<string, ShapeGeometry[]>();

  constructor(gridSize: number = 100) {
    this.gridSize = gridSize;
  }

  private getGridKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return `${gridX},${gridY}`;
  }

  add(shape: ShapeGeometry): void {
    const bbox = shape.boundingBox;
    const startGridX = Math.floor(bbox.minX / this.gridSize);
    const endGridX = Math.floor(bbox.maxX / this.gridSize);
    const startGridY = Math.floor(bbox.minY / this.gridSize);
    const endGridY = Math.floor(bbox.maxY / this.gridSize);

    for (let gx = startGridX; gx <= endGridX; gx++) {
      for (let gy = startGridY; gy <= endGridY; gy++) {
        const key = `${gx},${gy}`;
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(shape);
      }
    }
  }

  findNearbyShapes(shape: ShapeGeometry): ShapeGeometry[] {
    const nearby = new Set<ShapeGeometry>();
    const bbox = shape.boundingBox;
    const startGridX = Math.floor(bbox.minX / this.gridSize);
    const endGridX = Math.floor(bbox.maxX / this.gridSize);
    const startGridY = Math.floor(bbox.minY / this.gridSize);
    const endGridY = Math.floor(bbox.maxY / this.gridSize);

    for (let gx = startGridX; gx <= endGridX; gx++) {
      for (let gy = startGridY; gy <= endGridY; gy++) {
        const key = `${gx},${gy}`;
        const shapes = this.grid.get(key) || [];
        shapes.forEach(s => {
          if (s.id !== shape.id) {
            nearby.add(s);
          }
        });
      }
    }

    return Array.from(nearby);
  }

  clear(): void {
    this.grid.clear();
  }
}