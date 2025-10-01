import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlowProvider,
  useReactFlow,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  Connection,
  ConnectionLineType,
} from 'reactflow';
import { Box, Paper, Typography, Chip } from '@mui/material';
import CustomNode from './CustomNode';
import MultiRelationshipEdge from './MultiRelationshipEdge';
import ErrorBoundary from './ErrorBoundary';
import { useSnapToGrid } from '../hooks/useSnapToGrid';
import { useSnapConnection } from '../hooks/useSnapConnection';
// Removed useGuidedAdjacency hook dependency as guided mode is deprecated
import { AdjacencyHighlights } from './AdjacencyHighlights';
import { getConnectorMetadata } from '../services/connectorLogic';
import { NodeData, DiagramEdge, SpatialRelationship } from '../types';
import 'reactflow/dist/style.css';

const defaultNodeTypes = {
  functionalArea: CustomNode,
};

const defaultEdgeTypes = {
  multiRelationship: MultiRelationshipEdge,
};

interface SnapCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onSnapConnection: (sourceId: string, targetId: string, relationships: Partial<SpatialRelationship>[]) => void;
  showSnapGuides?: boolean;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onConnect?: (connection: Connection) => void;
  isValidConnection?: (connection: Connection) => boolean;
  onConnectStart?: (event: any, params: any) => void;
  onConnectEnd?: (event: any) => void;
  // Guided mode behavior: don't render adjacency edges, allow overlap only if adjacency exists
  guidedNoAdjacencyEdges?: boolean;
}

const SnapCanvasCore: React.FC<SnapCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSnapConnection,
  showSnapGuides = true,
  nodeTypes = defaultNodeTypes,
  edgeTypes = defaultEdgeTypes,
  onConnect,
  isValidConnection,
  onConnectStart,
  onConnectEnd,
  guidedNoAdjacencyEdges = false,
}) => {
  const { project } = useReactFlow();
  const [snapIndicators, setSnapIndicators] = useState<
    Array<{ id: string; x: number; y: number; active: boolean }>
  >([]);

  // Use the snap connection hook
  const { previewConnection, handleSnapConnection } = useSnapConnection({
    nodes,
    edges,
    onSnapConnection,
    hideAdjacencyEdges: guidedNoAdjacencyEdges,
  });

  // Manage drag state at component level to avoid circular dependencies
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Stubbed out guided adjacency functionality
  const adjacencyRules: any[] = [];
  const canNodesBeAdjacent = () => true;
  const areNodesProhibited = () => false;
  const edgeHighlights: any[] = [];

  const {
    getSnappedPosition,
    handleNodeDragStart: snapHandleNodeDragStart,
    handleNodeDrag,
    handleNodeDragStop: snapHandleNodeDragStop,
    getVisualGuides,
  } = useSnapToGrid({
    nodes,
    edges,
    gridSize: 20,
    snapDistance: 50,
    onSnapConnection: handleSnapConnection,
    guidedNoAdjacencyEdges,
    // Pass adjacency rules to snap logic
    canNodesBeAdjacent: guidedNoAdjacencyEdges ? canNodesBeAdjacent : undefined,
    areNodesProhibited: guidedNoAdjacencyEdges ? areNodesProhibited : undefined,
  });

  // Wrap snap handlers to update component-level drag state
  const handleNodeDragStart = useCallback((nodeId: string) => {
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    snapHandleNodeDragStart(nodeId);
  }, [snapHandleNodeDragStart]);

  const handleNodeDragStop = useCallback(() => {
    setIsDragging(false);
    setDraggedNodeId(null);
    snapHandleNodeDragStop();
  }, [snapHandleNodeDragStop]);

  // Handle node position changes with snapping
  const handleNodeChanges = useCallback(
    (changes: NodeChange[]) => {
      const updatedChanges = changes.map((change) => {
        if (change.type === 'position' && change.dragging && change.position) {
          const node = nodes.find((n) => n.id === change.id);
          if (node) {
            const snappedPosition = handleNodeDrag(change.id, change.position);
            return { ...change, position: snappedPosition };
          }
        }
        return change;
      });

      const updatedNodes = applyNodeChanges(updatedChanges, nodes);
      onNodesChange(updatedNodes);

      // Handle drag events - check if drag state actually changed
      updatedChanges.forEach((change) => {
        if (change.type === 'position') {
          if (change.dragging === true && draggedNodeId !== change.id) {
            // Only call start if we're not already dragging this node
            handleNodeDragStart(change.id);
          } else if (change.dragging === false && draggedNodeId) {
            // Only call stop if we were dragging
            handleNodeDragStop();
          }
        }
      });
    },
    [nodes, handleNodeDrag, handleNodeDragStart, handleNodeDragStop, onNodesChange, draggedNodeId]
  );

  // Handle edge changes
  const handleEdgeChanges = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      onEdgesChange(updatedEdges);
    },
    [edges, onEdgesChange]
  );

  // Update snap indicators
  useEffect(() => {
    if (showSnapGuides && isDragging) {
      const guides = getVisualGuides();
      setSnapIndicators(
        guides.map((guide, index) => ({
          id: `snap-${index}`,
          x: guide.x,
          y: guide.y,
          active: guide.isActive,
        }))
      );
    } else {
      setSnapIndicators([]);
    }
  }, [isDragging, getVisualGuides, showSnapGuides]);

  // Create preview edge
  const previewEdge = previewConnection
    ? {
        id: 'preview-edge',
        source: previewConnection.source,
        target: previewConnection.target,
        type: 'multiRelationship',
        data: {
          relationshipType: previewConnection.type,
          isPreview: true,
          // In guided mode, show personnel movement as an icon rather than a line
          renderAsIcon: guidedNoAdjacencyEdges && previewConnection.type === 'PERSONNEL_FLOW',
        },
        style: {
          ...getConnectorMetadata(previewConnection.type as SpatialRelationship['type']),
          opacity: 0.5,
        },
        animated: true,
      }
    : null;

  // In guided mode, hide adjacency edges, and mark personnel flows to render as icon
  const baseEdges = guidedNoAdjacencyEdges
    ? edges
        .filter((e) => (e.data as any)?.relationshipType !== 'ADJACENT_TO')
        .map((e) => ({
          ...e,
          data: {
            ...(e.data as any),
            renderAsIcon:
              (e.data as any)?.relationshipType === 'PERSONNEL_FLOW' ? true : (e.data as any)?.renderAsIcon,
          },
        }))
    : edges;
  const allEdges = previewEdge ? [...baseEdges, previewEdge] : baseEdges;

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={allEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodeChanges}
        onEdgesChange={handleEdgeChanges}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Straight}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'multiRelationship',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />

        {/* Adjacency highlights for guided mode */}
        {guidedNoAdjacencyEdges && (
          <AdjacencyHighlights
            nodes={nodes}
            edges={edges}
            isDragging={isDragging}
            draggedNodeId={draggedNodeId}
          />
        )}

        {/* Snap indicators */}
        {showSnapGuides &&
          snapIndicators.map((indicator) => (
            <div
              key={indicator.id}
              style={{
                position: 'absolute',
                left: indicator.x - 5,
                top: indicator.y - 5,
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: indicator.active ? '#4CAF50' : '#2196F3',
                opacity: indicator.active ? 0.8 : 0.4,
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
      </ReactFlow>

      {/* Snap feedback */}
      {isDragging && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 1,
            backgroundColor: 'primary.main',
            color: 'white',
            zIndex: 1000,
          }}
        >
          <Typography variant="caption">
            Drag near other nodes to snap and auto-connect
          </Typography>
        </Paper>
      )}

      {/* Connection preview */}
      {previewConnection && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            p: 2,
            backgroundColor: 'background.paper',
            boxShadow: 3,
            zIndex: 1000,
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Creating connection:
          </Typography>
          <Chip
            label={previewConnection.type.replace(/_/g, ' ')}
            color="primary"
            size="small"
            sx={{
              backgroundColor: getConnectorMetadata(
                previewConnection.type as SpatialRelationship['type']
              ).color,
              color: 'white',
            }}
          />
        </Paper>
      )}
    </>
  );
};

// Wrapper component with ReactFlowProvider and ErrorBoundary
const SnapCanvas: React.FC<SnapCanvasProps> = (props) => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('SnapCanvas Error:', error, errorInfo);
        // Could send to error tracking service here
      }}
    >
      <ReactFlowProvider>
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
          <SnapCanvasCore {...props} />
        </Box>
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default SnapCanvas;