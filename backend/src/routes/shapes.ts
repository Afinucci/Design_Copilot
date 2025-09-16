import express from 'express';
import { AdjacencyValidationService } from '../services/adjacencyValidation';
import Neo4jService from '../config/database';

const router = express.Router();
const neo4jService = Neo4jService.getInstance();
const adjacencyService = new AdjacencyValidationService(neo4jService.getDriver());

interface ShapePositionRequest {
  shapeId: string;
  position: { x: number; y: number };
  shapeGeometry: {
    vertices: Array<{ x: number; y: number }>;
    boundingBox: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      width: number;
      height: number;
    };
  };
  assignedNodeId?: string;
  nearbyShapes: Array<{
    id: string;
    assignedNodeId?: string;
    geometry: {
      vertices: Array<{ x: number; y: number }>;
      boundingBox: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        width: number;
        height: number;
      };
    };
    distance: number;
    collisionType?: 'overlap' | 'edge-touch' | 'near-proximity';
  }>;
}

interface ShapeValidationResult {
  canPlace: boolean;
  violations: Array<{
    shapeId: string;
    reason: string;
    severity: 'error' | 'warning';
    collisionType: 'overlap' | 'edge-touch' | 'near-proximity';
  }>;
  warnings: string[];
  adjacencyChecks: Array<{
    targetShapeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    canBeAdjacent: boolean;
    reason: string;
  }>;
}

/**
 * Validate if a shape can be placed at a specific position
 * POST /api/shapes/validate-position
 */
router.post('/validate-position', async (req, res) => {
  try {
    const request: ShapePositionRequest = req.body;
    
    if (!request.shapeId || !request.position || !request.shapeGeometry) {
      return res.status(400).json({
        error: 'Missing required fields: shapeId, position, or shapeGeometry'
      });
    }

    const result: ShapeValidationResult = {
      canPlace: true,
      violations: [],
      warnings: [],
      adjacencyChecks: []
    };

    // If the shape doesn't have a Neo4j assignment, allow placement with warning
    if (!request.assignedNodeId) {
      result.warnings.push('Shape not assigned to Neo4j node - adjacency constraints not enforced');
      return res.json(result);
    }

    // Check adjacency constraints for each nearby shape
    for (const nearbyShape of request.nearbyShapes) {
      if (!nearbyShape.assignedNodeId) {
        continue; // Skip shapes without Neo4j assignments
      }

      // Check if shapes are actually colliding/touching
      const isColliding = nearbyShape.distance <= 2; // 2px tolerance for "touching"
      
      if (isColliding) {
        // Validate adjacency relationship
        const adjacencyResult = await adjacencyService.validateAdjacency(
          request.assignedNodeId,
          nearbyShape.assignedNodeId
        );

        result.adjacencyChecks.push({
          targetShapeId: nearbyShape.id,
          sourceNodeId: request.assignedNodeId,
          targetNodeId: nearbyShape.assignedNodeId,
          canBeAdjacent: adjacencyResult.canBeAdjacent,
          reason: adjacencyResult.reason
        });

        // Rule: even if adjacency exists, interior overlap is not allowed; only edge-touch permitted
        const collisionType = nearbyShape.collisionType || (nearbyShape.distance === 0 ? 'overlap' : nearbyShape.distance <= 1 ? 'edge-touch' : 'near-proximity');

        if (!adjacencyResult.canBeAdjacent || collisionType === 'overlap') {
          result.canPlace = false;
          result.violations.push({
            shapeId: nearbyShape.id,
            reason: !adjacencyResult.canBeAdjacent
              ? adjacencyResult.reason
              : 'Adjacent shapes cannot overlap interiors; only edge-to-edge contact allowed',
            severity: 'error',
            collisionType
          });
        }
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Error validating shape position:', error);
    res.status(500).json({
      error: 'Failed to validate shape position',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check if two specific Neo4j nodes can be adjacent
 * GET /api/shapes/adjacency/:nodeId1/:nodeId2
 */
router.get('/adjacency/:nodeId1/:nodeId2', async (req, res) => {
  try {
    const { nodeId1, nodeId2 } = req.params;

    if (!nodeId1 || !nodeId2) {
      return res.status(400).json({
        error: 'Both nodeId1 and nodeId2 are required'
      });
    }

    const adjacencyResult = await adjacencyService.validateAdjacency(nodeId1, nodeId2);
    
    res.json({
      nodeId1,
      nodeId2,
      canBeAdjacent: adjacencyResult.canBeAdjacent,
      relationshipType: adjacencyResult.relationshipType,
      reason: adjacencyResult.reason,
      confidence: adjacencyResult.confidence
    });

  } catch (error) {
    console.error('Error checking adjacency:', error);
    res.status(500).json({
      error: 'Failed to check adjacency',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Bulk validate adjacency for multiple shape pairs
 * POST /api/shapes/bulk-adjacency
 */
router.post('/bulk-adjacency', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests)) {
      return res.status(400).json({
        error: 'requests must be an array of {nodeId1, nodeId2} objects'
      });
    }

    const results = await adjacencyService.validateBulkAdjacency(requests);
    
    res.json({
      results,
      total: results.length,
      allowed: results.filter(r => r.canBeAdjacent).length,
      blocked: results.filter(r => !r.canBeAdjacent).length
    });

  } catch (error) {
    console.error('Error in bulk adjacency validation:', error);
    res.status(500).json({
      error: 'Failed to validate bulk adjacency',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get adjacency validation cache statistics
 * GET /api/shapes/cache-stats
 */
router.get('/cache-stats', (req, res) => {
  try {
    const stats = adjacencyService.getCacheStats();
    res.json({
      cacheSize: stats.size,
      cachedPairs: stats.keys,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      error: 'Failed to get cache statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear adjacency validation cache
 * POST /api/shapes/clear-cache
 */
router.post('/clear-cache', (req, res) => {
  try {
    adjacencyService.clearCache();
    res.json({
      message: 'Adjacency validation cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for adjacency validation service
 * GET /api/shapes/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test with a simple adjacency check
    const testResult = await adjacencyService.validateAdjacency('test-node-1', 'test-node-2');
    
    res.json({
      status: 'healthy',
      service: 'adjacency-validation',
      neo4jConnected: true,
      cacheSize: adjacencyService.getCacheStats().size,
      timestamp: new Date().toISOString(),
      testQuery: {
        executed: true,
        result: testResult.reason
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'adjacency-validation',
      neo4jConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;