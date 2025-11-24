import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Divider,
} from '@mui/material';
import { SCALE_PRESETS, Unit, UnitConverter, ScalePreset } from '../../utils/unitConversion';

export interface ScaleSettingsProps {
  open: boolean;
  onClose: () => void;
  onApply: (unitConverter: UnitConverter) => void;
  currentConverter: UnitConverter;
}

export const ScaleSettings: React.FC<ScaleSettingsProps> = ({
  open,
  onClose,
  onApply,
  currentConverter,
}) => {
  const currentConfig = currentConverter.getConfig();
  const [selectedUnit, setSelectedUnit] = useState<Unit>(currentConfig.unit);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(3); // Default 1:100
  const [customPixelsPerUnit, setCustomPixelsPerUnit] = useState(currentConfig.pixelsPerUnit);
  const [useCustom, setUseCustom] = useState(false);

  const selectedPreset = SCALE_PRESETS[selectedPresetIndex];
  const isMetric = selectedUnit === 'meters' || selectedUnit === 'centimeters';

  const handleApply = () => {
    let converter: UnitConverter;

    if (useCustom) {
      converter = new UnitConverter(selectedUnit, customPixelsPerUnit);
    } else {
      if (selectedPreset.name === 'Custom') {
        converter = new UnitConverter(selectedUnit, customPixelsPerUnit);
      } else {
        const pixelsPerUnit = isMetric
          ? selectedPreset.pixelsPerMeter
          : selectedPreset.pixelsPerFoot;
        converter = new UnitConverter(selectedUnit, pixelsPerUnit);
      }
    }

    onApply(converter);
    onClose();
  };

  const handlePresetChange = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = SCALE_PRESETS[index];

    if (preset.name !== 'Custom') {
      setUseCustom(false);
      const pixelsPerUnit = isMetric ? preset.pixelsPerMeter : preset.pixelsPerFoot;
      setCustomPixelsPerUnit(pixelsPerUnit);
    } else {
      setUseCustom(true);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 },
      }}
    >
      <DialogTitle>
        📐 Scale & Unit Settings
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Unit System Selection */}
          <FormControl fullWidth>
            <FormLabel>Unit System</FormLabel>
            <RadioGroup
              row
              value={selectedUnit}
              onChange={(e) => {
                const newUnit = e.target.value as Unit;
                setSelectedUnit(newUnit);

                // Adjust pixels per unit when switching unit systems
                const newIsMetric = newUnit === 'meters' || newUnit === 'centimeters';
                if (selectedPreset.name !== 'Custom') {
                  const pixelsPerUnit = newIsMetric
                    ? selectedPreset.pixelsPerMeter
                    : selectedPreset.pixelsPerFoot;
                  setCustomPixelsPerUnit(pixelsPerUnit);
                }
              }}
            >
              <FormControlLabel value="feet" control={<Radio />} label="Feet (Imperial)" />
              <FormControlLabel value="meters" control={<Radio />} label="Meters (Metric)" />
              <FormControlLabel value="inches" control={<Radio />} label="Inches" />
              <FormControlLabel value="centimeters" control={<Radio />} label="Centimeters" />
            </RadioGroup>
          </FormControl>

          <Divider />

          {/* Scale Preset Selection */}
          <FormControl fullWidth>
            <InputLabel>Scale Preset</InputLabel>
            <Select
              value={selectedPresetIndex}
              label="Scale Preset"
              onChange={(e) => handlePresetChange(Number(e.target.value))}
            >
              {SCALE_PRESETS.map((preset, index) => (
                <MenuItem key={index} value={index}>
                  {preset.name} - {preset.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Preset Description */}
          {!useCustom && selectedPreset.name !== 'Custom' && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.light' }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Scale: {selectedPreset.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPreset.description}
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                {isMetric
                  ? `${selectedPreset.pixelsPerMeter.toFixed(1)} pixels = 1 meter`
                  : `${selectedPreset.pixelsPerFoot.toFixed(1)} pixels = 1 foot`}
              </Typography>
            </Paper>
          )}

          {/* Custom Scale Input */}
          {(useCustom || selectedPreset.name === 'Custom') && (
            <>
              <Divider />
              <Typography variant="subtitle2" color="primary">
                Custom Scale Configuration
              </Typography>

              <TextField
                fullWidth
                type="number"
                label={`Pixels per ${selectedUnit === 'feet' ? 'Foot' : selectedUnit === 'meters' ? 'Meter' : selectedUnit === 'inches' ? 'Inch' : 'Centimeter'}`}
                value={customPixelsPerUnit}
                onChange={(e) => setCustomPixelsPerUnit(Number(e.target.value))}
                inputProps={{ min: 1, max: 500, step: 0.1 }}
                helperText="Higher values = larger scale (more detail)"
              />

              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'warning.light' }}>
                <Typography variant="caption" fontWeight="bold">
                  💡 Custom Scale Tips:
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                  • Typical range: 20-200 pixels per unit
                  <br />
                  • Higher values = zoomed in (more detail)
                  <br />
                  • Lower values = zoomed out (wider view)
                  <br />
                  • Standard architectural: 48-96 pixels/foot
                </Typography>
              </Paper>
            </>
          )}

          {/* Preview Calculations */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Preview Calculations
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>100 pixels</strong> = {(100 / customPixelsPerUnit).toFixed(2)} {selectedUnit}
              </Typography>
              <Typography variant="body2">
                <strong>500 pixels</strong> = {(500 / customPixelsPerUnit).toFixed(2)} {selectedUnit}
              </Typography>
              <Typography variant="body2">
                <strong>10 {selectedUnit}</strong> = {(10 * customPixelsPerUnit).toFixed(0)} pixels
              </Typography>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                <strong>Area:</strong> 10,000 px² = {(10000 / (customPixelsPerUnit * customPixelsPerUnit)).toFixed(2)} {selectedUnit}²
              </Typography>
            </Box>
          </Paper>

          {/* Warning for existing layouts */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'error.light' }}>
            <Typography variant="caption" fontWeight="bold" color="error.dark">
              ⚠️ Important:
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              Changing the scale will affect how measurements are displayed. Existing shapes will remain the same size in pixels but their displayed dimensions will change.
            </Typography>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Apply Scale
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScaleSettings;
