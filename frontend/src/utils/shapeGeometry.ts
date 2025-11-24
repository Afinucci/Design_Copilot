import { ShapePoint, ShapeType } from '../types';

/**
 * Generates SVG path string for different shape types
 */
export function generateShapePath(
  shapeType: ShapeType,
  points: ShapePoint[],
  width: number = 100,
  height: number = 100
): string {
  if (!points || points.length === 0) return '';

  switch (shapeType) {
    case 'rectangle':
      return generateRectanglePath(points, width, height);

    case 'rounded-rectangle':
      return generateRoundedRectanglePath(points, width, height);

    case 'circle':
      return generateCirclePath(points, width, height);

    case 'ellipse':
      return generateEllipsePath(points, width, height);

    case 'hexagon':
      return generateHexagonPath(points, width, height);

    case 'octagon':
      return generateOctagonPath(points, width, height);

    case 'triangle':
      return generateTrianglePath(points, width, height);

    case 'pentagon':
      return generatePentagonPath(points, width, height);

    case 'cross':
      return generateCrossPath(points, width, height);

    case 'star':
      return generateStarPath(points, width, height);

    case 'diamond':
      return generateDiamondPath(points, width, height);

    case 'trapezoid':
      return generateTrapezoidPath(points, width, height);

    case 'parallelogram':
      return generateParallelogramPath(points, width, height);

    case 'L-shape':
    case 'U-shape':
    case 'T-shape':
    case 'polygon':
    case 'custom':
    case 'freeform':
      return generatePolygonPath(points);

    default:
      return generatePolygonPath(points);
  }
}

/**
 * Generate default points for a shape type
 */
export function generateDefaultPoints(
  shapeType: ShapeType,
  x: number = 0,
  y: number = 0,
  width: number = 120,
  height: number = 80
): ShapePoint[] {
  switch (shapeType) {
    case 'rectangle':
    case 'rounded-rectangle':
      return [
        { x, y },
        { x: x + width, y: y + height }
      ];

    case 'circle':
      return [{ x: x + width / 2, y: y + height / 2 }];

    case 'ellipse':
      return [{ x: x + width / 2, y: y + height / 2 }];

    case 'hexagon':
      return generateHexagonPoints(x, y, width, height);

    case 'octagon':
      return generateOctagonPoints(x, y, width, height);

    case 'triangle':
      return [
        { x: x + width / 2, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ];

    case 'pentagon':
      return generatePentagonPoints(x, y, width, height);

    case 'cross':
      return generateCrossPoints(x, y, width, height);

    case 'star':
      return generateStarPoints(x, y, width, height);

    case 'diamond':
      return [
        { x: x + width / 2, y },
        { x: x + width, y: y + height / 2 },
        { x: x + width / 2, y: y + height },
        { x, y: y + height / 2 }
      ];

    case 'trapezoid':
      return [
        { x: x + width * 0.2, y },
        { x: x + width * 0.8, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
      ];

    case 'parallelogram':
      return [
        { x: x + width * 0.25, y },
        { x: x + width, y },
        { x: x + width * 0.75, y: y + height },
        { x, y: y + height }
      ];

    default:
      return [
        { x, y },
        { x: x + width, y: y + height }
      ];
  }
}

// Path generation functions for each shape type

function generateRectanglePath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 2) return '';
  const [topLeft, bottomRight] = points;
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;
  return `M ${topLeft.x} ${topLeft.y} L ${topLeft.x + w} ${topLeft.y} L ${topLeft.x + w} ${topLeft.y + h} L ${topLeft.x} ${topLeft.y + h} Z`;
}

function generateRoundedRectanglePath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 2) return '';
  const [topLeft, bottomRight] = points;
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;
  const radius = Math.min(w, h) * 0.1; // 10% corner radius

  return `
    M ${topLeft.x + radius} ${topLeft.y}
    L ${topLeft.x + w - radius} ${topLeft.y}
    Q ${topLeft.x + w} ${topLeft.y} ${topLeft.x + w} ${topLeft.y + radius}
    L ${topLeft.x + w} ${topLeft.y + h - radius}
    Q ${topLeft.x + w} ${topLeft.y + h} ${topLeft.x + w - radius} ${topLeft.y + h}
    L ${topLeft.x + radius} ${topLeft.y + h}
    Q ${topLeft.x} ${topLeft.y + h} ${topLeft.x} ${topLeft.y + h - radius}
    L ${topLeft.x} ${topLeft.y + radius}
    Q ${topLeft.x} ${topLeft.y} ${topLeft.x + radius} ${topLeft.y}
    Z
  `.trim();
}

function generateCirclePath(points: ShapePoint[], width: number, height: number): string {
  if (points.length === 0) return '';
  const center = points[0];
  const radius = Math.min(width, height) / 2;

  return `
    M ${center.x - radius} ${center.y}
    A ${radius} ${radius} 0 1 1 ${center.x + radius} ${center.y}
    A ${radius} ${radius} 0 1 1 ${center.x - radius} ${center.y}
  `.trim();
}

function generateEllipsePath(points: ShapePoint[], width: number, height: number): string {
  if (points.length === 0) return '';
  const center = points[0];
  const radiusX = width / 2;
  const radiusY = height / 2;

  return `
    M ${center.x - radiusX} ${center.y}
    A ${radiusX} ${radiusY} 0 1 1 ${center.x + radiusX} ${center.y}
    A ${radiusX} ${radiusY} 0 1 1 ${center.x - radiusX} ${center.y}
  `.trim();
}

function generateHexagonPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 6) {
    // Generate hexagon points if not provided
    const center = points[0] || { x: width / 2, y: height / 2 };
    const hexPoints = generateHexagonPoints(center.x - width / 2, center.y - height / 2, width, height);
    return generatePolygonPath(hexPoints);
  }
  return generatePolygonPath(points);
}

function generateOctagonPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 8) {
    const center = points[0] || { x: width / 2, y: height / 2 };
    const octPoints = generateOctagonPoints(center.x - width / 2, center.y - height / 2, width, height);
    return generatePolygonPath(octPoints);
  }
  return generatePolygonPath(points);
}

function generateTrianglePath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 3) {
    const base = points[0] || { x: 0, y: 0 };
    return generatePolygonPath([
      { x: base.x + width / 2, y: base.y },
      { x: base.x + width, y: base.y + height },
      { x: base.x, y: base.y + height }
    ]);
  }
  return generatePolygonPath(points);
}

function generatePentagonPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 5) {
    const center = points[0] || { x: width / 2, y: height / 2 };
    const pentPoints = generatePentagonPoints(center.x - width / 2, center.y - height / 2, width, height);
    return generatePolygonPath(pentPoints);
  }
  return generatePolygonPath(points);
}

function generateCrossPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 12) {
    const base = points[0] || { x: 0, y: 0 };
    const crossPoints = generateCrossPoints(base.x, base.y, width, height);
    return generatePolygonPath(crossPoints);
  }
  return generatePolygonPath(points);
}

function generateStarPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 10) {
    const center = points[0] || { x: width / 2, y: height / 2 };
    const starPoints = generateStarPoints(center.x - width / 2, center.y - height / 2, width, height);
    return generatePolygonPath(starPoints);
  }
  return generatePolygonPath(points);
}

function generateDiamondPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 4) {
    const base = points[0] || { x: 0, y: 0 };
    return generatePolygonPath([
      { x: base.x + width / 2, y: base.y },
      { x: base.x + width, y: base.y + height / 2 },
      { x: base.x + width / 2, y: base.y + height },
      { x: base.x, y: base.y + height / 2 }
    ]);
  }
  return generatePolygonPath(points);
}

function generateTrapezoidPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 4) {
    const base = points[0] || { x: 0, y: 0 };
    return generatePolygonPath([
      { x: base.x + width * 0.2, y: base.y },
      { x: base.x + width * 0.8, y: base.y },
      { x: base.x + width, y: base.y + height },
      { x: base.x, y: base.y + height }
    ]);
  }
  return generatePolygonPath(points);
}

function generateParallelogramPath(points: ShapePoint[], width: number, height: number): string {
  if (points.length < 4) {
    const base = points[0] || { x: 0, y: 0 };
    return generatePolygonPath([
      { x: base.x + width * 0.25, y: base.y },
      { x: base.x + width, y: base.y },
      { x: base.x + width * 0.75, y: base.y + height },
      { x: base.x, y: base.y + height }
    ]);
  }
  return generatePolygonPath(points);
}

function generatePolygonPath(points: ShapePoint[]): string {
  if (points.length === 0) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ' Z';
  return path;
}

// Helper functions to generate points for specific shapes

function generateHexagonPoints(x: number, y: number, width: number, height: number): ShapePoint[] {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const points: ShapePoint[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  return points;
}

function generateOctagonPoints(x: number, y: number, width: number, height: number): ShapePoint[] {
  const inset = 0.3; // How much to cut corners (30% of dimension)
  return [
    { x: x + width * inset, y },
    { x: x + width * (1 - inset), y },
    { x: x + width, y: y + height * inset },
    { x: x + width, y: y + height * (1 - inset) },
    { x: x + width * (1 - inset), y: y + height },
    { x: x + width * inset, y: y + height },
    { x, y: y + height * (1 - inset) },
    { x, y: y + height * inset }
  ];
}

function generatePentagonPoints(x: number, y: number, width: number, height: number): ShapePoint[] {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const points: ShapePoint[] = [];

  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  return points;
}

function generateCrossPoints(x: number, y: number, width: number, height: number): ShapePoint[] {
  const armWidth = width / 3;
  const armHeight = height / 3;

  return [
    { x: x + armWidth, y },
    { x: x + 2 * armWidth, y },
    { x: x + 2 * armWidth, y: y + armHeight },
    { x: x + width, y: y + armHeight },
    { x: x + width, y: y + 2 * armHeight },
    { x: x + 2 * armWidth, y: y + 2 * armHeight },
    { x: x + 2 * armWidth, y: y + height },
    { x: x + armWidth, y: y + height },
    { x: x + armWidth, y: y + 2 * armHeight },
    { x, y: y + 2 * armHeight },
    { x, y: y + armHeight },
    { x: x + armWidth, y: y + armHeight }
  ];
}

function generateStarPoints(x: number, y: number, width: number, height: number): ShapePoint[] {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.4;
  const points: ShapePoint[] = [];

  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    });
  }

  return points;
}

/**
 * Calculate shape dimensions from points
 */
export function calculateShapeDimensions(points: ShapePoint[]): { width: number; height: number } {
  if (points.length === 0) return { width: 0, height: 0 };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Get shape area for display
 */
export function calculateShapeArea(shapeType: ShapeType, width: number, height: number): number {
  switch (shapeType) {
    case 'rectangle':
    case 'rounded-rectangle':
    case 'parallelogram':
      return width * height;

    case 'circle':
      const radius = Math.min(width, height) / 2;
      return Math.PI * radius * radius;

    case 'ellipse':
      return Math.PI * (width / 2) * (height / 2);

    case 'triangle':
      return (width * height) / 2;

    case 'trapezoid':
      // Approximate as average of parallel sides times height
      return width * height * 0.8;

    case 'hexagon':
      // Approximate hexagon area
      const hexRadius = Math.min(width, height) / 2;
      return (3 * Math.sqrt(3) / 2) * hexRadius * hexRadius;

    case 'pentagon':
      // Approximate pentagon area
      const pentRadius = Math.min(width, height) / 2;
      return (5 / 4) * pentRadius * pentRadius * Math.sqrt(5 + 2 * Math.sqrt(5));

    case 'octagon':
      // Approximate octagon area
      const octRadius = Math.min(width, height) / 2;
      return 2 * (1 + Math.sqrt(2)) * octRadius * octRadius;

    case 'diamond':
      return (width * height) / 2;

    case 'cross':
      // Approximate as 5/9 of bounding box
      return width * height * (5 / 9);

    case 'star':
      // Approximate as 40% of bounding box
      return width * height * 0.4;

    case 'L-shape':
      // Approximate as 60% of bounding box
      return width * height * 0.6;

    case 'U-shape':
      // Approximate as 70% of bounding box
      return width * height * 0.7;

    case 'T-shape':
      // Approximate as 65% of bounding box
      return width * height * 0.65;

    default:
      // For custom shapes, use bounding box
      return width * height;
  }
}