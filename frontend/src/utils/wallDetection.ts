import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';

/**
 * Represents a wall segment (edge) of a shape
 */
export interface WallSegment {
  shapeId: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  midPoint: { x: number; y: number };
  length: number;
  angle: number; // Angle in radians
  normalVector: { x: number; y: number }; // Perpendicular to wall
}

/**
 * Represents a shared wall between two shapes
 */
export interface SharedWall {
  id: string;
  shape1Id: string;
  shape2Id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  midPoint: { x: number; y: number };
  length: number;
  angle: number;
  normalVector: { x: number; y: number };
}

/**
 * Represents a door placement on a shared wall
 */
export interface DoorPlacement {
  id: string;
  sharedWallId: string;
  shape1Id: string;
  shape2Id: string;
  position: { x: number; y: number }; // Position on the wall
  normalizedPosition: number; // 0-1 along the wall
  width: number; // Door width
  flowType: 'material' | 'personnel' | 'waste';
  flowDirection: 'unidirectional' | 'bidirectional';
}

/**
 * Get all wall segments (edges) of a shape
 */
export function getShapeWallSegments(shape: ShapeProperties): WallSegment[] {
  const segments: WallSegment[] = [];
  
  // Check if shape has custom polygon points
  const customPoints = (shape as any).customProperties?.pointsRelative;
  
  if (Array.isArray(customPoints) && customPoints.length >= 3) {
    // Use custom polygon points
    const absolutePoints = customPoints.map(p => ({
      x: shape.x + p.x,
      y: shape.y + p.y
    }));
    
    for (let i = 0; i < absolutePoints.length; i++) {
      const start = absolutePoints[i];
      const end = absolutePoints[(i + 1) % absolutePoints.length];
      
      segments.push(createWallSegment(shape.id, start, end));
    }
  } else {
    // Rectangle (default)
    const topLeft = { x: shape.x, y: shape.y };
    const topRight = { x: shape.x + shape.width, y: shape.y };
    const bottomRight = { x: shape.x + shape.width, y: shape.y + shape.height };
    const bottomLeft = { x: shape.x, y: shape.y + shape.height };
    
    segments.push(
      createWallSegment(shape.id, topLeft, topRight),      // Top wall
      createWallSegment(shape.id, topRight, bottomRight),  // Right wall
      createWallSegment(shape.id, bottomRight, bottomLeft), // Bottom wall
      createWallSegment(shape.id, bottomLeft, topLeft)      // Left wall
    );
  }
  
  return segments;
}

/**
 * Helper to create a wall segment from two points
 */
function createWallSegment(
  shapeId: string,
  start: { x: number; y: number },
  end: { x: number; y: number }
): WallSegment {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  
  // Normal vector (perpendicular to wall, pointing outward)
  const normalAngle = angle + Math.PI / 2;
  const normalVector = {
    x: Math.cos(normalAngle),
    y: Math.sin(normalAngle)
  };
  
  return {
    shapeId,
    startPoint: start,
    endPoint: end,
    midPoint: {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    },
    length,
    angle,
    normalVector
  };
}

/**
 * Check if two wall segments are collinear and overlapping (shared wall)
 */
export function findSharedWall(
  segment1: WallSegment,
  segment2: WallSegment,
  tolerance: number = 5
): SharedWall | null {
  // Check if walls are approximately parallel (same or opposite direction)
  const angleDiff = Math.abs(segment1.angle - segment2.angle);
  const isParallel = angleDiff < 0.1 || Math.abs(angleDiff - Math.PI) < 0.1;
  
  if (!isParallel) {
    return null;
  }
  
  // Check if walls are collinear (on the same line)
  const perpDistance = pointToLineDistance(
    segment2.startPoint,
    segment1.startPoint,
    segment1.endPoint
  );
  
  if (perpDistance > tolerance) {
    return null;
  }
  
  // Project segment2 points onto segment1's line to find overlap
  const overlap = findLineSegmentOverlap(
    segment1.startPoint,
    segment1.endPoint,
    segment2.startPoint,
    segment2.endPoint,
    segment1.angle
  );
  
  if (!overlap) {
    return null;
  }
  
  // Check if overlap is significant (at least 10 pixels)
  const overlapLength = Math.sqrt(
    Math.pow(overlap.end.x - overlap.start.x, 2) +
    Math.pow(overlap.end.y - overlap.start.y, 2)
  );
  
  if (overlapLength < 10) {
    return null;
  }
  
  // Create shared wall
  const id = `wall-${segment1.shapeId}-${segment2.shapeId}`;
  const midPoint = {
    x: (overlap.start.x + overlap.end.x) / 2,
    y: (overlap.start.y + overlap.end.y) / 2
  };
  
  return {
    id,
    shape1Id: segment1.shapeId,
    shape2Id: segment2.shapeId,
    startPoint: overlap.start,
    endPoint: overlap.end,
    midPoint,
    length: overlapLength,
    angle: segment1.angle,
    normalVector: segment1.normalVector
  };
}

/**
 * Find all shared walls between all shapes
 */
export function findAllSharedWalls(shapes: ShapeProperties[]): SharedWall[] {
  const sharedWalls: SharedWall[] = [];
  
  // Get wall segments for all shapes
  const allSegments = shapes.map(shape => ({
    shape,
    segments: getShapeWallSegments(shape)
  }));
  
  // Compare each pair of shapes
  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      const shape1Segments = allSegments[i].segments;
      const shape2Segments = allSegments[j].segments;
      
      // Compare each segment pair
      for (const seg1 of shape1Segments) {
        for (const seg2 of shape2Segments) {
          const sharedWall = findSharedWall(seg1, seg2);
          if (sharedWall) {
            sharedWalls.push(sharedWall);
          }
        }
      }
    }
  }
  
  return sharedWalls;
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function pointToLineDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLengthSquared = dx * dx + dy * dy;
  
  if (lineLengthSquared === 0) {
    // Line is actually a point
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }
  
  // Calculate perpendicular distance using cross product
  const numerator = Math.abs(
    (lineEnd.y - lineStart.y) * point.x -
    (lineEnd.x - lineStart.x) * point.y +
    lineEnd.x * lineStart.y -
    lineEnd.y * lineStart.x
  );
  
  return numerator / Math.sqrt(lineLengthSquared);
}

/**
 * Find the overlapping portion of two line segments
 */
function findLineSegmentOverlap(
  seg1Start: { x: number; y: number },
  seg1End: { x: number; y: number },
  seg2Start: { x: number; y: number },
  seg2End: { x: number; y: number },
  angle: number
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  // Project all points onto the line direction
  const projectPoint = (point: { x: number; y: number }): number => {
    return point.x * Math.cos(angle) + point.y * Math.sin(angle);
  };
  
  const t1Start = projectPoint(seg1Start);
  const t1End = projectPoint(seg1End);
  const t2Start = projectPoint(seg2Start);
  const t2End = projectPoint(seg2End);
  
  // Ensure start < end for each segment
  const [t1Min, t1Max] = t1Start < t1End ? [t1Start, t1End] : [t1End, t1Start];
  const [t2Min, t2Max] = t2Start < t2End ? [t2Start, t2End] : [t2End, t2Start];
  
  // Find overlap
  const overlapStart = Math.max(t1Min, t2Min);
  const overlapEnd = Math.min(t1Max, t2Max);
  
  if (overlapStart >= overlapEnd) {
    return null; // No overlap
  }
  
  // Convert back to 2D coordinates
  const unproject = (t: number): { x: number; y: number } => {
    // Use seg1Start as reference point
    const dx = t - projectPoint(seg1Start);
    return {
      x: seg1Start.x + dx * Math.cos(angle),
      y: seg1Start.y + dx * Math.sin(angle)
    };
  };
  
  return {
    start: unproject(overlapStart),
    end: unproject(overlapEnd)
  };
}

/**
 * Calculate position along a wall given a point
 */
export function getPositionAlongWall(
  wall: SharedWall,
  point: { x: number; y: number }
): { position: { x: number; y: number }; normalizedPosition: number } {
  // Project point onto the wall line
  const wallDx = wall.endPoint.x - wall.startPoint.x;
  const wallDy = wall.endPoint.y - wall.startPoint.y;
  const wallLengthSquared = wallDx * wallDx + wallDy * wallDy;
  
  if (wallLengthSquared === 0) {
    return {
      position: wall.startPoint,
      normalizedPosition: 0
    };
  }
  
  // Calculate parameter t along the wall (0 = start, 1 = end)
  const t = Math.max(0, Math.min(1,
    ((point.x - wall.startPoint.x) * wallDx + (point.y - wall.startPoint.y) * wallDy) /
    wallLengthSquared
  ));
  
  return {
    position: {
      x: wall.startPoint.x + t * wallDx,
      y: wall.startPoint.y + t * wallDy
    },
    normalizedPosition: t
  };
}

/**
 * Get position on wall from normalized position (0-1)
 */
export function getPositionFromNormalized(
  wall: SharedWall,
  normalizedPosition: number
): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, normalizedPosition));
  return {
    x: wall.startPoint.x + t * (wall.endPoint.x - wall.startPoint.x),
    y: wall.startPoint.y + t * (wall.endPoint.y - wall.startPoint.y)
  };
}
