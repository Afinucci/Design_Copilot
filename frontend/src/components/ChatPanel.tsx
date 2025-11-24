import React, { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  PlayArrow as ExecuteIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, ChatAction } from '../types';
import { useDraggable } from '../hooks/useDraggable';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onClearHistory: () => void;
  onExecuteAction: (action: ChatAction) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  open,
  onClose,
  messages,
  isLoading,
  onSendMessage,
  onClearHistory,
  onExecuteAction
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Draggable functionality
  const { position, isDragging, dragHandleProps, panelProps } = useDraggable({
    initialPosition: { x: window.innerWidth - 450, y: 0 }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        left: open ? position.x : position.x + 450,
        top: position.y,
        width: '450px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300,
        transition: open ? 'none' : 'left 0.3s ease-in-out',
        boxShadow: open ? '0 0 20px rgba(0,0,0,0.2)' : 'none',
        borderLeft: '1px solid',
        borderColor: 'divider',
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header - Draggable */}
      <Box
        {...dragHandleProps}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BotIcon color="primary" />
          <Typography variant="h6">AI Layout Assistant</Typography>
        </Box>
        <Box>
          <Tooltip title="Clear History">
            <IconButton onClick={onClearHistory} size="small" sx={{ mr: 1 }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Messages Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: 'background.default' }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary'
            }}
          >
            <BotIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Welcome!
            </Typography>
            <Typography variant="body2" align="center" sx={{ maxWidth: 350, mb: 3 }}>
              Ask me anything about pharmaceutical facility design, room types, adjacency rules, or
              GMP compliance. I can help you plan your layout!
            </Typography>
            <Box sx={{ mt: 2, width: '100%' }}>
              <Typography variant="caption" display="block" gutterBottom sx={{ fontWeight: 'bold' }}>
                Try asking:
              </Typography>
              <Typography variant="caption" display="block" color="primary" sx={{ py: 0.5 }}>
                🏗️ "Generate a sterile vial filling facility for 500L batches"
              </Typography>
              <Typography variant="caption" display="block" color="primary" sx={{ py: 0.5 }}>
                📋 "Create an oral solid dosage facility from template"
              </Typography>
              <Typography variant="caption" display="block" color="primary" sx={{ py: 0.5 }}>
                🔍 "What can be connected to the Process Suite?"
              </Typography>
              <Typography variant="caption" display="block" color="primary" sx={{ py: 0.5 }}>
                ➕ "Add a quality control area"
              </Typography>
              <Typography variant="caption" display="block" color="primary" sx={{ py: 0.5 }}>
                ⚡ "Optimize this layout for material flow"
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onExecuteAction={onExecuteAction}
              />
            ))}
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BotIcon color="primary" />
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Ask me about layout design..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            sx={{ minWidth: '56px', height: '40px' }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  onExecuteAction: (action: ChatAction) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onExecuteAction }) => {
  const isUser = message.role === 'user';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 1,
        alignItems: 'flex-start'
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: '50%',
          bgcolor: isUser ? 'primary.main' : 'grey.300',
          color: isUser ? 'white' : 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 40,
          minHeight: 40
        }}
      >
        {isUser ? <PersonIcon /> : <BotIcon />}
      </Box>

      <Box sx={{ flex: 1, maxWidth: '80%' }}>
        <Paper
          sx={{
            p: 2,
            bgcolor: isUser ? 'primary.light' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            '& p': { margin: '0.5em 0', '&:first-of-type': { marginTop: 0 }, '&:last-child': { marginBottom: 0 } },
            '& ul, & ol': { marginLeft: '1.5em', marginTop: '0.5em', marginBottom: '0.5em' },
            '& li': { marginBottom: '0.25em' },
            '& strong': { fontWeight: 'bold' },
            '& em': { fontStyle: 'italic' },
            '& code': {
              bgcolor: isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
              padding: '2px 4px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              fontSize: '0.9em'
            },
            '& pre': {
              bgcolor: isUser ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
              padding: '8px',
              borderRadius: '4px',
              overflow: 'auto',
              '& code': { bgcolor: 'transparent', padding: 0 }
            },
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              marginTop: '0.75em',
              marginBottom: '0.5em',
              fontWeight: 'bold'
            }
          }}
        >
          {isUser ? (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          )}

          {message.actions && message.actions.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                Suggested Actions:
              </Typography>
              {message.actions.map((action) => (
                <Button
                  key={action.id}
                  size="small"
                  variant="outlined"
                  startIcon={<ExecuteIcon />}
                  onClick={() => onExecuteAction(action)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    bgcolor: 'white'
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatPanel;
