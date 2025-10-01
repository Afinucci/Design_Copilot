import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Chip, Paper, Tooltip, Badge, IconButton, Alert } from '@mui/material';
import { Build, Edit, Link, LinkOff, Warning, CheckCircle, Crop } from '@mui/icons-material';
import { CustomShapeData, ShapePoint, ResizeHandle, ResizeHandleType, ResizeHandlePosition } from '../types';
import { generateShapePath, calculateShapeArea, calculateShapeDimensions } from '../utils/shapeGeometry';
import './CustomNode.css';

interface Equipment {
  id: string;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  description?: string;
  specifications?: { [key: string]: string };
  maintenanceSchedule?: string;
  status?: 'operational' | 'maintenance' | 'offline';
}

interface CustomShapeNodeProps extends NodeProps<CustomShapeData> {
  onShapeEdit?: (nodeId: string) => void;
  onShapeComplete?: (nodeId: string, points: ShapePoint[]) => void;
  onShapeResize?: (nodeId: string, points: ShapePoint[], width: number, height: number) => void;
}

const CustomShapeNode: React.FC<CustomShapeNodeProps> = ({
  id,
  data,
  selected,
  onShapeEdit,
  onShapeComplete,
  onShapeResize
}) => {
  const {
    label,
    category,
    cleanroomClass,
    color,
    highlighted,
    icon,
    groupId,
    isSelected,
    equipment,
    shapeType,
    shapePoints,
    width,
    height,
    isEditing,
    isResizing,
    rotation = 0,
    assignedNodeId,
    assignedNodeName,
    assignedNodeCategory,
    hasInheritedProperties,
    inheritedRelationships,
    showAssignmentDialog
  } = data;

  // Debug logging removed to prevent render loops

  const [editingPoints, setEditingPoints] = useState<ShapePoint[]>(shapePoints);

  // Resize state management
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizingPoints, setResizingPoints] = useState<ShapePoint[]>(shapePoints);
  const [resizingDimensions, setResizingDimensions] = useState({ width, height });

  // Refs to avoid stale closures during document-level mouse events
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activeResizeHandleRef = useRef<string | null>(null);

  // Local resize mode state
  const [localResizeMode, setLocalResizeMode] = useState(false);

  // Use either the data isResizing flag or local state
  const inResizeMode = isResizing || localResizeMode;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Production':
        return '🏭';
      case 'Quality Control':
        return '🔬';
      case 'Warehouse':
        return '📦';
      case 'Utilities':
        return '⚡';
      case 'Personnel':
        return '👥';
      case 'Support':
        return '🔧';
      case 'None':
        return '⚪';
      default:
        return '🔖';
    }
  };

  // Generate SVG path string from points using the new geometry utility
  const generateSVGPath = useMemo(() => {
    // Use resizing points if in resize mode, otherwise use normal points
    const currentPoints = inResizeMode ? resizingPoints : shapePoints;
    const currentWidth = inResizeMode ? resizingDimensions.width : width || 120;
    const currentHeight = inResizeMode ? resizingDimensions.height : height || 80;

    return generateShapePath(shapeType, currentPoints, currentWidth, currentHeight);
  }, [shapePoints, shapeType, inResizeMode, resizingPoints, resizingDimensions, width, height]);

  // Calculate connection handle positions based on shape
  const calculateHandlePositions = useMemo(() => {
    if (shapePoints.length === 0) return [];

    const handles = [];

    if (shapeType === 'rectangle' && shapePoints.length >= 2) {
      const [topLeft, bottomRight] = shapePoints;
      const centerX = (topLeft.x + bottomRight.x) / 2;
      const centerY = (topLeft.y + bottomRight.y) / 2;

      handles.push(
        { id: 'left', position: Position.Left, x: topLeft.x, y: centerY },
        { id: 'right', position: Position.Right, x: bottomRight.x, y: centerY },
        { id: 'top', position: Position.Top, x: centerX, y: topLeft.y },
        { id: 'bottom', position: Position.Bottom, x: centerX, y: bottomRight.y }
      );
    } else {
      // For polygons, place handles at midpoints of edges
      for (let i = 0; i < shapePoints.length; i++) {
        const current = shapePoints[i];
        const next = shapePoints[(i + 1) % shapePoints.length];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        handles.push({
          id: `edge-${i}`,
          position: Position.Top, // Will be positioned absolutely
          x: midX,
          y: midY
        });
      }
    }

    return handles;
  }, [shapePoints, shapeType]);

  // Calculate resize handle positions
  const calculateResizeHandles = useMemo(() => {
    if (!inResizeMode || resizingPoints.length === 0) return [];

    const handles: ResizeHandle[] = [];

    if (shapeType === 'rectangle' && resizingPoints.length >= 2) {
      const [topLeft, bottomRight] = resizingPoints;
      const centerX = (topLeft.x + bottomRight.x) / 2;
      const centerY = (topLeft.y + bottomRight.y) / 2;

      // Corner handles for rectangles
      handles.push(
        { id: 'resize-tl', type: 'corner', position: 'top-left', x: topLeft.x, y: topLeft.y, cursor: 'nw-resize' },
        { id: 'resize-tr', type: 'corner', position: 'top-right', x: bottomRight.x, y: topLeft.y, cursor: 'ne-resize' },
        { id: 'resize-bl', type: 'corner', position: 'bottom-left', x: topLeft.x, y: bottomRight.y, cursor: 'sw-resize' },
        { id: 'resize-br', type: 'corner', position: 'bottom-right', x: bottomRight.x, y: bottomRight.y, cursor: 'se-resize' },
        // Edge handles for rectangles
        { id: 'resize-t', type: 'edge', position: 'top', x: centerX, y: topLeft.y, cursor: 'n-resize' },
        { id: 'resize-b', type: 'edge', position: 'bottom', x: centerX, y: bottomRight.y, cursor: 's-resize' },
        { id: 'resize-l', type: 'edge', position: 'left', x: topLeft.x, y: centerY, cursor: 'w-resize' },
        { id: 'resize-r', type: 'edge', position: 'right', x: bottomRight.x, y: centerY, cursor: 'e-resize' }
      );
    } else {
      // For polygons, place resize handles at edge midpoints
      for (let i = 0; i < resizingPoints.length; i++) {
        const current = resizingPoints[i];
        const next = resizingPoints[(i + 1) % resizingPoints.length];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        handles.push({
          id: `resize-edge-${i}`,
          type: 'edge',
          position: 'edge-midpoint',
          x: midX,
          y: midY,
          cursor: 'move'
        });
      }
    }

    return handles;
  }, [inResizeMode, resizingPoints, shapeType]);

  // Get display name with Neo4j assignment priority
  const getDisplayName = () => {
    // Priority 1: Always use assigned Neo4j node name if available
    if (assignedNodeName) {
      console.log(`⭐ CustomShapeNode ${id}: Displaying Neo4j assigned name: ${assignedNodeName}`);
      return assignedNodeName;
    }
    // Priority 2: Fall back to label
    console.log(`📝 CustomShapeNode ${id}: Displaying default label: ${label}`);
    return label;
  };

  // Get display category with Neo4j assignment priority
  const getDisplayCategory = () => {
    // Priority 1: Use assigned Neo4j node category if available
    if (assignedNodeCategory && hasInheritedProperties) {
      console.log(`🏷️ CustomShapeNode ${id}: Displaying Neo4j assigned category: ${assignedNodeCategory}`);
      return assignedNodeCategory;
    }
    // Priority 2: Fall back to original category
    return category;
  };

  // Get shape fill color based on assignment status
  const getShapeColor = () => {
    // If assigned to Neo4j node, use a dynamic color based on category
    if (assignedNodeId && assignedNodeName) {
      const assignedCategory = getDisplayCategory();
      console.log(`🎨 CustomShapeNode ${id}: Using Neo4j assigned color for category: ${assignedCategory}`);

      switch (assignedCategory) {
        case 'Production':
          return '#e3f2fd'; // Light blue
        case 'Quality Control':
          return '#f3e5f5'; // Light purple
        case 'Warehouse':
          return '#e8f5e8'; // Light green
        case 'Utilities':
          return '#fff3e0'; // Light orange
        case 'Personnel':
          return '#fce4ec'; // Light pink
        case 'Support':
          return '#f1f8e9'; // Light lime
        default:
          return '#f0f4f8'; // Light blue-grey for assigned but unknown category
      }
    }

    // If assignment dialog is shown, use warning color
    if (showAssignmentDialog) {
      console.log(`⚠️ CustomShapeNode ${id}: Using warning color - needs assignment`);
      return '#fff8e1'; // Light amber
    }

    // Default to provided color or grey
    console.log(`🎨 CustomShapeNode ${id}: Using default color: ${color || '#f5f5f5'}`);
    return color || '#f5f5f5';
  };

  // Determine border color and style based on Neo4j connection state
  const getBorderStyle = () => {
    // Resize mode takes precedence
    if (inResizeMode) {
      return {
        strokeWidth: '3',
        stroke: '#1976d2', // Blue for resize mode
        strokeDasharray: '5 3',
        filter: 'drop-shadow(0 0 12px rgba(25, 118, 210, 0.8))'
      };
    }
    // Edit mode takes precedence
    if (isEditing) {
      return {
        strokeWidth: '3',
        stroke: '#ff9800', // Orange for edit mode
        strokeDasharray: '5 3',
        filter: 'drop-shadow(0 0 12px rgba(255, 152, 0, 0.8))'
      };
    }
    if (assignedNodeId && assignedNodeName) {
      return {
        strokeWidth: '3',
        stroke: '#2e7d32', // Strong green for Neo4j assigned
        strokeDasharray: 'none',
        filter: 'drop-shadow(0 0 8px rgba(46, 125, 50, 0.6))'
      };
    }
    if (showAssignmentDialog) {
      console.log(`🔶 CustomShapeNode ${id}: Using needs-assignment border style`);
      return {
        strokeWidth: '3',
        stroke: '#ff9800', // Amber for needs assignment
        strokeDasharray: '8 4',
        filter: 'drop-shadow(0 0 8px rgba(255, 152, 0, 0.6))'
      };
    }
    if (isSelected) {
      return {
        strokeWidth: '3',
        stroke: '#9c27b0', // Purple for group selection
        strokeDasharray: 'none',
        filter: 'drop-shadow(0 0 8px rgba(156, 39, 176, 0.6))'
      };
    }
    if (selected) {
      return {
        strokeWidth: '2',
        stroke: '#1976d2', // Blue for normal selection
        strokeDasharray: 'none',
        filter: 'drop-shadow(0 0 6px rgba(25, 118, 210, 0.6))'
      };
    }
    if (highlighted) {
      return {
        strokeWidth: '2',
        stroke: '#ff9800', // Orange for validation highlight
        strokeDasharray: 'none',
        filter: 'drop-shadow(0 0 6px rgba(255, 152, 0, 0.6))'
      };
    }
    if (groupId) {
      return {
        strokeWidth: '2',
        stroke: '#4caf50', // Green for grouped nodes
        strokeDasharray: 'none',
        filter: 'drop-shadow(0 0 4px rgba(76, 175, 80, 0.4))'
      };
    }

    // Default state - unassigned
    console.log(`🔘 CustomShapeNode ${id}: Using default border style`);
    return {
      strokeWidth: '1',
      stroke: '#ccc',
      strokeDasharray: 'none',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
    };
  };

  // Toggle resize mode function
  const toggleResizeMode = useCallback(() => {
    const newResizeMode = !localResizeMode;
    setLocalResizeMode(newResizeMode);

    if (newResizeMode) {
      console.log('🎯 Entering resize mode for shape:', id);
      // Initialize resizing state with current shape data
      setResizingPoints([...shapePoints]);
      setResizingDimensions({ width: width || 120, height: height || 80 });
    } else {
      console.log('✅ Exiting resize mode for shape:', id);
      // Reset resize state
      setIsDragging(false);
      setActiveResizeHandle(null);
      setDragStartPos(null);
      isDraggingRef.current = false;
      activeResizeHandleRef.current = null;
      dragStartPosRef.current = null;
    }
  }, [localResizeMode, id, shapePoints, width, height]);

  const handleEditClick = useCallback(() => {
    console.log('✏️ Edit button clicked for shape:', id);
    if (onShapeEdit) {
      onShapeEdit(id);
    }
    // Enable editing mode for this shape
    setEditingPoints([...shapePoints]);
  }, [id, onShapeEdit, shapePoints]);

  const handlePointDrag = useCallback((pointIndex: number, newX: number, newY: number) => {
    if (!isEditing) return;

    const newPoints = [...editingPoints];
    newPoints[pointIndex] = { x: newX, y: newY };
    setEditingPoints(newPoints);
  }, [isEditing, editingPoints]);

  // Resize drag handlers
  const handleResizeStart = useCallback((handleId: string, startX: number, startY: number) => {
    console.log('🎯 Resize start triggered:', { handleId, startX, startY, inResizeMode });
    if (!inResizeMode) {
      console.log('❌ Cannot start resize - not in resize mode');
      return;
    }

    console.log('✅ Starting resize operation');
    setIsDragging(true);
    setActiveResizeHandle(handleId);
    setDragStartPos({ x: startX, y: startY });
    isDraggingRef.current = true;
    activeResizeHandleRef.current = handleId;
    dragStartPosRef.current = { x: startX, y: startY };

    // Initialize resizing state with current shape data
    setResizingPoints([...shapePoints]);
    setResizingDimensions({ width: width || 120, height: height || 80 });
  }, [inResizeMode, shapePoints, width, height]);

  const handleResizeDrag = useCallback((currentX: number, currentY: number) => {
    const dragging = isDraggingRef.current;
    const startPos = dragStartPosRef.current;
    const handleId = activeResizeHandleRef.current;
    console.log('🔄 Resize drag called:', { dragging, startPos, handleId, currentX, currentY });
    if (!dragging || !startPos || !handleId) {
      console.log('❌ Resize drag blocked:', { dragging, hasStart: !!startPos, handleId });
      return;
    }

    const deltaX = currentX - startPos.x;
    const deltaY = currentY - startPos.y;

    if (shapeType === 'rectangle' && shapePoints.length >= 2) {
      const [topLeft, bottomRight] = shapePoints;
      let newTopLeft = { ...topLeft };
      let newBottomRight = { ...bottomRight };

      // Handle different resize directions
      switch (handleId) {
        case 'resize-tl': // Top-left corner
          newTopLeft.x = topLeft.x + deltaX;
          newTopLeft.y = topLeft.y + deltaY;
          break;
        case 'resize-tr': // Top-right corner
          newBottomRight.x = bottomRight.x + deltaX;
          newTopLeft.y = topLeft.y + deltaY;
          break;
        case 'resize-bl': // Bottom-left corner
          newTopLeft.x = topLeft.x + deltaX;
          newBottomRight.y = bottomRight.y + deltaY;
          break;
        case 'resize-br': // Bottom-right corner
          newBottomRight.x = bottomRight.x + deltaX;
          newBottomRight.y = bottomRight.y + deltaY;
          break;
        case 'resize-t': // Top edge
          newTopLeft.y = topLeft.y + deltaY;
          break;
        case 'resize-b': // Bottom edge
          newBottomRight.y = bottomRight.y + deltaY;
          break;
        case 'resize-l': // Left edge
          newTopLeft.x = topLeft.x + deltaX;
          break;
        case 'resize-r': // Right edge
          newBottomRight.x = bottomRight.x + deltaX;
          break;
      }

      // Ensure minimum size
      const minSize = 50;
      if (newBottomRight.x - newTopLeft.x < minSize) {
        if (handleId.includes('l')) newTopLeft.x = newBottomRight.x - minSize;
        else newBottomRight.x = newTopLeft.x + minSize;
      }
      if (newBottomRight.y - newTopLeft.y < minSize) {
        if (handleId.includes('t')) newTopLeft.y = newBottomRight.y - minSize;
        else newBottomRight.y = newTopLeft.y + minSize;
      }

      const newPoints = [newTopLeft, newBottomRight];
      const newWidth = newBottomRight.x - newTopLeft.x;
      const newHeight = newBottomRight.y - newTopLeft.y;

      setResizingPoints(newPoints);
      setResizingDimensions({ width: newWidth, height: newHeight });
    } else {
      // For polygons, handle edge midpoint dragging
      if (handleId.startsWith('resize-edge-')) {
        const edgeIndex = parseInt(handleId.split('-')[2]);
        const newPoints = [...resizingPoints];

        // Move the two points of the edge
        const current = newPoints[edgeIndex];
        const next = newPoints[(edgeIndex + 1) % newPoints.length];

        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        const offsetX = currentX - midX;
        const offsetY = currentY - midY;

        newPoints[edgeIndex] = { x: current.x + offsetX, y: current.y + offsetY };
        newPoints[(edgeIndex + 1) % newPoints.length] = { x: next.x + offsetX, y: next.y + offsetY };

        setResizingPoints(newPoints);

        // Calculate new bounding box
        const minX = Math.min(...newPoints.map(p => p.x));
        const maxX = Math.max(...newPoints.map(p => p.x));
        const minY = Math.min(...newPoints.map(p => p.y));
        const maxY = Math.max(...newPoints.map(p => p.y));

        setResizingDimensions({
          width: maxX - minX,
          height: maxY - minY
        });
      }
    }
  }, [isDragging, dragStartPos, activeResizeHandle, shapeType, shapePoints, resizingPoints]);

  const handleResizeEnd = useCallback(() => {
    if (!isDraggingRef.current) return;

    console.log('🎯 Resize end:', { resizingPoints, resizingDimensions });

    setIsDragging(false);
    setActiveResizeHandle(null);
    setDragStartPos(null);
    isDraggingRef.current = false;
    activeResizeHandleRef.current = null;
    dragStartPosRef.current = null;

    // Call the resize callback with final dimensions
    if (onShapeResize && resizingPoints.length > 0) {
      const finalWidth = resizingDimensions.width ?? width ?? 120;
      const finalHeight = resizingDimensions.height ?? height ?? 80;
      console.log('📞 Calling onShapeResize:', { id, resizingPoints, finalWidth, finalHeight });
      onShapeResize(id, resizingPoints, finalWidth, finalHeight);
    }
  }, [onShapeResize, id, resizingPoints, resizingDimensions, width, height]);

  const handleEditComplete = useCallback(() => {
    if (onShapeComplete) {
      onShapeComplete(id, editingPoints);
    }
  }, [id, editingPoints, onShapeComplete]);

  // Get current display values
  const displayName = getDisplayName();
  const displayCategory = getDisplayCategory();
  const shapeColor = getShapeColor();

  return (
    <Box
      sx={{
        position: 'relative',
        width: width,
        height: height,
        minWidth: 120,
        minHeight: 80,
      }}
    >
      {/* SVG Shape */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
        <g
          transform={`rotate(${rotation} ${(width || 120) / 2} ${(height || 80) / 2})`}
        >
          {/* Invisible click area for better click handling */}
          <rect
            x={0}
            y={0}
            width={resizingDimensions.width ?? width ?? 120}
            height={resizingDimensions.height ?? height ?? 80}
            fill="transparent"
            stroke="none"
            style={{ cursor: inResizeMode ? 'default' : 'pointer' }}
            className="nodrag nopan"
            data-no-dnd="true"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🖱️ Shape double-clicked for resize:', { id, inResizeMode });
              if (onShapeEdit) {
                // Delegate to parent to ensure consistent resize mode
                onShapeEdit(`${id}:resize`);
              } else {
                toggleResizeMode();
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🖱️ Shape clicked:', { id, inResizeMode, isEditing });
            }}
          />
          <path
            d={generateSVGPath}
            fill={shapeColor}
            stroke={getBorderStyle().stroke}
            strokeWidth={getBorderStyle().strokeWidth}
            strokeDasharray={getBorderStyle().strokeDasharray}
            opacity={highlighted ? 0.8 : 1}
            style={{
              filter: getBorderStyle().filter,
              pointerEvents: 'none', // Let the rect handle clicks
            }}
          />

        {/* Editing handles */}
        {isEditing && editingPoints.map((point, index) => (
          <circle
            key={`edit-point-${index}`}
            cx={point.x}
            cy={point.y}
            r={6}
            fill="#ff9800"
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onMouseDown={(e) => {
              // Handle point dragging logic here
              e.preventDefault();
            }}
          />
        ))}
        </g>
      </svg>

      {/* Connection Handles - only show when not resizing and not editing */}
      {!inResizeMode && !isEditing && calculateHandlePositions.map((handle) => (
        <Handle
          key={handle.id}
          type="source"
          position={handle.position}
          id={handle.id}
          isConnectable={true}
          style={{
            background: '#555',
            width: 14,
            height: 14,
            border: '2px solid #fff',
            borderRadius: '50%',
            pointerEvents: 'all',
            cursor: 'crosshair',
            left: handle.x - 7, // Center the handle
            top: handle.y - 7,
            position: 'absolute',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          className="custom-handle"
        />
      ))}

      {/* Resize Handles - only show when resizing */}
      {inResizeMode && calculateResizeHandles.map((resizeHandle) => (
        <Box
          key={resizeHandle.id}
          onMouseDown={(e) => {
            console.log('🎯 Resize handle clicked:', resizeHandle.id);
            e.preventDefault();
            e.stopPropagation();

            handleResizeStart(resizeHandle.id, e.clientX, e.clientY);

            const handleMouseMove = (e: MouseEvent) => {
              handleResizeDrag(e.clientX, e.clientY);
            };

            const handleMouseUp = () => {
              handleResizeEnd();
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          onDragStart={(e) => {
            // Prevent native drag interfering with ReactFlow
            e.preventDefault();
          }}
          className="nodrag nopan"
          data-no-dnd="true"
          sx={{
            position: 'absolute',
            left: resizeHandle.x - 8,
            top: resizeHandle.y - 8,
            width: 16,
            height: 16,
            backgroundColor: resizeHandle.type === 'corner' ? '#1976d2' : '#ff9800',
            border: '2px solid #fff',
            borderRadius: resizeHandle.type === 'corner' ? '2px' : '50%',
            cursor: resizeHandle.cursor,
            pointerEvents: 'all',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 1000,
            transition: 'all 0.1s ease',
            '&:hover': {
              transform: 'scale(1.2)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            },
            '&:active': {
              transform: 'scale(0.9)',
            }
          }}
        />
      ))}

      {/* Edit and Resize Mode Toggle Buttons */}
      {selected && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            right: -12,
            zIndex: 2000,
            display: 'flex',
            gap: 0.5,
          }}
        >
          {/* Edit Mode Button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('✏️ Edit button clicked');
              handleEditClick();
            }}
            sx={{
              backgroundColor: isEditing ? '#ff9800' : '#4caf50',
              color: 'white',
              width: 24,
              height: 24,
              '&:hover': {
                backgroundColor: isEditing ? '#f57c00' : '#388e3c',
              },
            }}
          >
            {isEditing ? (
              <CheckCircle sx={{ fontSize: '0.8rem' }} />
            ) : (
              <Edit sx={{ fontSize: '0.8rem' }} />
            )}
          </IconButton>

          {/* Resize Mode Button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔧 Resize button clicked');
              if (onShapeEdit) {
                // Use parent-managed resize mode for reliability
                onShapeEdit(`${id}:resize`);
              } else {
                toggleResizeMode();
              }
            }}
            sx={{
              backgroundColor: inResizeMode ? '#ff9800' : '#1976d2',
              color: 'white',
              width: 24,
              height: 24,
              '&:hover': {
                backgroundColor: inResizeMode ? '#f57c00' : '#1565c0',
              },
            }}
          >
            {inResizeMode ? (
              <CheckCircle sx={{ fontSize: '0.8rem' }} />
            ) : (
              <Crop sx={{ fontSize: '0.8rem' }} />
            )}
          </IconButton>
        </Box>
      )}

      {/* Content Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" sx={{ mr: 0.5 }}>
            {icon || getCategoryIcon(displayCategory)}
          </Typography>
          <Typography
            variant="body2"
            fontWeight="bold"
            textAlign="center"
            sx={{
              color: hasInheritedProperties && assignedNodeId ? '#2e7d32' : '#333',
              textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
              fontSize: hasInheritedProperties && assignedNodeId ? '0.85rem' : '0.75rem',
            }}
          >
            {displayName}
          </Typography>
          {/* Neo4j connection indicator */}
          {hasInheritedProperties && assignedNodeId && (
            <CheckCircle
              sx={{
                fontSize: '0.9rem',
                color: '#2e7d32',
                ml: 0.5
              }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip
            label={displayCategory}
            size="small"
            sx={{
              fontSize: '0.65rem',
              height: 20,
              backgroundColor: hasInheritedProperties && assignedNodeId
                ? 'rgba(46, 125, 50, 0.1)'
                : 'rgba(0, 0, 0, 0.08)',
              color: hasInheritedProperties && assignedNodeId
                ? '#2e7d32'
                : '#333',
              fontWeight: hasInheritedProperties && assignedNodeId ? 'bold' : 'normal',
            }}
          />

          {cleanroomClass && (
            <Chip
              label={`Class ${cleanroomClass}`}
              size="small"
              sx={{
                fontSize: '0.6rem',
                height: 18,
                backgroundColor: '#e3f2fd',
                color: '#1565c0',
              }}
            />
          )}

          {equipment && equipment.length > 0 && (
            <Chip
              label={`${equipment.length} eq.`}
              size="small"
              sx={{
                fontSize: '0.6rem',
                height: 18,
                backgroundColor: '#f3e5f5',
                color: '#7b1fa2',
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default memo(CustomShapeNode, (prevProps, nextProps) => {
  // Force re-render when Neo4j assignment properties change
  const relevantProps: (keyof CustomShapeData)[] = [
    'assignedNodeId',
    'assignedNodeName',
    'assignedNodeCategory',
    'hasInheritedProperties',
    'showAssignmentDialog',
    'label',
    'category',
    'constraintsCount',
    'lastAssignmentUpdate',
    // Ensure re-render when geometry changes
    'width',
    'height',
  ];

  for (const prop of relevantProps) {
    if (prevProps.data[prop] !== nextProps.data[prop]) {
      return false; // Props changed, re-render
    }
  }

  // Also re-render when shape points array content changes
  const prevPoints = prevProps.data.shapePoints;
  const nextPoints = nextProps.data.shapePoints;
  if (prevPoints.length !== nextPoints.length) {
    return false;
  }
  for (let i = 0; i < prevPoints.length; i++) {
    if (prevPoints[i].x !== nextPoints[i].x || prevPoints[i].y !== nextPoints[i].y) {
      return false;
    }
  }

  return true; // Props same, skip re-render
});