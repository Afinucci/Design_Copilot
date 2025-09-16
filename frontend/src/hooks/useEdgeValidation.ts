import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Edge as ReactFlowEdge } from 'reactflow';
import { 
  detectEdgeProximity, 
  findAllEdgeProximities,
  calculateRepulsionForce,
  calculateAttractionForce,
  EdgeProximity 
} from '../services/edgeDetection';
import { useDebounce } from './useDebounce';

export interface EdgeValidationResult {
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: 'ADJACENT_TO' | 'PROHIBITED_NEAR' | 'UNDEFINED';
  canSuperimpose: boolean;
  shouldRepel: boolean;
  force?: { x: number; y: number };
  visualFeedback: {
    color: string;
    glow: boolean;
    animation?: 'pulse' | 'shake' | 'magnetic';
    message?: string;
  };
}

interface UseEdgeValidationProps {
  nodes: Node[];
  edges: ReactFlowEdge[];
  draggedNodeId?: string | null;
  proximityThreshold?: number;
  onValidationChange?: (results: EdgeValidationResult[]) => void;
}

export const useEdgeValidation = ({
  nodes,
  edges,
  draggedNodeId,
  proximityThreshold = 20,
  onValidationChange
}: UseEdgeValidationProps) => {
  const [validationResults, setValidationResults] = useState<EdgeValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const validationCache = useRef<Map<string, EdgeValidationResult>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the dragged position for validation
  const debouncedDraggedNodeId = useDebounce(draggedNodeId, 100);

  /**
   * Query Neo4j for relationship between two nodes
   */
  const queryRelationship = useCallback(async (
    sourceNodeId: string,
    targetNodeId: string,
    signal?: AbortSignal
  ): Promise<'ADJACENT_TO' | 'PROHIBITED_NEAR' | 'UNDEFINED'> => {
    try {
      // Check cache first
      const cacheKey = `${sourceNodeId}-${targetNodeId}`;
      const reverseCacheKey = `${targetNodeId}-${sourceNodeId}`;
      const cached = validationCache.current.get(cacheKey) || validationCache.current.get(reverseCacheKey);
      
      if (cached) {
        return cached.relationshipType;
      }

      // Get the assigned Neo4j node IDs from the shape data
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      const targetNode = nodes.find(n => n.id === targetNodeId);
      
      if (!sourceNode?.data?.assignedNodeId || !targetNode?.data?.assignedNodeId) {
        return 'UNDEFINED';
      }

      // Use existing adjacency check API
      const res = await fetch(`/api/shapes/adjacency/${encodeURIComponent(sourceNode.data.assignedNodeId)}/${encodeURIComponent(targetNode.data.assignedNodeId)}`, { signal });
      if (!res.ok) {
        console.error('Failed to check adjacency');
        return 'UNDEFINED';
      }
      const adj = await res.json();
      return adj.canBeAdjacent ? 'ADJACENT_TO' : 'PROHIBITED_NEAR';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Validation request aborted');
      } else {
        console.error('Error querying relationship:', error);
      }
      return 'UNDEFINED';
    }
  }, [nodes]);

  /**
   * Validate edge proximity and relationships
   */
  const validateEdgeProximity = useCallback(async (
    proximity: EdgeProximity
  ): Promise<EdgeValidationResult> => {
    const relationshipType = await queryRelationship(
      proximity.sourceNodeId,
      proximity.targetNodeId,
      abortControllerRef.current?.signal
    );

    let canSuperimpose = false;
    let shouldRepel = false;
    let force = { x: 0, y: 0 };
    let visualFeedback: EdgeValidationResult['visualFeedback'];

    switch (relationshipType) {
      case 'ADJACENT_TO':
        canSuperimpose = proximity.canSuperimpose || false;
        shouldRepel = false;
        force = calculateAttractionForce(proximity);
        visualFeedback = {
          color: '#4caf50', // Green
          glow: true,
          animation: 'magnetic',
          message: 'Edges can superimpose (Adjacent allowed)'
        };
        break;

      case 'PROHIBITED_NEAR':
        canSuperimpose = false;
        shouldRepel = true;
        force = calculateRepulsionForce(proximity);
        visualFeedback = {
          color: '#f44336', // Red
          glow: true,
          animation: 'shake',
          message: 'Edges cannot touch (Proximity prohibited)'
        };
        break;

      default: // UNDEFINED
        // Default behavior: allow adjacency but no special forces
        canSuperimpose = proximity.canSuperimpose || false;
        shouldRepel = false;
        visualFeedback = {
          color: '#9e9e9e', // Grey
          glow: false,
          message: 'No relationship defined'
        };
        break;
    }

    const result: EdgeValidationResult = {
      sourceNodeId: proximity.sourceNodeId,
      targetNodeId: proximity.targetNodeId,
      relationshipType,
      canSuperimpose,
      shouldRepel,
      force,
      visualFeedback
    };

    // Cache the result
    const cacheKey = `${proximity.sourceNodeId}-${proximity.targetNodeId}`;
    validationCache.current.set(cacheKey, result);

    return result;
  }, [queryRelationship]);

  /**
   * Validate all edge proximities for the dragged node
   */
  const validateDraggedNode = useCallback(async () => {
    if (!draggedNodeId) {
      setValidationResults([]);
      return;
    }

    const draggedNode = nodes.find(n => n.id === draggedNodeId);
    if (!draggedNode) return;

    setIsValidating(true);

    try {
      // Cancel any ongoing validation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Find all edge proximities
      const proximities = findAllEdgeProximities(
        draggedNode,
        nodes,
        proximityThreshold
      );

      // Validate each proximity
      const results = await Promise.all(
        proximities.map(proximity => validateEdgeProximity(proximity))
      );

      setValidationResults(results);
      onValidationChange?.(results);
    } finally {
      setIsValidating(false);
    }
  }, [draggedNodeId, nodes, proximityThreshold, validateEdgeProximity, onValidationChange]);

  /**
   * Check if two specific nodes can have edge superimposition
   */
  const canNodesHaveEdgeSuperimposition = useCallback(async (
    nodeId1: string,
    nodeId2: string
  ): Promise<boolean> => {
    const relationshipType = await queryRelationship(nodeId1, nodeId2);
    return relationshipType === 'ADJACENT_TO';
  }, [queryRelationship]);

  /**
   * Check if two specific nodes are prohibited from being near
   */
  const areNodesProhibitedNear = useCallback(async (
    nodeId1: string,
    nodeId2: string
  ): Promise<boolean> => {
    const relationshipType = await queryRelationship(nodeId1, nodeId2);
    return relationshipType === 'PROHIBITED_NEAR';
  }, [queryRelationship]);

  /**
   * Get validation result for a specific node pair
   */
  const getValidationForPair = useCallback((
    sourceNodeId: string,
    targetNodeId: string
  ): EdgeValidationResult | undefined => {
    return validationResults.find(
      r => (r.sourceNodeId === sourceNodeId && r.targetNodeId === targetNodeId) ||
           (r.sourceNodeId === targetNodeId && r.targetNodeId === sourceNodeId)
    );
  }, [validationResults]);

  /**
   * Clear validation cache
   */
  const clearCache = useCallback(() => {
    validationCache.current.clear();
  }, []);

  // Effect to validate when dragged node changes
  useEffect(() => {
    if (debouncedDraggedNodeId) {
      validateDraggedNode();
    } else {
      setValidationResults([]);
    }

    return () => {
      // Cleanup: abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedDraggedNodeId, validateDraggedNode]);

  // Effect to clear cache when nodes change significantly
  const prevNodeIds = useRef<string>('');
  useEffect(() => {
    const nodeIds = nodes.map(n => n.id).sort().join(',');
    
    if (prevNodeIds.current !== nodeIds) {
      clearCache();
      prevNodeIds.current = nodeIds;
    }
  }, [nodes, clearCache]);

  return {
    validationResults,
    isValidating,
    canNodesHaveEdgeSuperimposition,
    areNodesProhibitedNear,
    getValidationForPair,
    validateDraggedNode,
    clearCache
  };
};