/**
 * Suggestion Sidebar Component
 *
 * Displays Neo4j relationship-based suggestions when a shape has a functional area assigned.
 * Shows compatible adjacent areas that can be connected based on the knowledge graph.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Stack
} from '@mui/material';
import {
  RoomOutlined as RoomIcon,
  ArrowForward as OutgoingIcon,
  ArrowBack as IncomingIcon,
  SwapHoriz as BidirectionalIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import apiService from '../../services/api';

interface RelationshipSuggestion {
  id: string;
  name: string;
  category: string;
  cleanroomClass?: string;
  color?: string;
  relationships: SuggestionRelationship[];
  confidence: number;
  reason: string;
}

interface SuggestionRelationship {
  type: string;
  direction: 'incoming' | 'outgoing' | 'bidirectional';
  reason?: string;
  priority?: number;
}

interface SuggestionSidebarProps {
  selectedShapeId: string | null; // ID of the selected shape
  selectedShapeNeo4jNode: string | null; // Name of the assigned Neo4j functional area
  selectedShapeCleanroomClass?: string; // Cleanroom class of the selected shape
  onSuggestionClick: (suggestion: RelationshipSuggestion) => void;
  onAssignNode: (shapeId: string, nodeName: string, nodeId: string) => void; // Callback to assign a node to the shape
  isVisible: boolean;
}

const SuggestionSidebar: React.FC<SuggestionSidebarProps> = ({
  selectedShapeId,
  selectedShapeNeo4jNode,
  selectedShapeCleanroomClass,
  onSuggestionClick,
  onAssignNode,
  isVisible
}) => {
  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'assign' | 'suggest'>('assign'); // Two modes: assign node or suggest relationships

  useEffect(() => {
    console.log('🎯 SuggestionSidebar: Effect triggered', {
      selectedShapeId,
      selectedShapeNeo4jNode,
      isVisible,
      hasNode: !!selectedShapeNeo4jNode
    });

    if (!isVisible) {
      setSuggestions([]);
      setAvailableNodes([]);
      setError(null);
      return;
    }

    // Mode 1: No Neo4j node assigned yet - show all available nodes for assignment
    if (!selectedShapeNeo4jNode) {
      setMode('assign');
      fetchAvailableNodes();
    }
    // Mode 2: Neo4j node already assigned - show relationship-based suggestions
    else {
      setMode('suggest');
      fetchRelationshipSuggestions();
    }
  }, [selectedShapeNeo4jNode, isVisible, selectedShapeId]);

  const fetchAvailableNodes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎯 SuggestionSidebar: Fetching available Neo4j FunctionalArea nodes for assignment');

      // Get all FunctionalArea nodes from Neo4j knowledge graph
      const functionalAreas = await apiService.getNeo4jFunctionalAreas();

      setAvailableNodes(functionalAreas);
      console.log('🎯 SuggestionSidebar: Found', functionalAreas.length, 'FunctionalArea nodes from Neo4j');

    } catch (err) {
      console.error('🎯 SuggestionSidebar: Error fetching Neo4j nodes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load functional areas from Neo4j. Make sure the database is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRelationshipSuggestions = async () => {
    if (!selectedShapeNeo4jNode) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🎯 SuggestionSidebar: Fetching relationship suggestions for:', {
        node: selectedShapeNeo4jNode,
        cleanroomClass: selectedShapeCleanroomClass
      });

      const response = await apiService.getRelationshipSuggestions(
        selectedShapeNeo4jNode,
        selectedShapeCleanroomClass
      );

      console.log('🎯 SuggestionSidebar: Received response:', response);
      console.log('🎯 SuggestionSidebar: Suggestions count:', response.count);
      setSuggestions(response.suggestions);

    } catch (err) {
      console.error('🎯 SuggestionSidebar: Error fetching suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'outgoing':
        return <OutgoingIcon fontSize="small" />;
      case 'incoming':
        return <IncomingIcon fontSize="small" />;
      case 'bidirectional':
        return <BidirectionalIcon fontSize="small" />;
      default:
        return <BidirectionalIcon fontSize="small" />;
    }
  };

  const getRelationshipTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'ADJACENT_TO': '#2196F3',
      'MATERIAL_FLOW': '#4CAF50',
      'PERSONNEL_FLOW': '#FF9800',
      'REQUIRES_ACCESS': '#9C27B0',
      'PROHIBITED_NEAR': '#F44336',
      'SHARES_UTILITY': '#00BCD4'
    };
    return colorMap[type] || '#757575';
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        left: 16,
        top: 80,
        width: 320,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto',
        zIndex: 1000,
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RoomIcon />
          {mode === 'assign' ? 'Assign Functional Area' : 'Suggestions'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {mode === 'assign'
            ? 'Select a functional area from Neo4j knowledge graph'
            : `For: ${selectedShapeNeo4jNode}`
          }
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Mode 1: Show available nodes for assignment */}
        {!isLoading && !error && mode === 'assign' && availableNodes.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {availableNodes.length} functional area{availableNodes.length !== 1 ? 's' : ''} available
            </Typography>

            <List dense>
              {availableNodes.map((node, index) => (
                <React.Fragment key={node.id}>
                  {index > 0 && <Divider />}

                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        if (selectedShapeId) {
                          console.log('🎯 SuggestionSidebar: Assigning node', node.name, 'to shape', selectedShapeId);
                          onAssignNode(selectedShapeId, node.name, node.id);
                        }
                      }}
                      sx={{
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <RoomIcon
                          sx={{
                            color: node.color || '#757575'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={node.name}
                        secondary={node.category}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                      {node.cleanroomClass && (
                        <Chip
                          label={`Class ${node.cleanroomClass}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}

        {/* Mode 2: Show relationship-based suggestions */}
        {!isLoading && !error && mode === 'suggest' && suggestions.length === 0 && (
          <Alert severity="info">
            No suggestions available. The selected functional area may not have relationships in the knowledge graph.
          </Alert>
        )}

        {!isLoading && !error && suggestions.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {suggestions.length} compatible area{suggestions.length !== 1 ? 's' : ''} found
            </Typography>

            <List dense>
              {suggestions.map((suggestion, index) => (
                <React.Fragment key={suggestion.id}>
                  {index > 0 && <Divider />}

                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => onSuggestionClick(suggestion)}
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        py: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <RoomIcon
                            sx={{
                              color: suggestion.color || '#757575'
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={suggestion.name}
                          secondary={suggestion.category}
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                        {suggestion.cleanroomClass && (
                          <Chip
                            label={`Class ${suggestion.cleanroomClass}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Relationships */}
                      <Stack spacing={0.5} sx={{ width: '100%', pl: 5 }}>
                        {suggestion.relationships.map((rel, relIndex) => (
                          <Tooltip
                            key={relIndex}
                            title={rel.reason || `Connected via ${rel.type}`}
                            arrow
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                p: 0.5,
                                borderRadius: 1,
                                backgroundColor: 'action.hover'
                              }}
                            >
                              {getDirectionIcon(rel.direction)}
                              <Typography
                                variant="caption"
                                sx={{
                                  color: getRelationshipTypeColor(rel.type),
                                  fontWeight: 500,
                                  fontSize: '0.7rem'
                                }}
                              >
                                {rel.type.replace(/_/g, ' ')}
                              </Typography>
                            </Box>
                          </Tooltip>
                        ))}
                      </Stack>

                      {/* Confidence/Reason */}
                      {suggestion.reason && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            pl: 5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <InfoIcon sx={{ fontSize: 14 }} />
                          {suggestion.reason}
                        </Typography>
                      )}
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default SuggestionSidebar;
