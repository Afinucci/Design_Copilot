import { Router } from 'express';
import { FunctionalAreaModel } from '../models/FunctionalArea';
import { SpatialRelationshipModel } from '../models/SpatialRelationship';
import Neo4jService from '../config/database';

const router = Router();
const functionalAreaModel = new FunctionalAreaModel();
const spatialRelationshipModel = new SpatialRelationshipModel();

// Get all node templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await functionalAreaModel.getNodeTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching node templates:', error);
    res.status(500).json({ error: 'Failed to fetch node templates' });
  }
});

// Get nodes by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const nodes = await functionalAreaModel.getFunctionalAreasByCategory(category as any);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes by category:', error);
    res.status(500).json({ error: 'Failed to fetch nodes by category' });
  }
});

// Get existing nodes from knowledge graph (for exploration mode) - MUST be before /:id route
router.get('/existing', async (req, res) => {
  try {
    const existingNodes = await functionalAreaModel.getExistingGraphNodes();
    res.json(existingNodes);
  } catch (error) {
    console.error('Error fetching existing graph nodes:', error);
    res.status(500).json({ error: 'Failed to fetch existing graph nodes' });
  }
});

// Get all functional areas
router.get('/', async (req, res) => {
  try {
    const areas = await functionalAreaModel.getAllFunctionalAreas();
    res.json(areas);
  } catch (error) {
    console.error('Error fetching functional areas:', error);
    res.status(500).json({ error: 'Failed to fetch functional areas' });
  }
});

// Get functional area by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const area = await functionalAreaModel.getFunctionalAreaById(id);
    
    if (!area) {
      return res.status(404).json({ error: 'Functional area not found' });
    }
    
    res.json(area);
  } catch (error) {
    console.error('Error fetching functional area:', error);
    res.status(500).json({ error: 'Failed to fetch functional area' });
  }
});

// Create new functional area
router.post('/', async (req, res) => {
  try {
    const areaData = req.body;
    const newArea = await functionalAreaModel.createFunctionalArea(areaData);
    res.status(201).json(newArea);
  } catch (error) {
    console.error('Error creating functional area:', error);
    res.status(500).json({ error: 'Failed to create functional area' });
  }
});

// Update functional area
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedArea = await functionalAreaModel.updateFunctionalArea(id, updates);
    
    if (!updatedArea) {
      return res.status(404).json({ error: 'Functional area not found' });
    }
    
    res.json(updatedArea);
  } catch (error) {
    console.error('Error updating functional area:', error);
    res.status(500).json({ error: 'Failed to update functional area' });
  }
});

// Delete functional area
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await functionalAreaModel.deleteFunctionalArea(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Functional area not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting functional area:', error);
    res.status(500).json({ error: 'Failed to delete functional area' });
  }
});

// Get suggestions for a node
router.get('/:id/suggestions', async (req, res) => {
  try {
    const { id } = req.params;
    const excludeIds = req.query.exclude ? (req.query.exclude as string).split(',') : [];
    const suggestions = await spatialRelationshipModel.getSuggestions(id, excludeIds);
    res.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Get relationships for a node
router.get('/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;
    const relationships = await spatialRelationshipModel.getRelationshipsForNode(id);
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Initialize database with templates and relationships
router.post('/initialize', async (req, res) => {
  try {
    await functionalAreaModel.ensureUniqueConstraints();
    await functionalAreaModel.initializeNodeTemplates();
    await spatialRelationshipModel.initializeSpatialRelationships();
    res.json({ message: 'Database initialized successfully' });
  } catch (error: any) {
    console.error('Detailed initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  }
});

// Import knowledge graph data (for guided mode)
router.get('/kg/import', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    // Get all functional area nodes
    const nodesResult = await session.run(
      `MATCH (fa:FunctionalArea)
       RETURN fa.id as id, fa.name as name, fa.category as category,
              fa.cleanroomClass as cleanroomClass, fa.x as x, fa.y as y,
              fa.width as width, fa.height as height
       ORDER BY fa.name`
    );
    
    const nodes = nodesResult.records.map((record: any) => ({
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category'),
      cleanroomClass: record.get('cleanroomClass'),
      x: record.get('x'),
      y: record.get('y'),
      width: record.get('width'),
      height: record.get('height')
    }));
    
    // Get all relationships between functional areas
    const relationshipsResult = await session.run(
      `MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea)
       RETURN r.id as id, type(r) as type, fa1.id as fromId, fa2.id as toId,
              r.priority as priority, r.reason as reason, r.doorType as doorType,
              r.minDistance as minDistance, r.maxDistance as maxDistance,
              r.flowDirection as flowDirection, r.flowType as flowType
       ORDER BY r.id`
    );
    
    const relationships = relationshipsResult.records.map((record: any) => ({
      id: record.get('id'),
      type: record.get('type'),
      fromId: record.get('fromId'),
      toId: record.get('toId'),
      priority: record.get('priority'),
      reason: record.get('reason'),
      doorType: record.get('doorType'),
      minDistance: record.get('minDistance'),
      maxDistance: record.get('maxDistance'),
      flowDirection: record.get('flowDirection'),
      flowType: record.get('flowType')
    }));
    
    await session.close();
    
    res.json({ 
      nodes, 
      relationships,
      patterns: [], // TODO: Add pattern analysis if needed
      metadata: {
        nodeCount: nodes.length,
        relationshipCount: relationships.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error importing knowledge graph data:', error);
    res.status(500).json({ error: 'Failed to import knowledge graph data' });
  }
});

// Get existing nodes from knowledge graph (for exploration mode)
router.get('/existing', async (req, res) => {
  try {
    const existingNodes = await functionalAreaModel.getExistingGraphNodes();
    res.json(existingNodes);
  } catch (error) {
    console.error('Error fetching existing graph nodes:', error);
    res.status(500).json({ error: 'Failed to fetch existing graph nodes' });
  }
});

// Persist diagram data to knowledge graph (for creation mode)
router.post('/persist', async (req, res) => {
  try {
    const diagramData = req.body;
    const result = await functionalAreaModel.persistToKnowledgeGraph(diagramData);
    res.json({ message: 'Diagram data persisted to knowledge graph successfully' });
  } catch (error) {
    console.error('Error persisting to knowledge graph:', error);
    res.status(500).json({ error: 'Failed to persist to knowledge graph' });
  }
});

// Query graph data with filters (for exploration mode)
router.post('/query', async (req, res) => {
  try {
    const filters = req.body;
    const result = await functionalAreaModel.queryGraphData(filters);
    res.json(result);
  } catch (error) {
    console.error('Error querying graph data:', error);
    res.status(500).json({ error: 'Failed to query graph data' });
  }
});



// Get guided suggestions based on knowledge graph patterns
router.post('/kg/suggestions', async (req, res) => {
  try {
    const { currentNodes, targetCategory } = req.body;
    const suggestions = await functionalAreaModel.getGuidedSuggestions(currentNodes, targetCategory);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting guided suggestions:', error);
    res.status(500).json({ error: 'Failed to get guided suggestions' });
  }
});

// Enhanced persist to knowledge graph with metrics
router.post('/kg/persist', async (req, res) => {
  try {
    const diagramData = req.body;
    await functionalAreaModel.persistToKnowledgeGraph(diagramData);
    const nodesAdded = diagramData.nodes.length;
    const relationshipsAdded = diagramData.relationships.length;
    res.json({
      message: 'Diagram data persisted to knowledge graph successfully',
      nodesAdded,
      relationshipsAdded
    });
  } catch (error) {
    console.error('Error persisting to knowledge graph:', error);
    res.status(500).json({ error: 'Failed to persist to knowledge graph' });
  }
});

export default router;