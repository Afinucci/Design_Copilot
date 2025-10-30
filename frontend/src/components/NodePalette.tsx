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
  Tooltip,
  IconButton,
} from '@mui/material';
import { ExpandMore, Search, Edit, Visibility, Add, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { NodeTemplate, NodeCategory, AppMode } from '../types';
import CustomNodeCreationModal from './CustomNodeCreationModal';
import { apiService } from '../services/api';

interface NodePaletteProps {
  templates: NodeTemplate[];
  mode: AppMode;
  onCreateCustomNode?: (nodeTemplate: Omit<NodeTemplate, 'id'>) => void;
  onGuidedNodeSelect?: (nodeId: string) => void;
  isVisible?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ templates, mode, onCreateCustomNode, onGuidedNodeSelect, isVisible = true, isCollapsed = false, onToggle }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Production',
    'Quality Control',
  ]);
  const [showCustomNodeModal, setShowCustomNodeModal] = useState(false);
  const [guidedNodes, setGuidedNodes] = useState<NodeTemplate[]>([]);
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);

  // Resizable width state
  const [width, setWidth] = useState(() => {
    const savedWidth = localStorage.getItem('nodePalette_width');
    return savedWidth ? parseInt(savedWidth, 10) : 280;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (mode === 'exploration') {
      apiService.getExistingGraphNodes().then(setGuidedNodes).catch(() => setGuidedNodes([]));
    }
  }, [mode]);

  useEffect(() => {
    setInternalCollapsed(isCollapsed);
  }, [isCollapsed]);

  const handleToggleCollapse = () => {
    setInternalCollapsed(!internalCollapsed);
    onToggle?.();
  };

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const minWidth = 80;
      const maxWidth = 400;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        localStorage.setItem('nodePalette_width', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  // Categories are just organizational, not color-coded
  // Colors are based on cleanroom grades (A, B, C, D, CNC)

  // Collapsed view - icon-only sidebar
  if (internalCollapsed) {
    return (
      <Paper
        elevation={2}
        sx={{
          width: 48,
          height: '100%',
          display: isVisible ? 'flex' : 'none',
          flexDirection: 'column',
          borderRadius: 0,
          borderRight: '1px solid #e0e0e0',
          position: 'relative',
          transition: 'width 0.3s ease',
        }}
      >
        {/* Toggle button */}
        <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'center' }}>
          <IconButton onClick={handleToggleCollapse} size="small">
            <ChevronRight />
          </IconButton>
        </Box>

        {/* Category icons */}
        <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <Tooltip key={category} title={`${category} (${categoryTemplates.length})`} placement="right">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1.5,
                  cursor: 'pointer',
                  backgroundColor: '#e0e0e0',
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    backgroundColor: '#d0d0d0',
                  },
                }}
                onClick={handleToggleCollapse}
              >
                <Typography variant="h6">
                  {getCategoryIcon(category as NodeCategory)}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>
      </Paper>
    );
  }

  // Expanded view - full sidebar
  return (
    <Paper
      elevation={2}
      sx={{
        width: width,
        height: '100%',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0',
        flexShrink: 0,
        minHeight: 0,
        position: 'relative',
        transition: isResizing ? 'none' : 'width 0.3s ease',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      <Box sx={{ p: 0.5, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 0.5 }}>
          {mode === 'creation' ? <Edit color="secondary" sx={{ fontSize: 16 }} /> : <Visibility color="primary" sx={{ fontSize: 16 }} />}
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, fontSize: '0.75rem' }}>
            {mode === 'creation' ? 'Templates' : 'Graph'}
          </Typography>
          <IconButton
            onClick={handleToggleCollapse}
            size="small"
            sx={{
              color: 'text.secondary',
              padding: 0.25,
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            <ChevronLeft sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {mode === 'exploration' && (
          <Box sx={{
            mb: 0.5,
            p: 0.5,
            backgroundColor: '#e3f2fd',
            borderRadius: 0.5,
            border: '1px solid #bbdefb'
          }}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 500, fontSize: '0.65rem' }}>
              <Visibility sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />
              Explore
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.7rem',
            },
            '& .MuiInputBase-input': {
              padding: '4px 6px',
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ marginRight: 0.5 }}>
                  <Search sx={{ fontSize: 14 }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {mode === 'creation' && (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Add sx={{ fontSize: 12 }} />}
            sx={{
              mt: 0.5,
              fontSize: '0.65rem',
              padding: '2px 6px',
              minHeight: 0
            }}
            size="small"
            onClick={() => setShowCustomNodeModal(true)}
          >
            Add
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
            p: 2,
            textAlign: 'center'
          }}>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              {mode === 'creation' ? 'No Templates' : 'No Nodes'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {mode === 'creation'
                ? 'Unable to load templates'
                : 'Graph is empty'
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
              expandIcon={<ExpandMore sx={{ fontSize: 16 }} />}
              sx={{
                backgroundColor: '#e0e0e0',
                color: '#333',
                minHeight: 28,
                padding: '0 6px',
                '&.Mui-expanded': {
                  minHeight: 28,
                },
                '& .MuiAccordionSummary-content': {
                  margin: '6px 0',
                },
                '&:hover': {
                  backgroundColor: '#d0d0d0',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <Typography sx={{ fontSize: '0.85rem' }}>
                  {getCategoryIcon(category as NodeCategory)}
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                  {category}
                </Typography>
                <Chip
                  label={categoryTemplates.length}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    color: '#333',
                    fontWeight: 'bold',
                    height: 14,
                    fontSize: '0.6rem',
                    '& .MuiChip-label': {
                      padding: '0 4px',
                    }
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
                      padding: '2px 6px',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&:active': {
                        cursor: mode === 'exploration' ? 'pointer' : 'grabbing',
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 28 }}>
                      <Avatar
                        sx={{
                          backgroundColor: template.color,
                          color: '#333',
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
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
                        fontSize: '0.7rem',
                      }}
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.2,
                            mt: 0.2,
                            alignItems: 'center',
                          }}
                        >
                          {template.cleanroomClass && (
                            <Chip
                              label={`${template.cleanroomClass}`}
                              size="small"
                              sx={{
                                fontSize: '0.55rem',
                                height: 14,
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                '& .MuiChip-label': {
                                  padding: '0 3px',
                                }
                              }}
                            />
                          )}
                          <Chip
                            label={`${template.defaultSize.width}×${template.defaultSize.height}`}
                            size="small"
                            sx={{
                              fontSize: '0.55rem',
                              height: 14,
                              backgroundColor: '#f3e5f5',
                              color: '#7b1fa2',
                              '& .MuiChip-label': {
                                padding: '0 3px',
                              }
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

      <Box sx={{ p: 0.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', lineHeight: 1.2 }}>
          {mode === 'creation' ? 'Drag to add' : 'Click to load'}
        </Typography>
      </Box>

      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          '&:hover': {
            backgroundColor: 'primary.main',
            opacity: 0.5,
          },
          '&:active': {
            backgroundColor: 'primary.main',
            opacity: 0.8,
          },
          zIndex: 10,
        }}
      />

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
