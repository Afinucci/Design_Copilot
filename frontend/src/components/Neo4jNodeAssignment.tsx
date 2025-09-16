import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Paper,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assignment,
  Link,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  Search,
  FilterList,
  Close,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { CustomShapeData, NodeTemplate } from '../types';
import { apiService } from '../services/api';
import { Node as ReactFlowNode } from 'reactflow';

interface Neo4jNodeAssignmentProps {
  customShapeData: CustomShapeData;
  onAssignNode: (nodeId: string, nodeData: any) => void;
  onInheritRelationships: (relationships: any[]) => void;
  isConnected: boolean;
  autoOpen?: boolean;
  onClose?: () => void;
  // New props for constraint validation
  shapePosition?: { x: number; y: number };
  shapeGeometry?: {
    vertices: Array<{ x: number; y: number }>;
    boundingBox: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
  nearbyShapes?: ReactFlowNode[];
  onConstraintValidation?: (result: any) => void;
}

interface KnowledgeGraphNode {
  id: string;
  name: string;
  category: string;
  cleanroomClass?: string;
  description?: string;
  relationships?: any[];
}

const Neo4jNodeAssignment: React.FC<Neo4jNodeAssignmentProps> = ({
  customShapeData,
  onAssignNode,
  onInheritRelationships,
  isConnected,
  autoOpen = false,
  onClose,
  // New constraint validation props
  shapePosition,
  shapeGeometry,
  nearbyShapes,
  onConstraintValidation
}) => {
  const [availableNodes, setAvailableNodes] = useState<KnowledgeGraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodeRelationships, setNodeRelationships] = useState<any[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);
  // New state for constraint validation
  const [constraintValidation, setConstraintValidation] = useState<{
    isValidating: boolean;
    result?: any;
    violations: any[];
    showFeedback: boolean;
  }>({ isValidating: false, violations: [], showFeedback: false });
  const [activationFeedback, setActivationFeedback] = useState<{
    show: boolean;
    message: string;
    severity: 'success' | 'warning' | 'error' | 'info';
  }>({ show: false, message: '', severity: 'info' });

  // Get filtered nodes based on search and category
  const filteredNodes = useMemo(() => {
    let filtered = availableNodes;
    
    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(node => 
        node.category.toLowerCase() === categoryFilter.toLowerCase()
      );
    }
    
    // Filter by search text
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase();
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(searchTerm) ||
        node.category.toLowerCase().includes(searchTerm) ||
        (node.cleanroomClass && node.cleanroomClass.toLowerCase().includes(searchTerm))
      );
    }
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableNodes, categoryFilter, searchValue]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = new Set(availableNodes.map(node => node.category));
    const cats = ['all', ...Array.from(uniqueCategories)];
    return cats;
  }, [availableNodes]);

  // Load available nodes from Neo4j
  const loadAvailableNodes = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.importKnowledgeGraph();
      const nodes = response.nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        category: node.category,
        cleanroomClass: node.cleanroomClass,
        description: `${node.category} - Class ${node.cleanroomClass || 'N/A'}`,
        relationships: []
      }));
      
      setAvailableNodes(nodes);
    } catch (err) {
      console.error('Error loading available nodes:', err);
      setError('Failed to load nodes from knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // Load relationships for selected node
  const loadNodeRelationships = useCallback(async (nodeId: string) => {
    if (!isConnected) return;
    
    setLoading(true);
    try {
      const response = await apiService.getNodeWithRelationships(nodeId);
      setNodeRelationships(response.relationships || []);
    } catch (err) {
      console.error('Error loading node relationships:', err);
      setError('Failed to load node relationships');
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // Handle node selection
  const handleNodeSelect = useCallback((node: KnowledgeGraphNode | null) => {
    setSelectedNode(node);
    if (node) {
      loadNodeRelationships(node.id);
    } else {
      setNodeRelationships([]);
    }
  }, [loadNodeRelationships]);

  // Handle assignment with constraint activation
  const handleAssign = useCallback(async () => {
    if (!selectedNode) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Shape assignment result:', {
        shapeId: customShapeData.id,
        selectedNodeId: selectedNode.id,
        selectedNodeName: selectedNode.name,
        selectedNodeCategory: selectedNode.category,
        assignedName: selectedNode.name,
        hasInheritedProperties: true
      });

      console.log('🔗 Activating constraints for shape association:', {
        shapeId: customShapeData.id,
        selectedNode
      });

      // Call backend to associate shape with Neo4j node and activate constraints
      const associationResult = await apiService.associateShapeWithNode(
        customShapeData.id,
        selectedNode.id,
        selectedNode.name,
        selectedNode.category,
        selectedNode.cleanroomClass
      );

      if (associationResult.success) {
        console.log('✅ Shape association successful:', associationResult);

        // Prepare updated node data
        const nodeUpdateData = {
          // Ensure UI uses human-friendly name and not internal id
          label: selectedNode.name,
          category: selectedNode.category,
          cleanroomClass: selectedNode.cleanroomClass,
          assignedNodeId: selectedNode.id,
          assignedNodeName: selectedNode.name,
          assignedNodeCategory: selectedNode.category,
          hasInheritedProperties: true,
          inheritedRelationships: (associationResult as any).constraints?.details || associationResult.constraints || nodeRelationships,
          constraintsActivated: true,
          constraintsCount: (associationResult as any).constraints?.count || associationResult.constraintsCount,
          showAssignmentDialog: false, // Hide the assignment dialog after assignment
        };

        console.log('📝 Updating shape with Neo4j properties:', {
          shapeId: customShapeData.id,
          updateData: nodeUpdateData
        });

        // Update the custom shape with Neo4j properties and activated constraints
        onAssignNode(selectedNode.id, nodeUpdateData);

        // Use the enhanced relationships from the backend with full constraint data
        const enhancedRelationships = associationResult.constraints || nodeRelationships;
        onInheritRelationships(enhancedRelationships);

        console.log(`🎉 Constraints activated: ${associationResult.constraintsCount} rules now apply to this shape`);
        
        // Show success message with constraint count
        if (associationResult.constraintsCount > 0) {
          console.log(`✨ ${associationResult.constraintsCount} pharmaceutical design constraints are now active for this shape`);
        }

        // Verify the assignment was successful
        setTimeout(() => {
          console.log('🔍 Assignment verification - shape should now display:', {
            expectedName: selectedNode.name,
            expectedCategory: selectedNode.category,
            shapeId: customShapeData.id
          });
        }, 100);

      } else {
        console.error('❌ Shape association failed:', associationResult.message);
        setError(associationResult.message || 'Failed to associate shape with Neo4j node');
        return;
      }

    } catch (err) {
      console.error('💥 Error in shape association:', err);
      setError('Failed to activate constraints - using basic assignment');
      
      // Fallback to basic assignment without constraint activation
      const fallbackData = {
        label: selectedNode.name,
        category: selectedNode.category,
        cleanroomClass: selectedNode.cleanroomClass,
        assignedNodeId: selectedNode.id,
        assignedNodeName: selectedNode.name,
        assignedNodeCategory: selectedNode.category,
        hasInheritedProperties: true,
        inheritedRelationships: nodeRelationships,
        constraintsActivated: false,
        showAssignmentDialog: false,
      };

      console.log('🔄 Using fallback assignment:', fallbackData);
      onAssignNode(selectedNode.id, fallbackData);
      onInheritRelationships(nodeRelationships);
    } finally {
      setLoading(false);
    }
    
    // Close dialog if auto-opened
    if (onClose) {
      console.log('🚪 Closing Neo4j assignment dialog');
      onClose();
    }
  }, [selectedNode, nodeRelationships, onAssignNode, onInheritRelationships, onClose, customShapeData.id]);

  // Clear assignment
  const handleClearAssignment = useCallback(() => {
    onAssignNode('', {
      label: 'Custom Shape',
      category: 'None',
      cleanroomClass: undefined,
      assignedNodeId: undefined,
      assignedNodeName: undefined,
      hasInheritedProperties: false,
    });
    
    onInheritRelationships([]);
    setSelectedNode(null);
    setNodeRelationships([]);
  }, [onAssignNode, onInheritRelationships]);

  // Load available nodes on mount
  useEffect(() => {
    loadAvailableNodes();
  }, [loadAvailableNodes]);

  // Set initial selected node if already assigned
  useEffect(() => {
    if (customShapeData.assignedNodeId && availableNodes.length > 0) {
      const assignedNode = availableNodes.find(node => node.id === customShapeData.assignedNodeId);
      if (assignedNode) {
        setSelectedNode(assignedNode);
        loadNodeRelationships(assignedNode.id);
      }
    }
  }, [customShapeData.assignedNodeId, availableNodes, loadNodeRelationships]);

  if (!isConnected) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Knowledge graph not connected. Cannot assign Neo4j properties.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Assignment sx={{ mr: 1 }} />
        <Typography variant="h6">Neo4j Node Assignment</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Tooltip title="Show/Hide Advanced Search">
            <IconButton
              size="small"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              color={showAdvancedSearch ? 'primary' : 'default'}
            >
              <FilterList />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Nodes">
            <IconButton
              size="small"
              onClick={loadAvailableNodes}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          {onClose && (
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose}>
                <Close />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Current Assignment Status */}
      {customShapeData.hasInheritedProperties && customShapeData.assignedNodeName && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2">
              Assigned to: <strong>{customShapeData.assignedNodeName}</strong>
            </Typography>
            <Button size="small" onClick={handleClearAssignment} color="error">
              Clear
            </Button>
          </Box>
        </Alert>
      )}

      {/* Advanced Search Filters */}
      {showAdvancedSearch && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Search Filters
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Autocomplete
              size="small"
              options={categories}
              value={categoryFilter}
              onChange={(_, newValue) => setCategoryFilter(newValue || 'all')}
              renderInput={(params) => (
                <TextField {...params} label="Category" sx={{ minWidth: 150 }} />
              )}
              getOptionLabel={(option) => option === 'all' ? 'All Categories' : option}
            />
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              {filteredNodes.length} of {availableNodes.length} nodes
            </Typography>
          </Box>
        </Box>
      )}

      {/* Node Selection */}
      <Autocomplete
        options={filteredNodes}
        getOptionLabel={(option) => `${option.name} (${option.category})`}
        value={selectedNode}
        onChange={(_, newValue) => handleNodeSelect(newValue)}
        inputValue={searchValue}
        onInputChange={(_, newInputValue) => setSearchValue(newInputValue)}
        loading={loading}
        disabled={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Neo4j Nodes"
            placeholder="Type to search nodes..."
            InputProps={{
              ...params.InputProps,
              startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            helperText={filteredNodes.length === 0 && searchValue ? 'No nodes match your search' : ''}
          />
        )}
        renderOption={(props, option) => (
          <li {...props}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight="medium">
                  {option.name}
                </Typography>
                <Chip label={option.category} size="small" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            </Box>
          </li>
        )}
        sx={{ mb: 2 }}
        noOptionsText={loading ? 'Loading...' : 'No nodes found'}
      />

      {/* Assignment Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={!selectedNode || loading}
          startIcon={<Link />}
        >
          Assign Properties
        </Button>
        {customShapeData.hasInheritedProperties && (
          <Button
            variant="outlined"
            onClick={handleClearAssignment}
            color="error"
          >
            Clear Assignment
          </Button>
        )}
      </Box>

      {/* Relationship Preview */}
      {nodeRelationships.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              Inherited Relationships ({nodeRelationships.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => setShowRelationships(!showRelationships)}
              sx={{ ml: 1 }}
            >
              {showRelationships ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          
          {showRelationships && (
            <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}>
              {nodeRelationships.slice(0, 10).map((rel, index) => (
                <ListItem key={index} sx={{ px: 2 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Info fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {rel.type}
                        </Typography>
                        <Chip
                          label={`Priority: ${rel.priority || 5}`}
                          size="small"
                          variant="outlined"
                          color={rel.priority >= 8 ? 'error' : rel.priority >= 6 ? 'warning' : 'default'}
                        />
                      </Box>
                    }
                    secondary={rel.reason || 'No description provided'}
                  />
                </ListItem>
              ))}
              {nodeRelationships.length > 10 && (
                <ListItem sx={{ px: 2 }}>
                  <ListItemText
                    secondary={
                      <Typography variant="caption" fontStyle="italic">
                        + {nodeRelationships.length - 10} more relationships will be inherited
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          )}
          
          <Alert severity="info" sx={{ mb: 1 }}>
            <Typography variant="body2">
              These relationships will provide intelligent connection suggestions when you connect this shape to other nodes.
            </Typography>
          </Alert>
        </>
      )}

      {/* Assignment Instructions */}
      {!customShapeData.hasInheritedProperties && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Select a Neo4j node to inherit its properties and relationships. This will:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li>Update the shape's label and category</li>
            <li>Inherit cleanroom class requirements</li>
            <li>Enable automatic relationship validation</li>
            <li>Show connection suggestions based on Neo4j data</li>
          </Box>
        </Alert>
      )}
      
      {/* Constraint Activation Feedback */}
      {activationFeedback.show && (
        <Alert 
          severity={activationFeedback.severity} 
          sx={{ mt: 2 }}
          onClose={() => setActivationFeedback(prev => ({ ...prev, show: false }))}
        >
          <Typography variant="body2">
            {activationFeedback.message}
          </Typography>
        </Alert>
      )}
    </Paper>
  );
};

export default Neo4jNodeAssignment;