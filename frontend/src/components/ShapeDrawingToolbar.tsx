import React, { useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  ToggleButton, 
  ToggleButtonGroup, 
  Tooltip, 
  Divider,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CropSquare,
  ChangeHistory,
  Edit,
  Undo,
  Redo,
  GridOn,
  AspectRatio,
  MoreVert,
  Add,
  Circle,
  Hexagon,
  Star,
  Category,
  Draw,
  RoundedCorner,
  RotateLeft,
  RotateRight,
  CallMerge
} from '@mui/icons-material';
import { ShapeType, ShapeTemplate } from '../types';

interface ShapeDrawingToolbarProps {
  activeShapeTool: ShapeType | null;
  onShapeToolChange: (tool: ShapeType | null) => void;
  onUndoShape?: () => void;
  onRedoShape?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;
  onMergeShapes?: () => void; // New merge callback
  canUndo?: boolean;
  canRedo?: boolean;
  isGridVisible?: boolean;
  isSnapEnabled?: boolean;
  hasSelectedShape?: boolean;
  canMerge?: boolean; // Whether merge is available (2+ shapes selected for merge)
  orientation?: 'horizontal' | 'vertical';
}

// Predefined shape templates
const shapeTemplates: ShapeTemplate[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    shapeType: 'rectangle',
    defaultPoints: [{ x: 0, y: 0 }, { x: 120, y: 80 }],
    defaultWidth: 120,
    defaultHeight: 80,
    description: 'Standard rectangular room',
    preview: 'M 0 0 L 120 0 L 120 80 L 0 80 Z',
    pharmaceuticalContext: 'General production areas, warehouses'
  },
  {
    id: 'rounded-rectangle',
    name: 'Rounded Rectangle',
    shapeType: 'rounded-rectangle',
    defaultPoints: [{ x: 0, y: 0 }, { x: 120, y: 80 }],
    defaultWidth: 120,
    defaultHeight: 80,
    description: 'Rectangle with rounded corners',
    preview: 'M 10 0 L 110 0 Q 120 0 120 10 L 120 70 Q 120 80 110 80 L 10 80 Q 0 80 0 70 L 0 10 Q 0 0 10 0',
    pharmaceuticalContext: 'Cleanrooms, sterile areas'
  },
  {
    id: 'circle',
    name: 'Circle',
    shapeType: 'circle',
    defaultPoints: [{ x: 60, y: 60 }],
    defaultWidth: 100,
    defaultHeight: 100,
    description: 'Circular room or tank',
    preview: 'M 60 10 A 50 50 0 1 1 60 110 A 50 50 0 1 1 60 10',
    pharmaceuticalContext: 'Storage tanks, bioreactors, vessels'
  },
  {
    id: 'ellipse',
    name: 'Ellipse',
    shapeType: 'ellipse',
    defaultPoints: [{ x: 75, y: 50 }],
    defaultWidth: 150,
    defaultHeight: 100,
    description: 'Oval-shaped room',
    preview: 'M 75 0 A 75 50 0 1 1 75 100 A 75 50 0 1 1 75 0',
    pharmaceuticalContext: 'Buffer preparation areas, mixing rooms'
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    shapeType: 'hexagon',
    defaultPoints: [
      { x: 30, y: 0 },
      { x: 90, y: 0 },
      { x: 120, y: 50 },
      { x: 90, y: 100 },
      { x: 30, y: 100 },
      { x: 0, y: 50 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Six-sided modular room',
    preview: 'M 30 0 L 90 0 L 120 50 L 90 100 L 30 100 L 0 50 Z',
    pharmaceuticalContext: 'Modular cleanrooms, isolator suites'
  },
  {
    id: 'octagon',
    name: 'Octagon',
    shapeType: 'octagon',
    defaultPoints: [
      { x: 40, y: 0 },
      { x: 80, y: 0 },
      { x: 120, y: 40 },
      { x: 120, y: 60 },
      { x: 80, y: 100 },
      { x: 40, y: 100 },
      { x: 0, y: 60 },
      { x: 0, y: 40 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Eight-sided room',
    preview: 'M 40 0 L 80 0 L 120 40 L 120 60 L 80 100 L 40 100 L 0 60 L 0 40 Z',
    pharmaceuticalContext: 'Central processing areas, hub rooms'
  },
  {
    id: 'triangle',
    name: 'Triangle',
    shapeType: 'triangle',
    defaultPoints: [
      { x: 60, y: 0 },
      { x: 120, y: 100 },
      { x: 0, y: 100 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Triangular corner space',
    preview: 'M 60 0 L 120 100 L 0 100 Z',
    pharmaceuticalContext: 'Corner utilities, transition areas'
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    shapeType: 'pentagon',
    defaultPoints: [
      { x: 60, y: 0 },
      { x: 115, y: 40 },
      { x: 95, y: 100 },
      { x: 25, y: 100 },
      { x: 5, y: 40 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Five-sided room',
    preview: 'M 60 0 L 115 40 L 95 100 L 25 100 L 5 40 Z',
    pharmaceuticalContext: 'Special purpose rooms, airlocks'
  },
  {
    id: 'l-shape',
    name: 'L-Shape',
    shapeType: 'L-shape',
    defaultPoints: [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 50 },
      { x: 60, y: 50 },
      { x: 60, y: 100 },
      { x: 0, y: 100 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'L-shaped room layout',
    preview: 'M 0 0 L 120 0 L 120 50 L 60 50 L 60 100 L 0 100 Z',
    pharmaceuticalContext: 'Gowning areas, material airlocks'
  },
  {
    id: 'u-shape',
    name: 'U-Shape',
    shapeType: 'U-shape',
    defaultPoints: [
      { x: 0, y: 0 },
      { x: 150, y: 0 },
      { x: 150, y: 100 },
      { x: 120, y: 100 },
      { x: 120, y: 30 },
      { x: 30, y: 30 },
      { x: 30, y: 100 },
      { x: 0, y: 100 }
    ],
    defaultWidth: 150,
    defaultHeight: 100,
    description: 'U-shaped room layout',
    preview: 'M 0 0 L 150 0 L 150 100 L 120 100 L 120 30 L 30 30 L 30 100 L 0 100 Z',
    pharmaceuticalContext: 'Filling lines, packaging areas'
  },
  {
    id: 't-shape',
    name: 'T-Shape',
    shapeType: 'T-shape',
    defaultPoints: [
      { x: 40, y: 0 },
      { x: 110, y: 0 },
      { x: 110, y: 40 },
      { x: 150, y: 40 },
      { x: 150, y: 80 },
      { x: 0, y: 80 },
      { x: 0, y: 40 },
      { x: 40, y: 40 }
    ],
    defaultWidth: 150,
    defaultHeight: 80,
    description: 'T-shaped room layout',
    preview: 'M 40 0 L 110 0 L 110 40 L 150 40 L 150 80 L 0 80 L 0 40 L 40 40 Z',
    pharmaceuticalContext: 'Distribution corridors, cross-flow areas'
  },
  {
    id: 'cross',
    name: 'Cross',
    shapeType: 'cross',
    defaultPoints: [
      { x: 40, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 40 },
      { x: 120, y: 40 },
      { x: 120, y: 60 },
      { x: 80, y: 60 },
      { x: 80, y: 100 },
      { x: 40, y: 100 },
      { x: 40, y: 60 },
      { x: 0, y: 60 },
      { x: 0, y: 40 },
      { x: 40, y: 40 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Cross-shaped intersection',
    preview: 'M 40 0 L 80 0 L 80 40 L 120 40 L 120 60 L 80 60 L 80 100 L 40 100 L 40 60 L 0 60 L 0 40 L 40 40 Z',
    pharmaceuticalContext: 'Central distribution hubs, intersection areas'
  },
  {
    id: 'trapezoid',
    name: 'Trapezoid',
    shapeType: 'trapezoid',
    defaultPoints: [
      { x: 20, y: 0 },
      { x: 100, y: 0 },
      { x: 120, y: 80 },
      { x: 0, y: 80 }
    ],
    defaultWidth: 120,
    defaultHeight: 80,
    description: 'Trapezoidal room',
    preview: 'M 20 0 L 100 0 L 120 80 L 0 80 Z',
    pharmaceuticalContext: 'Transition zones, graduated cleanroom areas'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    shapeType: 'diamond',
    defaultPoints: [
      { x: 60, y: 0 },
      { x: 120, y: 50 },
      { x: 60, y: 100 },
      { x: 0, y: 50 }
    ],
    defaultWidth: 120,
    defaultHeight: 100,
    description: 'Diamond-shaped room',
    preview: 'M 60 0 L 120 50 L 60 100 L 0 50 Z',
    pharmaceuticalContext: 'Special processing areas, isolation rooms'
  },
  {
    id: 'parallelogram',
    name: 'Parallelogram',
    shapeType: 'parallelogram',
    defaultPoints: [
      { x: 30, y: 0 },
      { x: 120, y: 0 },
      { x: 90, y: 80 },
      { x: 0, y: 80 }
    ],
    defaultWidth: 120,
    defaultHeight: 80,
    description: 'Slanted rectangular room',
    preview: 'M 30 0 L 120 0 L 90 80 L 0 80 Z',
    pharmaceuticalContext: 'Angled corridors, transition spaces'
  }
];

const ShapeDrawingToolbar: React.FC<ShapeDrawingToolbarProps> = ({
  activeShapeTool,
  onShapeToolChange,
  onUndoShape,
  onRedoShape,
  onToggleGrid,
  onToggleSnap,
  onRotateLeft,
  onRotateRight,
  onMergeShapes,
  canUndo = false,
  canRedo = false,
  isGridVisible = false,
  isSnapEnabled = false,
  hasSelectedShape = false,
  canMerge = false,
  orientation = 'horizontal'
}) => {
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);

  const handleTemplateMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setTemplateMenuAnchor(event.currentTarget);
  }, []);

  const handleTemplateMenuClose = useCallback(() => {
    setTemplateMenuAnchor(null);
  }, []);

  const handleShapeToolChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newTool: ShapeType | null,
  ) => {
    onShapeToolChange(newTool);
  }, [onShapeToolChange]);

  const handleTemplateSelect = useCallback((template: ShapeTemplate) => {
    onShapeToolChange(template.shapeType);
    handleTemplateMenuClose();
  }, [onShapeToolChange, handleTemplateMenuClose]);

  const isVertical = orientation === 'vertical';

  return (
    <Paper
      elevation={2}
      sx={{
        display: 'flex',
        alignItems: isVertical ? 'stretch' : 'center',
        flexDirection: isVertical ? 'column' : 'row',
        gap: 1,
        p: 1,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        mb: isVertical ? 0 : 2,
      }}
    >
      {!isVertical && (
        <Typography variant="body2" sx={{ mr: 1, fontWeight: 'medium' }}>
          Shape Tools:
        </Typography>
      )}

      {/* Basic Shape Tools */}
      <ToggleButtonGroup
        value={activeShapeTool}
        exclusive
        onChange={handleShapeToolChange}
        size="small"
        orientation={isVertical ? 'vertical' : 'horizontal'}
        sx={{ mr: isVertical ? 0 : 1 }}
      >
        <ToggleButton value="rectangle" aria-label="rectangle">
          <Tooltip title="Rectangle (Click & Drag)">
            <CropSquare />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="circle" aria-label="circle">
          <Tooltip title="Circle (Click to Place)">
            <Circle />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="hexagon" aria-label="hexagon">
          <Tooltip title="Hexagon (Click to Place)">
            <Hexagon />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="polygon" aria-label="polygon">
          <Tooltip title="Custom Polygon (Multi-Click)">
            <ChangeHistory />
          </Tooltip>
        </ToggleButton>

        <ToggleButton value="freeform" aria-label="freeform">
          <Tooltip title="Freeform Drawing">
            <Draw />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Shape Templates Dropdown */}
      <Tooltip title="Shape Templates">
        <IconButton
          size="small"
          onClick={handleTemplateMenuOpen}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            mr: isVertical ? 0 : 1,
          }}
        >
          <Add />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={templateMenuAnchor}
        open={Boolean(templateMenuAnchor)}
        onClose={handleTemplateMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        {shapeTemplates.map((template) => (
          <MenuItem
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
          >
            <ListItemIcon>
              <svg width="20" height="16" viewBox="0 0 150 100">
                <path
                  d={template.preview}
                  fill="rgba(25, 118, 210, 0.2)"
                  stroke="rgba(25, 118, 210, 0.8)"
                  strokeWidth="2"
                  transform="scale(0.8)"
                />
              </svg>
            </ListItemIcon>
            <ListItemText
              primary={template.name}
              secondary={template.description}
            />
          </MenuItem>
        ))}
      </Menu>

      <Divider orientation={isVertical ? 'horizontal' : 'vertical'} flexItem sx={{ mx: isVertical ? 0 : 1, my: isVertical ? 1 : 0 }} />

      {/* Edit Tools */}
      <Tooltip title="Edit Mode">
        <ToggleButton
          value="edit"
          selected={activeShapeTool === 'custom'}
          onChange={() => onShapeToolChange(activeShapeTool === 'custom' ? null : 'custom')}
          size="small"
          sx={{ mr: isVertical ? 0 : 1 }}
        >
          <Edit />
        </ToggleButton>
      </Tooltip>

      {/* Undo/Redo */}
      <Tooltip title="Undo">
        <span>
          <IconButton
            size="small"
            onClick={onUndoShape}
            disabled={!canUndo}
            sx={{ mr: isVertical ? 0 : 0.5, mb: isVertical ? 0.5 : 0 }}
          >
            <Undo />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Redo">
        <span>
          <IconButton
            size="small"
            onClick={onRedoShape}
            disabled={!canRedo}
            sx={{ mr: isVertical ? 0 : 1 }}
          >
            <Redo />
          </IconButton>
        </span>
      </Tooltip>

      <Divider orientation={isVertical ? 'horizontal' : 'vertical'} flexItem sx={{ mx: isVertical ? 0 : 1, my: isVertical ? 1 : 0 }} />

      {/* Grid and Snap Tools */}
      <Tooltip title="Toggle Grid">
        <ToggleButton
          value="grid"
          selected={isGridVisible}
          onChange={onToggleGrid}
          size="small"
          sx={{ mr: isVertical ? 0 : 0.5, mb: isVertical ? 0.5 : 0 }}
        >
          <GridOn />
        </ToggleButton>
      </Tooltip>

      <Tooltip title="Toggle Snap">
        <ToggleButton
          value="snap"
          selected={isSnapEnabled}
          onChange={onToggleSnap}
          size="small"
        >
          <AspectRatio />
        </ToggleButton>
      </Tooltip>

      <Divider orientation={isVertical ? 'horizontal' : 'vertical'} flexItem sx={{ mx: isVertical ? 0 : 1, my: isVertical ? 1 : 0 }} />

      {/* Rotation Tools */}
      <Tooltip title="Rotate Left (-15°)">
        <span>
          <IconButton
            size="small"
            onClick={onRotateLeft}
            disabled={!hasSelectedShape}
            sx={{ mr: isVertical ? 0 : 0.5, mb: isVertical ? 0.5 : 0 }}
          >
            <RotateLeft />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Rotate Right (+15°)">
        <span>
          <IconButton
            size="small"
            onClick={onRotateRight}
            disabled={!hasSelectedShape}
            sx={{ mr: isVertical ? 0 : 0.5, mb: isVertical ? 0.5 : 0 }}
          >
            <RotateRight />
          </IconButton>
        </span>
      </Tooltip>

      {/* Merge Shapes Tool */}
      <Tooltip title="Merge Selected Shapes (Ctrl+M)">
        <span>
          <IconButton
            size="small"
            onClick={onMergeShapes}
            disabled={!canMerge}
            sx={{
              color: canMerge ? 'primary.main' : 'inherit',
              mr: isVertical ? 0 : 0,
              mb: isVertical ? 0 : 0
            }}
          >
            <CallMerge />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export { shapeTemplates };
export default ShapeDrawingToolbar;