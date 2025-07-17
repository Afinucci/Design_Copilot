import express from 'express';
import { NodeGroup } from '../types';

const router = express.Router();

// In-memory storage for groups (in a real app, this would be in a database)
let groups: NodeGroup[] = [];

// GET /api/groups - Get all groups
router.get('/', (req, res) => {
  res.json(groups);
});

// POST /api/groups - Create a new group
router.post('/', (req, res) => {
  try {
    const { name, nodeIds, description } = req.body;
    
    if (!name || !nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return res.status(400).json({ 
        error: 'Name and nodeIds array are required' 
      });
    }

    const newGroup: NodeGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      nodeIds: [...nodeIds],
      description: description || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    groups.push(newGroup);
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// PUT /api/groups/:id - Update a group
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, nodeIds, description, color } = req.body;
    
    const groupIndex = groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const updatedGroup: NodeGroup = {
      ...groups[groupIndex],
      name: name?.trim() || groups[groupIndex].name,
      nodeIds: nodeIds || groups[groupIndex].nodeIds,
      description: description !== undefined ? description : groups[groupIndex].description,
      color: color || groups[groupIndex].color,
      updatedAt: new Date()
    };

    groups[groupIndex] = updatedGroup;
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/groups/:id - Delete a group
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const groupIndex = groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const deletedGroup = groups.splice(groupIndex, 1)[0];
    res.json({ message: 'Group deleted successfully', group: deletedGroup });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// GET /api/groups/:id - Get a specific group
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const group = groups.find(g => g.id === id);
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /api/groups/:id/add-node - Add a node to a group
router.post('/:id/add-node', (req, res) => {
  try {
    const { id } = req.params;
    const { nodeId } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }

    const groupIndex = groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!groups[groupIndex].nodeIds.includes(nodeId)) {
      groups[groupIndex].nodeIds.push(nodeId);
      groups[groupIndex].updatedAt = new Date();
    }

    res.json(groups[groupIndex]);
  } catch (error) {
    console.error('Error adding node to group:', error);
    res.status(500).json({ error: 'Failed to add node to group' });
  }
});

// DELETE /api/groups/:id/remove-node/:nodeId - Remove a node from a group
router.delete('/:id/remove-node/:nodeId', (req, res) => {
  try {
    const { id, nodeId } = req.params;
    
    const groupIndex = groups.findIndex(g => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }

    groups[groupIndex].nodeIds = groups[groupIndex].nodeIds.filter(nId => nId !== nodeId);
    groups[groupIndex].updatedAt = new Date();

    res.json(groups[groupIndex]);
  } catch (error) {
    console.error('Error removing node from group:', error);
    res.status(500).json({ error: 'Failed to remove node from group' });
  }
});

export default router;