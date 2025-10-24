import React, { useState, useCallback } from 'react';
import { SharedWall, DoorPlacement, getPositionAlongWall, getPositionFromNormalized } from '../../utils/wallDetection';
import { ShapeProperties } from './PropertiesPanel';

interface DoorPlacementOverlayProps {
  sharedWalls: SharedWall[];
  shapes: ShapeProperties[];
  doorPlacements: DoorPlacement[];
  isDoorMode: boolean;
  onDoorPlace: (wallId: string, position: { x: number; y: number }, normalizedPosition: number) => void;
  onDoorMove: (doorId: string, position: { x: number; y: number }, normalizedPosition: number) => void;
  onDoorClick: (doorId: string) => void;
  selectedDoorId: string | null;
}

interface HoverState {
  wallId: string | null;
  position: { x: number; y: number } | null;
}

/**
 * Overlay component that shows:
 * 1. Highlighted shared walls (when in door mode)
 * 2. Door placement indicators
 * 3. Existing doors with interaction
 */
const DoorPlacementOverlay: React.FC<DoorPlacementOverlayProps> = ({
  sharedWalls,
  shapes,
  doorPlacements,
  isDoorMode,
  onDoorPlace,
  onDoorMove,
  onDoorClick,
  selectedDoorId,
}) => {
  const [hoverState, setHoverState] = useState<HoverState>({
    wallId: null,
    position: null,
  });
  const [draggingDoorId, setDraggingDoorId] = useState<string | null>(null);
  const [draggingWallId, setDraggingWallId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);

  // Handle mouse move over shared walls
  const handleWallMouseMove = useCallback(
    (wall: SharedWall, event: React.MouseEvent<SVGLineElement>) => {
      if (!isDoorMode && !draggingDoorId) return;

      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const { position } = getPositionAlongWall(wall, { x, y });

      setHoverState({
        wallId: wall.id,
        position,
      });

      // If dragging a door, update its position
      if (draggingDoorId) {
        const { normalizedPosition } = getPositionAlongWall(wall, { x, y });
        onDoorMove(draggingDoorId, position, normalizedPosition);
      }
    },
    [isDoorMode, draggingDoorId, onDoorMove]
  );

  // Handle click on shared wall to place door
  const handleWallClick = useCallback(
    (wall: SharedWall, event: React.MouseEvent<SVGLineElement>) => {
      if (!isDoorMode || draggingDoorId) return;

      const svg = event.currentTarget.ownerSVGElement;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const { position, normalizedPosition } = getPositionAlongWall(wall, { x, y });
      onDoorPlace(wall.id, position, normalizedPosition);
    },
    [isDoorMode, draggingDoorId, onDoorPlace]
  );

  // Handle mouse leave from walls
  const handleWallMouseLeave = useCallback(() => {
    if (!draggingDoorId) {
      setHoverState({ wallId: null, position: null });
    }
  }, [draggingDoorId]);

  // Handle door drag start
  const handleDoorMouseDown = useCallback((doorId: string, wallId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDraggingDoorId(doorId);
    setDraggingWallId(wallId);
    setDragStartPos({ x: event.clientX, y: event.clientY });
    setHasDragged(false);
  }, []);

  // Handle door drag end
  const handleMouseUp = useCallback(() => {
    setDraggingDoorId(null);
    setDraggingWallId(null);
    setDragStartPos(null);
    // Reset hasDragged after a short delay to allow click handler to check it
    setTimeout(() => setHasDragged(false), 50);
  }, []);

  // Handle global mouse move during drag
  const handleGlobalMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!draggingDoorId || !draggingWallId || !dragStartPos) return;

      // Check if mouse has moved enough to be considered a drag (5px threshold)
      const deltaX = Math.abs(event.clientX - dragStartPos.x);
      const deltaY = Math.abs(event.clientY - dragStartPos.y);
      
      if (deltaX > 5 || deltaY > 5) {
        setHasDragged(true);
      } else {
        return; // Don't update position for small movements
      }

      const wall = sharedWalls.find(w => w.id === draggingWallId);
      if (!wall) return;

      // Find the SVG element to get proper coordinates
      const svgElement = document.querySelector('.door-placement-overlay')?.closest('svg');
      if (!svgElement) return;

      const rect = svgElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const { position, normalizedPosition } = getPositionAlongWall(wall, { x, y });
      onDoorMove(draggingDoorId, position, normalizedPosition);
    },
    [draggingDoorId, draggingWallId, sharedWalls, onDoorMove, dragStartPos]
  );

  React.useEffect(() => {
    if (draggingDoorId) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [draggingDoorId, handleMouseUp, handleGlobalMouseMove]);

  return (
    <g className="door-placement-overlay">
      {/* Render shared walls with highlighting */}
      {isDoorMode && sharedWalls.map((wall) => {
        const isHovered = hoverState.wallId === wall.id;

        return (
          <g key={wall.id}>
            {/* Invisible thick line for easier mouse interaction */}
            <line
              x1={wall.startPoint.x}
              y1={wall.startPoint.y}
              x2={wall.endPoint.x}
              y2={wall.endPoint.y}
              stroke="transparent"
              strokeWidth={20}
              style={{ cursor: 'crosshair' }}
              onMouseMove={(e) => handleWallMouseMove(wall, e)}
              onMouseLeave={handleWallMouseLeave}
              onClick={(e) => handleWallClick(wall, e)}
            />

            {/* Visual highlight for shared wall */}
            <line
              x1={wall.startPoint.x}
              y1={wall.startPoint.y}
              x2={wall.endPoint.x}
              y2={wall.endPoint.y}
              stroke={isHovered ? '#4CAF50' : '#2196F3'}
              strokeWidth={isHovered ? 4 : 3}
              strokeDasharray="8 4"
              opacity={0.7}
              pointerEvents="none"
            />

            {/* Show placement indicator on hover */}
            {isHovered && hoverState.position && (
              <g>
                {/* Crosshair indicator */}
                <circle
                  cx={hoverState.position.x}
                  cy={hoverState.position.y}
                  r={8}
                  fill="#4CAF50"
                  opacity={0.3}
                  pointerEvents="none"
                />
                <circle
                  cx={hoverState.position.x}
                  cy={hoverState.position.y}
                  r={4}
                  fill="#4CAF50"
                  pointerEvents="none"
                />
                
                {/* Perpendicular lines showing door opening direction */}
                <line
                  x1={hoverState.position.x - wall.normalVector.x * 15}
                  y1={hoverState.position.y - wall.normalVector.y * 15}
                  x2={hoverState.position.x + wall.normalVector.x * 15}
                  y2={hoverState.position.y + wall.normalVector.y * 15}
                  stroke="#4CAF50"
                  strokeWidth={2}
                  opacity={0.5}
                  pointerEvents="none"
                />
              </g>
            )}
          </g>
        );
      })}

      {/* Render existing doors - Always visible and clickable */}
      {doorPlacements.map((door) => {
        const sharedWall = sharedWalls.find((w) => w.id === door.sharedWallId);
        if (!sharedWall) return null;

        const position = getPositionFromNormalized(sharedWall, door.normalizedPosition);
        const isSelected = door.id === selectedDoorId;
        const isDragging = door.id === draggingDoorId;

        // Get flow color
        const flowColor =
          door.flowType === 'material'
            ? '#2196F3'
            : door.flowType === 'personnel'
            ? '#4CAF50'
            : '#F44336';

        // Calculate door width along the wall
        const wallAngle = sharedWall.angle;
        const doorHalfWidth = door.width / 2;
        const doorStart = {
          x: position.x - doorHalfWidth * Math.cos(wallAngle),
          y: position.y - doorHalfWidth * Math.sin(wallAngle),
        };
        const doorEnd = {
          x: position.x + doorHalfWidth * Math.cos(wallAngle),
          y: position.y + doorHalfWidth * Math.sin(wallAngle),
        };

        return (
          <g
            key={door.id}
            style={{ 
              cursor: isDragging ? 'grabbing' : 'pointer',
              pointerEvents: 'all' // Always allow interaction with doors
            }}
            onMouseDown={(e) => handleDoorMouseDown(door.id, sharedWall.id, e)}
            onClick={(e) => {
              e.stopPropagation();
              // Only trigger click if we didn't drag (or barely moved)
              if (!hasDragged) {
                onDoorClick(door.id);
              }
            }}
          >
            {/* Invisible hit area for easier interaction */}
            <line
              x1={doorStart.x}
              y1={doorStart.y}
              x2={doorEnd.x}
              y2={doorEnd.y}
              stroke="transparent"
              strokeWidth={30}
              strokeLinecap="round"
              style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
            />

            {/* Door gap (thicker white line) */}
            <line
              x1={doorStart.x}
              y1={doorStart.y}
              x2={doorEnd.x}
              y2={doorEnd.y}
              stroke="#FFFFFF"
              strokeWidth={8}
              strokeLinecap="round"
              pointerEvents="none"
            />

            {/* Door indicator line (colored) */}
            <line
              x1={doorStart.x}
              y1={doorStart.y}
              x2={doorEnd.x}
              y2={doorEnd.y}
              stroke={flowColor}
              strokeWidth={4}
              strokeLinecap="round"
              pointerEvents="none"
            />

            {/* Flow direction arrow(s) */}
            {renderFlowArrow(
              position,
              sharedWall.normalVector,
              door.flowDirection,
              flowColor,
              door.flowDirection === 'unidirectional' && door.unidirectionalDirection === 'fromSecondToFirst'
            )}

            {/* Selection indicator */}
            {isSelected && (
              <>
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={20}
                  fill="none"
                  stroke={flowColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  opacity={0.7}
                />
                
                {/* Handle indicators for dragging */}
                <circle
                  cx={doorStart.x}
                  cy={doorStart.y}
                  r={5}
                  fill={flowColor}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={doorEnd.x}
                  cy={doorEnd.y}
                  r={5}
                  fill={flowColor}
                  stroke="white"
                  strokeWidth={2}
                />
              </>
            )}

            {/* Hover indicator */}
            {!isSelected && !isDragging && (
              <circle
                cx={position.x}
                cy={position.y}
                r={15}
                fill="transparent"
                stroke="transparent"
                strokeWidth={30}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

/**
 * Render flow direction arrow(s) perpendicular to the wall
 */
function renderFlowArrow(
  position: { x: number; y: number },
  normalVector: { x: number; y: number },
  flowDirection: 'unidirectional' | 'bidirectional',
  color: string,
  reverseDirection: boolean = false
): React.ReactElement {
  const arrowLength = 25;
  const arrowHeadSize = 8;

  if (flowDirection === 'bidirectional') {
    // Two arrows pointing in opposite directions
    return (
      <g>
        {/* Arrow pointing one way */}
        {renderSingleArrow(
          position,
          normalVector,
          arrowLength,
          arrowHeadSize,
          color,
          1
        )}
        {/* Arrow pointing opposite way */}
        {renderSingleArrow(
          position,
          normalVector,
          arrowLength,
          arrowHeadSize,
          color,
          -1
        )}
      </g>
    );
  } else {
    // Single arrow - direction controlled by reverseDirection
    return renderSingleArrow(
      position,
      normalVector,
      arrowLength,
      arrowHeadSize,
      color,
      reverseDirection ? -1 : 1
    );
  }
}

/**
 * Render a single arrow
 */
function renderSingleArrow(
  position: { x: number; y: number },
  normalVector: { x: number; y: number },
  length: number,
  headSize: number,
  color: string,
  direction: 1 | -1
): React.ReactElement {
  const startX = position.x - (length / 2) * normalVector.x * direction;
  const startY = position.y - (length / 2) * normalVector.y * direction;
  const endX = position.x + (length / 2) * normalVector.x * direction;
  const endY = position.y + (length / 2) * normalVector.y * direction;

  // Arrow head angle
  const angle = Math.atan2(normalVector.y * direction, normalVector.x * direction);
  const headAngle1 = angle - Math.PI / 6;
  const headAngle2 = angle + Math.PI / 6;

  const head1X = endX - headSize * Math.cos(headAngle1);
  const head1Y = endY - headSize * Math.sin(headAngle1);
  const head2X = endX - headSize * Math.cos(headAngle2);
  const head2Y = endY - headSize * Math.sin(headAngle2);

  return (
    <g opacity={0.8}>
      {/* Arrow shaft */}
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <polyline
        points={`${head1X},${head1Y} ${endX},${endY} ${head2X},${head2Y}`}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
  );
}

export default DoorPlacementOverlay;
