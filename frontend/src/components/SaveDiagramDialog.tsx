import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';

interface SaveDiagramDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  nodeCount: number;
  relationshipCount: number;
}

const SaveDiagramDialog: React.FC<SaveDiagramDialogProps> = ({
  open,
  onClose,
  onSave,
  nodeCount,
  relationshipCount,
}) => {
  const [diagramName, setDiagramName] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmedName = diagramName.trim();

    if (!trimmedName) {
      setError('Please enter a diagram name');
      return;
    }

    if (trimmedName.length < 3) {
      setError('Diagram name must be at least 3 characters');
      return;
    }

    onSave(trimmedName);
    setDiagramName('');
    setError('');
  };

  const handleClose = () => {
    setDiagramName('');
    setError('');
    onClose();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Diagram</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Save your pharmaceutical facility diagram for later use.
          </Typography>

          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Nodes:</strong> {nodeCount}
            </Typography>
            <Typography variant="body2">
              <strong>Relationships:</strong> {relationshipCount}
            </Typography>
          </Box>

          <TextField
            autoFocus
            margin="dense"
            label="Diagram Name"
            type="text"
            fullWidth
            variant="outlined"
            value={diagramName}
            onChange={(e) => {
              setDiagramName(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            error={!!error}
            helperText={error || 'Enter a descriptive name for your diagram'}
            placeholder="e.g., Production Facility Layout"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!diagramName.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveDiagramDialog;
