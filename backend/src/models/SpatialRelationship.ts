import { Session } from 'neo4j-driver';
import Neo4jService from '../config/database';
import { SpatialRelationship, Suggestion } from '../types';

export class SpatialRelationshipModel {
  private driver = Neo4jService.getInstance().getDriver();

  async createRelationship(relationship: Omit<SpatialRelationship, 'id'>): Promise<SpatialRelationship> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea {id: $fromId})
         MATCH (to:FunctionalArea {id: $toId})
         CREATE (from)-[r:${relationship.type} {
           id: randomUUID(),
           priority: $priority,
           reason: $reason,
           doorType: $doorType,
           minDistance: $minDistance,
           maxDistance: $maxDistance,
           flowDirection: $flowDirection,
           flowType: $flowType,
           createdAt: datetime(),
           updatedAt: datetime()
         }]->(to)
         RETURN r`,
        relationship
      );
      
      return {
        id: result.records[0].get('r').properties.id,
        ...relationship
      };
    } finally {
      await session.close();
    }
  }

  async getRelationshipsForNode(nodeId: string): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea {id: $nodeId})-[r]->(to:FunctionalArea)
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType
         UNION
         MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea {id: $nodeId})
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType`,
        { nodeId }
      );
      
      return result.records.map(record => ({
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      }));
    } finally {
      await session.close();
    }
  }

  async getSuggestions(nodeId: string, excludeIds: string[] = []): Promise<Suggestion[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (selected:FunctionalArea {id: $nodeId})
         MATCH (selected)-[r:ADJACENT_TO|REQUIRES_ACCESS|MATERIAL_FLOW|PERSONNEL_FLOW]->(suggested:FunctionalArea)
         WHERE NOT suggested.id IN $excludeIds
         RETURN suggested.id as suggestedId, 
                suggested.name as suggestedName,
                r.priority as priority,
                r.reason as reason,
                CASE 
                  WHEN r.priority >= 8 THEN 0.9
                  WHEN r.priority >= 6 THEN 0.7
                  WHEN r.priority >= 4 THEN 0.5
                  ELSE 0.3
                END as confidence
         ORDER BY r.priority DESC
         LIMIT 10`,
        { nodeId, excludeIds }
      );
      
      return result.records.map(record => ({
        id: `suggestion-${record.get('suggestedId')}`,
        nodeId: record.get('suggestedId'),
        suggestedPosition: { x: 0, y: 0 }, // Will be calculated based on canvas layout
        priority: record.get('priority'),
        reason: record.get('reason'),
        confidence: record.get('confidence')
      }));
    } finally {
      await session.close();
    }
  }

  async getAllRelationships(): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType
         ORDER BY r.priority DESC, from.id, to.id`
      );
      
      return result.records.map(record => ({
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      }));
    } finally {
      await session.close();
    }
  }

  async getRelationshipById(id: string): Promise<SpatialRelationship | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
         WHERE r.id = $id
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType`,
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      return {
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      };
    } finally {
      await session.close();
    }
  }

  async updateRelationship(id: string, updates: Partial<SpatialRelationship>): Promise<SpatialRelationship | null> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
         WHERE r.id = $id
         SET r.priority = COALESCE($priority, r.priority),
             r.reason = COALESCE($reason, r.reason),
             r.doorType = COALESCE($doorType, r.doorType),
             r.minDistance = COALESCE($minDistance, r.minDistance),
             r.maxDistance = COALESCE($maxDistance, r.maxDistance),
             r.flowDirection = COALESCE($flowDirection, r.flowDirection),
             r.flowType = COALESCE($flowType, r.flowType),
             r.updatedAt = datetime()
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType`,
        {
          id,
          priority: updates.priority,
          reason: updates.reason,
          doorType: updates.doorType,
          minDistance: updates.minDistance,
          maxDistance: updates.maxDistance,
          flowDirection: updates.flowDirection,
          flowType: updates.flowType
        }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      return {
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      };
    } finally {
      await session.close();
    }
  }

  async deleteRelationship(id: string): Promise<boolean> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
         WHERE r.id = $id
         DELETE r
         RETURN count(r) as deletedCount`,
        { id }
      );
      
      return result.records[0].get('deletedCount') > 0;
    } finally {
      await session.close();
    }
  }

  async getRelationshipsBetweenNodes(sourceId: string, targetId: string): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea {id: $sourceId})-[r]->(to:FunctionalArea {id: $targetId})
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType
         UNION
         MATCH (from:FunctionalArea {id: $targetId})-[r]->(to:FunctionalArea {id: $sourceId})
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType`,
        { sourceId, targetId }
      );
      
      return result.records.map(record => ({
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      }));
    } finally {
      await session.close();
    }
  }

  async getRelationshipsByType(type: string): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r:${type}]->(to:FunctionalArea)
         RETURN r, from.id as fromId, to.id as toId, type(r) as relType
         ORDER BY r.priority DESC`,
        { type }
      );
      
      return result.records.map(record => ({
        id: record.get('r').properties.id,
        type: record.get('relType') as any,
        fromId: record.get('fromId'),
        toId: record.get('toId'),
        priority: record.get('r').properties.priority,
        reason: record.get('r').properties.reason,
        doorType: record.get('r').properties.doorType,
        minDistance: record.get('r').properties.minDistance,
        maxDistance: record.get('r').properties.maxDistance,
        flowDirection: record.get('r').properties.flowDirection,
        flowType: record.get('r').properties.flowType
      }));
    } finally {
      await session.close();
    }
  }

  async batchCreateRelationships(relationships: Omit<SpatialRelationship, 'id'>[]): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const createdRelationships: SpatialRelationship[] = [];
      
      for (const relationship of relationships) {
        const result = await session.run(
          `MATCH (from:FunctionalArea {id: $fromId})
           MATCH (to:FunctionalArea {id: $toId})
           CREATE (from)-[r:${relationship.type} {
             id: randomUUID(),
             priority: $priority,
             reason: $reason,
             doorType: $doorType,
             minDistance: $minDistance,
             maxDistance: $maxDistance,
             flowDirection: $flowDirection,
             flowType: $flowType,
             createdAt: datetime(),
             updatedAt: datetime()
           }]->(to)
           RETURN r`,
          relationship
        );
        
        createdRelationships.push({
          id: result.records[0].get('r').properties.id,
          ...relationship
        });
      }
      
      return createdRelationships;
    } finally {
      await session.close();
    }
  }

  async batchUpdateRelationships(relationships: SpatialRelationship[]): Promise<SpatialRelationship[]> {
    const session = this.driver.session();
    
    try {
      const updatedRelationships: SpatialRelationship[] = [];
      
      for (const relationship of relationships) {
        const result = await session.run(
          `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
           WHERE r.id = $id
           SET r.priority = $priority,
               r.reason = $reason,
               r.doorType = $doorType,
               r.minDistance = $minDistance,
               r.maxDistance = $maxDistance,
               r.flowDirection = $flowDirection,
               r.flowType = $flowType,
               r.updatedAt = datetime()
           RETURN r, from.id as fromId, to.id as toId, type(r) as relType`,
          relationship
        );
        
        if (result.records.length > 0) {
          const record = result.records[0];
          updatedRelationships.push({
            id: record.get('r').properties.id,
            type: record.get('relType') as any,
            fromId: record.get('fromId'),
            toId: record.get('toId'),
            priority: record.get('r').properties.priority,
            reason: record.get('r').properties.reason,
            doorType: record.get('r').properties.doorType,
            minDistance: record.get('r').properties.minDistance,
            maxDistance: record.get('r').properties.maxDistance,
            flowDirection: record.get('r').properties.flowDirection,
            flowType: record.get('r').properties.flowType
          });
        }
      }
      
      return updatedRelationships;
    } finally {
      await session.close();
    }
  }

  async batchDeleteRelationships(relationshipIds: string[]): Promise<number> {
    const session = this.driver.session();
    
    try {
      const result = await session.run(
        `MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
         WHERE r.id IN $relationshipIds
         DELETE r
         RETURN count(r) as deletedCount`,
        { relationshipIds }
      );
      
      return result.records[0].get('deletedCount');
    } finally {
      await session.close();
    }
  }

  async initializeSpatialRelationships(): Promise<void> {
    const session = this.driver.session();
    
    try {
      const relationships: { from: string; to: string; type: string; priority: number; reason: string; doorType?: string; minDistance?: number; maxDistance?: number; flowDirection?: string; flowType?: string; }[] = [
        // Gowning Area relationships
        { from: 'gowning-area', to: 'weighing-area', type: 'ADJACENT_TO', priority: 9, reason: 'Personnel flow control', doorType: 'airlock' },
        { from: 'gowning-area', to: 'granulation', type: 'ADJACENT_TO', priority: 8, reason: 'Personnel flow control', doorType: 'airlock' },
        { from: 'gowning-area', to: 'compression', type: 'ADJACENT_TO', priority: 8, reason: 'Personnel flow control', doorType: 'airlock' },
        
        // Production flow relationships
        { from: 'weighing-area', to: 'granulation', type: 'ADJACENT_TO', priority: 9, reason: 'Material flow optimization', doorType: 'pass-through' },
        { from: 'granulation', to: 'compression', type: 'ADJACENT_TO', priority: 9, reason: 'Material flow optimization', doorType: 'pass-through' },
        { from: 'compression', to: 'coating', type: 'ADJACENT_TO', priority: 8, reason: 'Material flow optimization', doorType: 'pass-through' },
        { from: 'coating', to: 'packaging', type: 'ADJACENT_TO', priority: 8, reason: 'Material flow optimization', doorType: 'pass-through' },
        
        // Quality Control relationships
        { from: 'analytical-lab', to: 'weighing-area', type: 'REQUIRES_ACCESS', priority: 7, reason: 'Sample collection and testing' },
        { from: 'analytical-lab', to: 'granulation', type: 'REQUIRES_ACCESS', priority: 7, reason: 'Sample collection and testing' },
        { from: 'analytical-lab', to: 'compression', type: 'REQUIRES_ACCESS', priority: 7, reason: 'Sample collection and testing' },
        { from: 'microbiology', to: 'analytical-lab', type: 'ADJACENT_TO', priority: 6, reason: 'Sample sharing and coordination' },
        
        // Storage relationships
        { from: 'raw-materials', to: 'weighing-area', type: 'ADJACENT_TO', priority: 9, reason: 'Material supply optimization', doorType: 'pass-through' },
        { from: 'packaging', to: 'finished-goods', type: 'ADJACENT_TO', priority: 9, reason: 'Product flow optimization', doorType: 'pass-through' },
        { from: 'quarantine', to: 'raw-materials', type: 'ADJACENT_TO', priority: 7, reason: 'Material inspection workflow' },
        { from: 'quarantine', to: 'finished-goods', type: 'ADJACENT_TO', priority: 7, reason: 'Product inspection workflow' },
        
        // Utility relationships
        { from: 'hvac', to: 'weighing-area', type: 'SHARES_UTILITY', priority: 8, reason: 'Air handling system connection' },
        { from: 'hvac', to: 'granulation', type: 'SHARES_UTILITY', priority: 8, reason: 'Air handling system connection' },
        { from: 'hvac', to: 'compression', type: 'SHARES_UTILITY', priority: 8, reason: 'Air handling system connection' },
        { from: 'purified-water', to: 'weighing-area', type: 'SHARES_UTILITY', priority: 7, reason: 'Purified water supply' },
        { from: 'purified-water', to: 'granulation', type: 'SHARES_UTILITY', priority: 7, reason: 'Purified water supply' },
        { from: 'compressed-air', to: 'compression', type: 'SHARES_UTILITY', priority: 8, reason: 'Compressed air for tablet press' },
        
        // Prohibited relationships (contamination control)
        { from: 'microbiology', to: 'weighing-area', type: 'PROHIBITED_NEAR', priority: 10, reason: 'Contamination risk', minDistance: 10 },
        { from: 'microbiology', to: 'granulation', type: 'PROHIBITED_NEAR', priority: 10, reason: 'Contamination risk', minDistance: 10 },
        { from: 'waste-disposal', to: 'weighing-area', type: 'PROHIBITED_NEAR', priority: 9, reason: 'Contamination risk', minDistance: 5 },
        { from: 'waste-disposal', to: 'granulation', type: 'PROHIBITED_NEAR', priority: 9, reason: 'Contamination risk', minDistance: 5 },
        { from: 'waste-disposal', to: 'compression', type: 'PROHIBITED_NEAR', priority: 9, reason: 'Contamination risk', minDistance: 5 },
        
        // Personnel areas
        { from: 'break-room', to: 'gowning-area', type: 'ADJACENT_TO', priority: 6, reason: 'Personnel convenience' },
        { from: 'offices', to: 'analytical-lab', type: 'ADJACENT_TO', priority: 5, reason: 'Administrative oversight' },
        { from: 'training-room', to: 'gowning-area', type: 'ADJACENT_TO', priority: 4, reason: 'Training workflow' },
        
        // Support areas
        { from: 'maintenance', to: 'hvac', type: 'ADJACENT_TO', priority: 7, reason: 'Maintenance access' },
        { from: 'maintenance', to: 'purified-water', type: 'ADJACENT_TO', priority: 7, reason: 'Maintenance access' },
        { from: 'maintenance', to: 'compressed-air', type: 'ADJACENT_TO', priority: 7, reason: 'Maintenance access' },
        { from: 'receiving', to: 'raw-materials', type: 'ADJACENT_TO', priority: 8, reason: 'Material receipt workflow' },
        { from: 'shipping', to: 'finished-goods', type: 'ADJACENT_TO', priority: 8, reason: 'Product shipping workflow' },
        
        // Material flow relationships
        { from: 'raw-materials', to: 'weighing-area', type: 'MATERIAL_FLOW', priority: 9, reason: 'Raw material supply chain', flowDirection: 'unidirectional', flowType: 'raw_material' },
        { from: 'weighing-area', to: 'granulation', type: 'MATERIAL_FLOW', priority: 9, reason: 'Weighed material transfer', flowDirection: 'unidirectional', flowType: 'raw_material' },
        { from: 'granulation', to: 'compression', type: 'MATERIAL_FLOW', priority: 9, reason: 'Granulated material transfer', flowDirection: 'unidirectional', flowType: 'raw_material' },
        { from: 'compression', to: 'coating', type: 'MATERIAL_FLOW', priority: 8, reason: 'Compressed tablet transfer', flowDirection: 'unidirectional', flowType: 'finished_product' },
        { from: 'coating', to: 'packaging', type: 'MATERIAL_FLOW', priority: 8, reason: 'Coated tablet transfer', flowDirection: 'unidirectional', flowType: 'finished_product' },
        { from: 'packaging', to: 'finished-goods', type: 'MATERIAL_FLOW', priority: 9, reason: 'Packaged product storage', flowDirection: 'unidirectional', flowType: 'finished_product' },
        { from: 'finished-goods', to: 'shipping', type: 'MATERIAL_FLOW', priority: 8, reason: 'Product distribution', flowDirection: 'unidirectional', flowType: 'finished_product' },
        { from: 'receiving', to: 'quarantine', type: 'MATERIAL_FLOW', priority: 7, reason: 'Incoming material quarantine', flowDirection: 'unidirectional', flowType: 'raw_material' },
        { from: 'quarantine', to: 'raw-materials', type: 'MATERIAL_FLOW', priority: 7, reason: 'Approved material release', flowDirection: 'unidirectional', flowType: 'raw_material' },
        
        // Waste material flow
        { from: 'weighing-area', to: 'waste-disposal', type: 'MATERIAL_FLOW', priority: 6, reason: 'Waste material disposal', flowDirection: 'unidirectional', flowType: 'waste' },
        { from: 'granulation', to: 'waste-disposal', type: 'MATERIAL_FLOW', priority: 6, reason: 'Waste material disposal', flowDirection: 'unidirectional', flowType: 'waste' },
        { from: 'compression', to: 'waste-disposal', type: 'MATERIAL_FLOW', priority: 6, reason: 'Waste material disposal', flowDirection: 'unidirectional', flowType: 'waste' },
        { from: 'coating', to: 'waste-disposal', type: 'MATERIAL_FLOW', priority: 6, reason: 'Waste material disposal', flowDirection: 'unidirectional', flowType: 'waste' },
        { from: 'packaging', to: 'waste-disposal', type: 'MATERIAL_FLOW', priority: 6, reason: 'Waste material disposal', flowDirection: 'unidirectional', flowType: 'waste' },
        
        // Personnel flow relationships
        { from: 'gowning-area', to: 'weighing-area', type: 'PERSONNEL_FLOW', priority: 9, reason: 'Operator entry into production', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'granulation', type: 'PERSONNEL_FLOW', priority: 9, reason: 'Operator entry into production', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'compression', type: 'PERSONNEL_FLOW', priority: 9, reason: 'Operator entry into production', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'coating', type: 'PERSONNEL_FLOW', priority: 8, reason: 'Operator entry into production', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'packaging', type: 'PERSONNEL_FLOW', priority: 8, reason: 'Operator entry into production', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'analytical-lab', type: 'PERSONNEL_FLOW', priority: 7, reason: 'Analyst entry into lab', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'gowning-area', to: 'microbiology', type: 'PERSONNEL_FLOW', priority: 7, reason: 'Microbiologist entry into lab', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'break-room', to: 'gowning-area', type: 'PERSONNEL_FLOW', priority: 6, reason: 'Personnel break workflow', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'training-room', to: 'gowning-area', type: 'PERSONNEL_FLOW', priority: 5, reason: 'Training to production workflow', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'offices', to: 'gowning-area', type: 'PERSONNEL_FLOW', priority: 4, reason: 'Management oversight access', flowDirection: 'bidirectional', flowType: 'personnel' },
        { from: 'maintenance', to: 'gowning-area', type: 'PERSONNEL_FLOW', priority: 7, reason: 'Maintenance personnel access', flowDirection: 'bidirectional', flowType: 'personnel' }
      ];

      for (const rel of relationships) {
        await session.run(
          `MATCH (from:NodeTemplate {id: $from})
           MATCH (to:NodeTemplate {id: $to})
           MERGE (from)-[r:${rel.type}]->(to)
           ON CREATE SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.flowDirection = $flowDirection,
             r.flowType = $flowType,
             r.createdAt = datetime(),
             r.updatedAt = datetime()
           ON MATCH SET
             r.priority = $priority,
             r.reason = $reason,
             r.doorType = $doorType,
             r.minDistance = $minDistance,
             r.maxDistance = $maxDistance,
             r.flowDirection = $flowDirection,
             r.flowType = $flowType,
             r.updatedAt = datetime()`,
          {
            from: rel.from,
            to: rel.to,
            priority: rel.priority,
            reason: rel.reason,
            doorType: rel.doorType || null,
            minDistance: rel.minDistance || null,
            maxDistance: rel.maxDistance || null,
            flowDirection: rel.flowDirection || null,
            flowType: rel.flowType || null
          }
        );
      }
    } finally {
      await session.close();
    }
  }
}