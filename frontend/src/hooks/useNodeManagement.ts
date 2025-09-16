import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { DiagramEdge, NodeData, GhostState, GhostSuggestion } from '../types';

interface UseNodeManagementProps {
  nodes: Node[];
  edges: DiagramEdge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: DiagramEdge[] | ((edges: DiagramEdge[]) => DiagramEdge[])) => void;
}

export const useNodeManagement = ({ 
  nodes, 
  edges, 
  setNodes, 
  setEdges 
}: UseNodeManagementProps) => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdge | null>(null);
  const nodeIdCounter = useRef(0);

  // Generate unique node ID
  const generateNodeId = useCallback((templateId: string): string => {
    nodeIdCounter.current += 1;
    return `node-${templateId}-${Date.now()}-${nodeIdCounter.current}`;
  }, []);

  // Handle node deletion
  const onNodesDelete = useCallback((nodesToDelete: Node[]) => {
    // Remove nodes from canvas
    setNodes((nds) => nds.filter((node) => !nodesToDelete.find(n => n.id === node.id)));
    
    // Remove any edges connected to deleted nodes
    const nodeIds = nodesToDelete.map(n => n.id);
    setEdges((eds) => eds.filter((edge) => 
      !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
    ));

    // Clear selection if deleted node was selected
    if (selectedNode && nodesToDelete.find(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete: DiagramEdge[]) => {
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find(e => e.id === edge.id)));
    
    // Clear selection if deleted edge was selected
    if (selectedEdge && edgesToDelete.find(e => e.id === selectedEdge.id)) {
      setSelectedEdge(null);
    }
  }, [selectedEdge, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: DiagramEdge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, updates: Partial<NodeData>) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  }, [setNodes]);

  // Update edge data
  const updateEdgeData = useCallback((edgeId: string, updates: any) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...updates } }
          : edge
      )
    );
  }, [setEdges]);

  return {
    selectedNode,
    selectedEdge,
    setSelectedNode,
    setSelectedEdge,
    generateNodeId,
    onNodesDelete,
    onEdgesDelete,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    updateNodeData,
    updateEdgeData,
  };
};