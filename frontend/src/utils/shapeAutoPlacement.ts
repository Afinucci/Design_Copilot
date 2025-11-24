/**
 * Shape Auto-Placement Utility
 *
 * Calculates optimal positions for new shapes based on:
 * - Selected shape position and dimensions
 * - Relationship types (adjacent, flow, etc.)
 * - Existing shapes to avoid collisions
 */

import { Node } from 'reactflow';
import { CustomShapeData } from '../types';

interface PlacementOptions {
  selectedShape: Node<CustomShapeData>;
  existingShapes: Node<CustomShapeData>[];
  relationshipType?: string;
  defaultSpacing?: number;
}

interface PlacementResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_SHAPE_WIDTH = 200;
const DEFAULT_SHAPE_HEIGHT = 150;
const DEFAULT_SPACING = 50; // Gap between shapes

/**
 * Get preferred placement direction based on relationship type
 */
function getPreferredDirection(relationshipType?: string): 'right' | 'bottom' | 'left' | 'top' {
  if (!relationshipType) return 'right';

  const directionMap: { [key: string]: 'right' | 'bottom' | 'left' | 'top' } = {
    'MATERIAL_FLOW': 'right',       // Material flows typically left-to-right
    'PERSONNEL_FLOW': 'bottom',     // Personnel flow can be vertical
    'ADJACENT_TO': 'right',         // Adjacent typically side-by-side
    'REQUIRES_ACCESS': 'bottom',    // Access often below
    'SHARES_UTILITY': 'right',      // Shared utilities side-by-side
    'WORKFLOW_SUGGESTION': 'right'  // Workflow progresses left-to-right
  };

  return directionMap[relationshipType] || 'right';
}

/**
 * Calculate candidate positions around the selected shape
 */
function calculateCandidatePositions(
  selectedShape: Node<CustomShapeData>,
  spacing: number,
  preferredDirection: string
): PlacementResult[] {
  const shapeWidth = selectedShape.data.width || DEFAULT_SHAPE_WIDTH;
  const shapeHeight = selectedShape.data.height || DEFAULT_SHAPE_HEIGHT;
  const x = selectedShape.position.x;
  const y = selectedShape.position.y;

  const candidates: PlacementResult[] = [];

  // Right (preferred for most relationships)
  candidates.push({
    x: x + shapeWidth + spacing,
    y: y,
    width: DEFAULT_SHAPE_WIDTH,
    height: DEFAULT_SHAPE_HEIGHT
  });

  // Bottom
  candidates.push({
    x: x,
    y: y + shapeHeight + spacing,
    width: DEFAULT_SHAPE_WIDTH,
    height: DEFAULT_SHAPE_HEIGHT
  });

  // Left
  candidates.push({
    x: x - DEFAULT_SHAPE_WIDTH - spacing,
    y: y,
    width: DEFAULT_SHAPE_WIDTH,
    height: DEFAULT_SHAPE_HEIGHT
  });

  // Top
  candidates.push({
    x: x,
    y: y - DEFAULT_SHAPE_HEIGHT - spacing,
    width: DEFAULT_SHAPE_WIDTH,
    height: DEFAULT_SHAPE_HEIGHT
  });

  // Sort by preferred direction first
  const directionPriority: { [key: string]: number } = {
    'right': preferredDirection === 'right' ? 0 : 3,
    'bottom': preferredDirection === 'bottom' ? 0 : 3,
    'left': preferredDirection === 'left' ? 0 : 3,
    'top': preferredDirection === 'top' ? 0 : 3
  };

  const directions = ['right', 'bottom', 'left', 'top'];
  candidates.sort((a, b) => {
    const aDir = directions[candidates.indexOf(a)];
    const bDir = directions[candidates.indexOf(b)];
    return (directionPriority[aDir] || 99) - (directionPriority[bDir] || 99);
  });

  return candidates;
}

/**
 * Check if a proposed position collides with any existing shapes
 */
function hasCollision(
  candidate: PlacementResult,
  existingShapes: Node<CustomShapeData>[],
  minMargin: number = 20
): boolean {
  for (const shape of existingShapes) {
    const shapeWidth = shape.data.width || DEFAULT_SHAPE_WIDTH;
    const shapeHeight = shape.data.height || DEFAULT_SHAPE_HEIGHT;

    // Check bounding box collision with margin
    const candidateRight = candidate.x + candidate.width + minMargin;
    const candidateBottom = candidate.y + candidate.height + minMargin;
    const shapeRight = shape.position.x + shapeWidth + minMargin;
    const shapeBottom = shape.position.y + shapeHeight + minMargin;

    if (
      candidate.x < shapeRight &&
      candidateRight > shape.position.x &&
      candidate.y < shapeBottom &&
      candidateBottom > shape.position.y
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Find optimal placement for a new shape adjacent to the selected shape
 */
export function calculateOptimalPlacement(options: PlacementOptions): PlacementResult {
  const {
    selectedShape,
    existingShapes,
    relationshipType,
    defaultSpacing = DEFAULT_SPACING
  } = options;

  const preferredDirection = getPreferredDirection(relationshipType);
  const candidates = calculateCandidatePositions(selectedShape, defaultSpacing, preferredDirection);

  // Find first candidate without collision
  for (const candidate of candidates) {
    if (!hasCollision(candidate, existingShapes)) {
      console.log('🎯 Auto-placement: Found collision-free position:', {
        direction: preferredDirection,
        position: { x: candidate.x, y: candidate.y },
        relationshipType
      });
      return candidate;
    }
  }

  // If all positions have collisions, use the preferred direction but offset further
  const fallbackCandidate = candidates[0];
  const offsetMultiplier = 2;

  console.log('🎯 Auto-placement: All positions collide, using fallback with offset');

  return {
    ...fallbackCandidate,
    x: fallbackCandidate.x + (defaultSpacing * offsetMultiplier),
    y: fallbackCandidate.y + (defaultSpacing * offsetMultiplier)
  };
}

/**
 * Calculate position for multiple shapes in a row/column layout
 * Useful when placing multiple suggestions at once
 */
export function calculateBatchPlacement(
  selectedShape: Node<CustomShapeData>,
  count: number,
  existingShapes: Node<CustomShapeData>[],
  spacing: number = DEFAULT_SPACING
): PlacementResult[] {
  const results: PlacementResult[] = [];
  const preferredDirection = 'right'; // Default to horizontal layout

  for (let i = 0; i < count; i++) {
    const basePosition = calculateOptimalPlacement({
      selectedShape,
      existingShapes: [...existingShapes, ...results.map((r, idx) => ({
        id: `temp-${idx}`,
        type: 'customShape',
        position: { x: r.x, y: r.y },
        data: { width: r.width, height: r.height } as CustomShapeData
      } as Node<CustomShapeData>))],
      defaultSpacing: spacing
    });

    // Offset each shape horizontally
    const offset = i * (DEFAULT_SHAPE_WIDTH + spacing);
    results.push({
      ...basePosition,
      x: basePosition.x + offset
    });
  }

  return results;
}
