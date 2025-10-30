export interface Equipment {
  id: string;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  description?: string;
  specifications?: { [key: string]: string };
  maintenanceSchedule?: string;
  status?: 'operational' | 'maintenance' | 'offline';
}

export interface FunctionalArea {
  id: string;
  name: string;
  category: string;
  cleanroomClass?: string;
  minSizeSqm?: number;
  maxSizeSqm?: number;
  requiredUtilities?: string[];
  description?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  equipment?: Equipment[];
}

/**
 * Door types for pharmaceutical facilities with GMP compliance considerations
 */
export type DoorType =
  | 'standard'           // Regular hinged door
  | 'double'             // Double door for material transfer
  | 'sliding'            // Sliding door for personnel
  | 'airlock'            // Airlock/interlocked doors (GMP critical)
  | 'pass-through'       // Pass-through window/hatch
  | 'emergency'          // Emergency exit
  | 'roll-up'            // Roll-up door for large equipment
  | 'automatic'          // Automatic sliding door
  | 'cleanroom-rated';   // Specialized cleanroom door

/**
 * Flow type for door connections between shapes
 */
export type DoorFlowType = 'material' | 'personnel' | 'waste';

/**
 * Flow direction for door connections
 */
export type DoorFlowDirection = 'unidirectional' | 'bidirectional';

/**
 * Point on a shape edge where door connection is placed
 */
export interface DoorConnectionPoint {
  shapeId: string;
  x: number; // Absolute canvas coordinates
  y: number; // Absolute canvas coordinates
  edgeIndex: number; // Which edge of the polygon (0-based)
  normalizedPosition: number; // Position along edge (0.0 to 1.0)
}

/**
 * Door connection between two shapes
 */
export interface DoorConnection {
  id: string;
  fromShape: DoorConnectionPoint;
  toShape: DoorConnectionPoint;
  flowType: DoorFlowType;
  flowDirection: DoorFlowDirection;
  doorType?: DoorType; // Optional door type for GMP compliance
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SpatialRelationship {
  id: string;
  type: 'ADJACENT_TO' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR' | 'SHARES_UTILITY' | 'MATERIAL_FLOW' | 'PERSONNEL_FLOW' | 'WORKFLOW_SUGGESTION';
  fromId: string;
  toId: string;
  priority: number;
  reason: string;
  doorType?: DoorType;
  minDistance?: number;
  maxDistance?: number;
  flowDirection?: 'bidirectional' | 'unidirectional';
  flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';
}

export interface Diagram {
  id: string;
  name: string;
  nodes: FunctionalArea[];
  relationships: SpatialRelationship[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
}

export interface ValidationViolation {
  id: string;
  type: 'ERROR' | 'WARNING';
  message: string;
  nodeIds: string[];
  suggestion?: string;
}

export interface Suggestion {
  id: string;
  nodeId: string;
  suggestedPosition: { x: number; y: number };
  priority: number;
  reason: string;
  confidence: number;
}

export type NodeCategory = 
  | 'Production'
  | 'Quality Control'
  | 'Warehouse'
  | 'Utilities'
  | 'Personnel'
  | 'Support'
  | 'None'
  | string; // Allow custom categories

export interface NodeTemplate {
  id: string;
  name: string;
  category: NodeCategory;
  cleanroomClass?: string;
  color: string;
  icon?: string;
  defaultSize: { width: number; height: number };
}

export interface NodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupingState {
  isGroupMode: boolean;
  selectedNodeIds: string[];
  groups: NodeGroup[];
}

// Knowledge Graph Node from Neo4j
export interface KnowledgeGraphNode {
  id: string;
  name: string;
  category: NodeCategory;
  cleanroomClass?: string;
  properties?: { [key: string]: any };
  relationships?: KnowledgeGraphRelationship[];
}

export interface KnowledgeGraphRelationship {
  id: string;
  type: 'ADJACENT_TO' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR' | 'SHARES_UTILITY' | 'MATERIAL_FLOW' | 'PERSONNEL_FLOW' | 'WORKFLOW_SUGGESTION' | 'CANNOT_CONNECT_TO';
  targetNodeId: string;
  targetNodeName: string;
  targetCategory: string;
  priority: number;
  reason?: string;
  confidence: number;
  flowDirection?: 'bidirectional' | 'unidirectional';
  flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';
}

// Ghost suggestion types for Guided Mode
export interface GhostSuggestion {
  id: string;
  nodeId: string;
  name: string;
  category: NodeCategory;
  cleanroomClass?: string;
  suggestedPosition: { x: number; y: number };
  confidence: number; // 0-1 scale
  reason: string;
  sourceNodeId: string; // The node that triggered this suggestion
  relationships: GhostRelationship[];
}

export interface GhostRelationship {
  id: string;
  type: 'ADJACENT_TO' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR' | 'SHARES_UTILITY' | 'MATERIAL_FLOW' | 'PERSONNEL_FLOW' | 'WORKFLOW_SUGGESTION';
  toNodeId: string;
  fromNodeId: string;
  priority: number;
  reason: string;
  confidence: number;
  flowDirection?: 'bidirectional' | 'unidirectional';
  flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';
}

export interface GhostState {
  suggestions: GhostSuggestion[];
  isLoading: boolean;
  showGhosts: boolean;
  triggerNode: any | null;
  debugMode: boolean;
  isVisible?: boolean;
  confidenceThreshold?: number; // Minimum confidence to show suggestions
  lastUpdated?: Date | null;
  triggerNodeId?: string | null; // The node that triggered current suggestions
}

/**
 * Get color for cleanroom classification
 * Based on pharmaceutical industry standards for GMP facility design
 *
 * Color scheme:
 * - Grade A (ISO 5): Crimson Red - Highest sterility, critical operations
 * - Grade B (ISO 5/7): Orange - Aseptic preparation, supports Grade A
 * - Grade C (ISO 7/8): Sky Blue - Less critical manufacturing
 * - Grade D (ISO 8): Light Green - General manufacturing, lowest GMP grade
 * - CNC: Light Gray - Controlled Not Classified, support areas
 *
 * @param cleanroomClass - Cleanroom classification (A, B, C, D, CNC)
 * @returns Hex color code
 */
export function getCleanroomColor(cleanroomClass?: string): string {
  if (!cleanroomClass) {
    return '#D3D3D3'; // Default light gray for unclassified
  }

  const normalizedClass = cleanroomClass.toUpperCase().trim();

  switch (normalizedClass) {
    case 'A':
    case 'GRADE A':
    case 'CLASS A':
      return '#DC143C'; // Crimson Red - Most critical

    case 'B':
    case 'GRADE B':
    case 'CLASS B':
      return '#FFA500'; // Orange - Aseptic preparation

    case 'C':
    case 'GRADE C':
    case 'CLASS C':
      return '#4A90E2'; // Sky Blue - Less critical

    case 'D':
    case 'GRADE D':
    case 'CLASS D':
      return '#90EE90'; // Light Green - General manufacturing

    case 'CNC':
    case 'CONTROLLED NOT CLASSIFIED':
    case 'N/A':
      return '#D3D3D3'; // Light Gray - Non-classified

    default:
      return '#D3D3D3'; // Default light gray for unknown
  }
}