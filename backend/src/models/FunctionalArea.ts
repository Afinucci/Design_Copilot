

import { Session } from 'neo4j-driver';
import Neo4jService from '../config/database';
import { FunctionalArea, NodeTemplate, NodeCategory, Equipment } from '../types';

export class FunctionalAreaModel {
  private driver = Neo4jService.getInstance().getDriver();

  // Ensure unique constraints exist for node IDs
  async ensureUniqueConstraints(): Promise<void> {
    const session = this.driver.session();
    
    try {
      // Create unique constraint on FunctionalArea.id
      await session.run(
        'CREATE CONSTRAINT unique_functional_area_id IF NOT EXISTS FOR (fa:FunctionalArea) REQUIRE fa.id IS UNIQUE'
      );
      
      // Create unique constraint on NodeTemplate.id
      await session.run(
        'CREATE CONSTRAINT unique_node_template_id IF NOT EXISTS FOR (nt:NodeTemplate) REQUIRE nt.id IS UNIQUE'
      );
      
      console.log('✅ Unique constraints ensured for FunctionalArea and NodeTemplate IDs');
    } catch (error) {
      console.error('Error creating unique constraints:', error);
      // Don't throw error - constraints might already exist
    } finally {
      await session.close();
    }
  }

  async createFunctionalArea(area: Omit<FunctionalArea, 'id'>): Promise<FunctionalArea> {
    const session = this.driver.session();
    
    try {
      const id = `fa-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const result = await session.run(
        `MERGE (fa:FunctionalArea {id: $id})
         ON CREATE SET
           fa.name = $name,
           fa.category = $category,
           fa.cleanroomClass = $cleanroomClass,
           fa.minSizeSqm = $minSizeSqm,
           fa.maxSizeSqm = $maxSizeSqm,
           fa.requiredUtilities = $requiredUtilities,
           fa.description = $description,
           fa.x = $x,
           fa.y = $y,
           fa.width = $width,
           fa.height = $height,
           fa.equipment = $equipment,
           fa.createdAt = datetime(),
           fa.updatedAt = datetime()
         ON MATCH SET
           fa.name = $name,
           fa.category = $category,
           fa.cleanroomClass = $cleanroomClass,
           fa.minSizeSqm = $minSizeSqm,
           fa.maxSizeSqm = $maxSizeSqm,
           fa.requiredUtilities = $requiredUtilities,
           fa.description = $description,
           fa.x = $x,
           fa.y = $y,
           fa.width = $width,
           fa.height = $height,
           fa.equipment = $equipment,
           fa.updatedAt = datetime()
         RETURN fa`,
        { id, ...area, equipment: area.equipment || [] }
      );
      
      return result.records[0].get('fa').properties;
    } finally {
      await session.close();
    }
  }

  async getAllFunctionalAreas(): Promise<FunctionalArea[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (fa:FunctionalArea) RETURN fa ORDER BY fa.category, fa.name'
      );
      
      return result.records.map(record => record.get('fa').properties);
    } finally {
      await session.close();
    }
  }

  async getFunctionalAreasByCategory(category: NodeCategory): Promise<FunctionalArea[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (fa:FunctionalArea {category: $category}) RETURN fa ORDER BY fa.name',
        { category }
      );
      
      return result.records.map(record => record.get('fa').properties);
    } finally {
      await session.close();
    }
  }

  async getFunctionalAreaById(id: string): Promise<FunctionalArea | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (fa:FunctionalArea {id: $id}) RETURN fa',
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      return result.records[0].get('fa').properties;
    } finally {
      await session.close();
    }
  }

  async updateFunctionalArea(id: string, updates: Partial<FunctionalArea>): Promise<FunctionalArea | null> {
    const session = this.driver.session();
    
    try {
      const setClause = Object.keys(updates)
        .map(key => `fa.${key} = $${key}`)
        .join(', ');
      
      const result = await session.run(
        `MATCH (fa:FunctionalArea {id: $id})
         SET ${setClause}, fa.updatedAt = datetime()
         RETURN fa`,
        { id, ...updates }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      return result.records[0].get('fa').properties;
    } finally {
      await session.close();
    }
  }

  async deleteFunctionalArea(id: string): Promise<boolean> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (fa:FunctionalArea {id: $id}) DELETE fa RETURN COUNT(fa) as deleted',
        { id }
      );
      
      const deleted = result.records[0].get('deleted');
      return (typeof deleted === 'number' ? deleted : (deleted && typeof deleted.toNumber === 'function' ? deleted.toNumber() : parseInt(deleted, 10) || 0)) > 0;
    } finally {
      await session.close();
    }
  }

  async initializeNodeTemplates(): Promise<void> {
    const session = this.driver.session();
    
    try {
      const templates: NodeTemplate[] = [
        // Production Areas
        { id: 'weighing-area', name: 'Weighing Area', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 120, height: 80 } },
        { id: 'granulation', name: 'Granulation', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 150, height: 100 } },
        { id: 'compression', name: 'Compression', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 140, height: 90 } },
        { id: 'coating', name: 'Coating', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 130, height: 85 } },
        { id: 'packaging', name: 'Packaging', category: 'Production', cleanroomClass: 'D', color: '#FF6B6B', defaultSize: { width: 160, height: 100 } },
        
        // Quality Control
        { id: 'analytical-lab', name: 'Analytical Lab', category: 'Quality Control', cleanroomClass: 'C', color: '#4ECDC4', defaultSize: { width: 150, height: 120 } },
        { id: 'microbiology', name: 'Microbiology Lab', category: 'Quality Control', cleanroomClass: 'B', color: '#4ECDC4', defaultSize: { width: 140, height: 110 } },
        { id: 'stability-chamber', name: 'Stability Chamber', category: 'Quality Control', color: '#4ECDC4', defaultSize: { width: 100, height: 80 } },
        { id: 'release-testing', name: 'Release Testing', category: 'Quality Control', cleanroomClass: 'C', color: '#4ECDC4', defaultSize: { width: 130, height: 90 } },
        
        // Warehouse
        { id: 'raw-materials', name: 'Raw Materials Storage', category: 'Warehouse', color: '#45B7D1', defaultSize: { width: 180, height: 120 } },
        { id: 'finished-goods', name: 'Finished Goods Storage', category: 'Warehouse', color: '#45B7D1', defaultSize: { width: 180, height: 120 } },
        { id: 'quarantine', name: 'Quarantine Storage', category: 'Warehouse', color: '#45B7D1', defaultSize: { width: 120, height: 80 } },
        { id: 'cold-storage', name: 'Cold Storage', category: 'Warehouse', color: '#45B7D1', defaultSize: { width: 100, height: 90 } },
        
        // Utilities
        { id: 'hvac', name: 'HVAC Room', category: 'Utilities', color: '#F7DC6F', defaultSize: { width: 120, height: 100 } },
        { id: 'purified-water', name: 'Purified Water System', category: 'Utilities', color: '#F7DC6F', defaultSize: { width: 110, height: 90 } },
        { id: 'compressed-air', name: 'Compressed Air System', category: 'Utilities', color: '#F7DC6F', defaultSize: { width: 100, height: 80 } },
        { id: 'electrical', name: 'Electrical Room', category: 'Utilities', color: '#F7DC6F', defaultSize: { width: 100, height: 80 } },
        
        // Personnel
        { id: 'gowning-area', name: 'Gowning Area', category: 'Personnel', cleanroomClass: 'D', color: '#BB8FCE', defaultSize: { width: 120, height: 90 } },
        { id: 'break-room', name: 'Break Room', category: 'Personnel', color: '#BB8FCE', defaultSize: { width: 150, height: 100 } },
        { id: 'offices', name: 'Offices', category: 'Personnel', color: '#BB8FCE', defaultSize: { width: 200, height: 120 } },
        { id: 'training-room', name: 'Training Room', category: 'Personnel', color: '#BB8FCE', defaultSize: { width: 180, height: 120 } },
        
        // Support
        { id: 'waste-disposal', name: 'Waste Disposal', category: 'Support', color: '#85C1E9', defaultSize: { width: 100, height: 80 } },
        { id: 'maintenance', name: 'Maintenance Workshop', category: 'Support', color: '#85C1E9', defaultSize: { width: 140, height: 100 } },
        { id: 'receiving', name: 'Receiving Area', category: 'Support', color: '#85C1E9', defaultSize: { width: 150, height: 100 } },
        { id: 'shipping', name: 'Shipping Area', category: 'Support', color: '#85C1E9', defaultSize: { width: 150, height: 100 } }
      ];

      for (const template of templates) {
        await session.run(
          `MERGE (nt:NodeTemplate {id: $id})
           ON CREATE SET
             nt.name = $name,
             nt.category = $category,
             nt.cleanroomClass = $cleanroomClass,
             nt.color = $color,
             nt.defaultWidth = $defaultWidth,
             nt.defaultHeight = $defaultHeight,
             nt.createdAt = datetime(),
             nt.updatedAt = datetime()
           ON MATCH SET
             nt.name = $name,
             nt.category = $category,
             nt.cleanroomClass = $cleanroomClass,
             nt.color = $color,
             nt.defaultWidth = $defaultWidth,
             nt.defaultHeight = $defaultHeight,
             nt.updatedAt = datetime()`,
          {
            id: template.id,
            name: template.name,
            category: template.category,
            cleanroomClass: template.cleanroomClass,
            color: template.color,
            defaultWidth: template.defaultSize.width,
            defaultHeight: template.defaultSize.height
          }
        );
      }
    } finally {
      await session.close();
    }
  }

  async getNodeTemplates(): Promise<NodeTemplate[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        'MATCH (nt:NodeTemplate) RETURN nt ORDER BY nt.category, nt.name'
      );
      
      return result.records.map(record => {
        const props = record.get('nt').properties;
        return {
          id: props.id,
          name: props.name,
          category: props.category,
          cleanroomClass: props.cleanroomClass,
          color: props.color,
          defaultSize: {
            width: props.defaultWidth,
            height: props.defaultHeight
          }
        };
      });
    } finally {
      await session.close();
    }
  }

  // Get existing nodes from knowledge graph (for exploration mode)
  // Returns ONLY actual FunctionalArea nodes that have been persisted to the knowledge graph
  // These are nodes created via Author Mode and saved to the knowledge graph
  async getExistingGraphNodes(): Promise<NodeTemplate[]> {
    const session = this.driver.session();
    
    try {
      // Get only standalone FunctionalArea nodes (created via Creation mode)
      // These are the nodes that have been persisted to the knowledge graph as permanent entities
      const functionalAreaResult = await session.run(
        `MATCH (fa:FunctionalArea)
         WHERE NOT (fa)<-[:CONTAINS]-(:Diagram)
         RETURN DISTINCT fa.id as id, fa.name as name, fa.category as category,
                fa.cleanroomClass as cleanroomClass, 
                CASE WHEN fa.color IS NULL THEN '#95A5A6' ELSE fa.color END as color,
                {width: COALESCE(fa.width, 120), height: COALESCE(fa.height, 80)} as defaultSize
         ORDER BY fa.category, fa.name`
      );
      
      const nodes = functionalAreaResult.records.map(record => ({
        id: record.get('id'),
        name: record.get('name'),
        category: record.get('category') as NodeCategory,
        cleanroomClass: record.get('cleanroomClass'),
        color: record.get('color'),
        defaultSize: record.get('defaultSize')
      }));
      
      console.log(`Found ${nodes.length} existing nodes in knowledge graph (Query Mode)`);
      return nodes;
    } catch (error) {
      console.error('Error getting existing graph nodes:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Persist diagram data to knowledge graph (for creation mode)
  async persistToKnowledgeGraph(diagramData: any): Promise<void> {
    const session = this.driver.session();
    
    try {
      const tx = session.beginTransaction();
      
      try {
        console.log('🔄 Merging diagram data with existing knowledge graph...');
        
        // MERGE functional areas instead of overwriting
        // This preserves existing nodes and only adds new ones
        for (const node of diagramData.nodes) {
          await tx.run(
            `MERGE (fa:FunctionalArea {id: $id})
             ON CREATE SET
               fa.name = $name,
               fa.category = $category,
               fa.cleanroomClass = $cleanroomClass,
               fa.x = $x,
               fa.y = $y,
               fa.width = $width,
               fa.height = $height,
               fa.equipment = $equipment,
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
               fa.equipment = $equipment,
               fa.updatedAt = datetime()`,
            {
              id: node.id,
              name: node.name,
              category: node.category,
              cleanroomClass: node.cleanroomClass,
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height,
              equipment: node.equipment || []
            }
          );
        }
        
        // MERGE relationships instead of creating duplicates
        for (const rel of diagramData.relationships) {
          await tx.run(
            `MATCH (from:FunctionalArea {id: $fromId})
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
               r.updatedAt = datetime()`,
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
        console.log(`✅ Knowledge graph updated successfully: ${diagramData.nodes.length} nodes, ${diagramData.relationships.length} relationships`);
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error persisting to knowledge graph:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Query graph data with filters (for exploration mode)
  async queryGraphData(filters: any): Promise<{ nodes: any[]; relationships: any[] }> {
    const session = this.driver.session();
    
    try {
      let nodeQuery = 'MATCH (fa:FunctionalArea) WHERE 1=1';
      let relationshipQuery = 'MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea) WHERE 1=1';
      const params: any = {};
      
      // Apply filters
      if (filters.category) {
        nodeQuery += ' AND fa.category = $category';
        relationshipQuery += ' AND fa1.category = $category';
        params.category = filters.category;
      }
      
      if (filters.cleanroomClass) {
        nodeQuery += ' AND fa.cleanroomClass = $cleanroomClass';
        params.cleanroomClass = filters.cleanroomClass;
      }
      
      if (filters.name) {
        nodeQuery += ' AND fa.name CONTAINS $name';
        params.name = filters.name;
      }
      
      // Get nodes
      const nodeResult = await session.run(
        nodeQuery + ' RETURN fa ORDER BY fa.category, fa.name',
        params
      );
      
      const nodes = nodeResult.records.map(record => record.get('fa').properties);
      
      // Get relationships
      const relationshipResult = await session.run(
        relationshipQuery + ' RETURN r, fa1.id as fromId, fa2.id as toId, type(r) as relType',
        params
      );
      
      const relationships = relationshipResult.records.map(record => ({
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
      
      return { nodes, relationships };
    } catch (error) {
      console.error('Error querying graph data:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  // Get complete knowledge graph data for Guided Mode
  async getKnowledgeGraphData(): Promise<{ nodes: any[]; relationships: any[]; patterns: any[]; metadata: any }> {
    const session = this.driver.session();
    
    try {
      // Check if driver is available
      if (!this.driver) {
        throw new Error('Neo4j driver not available');
      }

      // Get all STANDALONE nodes from the knowledge graph (not part of diagrams)
      const nodesResult = await session.run(
        `MATCH (fa:FunctionalArea)
         WHERE NOT (fa)<-[:CONTAINS]-()
         RETURN fa.id as id, fa.name as name, fa.category as category, 
                fa.cleanroomClass as cleanroomClass, fa.x as x, fa.y as y,
                fa.width as width, fa.height as height, fa.equipment as equipment
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
        height: record.get('height'),
        equipment: record.get('equipment') || []
      }));

      // Get all relationships from the knowledge graph (only between standalone nodes)
      const relationshipsResult = await session.run(
        `MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea)
         WHERE NOT (fa1)<-[:CONTAINS]-() AND NOT (fa2)<-[:CONTAINS]-()
         RETURN r.id as id, type(r) as type, fa1.id as fromId, fa2.id as toId,
                r.priority as priority, r.reason as reason, r.doorType as doorType,
                r.minDistance as minDistance, r.maxDistance as maxDistance`
      );
      
      const relationships = relationshipsResult.records.map(record => ({
        id: record.get('id'),
        type: record.get('type'),
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('priority'),
        reason: record.get('reason'),
        doorType: record.get('doorType'),
        minDistance: record.get('minDistance'),
        maxDistance: record.get('maxDistance')
      }));

      // Get adjacency patterns for suggestions (only from standalone nodes)
      const patternsResult = await session.run(
        `MATCH (fa1:FunctionalArea)-[r:ADJACENT_TO]->(fa2:FunctionalArea)
         WHERE NOT (fa1)<-[:CONTAINS]-() AND NOT (fa2)<-[:CONTAINS]-()
         RETURN fa1.category as category1, fa2.category as category2, 
                count(r) as frequency, avg(r.priority) as avgPriority
         ORDER BY frequency DESC`
      );
      
      const patterns = patternsResult.records.map(record => {
        const freq = record.get('frequency');
        return {
          category1: record.get('category1'),
          category2: record.get('category2'),
          frequency: typeof freq === 'number' ? freq : (freq && typeof freq.toNumber === 'function' ? freq.toNumber() : parseInt(freq, 10) || 0),
          avgPriority: record.get('avgPriority')
        };
      });

      return {
        nodes,
        relationships,
        patterns,
        metadata: {
          totalNodes: nodes.length,
          totalRelationships: relationships.length,
          categories: [...new Set(nodes.map(n => n.category))],
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting knowledge graph data:', error);
      if (error instanceof Error && (error.message?.includes('ServiceUnavailable') || error.message?.includes('connection'))) {
        throw new Error('Neo4j database connection failed. Please check the database connection.');
      }
      throw error;
    } finally {
      await session.close();
    }
  }

  // Get guided suggestions based on knowledge graph patterns
  async getGuidedSuggestions(currentNodes: any[], targetCategory: string): Promise<any[]> {
    const session = this.driver.session();
    
    try {
      // Check if driver is available
      if (!this.driver) {
        throw new Error('Neo4j driver not available');
      }

      // Get suggestions based on existing patterns in the knowledge graph
      const suggestionsResult = await session.run(
        `MATCH (fa1:FunctionalArea)-[r:ADJACENT_TO]->(fa2:FunctionalArea)
         WHERE fa1.category IN $categories AND fa2.category = $targetCategory
         RETURN fa2.category as suggestedCategory, fa2.name as suggestedName,
                r.reason as reason, r.priority as priority, count(r) as frequency
         ORDER BY frequency DESC, priority DESC
         LIMIT 10`,
        {
          categories: currentNodes.map(n => n.category),
          targetCategory
        }
      );
      
      const suggestions = suggestionsResult.records.map(record => {
        const freq = record.get('frequency');
        const frequency = typeof freq === 'number' ? freq : (freq && typeof freq.toNumber === 'function' ? freq.toNumber() : parseInt(freq, 10) || 0);
        return {
          category: record.get('suggestedCategory'),
          name: record.get('suggestedName'),
          reason: record.get('reason'),
          priority: record.get('priority'),
          frequency,
          confidence: Math.min(frequency / 10, 1)
        };
      });

      return suggestions;
    } catch (error) {
      console.error('Error getting guided suggestions:', error);
      if (error instanceof Error && (error.message?.includes('ServiceUnavailable') || error.message?.includes('connection'))) {
        throw new Error('Neo4j database connection failed. Please check the database connection.');
      }
      throw error;
    } finally {
      await session.close();
    }
  }
}