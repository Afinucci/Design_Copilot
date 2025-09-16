import Neo4jService from '../config/database';
import { GhostSuggestion } from '../types/index';

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
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

export function getTriggerNodeName(nodeId: string): string {
  let extractedName = nodeId;
  
  // Extract base name from nodeId using regex patterns
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

  try {
    console.log('🔮 Backend: Extracted name from nodeId:', nodeId, '->', extractedName);

    // Validate extracted name
    if (extractedName.length < 2 || !/^[a-zA-Z-]+$/.test(extractedName)) {
      console.warn('🔮 Backend: Invalid extracted name format:', extractedName);
      // Return nodeId as fallback
      return nodeId;
    }
    
  } catch (error) {
    console.error('🔮 Backend: Error in getTriggerNodeName:', error, { nodeId });
    // Return nodeId as fallback
    return nodeId;
  }
  
  // Return the first variation as the primary name, but log all possible variations
  const variations = nameMapping[extractedName];
  if (variations && variations.length > 0) {
    console.log('🔮 Backend: Found name variations for', extractedName, ':', variations);
    return variations[0]; // Use the first variation as primary
  }
  
  // Fallback: convert hyphenated to title case
  const titleCase = extractedName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  console.log('🔮 Backend: Using title case fallback for', extractedName, ':', titleCase);
  
  return titleCase;
}

export function getNodeNameVariations(nodeId: string): string[] {
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
  
  const variations = nameMapping[baseName];
  if (variations) {
    return variations;
  }
  
  // Fallback: return title case version
  const titleCase = baseName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return [titleCase, baseName];
}

export function calculateOptimalPosition(
  triggerPosition: { x: number; y: number },
  existingPositions: NodePosition[],
  index: number
): { x: number; y: number } {
  const baseDistance = 200;
  const angleOffset = (index * 90) * (Math.PI / 180); // 90 degrees apart
  
  // Calculate initial position
  let x = triggerPosition.x + Math.cos(angleOffset) * baseDistance;
  let y = triggerPosition.y + Math.sin(angleOffset) * baseDistance;
  
  // Check for overlaps and adjust if necessary
  const minDistance = 150;
  let attempts = 0;
  const maxAttempts = 8;
  
  while (attempts < maxAttempts) {
    let hasOverlap = false;
    
    for (const pos of existingPositions) {
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < minDistance) {
        hasOverlap = true;
        break;
      }
    }
    
    if (!hasOverlap) break;
    
    // Try a different angle
    const newAngle = angleOffset + (attempts * 45) * (Math.PI / 180);
    const newDistance = baseDistance + (attempts * 50);
    x = triggerPosition.x + Math.cos(newAngle) * newDistance;
    y = triggerPosition.y + Math.sin(newAngle) * newDistance;
    attempts++;
  }
  
  return { x, y };
}

// Validation function to check if a node exists in the database
export async function validateNodeExistence(session: any, nodeName: string): Promise<{
  exists: boolean;
  matchedName?: string;
  totalVariationsTried: number;
  variationsTried: string[];
}> {
  console.log('🔍 Validation: Checking FunctionalArea existence for:', nodeName);
  
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

export class GhostSuggestionsService {
  private neo4jService: Neo4jService;

  constructor() {
    this.neo4jService = Neo4jService.getInstance();
  }

  async getGhostSuggestions(
    triggerNodeId: string,
    triggerNodeCategory: string | undefined,
    triggerNodePosition: { x: number; y: number },
    existingNodePositions: NodePosition[]
  ): Promise<GhostSuggestion[]> {
    const session = this.neo4jService.getDriver().session();
    if (!session) {
      console.warn('🔮 Backend: No database session available');
      return [];
    }

    try {
      const confidenceThreshold = 0.3;
      let nodeName = getTriggerNodeName(triggerNodeId);
      
      if (!nodeName || nodeName === triggerNodeId) {
        console.warn('🔮 KG: No node name provided, will use triggerNodeId as fallback:', triggerNodeId);
        nodeName = triggerNodeId;
      }

      console.log('🔮 KG: Enhanced pattern analysis for node:', nodeName, 'category:', triggerNodeCategory);

      // Validation: Check if node exists in database before running complex queries
      const nodeValidation = await validateNodeExistence(session, nodeName);
      if (!nodeValidation.exists) {
        console.warn('🔮 Backend: Node validation failed - no matching node found in database');
        console.log('🔮 Backend: Validation details:', nodeValidation);
        // Still try the simple query as fallback
        return await this.getSimpleGhostSuggestions(session, nodeName || triggerNodeId, triggerNodePosition, confidenceThreshold);
      } else {
        console.log('🔮 Backend: Node validation passed - found:', nodeValidation.matchedName);
      }

      // Enhanced multi-stage query approach for better pharmaceutical intelligence
      const enhancedSuggestions = await this.getEnhancedGhostSuggestions(
        session, 
        nodeName, 
        triggerNodeCategory, 
        triggerNodePosition, 
        existingNodePositions, 
        confidenceThreshold
      );

      if (enhancedSuggestions.length > 0) {
        console.log('🔮 Backend: Enhanced suggestions successful, returning', enhancedSuggestions.length, 'suggestions');
        return enhancedSuggestions;
      }

      // Fallback to simple suggestions if enhanced fails
      console.log('🔮 Backend: Enhanced suggestions returned empty, falling back to simple suggestions');
      return await this.getSimpleGhostSuggestions(session, nodeName || triggerNodeId, triggerNodePosition, confidenceThreshold);

    } catch (error) {
      console.error('🔮 Backend: Error in getGhostSuggestions:', error);
      return [];
    } finally {
      await session.close();
    }
  }

  private async getEnhancedGhostSuggestions(
    session: any,
    nodeName: string,
    triggerNodeCategory: string | undefined,
    triggerNodePosition: { x: number; y: number },
    existingNodePositions: NodePosition[],
    confidenceThreshold: number
  ): Promise<GhostSuggestion[]> {
    console.log('🔮 Enhanced: Starting multi-stage analysis for:', nodeName);
    
    const allSuggestions: GhostSuggestion[] = [];
    
    // Stage 1: Direct relationships (highest confidence)
    const directSuggestions = await this.getDirectRelationshipSuggestions(session, nodeName, triggerNodePosition, confidenceThreshold);
    allSuggestions.push(...directSuggestions);
    console.log('🔮 Enhanced: Stage 1 added', directSuggestions.length, 'direct suggestions');

    // Stage 2: Category-based suggestions (medium confidence) 
    const categorySuggestions = await this.getCategoryBasedSuggestions(session, nodeName, triggerNodeCategory, triggerNodePosition, confidenceThreshold);
    allSuggestions.push(...categorySuggestions);
    console.log('🔮 Enhanced: Stage 2 added', categorySuggestions.length, 'category suggestions');

    // Stage 3: Multi-hop workflow patterns (lower confidence)
    const workflowSuggestions = await this.getWorkflowPatternSuggestions(session, nodeName, triggerNodePosition, confidenceThreshold);
    allSuggestions.push(...workflowSuggestions);
    console.log('🔮 Enhanced: Stage 3 added', workflowSuggestions.length, 'workflow suggestions');

    // Remove duplicates and calculate optimal positions
    const uniqueSuggestions = this.deduplicateAndPosition(allSuggestions, triggerNodePosition, existingNodePositions);
    
    console.log('🔮 Enhanced: Final result:', uniqueSuggestions.length, 'unique suggestions');
    return uniqueSuggestions;
  }

  // Stage 1: Direct relationship suggestions
  // Stage 1: Direct relationship suggestions
  private async getDirectRelationshipSuggestions(
    session: any, 
    nodeName: string, 
    triggerNodePosition: { x: number; y: number }, 
    confidenceThreshold: number
  ): Promise<GhostSuggestion[]> {
    console.log('🔍 Stage 1: Searching for direct FunctionalArea relationships for node:', nodeName);
    
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
        CASE WHEN startNode(r) = selected THEN 'outgoing' ELSE 'incoming' END as direction,
        r.priority as priority,
        r.reason as reason,
        COALESCE(r.successRate, 0.5) as successRate
      ORDER BY COALESCE(r.successRate, 0.5) DESC, r.priority DESC
    `;
    
    console.log('🔍 Stage 1: Executing Cypher query for FunctionalArea relationships');
    console.log('🔍 Stage 1: Query parameters:', { nameVariations: nameVariations.map(n => n.toLowerCase()) });
    
    // Debug: First check if the functional area exists
    const testResult = await session.run('MATCH (fa:FunctionalArea) WHERE toLower(fa.name) IN $nameVariations RETURN fa.name', { nameVariations: nameVariations.map(n => n.toLowerCase()) });
    console.log('🔍 Stage 1: Test query found FunctionalAreas:', testResult.records.map((r: any) => r.get('fa.name')));
    
    // Convert variations to lowercase for case-insensitive matching
    const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
    const result = await session.run(query, { nameVariations: lowerCaseVariations });
    const suggestions: GhostSuggestion[] = [];
    
    console.log('🔍 Stage 1: Query returned', result.records.length, 'records from FunctionalArea relationships');
    
    if (result.records.length > 0) {
      console.log('🔍 Stage 1: Found matching FunctionalArea:', result.records[0].get('selectedName'), 'with', result.records.length, 'relationships');
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
        id: `ghost-direct-${record.get('connectedId')}-${Date.now()}`,
        name: record.get('connectedName'),
        category: record.get('connectedCategory') || 'Unknown',
        cleanroomClass: record.get('connectedCleanroomClass') || 'Unclassified',
        suggestedPosition: triggerNodePosition, // Will be repositioned later
        confidence: confidence,
        reason: rel.reason || `Direct ${record.get('relType')} relationship found in facility patterns`,
        nodeId: record.get('connectedId'),
        sourceNodeId: record.get('selectedId'),
        sourceNodeName: record.get('selectedName'),
        sourceNodeCategory: record.get('selectedCategory'),
        sourceNodeCleanroomClass: record.get('selectedCleanroomClass'),
        relationships: [{
          id: `rel-${record.get('selectedId')}-${record.get('connectedId')}`,
          type: record.get('relType'),
          toNodeId: record.get('connectedId'),
          fromNodeId: record.get('selectedId'),
          priority: priority,
          reason: rel.reason || `Direct ${record.get('relType')} relationship from facility patterns`,
          confidence: confidence
        }]
      };
      
      console.log('🔍 Stage 1: Added direct FunctionalArea suggestion:', suggestion.name, 'confidence:', confidence.toFixed(2));
      suggestions.push(suggestion);
    }
    
    console.log('🔍 Stage 1: Returning', suggestions.length, 'direct suggestions from FunctionalArea patterns');
    return suggestions.slice(0, 3); // Limit to top 3
  }

  // Stage 2: Category-based suggestions
  // Stage 2: Category-based suggestions
  private async getCategoryBasedSuggestions(
    session: any,
    nodeName: string,
    triggerNodeCategory: string | undefined,
    triggerNodePosition: { x: number; y: number },
    confidenceThreshold: number
  ): Promise<GhostSuggestion[]> {
    if (!triggerNodeCategory) {
      console.log('🔍 Stage 2: No category provided, skipping category-based suggestions');
      return [];
    }
    
    console.log('🔍 Stage 2: Searching for category-based FunctionalArea suggestions for category:', triggerNodeCategory);
    
    // Get all possible name variations to try
    const nameVariations = getNodeNameVariations(nodeName);
    console.log('🔍 Stage 2: Will search using name variations:', nameVariations);
    
    const query = `
      // Find FunctionalAreas in the same category with strong relationships to other categories
      MATCH (selected:FunctionalArea)
      WHERE toLower(selected.name) IN $nameVariations
      MATCH (categoryPeers:FunctionalArea {category: selected.category})
      MATCH (categoryPeers)-[r]-(suggested:FunctionalArea)
      WHERE suggested.category <> selected.category
      RETURN 
        suggested.id as suggestedId,
        suggested.name as suggestedName,
        suggested.category as suggestedCategory,
        suggested.cleanroomClass as suggestedCleanroomClass,
        type(r) as relType,
        AVG(r.priority) as avgPriority,
        COUNT(*) as connectionCount,
        COLLECT(DISTINCT categoryPeers.name)[0..3] as sampleConnections
      ORDER BY avgPriority DESC, connectionCount DESC
      LIMIT 5
    `;
    
    console.log('🔍 Stage 2: Executing category-based query for FunctionalArea patterns');
    
    // Convert variations to lowercase for case-insensitive matching
    const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
    const result = await session.run(query, { nameVariations: lowerCaseVariations });
    const suggestions: GhostSuggestion[] = [];
    
    console.log('🔍 Stage 2: Category query returned', result.records.length, 'records from FunctionalArea patterns');
    
    for (const record of result.records) {
      const avgPriority = record.get('avgPriority') || 5;
      const connectionCount = record.get('connectionCount') || 1;
      const sampleConnections = record.get('sampleConnections') || [];
      
      // Calculate confidence based on average priority and connection frequency from real facility data
      const priorityScore = avgPriority / 10;
      const frequencyBonus = Math.min(0.3, connectionCount * 0.05);
      const confidence = Math.min(0.8, Math.max(0.4, priorityScore + frequencyBonus));
      
      if (confidence < confidenceThreshold) continue;
      
      const suggestion: GhostSuggestion = {
        id: `ghost-category-${record.get('suggestedId')}-${Date.now()}`,
        name: record.get('suggestedName'),
        category: record.get('suggestedCategory') || 'Unknown',
        cleanroomClass: record.get('suggestedCleanroomClass') || 'Unclassified', 
        suggestedPosition: triggerNodePosition, // Will be repositioned later
        confidence: confidence,
        reason: `Commonly connected to ${triggerNodeCategory} areas in facility patterns (${connectionCount} connections found via: ${sampleConnections.join(', ')})`,
        nodeId: record.get('suggestedId'),
        sourceNodeId: nodeName,
        sourceNodeName: nodeName,
        sourceNodeCategory: triggerNodeCategory,
        relationships: [{
          id: `rel-category-${nodeName}-${record.get('suggestedId')}`,
          type: record.get('relType'),
          toNodeId: record.get('suggestedId'),
          fromNodeId: nodeName,
          priority: avgPriority,
          reason: `Category pattern from facility data: ${connectionCount} connections found`,
          confidence: confidence
        }]
      };
      
      console.log('🔍 Stage 2: Added category-based FunctionalArea suggestion:', suggestion.name, 'confidence:', confidence.toFixed(2));
      suggestions.push(suggestion);
    }
    
    console.log('🔍 Stage 2: Returning', suggestions.length, 'category-based suggestions from FunctionalArea patterns');
    return suggestions;
  }

  // Stage 3: Multi-hop workflow pattern suggestions
  // Stage 3: Multi-hop workflow pattern suggestions
  private async getWorkflowPatternSuggestions(
    session: any, 
    nodeName: string, 
    triggerNodePosition: { x: number; y: number }, 
    confidenceThreshold: number
  ): Promise<GhostSuggestion[]> {
    console.log('🔍 Stage 3: Searching for workflow patterns in FunctionalArea data for node:', nodeName);
    
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
        intermediate.category as intermediateCategory,
        r1.flowType as flowType1,
        r2.flowType as flowType2,
        type(r1) as relType1,
        type(r2) as relType2,
        r2.priority as priority,
        COALESCE(r2.successRate, 0.3) as successRate
      ORDER BY COALESCE(r2.successRate, 0.3) DESC, r2.priority DESC
      LIMIT 5
    `;
    
    console.log('🔍 Stage 3: Executing workflow pattern query for FunctionalArea data');
    
    // Convert variations to lowercase for case-insensitive matching
    const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
    const result = await session.run(query, { nameVariations: lowerCaseVariations });
    const suggestions: GhostSuggestion[] = [];
    
    console.log('🔍 Stage 3: Workflow query returned', result.records.length, 'records from FunctionalArea workflow patterns');
    
    for (const record of result.records) {
      const priority = record.get('priority') || 3;
      const successRate = record.get('successRate') || 0.3;
      
      // Enhanced confidence for workflow patterns based on real facility data
      const baseConfidence = priority / 15; // Lower base for 2-hop
      const learningBoost = successRate * 0.5; // Higher learning boost for workflow patterns
      const confidence = Math.min(0.7, Math.max(0.3, baseConfidence + learningBoost));
      
      if (confidence < confidenceThreshold) continue;
      
      const flowDescription = `${record.get('flowType1')} → ${record.get('flowType2')}`;
      const workflowPath = `${nodeName} → ${record.get('intermediateName')} (${record.get('intermediateCategory')}) → ${record.get('finalName')}`;
      
      const suggestion: GhostSuggestion = {
        id: `ghost-workflow-${record.get('finalId')}-${Date.now()}`,
        name: record.get('finalName'),
        category: record.get('finalCategory') || 'Unknown',
        cleanroomClass: record.get('finalCleanroomClass') || 'Unclassified',
        suggestedPosition: triggerNodePosition, // Will be repositioned later
        confidence: confidence,
        reason: `Workflow pattern from facility data: ${workflowPath} (${flowDescription})`,
        nodeId: record.get('finalId'),
        sourceNodeId: nodeName,
        sourceNodeName: nodeName,
        sourceNodeCategory: 'Unknown', // Will be filled by caller if available
        relationships: [{
          id: `rel-workflow-${nodeName}-${record.get('finalId')}`,
          type: 'WORKFLOW_SUGGESTION',
          toNodeId: record.get('finalId'),
          fromNodeId: nodeName,
          priority: priority,
          reason: `Via ${record.get('intermediateName')} - learned from facility patterns`,
          confidence: confidence,
          flowType: record.get('flowType2')
        }]
      };
      
      console.log('🔍 Stage 3: Added workflow FunctionalArea suggestion:', suggestion.name, 'confidence:', confidence.toFixed(2), 'path:', workflowPath);
      suggestions.push(suggestion);
    }
    
    console.log('🔍 Stage 3: Returning', suggestions.length, 'workflow suggestions from FunctionalArea patterns');
    return suggestions;
  }

  // Fallback simple ghost suggestions (original implementation)
  // Fallback simple ghost suggestions (original implementation)
  private async getSimpleGhostSuggestions(
    session: any,
    nodeName: string,
    triggerNodePosition: { x: number; y: number },
    confidenceThreshold: number
  ): Promise<GhostSuggestion[]> {
    console.log('🔍 Fallback: Searching with simple FunctionalArea suggestions for node:', nodeName);
    
    // Get all possible name variations to try
    const nameVariations = getNodeNameVariations(nodeName);
    console.log('🔍 Fallback: Will search using name variations:', nameVariations);
    
    const query = `
      MATCH (selected:FunctionalArea)
      WHERE toLower(selected.name) IN $nameVariations
      MATCH (selected)-[r]-(connected:FunctionalArea)
      RETURN 
        connected.id as connectedId,
        connected.name as name, 
        connected.category as category,
        connected.cleanroomClass as cleanroomClass,
        r.priority as priority, 
        type(r) as relType,
        r.reason as reason,
        COALESCE(r.successRate, 0.5) as successRate
      ORDER BY COALESCE(r.successRate, 0.5) DESC, r.priority DESC
      LIMIT 5
    `;
    
    console.log('🔍 Fallback: Executing simple Cypher query for FunctionalArea relationships');
    
    // Convert variations to lowercase for case-insensitive matching
    const lowerCaseVariations = nameVariations.map(name => name.toLowerCase());
    const result = await session.run(query, { nameVariations: lowerCaseVariations });
    const suggestions: GhostSuggestion[] = [];
    
    console.log('🔍 Fallback: Simple query returned', result.records.length, 'records from FunctionalArea data');
    
    for (const record of result.records) {
      const priority = record.get('priority') || 5;
      const successRate = record.get('successRate') || 0.5;
      
      // Enhanced confidence calculation with learning from facility data
      const baseConfidence = priority / 10;
      const learningBoost = successRate * 0.3;
      const confidence = Math.min(0.95, Math.max(0.3, baseConfidence + learningBoost));
      
      if (confidence < confidenceThreshold) continue;
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 200;
      const x = triggerNodePosition.x + Math.cos(angle) * distance;
      const y = triggerNodePosition.y + Math.sin(angle) * distance;
      
      const suggestion: GhostSuggestion = {
        id: `ghost-simple-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: record.get('name'),
        category: record.get('category') || 'Unknown',
        cleanroomClass: record.get('cleanroomClass') || 'Unclassified',
        suggestedPosition: { x, y },
        confidence: confidence,
        reason: record.get('reason') || `Found ${record.get('relType')} relationship in facility patterns`,
        nodeId: record.get('connectedId') || `node-${record.get('name').toLowerCase().replace(/\s+/g, '-')}`,
        sourceNodeId: nodeName,
        sourceNodeName: nodeName,
        sourceNodeCategory: 'Unknown',
        relationships: [{
          id: `rel-simple-${nodeName}-${record.get('name')}`,
          type: record.get('relType'),
          toNodeId: record.get('connectedId') || record.get('name'),
          fromNodeId: nodeName,
          priority: priority,
          reason: record.get('reason') || `Found ${record.get('relType')} relationship in facility patterns`,
          confidence: confidence
        }]
      };
      
      console.log('🔍 Fallback: Added simple FunctionalArea suggestion:', suggestion.name, 'confidence:', confidence.toFixed(2));
      suggestions.push(suggestion);
    }
    
    console.log('🔍 Fallback: Returning', suggestions.length, 'simple suggestions from FunctionalArea data');
    return suggestions;
  }

  // Helper method to remove duplicates and calculate optimal positions
  private deduplicateAndPosition(
    suggestions: GhostSuggestion[],
    triggerNodePosition: { x: number; y: number },
    existingNodePositions: NodePosition[]
  ): GhostSuggestion[] {
    // Remove duplicates based on name
    const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.name === suggestion.name)
    );
    
    // Sort by confidence (highest first)
    uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Calculate optimal positions
    return uniqueSuggestions.map((suggestion, index) => ({
      ...suggestion,
      suggestedPosition: calculateOptimalPosition(triggerNodePosition, existingNodePositions, index)
    })).slice(0, 5); // Limit to top 5
  }
}