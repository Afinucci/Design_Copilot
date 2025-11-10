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

// Import DoorType from shared (type-only to avoid rootDir issues)
import type { DoorType } from '../../../shared/types';

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
  createdAt: string | null;
  updatedAt: string | null;
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
  | 'Support';

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

// AI Assistant Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  type: 'add_node' | 'highlight_node' | 'add_relationship' | 'suggest_layout';
  label: string;
  data: {
    nodeId?: string;
    nodeTemplate?: NodeTemplate;
    position?: { x: number; y: number };
    relationship?: SpatialRelationship;
    highlightNodeIds?: string[];
    layoutSuggestion?: {
      nodes: Array<{ template: NodeTemplate; position: { x: number; y: number } }>;
      relationships: SpatialRelationship[];
    };
  };
}

export interface ChatContext {
  diagramId?: string;
  currentNodes: Array<{
    id: string;
    name: string;
    templateId?: string;  // Neo4j node ID for querying relationships
    category: NodeCategory;
    cleanroomClass?: string;
    position: { x: number; y: number };
  }>;
  currentRelationships: SpatialRelationship[];
}

export interface ChatRequest {
  message: string;
  context: ChatContext;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  message: string;
  actions: ChatAction[];
}

export interface ChatHistory {
  diagramId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
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

// Re-export Door types as well
export type { DoorType, DoorFlowType, DoorFlowDirection, DoorConnection, DoorConnectionPoint };

// Re-export generative AI types from shared (use type-only exports to avoid rootDir issues)
export type {
  LayoutGenerationRequest,
  LayoutConstraints,
  LayoutPreferences,
  GeneratedLayout,
  ZoneDefinition,
  OptimizationMetrics,
  SpatialPlacement,
  PlacementConstraint,
  SmartGhostSuggestion,
  GhostSuggestion,
  FacilityTemplate,
  TemplateParameter,
  TemplateInstantiationRequest,
  RegulatoryRule,
  ComplianceCheckResult,
  ComplianceReport,
  LayoutModification,
  OptimizationObjective,
  OptimizationResult,
  PredictiveInsight,
  DesignHealthScore
};

// Import from shared for type safety
import type {
  LayoutGenerationRequest,
  LayoutConstraints,
  LayoutPreferences,
  GeneratedLayout,
  ZoneDefinition,
  OptimizationMetrics,
  SpatialPlacement,
  PlacementConstraint,
  SmartGhostSuggestion,
  GhostSuggestion,
  FacilityTemplate,
  TemplateParameter,
  TemplateInstantiationRequest,
  RegulatoryRule,
  ComplianceCheckResult,
  ComplianceReport,
  LayoutModification,
  OptimizationObjective,
  OptimizationResult,
  PredictiveInsight,
  DesignHealthScore,
  DoorFlowType,
  DoorFlowDirection,
  DoorConnection,
  DoorConnectionPoint
} from '../../../shared/types';