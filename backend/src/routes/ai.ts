import { Router, Request, Response } from 'express';
import AIAssistantService from '../services/aiAssistant';

const router = Router();

/**
 * POST /api/ai/ask
 * Answer a natural language question about the knowledge graph
 */
router.post('/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid question parameter',
      });
      return;
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'AI Assistant is not configured. Please set ANTHROPIC_API_KEY environment variable.',
      });
      return;
    }

    const aiService = new AIAssistantService();
    const result = await aiService.answerQuestion(question);

    res.json({
      success: true,
      question,
      query: result.query,
      explanation: result.explanation,
      results: result.results,
      resultCount: result.results.length,
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    res.status(500).json({
      error: error.message || 'Failed to answer question',
      details: error.toString(),
    });
  }
});

/**
 * POST /api/ai/execute
 * Execute a Cypher query directly (read-only)
 */
router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid query parameter',
      });
      return;
    }

    // Check for API key (needed for service initialization)
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'AI Assistant is not configured. Please set ANTHROPIC_API_KEY environment variable.',
      });
      return;
    }

    const aiService = new AIAssistantService();
    const result = await aiService.executeQuery(query);

    res.json({
      success: true,
      query: result.query,
      explanation: result.explanation,
      results: result.results,
      resultCount: result.results.length,
    });
  } catch (error: any) {
    console.error('Query execution error:', error);
    res.status(500).json({
      error: error.message || 'Failed to execute query',
      details: error.toString(),
    });
  }
});

/**
 * GET /api/ai/schema
 * Get the database schema information
 */
router.get('/schema', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for API key (needed for service initialization)
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        error: 'AI Assistant is not configured. Please set ANTHROPIC_API_KEY environment variable.',
      });
      return;
    }

    const aiService = new AIAssistantService();
    const schema = aiService.getSchema();

    res.json({
      success: true,
      schema,
    });
  } catch (error: any) {
    console.error('Schema retrieval error:', error);
    res.status(500).json({
      error: error.message || 'Failed to retrieve schema',
      details: error.toString(),
    });
  }
});

/**
 * GET /api/ai/health
 * Check if AI Assistant is properly configured
 */
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    res.json({
      success: true,
      configured: hasApiKey,
      status: hasApiKey ? 'AI Assistant is ready' : 'Missing ANTHROPIC_API_KEY',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Health check failed',
      details: error.toString(),
    });
  }
});

export default router;
