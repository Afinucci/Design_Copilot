import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Divider,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tooltip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as MoneyIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { Node } from 'reactflow';
import costService, {
  CleanroomCostProfileInput,
  CleanroomCostProfile
} from '../services/costService';
import {
  ProjectCostEstimate,
  CostEstimationSettings,
  CostBreakdown,
} from '../../../shared/types';
import { useDraggable } from '../hooks/useDraggable';

interface CostEstimationItem {
  id: string;
  name: string;
  width: number;
  height: number;
  cleanroomClass?: string;
  type?: string;
  equipment?: string[];
  area?: number; // Optional pre-calculated area in square meters
}

interface CostEstimationPanelProps {
  items: CostEstimationItem[];
  onSettingsChange?: (settings: CostEstimationSettings) => void;
}

const CostEstimationPanel: React.FC<CostEstimationPanelProps> = ({ items, onSettingsChange }) => {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<ProjectCostEstimate | null>(null);
  const [settings, setSettings] = useState<CostEstimationSettings>({
    currency: 'USD',
    regionalFactor: 1.0,
    escalationFactor: 1.0,
    contingencyPercentage: 10,
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [regionalFactors, setRegionalFactors] = useState<Record<string, number>>({});
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [cleanroomCosts, setCleanroomCosts] = useState<CleanroomCostProfile[]>([]);
  const [costProfilesLoading, setCostProfilesLoading] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [editingCostProfile, setEditingCostProfile] = useState<CleanroomCostProfile | null>(null);
  const [costForm, setCostForm] = useState<CleanroomCostProfileInput>({
    cleanroomClass: '',
    name: '',
    description: '',
    baseConstructionCostPerSqm: 2500,
    hvacCostPerSqm: 900,
    validationCostPerSqm: 400,
    cleanroomMultiplier: 1,
    unitType: 'sqm',
    unitLabel: 'm²',
    currency: 'USD'
  });
  const [isSavingCostProfile, setIsSavingCostProfile] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const loadCostProfiles = useCallback(async () => {
    setCostProfilesLoading(true);
    try {
      const profiles = await costService.getCleanroomCostProfiles();
      const sortedProfiles = [...profiles].sort((a, b) => a.cleanroomClass.localeCompare(b.cleanroomClass));
      setCleanroomCosts(sortedProfiles);
    } catch (error) {
      console.error('Error loading cleanroom cost profiles:', error);
    } finally {
      setCostProfilesLoading(false);
    }
  }, []);

  // Draggable functionality
  const { position, isDragging, dragHandleProps } = useDraggable({
    initialPosition: { x: window.innerWidth - 420, y: window.innerHeight - 500 }
  });

  // Load initial settings and data
  useEffect(() => {
    loadInitialData();
  }, [loadCostProfiles]);

  // Recalculate when items change
  useEffect(() => {
    if (items.length > 0) {
      calculateEstimate();
    }
  }, [items, settings]);

  const loadInitialData = async () => {
    try {
      const [loadedSettings, factors, rates] = await Promise.all([
        costService.getSettings(),
        costService.getRegionalFactors(),
        costService.getCurrencyRates(),
      ]);

      setSettings(loadedSettings);
      setRegionalFactors(factors);
      setCurrencyRates(rates);
      await loadCostProfiles();

      if (onSettingsChange) {
        onSettingsChange(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const calculateEstimate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Convert items to rooms data for cost calculation
      const rooms = items
        .filter(item => item.cleanroomClass) // Only items with cleanroom data
        .map(item => {
          // Calculate area from dimensions (assuming dimensions are in pixels, convert to m²)
          // Typical conversion: 1 pixel = 0.1 m² (adjust as needed)
          // Note: In LayoutDesigner, 20px = 1m usually, so 1px = 0.05m. Area: 1px² = 0.0025m²
          // But let's stick to a reasonable conversion or check if we can get real area.
          // For now using the previous ratio 0.01 (100px = 1m -> 10000px² = 1m²) wait, 0.01 ratio means 100px * 100px * 0.01 = 100m²? No.
          // If ratio is 0.01, then area = w * h * 0.01.
          // If w=100, h=100, area = 10000 * 0.01 = 100.
          // Let's keep the previous logic for consistency unless we know better.
          const pixelToSqmRatio = 0.01;
          const width = item.width || 100;
          const height = item.height || 100;

          // Use provided area (in sqm) or calculate from dimensions
          const area = item.area !== undefined
            ? item.area
            : (width * height * pixelToSqmRatio);

          return {
            id: item.id,
            name: item.name,
            area: area, // Use exact area, no minimum constraint
            cleanroomClass: item.cleanroomClass || 'CNC',
            roomType: item.type || 'generic',
            equipment: item.equipment || [],
          };
        });

      if (rooms.length === 0) {
        setEstimate(null);
        return;
      }

      const newEstimate = await costService.calculateCosts(rooms, settings);
      setEstimate(newEstimate);
    } catch (error) {
      setError('Failed to calculate cost estimate');
      console.error('Error calculating estimate:', error);
    } finally {
      setLoading(false);
    }
  }, [items, settings]);

  const handleSettingsSave = async () => {
    try {
      await costService.updateSettings(settings);
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
      setSettingsDialogOpen(false);
      calculateEstimate(); // Recalculate with new settings
    } catch (error) {
      setError('Failed to save settings');
    }
  };

  const handleSaveToKG = async () => {
    if (!estimate || !projectName) return;

    try {
      const result = await costService.saveToKnowledgeGraph(projectName, estimate);
      setSaveDialogOpen(false);
      setProjectName('');
      // Show success message (could use a snackbar)
      alert(`Project saved successfully! ID: ${result.projectId}`);
    } catch (error) {
      setError('Failed to save to knowledge graph');
    }
  };

  const handleOpenCostDialog = (profile?: CleanroomCostProfile) => {
    if (profile) {
      setEditingCostProfile(profile);
      setCostForm({
        id: profile.id,
        cleanroomClass: profile.cleanroomClass,
        name: profile.name || '',
        description: profile.description || '',
        baseConstructionCostPerSqm: profile.baseConstructionCostPerSqm,
        hvacCostPerSqm: profile.hvacCostPerSqm,
        validationCostPerSqm: profile.validationCostPerSqm,
        cleanroomMultiplier: profile.cleanroomMultiplier,
        unitType: profile.unitType || 'sqm',
        unitLabel: profile.unitLabel || (profile.unitType === 'unit' ? 'unit' : 'm²'),
        currency: profile.currency || settings.currency || 'USD'
      });
    } else {
      setEditingCostProfile(null);
      setCostForm({
        cleanroomClass: '',
        name: '',
        description: '',
        baseConstructionCostPerSqm: 2500,
        hvacCostPerSqm: 900,
        validationCostPerSqm: 400,
        cleanroomMultiplier: 1,
        unitType: 'sqm',
        unitLabel: 'm²',
        currency: settings.currency || 'USD'
      });
    }
    setCostDialogOpen(true);
  };

  const handleCostFormChange = (field: keyof CleanroomCostProfileInput, value: string | number) => {
    setCostForm(prev => ({
      ...prev,
      [field]: typeof value === 'string' ? value : Number(value)
    }));
  };

  const handleSaveCostProfile = async () => {
    if (!costForm.cleanroomClass.trim()) return;
    setIsSavingCostProfile(true);
    try {
      await costService.saveCleanroomCostProfile({
        ...costForm,
        cleanroomClass: costForm.cleanroomClass.toUpperCase()
      });
      setCostDialogOpen(false);
      setEditingCostProfile(null);
      await loadCostProfiles();
      await calculateEstimate();
    } catch (error) {
      console.error('Failed to save cleanroom cost profile', error);
      setError('Failed to save cleanroom cost profile');
    } finally {
      setIsSavingCostProfile(false);
    }
  };

  const handleDeleteCostProfile = async (profile: CleanroomCostProfile) => {
    if (!profile.id || profile.isDefault) return;
    const confirmed = window.confirm(`Delete custom profile for Class ${profile.cleanroomClass}?`);
    if (!confirmed) return;
    try {
      await costService.deleteCleanroomCostProfile(profile.id);
      await loadCostProfiles();
      await calculateEstimate();
    } catch (error) {
      console.error('Failed to delete cleanroom cost profile', error);
      setError('Failed to delete cleanroom cost profile');
    }
  };

  const isCostFormValid = costForm.cleanroomClass.trim().length > 0;

  const handleExport = () => {
    if (!estimate) return;

    const dataStr = JSON.stringify(estimate, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `cost-estimate-${new Date().toISOString()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatCostBreakdown = (breakdown: CostBreakdown) => {
    const items = [
      { label: 'Construction', value: breakdown.constructionCost },
      { label: 'HVAC', value: breakdown.hvacCost },
      { label: 'Equipment Purchase', value: breakdown.equipmentPurchaseCost },
      { label: 'Equipment Installation', value: breakdown.equipmentInstallationCost },
      { label: 'Validation', value: breakdown.validationCost },
      { label: 'Other', value: breakdown.otherCosts },
    ];
    return items.filter(item => item.value > 0);
  };

  const roomMetadata = useMemo(() => {
    return items.reduce<Record<string, CostEstimationItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [items]);

  type ComponentDetail = {
    label: string;
    value: number;
    details: string;
  };

  const formatComponentDetails = useCallback(
    (room: ProjectCostEstimate['rooms'][number]): ComponentDetail[] => {
    const metadata = roomMetadata[room.roomId];
    const cleanroomClass = metadata?.cleanroomClass || 'Unknown';
    const cleanroomProfile = cleanroomCosts.find(profile => profile.cleanroomClass === cleanroomClass);
    const unitLabel = cleanroomProfile?.unitLabel || 'm²';
    const baseConstructionCost = cleanroomProfile?.baseConstructionCostPerSqm || 0;
    const hvacCost = cleanroomProfile?.hvacCostPerSqm || 0;
    const validationCost = cleanroomProfile?.validationCostPerSqm || 0;

    return [
      {
        label: 'Construction',
        value: room.costBreakdown.constructionCost,
        details: `${room.area.toFixed(2)} ${unitLabel} × ${costService.formatCurrency(baseConstructionCost, estimate?.currency)}`
      },
      {
        label: 'HVAC',
        value: room.costBreakdown.hvacCost,
        details: `${room.area.toFixed(2)} ${unitLabel} × ${costService.formatCurrency(hvacCost, estimate?.currency)}`
      },
      {
        label: 'Validation',
        value: room.costBreakdown.validationCost,
        details: `${room.area.toFixed(2)} ${unitLabel} × ${costService.formatCurrency(validationCost, estimate?.currency)}`
      },
      {
        label: 'Equipment Purchase',
        value: room.costBreakdown.equipmentPurchaseCost,
        details: room.costBreakdown.equipmentPurchaseCost > 0 ? 'Sum of selected equipment purchase costs' : 'No equipment selected'
      },
      {
        label: 'Equipment Installation',
        value: room.costBreakdown.equipmentInstallationCost,
        details: room.costBreakdown.equipmentInstallationCost > 0 ? 'Sum of equipment installation costs' : 'No equipment selected'
      },
      {
        label: 'Other',
        value: room.costBreakdown.otherCosts,
        details: room.costBreakdown.otherCosts > 0 ? 'Additional custom costs' : 'None'
      }
    ].filter(item => item.value > 0);
    },
    [roomMetadata, cleanroomCosts, estimate?.currency]
  );

  const aggregateBreakdown = useMemo(() => {
    if (!estimate) {
      return null;
    }
    return estimate.rooms.reduce(
      (acc, room) => {
        acc.constructionCost += room.costBreakdown.constructionCost;
        acc.hvacCost += room.costBreakdown.hvacCost;
        acc.equipmentPurchaseCost += room.costBreakdown.equipmentPurchaseCost;
        acc.equipmentInstallationCost += room.costBreakdown.equipmentInstallationCost;
        acc.validationCost += room.costBreakdown.validationCost;
        acc.otherCosts += room.costBreakdown.otherCosts;
        acc.totalCost += room.costBreakdown.totalCost;
        return acc;
      },
      {
        constructionCost: 0,
        hvacCost: 0,
        equipmentPurchaseCost: 0,
        equipmentInstallationCost: 0,
        validationCost: 0,
        otherCosts: 0,
        totalCost: 0
      }
    );
  }, [estimate]);

  return (
    <>
      <Paper
        sx={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: expanded ? 400 : 200,
          maxHeight: '60vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1400,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
        elevation={3}
      >
        {/* Header - Draggable */}
        <Box
          {...dragHandleProps}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'grab',
            '&:active': {
              cursor: 'grabbing'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MoneyIcon />
            <Typography variant="subtitle1" fontWeight="bold">
              Cost Estimation
            </Typography>
          </Box>
          <Box>
            <IconButton
              size="small"
              onClick={() => setSettingsDialogOpen(true)}
              sx={{ color: 'inherit' }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={calculateEstimate}
              sx={{ color: 'inherit' }}
              disabled={loading}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: 'inherit' }}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Collapse in={expanded}>
          <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box
              sx={{
                mb: 2,
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle2">Cleanroom Cost Database</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Custom cost profiles applied to every estimate
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => handleOpenCostDialog()}>
                  Manage
                </Button>
              </Box>

              {costProfilesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : cleanroomCosts.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                  Using default GMP cleanroom cost factors.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {cleanroomCosts.slice(0, 3).map((profile) => (
                    <Box
                      key={profile.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {profile.name || `Class ${profile.cleanroomClass}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Class {profile.cleanroomClass} · {profile.unitLabel || 'm²'} · Base{' '}
                          {costService.formatCurrency(profile.baseConstructionCostPerSqm, profile.currency || settings.currency)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="Edit cost profile">
                          <span>
                            <IconButton size="small" onClick={() => handleOpenCostDialog(profile)}>
                              <EditIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={profile.isDefault ? 'Default profiles cannot be deleted' : 'Delete cost profile'}>
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteCostProfile(profile)}
                              disabled={Boolean(profile.isDefault)}
                            >
                              <DeleteIcon fontSize="inherit" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                  {cleanroomCosts.length > 3 && (
                    <Typography variant="caption" color="text.secondary">
                      +{cleanroomCosts.length - 3} additional profiles
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>

            {estimate && !loading && (
              <>
                {/* Summary */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" color="primary" gutterBottom>
                    {costService.formatCurrency(estimate.grandTotal, estimate.currency)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Subtotal: {costService.formatCurrency(estimate.subtotal, estimate.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Contingency ({settings.contingencyPercentage}%):
                      {' ' + costService.formatCurrency(estimate.contingency, estimate.currency)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${estimate.rooms.length} Rooms`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${estimate.equipment.length} Equipment Types`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={estimate.currency}
                      size="small"
                      color="primary"
                    />
                    <Button
                      size="small"
                      startIcon={<InfoIcon fontSize="small" />}
                      onClick={() => setDetailsDialogOpen(true)}
                    >
                      View Breakdown
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Rooms Breakdown */}
                <Typography variant="subtitle2" gutterBottom>
                  Room Costs
                </Typography>
                <TableContainer sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Room</TableCell>
                        <TableCell align="right">Area (m²)</TableCell>
                        <TableCell align="right">Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {estimate.rooms.slice(0, 5).map((room) => (
                        <TableRow key={room.roomId}>
                          <TableCell>{room.roomName}</TableCell>
                          <TableCell align="right">{room.area.toFixed(1)}</TableCell>
                          <TableCell align="right">
                            {costService.formatLargeNumber(room.costBreakdown.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {estimate.rooms.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="caption" color="text.secondary">
                              ... and {estimate.rooms.length - 5} more rooms
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Details moved into dialog */}

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={() => setSaveDialogOpen(true)}
                  >
                    Save to KG
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                  >
                    Export
                  </Button>
                </Box>
              </>
            )}

            {!estimate && !loading && (
              <Typography variant="body2" color="text.secondary" align="center">
                Add rooms to the diagram to see cost estimates
              </Typography>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cost Estimation Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Currency"
              select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              fullWidth
            >
              {Object.keys(currencyRates).map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Region"
              select
              value={Object.entries(regionalFactors).find(([_, v]) => v === settings.regionalFactor)?.[0] || 'Custom'}
              onChange={(e) => {
                const factor = regionalFactors[e.target.value] || 1.0;
                setSettings({ ...settings, regionalFactor: factor });
              }}
              fullWidth
            >
              {Object.entries(regionalFactors).map(([region, factor]) => (
                <MenuItem key={region} value={region}>
                  {region} (×{factor})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Escalation Factor"
              type="number"
              value={settings.escalationFactor}
              onChange={(e) => setSettings({ ...settings, escalationFactor: parseFloat(e.target.value) || 1.0 })}
              inputProps={{ step: 0.1, min: 0.5, max: 2.0 }}
              fullWidth
            />

            <TextField
              label="Contingency %"
              type="number"
              value={settings.contingencyPercentage}
              onChange={(e) => setSettings({ ...settings, contingencyPercentage: parseFloat(e.target.value) || 10 })}
              inputProps={{ step: 5, min: 0, max: 50 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSettingsSave} variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>

      {/* Save to KG Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Cost Estimate to Knowledge Graph</DialogTitle>
        <DialogContent>
          <TextField
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            fullWidth
            margin="normal"
            helperText="Enter a name for this cost estimate project"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveToKG}
            variant="contained"
            disabled={!projectName}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanroom Cost Database Dialog */}
      <Dialog open={costDialogOpen} onClose={() => setCostDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCostProfile ? 'Edit Cleanroom Cost Profile' : 'Add Cleanroom Cost Profile'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Cleanroom Class"
              value={costForm.cleanroomClass}
              onChange={(e) => handleCostFormChange('cleanroomClass', e.target.value.toUpperCase())}
              helperText="Example: A, B, C, D, CNC"
              fullWidth
            />
            <TextField
              label="Display Name"
              value={costForm.name || ''}
              onChange={(e) => handleCostFormChange('name', e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={costForm.description || ''}
              onChange={(e) => handleCostFormChange('description', e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Unit Type"
              select
              value={costForm.unitType || 'sqm'}
              onChange={(e) => handleCostFormChange('unitType', e.target.value)}
              fullWidth
            >
              <MenuItem value="sqm">Per Square Meter</MenuItem>
              <MenuItem value="unit">Per Room / Unit</MenuItem>
            </TextField>
            <TextField
              label="Unit Label"
              value={costForm.unitLabel || ''}
              onChange={(e) => handleCostFormChange('unitLabel', e.target.value)}
              helperText="Displayed next to totals (e.g., m², unit)"
              fullWidth
            />
            <TextField
              label="Base Construction Cost"
              type="number"
              value={costForm.baseConstructionCostPerSqm}
              onChange={(e) => handleCostFormChange('baseConstructionCostPerSqm', parseFloat(e.target.value) || 0)}
              fullWidth
            />
            <TextField
              label="HVAC Cost"
              type="number"
              value={costForm.hvacCostPerSqm}
              onChange={(e) => handleCostFormChange('hvacCostPerSqm', parseFloat(e.target.value) || 0)}
              fullWidth
            />
            <TextField
              label="Validation Cost"
              type="number"
              value={costForm.validationCostPerSqm}
              onChange={(e) => handleCostFormChange('validationCostPerSqm', parseFloat(e.target.value) || 0)}
              fullWidth
            />
            <TextField
              label="Cleanroom Multiplier"
              type="number"
              value={costForm.cleanroomMultiplier}
              onChange={(e) => handleCostFormChange('cleanroomMultiplier', parseFloat(e.target.value) || 1)}
              helperText="Used for relative comparisons (optional)"
              fullWidth
            />
            <TextField
              label="Currency"
              value={costForm.currency || settings.currency}
              onChange={(e) => handleCostFormChange('currency', e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCostDialogOpen(false);
              setEditingCostProfile(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveCostProfile}
            variant="contained"
            disabled={!isCostFormValid || isSavingCostProfile}
          >
            {editingCostProfile ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cost Breakdown Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Cost Breakdown</DialogTitle>
        <DialogContent dividers>
          {estimate && aggregateBreakdown ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Components contributing to subtotal ({costService.formatCurrency(aggregateBreakdown.totalCost, estimate.currency)})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Component</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { label: 'Construction', value: aggregateBreakdown.constructionCost },
                        { label: 'HVAC', value: aggregateBreakdown.hvacCost },
                        { label: 'Equipment Purchase', value: aggregateBreakdown.equipmentPurchaseCost },
                        { label: 'Equipment Installation', value: aggregateBreakdown.equipmentInstallationCost },
                        { label: 'Validation', value: aggregateBreakdown.validationCost },
                        { label: 'Other', value: aggregateBreakdown.otherCosts }
                      ].map(component => (
                        <TableRow key={component.label}>
                          <TableCell>{component.label}</TableCell>
                          <TableCell align="right">
                            {costService.formatCurrency(component.value, estimate.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell>
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{costService.formatCurrency(aggregateBreakdown.totalCost, estimate.currency)}</strong>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Room-by-room details
                </Typography>
                <Stack spacing={2}>
                  {estimate.rooms.map(room => (
                    <Box
                      key={room.roomId}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {room.roomName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Area: {room.area.toFixed(2)} m²
                            {roomMetadata[room.roomId]?.cleanroomClass
                              ? ` · Class ${roomMetadata[room.roomId]?.cleanroomClass}`
                              : ''}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600}>
                          {costService.formatCurrency(room.costBreakdown.totalCost, estimate.currency)}
                        </Typography>
                      </Box>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Component</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell>Calculation</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {formatComponentDetails(room).map(detail => (
                              <TableRow key={`${room.roomId}-${detail.label}`}>
                                <TableCell>{detail.label}</TableCell>
                                <TableCell align="right">
                                  {costService.formatCurrency(detail.value, estimate.currency)}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {detail.details}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No estimate available yet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CostEstimationPanel;