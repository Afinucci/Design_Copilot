import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Colorize as ColorIcon,
} from '@mui/icons-material';
import { ShapeType, NodeCategory } from '../../types';
import { Connection } from './types';

export interface ShapeProperties {
  id: string;
  name: string;
  shapeType: ShapeType;
  category: NodeCategory;
  cleanroomClass: 'A' | 'B' | 'C' | 'D' | 'CNC';

  // Dimensions
  width: number;
  height: number;
  area: number;

  // Position
  x: number;
  y: number;
  rotation?: number; // Rotation angle in degrees

  // Pharmaceutical Properties
  pressureRegime: 'positive' | 'negative' | 'neutral';
  temperatureRange: {
    min: number;
    max: number;
    unit: 'C' | 'F';
  };
  humidityRange: {
    min: number;
    max: number;
  };

  // Visual Properties
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;

  // Compliance
  isCompliant: boolean;
  complianceIssues: string[];

  // Custom Properties
  customProperties: Record<string, any>;
}

export interface PropertiesPanelProps {
  selectedShape: ShapeProperties | null;
  selectedConnection?: Connection | null;
  onShapeUpdate: (id: string, updates: Partial<ShapeProperties>) => void;
  onConnectionUpdate?: (id: string, updates: Partial<Connection>) => void;
  onShapeDelete: (id: string) => void;
  onConnectionDelete?: (id: string) => void;
  onShapeDuplicate: (id: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const cleanroomClasses = [
  { value: 'A', label: 'Class A', description: 'Highest grade for high-risk operations' },
  { value: 'B', label: 'Class B', description: 'Background for Class A operations' },
  { value: 'C', label: 'Class C', description: 'Less critical manufacturing steps' },
  { value: 'D', label: 'Class D', description: 'General manufacturing areas' },
  { value: 'CNC', label: 'CNC', description: 'Controlled, not classified' },
];

const pharmaceuticalCategories = [
  { value: 'Production', label: 'Production', icon: '🏭', color: '#3B82F6' },
  { value: 'Storage', label: 'Storage', icon: '📦', color: '#10B981' },
  { value: 'Quality Control', label: 'Quality Control', icon: '🔬', color: '#F59E0B' },
  { value: 'Quality Assurance', label: 'Quality Assurance', icon: '✅', color: '#EF4444' },
  { value: 'Utilities', label: 'Utilities', icon: '⚡', color: '#6B7280' },
  { value: 'Support', label: 'Support', icon: '🛠️', color: '#8B5CF6' },
  { value: 'Logistics', label: 'Logistics', icon: '🚚', color: '#14B8A6' },
  { value: 'Personnel', label: 'Personnel', icon: '👥', color: '#F97316' },
  { value: 'Waste Management', label: 'Waste Management', icon: '♻️', color: '#991B1B' },
];

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedShape,
  selectedConnection,
  onShapeUpdate,
  onConnectionUpdate,
  onShapeDelete,
  onConnectionDelete,
  onShapeDuplicate,
  onClose,
  isVisible,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'basic',
    'dimensions',
    'pharmaceutical',
  ]);

  // Local state for form inputs
  const [localProperties, setLocalProperties] = useState<ShapeProperties | null>(null);

  // Update local state when selected shape changes
  useEffect(() => {
    if (selectedShape) {
      setLocalProperties({ ...selectedShape });
    } else {
      setLocalProperties(null);
    }
  }, [selectedShape]);

  // Handle property updates
  const handlePropertyUpdate = (property: keyof ShapeProperties, value: any) => {
    if (!localProperties) return;

    const updatedProperties = { ...localProperties, [property]: value };
    setLocalProperties(updatedProperties);

    // Immediate update for some properties
    onShapeUpdate(localProperties.id, { [property]: value });
  };

  // Handle nested property updates
  const handleNestedUpdate = (parent: keyof ShapeProperties, child: string, value: any) => {
    if (!localProperties) return;

    const currentValue = localProperties[parent];
    if (typeof currentValue !== 'object' || currentValue === null) {
      return;
    }

    const updatedNested = {
      ...currentValue,
      [child]: value,
    };

    handlePropertyUpdate(parent, updatedNested);
  };
  // Handle connection property updates
  const handleConnectionPropertyUpdate = (property: keyof Connection, value: any) => {
    if (!selectedConnection || !onConnectionUpdate) return;
    onConnectionUpdate(selectedConnection.id, { [property]: value });
  };

  // Toggle accordion sections
  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  if (!isVisible) return null;

  // Render Connection Properties Panel
  if (selectedConnection) {
    return (
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          right: 20,
          top: 100,
          width: 350,
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'auto',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="h6" noWrap>
            Connection Properties
          </Typography>
          <Box>
            <Tooltip title="Delete Connection">
              <IconButton
                size="small"
                onClick={() => onConnectionDelete?.(selectedConnection.id)}
                sx={{ color: 'inherit', mr: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {/* Connection Type */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Connection Type</InputLabel>
              <Select
                value={selectedConnection.type}
                onChange={(e) => handleConnectionPropertyUpdate('type', e.target.value)}
                label="Connection Type"
              >
                <MenuItem value="personnel">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 3,
                        backgroundColor: '#2196F3',
                      }}
                    />
                    <span>Personnel Flow</span>
                  </Box>
                </MenuItem>
                <MenuItem value="material">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 3,
                        backgroundColor: '#4CAF50',
                        borderTop: '2px dashed #4CAF50',
                      }}
                    />
                    <span>Material Flow</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Connection Direction */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Flow Direction</InputLabel>
              <Select
                value={selectedConnection.direction}
                onChange={(e) => handleConnectionPropertyUpdate('direction', e.target.value)}
                label="Flow Direction"
              >
                <MenuItem value="unidirectional">
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>→</span>
                    <span>Unidirectional (One-way)</span>
                  </Box>
                </MenuItem>
                <MenuItem value="bidirectional">
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>↔</span>
                    <span>Bidirectional (Two-way)</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Connection Label */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Label (Optional)"
              value={selectedConnection.label || ''}
              onChange={(e) => handleConnectionPropertyUpdate('label', e.target.value || undefined)}
              variant="outlined"
              size="small"
              placeholder="e.g., Main entrance, Material transfer"
            />
          </Box>

          {/* Connection Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Connection Details
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Chip
                label={`Type: ${selectedConnection.type === 'personnel' ? 'Personnel Flow' : 'Material Flow'}`}
                size="small"
                sx={{
                  backgroundColor: selectedConnection.type === 'personnel' ? '#2196F3' : '#4CAF50',
                  color: 'white',
                }}
              />
              <Chip
                label={`Direction: ${selectedConnection.direction === 'unidirectional' ? 'One-way →' : 'Two-way ↔'}`}
                size="small"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(selectedConnection.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer Actions */}
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: 'grey.50' }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            color="error"
            onClick={() => onConnectionDelete?.(selectedConnection.id)}
            startIcon={<DeleteIcon />}
          >
            Delete Connection
          </Button>
        </Box>
      </Paper>
    );
  }

  // Render Shape Properties Panel
  if (!localProperties) return null;

  const categoryInfo = pharmaceuticalCategories.find(c => c.value === localProperties.category);
  const cleanroomInfo = cleanroomClasses.find(c => c.value === localProperties.cleanroomClass);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        right: 20,
        top: 100,
        width: 350,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="h6" noWrap>
          Shape Properties
        </Typography>
        <Box>
          <Tooltip title="Duplicate Shape">
            <IconButton
              size="small"
              onClick={() => onShapeDuplicate(localProperties.id)}
              sx={{ color: 'inherit', mr: 1 }}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Shape">
            <IconButton
              size="small"
              onClick={() => onShapeDelete(localProperties.id)}
              sx={{ color: 'inherit', mr: 1 }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Compliance Status */}
        {!localProperties.isCompliant && localProperties.complianceIssues.length > 0 && (
          <Alert severity="warning" sx={{ m: 2, mb: 0 }}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Compliance Issues:
            </Typography>
            {localProperties.complianceIssues.map((issue, index) => (
              <Typography key={index} variant="caption" display="block">
                • {issue}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Basic Properties */}
        <Accordion
          expanded={expandedSections.includes('basic')}
          onChange={() => toggleSection('basic')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Basic Properties
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Room Name"
                value={localProperties.name}
                onChange={(e) => handlePropertyUpdate('name', e.target.value)}
                variant="outlined"
                size="small"
              />

              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={localProperties.category}
                  onChange={(e) => handlePropertyUpdate('category', e.target.value)}
                  label="Category"
                >
                  {pharmaceuticalCategories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{category.icon}</span>
                        <span>{category.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Cleanroom Class</InputLabel>
                <Select
                  value={localProperties.cleanroomClass}
                  onChange={(e) => handlePropertyUpdate('cleanroomClass', e.target.value)}
                  label="Cleanroom Class"
                >
                  {cleanroomClasses.map((cls) => (
                    <MenuItem key={cls.value} value={cls.value}>
                      <Box>
                        <Typography variant="body2">{cls.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cls.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box display="flex" gap={1} flexWrap="wrap">
                {categoryInfo && (
                  <Chip
                    label={`${categoryInfo.icon} ${categoryInfo.label}`}
                    size="small"
                    sx={{ backgroundColor: categoryInfo.color, color: 'white' }}
                  />
                )}
                {cleanroomInfo && (
                  <Chip label={cleanroomInfo.label} size="small" variant="outlined" />
                )}
                <Chip
                  label={`${localProperties.area}m²`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Dimensions & Position */}
        <Accordion
          expanded={expandedSections.includes('dimensions')}
          onChange={() => toggleSection('dimensions')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Dimensions & Position
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box display="flex" gap={1}>
                <TextField
                  label="Width"
                  type="number"
                  size="small"
                  value={localProperties.width}
                  onChange={(e) => handlePropertyUpdate('width', parseInt(e.target.value) || 0)}
                  InputProps={{ endAdornment: 'px' }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Height"
                  type="number"
                  size="small"
                  value={localProperties.height}
                  onChange={(e) => handlePropertyUpdate('height', parseInt(e.target.value) || 0)}
                  InputProps={{ endAdornment: 'px' }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box display="flex" gap={1}>
                <TextField
                  label="X Position"
                  type="number"
                  size="small"
                  value={localProperties.x}
                  onChange={(e) => handlePropertyUpdate('x', parseInt(e.target.value) || 0)}
                  InputProps={{ endAdornment: 'px' }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Y Position"
                  type="number"
                  size="small"
                  value={localProperties.y}
                  onChange={(e) => handlePropertyUpdate('y', parseInt(e.target.value) || 0)}
                  InputProps={{ endAdornment: 'px' }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Area: {localProperties.area} square pixels (~{Math.round(localProperties.area / 100)} m²)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aspect Ratio: {(localProperties.width / localProperties.height).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Pharmaceutical Properties */}
        <Accordion
          expanded={expandedSections.includes('pharmaceutical')}
          onChange={() => toggleSection('pharmaceutical')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Pharmaceutical Properties
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Pressure Regime</InputLabel>
                <Select
                  value={localProperties.pressureRegime}
                  onChange={(e) => handlePropertyUpdate('pressureRegime', e.target.value)}
                  label="Pressure Regime"
                >
                  <MenuItem value="positive">Positive Pressure</MenuItem>
                  <MenuItem value="negative">Negative Pressure</MenuItem>
                  <MenuItem value="neutral">Neutral Pressure</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="body2" gutterBottom>
                  Temperature Range (°{localProperties.temperatureRange.unit})
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <TextField
                    label="Min"
                    type="number"
                    size="small"
                    value={localProperties.temperatureRange.min}
                    onChange={(e) => handleNestedUpdate('temperatureRange', 'min', parseInt(e.target.value) || 0)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Max"
                    type="number"
                    size="small"
                    value={localProperties.temperatureRange.max}
                    onChange={(e) => handleNestedUpdate('temperatureRange', 'max', parseInt(e.target.value) || 0)}
                    sx={{ flex: 1 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 60 }}>
                    <Select
                      value={localProperties.temperatureRange.unit}
                      onChange={(e) => handleNestedUpdate('temperatureRange', 'unit', e.target.value)}
                    >
                      <MenuItem value="C">°C</MenuItem>
                      <MenuItem value="F">°F</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  Humidity Range (%)
                </Typography>
                <Box display="flex" gap={1}>
                  <TextField
                    label="Min %"
                    type="number"
                    size="small"
                    value={localProperties.humidityRange.min}
                    onChange={(e) => handleNestedUpdate('humidityRange', 'min', parseInt(e.target.value) || 0)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Max %"
                    type="number"
                    size="small"
                    value={localProperties.humidityRange.max}
                    onChange={(e) => handleNestedUpdate('humidityRange', 'max', parseInt(e.target.value) || 0)}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Visual Properties */}
        <Accordion
          expanded={expandedSections.includes('visual')}
          onChange={() => toggleSection('visual')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Visual Properties
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box display="flex" gap={1}>
                <TextField
                  label="Fill Color"
                  type="color"
                  size="small"
                  value={localProperties.fillColor}
                  onChange={(e) => handlePropertyUpdate('fillColor', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Border Color"
                  type="color"
                  size="small"
                  value={localProperties.borderColor}
                  onChange={(e) => handlePropertyUpdate('borderColor', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  Border Width: {localProperties.borderWidth}px
                </Typography>
                <Slider
                  value={localProperties.borderWidth}
                  onChange={(_, value) => handlePropertyUpdate('borderWidth', value)}
                  min={1}
                  max={10}
                  step={1}
                  marks
                />
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  Opacity: {Math.round(localProperties.opacity * 100)}%
                </Typography>
                <Slider
                  value={localProperties.opacity}
                  onChange={(_, value) => handlePropertyUpdate('opacity', value)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  marks
                />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* Footer Actions */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: 'grey.50' }}>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            size="small"
            onClick={() => onShapeDuplicate(localProperties.id)}
            startIcon={<CopyIcon />}
            sx={{ flex: 1 }}
          >
            Duplicate
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => onShapeDelete(localProperties.id)}
            startIcon={<DeleteIcon />}
            sx={{ flex: 1 }}
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default PropertiesPanel;