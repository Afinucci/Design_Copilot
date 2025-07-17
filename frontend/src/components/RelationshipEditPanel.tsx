import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Room,
  Warning,
  Speed,
  Settings,
  SwapHoriz,
  Person,
  ExpandMore,
  Info,
  Cancel,
  Save,
} from '@mui/icons-material';
import { DiagramEdge, SpatialRelationship } from '../types';
import { Node, Edge } from 'reactflow';

interface RelationshipEditPanelProps {
  edges: DiagramEdge[];
  nodes: Node[];
  onUpdateRelationship: (edgeId: string, updates: Partial<SpatialRelationship>) => void;
  onDeleteRelationship: (edgeId: string) => void;
  onCreateRelationship: (source: string, target: string, relationshipData: Partial<SpatialRelationship>) => void;
  selectedEdge?: DiagramEdge | null;
  onSelectEdge?: (edge: DiagramEdge | null) => void;
}

interface EditDialogState {
  open: boolean;
  edgeId: string | null;
  relationshipData: Partial<SpatialRelationship>;
  isNewRelationship: boolean;
  sourceNodeId: string;
  targetNodeId: string;
}

const RelationshipEditPanel: React.FC<RelationshipEditPanelProps> = ({
  edges,
  nodes,
  onUpdateRelationship,
  onDeleteRelationship,
  onCreateRelationship,
  selectedEdge,
  onSelectEdge,
}) => {
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    edgeId: null,
    relationshipData: {},
    isNewRelationship: false,
    sourceNodeId: '',
    targetNodeId: '',
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');

  // Group edges by node pairs
  const groupedEdges = React.useMemo(() => {
    const groups = new Map<string, DiagramEdge[]>();
    
    edges.forEach(edge => {
      const nodeIds = [edge.source, edge.target].sort();
      const key = nodeIds.join('-');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(edge);
    });
    
    return Array.from(groups.entries()).map(([key, groupEdges]) => ({
      key,
      sourceNode: nodes.find(n => n.id === groupEdges[0].source),
      targetNode: nodes.find(n => n.id === groupEdges[0].target),
      edges: groupEdges.sort((a, b) => a.id.localeCompare(b.id))
    }));
  }, [edges, nodes]);

  // Filter edges based on selected type
  const filteredGroups = React.useMemo(() => {
    if (filterType === 'all') return groupedEdges;
    
    return groupedEdges.filter(group => 
      group.edges.some(edge => 
        (edge.data as any)?.relationshipType === filterType
      )
    );
  }, [groupedEdges, filterType]);

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return <Room color="primary" />;
      case 'PROHIBITED_NEAR': return <Warning color="error" />;
      case 'REQUIRES_ACCESS': return <Speed color="info" />;
      case 'SHARES_UTILITY': return <Settings color="success" />;
      case 'MATERIAL_FLOW': return <SwapHoriz color="secondary" />;
      case 'PERSONNEL_FLOW': return <Person color="warning" />;
      default: return <Room />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return '#1976d2';
      case 'PROHIBITED_NEAR': return '#d32f2f';
      case 'REQUIRES_ACCESS': return '#0288d1';
      case 'SHARES_UTILITY': return '#388e3c';
      case 'MATERIAL_FLOW': return '#9c27b0';
      case 'PERSONNEL_FLOW': return '#ff9800';
      default: return '#757575';
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return 'Adjacent';
      case 'PROHIBITED_NEAR': return 'Prohibited';
      case 'REQUIRES_ACCESS': return 'Access';
      case 'SHARES_UTILITY': return 'Utility';
      case 'MATERIAL_FLOW': return 'Material';
      case 'PERSONNEL_FLOW': return 'Personnel';
      default: return 'Relation';
    }
  };

  const handleEditRelationship = (edge: DiagramEdge) => {
    const edgeData = edge.data as any;
    setEditDialog({
      open: true,
      edgeId: edge.id,
      relationshipData: {
        id: edgeData.id || edge.id,
        type: edgeData.relationshipType || 'ADJACENT_TO',
        fromId: edge.source,
        toId: edge.target,
        priority: edgeData.priority || 5,
        reason: edgeData.reason || '',
        doorType: edgeData.doorType,
        minDistance: edgeData.minDistance,
        maxDistance: edgeData.maxDistance,
        flowDirection: edgeData.flowDirection,
        flowType: edgeData.flowType,
      },
      isNewRelationship: false,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
    });
  };

  const handleCreateNewRelationship = () => {
    setEditDialog({
      open: true,
      edgeId: null,
      relationshipData: {
        type: 'ADJACENT_TO',
        priority: 5,
        reason: '',
        flowDirection: 'bidirectional',
        flowType: 'raw_material',
      },
      isNewRelationship: true,
      sourceNodeId: '',
      targetNodeId: '',
    });
  };

  const handleSaveRelationship = () => {
    if (!editDialog.relationshipData.type || !editDialog.relationshipData.reason?.trim()) {
      return;
    }

    if (editDialog.isNewRelationship) {
      if (!editDialog.sourceNodeId || !editDialog.targetNodeId) {
        return;
      }
      onCreateRelationship(editDialog.sourceNodeId, editDialog.targetNodeId, editDialog.relationshipData);
    } else if (editDialog.edgeId) {
      onUpdateRelationship(editDialog.edgeId, editDialog.relationshipData);
    }

    setEditDialog({
      open: false,
      edgeId: null,
      relationshipData: {},
      isNewRelationship: false,
      sourceNodeId: '',
      targetNodeId: '',
    });
  };

  const handleDeleteRelationship = (edgeId: string) => {
    onDeleteRelationship(edgeId);
  };

  const handleCloseDialog = () => {
    setEditDialog({
      open: false,
      edgeId: null,
      relationshipData: {},
      isNewRelationship: false,
      sourceNodeId: '',
      targetNodeId: '',
    });
  };

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const getNodeName = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node?.data?.name || nodeId;
  };

  const relationshipTypes = [
    'ADJACENT_TO',
    'PROHIBITED_NEAR',
    'REQUIRES_ACCESS',
    'SHARES_UTILITY',
    'MATERIAL_FLOW',
    'PERSONNEL_FLOW',
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Relationships ({edges.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleCreateNewRelationship}
        >
          Add Relationship
        </Button>
      </Box>

      {/* Filter Controls */}
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {relationshipTypes.map(type => (
              <MenuItem key={type} value={type}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getRelationshipIcon(type)}
                  {getRelationshipLabel(type)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Edge Groups */}
      <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {filteredGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No relationships found
          </Typography>
        ) : (
          filteredGroups.map(group => (
            <Accordion 
              key={group.key}
              expanded={expandedGroups.has(group.key)}
              onChange={() => toggleGroupExpansion(group.key)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Typography variant="subtitle2">
                    {group.sourceNode?.data?.name || 'Unknown'} ↔ {group.targetNode?.data?.name || 'Unknown'}
                  </Typography>
                  <Chip 
                    label={group.edges.length} 
                    size="small" 
                    color="primary"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <List dense>
                  {group.edges.map((edge, index) => {
                    const edgeData = edge.data as any;
                    const relationshipType = edgeData?.relationshipType || 'ADJACENT_TO';
                    const isSelected = selectedEdge?.id === edge.id;
                    
                    return (
                      <ListItem 
                        key={edge.id}
                        sx={{ 
                          border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: isSelected ? '#f5f5f5' : 'transparent'
                        }}
                        onClick={() => onSelectEdge?.(edge)}
                      >
                        <ListItemIcon>
                          {getRelationshipIcon(relationshipType)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {getRelationshipLabel(relationshipType)}
                              </Typography>
                              <Chip 
                                label={`Priority: ${edgeData?.priority || 5}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {edgeData?.reason || 'No reason provided'}
                              </Typography>
                              {edgeData?.doorType && (
                                <Typography variant="caption" display="block">
                                  Door: {edgeData.doorType}
                                </Typography>
                              )}
                              {edgeData?.flowDirection && (
                                <Typography variant="caption" display="block">
                                  Flow: {edgeData.flowDirection} ({edgeData.flowType})
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Edit Relationship">
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRelationship(edge);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Relationship">
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRelationship(edge.id);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialog.isNewRelationship ? 'Create New Relationship' : 'Edit Relationship'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {editDialog.isNewRelationship && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Source Node</InputLabel>
                  <Select
                    value={editDialog.sourceNodeId}
                    label="Source Node"
                    onChange={(e) => setEditDialog(prev => ({ ...prev, sourceNodeId: e.target.value }))}
                  >
                    {nodes.map(node => (
                      <MenuItem key={node.id} value={node.id}>
                        {node.data?.name || node.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Target Node</InputLabel>
                  <Select
                    value={editDialog.targetNodeId}
                    label="Target Node"
                    onChange={(e) => setEditDialog(prev => ({ ...prev, targetNodeId: e.target.value }))}
                  >
                    {nodes.map(node => (
                      <MenuItem key={node.id} value={node.id}>
                        {node.data?.name || node.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            <FormControl fullWidth margin="normal">
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={editDialog.relationshipData.type || 'ADJACENT_TO'}
                label="Relationship Type"
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  relationshipData: { ...prev.relationshipData, type: e.target.value as any }
                }))}
              >
                {relationshipTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRelationshipIcon(type)}
                      {getRelationshipLabel(type)}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Priority (1-10)"
              type="number"
              value={editDialog.relationshipData.priority || 5}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                relationshipData: { ...prev.relationshipData, priority: parseInt(e.target.value) || 5 }
              }))}
              margin="normal"
              inputProps={{ min: 1, max: 10 }}
            />

            <TextField
              fullWidth
              label="Reason"
              value={editDialog.relationshipData.reason || ''}
              onChange={(e) => setEditDialog(prev => ({
                ...prev,
                relationshipData: { ...prev.relationshipData, reason: e.target.value }
              }))}
              margin="normal"
              placeholder="Describe the reason for this relationship"
              required
            />

            {editDialog.relationshipData.type === 'ADJACENT_TO' && (
              <TextField
                fullWidth
                label="Door Type"
                value={editDialog.relationshipData.doorType || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  relationshipData: { ...prev.relationshipData, doorType: e.target.value }
                }))}
                margin="normal"
                placeholder="e.g., airlock, pass-through, standard"
              />
            )}

            {editDialog.relationshipData.type === 'PROHIBITED_NEAR' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Min Distance (m)"
                  type="number"
                  value={editDialog.relationshipData.minDistance || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    relationshipData: { ...prev.relationshipData, minDistance: parseInt(e.target.value) || undefined }
                  }))}
                  margin="normal"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Max Distance (m)"
                  type="number"
                  value={editDialog.relationshipData.maxDistance || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    relationshipData: { ...prev.relationshipData, maxDistance: parseInt(e.target.value) || undefined }
                  }))}
                  margin="normal"
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            {(editDialog.relationshipData.type === 'MATERIAL_FLOW' || editDialog.relationshipData.type === 'PERSONNEL_FLOW') && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Flow Direction</InputLabel>
                  <Select
                    value={editDialog.relationshipData.flowDirection || 'bidirectional'}
                    label="Flow Direction"
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      relationshipData: { ...prev.relationshipData, flowDirection: e.target.value as any }
                    }))}
                  >
                    <MenuItem value="bidirectional">Bidirectional</MenuItem>
                    <MenuItem value="unidirectional">Unidirectional</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                  <InputLabel>Flow Type</InputLabel>
                  <Select
                    value={editDialog.relationshipData.flowType || 'raw_material'}
                    label="Flow Type"
                    onChange={(e) => setEditDialog(prev => ({
                      ...prev,
                      relationshipData: { ...prev.relationshipData, flowType: e.target.value as any }
                    }))}
                  >
                    {editDialog.relationshipData.type === 'MATERIAL_FLOW' ? (
                      <>
                        <MenuItem value="raw_material">Raw Material</MenuItem>
                        <MenuItem value="finished_product">Finished Product</MenuItem>
                        <MenuItem value="waste">Waste</MenuItem>
                        <MenuItem value="equipment">Equipment</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value="personnel">Personnel</MenuItem>
                        <MenuItem value="equipment">Equipment Movement</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveRelationship}
            variant="contained"
            startIcon={<Save />}
            disabled={!editDialog.relationshipData.reason?.trim()}
          >
            {editDialog.isNewRelationship ? 'Create' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RelationshipEditPanel;