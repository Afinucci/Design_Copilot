import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Chip, Paper, Tooltip, Badge, IconButton, Alert } from '@mui/material';
import { Build, Edit, Link, LinkOff, Warning, CheckCircle } from '@mui/icons-material';
import { CustomShapeData, ShapePoint, ResizeHandle, ResizeHandleType, ResizeHandlePosition } from '../types';
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
    assignedNodeId,
    assignedNodeName,
    assignedNodeCategory,
    hasInheritedProperties,
    inheritedRelationships,
    showAssignmentDialog
  } = data;

  // Debug logging for assignment tracking
  useEffect(() => {
    console.log(`🔍 CustomShapeNode ${id} - Assignment Debug:`, {
      label,
      assignedNodeId,
      assignedNodeName,
      assignedNodeCategory,
      hasInheritedProperties,
      category,
      showAssignmentDialog,
      isResizing,
      isEditing
    });
  }, [id, label, assignedNodeId, assignedNodeName, assignedNodeCategory, hasInheritedProperties, category, showAssignmentDialog, isResizing, isEditing]);

  const [editingPoints, setEditingPoints] = useState<ShapePoint[]>(shapePoints);
  
  // Resize state management
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<string | null>(null);
  const [resizingPoints, setResizingPoints] = useState<ShapePoint[]>(shapePoints);
  const [resizingDimensions, setResizingDimensions] = useState({ width, height });

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

  // Generate SVG path string from points
  const generateSVGPath = useMemo(() => {
    // Use resizing points if in resize mode, otherwise use normal points
    const currentPoints = isResizing ? resizingPoints : shapePoints;
    
    if (currentPoints.length === 0) return '';
    
    if (shapeType === 'rectangle' && currentPoints.length >= 2) {
      const [topLeft, bottomRight] = currentPoints;
      const w = bottomRight.x - topLeft.x;
      const h = bottomRight.y - topLeft.y;
      return `M ${topLeft.x} ${topLeft.y} L ${topLeft.x + w} ${topLeft.y} L ${topLeft.x + w} ${topLeft.y + h} L ${topLeft.x} ${topLeft.y + h} Z`;
    }
    
    if (shapeType === 'polygon' || shapeType === 'custom') {
      let path = `M ${currentPoints[0].x} ${currentPoints[0].y}`;
      for (let i = 1; i < currentPoints.length; i++) {
        path += ` L ${currentPoints[i].x} ${currentPoints[i].y}`;
      }
      path += ' Z'; // Close the path
      return path;
    }
    
    return '';
  }, [shapePoints, shapeType, isResizing, resizingPoints]);

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
    if (!isResizing || resizingPoints.length === 0) return [];
    
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
  }, [isResizing, resizingPoints, shapeType]);

  // Get display name with Neo4j assignment priority
  const getDisplayName = () => {
    // Priority 1: Always use assigned Neo4j node name if available  
    if (assignedNodeName) {
      console.log(`✨ CustomShapeNode ${id}: Displaying Neo4j assigned name: ${assignedNodeName}`);
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
    if (isResizing) {
      return {
        strokeWidth: '3',
        stroke: '#1976d2', // Blue for resize mode
        strokeDasharray: '5 3',
        filter: 'drop-shadow(0 0 12px rgba(25, 118, 210, 0.8))'
      };
    }
    if (assignedNodeId && assignedNodeName) {
      console.log(`✅ CustomShapeNode ${id}: Using connected border style`);
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

  // Get connection status for display
  const getConnectionStatus = () => {
    if (hasInheritedProperties && assignedNodeId) {
      return {
        status: 'connected',
        icon: <CheckCircle />,
        color: '#2e7d32',
        message: `Connected to ${assignedNodeName || 'Neo4j node'}`,
        description: assignedNodeCategory ? `Category: ${assignedNodeCategory}` : ''
      };
    }
    if (showAssignmentDialog) {
      return {
        status: 'needs-assignment',
        icon: <Warning />,
        color: '#ff9800',
        message: 'Needs Neo4j assignment',
        description: 'Click to assign properties'
      };
    }
    return {
      status: 'unconnected',
      icon: <LinkOff />,
      color: '#757575',
      message: 'Not connected to Neo4j',
      description: 'Limited functionality in guided mode'
    };
  };

  const handleEditClick = useCallback(() => {
    if (onShapeEdit) {
      onShapeEdit(id);
    }
  }, [id, onShapeEdit]);

  const handlePointDrag = useCallback((pointIndex: number, newX: number, newY: number) => {
    if (!isEditing) return;
    
    const newPoints = [...editingPoints];
    newPoints[pointIndex] = { x: newX, y: newY };
    setEditingPoints(newPoints);
  }, [isEditing, editingPoints]);

  // Resize drag handlers
  const handleResizeStart = useCallback((handleId: string, startX: number, startY: number) => {
    console.log('🎯 Resize start triggered:', { handleId, startX, startY, isResizing });
    if (!isResizing) {
      console.log('❌ Cannot start resize - not in resize mode');
      return;
    }
    
    console.log('✅ Starting resize operation');
    setIsDragging(true);
    setActiveResizeHandle(handleId);
    setDragStartPos({ x: startX, y: startY });
    
    // Initialize resizing state with current shape data
    setResizingPoints([...shapePoints]);
    setResizingDimensions({ width, height });
  }, [isResizing, shapePoints, width, height]);

  const handleResizeDrag = useCallback((currentX: number, currentY: number) => {
    console.log('🔄 Resize drag called:', { isDragging, dragStartPos, activeResizeHandle, currentX, currentY });
    if (!isDragging || !dragStartPos || !activeResizeHandle) {
      console.log('❌ Resize drag blocked:', { isDragging, dragStartPos: !!dragStartPos, activeResizeHandle });
      return;
    }
    
    const deltaX = currentX - dragStartPos.x;
    const deltaY = currentY - dragStartPos.y;
    
    if (shapeType === 'rectangle' && shapePoints.length >= 2) {
      const [topLeft, bottomRight] = shapePoints;
      let newTopLeft = { ...topLeft };
      let newBottomRight = { ...bottomRight };
      
      // Handle different resize directions
      switch (activeResizeHandle) {
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
        if (activeResizeHandle.includes('l')) newTopLeft.x = newBottomRight.x - minSize;
        else newBottomRight.x = newTopLeft.x + minSize;
      }
      if (newBottomRight.y - newTopLeft.y < minSize) {
        if (activeResizeHandle.includes('t')) newTopLeft.y = newBottomRight.y - minSize;
        else newBottomRight.y = newTopLeft.y + minSize;
      }
      
      const newPoints = [newTopLeft, newBottomRight];
      const newWidth = newBottomRight.x - newTopLeft.x;
      const newHeight = newBottomRight.y - newTopLeft.y;
      
      setResizingPoints(newPoints);
      setResizingDimensions({ width: newWidth, height: newHeight });
    } else {
      // For polygons, handle edge midpoint dragging
      if (activeResizeHandle.startsWith('resize-edge-')) {
        const edgeIndex = parseInt(activeResizeHandle.split('-')[2]);
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
    if (!isDragging) return;
    
    setIsDragging(false);
    setActiveResizeHandle(null);
    setDragStartPos(null);
    
    // Call the resize callback with final dimensions
    if (onShapeResize && resizingPoints.length > 0) {
      const finalWidth = resizingDimensions.width ?? width ?? 120;
      const finalHeight = resizingDimensions.height ?? height ?? 80;
      onShapeResize(id, resizingPoints, finalWidth, finalHeight);
    }
  }, [isDragging, onShapeResize, id, resizingPoints, resizingDimensions, width, height]);

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
        {/* Invisible click area for better click handling */}
        <rect
          x={0}
          y={0}
          width={resizingDimensions.width ?? width ?? 120}
          height={resizingDimensions.height ?? height ?? 80}
          fill="transparent"
          stroke="none"
          style={{ cursor: isResizing ? 'default' : 'pointer' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Shape clicked for resize (mousedown):', { id, isResizing, isEditing });
            // Toggle resize mode - call parent to update node data
            if (onShapeEdit && !isEditing) {
              console.log('📞 Calling onShapeEdit with resize flag:', `${id}:resize`);
              onShapeEdit(`${id}:resize`); // Add resize flag to indicate resize mode
            }
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
            fill="#1976d2"
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onMouseDown={(e) => {
              // Handle point dragging logic here
              e.preventDefault();
            }}
          />
        ))}
      </svg>

      {/* Connection Handles - only show when not resizing */}
      {!isResizing && calculateHandlePositions.map((handle) => (
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
      {isResizing && calculateResizeHandles.map((resizeHandle) => (
        <Box
          key={resizeHandle.id}
          onMouseDownCapture={(e) => {
            console.log('🎯 Resize handle clicked (capture):', resizeHandle.id);
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            const rect = (e.target as HTMLElement).getBoundingClientRect();
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
                : 'rgba(255,255,255,0.8)',
              color: hasInheritedProperties && assignedNodeId ? '#2e7d32' : '#333',
              border: hasInheritedProperties && assignedNodeId ? '1px solid #2e7d32' : 'none',
            }}
          />
          
          {cleanroomClass && (
            <Chip
              label={`Class ${cleanroomClass}`}
              size="small"
              sx={{
                fontSize: '0.65rem',
                height: 20,
                backgroundColor: hasInheritedProperties && assignedNodeId 
                  ? 'rgba(46, 125, 50, 0.8)' 
                  : 'rgba(33,150,243,0.8)',
                color: 'white',
              }}
            />
          )}
          
          {/* Show constraint count if available */}
          {hasInheritedProperties && data.constraintsCount && data.constraintsCount > 0 && (
            <Chip
              label={`${data.constraintsCount} rules`}
              size="small"
              sx={{
                fontSize: '0.6rem',
                height: 18,
                backgroundColor: 'rgba(46, 125, 50, 0.9)',
                color: 'white',
              }}
            />
          )}
        </Box>
      </Box>

      {/* Status Message for Guided Mode */}
      {showAssignmentDialog && (
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 200,
            zIndex: 10,
          }}
        >
          <Alert
            severity="warning"
            variant="filled"
            sx={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              '& .MuiAlert-icon': {
                fontSize: '1rem',
              },
            }}
          >
            Assign Neo4j properties
          </Alert>
        </Box>
      )}

      {/* Equipment List (if any) */}
      {equipment && equipment.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            maxHeight: 60,
            overflow: 'auto',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 1,
            p: 0.5,
            pointerEvents: 'none',
          }}
        >
          {equipment.map((eq) => (
            <Typography
              key={eq.id}
              variant="caption"
              display="block"
              sx={{ fontSize: '0.6rem', color: '#666' }}
            >
              {eq.name} ({eq.type})
            </Typography>
          ))}
        </Box>
      )}

      {/* Edit Button (only visible when editing) */}
      {isEditing && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            zIndex: 10,
          }}
        >
          <IconButton
            size="small"
            onClick={handleEditClick}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              width: 24,
              height: 24,
              '&:hover': {
                backgroundColor: '#1565c0',
              },
            }}
          >
            <Edit sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Box>
      )}
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
    'lastAssignmentUpdate'
  ];
  
  for (const prop of relevantProps) {
    if (prevProps.data[prop] !== nextProps.data[prop]) {
      return false; // Props changed, re-render
    }
  }
  
  return true; // Props same, skip re-render
});