import { Node } from 'reactflow';
import { MIN_SEPARATION_DISTANCE, EDGE_CONTACT_TOLERANCE } from './connectorLogic';

export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  start: Point;
  end: Point;
  side: 'top' | 'bottom' | 'left' | 'right';
}

export interface ShapeEdges {
  nodeId: string;
  edges: Edge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface EdgeProximity {
  sourceNodeId: string;
  targetNodeId: string;
  sourceSide: string;
  targetSide: string;
  distance: number;
  isWithinThreshold: boolean;
  canSuperimpose?: boolean;
  relationshipType?: string;
  proximityType?: 'edge-contact' | 'body-overlap' | 'separation-required' | 'safe-distance';
  isValidAdjacency?: boolean;
}

const EDGE_PROXIMITY_THRESHOLD = 10; // pixels
const SUPERIMPOSE_THRESHOLD = 2; // pixels for exact edge alignment

/**
 * Extract edges from a rectangular shape
 */
function getRectangleEdges(position: Point, width: number, height: number): Edge[] {
  return [
    // Top edge
    {
      start: { x: position.x, y: position.y },
      end: { x: position.x + width, y: position.y },
      side: 'top' as const
    },
    // Bottom edge
    {
      start: { x: position.x, y: position.y + height },
      end: { x: position.x + width, y: position.y + height },
      side: 'bottom' as const
    },
    // Left edge
    {
      start: { x: position.x, y: position.y },
      end: { x: position.x, y: position.y + height },
      side: 'left' as const
    },
    // Right edge
    {
      start: { x: position.x + width, y: position.y },
      end: { x: position.x + width, y: position.y + height },
      side: 'right' as const
    }
  ];
}

/**
 * Extract edges from a polygon shape
 */
function getPolygonEdges(points: Point[]): Edge[] {
  const edges: Edge[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    
    // Determine side based on edge orientation
    let side: Edge['side'] = 'top';
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      side = dx > 0 ? 'right' : 'left';
    } else {
      side = dy > 0 ? 'bottom' : 'top';
    }
    
    edges.push({ start, end, side });
  }
  
  return edges;
}

/**
 * Get all edges from a shape node
 */
export function getShapeEdges(node: Node): ShapeEdges | null {
  const { position, data } = node;
  
  if (!data) return null;
  
  const { shapeType, shapePoints, width = 120, height = 80 } = data;
  
  let edges: Edge[] = [];
  let bounds = {
    minX: position.x,
    maxX: position.x + width,
    minY: position.y,
    maxY: position.y + height
  };
  
  if (shapeType === 'rectangle' || !shapePoints) {
    edges = getRectangleEdges(position, width, height);
  } else if (shapeType === 'polygon' && shapePoints?.length >= 3) {
    // Convert relative points to absolute positions
    const absolutePoints = shapePoints.map((p: Point) => ({
      x: position.x + p.x,
      y: position.y + p.y
    }));
    
    edges = getPolygonEdges(absolutePoints);
    
    // Recalculate bounds for polygon
    bounds = {
      minX: Math.min(...absolutePoints.map((p: Point) => p.x)),
      maxX: Math.max(...absolutePoints.map((p: Point) => p.x)),
      minY: Math.min(...absolutePoints.map((p: Point) => p.y)),
      maxY: Math.max(...absolutePoints.map((p: Point) => p.y))
    };
  }
  
  return {
    nodeId: node.id,
    edges,
    bounds
  };
}

/**
 * Calculate minimum distance between two line segments
 */
function getSegmentDistance(e1: Edge, e2: Edge): number {
  // Helper function to get distance from point to line segment
  function pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    
    if (dx === 0 && dy === 0) {
      // Segment is a point
      return Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
    }
    
    // Parameter t represents position along the segment
    const t = Math.max(0, Math.min(1, 
      ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (dx * dx + dy * dy)
    ));
    
    const projection = {
      x: segStart.x + t * dx,
      y: segStart.y + t * dy
    };
    
    return Math.sqrt((point.x - projection.x) ** 2 + (point.y - projection.y) ** 2);
  }
  
  // Check all four point-to-segment distances
  const distances = [
    pointToSegmentDistance(e1.start, e2.start, e2.end),
    pointToSegmentDistance(e1.end, e2.start, e2.end),
    pointToSegmentDistance(e2.start, e1.start, e1.end),
    pointToSegmentDistance(e2.end, e1.start, e1.end)
  ];
  
  return Math.min(...distances);
}

/**
 * Check if two edges are parallel and aligned (can superimpose)
 */
function areEdgesAligned(e1: Edge, e2: Edge): boolean {
  const dx1 = e1.end.x - e1.start.x;
  const dy1 = e1.end.y - e1.start.y;
  const dx2 = e2.end.x - e2.start.x;
  const dy2 = e2.end.y - e2.start.y;
  
  // Check if edges are parallel
  const cross = dx1 * dy2 - dy1 * dx2;
  const isParallel = Math.abs(cross) < 0.01;
  
  if (!isParallel) return false;
  
  // Check if edges are collinear (on the same line)
  const dx = e2.start.x - e1.start.x;
  const dy = e2.start.y - e1.start.y;
  const cross2 = dx * dy1 - dy * dx1;
  
  return Math.abs(cross2) < SUPERIMPOSE_THRESHOLD;
}

/**
 * Check if edges are opposite sides (compatible for connection)
 */
function areOppositeEdges(side1: string, side2: string): boolean {
  const opposites: Record<string, string> = {
    'top': 'bottom',
    'bottom': 'top',
    'left': 'right',
    'right': 'left'
  };
  
  return opposites[side1] === side2;
}

/**
 * Detect proximity between edges of two shapes
 */
export function detectEdgeProximity(
  sourceNode: Node,
  targetNode: Node,
  threshold: number = EDGE_PROXIMITY_THRESHOLD,
  hasAdjacencyRelationship: boolean = false
): EdgeProximity[] {
  const sourceEdges = getShapeEdges(sourceNode);
  const targetEdges = getShapeEdges(targetNode);
  
  if (!sourceEdges || !targetEdges) return [];
  
  // Quick bounds check to avoid unnecessary calculations
  const boundsDistance = Math.max(
    sourceEdges.bounds.minX - targetEdges.bounds.maxX,
    targetEdges.bounds.minX - sourceEdges.bounds.maxX,
    sourceEdges.bounds.minY - targetEdges.bounds.maxY,
    targetEdges.bounds.minY - sourceEdges.bounds.maxY
  );
  
  // Check if shapes are far enough apart
  if (boundsDistance > Math.max(threshold, MIN_SEPARATION_DISTANCE)) {
    return [];
  }
  
  const proximities: EdgeProximity[] = [];
  
  // Check for body overlap first
  const hasBodyOverlap = checkBodyOverlap(sourceEdges, targetEdges);
  
  if (hasBodyOverlap) {
    // Body overlap is never allowed
    proximities.push({
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      sourceSide: 'all',
      targetSide: 'all',
      distance: 0,
      isWithinThreshold: false,
      canSuperimpose: false,
      proximityType: 'body-overlap',
      isValidAdjacency: false
    });
    return proximities;
  }
  
  // Check each edge pair for edge contact
  let minEdgeDistance = Infinity;
  let bestEdgePair: { source: Edge; target: Edge } | null = null;
  
  for (const sourceEdge of sourceEdges.edges) {
    for (const targetEdge of targetEdges.edges) {
      const distance = getSegmentDistance(sourceEdge, targetEdge);
      
      if (distance < minEdgeDistance) {
        minEdgeDistance = distance;
        bestEdgePair = { source: sourceEdge, target: targetEdge };
      }
      
      // Check for edge contact within tolerance
      if (distance <= EDGE_CONTACT_TOLERANCE) {
        const canConnect = areOppositeEdges(sourceEdge.side, targetEdge.side);
        const areAligned = areEdgesAligned(sourceEdge, targetEdge);
        
        let proximityType: EdgeProximity['proximityType'] = 'safe-distance';
        let isValidAdjacency = false;
        
        if (hasAdjacencyRelationship) {
          // Shapes can be adjacent - edge contact is allowed
          proximityType = 'edge-contact';
          isValidAdjacency = canConnect && areAligned;
        } else {
          // Shapes cannot be adjacent - must maintain separation
          proximityType = 'separation-required';
          isValidAdjacency = false;
        }
        
        proximities.push({
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          sourceSide: sourceEdge.side,
          targetSide: targetEdge.side,
          distance,
          isWithinThreshold: distance <= EDGE_CONTACT_TOLERANCE,
          canSuperimpose: hasAdjacencyRelationship && canConnect && areAligned,
          proximityType,
          isValidAdjacency
        });
      }
    }
  }
  
  // If no edge contacts found, check minimum separation
  if (proximities.length === 0 && bestEdgePair) {
    let proximityType: EdgeProximity['proximityType'] = 'safe-distance';
    let isValidAdjacency = true;
    
    if (!hasAdjacencyRelationship && minEdgeDistance < MIN_SEPARATION_DISTANCE) {
      // Violates minimum separation for non-adjacent shapes
      proximityType = 'separation-required';
      isValidAdjacency = false;
    } else if (hasAdjacencyRelationship && minEdgeDistance <= EDGE_CONTACT_TOLERANCE) {
      // Within edge contact range for adjacent shapes
      proximityType = 'edge-contact';
      isValidAdjacency = true;
    }
    
    proximities.push({
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      sourceSide: bestEdgePair.source.side,
      targetSide: bestEdgePair.target.side,
      distance: minEdgeDistance,
      isWithinThreshold: minEdgeDistance <= threshold,
      canSuperimpose: hasAdjacencyRelationship && minEdgeDistance <= EDGE_CONTACT_TOLERANCE,
      proximityType,
      isValidAdjacency
    });
  }
  
  return proximities;
}

// Helper function to check for body overlap
function checkBodyOverlap(sourceEdges: ShapeEdges, targetEdges: ShapeEdges): boolean {
  // Check if any vertices of one shape are inside the other
  // This is a simplified check - for more accuracy, use proper polygon intersection
  
  const sourceBounds = sourceEdges.bounds;
  const targetBounds = targetEdges.bounds;
  
  // Check if bounding boxes overlap (not just touch)
  const xOverlap = sourceBounds.minX < targetBounds.maxX && sourceBounds.maxX > targetBounds.minX;
  const yOverlap = sourceBounds.minY < targetBounds.maxY && sourceBounds.maxY > targetBounds.minY;
  
  if (xOverlap && yOverlap) {
    // Bounding boxes overlap, need to check actual shape overlap
    // For now, we'll use a simple heuristic: if the centers are too close, it's likely overlap
    const sourceCenterX = (sourceBounds.minX + sourceBounds.maxX) / 2;
    const sourceCenterY = (sourceBounds.minY + sourceBounds.maxY) / 2;
    const targetCenterX = (targetBounds.minX + targetBounds.maxX) / 2;
    const targetCenterY = (targetBounds.minY + targetBounds.maxY) / 2;
    
    const centerDistance = Math.sqrt(
      Math.pow(sourceCenterX - targetCenterX, 2) +
      Math.pow(sourceCenterY - targetCenterY, 2)
    );
    
    // If centers are very close relative to shape sizes, likely overlap
    const avgSourceSize = ((sourceBounds.maxX - sourceBounds.minX) + (sourceBounds.maxY - sourceBounds.minY)) / 2;
    const avgTargetSize = ((targetBounds.maxX - targetBounds.minX) + (targetBounds.maxY - targetBounds.minY)) / 2;
    const minSize = Math.min(avgSourceSize, avgTargetSize);
    
    return centerDistance < minSize * 0.5; // If centers are within half the smaller shape's size
  }
  
  return false;
}

/**
 * Find all edge proximities for a node against all other nodes
 */
export function findAllEdgeProximities(
  draggedNode: Node,
  allNodes: Node[],
  threshold: number = EDGE_PROXIMITY_THRESHOLD
): EdgeProximity[] {
  const proximities: EdgeProximity[] = [];
  
  for (const node of allNodes) {
    if (node.id === draggedNode.id) continue;
    
    const edgeProximities = detectEdgeProximity(draggedNode, node, threshold);
    proximities.push(...edgeProximities);
  }
  
  // Sort by distance (closest first)
  return proximities.sort((a, b) => a.distance - b.distance);
}

/**
 * Calculate repulsion force for prohibited edges
 */
export function calculateRepulsionForce(
  proximity: EdgeProximity,
  minSeparation: number = 20
): { x: number; y: number } {
  if (proximity.distance >= minSeparation) {
    return { x: 0, y: 0 };
  }
  
  // Calculate repulsion strength (stronger as edges get closer)
  const strength = (minSeparation - proximity.distance) / minSeparation;
  const force = strength * 10; // Base force multiplier
  
  // Apply force in opposite direction based on sides
  const forceDirection: Record<string, { x: number; y: number }> = {
    'top': { x: 0, y: -force },
    'bottom': { x: 0, y: force },
    'left': { x: -force, y: 0 },
    'right': { x: force, y: 0 }
  };
  
  return forceDirection[proximity.sourceSide] || { x: 0, y: 0 };
}

/**
 * Calculate magnetic attraction for allowed edges
 */
export function calculateAttractionForce(
  proximity: EdgeProximity,
  snapDistance: number = 15
): { x: number; y: number } {
  if (!proximity.canSuperimpose || proximity.distance > snapDistance) {
    return { x: 0, y: 0 };
  }
  
  // Calculate attraction strength (stronger as edges get closer)
  const strength = (snapDistance - proximity.distance) / snapDistance;
  const force = strength * 5; // Base force multiplier
  
  // Apply force toward the target edge
  const forceDirection: Record<string, { x: number; y: number }> = {
    'top': { x: 0, y: force },
    'bottom': { x: 0, y: -force },
    'left': { x: force, y: 0 },
    'right': { x: -force, y: 0 }
  };
  
  return forceDirection[proximity.sourceSide] || { x: 0, y: 0 };
}