import { NodeTemplate, NodeCategory } from '../types/index';
import { 
  getAllNodeTemplates,
  getTemplatesByCategory,
  getTemplateById,
  getAllCategories,
  validateTemplates
} from '../config/nodeTemplates';

/**
 * Static Node Templates Service
 * Provides node templates from static configuration instead of Neo4j database
 * This replaces the database-dependent NodeTemplatesService
 */
export class StaticNodeTemplatesService {
  private static instance: StaticNodeTemplatesService;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): StaticNodeTemplatesService {
    if (!StaticNodeTemplatesService.instance) {
      StaticNodeTemplatesService.instance = new StaticNodeTemplatesService();
    }
    return StaticNodeTemplatesService.instance;
  }

  /**
   * Initialize the service and validate templates
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('📋 Initializing Static Node Templates Service...');
    
    const validation = validateTemplates();
    if (!validation.valid) {
      console.error('❌ Template validation failed:', validation.errors);
      throw new Error(`Template configuration validation failed: ${validation.errors.join(', ')}`);
    }

    const templates = getAllNodeTemplates();
    const categories = getAllCategories();
    
    console.log(`✅ Static Node Templates Service initialized with ${templates.length} templates across ${categories.length} categories`);
    console.log(`📋 Categories: ${categories.join(', ')}`);
    
    this.initialized = true;
  }

  /**
   * Get all node templates
   */
  public async getTemplates(): Promise<NodeTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const templates = getAllNodeTemplates();
    console.log(`📋 Returning ${templates.length} static templates`);
    return templates;
  }

  /**
   * Get templates by category
   */
  public async getTemplatesByCategory(category: NodeCategory): Promise<NodeTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const templates = getTemplatesByCategory(category);
    console.log(`📋 Returning ${templates.length} templates for category: ${category}`);
    return templates;
  }

  /**
   * Get template by ID
   */
  public async getTemplateById(id: string): Promise<NodeTemplate | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const template = getTemplateById(id);
    if (template) {
      console.log(`📋 Found template: ${template.name} (${template.id})`);
    } else {
      console.log(`📋 Template not found: ${id}`);
    }
    return template || null;
  }

  /**
   * Get all available categories
   */
  public async getCategories(): Promise<NodeCategory[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const categories = getAllCategories();
    console.log(`📋 Returning ${categories.length} categories: ${categories.join(', ')}`);
    return categories;
  }

  /**
   * Search templates by name or category
   */
  public async searchTemplates(query: string): Promise<NodeTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const allTemplates = getAllNodeTemplates();
    const lowerQuery = query.toLowerCase();
    
    const results = allTemplates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.category.toLowerCase().includes(lowerQuery) ||
      template.id.toLowerCase().includes(lowerQuery) ||
      (template.cleanroomClass && template.cleanroomClass.toLowerCase().includes(lowerQuery))
    );

    console.log(`📋 Search for "${query}" returned ${results.length} results`);
    return results;
  }

  /**
   * Get template statistics
   */
  public async getStatistics(): Promise<{
    totalTemplates: number;
    categoriesCount: number;
    templatesByCategory: { [category: string]: number };
    templatesWithCleanroom: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const templates = getAllNodeTemplates();
    const categories = getAllCategories();
    
    const templatesByCategory: { [category: string]: number } = {};
    categories.forEach(category => {
      templatesByCategory[category] = getTemplatesByCategory(category).length;
    });

    const templatesWithCleanroom = templates.filter(t => t.cleanroomClass).length;

    const stats = {
      totalTemplates: templates.length,
      categoriesCount: categories.length,
      templatesByCategory,
      templatesWithCleanroom
    };

    console.log('📋 Template statistics:', stats);
    return stats;
  }

  /**
   * Validate a template ID exists
   */
  public async validateTemplateId(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const template = getTemplateById(id);
    return template !== undefined;
  }

  /**
   * Get templates with specific cleanroom class
   */
  public async getTemplatesByCleanroomClass(cleanroomClass: string): Promise<NodeTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const templates = getAllNodeTemplates().filter(t => 
      t.cleanroomClass && t.cleanroomClass.toLowerCase() === cleanroomClass.toLowerCase()
    );

    console.log(`📋 Found ${templates.length} templates with cleanroom class: ${cleanroomClass}`);
    return templates;
  }

  /**
   * Get health status of the service
   */
  public getHealthStatus(): {
    status: 'healthy' | 'unhealthy';
    initialized: boolean;
    templatesCount: number;
    categoriesCount: number;
  } {
    const templates = this.initialized ? getAllNodeTemplates() : [];
    const categories = this.initialized ? getAllCategories() : [];
    
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      templatesCount: templates.length,
      categoriesCount: categories.length
    };
  }
}