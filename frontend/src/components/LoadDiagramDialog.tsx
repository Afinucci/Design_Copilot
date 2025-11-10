import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import { Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { apiService } from '../services/api';
import { Diagram } from '../types';

interface LoadDiagramDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (diagram: Diagram) => void;
}

const LoadDiagramDialog: React.FC<LoadDiagramDialogProps> = ({
  open,
  onClose,
  onLoad,
}) => {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDiagrams = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getDiagrams();
      setDiagrams(data);
    } catch (err) {
      console.error('Failed to load diagrams:', err);
      setError('Failed to load diagrams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDiagrams();
      setSelectedDiagram(null);
    }
  }, [open]);

  const handleLoad = async () => {
    if (!selectedDiagram) return;

    setLoading(true);
    setError('');
    try {
      // Fetch full diagram data including relationships
      console.log('🔍 Fetching diagram by ID:', selectedDiagram.id);
      const fullDiagram = await apiService.getDiagramById(selectedDiagram.id);
      console.log('📥 Received diagram from API:', fullDiagram);
      console.log('📊 Diagram relationships:', fullDiagram.relationships);
      onLoad(fullDiagram);
      handleClose();
    } catch (err) {
      console.error('Failed to load diagram:', err);
      setError('Failed to load diagram. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (event: React.MouseEvent, diagramId: string) => {
    event.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this diagram?')) {
      return;
    }

    setDeleting(diagramId);
    try {
      await apiService.deleteDiagram(diagramId);
      // Refresh the list
      await loadDiagrams();
      // Clear selection if deleted diagram was selected
      if (selectedDiagram?.id === diagramId) {
        setSelectedDiagram(null);
      }
    } catch (err) {
      console.error('Failed to delete diagram:', err);
      setError('Failed to delete diagram. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleClose = () => {
    setSelectedDiagram(null);
    setError('');
    onClose();
  };

  const formatDate = (dateValue: Date | string | null) => {
    if (!dateValue) return 'Unknown date';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Load Diagram</span>
        <IconButton onClick={loadDiagrams} disabled={loading} size="small">
          <RefreshIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && diagrams.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : diagrams.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No saved diagrams found. Create and save a diagram first.
            </Typography>
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {diagrams.map((diagram) => (
              <ListItem
                key={diagram.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => handleDelete(e, diagram.id)}
                    disabled={deleting === diagram.id}
                  >
                    {deleting === diagram.id ? (
                      <CircularProgress size={24} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton
                  selected={selectedDiagram?.id === diagram.id}
                  onClick={() => setSelectedDiagram(diagram)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">{diagram.name}</Typography>
                        <Chip
                          label={`${diagram.nodeCount || diagram.nodes?.length || 0} nodes`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${diagram.relationshipCount || diagram.relationships?.length || 0} edges`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatDate(diagram.createdAt)}
                        </Typography>
                        {diagram.updatedAt && diagram.updatedAt !== diagram.createdAt && (
                          <>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Updated: {formatDate(diagram.updatedAt)}
                            </Typography>
                          </>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleLoad}
          variant="contained"
          color="primary"
          disabled={!selectedDiagram || loading}
        >
          {loading ? 'Loading...' : 'Load'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadDiagramDialog;
