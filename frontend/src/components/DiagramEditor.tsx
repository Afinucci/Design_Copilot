import React, { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Architecture as ArchitectureIcon,
  Create as CreateIcon,
  Explore as ExploreIcon
} from '@mui/icons-material';
import { AppMode } from '../types';
import LayoutDesigner from './LayoutDesigner/LayoutDesigner';
import CreationMode from './CreationMode/CreationMode';
import { apiService } from '../services/api';

const DiagramEditor: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('layoutDesigner');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    showSnackbar(`Switched to ${newMode} mode`, 'info');
  };

  const handleSaveDiagram = async (diagramData: any) => {
    try {
      console.log('💾 DiagramEditor: Saving diagram to Neo4j...');
      console.log('📊 Diagram structure:', {
        nodeCount: diagramData.nodes?.length || 0,
        relationshipCount: diagramData.relationships?.length || 0,
        hasMetadata: !!diagramData.metadata,
        sampleNode: diagramData.nodes?.[0],
        sampleRelationship: diagramData.relationships?.[0]
      });
      console.log('📦 Full diagram data:', JSON.stringify(diagramData, null, 2));

      // Call the enhanced persist API endpoint
      const response = await apiService.persistToKnowledgeGraphEnhanced(diagramData);

      console.log('✅ Diagram saved successfully:', response);
      showSnackbar(
        `Diagram uploaded to Neo4j: ${response.nodesAdded} nodes, ${response.relationshipsAdded} relationships`,
        'success'
      );
    } catch (error) {
      console.error('❌ DiagramEditor: Failed to save diagram:', error);
      console.error('Error details:', error);
      showSnackbar(
        `Failed to upload diagram to Neo4j: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <ScienceIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Pharmaceutical Facility Design Copilot
          </Typography>

          {/* Mode Selector */}
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, value) => value && handleModeChange(value)}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="creation" aria-label="creation mode">
              <CreateIcon sx={{ mr: 1 }} />
              Creation
            </ToggleButton>
            <ToggleButton value="exploration" aria-label="exploration mode">
              <ExploreIcon sx={{ mr: 1 }} />
              Exploration
            </ToggleButton>
            <ToggleButton value="layoutDesigner" aria-label="layout designer">
              <ArchitectureIcon sx={{ mr: 1 }} />
              Layout Designer
            </ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {(mode === 'creation' || mode === 'exploration') && (
          <CreationMode
            mode={mode}
            onSave={handleSaveDiagram}
            onLoad={() => {
              console.log('Loading diagram');
            }}
          />
        )}
        {mode === 'layoutDesigner' && (
          <LayoutDesigner
            onSave={(layoutData) => {
              console.log('Saving layout:', layoutData);
              showSnackbar('Layout saved successfully', 'success');
            }}
            onLoad={() => {
              console.log('Loading layout');
            }}
          />
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DiagramEditor;