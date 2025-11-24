import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { ShapeType, ShapePoint } from '../../types';

export interface DrawingCanvasProps {
  width: number;
  height: number;
  onShapeComplete: (shapeData: {
    shapeType: ShapeType;
    points: ShapePoint[];
    dimensions: { width: number; height: number; area: number };
  }) => void;

  // Grid settings
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;

  // Drawing state
  activeShapeTool: ShapeType | null;
  isDrawing: boolean;
  onDrawingStateChange: (drawing: boolean) => void;

  // Styling
  backgroundColor?: string;
  gridColor?: string;
}

interface DrawingState {
  isDrawing: boolean;
  currentPoints: ShapePoint[];
  previewPoint: ShapePoint | null;
  shapeType: ShapeType | null;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  width,
  height,
  onShapeComplete,
  gridSize = 20,
  showGrid = true,
  snapToGrid = true,
  activeShapeTool,
  isDrawing,
  onDrawingStateChange,
  backgroundColor = '#f8f9fa',
  gridColor = '#e0e0e0',
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPoints: [],
    previewPoint: null,
    shapeType: null,
  });

  // Convert mouse coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback((event: React.MouseEvent): ShapePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Snap to grid if enabled
    if (snapToGrid) {
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
      };
    }

    return { x, y };
  }, [snapToGrid, gridSize]);

  // Handle mouse down (start drawing)
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!activeShapeTool) return;

    const point = getCanvasCoordinates(event);

    if (activeShapeTool === 'rectangle') {
      // Rectangle: start with first corner
      setDrawingState({
        isDrawing: true,
        currentPoints: [point],
        previewPoint: null,
        shapeType: 'rectangle',
      });
      onDrawingStateChange(true);
    } else if (activeShapeTool === 'polygon') {
      // Polygon: add points on each click
      if (!drawingState.isDrawing) {
        // Start new polygon
        setDrawingState({
          isDrawing: true,
          currentPoints: [point],
          previewPoint: null,
          shapeType: 'polygon',
        });
        onDrawingStateChange(true);
      } else {
        // Add point to existing polygon
        setDrawingState(prev => ({
          ...prev,
          currentPoints: [...prev.currentPoints, point],
        }));
      }
    } else if (activeShapeTool === 'circle') {
      // Circle: center point first
      setDrawingState({
        isDrawing: true,
        currentPoints: [point],
        previewPoint: null,
        shapeType: 'circle',
      });
      onDrawingStateChange(true);
    } else if (activeShapeTool === 'triangle') {
      // Triangle: 3 clicks for 3 vertices
      if (!drawingState.isDrawing) {
        setDrawingState({
          isDrawing: true,
          currentPoints: [point],
          previewPoint: null,
          shapeType: 'triangle',
        });
        onDrawingStateChange(true);
      } else if (drawingState.currentPoints.length < 2) {
        setDrawingState(prev => ({
          ...prev,
          currentPoints: [...prev.currentPoints, point],
        }));
      } else {
        // Third click completes the triangle
        const finalPoints = [...drawingState.currentPoints, point];
        const xs = finalPoints.map(p => p.x);
        const ys = finalPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // Shoelace formula for area
        let area = 0;
        for (let i = 0; i < finalPoints.length; i++) {
          const j = (i + 1) % finalPoints.length;
          area += finalPoints[i].x * finalPoints[j].y;
          area -= finalPoints[j].x * finalPoints[i].y;
        }
        area = Math.abs(area) / 2;

        onShapeComplete({
          shapeType: 'triangle',
          points: finalPoints,
          dimensions: {
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY),
            area: Math.round(area),
          },
        });

        // Reset
        setDrawingState({
          isDrawing: false,
          currentPoints: [],
          previewPoint: null,
          shapeType: null,
        });
        onDrawingStateChange(false);
      }
    }
  }, [activeShapeTool, getCanvasCoordinates, drawingState.isDrawing, drawingState.currentPoints, onDrawingStateChange, onShapeComplete]);

  // Handle mouse move (preview)
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!activeShapeTool || !drawingState.isDrawing) return;

    const point = getCanvasCoordinates(event);
    setDrawingState(prev => ({
      ...prev,
      previewPoint: point,
    }));
  }, [activeShapeTool, drawingState.isDrawing, getCanvasCoordinates]);

  // Handle mouse up (complete shape for single-click shapes)
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!activeShapeTool || !drawingState.isDrawing) return;

    const point = getCanvasCoordinates(event);

    if (activeShapeTool === 'rectangle' && drawingState.currentPoints.length === 1) {
      // Complete rectangle
      const startPoint = drawingState.currentPoints[0];
      const width = Math.abs(point.x - startPoint.x);
      const height = Math.abs(point.y - startPoint.y);

      // Minimum size threshold - prevent zero or tiny shapes from accidental clicks
      const MIN_SIZE = 10;
      if (width < MIN_SIZE || height < MIN_SIZE) {
        // Cancel drawing if shape is too small (likely an accidental click)
        setDrawingState({
          isDrawing: false,
          currentPoints: [],
          previewPoint: null,
          shapeType: null,
        });
        onDrawingStateChange(false);
        return;
      }

      const rectPoints = [
        { x: Math.min(startPoint.x, point.x), y: Math.min(startPoint.y, point.y) },
        { x: Math.max(startPoint.x, point.x), y: Math.min(startPoint.y, point.y) },
        { x: Math.max(startPoint.x, point.x), y: Math.max(startPoint.y, point.y) },
        { x: Math.min(startPoint.x, point.x), y: Math.max(startPoint.y, point.y) },
      ];

      onShapeComplete({
        shapeType: 'rectangle',
        points: rectPoints,
        dimensions: {
          width: Math.round(width),
          height: Math.round(height),
          area: Math.round(width * height),
        },
      });

      // Reset drawing state
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null,
        shapeType: null,
      });
      onDrawingStateChange(false);
    } else if (activeShapeTool === 'circle' && drawingState.currentPoints.length === 1) {
      // Complete circle
      const center = drawingState.currentPoints[0];
      const radius = Math.sqrt(
        Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
      );

      // Minimum radius threshold
      const MIN_RADIUS = 5;
      if (radius < MIN_RADIUS) {
        // Cancel drawing if circle is too small
        setDrawingState({
          isDrawing: false,
          currentPoints: [],
          previewPoint: null,
          shapeType: null,
        });
        onDrawingStateChange(false);
        return;
      }

      onShapeComplete({
        shapeType: 'circle',
        points: [center, point],
        dimensions: {
          width: Math.round(radius * 2),
          height: Math.round(radius * 2),
          area: Math.round(Math.PI * radius * radius),
        },
      });

      // Reset drawing state
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null,
        shapeType: null,
      });
      onDrawingStateChange(false);
    }
  }, [activeShapeTool, drawingState, getCanvasCoordinates, onShapeComplete, onDrawingStateChange]);

  // Handle double-click (complete polygon)
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();

    if (activeShapeTool === 'polygon' && drawingState.isDrawing && drawingState.currentPoints.length >= 3) {
      // Calculate bounding box
      const xs = drawingState.currentPoints.map(p => p.x);
      const ys = drawingState.currentPoints.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      // Calculate approximate area using shoelace formula
      let area = 0;
      const points = drawingState.currentPoints;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
      }
      area = Math.abs(area) / 2;

      onShapeComplete({
        shapeType: 'polygon',
        points: drawingState.currentPoints,
        dimensions: {
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY),
          area: Math.round(area),
        },
      });

      // Reset drawing state
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null,
        shapeType: null,
      });
      onDrawingStateChange(false);
    }
  }, [activeShapeTool, drawingState, onShapeComplete, onDrawingStateChange]);

  // Generate SVG path for preview
  const generatePreviewPath = useCallback((): string => {
    if (!drawingState.isDrawing || drawingState.currentPoints.length === 0) return '';

    const { currentPoints, previewPoint, shapeType } = drawingState;

    if (shapeType === 'rectangle' && currentPoints.length === 1 && previewPoint) {
      const start = currentPoints[0];
      const minX = Math.min(start.x, previewPoint.x);
      const minY = Math.min(start.y, previewPoint.y);
      const maxX = Math.max(start.x, previewPoint.x);
      const maxY = Math.max(start.y, previewPoint.y);

      return `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`;
    } else if (shapeType === 'polygon') {
      let path = `M ${currentPoints[0].x} ${currentPoints[0].y}`;
      for (let i = 1; i < currentPoints.length; i++) {
        path += ` L ${currentPoints[i].x} ${currentPoints[i].y}`;
      }
      if (previewPoint) {
        path += ` L ${previewPoint.x} ${previewPoint.y}`;
      }
      return path;
    } else if (shapeType === 'circle' && currentPoints.length === 1 && previewPoint) {
      const center = currentPoints[0];
      const radius = Math.sqrt(
        Math.pow(previewPoint.x - center.x, 2) + Math.pow(previewPoint.y - center.y, 2)
      );
      return `M ${center.x - radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x + radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x - radius} ${center.y}`;
    } else if (shapeType === 'triangle') {
      const points = previewPoint ? [...currentPoints, previewPoint] : currentPoints;
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    }

    return '';
  }, [drawingState]);

  // Reset drawing when tool changes
  useEffect(() => {
    if (!activeShapeTool) {
      setDrawingState({
        isDrawing: false,
        currentPoints: [],
        previewPoint: null,
        shapeType: null,
      });
      onDrawingStateChange(false);
    }
  }, [activeShapeTool, onDrawingStateChange]);

  return (
    <Box
      ref={canvasRef}
      data-testid="drawing-canvas"
      sx={{
        width,
        height,
        backgroundColor,
        position: 'relative',
        cursor: activeShapeTool ? 'crosshair' : 'default',
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
      >
        {/* Grid Pattern */}
        {showGrid && (
          <defs>
            <pattern
              id="grid"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke={gridColor}
                strokeWidth={1}
                opacity={0.5}
              />
            </pattern>
          </defs>
        )}

        {showGrid && (
          <rect
            width={width}
            height={height}
            fill="url(#grid)"
          />
        )}

        {/* Current drawing points */}
        {drawingState.currentPoints.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="#2196f3"
            stroke="#ffffff"
            strokeWidth={2}
          />
        ))}

        {/* Preview point */}
        {drawingState.previewPoint && (
          <circle
            cx={drawingState.previewPoint.x}
            cy={drawingState.previewPoint.y}
            r={3}
            fill="#ff9800"
            opacity={0.7}
          />
        )}

        {/* Preview shape */}
        {drawingState.isDrawing && (
          <path
            d={generatePreviewPath()}
            fill="rgba(33, 150, 243, 0.1)"
            stroke="#2196f3"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {/* Drawing instructions */}
      {activeShapeTool && !drawingState.isDrawing && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 1,
            fontSize: '0.875rem',
            zIndex: 1000,
          }}
        >
          {activeShapeTool === 'rectangle' && 'Click and drag to create a rectangle'}
          {activeShapeTool === 'polygon' && 'Click to add points, double-click to complete'}
          {activeShapeTool === 'circle' && 'Click center, then drag to set radius'}
          {activeShapeTool === 'triangle' && 'Click three points to create a triangle'}
        </Box>
      )}

      {/* Drawing feedback */}
      {drawingState.isDrawing && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(33, 150, 243, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 1,
            fontSize: '0.875rem',
            zIndex: 1000,
          }}
        >
          {drawingState.shapeType === 'polygon' &&
            `Points: ${drawingState.currentPoints.length} (double-click to complete)`}
          {drawingState.shapeType === 'rectangle' && 'Release to complete rectangle'}
          {drawingState.shapeType === 'circle' && 'Release to complete circle'}
          {drawingState.shapeType === 'triangle' && `Points: ${drawingState.currentPoints.length}/3`}
        </Box>
      )}
    </Box>
  );
};

export default DrawingCanvas;