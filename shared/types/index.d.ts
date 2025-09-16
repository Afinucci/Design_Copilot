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
    suggestedPosition: {
        x: number;
        y: number;
    };
    priority: number;
    reason: string;
    confidence: number;
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
//# sourceMappingURL=index.d.ts.map