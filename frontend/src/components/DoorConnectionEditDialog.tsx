import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Chip,
  IconButton
} from '@mui/material';
import {
  LocalShipping as MaterialIcon,
  Person as PersonnelIcon,
  Delete as WasteIcon,
  ArrowForward as UnidirectionalIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  SyncAlt as BidirectionalIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DoorFlowType, DoorFlowDirection, DoorConnection, UnidirectionalFlowDirection } from '../types';

interface DoorConnectionEditDialogProps {
  open: boolean;
  connection: DoorConnection | null;
  onClose: () => void;
  onUpdate: (id: string, flowType: DoorFlowType, flowDirection: DoorFlowDirection, unidirectionalDirection?: UnidirectionalFlowDirection) => void;
  onDelete: (id: string) => void;
}

/**
 * Dialog for editing existing door connections
 */
export const DoorConnectionEditDialog: React.FC<DoorConnectionEditDialogProps> = ({
  open,
  connection,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [flowType, setFlowType] = useState<DoorFlowType>('material');
  const [flowDirection, setFlowDirection] = useState<DoorFlowDirection>('unidirectional');
  const [unidirectionalDirection, setUnidirectionalDirection] = useState<UnidirectionalFlowDirection>('fromFirstToSecond');

  // Update state when connection changes
  useEffect(() => {
    if (connection) {
      setFlowType(connection.flowType);
      setFlowDirection(connection.flowDirection);
      setUnidirectionalDirection(connection.unidirectionalDirection || 'fromFirstToSecond');
    }
  }, [connection]);

  const handleUpdate = () => {
    if (connection) {
      onUpdate(connection.id, flowType, flowDirection, flowDirection === 'unidirectional' ? unidirectionalDirection : undefined);
    }
    onClose();
  };

  const handleDelete = () => {
    if (connection && window.confirm('Are you sure you want to delete this door connection?')) {
      onDelete(connection.id);
    }
    onClose();
  };

  const getFlowTypeColor = (type: DoorFlowType): string => {
    switch (type) {
      case 'material': return '#2196F3';
      case 'personnel': return '#4CAF50';
      case 'waste': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (!connection) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          Edit Door Connection
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Connection Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={connection.fromShape.shapeId} size="small" />
            <Typography variant="body2">↔</Typography>
            <Chip label={connection.toShape.shapeId} size="small" />
          </Box>

          {/* Flow Type Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" gutterBottom>
                Flow Type
              </Typography>
            </FormLabel>
            <RadioGroup
              value={flowType}
              onChange={(e) => setFlowType(e.target.value as DoorFlowType)}
            >
              <FormControlLabel
                value="material"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MaterialIcon sx={{ color: getFlowTypeColor('material') }} />
                    <Typography>Material Flow</Typography>
                    <Chip
                      label="Blue"
                      size="small"
                      sx={{ bgcolor: getFlowTypeColor('material'), color: 'white' }}
                    />
                  </Box>
                }
              />
              <FormControlLabel
                value="personnel"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonnelIcon sx={{ color: getFlowTypeColor('personnel') }} />
                    <Typography>Personnel Flow</Typography>
                    <Chip
                      label="Green"
                      size="small"
                      sx={{ bgcolor: getFlowTypeColor('personnel'), color: 'white' }}
                    />
                  </Box>
                }
              />
              <FormControlLabel
                value="waste"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WasteIcon sx={{ color: getFlowTypeColor('waste') }} />
                    <Typography>Waste Flow</Typography>
                    <Chip
                      label="Red"
                      size="small"
                      sx={{ bgcolor: getFlowTypeColor('waste'), color: 'white' }}
                    />
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Flow Direction Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="subtitle2" gutterBottom>
                Flow Direction
              </Typography>
            </FormLabel>
            <RadioGroup
              value={flowDirection}
              onChange={(e) => setFlowDirection(e.target.value as DoorFlowDirection)}
            >
              <FormControlLabel
                value="unidirectional"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UnidirectionalIcon />
                    <Typography>Unidirectional</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="bidirectional"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BidirectionalIcon />
                    <Typography>Bidirectional</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Arrow Direction Selection (only for unidirectional) */}
          {flowDirection === 'unidirectional' && connection && (
            <FormControl component="fieldset">
              <FormLabel component="legend">
                <Typography variant="subtitle2" gutterBottom>
                  Arrow Direction
                </Typography>
              </FormLabel>
              <RadioGroup
                value={unidirectionalDirection}
                onChange={(e) => setUnidirectionalDirection(e.target.value as UnidirectionalFlowDirection)}
              >
                <FormControlLabel
                  value="fromFirstToSecond"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowForwardIcon color="primary" />
                      <Typography>From</Typography>
                      <Chip label={connection.fromShape.shapeId} size="small" color="primary" variant="outlined" />
                      <Typography>to</Typography>
                      <Chip label={connection.toShape.shapeId} size="small" color="secondary" variant="outlined" />
                    </Box>
                  }
                />
                <FormControlLabel
                  value="fromSecondToFirst"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowBackIcon color="secondary" />
                      <Typography>From</Typography>
                      <Chip label={connection.toShape.shapeId} size="small" color="secondary" variant="outlined" />
                      <Typography>to</Typography>
                      <Chip label={connection.fromShape.shapeId} size="small" color="primary" variant="outlined" />
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDelete} color="error">
          Delete Connection
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleUpdate} variant="contained" color="primary">
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoorConnectionEditDialog;
