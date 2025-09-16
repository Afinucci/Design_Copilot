import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Close,
  Refresh,
  ExpandMore,
  Storage,
  Hub,
  Category,
  AccountTree,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Label,
  Link,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface Neo4jOverviewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NodeLabel {
  label: string;
  count: number;
}

interface RelationshipType {
  type: string;
  count: number;
}

interface DatabaseOverview {
  connectionStatus: string;
  database: {
    name: string;
    uri: string;
    user: string;
  };
  statistics: {
    totalNodes: number;
    totalRelationships: number;
    nodeLabels: NodeLabel[];
    relationshipTypes: RelationshipType[];
    keyNodeCounts: Record<string, number>;
  };
  sampleNodes: Record<string, any[]>;
  timestamp: string;
}

const Neo4jOverview: React.FC<Neo4jOverviewProps> = ({ isOpen, onClose }) => {
  const [overview, setOverview] = useState<DatabaseOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLabels, setExpandedLabels] = useState<string[]>([]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getNeo4jOverview();
      setOverview(data);
      console.log('📊 Neo4j Overview fetched:', data);
    } catch (err) {
      console.error('Error fetching Neo4j overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch database overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOverview();
    }
  }, [isOpen]);

  const handleLabelToggle = (label: string) => {
    setExpandedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <Warning color="warning" />;
    }
  };

  const getNodeLabelColor = (label: string): string => {
    const colors: Record<string, string> = {
      FunctionalArea: '#4CAF50',
      NodeTemplate: '#2196F3',
      Diagram: '#FF9800',
      GhostFeedback: '#9C27B0',
      Group: '#F44336',
      Constraint: '#00BCD4',
    };
    return colors[label] || '#757575';
  };

  const getRelationshipColor = (type: string): string => {
    const colors: Record<string, string> = {
      ADJACENT_TO: '#1976d2',
      MATERIAL_FLOW: '#9c27b0',
      PERSONNEL_FLOW: '#ff9800',
      REQUIRES_ACCESS: '#0288d1',
      SHARES_UTILITY: '#388e3c',
      PROHIBITED_NEAR: '#d32f2f',
      CONTAINS: '#795548',
    };
    return colors[type] || '#616161';
  };

  if (!isOpen) return null;

  return (
    <Paper
      sx={{
        position: 'fixed',
        right: 0,
        top: 64,
        height: 'calc(100vh - 64px)',
        width: 450,
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storage color="primary" />
            <Typography variant="h6">Neo4j Database Overview</Typography>
          </Box>
          <Box>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchOverview} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton onClick={onClose}>
                <Close />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {overview && !loading && (
          <Stack spacing={2}>
            {/* Connection Status */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {getConnectionIcon(overview.connectionStatus)}
                <Typography variant="subtitle1" fontWeight="bold">
                  Connection Status
                </Typography>
                <Chip
                  label={overview.connectionStatus}
                  size="small"
                  color={overview.connectionStatus === 'connected' ? 'success' : 'error'}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Database: {overview.database.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                URI: {overview.database.uri}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User: {overview.database.user}
              </Typography>
            </Paper>

            {/* Statistics Summary */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Database Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {overview.statistics.totalNodes.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Nodes
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h4" color="secondary">
                    {overview.statistics.totalRelationships.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Relationships
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Key Node Types */}
            {overview.statistics.keyNodeCounts && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Key Node Types
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(overview.statistics.keyNodeCounts).map(([type, count]) => (
                    <Chip
                      key={type}
                      icon={<Label />}
                      label={`${type}: ${count}`}
                      variant="outlined"
                      sx={{ 
                        borderColor: getNodeLabelColor(type),
                        color: getNodeLabelColor(type),
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            )}

            {/* Node Labels */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Category />
                  <Typography>
                    Node Labels ({overview.statistics.nodeLabels.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {overview.statistics.nodeLabels.map((nodeLabel) => (
                    <ListItem key={nodeLabel.label}>
                      <ListItemIcon>
                        <Badge badgeContent={nodeLabel.count} color="primary" max={999}>
                          <Label sx={{ color: getNodeLabelColor(nodeLabel.label) }} />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={nodeLabel.label}
                        secondary={`${nodeLabel.count} nodes`}
                      />
                      {overview.sampleNodes[nodeLabel.label] && (
                        <IconButton
                          size="small"
                          onClick={() => handleLabelToggle(nodeLabel.label)}
                        >
                          <ExpandMore
                            sx={{
                              transform: expandedLabels.includes(nodeLabel.label)
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}
                          />
                        </IconButton>
                      )}
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* Relationship Types */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTree />
                  <Typography>
                    Relationship Types ({overview.statistics.relationshipTypes.length})
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {overview.statistics.relationshipTypes.map((relType) => (
                    <ListItem key={relType.type}>
                      <ListItemIcon>
                        <Badge badgeContent={relType.count} color="secondary" max={999}>
                          <Link sx={{ color: getRelationshipColor(relType.type) }} />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={relType.type}
                        secondary={`${relType.count} relationships`}
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>

            {/* Sample Nodes */}
            {expandedLabels.map(label => (
              <Collapse key={label} in={expandedLabels.includes(label)}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Sample {label} Nodes:
                  </Typography>
                  <Stack spacing={1}>
                    {overview.sampleNodes[label]?.slice(0, 5).map((node, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {node.name || node.id || `${label} ${idx + 1}`}
                        </Typography>
                        {node.category && (
                          <Typography variant="caption" color="text.secondary">
                            Category: {node.category}
                          </Typography>
                        )}
                        {node.cleanroomClass && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Cleanroom: {node.cleanroomClass}
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              </Collapse>
            ))}

            {/* Last Updated */}
            <Typography variant="caption" color="text.secondary" align="center">
              Last updated: {new Date(overview.timestamp).toLocaleString()}
            </Typography>
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

export default Neo4jOverview;