/**
 * Relationship Suggestions Service
 *
 * Provides intelligent suggestions for shapes in Layout Designer mode based on
 * Neo4j relationships. When a shape has a Neo4j functional area assigned,
 * this service queries all connected relationships to suggest compatible adjacent areas.
 */

import Neo4jService from '../config/database';
import { SpatialRelationship } from '../types';
import { getNodeNameVariations } from '../utils/nodeNameUtils';

export interface RelationshipSuggestion {
  id: string;
  name: string;
  category: string;
  cleanroomClass?: string;
  color?: string;
  relationships: SuggestionRelationship[];
  confidence: number;
  reason: string;
}

export interface SuggestionRelationship {
  type: string;
  direction: 'incoming' | 'outgoing' | 'bidirectional';
  reason?: string;
  priority?: number;
}

export class RelationshipSuggestionsService {
  /**
   * Get all relationship-based suggestions for a functional area
   * @param functionalAreaName - Name of the functional area assigned to the shape
   * @param cleanroomClass - Optional cleanroom class to filter by (e.g., "A", "B", "C", "D")
   * @returns Array of suggestions with relationship metadata
   */
  async getSuggestionsForArea(functionalAreaName: string, cleanroomClass?: string): Promise<RelationshipSuggestion[]> {
    const neo4jService = Neo4jService.getInstance();
    const isConnected = await neo4jService.verifyConnection();

    if (!isConnected) {
      console.log('🔗 RelationshipSuggestions: Neo4j not connected, returning empty suggestions');
      return [];
    }

    const session = neo4jService.getSession();

    try {
      // Get all name variations for fuzzy matching
      const nameVariations = getNodeNameVariations(functionalAreaName);

      console.log('🔗 RelationshipSuggestions: Querying for area:', {
        functionalAreaName,
        cleanroomClass: cleanroomClass || 'any',
        variations: nameVariations
      });

      // Query for all relationships (incoming and outgoing)
      // Filter by cleanroom class if provided to get exact node match
      const query = `
        // Find the source node by name (case-insensitive) and optionally by cleanroom class
        MATCH (source)
        WHERE toLower(source.name) IN $nameVariations
        ${cleanroomClass ? 'AND source.cleanroomClass = $cleanroomClass' : ''}

        // Get all outgoing relationships to any connected node
        OPTIONAL MATCH (source)-[outRel]->(target)
        WHERE target.name IS NOT NULL

        // Get all incoming relationships from any connected node
        OPTIONAL MATCH (incoming)-[inRel]->(source)
        WHERE incoming.name IS NOT NULL

        WITH source,
             collect(DISTINCT {node: target, rel: outRel, direction: 'outgoing'}) as outgoing,
             collect(DISTINCT {node: incoming, rel: inRel, direction: 'incoming'}) as incoming

        // Combine and return unique suggestions
        UNWIND (outgoing + incoming) as suggestion
        WITH suggestion
        WHERE suggestion.node IS NOT NULL

        RETURN DISTINCT
          suggestion.node.name as name,
          type(suggestion.rel) as relType,
          suggestion.direction as direction,
          suggestion.rel.reason as reason,
          suggestion.rel.priority as priority,
          suggestion.rel.confidence as confidence,
          // Try to get optional properties if they exist
          COALESCE(suggestion.node.id, suggestion.node.name) as id,
          COALESCE(suggestion.node.category, 'Unknown') as category,
          suggestion.node.cleanroomClass as cleanroomClass,
          suggestion.node.color as color
        ORDER BY COALESCE(suggestion.rel.priority, 5), name
      `;

      const queryParams: any = {
        nameVariations: nameVariations.map(v => v.toLowerCase())
      };
      if (cleanroomClass) {
        queryParams.cleanroomClass = cleanroomClass;
      }

      const result = await session.run(query, queryParams);

      console.log('🔗 RelationshipSuggestions: Query returned', result.records.length, 'records');

      if (result.records.length === 0) {
        console.log('🔗 RelationshipSuggestions: ⚠️  No suggestions found for', functionalAreaName);
        console.log('🔗 RelationshipSuggestions: Tried variations:', nameVariations);

        // Try a simpler query to see if the node exists at all
        const debugQuery = `MATCH (n) WHERE toLower(n.name) CONTAINS toLower($name) RETURN n.name as name LIMIT 5`;
        const debugResult = await session.run(debugQuery, { name: functionalAreaName });
        console.log('🔗 RelationshipSuggestions: Found similar nodes:', debugResult.records.map(r => r.get('name')));

        return [];
      }

      // Group suggestions by node (a single node might have multiple relationships)
      const suggestionMap = new Map<string, RelationshipSuggestion>();

      for (const record of result.records) {
        const nodeId = record.get('id');
        const nodeName = record.get('name');
        const relType = record.get('relType');
        const direction = record.get('direction');
        const reason = record.get('reason');
        const priority = record.get('priority');
        const confidence = record.get('confidence') || 0.7;

        if (!suggestionMap.has(nodeId)) {
          suggestionMap.set(nodeId, {
            id: nodeId,
            name: nodeName,
            category: record.get('category') || 'Unknown',
            cleanroomClass: record.get('cleanroomClass'),
            color: record.get('color'),
            relationships: [],
            confidence,
            reason: reason || `Connected via ${relType}`
          });
        }

        const suggestion = suggestionMap.get(nodeId)!;
        suggestion.relationships.push({
          type: relType,
          direction,
          reason,
          priority: priority || 5
        });
      }

      const suggestions = Array.from(suggestionMap.values());

      console.log('🔗 RelationshipSuggestions: Found', suggestions.length, 'unique suggestions with',
                  suggestions.reduce((sum, s) => sum + s.relationships.length, 0), 'total relationships');

      return suggestions;

    } catch (error) {
      console.error('🔗 RelationshipSuggestions: Error querying Neo4j:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Get detailed relationship information between two functional areas
   * Useful for displaying why a suggestion is made
   */
  async getRelationshipDetails(
    sourceName: string,
    targetName: string
  ): Promise<SuggestionRelationship[]> {
    const neo4jService = Neo4jService.getInstance();
    const isConnected = await neo4jService.verifyConnection();

    if (!isConnected) {
      return [];
    }

    const session = neo4jService.getSession();

    try {
      const sourceVariations = getNodeNameVariations(sourceName);
      const targetVariations = getNodeNameVariations(targetName);

      const query = `
        MATCH (source:FunctionalArea)
        WHERE toLower(source.name) IN $sourceVariations

        MATCH (target:FunctionalArea)
        WHERE toLower(target.name) IN $targetVariations

        MATCH (source)-[rel]-(target)

        RETURN
          type(rel) as relType,
          CASE
            WHEN startNode(rel) = source THEN 'outgoing'
            WHEN endNode(rel) = source THEN 'incoming'
            ELSE 'bidirectional'
          END as direction,
          rel.reason as reason,
          rel.priority as priority
      `;

      const result = await session.run(query, {
        sourceVariations: sourceVariations.map(v => v.toLowerCase()),
        targetVariations: targetVariations.map(v => v.toLowerCase())
      });

      return result.records.map(record => ({
        type: record.get('relType'),
        direction: record.get('direction'),
        reason: record.get('reason'),
        priority: record.get('priority') || 5
      }));

    } catch (error) {
      console.error('🔗 RelationshipSuggestions: Error getting relationship details:', error);
      return [];
    } finally {
      await session.close();
    }
  }
}
