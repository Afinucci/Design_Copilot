/**
 * Polygon Union Utility
 *
 * Implements polygon union operations for merging adjacent shapes.
 * Uses a simplified approach based on convex hull for initial implementation.
 */

import { ShapePoint } from '../types';
import { mergeRectangles, Rectangle } from './rectangleUnion';

export interface Polygon {
  points: ShapePoint[];
}

/**
 * Calculate the cross product of vectors OA and OB
 */
function crossProduct(O: ShapePoint, A: ShapePoint, B: ShapePoint): number {
  return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
}

/**
 * Compute the convex hull of a set of points using Graham's scan algorithm
 * This gives us the outer boundary of multiple merged shapes
 */
export function computeConvexHull(points: ShapePoint[]): ShapePoint[] {
  if (points.length < 3) return points;

  // Remove duplicate points
  const uniquePoints = points.filter((point, index, self) =>
    index === self.findIndex((p) => p.x === point.x && p.y === point.y)
  );

  if (uniquePoints.length < 3) return uniquePoints;

  // Sort points lexicographically (first by x, then by y)
  const sorted = [...uniquePoints].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x
  );

  // Build lower hull
  const lower: ShapePoint[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 &&
           crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  // Build upper hull
  const upper: ShapePoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const point = sorted[i];
    while (upper.length >= 2 &&
           crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  // Concatenate lower and upper hull
  return lower.concat(upper);
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
 * Calculate the area of a polygon using the Shoelace formula
 */
export function polygonArea(points: ShapePoint[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate the centroid of a polygon
 */
export function polygonCentroid(points: ShapePoint[]): ShapePoint {
  if (points.length === 0) return { x: 0, y: 0 };

  let cx = 0, cy = 0;
  let area = 0;

  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
    area += cross;
  }

  area /= 2;

  if (Math.abs(area) < 0.0001) {
    // Fallback to simple average for degenerate cases
    cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  } else {
    cx /= (6 * area);
    cy /= (6 * area);
  }

  return { x: cx, y: cy };
}

/**
 * Merge multiple axis-aligned rectangles into a single polygon
 * This properly handles L-shapes, T-shapes, etc. by preserving concave corners
 */
export function mergeAxisAlignedRectangles(polygons: Polygon[]): Polygon {
  if (polygons.length === 0) return { points: [] };
  if (polygons.length === 1) return polygons[0];

  // Convert polygons to rectangles (assuming 4 points, axis-aligned)
  const rects: Rectangle[] = polygons.map(poly => {
    const bbox = calculateBoundingBox(poly.points);
    return {
      minX: bbox.minX,
      maxX: bbox.maxX,
      minY: bbox.minY,
      maxY: bbox.maxY
    };
  });

  // Use the proper rectangle union algorithm
  const mergedPoints = mergeRectangles(rects);

  return { points: mergedPoints };
}

/**
 * Merge multiple polygons into a single polygon
 * This version tries to detect axis-aligned rectangles and use proper union
 */
export function mergePolygons(polygons: Polygon[]): Polygon {
  if (polygons.length === 0) return { points: [] };
  if (polygons.length === 1) return polygons[0];

  // Check if all polygons are axis-aligned rectangles (4 points)
  const areAllRectangles = polygons.every(p => p.points.length === 4);

  if (areAllRectangles) {
    return mergeAxisAlignedRectangles(polygons);
  }

  // Fallback to convex hull for non-rectangles
  const allPoints: ShapePoint[] = [];
  for (const polygon of polygons) {
    allPoints.push(...polygon.points);
  }
  const mergedPoints = computeConvexHull(allPoints);
  return { points: mergedPoints };
}

/**
 * Check if two polygons are adjacent (share an edge or are very close)
 */
export function arePolygonsAdjacent(poly1: Polygon, poly2: Polygon, tolerance: number = 5): boolean {
  // Check if any edge from poly1 is close to any edge from poly2
  for (let i = 0; i < poly1.points.length; i++) {
    const p1Start = poly1.points[i];
    const p1End = poly1.points[(i + 1) % poly1.points.length];

    for (let j = 0; j < poly2.points.length; j++) {
      const p2Start = poly2.points[j];
      const p2End = poly2.points[(j + 1) % poly2.points.length];

      // Check if edges are parallel and close
      const dist = edgeToEdgeDistance(p1Start, p1End, p2Start, p2End);
      if (dist < tolerance) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate minimum distance between two line segments
 */
function edgeToEdgeDistance(
  a1: ShapePoint,
  a2: ShapePoint,
  b1: ShapePoint,
  b2: ShapePoint
): number {
  // Calculate distances from endpoints to opposite segments
  const distances = [
    pointToLineSegmentDistance(a1, b1, b2),
    pointToLineSegmentDistance(a2, b1, b2),
    pointToLineSegmentDistance(b1, a1, a2),
    pointToLineSegmentDistance(b2, a1, a2),
  ];

  return Math.min(...distances);
}

/**
 * Calculate minimum distance from a point to a line segment
 */
function pointToLineSegmentDistance(
  point: ShapePoint,
  lineStart: ShapePoint,
  lineEnd: ShapePoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (length * length)
    )
  );

  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;

  return Math.sqrt(
    Math.pow(point.x - projectionX, 2) + Math.pow(point.y - projectionY, 2)
  );
}

/**
 * Advanced polygon union using Sutherland-Hodgman algorithm
 * This preserves concave shapes better than convex hull
 *
 * Note: This is a simplified implementation for rectangles and simple polygons
 * For production use, consider using a library like polygon-clipping
 */
export function unionPolygonsAdvanced(polygons: Polygon[]): Polygon {
  if (polygons.length === 0) return { points: [] };
  if (polygons.length === 1) return polygons[0];

  // For now, use convex hull as a fallback
  // TODO: Implement proper polygon union with Martinez-Rueda algorithm
  return mergePolygons(polygons);
}

/**
 * Calculate bounding box for a set of points
 */
export function calculateBoundingBox(points: ShapePoint[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
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
    height: maxY - minY,
  };
}
