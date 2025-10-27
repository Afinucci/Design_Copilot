import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Settings, Room, Speed, Warning, CheckCircle, Edit, Visibility, Lock, Delete, GroupWork, Build, Add, Remove, SwapHoriz, Person, Link, Close } from '@mui/icons-material';
import { SpatialRelationship, NodeData, AppMode, GuidedSuggestion, NodeGroup, Equipment, CustomShapeData } from '../types';
import { apiService } from '../services/api';
import { Node } from 'reactflow';
import { calculateBoundingBox } from '../utils/shapeCollision';

// Helper function for shape geometry
const calculateShapeGeometry = (shapePoints: any[], position: { x: number; y: number }) => {
  if (!shapePoints || shapePoints.length === 0) {
    return {
      vertices: [],
      boundingBox: {
        minX: position.x,
        maxX: position.x + 100,
        minY: position.y,
        maxY: position.y + 100,
        width: 100,
        height: 100
      }
    };
  }

  const vertices = shapePoints.map(point => ({
    x: position.x + point.x,
    y: position.y + point.y
  }));

  const boundingBox = calculateBoundingBox(shapePoints);
  
  return {
    vertices,
    boundingBox: {
      minX: position.x + boundingBox.minX,
      maxX: position.x + boundingBox.maxX,
      minY: position.y + boundingBox.minY,
      maxY: position.y + boundingBox.maxY,
      width: boundingBox.width,
      height: boundingBox.height
    }
  };
};

interface PropertyPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (node: Node) => void;
  onDeleteNode?: (nodeId: string) => void;
  onClose?: () => void;
  mode?: AppMode;
  guidedSuggestions?: GuidedSuggestion[];
  groups?: NodeGroup[];
  isVisible?: boolean;
  connectionStatus?: 'connected' | 'disconnected' | 'checking';
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedNode, onUpdateNode, onDeleteNode, onClose, mode = 'creation', guidedSuggestions = [], groups = [], isVisible = true, connectionStatus = 'disconnected' }) => {
  const [editedNode, setEditedNode] = useState<Node | null>(null);
  const [relationships, setRelationships] = useState<SpatialRelationship[]>([]);
  const [requirements, setRequirements] = useState<{
    adjacencies: any[];
    prohibitions: any[];
    utilities: any[];
    materialFlows: any[];
    personnelFlows: any[];
  } | null>(null);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    name: '',
    type: '',
    model: '',
    manufacturer: '',
    description: '',
    status: 'operational'
  });

  useEffect(() => {
    if (selectedNode) {
      setEditedNode({ ...selectedNode });
      loadNodeRelationships(selectedNode.id);
      loadNodeRequirements(selectedNode.id);
    } else {
      setEditedNode(null);
      setRelationships([]);
      setRequirements(null);
    }
  }, [selectedNode]);

  const loadNodeRelationships = async (nodeId: string) => {
    try {
      console.log(`🔗 PropertyPanel: Loading relationships for ${nodeId} in ${mode} mode`);

      // Only load relationships for supported modes
      if (mode === 'creation' || mode === 'exploration') {
        const rels = await apiService.getRelationshipsForNode(nodeId, {
          mode: mode,
          includeIcons: mode === 'exploration',
          priority: mode === 'exploration' ? 7 : undefined
        });
        console.log(`🔗 PropertyPanel: Loaded ${rels.length} relationships`);
        setRelationships(rels);
      } else {
        // For other modes like layoutDesigner, don't load relationships
        console.log(`🔗 PropertyPanel: Skipping relationship loading for ${mode} mode`);
        setRelationships([]);
      }
    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  };

  const loadNodeRequirements = async (nodeId: string) => {
    try {
      const nodeType = nodeId.replace(/^node-/, '').replace(/-\d+$/, '');
      const reqs = await apiService.getComplianceRequirements(nodeType);
      setRequirements({
        adjacencies: reqs.adjacencies || [],
        prohibitions: reqs.prohibitions || [],
        utilities: reqs.utilities || [],
        materialFlows: reqs.materialFlows || [],
        personnelFlows: reqs.personnelFlows || []
      });
    } catch (error) {
      console.error('Error loading requirements:', error);
    }
  };

  const handleSave = () => {
    if (editedNode) {
      onUpdateNode(editedNode);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (editedNode) {
      if (field === 'name') {
        setEditedNode({
          ...editedNode,
          data: {
            ...(editedNode.data as NodeData),
            name: value,
            label: value,
          },
        });
      } else if (['category', 'cleanroomClass', 'width', 'height'].includes(field)) {
        setEditedNode({
          ...editedNode,
          data: {
            ...(editedNode.data as NodeData),
            [field]: value,
          },
        });
      } else if (field === 'position') {
        setEditedNode({
          ...editedNode,
          position: value,
        });
      }
    }
  };

  const handleAddEquipment = () => {
    setEditingEquipment(null);
    setNewEquipment({
      name: '',
      type: '',
      model: '',
      manufacturer: '',
      description: '',
      status: 'operational'
    });
    setEquipmentDialogOpen(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setNewEquipment({ ...equipment });
    setEquipmentDialogOpen(true);
  };

  const handleSaveEquipment = () => {
    if (editedNode && newEquipment.name && newEquipment.type) {
      const nodeData = editedNode.data as NodeData;
      const currentEquipment = nodeData.equipment || [];
      
      let updatedEquipment: Equipment[];
      
      if (editingEquipment) {
        // Update existing equipment
        updatedEquipment = currentEquipment.map(eq => 
          eq.id === editingEquipment.id ? { ...newEquipment, id: editingEquipment.id } as Equipment : eq
        );
      } else {
        // Add new equipment
        const newEq: Equipment = {
          ...newEquipment,
          id: `eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        } as Equipment;
        updatedEquipment = [...currentEquipment, newEq];
      }

      setEditedNode({
        ...editedNode,
        data: {
          ...nodeData,
          equipment: updatedEquipment,
        },
      });
      
      setEquipmentDialogOpen(false);
      setEditingEquipment(null);
    }
  };

  const handleDeleteEquipment = (equipmentId: string) => {
    if (editedNode) {
      const nodeData = editedNode.data as NodeData;
      const currentEquipment = nodeData.equipment || [];
      
      const updatedEquipment = currentEquipment.filter(eq => eq.id !== equipmentId);
      
      setEditedNode({
        ...editedNode,
        data: {
          ...nodeData,
          equipment: updatedEquipment,
        },
      });
    }
  };

  // Neo4j node assignment handlers
  const handleAssignNeo4jNode = useCallback((nodeId: string, nodeData: any) => {
    console.log('🎯 PropertyPanel: Neo4j assignment initiated:', {
      targetNodeId: editedNode?.id,
      assignedNodeId: nodeId,
      assignedNodeData: nodeData
    });
    
    if (editedNode) {
      const updatedNode = {
        ...editedNode,
        data: {
          ...editedNode.data,
          ...nodeData,
          // Force re-render by updating timestamp
          lastAssignmentUpdate: Date.now(),
          // Ensure the label is updated to reflect the assignment
          label: nodeData.assignedNodeName || editedNode.data.label,
        } as CustomShapeData,
      };
      
      console.log('✅ PropertyPanel: Updated node data:', {
        nodeId: updatedNode.id,
        hasInheritedProperties: updatedNode.data.hasInheritedProperties,
        assignedNodeName: updatedNode.data.assignedNodeName,
        assignedNodeCategory: updatedNode.data.assignedNodeCategory,
        showAssignmentDialog: updatedNode.data.showAssignmentDialog,
        label: updatedNode.data.label
      });
      
      // Update local state immediately
      setEditedNode(updatedNode);
      
      // Propagate changes to parent immediately with forced update
      setTimeout(() => {
        console.log('🚀 PropertyPanel: Propagating node update to parent');
        onUpdateNode(updatedNode);
      }, 0);
      
      console.log('🎉 PropertyPanel: Assignment complete - node should update immediately');
    } else {
      console.warn('⚠️ PropertyPanel: No edited node available for assignment');
    }
  }, [editedNode, onUpdateNode]);

  const handleInheritRelationships = useCallback((relationships: any[]) => {
    console.log('🔗 PropertyPanel: Inheriting relationships:', {
      targetNodeId: editedNode?.id,
      relationshipCount: relationships.length,
      relationships: relationships.map(r => ({ type: r.type, target: r.targetNodeName || r.targetCategory }))
    });
    
    if (editedNode && editedNode.type === 'customShape') {
      const customShapeData = editedNode.data as CustomShapeData;
      const updatedNode = {
        ...editedNode,
        data: {
          ...customShapeData,
          inheritedRelationships: relationships,
          showAssignmentDialog: false, // Clear dialog flag after assignment
          lastAssignmentUpdate: new Date(), // Ensure re-render tracking
        } as CustomShapeData,
      };
      
      console.log('✅ PropertyPanel: Relationships inherited successfully:', {
        nodeId: updatedNode.id,
        relationshipCount: relationships.length,
        showAssignmentDialog: false
      });
      
      // Update local state immediately
      setEditedNode(updatedNode);
      
      // Propagate changes to parent immediately
      onUpdateNode(updatedNode);
      
      console.log('🚀 PropertyPanel: Relationship inheritance complete - node should update immediately');
    } else {
      console.warn('⚠️ PropertyPanel: Cannot inherit relationships - invalid node type or missing node');
    }
  }, [editedNode, onUpdateNode]);

  // Effect to handle automatic Neo4j assignment dialog trigger
  useEffect(() => {
    if (editedNode?.type === 'customShape' && mode === 'exploration') {
      const customShapeData = editedNode.data as CustomShapeData;
      if (customShapeData.showAssignmentDialog && !customShapeData.hasInheritedProperties) {
        // Auto-scroll to assignment section or show visual indicator
        console.log('🎯 PropertyPanel: Auto-showing Neo4j assignment for new shape');
        // The assignment section will be visible by default when the flag is true
      }
    }
  }, [editedNode, mode]);

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO':
        return <Room color="primary" />;
      case 'PROHIBITED_NEAR':
        return <Warning color="error" />;
      case 'REQUIRES_ACCESS':
        return <Speed color="info" />;
      case 'SHARES_UTILITY':
        return <Settings color="success" />;
      case 'MATERIAL_FLOW':
        return <SwapHoriz color="secondary" />;
      case 'PERSONNEL_FLOW':
        return <Person color="action" />;
      default:
        return <CheckCircle />;
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO':
        return '#1976d2';
      case 'PROHIBITED_NEAR':
        return '#d32f2f';
      case 'REQUIRES_ACCESS':
        return '#0288d1';
      case 'SHARES_UTILITY':
        return '#388e3c';
      case 'MATERIAL_FLOW':
        return '#9c27b0';
      case 'PERSONNEL_FLOW':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  if (!selectedNode || !editedNode) {
    return (
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          p: 2,
          borderRadius: 0,
          borderLeft: '1px solid #e0e0e0',
          display: isVisible ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">Select a node to edit properties</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        width: 350,
        minWidth: 350,
        maxWidth: 350,
        height: 'calc(100vh - 64px)',
        borderRadius: 0,
        borderLeft: '1px solid #e0e0e0',
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {mode === 'creation' ? <Edit color="secondary" /> : <Visibility color="primary" />}
          <Typography variant="h6" sx={{ flex: 1 }}>
            {mode === 'creation' ? 'Node Properties' : 'Node Details'}
          </Typography>
          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              aria-label="close property panel"
              sx={{ ml: 'auto' }}
            >
              <Close />
            </IconButton>
          )}
        </Box>
        
        {mode === 'exploration' && (
          <Alert severity="info" sx={{ mb: 1 }}>
            <Typography variant="caption">
              Exploration mode: Properties are read-only from the knowledge graph
            </Typography>
          </Alert>
        )}
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Basic Information
            </Typography>
            
            <TextField
              fullWidth
              label="Name"
              value={(editedNode.data as NodeData).name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              margin="normal"
              size="small"
              disabled={mode === 'exploration'}
              InputProps={{
                readOnly: mode === 'exploration',
                endAdornment: mode === 'exploration' ? <Lock fontSize="small" /> : null,
              }}
            />

            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={(editedNode.data as NodeData).category}
                label="Category"
                onChange={(e) => handleFieldChange('category', e.target.value)}
                disabled={mode === 'exploration'}
              >
                <MenuItem value="Production">Production</MenuItem>
                <MenuItem value="Quality Control">Quality Control</MenuItem>
                <MenuItem value="Warehouse">Warehouse</MenuItem>
                <MenuItem value="Utilities">Utilities</MenuItem>
                <MenuItem value="Personnel">Personnel</MenuItem>
                <MenuItem value="Support">Support</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Cleanroom Class</InputLabel>
              <Select
                value={(editedNode.data as NodeData).cleanroomClass || ''}
                label="Cleanroom Class"
                onChange={(e) => handleFieldChange('cleanroomClass', e.target.value)}
                disabled={mode === 'exploration'}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="A">Class A (Highest)</MenuItem>
                <MenuItem value="B">Class B</MenuItem>
                <MenuItem value="C">Class C</MenuItem>
                <MenuItem value="D">Class D (Lowest)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                label="Width"
                type="number"
                value={(editedNode.data as NodeData).width || 120}
                onChange={(e) => handleFieldChange('width', parseInt(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
                disabled={mode === 'exploration'}
              />
              <TextField
                label="Height"
                type="number"
                value={(editedNode.data as NodeData).height || 80}
                onChange={(e) => handleFieldChange('height', parseInt(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
                disabled={mode === 'exploration'}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                label="X Position"
                type="number"
                value={Math.round(editedNode.position.x)}
                onChange={(e) => handleFieldChange('position', { ...editedNode.position, x: parseInt(e.target.value) })}
                size="small"
                sx={{ flex: 1 }}
                disabled={mode === 'exploration'}
              />
              <TextField
                label="Y Position"
                type="number"
                value={Math.round(editedNode.position.y)}
                onChange={(e) => handleFieldChange('position', { ...editedNode.position, y: parseInt(e.target.value) })}
                size="small"
                sx={{ flex: 1 }}
                disabled={mode === 'exploration'}
              />
            </Box>

            {mode === 'creation' && (
              <Button
                fullWidth
                variant="contained"
                onClick={handleSave}
                sx={{ mt: 2 }}
              >
                Apply Changes
              </Button>
            )}
            
            {onDeleteNode && (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => onDeleteNode(selectedNode!.id)}
                sx={{ mt: 1 }}
              >
                Delete Node
              </Button>
            )}
            
            {mode === 'exploration' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Node properties are read-only in exploration mode
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Neo4j Node Assignment for Custom Shapes */}
        {mode === 'exploration' && selectedNode?.type === 'customShape' && (
          <Box 
            sx={{ 
              border: (editedNode?.data as CustomShapeData)?.showAssignmentDialog ? '2px solid #1976d2' : 'none',
              borderRadius: (editedNode?.data as CustomShapeData)?.showAssignmentDialog ? 1 : 0,
              animation: (editedNode?.data as CustomShapeData)?.showAssignmentDialog ? 'pulse 2s ease-in-out' : 'none',
              '@keyframes pulse': {
                '0%': { borderColor: '#1976d2' },
                '50%': { borderColor: '#42a5f5' },
                '100%': { borderColor: '#1976d2' }
              }
            }}
          >
            {(editedNode?.data as CustomShapeData)?.showAssignmentDialog && (
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  🎯 Please assign this shape to a Neo4j node to enable intelligent connections!
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Inherited Relationships Display for Custom Shapes */}
        {mode === 'exploration' && selectedNode?.type === 'customShape' && 
         (editedNode?.data as CustomShapeData)?.hasInheritedProperties && 
         ((editedNode?.data as CustomShapeData)?.inheritedRelationships?.length ?? 0) > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Link color="primary" />
                Inherited Relationships ({((editedNode?.data as CustomShapeData)?.inheritedRelationships?.length ?? 0)})
                <Chip 
                  label={`From: ${(editedNode?.data as CustomShapeData)?.assignedNodeName || 'Unknown'}`}
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ ml: 'auto' }}
                />
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  These relationships are inherited from the assigned Neo4j node and will guide connection suggestions.
                </Typography>
              </Alert>

              <List dense>
                {((editedNode?.data as CustomShapeData)?.inheritedRelationships || []).map((rel: any, index: number) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemIcon>
                      {getRelationshipIcon(rel.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" component="span">
                            {rel.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" component="span">
                            → {rel.targetNodeName || rel.targetCategory}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {rel.reason || 'Pharmaceutical design rule'}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={`Priority: ${rel.priority || 5}`}
                              size="small"
                              sx={{ 
                                backgroundColor: getRelationshipColor(rel.type), 
                                color: 'white',
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                            <Chip
                              label={`Confidence: ${Math.round((rel.confidence || 0.8) * 100)}%`}
                              size="small"
                              color="default"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: '20px' }}
                            />
                            {rel.flowDirection && (
                              <Chip
                                label={rel.flowDirection}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Equipment Management */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Build color="primary" />
              Equipment ({(editedNode.data as NodeData).equipment?.length || 0})
              {mode === 'creation' && (
                <IconButton 
                  size="small" 
                  onClick={handleAddEquipment}
                  sx={{ ml: 'auto' }}
                  disabled={mode !== 'creation'}
                >
                  <Add />
                </IconButton>
              )}
            </Typography>
            
            {((editedNode.data as NodeData).equipment?.length || 0) > 0 ? (
              <List dense>
                {(editedNode.data as NodeData).equipment?.map((equipment) => (
                  <ListItem 
                    key={equipment.id}
                    sx={{ 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 1, 
                      mb: 1,
                      '&:last-child': { mb: 0 }
                    }}
                  >
                    <ListItemIcon>
                      <Build color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {equipment.name}
                          </Typography>
                          <Chip
                            label={equipment.status}
                            size="small"
                            color={getEquipmentStatusColor(equipment.status || 'operational') as any}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Type: {equipment.type}
                          </Typography>
                          {equipment.model && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Model: {equipment.model}
                            </Typography>
                          )}
                          {equipment.manufacturer && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Manufacturer: {equipment.manufacturer}
                            </Typography>
                          )}
                          {equipment.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {equipment.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    {mode === 'creation' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditEquipment(equipment)}
                          disabled={mode !== 'creation'}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteEquipment(equipment.id)}
                          color="error"
                          disabled={mode !== 'creation'}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                No equipment assigned to this area. 
                {mode === 'creation' && ' Click the + button to add equipment.'}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Group Information */}
        {(editedNode.data as NodeData).groupId && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupWork color="success" />
                Group Information
              </Typography>
              
              {(() => {
                const nodeData = editedNode.data as NodeData;
                const nodeGroup = groups.find(g => g.id === nodeData.groupId);
                
                if (!nodeGroup) {
                  return (
                    <Alert severity="warning">
                      Node is assigned to a group that no longer exists
                    </Alert>
                  );
                }

                return (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      This node belongs to group:
                    </Typography>
                    <Chip
                      label={nodeGroup.name}
                      sx={{
                        backgroundColor: nodeGroup.color,
                        color: 'white',
                        mb: 1
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Group contains {nodeGroup.nodeIds.length} nodes
                    </Typography>
                    {nodeGroup.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {nodeGroup.description}
                      </Typography>
                    )}
                  </Box>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {requirements && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Compliance Requirements
              </Typography>
              
              {requirements.adjacencies.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Required Adjacencies
                  </Typography>
                  <List dense>
                    {requirements.adjacencies.map((req, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Room color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={req.target}
                          secondary={req.reason}
                        />
                        <Chip
                          label={`Priority: ${req.priority}`}
                          size="small"
                          color="primary"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {requirements.prohibitions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Prohibited Near
                  </Typography>
                  <List dense>
                    {requirements.prohibitions.map((req, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Warning color="error" />
                        </ListItemIcon>
                        <ListItemText
                          primary={req.target}
                          secondary={`${req.reason} (Min: ${req.minDistance}m)`}
                        />
                        <Chip
                          label={`Priority: ${req.priority}`}
                          size="small"
                          color="error"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {requirements.utilities.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Required Utilities
                  </Typography>
                  <List dense>
                    {requirements.utilities.map((req, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Settings color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={req.target}
                          secondary={req.reason}
                        />
                        <Chip
                          label={`Priority: ${req.priority}`}
                          size="small"
                          color="success"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {requirements.materialFlows && requirements.materialFlows.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Material Flow Requirements
                  </Typography>
                  <List dense>
                    {requirements.materialFlows.map((req, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <SwapHoriz color="secondary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={req.target}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {req.reason}
                              </Typography>
                              {req.flowType && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Flow Type: {req.flowType.replace('_', ' ')}
                                </Typography>
                              )}
                              {req.flowDirection && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Direction: {req.flowDirection}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={`Priority: ${req.priority}`}
                          size="small"
                          color="secondary"
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {requirements.personnelFlows && requirements.personnelFlows.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Personnel Flow Requirements
                  </Typography>
                  <List dense>
                    {requirements.personnelFlows.map((req, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Person color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={req.target}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {req.reason}
                              </Typography>
                              {req.flowType && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Flow Type: {req.flowType}
                                </Typography>
                              )}
                              {req.flowDirection && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Direction: {req.flowDirection}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={`Priority: ${req.priority}`}
                          size="small"
                          sx={{ backgroundColor: '#ff9800', color: 'white' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {relationships.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Current Relationships
              </Typography>
              <List dense>
                {relationships.map((rel) => (
                  <ListItem key={rel.id}>
                    <ListItemIcon>
                      {getRelationshipIcon(rel.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={rel.type.replace('_', ' ').toLowerCase()}
                      secondary={rel.reason}
                    />
                    <Chip
                      label={rel.priority}
                      size="small"
                      sx={{
                        backgroundColor: getRelationshipColor(rel.type),
                        color: 'white',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Guided Suggestions Section */}
        {mode === 'exploration' && guidedSuggestions.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed color="primary" />
                AI Suggestions
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Based on knowledge graph patterns:
              </Typography>
              <List dense>
                {guidedSuggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={suggestion.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {suggestion.reason}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={`Priority: ${suggestion.priority}`}
                              size="small"
                              color="primary"
                            />
                            <Chip
                              label={`Frequency: ${suggestion.frequency}`}
                              size="small"
                              color="secondary"
                            />
                            <Chip
                              label={`Confidence: ${Math.round(suggestion.confidence * 100)}%`}
                              size="small"
                              color={suggestion.confidence > 0.7 ? 'success' : 'warning'}
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Equipment Dialog */}
      <Dialog 
        open={equipmentDialogOpen} 
        onClose={() => setEquipmentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Equipment Name"
              value={newEquipment.name || ''}
              onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Equipment Type"
              value={newEquipment.type || ''}
              onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
              margin="normal"
              required
              placeholder="e.g., Autoclave, Tablet Press, HPLC"
            />
            
            <TextField
              fullWidth
              label="Model"
              value={newEquipment.model || ''}
              onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Manufacturer"
              value={newEquipment.manufacturer || ''}
              onChange={(e) => setNewEquipment({ ...newEquipment, manufacturer: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={newEquipment.description || ''}
              onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={newEquipment.status || 'operational'}
                label="Status"
                onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value as Equipment['status'] })}
              >
                <MenuItem value="operational">Operational</MenuItem>
                <MenuItem value="maintenance">Maintenance</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEquipmentDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEquipment}
            variant="contained"
            disabled={!newEquipment.name || !newEquipment.type}
          >
            {editingEquipment ? 'Update' : 'Add'} Equipment
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default memo(PropertyPanel);