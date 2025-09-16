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

config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', async (req, res) => {
  console.log('🩺 Health check requested');
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

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  const neo4jService = Neo4jService.getInstance();
  await neo4jService.close();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Initialize Static Node Templates Service
  try {
    const staticTemplatesService = StaticNodeTemplatesService.getInstance();
    await staticTemplatesService.initialize();
    console.log('✅ Static Node Templates Service initialized successfully');
  } catch (error) {
    console.error('❌ Static Templates Service initialization error:', error);
  }
  
  // Test database connection on startup
  try {
    const neo4jService = Neo4jService.getInstance();
    const isConnected = await neo4jService.verifyConnection();
    
    if (isConnected) {
      console.log('🎉 Neo4j Aura database connection established successfully');
    } else {
      console.warn('⚠️  Neo4j Aura database connection failed - running in offline mode');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
});