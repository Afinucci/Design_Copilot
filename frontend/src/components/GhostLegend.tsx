import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
} from '@mui/material';
import { 
  Visibility, 
  TouchApp, 
  AutoFixHigh,
  Insights
} from '@mui/icons-material';

interface GhostLegendProps {
  isVisible: boolean;
  suggestionCount: number;
}

const GhostLegend: React.FC<GhostLegendProps> = ({ 
  isVisible, 
  suggestionCount
}) => {
  if (!isVisible) return null;



  return (
    <Paper 
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 280,
        p: 2,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #e0e0e0',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <AutoFixHigh sx={{ mr: 1, color: '#9c27b0' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Ghost Suggestions
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Real-time AI suggestions based on pharmaceutical facility patterns from the knowledge graph.
      </Typography>

      <Divider sx={{ mb: 1.5 }} />

      {/* Status */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Insights sx={{ mr: 1, fontSize: 16, color: '#1976d2' }} />
          <Typography variant="body2">
            <strong>{suggestionCount}</strong> active suggestions
          </Typography>
        </Box>
        

      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Instructions */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          How to Use:
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <Visibility sx={{ mr: 1, fontSize: 16, color: '#666', mt: 0.2 }} />
          <Typography variant="caption" color="text.secondary">
            Select a node to see related nodes from knowledge graph
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <TouchApp sx={{ mr: 1, fontSize: 16, color: '#666', mt: 0.2 }} />
          <Typography variant="caption" color="text.secondary">
            Click ghost nodes to materialize them
          </Typography>
        </Box>
      </Box>



      {/* Visual indicators */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          💡 Semi-transparent nodes show available connections
          <br />
          🔗 Dashed lines show relationship types
          <br />
          ⚡ Patterns learned from historical designs
        </Typography>
      </Box>
    </Paper>
  );
};

export default GhostLegend;