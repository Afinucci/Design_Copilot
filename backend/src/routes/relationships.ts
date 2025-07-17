import { Router } from 'express';
import { SpatialRelationshipModel } from '../models/SpatialRelationship';
import { SpatialRelationship } from '../types';

const router = Router();
const spatialRelationshipModel = new SpatialRelationshipModel();

// Get all relationships
router.get('/', async (req, res) => {
  try {
    const relationships = await spatialRelationshipModel.getAllRelationships();
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Get relationship by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const relationship = await spatialRelationshipModel.getRelationshipById(id);
    
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    res.json(relationship);
  } catch (error) {
    console.error('Error fetching relationship:', error);
    res.status(500).json({ error: 'Failed to fetch relationship' });
  }
});

// Create new relationship
router.post('/', async (req, res) => {
  try {
    const relationshipData: SpatialRelationship = req.body;
    const newRelationship = await spatialRelationshipModel.createRelationship(relationshipData);
    res.status(201).json(newRelationship);
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

// Update relationship
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedRelationship = await spatialRelationshipModel.updateRelationship(id, updates);
    
    if (!updatedRelationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    res.json(updatedRelationship);
  } catch (error) {
    console.error('Error updating relationship:', error);
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

// Delete relationship
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await spatialRelationshipModel.deleteRelationship(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Relationship not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

// Get relationships between two nodes
router.get('/between/:sourceId/:targetId', async (req, res) => {
  try {
    const { sourceId, targetId } = req.params;
    const relationships = await spatialRelationshipModel.getRelationshipsBetweenNodes(sourceId, targetId);
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships between nodes:', error);
    res.status(500).json({ error: 'Failed to fetch relationships between nodes' });
  }
});

// Get relationships by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const relationships = await spatialRelationshipModel.getRelationshipsByType(type as any);
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships by type:', error);
    res.status(500).json({ error: 'Failed to fetch relationships by type' });
  }
});

// Batch create relationships
router.post('/batch', async (req, res) => {
  try {
    const { relationships } = req.body;
    const createdRelationships = await spatialRelationshipModel.batchCreateRelationships(relationships);
    res.status(201).json(createdRelationships);
  } catch (error) {
    console.error('Error batch creating relationships:', error);
    res.status(500).json({ error: 'Failed to batch create relationships' });
  }
});

// Batch update relationships
router.put('/batch', async (req, res) => {
  try {
    const { relationships } = req.body;
    const updatedRelationships = await spatialRelationshipModel.batchUpdateRelationships(relationships);
    res.json(updatedRelationships);
  } catch (error) {
    console.error('Error batch updating relationships:', error);
    res.status(500).json({ error: 'Failed to batch update relationships' });
  }
});

// Batch delete relationships
router.delete('/batch', async (req, res) => {
  try {
    const { relationshipIds } = req.body;
    const deletedCount = await spatialRelationshipModel.batchDeleteRelationships(relationshipIds);
    res.json({ deletedCount });
  } catch (error) {
    console.error('Error batch deleting relationships:', error);
    res.status(500).json({ error: 'Failed to batch delete relationships' });
  }
});

export default router;