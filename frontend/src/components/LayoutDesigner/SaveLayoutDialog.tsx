import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';

interface SaveLayoutDialogProps {
  open: boolean;
  currentName?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

const SaveLayoutDialog: React.FC<SaveLayoutDialogProps> = ({
  open,
  currentName = '',
  onClose,
  onSave
}) => {
  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter a layout name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(name.trim());
      setName('');
      onClose();
    } catch (err) {
      console.error('Error saving layout:', err);
      setError(err instanceof Error ? err.message : 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setName('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Save Layout</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="Layout Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !saving) {
              handleSave();
            }
          }}
          helperText="Enter a descriptive name for this layout"
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={saving}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaveLayoutDialog;
