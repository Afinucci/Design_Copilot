import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { ChatMessage, ChatRequest, ChatResponse, ChatAction, ChatContext } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface UseChatAssistantProps {
  nodes: Node[];
  edges: Edge[];
  diagramId?: string;
}

interface UseChatAssistantReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  executeAction: (action: ChatAction) => void;
  highlightedNodeIds: string[];
}

export const useChatAssistant = ({
  nodes,
  edges,
  diagramId
}: UseChatAssistantProps): UseChatAssistantReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history on mount if diagramId is provided
  const loadHistory = useCallback(async () => {
    if (!diagramId) return;

    try {
      const response = await fetch(`/api/chat/history/${diagramId}`);
      if (!response.ok) throw new Error('Failed to load chat history');

      const data = await response.json();
      const loadedMessages: ChatMessage[] = data.history.map((msg: any) => ({
        id: uuidv4(),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
        actions: []
      }));
      setMessages(loadedMessages);
    } catch (err: any) {
      console.error('Error loading chat history:', err);
    }
  }, [diagramId]);

  // Build context from current diagram state
  const buildContext = useCallback((): ChatContext => {
    return {
      diagramId,
      currentNodes: nodes.map(node => ({
        id: node.id,
        name: node.data.name || node.data.label || 'Unnamed',
        templateId: node.data.templateId, // Neo4j node ID for querying relationships
        category: node.data.category,
        cleanroomClass: node.data.cleanroomClass,
        position: node.position
      })),
      currentRelationships: edges.map(edge => ({
        id: edge.id,
        fromId: edge.source,
        toId: edge.target,
        type: edge.data?.type || 'ADJACENT_TO',
        priority: edge.data?.priority || 1,
        reason: edge.data?.reason || ''
      }))
    };
  }, [nodes, edges, diagramId]);

  // Send message to AI
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const context = buildContext();

      // Build conversation history (exclude system messages)
      const conversationHistory = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      const chatRequest: ChatRequest = {
        message,
        context,
        conversationHistory
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatRequest),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const chatResponse: ChatResponse = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: chatResponse.message,
        timestamp: new Date(),
        actions: chatResponse.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-highlight nodes mentioned in response
      const mentionedNodeIds = extractNodeIdsFromResponse(chatResponse, nodes);
      if (mentionedNodeIds.length > 0) {
        setHighlightedNodeIds(mentionedNodeIds);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', err);
        setError(err.message || 'Failed to send message');

        // Add error message
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, buildContext, nodes]);

  // Clear chat history
  const clearHistory = useCallback(async () => {
    setMessages([]);
    setHighlightedNodeIds([]);
    setError(null);

    if (diagramId) {
      try {
        await fetch(`/api/chat/history/${diagramId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Error clearing chat history:', err);
      }
    }
  }, [diagramId]);

  // Execute action (placeholder - will be implemented by parent component)
  const executeAction = useCallback((action: ChatAction) => {
    console.log('Execute action:', action);

    // Handle highlighting
    if (action.type === 'highlight_node' && action.data.highlightNodeIds) {
      setHighlightedNodeIds(action.data.highlightNodeIds);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    executeAction,
    highlightedNodeIds
  };
};

// Helper function to extract node IDs from AI response
function extractNodeIdsFromResponse(response: ChatResponse, nodes: Node[]): string[] {
  const nodeIds: string[] = [];

  // Check actions for highlight nodes
  response.actions.forEach(action => {
    if (action.type === 'highlight_node' && action.data.highlightNodeIds) {
      nodeIds.push(...action.data.highlightNodeIds);
    }
  });

  // Try to extract node names from message and match them to existing nodes
  const message = response.message.toLowerCase();
  nodes.forEach(node => {
    const nodeName = (node.data.name || node.data.label || '').toLowerCase();
    if (nodeName && message.includes(nodeName)) {
      nodeIds.push(node.id);
    }
  });

  return Array.from(new Set(nodeIds)); // Remove duplicates
}
