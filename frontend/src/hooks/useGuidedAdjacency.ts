import { useCallback, useEffect, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { getAutoConnectors, MIN_SEPARATION_DISTANCE, EDGE_CONTACT_TOLERANCE } from '../services/connectorLogic';
// NodeCategory no longer used directly in this file
import { nodeToShapeGeometry, detectCollision, ShapeGeometry } from '../utils/shapeCollision';

interface AdjacencyRule {
  nodeId: string;
  canAdjacent: string[]; // Node IDs that can be adjacent
  prohibited: string[]; // Node IDs that cannot be adjacent
}

interface EdgeHighlight {
  nodeId: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  canConnect: boolean;
  targetNodeId?: string;
  highlightType: 'edge-contact' | 'separation-zone' | 'body-overlap';
  distance?: number;
}

interface UseGuidedAdjacencyProps {
  nodes: Node[];
  edges: Edge[];
  isDragging: boolean;
  draggedNodeId: string | null;
  knowledgeGraphData?: any; // Data from Neo4j
}

export const useGuidedAdjacency = ({
  nodes,
  edges,
  isDragging,
  draggedNodeId,
  knowledgeGraphData,
}: UseGuidedAdjacencyProps) => {
  const [adjacencyRules, setAdjacencyRules] = useState<AdjacencyRule[]>([]);
  const [edgeHighlights, setEdgeHighlights] = useState<EdgeHighlight[]>([]);
  const [validSnapTargets, setValidSnapTargets] = useState<string[]>([]);
  const [shapeGeometries, setShapeGeometries] = useState<Map<string, ShapeGeometry>>(new Map());

  // Calculate adjacency rules based on node categories and Neo4j data
  const calculateAdjacencyRules = useCallback(() => {
    const rules: AdjacencyRule[] = [];
    console.log('🔍 useGuidedAdjacency: Calculating rules for', nodes.length, 'nodes');

    nodes.forEach((node) => {
      const canAdjacent: string[] = [];
      const prohibited: string[] = [];

      // Get node information - prioritize assigned Neo4j data for custom shapes
      const getNodeInfo = (n: any) => ({
        id: n.id,
        type: n.type,
        category: n.data?.assignedNodeCategory || n.data?.category,
        assignedNodeId: n.data?.assignedNodeId,
        assignedNodeName: n.data?.assignedNodeName,
        name: n.data?.name,
        hasAssignment: n.type === 'customShape' && n.data?.assignedNodeId
      });

      const nodeInfo = getNodeInfo(node);
      
      console.log(`🔍 Node ${node.id}:`, nodeInfo);

      // Check against all other nodes
      nodes.forEach((otherNode) => {
        if (node.id === otherNode.id) return;

        const otherNodeInfo = getNodeInfo(otherNode);
        
        let hasAdjacency = false;
        let isProhibited = false;

        // Priority 1: Check Neo4j relationships for assigned custom shapes
        if (nodeInfo.hasAssignment && otherNodeInfo.hasAssignment) {
          console.log(`🔍 Checking Neo4j relationships between assigned nodes: ${nodeInfo.assignedNodeId} <-> ${otherNodeInfo.assignedNodeId}`);
          
          // Check inherited relationships if available
          if (node.data?.inheritedRelationships) {
            const foundRelationships = node.data.inheritedRelationships.filter((rel: any) => 
              rel.targetNodeId === otherNodeInfo.assignedNodeId ||
              rel.targetNodeName === otherNodeInfo.assignedNodeName ||
              rel.targetName === otherNodeInfo.assignedNodeName
            );
            
            foundRelationships.forEach((rel: any) => {
              console.log(`🔍 Found inherited relationship:`, rel);
              if (rel.type === 'ADJACENT_TO') hasAdjacency = true;
              if (rel.type === 'PROHIBITED_NEAR') isProhibited = true;
            });
          }

          // Check knowledge graph data links
          if (knowledgeGraphData?.links) {
            knowledgeGraphData.links.forEach((link: any) => {
              const sourceMatches = link.source === nodeInfo.assignedNodeId || link.source === nodeInfo.assignedNodeName;
              const targetMatches = link.target === otherNodeInfo.assignedNodeId || link.target === otherNodeInfo.assignedNodeName;
              const reverseSourceMatches = link.source === otherNodeInfo.assignedNodeId || link.source === otherNodeInfo.assignedNodeName;
              const reverseTargetMatches = link.target === nodeInfo.assignedNodeId || link.target === nodeInfo.assignedNodeName;

              if ((sourceMatches && targetMatches) || (reverseSourceMatches && reverseTargetMatches)) {
                console.log(`🔍 Found Neo4j link:`, link);
                if (link.type === 'ADJACENT_TO') hasAdjacency = true;
                if (link.type === 'PROHIBITED_NEAR') isProhibited = true;
              }
            });
          }
        }

        // Priority 2: Fallback to category-based connector logic if no specific Neo4j relationships found
        if (!hasAdjacency && !isProhibited && nodeInfo.category && otherNodeInfo.category) {
          const connectorResult = getAutoConnectors(nodeInfo.category, otherNodeInfo.category);
          
          hasAdjacency = connectorResult.relationships.some(
            (rel) => rel.type === 'ADJACENT_TO'
          );
          
          isProhibited = connectorResult.relationships.some(
            (rel) => rel.type === 'PROHIBITED_NEAR'
          );
          
          console.log(`🔍 Category-based connector result for ${nodeInfo.category} -> ${otherNodeInfo.category}:`, { hasAdjacency, isProhibited });
        }

        // Apply the determined relationships
        if (hasAdjacency && !isProhibited) {
          canAdjacent.push(otherNode.id);
          console.log(`✅ ${nodeInfo.assignedNodeName || nodeInfo.name || node.id} CAN be adjacent to ${otherNodeInfo.assignedNodeName || otherNodeInfo.name || otherNode.id}`);
        } else if (isProhibited) {
          prohibited.push(otherNode.id);
          console.log(`❌ ${nodeInfo.assignedNodeName || nodeInfo.name || node.id} PROHIBITED near ${otherNodeInfo.assignedNodeName || otherNodeInfo.name || otherNode.id}`);
        } else {
          console.log(`➖ ${nodeInfo.assignedNodeName || nodeInfo.name || node.id} has no specific relationship with ${otherNodeInfo.assignedNodeName || otherNodeInfo.name || otherNode.id}`);
        }
      });

      rules.push({ nodeId: node.id, canAdjacent, prohibited });
      console.log(`🔍 Final rule for ${node.id}:`, { canAdjacent: canAdjacent.length, prohibited: prohibited.length });
    });

    console.log('🔍 All adjacency rules calculated:', rules);
    return rules;
  }, [nodes, knowledgeGraphData]);

  // Calculate shape geometries for collision detection
  useEffect(() => {
    const geometries = new Map<string, ShapeGeometry>();
    
    nodes.forEach((node) => {
      const geometry = nodeToShapeGeometry(node);
      if (geometry) {
        geometries.set(node.id, geometry);
      }
    });
    
    setShapeGeometries(geometries);
  }, [nodes]);

  // Update adjacency rules when nodes or knowledge graph data changes
  useEffect(() => {
    const rules = calculateAdjacencyRules();
    setAdjacencyRules(rules);
  }, [calculateAdjacencyRules]);

  // Calculate edge highlights when dragging with collision detection
  useEffect(() => {
    console.log('🎨 useGuidedAdjacency: Drag state changed - isDragging:', isDragging, 'draggedNodeId:', draggedNodeId);
    
    if (!isDragging || !draggedNodeId) {
      setEdgeHighlights([]);
      setValidSnapTargets([]);
      return;
    }

    const draggedNode = nodes.find((n) => n.id === draggedNodeId);
    const draggedGeometry = shapeGeometries.get(draggedNodeId);
    
    if (!draggedNode || !draggedGeometry) {
      console.log('🎨 useGuidedAdjacency: Dragged node or geometry not found:', draggedNodeId);
      return;
    }

    const rule = adjacencyRules.find((r) => r.nodeId === draggedNodeId);
    if (!rule) {
      console.log('🎨 useGuidedAdjacency: No adjacency rule found for node:', draggedNodeId);
      return;
    }

    console.log('🎨 useGuidedAdjacency: Found rule for node:', draggedNodeId, 'canAdjacent:', rule.canAdjacent, 'prohibited:', rule.prohibited);

    const highlights: EdgeHighlight[] = [];
    const snapTargets: string[] = [];

    // Calculate highlights for each potential target node
    nodes.forEach((targetNode) => {
      if (targetNode.id === draggedNodeId) return;

      const targetGeometry = shapeGeometries.get(targetNode.id);
      if (!targetGeometry) return;

      const canConnect = rule.canAdjacent.includes(targetNode.id);
      const isProhibited = rule.prohibited.includes(targetNode.id);

      // Detect collision between dragged shape and target
      const collision = detectCollision(draggedGeometry, targetGeometry, EDGE_CONTACT_TOLERANCE);

      if (canConnect) {
        snapTargets.push(targetNode.id);

        // Determine highlight type based on collision detection
        let highlightType: 'edge-contact' | 'separation-zone' | 'body-overlap' = 'edge-contact';
        
        if (collision.collisionType === 'body-overlap') {
          highlightType = 'body-overlap';
        } else if (collision.collisionType === 'edge-alignment' || collision.collisionType === 'edge-contact') {
          highlightType = 'edge-contact';
        }

        // Add highlights for each edge of shapes that can be adjacent
        ['top', 'bottom', 'left', 'right'].forEach((side) => {
          highlights.push({
            nodeId: targetNode.id,
            side: side as 'top' | 'bottom' | 'left' | 'right',
            canConnect: true,
            targetNodeId: draggedNodeId,
            highlightType,
            distance: collision.distance,
          });
        });

      } else if (isProhibited) {
        // For prohibited shapes, show separation zone
        let highlightType: 'separation-zone' | 'body-overlap' = 'separation-zone';
        
        if (collision.collisionType === 'body-overlap') {
          highlightType = 'body-overlap';
        } else if (collision.distance < MIN_SEPARATION_DISTANCE) {
          highlightType = 'separation-zone';
        }

        // Add prohibited indicators - show red zone around entire shape
        ['top', 'bottom', 'left', 'right'].forEach((side) => {
          highlights.push({
            nodeId: targetNode.id,
            side: side as 'top' | 'bottom' | 'left' | 'right',
            canConnect: false,
            targetNodeId: draggedNodeId,
            highlightType,
            distance: collision.distance,
          });
        });
      } else {
        // For neutral relationships, check if they're too close
        if (collision.distance < MIN_SEPARATION_DISTANCE && collision.distance > 0) {
          ['top', 'bottom', 'left', 'right'].forEach((side) => {
            highlights.push({
              nodeId: targetNode.id,
              side: side as 'top' | 'bottom' | 'left' | 'right',
              canConnect: false,
              targetNodeId: draggedNodeId,
              highlightType: 'separation-zone',
              distance: collision.distance,
            });
          });
        }
      }
    });

    setEdgeHighlights(highlights);
    setValidSnapTargets(snapTargets);
  }, [isDragging, draggedNodeId, nodes, adjacencyRules, shapeGeometries]);

  // Check if two nodes can be adjacent
  const canNodesBeAdjacent = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const rule = adjacencyRules.find((r) => r.nodeId === nodeId1);
      return rule ? rule.canAdjacent.includes(nodeId2) : false;
    },
    [adjacencyRules]
  );

  // Check if two nodes are prohibited from being near each other
  const areNodesProhibited = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const rule = adjacencyRules.find((r) => r.nodeId === nodeId1);
      return rule ? rule.prohibited.includes(nodeId2) : false;
    },
    [adjacencyRules]
  );

  // Get valid snap targets for a node
  const getValidSnapTargetsForNode = useCallback(
    (nodeId: string): string[] => {
      const rule = adjacencyRules.find((r) => r.nodeId === nodeId);
      return rule ? rule.canAdjacent : [];
    },
    [adjacencyRules]
  );

  // Get edge highlight style based on relationship type and collision state
  const getEdgeHighlightStyle = useCallback(
    (nodeId: string, side: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties => {
      const highlight = edgeHighlights.find(
        (h) => h.nodeId === nodeId && h.side === side
      );

      if (!highlight) return {};

      const baseStyle: React.CSSProperties = {
        opacity: 0.9,
        pointerEvents: 'none',
      };

      // Style based on highlight type and connection permission
      switch (highlight.highlightType) {
        case 'edge-contact':
          // Green highlight for valid edge contact (adjacent shapes)
          return {
            ...baseStyle,
            stroke: '#4CAF50',
            strokeWidth: highlight.canConnect ? 4 : 2,
            strokeDasharray: 'none',
            fill: 'none',
            filter: 'drop-shadow(0 0 6px #4CAF50)',
            animation: highlight.canConnect ? 'adjacency-pulse 1.5s ease-in-out infinite' : 'none',
          };

        case 'separation-zone':
          // Red zone for shapes that must maintain separation
          return {
            ...baseStyle,
            stroke: '#f44336',
            strokeWidth: 2,
            strokeDasharray: '4,4',
            fill: 'rgba(244, 67, 54, 0.1)',
            filter: 'drop-shadow(0 0 4px #f44336)',
            animation: highlight.distance !== undefined && highlight.distance < MIN_SEPARATION_DISTANCE 
              ? 'separation-warning 1s ease-in-out infinite' : 'none',
          };

        case 'body-overlap':
          // Strong red warning for body overlap
          return {
            ...baseStyle,
            stroke: '#d32f2f',
            strokeWidth: 3,
            strokeDasharray: 'none',
            fill: 'rgba(211, 47, 47, 0.2)',
            filter: 'drop-shadow(0 0 8px #d32f2f)',
            animation: 'overlap-warning 0.8s ease-in-out infinite',
          };

        default:
          return {
            ...baseStyle,
            stroke: highlight.canConnect ? '#4CAF50' : '#f44336',
            strokeWidth: 2,
            strokeDasharray: '5,5',
          };
      }
    },
    [edgeHighlights]
  );

  // Check if nodes are within snapping distance for edge alignment
  const areNodesInSnapRange = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const geometry1 = shapeGeometries.get(nodeId1);
      const geometry2 = shapeGeometries.get(nodeId2);
      
      if (!geometry1 || !geometry2) return false;
      
      const collision = detectCollision(geometry1, geometry2, EDGE_CONTACT_TOLERANCE * 2);
      return collision.collisionType === 'edge-alignment' || 
             collision.collisionType === 'near-proximity' ||
             (collision.distance > 0 && collision.distance <= EDGE_CONTACT_TOLERANCE * 2);
    },
    [shapeGeometries]
  );

  // Check if nodes have valid edge alignment
  const haveValidEdgeAlignment = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const geometry1 = shapeGeometries.get(nodeId1);
      const geometry2 = shapeGeometries.get(nodeId2);
      
      if (!geometry1 || !geometry2) return false;
      
      const collision = detectCollision(geometry1, geometry2, EDGE_CONTACT_TOLERANCE);
      return collision.collisionType === 'edge-alignment' && collision.isEdgeOnly === true;
    },
    [shapeGeometries]
  );

  // Check if nodes have body overlap violation
  const haveBodyOverlap = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const geometry1 = shapeGeometries.get(nodeId1);
      const geometry2 = shapeGeometries.get(nodeId2);
      
      if (!geometry1 || !geometry2) return false;
      
      const collision = detectCollision(geometry1, geometry2, EDGE_CONTACT_TOLERANCE);
      return collision.collisionType === 'body-overlap';
    },
    [shapeGeometries]
  );

  // Check if nodes violate minimum separation distance
  const violateMinimumSeparation = useCallback(
    (nodeId1: string, nodeId2: string): boolean => {
      const geometry1 = shapeGeometries.get(nodeId1);
      const geometry2 = shapeGeometries.get(nodeId2);
      
      if (!geometry1 || !geometry2) return false;
      
      const collision = detectCollision(geometry1, geometry2, EDGE_CONTACT_TOLERANCE);
      return collision.distance < MIN_SEPARATION_DISTANCE && collision.distance > 0;
    },
    [shapeGeometries]
  );

  return {
    adjacencyRules,
    edgeHighlights,
    validSnapTargets,
    shapeGeometries,
    canNodesBeAdjacent,
    areNodesProhibited,
    getValidSnapTargetsForNode,
    getEdgeHighlightStyle,
    areNodesInSnapRange,
    haveValidEdgeAlignment,
    haveBodyOverlap,
    violateMinimumSeparation,
  };
};