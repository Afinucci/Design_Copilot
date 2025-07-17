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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
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

  async getRelationshipsForNode(nodeId: string): Promise<SpatialRelationship[]> {
    return this.request<SpatialRelationship[]>(`/nodes/${nodeId}/relationships`);
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

  // Guided Mode: Get suggestions based on current diagram state
  async getGuidedSuggestions(currentNodes: any[], targetCategory: string): Promise<{ suggestions: any[] }> {
    return this.request<{ suggestions: any[] }>('/nodes/kg/suggestions', {
      method: 'POST',
      body: JSON.stringify({ currentNodes, targetCategory }),
    });
  }

  // Creation Mode: Enhanced persistence with knowledge graph integration
  async persistToKnowledgeGraphEnhanced(diagramData: any): Promise<{ message: string; nodesAdded: number; relationshipsAdded: number }> {
    return this.request<{ message: string; nodesAdded: number; relationshipsAdded: number }>('/nodes/kg/persist', {
      method: 'POST',
      body: JSON.stringify(diagramData),
    });
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

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL.replace('/api', '')}/health`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;