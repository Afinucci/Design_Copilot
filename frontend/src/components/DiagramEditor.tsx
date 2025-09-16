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
import { Save, PlayArrow, Stop, Edit, Search, Wifi, WifiOff, Sync, GroupWork, Cancel, Delete, Room, Warning, Speed, Settings, SwapHoriz, Person, Storage } from '@mui/icons-material';
import NodePalette from './NodePalette';
import SnapCanvas from './SnapCanvas';
import ConstraintFeedback from './ConstraintFeedback';
import AdjacencyFeedback from './AdjacencyFeedback';
import PropertyPanel from './PropertyPanel';
import ValidationPanel from './ValidationPanel';
import CustomNode from './CustomNode';
import CustomShapeNode from './CustomShapeNode';
import ConstraintValidationFeedback from './ConstraintValidationFeedback';
import ShapeDrawingToolbar from './ShapeDrawingToolbar';
import ShapeDrawingCanvas from './ShapeDrawingCanvas';
import GroupBoundaryNode from './GroupBoundaryNode';
import MultiRelationshipEdge from './MultiRelationshipEdge';
import RelationshipLegend from './RelationshipLegend';
import InlineRelationshipEditDialog from './InlineRelationshipEditDialog';
import { addMultiEdge } from '../utils/edgeUtils';
import { getAutoConnectors, getConnectorMetadata } from '../services/connectorLogic';
import { calculateBoundingBox } from '../utils/shapeCollision';
import { DiagramEdge, NodeTemplate, ValidationResult, NodeData, AppMode, GuidedSuggestion, ModeConfig, NodeGroup, GroupingState, SpatialRelationship, ShapeType, CustomShapeData, ShapePoint } from '../types';
import { apiService } from '../services/api';
import { Node } from 'reactflow';
import Neo4jNodeAssignment from './Neo4jNodeAssignment';
import KnowledgeGraphPanel from './KnowledgeGraphPanel';
import Neo4jOverview from './Neo4jOverview';
import useKnowledgeGraph from '../hooks/useKnowledgeGraph';
import { useEdgeValidation } from '../hooks/useEdgeValidation';
import { useAdjacencyConstraints } from '../hooks/useAdjacencyConstraints';
import { usePhysicalConstraints } from '../hooks/usePhysicalConstraints';
import { EdgeProximityIndicator } from './EdgeProximityIndicator';
import { PhysicalConstraintOverlay } from './PhysicalConstraintOverlay';

// Helper functions for shape geometry calculations
const calculateShapeGeometry = (shapePoints: ShapePoint[], position: { x: number; y: number }) => {
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

  // Convert relative shape points to absolute coordinates
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

const getNearbyShapes = (currentNode: Node, allNodes: Node[], maxDistance: number = 300) => {
  return allNodes.filter(node => {
    if (node.id === currentNode.id || node.type !== 'customShape') return false;
    
    const distance = Math.sqrt(
      Math.pow(node.position.x - currentNode.position.x, 2) + 
      Math.pow(node.position.y - currentNode.position.y, 2)
    );
    
    return distance <= maxDistance;
  });
};

// Define node types within component to access handlers
const createNodeTypes = (
  onShapeEdit?: (nodeId: string) => void, 
  onShapeComplete?: (nodeId: string, points: ShapePoint[]) => void,
  onShapeResize?: (nodeId: string, points: ShapePoint[], width: number, height: number) => void
) => ({
  functionalArea: CustomNode,
  customShape: React.memo((props: any) => {
    // Create a stable key that changes when important data changes
    const dataKey = React.useMemo(() => {
      const data = props.data as CustomShapeData;
      return [
        data.assignedNodeId || '',
        data.assignedNodeName || '',
        data.hasInheritedProperties || false,
        data.showAssignmentDialog || false,
        data.lastAssignmentUpdate instanceof Date ? data.lastAssignmentUpdate.getTime() : data.lastAssignmentUpdate || 0,
        data.label || '',
        data.category || ''
      ].join('|');
    }, [props.data]);

    console.log(`🔄 DiagramEditor: Re-rendering CustomShapeNode ${props.id} with key: ${dataKey}`);

    return (
      <CustomShapeNode 
        key={`${props.id}-${dataKey}`}
        {...props} 
        onShapeEdit={onShapeEdit}
        onShapeComplete={onShapeComplete}
        onShapeResize={onShapeResize}
      />
    );
  }),
  groupBoundary: GroupBoundaryNode,
});

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

  const getCategoryColor = useCallback((category: string) => {
    switch (category) {
      case 'Production': return '#FF6B6B';
      case 'Quality Control': return '#4ECDC4';
      case 'Warehouse': return '#45B7D1';
      case 'Utilities': return '#F7DC6F';
      case 'Personnel': return '#BB8FCE';
      case 'Support': return '#85C1E9';
      default: return '#95A5A6';
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
  const [isNeo4jOverviewOpen, setIsNeo4jOverviewOpen] = useState(false);
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
  
  // Enhanced Guided mode state
  const [showSnapGuides, setShowSnapGuides] = useState(true);
  const [showConstraintFeedback, setShowConstraintFeedback] = useState(true);
  const [viewMode, setViewMode] = useState<'bubble' | 'logic'>('bubble');
  

  // Knowledge Graph integration
  const knowledgeGraph = useKnowledgeGraph();
  
  // Edge validation for shape superimposition
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Physical constraint enforcement state
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [constraintFeedback, setConstraintFeedback] = useState<{
    isBlocked: boolean;
    blockedBy: string[];
    feedbackMessage?: string;
  }>({ isBlocked: false, blockedBy: [] });
  
  // Stable callback for validation changes
  const handleValidationChange = useCallback((results: any[]) => {
    // You can add additional logic here when validation changes
    console.log('Edge validation results:', results);
  }, []);
  
  const edgeValidation = useEdgeValidation({
    nodes,
    edges,
    draggedNodeId,
    proximityThreshold: 20,
    onValidationChange: handleValidationChange
  });

  // Adjacency constraints hook for guided mode
  const adjacencyConstraints = useAdjacencyConstraints(nodes, {
    mode: mode === 'guided' ? 'guided' : 'creation',
    touchTolerance: 2,
    enableRealTimeValidation: mode === 'guided',
    debounceMs: 150
  });

  // Physical constraints hook for enforcing overlap prevention
  const physicalConstraints = usePhysicalConstraints(nodes, {
    enabled: mode === 'guided',
    mode: mode === 'guided' ? 'guided' : 'creation',
    touchTolerance: 2,
    cacheExpiryMs: 30000
  });
  
  // Grouping state
  const [groupingState, setGroupingState] = useState<GroupingState>({
    isGroupMode: false,
    selectedNodeIds: [],
    groups: []
  });
  const [groupName, setGroupName] = useState<string>('');
  const [showGroupDialog, setShowGroupDialog] = useState<boolean>(false);
  
  // Shape drawing state for guided mode
  const [activeShapeTool, setActiveShapeTool] = useState<ShapeType | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(false);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [shapeHistory, setShapeHistory] = useState<any[]>([]);
  const [shapeHistoryIndex, setShapeHistoryIndex] = useState(-1);
  
  // Neo4j assignment dialog state
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [nodeToAssign, setNodeToAssign] = useState<Node | null>(null);
  
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
          // Guided mode: Load node list for palette but start with empty canvas
          if (isConnected) {
            console.log('Loading nodes for guided mode palette...');
            
            // Import knowledge graph data for palette only
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
            
            // Start with empty canvas - nodes will be added when user selects them from palette
            setNodes([]);
            setEdges([]);
            
            console.log('Loaded knowledge graph nodes for palette:', kgTemplates.length);
            
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

  // Handle node materialization from knowledge graph
  const handleNodeMaterialize = useCallback((nodeData: any) => {
    console.log('🔄 DiagramEditor: Materializing node from knowledge graph:', nodeData);
    
    // Check if node already exists in diagram
    const existingNode = nodes.find(n => n.id === nodeData.id);
    if (existingNode) {
      showSnackbar(`${nodeData.name} is already in the diagram`, 'info');
      return;
    }

    // Create new ReactFlow node
    const newNode = {
      id: nodeData.id,
      type: 'functionalArea' as const,
      position: nodeData.position || { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 },
      data: {
        label: nodeData.name,
        category: nodeData.category,
        cleanroomClass: nodeData.cleanroomGrade,
        color: getCategoryColor(nodeData.category),
        name: nodeData.name,
        width: 120,
        height: 80
      }
    };

    // Add node to diagram
    setNodes(prev => [...prev, newNode]);
    showSnackbar(`Added ${nodeData.name} to diagram`, 'success');
    
    // Optionally, set as selected node
    setSelectedNode(newNode);
  }, [nodes, setNodes, getCategoryColor, showSnackbar]);

  // Shape drawing handlers
  const handleShapeToolChange = useCallback((tool: ShapeType | null) => {
    setActiveShapeTool(tool);
    if (!tool) {
      setIsDrawingShape(false);
    }
  }, []);

  const handleShapeComplete = useCallback((shapeData: Partial<CustomShapeData>) => {
    // Generate unique ID for the new shape
    const shapeId = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    const rawPoints = (shapeData.shapePoints || []) as ShapePoint[];
    const width = shapeData.width || 120;
    const height = shapeData.height || 80;

    // Compute bounding box of drawn points (canvas coordinates)
    let minX = 0, minY = 0;
    if (rawPoints.length > 0) {
      minX = Math.min(...rawPoints.map(p => p.x));
      minY = Math.min(...rawPoints.map(p => p.y));
    }

    // Normalize points to node-local coordinates starting at (0,0)
    const normalizedPoints: ShapePoint[] = rawPoints.map(p => ({ x: p.x - minX, y: p.y - minY }));

    // Create the new custom shape node positioned at the drawn location
    const newNode: Node = {
      id: shapeId,
      type: 'customShape',
      position: { x: minX, y: minY },
      data: {
        label: 'New Shape',
        category: 'None',
        color: getCategoryColor('None'),
        name: 'New Shape',
        width,
        height,
        shapeType: shapeData.shapeType || 'rectangle',
        shapePoints: normalizedPoints,
        isEditing: false,
        hasInheritedProperties: false,
        // In guided mode, automatically show assignment dialog
        showAssignmentDialog: mode === 'guided',
      } as CustomShapeData,
    };

    // Add to nodes
    setNodes(prev => [...prev, newNode]);

    // Clear active tool
    setActiveShapeTool(null);
    setIsDrawingShape(false);

    // Select the new shape
    setSelectedNode(newNode);

    if (mode === 'guided') {
      // Open the assignment dialog for guided mode
      setNodeToAssign(newNode);
      setAssignmentDialogOpen(true);
      showSnackbar('Shape created! Please assign it to a Neo4j node to enable intelligent connections.', 'info');
    } else {
      showSnackbar('Shape created successfully! Switch to guided mode to assign Neo4j properties.', 'success');
    }
  }, [setNodes, getCategoryColor, showSnackbar, mode]);

  const handleNeo4jAssignment = useCallback((assignedNodeId: string, nodeData: any) => {
    console.log('🎯 DiagramEditor: Neo4j assignment from dialog:', {
      nodeToAssign: nodeToAssign?.id,
      assignedNodeId,
      nodeData
    });
    
    if (nodeToAssign) {
      // Update the node with the assigned Neo4j properties
      const updatedNode = {
        ...nodeToAssign,
        data: {
          ...nodeToAssign.data,
          ...nodeData,
          assignedNodeId,
          // Prefer explicit assigned name from dialog; fall back to label; never fall back to id for display
          assignedNodeName: (nodeData as any).assignedNodeName || (nodeData as any).label || (nodeToAssign.data as any).label,
          assignedNodeCategory: nodeData.category,
          hasInheritedProperties: true,
          showAssignmentDialog: false,
          lastAssignmentUpdate: Date.now(),
          // Ensure node label shows human-friendly name
          label: (nodeData as any).assignedNodeName || (nodeData as any).label || nodeToAssign.data.label,
          category: nodeData.category || nodeToAssign.data.category,
          color: getCategoryColor(nodeData.category || 'None'),
        } as CustomShapeData,
      };
      
      // Update the node in the canvas
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeToAssign.id ? updatedNode : node))
      );
      
      // Set as selected node
      setSelectedNode(updatedNode);
      
      // Close the dialog
      setAssignmentDialogOpen(false);
      setNodeToAssign(null);
      
      // Open knowledge graph panel after assignment in guided mode
      if (mode === 'guided' && connectionStatus === 'connected') {
        console.log('🎯 DiagramEditor: Opening knowledge graph panel after assignment');
        
        // Open knowledge graph panel for the assigned node
        setTimeout(() => {
          // Use the assigned Neo4j node NAME so backend can match by name variations
          const display = (nodeData as any).assignedNodeName || (nodeData as any).label || 'Selected Node';
          const centerKey = display;
          knowledgeGraph.openPanel(centerKey, display);
        }, 100);
      }
      
      showSnackbar(`Shape assigned to ${nodeData.name}. View related nodes in knowledge graph.`, 'success');
    }
  }, [nodeToAssign, setNodes, getCategoryColor, mode, connectionStatus, knowledgeGraph.openPanel, showSnackbar]);

  const handleShapeEdit = useCallback((nodeId: string) => {
    // Handle both edit mode and resize mode
    const isResizeMode = nodeId.includes(':resize');
    const actualNodeId = isResizeMode ? nodeId.replace(':resize', '') : nodeId;
    
    setNodes(prev => prev.map(node => {
      if (node.id === actualNodeId && node.type === 'customShape') {
        const currentData = node.data as CustomShapeData;
        
        if (isResizeMode) {
          // Toggle resize mode
          return {
            ...node,
            data: {
              ...currentData,
              isResizing: !currentData.isResizing,
              isEditing: false // Ensure edit mode is off when resizing
            }
          };
        } else {
          // Toggle edit mode
          return {
            ...node,
            data: {
              ...currentData,
              isEditing: !currentData.isEditing,
              isResizing: false // Ensure resize mode is off when editing
            }
          };
        }
      }
      return node;
    }));
  }, [setNodes]);

  const handleShapeEditComplete = useCallback((nodeId: string, newPoints: ShapePoint[]) => {
    // Update shape points and exit edit mode
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId && node.type === 'customShape') {
        // Calculate new dimensions
        const minX = Math.min(...newPoints.map(p => p.x));
        const maxX = Math.max(...newPoints.map(p => p.x));
        const minY = Math.min(...newPoints.map(p => p.y));
        const maxY = Math.max(...newPoints.map(p => p.y));
        
        return {
          ...node,
          data: {
            ...node.data,
            shapePoints: newPoints,
            width: maxX - minX,
            height: maxY - minY,
            isEditing: false
          }
        };
      }
      return node;
    }));
    
    showSnackbar('Shape updated successfully!', 'success');
  }, [setNodes, showSnackbar]);

  const handleShapeResize = useCallback((nodeId: string, newPoints: ShapePoint[], newWidth: number, newHeight: number) => {
    // Update shape with new dimensions and points, then exit resize mode
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId && node.type === 'customShape') {
        return {
          ...node,
          data: {
            ...node.data,
            shapePoints: newPoints,
            width: newWidth,
            height: newHeight,
            isResizing: false
          }
        };
      }
      return node;
    }));
    
    showSnackbar('Shape resized successfully!', 'success');
  }, [setNodes, showSnackbar]);

  const handleToggleGrid = useCallback(() => {
    setIsGridVisible(prev => !prev);
  }, []);

  const handleToggleSnap = useCallback(() => {
    setIsSnapEnabled(prev => !prev);
  }, []);

  const handleUndoShape = useCallback(() => {
    if (shapeHistoryIndex > 0) {
      setShapeHistoryIndex(prev => prev - 1);
      // TODO: Implement actual undo logic
      showSnackbar('Undo not yet implemented', 'info');
    }
  }, [shapeHistoryIndex, showSnackbar]);

  const handleRedoShape = useCallback(() => {
    if (shapeHistoryIndex < shapeHistory.length - 1) {
      setShapeHistoryIndex(prev => prev + 1);
      // TODO: Implement actual redo logic
      showSnackbar('Redo not yet implemented', 'info');
    }
  }, [shapeHistoryIndex, shapeHistory.length, showSnackbar]);

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

  // Synchronous connection validation (required by React Flow)
  const isValidConnection = useCallback((connection: Connection) => {
    console.log('🔍 [Stage 1] Basic connection validation:', connection);
    
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

    // In creation mode, allow all basic connections
    if (mode === 'creation') {
      console.log('✅ Creation mode: Basic validation passed');
      return true;
    }

    // In guided mode, validate both prohibited and required adjacency relationships
    if (mode === 'guided') {
      const getEffectiveNodeInfo = (node: Node) => {
        if (node.type === 'customShape') {
          const customData = node.data as CustomShapeData;
          return {
            id: customData.assignedNodeId || node.id,
            name: customData.assignedNodeName || node.data?.name,
            category: customData.assignedNodeCategory || node.data?.category,
            inheritedRelationships: customData.inheritedRelationships || [],
            hasAssignment: !!customData.assignedNodeId
          };
        }
        return {
          id: node.id,
          name: node.data?.name,
          category: node.data?.category,
          inheritedRelationships: [],
          hasAssignment: false
        };
      };

      const sourceInfo = getEffectiveNodeInfo(sourceNode);
      const targetInfo = getEffectiveNodeInfo(targetNode);

      console.log('🔍 Validating connection in guided mode:', {
        source: sourceInfo,
        target: targetInfo
      });

      // For assigned custom shapes, validate specific adjacency requirements
      if (sourceInfo.hasAssignment && targetInfo.hasAssignment) {
        let hasAdjacency = false;
        let isProhibited = false;

        // Check cached inherited relationships
        if (sourceNode.type === 'customShape') {
          const sourceData = sourceNode.data as CustomShapeData;
          if (sourceData.hasInheritedProperties && sourceData.inheritedRelationships) {
            // Check for prohibited connections
            const prohibitedConnections = sourceData.inheritedRelationships.filter(
              (rel: any) => rel.type === 'PROHIBITED_NEAR'
            );
            
            for (const prohibition of prohibitedConnections) {
              const isThisProhibited = 
                targetInfo.category === prohibition.targetCategory ||
                targetInfo.name === prohibition.targetNodeName ||
                targetInfo.id === prohibition.targetNodeId;
                
              if (isThisProhibited) {
                console.log('❌ Connection blocked by cached prohibition:', prohibition.reason);
                showSnackbar(`Connection not allowed: ${prohibition.reason || 'Prohibited by pharmaceutical design rules'}`, 'error');
                return false;
              }
            }

            // Check for adjacency relationships
            const adjacencyConnections = sourceData.inheritedRelationships.filter(
              (rel: any) => rel.type === 'ADJACENT_TO'
            );

            for (const adjacency of adjacencyConnections) {
              const isAdjacent = 
                targetInfo.category === adjacency.targetCategory ||
                targetInfo.name === adjacency.targetNodeName ||
                targetInfo.id === adjacency.targetNodeId;
                
              if (isAdjacent) {
                hasAdjacency = true;
                console.log('✅ Found cached adjacency relationship:', adjacency);
                break;
              }
            }
          }
        }

        // If no cached adjacency found, this connection is not allowed in guided mode
        if (!hasAdjacency && !isProhibited) {
          console.log('❌ No adjacency relationship found between assigned nodes in guided mode');
          showSnackbar('Connection not allowed: These pharmaceutical areas are not designed to be adjacent according to GMP guidelines', 'error');
          return false;
        }
      } else {
        // For non-assigned nodes, fall back to category-based validation
        if (sourceInfo.category && targetInfo.category) {
          const connectorResult = getAutoConnectors(sourceInfo.category, targetInfo.category);
          
          const hasAdjacency = connectorResult.relationships.some(
            (rel) => rel.type === 'ADJACENT_TO'
          );
          
          const isProhibited = connectorResult.relationships.some(
            (rel) => rel.type === 'PROHIBITED_NEAR'
          );

          if (isProhibited) {
            console.log('❌ Connection blocked by category-based prohibition');
            showSnackbar('Connection not allowed: These functional areas cannot be adjacent', 'error');
            return false;
          }

          if (!hasAdjacency) {
            console.log('❌ No adjacency relationship found between categories in guided mode');
            showSnackbar('Connection not allowed: These functional areas are not designed to be adjacent', 'error');
            return false;
          }
        }
      }

      console.log('✅ Guided mode: Adjacency validation passed');
    }
    
    console.log('✅ Stage 1 validation passed - will validate with Neo4j in Stage 2');
    return true;
  }, [nodes, mode, showSnackbar]);

  const onConnectStart = useCallback((event: any, params: any) => {
    console.log('🚀 Connection started:', params);
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    console.log('🏁 Connection ended');
  }, []);

  const onConnect = useCallback(
    async (params: Connection) => {
      console.log('🔗 [Stage 2] Advanced connection validation and setup:', params);
      
      // Get source and target nodes for relationship suggestion
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) {
        console.error('❌ Source or target node not found in onConnect');
        return;
      }

      let suggestedType = 'ADJACENT_TO';
      let suggestedReason = 'User-defined relationship';
      let suggestedPriority = 5;
      
      // Advanced Neo4j validation for guided mode
      if (mode === 'guided') {
        try {
          // Get the effective node IDs for Neo4j lookup
          const getEffectiveNodeId = (node: Node) => {
            if (node.type === 'customShape') {
              const customData = node.data as CustomShapeData;
              return customData.assignedNodeId || customData.assignedNodeName || node.id;
            }
            return node.data?.name || node.id;
          };

          const sourceNodeId = getEffectiveNodeId(sourceNode);
          const targetNodeId = getEffectiveNodeId(targetNode);

          // Check if both nodes are associated with Neo4j templates
          const sourceHasAssociation = sourceNode.type === 'customShape' && 
            (sourceNode.data as CustomShapeData).assignedNodeId;
          const targetHasAssociation = targetNode.type === 'customShape' && 
            (targetNode.data as CustomShapeData).assignedNodeId;

          if (sourceHasAssociation && targetHasAssociation) {
            console.log('🔍 [Stage 2] Performing advanced Neo4j validation...');

            // Call the backend for comprehensive constraint validation
            const validationResult = await apiService.validateConnection(
              sourceNodeId,
              targetNodeId
            );

            console.log('🔍 [Stage 2] Neo4j validation result:', validationResult);

            // Check for blocking errors that weren't caught in Stage 1
            const blockingErrors = validationResult.violations.filter(v => v.type === 'ERROR');
            
            if (blockingErrors.length > 0) {
              console.log('❌ [Stage 2] Connection blocked by advanced Neo4j validation:', blockingErrors);
              
              // Remove the edge that was already created by React Flow
              setEdges(edges => edges.filter(edge => 
                !(edge.source === params.source && edge.target === params.target)
              ));

              const primaryError = blockingErrors[0];
              showSnackbar(
                `Connection not allowed: ${primaryError.message}`, 
                'error'
              );
              return;
            }

            // Show warnings but allow connection
            const warnings = validationResult.violations.filter(v => v.type === 'WARNING');
            if (warnings.length > 0) {
              console.log('⚠️ [Stage 2] Connection has warnings:', warnings);
              showSnackbar(
                `Connection created with warning: ${warnings[0].message}`, 
                'info'
              );
            }

            // Get suggestions for relationship type from Neo4j
            try {
              const validTargets = await apiService.getValidConnectionTargets(sourceNodeId);
              const targetSuggestion = validTargets.validTargets.find(
                target => target.nodeId === targetNodeId || target.nodeName === targetNodeId
              );

              if (targetSuggestion && targetSuggestion.relationshipTypes.length > 0) {
                suggestedType = targetSuggestion.relationshipTypes[0];
                suggestedReason = targetSuggestion.reason;
                suggestedPriority = Math.round(targetSuggestion.confidence * 10);
                
                console.log('💡 [Stage 2] Using Neo4j relationship suggestion:', {
                  type: suggestedType,
                  reason: suggestedReason,
                  priority: suggestedPriority
                });

                showSnackbar(`Smart suggestion: ${suggestedType} relationship`, 'success');
              }
            } catch (suggestionError) {
              console.warn('⚠️ Could not get relationship suggestions:', suggestionError);
            }

          } else {
            console.log('⚠️ [Stage 2] One or both nodes not associated with Neo4j - using basic suggestions');
            showSnackbar('Tip: Associate shapes with Neo4j templates for smart relationship suggestions', 'info');
          }

        } catch (error) {
          console.error('❌ [Stage 2] Error in advanced validation:', error);
          showSnackbar('Connection created - advanced validation temporarily unavailable', 'info');
        }
      }

      // Enhanced relationship suggestions for custom shapes with inherited Neo4j properties (fallback)
      if (mode === 'guided' && sourceNode?.type === 'customShape' && suggestedType === 'ADJACENT_TO') {
        const sourceData = sourceNode.data as CustomShapeData;
        if (sourceData.hasInheritedProperties && sourceData.inheritedRelationships) {
          const matchingRelationships = sourceData.inheritedRelationships.filter((rel: any) => {
            return (
              rel.type !== 'PROHIBITED_NEAR' && 
              rel.type !== 'CANNOT_CONNECT_TO' &&
              (targetNode?.data?.category === rel.targetCategory ||
               targetNode?.data?.name === rel.targetName ||
               targetNode?.data?.assignedNodeName === rel.targetName)
            );
          });
          
          if (matchingRelationships.length > 0) {
            const bestMatch = matchingRelationships[0];
            suggestedType = bestMatch.type;
            suggestedReason = bestMatch.reason || 'Suggested by cached Neo4j data';
            suggestedPriority = bestMatch.priority || 5;
          }
        }
      }
      
      console.log('✅ [Stage 2] Opening relationship dialog with suggestions:', {
        type: suggestedType,
        reason: suggestedReason,
        priority: suggestedPriority
      });

      // Open relationship dialog with intelligent suggestions
      setRelationshipDialog({
        open: true,
        connection: params,
        selectedType: suggestedType,
        priority: suggestedPriority,
        reason: suggestedReason,
        doorType: '',
        minDistance: null,
        maxDistance: null,
        flowDirection: 'bidirectional',
        flowType: 'raw_material',
        animated: false
      });
    },
    [nodes, mode, showSnackbar, edges, setEdges, apiService]
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
        animated: animated,
        mode: mode // Add mode information for enhanced graphics in guided mode
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

  // Handle automatic snap connections in guided mode
  const handleSnapConnection = useCallback((sourceId: string, targetId: string, relationships: Partial<SpatialRelationship>[]) => {
    console.log('🔗 Snap connection triggered:', { sourceId, targetId, relationships });
    
    // Check if connections already exist between these nodes
    const existingConnections = edges.filter(
      (edge) =>
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    );

    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    const sourceCategory = (sourceNode?.data as any)?.category;
    const targetCategory = (targetNode?.data as any)?.category;

    relationships.forEach((rel, index) => {
      // Check if this specific relationship type already exists
      const existingRelOfType = existingConnections.find(
        (edge) => (edge.data as any)?.relationshipType === rel.type
      );

      if (!existingRelOfType && rel.type) {
        // Correct direction for personnel flow
        let edgeSource = sourceId;
        let edgeTarget = targetId;
        if (rel.type === 'PERSONNEL_FLOW') {
          if (sourceCategory !== 'Personnel' && targetCategory === 'Personnel') {
            edgeSource = targetId;
            edgeTarget = sourceId;
          }
        }
        const uniqueId = `edge-${edgeSource}-${edgeTarget}-${rel.type}-${Date.now()}-${index}`;
        const metadata = getConnectorMetadata(rel.type);
        
        const newEdge: Edge<DiagramEdge> = {
          id: uniqueId,
          source: edgeSource,
          target: edgeTarget,
          type: 'multiRelationship',
          animated: metadata.animated || false,
          style: {
            stroke: metadata.color,
            strokeWidth: 2,
            strokeDasharray: metadata.dashArray,
          },
          label: metadata.label,
          labelShowBg: existingConnections.length > 0,
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: {
            fill: '#fff',
            fillOpacity: 0.9,
            stroke: metadata.color,
            strokeWidth: 1,
          },
          data: {
            relationshipType: rel.type,
            priority: rel.priority || 5,
            reason: rel.reason || `Auto-generated ${rel.type} relationship`,
            doorType: rel.doorType,
            minDistance: rel.minDistance,
            maxDistance: rel.maxDistance,
            flowDirection: rel.flowDirection,
            flowType: rel.flowType,
            relationshipIndex: existingConnections.length + index,
            creationDirection: 'source-to-target',
            animated: metadata.animated || false,
            mode: mode // Add mode information for proper rendering
          } as any,
        };

        setEdges((eds) => addMultiEdge(eds, newEdge));
        showSnackbar(`Auto-created ${metadata.label} connection`, 'success');
      }
    });
  }, [edges, setEdges, showSnackbar]);

  const handleGuidedNodeDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    console.log('🎯 Guided mode drag started for template:', template);
    const templateData = JSON.stringify(template);
    event.dataTransfer.setData('application/reactflow', templateData);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Add a new function to handle node selection from palette in guided mode
  const handleGuidedNodeSelection = useCallback(async (nodeId: string) => {
    if (mode !== 'guided' || connectionStatus !== 'connected') return;

    try {
      console.log('🔍 Guided mode: Fetching relationships for node:', nodeId);
      
      // Fetch the node with its relationships
      const nodeData = await apiService.getNodeWithRelationships(nodeId);
      
      console.log('🔍 Guided mode: Received node data:', nodeData);
      
      // Convert to ReactFlow format
      const mainFlowNode = {
        id: nodeData.mainNode.id,
        type: 'functionalArea' as const,
        position: {
          x: nodeData.mainNode.x || 200,
          y: nodeData.mainNode.y || 200
        },
        data: {
          label: nodeData.mainNode.name,
          category: nodeData.mainNode.category,
          cleanroomClass: nodeData.mainNode.cleanroomClass,
          color: getCategoryColor(nodeData.mainNode.category),
          name: nodeData.mainNode.name,
          width: nodeData.mainNode.width || 120,
          height: nodeData.mainNode.height || 80
        }
      };

      const relatedFlowNodes = nodeData.relatedNodes.map((node: any, index: number) => ({
        id: node.id,
        type: 'functionalArea' as const,
        position: {
          // Position related nodes around the main node
          x: (node.x || 200) + (index * 250),
          y: (node.y || 200) + (Math.sin(index * Math.PI / 3) * 150)
        },
        data: {
          label: node.name,
          category: node.category,
          cleanroomClass: node.cleanroomClass,
          color: getCategoryColor(node.category),
          name: node.name,
          width: node.width || 120,
          height: node.height || 80
        }
      }));

      // Group relationships by node pairs for proper indexing
      const relationshipGroups = new Map<string, any[]>();
      nodeData.relationships.forEach(rel => {
        const nodeIds = [rel.fromId, rel.toId].sort();
        const key = nodeIds.join('-');
        if (!relationshipGroups.has(key)) {
          relationshipGroups.set(key, []);
        }
        relationshipGroups.get(key)!.push(rel);
      });

      const flowEdges = nodeData.relationships.map(rel => {
        const nodeIds = [rel.fromId, rel.toId].sort();
        const key = nodeIds.join('-');
        const groupRels = relationshipGroups.get(key)!;
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

      // Update canvas with the selected node and its relationships
      setNodes([mainFlowNode, ...relatedFlowNodes]);
      setEdges(flowEdges);
      
      // Select the main node
      setSelectedNode(mainFlowNode);
      
      // Open knowledge graph panel for the main node after loading
      setTimeout(() => {
        console.log('🎯 Guided mode: Opening knowledge graph panel for main node:', {
          nodeId: mainFlowNode.id,
          nodeName: mainFlowNode.data.label,
          nodeCategory: mainFlowNode.data.category,
          position: mainFlowNode.position
        });
        
        // Open knowledge graph panel for the main node
        knowledgeGraph.openPanel(mainFlowNode.id, mainFlowNode.data.label);
        console.log('🎯 Guided mode: Knowledge graph panel opened for main node');
      }, 500); // Small delay to ensure canvas update completes
      
      showSnackbar(`Loaded ${nodeData.mainNode.name} with ${nodeData.relatedNodes.length} related nodes`, 'success');
      
    } catch (error) {
      console.error('Error fetching node relationships:', error);
      showSnackbar('Failed to load node relationships', 'error');
    }
  }, [mode, connectionStatus, getCategoryColor, getRelationshipColor, getRelationshipDashArray, getRelationshipLabel, setNodes, setEdges, setSelectedNode, knowledgeGraph.openPanel, showSnackbar]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 DiagramEditor: Node clicked:', {
        nodeId: node.id,
        nodeType: node.type,
        mode,
        isGroupMode: groupingState.isGroupMode
      });
    }

    if (groupingState.isGroupMode) {
      selectNodeForGroup(node.id);
    } else {
      setSelectedNode(node);
      
      // Check if we should open knowledge graph panel
      const isCustomShapeWithAssignment = node.type === 'customShape' && 
        (node.data as CustomShapeData)?.hasInheritedProperties && 
        (node.data as CustomShapeData)?.assignedNodeId;
      
      const isCustomShapeUnassigned = node.type === 'customShape' && 
        !(node.data as CustomShapeData)?.hasInheritedProperties && 
        !(node.data as CustomShapeData)?.assignedNodeId &&
        (node.data as CustomShapeData)?.label; // Must have a label to generate suggestions
      
      // Open knowledge graph panel ONLY for nodes that have been assigned to Neo4j properties
      const shouldOpenKnowledgeGraph = mode === 'guided' && connectionStatus === 'connected' && 
        (node.type === 'functionalArea' || isCustomShapeWithAssignment);
      
      if (shouldOpenKnowledgeGraph) {
        // Get the proper display name - prioritize Neo4j assigned name
        const displayName = (node.data as CustomShapeData)?.assignedNodeName || 
                           node.data?.label || 
                           node.data?.name || 
                           `Node ${node.id}`;
        // Prefer assigned Neo4j node NAME for both display and KG center key
        const centerKey = (node.data as CustomShapeData)?.assignedNodeName || node.data?.label || node.data?.name || node.id;
        
        console.log('🎯 DiagramEditor: Opening Knowledge Graph Panel for assigned node:', {
          nodeId: node.id,
          displayName,
          isAssigned: !!(node.data as CustomShapeData)?.assignedNodeName
        });
        
        knowledgeGraph.openPanel(centerKey, displayName);
        console.log('🎯 DiagramEditor: ✅ Knowledge Graph Panel opened successfully');
      } else if (mode === 'guided' && isCustomShapeUnassigned) {
        // For unassigned shapes, open assignment dialog
        console.log('🎯 DiagramEditor: Unassigned shape clicked - opening assignment dialog');
        setNodeToAssign(node);
        setAssignmentDialogOpen(true);
        showSnackbar('Please assign this shape to a Neo4j property to see its connections.', 'info');
      }
    }
  }, [groupingState.isGroupMode, selectNodeForGroup, mode, connectionStatus, knowledgeGraph.openPanel, setSelectedNode, setNodeToAssign, setAssignmentDialogOpen, showSnackbar]);

  // Clear selected node when clicking on empty canvas space
  const onPaneClick = useCallback(() => {
    // Clear selected node when clicking on canvas background
    setSelectedNode(null);
  }, [setSelectedNode]);


  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      console.log('🎯 onDrop triggered:', {
        eventType: event.type,
        clientX: event.clientX,
        clientY: event.clientY,
        dataTransfer: event.dataTransfer
      });
      
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const templateData = event.dataTransfer.getData('application/reactflow');
      
      console.log('🎯 Drop data check:', {
        reactFlowBounds: reactFlowBounds ? `${reactFlowBounds.width}x${reactFlowBounds.height}` : 'null',
        templateData: templateData ? 'found' : 'empty',
        reactFlowInstance: reactFlowInstance ? 'initialized' : 'null'
      });

      if (templateData && reactFlowBounds && reactFlowInstance) {
        try {
          const template: NodeTemplate = JSON.parse(templateData);
          console.log('🎯 Parsed template:', template);
          
          const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });
          
          console.log('🎯 Calculated position:', position);

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
          
          setNodes((nds) => {
            console.log('🎯 Adding node to', nds.length, 'existing nodes');
            return nds.concat(newNode);
          });
          showSnackbar(`Added ${template.name} to diagram`, 'success');
          
        } catch (error) {
          console.error('🎯 Error in onDrop:', error);
          showSnackbar('Failed to add node to diagram', 'error');
        }
      } else {
        console.warn('🎯 Drop failed - missing requirements:', {
          hasTemplateData: !!templateData,
          hasReactFlowBounds: !!reactFlowBounds,
          hasReactFlowInstance: !!reactFlowInstance
        });
        
        if (!templateData) {
          console.warn('🎯 No template data found in drag transfer');
        }
      }
    },
    [reactFlowInstance, setNodes, showSnackbar]
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

  // Enhanced node change handler with physical constraint enforcement
  const handleNodeChange = useCallback(async (changes: any) => {
    console.log('🔄 Processing node changes:', changes.length);
    
    const filteredChanges = [];
    
    for (const change of changes) {
      // Handle position changes with comprehensive constraint checking
      if (change.type === 'position' && change.position) {
        console.log(`📍 Processing position change for node ${change.id}`, change.position);
        
        // Update drag tracking state
        if (change.dragging) {
          setDraggedNodeId(change.id);
          setDragPosition(change.position);
        } else {
          setDraggedNodeId(null);
          setDragPosition(null);
          setConstraintFeedback({ isBlocked: false, blockedBy: [] });
        }

        // Check group boundary violations first
        const groupViolation = checkGroupBoundaryViolation(change.id, change.position);
        if (groupViolation) {
          console.log('❌ Group boundary violation detected');
          showSnackbar('Cannot move node outside group boundary or into another group', 'error');
          continue; // Skip this change
        }

        // Physical constraint enforcement for custom shapes in guided mode
        if (mode === 'guided') {
          const targetNode = nodes.find(n => n.id === change.id);
          if (targetNode && targetNode.type === 'customShape') {
            const customData = targetNode.data as any;
            
            // Only validate shapes with Neo4j assignments
            if (customData?.assignedNodeId) {
              console.log(`🔒 Checking physical constraints for ${change.id}...`);
              
              try {
                // Check physical constraints synchronously first
                const constraintResult = await physicalConstraints.checkPositionConstraints(
                  change.id,
                  change.position
                );

                console.log(`🔍 Constraint check result:`, constraintResult);

                // Update visual feedback
                const visualFeedback = physicalConstraints.getVisualFeedback(change.id, change.position);
                setConstraintFeedback({
                  isBlocked: visualFeedback.isBlocked,
                  blockedBy: visualFeedback.blockedBy,
                  feedbackMessage: visualFeedback.feedbackMessage
                });

                // If blocked, either constrain position or reject change
                if (!constraintResult.canPlace) {
                  console.log('🚫 Position blocked by physical constraints:', constraintResult.blockedBy);
                  
                  // If dragging, try to find a constrained position
                  if (change.dragging && constraintResult.lastValidPosition) {
                    const constrainedPosition = physicalConstraints.findConstrainedPosition(
                      change.id,
                      change.position,
                      constraintResult.lastValidPosition
                    );
                    
                    // Update change to use constrained position
                    const constrainedChange = {
                      ...change,
                      position: constrainedPosition
                    };
                    
                    console.log('📍 Using constrained position:', constrainedPosition);
                    filteredChanges.push(constrainedChange);
                    continue;
                  } else {
                    // Not dragging or no valid position - block the change completely
                    showSnackbar(
                      constraintResult.reason || 
                      `Cannot place shape: blocked by ${constraintResult.blockedBy.length} shape(s)`, 
                      'error'
                    );
                    continue; // Skip this change
                  }
                }

                console.log('✅ Physical constraints passed');

              } catch (error) {
                console.error('❌ Error in physical constraint validation:', error);
                // On validation error, be conservative and block the move
                showSnackbar('Physical constraint validation error - placement blocked for safety', 'error');
                continue;
              }
            }
          }
        }
      }
      
      // Handle other change types (selection, deletion, etc.)
      if (change.type === 'select') {
        console.log(`👆 Node ${change.id} selection changed:`, change.selected);
      }
      
      // If we get here, the change is valid or doesn't require validation
      filteredChanges.push(change);
    }

    console.log(`✅ Applying ${filteredChanges.length}/${changes.length} filtered changes`);
    
    // Apply the filtered changes
    onNodesChange(filteredChanges);
    
    // TEMPORARY: Disable guided suggestions to isolate ghost suggestions
    /*
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
    */
  }, [
    mode, 
    onNodesChange, 
    nodes, 
    checkGroupBoundaryViolation, 
    physicalConstraints.checkPositionConstraints,
    physicalConstraints.getVisualFeedback,
    physicalConstraints.findConstrainedPosition,
    showSnackbar
  ]);

  // Use nodes and edges directly without ghost elements
  const allNodes = nodes;
  const allEdges = edges;

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
              mr: 1, 
              color: 'white', 
              '& .MuiChip-icon': { color: 'white' },
              '& .rotating': {
                animation: 'spin 1s linear infinite'
              }
            }}
            onClick={checkConnectionStatus}
          />
          
          <IconButton
            color="inherit"
            onClick={() => setIsNeo4jOverviewOpen(!isNeo4jOverviewOpen)}
            sx={{ mr: 2 }}
            title="Neo4j Database Overview"
          >
            <Storage />
          </IconButton>
          
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
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: mode === 'guided' ? 0 : 280 }}>
          {mode === 'guided' ? null : (
            <>
              <NodePalette 
                templates={nodeTemplates} 
                mode={mode}
                onCreateCustomNode={handleCreateCustomNode}
                onGuidedNodeSelect={handleGuidedNodeSelection}
              />
              <RelationshipLegend />
            </>
          )}
        </Box>
        
        <Box sx={{ 
          flex: 1, 
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {mode === 'guided' ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <SnapCanvas
                nodes={allNodes}
                edges={allEdges}
                onNodesChange={(newNodes) => setNodes(newNodes)}
                onEdgesChange={(newEdges) => setEdges(newEdges)}
                onSnapConnection={handleSnapConnection}
                showSnapGuides={showSnapGuides}
                nodeTypes={createNodeTypes(handleShapeEdit, handleShapeEditComplete, handleShapeResize)}
                edgeTypes={edgeTypes}
                onConnect={onConnect}
                isValidConnection={isValidConnection}
                onConnectStart={onConnectStart}
                onConnectEnd={onConnectEnd}
                guidedNoAdjacencyEdges={true}
                knowledgeGraphData={knowledgeGraph.state.graphData}
              />

              {/* Adjacency constraint feedback for guided mode */}
              <AdjacencyFeedback
                violations={adjacencyConstraints.violations}
                isValidating={adjacencyConstraints.isValidating}
                mode="guided"
                selectedShapeId={
                  // Show feedback for dragged node first, then selected node
                  (draggedNodeId && nodes.find(n => n.id === draggedNodeId)?.type === 'customShape') 
                    ? draggedNodeId 
                    : selectedNode?.type === 'customShape' ? selectedNode.id : undefined
                }
              />

              {/* Vertical floating shape tools */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  zIndex: 1100
                }}
              >
                <ShapeDrawingToolbar
                  activeShapeTool={activeShapeTool}
                  onShapeToolChange={handleShapeToolChange}
                  onUndoShape={handleUndoShape}
                  onRedoShape={handleRedoShape}
                  onToggleGrid={handleToggleGrid}
                  onToggleSnap={handleToggleSnap}
                  canUndo={shapeHistoryIndex > 0}
                  canRedo={shapeHistoryIndex < shapeHistory.length - 1}
                  isGridVisible={isGridVisible}
                  isSnapEnabled={isSnapEnabled}
                  orientation="vertical"
                />
              </Box>
              
              {/* Shape Drawing Canvas for Guided Mode */}
              {activeShapeTool && (
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0,
                  pointerEvents: 'all',
                  zIndex: 1000
                }}>
                  <ShapeDrawingCanvas
                    activeShapeTool={activeShapeTool}
                    isDrawing={isDrawingShape}
                    onShapeComplete={handleShapeComplete}
                    onDrawingStateChange={setIsDrawingShape}
                    canvasWidth={window.innerWidth - 320}
                    canvasHeight={window.innerHeight - 64}
                    isGridVisible={isGridVisible}
                    isSnapEnabled={isSnapEnabled}
                    gridSize={20}
                    nodes={nodes}
                    mode={mode as AppMode === 'guided' ? 'guided' : 'creation'}
                    enforceBoundaries={mode === 'guided'}
                    showValidationFeedback={true}
                  />
                </div>
              )}
            </div>
          ) : (
              <ReactFlowProvider>
              <div
                ref={reactFlowWrapper}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  minHeight: '400px',
                  position: 'relative',
                  flex: 1
                }}
              >
                <ReactFlow
                  nodes={allNodes}
                  edges={allEdges}
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
                  onPaneClick={onPaneClick}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeDragStart={(event, node) => {
                    console.log('🎯 Node drag started:', node.id);
                    setDraggedNodeId(node.id);
                    
                    // For custom shapes with Neo4j assignments, show constraint info
                    if (node.type === 'customShape') {
                      const customData = node.data as any;
                      if (customData?.assignedNodeId) {
                        showSnackbar('Adjacency constraints active - placement will be validated', 'info');
                      } else {
                        showSnackbar('Shape not assigned to Neo4j node - no constraint validation', 'info');
                      }
                    }
                  }}
                  onNodeDragStop={async (event, node) => {
                    console.log('🎯 Node drag stopped:', node.id);
                    setDraggedNodeId(null);
                    
                    // Final validation for custom shapes
                    if (node.type === 'customShape') {
                      const customData = node.data as any;
                      if (customData?.assignedNodeId) {
                        try {
                          const finalValidation = await adjacencyConstraints.validateShapePosition(
                            node.id,
                            node.position
                          );
                          
                          if (finalValidation.violations.length === 0) {
                            showSnackbar('Shape placement validated successfully', 'success');
                          } else {
                            // Auto-correct preference: attempt to resolve overlap by nudging to nearest edge-touch
                            const hasOverlap = finalValidation.violations.some(v => v.collisionType === 'overlap');
                            if (hasOverlap) {
                              try {
                                // Nudge slightly along x or y to escape overlap; rely on snap to apply spacing
                                const corrected = { x: node.position.x + 2, y: node.position.y + 2 };
                                const recheck = await adjacencyConstraints.validateShapePosition(node.id, corrected);
                                if (recheck.violations.length === 0) {
                                  setNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: corrected } : n));
                                  showSnackbar('Auto-corrected to avoid overlap', 'info');
                                } else {
                                  // Revert to previous valid position if available
                                  showSnackbar('Overlap detected. Please adjust position', 'error');
                                }
                              } catch (e) {
                                console.warn('Auto-correct failed:', e);
                              }
                            }
                            const warningCount = finalValidation.violations.filter(v => v.severity === 'warning').length;
                            if (warningCount > 0) {
                              showSnackbar(`Shape placed with ${warningCount} adjacency warning${warningCount > 1 ? 's' : ''}`, 'info');
                            }
                          }
                        } catch (error) {
                          console.error('Error in final validation:', error);
                        }
                      }
                    }
                  }}
                  onInit={(instance) => {
                    setReactFlowInstance(instance);
                    // Ensure proper initial fit view with proper dimensions
                    setTimeout(() => {
                      try {
                        instance.fitView({ padding: 20, duration: 200 });
                      } catch (error) {
                        if (process.env.NODE_ENV === 'development') {
                          console.warn('Initial fitView failed:', error);
                        }
                      }
                    }, 100);
                  }}
                  nodeTypes={createNodeTypes(handleShapeEdit, handleShapeEditComplete, handleShapeResize)}
                  edgeTypes={edgeTypes}
                  deleteKeyCode="Delete"
                  multiSelectionKeyCode="Meta"
                  connectOnClick={false}
                  connectionMode={ConnectionMode.Loose}
                  connectionLineType={ConnectionLineType.Straight}
                  connectionLineStyle={{ stroke: '#1976d2', strokeWidth: 3 }}
                  fitView
                  fitViewOptions={{ padding: 20, duration: 200 }}
                  snapToGrid
                  snapGrid={[20, 20]}
                  attributionPosition="bottom-left"
                  proOptions={{ hideAttribution: true }}
                  maxZoom={4}
                  minZoom={0.1}
                  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                >
                  <Background color="#f0f0f0" gap={20} />
                  <Controls />
                  <MiniMap />
                </ReactFlow>

                {/* Physical Constraint Overlay for Guided Mode */}
                <PhysicalConstraintOverlay
                  nodes={allNodes}
                  draggedNodeId={draggedNodeId}
                  dragPosition={dragPosition}
                  blockedBy={constraintFeedback.blockedBy}
                  isBlocked={constraintFeedback.isBlocked}
                  feedbackMessage={constraintFeedback.feedbackMessage}
                  enabled={(mode as AppMode) === 'guided'}
                />
                
                {/* Shape Drawing Canvas for Guided Mode */}
                {(mode as AppMode) === 'guided' && (
                  <ShapeDrawingCanvas
                    activeShapeTool={activeShapeTool}
                    isDrawing={isDrawingShape}
                    onShapeComplete={handleShapeComplete}
                    onDrawingStateChange={setIsDrawingShape}
                    canvasWidth={1200}
                    canvasHeight={800}
                    isGridVisible={isGridVisible}
                    isSnapEnabled={isSnapEnabled}
                    gridSize={20}
                    nodes={nodes}
                    mode="guided"
                    enforceBoundaries={true}
                    showValidationFeedback={true}
                  />
                )}
              </div>
              </ReactFlowProvider>
          )}
          
          {/* Edge proximity indicator for all modes */}
          {draggedNodeId && edgeValidation.validationResults.length > 0 && (
            <EdgeProximityIndicator
              validationResults={edgeValidation.validationResults}
              position="top-right"
              compact={false}
            />
          )}
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
            connectionStatus={connectionStatus}
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

      {/* Neo4j Node Assignment Dialog */}
      <Dialog
        open={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false);
          setNodeToAssign(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Assign Neo4j Node Properties</DialogTitle>
        <DialogContent>
          {nodeToAssign && (
            <Neo4jNodeAssignment
              customShapeData={{
                ...nodeToAssign.data as CustomShapeData,
                id: nodeToAssign.id // Pass the node ID explicitly
              }}
              onAssignNode={handleNeo4jAssignment}
              onInheritRelationships={(relationships) => {
                console.log('Inherited relationships:', relationships);
              }}
              isConnected={connectionStatus === 'connected'}
              autoOpen={true}
              // New constraint validation props
              shapePosition={nodeToAssign.position}
              shapeGeometry={calculateShapeGeometry(
                (nodeToAssign.data as CustomShapeData).shapePoints || [],
                nodeToAssign.position
              )}
              nearbyShapes={getNearbyShapes(nodeToAssign, nodes)}
              onConstraintValidation={(result: any) => {
                console.log('🔍 Constraint validation result for assignment:', result);
                if (result.violations?.length > 0) {
                  console.warn(`⚠️ ${result.violations.length} constraint violations detected after assignment`);
                }
                // Could trigger UI updates or notifications here
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAssignmentDialogOpen(false);
              setNodeToAssign(null);
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Constraint Validation Feedback */}
      <ConstraintValidationFeedback
        nodes={nodes}
        edges={edges}
        mode={mode}
        isVisible={showConstraintFeedback}
        onToggleVisibility={() => setShowConstraintFeedback(!showConstraintFeedback)}
      />

      {/* Knowledge Graph Panel */}
      <KnowledgeGraphPanel
        onNodeMaterialize={handleNodeMaterialize}
      />
      
      {/* Neo4j Database Overview Panel */}
      <Neo4jOverview
        isOpen={isNeo4jOverviewOpen}
        onClose={() => setIsNeo4jOverviewOpen(false)}
      />
    </Box>
  );
};

export default DiagramEditor;