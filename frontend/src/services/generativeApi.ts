import {
  LayoutGenerationRequest,
  GeneratedLayout,
  FacilityTemplate,
  TemplateInstantiationRequest,
  Diagram,
  ComplianceReport,
  SpatialPlacement,
  SmartGhostSuggestion,
  GhostSuggestion,
  FunctionalArea,
  SpatialRelationship
} from '../../../shared/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Generative AI API Service
 * Handles all interactions with generative layout endpoints
 */
export class GenerativeApiService {
  /**
   * Generate a complete facility layout from natural language description
   */
  static async generateLayout(request: LayoutGenerationRequest): Promise<GeneratedLayout> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/generate-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate layout');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error generating layout:', error);
      throw error;
    }
  }

  /**
   * Get all available facility templates
   */
  static async getTemplates(): Promise<FacilityTemplate[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/templates`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch templates');
      }
      const data = await response.json();
      return data.templates;
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   */
  static async getTemplateById(templateId: string): Promise<FacilityTemplate> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/templates/${templateId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch template');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching template:', error);
      throw error;
    }
  }

  /**
   * Instantiate a facility template with parameters
   */
  static async instantiateTemplate(request: TemplateInstantiationRequest): Promise<Diagram> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/templates/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to instantiate template');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error instantiating template:', error);
      throw error;
    }
  }

  /**
   * Check layout compliance against GMP regulations
   */
  static async checkCompliance(
    diagram: Diagram,
    regulatoryZone: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S' = 'FDA'
  ): Promise<ComplianceReport> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/check-compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagram, regulatoryZone })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to check compliance');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error checking compliance:', error);
      throw error;
    }
  }

  /**
   * Get regulatory rules for a specific zone
   */
  static async getRegulatoryRules(zone?: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S') {
    try {
      const url = zone
        ? `${API_BASE_URL}/generative/regulatory-rules?zone=${zone}`
        : `${API_BASE_URL}/generative/regulatory-rules`;
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch rules');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching regulatory rules:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal position for a new node
   */
  static async calculatePosition(
    newNode: any,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    preferences?: any
  ): Promise<SpatialPlacement> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/calculate-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNode, existingNodes, relationships, preferences })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to calculate position');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error calculating position:', error);
      throw error;
    }
  }

  /**
   * Optimize entire layout positions
   */
  static async optimizeLayout(
    nodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    options?: any
  ): Promise<Record<string, { x: number; y: number }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/optimize-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, relationships, options })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to optimize layout');
      }
      const data = await response.json();
      return data.positions;
    } catch (error: any) {
      console.error('Error optimizing layout:', error);
      throw error;
    }
  }

  /**
   * Enhance ghost suggestion with spatial intelligence
   */
  static async enhanceGhostSuggestion(
    ghostSuggestion: GhostSuggestion,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): Promise<SmartGhostSuggestion> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/enhance-ghost-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ghostSuggestion, existingNodes, relationships })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enhance ghost');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error enhancing ghost suggestion:', error);
      throw error;
    }
  }

  /**
   * Health check for generative services
   */
  static async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/generative/health`);
      if (!response.ok) {
        throw new Error('Generative services unavailable');
      }
      return await response.json();
    } catch (error: any) {
      console.error('Error checking health:', error);
      throw new Error('Generative services unavailable');
    }
  }
}

export default GenerativeApiService;
