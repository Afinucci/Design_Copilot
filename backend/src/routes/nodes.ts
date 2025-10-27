import { Router } from 'express';
import { FunctionalAreaModel } from '../models/FunctionalArea';
import { SpatialRelationshipModel } from '../models/SpatialRelationship';
import Neo4jService from '../config/database';
import { NodeCategory } from '../types';
import { StaticNodeTemplatesService } from '../services/staticNodeTemplatesService';

// Temporary placeholder types for legacy ghost code (to be removed)
interface GhostRelationship {
  type: string;
  flowType?: string;
}
interface GhostSuggestion {
  id: string;
  name: string;
  [key: string]: any;
}
class GhostSuggestionsService {
  async getGhostSuggestions(...args: any[]): Promise<GhostSuggestion[]> { return []; }
}

const router = Router();
const functionalAreaModel = new FunctionalAreaModel();
const spatialRelationshipModel = new SpatialRelationshipModel();
const staticTemplatesService = StaticNodeTemplatesService.getInstance();


// Helper functions for mock data generation
function getTriggerNodeName(nodeId: string): string {
  // Extract meaningful name from nodeId (handles various formats including double prefixing)
  let extractedName = nodeId;
  
  try {
    // Validate input
    if (!nodeId || typeof nodeId !== 'string') {
      return nodeId || 'unknown';
    }
  
    // Handle IDs like "node-coating-1752648770287" or "node-node-coating-123-456"
    const patterns = [
      /^node-node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,  // node-node-coating-123-456 (double prefix)
      /^node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,       // node-coating-123 (single prefix)  
      /^([a-zA-Z]+(?:-[a-zA-Z]+)*)(?:-\d+)*$/,             // coating or coating-123 (no prefix)
    ];
    
    for (const pattern of patterns) {
      const match = nodeId.match(pattern);
      if (match && match[1]) {
        extractedName = match[1];
        break;
      }
    }
    
    // If no pattern matched, log warning but continue
    if (extractedName === nodeId) {
    }
    
  } catch (error) {
    // Return nodeId as fallback
    return nodeId;
  }
  
  // Enhanced name mapping with multiple variations to match database content
  const nameMapping: { [key: string]: string[] } = {
    'weighing': ['Weighing', 'Weighing Room', 'Weighing Area'],
    'weighing-area': ['Weighing Area', 'Weighing Room', 'Weighing'],
    'weighing-room': ['Weighing Room', 'Weighing Area', 'Weighing'],
    'granulation': ['Granulation', 'Granulation Area', 'Granulation Room'],
    'compression': ['Compression', 'Compression Area', 'Compression Room', 'Tablet Compression'],
    'coating': ['Coating', 'Coating Area', 'Coating Room', 'Film Coating'],
    'packaging': ['Packaging', 'Packaging Area', 'Packaging Room', 'Primary Packaging'],
    // Enhanced analytical lab variations
    'analytical': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'analytical-lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'analytical_lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'quality-control': ['Quality Control', 'Analytical Lab', 'QC Lab', 'Quality Assurance', 'QA Lab'],
    'qc-lab': ['QC Lab', 'Quality Control', 'Analytical Lab', 'Quality Control Lab'],
    'testing-lab': ['Testing Lab', 'Analytical Lab', 'Laboratory', 'Testing Laboratory'],
    'lab': ['Lab', 'Laboratory', 'Analytical Lab', 'Testing Lab'],
    'laboratory': ['Laboratory', 'Lab', 'Analytical Lab', 'Testing Laboratory'],
    'microbiology': ['Microbiology', 'Microbiology Lab', 'Micro Lab', 'Microbiology Laboratory'],
    'micro-lab': ['Micro Lab', 'Microbiology Lab', 'Microbiology', 'Microbiology Laboratory'],
    'raw-materials': ['Raw Materials', 'Raw Materials Storage', 'Raw Material Storage'],
    'finished-goods': ['Finished Goods', 'Finished Goods Storage', 'FG Storage'],
    'gowning': ['Gowning Area', 'Gowning Room', 'Personnel Gowning'],
    'gowning-area': ['Gowning Area', 'Gowning Room', 'Personnel Gowning']
  };
  
  // Return the first variation as the primary name, but log all possible variations
  const variations = nameMapping[extractedName];
  if (variations && variations.length > 0) {
    return variations[0]; // Use the first variation as primary
  }
  
  // Fallback: convert hyphenated to title case
  const titleCase = extractedName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return titleCase;
}

// New function to get all possible name variations for database queries
function getNodeNameVariations(nodeId: string): string[] {
  const extractedName = nodeId;
  let baseName = extractedName;
  
  // Extract base name if it's a nodeId
  const patterns = [
    /^node-node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,  // node-node-coating-123-456 (double prefix)
    /^node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,       // node-coating-123 (single prefix)  
    /^([a-zA-Z]+(?:-[a-zA-Z]+)*)(?:-\d+)*$/,             // coating or coating-123 (no prefix)
  ];
  
  for (const pattern of patterns) {
    const match = nodeId.match(pattern);
    if (match && match[1]) {
      baseName = match[1];
      break;
    }
  }
  
  // Name mapping with multiple variations
  const nameMapping: { [key: string]: string[] } = {
    'weighing': ['Weighing', 'Weighing Room', 'Weighing Area'],
    'weighing-area': ['Weighing Area', 'Weighing Room', 'Weighing'],
    'weighing-room': ['Weighing Room', 'Weighing Area', 'Weighing'],
    'granulation': ['Granulation', 'Granulation Area', 'Granulation Room'],
    'compression': ['Compression', 'Compression Area', 'Compression Room', 'Tablet Compression'],
    'coating': ['Coating', 'Coating Area', 'Coating Room', 'Film Coating'],
    'packaging': ['Packaging', 'Packaging Area', 'Packaging Room', 'Primary Packaging'],
    // Enhanced analytical lab variations
    'analytical': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'analytical-lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'analytical_lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
    'quality-control': ['Quality Control', 'Analytical Lab', 'QC Lab', 'Quality Assurance', 'QA Lab'],
    'qc-lab': ['QC Lab', 'Quality Control', 'Analytical Lab', 'Quality Control Lab'],
    'testing-lab': ['Testing Lab', 'Analytical Lab', 'Laboratory', 'Testing Laboratory'],
    'lab': ['Lab', 'Laboratory', 'Analytical Lab', 'Testing Lab'],
    'laboratory': ['Laboratory', 'Lab', 'Analytical Lab', 'Testing Laboratory'],
    'microbiology': ['Microbiology', 'Microbiology Lab', 'Micro Lab', 'Microbiology Laboratory'],
    'micro-lab': ['Micro Lab', 'Microbiology Lab', 'Microbiology', 'Microbiology Laboratory'],
    'raw-materials': ['Raw Materials', 'Raw Materials Storage', 'Raw Material Storage'],
    'finished-goods': ['Finished Goods', 'Finished Goods Storage', 'FG Storage'],
    'gowning': ['Gowning Area', 'Gowning Room', 'Personnel Gowning'],
    'gowning-area': ['Gowning Area', 'Gowning Room', 'Personnel Gowning']
  };
  
  const variations = nameMapping[baseName];
  if (variations) {
    return variations;
  }
  
  // Fallback: return title case version
  const titleCase = baseName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return [titleCase, baseName];
}

// Validation function to check if a node exists in the database
async function validateNodeExistence(session: any, nodeName: string): Promise<{
  exists: boolean;
  matchedName?: string;
  totalVariationsTried: number;
  variationsTried: string[];
}> {
  console.log('🔍 Validation: Checking node existence for:', nodeName);
  
  // Get all possible name variations to try
  const nameVariations = getNodeNameVariations(nodeName);
  const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
  
  console.log('🔍 Validation: Checking variations:', nameVariations);
  
  const query = `
    MATCH (fa:FunctionalArea)
    WHERE toLower(fa.name) IN $nameVariations
    RETURN fa.name as matchedName
    LIMIT 1
  `;
  
  const result = await session.run(query, { nameVariations: lowerCaseVariations });
  
  const validation = {
    exists: result.records.length > 0,
    matchedName: result.records.length > 0 ? result.records[0].get('matchedName') : undefined,
    totalVariationsTried: nameVariations.length,
    variationsTried: nameVariations
  };
  
  console.log('🔍 Validation: Result:', validation);
  
  return validation;
}

function calculateOptimalPosition(
  triggerPosition: { x: number; y: number },
  existingPositions: Array<{ id: string; x: number; y: number; width?: number; height?: number }>,
  index: number
): { x: number; y: number } {
  console.log('🎯 Enhanced Positioning: Calculating position for suggestion', index);
  console.log('🎯 Enhanced Positioning: Trigger position:', triggerPosition);
  console.log('🎯 Enhanced Positioning: Existing positions:', existingPositions.length);
  
  // Enhanced positioning algorithm
  const minDistance = 180; // Minimum distance from trigger node
  const maxDistance = 300; // Maximum distance from trigger node
  const nodeSize = { width: 140, height: 90 }; // Standard node size
  const padding = 20; // Extra padding between nodes
  
  // Calculate preferred positions in a circle around the trigger node
  const preferredAngles = [
    0,         // Right
    Math.PI/2, // Bottom
    Math.PI,   // Left
    3*Math.PI/2, // Top
    Math.PI/4,   // Bottom-right
    3*Math.PI/4, // Bottom-left
    5*Math.PI/4, // Top-left
    7*Math.PI/4  // Top-right
  ];
  
  // Start with the preferred angle for this index
  let bestPosition = null;
  let bestScore = -1;
  
  // Try different distances and angles to find the best position
  for (let distanceStep = 0; distanceStep < 3; distanceStep++) {
    const distance = minDistance + (distanceStep * 60); // 180, 240, 300
    
    for (let angleIndex = 0; angleIndex < preferredAngles.length; angleIndex++) {
      const angle = preferredAngles[(index + angleIndex) % preferredAngles.length];
      
      const candidatePosition = {
        x: triggerPosition.x + Math.cos(angle) * distance,
        y: triggerPosition.y + Math.sin(angle) * distance
      };
      
      // Calculate score for this position
      const score = evaluatePosition(candidatePosition, triggerPosition, existingPositions, nodeSize, padding);
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = candidatePosition;
      }
    }
  }
  
  // Fallback to simple radial positioning if no good position found
  if (!bestPosition || bestScore < 0.3) {
    console.log('🎯 Enhanced Positioning: Using fallback positioning');
    const fallbackAngle = (index * 60) * (Math.PI / 180); // 60 degrees apart
    bestPosition = {
      x: triggerPosition.x + Math.cos(fallbackAngle) * minDistance,
      y: triggerPosition.y + Math.sin(fallbackAngle) * minDistance
    };
  }
  
  console.log('🎯 Enhanced Positioning: Final position for suggestion', index, ':', bestPosition, 'score:', bestScore);
  return bestPosition;
}

// Evaluate how good a position is (0 = bad, 1 = perfect)
function evaluatePosition(
  candidatePosition: { x: number; y: number },
  triggerPosition: { x: number; y: number },
  existingPositions: Array<{ id: string; x: number; y: number; width?: number; height?: number }>,
  nodeSize: { width: number; height: number },
  padding: number
): number {
  let score = 1.0;
  
  // Check for overlaps with existing nodes
  for (const existing of existingPositions) {
    const existingSize = {
      width: existing.width || nodeSize.width,
      height: existing.height || nodeSize.height
    };
    
    const dx = Math.abs(candidatePosition.x - existing.x);
    const dy = Math.abs(candidatePosition.y - existing.y);
    
    const minDx = (nodeSize.width + existingSize.width) / 2 + padding;
    const minDy = (nodeSize.height + existingSize.height) / 2 + padding;
    
    if (dx < minDx && dy < minDy) {
      // Overlapping - very bad
      const overlapPenalty = 1.0 - Math.min(dx / minDx, dy / minDy);
      score -= overlapPenalty * 0.8;
    } else if (dx < minDx * 1.5 && dy < minDy * 1.5) {
      // Too close - somewhat bad
      const proximityPenalty = 1.0 - Math.min(dx / (minDx * 1.5), dy / (minDy * 1.5));
      score -= proximityPenalty * 0.3;
    }
  }
  
  // Penalize positions that are too far from trigger
  const distanceFromTrigger = Math.sqrt(
    Math.pow(candidatePosition.x - triggerPosition.x, 2) + 
    Math.pow(candidatePosition.y - triggerPosition.y, 2)
  );
  
  if (distanceFromTrigger > 350) {
    score -= (distanceFromTrigger - 350) / 1000; // Penalty for being too far
  } else if (distanceFromTrigger < 150) {
    score -= (150 - distanceFromTrigger) / 150 * 0.5; // Penalty for being too close
  }
  
  // Prefer positions within reasonable canvas bounds (assuming 1200x800 canvas)
  const canvasBounds = { width: 1200, height: 800, marginX: 100, marginY: 100 };
  if (candidatePosition.x < canvasBounds.marginX || 
      candidatePosition.x > canvasBounds.width - canvasBounds.marginX ||
      candidatePosition.y < canvasBounds.marginY || 
      candidatePosition.y > canvasBounds.height - canvasBounds.marginY) {
    score -= 0.4; // Penalty for being near canvas edges
  }
  
  return Math.max(0, score);
}

function getRelationshipType(sourceCategory: string, targetCategory: string): GhostRelationship['type'] {
  // Mock relationship type mapping
  const materialFlowPairs = [
    ['Weighing Room', 'Dispensing'],
    ['Granulation', 'Compression'],
    ['Compression', 'Coating']
  ];
  
  if (materialFlowPairs.some(pair => 
    (pair[0] === sourceCategory && pair[1] === targetCategory) ||
    (pair[1] === sourceCategory && pair[0] === targetCategory)
  )) {
    return 'MATERIAL_FLOW';
  }
  
  if (targetCategory.includes('Quality Control') || targetCategory.includes('Analytical')) {
    return 'REQUIRES_ACCESS';
  }
  
  return 'ADJACENT_TO';
}

function getFlowType(sourceCategory: string, targetCategory: string): GhostRelationship['flowType'] {
  if (targetCategory.includes('Quality Control') || targetCategory.includes('Lab')) {
    return 'personnel';
  }
  if (sourceCategory.includes('Storage') || targetCategory.includes('Storage')) {
    return 'raw_material';
  }
  if (targetCategory.includes('Packaging')) {
    return 'finished_product';
  }
  return 'raw_material';
}

function getCleanroomClass(category: string): string | undefined {
  const cleanroomMapping: { [key: string]: string } = {
    'Weighing Room': 'Class C',
    'Dispensing': 'Class C',
    'Granulation': 'Class C',
    'Compression': 'Class D',
    'Coating': 'Class C',
    'Packaging': 'Class D',
    'Quality Control': 'Class B',
    'Analytical Lab': 'Class C'
  };
  return cleanroomMapping[category];
}

// Neo4j-based ghost suggestions (when database is available)
async function getGhostSuggestionsFromKnowledgeGraph(
  triggerNodeId: string,
  triggerNodePosition: { x: number; y: number },
  existingNodePositions: Array<{ id: string; x: number; y: number; width?: number; height?: number }>,
  confidenceThreshold: number,
  triggerNodeName?: string,
  triggerNodeCategory?: string
): Promise<GhostSuggestion[]> {
  console.log('🔮 Route: Getting ghost suggestions using FunctionalArea-based service');
  
  // Use the updated GhostSuggestionsService that works with FunctionalArea nodes only
  const ghostService = new GhostSuggestionsService();
  
  try {
    const suggestions = await ghostService.getGhostSuggestions(
      triggerNodeId,
      triggerNodeCategory,
      triggerNodePosition,
      existingNodePositions
    );
    
    console.log('🔮 Route: GhostSuggestionsService returned', suggestions.length, 'suggestions from FunctionalArea patterns');
    return suggestions;
  } catch (error) {
    console.error('🔮 Route: Error using GhostSuggestionsService:', error);
    return [];
  }
}

// Enhanced ghost suggestions with pharmaceutical facility pattern intelligence
async function getEnhancedGhostSuggestions(
  session: any,
  nodeName: string,
  nodeCategory: string | undefined,
  triggerNodePosition: { x: number; y: number },
  existingNodePositions: Array<{ id: string; x: number; y: number; width?: number; height?: number }>,
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  const suggestions: GhostSuggestion[] = [];
  const suggestionMap = new Map<string, GhostSuggestion>();

  // Stage 1: Direct relationship suggestions (same as before but enhanced)
  const directSuggestions = await getDirectRelationshipSuggestions(session, nodeName, triggerNodePosition, confidenceThreshold);
  directSuggestions.forEach(s => suggestionMap.set(s.nodeId || s.id, s));

  // Stage 2: Pattern-based pharmaceutical facility suggestions
  if (nodeCategory) {
    const patternSuggestions = await getPharmaceuticalPatternSuggestions(session, nodeCategory, triggerNodePosition, confidenceThreshold);
    patternSuggestions.forEach(s => {
      const key = s.nodeId || s.id;
      if (!suggestionMap.has(key)) {
        s.reason = `Pharmaceutical pattern: ${s.reason}`;
        s.confidence = Math.max(0.4, s.confidence * 0.8); // Slightly lower confidence for pattern-based
        suggestionMap.set(key, s);
      }
    });
  }

  // Stage 3: Multi-hop workflow suggestions (2-step relationships)
  const workflowSuggestions = await getWorkflowPatternSuggestions(session, nodeName, triggerNodePosition, confidenceThreshold);
  workflowSuggestions.forEach(s => {
    const key = s.nodeId || s.id;
    if (!suggestionMap.has(key)) {
      s.reason = `Workflow pattern: ${s.reason}`;
      s.confidence = Math.max(0.3, s.confidence * 0.7); // Lower confidence for 2-hop suggestions
      suggestionMap.set(key, s);
    }
  });

  // Stage 4: Compliance-based suggestions (GMP and cleanroom requirements)
  const complianceSuggestions = await getComplianceBasedSuggestions(session, nodeName, nodeCategory, triggerNodePosition, confidenceThreshold);
  complianceSuggestions.forEach(s => {
    const key = s.nodeId || s.id;
    if (!suggestionMap.has(key)) {
      s.reason = `GMP compliance: ${s.reason}`;
      s.confidence = Math.max(0.6, s.confidence); // Higher confidence for compliance
      suggestionMap.set(key, s);
    }
  });

  // Apply intelligent positioning based on relationship types and spatial constraints
  const positionedSuggestions = applyIntelligentPositioning(
    Array.from(suggestionMap.values()),
    triggerNodePosition,
    existingNodePositions
  );

  return positionedSuggestions.filter(s => s.confidence >= confidenceThreshold);
}

// Stage 1: Direct relationship suggestions with enhanced analysis and learning
async function getDirectRelationshipSuggestions(
  session: any, 
  nodeName: string, 
  triggerNodePosition: { x: number; y: number }, 
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  console.log('🔍 Stage 1: Searching for direct relationships for node:', nodeName);
  
  // Get all possible name variations to try
  const nameVariations = getNodeNameVariations(nodeName);
  console.log('🔍 Stage 1: Will search using name variations:', nameVariations);
  
  const query = `
    MATCH (selected:FunctionalArea)
    WHERE toLower(selected.name) IN $nameVariations
    MATCH (selected)-[r]-(connected:FunctionalArea)
    RETURN 
      selected.id as selectedId,
      selected.name as selectedName,
      selected.category as selectedCategory,
      selected.cleanroomClass as selectedCleanroomClass,
      r,
      type(r) as relType,
      connected.id as connectedId,
      connected.name as connectedName,
      connected.category as connectedCategory,
      connected.cleanroomClass as connectedCleanroomClass,
      CASE 
        WHEN startNode(r) = selected THEN 'outgoing'
        ELSE 'incoming'
      END as direction,
      r.priority as priority,
      r.reason as reason,
      COALESCE(r.successRate, 0.5) as successRate
    ORDER BY COALESCE(r.successRate, 0.5) DESC, r.priority DESC
  `;
  
  console.log('🔍 Stage 1: Executing Cypher query:', query);
  console.log('🔍 Stage 1: Query parameters:', { nameVariations: nameVariations.map(n => n.toLowerCase()) });
  
  // Convert variations to lowercase for case-insensitive matching
  const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
  const result = await session.run(query, { nameVariations: lowerCaseVariations });
  const suggestions: GhostSuggestion[] = [];
  
  console.log('🔍 Stage 1: Query returned', result.records.length, 'records');
  
  if (result.records.length > 0) {
    console.log('🔍 Stage 1: Found matching node:', result.records[0].get('selectedName'), 'with', result.records.length, 'relationships');
  }
  
  for (const record of result.records) {
    const rel = record.get('r').properties;
    const priority = record.get('priority') || 5;
    const successRate = record.get('successRate') || 0.5;
    
    // Enhanced confidence calculation: combine priority, success rate, and base confidence
    const baseConfidence = priority / 10;
    const learningBoost = successRate * 0.4; // Success rate can boost confidence by up to 40%
    const confidence = Math.min(0.95, Math.max(0.3, baseConfidence + learningBoost));
    
    if (confidence < confidenceThreshold) continue;
    
    const suggestion: GhostSuggestion = {
      id: `ghost-direct-${record.get('selectedId')}-${record.get('connectedId')}-${record.get('relType')}`,
      nodeId: record.get('connectedId'),
      sourceNodeId: record.get('selectedId'),
      sourceNodeName: record.get('selectedName'),
      sourceNodeCategory: record.get('selectedCategory'),
      sourceNodeCleanroomClass: record.get('selectedCleanroomClass'),
      category: record.get('connectedCategory'),
      name: record.get('connectedName'),
      cleanroomClass: record.get('connectedCleanroomClass'),
      suggestedPosition: triggerNodePosition, // Will be repositioned later
      confidence,
      reason: record.get('reason') || `${record.get('relType')} relationship`,
      relationships: [
        {
          id: rel.id || `rel-${record.get('selectedId')}-${record.get('connectedId')}-${record.get('relType')}`,
          type: record.get('relType'),
          fromNodeId: record.get('direction') === 'outgoing' ? record.get('selectedId') : record.get('connectedId'),
          toNodeId: record.get('direction') === 'outgoing' ? record.get('connectedId') : record.get('selectedId'),
          confidence,
          reason: record.get('reason') || `${record.get('relType')} relationship`,
          priority,
          flowDirection: rel.flowDirection,
          flowType: rel.flowType
        }
      ]
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

// Stage 2: Pharmaceutical facility pattern suggestions
async function getPharmaceuticalPatternSuggestions(
  session: any, 
  nodeCategory: string, 
  triggerNodePosition: { x: number; y: number }, 
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  const query = `
    // Find common pharmaceutical facility patterns for this category
    MATCH (anchor:FunctionalArea {category: $nodeCategory})
    MATCH (anchor)-[r]-(connected:FunctionalArea)
    WITH connected.name as connectedName, connected.category as connectedCategory, 
         connected.cleanroomClass as connectedCleanroomClass, type(r) as relType, 
         r.reason as reason, r.priority as priority,
         count(*) as frequency
    WHERE frequency >= 2  // Pattern must appear at least twice
    RETURN connectedName, connectedCategory, connectedCleanroomClass, relType, reason, priority, frequency
    ORDER BY frequency DESC, priority DESC
    LIMIT 10
  `;
  
  const result = await session.run(query, { nodeCategory });
  const suggestions: GhostSuggestion[] = [];
  
  for (const record of result.records) {
    const frequency = record.get('frequency').toNumber();
    const priority = record.get('priority') || 5;
    const confidence = Math.min(0.9, Math.max(0.4, (priority / 10) * (frequency / 5)));
    
    if (confidence < confidenceThreshold) continue;
    
    const suggestion: GhostSuggestion = {
      id: `ghost-pattern-${nodeCategory}-${record.get('connectedName')}-${record.get('relType')}`,
      nodeId: `pattern-${record.get('connectedName')}-${Date.now()}`,
      sourceNodeId: 'pattern-analysis',
      sourceNodeName: 'Pattern Analysis',
      sourceNodeCategory: nodeCategory,
      sourceNodeCleanroomClass: 'N/A',
      category: record.get('connectedCategory'),
      name: record.get('connectedName'),
      cleanroomClass: record.get('connectedCleanroomClass'),
      suggestedPosition: triggerNodePosition, // Will be repositioned later
      confidence,
      reason: `Found ${frequency} times in pharmaceutical facilities`,
      relationships: [
        {
          id: `pattern-rel-${nodeCategory}-${record.get('connectedName')}`,
          type: record.get('relType'),
          fromNodeId: 'pattern-trigger',
          toNodeId: `pattern-${record.get('connectedName')}`,
          confidence,
          reason: record.get('reason') || 'Pharmaceutical pattern',
          priority,
        }
      ]
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

// Stage 3: Multi-hop workflow pattern suggestions
async function getWorkflowPatternSuggestions(
  session: any, 
  nodeName: string, 
  triggerNodePosition: { x: number; y: number }, 
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  console.log('🔍 Stage 3: Searching for workflow patterns for node:', nodeName);
  
  // Get all possible name variations to try
  const nameVariations = getNodeNameVariations(nodeName);
  console.log('🔍 Stage 3: Will search using name variations:', nameVariations);
  
  const query = `
    // Find 2-hop workflow patterns: selected -> intermediate -> final
    MATCH (selected:FunctionalArea)
    WHERE toLower(selected.name) IN $nameVariations
    MATCH (selected)-[r1:MATERIAL_FLOW|PERSONNEL_FLOW]->(intermediate:FunctionalArea)
    MATCH (intermediate)-[r2:MATERIAL_FLOW|PERSONNEL_FLOW]->(final:FunctionalArea)
    WHERE intermediate <> final AND selected <> final
    RETURN 
      final.id as finalId,
      final.name as finalName,
      final.category as finalCategory,
      final.cleanroomClass as finalCleanroomClass,
      intermediate.name as intermediateName,
      r1.flowType as flowType1,
      r2.flowType as flowType2,
      r2.priority as priority
    ORDER BY r2.priority DESC
    LIMIT 5
  `;
  
  console.log('🔍 Stage 3: Executing workflow pattern query');
  
  // Convert variations to lowercase for case-insensitive matching
  const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
  const result = await session.run(query, { nameVariations: lowerCaseVariations });
  const suggestions: GhostSuggestion[] = [];
  
  console.log('🔍 Stage 3: Workflow query returned', result.records.length, 'records');
  
  for (const record of result.records) {
    const priority = record.get('priority') || 3;
    const confidence = Math.min(0.7, Math.max(0.3, priority / 15)); // Lower confidence for 2-hop
    
    if (confidence < confidenceThreshold) continue;
    
    const suggestion: GhostSuggestion = {
      id: `ghost-workflow-${record.get('finalId')}-${Date.now()}`,
      nodeId: record.get('finalId'),
      sourceNodeId: 'workflow-analysis',
      sourceNodeName: 'Workflow Analysis',
      sourceNodeCategory: 'Analysis',
      sourceNodeCleanroomClass: 'N/A',
      category: record.get('finalCategory'),
      name: record.get('finalName'),
      cleanroomClass: record.get('finalCleanroomClass'),
      suggestedPosition: triggerNodePosition, // Will be repositioned later
      confidence,
      reason: `Workflow via ${record.get('intermediateName')} (${record.get('flowType1')} → ${record.get('flowType2')})`,
      relationships: [
        {
          id: `workflow-rel-${record.get('finalId')}`,
          type: 'WORKFLOW_SUGGESTION',
          fromNodeId: 'workflow-trigger',
          toNodeId: record.get('finalId'),
          confidence,
          reason: `2-hop workflow pattern`,
          priority,
        }
      ]
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

// Stage 4: GMP compliance-based suggestions
async function getComplianceBasedSuggestions(
  session: any, 
  nodeName: string, 
  nodeCategory: string | undefined, 
  triggerNodePosition: { x: number; y: number }, 
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  if (!nodeCategory) return [];
  
  // GMP compliance rules based on pharmaceutical facility requirements
  const complianceRules = new Map([
    ['Production', ['Quality Control', 'Warehouse', 'Utilities']],
    ['Quality Control', ['Production', 'Personnel', 'Warehouse']],
    ['Warehouse', ['Production', 'Quality Control', 'Support']],
    ['Personnel', ['Production', 'Quality Control', 'Support']],
    ['Utilities', ['Production', 'Quality Control', 'Support']],
    ['Support', ['Warehouse', 'Personnel', 'Utilities']]
  ]);
  
  const requiredCategories = complianceRules.get(nodeCategory) || [];
  if (requiredCategories.length === 0) return [];
  
  const query = `
    MATCH (fa:FunctionalArea)
    WHERE fa.category IN $requiredCategories
    RETURN DISTINCT fa.name as name, fa.category as category, fa.cleanroomClass as cleanroomClass
    LIMIT 8
  `;
  
  const result = await session.run(query, { requiredCategories });
  const suggestions: GhostSuggestion[] = [];
  
  for (const record of result.records) {
    const confidence = 0.75; // High confidence for compliance suggestions
    
    if (confidence < confidenceThreshold) continue;
    
    const suggestion: GhostSuggestion = {
      id: `ghost-compliance-${record.get('name')}-${Date.now()}`,
      nodeId: `compliance-${record.get('name')}-${Date.now()}`,
      sourceNodeId: 'compliance-analysis',
      sourceNodeName: 'GMP Compliance',
      sourceNodeCategory: nodeCategory,
      sourceNodeCleanroomClass: 'N/A',
      category: record.get('category'),
      name: record.get('name'),
      cleanroomClass: record.get('cleanroomClass'),
      suggestedPosition: triggerNodePosition, // Will be repositioned later
      confidence,
      reason: `GMP requires ${nodeCategory} areas to have access to ${record.get('category')}`,
      relationships: [
        {
          id: `compliance-rel-${record.get('name')}`,
          type: 'REQUIRES_ACCESS',
          fromNodeId: 'compliance-trigger',
          toNodeId: `compliance-${record.get('name')}`,
          confidence,
          reason: 'GMP compliance requirement',
          priority: 8,
        }
      ]
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

// Intelligent positioning based on relationship types and spatial constraints
function applyIntelligentPositioning(
  suggestions: GhostSuggestion[],
  triggerNodePosition: { x: number; y: number },
  existingNodePositions: Array<{ id: string; x: number; y: number; width?: number; height?: number }>
): GhostSuggestion[] {
  console.log('🎯 Positioning: Applying intelligent positioning for', suggestions.length, 'suggestions around trigger position:', triggerNodePosition);
  console.log('🎯 Positioning: Existing node positions:', existingNodePositions.map(p => ({ id: p.id, x: p.x, y: p.y })));
  
  if (suggestions.length === 0) {
    return suggestions;
  }
  
  const positioned = [...suggestions];
  
  // Use enhanced positioning algorithm for each suggestion
  positioned.forEach((suggestion, index) => {
    console.log('🎯 Positioning: Processing suggestion', index, ':', suggestion.name);
    
    // Use the enhanced calculateOptimalPosition function
    const optimalPosition = calculateOptimalPosition(triggerNodePosition, existingNodePositions, index);
    
    // Apply relationship-specific adjustments
    const relationshipType = suggestion.relationships[0]?.type;
    let adjustedPosition = { ...optimalPosition };
    
    switch (relationshipType) {
      case 'ADJACENT_TO':
        // Keep nodes closer for adjacency relationships
        const adjacentDistance = Math.sqrt(
          Math.pow(adjustedPosition.x - triggerNodePosition.x, 2) + 
          Math.pow(adjustedPosition.y - triggerNodePosition.y, 2)
        );
        if (adjacentDistance > 200) {
          const scale = 180 / adjacentDistance;
          adjustedPosition.x = triggerNodePosition.x + (adjustedPosition.x - triggerNodePosition.x) * scale;
          adjustedPosition.y = triggerNodePosition.y + (adjustedPosition.y - triggerNodePosition.y) * scale;
        }
        break;
        
      case 'PROHIBITED_NEAR':
        // Push nodes further away for prohibited relationships
        const prohibitedDistance = Math.sqrt(
          Math.pow(adjustedPosition.x - triggerNodePosition.x, 2) + 
          Math.pow(adjustedPosition.y - triggerNodePosition.y, 2)
        );
        if (prohibitedDistance < 250) {
          const scale = 280 / prohibitedDistance;
          adjustedPosition.x = triggerNodePosition.x + (adjustedPosition.x - triggerNodePosition.x) * scale;
          adjustedPosition.y = triggerNodePosition.y + (adjustedPosition.y - triggerNodePosition.y) * scale;
        }
        break;
        
      case 'MATERIAL_FLOW':
        // Position material flow nodes to suggest direction
        if (suggestion.relationships[0]?.fromNodeId === suggestion.sourceNodeId) {
          // Outgoing flow - prefer right side
          if (adjustedPosition.x < triggerNodePosition.x) {
            adjustedPosition.x = triggerNodePosition.x + Math.abs(adjustedPosition.x - triggerNodePosition.x);
          }
        } else {
          // Incoming flow - prefer left side
          if (adjustedPosition.x > triggerNodePosition.x) {
            adjustedPosition.x = triggerNodePosition.x - Math.abs(adjustedPosition.x - triggerNodePosition.x);
          }
        }
        break;
        
      case 'PERSONNEL_FLOW':
        // Position personnel flow nodes vertically to suggest movement
        if (Math.abs(adjustedPosition.y - triggerNodePosition.y) < 100) {
          adjustedPosition.y += index % 2 === 0 ? 120 : -120;
        }
        break;
    }
    
    // Add this positioned node to existing positions for subsequent calculations
    existingNodePositions.push({
      id: suggestion.id,
      x: adjustedPosition.x,
      y: adjustedPosition.y,
      width: 140,
      height: 90
    });
    
    console.log('🎯 Positioning: Suggestion', suggestion.name, 'positioned at:', adjustedPosition, 'with relationship type:', relationshipType);
    suggestion.suggestedPosition = adjustedPosition;
  });
  
  console.log('🎯 Positioning: Final positions for all suggestions:', positioned.map(s => ({ name: s.name, position: s.suggestedPosition })));
  return positioned;
}

// Fallback simple ghost suggestions (original implementation)
async function getSimpleGhostSuggestions(
  session: any,
  nodeName: string,
  triggerNodePosition: { x: number; y: number },
  confidenceThreshold: number
): Promise<GhostSuggestion[]> {
  console.log('🔍 Fallback: Searching with simple suggestions for node:', nodeName);
  
  // Get all possible name variations to try
  const nameVariations = getNodeNameVariations(nodeName);
  console.log('🔍 Fallback: Will search using name variations:', nameVariations);
  
  const query = `
    MATCH (selected:FunctionalArea)
    WHERE toLower(selected.name) IN $nameVariations
    MATCH (selected)-[r]-(connected:FunctionalArea)
    RETURN connected.name as name, connected.category as category, 
           r.priority as priority, type(r) as relType
    ORDER BY r.priority DESC
    LIMIT 5
  `;
  
  console.log('🔍 Fallback: Executing simple Cypher query:', query);
  
  // Convert variations to lowercase for case-insensitive matching
  const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
  const result = await session.run(query, { nameVariations: lowerCaseVariations });
  const suggestions: GhostSuggestion[] = [];
  
  console.log('🔍 Fallback: Simple query returned', result.records.length, 'records');
  
  for (const record of result.records) {
    const priority = record.get('priority') || 5;
    const confidence = Math.min(0.95, Math.max(0.3, priority / 10));
    
    if (confidence < confidenceThreshold) continue;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 200;
    
    const suggestion: GhostSuggestion = {
      id: `ghost-simple-${record.get('name')}-${Date.now()}`,
      nodeId: `simple-${record.get('name')}-${Date.now()}`,
      sourceNodeId: 'simple-analysis',
      sourceNodeName: 'Simple Analysis',
      sourceNodeCategory: 'Analysis',
      sourceNodeCleanroomClass: 'N/A',
      category: record.get('category'),
      name: record.get('name'),
      cleanroomClass: 'N/A',
      suggestedPosition: {
        x: triggerNodePosition.x + Math.cos(angle) * distance,
        y: triggerNodePosition.y + Math.sin(angle) * distance
      },
      confidence,
      reason: `${record.get('relType')} relationship`,
      relationships: []
    };
    
    suggestions.push(suggestion);
  }
  
  return suggestions;
}

// Get complete Neo4j database overview
router.get('/neo4j/overview', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      // Get connection status
      let connectionStatus = 'connected';
      try {
        await Neo4jService.getInstance().verifyConnection();
      } catch (error) {
        connectionStatus = 'error';
      }

      // Get all node labels and their counts
      const nodeLabelsQuery = `
        MATCH (n)
        WITH labels(n) as nodeLabels
        UNWIND nodeLabels as label
        WITH label, count(*) as count
        RETURN DISTINCT label, count
        ORDER BY count DESC
      `;
      
      const nodeLabelsResult = await session.run(nodeLabelsQuery);
      const nodeLabels = nodeLabelsResult.records.map(record => ({
        label: record.get('label'),
        count: typeof record.get('count').toNumber === 'function' 
          ? record.get('count').toNumber() 
          : parseInt(record.get('count').toString())
      }));

      // Get all relationship types and their counts
      const relationshipTypesQuery = `
        MATCH ()-[r]->()
        WITH type(r) as relType, count(r) as count
        RETURN relType, count
        ORDER BY count DESC
      `;
      
      const relationshipTypesResult = await session.run(relationshipTypesQuery);
      const relationshipTypes = relationshipTypesResult.records.map(record => ({
        type: record.get('relType'),
        count: typeof record.get('count').toNumber === 'function' 
          ? record.get('count').toNumber() 
          : parseInt(record.get('count').toString())
      }));

      // Get sample nodes from each label (max 5 per label)
      const sampleNodes: Record<string, any[]> = {};
      for (const labelInfo of nodeLabels.slice(0, 10)) { // Limit to first 10 labels
        const sampleQuery = `
          MATCH (n:\`${labelInfo.label}\`)
          RETURN n
          LIMIT 5
        `;
        const sampleResult = await session.run(sampleQuery);
        sampleNodes[labelInfo.label] = sampleResult.records.map(record => {
          const node = record.get('n');
          return {
            ...node.properties,
            _labels: node.labels
          };
        });
      }

      // Get total counts
      const totalNodesQuery = `MATCH (n) RETURN count(n) as count`;
      const totalNodesResult = await session.run(totalNodesQuery);
      const totalNodes = typeof totalNodesResult.records[0].get('count').toNumber === 'function' 
        ? totalNodesResult.records[0].get('count').toNumber() 
        : parseInt(totalNodesResult.records[0].get('count').toString());

      const totalRelationshipsQuery = `MATCH ()-[r]->() RETURN count(r) as count`;
      const totalRelationshipsResult = await session.run(totalRelationshipsQuery);
      const totalRelationships = typeof totalRelationshipsResult.records[0].get('count').toNumber === 'function' 
        ? totalRelationshipsResult.records[0].get('count').toNumber() 
        : parseInt(totalRelationshipsResult.records[0].get('count').toString());

      // Get specific counts for key node types
      const keyNodeTypes = ['FunctionalArea', 'NodeTemplate', 'Diagram', 'GhostFeedback'];
      const keyNodeCounts: Record<string, number> = {};
      
      for (const nodeType of keyNodeTypes) {
        try {
          const countQuery = `MATCH (n:\`${nodeType}\`) RETURN count(n) as count`;
          const countResult = await session.run(countQuery);
          keyNodeCounts[nodeType] = typeof countResult.records[0].get('count').toNumber === 'function' 
            ? countResult.records[0].get('count').toNumber() 
            : parseInt(countResult.records[0].get('count').toString());
        } catch (error) {
          keyNodeCounts[nodeType] = 0;
        }
      }

      const overview = {
        connectionStatus,
        database: {
          name: 'Neo4j Aura',
          uri: process.env.NEO4J_URI ? process.env.NEO4J_URI.split('@')[1] || 'configured' : 'Not configured',
          user: process.env.NEO4J_USER || 'Not configured'
        },
        statistics: {
          totalNodes,
          totalRelationships,
          nodeLabels,
          relationshipTypes,
          keyNodeCounts
        },
        sampleNodes,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Neo4j Overview:', {
        connectionStatus,
        totalNodes,
        totalRelationships,
        labelCount: nodeLabels.length,
        relationshipTypeCount: relationshipTypes.length
      });

      res.json(overview);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error fetching Neo4j overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Neo4j overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all node templates (using static configuration)
router.get('/templates', async (req, res) => {
  try {
    const templates = await staticTemplatesService.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching node templates:', error);
    res.status(500).json({ error: 'Failed to fetch node templates' });
  }
});

// Get templates by category (using static configuration)
router.get('/templates/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const templates = await staticTemplatesService.getTemplatesByCategory(category as NodeCategory);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates by category' });
  }
});

// Get template by ID (using static configuration)
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await staticTemplatesService.getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template by ID:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Search templates (using static configuration)
router.get('/templates/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const templates = await staticTemplatesService.searchTemplates(query);
    res.json(templates);
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// Get template statistics (using static configuration)
router.get('/templates/stats', async (req, res) => {
  try {
    const stats = await staticTemplatesService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching template statistics:', error);
    res.status(500).json({ error: 'Failed to fetch template statistics' });
  }
});

// Get templates by cleanroom class (using static configuration)
router.get('/templates/cleanroom/:class', async (req, res) => {
  try {
    const { class: cleanroomClass } = req.params;
    const templates = await staticTemplatesService.getTemplatesByCleanroomClass(cleanroomClass);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates by cleanroom class:', error);
    res.status(500).json({ error: 'Failed to fetch templates by cleanroom class' });
  }
});

// Get template service health status
router.get('/templates/health', async (req, res) => {
  try {
    const health = staticTemplatesService.getHealthStatus();
    res.json(health);
  } catch (error) {
    console.error('Error fetching template service health:', error);
    res.status(500).json({ error: 'Failed to fetch service health' });
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

// Knowledge Graph Explorer endpoint - MUST be before /:id route
// Place specific routes before parameterized routes to avoid collisions (e.g., 'import')
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
      patterns: [],
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

router.get('/kg/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const confidence = parseFloat(req.query.confidence as string) || 0.3;
    
    console.log('🔍 KnowledgeGraph: Fetching graph data for node:', nodeId, 'with confidence:', confidence);

    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      // Enhanced query to get pharmaceutical facility relationships and context
      const query = `
        // First, try to find the node by exact ID match
        OPTIONAL MATCH (center:FunctionalArea {id: $nodeId})
        
        // If no exact match, try to find by name variations (for shape assignments)
        WITH center, 
             CASE WHEN center IS NULL 
                  THEN $nodeId 
                  ELSE center.name 
             END as searchName
        
        // Extract meaningful name from node ID if it's a shape ID
        WITH center, 
             CASE 
               WHEN searchName STARTS WITH 'shape-' THEN 
                 CASE 
                   WHEN searchName CONTAINS 'analytical' THEN 'Analytical Lab'
                   WHEN searchName CONTAINS 'coating' THEN 'Coating'
                   WHEN searchName CONTAINS 'compression' THEN 'Compression'
                   WHEN searchName CONTAINS 'packaging' THEN 'Packaging'
                   WHEN searchName CONTAINS 'weighing' THEN 'Weighing'
                   WHEN searchName CONTAINS 'granulation' THEN 'Granulation'
                   WHEN searchName CONTAINS 'quality' THEN 'Quality Control'
                   WHEN searchName CONTAINS 'storage' THEN 'Storage'
                   WHEN searchName CONTAINS 'warehouse' THEN 'Warehouse'
                   WHEN searchName CONTAINS 'lab' THEN 'Laboratory'
                   ELSE 'Production Area'
                 END
               ELSE searchName
             END as finalSearchName
        
        // Find the center node using name matching
        WITH center, finalSearchName
        OPTIONAL MATCH (centerByName:FunctionalArea) 
        WHERE toLower(centerByName.name) CONTAINS toLower(finalSearchName) 
           OR toLower(finalSearchName) CONTAINS toLower(centerByName.name)
        WITH COALESCE(center, centerByName) as centerNode, finalSearchName
        
        // If still no center node found, create sample pharmaceutical relationships
        WITH centerNode, finalSearchName,
             CASE WHEN centerNode IS NULL THEN true ELSE false END as useSample
        
        // Get real relationships if center node exists
        OPTIONAL MATCH (centerNode)-[r]-(connected:FunctionalArea)
        WHERE centerNode IS NOT NULL
        WITH centerNode, finalSearchName, useSample, 
             collect({
               node: connected,
               relationship: r,
               relType: type(r),
               confidence: COALESCE(r.priority / 10.0, 0.5)
             }) as realRelationships
        
        // Sample pharmaceutical relationships for when no center node exists
        WITH centerNode, finalSearchName, useSample, realRelationships,
             CASE WHEN useSample 
             THEN [
               {
                 node: {id: 'sample-qc-lab', name: 'QC Laboratory', category: 'Quality Control', cleanroomClass: 'Class B'},
                 relationship: {type: 'REQUIRES_ACCESS', reason: 'Quality testing required', priority: 8},
                 relType: 'REQUIRES_ACCESS',
                 confidence: 0.8
               },
               {
                 node: {id: 'sample-packaging', name: 'Packaging Area', category: 'Production', cleanroomClass: 'Class D'},
                 relationship: {type: 'MATERIAL_FLOW', reason: 'Process continuation', priority: 9, isOutgoing: true},
                 relType: 'MATERIAL_FLOW', 
                 confidence: 0.9
               },
               {
                 node: {id: 'sample-storage', name: 'Raw Materials Storage', category: 'Storage', cleanroomClass: 'Class D'},
                 relationship: {type: 'MATERIAL_FLOW', reason: 'Material supply', priority: 7, isOutgoing: false},
                 relType: 'MATERIAL_FLOW',
                 confidence: 0.7
               },
               {
                 node: {id: 'sample-utilities', name: 'HVAC Control Room', category: 'Utilities', cleanroomClass: 'N/A'},
                 relationship: {type: 'SHARES_UTILITY', reason: 'Environmental control', priority: 6},
                 relType: 'SHARES_UTILITY',
                 confidence: 0.6
               },
               {
                 node: {id: 'sample-compression', name: 'Compression Room', category: 'Production', cleanroomClass: 'Class C'},
                 relationship: {type: 'ADJACENT_TO', reason: 'Similar process requirements', priority: 7},
                 relType: 'ADJACENT_TO',
                 confidence: 0.75
               }
             ]
             ELSE []
             END as sampleRelationships
        
        // Combine real and sample relationships
        WITH centerNode, finalSearchName, useSample,
             CASE WHEN useSample THEN sampleRelationships ELSE realRelationships END as allRelationships
        
        // Filter by confidence threshold  
        WITH centerNode, finalSearchName, useSample, 
             [rel IN allRelationships WHERE rel.confidence >= $confidence] as filteredRelationships
        
        // Create center node if using samples
        WITH CASE WHEN useSample 
             THEN {
               id: $nodeId,
               name: finalSearchName,
               category: CASE 
                 WHEN finalSearchName CONTAINS 'Lab' THEN 'Quality Control'
                 WHEN finalSearchName CONTAINS 'Quality' THEN 'Quality Control'  
                 WHEN finalSearchName CONTAINS 'Storage' THEN 'Storage'
                 WHEN finalSearchName CONTAINS 'Warehouse' THEN 'Storage'
                 WHEN finalSearchName CONTAINS 'Packaging' THEN 'Production'
                 ELSE 'Production'
               END,
               cleanroomClass: CASE 
                 WHEN finalSearchName CONTAINS 'Lab' THEN 'Class B'
                 WHEN finalSearchName CONTAINS 'Quality' THEN 'Class B'
                 ELSE 'Class C'
               END
             }
             ELSE centerNode
             END as finalCenterNode,
             filteredRelationships, useSample
        
        // Return nodes and links (fix list comprehension syntax)
        UNWIND [finalCenterNode] + [rel IN filteredRelationships | rel.node] as node
        WITH finalCenterNode, filteredRelationships, useSample, collect(DISTINCT node) as allNodes
        
        RETURN 
          allNodes,
          [rel IN filteredRelationships | {
            source: CASE 
              WHEN rel.relType = 'MATERIAL_FLOW' AND rel.relationship.isOutgoing = false 
              THEN rel.node.id
              ELSE finalCenterNode.id
            END,
            target: CASE 
              WHEN rel.relType = 'MATERIAL_FLOW' AND rel.relationship.isOutgoing = false 
              THEN finalCenterNode.id
              ELSE rel.node.id
            END,
            type: rel.relType,
            confidence: rel.confidence,
            reason: COALESCE(rel.relationship.reason, 'Pharmaceutical facility relationship')
          }] as allLinks,
          useSample
      `;

      const result = await session.run(query, { 
        nodeId, 
        confidence 
      });

      if (result.records.length === 0) {
        console.log('🔍 KnowledgeGraph: No data found, returning empty graph');
        return res.json({ nodes: [], links: [] });
      }

      const record = result.records[0];
      const nodes = record.get('allNodes') || [];
      const links = record.get('allLinks') || [];
      const usedSample = record.get('useSample') || false;

      console.log(`🔍 KnowledgeGraph: Found ${nodes.length} nodes and ${links.length} links (sample: ${usedSample})`);

      // Process nodes for React Force Graph
      const processedNodes = nodes.map((node: any) => ({
        id: node.id || `unknown-${Date.now()}`,
        name: node.name || 'Unknown',
        category: node.category || 'Unknown',
        cleanroomGrade: node.cleanroomClass,
        description: node.description || `${node.category || 'Unknown'} facility in pharmaceutical manufacturing`,
        val: node.id === nodeId ? 20 : 10, // Make center node larger
      }));

      // Process links for React Force Graph  
      const processedLinks = links.map((link: any) => ({
        source: link.source,
        target: link.target,
        type: link.type,
        confidence: link.confidence,
        reason: link.reason,
        value: Math.max(link.confidence * 10, 1),
      }));

      const response = {
        nodes: processedNodes,
        links: processedLinks,
        metadata: {
          centerNodeId: nodeId,
          confidence,
          usedSampleData: usedSample,
          totalNodes: processedNodes.length,
          totalLinks: processedLinks.length,
          timestamp: new Date().toISOString()
        }
      };

      // In production, never send sample data. Return empty graph instead unless explicitly allowed.
      const allowSample = process.env.ALLOW_SAMPLE_KG === 'true' || process.env.NODE_ENV === 'development';
      if (usedSample && !allowSample) {
        console.warn('🔍 KnowledgeGraph: Sample data suppressed (no matching node found). Returning empty result.');
        return res.json({ nodes: [], links: [], metadata: { centerNodeId: nodeId, confidence, usedSampleData: false } });
      }

      console.log('🔍 KnowledgeGraph: ✅ Returning knowledge graph data:', {
        nodes: processedNodes.length,
        links: processedLinks.length,
        sampleData: usedSample
      });

      res.json(response);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('🔍 KnowledgeGraph: ❌ Error fetching knowledge graph data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch knowledge graph data',
      details: error instanceof Error ? error.message : 'Unknown error',
      nodeId: req.params.nodeId
    });
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

// Get relationships for a node - Enhanced with mode-awareness
router.get('/:id/relationships', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, includeIcons, priority } = req.query;
    
    console.log(`📋 Fetching relationships for node: ${id}, mode: ${mode}, includeIcons: ${includeIcons}`);
    
    let relationships = await spatialRelationshipModel.getRelationshipsForNode(id);
    
    // Enhanced processing for guided mode
    if (mode === 'guided') {
      // Filter high-priority relationships for guided mode
      const minPriority = priority ? parseInt(priority as string) : 7;
      relationships = relationships.filter(rel => 
        rel.priority >= minPriority || 
        ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'PROHIBITED_NEAR'].includes(rel.type)
      );
      
      // Add visualization hints for guided mode
      relationships = relationships.map(rel => ({
        ...rel,
        mode: 'guided',
        visualization: {
          preferIcon: true,
          iconType: getIconType(rel.type),
          iconSize: getIconSize(rel.type),
          iconColor: getIconColor(rel.type),
          renderingPriority: rel.priority
        },
        guidedModeProperties: {
          showInLegend: ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'PROHIBITED_NEAR'].includes(rel.type),
          interactionEnabled: true,
          tooltip: getPharmaceuticalTooltip(rel.type, rel.reason)
        }
      }));
    } else {
      // Standard processing for creation mode
      relationships = relationships.map(rel => ({
        ...rel,
        mode: 'creation'
      }));
    }
    
    console.log(`📋 Returning ${relationships.length} relationships for ${mode || 'standard'} mode`);
    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Failed to fetch relationships' });
  }
});

// Helper functions for pharmaceutical relationship visualization
function getIconType(relationshipType: string): string {
  switch (relationshipType) {
    case 'MATERIAL_FLOW': return 'material';
    case 'PERSONNEL_FLOW': return 'personnel';
    case 'REQUIRES_ACCESS': return 'access';
    case 'SHARES_UTILITY': return 'utility';
    case 'ADJACENT_TO': return 'adjacency';
    case 'PROHIBITED_NEAR': return 'warning';
    default: return 'adjacency';
  }
}

function getIconSize(relationshipType: string): string {
  switch (relationshipType) {
    case 'PROHIBITED_NEAR': return 'large';
    case 'MATERIAL_FLOW':
    case 'PERSONNEL_FLOW': return 'medium';
    default: return 'small';
  }
}

function getIconColor(relationshipType: string): string {
  const colors = {
    'MATERIAL_FLOW': '#6a1b9a',
    'PERSONNEL_FLOW': '#ef6c00',
    'REQUIRES_ACCESS': '#0277bd',
    'SHARES_UTILITY': '#2e7d32',
    'ADJACENT_TO': '#1565c0',
    'PROHIBITED_NEAR': '#c62828'
  };
  return colors[relationshipType as keyof typeof colors] || '#1565c0';
}

function getPharmaceuticalTooltip(relationshipType: string, reason?: string): string {
  const tooltips = {
    'MATERIAL_FLOW': 'Material transfer pathway for raw materials, intermediates, or finished products',
    'PERSONNEL_FLOW': 'Staff movement corridor with appropriate cleanroom grade transitions',
    'REQUIRES_ACCESS': 'Controlled access requirement for cleanroom entry and contamination control',
    'SHARES_UTILITY': 'Shared utility connection (HVAC, electrical, water, or waste systems)',
    'ADJACENT_TO': 'Adjacent room placement for operational efficiency',
    'PROHIBITED_NEAR': 'Mandatory separation required for contamination prevention or safety'
  };
  const baseTooltip = tooltips[relationshipType as keyof typeof tooltips] || 'Spatial relationship';
  return reason ? `${baseTooltip}: ${reason}` : baseTooltip;
}

// Get node with its relationships and related nodes (for guided mode)
router.get('/:nodeId/with-relationships', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const session = Neo4jService.getInstance().getDriver().session();
    
    console.log('🔍 Fetching node with relationships for:', nodeId);

    try {
      // Try to find the node by name (case-insensitive) or id
      // Prioritize name matching since Neo4j nodes might not have an 'id' property
      const nodeQuery = `
        MATCH (fa:FunctionalArea)
        WHERE toLower(fa.name) = toLower($nodeId)
           OR fa.id = $nodeId
           OR toLower(COALESCE(fa.id, '')) = toLower($nodeId)
        RETURN fa.id as id, fa.name as name, fa.category as category,
               fa.cleanroomClass as cleanroomClass, fa.x as x, fa.y as y,
               fa.width as width, fa.height as height
        LIMIT 1
      `;

      const nodeResult = await session.run(nodeQuery, { nodeId });

      if (nodeResult.records.length === 0) {
        console.log('❌ Node not found with identifier:', nodeId);
        console.log('❌ Tried matching: toLower(fa.name), fa.id, and toLower(fa.id)');
        await session.close();
        return res.status(404).json({
          error: 'Node not found',
          searchedFor: nodeId,
          message: `No FunctionalArea node found matching '${nodeId}'`
        });
      }

      const nodeRecord = nodeResult.records[0];
      const foundNodeId = nodeRecord.get('id');
      const mainNode = {
        id: foundNodeId,
        name: nodeRecord.get('name'),
        category: nodeRecord.get('category'),
        cleanroomClass: nodeRecord.get('cleanroomClass'),
        x: nodeRecord.get('x'),
        y: nodeRecord.get('y'),
        width: nodeRecord.get('width'),
        height: nodeRecord.get('height')
      };

      console.log('✅ Node found:', mainNode);

      // Get all related nodes and relationships using the found node id
      const relationshipsQuery = `
        MATCH (mainNode:FunctionalArea)
        WHERE mainNode.id = $foundNodeId
        MATCH (mainNode)-[r]-(relatedNode:FunctionalArea)
        RETURN 
          r.id as relationshipId,
          type(r) as relationshipType,
          r.priority as priority,
          r.reason as reason,
          r.doorType as doorType,
          r.minDistance as minDistance,
          r.maxDistance as maxDistance,
          r.flowDirection as flowDirection,
          r.flowType as flowType,
          CASE 
            WHEN startNode(r) = mainNode THEN 'outgoing'
            ELSE 'incoming'
          END as direction,
          relatedNode.id as relatedNodeId,
          relatedNode.name as relatedNodeName,
          relatedNode.category as relatedNodeCategory,
          relatedNode.cleanroomClass as relatedNodeCleanroomClass,
          relatedNode.x as relatedNodeX,
          relatedNode.y as relatedNodeY,
          relatedNode.width as relatedNodeWidth,
          relatedNode.height as relatedNodeHeight
        ORDER BY r.priority DESC
      `;

      const relationshipsResult = await session.run(relationshipsQuery, { foundNodeId });
      
      const relatedNodes = [];
      const relationships = [];
      const processedNodeIds = new Set([foundNodeId]);
      
      for (const record of relationshipsResult.records) {
        const relatedNodeId = record.get('relatedNodeId');
        const relatedNodeName = record.get('relatedNodeName');

        // Add related node if not already processed
        if (!processedNodeIds.has(relatedNodeId)) {
          relatedNodes.push({
            id: relatedNodeId,
            name: relatedNodeName,
            category: record.get('relatedNodeCategory'),
            cleanroomClass: record.get('relatedNodeCleanroomClass'),
            x: record.get('relatedNodeX'),
            y: record.get('relatedNodeY'),
            width: record.get('relatedNodeWidth'),
            height: record.get('relatedNodeHeight')
          });
          processedNodeIds.add(relatedNodeId);
        }

        // Add relationship
        const direction = record.get('direction');
        relationships.push({
          id: record.get('relationshipId'),
          type: record.get('relationshipType'),
          fromId: direction === 'outgoing' ? foundNodeId : relatedNodeId,
          toId: direction === 'outgoing' ? relatedNodeId : foundNodeId,
          fromName: direction === 'outgoing' ? mainNode.name : relatedNodeName,
          toName: direction === 'outgoing' ? relatedNodeName : mainNode.name,
          priority: record.get('priority'),
          reason: record.get('reason'),
          doorType: record.get('doorType'),
          minDistance: record.get('minDistance'),
          maxDistance: record.get('maxDistance'),
          flowDirection: record.get('flowDirection'),
          flowType: record.get('flowType'),
          direction
        });
      }

      console.log(`✅ Found ${relationships.length} relationships for node ${mainNode.name}`);

      res.json({
        node: mainNode,
        relatedNodes,
        relationships,
        totalRelationships: relationships.length,
        totalRelatedNodes: relatedNodes.length
      });

    } catch (error) {
      await session.close();
      throw error;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error fetching node with relationships:', error);
    res.status(500).json({ error: 'Failed to fetch node with relationships' });
  }
});

// Initialize database with constraints only (templates now use static configuration)
router.post('/initialize', async (req, res) => {
  try {
    await functionalAreaModel.ensureUniqueConstraints();
    // DISABLED: NodeTemplate initialization - now using static templates
    // await functionalAreaModel.initializeNodeTemplates();
    // DISABLED: Spatial relationship initialization for NodeTemplates
    // await spatialRelationshipModel.initializeSpatialRelationships();
    
    console.log('✅ Database constraints ensured. NodeTemplate initialization skipped (using static templates).');
    res.json({ 
      message: 'Database initialized successfully (constraints only - using static templates)',
      static_templates: true
    });
  } catch (error: any) {
    console.error('Detailed initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize database', details: error.message });
  }
});

// Cleanup NodeTemplate nodes from database (migrate to static templates)
router.post('/cleanup-node-templates', async (req, res) => {
  try {
    const { NodeTemplateCleanup } = await import('../migrations/nodeTemplateCleanup');
    const cleanup = new NodeTemplateCleanup();
    
    // Get stats before cleanup
    const stats = await cleanup.getCleanupStats();
    
    if (stats.nodeTemplateCount === 0) {
      return res.json({
        message: 'No NodeTemplate nodes found. Database is already clean.',
        stats
      });
    }

    // Verify safety
    const safety = await cleanup.verifyUserDataSafety();
    if (!safety.safe) {
      return res.status(400).json({
        error: 'Cleanup aborted - found relationships between NodeTemplate and user data',
        safety,
        message: 'Manual intervention required'
      });
    }

    // Perform cleanup
    await cleanup.runCleanup();
    
    res.json({
      message: 'NodeTemplate cleanup completed successfully',
      cleaned: {
        nodes: stats.nodeTemplateCount,
        relationships: stats.relationshipCount
      },
      user_data_preserved: {
        functional_areas: safety.functionalAreaCount,
        diagrams: safety.diagramCount
      }
    });
  } catch (error: any) {
    console.error('NodeTemplate cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup NodeTemplate nodes', 
      details: error.message 
    });
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

// Get ghost suggestions for real-time guided mode
router.post('/kg/ghost-suggestions', async (req, res) => {
  try {
    const { 
      triggerNodeId, 
      triggerNodePosition, 
      existingNodePositions, 
      confidenceThreshold = 0.3,
      triggerNodeName,
      triggerNodeCategory
    } = req.body;

    console.log('🎯 Ghost Suggestions Request:', {
      triggerNodeId,
      triggerNodeName,
      triggerNodeCategory,
      triggerNodePosition,
      existingNodes: existingNodePositions?.length || 0,
      confidenceThreshold,
      // Check if this might be a custom shape request (when ID and name don't match)
      possibleCustomShape: triggerNodeId !== triggerNodeName && triggerNodeName && triggerNodeId.startsWith('shape-')
    });

    // Enhanced logging: Extract and log the node name that will be used for database queries
    const extractedNodeName = triggerNodeName || getTriggerNodeName(triggerNodeId);
    console.log('🎯 Node name extraction:', {
      originalNodeId: triggerNodeId,
      providedNodeName: triggerNodeName,
      extractedNodeName: extractedNodeName,
      willUseForQuery: extractedNodeName
    });

    let suggestions: GhostSuggestion[] = [];

    // Try to get suggestions from Neo4j knowledge graph first
    try {
      const neo4jService = Neo4jService.getInstance();
      const isConnected = await neo4jService.verifyConnection();
      
      if (isConnected) {
        suggestions = await getGhostSuggestionsFromKnowledgeGraph(
          triggerNodeId,
          triggerNodePosition,
          existingNodePositions,
          confidenceThreshold,
          extractedNodeName, // Use the properly extracted name
          triggerNodeCategory
        );
        
        // Enhanced logging: Log details about the suggestions found
        if (suggestions.length > 0) {
          console.log('🎯 Ghost suggestions found:', suggestions.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            confidence: s.confidence,
            reason: s.reason
          })));
        } else {
          console.log('🎯 No ghost suggestions found from knowledge graph');
        }
      } else {
        console.log('🎯 Neo4j not connected, skipping ghost suggestions');
      }
    } catch (kgError) {
      console.error('🎯 Knowledge graph error:', kgError);
    }

    // If no suggestions found, return empty array (no mock fallback)
    // The frontend will handle cases where no suggestions are available

    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting ghost suggestions:', error);
    res.status(500).json({ error: 'Failed to get ghost suggestions' });
  }
});

// Enhanced persist to knowledge graph with metrics
router.post('/kg/persist', async (req, res) => {
  try {
    console.log('📥 Received persist request');
    const diagramData = req.body;

    // Log what we received for debugging
    console.log('📦 Diagram data received:', {
      nodeCount: diagramData.nodes?.length || 0,
      relationshipCount: diagramData.relationships?.length || 0,
      hasNodes: !!diagramData.nodes,
      hasRelationships: !!diagramData.relationships,
      sampleNode: diagramData.nodes?.[0],
      sampleRelationship: diagramData.relationships?.[0]
    });

    // Validate input
    if (!diagramData.nodes || !Array.isArray(diagramData.nodes)) {
      console.error('❌ Invalid data: nodes is missing or not an array');
      return res.status(400).json({ error: 'Invalid data: nodes must be an array' });
    }

    if (!diagramData.relationships || !Array.isArray(diagramData.relationships)) {
      console.error('❌ Invalid data: relationships is missing or not an array');
      return res.status(400).json({ error: 'Invalid data: relationships must be an array' });
    }

    await functionalAreaModel.persistToKnowledgeGraph(diagramData);
    const nodesAdded = diagramData.nodes.length;
    const relationshipsAdded = diagramData.relationships.length;

    console.log(`✅ Successfully persisted: ${nodesAdded} nodes, ${relationshipsAdded} relationships`);

    res.json({
      message: 'Diagram data persisted to knowledge graph successfully',
      nodesAdded,
      relationshipsAdded
    });
  } catch (error) {
    console.error('❌ Error persisting to knowledge graph:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to persist to knowledge graph',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear knowledge graph data (standalone functional areas and their relationships)
router.post('/kg/clear', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    // First, get count of nodes and relationships to be deleted
    const countQuery = `
      MATCH (fa:FunctionalArea) 
      WHERE NOT (fa)<-[:CONTAINS]-(:Diagram)
      WITH fa
      OPTIONAL MATCH (fa)-[r]-()
      RETURN count(DISTINCT fa) as nodeCount, count(DISTINCT r) as relationshipCount
    `;
    const countResult = await session.run(countQuery);
    const nodeCount = countResult.records[0].get('nodeCount').toNumber();
    const relationshipCount = countResult.records[0].get('relationshipCount').toNumber();
    
    // Delete standalone functional areas (not part of any diagram) and their relationships
    const deleteQuery = `
      MATCH (fa:FunctionalArea) 
      WHERE NOT (fa)<-[:CONTAINS]-(:Diagram)
      DETACH DELETE fa
      RETURN count(fa) as deletedNodes
    `;
    
    const result = await session.run(deleteQuery);
    const deletedNodes = result.records[0].get('deletedNodes').toNumber();
    
    await session.close();
    
    res.json({
      message: 'Knowledge graph data cleared successfully',
      deletedNodes,
      deletedRelationships: relationshipCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing knowledge graph:', error);
    res.status(500).json({ error: 'Failed to clear knowledge graph data' });
  }
});

// Reset entire knowledge graph (including template relationships)
router.post('/kg/reset', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    // Get count of all data to be deleted
    const countQuery = `
      MATCH (n) 
      WHERE n:FunctionalArea OR n:NodeTemplate
      WITH n
      OPTIONAL MATCH (n)-[r]-()
      RETURN count(DISTINCT n) as nodeCount, count(DISTINCT r) as relationshipCount
    `;
    const countResult = await session.run(countQuery);
    const nodeCount = countResult.records[0].get('nodeCount').toNumber();
    const relationshipCount = countResult.records[0].get('relationshipCount').toNumber();
    
    // Delete all functional areas and node templates (preserves diagrams)
    const deleteQuery = `
      MATCH (n) 
      WHERE n:FunctionalArea OR n:NodeTemplate
      DETACH DELETE n
      RETURN count(n) as deletedNodes
    `;
    
    const result = await session.run(deleteQuery);
    const deletedNodes = result.records[0].get('deletedNodes').toNumber();
    
    await session.close();
    
    res.json({
      message: 'Knowledge graph completely reset',
      deletedNodes,
      deletedRelationships: relationshipCount,
      note: 'You may want to reinitialize templates using POST /api/nodes/initialize',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting knowledge graph:', error);
    res.status(500).json({ error: 'Failed to reset knowledge graph' });
  }
});

// Clear template relationships only (for template maintenance)
router.post('/templates/reset', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    // Get count of template relationships
    const countQuery = `
      MATCH (nt1:NodeTemplate)-[r]->(nt2:NodeTemplate)
      RETURN count(r) as relationshipCount
    `;
    const countResult = await session.run(countQuery);
    const relationshipCount = countResult.records[0].get('relationshipCount').toNumber();
    
    // Delete only relationships between templates
    const deleteQuery = `
      MATCH (nt1:NodeTemplate)-[r]->(nt2:NodeTemplate)
      DELETE r
      RETURN count(r) as deletedRelationships
    `;
    
    const result = await session.run(deleteQuery);
    const deletedRelationships = result.records[0].get('deletedRelationships').toNumber();
    
    await session.close();
    
    res.json({
      message: 'Template relationships cleared successfully',
      deletedRelationships,
      note: 'Template nodes preserved. Reinitialize relationships using POST /api/nodes/initialize',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing template relationships:', error);
    res.status(500).json({ error: 'Failed to clear template relationships' });
  }
});

// Get knowledge graph views/snapshots for management
router.get('/kg/views', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    // Get overview of current knowledge graph state
    const overviewQuery = `
      OPTIONAL MATCH (fa:FunctionalArea)
      WHERE NOT (fa)<-[:CONTAINS]-(:Diagram)
      WITH collect(fa) as standaloneNodes
      OPTIONAL MATCH (fa1:FunctionalArea)-[r]->(fa2:FunctionalArea)
      WHERE fa1 IN standaloneNodes AND fa2 IN standaloneNodes
      WITH standaloneNodes, collect(DISTINCT r) as relationships
      RETURN size(standaloneNodes) as nodeCount, 
             size(relationships) as relationshipCount,
             datetime() as lastUpdated
    `;
    
    const result = await session.run(overviewQuery);
    const record = result.records[0];
    
    const nodeCount = record.get('nodeCount').toNumber();
    const relationshipCount = record.get('relationshipCount').toNumber();
    const lastUpdated = record.get('lastUpdated');
    
    await session.close();
    
    // Create knowledge graph views based on current state
    const views = [];
    
    if (nodeCount > 0) {
      views.push({
        id: 'current-kg-state',
        name: 'Current Knowledge Graph State',
        nodeCount,
        relationshipCount,
        lastUpdated: lastUpdated ? new Date(lastUpdated.toString()).toISOString() : new Date().toISOString(),
        description: `Accumulated learning from ${nodeCount} functional areas with ${relationshipCount} relationships`
      });
    }
    
    // Could add more views here in the future (e.g., historical snapshots, category-specific views)
    
    res.json(views);
  } catch (error) {
    console.error('Error getting knowledge graph views:', error);
    res.status(500).json({ error: 'Failed to get knowledge graph views' });
  }
});

// Track ghost suggestion feedback for learning system
router.post('/kg/ghost-feedback', async (req, res) => {
  try {
    const { 
      suggestionId, 
      action, // 'accepted' | 'rejected' | 'ignored'
      triggerNodeId,
      triggerNodeName,
      triggerNodeCategory,
      suggestionNodeName,
      suggestionCategory,
      relationshipType,
      confidence,
      reason,
      userContext
    } = req.body;

    console.log('🎯 Learning: Recording ghost suggestion feedback:', {
      suggestionId,
      action,
      triggerNodeName,
      suggestionNodeName,
      relationshipType,
      confidence
    });

    // Store feedback in Neo4j for learning analysis
    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      // Create or update feedback node
      const query = `
        MERGE (feedback:GhostFeedback {
          suggestionId: $suggestionId,
          triggerNodeName: $triggerNodeName,
          triggerNodeCategory: $triggerNodeCategory,
          suggestionNodeName: $suggestionNodeName,
          suggestionCategory: $suggestionCategory,
          relationshipType: $relationshipType
        })
        SET 
          feedback.action = $action,
          feedback.confidence = $confidence,
          feedback.reason = $reason,
          feedback.timestamp = datetime(),
          feedback.userContext = $userContext,
          feedback.count = COALESCE(feedback.count, 0) + 1
        RETURN feedback
      `;
      
      await session.run(query, {
        suggestionId,
        action,
        triggerNodeName,
        triggerNodeCategory,
        suggestionNodeName,
        suggestionCategory,
        relationshipType,
        confidence,
        reason,
        userContext: userContext || {}
      });

      // Update suggestion success rate for this pattern
      if (action === 'accepted') {
        const updatePatternQuery = `
          MATCH (fa1:FunctionalArea) WHERE toLower(fa1.name) = toLower($triggerNodeName)
          MATCH (fa2:FunctionalArea) WHERE toLower(fa2.name) = toLower($suggestionNodeName)
          MATCH (fa1)-[r]-(fa2) WHERE type(r) = $relationshipType
          SET r.successRate = COALESCE(r.successRate, 0) + 0.1,
              r.lastAccepted = datetime()
        `;
        
        await session.run(updatePatternQuery, {
          triggerNodeName,
          suggestionNodeName,
          relationshipType
        });
      }
      
      res.json({ 
        message: 'Feedback recorded successfully',
        action,
        suggestionId 
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error recording ghost suggestion feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get learning analytics for ghost suggestions
router.get('/kg/learning-analytics', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      // Get feedback statistics
      const feedbackQuery = `
        MATCH (feedback:GhostFeedback)
        WITH 
          feedback.action as action,
          feedback.triggerNodeCategory as triggerCategory,
          feedback.suggestionCategory as suggestionCategory,
          feedback.relationshipType as relationshipType,
          count(*) as count
        RETURN action, triggerCategory, suggestionCategory, relationshipType, count
        ORDER BY count DESC
      `;
      
      const feedbackResult = await session.run(feedbackQuery);
      
      // Get success rates by relationship type
      const successRateQuery = `
        MATCH (feedback:GhostFeedback)
        WITH 
          feedback.relationshipType as relationshipType,
          sum(CASE WHEN feedback.action = 'accepted' THEN 1 ELSE 0 END) as accepted,
          sum(CASE WHEN feedback.action = 'rejected' THEN 1 ELSE 0 END) as rejected,
          count(*) as total
        RETURN 
          relationshipType,
          accepted,
          rejected,
          total,
          round(toFloat(accepted) / total * 100, 2) as successRate
        ORDER BY successRate DESC
      `;
      
      const successRateResult = await session.run(successRateQuery);
      
      // Get top performing patterns
      const topPatternsQuery = `
        MATCH (fa1:FunctionalArea)-[r]-(fa2:FunctionalArea)
        WHERE r.successRate IS NOT NULL
        RETURN 
          fa1.category as triggerCategory,
          fa2.category as suggestionCategory,
          type(r) as relationshipType,
          r.successRate as successRate,
          r.priority as priority
        ORDER BY r.successRate DESC, r.priority DESC
        LIMIT 20
      `;
      
      const topPatternsResult = await session.run(topPatternsQuery);
      
      const analytics = {
        feedback: feedbackResult.records.map(record => ({
          action: record.get('action'),
          triggerCategory: record.get('triggerCategory'),
          suggestionCategory: record.get('suggestionCategory'),
          relationshipType: record.get('relationshipType'),
          count: record.get('count').toNumber()
        })),
        successRates: successRateResult.records.map(record => ({
          relationshipType: record.get('relationshipType'),
          accepted: record.get('accepted').toNumber(),
          rejected: record.get('rejected').toNumber(),
          total: record.get('total').toNumber(),
          successRate: record.get('successRate')
        })),
        topPatterns: topPatternsResult.records.map(record => ({
          triggerCategory: record.get('triggerCategory'),
          suggestionCategory: record.get('suggestionCategory'),
          relationshipType: record.get('relationshipType'),
          successRate: record.get('successRate'),
          priority: record.get('priority')
        })),
        timestamp: new Date().toISOString()
      };
      
      res.json(analytics);
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error getting learning analytics:', error);
    res.status(500).json({ error: 'Failed to get learning analytics' });
  }
});

// Performance optimization endpoint - create indexes for faster queries
router.post('/kg/optimize-indexes', async (req, res) => {
  try {
    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      console.log('🚀 Performance: Creating Neo4j indexes for optimized queries...');
      
      // Index on FunctionalArea name for faster ghost suggestions
      await session.run('CREATE INDEX fa_name_index IF NOT EXISTS FOR (fa:FunctionalArea) ON (fa.name)');
      
      // Index on FunctionalArea category for pattern analysis  
      await session.run('CREATE INDEX fa_category_index IF NOT EXISTS FOR (fa:FunctionalArea) ON (fa.category)');
      
      // Index on relationship priority for performance
      await session.run('CREATE INDEX rel_priority_index IF NOT EXISTS FOR ()-[r:ADJACENT_TO]-() ON (r.priority)');
      await session.run('CREATE INDEX rel_success_rate_index IF NOT EXISTS FOR ()-[r:MATERIAL_FLOW]-() ON (r.successRate)');
      
      // Index on feedback for learning analytics
      await session.run('CREATE INDEX feedback_trigger_index IF NOT EXISTS FOR (f:GhostFeedback) ON (f.triggerNodeName)');
      await session.run('CREATE INDEX feedback_action_index IF NOT EXISTS FOR (f:GhostFeedback) ON (f.action)');
      await session.run('CREATE INDEX feedback_timestamp_index IF NOT EXISTS FOR (f:GhostFeedback) ON (f.timestamp)');
      
      console.log('✅ Performance: Neo4j indexes created successfully');
      
      res.json({ 
        message: 'Performance indexes created successfully',
        indexes: [
          'fa_name_index',
          'fa_category_index', 
          'rel_priority_index',
          'rel_success_rate_index',
          'feedback_trigger_index',
          'feedback_action_index',
          'feedback_timestamp_index'
        ]
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error creating performance indexes:', error);
    res.status(500).json({ error: 'Failed to create performance indexes' });
  }
});

// Enhanced ghost suggestions with caching and batch processing  
router.post('/kg/ghost-suggestions-batch', async (req, res) => {
  try {
    const { nodeRequests, confidenceThreshold = 0.3 } = req.body;
    
    if (!Array.isArray(nodeRequests)) {
      return res.status(400).json({ error: 'nodeRequests must be an array' });
    }
    
    console.log('🚀 Performance: Processing batch ghost suggestions:', nodeRequests.length, 'requests');
    
    const batchResults = await Promise.all(
      nodeRequests.map(async (request: any) => {
        try {
          const suggestions = await getGhostSuggestionsFromKnowledgeGraph(
            request.triggerNodeId,
            request.triggerNodePosition,
            request.existingNodePositions || [],
            confidenceThreshold,
            request.triggerNodeName,
            request.triggerNodeCategory
          );
          return {
            nodeId: request.triggerNodeId,
            suggestions,
            success: true
          };
        } catch (error) {
          return {
            nodeId: request.triggerNodeId,
            suggestions: [],
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    const successfulRequests = batchResults.filter(r => r.success).length;
    console.log(`🚀 Performance: Batch processing completed: ${successfulRequests}/${nodeRequests.length} successful`);
    
    res.json({
      results: batchResults,
      summary: {
        total: nodeRequests.length,
        successful: successfulRequests,
        failed: nodeRequests.length - successfulRequests
      }
    });
  } catch (error) {
    console.error('Error in batch ghost suggestions:', error);
    res.status(500).json({ error: 'Failed to process batch ghost suggestions' });
  }
});

// ============================================================================
// NEW CONSTRAINT ENFORCEMENT API ENDPOINTS
// ============================================================================

import { ConstraintEnforcementService } from '../services/constraintEnforcement';
const constraintService = new ConstraintEnforcementService();

// Associate a shape with a Neo4j node template
router.post('/:shapeId/associate', async (req, res) => {
  try {
    const { shapeId } = req.params;
    const { nodeTemplateId, nodeTemplateName, category, cleanroomClass, customProperties } = req.body;

    console.log('🔗 Enhanced shape association request:', {
      shapeId,
      nodeTemplateId,
      nodeTemplateName,
      category,
      cleanroomClass,
      customProperties,
      requestTimestamp: new Date().toISOString()
    });

    // Input validation with detailed error messages
    if (!nodeTemplateId && !nodeTemplateName) {
      console.warn('❌ Missing template identification:', { shapeId });
      return res.status(400).json({ 
        success: false,
        error: 'Either nodeTemplateId or nodeTemplateName is required',
        missingFields: ['nodeTemplateId', 'nodeTemplateName']
      });
    }

    if (!category) {
      console.warn('❌ Missing category:', { shapeId, nodeTemplateId, nodeTemplateName });
      return res.status(400).json({ 
        success: false,
        error: 'Category is required for shape association',
        missingFields: ['category'],
        availableCategories: ['Production', 'Quality Control', 'Warehouse', 'Utilities', 'Personnel', 'Support']
      });
    }

    // Perform the enhanced association with comprehensive search
    const result = await constraintService.associateShapeWithNode({
      shapeId,
      nodeTemplateId: nodeTemplateId || `template-${nodeTemplateName}`,
      nodeTemplateName: nodeTemplateName || nodeTemplateId,
      category,
      cleanroomClass,
      customProperties
    });

    if (result.success) {
      console.log('✅ Shape association successful:', {
        shapeId,
        templateId: result.templateId,
        templateName: result.nodeTemplate?.name,
        constraintsFound: result.constraints.length,
        duration: Date.now()
      });

      // Return enhanced response with template details
      res.json({
        success: true,
        message: result.message,
        shapeId,
        nodeTemplate: result.nodeTemplate ? {
          id: result.nodeTemplate.id,
          name: result.nodeTemplate.name,
          category: result.nodeTemplate.category || category,
          description: result.nodeTemplate.description,
          cleanroomClass: result.nodeTemplate.cleanroomClass || cleanroomClass,
          customProperties: {
            ...result.nodeTemplate,
            ...customProperties
          }
        } : null,
        constraints: {
          count: result.constraints.length,
          summary: result.constraints.reduce((acc, constraint) => {
            const type = constraint.relationship.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          details: result.constraints.map(constraint => ({
            type: constraint.relationship.type,
            targetNodeName: constraint.targetNode.name,
            priority: constraint.relationship.priority || 5,
            reason: constraint.relationship.reason,
            direction: constraint.relationship.direction,
            flowType: constraint.relationship.flowType
          }))
        },
        associationTimestamp: new Date().toISOString()
      });
    } else {
      console.warn('⚠️ Shape association failed:', {
        shapeId,
        templateId: nodeTemplateId,
        templateName: nodeTemplateName,
        error: result.message
      });

      res.status(404).json({
        success: false,
        message: result.message,
        shapeId,
        searchedFor: {
          nodeTemplateId,
          nodeTemplateName,
          category
        },
        suggestions: [
          'Check if the node template exists in the database',
          'Verify the template name matches exactly (case-insensitive)',
          'Consider using the template ID instead of name',
          'Initialize pharmaceutical templates if database is empty'
        ]
      });
    }

  } catch (error) {
    console.error('❌ Critical error in shape association:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      shapeId: req.params.shapeId,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({ 
      success: false,
      error: 'Failed to associate shape with Neo4j node',
      details: error instanceof Error ? error.message : 'Unknown error',
      shapeId: req.params.shapeId,
      timestamp: new Date().toISOString(),
      support: 'Check server logs for detailed error information'
    });
  }
});

// Get all constraints that apply to a specific node
router.get('/:nodeId/constraints', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log('📋 Getting constraints for node:', nodeId);

    const constraints = await constraintService.getNodeConstraints(nodeId);

    res.json({
      nodeId,
      constraintsCount: constraints.length,
      constraints
    });

  } catch (error) {
    console.error('❌ Error getting node constraints:', error);
    res.status(500).json({ 
      error: 'Failed to get node constraints',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validate a connection between two nodes
router.post('/connections/validate', async (req, res) => {
  try {
    const { sourceNodeId, targetNodeId, relationshipType } = req.body;

    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({ 
        error: 'sourceNodeId and targetNodeId are required' 
      });
    }

    console.log('✅ Validating connection:', { sourceNodeId, targetNodeId, relationshipType });

    const validationResult = await constraintService.validateConnection(
      sourceNodeId,
      targetNodeId,
      relationshipType
    );

    res.json({
      sourceNodeId,
      targetNodeId,
      relationshipType,
      ...validationResult
    });

  } catch (error) {
    console.error('❌ Error validating connection:', error);
    res.status(500).json({ 
      error: 'Failed to validate connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get valid connection targets for a node
router.get('/:nodeId/valid-targets', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log('🎯 Getting valid connection targets for node:', nodeId);

    const validTargets = await constraintService.getValidConnectionTargets(nodeId);

    res.json({
      nodeId,
      validTargetsCount: validTargets.length,
      validTargets
    });

  } catch (error) {
    console.error('❌ Error getting valid connection targets:', error);
    res.status(500).json({ 
      error: 'Failed to get valid connection targets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


// ============================================================================
// NEO4J DEBUG AND DIAGNOSTICS ENDPOINTS
// ============================================================================

import { Neo4jDebugService } from '../services/neo4jDebug';
const debugService = new Neo4jDebugService();

// Get comprehensive Neo4j debug information
router.get('/debug/neo4j-status', async (req, res) => {
  try {
    console.log('🔧 Debug: Getting comprehensive Neo4j status...');
    
    const debugInfo = await debugService.getDebugInfo();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      neo4j: debugInfo,
      recommendations: [
        debugInfo.connectionStatus === 'connected' ? 
          'Neo4j connection is healthy' : 
          'Neo4j connection issues detected - check configuration',
        debugInfo.templateCount === 0 ? 
          'No templates found - run POST /api/nodes/initialize' : 
          `${debugInfo.templateCount} templates available`,
        debugInfo.performanceMetrics.slowQueries.length > 0 ? 
          'Slow queries detected - consider optimization' : 
          'Query performance is acceptable'
      ]
    });
  } catch (error) {
    console.error('❌ Debug: Error getting Neo4j status:', error);
    res.status(500).json({
      error: 'Failed to get Neo4j debug information',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug template search with comprehensive analysis
router.post('/debug/template-search', async (req, res) => {
  try {
    const { templateId, templateName } = req.body;
    
    if (!templateId && !templateName) {
      return res.status(400).json({
        error: 'Either templateId or templateName is required',
        example: {
          templateId: 'analytical-lab',
          templateName: 'Analytical Lab'
        }
      });
    }
    
    console.log('🔍 Debug: Analyzing template search:', { templateId, templateName });
    
    const searchResult = await debugService.debugTemplateSearch(templateId, templateName);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      search: {
        input: { templateId, templateName },
        result: searchResult
      },
      recommendations: searchResult.suggestions
    });
  } catch (error) {
    console.error('❌ Debug: Template search analysis failed:', error);
    res.status(500).json({
      error: 'Failed to debug template search',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug constraint queries for a specific template
router.post('/debug/constraint-queries', async (req, res) => {
  try {
    const { templateId, templateName } = req.body;
    
    if (!templateId && !templateName) {
      return res.status(400).json({
        error: 'Either templateId or templateName is required'
      });
    }
    
    console.log('🔧 Debug: Testing constraint queries:', { templateId, templateName });
    
    const constraintDebug = await debugService.debugConstraintQueries(templateId, templateName);
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      constraints: constraintDebug,
      summary: {
        constraintsFound: constraintDebug.constraintsFound,
        uniqueRelationshipTypes: constraintDebug.constraintTypes.length,
        executionTime: `${constraintDebug.executionTime}ms`,
        hasErrors: constraintDebug.errors.length > 0
      },
      recommendations: [
        constraintDebug.constraintsFound === 0 ? 
          'No constraints found - check template relationships' : 
          `Found ${constraintDebug.constraintsFound} constraints`,
        constraintDebug.executionTime > 1000 ? 
          'Query execution is slow - consider database optimization' : 
          'Query performance is acceptable',
        constraintDebug.errors.length > 0 ? 
          'Errors detected - check database connectivity' : 
          'No errors in constraint queries'
      ]
    });
  } catch (error) {
    console.error('❌ Debug: Constraint query analysis failed:', error);
    res.status(500).json({
      error: 'Failed to debug constraint queries',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear debug metrics and error logs
router.post('/debug/clear-metrics', async (req, res) => {
  try {
    debugService.clearMetrics();
    
    res.json({
      status: 'success',
      message: 'Debug metrics and error logs cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Debug: Failed to clear metrics:', error);
    res.status(500).json({
      error: 'Failed to clear debug metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// RELATIONSHIP POSITIONING API - Enhanced for Overlapping Scenarios
// ============================================================================

// Optimal positioning for relationship icons in overlapping scenarios
router.post('/relationships/optimal-positioning', async (req, res) => {
  try {
    const { relationships, nodeGeometry, canvasSize } = req.body;
    
    if (!relationships || !nodeGeometry) {
      return res.status(400).json({ error: 'Missing relationships or nodeGeometry data' });
    }
    
    console.log('📍 Positioning: Calculating optimal icon positions for', relationships.length, 'relationships');
    
    const { RelationshipPositioningService } = require('../services/relationshipPositioning');
    const positioningService = new RelationshipPositioningService();
    
    const iconPositions = positioningService.calculateOptimalIconPositions(
      relationships,
      nodeGeometry,
      canvasSize || { width: 1200, height: 800 }
    );
    
    console.log('📍 Positioning: Generated', iconPositions.length, 'optimal positions');
    
    // Group results by collision risk for frontend prioritization
    const positioningResults = {
      iconPositions,
      summary: {
        total: iconPositions.length,
        noCollision: iconPositions.filter((p: any) => p.collisionRisk === 'none').length,
        lowRisk: iconPositions.filter((p: any) => p.collisionRisk === 'low').length,
        mediumRisk: iconPositions.filter((p: any) => p.collisionRisk === 'medium').length,
        highRisk: iconPositions.filter((p: any) => p.collisionRisk === 'high').length
      },
      layoutSuggestions: iconPositions
        .filter((p: any) => p.collisionRisk === 'high')
        .map((p: any) => `Relationship ${p.relationshipId} may need manual positioning due to overlaps`)
    };
    
    res.json(positioningResults);
  } catch (error) {
    console.error('📍 Positioning: Error calculating optimal positions:', error);
    res.status(500).json({ 
      error: 'Failed to calculate optimal icon positions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced relationships endpoint with positioning metadata
router.get('/:id/relationships/enhanced', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, includePositioning } = req.query;
    
    console.log(`📍 Enhanced Relationships: Fetching for node ${id}, mode: ${mode}, includePositioning: ${includePositioning}`);
    
    // Get base relationships with standard metadata
    let relationships = await spatialRelationshipModel.getRelationshipsForNode(id);
    
    // Enhanced processing for guided mode with positioning support
    if (mode === 'guided') {
      // Filter high-priority relationships
      relationships = relationships.filter(rel => 
        rel.priority >= 7 || 
        ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'PROHIBITED_NEAR'].includes(rel.type)
      );
      
      // Add enhanced visualization hints with positioning support
      relationships = relationships.map(rel => ({
        ...rel,
        mode: 'guided',
        visualization: {
          preferIcon: true,
          iconType: getIconType(rel.type),
          iconSize: getIconSize(rel.type),
          iconColor: getIconColor(rel.type),
          renderingPriority: rel.priority,
          // Enhanced positioning hints
          positioningHints: {
            preferredOffset: getPositionOffsetByType(rel.type, rel.priority),
            avoidanceRadius: getIconSize(rel.type) === 'large' ? 30 : 20,
            zIndex: rel.priority,
            collisionBehavior: rel.type === 'PROHIBITED_NEAR' ? 'force-visible' : 'adaptive'
          }
        },
        guidedModeProperties: {
          showInLegend: ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'PROHIBITED_NEAR'].includes(rel.type),
          interactionEnabled: true,
          tooltip: getPharmaceuticalTooltip(rel.type, rel.reason),
          criticalVisibility: rel.type === 'PROHIBITED_NEAR' || rel.priority >= 9
        }
      }));
    }
    
    console.log(`📍 Enhanced Relationships: Returning ${relationships.length} relationships with positioning hints`);
    res.json(relationships);
  } catch (error) {
    console.error('📍 Enhanced Relationships: Error fetching enhanced relationships:', error);
    res.status(500).json({ error: 'Failed to fetch enhanced relationships' });
  }
});

// Helper function for positioning offset based on type and priority  
function getPositionOffsetByType(type: string, priority: number): { x: number; y: number } {
  const basePriorityOffset = Math.max(0, (priority - 5) * 5);
  
  switch (type) {
    case 'MATERIAL_FLOW':
      return { x: 0, y: -15 - basePriorityOffset };
    case 'PERSONNEL_FLOW':
      return { x: 15 + basePriorityOffset, y: 0 };
    case 'PROHIBITED_NEAR':
      return { x: 0, y: 20 + basePriorityOffset };
    case 'REQUIRES_ACCESS':
      return { x: -15 - basePriorityOffset, y: 0 };
    case 'SHARES_UTILITY':
      return { x: 10 + basePriorityOffset, y: -10 - basePriorityOffset };
    case 'ADJACENT_TO':
      return { x: -10 - basePriorityOffset, y: 10 + basePriorityOffset };
    default:
      return { x: 0, y: -10 - basePriorityOffset };
  }
}

export default router;