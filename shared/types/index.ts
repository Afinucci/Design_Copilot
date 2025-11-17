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
  // Cost properties
  purchaseCost?: number; // Base cost in USD
  installationCost?: number; // Installation cost in USD
  validationCost?: number; // Validation/qualification cost in USD
  annualMaintenanceCost?: number; // Annual maintenance cost in USD
  lifespan?: number; // Expected lifespan in years
  linkedRoomTypes?: string[]; // Room types this equipment is typically used in
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
  // Cost properties
  area?: number; // Calculated area in square meters
  costBreakdown?: CostBreakdown; // Detailed cost breakdown
  customCostFactors?: RoomCostFactors; // Override default cost factors
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
  createdAt: Date | string;
  updatedAt: Date | string;
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

// Cost estimation interfaces
export interface CostBreakdown {
  constructionCost: number; // Civil work and basic construction
  hvacCost: number; // HVAC and utilities installation
  equipmentPurchaseCost: number; // Equipment purchase
  equipmentInstallationCost: number; // Equipment installation
  validationCost: number; // Validation and qualification
  otherCosts: number; // Other miscellaneous costs
  totalCost: number; // Total cost
}

export interface RoomCostFactors {
  baseConstructionCostPerSqm: number; // Base construction cost per square meter
  cleanroomMultiplier: number; // Multiplier based on cleanroom class
  hvacCostPerSqm: number; // HVAC cost per square meter
  validationCostPerSqm: number; // Validation cost per square meter
}

export interface CostEstimationSettings {
  currency: string; // Default: USD
  regionalFactor: number; // Regional cost variation multiplier (default: 1.0)
  escalationFactor: number; // Cost escalation factor (default: 1.0)
  contingencyPercentage: number; // Contingency percentage (default: 10)
}

export interface ProjectCostEstimate {
  rooms: {
    roomId: string;
    roomName: string;
    area: number; // in square meters
    costBreakdown: CostBreakdown;
  }[];
  equipment: {
    equipmentId: string;
    equipmentName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  settings: CostEstimationSettings;
  subtotal: number;
  contingency: number;
  grandTotal: number;
  currency: string;
  estimatedDate: Date;
}

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  type: string;
  purchaseCost: number;
  installationCost: number;
  validationCost: number;
  annualMaintenanceCost: number;
  lifespan: number;
  linkedRoomTypes: string[];
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
  // Cost factors
  costFactors?: RoomCostFactors;
  typicalEquipment?: string[]; // IDs of typical equipment for this room type
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
  suggestedNodes?: GhostSuggestion[];
}

export interface ChatHistory {
  diagramId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

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

// ============================================
// GENERATIVE AI LAYOUT TYPES
// ============================================

/**
 * Layout generation request from natural language
 */
export interface LayoutGenerationRequest {
  description: string; // Natural language description (e.g., "Design a sterile vial filling facility")
  constraints: LayoutConstraints;
  preferences?: LayoutPreferences;
  mode?: 'quick' | 'detailed' | 'comprehensive'; // Generation thoroughness
}

/**
 * Constraints for layout generation
 */
export interface LayoutConstraints {
  totalArea?: number; // Total area in square meters
  batchSize?: number; // Batch size in liters
  productType?: 'sterile' | 'non-sterile' | 'oral-solid' | 'biologics' | 'vaccines' | 'api';
  throughput?: number; // Units per day
  regulatoryZone?: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S';
  requiredRooms?: string[]; // Specific rooms that must be included
  excludedRooms?: string[]; // Rooms to avoid
  maxCleanroomClass?: 'A' | 'B' | 'C' | 'D'; // Highest cleanroom class needed
}

/**
 * User preferences for layout optimization
 */
export interface LayoutPreferences {
  minimizeDistance?: boolean; // Optimize for shortest paths
  maximizeSeparation?: boolean; // Maximize contamination barriers
  prioritizeFlow?: 'material' | 'personnel' | 'balanced';
  layoutStyle?: 'linear' | 'clustered' | 'modular' | 'centralized';
  compactness?: 'tight' | 'moderate' | 'spacious';
}

/**
 * Generated layout response
 */
export interface GeneratedLayout {
  nodes: FunctionalArea[];
  relationships: SpatialRelationship[];
  zones: ZoneDefinition[];
  rationale: string; // Explanation for design decisions
  complianceScore: number; // 0-100 GMP compliance rating
  optimizationMetrics: OptimizationMetrics;
  warnings: string[]; // Potential issues
  suggestions: string[]; // Improvement recommendations
}

/**
 * Zone/cluster of related functional areas
 */
export interface ZoneDefinition {
  id: string;
  name: string;
  category: 'production' | 'quality-control' | 'warehouse' | 'utilities' | 'support';
  nodeIds: string[];
  cleanroomClass?: string;
  color: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

/**
 * Metrics for layout quality assessment
 */
export interface OptimizationMetrics {
  totalArea: number; // Square meters
  flowEfficiency: number; // 0-1 score (higher = better)
  crossContaminationRisk: number; // 0-1 score (lower = better)
  averageMaterialDistance: number; // Average distance for material flow
  averagePersonnelDistance: number; // Average distance for personnel flow
  cleanroomUtilization: number; // Percentage of high-grade cleanroom area
  estimatedConstructionCost?: number; // Relative cost index
}

/**
 * Spatial reasoning for optimal node placement
 */
export interface SpatialPlacement {
  nodeId: string;
  position: { x: number; y: number };
  score: number; // Quality score for this placement
  reasoning: string; // Why this position was chosen
  constraints: PlacementConstraint[];
}

/**
 * Constraint for node placement
 */
export interface PlacementConstraint {
  type: 'distance' | 'adjacency' | 'separation' | 'flow-path' | 'cleanroom-zone' | 'orientation';
  targetNodeId?: string;
  minValue?: number;
  maxValue?: number;
  priority: 'required' | 'high' | 'medium' | 'low';
  description: string;
}

/**
 * Enhanced ghost suggestion with spatial intelligence
 */
export interface SmartGhostSuggestion extends GhostSuggestion {
  optimalPosition: { x: number; y: number }; // Calculated optimal position
  alternativePositions: Array<{ x: number; y: number; score: number }>; // Other valid positions
  spatialScore: number; // Quality of spatial placement (0-1)
  placementReasoning: string; // Why this position is optimal
  autoConnections: SpatialRelationship[]; // Relationships to create automatically
}

// ============================================
// FACILITY TEMPLATE TYPES
// ============================================

/**
 * Parametric facility template
 */
export interface FacilityTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sterile-injectable' | 'oral-solid-dosage' | 'biologics' | 'api' | 'packaging' | 'warehouse' | 'qc-lab';
  icon?: string;
  parameters: TemplateParameter[];
  baseLayout?: Diagram; // Base layout that gets modified by parameters
  estimatedArea: { min: number; max: number }; // Square meters
  complexity: 'simple' | 'moderate' | 'complex';
  regulatoryCompliance: string[]; // ['FDA 21 CFR 211', 'EMA Annex 1', etc.]
}

/**
 * Template parameter for customization
 */
export interface TemplateParameter {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'select' | 'boolean' | 'range';
  defaultValue: any;
  options?: any[]; // For select type
  min?: number; // For number/range type
  max?: number; // For number/range type
  unit?: string; // e.g., 'L', 'units/day', 'm²'
  required: boolean;
  impact: string; // How this parameter affects the layout
}

/**
 * Template instantiation request
 */
export interface TemplateInstantiationRequest {
  templateId: string;
  parameters: Record<string, any>; // parameter_id → value
  customizations?: {
    addRooms?: string[]; // Additional room IDs to include
    removeRooms?: string[]; // Room IDs to exclude
    modifyRoomSizes?: Record<string, { width: number; height: number }>;
  };
}

// ============================================
// GMP COMPLIANCE & VALIDATION TYPES
// ============================================

/**
 * Regulatory rule from GMP/FDA/EMA guidelines
 */
export interface RegulatoryRule {
  id: string;
  source: 'FDA 21 CFR 211' | 'FDA 21 CFR 210' | 'EMA Annex 1' | 'ICH Q7' | 'PIC/S PE 009' | 'WHO GMP';
  section: string; // e.g., '4.14', '211.42'
  requirement: string; // Text of the requirement
  applicableAreas: string[]; // Which room types/categories this applies to
  severity: 'critical' | 'major' | 'minor';
  checkable: boolean; // Can be automatically validated
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  ruleId: string;
  passed: boolean;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  affectedNodeIds: string[];
  recommendation?: string;
  autoFixAvailable: boolean;
  autoFix?: LayoutModification;
}

/**
 * Comprehensive compliance report
 */
export interface ComplianceReport {
  overallScore: number; // 0-100
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: ComplianceCheckResult[];
  summary: string;
  regulatoryZone: string;
  generatedAt: Date;
}

/**
 * Layout modification for auto-fix or optimization
 */
export interface LayoutModification {
  type: 'add_node' | 'remove_node' | 'move_node' | 'add_relationship' |
        'remove_relationship' | 'modify_room_size' | 'add_zone';
  nodeId?: string;
  node?: FunctionalArea;
  newPosition?: { x: number; y: number };
  relationship?: SpatialRelationship;
  rationale: string;
}

// ============================================
// OPTIMIZATION TYPES
// ============================================

/**
 * Optimization objective for layout refinement
 */
export interface OptimizationObjective {
  type: 'minimize_distance' | 'minimize_area' | 'maximize_throughput' |
        'minimize_contamination_risk' | 'minimize_construction_cost' |
        'maximize_cleanroom_clustering' | 'balance_flow_separation';
  weight: number; // 0-1 (relative importance)
  target?: number; // Optional target value
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  originalLayout: Diagram;
  optimizedLayout: Diagram;
  improvements: {
    metric: string;
    before: number;
    after: number;
    improvement: number; // Percentage improvement
  }[];
  modifications: LayoutModification[];
  convergenceScore: number; // How well objectives were met (0-1)
  iterations: number;
}

// ============================================
// PREDICTIVE VALIDATION TYPES
// ============================================

/**
 * Predictive insight from AI analysis
 */
export interface PredictiveInsight {
  id: string;
  type: 'error' | 'warning' | 'suggestion' | 'optimization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'compliance' | 'flow' | 'contamination' | 'efficiency' | 'cost';
  title: string;
  message: string;
  affectedNodeIds: string[];
  impact: string; // Description of consequences
  autoFixAvailable: boolean;
  autoFix?: LayoutModification;
  learnMoreUrl?: string;
  confidence: number; // 0-1
}

/**
 * Design health assessment
 */
export interface DesignHealthScore {
  overall: number; // 0-100
  compliance: number; // 0-100
  efficiency: number; // 0-100
  safety: number; // 0-100
  cost: number; // 0-100
  insights: PredictiveInsight[];
  trends: {
    improving: string[];
    degrading: string[];
  };
}