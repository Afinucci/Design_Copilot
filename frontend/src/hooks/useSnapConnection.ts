import { useCallback, useState, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { SpatialRelationship } from '../types';
import { getAutoConnectors } from '../services/connectorLogic';
import { PERFORMANCE_CONSTANTS } from '../utils/performance';

interface SnapConnectionState {
  source: string;
  target: string;
  type: string;
}

interface UseSnapConnectionProps {
  nodes: Node[];
  edges: Edge[];
  onSnapConnection: (sourceId: string, targetId: string, relationships: Partial<SpatialRelationship>[]) => void;
  hideAdjacencyEdges?: boolean;
}

export const useSnapConnection = ({
  nodes,
  edges,
  onSnapConnection,
  hideAdjacencyEdges = false,
}: UseSnapConnectionProps) => {
  const [previewConnection, setPreviewConnection] = useState<SnapConnectionState | null>(null);
  
  // Refs for cleanup
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup effect
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const handleSnapConnection = useCallback(
    (sourceId: string, targetId: string) => {
      try {
        const sourceNode = nodes.find((n) => n.id === sourceId);
        const targetNode = nodes.find((n) => n.id === targetId);

        if (!sourceNode || !targetNode) {
          console.warn('handleSnapConnection: Source or target node not found', { sourceId, targetId });
          return;
        }

        if (!sourceNode.data?.category || !targetNode.data?.category) {
          console.warn('handleSnapConnection: Node data missing category', { sourceNode, targetNode });
          return;
        }

        const sourceCategory = sourceNode.data.category;
        const targetCategory = targetNode.data.category;

        // Prefer relationships inherited from Neo4j assignments when both shapes are assigned
        let relationships: Partial<SpatialRelationship>[] = [];
        let suggestedType: SpatialRelationship['type'] = 'ADJACENT_TO';

        const sourceHasKG = !!sourceNode.data.assignedNodeId && !!sourceNode.data.hasInheritedProperties;
        const targetHasKG = !!targetNode.data.assignedNodeId && !!targetNode.data.hasInheritedProperties;

        if (sourceHasKG && targetHasKG && Array.isArray(sourceNode.data.inheritedRelationships)) {
          const matches = (sourceNode.data.inheritedRelationships as any[]).filter((rel: any) => {
            const targetName = targetNode.data?.assignedNodeName || targetNode.data?.name;
            const targetId = targetNode.data?.assignedNodeId || targetNode.id;
            const targetCat = targetNode.data?.assignedNodeCategory || targetNode.data?.category;
            return (
              rel?.targetNodeId === targetId ||
              rel?.targetId === targetId ||
              rel?.toId === targetId ||
              rel?.targetNodeName === targetName ||
              rel?.targetName === targetName ||
              rel?.targetCategory === targetCat
            );
          });

          // Map KG relationships to SpatialRelationship partials
          relationships = matches.map((rel: any) => ({
            type: rel.type,
            priority: rel.priority ?? 5,
            reason: rel.reason,
            doorType: rel.doorType,
            minDistance: rel.minDistance,
            maxDistance: rel.maxDistance,
            flowDirection: rel.flowDirection,
            flowType: rel.flowType,
          }));

          if (relationships.length > 0) {
            // Choose the first/highest priority as suggestion
            suggestedType = (relationships.reduce((a, b) => (a.priority || 0) >= (b.priority || 0) ? a : b).type) as SpatialRelationship['type'];
          }
        }

        // Fallback to category-based connectors when no KG relationships
        if (relationships.length === 0) {
          const auto = getAutoConnectors(
            sourceCategory,
            targetCategory,
            sourceNode.data.name,
            targetNode.data.name
          );
          relationships = auto.relationships;
          suggestedType = auto.suggestedType;
        }

        // For preview we may hide adjacency, but for creation we still pass all relationships
        const previewRelationships = hideAdjacencyEdges
          ? relationships.filter((rel) => rel.type !== 'ADJACENT_TO')
          : relationships;

        const effectiveSuggestedType = hideAdjacencyEdges && suggestedType === 'ADJACENT_TO'
          ? (previewRelationships[0]?.type || 'MATERIAL_FLOW')
          : suggestedType;

        // Check if connection already exists
        const existingConnection = edges.find(
          (e) =>
            (e.source === sourceId && e.target === targetId) ||
            (e.source === targetId && e.target === sourceId)
        );

        if (!existingConnection && relationships.length > 0) {
          // Clear any existing timeout
          if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
          }

          // Show preview of the connection that will be created
          if (mountedRef.current) {
            setPreviewConnection({
              source: sourceId,
              target: targetId,
              type: effectiveSuggestedType,
            });
          }

          // Create the connection after a short delay
          previewTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              try {
                // Create using all relationships (adjacency will be hidden at render layer)
                onSnapConnection(sourceId, targetId, relationships);
                setPreviewConnection(null);
              } catch (error) {
                console.error('Error creating snap connection:', error);
                setPreviewConnection(null);
              }
            }
          }, PERFORMANCE_CONSTANTS.SNAP_CONNECTION_DELAY);
        }
      } catch (error) {
        console.error('Error in handleSnapConnection:', error);
      }
    },
    [nodes, edges, onSnapConnection]
  );

  const clearPreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (mountedRef.current) {
      setPreviewConnection(null);
    }
  }, []);

  const hasActiveConnection = useCallback((nodeId: string) => {
    return previewConnection && 
           (previewConnection.source === nodeId || previewConnection.target === nodeId);
  }, [previewConnection]);

  return {
    previewConnection,
    handleSnapConnection,
    clearPreview,
    hasActiveConnection,
  };
};