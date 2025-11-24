import React, { useState, useCallback } from 'react';
import { Box, Paper, Typography, Button, Slider, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { WALL_THICKNESS_PRESETS, getWallThicknessPixels } from '../../utils/unitConversion';

export interface WallSegment {
  id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  thickness: number; // in pixels
  thicknessInches: number; // real-world measurement
  wallType: string;
  color: string;
  createdAt: Date;
}

export interface WallToolProps {
  onClose: () => void;
  onWallCreate: (wall: WallSegment) => void;
  pixelsPerFoot: number;
}

export const WallTool: React.FC<WallToolProps> = ({
  onClose,
  onWallCreate,
  pixelsPerFoot,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customThickness, setCustomThickness] = useState(6);
  const [wallColor, setWallColor] = useState('#333333');

  const currentPreset = WALL_THICKNESS_PRESETS[selectedPreset];
  const thicknessInches = selectedPreset === WALL_THICKNESS_PRESETS.length - 1
    ? customThickness
    : currentPreset.inches;
  const thicknessPixels = getWallThicknessPixels(thicknessInches, pixelsPerFoot);

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: 340,
        top: 20,
        width: 320,
        p: 2,
        zIndex: 1100,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="primary">
          🏗️ Wall Drawing Tool
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click to place wall start point, then click again for end point
      </Typography>

      {/* Wall Type Preset */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Wall Type</InputLabel>
        <Select
          value={selectedPreset}
          label="Wall Type"
          onChange={(e) => setSelectedPreset(Number(e.target.value))}
        >
          {WALL_THICKNESS_PRESETS.map((preset, index) => (
            <MenuItem key={index} value={index}>
              {preset.name} ({preset.inches}″)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Description */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.default' }}>
        <Typography variant="caption" color="text.secondary">
          {currentPreset.description}
        </Typography>
      </Paper>

      {/* Custom Thickness Slider (only for Custom preset) */}
      {selectedPreset === WALL_THICKNESS_PRESETS.length - 1 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Custom Thickness: {customThickness}″
          </Typography>
          <Slider
            value={customThickness}
            onChange={(_, value) => setCustomThickness(value as number)}
            min={2}
            max={16}
            step={0.5}
            marks={[
              { value: 2, label: '2″' },
              { value: 6, label: '6″' },
              { value: 10, label: '10″' },
              { value: 16, label: '16″' },
            ]}
          />
        </Box>
      )}

      {/* Wall Color */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Wall Color
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <input
            type="color"
            value={wallColor}
            onChange={(e) => setWallColor(e.target.value)}
            style={{
              width: 60,
              height: 40,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {wallColor}
          </Typography>
        </Box>
      </Box>

      {/* Calculated Display */}
      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'info.light' }}>
        <Typography variant="caption" fontWeight="bold">
          Wall Thickness on Canvas:
        </Typography>
        <Typography variant="body2">
          {thicknessPixels.toFixed(1)} pixels ({thicknessInches}″)
        </Typography>
      </Paper>

      {/* Instructions */}
      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
        <Typography variant="caption" fontWeight="bold" gutterBottom>
          💡 Drawing Tips:
        </Typography>
        <Typography variant="caption" component="div">
          • Hold Shift for straight lines (0°, 45°, 90°)
          <br />
          • Walls will snap to grid if enabled
          <br />
          • Click existing wall endpoints to connect
        </Typography>
      </Box>
    </Paper>
  );
};

export default WallTool;
