import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import {
  LocalShipping as MaterialIcon,
  Person as PersonnelIcon,
  Delete as WasteIcon,
  ArrowForward as UnidirectionalIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  SyncAlt as BidirectionalIcon
} from '@mui/icons-material';
import { DoorFlowType, DoorFlowDirection, UnidirectionalFlowDirection } from '../types';

interface DoorConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (flowType: DoorFlowType, flowDirection: DoorFlowDirection, unidirectionalDirection?: UnidirectionalFlowDirection) => void;
  fromShapeId?: string;
  toShapeId?: string;
}

/**
 * Dialog for configuring door connection properties
 */
export const DoorConnectionDialog: React.FC<DoorConnectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  fromShapeId,
  toShapeId
}) => {
  const [flowType, setFlowType] = useState<DoorFlowType>('material');
  const [flowDirection, setFlowDirection] = useState<DoorFlowDirection>('unidirectional');
  const [unidirectionalDirection, setUnidirectionalDirection] = useState<UnidirectionalFlowDirection>('fromFirstToSecond');

  const handleConfirm = () => {
    onConfirm(flowType, flowDirection, flowDirection === 'unidirectional' ? unidirectionalDirection : undefined);
    // Reset to defaults
    setFlowType('material');
    setFlowDirection('unidirectional');
    setUnidirectionalDirection('fromFirstToSecond');
  };

  const handleCancel = () => {
    onClose();
    // Reset to defaults
    setFlowType('material');
    setFlowDirection('unidirectional');
    setUnidirectionalDirection('fromFirstToSecond');
  };

  const getFlowTypeColor = (type: DoorFlowType): string => {
    switch (type) {
      case 'material': return '#2196F3';
      case 'personnel': return '#4CAF50';
      case 'waste': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Door Connection</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Connection Info */}
          {fromShapeId && toShapeId && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={fromShapeId} size="small" />
              <ArrowForwardIcon fontSize="small" />
              <Chip label={toShapeId} size="small" />
            </Box>
          )}

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
                    <Typography variant="caption" color="text.secondary">
                      (One-way flow)
                    </Typography>
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
                    <Typography variant="caption" color="text.secondary">
                      (Both directions)
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          {/* Arrow Direction Selection (only for unidirectional) */}
          {flowDirection === 'unidirectional' && fromShapeId && toShapeId && (
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
                      <Chip label={fromShapeId} size="small" color="primary" variant="outlined" />
                      <Typography>to</Typography>
                      <Chip label={toShapeId} size="small" color="secondary" variant="outlined" />
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
                      <Chip label={toShapeId} size="small" color="secondary" variant="outlined" />
                      <Typography>to</Typography>
                      <Chip label={fromShapeId} size="small" color="primary" variant="outlined" />
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Create Connection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DoorConnectionDialog;
