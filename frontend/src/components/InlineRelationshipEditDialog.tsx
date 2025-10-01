import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  Chip,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Room,
  Warning,
  Speed,
  Settings,
  SwapHoriz,
  Person,
  Close as CloseIcon,
} from '@mui/icons-material';
import { SpatialRelationship, DiagramEdge } from '../types';
import { Node } from 'reactflow';

interface InlineRelationshipEditDialogProps {
  open: boolean;
  edge: DiagramEdge | null;
  nodes: Node[];
  onClose: () => void;
  onUpdate: (edgeId: string, updates: Partial<SpatialRelationship>) => void;
  onDelete: (edgeId: string) => void;
}

const InlineRelationshipEditDialog: React.FC<InlineRelationshipEditDialogProps> = ({
  open,
  edge,
  nodes,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SpatialRelationship>>({});

  // Initialize form data when edge changes
  useEffect(() => {
    if (edge && edge.data) {
      const edgeData = edge.data as any;
      setFormData({
        type: edgeData.relationshipType || 'ADJACENT_TO',
        priority: edgeData.priority || 5,
        reason: edgeData.reason || '',
        doorType: edgeData.doorType,
        minDistance: edgeData.minDistance,
        maxDistance: edgeData.maxDistance,
        flowDirection: edgeData.flowDirection,
        flowType: edgeData.flowType,
      });
    }
    setEditMode(false);
  }, [edge]);

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return <Room color="primary" />;
      case 'PROHIBITED_NEAR': return <Warning color="error" />;
      case 'REQUIRES_ACCESS': return <Speed color="info" />;
      case 'SHARES_UTILITY': return <Settings color="success" />;
      case 'MATERIAL_FLOW': return <SwapHoriz color="secondary" />;
      case 'PERSONNEL_FLOW': return <Person color="warning" />;
      default: return <Room />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return '#1976d2';
      case 'PROHIBITED_NEAR': return '#d32f2f';
      case 'REQUIRES_ACCESS': return '#0288d1';
      case 'SHARES_UTILITY': return '#388e3c';
      case 'MATERIAL_FLOW': return '#9c27b0';
      case 'PERSONNEL_FLOW': return '#ff9800';
      default: return '#757575';
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return 'Adjacent To';
      case 'PROHIBITED_NEAR': return 'Prohibited Near';
      case 'REQUIRES_ACCESS': return 'Requires Access';
      case 'SHARES_UTILITY': return 'Shares Utility';
      case 'MATERIAL_FLOW': return 'Material Flow';
      case 'PERSONNEL_FLOW': return 'Personnel Flow';
      default: return 'Relationship';
    }
  };

  const getNodeName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data?.name || node?.data?.label || nodeId;
  };

  const handleSave = () => {
    if (edge && formData.reason?.trim()) {
      onUpdate(edge.id, formData);
      setEditMode(false);
    }
  };

  const handleDelete = () => {
    if (edge && window.confirm('Are you sure you want to delete this relationship?')) {
      onDelete(edge.id);
      onClose();
    }
  };

  const handleCancel = () => {
    if (edge && edge.data) {
      const edgeData = edge.data as any;
      setFormData({
        type: edgeData.relationshipType || 'ADJACENT_TO',
        priority: edgeData.priority || 5,
        reason: edgeData.reason || '',
        doorType: edgeData.doorType,
        minDistance: edgeData.minDistance,
        maxDistance: edgeData.maxDistance,
        flowDirection: edgeData.flowDirection,
        flowType: edgeData.flowType,
      });
    }
    setEditMode(false);
  };

  const relationshipTypes = [
    'ADJACENT_TO',
    'PROHIBITED_NEAR',
    'REQUIRES_ACCESS',
    'SHARES_UTILITY',
    'MATERIAL_FLOW',
    'PERSONNEL_FLOW',
  ];

  if (!edge) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 2 } }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getRelationshipIcon(formData.type || 'ADJACENT_TO')}
            <Typography variant="h6">
              {editMode ? 'Edit' : 'View'} Relationship
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Between <strong>{getNodeName(edge.source)}</strong> and <strong>{getNodeName(edge.target)}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Relationship Type */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Relationship Type
            </Typography>
            {editMode ? (
              <FormControl fullWidth size="small">
                <Select
                  value={formData.type || 'ADJACENT_TO'}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                >
                  {relationshipTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getRelationshipIcon(type)}
                        {getRelationshipLabel(type)}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Chip
                icon={getRelationshipIcon(formData.type || 'ADJACENT_TO')}
                label={getRelationshipLabel(formData.type || 'ADJACENT_TO')}
                sx={{
                  backgroundColor: getRelationshipColor(formData.type || 'ADJACENT_TO'),
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
              />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Priority */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Priority (1-10)
            </Typography>
            {editMode ? (
              <TextField
                fullWidth
                size="small"
                type="number"
                value={formData.priority || 5}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
                slotProps={{ htmlInput: { min: 1, max: 10 } }}
              />
            ) : (
              <Chip
                label={`Priority: ${formData.priority || 5}`}
                variant="outlined"
                size="small"
              />
            )}
          </Box>

          {/* Reason */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Reason
            </Typography>
            {editMode ? (
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                value={formData.reason || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the reason for this relationship"
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {formData.reason || 'No reason provided'}
              </Typography>
            )}
          </Box>

          {/* Type-specific fields */}
          {formData.type === 'ADJACENT_TO' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Door Type
              </Typography>
              {editMode ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={formData.doorType || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, doorType: e.target.value as string }))}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No door specified</em>
                    </MenuItem>
                    <MenuItem value="standard">Standard - Regular hinged door</MenuItem>
                    <MenuItem value="double">Double - Wide material/equipment transfer</MenuItem>
                    <MenuItem value="sliding">Sliding - Space-efficient personnel access</MenuItem>
                    <MenuItem value="airlock">Airlock - GMP critical interlocked doors</MenuItem>
                    <MenuItem value="pass-through">Pass-Through - Small material transfer hatch</MenuItem>
                    <MenuItem value="emergency">Emergency - Fire-rated exit door</MenuItem>
                    <MenuItem value="roll-up">Roll-Up - Overhead for large equipment</MenuItem>
                    <MenuItem value="automatic">Automatic - Sensor-activated sliding</MenuItem>
                    <MenuItem value="cleanroom-rated">Cleanroom-Rated - Airtight seal door</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {formData.doorType ? formData.doorType.replace('-', ' ').toUpperCase() : 'Not specified'}
                  </Typography>
                  {formData.doorType && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {formData.doorType}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {formData.type === 'PROHIBITED_NEAR' && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Distance Constraints
              </Typography>
              {editMode ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Min Distance (m)"
                    size="small"
                    type="number"
                    value={formData.minDistance || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, minDistance: parseInt(e.target.value) || undefined }))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Max Distance (m)"
                    size="small"
                    type="number"
                    value={formData.maxDistance || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || undefined }))}
                    sx={{ flex: 1 }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Min: {formData.minDistance ? `${formData.minDistance}m` : 'Not set'}, 
                  Max: {formData.maxDistance ? `${formData.maxDistance}m` : 'Not set'}
                </Typography>
              )}
            </Box>
          )}

          {(formData.type === 'MATERIAL_FLOW' || formData.type === 'PERSONNEL_FLOW') && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Flow Direction
                </Typography>
                {editMode ? (
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.flowDirection || 'bidirectional'}
                      onChange={(e) => setFormData(prev => ({ ...prev, flowDirection: e.target.value as any }))}
                    >
                      <MenuItem value="bidirectional">Bidirectional</MenuItem>
                      <MenuItem value="unidirectional">Unidirectional</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Chip
                    label={formData.flowDirection || 'Bidirectional'}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Flow Type
                </Typography>
                {editMode ? (
                  <FormControl fullWidth size="small">
                    <Select
                      value={formData.flowType || 'raw_material'}
                      onChange={(e) => setFormData(prev => ({ ...prev, flowType: e.target.value as any }))}
                    >
                      {formData.type === 'MATERIAL_FLOW' ? (
                        <>
                          <MenuItem value="raw_material">Raw Material</MenuItem>
                          <MenuItem value="finished_product">Finished Product</MenuItem>
                          <MenuItem value="waste">Waste</MenuItem>
                          <MenuItem value="equipment">Equipment</MenuItem>
                        </>
                      ) : (
                        <>
                          <MenuItem value="personnel">Personnel</MenuItem>
                          <MenuItem value="equipment">Equipment Movement</MenuItem>
                        </>
                      )}
                    </Select>
                  </FormControl>
                ) : (
                  <Chip
                    label={formData.flowType?.replace('_', ' ') || 'Raw Material'}
                    variant="outlined"
                    size="small"
                  />
                )}
              </Box>
            </>
          )}

          {editMode && !formData.reason?.trim() && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please provide a reason for this relationship.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {editMode ? (
          <>
            <Button onClick={handleCancel} startIcon={<CancelIcon />}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!formData.reason?.trim()}
            >
              Save Changes
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={handleDelete}
              color="error"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
            <Button 
              onClick={() => setEditMode(true)}
              variant="contained"
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default InlineRelationshipEditDialog;