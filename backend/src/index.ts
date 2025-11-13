import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import Neo4jService from './config/database';
import { StaticNodeTemplatesService } from './services/staticNodeTemplatesService';
import diagramRoutes from './routes/diagrams';
import nodeRoutes from './routes/nodes';
import validationRoutes from './routes/validation';
import groupRoutes from './routes/groups';
import relationshipRoutes from './routes/relationships';
import knowledgeGraphRoutes from './routes/knowledgeGraph';
import shapesRoutes from './routes/shapes';
import suggestionsRoutes from './routes/suggestions';
import chatRoutes from './routes/chat';
import generativeRoutes from './routes/generative';
import layoutRoutes from './routes/layouts';
import logger from './utils/logger';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow frontend origin
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', async (req, res) => {
  logger.emoji('🩺', 'Health check requested');
  try {
    const neo4jService = Neo4jService.getInstance();
    const isConnected = await neo4jService.verifyConnection();
    
    const staticTemplatesService = StaticNodeTemplatesService.getInstance();
    const templatesHealth = staticTemplatesService.getHealthStatus();
    
    const healthResponse = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected',
      staticTemplates: {
        status: templatesHealth.status,
        templatesCount: templatesHealth.templatesCount,
        categoriesCount: templatesHealth.categoriesCount
      }
    };
    
    console.log('🩺 Health check response:', healthResponse);
    res.json(healthResponse);
  } catch (error) {
    console.error('🩺 Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed'
    });
  }
});

app.use('/api/diagrams', diagramRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/knowledge-graph', knowledgeGraphRoutes);
app.use('/api/shapes', shapesRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/generative', generativeRoutes);
app.use('/api/layouts', layoutRoutes);

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  const neo4jService = Neo4jService.getInstance();
  await neo4jService.close();
  process.exit(0);
});

app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  // Initialize Static Node Templates Service
  try {
    const staticTemplatesService = StaticNodeTemplatesService.getInstance();
    await staticTemplatesService.initialize();
    logger.emoji('✅', 'Static Node Templates Service initialized successfully');
  } catch (error) {
    logger.error('❌ Static Templates Service initialization error:', error);
  }

  // Test database connection on startup
  try {
    const neo4jService = Neo4jService.getInstance();
    const isConnected = await neo4jService.verifyConnection();

    if (isConnected) {
      logger.emoji('🎉', 'Neo4j Aura database connection established successfully');
    } else {
      logger.warn('⚠️  Neo4j Aura database connection failed - running in offline mode');
    }
  } catch (error) {
    logger.error('❌ Database initialization error:', error);
  }
});