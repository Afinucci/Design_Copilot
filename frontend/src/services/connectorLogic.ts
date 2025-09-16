import { SpatialRelationship, NodeCategory } from '../types';

interface ConnectorRule {
  fromCategory: NodeCategory;
  toCategory: NodeCategory;
  relationshipTypes: SpatialRelationship['type'][];
  priority: number;
  reason: string;
  flowDirection?: 'unidirectional' | 'bidirectional';
  flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';
}

// Define pharmaceutical facility connector rules based on GMP best practices
// Minimum separation distance for non-adjacent shapes (in pixels)
export const MIN_SEPARATION_DISTANCE = 10;

// Edge contact tolerance for adjacent shapes (in pixels)
export const EDGE_CONTACT_TOLERANCE = 2;
const connectorRules: ConnectorRule[] = [
  // Production area connections
  {
    fromCategory: 'Production',
    toCategory: 'Production',
    relationshipTypes: ['ADJACENT_TO', 'MATERIAL_FLOW'],
    priority: 9,
    reason: 'Sequential production flow',
    flowDirection: 'unidirectional',
    flowType: 'raw_material',
  },
  {
    fromCategory: 'Production',
    toCategory: 'Quality Control',
    relationshipTypes: ['REQUIRES_ACCESS', 'PERSONNEL_FLOW'],
    priority: 8,
    reason: 'In-process quality control access',
    flowDirection: 'bidirectional',
    flowType: 'personnel',
  },
  {
    fromCategory: 'Production',
    toCategory: 'Warehouse',
    relationshipTypes: ['MATERIAL_FLOW'],
    priority: 7,
    reason: 'Material supply and finished goods flow',
    flowDirection: 'bidirectional',
    flowType: 'raw_material',
  },
  {
    fromCategory: 'Production',
    toCategory: 'Personnel',
    relationshipTypes: ['ADJACENT_TO', 'PERSONNEL_FLOW'],
    priority: 9,
    reason: 'Gowning and personnel access',
    flowDirection: 'unidirectional',
    flowType: 'personnel',
  },
  {
    fromCategory: 'Production',
    toCategory: 'Utilities',
    relationshipTypes: ['SHARES_UTILITY'],
    priority: 6,
    reason: 'HVAC and utility connections',
    flowDirection: 'bidirectional',
  },

  // Quality Control connections
  {
    fromCategory: 'Quality Control',
    toCategory: 'Quality Control',
    relationshipTypes: ['ADJACENT_TO'],
    priority: 7,
    reason: 'Lab suite adjacency',
    flowDirection: 'bidirectional',
  },
  {
    fromCategory: 'Quality Control',
    toCategory: 'Warehouse',
    relationshipTypes: ['REQUIRES_ACCESS'],
    priority: 6,
    reason: 'Sample collection access',
    flowDirection: 'bidirectional',
  },
  {
    fromCategory: 'Quality Control',
    toCategory: 'Personnel',
    relationshipTypes: ['ADJACENT_TO', 'PERSONNEL_FLOW'],
    priority: 8,
    reason: 'Lab personnel access',
    flowDirection: 'bidirectional',
    flowType: 'personnel',
  },

  // Warehouse connections
  {
    fromCategory: 'Warehouse',
    toCategory: 'Warehouse',
    relationshipTypes: ['ADJACENT_TO'],
    priority: 6,
    reason: 'Storage area continuity',
    flowDirection: 'bidirectional',
  },
  {
    fromCategory: 'Warehouse',
    toCategory: 'Support',
    relationshipTypes: ['REQUIRES_ACCESS'],
    priority: 5,
    reason: 'Maintenance and logistics access',
    flowDirection: 'bidirectional',
  },

  // Personnel area connections
  {
    fromCategory: 'Personnel',
    toCategory: 'Personnel',
    relationshipTypes: ['ADJACENT_TO'],
    priority: 7,
    reason: 'Personnel flow continuity',
    flowDirection: 'bidirectional',
  },
  {
    fromCategory: 'Personnel',
    toCategory: 'Support',
    relationshipTypes: ['ADJACENT_TO'],
    priority: 5,
    reason: 'Support services access',
    flowDirection: 'bidirectional',
  },

  // Utilities connections
  {
    fromCategory: 'Utilities',
    toCategory: 'Support',
    relationshipTypes: ['ADJACENT_TO', 'REQUIRES_ACCESS'],
    priority: 6,
    reason: 'Maintenance access',
    flowDirection: 'bidirectional',
  },

  // Prohibited connections
  {
    fromCategory: 'Production',
    toCategory: 'Warehouse',
    relationshipTypes: ['PROHIBITED_NEAR'],
    priority: 8,
    reason: 'Prevent cross-contamination between raw and finished materials',
    flowDirection: 'bidirectional',
  },
];

export interface AutoConnectorResult {
  relationships: Partial<SpatialRelationship>[];
  suggestedType: SpatialRelationship['type'];
  confidence: number;
}

// Type guard for NodeCategory
function isValidNodeCategory(category: any): category is NodeCategory {
  const validCategories: NodeCategory[] = ['Production', 'Quality Control', 'Warehouse', 'Personnel', 'Support', 'Utilities'];
  return typeof category === 'string' && validCategories.includes(category as NodeCategory);
}

// Type guard for SpatialRelationship type
function isValidRelationshipType(type: any): type is SpatialRelationship['type'] {
  const validTypes: SpatialRelationship['type'][] = [
    'ADJACENT_TO',
    'PROHIBITED_NEAR', 
    'REQUIRES_ACCESS',
    'SHARES_UTILITY',
    'MATERIAL_FLOW',
    'PERSONNEL_FLOW',
    'WORKFLOW_SUGGESTION'
  ];
  return typeof type === 'string' && validTypes.includes(type as SpatialRelationship['type']);
}

/**
 * Determines which connectors should be created between two nodes based on their categories
 * and the reference diagram rules
 */
export function getAutoConnectors(
  fromNodeCategory: NodeCategory,
  toNodeCategory: NodeCategory,
  fromNodeName?: string,
  toNodeName?: string
): AutoConnectorResult {
  // Input validation with type guards
  if (!isValidNodeCategory(fromNodeCategory) || !isValidNodeCategory(toNodeCategory)) {
    console.warn('Invalid node categories provided:', { fromNodeCategory, toNodeCategory });
    return {
      relationships: [{
        type: 'ADJACENT_TO',
        priority: 1,
        reason: 'Default fallback due to invalid categories',
      }],
      suggestedType: 'ADJACENT_TO',
      confidence: 0.1,
    };
  }

  const relationships: Partial<SpatialRelationship>[] = [];
  let confidence = 0.5; // Base confidence

  // Find matching rules
  const matchingRules = connectorRules.filter(
    (rule) =>
      (rule.fromCategory === fromNodeCategory && rule.toCategory === toNodeCategory) ||
      (rule.fromCategory === toNodeCategory && rule.toCategory === fromNodeCategory)
  );

  if (matchingRules.length === 0) {
    // No specific rules found, use default adjacency
    relationships.push({
      type: 'ADJACENT_TO',
      priority: 5,
      reason: 'Default adjacency relationship',
    });
    confidence = 0.3;
  } else {
    // Apply all matching rules
    matchingRules.forEach((rule) => {
      rule.relationshipTypes.forEach((relType) => {
        const relationship: Partial<SpatialRelationship> = {
          type: relType,
          priority: rule.priority,
          reason: rule.reason,
        };

        // Add flow-specific properties
        if (relType === 'MATERIAL_FLOW' || relType === 'PERSONNEL_FLOW') {
          relationship.flowDirection = rule.flowDirection || 'bidirectional';
          relationship.flowType = rule.flowType;
        }

        // Add distance constraints for prohibited relationships
        if (relType === 'PROHIBITED_NEAR') {
          relationship.minDistance = 10; // 10 meters minimum separation
        }

        // Add door type for adjacency
        if (relType === 'ADJACENT_TO' && fromNodeCategory === 'Production') {
          relationship.doorType = 'airlock';
        }

        relationships.push(relationship);
      });

      // Update confidence based on rule priority
      confidence = Math.max(confidence, rule.priority / 10);
    });
  }

  // Determine the primary suggested type (highest priority)
  const suggestedType =
    relationships.length > 0
      ? relationships.reduce((prev, curr) =>
          (curr.priority || 0) > (prev.priority || 0) ? curr : prev
        ).type || 'ADJACENT_TO'
      : 'ADJACENT_TO';

  return {
    relationships,
    suggestedType,
    confidence,
  };
}

/**
 * Validates if a connection between two nodes is allowed based on GMP rules
 */
export function isConnectionAllowed(
  fromNodeCategory: NodeCategory,
  toNodeCategory: NodeCategory,
  relationshipType: SpatialRelationship['type']
): { allowed: boolean; reason?: string } {
  // Input validation with type guards
  if (!isValidNodeCategory(fromNodeCategory) || !isValidNodeCategory(toNodeCategory)) {
    return {
      allowed: false,
      reason: 'Invalid node categories provided',
    };
  }

  if (!isValidRelationshipType(relationshipType)) {
    return {
      allowed: false,
      reason: `Invalid relationship type: ${relationshipType}`,
    };
  }
  // Check for explicitly prohibited connections
  const prohibitedRule = connectorRules.find(
    (rule) =>
      rule.relationshipTypes.includes('PROHIBITED_NEAR') &&
      ((rule.fromCategory === fromNodeCategory && rule.toCategory === toNodeCategory) ||
        (rule.fromCategory === toNodeCategory && rule.toCategory === fromNodeCategory))
  );

  if (prohibitedRule && relationshipType === 'ADJACENT_TO') {
    return {
      allowed: false,
      reason: prohibitedRule.reason,
    };
  }

  // Check if the relationship type is valid for these categories
  const validRule = connectorRules.find(
    (rule) =>
      rule.relationshipTypes.includes(relationshipType) &&
      ((rule.fromCategory === fromNodeCategory && rule.toCategory === toNodeCategory) ||
        (rule.fromCategory === toNodeCategory && rule.toCategory === fromNodeCategory))
  );

  if (!validRule && relationshipType !== 'ADJACENT_TO') {
    return {
      allowed: false,
      reason: `${relationshipType} is not a valid connection type between ${fromNodeCategory} and ${toNodeCategory}`,
    };
  }

  return { allowed: true };
}

/**
 * Gets connector metadata including visual styling hints
 */
export function getConnectorMetadata(relationshipType: SpatialRelationship['type']) {
  const metadata: Record<
    SpatialRelationship['type'],
    {
      color: string;
      dashArray?: string;
      animated?: boolean;
      label: string;
      description: string;
    }
  > = {
    ADJACENT_TO: {
      color: '#1976d2',
      label: 'Adjacent',
      description: 'Physical adjacency with direct access',
    },
    PROHIBITED_NEAR: {
      color: '#d32f2f',
      dashArray: '10,5',
      label: 'Prohibited',
      description: 'Must maintain separation',
    },
    REQUIRES_ACCESS: {
      color: '#0288d1',
      dashArray: '5,5',
      label: 'Access',
      description: 'Requires access for operations',
    },
    SHARES_UTILITY: {
      color: '#388e3c',
      dashArray: '3,3',
      label: 'Utility',
      description: 'Shares utility systems',
    },
    MATERIAL_FLOW: {
      color: '#9c27b0',
      dashArray: '8,3,3,3',
      animated: true,
      label: 'Material',
      description: 'Material transfer flow',
    },
    PERSONNEL_FLOW: {
      color: '#ff9800',
      dashArray: '5,3,5,3',
      label: 'Personnel',
      description: 'Personnel movement path',
    },
    WORKFLOW_SUGGESTION: {
      color: '#4caf50',
      dashArray: '2,2',
      label: 'Workflow',
      description: 'Suggested workflow connection',
    },
  };

  return metadata[relationshipType] || metadata.ADJACENT_TO;
}

/**
 * Suggests missing mandatory adjacencies based on node type
 */
export function getMandatoryAdjacencies(
  nodeCategory: NodeCategory,
  existingConnections: { category: NodeCategory; relationshipType: SpatialRelationship['type'] }[]
): { category: NodeCategory; relationshipType: SpatialRelationship['type']; reason: string }[] {
  const mandatory: {
    category: NodeCategory;
    relationshipType: SpatialRelationship['type'];
    reason: string;
  }[] = [];

  // Production areas must have personnel access
  if (nodeCategory === 'Production') {
    const hasPersonnelAccess = existingConnections.some(
      (conn) => conn.category === 'Personnel' && conn.relationshipType === 'ADJACENT_TO'
    );
    if (!hasPersonnelAccess) {
      mandatory.push({
        category: 'Personnel',
        relationshipType: 'ADJACENT_TO',
        reason: 'Production areas require gowning/degowning access',
      });
    }

    // Production areas should have QC access
    const hasQCAccess = existingConnections.some(
      (conn) => conn.category === 'Quality Control' && conn.relationshipType === 'REQUIRES_ACCESS'
    );
    if (!hasQCAccess) {
      mandatory.push({
        category: 'Quality Control',
        relationshipType: 'REQUIRES_ACCESS',
        reason: 'In-process quality control sampling',
      });
    }
  }

  // QC labs need sample receipt area
  if (nodeCategory === 'Quality Control') {
    const hasWarehouseAccess = existingConnections.some(
      (conn) => conn.category === 'Warehouse' && conn.relationshipType === 'REQUIRES_ACCESS'
    );
    if (!hasWarehouseAccess) {
      mandatory.push({
        category: 'Warehouse',
        relationshipType: 'REQUIRES_ACCESS',
        reason: 'Sample receipt and storage access',
      });
    }
  }

  return mandatory;
}

// Type guard for layout node
function isValidLayoutNode(node: any): node is { id: string; category: NodeCategory; position: { x: number; y: number } } {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof node.id === 'string' &&
    isValidNodeCategory(node.category) &&
    typeof node.position === 'object' &&
    node.position !== null &&
    typeof node.position.x === 'number' &&
    typeof node.position.y === 'number'
  );
}

// Type guard for layout edge
function isValidLayoutEdge(edge: any): edge is { source: string; target: string; type: SpatialRelationship['type'] } {
  return (
    typeof edge === 'object' &&
    edge !== null &&
    typeof edge.source === 'string' &&
    typeof edge.target === 'string' &&
    isValidRelationshipType(edge.type)
  );
}

/**
 * Analyzes a facility layout and suggests improvements
 */
export function analyzeFacilityLayout(
  nodes: { id: string; category: NodeCategory; position: { x: number; y: number } }[],
  edges: { source: string; target: string; type: SpatialRelationship['type'] }[]
): {
  score: number;
  suggestions: string[];
  violations: string[];
} {
  // Input validation
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return {
      score: 0,
      suggestions: [],
      violations: ['Invalid input: nodes and edges must be arrays'],
    };
  }

  // Filter out invalid nodes and edges
  const validNodes = nodes.filter(isValidLayoutNode);
  const validEdges = edges.filter(isValidLayoutEdge);

  if (validNodes.length !== nodes.length) {
    console.warn(`Filtered out ${nodes.length - validNodes.length} invalid nodes`);
  }

  if (validEdges.length !== edges.length) {
    console.warn(`Filtered out ${edges.length - validEdges.length} invalid edges`);
  }

  const suggestions: string[] = [];
  const violations: string[] = [];
  let score = 100;

  // Check for prohibited adjacencies using validated data
  validEdges.forEach((edge) => {
    const sourceNode = validNodes.find((n) => n.id === edge.source);
    const targetNode = validNodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode && edge.type === 'ADJACENT_TO') {
      const validation = isConnectionAllowed(
        sourceNode.category,
        targetNode.category,
        'ADJACENT_TO'
      );
      if (!validation.allowed) {
        violations.push(validation.reason || 'Invalid connection');
        score -= 10;
      }
    }
  });

  // Check for missing mandatory connections using validated data
  validNodes.forEach((node) => {
    const nodeConnections = validEdges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => {
        const connectedNodeId = e.source === node.id ? e.target : e.source;
        const connectedNode = validNodes.find((n) => n.id === connectedNodeId);
        return connectedNode
          ? { category: connectedNode.category, relationshipType: e.type }
          : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const mandatoryMissing = getMandatoryAdjacencies(node.category, nodeConnections);
    mandatoryMissing.forEach((missing) => {
      suggestions.push(
        `${node.category} area should have ${missing.relationshipType} connection to ${missing.category}: ${missing.reason}`
      );
      score -= 5;
    });
  });

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return { score, suggestions, violations };
}