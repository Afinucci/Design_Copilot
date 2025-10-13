import React, { useState, useCallback } from 'react';
import { Box, IconButton, Tooltip, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Timeline, ShowChart } from '@mui/icons-material';
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
import CustomNode from '../CustomNode';
import CustomShapeNode from '../CustomShapeNode';
import MultiRelationshipEdge from '../MultiRelationshipEdge';
import InlineRelationshipEditDialog from '../InlineRelationshipEditDialog';
import { NodeTemplate, AppMode, SpatialRelationship, DiagramEdge } from '../../types';
import { apiService } from '../../services/api';

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
}

const CreationModeInner: React.FC<CreationModeProps> = ({ mode, onSave, onLoad }) => {
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

  // Load templates on mount
  React.useEffect(() => {
    apiService.getNodeTemplates()
      .then(setTemplates)
      .catch(err => {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      });
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

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'default',
        data: {
          relationshipType: 'ADJACENT_TO', // Default type
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
            return {
              ...edge,
              data: {
                ...edge.data,
                relationshipType: updates.type || edge.data?.relationshipType,
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

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Node Palette */}
      <NodePalette
        templates={templates}
        mode={mode}
        isVisible={true}
        isCollapsed={paletteCollapsed}
        onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
      />

      {/* ReactFlow Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
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
          onDrop={onDrop}
          onDragOver={onDragOver}
          connectionMode={ConnectionMode.Loose}
          fitView
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
