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
  Add
} from '@mui/icons-material';
import { ShapeType, ShapeTemplate } from '../types';

interface ShapeDrawingToolbarProps {
  activeShapeTool: ShapeType | null;
  onShapeToolChange: (tool: ShapeType | null) => void;
  onUndoShape?: () => void;
  onRedoShape?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isGridVisible?: boolean;
  isSnapEnabled?: boolean;
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
    preview: 'M 0 0 L 120 0 L 120 80 L 0 80 Z'
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
    preview: 'M 0 0 L 120 0 L 120 50 L 60 50 L 60 100 L 0 100 Z'
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
    preview: 'M 0 0 L 150 0 L 150 100 L 120 100 L 120 30 L 30 30 L 30 100 L 0 100 Z'
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
    preview: 'M 40 0 L 110 0 L 110 40 L 150 40 L 150 80 L 0 80 L 0 40 L 40 40 Z'
  }
];

const ShapeDrawingToolbar: React.FC<ShapeDrawingToolbarProps> = ({
  activeShapeTool,
  onShapeToolChange,
  onUndoShape,
  onRedoShape,
  onToggleGrid,
  onToggleSnap,
  canUndo = false,
  canRedo = false,
  isGridVisible = false,
  isSnapEnabled = false,
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
          <Tooltip title="Rectangle">
            <CropSquare />
          </Tooltip>
        </ToggleButton>
        
        <ToggleButton value="polygon" aria-label="polygon">
          <Tooltip title="Custom Polygon">
            <ChangeHistory />
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
    </Paper>
  );
};

export { shapeTemplates };
export default ShapeDrawingToolbar;