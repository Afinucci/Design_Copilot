/**
 * Rectangle Union Algorithm
 *
 * Properly merges axis-aligned rectangles while preserving concave shapes (L-shapes, T-shapes, etc.)
 * Uses edge-based approach: collect all edges, remove internal ones, connect remaining edges
 */

export interface Rectangle {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Point {
  x: number;
  y: number;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dir: 'h' | 'v'; // horizontal or vertical
}

/**
 * Merge overlapping or adjacent rectangles into a single polygon outline
 */
export function mergeRectangles(rects: Rectangle[]): Point[] {
  console.log('🔧 mergeRectangles called with', rects.length, 'rectangles:', rects);

  if (rects.length === 0) return [];
  if (rects.length === 1) {
    const r = rects[0];
    return [
      { x: r.minX, y: r.minY },
      { x: r.maxX, y: r.minY },
      { x: r.maxX, y: r.maxY },
      { x: r.minX, y: r.maxY }
    ];
  }

  // Collect all unique coordinates to split edges at intersection points
  const xCoords = new Set<number>();
  const yCoords = new Set<number>();

  rects.forEach(rect => {
    xCoords.add(rect.minX);
    xCoords.add(rect.maxX);
    yCoords.add(rect.minY);
    yCoords.add(rect.maxY);
  });

  const sortedX = Array.from(xCoords).sort((a, b) => a - b);
  const sortedY = Array.from(yCoords).sort((a, b) => a - b);

  console.log('📏 X coordinates:', sortedX);
  console.log('📏 Y coordinates:', sortedY);

  // Collect edges split at all intersection points
  const edges: Edge[] = [];

  rects.forEach(rect => {
    // Top edge - split at X intersections
    const topY = rect.minY;
    for (let i = 0; i < sortedX.length - 1; i++) {
      const x1 = sortedX[i];
      const x2 = sortedX[i + 1];
      if (x1 >= rect.minX && x2 <= rect.maxX) {
        edges.push({ x1, y1: topY, x2, y2: topY, dir: 'h' });
      }
    }

    // Bottom edge - split at X intersections
    const bottomY = rect.maxY;
    for (let i = 0; i < sortedX.length - 1; i++) {
      const x1 = sortedX[i];
      const x2 = sortedX[i + 1];
      if (x1 >= rect.minX && x2 <= rect.maxX) {
        edges.push({ x1, y1: bottomY, x2, y2: bottomY, dir: 'h' });
      }
    }

    // Left edge - split at Y intersections
    const leftX = rect.minX;
    for (let i = 0; i < sortedY.length - 1; i++) {
      const y1 = sortedY[i];
      const y2 = sortedY[i + 1];
      if (y1 >= rect.minY && y2 <= rect.maxY) {
        edges.push({ x1: leftX, y1, x2: leftX, y2, dir: 'v' });
      }
    }

    // Right edge - split at Y intersections
    const rightX = rect.maxX;
    for (let i = 0; i < sortedY.length - 1; i++) {
      const y1 = sortedY[i];
      const y2 = sortedY[i + 1];
      if (y1 >= rect.minY && y2 <= rect.maxY) {
        edges.push({ x1: rightX, y1, x2: rightX, y2, dir: 'v' });
      }
    }
  });

  console.log('📐 Total edges collected (after splitting):', edges.length);

  // Remove duplicate edges (internal edges cancel out)
  const edgeMap = new Map<string, number>();

  edges.forEach(edge => {
    // Normalize edge (ensure consistent direction for comparison)
    const key = edge.dir === 'h'
      ? `h:${Math.min(edge.x1, edge.x2)},${edge.y1}:${Math.max(edge.x1, edge.x2)},${edge.y2}`
      : `v:${edge.x1},${Math.min(edge.y1, edge.y2)}:${edge.x2},${Math.max(edge.y1, edge.y2)}`;

    edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
  });

  // Keep only edges that appear odd number of times (outer boundary)
  const outerEdges: Edge[] = [];

  edgeMap.forEach((count, key) => {
    if (count % 2 === 1) {
      const [dir, start, end] = key.split(':');
      const [x1, y1] = start.split(',').map(Number);
      const [x2, y2] = end.split(',').map(Number);
      outerEdges.push({ x1, y1, x2, y2, dir: dir as 'h' | 'v' });
    }
  });

  if (outerEdges.length === 0) return [];

  // Connect edges to form a closed polygon
  const polygon: Point[] = [];
  const usedEdges = new Set<number>();

  // Start with the first edge
  let currentEdge = outerEdges[0];
  polygon.push({ x: currentEdge.x1, y: currentEdge.y1 });
  polygon.push({ x: currentEdge.x2, y: currentEdge.y2 });
  usedEdges.add(0);

  // Keep connecting edges until we return to start
  while (usedEdges.size < outerEdges.length) {
    const lastPoint = polygon[polygon.length - 1];

    // Find next connected edge
    let nextEdgeIdx = -1;
    for (let i = 0; i < outerEdges.length; i++) {
      if (usedEdges.has(i)) continue;

      const edge = outerEdges[i];

      // Check if this edge connects to the last point
      if (Math.abs(edge.x1 - lastPoint.x) < 0.01 && Math.abs(edge.y1 - lastPoint.y) < 0.01) {
        nextEdgeIdx = i;
        polygon.push({ x: edge.x2, y: edge.y2 });
        break;
      } else if (Math.abs(edge.x2 - lastPoint.x) < 0.01 && Math.abs(edge.y2 - lastPoint.y) < 0.01) {
        nextEdgeIdx = i;
        polygon.push({ x: edge.x1, y: edge.y1 });
        break;
      }
    }

    if (nextEdgeIdx === -1) break; // No more connected edges
    usedEdges.add(nextEdgeIdx);
  }

  // Remove last point if it's the same as the first (closing point)
  if (polygon.length > 1) {
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01) {
      polygon.pop();
    }
  }

  // Remove collinear points (points that lie on the same line)
  const simplified: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const prev = polygon[(i - 1 + polygon.length) % polygon.length];
    const curr = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    // Check if curr is collinear with prev and next
    const isCollinear =
      (Math.abs(prev.x - curr.x) < 0.01 && Math.abs(curr.x - next.x) < 0.01) || // vertical line
      (Math.abs(prev.y - curr.y) < 0.01 && Math.abs(curr.y - next.y) < 0.01);   // horizontal line

    if (!isCollinear) {
      simplified.push(curr);
    }
  }

  const result = simplified.length > 0 ? simplified : polygon;
  console.log('✅ mergeRectangles result:', result.length, 'points:', result);
  return result;
}
