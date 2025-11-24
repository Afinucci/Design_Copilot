/**
 * Relationship Suggestions API Routes
 *
 * Provides endpoints for Layout Designer mode to get Neo4j-based
 * relationship suggestions for shapes with assigned functional areas
 */

import { Router } from 'express';
import { RelationshipSuggestionsService } from '../services/relationshipSuggestions';

const router = Router();
const suggestionsService = new RelationshipSuggestionsService();

/**
 * GET /api/suggestions/relationships/:functionalAreaName
 *
 * Get all relationship-based suggestions for a given functional area.
 * Used when a shape in Layout Designer has a Neo4j functional area assigned.
 *
 * Returns compatible adjacent areas based on Neo4j relationships.
 */
router.get('/relationships/:functionalAreaName', async (req, res) => {
  try {
    const { functionalAreaName } = req.params;
    const { cleanroomClass } = req.query;

    if (!functionalAreaName) {
      return res.status(400).json({ error: 'functionalAreaName parameter is required' });
    }

    console.log('🎯 Suggestions API: Getting relationship suggestions for:', {
      functionalAreaName,
      cleanroomClass: cleanroomClass || 'not specified'
    });

    const suggestions = await suggestionsService.getSuggestionsForArea(
      functionalAreaName,
      cleanroomClass as string | undefined
    );

    console.log('🎯 Suggestions API: Found', suggestions.length, 'suggestions');

    res.json({
      functionalArea: functionalAreaName,
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error('❌ Suggestions API: Error getting relationship suggestions:', error);
    res.status(500).json({
      error: 'Failed to get relationship suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/suggestions/relationship-details/:sourceName/:targetName
 *
 * Get detailed relationship information between two functional areas.
 * Useful for displaying why a specific suggestion is made.
 */
router.get('/relationship-details/:sourceName/:targetName', async (req, res) => {
  try {
    const { sourceName, targetName } = req.params;

    if (!sourceName || !targetName) {
      return res.status(400).json({
        error: 'Both sourceName and targetName parameters are required'
      });
    }

    console.log('🎯 Suggestions API: Getting relationship details between:', sourceName, 'and', targetName);

    const relationships = await suggestionsService.getRelationshipDetails(sourceName, targetName);

    res.json({
      source: sourceName,
      target: targetName,
      relationships,
      count: relationships.length
    });

  } catch (error) {
    console.error('❌ Suggestions API: Error getting relationship details:', error);
    res.status(500).json({
      error: 'Failed to get relationship details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
