import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  FormControlLabel,
  Switch,
  Slider,
  TextField,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  CropSquare as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  ChangeHistory as TriangleIcon,
  Pentagon as PolygonIcon,
  Grid3x3 as GridIcon,
  CenterFocusStrong as SnapIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Clear as ClearIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  MeetingRoom as DoorIcon,
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon,
} from '@mui/icons-material';
import { ShapeType } from '../../types';
import { DrawingMode } from './types';

export interface DrawingToolsProps {
  // Mode selection
  drawingMode: DrawingMode;
  onDrawingModeChange: (mode: DrawingMode) => void;

  // Tool selection
  activeShapeTool: ShapeType | null;
  onShapeToolChange: (tool: ShapeType | null) => void;

  // Grid settings
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;

  // Canvas settings
  canvasWidth: number;
  canvasHeight: number;
  onCanvasSizeChange: (width: number, height: number) => void;

  // Zoom
  zoom: number;
  onZoomChange: (zoom: number) => void;

  // Actions
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onRotateLeft?: () => void;
  onRotateRight?: () => void;

  // Sidebar toggle
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;

  // State
  canUndo: boolean;
  canRedo: boolean;
  isDrawing: boolean;
  hasSelectedShape?: boolean;

  // Layout
  orientation?: 'horizontal' | 'vertical';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const DrawingTools: React.FC<DrawingToolsProps> = ({
  drawingMode,
  onDrawingModeChange,
  activeShapeTool,
  onShapeToolChange,
  showGrid,
  onToggleGrid,
  snapToGrid,
  onToggleSnap,
  gridSize,
  onGridSizeChange,
  canvasWidth,
  canvasHeight,
  onCanvasSizeChange,
  zoom,
  onZoomChange,
  onUndo,
  onRedo,
  onClear,
  onRotateLeft,
  onRotateRight,
  onToggleSidebar,
  isSidebarVisible = true,
  canUndo,
  canRedo,
  isDrawing,
  hasSelectedShape = false,
  orientation = 'horizontal',
  position = 'top',
}) => {
  const [showSettings, setShowSettings] = React.useState(false);
  const [tempCanvasWidth, setTempCanvasWidth] = React.useState(canvasWidth);
  const [tempCanvasHeight, setTempCanvasHeight] = React.useState(canvasHeight);

  const shapeTools = [
    {
      type: 'rectangle' as ShapeType,
      icon: <RectangleIcon />,
      name: 'Rectangle',
      description: 'Draw rectangular shapes - Click and drag',
    },
    {
      type: 'circle' as ShapeType,
      icon: <CircleIcon />,
      name: 'Circle',
      description: 'Draw circular shapes - Click center, drag to size',
    },
    {
      type: 'triangle' as ShapeType,
      icon: <TriangleIcon />,
      name: 'Triangle',
      description: 'Draw triangular shapes - Three clicks for vertices',
    },
    {
      type: 'polygon' as ShapeType,
      icon: <PolygonIcon />,
      name: 'Polygon',
      description: 'Draw custom polygons - Click for each vertex, double-click to complete',
    },
  ];

  const handleApplyCanvasSize = () => {
    onCanvasSizeChange(tempCanvasWidth, tempCanvasHeight);
    setShowSettings(false);
  };

  const getToolbarSx = () => {
    const baseSx = {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      p: 1,
      backgroundColor: 'background.paper',
      borderRadius: 1,
      boxShadow: 2,
      zIndex: 1000,
    };

    if (orientation === 'vertical') {
      return {
        ...baseSx,
        flexDirection: 'column',
        position: 'fixed',
        [position]: 20,
        top: '50%',
        transform: 'translateY(-50%)',
      };
    }

    return {
      ...baseSx,
      flexDirection: 'row',
      position: 'fixed',
      [position]: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      flexWrap: 'wrap',
      maxWidth: '90vw',
    };
  };

  return (
    <>
      <Paper sx={getToolbarSx()} data-testid="drawing-toolbar">
        {/* Sidebar Toggle */}
        {onToggleSidebar && (
          <>
            <Tooltip title={isSidebarVisible ? 'Hide Shape Library' : 'Show Shape Library'} arrow>
              <IconButton
                size="medium"
                onClick={onToggleSidebar}
                color={isSidebarVisible ? 'primary' : 'default'}
              >
                {isSidebarVisible ? <MenuOpenIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>

            <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />
          </>
        )}

        {/* Connection Mode Button */}
        <Box display="flex" gap={0.5} flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
          <Tooltip title="Connection Mode - Create connections between adjacent shapes" arrow>
            <IconButton
              size="medium"
              color={drawingMode === 'connection' ? 'primary' : 'default'}
              onClick={() => onDrawingModeChange(drawingMode === 'connection' ? 'select' : 'connection')}
              sx={{
                backgroundColor: drawingMode === 'connection' ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: drawingMode === 'connection' ? 'primary.main' : 'action.hover',
                },
              }}
              aria-label="Connection Mode"
            >
              <LinkIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Door Connection Mode - Create door connections with flow type and direction" arrow>
            <IconButton
              size="medium"
              color={drawingMode === 'door' ? 'primary' : 'default'}
              onClick={() => onDrawingModeChange(drawingMode === 'door' ? 'select' : 'door')}
              sx={{
                backgroundColor: drawingMode === 'door' ? 'primary.light' : 'transparent',
                '&:hover': {
                  backgroundColor: drawingMode === 'door' ? 'primary.main' : 'action.hover',
                },
              }}
              aria-label="Door Connection Mode"
            >
              <DoorIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />

        {/* Shape Tools */}
        <Box display="flex" gap={0.5} flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
          {shapeTools.map((tool) => (
            <Tooltip key={tool.type} title={tool.description} arrow>
              <span>
                <IconButton
                  size="medium"
                  color={activeShapeTool === tool.type ? 'primary' : 'default'}
                  onClick={() => {
                    onShapeToolChange(activeShapeTool === tool.type ? null : tool.type);
                  }}
                  disabled={isDrawing}
                  sx={{
                    backgroundColor: activeShapeTool === tool.type ? 'primary.light' : 'transparent',
                    '&:hover': {
                      backgroundColor: activeShapeTool === tool.type ? 'primary.main' : 'action.hover',
                    },
                  }}
                  aria-label={`Tool: ${tool.name}`}
                  data-testid={`tool-${tool.type}`}
                >
                  {tool.icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Box>

        <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />

        {/* Grid Controls */}
        <Box display="flex" gap={0.5} flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
          <Tooltip title={showGrid ? 'Hide Grid' : 'Show Grid'} arrow>
            <IconButton
              size="medium"
              color={showGrid ? 'primary' : 'default'}
              onClick={onToggleGrid}
            >
              <GridIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={snapToGrid ? 'Disable Snap to Grid' : 'Enable Snap to Grid'} arrow>
            <span>
              <IconButton
                size="medium"
                color={snapToGrid ? 'primary' : 'default'}
                onClick={onToggleSnap}
                disabled={!showGrid}
              >
                <SnapIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />

        {/* Action Controls */}
        <Box display="flex" gap={0.5} flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
          <Tooltip title="Undo" arrow>
            <span>
              <IconButton
                size="medium"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Redo" arrow>
            <span>
              <IconButton
                size="medium"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Clear All" arrow>
            <span>
              <IconButton
                size="medium"
                onClick={onClear}
                disabled={isDrawing}
                color="error"
              >
                <ClearIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />

        {/* Rotation Controls */}
        {onRotateLeft && onRotateRight && (
          <>
            <Box display="flex" gap={0.5} flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
              <Tooltip title="Rotate Left (-15°)" arrow>
                <span>
                  <IconButton
                    size="medium"
                    onClick={onRotateLeft}
                    disabled={!hasSelectedShape}
                  >
                    <RotateLeftIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Rotate Right (+15°)" arrow>
                <span>
                  <IconButton
                    size="medium"
                    onClick={onRotateRight}
                    disabled={!hasSelectedShape}
                  >
                    <RotateRightIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />
          </>
        )}

        {/* Zoom Controls */}
        <Box display="flex" gap={0.5} alignItems="center" flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
          <Tooltip title="Zoom Out" arrow>
            <IconButton
              size="medium"
              onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
            >
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>

          <Tooltip title="Zoom In" arrow>
            <IconButton
              size="medium"
              onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
            >
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation={orientation === 'vertical' ? 'horizontal' : 'vertical'} flexItem />

        {/* Settings */}
        <Tooltip title="Settings" arrow>
          <IconButton
            size="medium"
            onClick={() => setShowSettings(!showSettings)}
            color={showSettings ? 'primary' : 'default'}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* Current Tool Indicator */}
        {activeShapeTool && (
          <Box
            sx={{
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
            }}
          >
            Drawing: {shapeTools.find(t => t.type === activeShapeTool)?.name}
          </Box>
        )}
      </Paper>

      {/* Settings Panel */}
      {showSettings && (
        <Paper
          sx={{
            position: 'fixed',
            top: position === 'top' ? 80 : 'auto',
            bottom: position === 'bottom' ? 80 : 'auto',
            right: 20,
            width: 300,
            p: 2,
            zIndex: 1001,
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Drawing Settings
          </Typography>

          {/* Grid Settings */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Grid Settings
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={showGrid}
                  onChange={onToggleGrid}
                />
              }
              label="Show Grid"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={snapToGrid}
                  onChange={onToggleSnap}
                  disabled={!showGrid}
                />
              }
              label="Snap to Grid"
            />

            <Box mt={2}>
              <Typography variant="body2" gutterBottom>
                Grid Size: {gridSize}px
              </Typography>
              <Slider
                value={gridSize}
                onChange={(_, value) => onGridSizeChange(value as number)}
                min={10}
                max={50}
                step={5}
                marks
                disabled={!showGrid}
              />
            </Box>
          </Box>

          {/* Canvas Settings */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Canvas Size
            </Typography>

            <Box display="flex" gap={1} mb={2}>
              <TextField
                label="Width"
                type="number"
                size="small"
                value={tempCanvasWidth}
                onChange={(e) => setTempCanvasWidth(parseInt(e.target.value) || 800)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Height"
                type="number"
                size="small"
                value={tempCanvasHeight}
                onChange={(e) => setTempCanvasHeight(parseInt(e.target.value) || 600)}
                sx={{ flex: 1 }}
              />
            </Box>

            <ButtonGroup fullWidth variant="outlined" size="small">
              <Button onClick={() => { setTempCanvasWidth(800); setTempCanvasHeight(600); }}>
                800×600
              </Button>
              <Button onClick={() => { setTempCanvasWidth(1200); setTempCanvasHeight(800); }}>
                1200×800
              </Button>
              <Button onClick={() => { setTempCanvasWidth(1920); setTempCanvasHeight(1080); }}>
                1920×1080
              </Button>
            </ButtonGroup>

            <Button
              fullWidth
              variant="contained"
              onClick={handleApplyCanvasSize}
              sx={{ mt: 1 }}
              disabled={tempCanvasWidth === canvasWidth && tempCanvasHeight === canvasHeight}
            >
              Apply Canvas Size
            </Button>
          </Box>

          {/* Zoom Settings */}
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Zoom: {Math.round(zoom * 100)}%
            </Typography>

            <Slider
              value={zoom}
              onChange={(_, value) => onZoomChange(value as number)}
              min={0.25}
              max={4}
              step={0.25}
              marks={[
                { value: 0.25, label: '25%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' },
                { value: 2, label: '200%' },
                { value: 4, label: '400%' },
              ]}
            />

            <ButtonGroup fullWidth variant="outlined" size="small" sx={{ mt: 1 }}>
              <Button onClick={() => onZoomChange(0.5)}>50%</Button>
              <Button onClick={() => onZoomChange(1)}>100%</Button>
              <Button onClick={() => onZoomChange(1.5)}>150%</Button>
              <Button onClick={() => onZoomChange(2)}>200%</Button>
            </ButtonGroup>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => setShowSettings(false)}
          >
            Close Settings
          </Button>
        </Paper>
      )}
    </>
  );
};

export default DrawingTools;