import { ShapeProperties } from './PropertiesPanel';

/**
 * Drawing mode for the canvas
 */
export type DrawingMode =
  | 'select'       // Select and move shapes
  | 'shape'        // Drawing shapes
  | 'door'         // Drawing door connections (3-step: shape1 → shape2 → edge point)
  | 'wall'         // Drawing walls with thickness (NEW)
  | 'measurement'  // Adding measurements and dimensions (NEW)
  | 'pan';         // Pan canvas

/**
 * Connection type between shapes
 */
export type ConnectionType = 'personnel' | 'material';

/**
 * Connection direction
 */
export type ConnectionDirection = 'unidirectional' | 'bidirectional';

/**
 * Connection between two shapes
 */
export interface Connection {
  id: string;
  fromShapeId: string;
  toShapeId: string;
  type: ConnectionType;
  direction: ConnectionDirection;
  createdAt: Date;
  label?: string;
}

/**
 * State for connection drawing
 */
export interface ConnectionDrawingState {
  isDrawing: boolean;
  fromShapeId: string | null;
  hoveredShapeId: string | null;
}

/**
 * State for door connection drawing (3-step process)
 */
export interface DoorConnectionDrawingState {
  step: 'idle' | 'selectFirstShape' | 'selectSecondShape' | 'selectEdgePoint';
  firstShapeId: string | null;
  secondShapeId: string | null;
  edgePoint: { x: number; y: number } | null;
}

/**
 * Check if two rectangles share a common edge (are adjacent)
 */
export function areShapesAdjacent(
  shape1: ShapeProperties,
  shape2: ShapeProperties,
  tolerance: number = 5
): boolean {
  const rect1 = {
    left: shape1.x,
    right: shape1.x + shape1.width,
    top: shape1.y,
    bottom: shape1.y + shape1.height,
  };

  const rect2 = {
    left: shape2.x,
    right: shape2.x + shape2.width,
    top: shape2.y,
    bottom: shape2.y + shape2.height,
  };

  // Check if they share a vertical edge (left-right adjacency)
  const verticallyAligned =
    Math.abs(rect1.right - rect2.left) < tolerance ||
    Math.abs(rect2.right - rect1.left) < tolerance;

  const verticalOverlap =
    !(rect1.bottom < rect2.top || rect1.top > rect2.bottom);

  // Check if they share a horizontal edge (top-bottom adjacency)
  const horizontallyAligned =
    Math.abs(rect1.bottom - rect2.top) < tolerance ||
    Math.abs(rect2.bottom - rect1.top) < tolerance;

  const horizontalOverlap =
    !(rect1.right < rect2.left || rect1.left > rect2.right);

  return (verticallyAligned && verticalOverlap) || (horizontallyAligned && horizontalOverlap);
}

/**
 * Calculate the connection point on the shared edge between two shapes
 */
export function getSharedEdgePoint(
  shape1: ShapeProperties,
  shape2: ShapeProperties
): { x: number; y: number; angle: number } | null {
  const rect1 = {
    left: shape1.x,
    right: shape1.x + shape1.width,
    top: shape1.y,
    bottom: shape1.y + shape1.height,
  };

  const rect2 = {
    left: shape2.x,
    right: shape2.x + shape2.width,
    top: shape2.y,
    bottom: shape2.y + shape2.height,
  };

  const tolerance = 5;

  // Right edge of shape1 touches left edge of shape2
  if (Math.abs(rect1.right - rect2.left) < tolerance) {
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);
    const y = (overlapTop + overlapBottom) / 2;
    return { x: rect1.right, y, angle: 0 }; // Arrow points right
  }

  // Left edge of shape1 touches right edge of shape2
  if (Math.abs(rect1.left - rect2.right) < tolerance) {
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);
    const y = (overlapTop + overlapBottom) / 2;
    return { x: rect1.left, y, angle: 180 }; // Arrow points left
  }

  // Bottom edge of shape1 touches top edge of shape2
  if (Math.abs(rect1.bottom - rect2.top) < tolerance) {
    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const x = (overlapLeft + overlapRight) / 2;
    return { x, y: rect1.bottom, angle: 90 }; // Arrow points down
  }

  // Top edge of shape1 touches bottom edge of shape2
  if (Math.abs(rect1.top - rect2.bottom) < tolerance) {
    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const x = (overlapLeft + overlapRight) / 2;
    return { x, y: rect1.top, angle: 270 }; // Arrow points up
  }

  return null;
}