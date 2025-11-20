// Import shared types
import type { KnowledgeGraphNode, KnowledgeGraphRelationship } from '../../../shared/types';

// Door connection types (defined locally for frontend build compatibility)
export type DoorFlowType = 'material' | 'personnel' | 'waste';
export type DoorFlowDirection = 'unidirectional' | 'bidirectional';
export type UnidirectionalFlowDirection = 'fromFirstToSecond' | 'fromSecondToFirst';

export interface DoorConnectionPoint {
  shapeId: string;
  x: number;
  y: number;
  edgeIndex: number;
  normalizedPosition: number;
}

export interface DoorConnection {
  id: string;
  fromShape: DoorConnectionPoint;
  toShape: DoorConnectionPoint;
  flowType: DoorFlowType;
  flowDirection: DoorFlowDirection;
  unidirectionalDirection?: UnidirectionalFlowDirection; // Only used when flowDirection is 'unidirectional'
  edgeStartPoint?: { x: number; y: number }; // Start of shared edge
  edgeEndPoint?: { x: number; y: number }; // End of shared edge
  createdAt?: Date;
  updatedAt?: Date;
}

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
  type: 'ADJACENT_TO' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR' | 'SHARES_UTILITY' | 'MATERIAL_FLOW' | 'PERSONNEL_FLOW' | 'WORKFLOW_SUGGESTION';
  fromId: string;
  toId: string;
  priority: number;
  reason: string;
  doorType?: string;
  minDistance?: number;
  maxDistance?: number;
  flowDirection?: 'bidirectional' | 'unidirectional';
  flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';

  // Enhanced properties for mode-aware rendering
  mode?: 'creation' | 'guided';
  visualization?: {
    preferIcon: boolean;
    iconType: 'personnel' | 'material' | 'utility' | 'adjacency' | 'access' | 'warning';
    iconSize: 'small' | 'medium' | 'large';
    iconColor: string;
    renderingPriority: number;
  };
  guidedModeProperties?: {
    showInLegend: boolean;
    interactionEnabled: boolean;
    tooltip: string;
  };
}

export interface Diagram {
  id: string;
  name: string;
  nodes: FunctionalArea[];
  relationships: SpatialRelationship[];
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  nodeCount?: number;  // Optional: count of nodes (for list view)
  relationshipCount?: number;  // Optional: count of relationships (for list view)
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

// Custom shape types for guided mode
export interface ShapePoint {
  x: number;
  y: number;
}

export type ShapeType =
  | 'rectangle'
  | 'polygon'
  | 'custom'
  | 'L-shape'
  | 'U-shape'
  | 'T-shape'
  | 'C-shape'
  | 'circle'
  | 'ellipse'
  | 'hexagon'
  | 'octagon'
  | 'triangle'
  | 'pentagon'
  | 'cross'
  | 'star'
  | 'diamond'
  | 'trapezoid'
  | 'parallelogram'
  | 'rounded-rectangle'
  | 'freeform';

// Resize handle types
export type ResizeHandleType = 'corner' | 'edge';
export type ResizeHandlePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | 'edge-midpoint';

export interface ResizeHandle {
  id: string;
  type: ResizeHandleType;
  position: ResizeHandlePosition;
  x: number;
  y: number;
  cursor: string;
}

export interface CustomShapeData extends NodeData {
  id: string; // Shape ID
  shapeType: ShapeType;
  shapePoints: ShapePoint[];
  isEditing?: boolean;
  isResizing?: boolean; // Whether shape is in resize mode
  rotation?: number; // Rotation angle in degrees
  highlighted?: boolean; // Whether shape is highlighted
  assignedNodeId?: string; // Neo4j node ID
  assignedNodeName?: string; // Neo4j node name
  assignedNodeCategory?: string; // Neo4j node category
  hasInheritedProperties?: boolean; // Whether shape inherited from Neo4j node
  inheritedRelationships?: KnowledgeGraphRelationship[]; // Relationships from Neo4j
  showAssignmentDialog?: boolean; // For triggering assignment dialog
  neo4jProperties?: { [key: string]: any }; // Additional Neo4j properties
  lastAssignmentUpdate?: Date; // Track when assignment was last updated
  constraintsActivated?: boolean; // Whether Neo4j constraints are active
  constraintsCount?: number; // Number of active constraints
}

// Re-export the imported types
export type { KnowledgeGraphNode, KnowledgeGraphRelationship };

// Shape templates for quick creation
export interface ShapeTemplate {
  id: string;
  name: string;
  shapeType: ShapeType;
  defaultPoints: ShapePoint[];
  defaultWidth: number;
  defaultHeight: number;
  description: string;
  preview?: string; // SVG path for preview
  pharmaceuticalContext?: string; // Context for pharmaceutical applications
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
export type AppMode = 'creation' | 'exploration' | 'layoutDesigner';

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
  canAddEdges: boolean;
  canDeleteNodes: boolean;
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

// Utility functions for node ID management
export const NodeIdUtils = {
  /**
   * Generates a unique node ID with proper prefix handling
   * @param baseId - Base ID (can already contain 'node-' prefix)
   * @returns Clean node ID with single 'node-' prefix
   */
  generateNodeId(baseId: string): string {
    // Remove any existing 'node-' prefix to avoid double prefixing
    const cleanBaseId = baseId.startsWith('node-') ? baseId.substring(5) : baseId;
    return `node-${cleanBaseId}-${Date.now()}`;
  },

  /**
   * Extracts the base name from a node ID, handling various formats
   * @param nodeId - Full node ID (e.g., "node-coating-123" or "node-node-coating-123-456")
   * @returns Base name (e.g., "coating")
   */
  extractBaseName(nodeId: string): string {
    const patterns = [
      /^node-node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,  // node-node-coating-123-456 (double prefix)
      /^node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,       // node-coating-123 (single prefix)  
      /^([a-zA-Z]+(?:-[a-zA-Z]+)*)(?:-\d+)*$/,             // coating or coating-123 (no prefix)
    ];

    for (const pattern of patterns) {
      const match = nodeId.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: return original ID if no pattern matches
    return nodeId;
  },

  /**
   * Checks if a node ID has the correct format
   * @param nodeId - Node ID to validate
   * @returns true if ID is properly formatted
   */
  isValidNodeId(nodeId: string): boolean {
    const validPatterns = [
      /^node-[a-zA-Z]+(?:-[a-zA-Z]+)*-\d+$/,  // node-coating-123
      /^[a-zA-Z]+(?:-[a-zA-Z]+)*$/,           // coating (template ID)
    ];

    return validPatterns.some(pattern => pattern.test(nodeId));
  },

  /**
   * Normalizes a node ID by removing double prefixes
   * @param nodeId - Raw node ID that might have issues
   * @returns Normalized node ID
   */
  normalizeNodeId(nodeId: string): string {
    // Handle double-prefixed IDs by extracting base name and regenerating
    if (nodeId.startsWith('node-node-')) {
      const baseName = this.extractBaseName(nodeId);
      return this.generateNodeId(baseName);
    }
    return nodeId;
  }
};

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

// AI Assistant Chat Types (duplicated from shared for frontend build compatibility)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  type: 'add_node' | 'highlight_node' | 'add_relationship' | 'suggest_layout' | 'generate_layout' | 'instantiate_template' | 'optimize_layout';
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
    // Generative AI action data
    description?: string; // For generate_layout
    constraints?: any; // For generate_layout
    templateId?: string; // For instantiate_template
    parameters?: Record<string, any>; // For instantiate_template
    generatedLayout?: any; // NEW: Layout data from text-to-layout generation
  };
}

export interface ChatContext {
  diagramId?: string;
  currentNodes: Array<{
    id: string;
    name: string;
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