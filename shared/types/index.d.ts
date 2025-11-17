export interface Equipment {
    id: string;
    name: string;
    type: string;
    model?: string;
    manufacturer?: string;
    description?: string;
    specifications?: {
        [key: string]: string;
    };
    maintenanceSchedule?: string;
    status?: 'operational' | 'maintenance' | 'offline';
    purchaseCost?: number;
    installationCost?: number;
    validationCost?: number;
    annualMaintenanceCost?: number;
    lifespan?: number;
    linkedRoomTypes?: string[];
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
    area?: number;
    costBreakdown?: CostBreakdown;
    customCostFactors?: RoomCostFactors;
}
/**
 * Door types for pharmaceutical facilities with GMP compliance considerations
 */
export type DoorType = 'standard' | 'double' | 'sliding' | 'airlock' | 'pass-through' | 'emergency' | 'roll-up' | 'automatic' | 'cleanroom-rated';
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
    x: number;
    y: number;
    edgeIndex: number;
    normalizedPosition: number;
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
    doorType?: DoorType;
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
    suggestedPosition: {
        x: number;
        y: number;
    };
    priority: number;
    reason: string;
    confidence: number;
}
export interface CostBreakdown {
    constructionCost: number;
    hvacCost: number;
    equipmentPurchaseCost: number;
    equipmentInstallationCost: number;
    validationCost: number;
    otherCosts: number;
    totalCost: number;
}
export interface RoomCostFactors {
    baseConstructionCostPerSqm: number;
    cleanroomMultiplier: number;
    hvacCostPerSqm: number;
    validationCostPerSqm: number;
}
export interface CostEstimationSettings {
    currency: string;
    regionalFactor: number;
    escalationFactor: number;
    contingencyPercentage: number;
}
export interface ProjectCostEstimate {
    rooms: {
        roomId: string;
        roomName: string;
        area: number;
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
export type NodeCategory = 'Production' | 'Quality Control' | 'Warehouse' | 'Utilities' | 'Personnel' | 'Support' | 'None' | string;
export interface NodeTemplate {
    id: string;
    name: string;
    category: NodeCategory;
    cleanroomClass?: string;
    color: string;
    icon?: string;
    defaultSize: {
        width: number;
        height: number;
    };
    costFactors?: RoomCostFactors;
    typicalEquipment?: string[];
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
export interface KnowledgeGraphNode {
    id: string;
    name: string;
    category: NodeCategory;
    cleanroomClass?: string;
    properties?: {
        [key: string]: any;
    };
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
export interface GhostSuggestion {
    id: string;
    nodeId: string;
    name: string;
    category: NodeCategory;
    cleanroomClass?: string;
    suggestedPosition: {
        x: number;
        y: number;
    };
    confidence: number;
    reason: string;
    sourceNodeId: string;
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
    confidenceThreshold?: number;
    lastUpdated?: Date | null;
    triggerNodeId?: string | null;
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
        position?: {
            x: number;
            y: number;
        };
        relationship?: SpatialRelationship;
        highlightNodeIds?: string[];
        layoutSuggestion?: {
            nodes: Array<{
                template: NodeTemplate;
                position: {
                    x: number;
                    y: number;
                };
            }>;
            relationships: SpatialRelationship[];
        };
    };
}
export interface ChatContext {
    diagramId?: string;
    currentNodes: Array<{
        id: string;
        name: string;
        templateId?: string;
        category: NodeCategory;
        cleanroomClass?: string;
        position: {
            x: number;
            y: number;
        };
    }>;
    currentRelationships: SpatialRelationship[];
}
export interface ChatRequest {
    message: string;
    context: ChatContext;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
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
export declare function getCleanroomColor(cleanroomClass?: string): string;
/**
 * Layout generation request from natural language
 */
export interface LayoutGenerationRequest {
    description: string;
    constraints: LayoutConstraints;
    preferences?: LayoutPreferences;
    mode?: 'quick' | 'detailed' | 'comprehensive';
}
/**
 * Constraints for layout generation
 */
export interface LayoutConstraints {
    totalArea?: number;
    batchSize?: number;
    productType?: 'sterile' | 'non-sterile' | 'oral-solid' | 'biologics' | 'vaccines' | 'api';
    throughput?: number;
    regulatoryZone?: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S';
    requiredRooms?: string[];
    excludedRooms?: string[];
    maxCleanroomClass?: 'A' | 'B' | 'C' | 'D';
}
/**
 * User preferences for layout optimization
 */
export interface LayoutPreferences {
    minimizeDistance?: boolean;
    maximizeSeparation?: boolean;
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
    rationale: string;
    complianceScore: number;
    optimizationMetrics: OptimizationMetrics;
    warnings: string[];
    suggestions: string[];
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
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * Metrics for layout quality assessment
 */
export interface OptimizationMetrics {
    totalArea: number;
    flowEfficiency: number;
    crossContaminationRisk: number;
    averageMaterialDistance: number;
    averagePersonnelDistance: number;
    cleanroomUtilization: number;
    estimatedConstructionCost?: number;
}
/**
 * Spatial reasoning for optimal node placement
 */
export interface SpatialPlacement {
    nodeId: string;
    position: {
        x: number;
        y: number;
    };
    score: number;
    reasoning: string;
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
    optimalPosition: {
        x: number;
        y: number;
    };
    alternativePositions: Array<{
        x: number;
        y: number;
        score: number;
    }>;
    spatialScore: number;
    placementReasoning: string;
    autoConnections: SpatialRelationship[];
}
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
    baseLayout?: Diagram;
    estimatedArea: {
        min: number;
        max: number;
    };
    complexity: 'simple' | 'moderate' | 'complex';
    regulatoryCompliance: string[];
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
    options?: any[];
    min?: number;
    max?: number;
    unit?: string;
    required: boolean;
    impact: string;
}
/**
 * Template instantiation request
 */
export interface TemplateInstantiationRequest {
    templateId: string;
    parameters: Record<string, any>;
    customizations?: {
        addRooms?: string[];
        removeRooms?: string[];
        modifyRoomSizes?: Record<string, {
            width: number;
            height: number;
        }>;
    };
}
/**
 * Regulatory rule from GMP/FDA/EMA guidelines
 */
export interface RegulatoryRule {
    id: string;
    source: 'FDA 21 CFR 211' | 'FDA 21 CFR 210' | 'EMA Annex 1' | 'ICH Q7' | 'PIC/S PE 009' | 'WHO GMP';
    section: string;
    requirement: string;
    applicableAreas: string[];
    severity: 'critical' | 'major' | 'minor';
    checkable: boolean;
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
    overallScore: number;
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
    type: 'add_node' | 'remove_node' | 'move_node' | 'add_relationship' | 'remove_relationship' | 'modify_room_size' | 'add_zone';
    nodeId?: string;
    node?: FunctionalArea;
    newPosition?: {
        x: number;
        y: number;
    };
    relationship?: SpatialRelationship;
    rationale: string;
}
/**
 * Optimization objective for layout refinement
 */
export interface OptimizationObjective {
    type: 'minimize_distance' | 'minimize_area' | 'maximize_throughput' | 'minimize_contamination_risk' | 'minimize_construction_cost' | 'maximize_cleanroom_clustering' | 'balance_flow_separation';
    weight: number;
    target?: number;
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
        improvement: number;
    }[];
    modifications: LayoutModification[];
    convergenceScore: number;
    iterations: number;
}
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
    impact: string;
    autoFixAvailable: boolean;
    autoFix?: LayoutModification;
    learnMoreUrl?: string;
    confidence: number;
}
/**
 * Design health assessment
 */
export interface DesignHealthScore {
    overall: number;
    compliance: number;
    efficiency: number;
    safety: number;
    cost: number;
    insights: PredictiveInsight[];
    trends: {
        improving: string[];
        degrading: string[];
    };
}
