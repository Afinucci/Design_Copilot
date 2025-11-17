import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as MoneyIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Node } from 'reactflow';
import costService from '../services/costService';
import {
  ProjectCostEstimate,
  CostEstimationSettings,
  CostBreakdown,
} from '../../../shared/types';

interface CostEstimationPanelProps {
  nodes: Node[];
  onSettingsChange?: (settings: CostEstimationSettings) => void;
}

const CostEstimationPanel: React.FC<CostEstimationPanelProps> = ({ nodes, onSettingsChange }) => {
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

  // Load initial settings and data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      calculateEstimate();
    }
  }, [nodes, settings]);

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
      // Convert nodes to rooms data for cost calculation
      const rooms = nodes
        .filter(node => node.data && node.data.cleanroomClass) // Only nodes with cleanroom data
        .map(node => {
          // Calculate area from node dimensions (assuming dimensions are in pixels, convert to m²)
          // Typical conversion: 1 pixel = 0.1 m² (adjust as needed)
          const pixelToSqmRatio = 0.01; // 100 pixels = 1 m²
          const width = node.width || node.data.defaultSize?.width || 100;
          const height = node.height || node.data.defaultSize?.height || 100;
          const area = width * height * pixelToSqmRatio;

          return {
            id: node.id,
            name: node.data.name || node.data.label || node.id,
            area: Math.max(area, 10), // Minimum 10 m²
            cleanroomClass: node.data.cleanroomClass || 'CNC',
            roomType: node.data.id || node.type || 'generic',
            equipment: node.data.typicalEquipment || [],
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
  }, [nodes, settings]);

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

  return (
    <>
      <Paper
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: expanded ? 400 : 200,
          maxHeight: '60vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
        }}
        elevation={3}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
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
                          <TableCell align="right">{room.area.toFixed(0)}</TableCell>
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
    </>
  );
};

export default CostEstimationPanel;