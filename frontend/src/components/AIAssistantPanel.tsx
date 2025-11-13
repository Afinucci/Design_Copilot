import React, { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import './AIAssistantPanel.css';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
  query?: string;
  explanation?: string;
  results?: any[];
  resultCount?: number;
  timestamp: Date;
}

interface AIAssistantPanelProps {
  onClose?: () => void;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'natural' | 'cypher'>('natural');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check AI health on mount
    checkAIHealth();

    // Add welcome message
    addMessage({
      type: 'assistant',
      content:
        'Hello! I can help you explore the pharmaceutical facility knowledge graph. Ask me questions about functional areas, cleanroom classifications, spatial relationships, or compliance requirements.',
    });
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAIHealth = async () => {
    try {
      const health = await apiService.checkAIHealth();
      setIsConfigured(health.configured);

      if (!health.configured) {
        addMessage({
          type: 'error',
          content: 'AI Assistant is not configured. Please set the ANTHROPIC_API_KEY environment variable on the backend.',
        });
      }
    } catch (error) {
      console.error('Failed to check AI health:', error);
      setIsConfigured(false);
      addMessage({
        type: 'error',
        content: 'Failed to connect to AI Assistant. Please check your backend configuration.',
      });
    }
  };

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...msg,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) {
      return;
    }

    const userInput = inputValue.trim();
    setInputValue('');

    // Add user message
    addMessage({
      type: 'user',
      content: userInput,
    });

    setIsLoading(true);

    try {
      if (mode === 'natural') {
        // Natural language query
        const response = await apiService.askAI(userInput);

        if (response.success) {
          addMessage({
            type: 'assistant',
            content: `Found ${response.resultCount} result(s).`,
            query: response.query,
            explanation: response.explanation,
            results: response.results,
            resultCount: response.resultCount,
          });
        } else {
          addMessage({
            type: 'error',
            content: response.error || 'Failed to process your question.',
          });
        }
      } else {
        // Cypher query execution
        const response = await apiService.executeAICypherQuery(userInput);

        if (response.success) {
          addMessage({
            type: 'assistant',
            content: `Query executed successfully. Found ${response.resultCount} result(s).`,
            query: response.query,
            explanation: response.explanation,
            results: response.results,
            resultCount: response.resultCount,
          });
        } else {
          addMessage({
            type: 'error',
            content: response.error || 'Failed to execute query.',
          });
        }
      }
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      addMessage({
        type: 'error',
        content: `Error: ${error.message || 'Failed to communicate with AI Assistant'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatResults = (results: any[]) => {
    if (!results || results.length === 0) {
      return <div className="no-results">No results found</div>;
    }

    return (
      <div className="results-container">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        ))}
      </div>
    );
  };

  const exampleQuestions = [
    'Show all production areas',
    'What areas must be adjacent to a Gowning Area?',
    'Find all Class A cleanroom areas',
    'What areas are prohibited near Weighing?',
    'Show me all utility relationships',
  ];

  return (
    <div className="ai-assistant-panel">
      <div className="ai-panel-header">
        <h3>AI Assistant</h3>
        <div className="header-actions">
          <div className="mode-toggle">
            <button
              className={mode === 'natural' ? 'active' : ''}
              onClick={() => setMode('natural')}
              title="Ask questions in natural language"
            >
              Natural Language
            </button>
            <button
              className={mode === 'cypher' ? 'active' : ''}
              onClick={() => setMode('cypher')}
              title="Write Cypher queries directly"
            >
              Cypher Query
            </button>
          </div>
          {onClose && (
            <button className="close-button" onClick={onClose} title="Close AI Assistant">
              ✕
            </button>
          )}
        </div>
      </div>

      {isConfigured === false && (
        <div className="config-warning">
          AI Assistant is not configured. Please check your backend settings.
        </div>
      )}

      <div className="messages-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.type}`}>
            <div className="message-content">
              <div className="message-text">{msg.content}</div>

              {msg.explanation && (
                <div className="message-explanation">
                  <strong>Query Explanation:</strong> {msg.explanation}
                </div>
              )}

              {msg.query && (
                <div className="message-query">
                  <strong>Cypher Query:</strong>
                  <pre>{msg.query}</pre>
                </div>
              )}

              {msg.results && msg.results.length > 0 && (
                <div className="message-results">{formatResults(msg.results)}</div>
              )}
            </div>
            <div className="message-timestamp">{msg.timestamp.toLocaleTimeString()}</div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-content">
              <div className="loading-indicator">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && mode === 'natural' && (
        <div className="example-questions">
          <div className="example-label">Try asking:</div>
          {exampleQuestions.map((question, index) => (
            <button
              key={index}
              className="example-question"
              onClick={() => setInputValue(question)}
              disabled={isLoading}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <form className="input-container" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            mode === 'natural'
              ? 'Ask a question about the facility design...'
              : 'MATCH (n:NodeTemplate) RETURN n LIMIT 10'
          }
          disabled={isLoading || isConfigured === false}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isLoading || isConfigured === false}
          className="send-button"
        >
          {isLoading ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default AIAssistantPanel;
