import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Alert, AlertTitle } from '@mui/material';
import { Node } from 'reactflow';
import { ShapePoint, ShapeType, CustomShapeData } from '../types';
import { shapeTemplates } from './ShapeDrawingToolbar';
import { 
  calculateBoundingBox,
  nodeToShapeGeometry,
  findCollisions,
  ShapeGeometry,
  CollisionResult
} from '../utils/shapeCollision';
// import { useAdjacencyConstraints } from '../hooks/useAdjacencyConstraints';

interface ShapeDrawingCanvasProps {
  activeShapeTool: ShapeType | null;
  isDrawing: boolean;
  onShapeComplete: (shapeData: Partial<CustomShapeData>) => void;
  onDrawingStateChange: (isDrawing: boolean) => void;
  canvasWidth: number;
  canvasHeight: number;
  isGridVisible?: boolean;
  isSnapEnabled?: boolean;
  gridSize?: number;
  // New props for collision detection and validation
  nodes?: Node[];
  mode?: 'creation' | 'guided';
  enforceBoundaries?: boolean;
  showValidationFeedback?: boolean;
}

const ShapeDrawingCanvas: React.FC<ShapeDrawingCanvasProps> = ({
  activeShapeTool,
  isDrawing,
  onShapeComplete,
  onDrawingStateChange,
  canvasWidth,
  canvasHeight,
  isGridVisible = false,
  isSnapEnabled = false,
  gridSize = 20,
  nodes = [],
  mode = 'creation',
  enforceBoundaries = false,
  showValidationFeedback = true
}) => {
  const [currentPoints, setCurrentPoints] = useState<ShapePoint[]>([]);
  const [isCurrentlyDrawing, setIsCurrentlyDrawing] = useState(false);
  const [previewPoint, setPreviewPoint] = useState<ShapePoint | null>(null);
  const [collisionState, setCollisionState] = useState<{
    hasCollisions: boolean;
    collisions: Array<{ shape: ShapeGeometry; collision: CollisionResult }>;
    canComplete: boolean;
    validationMessage: string;
  }>({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize adjacency constraints hook (for future use)
  // const adjacencyConstraints = useAdjacencyConstraints(nodes, {
  //   mode: mode,
  //   touchTolerance: 2,
  //   enableRealTimeValidation: mode === 'guided'
  // });

  // Snap point to grid if enabled
  const snapToGrid = useCallback((point: ShapePoint): ShapePoint => {
    if (!isSnapEnabled) return point;
    
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }, [isSnapEnabled, gridSize]);

  // Convert mouse event to canvas coordinates
  const getCanvasPoint = useCallback((event: React.MouseEvent): ShapePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    return snapToGrid(point);
  }, [snapToGrid]);

  // Create temporary shape geometry for preview collision detection
  const createPreviewGeometry = useCallback((
    shapeType: ShapeType,
    points: ShapePoint[],
    previewPt?: ShapePoint
  ): ShapeGeometry | null => {
    if (points.length === 0) return null;

    let previewPoints: ShapePoint[] = [];

    if (shapeType === 'rectangle' && points.length === 1 && previewPt) {
      const startPoint = points[0];
      const width = Math.abs(previewPt.x - startPoint.x);
      const height = Math.abs(previewPt.y - startPoint.y);
      const minX = Math.min(startPoint.x, previewPt.x);
      const minY = Math.min(startPoint.y, previewPt.y);
      
      previewPoints = [
        { x: minX, y: minY },
        { x: minX + width, y: minY },
        { x: minX + width, y: minY + height },
        { x: minX, y: minY + height }
      ];
    } else if (shapeType === 'polygon') {
      previewPoints = [...points];
      if (previewPt && points.length > 0) {
        previewPoints.push(previewPt);
      }
    } else {
      previewPoints = [...points];
    }

    if (previewPoints.length < 2) return null;

    const boundingBox = calculateBoundingBox(previewPoints);
    const edges: Array<{ start: ShapePoint; end: ShapePoint }> = [];
    
    for (let i = 0; i < previewPoints.length; i++) {
      const start = previewPoints[i];
      const end = previewPoints[(i + 1) % previewPoints.length];
      edges.push({ start, end });
    }

    return {
      id: 'preview',
      type: shapeType === 'rectangle' ? 'rectangle' : 'polygon',
      boundingBox,
      vertices: previewPoints,
      edges
    };
  }, []);

  // Check collisions and validate current preview shape
  const validatePreviewShape = useCallback(async () => {
    if (!isCurrentlyDrawing || !activeShapeTool || currentPoints.length === 0) {
      setCollisionState({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
      return;
    }

    const previewGeometry = createPreviewGeometry(activeShapeTool, currentPoints, previewPoint || undefined);
    if (!previewGeometry) {
      setCollisionState({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
      return;
    }

    // Convert existing nodes to geometries for collision detection
    const existingGeometries: ShapeGeometry[] = [];
    for (const node of nodes) {
      const geometry = nodeToShapeGeometry(node);
      if (geometry) {
        existingGeometries.push(geometry);
      }
    }

    // Find collisions with existing shapes
    const collisions = findCollisions(previewGeometry, existingGeometries, 2);
    const hasCollisions = collisions.length > 0;

    let canComplete = true;
    let validationMessage = '';

    // In guided mode, check adjacency constraints if there are collisions
    if (mode === 'guided' && hasCollisions) {
      const touchingShapes = collisions.filter(c => 
        c.collision.collisionType === 'edge-contact' || 
        c.collision.collisionType === 'edge-alignment' ||
        c.collision.collisionType === 'near-proximity'
      );
      
      const overlappingShapes = collisions.filter(c => 
        c.collision.collisionType === 'body-overlap'
      );

      // Always block overlapping shapes
      if (overlappingShapes.length > 0) {
        canComplete = false;
        validationMessage = 'Shape overlaps with existing shapes';
      } else if (touchingShapes.length > 0 && enforceBoundaries) {
        // For touching shapes, would need to check adjacency rules
        // For now, show warning but allow placement
        validationMessage = 'Shape will touch existing shapes';
      }
    }

    // In creation mode, only block overlaps if enforceBoundaries is true
    if (mode === 'creation' && enforceBoundaries && hasCollisions) {
      const overlappingShapes = collisions.filter(c => 
        c.collision.collisionType === 'body-overlap'
      );
      
      if (overlappingShapes.length > 0) {
        canComplete = false;
        validationMessage = 'Shape overlaps with existing shapes';
      }
    }

    setCollisionState({
      hasCollisions,
      collisions,
      canComplete,
      validationMessage
    });
  }, [isCurrentlyDrawing, activeShapeTool, currentPoints, previewPoint, nodes, mode, enforceBoundaries, createPreviewGeometry]);

  // Handle canvas click for polygon drawing
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!activeShapeTool) return;

    const point = getCanvasPoint(event);

    if (activeShapeTool === 'rectangle') {
      if (!isCurrentlyDrawing) {
        // Start rectangle
        setCurrentPoints([point]);
        setIsCurrentlyDrawing(true);
        onDrawingStateChange(true);
      } else {
        // Check if we can complete the rectangle
        if (!collisionState.canComplete && enforceBoundaries) {
          return; // Block completion if there are constraint violations
        }

        // Complete rectangle
        const startPoint = currentPoints[0];
        const width = Math.abs(point.x - startPoint.x);
        const height = Math.abs(point.y - startPoint.y);
        
        const finalPoints = [
          { x: Math.min(startPoint.x, point.x), y: Math.min(startPoint.y, point.y) },
          { x: Math.min(startPoint.x, point.x) + width, y: Math.min(startPoint.y, point.y) + height }
        ];

        onShapeComplete({
          shapeType: 'rectangle',
          shapePoints: finalPoints,
          width,
          height
        });

        setCurrentPoints([]);
        setIsCurrentlyDrawing(false);
        setPreviewPoint(null);
        setCollisionState({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
        onDrawingStateChange(false);
      }
    } else if (activeShapeTool === 'polygon') {
      if (!isCurrentlyDrawing) {
        // Start polygon
        setCurrentPoints([point]);
        setIsCurrentlyDrawing(true);
        onDrawingStateChange(true);
      } else {
        // Add point to polygon
        setCurrentPoints(prev => [...prev, point]);
      }
    } else if (['L-shape', 'U-shape', 'T-shape'].includes(activeShapeTool)) {
      // Handle template shapes
      const template = shapeTemplates.find(t => t.shapeType === activeShapeTool);
      if (template) {
        // Position template at click point
        const offsetPoints = template.defaultPoints.map(p => ({
          x: p.x + point.x,
          y: p.y + point.y
        }));

        // For template shapes, check collision before completing
        const templateGeometry = {
          id: 'template-preview',
          type: 'polygon' as const,
          boundingBox: calculateBoundingBox(offsetPoints),
          vertices: offsetPoints,
          edges: offsetPoints.map((p, i) => ({
            start: p,
            end: offsetPoints[(i + 1) % offsetPoints.length]
          }))
        };

        const existingGeometries: ShapeGeometry[] = [];
        for (const node of nodes) {
          const geometry = nodeToShapeGeometry(node);
          if (geometry) {
            existingGeometries.push(geometry);
          }
        }

        const collisions = findCollisions(templateGeometry, existingGeometries, 2);
        const hasOverlaps = collisions.some(c => c.collision.collisionType === 'body-overlap');

        if (hasOverlaps && enforceBoundaries) {
          return; // Block template placement if it would overlap
        }

        onShapeComplete({
          shapeType: activeShapeTool,
          shapePoints: offsetPoints,
          width: template.defaultWidth,
          height: template.defaultHeight
        });
      }
    }
  }, [activeShapeTool, isCurrentlyDrawing, currentPoints, getCanvasPoint, onShapeComplete, onDrawingStateChange, collisionState.canComplete, enforceBoundaries, nodes]);

  // Handle mouse move for preview
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!activeShapeTool || !isCurrentlyDrawing) return;

    const point = getCanvasPoint(event);
    setPreviewPoint(point);
  }, [activeShapeTool, isCurrentlyDrawing, getCanvasPoint]);

  // Validate preview whenever points or preview point changes
  useEffect(() => {
    validatePreviewShape();
  }, [validatePreviewShape]);

  // Handle double-click to complete polygon
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (activeShapeTool === 'polygon' && isCurrentlyDrawing && currentPoints.length >= 3) {
      event.preventDefault();
      
      // Check if we can complete the polygon
      if (!collisionState.canComplete && enforceBoundaries) {
        return; // Block completion if there are constraint violations
      }

      // Calculate bounding box
      const minX = Math.min(...currentPoints.map(p => p.x));
      const maxX = Math.max(...currentPoints.map(p => p.x));
      const minY = Math.min(...currentPoints.map(p => p.y));
      const maxY = Math.max(...currentPoints.map(p => p.y));

      onShapeComplete({
        shapeType: 'polygon',
        shapePoints: currentPoints,
        width: maxX - minX,
        height: maxY - minY
      });

      setCurrentPoints([]);
      setIsCurrentlyDrawing(false);
      setPreviewPoint(null);
      setCollisionState({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
      onDrawingStateChange(false);
    }
  }, [activeShapeTool, isCurrentlyDrawing, currentPoints, onShapeComplete, onDrawingStateChange, collisionState.canComplete, enforceBoundaries]);

  // Generate preview path
  const generatePreviewPath = useCallback(() => {
    if (currentPoints.length === 0) return '';

    if (activeShapeTool === 'rectangle' && previewPoint) {
      const startPoint = currentPoints[0];
      const width = Math.abs(previewPoint.x - startPoint.x);
      const height = Math.abs(previewPoint.y - startPoint.y);
      const minX = Math.min(startPoint.x, previewPoint.x);
      const minY = Math.min(startPoint.y, previewPoint.y);
      
      return `M ${minX} ${minY} L ${minX + width} ${minY} L ${minX + width} ${minY + height} L ${minX} ${minY + height} Z`;
    }

    if (activeShapeTool === 'polygon') {
      let path = `M ${currentPoints[0].x} ${currentPoints[0].y}`;
      for (let i = 1; i < currentPoints.length; i++) {
        path += ` L ${currentPoints[i].x} ${currentPoints[i].y}`;
      }
      if (previewPoint && currentPoints.length > 0) {
        path += ` L ${previewPoint.x} ${previewPoint.y}`;
      }
      return path;
    }

    return '';
  }, [currentPoints, previewPoint, activeShapeTool]);

  // Get preview shape color based on collision state
  const getPreviewShapeColor = useCallback(() => {
    if (!collisionState.hasCollisions) {
      return { fill: 'rgba(25, 118, 210, 0.2)', stroke: 'rgba(25, 118, 210, 0.8)' };
    }

    if (!collisionState.canComplete) {
      return { fill: 'rgba(244, 67, 54, 0.2)', stroke: 'rgba(244, 67, 54, 0.8)' };
    }

    return { fill: 'rgba(255, 152, 0, 0.2)', stroke: 'rgba(255, 152, 0, 0.8)' };
  }, [collisionState]);

  // Clear drawing when tool changes
  useEffect(() => {
    if (!activeShapeTool) {
      setCurrentPoints([]);
      setIsCurrentlyDrawing(false);
      setPreviewPoint(null);
      setCollisionState({ hasCollisions: false, collisions: [], canComplete: true, validationMessage: '' });
      onDrawingStateChange(false);
    }
  }, [activeShapeTool, onDrawingStateChange]);

  if (!activeShapeTool) return null;

  return (
    <Box
      ref={canvasRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        cursor: activeShapeTool ? 'crosshair' : 'default',
        zIndex: 1000, // Above other canvas elements
        pointerEvents: isDrawing || activeShapeTool ? 'all' : 'none',
      }}
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
    >
      {/* Grid */}
      {isGridVisible && (
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
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
                stroke="#e0e0e0"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      )}

      {/* Drawing Preview */}
      {(isCurrentlyDrawing || currentPoints.length > 0) && (
        <svg
          width={canvasWidth}
          height={canvasHeight}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          {/* Collision highlights for existing shapes */}
          {collisionState.hasCollisions && collisionState.collisions.map((collision, index) => (
            <g key={`collision-${index}`}>
              {/* Highlight colliding shape */}
              <path
                d={`M ${collision.shape.vertices.map((v, i) => 
                  `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`
                ).join(' ')} Z`}
                fill="rgba(244, 67, 54, 0.15)"
                stroke="rgba(244, 67, 54, 0.6)"
                strokeWidth="2"
                strokeDasharray="3,3"
              />
              {/* Collision points */}
              {collision.collision.collisionPoints.map((point, pointIndex) => (
                <circle
                  key={`collision-point-${index}-${pointIndex}`}
                  cx={point.x}
                  cy={point.y}
                  r={3}
                  fill="rgba(244, 67, 54, 0.8)"
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))}
            </g>
          ))}

          {/* Preview path */}
          <path
            d={generatePreviewPath()}
            fill={getPreviewShapeColor().fill}
            stroke={getPreviewShapeColor().stroke}
            strokeWidth="2"
            strokeDasharray={collisionState.canComplete ? "5,5" : "2,8"}
          />

          {/* Current points */}
          {currentPoints.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={collisionState.canComplete ? "#1976d2" : "#f44336"}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}

          {/* Preview point */}
          {previewPoint && isCurrentlyDrawing && (
            <circle
              cx={previewPoint.x}
              cy={previewPoint.y}
              r={3}
              fill={collisionState.canComplete ? "rgba(25, 118, 210, 0.6)" : "rgba(244, 67, 54, 0.6)"}
              stroke="#fff"
              strokeWidth="1"
            />
          )}

          {/* Visual constraint zones */}
          {mode === 'guided' && isCurrentlyDrawing && (
            <g>
              {/* Create visual zones around existing shapes */}
              {nodes.map((node) => {
                const geometry = nodeToShapeGeometry(node);
                if (!geometry) return null;
                
                return (
                  <g key={`zone-${node.id}`}>
                    {/* Adjacency zone - shows where shapes can touch */}
                    <path
                      d={`M ${geometry.vertices.map((v, i) => 
                        `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`
                      ).join(' ')} Z`}
                      fill="none"
                      stroke="rgba(76, 175, 80, 0.4)"
                      strokeWidth="3"
                      strokeDasharray="10,5"
                      style={{
                        filter: 'drop-shadow(0 0 3px rgba(76, 175, 80, 0.3))'
                      }}
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      )}

      {/* Instructions and Feedback */}
      {activeShapeTool && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: 1,
              borderRadius: 1,
              fontSize: '0.8rem',
              pointerEvents: 'none',
            }}
          >
            {activeShapeTool === 'rectangle' && !isCurrentlyDrawing && 'Click to start rectangle'}
            {activeShapeTool === 'rectangle' && isCurrentlyDrawing && (
              collisionState.canComplete ? 'Click to complete rectangle' : 'Cannot complete - shape conflicts'
            )}
            {activeShapeTool === 'polygon' && !isCurrentlyDrawing && 'Click to start polygon'}
            {activeShapeTool === 'polygon' && isCurrentlyDrawing && (
              collisionState.canComplete 
                ? 'Click to add points, double-click to finish' 
                : 'Cannot complete - shape conflicts'
            )}
            {['L-shape', 'U-shape', 'T-shape'].includes(activeShapeTool) && 'Click to place shape'}
          </Box>

          {/* Validation Feedback */}
          {showValidationFeedback && collisionState.validationMessage && (
            <Box
              sx={{
                position: 'absolute',
                top: 50,
                left: 10,
                maxWidth: 300,
                pointerEvents: 'none',
              }}
            >
              <Alert 
                severity={collisionState.canComplete ? 'warning' : 'error'}
                sx={{ 
                  fontSize: '0.8rem',
                  '& .MuiAlert-message': { py: 0.5 }
                }}
              >
                <AlertTitle sx={{ fontSize: '0.8rem', mb: 0 }}>
                  {collisionState.canComplete ? 'Placement Warning' : 'Cannot Place Shape'}
                </AlertTitle>
                {collisionState.validationMessage}
                {mode === 'guided' && collisionState.hasCollisions && (
                  <Box sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                    {collisionState.collisions.length === 1 
                      ? '1 shape affected' 
                      : `${collisionState.collisions.length} shapes affected`}
                  </Box>
                )}
              </Alert>
            </Box>
          )}

          {/* Collision Legend */}
          {mode === 'guided' && collisionState.hasCollisions && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: 1,
                borderRadius: 1,
                fontSize: '0.7rem',
                pointerEvents: 'none',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: 'rgba(76, 175, 80, 0.4)',
                  border: '2px dashed rgba(76, 175, 80, 0.8)',
                  borderRadius: 2
                }} />
                <span>Valid adjacency zone</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: 'rgba(255, 152, 0, 0.4)',
                  border: '2px solid rgba(255, 152, 0, 0.8)',
                  borderRadius: 2
                }} />
                <span>Shape will touch</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  backgroundColor: 'rgba(244, 67, 54, 0.4)',
                  border: '2px solid rgba(244, 67, 54, 0.8)',
                  borderRadius: 2
                }} />
                <span>Invalid placement</span>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ShapeDrawingCanvas;