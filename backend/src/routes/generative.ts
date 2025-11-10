import express from 'express';
import GenerativeLayoutService from '../services/generativeLayoutService';
import FacilityTemplatesService from '../services/facilityTemplatesService';
import GMPKnowledgeService from '../services/gmpKnowledgeService';
import SpatialReasoningService from '../services/spatialReasoningService';
import {
  LayoutGenerationRequest,
  TemplateInstantiationRequest,
  Diagram
} from '../types';

const router = express.Router();

// Initialize services
const generativeService = GenerativeLayoutService.getInstance();
const templatesService = FacilityTemplatesService.getInstance();
const gmpService = GMPKnowledgeService.getInstance();
const spatialService = SpatialReasoningService.getInstance();

// ============================================
// GENERATIVE LAYOUT ROUTES
// ============================================

/**
 * POST /api/generative/generate-layout
 * Generate a complete facility layout from natural language description
 */
router.post('/generate-layout', async (req, res) => {
  try {
    console.log('🚀 Received layout generation request');

    const request: LayoutGenerationRequest = req.body;

    // Validate request
    if (!request.description) {
      return res.status(400).json({
        error: 'Description is required'
      });
    }

    // Generate layout
    const generatedLayout = await generativeService.generateLayout(request);

    console.log(`✅ Generated layout with ${generatedLayout.nodes.length} nodes`);
    console.log(`📊 Compliance Score: ${generatedLayout.complianceScore}/100`);

    res.json(generatedLayout);
  } catch (error: any) {
    console.error('❌ Error generating layout:', error);
    res.status(500).json({
      error: 'Failed to generate layout',
      message: error.message
    });
  }
});

// ============================================
// FACILITY TEMPLATE ROUTES
// ============================================

/**
 * GET /api/generative/templates
 * Get all available facility templates
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = templatesService.getAllTemplates();

    console.log(`📋 Retrieved ${templates.length} facility templates`);

    res.json({
      templates,
      count: templates.length
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      message: error.message
    });
  }
});

/**
 * GET /api/generative/templates/:templateId
 * Get specific template by ID
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = templatesService.getTemplateById(templateId);

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        templateId
      });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      error: 'Failed to fetch template',
      message: error.message
    });
  }
});

/**
 * POST /api/generative/templates/instantiate
 * Instantiate a facility template with parameters
 */
router.post('/templates/instantiate', async (req, res) => {
  try {
    console.log('🏗️  Instantiating facility template');

    const request: TemplateInstantiationRequest = req.body;

    // Validate request
    if (!request.templateId) {
      return res.status(400).json({
        error: 'Template ID is required'
      });
    }

    if (!request.parameters) {
      return res.status(400).json({
        error: 'Parameters are required'
      });
    }

    // Instantiate template
    const diagram = await templatesService.instantiateTemplate(request);

    console.log(`✅ Instantiated template with ${diagram.nodes.length} nodes`);

    res.json(diagram);
  } catch (error: any) {
    console.error('❌ Error instantiating template:', error);
    res.status(500).json({
      error: 'Failed to instantiate template',
      message: error.message
    });
  }
});

// ============================================
// COMPLIANCE & VALIDATION ROUTES
// ============================================

/**
 * POST /api/generative/check-compliance
 * Check layout compliance against GMP regulations
 */
router.post('/check-compliance', async (req, res) => {
  try {
    console.log('🔍 Checking layout compliance');

    const { diagram, regulatoryZone } = req.body;

    if (!diagram) {
      return res.status(400).json({
        error: 'Diagram is required'
      });
    }

    // Check compliance
    const complianceReport = await gmpService.checkCompliance(
      diagram,
      regulatoryZone || 'FDA'
    );

    console.log(`✅ Compliance check complete: ${complianceReport.overallScore}/100`);
    console.log(`   Passed: ${complianceReport.passed}/${complianceReport.totalChecks}`);
    console.log(`   Failed: ${complianceReport.failed}`);

    res.json(complianceReport);
  } catch (error: any) {
    console.error('Error checking compliance:', error);
    res.status(500).json({
      error: 'Failed to check compliance',
      message: error.message
    });
  }
});

/**
 * GET /api/generative/regulatory-rules
 * Get all GMP regulatory rules
 */
router.get('/regulatory-rules', async (req, res) => {
  try {
    const { zone } = req.query;

    const rules = zone
      ? gmpService.getRulesByZone(zone as any)
      : gmpService.getAllRules();

    console.log(`📚 Retrieved ${rules.length} regulatory rules`);

    res.json({
      rules,
      count: rules.length,
      zone: zone || 'all'
    });
  } catch (error: any) {
    console.error('Error fetching regulatory rules:', error);
    res.status(500).json({
      error: 'Failed to fetch regulatory rules',
      message: error.message
    });
  }
});

// ============================================
// SPATIAL REASONING ROUTES
// ============================================

/**
 * POST /api/generative/calculate-position
 * Calculate optimal position for a new node
 */
router.post('/calculate-position', async (req, res) => {
  try {
    console.log('📍 Calculating optimal node position');

    const { newNode, existingNodes, relationships, preferences } = req.body;

    if (!newNode) {
      return res.status(400).json({
        error: 'New node template is required'
      });
    }

    // Calculate optimal position
    const placement = await spatialService.calculateOptimalPosition(
      newNode,
      existingNodes || [],
      relationships || [],
      preferences
    );

    console.log(`✅ Calculated position: (${placement.position.x}, ${placement.position.y})`);
    console.log(`   Score: ${placement.score.toFixed(2)}`);

    res.json(placement);
  } catch (error: any) {
    console.error('Error calculating position:', error);
    res.status(500).json({
      error: 'Failed to calculate position',
      message: error.message
    });
  }
});

/**
 * POST /api/generative/optimize-layout
 * Optimize entire layout positions
 */
router.post('/optimize-layout', async (req, res) => {
  try {
    console.log('⚡ Optimizing layout positions');

    const { nodes, relationships, options } = req.body;

    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({
        error: 'Nodes array is required'
      });
    }

    // Calculate optimized positions
    const positions = await spatialService.calculateLayoutPositions(
      nodes,
      relationships || [],
      options
    );

    // Convert Map to object for JSON response
    const positionsObj: Record<string, { x: number; y: number }> = {};
    positions.forEach((pos, nodeId) => {
      positionsObj[nodeId] = pos;
    });

    console.log(`✅ Optimized positions for ${nodes.length} nodes`);

    res.json({
      positions: positionsObj,
      count: nodes.length
    });
  } catch (error: any) {
    console.error('Error optimizing layout:', error);
    res.status(500).json({
      error: 'Failed to optimize layout',
      message: error.message
    });
  }
});

/**
 * POST /api/generative/enhance-ghost-suggestion
 * Enhance ghost suggestion with spatial intelligence
 */
router.post('/enhance-ghost-suggestion', async (req, res) => {
  try {
    const { ghostSuggestion, existingNodes, relationships } = req.body;

    if (!ghostSuggestion) {
      return res.status(400).json({
        error: 'Ghost suggestion is required'
      });
    }

    // Enhance with spatial intelligence
    const smartGhost = await spatialService.enhanceGhostSuggestion(
      ghostSuggestion,
      existingNodes || [],
      relationships || []
    );

    console.log(`✨ Enhanced ghost suggestion: ${smartGhost.name}`);
    console.log(`   Optimal position: (${smartGhost.optimalPosition.x}, ${smartGhost.optimalPosition.y})`);
    console.log(`   Spatial score: ${smartGhost.spatialScore.toFixed(2)}`);

    res.json(smartGhost);
  } catch (error: any) {
    console.error('Error enhancing ghost suggestion:', error);
    res.status(500).json({
      error: 'Failed to enhance ghost suggestion',
      message: error.message
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/generative/health
 * Health check for generative AI services
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      generativeLayout: 'active',
      facilityTemplates: 'active',
      gmpKnowledge: 'active',
      spatialReasoning: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
