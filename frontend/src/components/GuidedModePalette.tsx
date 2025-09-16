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
  Divider,
  Badge,
} from '@mui/material';
import {
  ExpandMore,
  Search,
  Room,
  Warning,
  Speed,
  Settings,
  SwapHoriz,
  Person,
  Info,
  DragIndicator,
  Visibility,
  CheckCircle,
} from '@mui/icons-material';
import { NodeTemplate, NodeCategory } from '../types';
import { apiService } from '../services/api';

interface GuidedModePaletteProps {
  selectedTemplateId?: string;
  onNodeSelect: (nodeId: string) => void;
  onNodeDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  isVisible?: boolean;
}

interface RelationshipInfo {
  type: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  directionality: 'unidirectional' | 'bidirectional';
}

const relationshipTypes: RelationshipInfo[] = [
  {
    type: 'ADJACENT_TO',
    icon: <Room />,
    color: '#1976d2',
    description: 'Direct physical adjacency',
    directionality: 'bidirectional',
  },
  {
    type: 'MATERIAL_FLOW',
    icon: <SwapHoriz />,
    color: '#9c27b0',
    description: 'Material transfer flow',
    directionality: 'unidirectional',
  },
  {
    type: 'PERSONNEL_FLOW',
    icon: <Person />,
    color: '#ff9800',
    description: 'Personnel movement',
    directionality: 'bidirectional',
  },
  {
    type: 'REQUIRES_ACCESS',
    icon: <Speed />,
    color: '#0288d1',
    description: 'Requires access/oversight',
    directionality: 'unidirectional',
  },
  {
    type: 'SHARES_UTILITY',
    icon: <Settings />,
    color: '#388e3c',
    description: 'Shared utilities/systems',
    directionality: 'bidirectional',
  },
  {
    type: 'PROHIBITED_NEAR',
    icon: <Warning />,
    color: '#d32f2f',
    description: 'Must be separated',
    directionality: 'bidirectional',
  },
];

const GuidedModePalette: React.FC<GuidedModePaletteProps> = ({
  selectedTemplateId,
  onNodeSelect,
  onNodeDragStart,
  isVisible = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Production']);
  const [guidedNodes, setGuidedNodes] = useState<NodeTemplate[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadKnowledgeGraphNodes = async () => {
      try {
        setLoading(true);
        const kgData = await apiService.importKnowledgeGraph();
        const templates = kgData.nodes.map(node => ({
          id: node.id,
          name: node.name,
          category: node.category as NodeCategory,
          cleanroomClass: node.cleanroomClass,
          color: getCategoryColor(node.category),
          defaultSize: {
            width: node.width || 120,
            height: node.height || 80,
          },
        }));
        setGuidedNodes(templates);
      } catch (error) {
        console.error('Error loading knowledge graph nodes:', error);
        setGuidedNodes([]);
      } finally {
        setLoading(false);
      }
    };

    loadKnowledgeGraphNodes();
  }, []);

  const filteredNodes = useMemo(() => {
    return guidedNodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [guidedNodes, searchTerm]);

  const nodesByCategory = useMemo(() => {
    return filteredNodes.reduce((acc, node) => {
      const category = node.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(node);
      return acc;
    }, {} as Record<string, NodeTemplate[]>);
  }, [filteredNodes]);

  const getCategoryColor = (category: string) => {
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
      default:
        return '#95A5A6';
    }
  };

  const getCategoryIcon = (category: string) => {
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
      default:
        return '📋';
    }
  };

  const handleCategoryToggle = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleNodeClick = (node: NodeTemplate) => {
    // Update selected nodes set
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(node.id)) {
        newSet.delete(node.id);
      } else {
        newSet.add(node.id);
      }
      return newSet;
    });
    
    // Notify parent component
    onNodeSelect(node.id);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: 320,
        height: '100%',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Visibility color="primary" />
          <Typography variant="h6">Guided Design Mode</Typography>
        </Box>

        <Box
          sx={{
            mb: 2,
            p: 1.5,
            backgroundColor: '#e8f5e9',
            borderRadius: 1,
            border: '1px solid #a5d6a7',
          }}
        >
          <Typography variant="body2" color="success.dark" sx={{ fontWeight: 500 }}>
            Intelligent Design Assistant
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select relevant nodes and place them on canvas. Adjacency relationships will be
            automatically suggested based on pharmaceutical best practices.
          </Typography>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder="Search facility areas..."
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
      </Box>

      {/* Forms Palette */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, fontWeight: 600 }}>
          Available Function Types
        </Typography>
        
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading knowledge graph...
            </Typography>
          </Box>
        ) : Object.keys(nodesByCategory).length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No nodes available. Create some in Creation Mode first.
            </Typography>
          </Box>
        ) : (
          Object.entries(nodesByCategory).map(([category, nodes]) => (
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
                  backgroundColor: getCategoryColor(category) + '20',
                  minHeight: 48,
                  '&.Mui-expanded': {
                    minHeight: 48,
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{getCategoryIcon(category)}</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {category}
                  </Typography>
                  <Chip
                    label={nodes.length}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryColor(category),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <List dense>
                  {nodes.map((node) => (
                    <ListItem
                      key={node.id}
                      draggable
                      onDragStart={(e) => onNodeDragStart(e, node)}
                      onClick={() => handleNodeClick(node)}
                      sx={{
                        cursor: 'grab',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: selectedNodes.has(node.id) ? '#e3f2fd' : 'transparent',
                        '&:hover': {
                          backgroundColor: selectedNodes.has(node.id) ? '#e3f2fd' : '#f5f5f5',
                        },
                        '&:active': {
                          cursor: 'grabbing',
                          '&:hover': {
                            backgroundColor: '#bbdefb',
                          },
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          invisible={!selectedNodes.has(node.id)}
                          badgeContent={<CheckCircle sx={{ fontSize: 12 }} />}
                          color="primary"
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                        >
                          <Avatar
                            sx={{
                              backgroundColor: getCategoryColor(category),
                              color: 'white',
                              width: 36,
                              height: 36,
                            }}
                          >
                            <DragIndicator sx={{ fontSize: 20 }} />
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {node.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {node.cleanroomClass && (
                              <Chip
                                label={`Class ${node.cleanroomClass}`}
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
                              label={`${node.defaultSize.width}×${node.defaultSize.height}`}
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

      <Divider />

      {/* Relationship Legend */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Info sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="subtitle2" fontWeight="600">
            Connector Types & Logic
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
          When forms snap together, these relationships are automatically created:
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {relationshipTypes.map((rel) => (
            <Box
              key={rel.type}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 0.5,
                borderRadius: 0.5,
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: rel.color + '20',
                  color: rel.color,
                }}
              >
{rel.icon}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="medium">
                  {rel.type.replace(/_/g, ' ')}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  {rel.description}
                </Typography>
              </Box>
              <Chip
                label={rel.directionality === 'unidirectional' ? '→' : '↔'}
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 16,
                  minWidth: 24,
                  backgroundColor: rel.color + '10',
                  color: rel.color,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Tip:</strong> Drag forms to canvas and snap them together. The system will
          automatically create appropriate connections based on GMP requirements.
        </Typography>
      </Box>
    </Paper>
  );
};

export default memo(GuidedModePalette);