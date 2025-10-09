import React, { useState, useMemo, useEffect, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  InputAdornment,
  Button,
} from '@mui/material';
import { ExpandMore, Search, Edit, Visibility, Add } from '@mui/icons-material';
import { NodeTemplate, NodeCategory, AppMode } from '../types';
import CustomNodeCreationModal from './CustomNodeCreationModal';
import { apiService } from '../services/api';

interface NodePaletteProps {
  templates: NodeTemplate[];
  mode: AppMode;
  onCreateCustomNode?: (nodeTemplate: Omit<NodeTemplate, 'id'>) => void;
  onGuidedNodeSelect?: (nodeId: string) => void;
  isVisible?: boolean;
}

const NodePalette: React.FC<NodePaletteProps> = ({ templates, mode, onCreateCustomNode, onGuidedNodeSelect, isVisible = true }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Production',
    'Quality Control',
  ]);
  const [showCustomNodeModal, setShowCustomNodeModal] = useState(false);
  const [guidedNodes, setGuidedNodes] = useState<NodeTemplate[]>([]);

  useEffect(() => {
    if (mode === 'exploration') {
      apiService.getExistingGraphNodes().then(setGuidedNodes).catch(() => setGuidedNodes([]));
    }
  }, [mode]);

  const filteredTemplates = useMemo(() => {
    const source = mode === 'exploration' ? guidedNodes : templates;
    return source.filter(template =>
      (template.name && template.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (template.category && template.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [templates, guidedNodes, searchTerm, mode]);

  const templatesByCategory = useMemo(() => {
    const grouped = filteredTemplates.reduce((acc, template) => {
      const category = template.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    }, {} as Record<NodeCategory, NodeTemplate[]>);

    return grouped;
  }, [filteredTemplates]);

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleDragStart = (event: React.DragEvent, template: NodeTemplate) => {
    console.log('🎯 Drag started for template:', template);
    
    // Allow dragging in guided mode since we're dragging KG nodes for exploration
    const templateData = JSON.stringify(template);
    event.dataTransfer.setData('application/reactflow', templateData);
    event.dataTransfer.setData('text/plain', templateData);
    event.dataTransfer.effectAllowed = 'move';
    
    console.log('🎯 Set drag data:', {
      dataType: 'application/reactflow',
      dataLength: templateData.length,
      templateId: template.id,
      templateName: template.name
    });
  };

  const handleNodeClick = (template: NodeTemplate) => {
    if (mode === 'exploration' && onGuidedNodeSelect) {
      // In guided mode, clicking a node should fetch its relationships
      onGuidedNodeSelect(template.id);
    }
  };

  const getCategoryIcon = (category: NodeCategory) => {
    switch (category) {
      case 'Production':
        return '🏭';
      case 'Quality Control':
        return '🔬';
      case 'Warehouse':
        return '📦';
      case 'Utilities':
        return '⚡';
      case 'Personnel':
        return '👥';
      case 'Support':
        return '🔧';
      case 'None':
        return '⚪';
      default:
        return '📋';
    }
  };

  const getCategoryColor = (category: NodeCategory) => {
    switch (category) {
      case 'Production':
        return '#FF6B6B';
      case 'Quality Control':
        return '#4ECDC4';
      case 'Warehouse':
        return '#45B7D1';
      case 'Utilities':
        return '#F7DC6F';
      case 'Personnel':
        return '#BB8FCE';
      case 'Support':
        return '#85C1E9';
      case 'None':
        return '#95A5A6';
      default:
        // Generate a color for custom categories based on hash of category name
        if (!category || typeof category !== 'string') {
          return '#95A5A6'; // Default fallback color
        }
        const hash = category.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 60%, 65%)`;
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: 280,
        height: '100%',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0',
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {mode === 'creation' ? <Edit color="secondary" /> : <Visibility color="primary" />}
          <Typography variant="h6">
            {mode === 'creation' ? 'Template Library' : 'Knowledge Graph'}
          </Typography>
        </Box>
        
        {mode === 'exploration' && (
          <Box sx={{ 
            mb: 2, 
            p: 1.5, 
            backgroundColor: '#e3f2fd', 
            borderRadius: 1,
            border: '1px solid #bbdefb'
          }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              <Visibility sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
              Explore Knowledge Graph
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Click on any node to load it with all its relationships on the canvas.
            </Typography>
          </Box>
        )}
        
        <TextField
          fullWidth
          size="small"
          placeholder={mode === 'creation' ? 'Search templates...' : 'Search existing nodes...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
        />
        
        {mode === 'creation' && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Add />}
            sx={{ mt: 1 }}
            size="small"
            onClick={() => setShowCustomNodeModal(true)}
          >
            Create Custom Node
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {Object.keys(templatesByCategory).length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            p: 3,
            textAlign: 'center'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {mode === 'creation' ? 'No Templates Available' : 'No Nodes in Knowledge Graph'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === 'creation' 
                ? 'Unable to load node templates. Check your connection and try again.'
                : 'The knowledge graph is empty. Use Creation Mode to create and persist nodes first.'
              }
            </Typography>
          </Box>
        ) : (
          Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <Accordion
              key={category}
              expanded={expandedCategories.includes(category)}
              onChange={() => handleCategoryToggle(category)}
              sx={{
                boxShadow: 'none',
                borderRadius: 0,
                '&:before': { display: 'none' },
              }}
            >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              sx={{
                backgroundColor: getCategoryColor(category as NodeCategory),
                color: '#333',
                minHeight: 48,
                '&.Mui-expanded': {
                  minHeight: 48,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1">
                  {getCategoryIcon(category as NodeCategory)}
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {category}
                </Typography>
                <Chip
                  label={categoryTemplates.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    color: '#333',
                    fontWeight: 'bold',
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {categoryTemplates.map((template) => (
                  <ListItem
                    key={template.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => handleNodeClick(template)}
                    sx={{
                      cursor: mode === 'exploration' ? 'pointer' : 'grab',
                      borderBottom: '1px solid #f0f0f0',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&:active': {
                        cursor: mode === 'exploration' ? 'pointer' : 'grabbing',
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          backgroundColor: template.color,
                          color: '#333',
                          width: 32,
                          height: 32,
                          fontSize: '0.8rem',
                        }}
                      >
                        {template.icon || getCategoryIcon(template.category)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={template.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'medium',
                        component: 'div',
                      }}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            mt: 0.5,
                            alignItems: 'center',
                          }}
                        >
                          {template.cleanroomClass && (
                            <Chip
                              label={`Class ${template.cleanroomClass}`}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                              }}
                            />
                          )}
                          <Chip
                            label={`${template.defaultSize.width}×${template.defaultSize.height}`}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              height: 18,
                              backgroundColor: '#f3e5f5',
                              color: '#7b1fa2',
                            }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
          ))
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <Typography variant="caption" color="text.secondary">
          {mode === 'creation' 
            ? 'Drag templates to create new nodes. Results will expand the knowledge graph.'
            : 'Click nodes to load with relationships. Drag to add individual nodes to canvas.'
          }
        </Typography>
      </Box>

      {/* Custom Node Creation Modal */}
      {mode === 'creation' && (
        <CustomNodeCreationModal
          open={showCustomNodeModal}
          onClose={() => setShowCustomNodeModal(false)}
          onCreateNode={(nodeTemplate) => {
            if (onCreateCustomNode) {
              onCreateCustomNode(nodeTemplate);
            }
            setShowCustomNodeModal(false);
          }}
          existingCategories={Array.from(new Set(templates.map(t => t.category).filter(cat => 
            cat && typeof cat === 'string' && !['Production', 'Quality Control', 'Warehouse', 'Utilities', 'Personnel', 'Support', 'None'].includes(cat)
          )))}
        />
      )}
    </Paper>
  );
};

export default memo(NodePalette);
