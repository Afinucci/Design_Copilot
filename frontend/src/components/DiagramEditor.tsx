import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
  Edge,
  ConnectionMode,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Alert,
  Snackbar,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
} from '@mui/material';
import { Save, PlayArrow, Stop, Edit, Search, Wifi, WifiOff, Sync, GroupWork, Cancel, Delete, Room, Warning, Speed, Settings, SwapHoriz, Person } from '@mui/icons-material';
import NodePalette from './NodePalette';
import PropertyPanel from './PropertyPanel';
import ValidationPanel from './ValidationPanel';
import CustomNode from './CustomNode';
import GroupBoundaryNode from './GroupBoundaryNode';
import MultiRelationshipEdge from './MultiRelationshipEdge';
import RelationshipLegend from './RelationshipLegend';
import InlineRelationshipEditDialog from './InlineRelationshipEditDialog';
import { addMultiEdge } from '../utils/edgeUtils';
import { DiagramEdge, NodeTemplate, ValidationResult, NodeData, AppMode, GuidedSuggestion, ModeConfig, NodeGroup, GroupingState, SpatialRelationship } from '../types';
import { apiService } from '../services/api';
import { Node } from 'reactflow';

const nodeTypes = {
  functionalArea: CustomNode,
  groupBoundary: GroupBoundaryNode,
};

const edgeTypes = {
  multiRelationship: MultiRelationshipEdge,
};

const modeConfigs: Record<AppMode, ModeConfig> = {
  creation: {
    mode: 'creation',
    title: 'Creation Mode',
    description: 'Design new facilities from scratch using template library',
    primaryAction: 'Save & Upload to Knowledge Graph',
    secondaryAction: 'Save Draft',
    dataSource: 'templates',
    allowPersistence: true,
    showSuggestions: false,
  },
  guided: {
    mode: 'guided',
    title: 'Guided Mode',
    description: 'AI-guided design based on existing knowledge graph patterns',
    primaryAction: 'Save New Design',
    secondaryAction: 'Save As Draft',
    dataSource: 'knowledge_graph',
    allowPersistence: false,
    showSuggestions: true,
  },
};

const DiagramEditor: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('creation');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<DiagramEdge>([]);
  
  // Helper functions for relationship styling
  const getRelationshipColor = useCallback((type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return '#1976d2';
      case 'PROHIBITED_NEAR': return '#d32f2f';
      case 'REQUIRES_ACCESS': return '#0288d1';
      case 'SHARES_UTILITY': return '#388e3c';
      case 'MATERIAL_FLOW': return '#9c27b0';
      case 'PERSONNEL_FLOW': return '#ff9800';
      default: return '#757575';
    }
  }, []);

  const getRelationshipDashArray = useCallback((type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return undefined;
      case 'PROHIBITED_NEAR': return '10,5';
      case 'REQUIRES_ACCESS': return '5,5';
      case 'SHARES_UTILITY': return '3,3';
      case 'MATERIAL_FLOW': return '8,3,3,3';
      case 'PERSONNEL_FLOW': return '5,3,5,3';
      default: return undefined;
    }
  }, []);

  const getRelationshipLabel = useCallback((type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return 'Adjacent';
      case 'PROHIBITED_NEAR': return 'Prohibited';
      case 'REQUIRES_ACCESS': return 'Access';
      case 'SHARES_UTILITY': return 'Utility';
      case 'MATERIAL_FLOW': return 'Material';
      case 'PERSONNEL_FLOW': return 'Personnel';
      default: return 'Relation';
    }
  }, []);

  // Auto-fix edges to ensure proper indexing and styling
  const autoFixEdges = useCallback((edgesToFix: any[]) => {
    console.log('Auto-fixing edges:', edgesToFix);
    
    // Group edges by node pairs (both directions)
    const edgeGroups = new Map<string, any[]>();
    
    edgesToFix.forEach(edge => {
      // Create a consistent key for the node pair (smaller id first)
      const nodeIds = [edge.source, edge.target].sort();
      const key = nodeIds.join('-');
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      edgeGroups.get(key)!.push(edge);
    });
    
    console.log('Edge groups:', Array.from(edgeGroups.entries()));
    
    // Convert edges to multiRelationship type with proper indexing
    const fixedEdges = edgesToFix.map(edge => {
      const nodeIds = [edge.source, edge.target].sort();
      const key = nodeIds.join('-');
      const groupEdges = edgeGroups.get(key)!;
      
      // Find the index of this edge within its group (based on edge ID for consistency)
      const sortedGroupEdges = [...groupEdges].sort((a, b) => a.id.localeCompare(b.id));
      const relationshipIndex = sortedGroupEdges.findIndex(e => e.id === edge.id);
      
      console.log(`Edge ${edge.id}: group size ${groupEdges.length}, index ${relationshipIndex}`);
      
      // Ensure edge has relationship type data
      const edgeData = (edge.data as any) || {};
      let relationshipType = edgeData.relationshipType || edgeData.type || 'ADJACENT_TO';
      
      // Try to infer relationship type from edge properties if not set
      if (!edgeData.relationshipType && !edgeData.type) {
        if (edge.label === 'Prohibited') relationshipType = 'PROHIBITED_NEAR';
        else if (edge.label === 'Access') relationshipType = 'REQUIRES_ACCESS';
        else if (edge.label === 'Utility') relationshipType = 'SHARES_UTILITY';
        else if (edge.label === 'Material') relationshipType = 'MATERIAL_FLOW';
        else if (edge.label === 'Personnel') relationshipType = 'PERSONNEL_FLOW';
        else relationshipType = 'ADJACENT_TO';
      }
      
      return {
        ...edge,
        type: 'multiRelationship' as const,
        animated: edgeData.animated || false,
        style: {
          ...edge.style,
          stroke: getRelationshipColor(relationshipType),
          strokeWidth: 2,
          strokeDasharray: getRelationshipDashArray(relationshipType)
        },
        label: getRelationshipLabel(relationshipType),
        labelShowBg: relationshipIndex > 0,
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.9,
          stroke: getRelationshipColor(relationshipType),
          strokeWidth: 1
        },
        data: {
          ...edgeData,
          relationshipType,
          relationshipIndex,
          creationDirection: edgeData.creationDirection || 'source-to-target'
        }
      };
    });
    
    console.log('Fixed edges with indices:', fixedEdges.map(e => ({ id: e.id, index: e.data.relationshipIndex })));
    return fixedEdges;
  }, [getRelationshipColor, getRelationshipDashArray, getRelationshipLabel]);

  // Apply auto-fix when edges change
  useEffect(() => {
    if (edges.length > 0) {
      console.log('🔧 Auto-fix useEffect triggered with edges:', edges.length);
      console.log('Current edges:', edges);
      
      // Check if any edge needs fixing
      const needsFixing = edges.some(edge => 
        edge.type !== 'multiRelationship' || 
        (edge.data as any)?.relationshipIndex === undefined
      );
      
      console.log('Needs fixing?', needsFixing);
      console.log('Edges that need fixing:', edges.filter(edge => 
        edge.type !== 'multiRelationship' || 
        (edge.data as any)?.relationshipIndex === undefined
      ));
      
      if (needsFixing) {
        console.log('Some edges need fixing, applying auto-fix...');
        const fixedEdges = autoFixEdges(edges);
        setEdges(fixedEdges);
      }
    }
  }, [edges, autoFixEdges, setEdges]);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdge | null>(null);
  const [showInlineEditDialog, setShowInlineEditDialog] = useState(false);

  // Handle node deletion
  const onNodesDelete = useCallback((nodesToDelete: any[]) => {
    // Remove nodes from canvas
    setNodes((nds) => nds.filter((node) => !nodesToDelete.find(n => n.id === node.id)));
    
    // Remove any edges connected to deleted nodes
    const nodeIds = nodesToDelete.map(n => n.id);
    setEdges((eds) => eds.filter((edge) => 
      !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
    ));
    
    // Clear selection if selected node was deleted
    if (selectedNode && nodeIds.includes(selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode, setSelectedNode]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete: any[]) => {
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find(e => e.id === edge.id)));
  }, [setEdges]);

  // Handle individual node deletion from PropertyPanel
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Find the node to delete
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;
    
    // Use the existing deletion handler
    onNodesDelete([nodeToDelete]);
  }, [nodes, onNodesDelete]);

  const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([]);
  const [existingNodes, setExistingNodes] = useState<NodeTemplate[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [isValidating, setIsValidating] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // New state for enhanced modes
  const [guidedSuggestions, setGuidedSuggestions] = useState<GuidedSuggestion[]>([]);
  const [currentModeConfig, setCurrentModeConfig] = useState<ModeConfig>(modeConfigs.creation);
  
  // Grouping state
  const [groupingState, setGroupingState] = useState<GroupingState>({
    isGroupMode: false,
    selectedNodeIds: [],
    groups: []
  });
  const [groupName, setGroupName] = useState<string>('');
  const [showGroupDialog, setShowGroupDialog] = useState<boolean>(false);
  
  
  // Relationship creation state
  const [relationshipDialog, setRelationshipDialog] = useState<{
    open: boolean;
    connection: Connection | null;
    selectedType: string;
    priority: number;
    reason: string;
    doorType: string;
    minDistance: number | null;
    maxDistance: number | null;
    flowDirection: string;
    flowType: string;
    animated: boolean;
  }>({
    open: false,
    connection: null,
    selectedType: 'ADJACENT_TO',
    priority: 5,
    reason: '',
    doorType: '',
    minDistance: null,
    maxDistance: null,
    flowDirection: 'bidirectional',
    flowType: 'raw_material',
    animated: false
  });

  // Group boundary utilities
  const calculateGroupBounds = (group: NodeGroup) => {
    const groupNodes = nodes.filter(node => {
      const nodeData = node.data as NodeData;
      return nodeData.groupId === group.id;
    });
    
    if (groupNodes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const PADDING = 30;
    const DEFAULT_NODE_WIDTH = 120;
    const DEFAULT_NODE_HEIGHT = 80;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    groupNodes.forEach(node => {
      const nodeData = node.data as NodeData;
      const nodeWidth = nodeData.width || DEFAULT_NODE_WIDTH;
      const nodeHeight = nodeData.height || DEFAULT_NODE_HEIGHT;
      
      const nodeLeft = node.position.x;
      const nodeTop = node.position.y;
      const nodeRight = node.position.x + nodeWidth;
      const nodeBottom = node.position.y + nodeHeight;

      minX = Math.min(minX, nodeLeft);
      minY = Math.min(minY, nodeTop);
      maxX = Math.max(maxX, nodeRight);
      maxY = Math.max(maxY, nodeBottom);
    });

    return {
      x: minX - PADDING,
      y: minY - PADDING,
      width: maxX - minX + (PADDING * 2),
      height: maxY - minY + (PADDING * 2)
    };
  };

  const isNodeInGroupBounds = (nodePosition: { x: number; y: number }, nodeData: NodeData, groupBounds: any) => {
    const nodeWidth = nodeData.width || 120;
    const nodeHeight = nodeData.height || 80;
    
    const nodeLeft = nodePosition.x;
    const nodeTop = nodePosition.y;
    const nodeRight = nodePosition.x + nodeWidth;
    const nodeBottom = nodePosition.y + nodeHeight;

    return (
      nodeLeft >= groupBounds.x &&
      nodeTop >= groupBounds.y &&
      nodeRight <= groupBounds.x + groupBounds.width &&
      nodeBottom <= groupBounds.y + groupBounds.height
    );
  };

  const checkGroupBoundaryViolation = (nodeId: string, newPosition: { x: number; y: number }) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;

    const nodeData = node.data as NodeData;
    const nodeGroup = groupingState.groups.find(g => g.id === nodeData.groupId);

    // If node is in a group, check if it's trying to move outside its group bounds
    if (nodeGroup) {
      const groupBounds = calculateGroupBounds(nodeGroup);
      return !isNodeInGroupBounds(newPosition, nodeData, groupBounds);
    }

    // If node is not in a group, check if it's trying to move into any group bounds
    for (const group of groupingState.groups) {
      const groupBounds = calculateGroupBounds(group);
      if (isNodeInGroupBounds(newPosition, nodeData, groupBounds)) {
        return true; // Node is trying to enter a group it doesn't belong to
      }
    }

    return false;
  };

  const createGroupBoundaryNodes = useCallback((currentNodes: Node[], groups: NodeGroup[]) => {
    // Remove existing group boundary nodes
    const nonBoundaryNodes = currentNodes.filter(node => node.type !== 'groupBoundary');
    
    // Create new group boundary nodes
    const boundaryNodes: Node[] = [];
    
    groups.forEach(group => {
      const groupNodes = nonBoundaryNodes.filter(node => {
        const nodeData = node.data as NodeData;
        return nodeData.groupId === group.id;
      });
      
      if (groupNodes.length === 0) return;

      const PADDING = 30;
      const DEFAULT_NODE_WIDTH = 120;
      const DEFAULT_NODE_HEIGHT = 80;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      groupNodes.forEach(node => {
        const nodeData = node.data as NodeData;
        const nodeWidth = nodeData.width || DEFAULT_NODE_WIDTH;
        const nodeHeight = nodeData.height || DEFAULT_NODE_HEIGHT;
        
        const nodeLeft = node.position.x;
        const nodeTop = node.position.y;
        const nodeRight = node.position.x + nodeWidth;
        const nodeBottom = node.position.y + nodeHeight;

        minX = Math.min(minX, nodeLeft);
        minY = Math.min(minY, nodeTop);
        maxX = Math.max(maxX, nodeRight);
        maxY = Math.max(maxY, nodeBottom);
      });

      const bounds = {
        x: minX - PADDING,
        y: minY - PADDING,
        width: maxX - minX + (PADDING * 2),
        height: maxY - minY + (PADDING * 2)
      };
      
      if (bounds.width > 0 && bounds.height > 0) {
        const boundaryNode: Node = {
          id: `boundary-${group.id}`,
          type: 'groupBoundary',
          position: { x: bounds.x, y: bounds.y },
          data: {
            groupId: group.id,
            groupName: group.name,
            groupColor: group.color,
            width: bounds.width,
            height: bounds.height,
          },
          draggable: false,
          selectable: false,
          zIndex: -1,
        };
        boundaryNodes.push(boundaryNode);
      }
    });
    
    return [...nonBoundaryNodes, ...boundaryNodes];
  }, []);

  // Update group boundary nodes when nodes change position
  useEffect(() => {
    if (groupingState.groups.length > 0) {
      const timer = setTimeout(() => {
        setNodes(currentNodes => createGroupBoundaryNodes(currentNodes, groupingState.groups));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.map(n => `${n.id}:${n.position.x},${n.position.y}`).join('|'), groupingState.groups, createGroupBoundaryNodes]);

  // Group mode functions
  const toggleGroupMode = () => {
    setGroupingState(prev => ({
      ...prev,
      isGroupMode: !prev.isGroupMode,
      selectedNodeIds: [] // Clear selection when toggling
    }));
    
    // Clear dialog and node selection styling when exiting group mode
    if (groupingState.isGroupMode) {
      setShowGroupDialog(false);
      setNodes(nds => nds.map(node => ({
        ...node,
        data: { ...node.data, isSelected: false }
      })));
    }
  };

  const selectNodeForGroup = useCallback((nodeId: string) => {
    if (!groupingState.isGroupMode) return;
    
    // Calculate the new selection state first
    const newSelectedNodeIds = groupingState.selectedNodeIds.includes(nodeId)
      ? groupingState.selectedNodeIds.filter(id => id !== nodeId)
      : [...groupingState.selectedNodeIds, nodeId];
    
    // Update grouping state
    setGroupingState(prev => ({
      ...prev,
      selectedNodeIds: newSelectedNodeIds
    }));
    
    // Update node visual selection using the new selection state
    setNodes(nds => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        isSelected: newSelectedNodeIds.includes(node.id)
      }
    })));
  }, [groupingState.isGroupMode, groupingState.selectedNodeIds, setNodes]);

  const createGroup = () => {
    if (!groupName.trim() || groupingState.selectedNodeIds.length === 0) {
      showSnackbar('Please enter a group name and select at least one node', 'error');
      return;
    }

    const newGroup: NodeGroup = {
      id: `group-${Date.now()}`,
      name: groupName.trim(),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
      nodeIds: [...groupingState.selectedNodeIds],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setGroupingState(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup],
      selectedNodeIds: [],
      isGroupMode: false
    }));

    // Update nodes to include group ID and create boundary nodes
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        groupId: groupingState.selectedNodeIds.includes(node.id) ? newGroup.id : node.data.groupId,
        isSelected: false
      }
    }));
    
    // Create boundary nodes with the updated group state
    const nodesWithBoundaries = createGroupBoundaryNodes(updatedNodes, [...groupingState.groups, newGroup]);
    setNodes(nodesWithBoundaries);

    setGroupName('');
    setShowGroupDialog(false);
    showSnackbar(`Group "${newGroup.name}" created with ${newGroup.nodeIds.length} nodes`, 'success');
  };

  const deleteGroup = (groupId: string) => {
    const group = groupingState.groups.find(g => g.id === groupId);
    if (!group) return;

    setGroupingState(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId)
    }));

    // Remove group ID from nodes and update boundary nodes
    const updatedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        groupId: node.data.groupId === groupId ? undefined : node.data.groupId
      }
    }));
    
    // Create boundary nodes with the updated group state
    const remainingGroups = groupingState.groups.filter(g => g.id !== groupId);
    const nodesWithBoundaries = createGroupBoundaryNodes(updatedNodes, remainingGroups);
    setNodes(nodesWithBoundaries);

    showSnackbar(`Group "${group.name}" deleted`, 'info');
  };

  const createSampleKnowledgeGraphData = async () => {
    try {
      // Create some sample functional areas and relationships
      const relationships: SpatialRelationship[] = [
        { 
          id: 'rel-1', 
          type: 'ADJACENT_TO', 
          fromId: 'weighing-area-1', 
          toId: 'granulation-1', 
          priority: 9, 
          reason: 'Material flow optimization' 
        },
        { 
          id: 'rel-2', 
          type: 'ADJACENT_TO', 
          fromId: 'granulation-1', 
          toId: 'compression-1', 
          priority: 9, 
          reason: 'Material flow optimization' 
        },
        { 
          id: 'rel-3', 
          type: 'REQUIRES_ACCESS', 
          fromId: 'analytical-lab-1', 
          toId: 'weighing-area-1', 
          priority: 7, 
          reason: 'Sample collection' 
        },
        { 
          id: 'rel-4', 
          type: 'MATERIAL_FLOW', 
          fromId: 'weighing-area-1', 
          toId: 'granulation-1', 
          priority: 9, 
          reason: 'Raw material transfer', 
          flowDirection: 'unidirectional', 
          flowType: 'raw_material' 
        },
        // Additional test relationships between same nodes
        { 
          id: 'rel-5', 
          type: 'SHARES_UTILITY', 
          fromId: 'weighing-area-1', 
          toId: 'granulation-1', 
          priority: 6, 
          reason: 'Shared HVAC system' 
        },
        { 
          id: 'rel-6', 
          type: 'PERSONNEL_FLOW', 
          fromId: 'weighing-area-1', 
          toId: 'granulation-1', 
          priority: 8, 
          reason: 'Operator movement', 
          flowDirection: 'bidirectional', 
          flowType: 'personnel' 
        },
        { 
          id: 'rel-7', 
          type: 'REQUIRES_ACCESS', 
          fromId: 'granulation-1', 
          toId: 'compression-1', 
          priority: 8, 
          reason: 'Process oversight' 
        }
      ];

      const sampleData = {
        name: 'Sample Pharmaceutical Facility',
        nodes: [
          { id: 'weighing-area-1', name: 'Weighing Area', category: 'Production', cleanroomClass: 'D', x: 100, y: 100, width: 120, height: 80 },
          { id: 'granulation-1', name: 'Granulation', category: 'Production', cleanroomClass: 'D', x: 300, y: 100, width: 150, height: 100 },
          { id: 'compression-1', name: 'Compression', category: 'Production', cleanroomClass: 'D', x: 500, y: 100, width: 140, height: 90 },
          { id: 'analytical-lab-1', name: 'Analytical Lab', category: 'Quality Control', cleanroomClass: 'C', x: 100, y: 300, width: 150, height: 120 }
        ],
        relationships
      };
      
      await apiService.createDiagram(sampleData);
      showSnackbar('Sample knowledge graph data created', 'success');
    } catch (error) {
      console.error('Error creating sample data:', error);
      showSnackbar('Failed to create sample data', 'error');
    }
  };

  const checkConnectionStatus = async () => {
    try {
      setConnectionStatus('checking');
      const healthCheck = await apiService.healthCheck();
      setConnectionStatus(healthCheck.database === 'connected' ? 'connected' : 'disconnected');
      return healthCheck.database === 'connected';
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('disconnected');
      return false;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      // Update mode configuration
      setCurrentModeConfig(modeConfigs[mode]);
      
      // First check connection status
      const isConnected = await checkConnectionStatus();
      
      try {
        if (mode === 'creation') {
          // Creation mode: Load template library
          if (isConnected) {
            const templates = await apiService.getNodeTemplates();
            setNodeTemplates(templates);
            
            // If templates are empty, try to initialize database
            if (templates.length === 0) {
              await apiService.initializeDatabase();
              const newTemplates = await apiService.getNodeTemplates();
              setNodeTemplates(newTemplates);
            }
          } else {
            loadDefaultTemplates();
          }
          
          // Clear guided mode data
          setGuidedSuggestions([]);
          
        } else {
          // Guided mode: Import knowledge graph data and templates
          if (isConnected) {
            console.log('Importing knowledge graph data for guided mode...');
            
            // Import full knowledge graph data
            const kgData = await apiService.importKnowledgeGraph();
            
            // Convert KG nodes to template format for the palette
            const kgTemplates = kgData.nodes.map(node => ({
              id: node.id,
              name: node.name,
              category: node.category as any,
              cleanroomClass: node.cleanroomClass,
              color: '#95A5A6', // Default color for KG nodes
              defaultSize: {
                width: node.width || 120,
                height: node.height || 80
              }
            }));
            
            setExistingNodes(kgTemplates);
            
            // Convert KG nodes to React Flow nodes and place them on canvas
            const flowNodes = kgData.nodes.map(node => ({
              id: node.id,
              type: 'functionalArea',
              position: {
                x: node.x || Math.random() * 500,
                y: node.y || Math.random() * 500
              },
              data: {
                label: node.name,
                category: node.category,
                cleanroomClass: node.cleanroomClass,
                color: '#95A5A6',
                name: node.name,
                width: node.width || 120,
                height: node.height || 80
              }
            }));
            
            // Convert KG relationships to React Flow edges
            const relationshipGroups = new Map<string, any[]>();
            
            // First, group relationships by node pairs to calculate indices
            kgData.relationships.forEach(rel => {
              const nodeIds = [rel.fromId, rel.toId].sort();
              const key = nodeIds.join('-');
              if (!relationshipGroups.has(key)) {
                relationshipGroups.set(key, []);
              }
              relationshipGroups.get(key)!.push(rel);
            });
            
            const flowEdges = kgData.relationships.map(rel => {
              const nodeIds = [rel.fromId, rel.toId].sort();
              const key = nodeIds.join('-');
              const groupRels = relationshipGroups.get(key)!;
              
              // Calculate relationship index based on consistent sorting
              const sortedGroupRels = [...groupRels].sort((a, b) => a.id.localeCompare(b.id));
              const relationshipIndex = sortedGroupRels.findIndex(r => r.id === rel.id);
              
              return {
                id: rel.id,
                source: rel.fromId,
                target: rel.toId,
                type: 'multiRelationship' as const,
                animated: false,
                style: {
                  stroke: getRelationshipColor(rel.type),
                  strokeWidth: 2,
                  strokeDasharray: getRelationshipDashArray(rel.type)
                },
                label: getRelationshipLabel(rel.type),
                labelShowBg: relationshipIndex > 0,
                labelBgPadding: [8, 4] as [number, number],
                labelBgBorderRadius: 4,
                labelBgStyle: {
                  fill: '#fff',
                  fillOpacity: 0.9,
                  stroke: getRelationshipColor(rel.type),
                  strokeWidth: 1
                },
                data: {
                  id: rel.id,
                  source: rel.fromId,
                  target: rel.toId,
                  type: rel.type,
                  relationshipType: rel.type,
                  priority: rel.priority,
                  reason: rel.reason,
                  doorType: rel.doorType,
                  minDistance: rel.minDistance,
                  maxDistance: rel.maxDistance,
                  flowDirection: rel.flowDirection,
                  flowType: rel.flowType,
                  relationshipIndex: relationshipIndex
                }
              }
            });
            
            // Set nodes and edges on the canvas
            setNodes(flowNodes);
            setEdges(flowEdges);
            
            console.log('Loaded knowledge graph data:');
            console.log('- Nodes:', flowNodes.length);
            console.log('- Edges:', flowEdges.length);
            console.log('- Edge relationship indices:', flowEdges.map(e => ({ id: e.id, index: e.data.relationshipIndex, type: e.data.relationshipType })));
            console.log('- Raw relationships from API:', kgData.relationships);
            console.log('- Relationship groups:', Array.from(relationshipGroups.entries()));
            
            if (kgData.nodes.length === 0) {
              showSnackbar('No data in knowledge graph - creating sample data', 'info');
              await createSampleKnowledgeGraphData();
              const newKgData = await apiService.importKnowledgeGraph();
              // Update existing nodes with the new data
              const newKgTemplates = newKgData.nodes.map(node => ({
                id: node.id,
                name: node.name,
                category: node.category as any,
                cleanroomClass: node.cleanroomClass,
                color: '#95A5A6',
                defaultSize: {
                  width: node.width || 120,
                  height: node.height || 80
                }
              }));
              setExistingNodes(newKgTemplates);
              
              // Also update the canvas with new data
              const newFlowNodes = newKgData.nodes.map(node => ({
                id: node.id,
                type: 'functionalArea',
                position: {
                  x: node.x || Math.random() * 500,
                  y: node.y || Math.random() * 500
                },
                data: {
                  label: node.name,
                  category: node.category,
                  cleanroomClass: node.cleanroomClass,
                  color: '#95A5A6',
                  name: node.name,
                  width: node.width || 120,
                  height: node.height || 80
                }
              }));
              
              // Recalculate relationship groups for new data
              const newRelationshipGroups = new Map<string, any[]>();
              newKgData.relationships.forEach(rel => {
                const nodeIds = [rel.fromId, rel.toId].sort();
                const key = nodeIds.join('-');
                if (!newRelationshipGroups.has(key)) {
                  newRelationshipGroups.set(key, []);
                }
                newRelationshipGroups.get(key)!.push(rel);
              });
              
              const newFlowEdges = newKgData.relationships.map(rel => {
                const nodeIds = [rel.fromId, rel.toId].sort();
                const key = nodeIds.join('-');
                const groupRels = newRelationshipGroups.get(key)!;
                const sortedGroupRels = [...groupRels].sort((a, b) => a.id.localeCompare(b.id));
                const relationshipIndex = sortedGroupRels.findIndex(r => r.id === rel.id);
                return {
                  id: rel.id,
                  source: rel.fromId,
                  target: rel.toId,
                  type: 'multiRelationship' as const,
                  animated: false,
                  style: {
                    stroke: getRelationshipColor(rel.type),
                    strokeWidth: 2,
                    strokeDasharray: getRelationshipDashArray(rel.type)
                  },
                  label: getRelationshipLabel(rel.type),
                  labelShowBg: relationshipIndex > 0,
                  labelBgPadding: [8, 4] as [number, number],
                  labelBgBorderRadius: 4,
                  labelBgStyle: {
                    fill: '#fff',
                    fillOpacity: 0.9,
                    stroke: getRelationshipColor(rel.type),
                    strokeWidth: 1
                  },
                  data: {
                    id: rel.id,
                    source: rel.fromId,
                    target: rel.toId,
                    type: rel.type,
                    relationshipType: rel.type,
                    priority: rel.priority,
                    reason: rel.reason,
                    doorType: rel.doorType,
                    minDistance: rel.minDistance,
                    maxDistance: rel.maxDistance,
                    flowDirection: rel.flowDirection,
                    flowType: rel.flowType,
                    relationshipIndex: relationshipIndex
                  }
                };
              });
              
              setNodes(newFlowNodes);
              setEdges(newFlowEdges);
            }
          } else {
            loadDefaultExistingNodes();
            showSnackbar('Knowledge graph disconnected - limited guided mode', 'error');
          }
          
          // Clear creation mode data
          setNodeTemplates([]);
        }
        
        const modeText = currentModeConfig.title;
        const statusText = isConnected ? 'ready' : 'ready (offline)';
        showSnackbar(`${modeText} ${statusText}`, isConnected ? 'success' : 'info');
      } catch (error) {
        console.error('Error initializing app:', error);
        setConnectionStatus('disconnected');
        showSnackbar('Database connection failed - running in offline mode', 'error');
        // Load default templates for offline mode
        if (mode === 'creation') {
          loadDefaultTemplates();
        } else {
          loadDefaultExistingNodes();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [mode, currentModeConfig.title]);
  
  const loadDefaultTemplates = () => {
    // Fallback templates for offline mode - Creation Mode
    const defaultTemplates = [
      { id: 'weighing-area', name: 'Weighing Area', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 120, height: 80 } },
      { id: 'granulation', name: 'Granulation', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 150, height: 100 } },
      { id: 'compression', name: 'Compression', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 140, height: 90 } },
      { id: 'analytical-lab', name: 'Analytical Lab', category: 'Quality Control', cleanroomClass: 'C', color: '#4ECDC4', defaultSize: { width: 150, height: 120 } },
      { id: 'raw-materials', name: 'Raw Materials Storage', category: 'Warehouse', color: '#45B7D1', defaultSize: { width: 180, height: 120 } },
      { id: 'hvac', name: 'HVAC Room', category: 'Utilities', color: '#F7DC6F', defaultSize: { width: 120, height: 100 } },
      { id: 'gowning-area', name: 'Gowning Area', category: 'Personnel', cleanroomClass: 'D', color: '#BB8FCE', defaultSize: { width: 120, height: 90 } },
      { id: 'maintenance', name: 'Maintenance Workshop', category: 'Support', color: '#85C1E9', defaultSize: { width: 140, height: 100 } }
    ];
    setNodeTemplates(defaultTemplates as any);
  };

  const loadDefaultExistingNodes = () => {
    // For Query Mode: if database is offline, show empty state
    // Query Mode should only show actual persisted nodes from knowledge graph
    console.log('Query Mode: Database offline - no existing nodes available');
    setExistingNodes([]);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const hideSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Relationship editing handlers
  const handleUpdateRelationship = useCallback((edgeId: string, updates: Partial<SpatialRelationship>) => {
    setEdges((currentEdges) => 
      currentEdges.map((edge) => {
        if (edge.id === edgeId) {
          const updatedEdge = {
            ...edge,
            data: {
              ...edge.data,
              ...updates,
              relationshipType: updates.type || (edge.data as any)?.relationshipType,
            },
            style: {
              ...edge.style,
              stroke: getRelationshipColor(updates.type || (edge.data as any)?.relationshipType || 'ADJACENT_TO'),
              strokeDasharray: getRelationshipDashArray(updates.type || (edge.data as any)?.relationshipType || 'ADJACENT_TO'),
            },
            label: getRelationshipLabel(updates.type || (edge.data as any)?.relationshipType || 'ADJACENT_TO'),
          };
          // Update selectedEdge if it's the one being updated
          if (selectedEdge && 'id' in selectedEdge && selectedEdge.id === edgeId) {
            setSelectedEdge(updatedEdge as DiagramEdge);
          }
          return updatedEdge as any;
        }
        return edge;
      })
    );
    showSnackbar('Relationship updated successfully', 'success');
  }, [setEdges, getRelationshipColor, getRelationshipDashArray, getRelationshipLabel, selectedEdge]);

  const handleDeleteRelationship = useCallback((edgeId: string) => {
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
    if (selectedEdge && 'id' in selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge(null);
      setShowInlineEditDialog(false);
    }
    showSnackbar('Relationship deleted successfully', 'success');
  }, [setEdges, selectedEdge]);



  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation(); // Prevent canvas selection
    setSelectedEdge(edge as DiagramEdge);
    setShowInlineEditDialog(true);
    setSelectedNode(null); // Clear node selection when edge is selected
  }, []);

  const handleCloseInlineEditDialog = useCallback(() => {
    setShowInlineEditDialog(false);
    setSelectedEdge(null);
  }, []);

  const handleCreateCustomNode = (nodeTemplate: Omit<NodeTemplate, 'id'>) => {
    // Generate a unique ID for the custom node
    const customNodeId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Create the new node template with ID
    const newNodeTemplate: NodeTemplate = {
      ...nodeTemplate,
      id: customNodeId,
    };
    
    // Add to the current templates list
    setNodeTemplates((prevTemplates) => [...prevTemplates, newNodeTemplate]);
    
    // Show success message
    showSnackbar(`Custom node "${nodeTemplate.name}" created successfully!`, 'success');
    
    // Optionally, you could also persist to backend if needed
    // This would require a new API endpoint to save custom templates
  };

  const isValidConnection = useCallback((connection: Connection) => {
    console.log('🔍 Validating connection:', connection);
    console.log('Source:', connection.source, 'Target:', connection.target);
    console.log('Source Handle:', connection.sourceHandle, 'Target Handle:', connection.targetHandle);
    
    // Basic validation: can't connect to self
    if (connection.source === connection.target) {
      console.log('❌ Cannot connect node to itself');
      return false;
    }
    
    // Check if source and target exist
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) {
      console.log('❌ Source or target node not found');
      return false;
    }
    
    console.log('✅ Connection is valid');
    return true;
  }, [nodes]);

  const onConnectStart = useCallback((event: any, params: any) => {
    console.log('🚀 Connection started:', params);
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    console.log('🏁 Connection ended');
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('🔗 Connection completed successfully:', params);
      console.log('Source:', params.source, 'Target:', params.target);
      console.log('Source Handle:', params.sourceHandle, 'Target Handle:', params.targetHandle);
      
      // Open relationship dialog instead of directly creating edge
      setRelationshipDialog({
        open: true,
        connection: params,
        selectedType: 'ADJACENT_TO',
        priority: 5,
        reason: 'User-defined relationship',
        doorType: '',
        minDistance: null,
        maxDistance: null,
        flowDirection: 'bidirectional',
        flowType: 'raw_material',
        animated: false
      });
    },
    []
  );

  const handleCreateRelationship = useCallback(() => {
    if (!relationshipDialog.connection) return;
    
    const params = relationshipDialog.connection;
    const { selectedType, priority, reason, doorType, minDistance, maxDistance, flowDirection, flowType, animated } = relationshipDialog;
    
    // Check if relationship already exists between these nodes
    const existingRelationships = edges.filter(edge => 
      (edge.source === params.source && edge.target === params.target) ||
      (edge.source === params.target && edge.target === params.source)
    );
    
    // Check if this specific relationship type already exists
    const existingRelationshipOfType = existingRelationships.find(edge => 
      (edge.data as any)?.relationshipType === selectedType
    );
    
    if (existingRelationshipOfType) {
      showSnackbar(`A ${getRelationshipLabel(selectedType)} relationship already exists between these nodes.`, 'error');
      return;
    }
    
    // Calculate offset for multiple relationships
    const relationshipCount = existingRelationships.length;
    
    // Create edge with unique ID for multiple relationships
    const uniqueId = `edge-${params.source}-${params.target}-${selectedType}-${Date.now()}`;
    const newEdge: Edge<DiagramEdge> = {
      id: uniqueId,
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle!,
      targetHandle: params.targetHandle!,
      type: 'multiRelationship',
      animated: animated,
      style: { 
        stroke: getRelationshipColor(selectedType), 
        strokeWidth: 2,
        strokeDasharray: getRelationshipDashArray(selectedType)
      },
      label: getRelationshipLabel(selectedType),
      labelShowBg: relationshipCount > 0,
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      labelBgStyle: {
        fill: '#fff',
        fillOpacity: 0.9,
        stroke: getRelationshipColor(selectedType),
        strokeWidth: 1
      },
      data: {
        relationshipType: selectedType,
        priority,
        reason,
        doorType: doorType || undefined,
        minDistance: minDistance || undefined,
        maxDistance: maxDistance || undefined,
        flowDirection: flowDirection || undefined,
        flowType: flowType || undefined,
        relationshipIndex: relationshipCount, // This will be updated by auto-fix
        creationDirection: 'source-to-target', // Track creation direction for arrow display
        animated: animated
      } as any
    };
    
    console.log('Creating new edge:', newEdge);
    console.log('Connection params:', params);
    console.log('Source Handle:', params.sourceHandle, 'Target Handle:', params.targetHandle);
    console.log('Existing relationships:', existingRelationships.length);
    
    setEdges((eds) => addMultiEdge(eds, newEdge));
    
    // Close dialog
    setRelationshipDialog(prev => ({ ...prev, open: false }));
  }, [relationshipDialog, setEdges, edges, showSnackbar, getRelationshipColor, getRelationshipDashArray, getRelationshipLabel]);

  const handleCancelRelationship = useCallback(() => {
    setRelationshipDialog(prev => ({ ...prev, open: false }));
  }, []);


  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return <Room />;
      case 'PROHIBITED_NEAR': return <Warning />;
      case 'REQUIRES_ACCESS': return <Speed />;
      case 'SHARES_UTILITY': return <Settings />;
      case 'MATERIAL_FLOW': return <SwapHoriz />;
      case 'PERSONNEL_FLOW': return <Person />;
      default: return <Room />;
    }
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (groupingState.isGroupMode) {
      selectNodeForGroup(node.id);
    } else {
      setSelectedNode(node);
    }
  }, [groupingState.isGroupMode, selectNodeForGroup]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const templateData = event.dataTransfer.getData('application/reactflow');

      if (templateData && reactFlowBounds && reactFlowInstance) {
        const template: NodeTemplate = JSON.parse(templateData);
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode: Node = {
          id: `node-${template.id}-${Date.now()}`,
          type: 'functionalArea',
          position,
          data: {
            label: template.name,
            category: template.category,
            cleanroomClass: template.cleanroomClass,
            color: template.color,
            name: template.name,
            width: template.defaultSize.width,
            height: template.defaultSize.height,
            icon: template.icon,
          },
          connectable: true,
        };

        console.log('🎯 Creating new node:', newNode);
        console.log('Node type:', newNode.type, 'Connectable:', newNode.connectable);
        
        setNodes((nds) => nds.concat(newNode));
        showSnackbar(`Added ${template.name} to diagram`, 'success');
      }
    },
    [reactFlowInstance, setNodes]
  );

  const handleValidate = async () => {
    if (nodes.length === 0) {
      showSnackbar('No nodes to validate', 'info');
      return;
    }

    setIsValidating(true);
    try {
      const functionalAreas = nodes.map(node => {
        const data = node.data as NodeData;
        return {
          id: node.id,
          name: data.name,
          category: data.category,
          cleanroomClass: data.cleanroomClass,
          x: node.position.x,
          y: node.position.y,
          width: data.width || 120,
          height: data.height || 80,
        };
      });

      const relationships = edges.map(edge => {
        const edgeData = edge.data as any;
        return {
          id: edge.id,
          type: (edgeData?.relationshipType || 'ADJACENT_TO') as any,
          fromId: edge.source,
          toId: edge.target,
          priority: edgeData?.priority || 5,
          reason: edgeData?.reason || 'User-defined relationship',
          doorType: edgeData?.doorType,
          minDistance: edgeData?.minDistance,
          maxDistance: edgeData?.maxDistance,
          flowDirection: edgeData?.flowDirection,
          flowType: edgeData?.flowType,
        };
      });

      const result = await apiService.validateDiagram(functionalAreas, relationships);
      setValidationResult(result);
      
      const errorCount = result.violations.filter(v => v.type === 'ERROR').length;
      const warningCount = result.violations.filter(v => v.type === 'WARNING').length;
      
      if (result.isValid) {
        showSnackbar('Diagram validation passed!', 'success');
      } else {
        showSnackbar(`Validation found ${errorCount} errors and ${warningCount} warnings`, 'error');
      }
    } catch (error) {
      console.error('Error validating diagram:', error);
      showSnackbar('Validation service unavailable - working in offline mode', 'error');
      // Set a basic validation result for offline mode
      setValidationResult({
        isValid: true,
        violations: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (nodes.length === 0) {
      showSnackbar('No diagram to save', 'info');
      return;
    }

    setLoading(true);
    
    const functionalAreas = nodes
      .filter(node => node.type === 'functionalArea') // Only include actual functional area nodes, not group boundaries
      .map(node => {
        const data = node.data as NodeData;
        return {
          id: node.id,
          name: data.name,
          category: data.category,
          cleanroomClass: data.cleanroomClass,
          x: node.position.x,
          y: node.position.y,
          width: data.width || 120,
          height: data.height || 80,
        };
      });

    const relationships = edges.map(edge => {
      const edgeData = edge.data as any;
      return {
        id: edge.id,
        type: (edgeData?.relationshipType || 'ADJACENT_TO') as any,
        fromId: edge.source,
        toId: edge.target,
        priority: edgeData?.priority || 5,
        reason: edgeData?.reason || 'User-defined relationship',
        doorType: edgeData?.doorType,
        minDistance: edgeData?.minDistance,
        maxDistance: edgeData?.maxDistance,
        flowDirection: edgeData?.flowDirection,
        flowType: edgeData?.flowType,
      };
    });

    const diagramData = {
      name: `Pharmaceutical Facility - ${currentModeConfig.title} - ${new Date().toLocaleDateString()}`,
      nodes: functionalAreas,
      relationships,
    };

    try {
      // Save diagram only - no separate knowledge graph persistence
      await apiService.createDiagram(diagramData);
      showSnackbar('Diagram saved successfully', 'success');
    } catch (error) {
      console.error('Error saving diagram:', error);
      showSnackbar('Save service unavailable - diagram stored locally', 'error');
      // Store locally in localStorage as fallback
      localStorage.setItem(`pharma-diagram-${mode}`, JSON.stringify(diagramData));
    } finally {
      setLoading(false);
    }
  };

  const startValidationMode = () => {
    setIsValidating(true);
    handleValidate();
  };

  const stopValidationMode = () => {
    setIsValidating(false);
    setValidationResult(null);
  };

  // Handle node changes with group boundary constraints
  const handleNodeChange = useCallback((changes: any) => {
    // Filter out position changes that violate group boundaries
    const filteredChanges = changes.filter((change: any) => {
      if (change.type === 'position' && change.position) {
        const violation = checkGroupBoundaryViolation(change.id, change.position);
        if (violation) {
          showSnackbar('Cannot move node outside group boundary or into another group', 'error');
          return false;
        }
      }
      return true;
    });

    // Apply the filtered changes
    onNodesChange(filteredChanges);
    
    if (mode === 'guided') {
      // Get guided suggestions based on current nodes
      const getGuidedSuggestions = async (targetCategory?: string) => {
        if (mode !== 'guided' || !connectionStatus || connectionStatus !== 'connected') {
          return;
        }

        const currentNodes = nodes.map(node => {
          const data = node.data as NodeData;
          return {
            id: node.id,
            name: data.name,
            category: data.category,
          };
        });

        if (currentNodes.length === 0) {
          setGuidedSuggestions([]);
          return;
        }

        try {
          const result = await apiService.getGuidedSuggestions(
            currentNodes,
            targetCategory || 'Production'
          );
          setGuidedSuggestions(result.suggestions);
        } catch (error) {
          console.error('Error getting guided suggestions:', error);
        }
      };

      // Debounce suggestions to avoid too many API calls
      setTimeout(() => getGuidedSuggestions(), 500);
    }
  }, [mode, onNodesChange, nodes, connectionStatus, checkGroupBoundaryViolation]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading Design Copilot...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="static" sx={{ zIndex: 1000 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Pharmaceutical Facility Design Copilot
          </Typography>
          
          <Chip
            icon={
              connectionStatus === 'connected' ? <Wifi /> : 
              connectionStatus === 'checking' ? <Sync className="rotating" /> : 
              <WifiOff />
            }
            label={
              connectionStatus === 'connected' ? 'Knowledge Graph Connected' :
              connectionStatus === 'checking' ? 'Checking Connection' :
              'Knowledge Graph Offline'
            }
            color={
              connectionStatus === 'connected' ? 'success' :
              connectionStatus === 'checking' ? 'default' :
              'error'
            }
            sx={{ 
              mr: 2, 
              color: 'white', 
              '& .MuiChip-icon': { color: 'white' },
              '& .rotating': {
                animation: 'spin 1s linear infinite'
              }
            }}
            onClick={checkConnectionStatus}
          />
          
          <Chip
            icon={mode === 'creation' ? <Edit /> : <Search />}
            label={currentModeConfig.title}
            color={mode === 'creation' ? 'secondary' : 'primary'}
            sx={{ mr: 2, color: 'white', '& .MuiChip-icon': { color: 'white' } }}
          />
          
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, newMode) => newMode && setMode(newMode)}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="creation" aria-label="creation mode">
              <Edit sx={{ mr: 1 }} />
              Creation
            </ToggleButton>
            <ToggleButton value="guided" aria-label="guided mode">
              <Search sx={{ mr: 1 }} />
              Guided
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            color="inherit"
            startIcon={groupingState.isGroupMode ? <Cancel /> : <GroupWork />}
            onClick={toggleGroupMode}
            disabled={nodes.length === 0}
            variant={groupingState.isGroupMode ? 'outlined' : 'text'}
          >
            {groupingState.isGroupMode ? 'Exit Group Mode' : 'Group Nodes'}
          </Button>
          
          {groupingState.isGroupMode && groupingState.selectedNodeIds.length > 0 && (
            <Button
              color="inherit"
              variant="contained"
              onClick={() => setShowGroupDialog(true)}
              sx={{ ml: 1 }}
            >
              Create Group ({groupingState.selectedNodeIds.length})
            </Button>
          )}
          
          <Button
            color="inherit"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={loading || nodes.length === 0}
          >
            {currentModeConfig.primaryAction}
          </Button>
          <Button
            color="inherit"
            startIcon={isValidating ? <Stop /> : <PlayArrow />}
            onClick={isValidating ? stopValidationMode : startValidationMode}
            disabled={nodes.length === 0}
          >
            {isValidating ? 'Stop Validation' : 'Validate'}
          </Button>
          
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 280 }}>
          <NodePalette 
            templates={mode === 'creation' ? nodeTemplates : existingNodes} 
            mode={mode}
            onCreateCustomNode={handleCreateCustomNode}
          />
          <RelationshipLegend />
        </Box>
        
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlowProvider>
            <div
              ref={reactFlowWrapper}
              style={{ width: '100%', height: '100%' }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                defaultEdgeOptions={{ type: 'multiRelationship' }}
                onNodesChange={handleNodeChange}
                onEdgesChange={onEdgesChange}
                onNodesDelete={onNodesDelete}
                onEdgesDelete={onEdgesDelete}
                onConnect={onConnect}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                isValidConnection={isValidConnection}
                onNodeClick={onNodeClick}
                onEdgeClick={handleEdgeClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                deleteKeyCode="Delete"
                multiSelectionKeyCode="Meta"
                connectOnClick={false}
                connectionMode={ConnectionMode.Loose}
                connectionLineType={ConnectionLineType.Straight}
                connectionLineStyle={{ stroke: '#1976d2', strokeWidth: 3 }}
                fitView
                snapToGrid
                snapGrid={[20, 20]}
              >
                <Background color="#f0f0f0" gap={20} />
                <Controls />
                <MiniMap />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </Box>

        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
          <PropertyPanel 
            selectedNode={selectedNode} 
            mode={mode}
            guidedSuggestions={guidedSuggestions}
            groups={groupingState.groups}
            onUpdateNode={(updatedNode) => {
              setNodes((nds) =>
                nds.map((node) => (node.id === updatedNode.id ? updatedNode : node))
              );
            }}
            onDeleteNode={handleDeleteNode}
          />
          
          {/* Debug Panel for Relationships */}
          {edges.length > 0 && (
            <Box sx={{ p: 2, mt: 1, border: '1px solid #ccc', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Relationships ({edges.length})</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Click on any relationship line to edit it
              </Typography>
              <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                {edges.map((edge, index) => (
                  <Typography key={edge.id} variant="caption" display="block" sx={{ fontSize: '10px' }}>
                    {index + 1}. {edge.id}: {(edge.data as any)?.relationshipType || 'N/A'} (idx: {(edge.data as any)?.relationshipIndex ?? 'N/A'})
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
          
          {validationResult && (
            <ValidationPanel 
              validationResult={validationResult}
              onViolationClick={(violation) => {
                // Highlight nodes involved in violation
                setNodes((nds) =>
                  nds.map((node) => ({
                    ...node,
                    data: {
                      ...node.data,
                      highlighted: violation.nodeIds.includes(node.id),
                    },
                  }))
                );
              }}
            />
          )}
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={hideSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Group Creation Dialog */}
      <Dialog 
        open={showGroupDialog} 
        onClose={() => setShowGroupDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Node Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Selected Nodes ({groupingState.selectedNodeIds.length}):
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
            <List dense>
              {groupingState.selectedNodeIds.map(nodeId => {
                const node = nodes.find(n => n.id === nodeId);
                return (
                  <ListItem key={nodeId}>
                    <ListItemText 
                      primary={node?.data?.name || nodeId}
                      secondary={node?.data?.category}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGroupDialog(false)}>
            Cancel
          </Button>
          <Button onClick={createGroup} variant="contained" disabled={!groupName.trim()}>
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Existing Groups Management */}
      {groupingState.groups.length > 0 && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 20, 
            left: 20, 
            width: 300, 
            maxHeight: 300, 
            overflow: 'auto',
            zIndex: 1000
          }}
        >
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            Node Groups ({groupingState.groups.length})
          </Typography>
          <List>
            {groupingState.groups.map(group => (
              <ListItem 
                key={group.id}
                secondaryAction={
                  <IconButton 
                    edge="end" 
                    onClick={() => deleteGroup(group.id)}
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={group.name}
                  secondary={`${group.nodeIds.length} nodes`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Relationship Creation Dialog */}
      <Dialog
        open={relationshipDialog.open}
        onClose={handleCancelRelationship}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Create Relationship
          {relationshipDialog.connection && (
            <Typography variant="caption" color="text.secondary" display="block">
              Between {nodes.find(n => n.id === relationshipDialog.connection?.source)?.data.name} and {nodes.find(n => n.id === relationshipDialog.connection?.target)?.data.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {relationshipDialog.connection && (() => {
              const existingRels = edges.filter(edge => 
                (edge.source === relationshipDialog.connection?.source && edge.target === relationshipDialog.connection?.target) ||
                (edge.source === relationshipDialog.connection?.target && edge.target === relationshipDialog.connection?.source)
              );
              
              if (existingRels.length > 0) {
                return (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Existing relationships between these nodes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {existingRels.map(edge => (
                        <Chip
                          key={edge.id}
                          label={getRelationshipLabel((edge.data as any)?.relationshipType || 'ADJACENT_TO')}
                          size="small"
                          sx={{
                            backgroundColor: getRelationshipColor((edge.data as any)?.relationshipType || 'ADJACENT_TO'),
                            color: 'white'
                          }}
                        />
                      ))}
                    </Box>
                  </Alert>
                );
              }
              return null;
            })()}
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Relationship Type</InputLabel>
              <Select
                value={relationshipDialog.selectedType}
                label="Relationship Type"
                onChange={(e) => setRelationshipDialog(prev => ({ ...prev, selectedType: e.target.value }))}
              >
                <MenuItem value="ADJACENT_TO">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('ADJACENT_TO')}
                    Adjacent To
                  </Box>
                </MenuItem>
                <MenuItem value="REQUIRES_ACCESS">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('REQUIRES_ACCESS')}
                    Requires Access
                  </Box>
                </MenuItem>
                <MenuItem value="PROHIBITED_NEAR">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('PROHIBITED_NEAR')}
                    Prohibited Near
                  </Box>
                </MenuItem>
                <MenuItem value="SHARES_UTILITY">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('SHARES_UTILITY')}
                    Shares Utility
                  </Box>
                </MenuItem>
                <MenuItem value="MATERIAL_FLOW">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('MATERIAL_FLOW')}
                    Material Flow
                  </Box>
                </MenuItem>
                <MenuItem value="PERSONNEL_FLOW">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getRelationshipIcon('PERSONNEL_FLOW')}
                    Personnel Flow
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Priority (1-10)"
              type="number"
              value={relationshipDialog.priority}
              onChange={(e) => setRelationshipDialog(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
              margin="normal"
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
            />

            <TextField
              fullWidth
              label="Reason"
              value={relationshipDialog.reason}
              onChange={(e) => setRelationshipDialog(prev => ({ ...prev, reason: e.target.value }))}
              margin="normal"
              placeholder="Describe the reason for this relationship"
            />

            {relationshipDialog.selectedType === 'ADJACENT_TO' && (
              <TextField
                fullWidth
                label="Door Type"
                value={relationshipDialog.doorType}
                onChange={(e) => setRelationshipDialog(prev => ({ ...prev, doorType: e.target.value }))}
                margin="normal"
                placeholder="e.g., airlock, pass-through, standard"
              />
            )}

            {relationshipDialog.selectedType === 'PROHIBITED_NEAR' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Min Distance (m)"
                  type="number"
                  value={relationshipDialog.minDistance || ''}
                  onChange={(e) => setRelationshipDialog(prev => ({ ...prev, minDistance: parseInt(e.target.value) || null }))}
                  margin="normal"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Max Distance (m)"
                  type="number"
                  value={relationshipDialog.maxDistance || ''}
                  onChange={(e) => setRelationshipDialog(prev => ({ ...prev, maxDistance: parseInt(e.target.value) || null }))}
                  margin="normal"
                  sx={{ flex: 1 }}
                />
              </Box>
            )}

            {(relationshipDialog.selectedType === 'MATERIAL_FLOW' || relationshipDialog.selectedType === 'PERSONNEL_FLOW') && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Flow Direction</InputLabel>
                  <Select
                    value={relationshipDialog.flowDirection}
                    label="Flow Direction"
                    onChange={(e) => setRelationshipDialog(prev => ({ ...prev, flowDirection: e.target.value }))}
                  >
                    <MenuItem value="bidirectional">Bidirectional</MenuItem>
                    <MenuItem value="unidirectional">Unidirectional</MenuItem>
                  </Select>
                </FormControl>

                {relationshipDialog.selectedType === 'MATERIAL_FLOW' && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Flow Type</InputLabel>
                    <Select
                      value={relationshipDialog.flowType}
                      label="Flow Type"
                      onChange={(e) => setRelationshipDialog(prev => ({ ...prev, flowType: e.target.value }))}
                    >
                      <MenuItem value="raw_material">Raw Material</MenuItem>
                      <MenuItem value="finished_product">Finished Product</MenuItem>
                      <MenuItem value="waste">Waste</MenuItem>
                      <MenuItem value="equipment">Equipment</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {relationshipDialog.selectedType === 'PERSONNEL_FLOW' && (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Personnel Type</InputLabel>
                    <Select
                      value={relationshipDialog.flowType}
                      label="Personnel Type"
                      onChange={(e) => setRelationshipDialog(prev => ({ ...prev, flowType: e.target.value }))}
                    >
                      <MenuItem value="personnel">General Personnel</MenuItem>
                      <MenuItem value="equipment">Equipment Movement</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </>
            )}
            
            {/* Animation option */}
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={relationshipDialog.animated}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRelationshipDialog(prev => ({ ...prev, animated: e.target.checked }))}
                  />
                }
                label="Enable Animation"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelRelationship}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRelationship}
            variant="contained"
            disabled={!relationshipDialog.reason.trim()}
          >
            Create Relationship
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inline Relationship Edit Dialog */}
      <InlineRelationshipEditDialog
        open={showInlineEditDialog}
        edge={selectedEdge}
        nodes={nodes}
        onClose={handleCloseInlineEditDialog}
        onUpdate={handleUpdateRelationship}
        onDelete={handleDeleteRelationship}
      />
    </Box>
  );
};

export default DiagramEditor;