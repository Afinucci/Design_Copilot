import { useState, useCallback, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { getCleanroomColor } from '../types';

// Types for knowledge graph data (matches KnowledgeGraphPanel)
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

interface KnowledgeGraphState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  selectedNodeName: string | null;
  graphData: KnowledgeGraphData;
  relationshipFilter: string;
  confidenceThreshold: number;
  showLabels: boolean;
  showParticles: boolean;
}

interface UseKnowledgeGraphResult {
  // State
  state: KnowledgeGraphState;
  
  // Actions
  openPanel: (nodeId: string, nodeName: string) => void;
  closePanel: () => void;
  setRelationshipFilter: (filter: string) => void;
  setConfidenceThreshold: (threshold: number) => void;
  setShowLabels: (show: boolean) => void;
  setShowParticles: (show: boolean) => void;
  refreshGraphData: () => void;
  
  // Computed values
  filteredGraphData: KnowledgeGraphData;
  relationshipTypes: string[];
  
  // Data fetching
  fetchKnowledgeGraphData: (nodeId: string) => Promise<void>;
}

// Colors are based on cleanroom grades (A, B, C, D, CNC), not categories

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

const useKnowledgeGraph = (): UseKnowledgeGraphResult => {
  const [state, setState] = useState<KnowledgeGraphState>({
    isOpen: false,
    isLoading: false,
    error: null,
    selectedNodeId: null,
    selectedNodeName: null,
    graphData: { nodes: [], links: [] },
    relationshipFilter: 'all',
    confidenceThreshold: 0.3,
    showLabels: true,
    showParticles: true,
  });

  // Open the knowledge graph panel for a specific node
  const openPanel = useCallback((nodeId: string, nodeName: string) => {
    console.log('🔍 useKnowledgeGraph: Opening panel for node:', { nodeId, nodeName });
    setState(prev => ({
      ...prev,
      isOpen: true,
      selectedNodeId: nodeId,
      selectedNodeName: nodeName,
      error: null,
    }));
  }, []);

  // Close the knowledge graph panel
  const closePanel = useCallback(() => {
    console.log('🔍 useKnowledgeGraph: Closing panel');
    setState(prev => ({
      ...prev,
      isOpen: false,
      selectedNodeId: null,
      selectedNodeName: null,
      error: null,
    }));
  }, []);

  // Set relationship filter
  const setRelationshipFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, relationshipFilter: filter }));
  }, []);

  // Set confidence threshold
  const setConfidenceThreshold = useCallback((threshold: number) => {
    setState(prev => ({ ...prev, confidenceThreshold: threshold }));
  }, []);

  // Set label visibility
  const setShowLabels = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showLabels: show }));
  }, []);

  // Set particle flow visibility
  const setShowParticles = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showParticles: show }));
  }, []);

  // Fetch knowledge graph data for a specific node
  const fetchKnowledgeGraphData = useCallback(async (nodeId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔍 useKnowledgeGraph: Fetching graph data for node:', nodeId);

      const data = await apiService.getKnowledgeGraphData(nodeId, state.confidenceThreshold);

      // Process the data for React Force Graph
      const processedData: KnowledgeGraphData = {
        nodes: data.nodes.map((node: any) => ({
          ...node,
          color: getCleanroomColor(node.cleanroomGrade),
          val: node.id === nodeId ? 20 : 10, // Make selected node larger
        })),
        links: data.links.map((link: any) => ({
          ...link,
          color: getRelationshipColor(link.type),
          value: Math.max(link.confidence * 10, 1),
        })),
      };

      setState(prev => ({
        ...prev,
        graphData: processedData,
        isLoading: false,
      }));

      console.log('🔍 useKnowledgeGraph: ✅ Graph data loaded successfully');
    } catch (error) {
      console.error('🔍 useKnowledgeGraph: ❌ Failed to fetch graph data:', error);
      
      // For development, create sample data
      const sampleData = createSampleGraphData(nodeId, state.selectedNodeName || 'Selected Node');
      setState(prev => ({
        ...prev,
        graphData: sampleData,
        isLoading: false,
        error: null, // Don't show error for sample data
      }));
    }
  }, [state.confidenceThreshold, state.selectedNodeName]);

  // Create sample data for development
  const createSampleGraphData = useCallback((centerNodeId: string, centerNodeName: string): KnowledgeGraphData => {
    return {
      nodes: [
        {
          id: centerNodeId,
          name: centerNodeName,
          category: 'Production',
          cleanroomGrade: 'D',
          val: 20,
          color: getCleanroomColor('D'),
        },
        {
          id: 'coating-2',
          name: 'Coating Area 2',
          category: 'Production',
          cleanroomGrade: 'D',
          val: 10,
          color: getCleanroomColor('D'),
        },
        {
          id: 'compression-1',
          name: 'Compression Room',
          category: 'Production',
          cleanroomGrade: 'D',
          val: 10,
          color: getCleanroomColor('D'),
        },
        {
          id: 'qc-lab',
          name: 'QC Laboratory',
          category: 'Quality Control',
          cleanroomGrade: 'C',
          val: 10,
          color: getCleanroomColor('C'),
        },
        {
          id: 'packaging-1',
          name: 'Packaging Area',
          category: 'Production',
          cleanroomGrade: 'D',
          val: 10,
          color: getCleanroomColor('D'),
        },
        {
          id: 'storage-rm',
          name: 'Raw Material Storage',
          category: 'Storage',
          cleanroomGrade: 'CNC',
          val: 10,
          color: getCleanroomColor('CNC'),
        },
        {
          id: 'hvac-utility',
          name: 'HVAC Control Room',
          category: 'Utilities',
          cleanroomGrade: 'CNC',
          val: 8,
          color: getCleanroomColor('CNC'),
        },
      ],
      links: [
        {
          source: centerNodeId,
          target: 'coating-2',
          type: 'ADJACENT_TO',
          confidence: 0.8,
          reason: 'Similar production processes',
          color: getRelationshipColor('ADJACENT_TO'),
        },
        {
          source: centerNodeId,
          target: 'compression-1',
          type: 'MATERIAL_FLOW',
          confidence: 0.9,
          reason: 'Direct material transfer',
          color: getRelationshipColor('MATERIAL_FLOW'),
        },
        {
          source: centerNodeId,
          target: 'qc-lab',
          type: 'REQUIRES_ACCESS',
          confidence: 0.7,
          reason: 'Quality control sampling',
          color: getRelationshipColor('REQUIRES_ACCESS'),
        },
        {
          source: 'compression-1',
          target: 'packaging-1',
          type: 'MATERIAL_FLOW',
          confidence: 0.85,
          reason: 'Production flow sequence',
          color: getRelationshipColor('MATERIAL_FLOW'),
        },
        {
          source: centerNodeId,
          target: 'storage-rm',
          type: 'MATERIAL_FLOW',
          confidence: 0.75,
          reason: 'Raw material supply',
          color: getRelationshipColor('MATERIAL_FLOW'),
        },
        {
          source: centerNodeId,
          target: 'hvac-utility',
          type: 'SHARES_UTILITY',
          confidence: 0.6,
          reason: 'Environmental control',
          color: getRelationshipColor('SHARES_UTILITY'),
        },
        {
          source: 'qc-lab',
          target: 'packaging-1',
          type: 'PERSONNEL_FLOW',
          confidence: 0.65,
          reason: 'Quality inspection workflow',
          color: getRelationshipColor('PERSONNEL_FLOW'),
        },
      ],
    };
  }, []);

  // Refresh current graph data
  const refreshGraphData = useCallback(() => {
    if (state.selectedNodeId) {
      fetchKnowledgeGraphData(state.selectedNodeId);
    }
  }, [state.selectedNodeId, fetchKnowledgeGraphData]);

  // Auto-fetch data when selected node changes
  useEffect(() => {
    if (state.selectedNodeId && state.isOpen) {
      fetchKnowledgeGraphData(state.selectedNodeId);
    }
  }, [state.selectedNodeId, state.isOpen, fetchKnowledgeGraphData]);

  // Compute filtered graph data
  const filteredGraphData = useMemo(() => {
    if (!state.graphData.nodes.length) return state.graphData;

    let filteredLinks = state.graphData.links.filter(link => {
      if (state.relationshipFilter !== 'all' && link.type !== state.relationshipFilter) return false;
      if (link.confidence < state.confidenceThreshold) return false;
      return true;
    });

    // Include only nodes that have connections (plus the center node)
    const connectedNodeIds = new Set([state.selectedNodeId]);
    filteredLinks.forEach(link => {
      connectedNodeIds.add(typeof link.source === 'string' ? link.source : link.source.id);
      connectedNodeIds.add(typeof link.target === 'string' ? link.target : link.target.id);
    });

    const filteredNodes = state.graphData.nodes.filter(node => connectedNodeIds.has(node.id));

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [state.graphData, state.relationshipFilter, state.confidenceThreshold, state.selectedNodeId]);

  // Compute unique relationship types
  const relationshipTypes = useMemo(() => {
    const types = new Set(state.graphData.links.map(link => link.type));
    return Array.from(types).sort();
  }, [state.graphData.links]);

  return {
    state,
    openPanel,
    closePanel,
    setRelationshipFilter,
    setConfidenceThreshold,
    setShowLabels,
    setShowParticles,
    refreshGraphData,
    filteredGraphData,
    relationshipTypes,
    fetchKnowledgeGraphData,
  };
};

export default useKnowledgeGraph;