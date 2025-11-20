import React, { useState, useCallback } from 'react';
import { Box, Tooltip, ToggleButtonGroup, ToggleButton, Button } from '@mui/material';
import { Timeline, ShowChart, CloudUpload, Save, FolderOpen, Factory, Download } from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodePalette from '../NodePalette';
import PropertyPanel from '../PropertyPanel';
import CustomNode from '../CustomNode';
import CustomShapeNode from '../CustomShapeNode';
import MultiRelationshipEdge from '../MultiRelationshipEdge';
import InlineRelationshipEditDialog from '../InlineRelationshipEditDialog';
import SaveDiagramDialog from '../SaveDiagramDialog';
import LoadDiagramDialog from '../LoadDiagramDialog';
import FacilityTemplateSelector from '../FacilityTemplateSelector';
import CostEstimationPanel from '../CostEstimationPanel';
import { NodeTemplate, AppMode, SpatialRelationship, DiagramEdge, Diagram } from '../../types';
import { apiService } from '../../services/api';
import { formatRelationshipLabel } from '../../utils/edgeUtils';

const nodeTypes = {
  functionalArea: CustomNode,
  customShape: CustomShapeNode,
};

const edgeTypes = {
  default: MultiRelationshipEdge,
};

interface CreationModeProps {
  mode: AppMode;
  onSave: (data: any) => void;
  onLoad: () => void;
  onShowMessage?: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}

const CreationModeInner: React.FC<CreationModeProps> = ({ mode, onSave, onLoad, onShowMessage }) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [templates, setTemplates] = useState<NodeTemplate[]>([]);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  // State for relationship editing dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdge | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // State for edge style (straight or curved)
  const [edgeStyle, setEdgeStyle] = useState<'straight' | 'curved'>('straight');

  // State for selected node (for PropertyPanel)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [propertyPanelVisible, setPropertyPanelVisible] = useState(false);

  // State for save/load dialogs
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [currentDiagramName, setCurrentDiagramName] = useState<string | null>(null);

  // State for template selector
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Load templates on mount
  React.useEffect(() => {
    apiService.getNodeTemplates()
      .then(setTemplates)
      .catch(err => {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      });
  }, []);

  // Handle custom node creation
  const handleCreateCustomNode = useCallback((nodeTemplate: Omit<NodeTemplate, 'id'>) => {
    // Generate a unique ID for the new template
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newTemplate: NodeTemplate = {
      ...nodeTemplate,
      id: `custom-${nodeTemplate.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}-${randomSuffix}`,
    };

    // Add to local templates list
    setTemplates(prev => [...prev, newTemplate]);

    console.log('Custom node template created:', newTemplate);
  }, []);

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  // Allow drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop - create new node
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData) {
        console.warn('No template data in drop event');
        return;
      }

      const template: NodeTemplate = JSON.parse(templateData);

      // Get position from ReactFlow
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      console.log('✅ Creating node:', {
        template: template.name,
        position,
        clientX: event.clientX,
        clientY: event.clientY,
      });

      // Create new node
      const newNode: Node = {
        id: `${template.id}-${Date.now()}`,
        type: 'functionalArea',
        position,
        data: {
          label: template.name,
          ...template,
          width: template.defaultSize?.width || 120,
          height: template.defaultSize?.height || 80,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance]
  );

  // Handle connection creation (when user drags from one handle to another)
  const onConnect = useCallback(
    (connection: Connection) => {
      console.log('🔗 Connection created:', connection);

      if (!connection.source || !connection.target) {
        console.warn('Invalid connection - missing source or target');
        return;
      }

      // Store pending connection and open dialog to configure relationship
      setPendingConnection(connection);
      setEditDialogOpen(true);

      // Create temporary edge with default properties (will be updated by dialog)
      const existingEdgesBetweenNodes = edges.filter(
        (e) =>
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source)
      );

      const relationshipIndex = existingEdgesBetweenNodes.length;

      const defaultRelationshipType = 'ADJACENT_TO';
      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default',
        label: formatRelationshipLabel(defaultRelationshipType),
        labelShowBg: true,
        labelBgStyle: { fill: '#ffffff' },
        labelBgPadding: [8, 4],
        data: {
          relationshipType: defaultRelationshipType,
          priority: 5,
          reason: 'Physical adjacency for material/personnel exchange',
          relationshipIndex,
          flowDirection: 'bidirectional',
          doorType: 'standard',
          mode: 'creation',
          edgeStyle, // Pass the current edge style
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edges, edgeStyle]
  );

  // Handle edge click to edit relationship properties
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      console.log('🖱️ Edge clicked:', edge);
      event.stopPropagation();
      setSelectedEdge(edge as DiagramEdge);
      setEditDialogOpen(true);
    },
    []
  );

  // Update relationship properties from dialog
  const handleRelationshipUpdate = useCallback(
    (edgeId: string, updates: Partial<SpatialRelationship>) => {
      console.log('📝 Updating relationship:', edgeId, updates);

      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            const newRelationshipType = updates.type || edge.data?.relationshipType;
            return {
              ...edge,
              label: formatRelationshipLabel(newRelationshipType),
              data: {
                ...edge.data,
                relationshipType: newRelationshipType,
                priority: updates.priority ?? edge.data?.priority,
                reason: updates.reason || edge.data?.reason,
                doorType: updates.doorType || edge.data?.doorType,
                flowDirection: updates.flowDirection || edge.data?.flowDirection,
                flowType: updates.flowType || edge.data?.flowType,
                minDistance: updates.minDistance,
                maxDistance: updates.maxDistance,
              },
            };
          }
          return edge;
        })
      );

      setEditDialogOpen(false);
      setSelectedEdge(null);
      setPendingConnection(null);
    },
    []
  );

  // Delete relationship
  const handleRelationshipDelete = useCallback((edgeId: string) => {
    console.log('🗑️ Deleting relationship:', edgeId);

    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
    setEditDialogOpen(false);
    setSelectedEdge(null);
    setPendingConnection(null);
  }, []);

  // Close dialog without changes
  const handleDialogClose = useCallback(() => {
    // If there's a pending connection that wasn't configured, remove the edge
    if (pendingConnection && !selectedEdge) {
      const lastEdge = edges[edges.length - 1];
      if (lastEdge) {
        setEdges((eds) => eds.filter((e) => e.id !== lastEdge.id));
      }
    }

    setEditDialogOpen(false);
    setSelectedEdge(null);
    setPendingConnection(null);
  }, [pendingConnection, selectedEdge, edges]);

  // Handle node click to show property panel
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      console.log('🖱️ Node clicked:', node);
      setSelectedNode(node);
      setPropertyPanelVisible(true);
    },
    []
  );

  // Handle node update from PropertyPanel
  const handleUpdateNode = useCallback(
    (updatedNode: Node) => {
      console.log('📝 Updating node:', updatedNode.id, updatedNode);

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === updatedNode.id) {
            return updatedNode;
          }
          return node;
        })
      );

      // Update selected node to reflect changes
      setSelectedNode(updatedNode);
    },
    []
  );

  // Handle node deletion from PropertyPanel
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      console.log('🗑️ Deleting node:', nodeId);

      // Remove node
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));

      // Remove edges connected to this node
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );

      // Clear selection and hide panel
      setSelectedNode(null);
      setPropertyPanelVisible(false);
    },
    []
  );

  // Handle closing property panel
  const handleClosePropertyPanel = useCallback(() => {
    setPropertyPanelVisible(false);
  }, []);

  // Save diagram to Neo4j
  const handleSaveDiagram = useCallback(() => {
    console.log('💾 Saving diagram to Neo4j...');

    // Prepare diagram data in the format expected by the backend
    const diagramData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        name: node.data.label || node.data.name,
        category: node.data.category,
        cleanroomClass: node.data.cleanroomClass,
        // Backend expects flat x, y, width, height properties
        x: node.position.x,
        y: node.position.y,
        width: node.data.width || node.width || 120,
        height: node.data.height || node.height || 80,
        equipment: node.data.equipment || [],
        color: node.data.color,
      })),
      relationships: edges.map((edge) => ({
        id: edge.id,
        // Backend expects fromId and toId (not sourceId/targetId)
        fromId: edge.source,
        toId: edge.target,
        type: edge.data?.relationshipType || 'ADJACENT_TO',
        priority: edge.data?.priority || 5,
        reason: edge.data?.reason || 'User-defined relationship',
        flowDirection: edge.data?.flowDirection,
        doorType: edge.data?.doorType,
        flowType: edge.data?.flowType,
        minDistance: edge.data?.minDistance || null,
        maxDistance: edge.data?.maxDistance || null,
      })),
      metadata: {
        mode,
        timestamp: new Date().toISOString(),
        nodeCount: nodes.length,
        relationshipCount: edges.length,
      },
    };

    console.log('📦 Diagram data prepared:', diagramData);
    onSave(diagramData);
  }, [nodes, edges, mode, onSave]);

  // Handle save diagram button click
  const handleSaveButtonClick = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  // Handle save diagram with name
  const handleSaveWithName = useCallback(async (name: string) => {
    try {
      console.log('💾 Saving diagram:', name);
      console.log('📊 Current state:', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        edges: edges
      });

      // Prepare diagram data
      const diagramData = {
        name,
        nodes: nodes.map((node) => ({
          id: node.id,
          name: node.data.label || node.data.name,
          category: node.data.category,
          cleanroomClass: node.data.cleanroomClass,
          x: node.position.x,
          y: node.position.y,
          width: node.data.width || node.width || 120,
          height: node.data.height || node.height || 80,
          equipment: node.data.equipment || [],
          color: node.data.color,
        })),
        relationships: edges.map((edge) => ({
          id: edge.id,
          fromId: edge.source,
          toId: edge.target,
          type: edge.data?.relationshipType || 'ADJACENT_TO',
          priority: edge.data?.priority || 5,
          reason: edge.data?.reason || 'User-defined relationship',
          flowDirection: edge.data?.flowDirection,
          doorType: edge.data?.doorType,
          flowType: edge.data?.flowType,
          minDistance: edge.data?.minDistance || null,
          maxDistance: edge.data?.maxDistance || null,
        })),
      };

      console.log('📦 Prepared diagram data:', {
        name: diagramData.name,
        nodeCount: diagramData.nodes.length,
        relationshipCount: diagramData.relationships.length,
        relationships: diagramData.relationships
      });

      let result;
      if (currentDiagramId) {
        // Update existing diagram
        result = await apiService.updateDiagram(currentDiagramId, diagramData);
        console.log('✅ Diagram updated:', result);
        onShowMessage?.(`Diagram "${name}" updated successfully!`, 'success');
      } else {
        // Create new diagram
        result = await apiService.createDiagram(diagramData);
        console.log('✅ Diagram saved:', result);
        setCurrentDiagramId(result.id);
        setCurrentDiagramName(name);
        onShowMessage?.(`Diagram "${name}" saved successfully!`, 'success');
      }

      setSaveDialogOpen(false);
    } catch (error) {
      console.error('❌ Failed to save diagram:', error);
      onShowMessage?.('Failed to save diagram. Please try again.', 'error');
    }
  }, [nodes, edges, currentDiagramId]);

  // Handle load diagram button click
  const handleLoadButtonClick = useCallback(() => {
    setLoadDialogOpen(true);
  }, []);

  // Handle load diagram
  const handleLoadDiagram = useCallback((diagram: Diagram) => {
    try {
      console.log('📂 Loading diagram:', diagram);
      console.log('📊 Diagram data:', {
        nodeCount: diagram.nodes?.length || 0,
        relationshipCount: diagram.relationships?.length || 0,
        hasNodes: !!diagram.nodes,
        hasRelationships: !!diagram.relationships,
        relationships: diagram.relationships
      });

      // Convert diagram nodes to ReactFlow nodes
      const loadedNodes: Node[] = diagram.nodes.map((node: any) => ({
        id: node.id,
        type: 'functionalArea',
        position: { x: node.x || 0, y: node.y || 0 },
        data: {
          label: node.name,
          name: node.name,
          category: node.category,
          cleanroomClass: node.cleanroomClass,
          width: node.width || 120,
          height: node.height || 80,
          equipment: node.equipment || [],
          color: node.color,
        },
      }));

      // Convert diagram relationships to ReactFlow edges
      const loadedEdges: Edge[] = (diagram.relationships || []).map((rel: any, index: number) => {
        console.log('🔄 Converting relationship:', rel);

        // Calculate relationship index (for multiple relationships between same nodes)
        const existingEdgesBetweenNodes = (diagram.relationships || []).slice(0, index).filter(
          (r: any) =>
            (r.fromId === rel.fromId && r.toId === rel.toId) ||
            (r.fromId === rel.toId && r.toId === rel.fromId)
        );
        const relationshipIndex = existingEdgesBetweenNodes.length;

        const edge = {
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          type: 'default',
          label: formatRelationshipLabel(rel.type),
          labelShowBg: true,
          labelBgStyle: { fill: '#ffffff' },
          labelBgPadding: [8, 4] as [number, number],
          data: {
            relationshipType: rel.type,
            relationshipIndex, // Required by MultiRelationshipEdge
            priority: rel.priority || 5,
            reason: rel.reason || 'User-defined relationship',
            flowDirection: rel.flowDirection,
            doorType: rel.doorType,
            flowType: rel.flowType,
            minDistance: rel.minDistance,
            maxDistance: rel.maxDistance,
            mode: 'creation' as const,
            edgeStyle,
          },
        };
        console.log('✅ Created edge:', edge);
        return edge;
      });

      console.log('🔄 Converted data:', {
        loadedNodes: loadedNodes.length,
        loadedEdges: loadedEdges.length,
        edges: loadedEdges
      });

      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setCurrentDiagramId(diagram.id);
      setCurrentDiagramName(diagram.name);
      setLoadDialogOpen(false);

      console.log('✅ Diagram loaded successfully:', {
        nodes: loadedNodes.length,
        edges: loadedEdges.length
      });
      onShowMessage?.(`Diagram "${diagram.name}" loaded successfully!`, 'success');
    } catch (error) {
      console.error('❌ Failed to load diagram:', error);
      onShowMessage?.('Failed to load diagram. Please try again.', 'error');
    }
  }, [edgeStyle]);

  // Handle template application
  const handleTemplateApplied = useCallback((diagram: Diagram) => {
    try {
      console.log('🏗️ Applying template:', diagram);
      console.log('📊 Template data:', {
        nodeCount: diagram.nodes?.length || 0,
        relationshipCount: diagram.relationships?.length || 0,
      });

      // Convert diagram nodes to ReactFlow nodes
      const templateNodes: Node[] = diagram.nodes.map((node: any) => ({
        id: node.id,
        type: 'functionalArea',
        position: { x: node.x || 0, y: node.y || 0 },
        data: {
          label: node.name,
          name: node.name,
          category: node.category,
          cleanroomClass: node.cleanroomClass,
          width: node.width || 120,
          height: node.height || 80,
          equipment: node.equipment || [],
          color: node.color,
        },
      }));

      // Convert diagram relationships to ReactFlow edges
      const templateEdges: Edge[] = (diagram.relationships || []).map((rel: any, index: number) => {
        // Calculate relationship index (for multiple relationships between same nodes)
        const existingEdgesBetweenNodes = (diagram.relationships || []).slice(0, index).filter(
          (r: any) =>
            (r.fromId === rel.fromId && r.toId === rel.toId) ||
            (r.fromId === rel.toId && r.toId === rel.fromId)
        );
        const relationshipIndex = existingEdgesBetweenNodes.length;

        return {
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          type: 'default',
          label: formatRelationshipLabel(rel.type),
          labelShowBg: true,
          labelBgStyle: { fill: '#ffffff' },
          labelBgPadding: [8, 4] as [number, number],
          data: {
            relationshipType: rel.type,
            relationshipIndex,
            priority: rel.priority || 5,
            reason: rel.reason || 'Template relationship',
            flowDirection: rel.flowDirection,
            doorType: rel.doorType,
            flowType: rel.flowType,
            minDistance: rel.minDistance,
            maxDistance: rel.maxDistance,
            mode: 'creation' as const,
            edgeStyle,
          },
        };
      });

      console.log('🔄 Converted template data:', {
        nodes: templateNodes.length,
        edges: templateEdges.length,
      });

      // Add template nodes and edges to the canvas
      setNodes(templateNodes);
      setEdges(templateEdges);

      // Update diagram info
      setCurrentDiagramName(diagram.name);
      setCurrentDiagramId(null); // New diagram from template

      console.log('✅ Template applied successfully');
      onShowMessage?.(`Template "${diagram.name}" applied successfully! ${templateNodes.length} rooms added.`, 'success');
    } catch (error) {
      console.error('❌ Failed to apply template:', error);
      onShowMessage?.('Failed to apply template. Please try again.', 'error');
    }
  }, [edgeStyle, onShowMessage]);

  // Handle import from Neo4j
  const handleImportFromNeo4j = useCallback(async () => {
    try {
      console.log('📥 Importing entire Neo4j graph...');
      onShowMessage?.('Importing graph from Neo4j...', 'info');

      // Fetch the entire Neo4j graph
      const graphData = await apiService.importEntireNeo4jGraph();

      if (!graphData.nodes || graphData.nodes.length === 0) {
        onShowMessage?.('No data found in Neo4j database.', 'warning');
        return;
      }

      console.log('📊 Received graph data:', {
        nodes: graphData.nodes.length,
        relationships: graphData.relationships.length
      });

      // Import auto-layout utility
      const { autoLayout } = await import('../../utils/autoLayout');

      // Apply auto-layout to position nodes
      const layoutNodes = graphData.nodes.map(node => ({ id: node.id }));
      const layoutEdges = graphData.relationships.map(rel => ({
        fromId: rel.fromId,
        toId: rel.toId
      }));

      const positions = autoLayout(layoutNodes, layoutEdges, 'force-directed', {
        width: 1400,
        height: 900,
        iterations: 250,
        nodeSpacing: 180,
        edgeLength: 220
      });

      // Match Neo4j nodes to templates
      const importedNodes: Node[] = graphData.nodes.map((node: any) => {
        // Try to find matching template
        const matchingTemplate = templates.find(
          t => t.name === node.name ||
            t.category === node.category ||
            (t.id && t.id.includes(node.name.toLowerCase().replace(/\s+/g, '-')))
        );

        const position = positions.get(node.id) || { x: 100, y: 100 };

        return {
          id: node.id,
          type: 'functionalArea',
          position,
          data: {
            label: node.name,
            name: node.name,
            category: node.category || 'Unknown',
            cleanroomClass: node.cleanroomClass || 'N/A',
            description: node.description || '',
            equipment: node.equipment || [],
            color: node.color || matchingTemplate?.color || '#90CAF9',
            width: matchingTemplate?.defaultSize?.width || 150,
            height: matchingTemplate?.defaultSize?.height || 100,
          },
        };
      });

      // Convert relationships to edges
      const importedEdges: Edge[] = graphData.relationships.map((rel: any, index: number) => {
        // Calculate relationship index for multiple relationships between same nodes
        const existingEdgesBetweenNodes = graphData.relationships.slice(0, index).filter(
          (r: any) =>
            (r.fromId === rel.fromId && r.toId === rel.toId) ||
            (r.fromId === rel.toId && r.toId === rel.fromId)
        );
        const relationshipIndex = existingEdgesBetweenNodes.length;

        return {
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          type: 'default',
          label: rel.type.replace(/_/g, ' '),
          labelShowBg: true,
          labelBgStyle: { fill: '#ffffff' },
          labelBgPadding: [8, 4] as [number, number],
          data: {
            relationshipType: rel.type,
            relationshipIndex,
            priority: rel.priority || 5,
            reason: rel.reason || 'Imported from Neo4j',
            flowDirection: rel.flowDirection,
            doorType: rel.doorType,
            flowType: rel.flowType,
            minDistance: rel.minDistance,
            maxDistance: rel.maxDistance,
            mode: 'creation' as const,
            edgeStyle,
          },
        };
      });

      console.log('✅ Converted to ReactFlow format:', {
        nodes: importedNodes.length,
        edges: importedEdges.length
      });

      // Replace canvas content with imported graph
      setNodes(importedNodes);
      setEdges(importedEdges);

      // Clear current diagram info
      setCurrentDiagramId(null);
      setCurrentDiagramName(null);

      onShowMessage?.(
        `Successfully imported ${importedNodes.length} nodes and ${importedEdges.length} relationships from Neo4j!`,
        'success'
      );
    } catch (error) {
      console.error('❌ Failed to import from Neo4j:', error);
      onShowMessage?.(
        `Failed to import from Neo4j: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      );
    }
  }, [templates, edgeStyle, onShowMessage]);

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Node Palette */}
      <NodePalette
        templates={templates}
        mode={mode}
        isVisible={true}
        isCollapsed={paletteCollapsed}
        onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
        onCreateCustomNode={handleCreateCustomNode}
      />

      {/* ReactFlow Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {/* Toolbar with Save, Load, and Upload buttons */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            display: 'flex',
            gap: 1,
          }}
        >
          <Tooltip title="Save diagram to database">
            <Button
              variant="contained"
              color="success"
              startIcon={<Save />}
              onClick={handleSaveButtonClick}
              disabled={nodes.length === 0}
              sx={{ boxShadow: 2 }}
            >
              {currentDiagramId ? 'Update' : 'Save'}
            </Button>
          </Tooltip>

          <Tooltip title="Load saved diagram">
            <Button
              variant="contained"
              color="info"
              startIcon={<FolderOpen />}
              onClick={handleLoadButtonClick}
              sx={{ boxShadow: 2 }}
            >
              Load
            </Button>
          </Tooltip>

          <Tooltip title="Upload diagram to Neo4j Knowledge Graph">
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudUpload />}
              onClick={handleSaveDiagram}
              disabled={nodes.length === 0}
              sx={{ boxShadow: 2 }}
            >
              Upload to Neo4j
            </Button>
          </Tooltip>

          <Tooltip title="Create facility from template">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Factory />}
              onClick={() => setTemplateDialogOpen(true)}
              sx={{ boxShadow: 2 }}
            >
              Templates
            </Button>
          </Tooltip>

          <Tooltip title="Import entire Neo4j graph (reverse engineering)">
            <Button
              variant="contained"
              color="warning"
              startIcon={<Download />}
              onClick={handleImportFromNeo4j}
              sx={{ boxShadow: 2 }}
            >
              Import Neo4j
            </Button>
          </Tooltip>
        </Box>

        {/* Edge Style Toggle */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
            backgroundColor: 'white',
            borderRadius: 1,
            boxShadow: 2,
            padding: 0.5,
          }}
        >
          <Tooltip title="Edge Style">
            <ToggleButtonGroup
              value={edgeStyle}
              exclusive
              onChange={(e, newStyle) => {
                if (newStyle !== null) {
                  setEdgeStyle(newStyle);
                  // Update existing edges with new style
                  setEdges((eds) =>
                    eds.map((edge) => ({
                      ...edge,
                      data: { ...edge.data, edgeStyle: newStyle },
                    }))
                  );
                }
              }}
              size="small"
            >
              <ToggleButton value="straight" aria-label="straight lines">
                <Tooltip title="Straight Lines">
                  <ShowChart />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="curved" aria-label="curved lines">
                <Tooltip title="Curved Lines">
                  <Timeline />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
        </Box>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          connectionMode={ConnectionMode.Loose}
          fitView
          onlyRenderVisibleElements={true}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={4}
          deleteKeyCode="Delete"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>

        {/* Relationship Edit Dialog */}
        <InlineRelationshipEditDialog
          open={editDialogOpen}
          edge={selectedEdge}
          nodes={nodes}
          onClose={handleDialogClose}
          onUpdate={handleRelationshipUpdate}
          onDelete={handleRelationshipDelete}
        />
      </Box>

      {/* Property Panel */}
      {selectedNode && (
        <PropertyPanel
          selectedNode={selectedNode}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onClose={handleClosePropertyPanel}
          mode={mode}
          connectionStatus="disconnected"
          guidedSuggestions={[]}
          groups={[]}
          isVisible={propertyPanelVisible}
        />
      )}

      {/* Save Diagram Dialog */}
      <SaveDiagramDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveWithName}
        nodeCount={nodes.length}
        relationshipCount={edges.length}
      />

      {/* Load Diagram Dialog */}
      <LoadDiagramDialog
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        onLoad={handleLoadDiagram}
      />

      {/* Facility Template Selector */}
      <FacilityTemplateSelector
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onTemplateApplied={handleTemplateApplied}
      />


    </Box>
  );
};

// Wrapper with ReactFlowProvider
const CreationMode: React.FC<CreationModeProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CreationModeInner {...props} />
    </ReactFlowProvider>
  );
};

export default CreationMode;
