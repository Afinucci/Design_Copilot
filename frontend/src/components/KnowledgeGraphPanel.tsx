import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  Divider,
  Chip,
  Tooltip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Close,
  FilterList,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Save,
  Fullscreen,
  Settings,
} from '@mui/icons-material';
import useKnowledgeGraph from '../hooks/useKnowledgeGraph';

// Types for knowledge graph data
interface KnowledgeGraphNode {
  id: string;
  name: string;
  category: string;
  cleanroomGrade?: string;
  description?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  color?: string;
  val?: number;
}

interface KnowledgeGraphLink {
  source: string | KnowledgeGraphNode;
  target: string | KnowledgeGraphNode;
  type: string;
  confidence: number;
  reason: string;
  value?: number;
  color?: string;
}

interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

interface KnowledgeGraphPanelProps {
  onNodeMaterialize?: (nodeData: any) => void;
  className?: string;
}

// Category colors for pharmaceutical functional areas
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Production': '#FF6B6B',
    'Quality Control': '#4ECDC4', 
    'Support': '#45B7D1',
    'Utilities': '#F7DC6F',
    'Storage': '#BB8FCE',
    'Administrative': '#85C1E9',
    'Unknown': '#BDC3C7',
  };
  return colors[category] || colors['Unknown'];
};

// Relationship type colors
const getRelationshipColor = (type: string): string => {
  const colors: Record<string, string> = {
    'ADJACENT_TO': '#3498DB',
    'MATERIAL_FLOW': '#E74C3C',
    'PERSONNEL_FLOW': '#2ECC71',
    'REQUIRES_ACCESS': '#F39C12',
    'SHARES_UTILITY': '#9B59B6',
    'COMPLIANCE_RELATED': '#E67E22',
  };
  return colors[type] || '#95A5A6';
};

const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({
  onNodeMaterialize,
  className,
}) => {
  const fgRef = useRef<any>(null);
  const {
    state,
    closePanel,
    setRelationshipFilter,
    setConfidenceThreshold,
    setShowLabels,
    setShowParticles,
    filteredGraphData,
    relationshipTypes,
  } = useKnowledgeGraph();

  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<KnowledgeGraphNode | null>(null);

  // Update selected node when graph data changes
  useEffect(() => {
    if (state.selectedNodeId && filteredGraphData.nodes.length > 0) {
      const centerNode = filteredGraphData.nodes.find(n => n.id === state.selectedNodeId);
      if (centerNode) {
        setSelectedNode(centerNode);
      }
    }
  }, [state.selectedNodeId, filteredGraphData]);

  // Handle node click - for materialization
  const handleNodeClick = useCallback((node: KnowledgeGraphNode) => {
    console.log('🎯 KnowledgeGraphPanel: Node clicked:', node);
    setSelectedNode(node);
    
    if (onNodeMaterialize && node.id !== state.selectedNodeId) {
      onNodeMaterialize({
        id: node.id,
        name: node.name,
        category: node.category,
        cleanroomGrade: node.cleanroomGrade,
        description: node.description,
        position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 150 },
      });
    }
  }, [onNodeMaterialize, state.selectedNodeId]);

  // Handle node hover
  const handleNodeHover = useCallback((node: KnowledgeGraphNode | null) => {
    setHoveredNode(node);
  }, []);

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: KnowledgeGraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!state.showLabels && globalScale < 2) return;
    
    const label = node.name;
    const fontSize = Math.max(12 / globalScale, 3);
    ctx.font = `${fontSize}px 'Roboto', Arial, sans-serif`;
    
    // Calculate text dimensions
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth + fontSize * 0.6, fontSize * 1.4];
    
    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
    
    // Draw border for selected node
    if (node === selectedNode) {
      ctx.strokeStyle = '#1976D2';
      ctx.lineWidth = 2 / globalScale;
      ctx.strokeRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
    }
    
    // Draw text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = node.color || '#333';
    ctx.fillText(label, node.x!, node.y!);
    
    // Store dimensions for hit detection
    (node as any).__bckgDimensions = bckgDimensions;
  }, [selectedNode, state.showLabels]);

  // Custom node pointer area
  const nodePointerAreaPaint = useCallback((node: KnowledgeGraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    const bckgDimensions = (node as any).__bckgDimensions;
    if (bckgDimensions) {
      ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
    } else {
      // Fallback to circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, 8, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  }, []);

  // Panel visibility check
  if (!state.isOpen) return null;

  return (
    <Paper
      elevation={8}
      className={className}
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: 600,
        height: '90vh',
        zIndex: 2000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#1976D2',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Knowledge Graph Explorer
        </Typography>
        <IconButton size="small" onClick={closePanel} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </Box>

      {/* Selected Node Info */}
      {selectedNode && (
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {selectedNode.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              size="small" 
              label={selectedNode.category} 
              sx={{ backgroundColor: selectedNode.color, color: 'white' }}
            />
            {selectedNode.cleanroomGrade && (
              <Chip size="small" label={`Grade ${selectedNode.cleanroomGrade}`} />
            )}
          </Box>
          {hoveredNode && hoveredNode !== selectedNode && (
            <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
              Hovering: {hoveredNode.name} ({hoveredNode.category})
            </Typography>
          )}
        </Box>
      )}

      {/* Controls */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Relationships</InputLabel>
            <Select
              value={state.relationshipFilter}
              label="Relationships"
              onChange={(e) => setRelationshipFilter(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              {relationshipTypes.map((type: string) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={state.showLabels} onChange={(e) => setShowLabels(e.target.checked)} />}
              label="Labels"
              sx={{ fontSize: '0.875rem' }}
            />
            <FormControlLabel
              control={<Switch checked={state.showParticles} onChange={(e) => setShowParticles(e.target.checked)} />}
              label="Flow"
              sx={{ fontSize: '0.875rem' }}
            />
          </Box>
        </Box>
        
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" gutterBottom>
            Confidence Threshold: {state.confidenceThreshold}
          </Typography>
          <Slider
            value={state.confidenceThreshold}
            onChange={(_, value) => setConfidenceThreshold(value as number)}
            min={0}
            max={1}
            step={0.1}
            size="small"
          />
        </Box>
      </Box>

      {/* Graph Visualization */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {state.isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography>Loading knowledge graph...</Typography>
          </Box>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredGraphData}
            width={600}
            height={400}
            backgroundColor="#ffffff"
            nodeId="id"
            nodeLabel={(node: KnowledgeGraphNode) => `
              <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-family: Roboto;">
                <strong>${node.name}</strong><br/>
                Category: ${node.category}<br/>
                ${node.cleanroomGrade ? `Grade: ${node.cleanroomGrade}<br/>` : ''}
                ${node.description || ''}
              </div>
            `}
            nodeRelSize={8}
            nodeCanvasObject={state.showLabels ? nodeCanvasObject : undefined}
            nodePointerAreaPaint={state.showLabels ? nodePointerAreaPaint : undefined}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            linkLabel={(link: KnowledgeGraphLink) => `
              <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-family: Roboto;">
                <strong>${link.type}</strong><br/>
                Confidence: ${(link.confidence * 100).toFixed(0)}%<br/>
                ${link.reason}
              </div>
            `}
            linkColor="color"
            linkWidth={2}
            linkDirectionalParticles={state.showParticles ? 2 : 0}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.008}
            d3VelocityDecay={0.3}
            cooldownTicks={100}
            onEngineStop={() => {
              // Center the graph on the selected node
              if (fgRef.current && selectedNode) {
                fgRef.current.centerAt(selectedNode.x, selectedNode.y, 1000);
              }
            }}
          />
        )}
      </Box>

      {/* Footer with stats */}
      <Box sx={{ p: 1, backgroundColor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Nodes: {filteredGraphData.nodes.length} | Relationships: {filteredGraphData.links.length}
          {hoveredNode && ` | Click node to add to diagram`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default KnowledgeGraphPanel;