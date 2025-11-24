import { Router, Request, Response } from 'express';
import AIChatService from '../services/aiChatService';
import { ChatRequest } from '../types';

const router = Router();

// Lazy initialization: create chat service only when needed
let chatService: AIChatService | null = null;
const getChatService = (): AIChatService => {
  if (!chatService) {
    chatService = new AIChatService();
  }
  return chatService;
};

/**
 * POST /api/chat
 * Process a chat message and return AI response with actions
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const chatRequest: ChatRequest = req.body;

    // Validate request
    if (!chatRequest.message || !chatRequest.context) {
      return res.status(400).json({
        error: 'Invalid request. Message and context are required.'
      });
    }

    // Process chat
    const response = await getChatService().processChat(chatRequest);

    // Save chat history if diagramId is provided
    if (chatRequest.context.diagramId) {
      const updatedHistory = [
        ...chatRequest.conversationHistory,
        { role: 'user' as const, content: chatRequest.message },
        { role: 'assistant' as const, content: response.message }
      ];

      await getChatService().saveChatHistory(
        chatRequest.context.diagramId,
        updatedHistory
      );
    }

    res.json(response);
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
});

/**
 * GET /api/chat/history/:diagramId
 * Load chat history for a specific diagram
 */
router.get('/history/:diagramId', async (req: Request, res: Response) => {
  try {
    const { diagramId } = req.params;

    if (!diagramId) {
      return res.status(400).json({
        error: 'Diagram ID is required'
      });
    }

    const history = await getChatService().loadChatHistory(diagramId);
    res.json({ history });
  } catch (error: any) {
    console.error('Load chat history error:', error);
    res.status(500).json({
      error: 'Failed to load chat history',
      details: error.message
    });
  }
});

/**
 * DELETE /api/chat/history/:diagramId
 * Clear chat history for a specific diagram
 */
router.delete('/history/:diagramId', async (req: Request, res: Response) => {
  try {
    const { diagramId } = req.params;

    if (!diagramId) {
      return res.status(400).json({
        error: 'Diagram ID is required'
      });
    }

    await getChatService().saveChatHistory(diagramId, []);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error: any) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      error: 'Failed to clear chat history',
      details: error.message
    });
  }
});

export default router;
