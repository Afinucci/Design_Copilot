import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Paper
} from '@mui/material';
import {
  Science as ScienceIcon,
  LocalPharmacy as PharmacyIcon,
  Factory as FactoryIcon,
  Biotech as BiotechIcon,
  Inventory as InventoryIcon,
  Science as LabIcon
} from '@mui/icons-material';
import { FacilityTemplate, TemplateParameter, Diagram } from '../../../shared/types';
import GenerativeApiService from '../services/generativeApi';

interface FacilityTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onTemplateApplied: (diagram: Diagram) => void;
}

const FacilityTemplateSelector: React.FC<FacilityTemplateSelectorProps> = ({
  open,
  onClose,
  onTemplateApplied
}) => {
  const [templates, setTemplates] = useState<FacilityTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FacilityTemplate | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates on mount
  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await GenerativeApiService.getTemplates();
      setTemplates(fetchedTemplates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: FacilityTemplate) => {
    setSelectedTemplate(template);

    // Initialize parameters with default values
    const defaultParams: Record<string, any> = {};
    template.parameters.forEach(param => {
      defaultParams[param.id] = param.defaultValue;
    });
    setParameters(defaultParams);
  };

  const handleParameterChange = (paramId: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setError(null);

    try {
      const diagram = await GenerativeApiService.instantiateTemplate({
        templateId: selectedTemplate.id,
        parameters
      });

      console.log('✅ Template instantiated:', diagram);
      onTemplateApplied(diagram);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getTemplateIcon = (category: string) => {
    const iconProps = { sx: { fontSize: 48, color: 'primary.main' } };
    switch (category) {
      case 'sterile-injectable':
        return <PharmacyIcon {...iconProps} />;
      case 'oral-solid-dosage':
        return <ScienceIcon {...iconProps} />;
      case 'biologics':
        return <BiotechIcon {...iconProps} />;
      case 'api':
        return <FactoryIcon {...iconProps} />;
      case 'packaging':
        return <InventoryIcon {...iconProps} />;
      case 'qc-lab':
        return <LabIcon {...iconProps} />;
      default:
        return <FactoryIcon {...iconProps} />;
    }
  };

  const renderParameterInput = (param: TemplateParameter) => {
    const value = parameters[param.id] ?? param.defaultValue;

    switch (param.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={value}
                onChange={(e) => handleParameterChange(param.id, e.target.checked)}
              />
            }
            label={param.name}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{param.name}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleParameterChange(param.id, e.target.value)}
              label={param.name}
            >
              {param.options?.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'number':
      case 'range':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.id, parseFloat(e.target.value))}
            InputProps={{
              endAdornment: param.unit && (
                <Typography variant="caption" color="text.secondary">
                  {param.unit}
                </Typography>
              )
            }}
            inputProps={{
              min: param.min,
              max: param.max
            }}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={param.name}
            value={value}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
          />
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FactoryIcon />
          <Typography variant="h6">Create Facility from Template</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : !selectedTemplate ? (
          // Template Selection View
          <Box>
            <Typography variant="subtitle1" gutterBottom color="text.secondary">
              Select a facility template to get started:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, mt: 1 }}>
              {templates.map(template => (
                <Card
                  key={template.id}
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      {getTemplateIcon(template.category)}
                      <Typography variant="h6" align="center" gutterBottom>
                        {template.icon} {template.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        align="center"
                        sx={{ minHeight: 60 }}
                      >
                        {template.description}
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="center" mt={1}>
                        <Chip
                          label={template.complexity}
                          size="small"
                          color={
                            template.complexity === 'simple'
                              ? 'success'
                              : template.complexity === 'moderate'
                              ? 'warning'
                              : 'error'
                          }
                        />
                        <Chip
                          label={`${template.estimatedArea.min}-${template.estimatedArea.max} m²`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                        {template.regulatoryCompliance.join(', ')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        ) : (
          // Parameter Configuration View
          <Box>
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Box display="flex" alignItems="center" gap={2}>
                {getTemplateIcon(selectedTemplate.category)}
                <Box flex={1}>
                  <Typography variant="h6">
                    {selectedTemplate.icon} {selectedTemplate.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedTemplate.description}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip label={selectedTemplate.complexity} size="small" />
                    <Chip
                      label={`${selectedTemplate.estimatedArea.min}-${selectedTemplate.estimatedArea.max} m²`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Change Template
                </Button>
              </Box>
            </Paper>

            <Typography variant="subtitle1" gutterBottom>
              Configure Parameters:
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              {selectedTemplate.parameters.map(param => (
                <Box key={param.id}>
                  {renderParameterInput(param)}
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    {param.description}
                  </Typography>
                  {param.impact && (
                    <Typography variant="caption" color="primary" display="block">
                      💡 {param.impact}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>

            {selectedTemplate.parameters.length === 0 && (
              <Alert severity="info">
                This template has no configurable parameters. Click Generate to create the facility.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={generating}>
          Cancel
        </Button>
        {selectedTemplate && (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating}
            startIcon={generating && <CircularProgress size={20} />}
          >
            {generating ? 'Generating Facility...' : 'Generate Facility'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default FacilityTemplateSelector;
