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
  CircularProgress,
  Alert,
  Box,
  Typography,
  IconButton,
  Chip
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface LayoutSummary {
  id: string;
  name: string;
  shapeCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface LoadLayoutDialogProps {
  open: boolean;
  onClose: () => void;
  onLoad: (layoutId: string) => Promise<void>;
  onDelete?: (layoutId: string) => Promise<void>;
  onFetchLayouts: () => Promise<LayoutSummary[]>;
}

const LoadLayoutDialog: React.FC<LoadLayoutDialogProps> = ({
  open,
  onClose,
  onLoad,
  onDelete,
  onFetchLayouts
}) => {
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLayouts = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedLayouts = await onFetchLayouts();
      setLayouts(fetchedLayouts);
    } catch (err) {
      console.error('Error fetching layouts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch layouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchLayouts();
      setSelectedId(null);
    }
  }, [open]);

  const handleLoad = async () => {
    if (!selectedId) return;

    setLoadingLayout(true);
    setError(null);

    try {
      await onLoad(selectedId);
      onClose();
    } catch (err) {
      console.error('Error loading layout:', err);
      setError(err instanceof Error ? err.message : 'Failed to load layout');
    } finally {
      setLoadingLayout(false);
    }
  };

  const handleDelete = async (layoutId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this layout?')) return;

    setError(null);

    try {
      await onDelete(layoutId);
      await fetchLayouts(); // Refresh the list
      if (selectedId === layoutId) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Error deleting layout:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete layout');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Load Layout</Typography>
          <IconButton onClick={fetchLayouts} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : layouts.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No saved layouts found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Save your first layout to see it here
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {layouts.map((layout) => (
              <ListItem
                key={layout.id}
                disablePadding
                secondaryAction={
                  onDelete && (
                    <IconButton
                      edge="end"
                      onClick={(e) => handleDelete(layout.id, e)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemButton
                  selected={selectedId === layout.id}
                  onClick={() => setSelectedId(layout.id)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">{layout.name}</Typography>
                        {layout.shapeCount !== undefined && (
                          <Chip
                            label={`${layout.shapeCount} shapes`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" display="block">
                          Created: {formatDate(layout.createdAt)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Modified: {formatDate(layout.updatedAt)}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={loadingLayout}
          startIcon={<CloseIcon />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleLoad}
          disabled={!selectedId || loadingLayout}
          variant="contained"
          startIcon={loadingLayout ? <CircularProgress size={20} /> : <FolderOpenIcon />}
        >
          {loadingLayout ? 'Loading...' : 'Load'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoadLayoutDialog;
