import React, { useState, useCallback } from 'react';
import { Box } from '@mui/material';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import NodePalette from '../NodePalette';
import { NodeTemplate, AppMode } from '../../types';
import { apiService } from '../../services/api';

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
        type: 'default',
        position,
        data: {
          label: template.name,
          ...template,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance]
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Node Palette */}
      <NodePalette
        templates={templates}
        mode={mode}
        isVisible={true}
      />

      {/* ReactFlow Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
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
