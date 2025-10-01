import React, { useState, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { Node, Edge } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';
import NodePalette from '../NodePalette';
import SnapCanvas from '../SnapCanvas';
import PropertyPanel from '../PropertyPanel';
import ValidationPanel from '../ValidationPanel';
import KnowledgeGraphPanel from '../KnowledgeGraphPanel';
import { NodeTemplate, SpatialRelationship, AppMode, NodeData } from '../../types';
import { apiService } from '../../services/api';
import 'reactflow/dist/style.css';

interface CreationModeProps {
  mode: AppMode;
  onSave?: (data: { nodes: Node[]; edges: Edge[] }) => void;
  onLoad?: () => void;
}

const CreationMode: React.FC<CreationModeProps> = ({ mode, onSave, onLoad }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [templates, setTemplates] = useState<NodeTemplate[]>([]);
  const [selectedNode] = useState<Node | null>(null);

  // Load templates on mount
  useEffect(() => {
    apiService.getNodeTemplates()
      .then(setTemplates)
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  const handleNodesChange = useCallback((changes: Node[]) => {
    setNodes(changes);
  }, []);

  const handleEdgesChange = useCallback((changes: Edge[]) => {
    setEdges(changes);
  }, []);

  const handleSnapConnection = useCallback((
    sourceId: string,
    targetId: string,
    relationships: Partial<SpatialRelationship>[]
  ) => {
    const newEdge: Edge = {
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'multiRelationship',
      data: {
        relationships: relationships.map(rel => ({
          ...rel,
          reason: rel.reason || 'User-defined connection',
          priority: rel.priority || 1,
        })),
      },
    };
    setEdges(prev => [...prev, newEdge]);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const templateData = event.dataTransfer.getData('application/reactflow');
    if (!templateData) return;

    const template: NodeTemplate = JSON.parse(templateData);
    const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();

    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    };

    const newNode: Node = {
      id: `${template.id}-${Date.now()}`,
      type: 'functionalArea',
      position,
      data: {
        label: template.name,
        name: template.name,
        category: template.category,
        cleanroomClass: template.cleanroomClass,
        color: template.color,
        width: template.defaultSize?.width,
        height: template.defaultSize?.height,
      } as NodeData,
    };

    setNodes(prev => [...prev, newNode]);
  }, []);

  const handleCreateCustomNode = useCallback((nodeTemplate: Omit<NodeTemplate, 'id'>) => {
    // Generate a unique ID for the custom node template
    const customId = `custom-${nodeTemplate.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    const newTemplate: NodeTemplate = {
      ...nodeTemplate,
      id: customId,
    };

    // Add the new template to the templates list
    setTemplates(prev => [...prev, newTemplate]);
    
    console.log('Custom node template created:', newTemplate);
  }, []);

  return (
    <ReactFlowProvider>
      <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        {/* Left Panel - Node Palette */}
        <NodePalette
          templates={templates}
          mode={mode}
          isVisible={true}
          onCreateCustomNode={handleCreateCustomNode}
        />

        {/* Center - Canvas */}
        <Box
          sx={{ flexGrow: 1, position: 'relative' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <SnapCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSnapConnection={handleSnapConnection}
            showSnapGuides={true}
          />
        </Box>

        {/* Right Panel - Properties & Validation */}
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'background.paper' }}>
          {selectedNode && (
            <PropertyPanel
              selectedNode={selectedNode}
              onUpdateNode={(updatedNode: Node) => {
                setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
              }}
              onDeleteNode={(nodeId: string) => {
                setNodes(prev => prev.filter(n => n.id !== nodeId));
              }}
              mode={mode}
            />
          )}

          <ValidationPanel
            validationResult={{
              isValid: true,
              violations: []
            }}
            onViolationClick={(violation) => {
              console.log('Violation clicked:', violation);
            }}
          />

          {mode === 'creation' && (
            <KnowledgeGraphPanel
              onNodeMaterialize={(nodeData: any) => {
                console.log('Node materialized:', nodeData);
              }}
            />
          )}
        </Box>
      </Box>
    </ReactFlowProvider>
  );
};

export default CreationMode;
