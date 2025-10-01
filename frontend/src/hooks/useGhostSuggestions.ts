import { useState, useCallback, useRef, useEffect } from 'react';
import { Node } from 'reactflow';
import { GhostState, GhostSuggestion, AppMode, CustomShapeData } from '../types';
import { apiService } from '../services/api';

// Debounce utility function
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

interface UseGhostSuggestionsProps {
  mode: AppMode;
  nodes: Node[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  isConnected: boolean;
}

export const useGhostSuggestions = ({ 
  mode, 
  nodes, 
  setNodes,
  isConnected 
}: UseGhostSuggestionsProps) => {
  const [ghostState, setGhostState] = useState<GhostState>({
    suggestions: [],
    isLoading: false,
    showGhosts: mode === 'exploration', // Auto-enable in exploration mode
    triggerNode: null,
    triggerNodeId: null,
  });

  // Debug: Log ghost state changes
  useEffect(() => {
    console.log('🎯 useGhostSuggestions: Ghost state changed:', {
      suggestionsCount: ghostState.suggestions.length,
      isLoading: ghostState.isLoading,
      showGhosts: ghostState.showGhosts,
      triggerNodeId: ghostState.triggerNodeId,
      mode,
      isConnected
    });
  }, [ghostState, mode, isConnected]);

  const ghostRequestRef = useRef<AbortController | null>(null);
  const lastTriggerNodeRef = useRef<string | null>(null);

  // Auto-enable ghost suggestions when switching to exploration mode
  useEffect(() => {
    setGhostState(prev => ({
      ...prev,
      showGhosts: mode === 'exploration',
    }));

    // Clear suggestions when leaving exploration mode
    if (mode !== 'exploration') {
      setGhostState(prev => ({
        ...prev,
        suggestions: [],
        triggerNode: null,
        triggerNodeId: null,
      }));
    }
  }, [mode]);

  // Internal function for actual ghost suggestion generation
  const generateGhostSuggestionsInternal = useCallback(async (triggerNode: Node) => {
    console.log('🎯 useGhostSuggestions: generateGhostSuggestionsInternal called with:', {
      triggerNodeId: triggerNode.id,
      triggerNodeName: triggerNode.data?.label,
      triggerNodeCategory: triggerNode.data?.category,
      triggerNodePosition: triggerNode.position,
      isConnected,
      mode
    });

    if (!isConnected || mode !== 'exploration') {
      console.log('🎯 useGhostSuggestions: Skipping generation because:', {
        isConnected,
        mode,
        expectedMode: 'exploration'
      });
      return;
    }

    // Prevent duplicate requests for the same node
    if (lastTriggerNodeRef.current === triggerNode.id) {
      console.log('🎯 useGhostSuggestions: Skipping duplicate request for node:', triggerNode.id);
      return;
    }
    
    lastTriggerNodeRef.current = triggerNode.id;

    // Abort any existing request
    if (ghostRequestRef.current) {
      console.log('🎯 useGhostSuggestions: Aborting existing request');
      ghostRequestRef.current.abort();
    }

    const abortController = new AbortController();
    ghostRequestRef.current = abortController;

    console.log('🎯 useGhostSuggestions: Setting loading state and making API call');
    setGhostState(prev => ({
      ...prev,
      isLoading: true,
      triggerNode,
      triggerNodeId: triggerNode.id,
      showGhosts: true,
    }));

    try {
      // For custom shapes with Neo4j assignments, use the assigned node information
      let effectiveNodeId = triggerNode.id;
      let effectiveNodeName = triggerNode.data?.label;
      let effectiveNodeCategory = triggerNode.data?.category;

      if (triggerNode.type === 'customShape') {
        const customShapeData = triggerNode.data as CustomShapeData;
        if (customShapeData.hasInheritedProperties && customShapeData.assignedNodeId) {
          // Use the Neo4j node information instead of the shape information
          effectiveNodeId = customShapeData.assignedNodeId;
          effectiveNodeName = customShapeData.assignedNodeName || effectiveNodeName;
          effectiveNodeCategory = customShapeData.assignedNodeCategory || effectiveNodeCategory;
          
          console.log('🎯 useGhostSuggestions: Using Neo4j node info for custom shape:', {
            shapeId: triggerNode.id,
            assignedNodeId: effectiveNodeId,
            assignedNodeName: effectiveNodeName,
            assignedNodeCategory: effectiveNodeCategory
          });
        }
      }

      console.log('🎯 useGhostSuggestions: Calling apiService.getGhostSuggestions with:', {
        triggerNodeId: effectiveNodeId,
        position: triggerNode.position,
        existingNodePositions: [],
        confidenceThreshold: 0.3,
        triggerNodeName: effectiveNodeName,
        triggerNodeCategory: effectiveNodeCategory
      });

      const response = await apiService.getGhostSuggestions(
        effectiveNodeId,
        triggerNode.position,
        [],
        0.3,
        effectiveNodeName,
        effectiveNodeCategory
      );
      const suggestions = response.suggestions;

      console.log('🎯 useGhostSuggestions: ✅ Received API response:', {
        suggestionsCount: suggestions.length,
        rawResponse: response,
        suggestions: suggestions.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          confidence: s.confidence,
          reason: s.reason,
          position: s.suggestedPosition
        }))
      });

      if (suggestions.length === 0) {
        console.warn('🎯 useGhostSuggestions: ⚠️ API returned zero suggestions! This may indicate a problem.');
      }

      if (!abortController.signal.aborted) {
        console.log('🎯 useGhostSuggestions: ✅ Updating ghost state with suggestions:', {
          suggestionsToSet: suggestions.length,
          previousSuggestions: ghostState.suggestions.length,
          triggerNodeId: triggerNode.id
        });
        setGhostState(prev => {
          const newState = {
            ...prev,
            suggestions,
            isLoading: false,
          };
          console.log('🎯 useGhostSuggestions: ✅ New ghost state set:', {
            suggestionsCount: newState.suggestions.length,
            showGhosts: newState.showGhosts,
            triggerNodeId: newState.triggerNodeId,
            isLoading: newState.isLoading
          });
          return newState;
        });
      } else {
        console.log('🎯 useGhostSuggestions: Request was aborted, not updating state');
      }
    } catch (error: any) {
      if (!abortController.signal.aborted) {
        console.error('🎯 useGhostSuggestions: Failed to fetch ghost suggestions:', error);
        setGhostState(prev => ({
          ...prev,
          suggestions: [],
          isLoading: false,
        }));
      } else {
        console.log('🎯 useGhostSuggestions: Error occurred but request was aborted');
      }
    }
  }, [isConnected, mode]);

  // Debounced version of ghost suggestion generation (300ms delay)
  const generateGhostSuggestions = useDebounce(generateGhostSuggestionsInternal, 300);

  // Clear all ghost suggestions
  const clearGhostSuggestions = useCallback(() => {
    if (ghostRequestRef.current) {
      ghostRequestRef.current.abort();
      ghostRequestRef.current = null;
    }

    // Reset last trigger node reference
    lastTriggerNodeRef.current = null;

    setGhostState({
      suggestions: [],
      isLoading: false,
      showGhosts: false,
      triggerNode: null,
      triggerNodeId: null,
    });
  }, []);

  // Accept a ghost suggestion and convert it to a real node, then recursively fetch new suggestions for the new node
  const acceptGhostSuggestion = useCallback((suggestionId: string, triggerNode?: Node) => {
    const suggestion = ghostState.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Create a new real node from the ghost suggestion
    const newNodeId = `node-${suggestion.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'functionalArea',
      position: suggestion.suggestedPosition || { x: 0, y: 0 },
      data: {
        label: suggestion.name,
        category: suggestion.category || 'Unknown',
        cleanroomClass: suggestion.cleanroomClass || 'Unclassified',
        templateId: suggestion.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        description: suggestion.reason || '',
        requiredConnections: [],
        prohibitedConnections: [],
        sharedUtilities: [],
        personnelRequirements: [],
        isFromTemplate: true,
        isFromKnowledgeGraph: true,
        confidence: suggestion.confidence,
        ghostReason: suggestion.reason,
      },
    };

    // Add the new node
    setNodes(prev => [...prev, newNode]);

    // Add the connecting edge as a real edge if triggerNode exists
    if (triggerNode) {
      // Use the first relationship if available
      const rel = suggestion.relationships && suggestion.relationships.length > 0 ? suggestion.relationships[0] : undefined;
      const newEdge = {
        id: `edge-${triggerNode.id}-${newNodeId}-${Date.now()}`,
        source: triggerNode.id,
        target: newNodeId,
        type: 'multiRelationship',
        data: {
          relationshipType: rel?.type || 'ADJACENT_TO',
          reason: rel?.reason || suggestion.reason || '',
          confidence: suggestion.confidence,
          isGhost: false,
        },
      };
      // setEdges is not available in this hook, so this logic should be handled in DiagramEditor or passed as a prop
      // setEdges(prev => [...prev, newEdge]);
    }

    // Remove all ghost suggestions (this also resets lastTriggerNodeRef)
    clearGhostSuggestions();

    // Recursively fetch ghost suggestions for the new node (stepwise exploration)
    // Use a longer delay to allow for proper cleanup and prevent rapid-fire requests
    setTimeout(() => {
      generateGhostSuggestions(newNode);
    }, 500); // Increased delay to ensure state update and prevent DOM thrashing
  }, [ghostState.suggestions, setNodes, clearGhostSuggestions, generateGhostSuggestions]);

  // Dismiss a specific ghost suggestion
  const dismissGhostSuggestion = useCallback((suggestionId: string) => {
    setGhostState(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(s => s.id !== suggestionId),
    }));
  }, []);

  // Toggle ghost suggestions visibility
  const toggleGhostSuggestions = useCallback(() => {
    setGhostState(prev => ({
      ...prev,
      showGhosts: !prev.showGhosts,
    }));
  }, []);


  // Set ghost suggestions directly (for fallback/demo mode)
  const setGhostSuggestions = useCallback((suggestions: GhostSuggestion[], triggerNode?: Node) => {
    setGhostState(prev => ({
      ...prev,
      suggestions,
      triggerNode: triggerNode || prev.triggerNode,
      triggerNodeId: triggerNode?.id || prev.triggerNodeId,
      isLoading: false,
    }));
  }, []);

  return {
    ghostState,
    generateGhostSuggestions,
    acceptGhostSuggestion,
    dismissGhostSuggestion,
    clearGhostSuggestions,
    toggleGhostSuggestions,
    setGhostSuggestions,
  };
};