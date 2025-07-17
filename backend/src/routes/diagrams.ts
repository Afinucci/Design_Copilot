import { Router } from 'express';
import { Session } from 'neo4j-driver';
import Neo4jService from '../config/database';
import { Diagram } from '../types';

const router = Router();

// Get all diagrams
router.get('/', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const result = await session.run(
      `MATCH (d:Diagram)
       RETURN d.id as id, d.name as name, d.createdAt as createdAt, d.updatedAt as updatedAt
       ORDER BY d.updatedAt DESC`
    );
    
    const diagrams = result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      createdAt: record.get('createdAt'),
      updatedAt: record.get('updatedAt')
    }));
    
    res.json(diagrams);
  } catch (error) {
    console.error('Error fetching diagrams:', error);
    res.status(500).json({ error: 'Failed to fetch diagrams' });
  } finally {
    await session.close();
  }
});

// Debug route to see all nodes in the database
router.get('/debug', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const result = await session.run(
      `MATCH (n)
       RETURN labels(n) as labels, n.id as id, n.name as name, 
              CASE WHEN n.category IS NOT NULL THEN n.category ELSE 'N/A' END as category
       ORDER BY labels(n)[0], n.name`
    );
    
    const nodes = result.records.map(record => ({
      labels: record.get('labels'),
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category')
    }));
    
    res.json({ nodes, count: nodes.length });
  } catch (error) {
    console.error('Error querying nodes:', error);
    res.status(500).json({ error: 'Failed to query nodes' });
  } finally {
    await session.close();
  }
});

// Route to get only functional area nodes and relationships (for visualization)
router.get('/visualization', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    // Get only functional area nodes
    const nodesResult = await session.run(
      `MATCH (fa:FunctionalArea)
       RETURN fa.id as id, fa.name as name, fa.category as category,
              fa.cleanroomClass as cleanroomClass, fa.x as x, fa.y as y,
              fa.width as width, fa.height as height
       ORDER BY fa.name`
    );
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      category: record.get('category'),
      cleanroomClass: record.get('cleanroomClass'),
      x: record.get('x'),
      y: record.get('y'),
      width: record.get('width'),
      height: record.get('height')
    }));
    
    // Get relationships between functional areas only
    const relationshipsResult = await session.run(
      `MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea)
       RETURN r.id as id, type(r) as type, fa1.id as fromId, fa2.id as toId,
              r.priority as priority, r.reason as reason
       ORDER BY r.id`
    );
    
    const relationships = relationshipsResult.records.map(record => ({
      id: record.get('id'),
      type: record.get('type'),
      fromId: record.get('fromId'),
      toId: record.get('toId'),
      priority: record.get('priority'),
      reason: record.get('reason')
    }));
    
    res.json({ 
      nodes, 
      relationships, 
      nodeCount: nodes.length, 
      relationshipCount: relationships.length,
      cypher: 'MATCH (fa:FunctionalArea) OPTIONAL MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea) RETURN fa, r'
    });
  } catch (error) {
    console.error('Error getting visualization data:', error);
    res.status(500).json({ error: 'Failed to get visualization data' });
  } finally {
    await session.close();
  }
});

// Get diagram by ID
router.get('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { id } = req.params;
    
    // Get diagram metadata
    const diagramResult = await session.run(
      'MATCH (d:Diagram {id: $id}) RETURN d',
      { id }
    );
    
    if (diagramResult.records.length === 0) {
      return res.status(404).json({ error: 'Diagram not found' });
    }
    
    const diagram = diagramResult.records[0].get('d').properties;
    
    // Get diagram nodes
    const nodesResult = await session.run(
      `MATCH (d:Diagram {id: $id})-[:CONTAINS]->(fa:FunctionalArea)
       RETURN fa`,
      { id }
    );
    
    const nodes = nodesResult.records.map(record => record.get('fa').properties);
    
    // Get diagram relationships
    const relationshipsResult = await session.run(
      `MATCH (d:Diagram {id: $id})-[:CONTAINS]->(fa1:FunctionalArea)
       MATCH (d)-[:CONTAINS]->(fa2:FunctionalArea)
       MATCH (fa1)-[r]->(fa2)
       RETURN r, fa1.id as fromId, fa2.id as toId, type(r) as relType`,
      { id }
    );
    
    const relationships = relationshipsResult.records.map(record => ({
      id: record.get('r').properties.id,
      type: record.get('relType'),
      fromId: record.get('fromId'),
      toId: record.get('toId'),
      priority: record.get('r').properties.priority,
      reason: record.get('r').properties.reason,
      doorType: record.get('r').properties.doorType,
      minDistance: record.get('r').properties.minDistance,
      maxDistance: record.get('r').properties.maxDistance
    }));
    
    const fullDiagram: Diagram = {
      id: diagram.id,
      name: diagram.name,
      nodes,
      relationships,
      createdAt: diagram.createdAt,
      updatedAt: diagram.updatedAt
    };
    
    res.json(fullDiagram);
  } catch (error) {
    console.error('Error fetching diagram:', error);
    res.status(500).json({ error: 'Failed to fetch diagram' });
  } finally {
    await session.close();
  }
});

// Create new diagram
router.post('/', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { name, nodes, relationships } = req.body;
    
    // Debug: Log what we're actually saving
    console.log('🔍 Saving diagram:', { name, nodeCount: nodes.length, relationshipCount: relationships.length });
    console.log('🔍 Nodes being saved:', nodes.map((n: any) => ({ id: n.id, name: n.name, category: n.category })));
    
    const tx = session.beginTransaction();
    
    try {
      // Use MERGE to avoid creating duplicate nodes
      for (const node of nodes) {
        await tx.run(
          `MERGE (fa:FunctionalArea {id: $nodeId})
           ON CREATE SET
             fa.name = $name,
             fa.category = $category,
             fa.cleanroomClass = $cleanroomClass,
             fa.x = $x,
             fa.y = $y,
             fa.width = $width,
             fa.height = $height,
             fa.createdAt = datetime(),
             fa.updatedAt = datetime()
           ON MATCH SET
             fa.name = $name,
             fa.category = $category,
             fa.cleanroomClass = $cleanroomClass,
             fa.x = $x,
             fa.y = $y,
             fa.width = $width,
             fa.height = $height,
             fa.updatedAt = datetime()`,
          {
            nodeId: node.id,
            name: node.name,
            category: node.category,
            cleanroomClass: node.cleanroomClass,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          }
        );
      }
      
      // Use MERGE to avoid creating duplicate relationships
      for (const rel of relationships) {
        const relationshipQuery = `MATCH (from:FunctionalArea {id: $fromId})
           MATCH (to:FunctionalArea {id: $toId})
           MERGE (from)-[r:${rel.type} {id: $relId}]->(to)
           ON CREATE SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.createdAt = datetime(),
             r.updatedAt = datetime()
           ON MATCH SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.updatedAt = datetime()`;
        
        await tx.run(relationshipQuery,
          {
            fromId: rel.fromId,
            toId: rel.toId,
            relId: rel.id,
            priority: rel.priority || 5,
            reason: rel.reason || 'User-defined relationship',
            doorType: rel.doorType || null,
            minDistance: rel.minDistance || null,
            maxDistance: rel.maxDistance || null
          }
        );
      }
      
      await tx.commit();
      
      res.status(201).json({ message: 'Functional areas saved successfully', nodeCount: nodes.length, relationshipCount: relationships.length });
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creating diagram:', error);
    res.status(500).json({ error: 'Failed to create diagram' });
  } finally {
    await session.close();
  }
});

// Update diagram
router.put('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { id } = req.params;
    const { name, nodes, relationships } = req.body;
    
    const tx = session.beginTransaction();
    
    try {
      // Use MERGE to update existing nodes instead of clearing all
      for (const node of nodes) {
        await tx.run(
          `MERGE (fa:FunctionalArea {id: $nodeId})
           ON CREATE SET
             fa.name = $name,
             fa.category = $category,
             fa.cleanroomClass = $cleanroomClass,
             fa.x = $x,
             fa.y = $y,
             fa.width = $width,
             fa.height = $height,
             fa.createdAt = datetime(),
             fa.updatedAt = datetime()
           ON MATCH SET
             fa.name = $name,
             fa.category = $category,
             fa.cleanroomClass = $cleanroomClass,
             fa.x = $x,
             fa.y = $y,
             fa.width = $width,
             fa.height = $height,
             fa.updatedAt = datetime()`,
          {
            nodeId: node.id,
            name: node.name,
            category: node.category,
            cleanroomClass: node.cleanroomClass,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          }
        );
      }
      
      // Use MERGE to update existing relationships instead of creating duplicates
      for (const rel of relationships) {
        const updateRelationshipQuery = `MATCH (from:FunctionalArea {id: $fromId})
           MATCH (to:FunctionalArea {id: $toId})
           MERGE (from)-[r:${rel.type} {id: $relId}]->(to)
           ON CREATE SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.createdAt = datetime(),
             r.updatedAt = datetime()
           ON MATCH SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.updatedAt = datetime()`;
        
        await tx.run(updateRelationshipQuery,
          {
            fromId: rel.fromId,
            toId: rel.toId,
            relId: rel.id,
            priority: rel.priority || 5,
            reason: rel.reason || 'User-defined relationship',
            doorType: rel.doorType || null,
            minDistance: rel.minDistance || null,
            maxDistance: rel.maxDistance || null
          }
        );
      }
      
      await tx.commit();
      
      res.json({ message: 'Diagram updated successfully' });
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating diagram:', error);
    res.status(500).json({ error: 'Failed to update diagram' });
  } finally {
    await session.close();
  }
});

// Delete diagram
router.delete('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { id } = req.params;
    
    const result = await session.run(
      `MATCH (d:Diagram {id: $id})
       OPTIONAL MATCH (d)-[:CONTAINS]->(fa:FunctionalArea)
       DETACH DELETE d, fa
       RETURN COUNT(d) as deletedCount`,
      { id }
    );
    
    const deletedCountValue = result.records[0].get('deletedCount');
    const deletedCount = typeof deletedCountValue === 'number' ? deletedCountValue : (deletedCountValue && typeof deletedCountValue.toNumber === 'function' ? deletedCountValue.toNumber() : parseInt(deletedCountValue, 10) || 0);
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Diagram not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting diagram:', error);
    res.status(500).json({ error: 'Failed to delete diagram' });
  } finally {
    await session.close();
  }
});

// Save exploration view (read-only view of existing graph data)
router.post('/view', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { name, nodes, relationships } = req.body;
    
    const tx = session.beginTransaction();
    
    try {
      // Create exploration view
      const viewResult = await tx.run(
        `CREATE (v:ExplorationView {
          id: randomUUID(),
          name: $name,
          type: 'exploration',
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN v.id as id`,
        { name }
      );
      
      const viewId = viewResult.records[0].get('id');
      
      // Link existing nodes to the view (don't create new nodes)
      for (const node of nodes) {
        await tx.run(
          `MATCH (v:ExplorationView {id: $viewId})
           MATCH (fa:FunctionalArea {id: $nodeId})
           CREATE (v)-[:REFERENCES {
             x: $x,
             y: $y,
             width: $width,
             height: $height
           }]->(fa)`,
          {
            viewId,
            nodeId: node.id,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          }
        );
      }
      
      await tx.commit();
      
      res.status(201).json({ id: viewId, message: 'Exploration view saved successfully' });
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error saving exploration view:', error);
    res.status(500).json({ error: 'Failed to save exploration view' });
  } finally {
    await session.close();
  }
});

// Cleanup route to remove standalone functional area nodes (leftovers from old saves)
router.post('/cleanup', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const result = await session.run(
      `MATCH (fa:FunctionalArea)
       WHERE NOT (fa)<-[:CONTAINS]-(:Diagram)
       DETACH DELETE fa
       RETURN COUNT(fa) as deletedCount`
    );
    
    const deletedCount = result.records[0].get('deletedCount');
    const count = typeof deletedCount === 'number' ? deletedCount : (deletedCount && typeof deletedCount.toNumber === 'function' ? deletedCount.toNumber() : parseInt(deletedCount, 10) || 0);
    
    res.json({ message: `Cleaned up ${count} standalone functional area nodes`, deletedCount: count });
  } catch (error) {
    console.error('Error cleaning up nodes:', error);
    res.status(500).json({ error: 'Failed to cleanup nodes' });
  } finally {
    await session.close();
  }
});

// Cleanup route to remove diagram metadata (if you want functional areas only)
router.post('/cleanup-diagrams', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    // First, remove CONTAINS relationships
    await session.run(`MATCH ()-[r:CONTAINS]->() DELETE r`);
    
    // Then remove Diagram nodes
    const result = await session.run(
      `MATCH (d:Diagram)
       DELETE d
       RETURN COUNT(d) as deletedCount`
    );
    
    const deletedCount = result.records[0].get('deletedCount');
    const count = typeof deletedCount === 'number' ? deletedCount : (deletedCount && typeof deletedCount.toNumber === 'function' ? deletedCount.toNumber() : parseInt(deletedCount, 10) || 0);
    
    res.json({ message: `Removed ${count} diagram metadata nodes`, deletedCount: count });
  } catch (error) {
    console.error('Error cleaning up diagram nodes:', error);
    res.status(500).json({ error: 'Failed to cleanup diagram nodes' });
  } finally {
    await session.close();
  }
});

export default router;