import { 
  NodeTemplate, 
  FunctionalArea, 
  Diagram, 
  ValidationResult, 
  Suggestion,
  SpatialRelationship,
  NodeGroup 
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private baseURL = API_BASE_URL;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorMsg = `API request failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('🌐 API Request Error:', endpoint, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // Node Templates
  async getNodeTemplates(): Promise<NodeTemplate[]> {
    return this.request<NodeTemplate[]>('/nodes/templates');
  }

  async getNodesByCategory(category: string): Promise<FunctionalArea[]> {
    return this.request<FunctionalArea[]>(`/nodes/category/${category}`);
  }

  async initializeDatabase(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/nodes/initialize', {
      method: 'POST',
    });
  }

  // Functional Areas
  async getFunctionalAreas(): Promise<FunctionalArea[]> {
    return this.request<FunctionalArea[]>('/nodes');
  }

  async getFunctionalAreaById(id: string): Promise<FunctionalArea> {
    return this.request<FunctionalArea>(`/nodes/${id}`);
  }

  async createFunctionalArea(area: Omit<FunctionalArea, 'id'>): Promise<FunctionalArea> {
    return this.request<FunctionalArea>('/nodes', {
      method: 'POST',
      body: JSON.stringify(area),
    });
  }

  async updateFunctionalArea(id: string, updates: Partial<FunctionalArea>): Promise<FunctionalArea> {
    return this.request<FunctionalArea>(`/nodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteFunctionalArea(id: string): Promise<void> {
    return this.request<void>(`/nodes/${id}`, {
      method: 'DELETE',
    });
  }

  // Suggestions
  async getSuggestions(nodeId: string, excludeIds: string[] = []): Promise<Suggestion[]> {
    const excludeQuery = excludeIds.length > 0 ? `?exclude=${excludeIds.join(',')}` : '';
    return this.request<Suggestion[]>(`/nodes/${nodeId}/suggestions${excludeQuery}`);
  }

  // Enhanced method with mode-awareness for relationship fetching
  async getRelationshipsForNode(
    nodeId: string,
    options?: {
      mode?: 'creation' | 'exploration';
      includeIcons?: boolean;
      priority?: number;
    }
  ): Promise<SpatialRelationship[]> {
    const queryParams = new URLSearchParams();
    
    if (options?.mode) {
      queryParams.append('mode', options.mode);
    }
    if (options?.includeIcons) {
      queryParams.append('includeIcons', 'true');
    }
    if (options?.priority !== undefined) {
      queryParams.append('priority', options.priority.toString());
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/nodes/${nodeId}/relationships${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🌐 API: Fetching relationships for ${nodeId} with mode: ${options?.mode || 'standard'}`);
    return this.request<SpatialRelationship[]>(endpoint);
  }

  // Get node with its relationships and related nodes (for guided mode)
  async getNodeWithRelationships(nodeId: string): Promise<{
    node: any;
    relatedNodes: any[];
    relationships: any[];
    totalRelationships: number;
    totalRelatedNodes: number;
  }> {
    return this.request<{
      node: any;
      relatedNodes: any[];
      relationships: any[];
      totalRelationships: number;
      totalRelatedNodes: number;
    }>(`/nodes/${nodeId}/with-relationships`);
  }

  // Diagrams
  async getDiagrams(): Promise<Diagram[]> {
    return this.request<Diagram[]>('/diagrams');
  }

  async getDiagramById(id: string): Promise<Diagram> {
    return this.request<Diagram>(`/diagrams/${id}`);
  }

  async createDiagram(diagram: Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string; message: string }> {
    return this.request<{ id: string; message: string }>('/diagrams', {
      method: 'POST',
      body: JSON.stringify(diagram),
    });
  }

  async updateDiagram(id: string, diagram: Omit<Diagram, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/diagrams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(diagram),
    });
  }

  async deleteDiagram(id: string): Promise<void> {
    return this.request<void>(`/diagrams/${id}`, {
      method: 'DELETE',
    });
  }

  // Validation
  async validateDiagram(nodes: FunctionalArea[], relationships: SpatialRelationship[]): Promise<ValidationResult> {
    return this.request<ValidationResult>('/validation', {
      method: 'POST',
      body: JSON.stringify({ nodes, relationships }),
    });
  }

  async getComplianceRequirements(nodeType: string): Promise<{
    adjacencies: any[];
    prohibitions: any[];
    utilities: any[];
    materialFlows: any[];
    personnelFlows: any[];
  }> {
    return this.request<{
      adjacencies: any[];
      prohibitions: any[];
      utilities: any[];
      materialFlows: any[];
      personnelFlows: any[];
    }>(`/validation/requirements/${nodeType}`);
  }

  // Knowledge Graph Operations
  async getExistingGraphNodes(): Promise<NodeTemplate[]> {
    return this.request<NodeTemplate[]>('/nodes/existing');
  }

  async persistToKnowledgeGraph(diagramData: any): Promise<{ message: string }> {
    return this.request<{ message: string }>('/nodes/persist', {
      method: 'POST',
      body: JSON.stringify(diagramData),
    });
  }

  async saveExplorationView(diagramData: any): Promise<{ message: string }> {
    return this.request<{ message: string }>('/diagrams/view', {
      method: 'POST',
      body: JSON.stringify(diagramData),
    });
  }

  async queryGraphData(filters: any): Promise<{ nodes: any[]; relationships: any[] }> {
    return this.request<{ nodes: any[]; relationships: any[] }>('/nodes/query', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  }

  // New Methods for Enhanced Modes
  
  // Guided Mode: Import complete knowledge graph data
  async importKnowledgeGraph(): Promise<{ nodes: any[]; relationships: any[]; patterns: any[]; metadata: any }> {
    return this.request<{ nodes: any[]; relationships: any[]; patterns: any[]; metadata: any }>('/nodes/kg/import');
  }

  async getNeo4jOverview(): Promise<{
    connectionStatus: string;
    database: { name: string; uri: string; user: string };
    statistics: {
      totalNodes: number;
      totalRelationships: number;
      nodeLabels: Array<{ label: string; count: number }>;
      relationshipTypes: Array<{ type: string; count: number }>;
      keyNodeCounts: Record<string, number>;
    };
    sampleNodes: Record<string, any[]>;
    timestamp: string;
  }> {
    return this.request('/nodes/neo4j/overview');
  }

  // Relationship Suggestions for Layout Designer mode
  async getRelationshipSuggestions(functionalAreaName: string): Promise<{
    functionalArea: string;
    suggestions: any[];
    count: number;
  }> {
    return this.request(`/suggestions/relationships/${encodeURIComponent(functionalAreaName)}`);
  }

  // Creation Mode: Enhanced persistence with knowledge graph integration
  async persistToKnowledgeGraphEnhanced(diagramData: any): Promise<{ message: string; nodesAdded: number; relationshipsAdded: number }> {
    console.log('🌐 API Service: persistToKnowledgeGraphEnhanced called');
    console.log('🌐 API Service: Diagram data to persist:', {
      nodeCount: diagramData.nodes?.length,
      relationshipCount: diagramData.relationships?.length,
      hasMetadata: !!diagramData.metadata
    });
    console.log('🌐 API Service: Full request body:', JSON.stringify(diagramData, null, 2));

    try {
      const result = await this.request<{ message: string; nodesAdded: number; relationshipsAdded: number }>('/nodes/kg/persist', {
        method: 'POST',
        body: JSON.stringify(diagramData),
      });
      console.log('🌐 API Service: ✅ Persist successful:', result);
      return result;
    } catch (error) {
      console.error('🌐 API Service: ❌ Persist failed:', error);
      throw error;
    }
  }

  // Groups
  async getGroups(): Promise<NodeGroup[]> {
    return this.request<NodeGroup[]>('/groups');
  }

  async getGroupById(id: string): Promise<NodeGroup> {
    return this.request<NodeGroup>(`/groups/${id}`);
  }

  async createGroup(group: Omit<NodeGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<NodeGroup> {
    return this.request<NodeGroup>('/groups', {
      method: 'POST',
      body: JSON.stringify(group),
    });
  }

  async updateGroup(id: string, updates: Partial<NodeGroup>): Promise<NodeGroup> {
    return this.request<NodeGroup>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteGroup(id: string): Promise<{ message: string; group: NodeGroup }> {
    return this.request<{ message: string; group: NodeGroup }>(`/groups/${id}`, {
      method: 'DELETE',
    });
  }

  async addNodeToGroup(groupId: string, nodeId: string): Promise<NodeGroup> {
    return this.request<NodeGroup>(`/groups/${groupId}/add-node`, {
      method: 'POST',
      body: JSON.stringify({ nodeId }),
    });
  }

  async removeNodeFromGroup(groupId: string, nodeId: string): Promise<NodeGroup> {
    return this.request<NodeGroup>(`/groups/${groupId}/remove-node/${nodeId}`, {
      method: 'DELETE',
    });
  }

  // Relationships
  async getAllRelationships(): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>('/relationships');
  }

  async getRelationshipById(id: string): Promise<SpatialRelationship> {
    return this.request<SpatialRelationship>(`/relationships/${id}`);
  }

  async createRelationship(relationship: Omit<SpatialRelationship, 'id'>): Promise<SpatialRelationship> {
    return this.request<SpatialRelationship>('/relationships', {
      method: 'POST',
      body: JSON.stringify(relationship),
    });
  }

  async updateRelationship(id: string, updates: Partial<SpatialRelationship>): Promise<SpatialRelationship> {
    return this.request<SpatialRelationship>(`/relationships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteRelationship(id: string): Promise<void> {
    return this.request<void>(`/relationships/${id}`, {
      method: 'DELETE',
    });
  }

  async getRelationshipsBetweenNodes(sourceId: string, targetId: string): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>(`/relationships/between/${sourceId}/${targetId}`);
  }

  async getRelationshipsByType(type: string): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>(`/relationships/type/${type}`);
  }

  async batchCreateRelationships(relationships: Omit<SpatialRelationship, 'id'>[]): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>('/relationships/batch', {
      method: 'POST',
      body: JSON.stringify({ relationships }),
    });
  }

  async batchUpdateRelationships(relationships: SpatialRelationship[]): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>('/relationships/batch', {
      method: 'PUT',
      body: JSON.stringify({ relationships }),
    });
  }

  async batchDeleteRelationships(relationshipIds: string[]): Promise<{ deletedCount: number }> {
    return this.request<{ deletedCount: number }>('/relationships/batch', {
      method: 'DELETE',
      body: JSON.stringify({ relationshipIds }),
    });
  }

  // ============================================================================
  // CONSTRAINT ENFORCEMENT API METHODS
  // ============================================================================

  // Associate a shape with a Neo4j node template
  async associateShapeWithNode(
    shapeId: string,
    nodeTemplateId: string,
    nodeTemplateName: string,
    category: string,
    cleanroomClass?: string,
    customProperties?: Record<string, any>
  ): Promise<{
    success: boolean;
    message: string;
    constraintsCount: number;
    constraints: any[];
  }> {
    return this.request<{
      success: boolean;
      message: string;
      constraintsCount: number;
      constraints: any[];
    }>(`/nodes/${shapeId}/associate`, {
      method: 'POST',
      body: JSON.stringify({
        nodeTemplateId,
        nodeTemplateName,
        category,
        cleanroomClass,
        customProperties
      }),
    });
  }

  // Get all constraints that apply to a specific node
  async getNodeConstraints(nodeId: string): Promise<{
    nodeId: string;
    constraintsCount: number;
    constraints: any[];
  }> {
    return this.request<{
      nodeId: string;
      constraintsCount: number;
      constraints: any[];
    }>(`/nodes/${nodeId}/constraints`);
  }

  // Validate a connection between two nodes
  async validateConnection(
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType?: string
  ): Promise<{
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType?: string;
    isValid: boolean;
    violations: Array<{
      type: 'ERROR' | 'WARNING' | 'INFO';
      message: string;
      ruleType: string;
      priority: number;
      reason: string;
    }>;
    suggestions: string[];
  }> {
    return this.request<{
      sourceNodeId: string;
      targetNodeId: string;
      relationshipType?: string;
      isValid: boolean;
      violations: Array<{
        type: 'ERROR' | 'WARNING' | 'INFO';
        message: string;
        ruleType: string;
        priority: number;
        reason: string;
      }>;
      suggestions: string[];
    }>('/nodes/connections/validate', {
      method: 'POST',
      body: JSON.stringify({
        sourceNodeId,
        targetNodeId,
        relationshipType
      }),
    });
  }

  // Get valid connection targets for a node
  async getValidConnectionTargets(nodeId: string): Promise<{
    nodeId: string;
    validTargetsCount: number;
    validTargets: Array<{
      nodeId: string;
      nodeName: string;
      relationshipTypes: string[];
      confidence: number;
      reason: string;
    }>;
  }> {
    return this.request<{
      nodeId: string;
      validTargetsCount: number;
      validTargets: Array<{
        nodeId: string;
        nodeName: string;
        relationshipTypes: string[];
        confidence: number;
        reason: string;
      }>;
    }>(`/nodes/${nodeId}/valid-targets`);
  }

  // Knowledge Graph Explorer
  async getKnowledgeGraphData(nodeId: string, confidence: number = 0.3): Promise<{ nodes: any[]; links: any[] }> {
    console.log('🔍 API Service: Fetching knowledge graph data for node:', nodeId);
    const encodedId = encodeURIComponent(nodeId);
    return this.request<{ nodes: any[]; links: any[] }>(`/nodes/kg/${encodedId}?confidence=${confidence}`);
  }

  // ============================================================================
  // RELATIONSHIP POSITIONING API METHODS - Enhanced for Overlapping Scenarios
  // ============================================================================

  // Get optimal positioning for relationship icons in overlapping scenarios
  async getOptimalRelationshipPositioning(request: {
    relationships: SpatialRelationship[];
    nodeGeometry: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
    canvasSize?: { width: number; height: number };
  }): Promise<{
    iconPositions: Array<{
      relationshipId: string;
      optimalPosition: { x: number; y: number };
      alternativePositions: Array<{ x: number; y: number; score: number }>;
      collisionRisk: 'none' | 'low' | 'medium' | 'high';
      connectionPoints: {
        source: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
        target: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
      };
    }>;
    summary: {
      total: number;
      noCollision: number;
      lowRisk: number;
      mediumRisk: number;
      highRisk: number;
    };
    layoutSuggestions: string[];
  }> {
    return this.request('/nodes/relationships/optimal-positioning', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Enhanced relationships with positioning metadata for guided mode
  async getEnhancedRelationshipsForNode(
    nodeId: string,
    options?: {
      mode?: 'creation' | 'guided';
      includePositioning?: boolean;
    }
  ): Promise<SpatialRelationship[]> {
    const queryParams = new URLSearchParams();
    
    if (options?.mode) {
      queryParams.append('mode', options.mode);
    }
    if (options?.includePositioning) {
      queryParams.append('includePositioning', 'true');
    }
    
    const queryString = queryParams.toString();
    const endpoint = `/nodes/${nodeId}/relationships/enhanced${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🌐 API: Fetching enhanced relationships for ${nodeId} with positioning support`);
    return this.request<SpatialRelationship[]>(endpoint);
  }

  // ============================================================================
  // SHAPE POSITION VALIDATION API METHODS  
  // ============================================================================

  async validateShapePosition(request: {
    shapeId: string;
    position: { x: number; y: number };
    shapeGeometry: {
      vertices: Array<{ x: number; y: number }>;
      boundingBox: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        width: number;
        height: number;
      };
    };
    assignedNodeId?: string;
    nearbyShapes: Array<{
      id: string;
      assignedNodeId?: string;
      geometry: {
        vertices: Array<{ x: number; y: number }>;
        boundingBox: {
          minX: number;
          maxX: number;
          minY: number;
          maxY: number;
          width: number;
          height: number;
        };
      };
      distance: number;
    }>;
  }): Promise<{
    canPlace: boolean;
    violations: Array<{
      shapeId: string;
      reason: string;
      severity: 'error' | 'warning';
      collisionType: 'overlap' | 'edge-touch' | 'near-proximity';
    }>;
    warnings: string[];
    adjacencyChecks: Array<{
      targetShapeId: string;
      sourceNodeId: string;
      targetNodeId: string;
      canBeAdjacent: boolean;
      reason: string;
    }>;
  }> {
    return this.request('/shapes/validate-position', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async checkAdjacency(nodeId1: string, nodeId2: string): Promise<{
    nodeId1: string;
    nodeId2: string;
    canBeAdjacent: boolean;
    relationshipType?: string;
    reason: string;
    confidence: number;
  }> {
    return this.request(`/shapes/adjacency/${nodeId1}/${nodeId2}`);
  }

  async bulkCheckAdjacency(requests: Array<{
    nodeId1: string;
    nodeId2: string;
  }>): Promise<{
    results: Array<{
      nodeId1: string;
      nodeId2: string;
      canBeAdjacent: boolean;
      relationshipType?: string;
      reason: string;
    }>;
    total: number;
    allowed: number;
    blocked: number;
  }> {
    return this.request('/shapes/bulk-adjacency', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  async getAdjacencyCacheStats(): Promise<{
    cacheSize: number;
    cachedPairs: string[];
    timestamp: string;
  }> {
    return this.request('/shapes/cache-stats');
  }

  async clearAdjacencyCache(): Promise<{
    message: string;
    timestamp: string;
  }> {
    return this.request('/shapes/clear-cache', {
      method: 'POST',
    });
  }

  async checkShapesServiceHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    service: string;
    neo4jConnected: boolean;
    cacheSize: number;
    timestamp: string;
    testQuery: {
      executed: boolean;
      result: string;
    };
  }> {
    return this.request('/shapes/health');
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL.replace('/api', '')}/health`;
    console.log('🩺 Frontend health check - URL:', url);
    
    try {
      const response = await fetch(url);
      console.log('🩺 Frontend health check - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('🩺 Frontend health check - Result:', result);
      return result;
    } catch (error) {
      console.error('🩺 Frontend health check - Error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;