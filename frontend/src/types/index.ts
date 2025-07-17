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

export interface SpatialRelationship {
  id: string;
  type: 'ADJACENT_TO' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR' | 'SHARES_UTILITY' | 'MATERIAL_FLOW' | 'PERSONNEL_FLOW';
  fromId: string;
  toId: string;
  priority: number;
  reason: string;
  doorType?: string;
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

export interface NodeData {
  label: string;
  category: NodeCategory;
  cleanroomClass?: string;
  color: string;
  name: string;
  width?: number;
  height?: number;
  icon?: string;
  groupId?: string;
  isSelected?: boolean;
  equipment?: Equipment[];
}

export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  relationship?: SpatialRelationship;
  relationshipType?: string;
  priority?: number;
  reason?: string;
  doorType?: string;
  minDistance?: number;
  maxDistance?: number;
  flowDirection?: string;
  flowType?: string;
  relationshipIndex?: number;
  creationDirection?: 'source-to-target' | 'target-to-source';
  animated?: boolean;
  data?: any;
}

// New types for enhanced modes
export type AppMode = 'creation' | 'guided';

export interface KnowledgeGraphData {
  nodes: FunctionalArea[];
  relationships: SpatialRelationship[];
  patterns: AdjacencyPattern[];
  metadata: {
    totalNodes: number;
    totalRelationships: number;
    categories: string[];
    timestamp: string;
  };
}

export interface AdjacencyPattern {
  category1: string;
  category2: string;
  frequency: number;
  avgPriority: number;
}

export interface GuidedSuggestion {
  category: string;
  name: string;
  reason: string;
  priority: number;
  frequency: number;
  confidence: number;
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'checking';
  timestamp: string;
  database: string;
}

export interface ModeConfig {
  mode: AppMode;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  dataSource: 'templates' | 'knowledge_graph';
  allowPersistence: boolean;
  showSuggestions: boolean;
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