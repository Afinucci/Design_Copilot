import { NodeTemplate, NodeCategory, SpatialRelationship, getCleanroomColor } from '../types/index';

/**
 * Static configuration for pharmaceutical facility node templates
 * This replaces the NodeTemplate nodes previously stored in Neo4j
 */

import { CLEANROOM_COST_FACTORS, ROOM_TYPE_COST_ADJUSTMENTS, getEquipmentForRoomType } from './costConfiguration';

// Helper function to get cost factors for a room
function getCostFactors(cleanroomClass: string, roomId: string) {
  const baseCostFactors = CLEANROOM_COST_FACTORS[cleanroomClass] || CLEANROOM_COST_FACTORS['CNC'];
  const roomAdjustment = ROOM_TYPE_COST_ADJUSTMENTS[roomId] || 1.0;
  
  return {
    baseConstructionCostPerSqm: baseCostFactors.baseConstructionCostPerSqm * roomAdjustment,
    cleanroomMultiplier: baseCostFactors.cleanroomMultiplier,
    hvacCostPerSqm: baseCostFactors.hvacCostPerSqm * roomAdjustment,
    validationCostPerSqm: baseCostFactors.validationCostPerSqm
  };
}

// Helper function to get typical equipment IDs for a room
function getTypicalEquipmentIds(roomId: string): string[] {
  return getEquipmentForRoomType(roomId).map(e => e.id);
}
export const NODE_TEMPLATES: NodeTemplate[] = [
  // Production Areas
  {
    id: 'weighing-area',
    name: 'Weighing Area',
    category: 'Production' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 120, height: 80 },
    costFactors: getCostFactors('D', 'weighing-area'),
    typicalEquipment: getTypicalEquipmentIds('weighing-area')
  },
  {
    id: 'granulation',
    name: 'Granulation',
    category: 'Production' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 150, height: 100 },
    costFactors: getCostFactors('D', 'granulation'),
    typicalEquipment: getTypicalEquipmentIds('granulation')
  },
  {
    id: 'compression',
    name: 'Compression',
    category: 'Production' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 140, height: 90 },
    costFactors: getCostFactors('D', 'compression'),
    typicalEquipment: getTypicalEquipmentIds('compression')
  },
  {
    id: 'coating',
    name: 'Coating',
    category: 'Production' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 130, height: 85 },
    costFactors: getCostFactors('D', 'coating'),
    typicalEquipment: getTypicalEquipmentIds('coating')
  },
  {
    id: 'packaging',
    name: 'Packaging',
    category: 'Production' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 160, height: 100 },
    costFactors: getCostFactors('D', 'packaging'),
    typicalEquipment: getTypicalEquipmentIds('packaging')
  },

  // Quality Control
  {
    id: 'analytical-lab',
    name: 'Analytical Lab',
    category: 'Quality Control' as NodeCategory,
    cleanroomClass: 'C',
    color: getCleanroomColor('C'),
    defaultSize: { width: 150, height: 120 }
  },
  {
    id: 'microbiology',
    name: 'Microbiology Lab',
    category: 'Quality Control' as NodeCategory,
    cleanroomClass: 'B',
    color: getCleanroomColor('B'),
    defaultSize: { width: 140, height: 110 }
  },
  {
    id: 'stability-chamber',
    name: 'Stability Chamber',
    category: 'Quality Control' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 100, height: 80 }
  },
  {
    id: 'release-testing',
    name: 'Release Testing',
    category: 'Quality Control' as NodeCategory,
    cleanroomClass: 'C',
    color: getCleanroomColor('C'),
    defaultSize: { width: 130, height: 90 }
  },

  // Warehouse
  {
    id: 'raw-materials',
    name: 'Raw Materials Storage',
    category: 'Warehouse' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 180, height: 120 }
  },
  {
    id: 'finished-goods',
    name: 'Finished Goods Storage',
    category: 'Warehouse' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 180, height: 120 }
  },
  {
    id: 'quarantine',
    name: 'Quarantine Storage',
    category: 'Warehouse' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 120, height: 80 }
  },
  {
    id: 'cold-storage',
    name: 'Cold Storage',
    category: 'Warehouse' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 100, height: 90 }
  },

  // Utilities
  {
    id: 'hvac',
    name: 'HVAC Room',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 120, height: 100 }
  },
  {
    id: 'purified-water',
    name: 'Purified Water System',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 110, height: 90 }
  },
  {
    id: 'compressed-air',
    name: 'Compressed Air System',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 100, height: 80 }
  },
  {
    id: 'electrical',
    name: 'Electrical Room',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 100, height: 80 }
  },

  // Personnel
  {
    id: 'gowning-area',
    name: 'Gowning Area',
    category: 'Personnel' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 120, height: 90 }
  },
  {
    id: 'break-room',
    name: 'Break Room',
    category: 'Personnel' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 150, height: 100 }
  },
  {
    id: 'offices',
    name: 'Offices',
    category: 'Personnel' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 200, height: 120 }
  },
  {
    id: 'training-room',
    name: 'Training Room',
    category: 'Personnel' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 180, height: 120 }
  },

  // Support
  {
    id: 'waste-disposal',
    name: 'Waste Disposal',
    category: 'Support' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 100, height: 80 }
  },
  {
    id: 'maintenance',
    name: 'Maintenance Workshop',
    category: 'Support' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 140, height: 100 }
  },
  {
    id: 'receiving',
    name: 'Receiving Area',
    category: 'Support' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 150, height: 100 }
  },
  {
    id: 'shipping',
    name: 'Shipping Area',
    category: 'Support' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 150, height: 100 }
  },

  // Missing utility and personnel templates
  {
    id: 'hvac-room',
    name: 'HVAC Room',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 120, height: 90 }
  },
  {
    id: 'electrical-room',
    name: 'Electrical Room',
    category: 'Utilities' as NodeCategory,
    cleanroomClass: 'CNC',
    color: getCleanroomColor('CNC'),
    defaultSize: { width: 110, height: 80 }
  },
  {
    id: 'change-room',
    name: 'Change Room',
    category: 'Personnel' as NodeCategory,
    cleanroomClass: 'D',
    color: getCleanroomColor('D'),
    defaultSize: { width: 130, height: 90 }
  }
];

/**
 * Static relationship rules for pharmaceutical facility templates
 * Defines adjacency, prohibition, and flow requirements between node types
 */
export const TEMPLATE_RELATIONSHIPS: {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] = [
  // Production flow adjacencies
  {
    fromTemplateId: 'weighing-area',
    toTemplateId: 'granulation',
    relationship: {
      type: 'ADJACENT_TO',
      priority: 8,
      reason: 'Raw material flow from weighing to granulation',
      flowDirection: 'unidirectional',
      flowType: 'raw_material'
    }
  },
  {
    fromTemplateId: 'granulation',
    toTemplateId: 'compression',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 9,
      reason: 'Granulated material must flow to compression',
      flowDirection: 'unidirectional',
      flowType: 'raw_material'
    }
  },
  {
    fromTemplateId: 'compression',
    toTemplateId: 'coating',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 7,
      reason: 'Compressed tablets to coating (optional)',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },
  {
    fromTemplateId: 'coating',
    toTemplateId: 'packaging',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Coated tablets to packaging',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },
  {
    fromTemplateId: 'compression',
    toTemplateId: 'packaging',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Uncoated tablets to packaging',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },

  // Quality control requirements
  {
    fromTemplateId: 'analytical-lab',
    toTemplateId: 'microbiology',
    relationship: {
      type: 'PROHIBITED_NEAR',
      priority: 9,
      reason: 'Risk of cross-contamination between analytical and microbiological testing',
      minDistance: 20
    }
  },
  {
    fromTemplateId: 'weighing-area',
    toTemplateId: 'analytical-lab',
    relationship: {
      type: 'ADJACENT_TO',
      priority: 7,
      reason: 'Sample collection and testing coordination',
      flowType: 'raw_material'
    }
  },
  {
    fromTemplateId: 'packaging',
    toTemplateId: 'release-testing',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Finished product samples for release testing',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },

  // Warehouse and storage flow
  {
    fromTemplateId: 'raw-materials',
    toTemplateId: 'weighing-area',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 9,
      reason: 'Raw materials must flow to weighing area',
      flowDirection: 'unidirectional',
      flowType: 'raw_material'
    }
  },
  {
    fromTemplateId: 'packaging',
    toTemplateId: 'finished-goods',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 9,
      reason: 'Packaged products to finished goods storage',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },
  {
    fromTemplateId: 'quarantine',
    toTemplateId: 'analytical-lab',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Quarantined materials need testing before release',
      flowDirection: 'bidirectional',
      flowType: 'raw_material'
    }
  },

  // Utility requirements
  {
    fromTemplateId: 'granulation',
    toTemplateId: 'hvac-room',
    relationship: {
      type: 'SHARES_UTILITY',
      priority: 8,
      reason: 'Granulation requires controlled HVAC for dust containment'
    }
  },
  {
    fromTemplateId: 'compression',
    toTemplateId: 'hvac-room',
    relationship: {
      type: 'SHARES_UTILITY',
      priority: 8,
      reason: 'Compression requires controlled environment'
    }
  },
  {
    fromTemplateId: 'microbiology',
    toTemplateId: 'hvac-room',
    relationship: {
      type: 'SHARES_UTILITY',
      priority: 9,
      reason: 'Microbiology lab requires strict environmental controls'
    }
  },
  {
    fromTemplateId: 'weighing-area',
    toTemplateId: 'electrical-room',
    relationship: {
      type: 'SHARES_UTILITY',
      priority: 7,
      reason: 'Weighing equipment requires stable electrical supply'
    }
  },

  // Personnel flow and access
  {
    fromTemplateId: 'change-room',
    toTemplateId: 'weighing-area',
    relationship: {
      type: 'PERSONNEL_FLOW',
      priority: 9,
      reason: 'Personnel must change before entering production areas',
      flowDirection: 'unidirectional',
      flowType: 'personnel'
    }
  },
  {
    fromTemplateId: 'change-room',
    toTemplateId: 'granulation',
    relationship: {
      type: 'PERSONNEL_FLOW',
      priority: 9,
      reason: 'Personnel must change before entering production areas',
      flowDirection: 'unidirectional',
      flowType: 'personnel'
    }
  },
  {
    fromTemplateId: 'change-room',
    toTemplateId: 'compression',
    relationship: {
      type: 'PERSONNEL_FLOW',
      priority: 9,
      reason: 'Personnel must change before entering production areas',
      flowDirection: 'unidirectional',
      flowType: 'personnel'
    }
  },

  // Waste and support
  {
    fromTemplateId: 'waste-disposal',
    toTemplateId: 'weighing-area',
    relationship: {
      type: 'PROHIBITED_NEAR',
      priority: 10,
      reason: 'Waste disposal must be separated from raw material handling',
      minDistance: 30
    }
  },
  {
    fromTemplateId: 'waste-disposal',
    toTemplateId: 'granulation',
    relationship: {
      type: 'PROHIBITED_NEAR',
      priority: 10,
      reason: 'Waste disposal must be separated from production areas',
      minDistance: 25
    }
  },
  {
    fromTemplateId: 'waste-disposal',
    toTemplateId: 'analytical-lab',
    relationship: {
      type: 'PROHIBITED_NEAR',
      priority: 10,
      reason: 'Waste disposal must be separated from testing areas',
      minDistance: 25
    }
  },

  // Shipping and receiving
  {
    fromTemplateId: 'receiving',
    toTemplateId: 'raw-materials',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Received materials flow to raw materials storage',
      flowDirection: 'unidirectional',
      flowType: 'raw_material'
    }
  },
  {
    fromTemplateId: 'finished-goods',
    toTemplateId: 'shipping',
    relationship: {
      type: 'MATERIAL_FLOW',
      priority: 8,
      reason: 'Finished goods flow to shipping area',
      flowDirection: 'unidirectional',
      flowType: 'finished_product'
    }
  },
  {
    fromTemplateId: 'receiving',
    toTemplateId: 'shipping',
    relationship: {
      type: 'PROHIBITED_NEAR',
      priority: 7,
      reason: 'Separate receiving and shipping to avoid cross-contamination',
      minDistance: 15
    }
  }
];

/**
 * Get all node templates
 */
export function getAllNodeTemplates(): NodeTemplate[] {
  return [...NODE_TEMPLATES];
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: NodeCategory): NodeTemplate[] {
  return NODE_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): NodeTemplate | undefined {
  return NODE_TEMPLATES.find(template => template.id === id);
}

/**
 * Get all categories
 */
export function getAllCategories(): NodeCategory[] {
  const categories = new Set(NODE_TEMPLATES.map(t => t.category));
  return Array.from(categories);
}

/**
 * Get relationships for a specific template ID
 */
export function getRelationshipsForTemplate(templateId: string): {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] {
  return TEMPLATE_RELATIONSHIPS.filter(rel => 
    rel.fromTemplateId === templateId || rel.toTemplateId === templateId
  );
}

/**
 * Get relationships of a specific type for a template
 */
export function getRelationshipsByType(
  templateId: string, 
  relationshipType: SpatialRelationship['type']
): {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] {
  return TEMPLATE_RELATIONSHIPS.filter(rel => 
    (rel.fromTemplateId === templateId || rel.toTemplateId === templateId) &&
    rel.relationship.type === relationshipType
  );
}

/**
 * Get outgoing relationships (where templateId is the source)
 */
export function getOutgoingRelationships(templateId: string): {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] {
  return TEMPLATE_RELATIONSHIPS.filter(rel => rel.fromTemplateId === templateId);
}

/**
 * Get incoming relationships (where templateId is the target)
 */
export function getIncomingRelationships(templateId: string): {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] {
  return TEMPLATE_RELATIONSHIPS.filter(rel => rel.toTemplateId === templateId);
}

/**
 * Check if two templates have a specific relationship
 */
export function hasRelationship(
  fromTemplateId: string,
  toTemplateId: string,
  relationshipType?: SpatialRelationship['type']
): boolean {
  return TEMPLATE_RELATIONSHIPS.some(rel => {
    const matches = (
      (rel.fromTemplateId === fromTemplateId && rel.toTemplateId === toTemplateId) ||
      (rel.fromTemplateId === toTemplateId && rel.toTemplateId === fromTemplateId)
    );
    
    if (relationshipType) {
      return matches && rel.relationship.type === relationshipType;
    }
    
    return matches;
  });
}

/**
 * Get all template relationships
 */
export function getAllTemplateRelationships(): {
  fromTemplateId: string;
  toTemplateId: string;
  relationship: Omit<SpatialRelationship, 'id' | 'fromId' | 'toId'>;
}[] {
  return [...TEMPLATE_RELATIONSHIPS];
}

/**
 * Validate template configuration at startup
 */
export function validateTemplates(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>();
  
  for (const template of NODE_TEMPLATES) {
    // Check for duplicate IDs
    if (ids.has(template.id)) {
      errors.push(`Duplicate template ID: ${template.id}`);
    }
    ids.add(template.id);
    
    // Check required fields
    if (!template.id || !template.name || !template.category) {
      errors.push(`Template missing required fields: ${JSON.stringify(template)}`);
    }
    
    // Check default size
    if (!template.defaultSize || template.defaultSize.width <= 0 || template.defaultSize.height <= 0) {
      errors.push(`Invalid default size for template: ${template.id}`);
    }
  }
  
  // Validate relationships reference existing templates
  const templateIds = new Set(NODE_TEMPLATES.map(t => t.id));
  for (const rel of TEMPLATE_RELATIONSHIPS) {
    if (!templateIds.has(rel.fromTemplateId)) {
      errors.push(`Relationship references non-existent template: ${rel.fromTemplateId}`);
    }
    if (!templateIds.has(rel.toTemplateId)) {
      errors.push(`Relationship references non-existent template: ${rel.toTemplateId}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}