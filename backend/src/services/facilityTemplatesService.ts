import {
  FacilityTemplate,
  TemplateParameter,
  TemplateInstantiationRequest,
  Diagram,
  FunctionalArea,
  SpatialRelationship
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { StaticNodeTemplatesService } from './staticNodeTemplatesService';
import SpatialReasoningService from './spatialReasoningService';

/**
 * Facility Templates Service
 * Provides parametric facility templates for rapid layout generation
 * Templates are based on industry-standard pharmaceutical facility designs
 */
export class FacilityTemplatesService {
  private static instance: FacilityTemplatesService;
  private templates: FacilityTemplate[] = [];
  private nodeTemplatesService: StaticNodeTemplatesService;
  private spatialService: SpatialReasoningService;

  private constructor() {
    this.nodeTemplatesService = StaticNodeTemplatesService.getInstance();
    this.spatialService = SpatialReasoningService.getInstance();
    this.initializeTemplates();
  }

  public static getInstance(): FacilityTemplatesService {
    if (!FacilityTemplatesService.instance) {
      FacilityTemplatesService.instance = new FacilityTemplatesService();
    }
    return FacilityTemplatesService.instance;
  }

  /**
   * Initialize pre-built facility templates
   */
  private initializeTemplates(): void {
    this.templates = [
      this.createSterileInjectableTemplate(),
      this.createOralSolidDosageTemplate(),
      this.createBiologicsFacilityTemplate(),
      this.createAPIFacilityTemplate(),
      this.createQCLabTemplate(),
      this.createPackagingFacilityTemplate()
    ];

    console.log(`✅ Loaded ${this.templates.length} facility templates`);
  }

  /**
   * Get all available templates
   */
  public getAllTemplates(): FacilityTemplate[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  public getTemplateById(templateId: string): FacilityTemplate | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * Instantiate a template with user parameters
   */
  public async instantiateTemplate(request: TemplateInstantiationRequest): Promise<Diagram> {
    const template = this.getTemplateById(request.templateId);
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    console.log(`🏗️  Instantiating template: ${template.name}`);
    console.log(`📋 Parameters:`, request.parameters);

    // Call the appropriate generator
    switch (template.id) {
      case 'sterile-injectable-facility':
        return this.generateSterileInjectableFacility(request.parameters, request.customizations);

      case 'oral-solid-dosage-facility':
        return this.generateOralSolidDosageFacility(request.parameters, request.customizations);

      case 'biologics-facility':
        return this.generateBiologicsFacility(request.parameters, request.customizations);

      case 'api-facility':
        return this.generateAPIFacility(request.parameters, request.customizations);

      case 'qc-laboratory':
        return this.generateQCLaboratory(request.parameters, request.customizations);

      case 'packaging-facility':
        return this.generatePackagingFacility(request.parameters, request.customizations);

      default:
        throw new Error(`No generator implemented for template: ${template.id}`);
    }
  }

  // ============================================
  // TEMPLATE DEFINITIONS
  // ============================================

  /**
   * Sterile Injectable Facility Template
   */
  private createSterileInjectableTemplate(): FacilityTemplate {
    return {
      id: 'sterile-injectable-facility',
      name: 'Sterile Injectable Facility (Vial/Syringe Filling)',
      description: 'Complete sterile manufacturing suite for injectable pharmaceuticals including Grade A/B fill-finish operations',
      category: 'sterile-injectable',
      icon: '💉',
      parameters: [
        {
          id: 'batchSize',
          name: 'Batch Size',
          description: 'Production batch volume',
          type: 'select',
          options: ['50L', '100L', '500L', '1000L', '2000L'],
          defaultValue: '500L',
          required: true,
          impact: 'Determines vessel size and room dimensions'
        },
        {
          id: 'fillSpeed',
          name: 'Fill Speed',
          description: 'Vial filling rate',
          type: 'number',
          min: 100,
          max: 600,
          unit: 'vials/min',
          defaultValue: 300,
          required: true,
          impact: 'Affects filling room and equipment area sizing'
        },
        {
          id: 'includeFreezeDryer',
          name: 'Include Lyophilization',
          description: 'Add freeze-drying capability',
          type: 'boolean',
          defaultValue: true,
          required: false,
          impact: 'Adds lyophilizer room and ancillary equipment'
        },
        {
          id: 'throughput',
          name: 'Daily Throughput',
          description: 'Target batches per day',
          type: 'number',
          min: 1,
          max: 10,
          unit: 'batches/day',
          defaultValue: 3,
          required: true,
          impact: 'Determines warehouse and staging area sizes'
        }
      ],
      estimatedArea: { min: 800, max: 2000 },
      complexity: 'complex',
      regulatoryCompliance: ['FDA 21 CFR 211', 'EMA Annex 1', 'ICH Q7']
    };
  }

  /**
   * Oral Solid Dosage Facility Template
   */
  private createOralSolidDosageTemplate(): FacilityTemplate {
    return {
      id: 'oral-solid-dosage-facility',
      name: 'Oral Solid Dosage Facility (Tablets/Capsules)',
      description: 'Tablet and capsule manufacturing with granulation, compression, and coating',
      category: 'oral-solid-dosage',
      icon: '💊',
      parameters: [
        {
          id: 'dosageForm',
          name: 'Dosage Form',
          description: 'Primary product type',
          type: 'select',
          options: ['tablets', 'capsules', 'both'],
          defaultValue: 'tablets',
          required: true,
          impact: 'Determines equipment rooms (tablet press vs capsule filler)'
        },
        {
          id: 'capacity',
          name: 'Annual Capacity',
          description: 'Production capacity',
          type: 'select',
          options: ['50M units/year', '100M units/year', '500M units/year', '1B units/year'],
          defaultValue: '100M units/year',
          required: true,
          impact: 'Scales all room sizes and equipment areas'
        },
        {
          id: 'includeCoating',
          name: 'Include Film Coating',
          description: 'Add tablet coating capability',
          type: 'boolean',
          defaultValue: true,
          required: false,
          impact: 'Adds coating room and exhaust systems'
        }
      ],
      estimatedArea: { min: 600, max: 1500 },
      complexity: 'moderate',
      regulatoryCompliance: ['FDA 21 CFR 211', 'ICH Q7']
    };
  }

  /**
   * Biologics Facility Template
   */
  private createBiologicsFacilityTemplate(): FacilityTemplate {
    return {
      id: 'biologics-facility',
      name: 'Biologics/Cell Culture Facility',
      description: 'Bioreactor-based production with cell culture and downstream processing',
      category: 'biologics',
      icon: '🧬',
      parameters: [
        {
          id: 'bioreactorSize',
          name: 'Bioreactor Scale',
          description: 'Working volume of primary bioreactor',
          type: 'select',
          options: ['50L', '200L', '500L', '1000L', '2000L'],
          defaultValue: '500L',
          required: true,
          impact: 'Determines fermentation suite size'
        },
        {
          id: 'includeDownstream',
          name: 'Include Purification',
          description: 'Add downstream purification suite',
          type: 'boolean',
          defaultValue: true,
          required: false,
          impact: 'Adds chromatography and filtration rooms'
        }
      ],
      estimatedArea: { min: 1000, max: 2500 },
      complexity: 'complex',
      regulatoryCompliance: ['FDA 21 CFR 211', 'EMA Annex 1', 'ICH Q7']
    };
  }

  /**
   * API Facility Template
   */
  private createAPIFacilityTemplate(): FacilityTemplate {
    return {
      id: 'api-facility',
      name: 'API Manufacturing Facility',
      description: 'Active Pharmaceutical Ingredient synthesis and processing',
      category: 'api',
      icon: '⚗️',
      parameters: [
        {
          id: 'processType',
          name: 'Process Type',
          description: 'Primary synthesis method',
          type: 'select',
          options: ['chemical-synthesis', 'fermentation', 'extraction'],
          defaultValue: 'chemical-synthesis',
          required: true,
          impact: 'Determines reactor types and containment requirements'
        },
        {
          id: 'containmentLevel',
          name: 'Containment Level',
          description: 'Required containment for potent compounds',
          type: 'select',
          options: ['standard', 'moderate', 'high'],
          defaultValue: 'moderate',
          required: true,
          impact: 'Affects airlock design and material transfer systems'
        }
      ],
      estimatedArea: { min: 700, max: 1800 },
      complexity: 'complex',
      regulatoryCompliance: ['ICH Q7', 'FDA 21 CFR 211']
    };
  }

  /**
   * QC Laboratory Template
   */
  private createQCLabTemplate(): FacilityTemplate {
    return {
      id: 'qc-laboratory',
      name: 'Quality Control Laboratory',
      description: 'Analytical testing lab for pharmaceutical QC',
      category: 'qc-lab',
      icon: '🔬',
      parameters: [
        {
          id: 'testingTypes',
          name: 'Testing Capabilities',
          description: 'Types of analyses performed',
          type: 'select',
          options: ['chemical-only', 'micro-only', 'both'],
          defaultValue: 'both',
          required: true,
          impact: 'Determines lab sections (chemical vs microbiology)'
        },
        {
          id: 'sampleVolume',
          name: 'Monthly Sample Volume',
          description: 'Number of samples tested per month',
          type: 'number',
          min: 100,
          max: 5000,
          unit: 'samples/month',
          defaultValue: 1000,
          required: true,
          impact: 'Scales instrument room and sample storage areas'
        }
      ],
      estimatedArea: { min: 300, max: 800 },
      complexity: 'moderate',
      regulatoryCompliance: ['FDA 21 CFR 211', 'ICH Q7']
    };
  }

  /**
   * Packaging Facility Template
   */
  private createPackagingFacilityTemplate(): FacilityTemplate {
    return {
      id: 'packaging-facility',
      name: 'Secondary Packaging Facility',
      description: 'Blister packaging, labeling, and final packing',
      category: 'packaging',
      icon: '📦',
      parameters: [
        {
          id: 'packagingType',
          name: 'Packaging Type',
          description: 'Primary packaging method',
          type: 'select',
          options: ['blister', 'bottle', 'pouch', 'mixed'],
          defaultValue: 'blister',
          required: true,
          impact: 'Determines packaging equipment rooms'
        },
        {
          id: 'throughput',
          name: 'Packaging Speed',
          description: 'Units packaged per hour',
          type: 'number',
          min: 1000,
          max: 50000,
          unit: 'units/hour',
          defaultValue: 10000,
          required: true,
          impact: 'Affects line length and warehouse size'
        }
      ],
      estimatedArea: { min: 400, max: 1000 },
      complexity: 'simple',
      regulatoryCompliance: ['FDA 21 CFR 211']
    };
  }

  // ============================================
  // TEMPLATE GENERATORS
  // ============================================

  /**
   * Generate Sterile Injectable Facility
   */
  private async generateSterileInjectableFacility(params: any, customizations?: any): Promise<Diagram> {
    const nodes: FunctionalArea[] = [];
    const relationships: SpatialRelationship[] = [];

    // Core sterile manufacturing rooms
    const roomDefinitions = [
      { id: 'material-airlock-a', template: 'material-airlock', class: 'B' },
      { id: 'compounding-room', template: 'compounding-room', class: 'C' },
      { id: 'filling-room', template: 'filling-room', class: 'A' },
      { id: 'stopper-washer', template: 'stopper-washer', class: 'B' },
      { id: 'autoclave-room', template: 'autoclave-room', class: 'CNC' },
      { id: 'sterile-gowning', template: 'gowning-room', class: 'B' },
      { id: 'staging-area', template: 'staging-area', class: 'CNC' },
      { id: 'warehouse', template: 'warehouse', class: 'CNC' },
      { id: 'qc-lab', template: 'qc-lab', class: 'CNC' }
    ];

    // Add freeze-dryer if requested
    if (params.includeFreezeDryer) {
      roomDefinitions.push({ id: 'lyophilizer', template: 'lyophilizer', class: 'A' });
    }

    // Create nodes from templates
    for (const roomDef of roomDefinitions) {
      const allTemplates = await this.nodeTemplatesService.getTemplates();
      const template = allTemplates.find((t: any) => t.id === roomDef.template);

      if (template) {
        nodes.push({
          id: `node-${roomDef.id}-${uuidv4()}`,
          name: template.name,
          category: template.category,
          cleanroomClass: roomDef.class,
          ...this.scaleRoomSize(template.defaultSize, params.batchSize)
        });
      }
    }

    // Define relationships (material flow)
    const relDefs = [
      { from: 0, to: 1, type: 'MATERIAL_FLOW', reason: 'Material entry' },
      { from: 1, to: 2, type: 'MATERIAL_FLOW', reason: 'Compounding to filling' },
      { from: 3, to: 2, type: 'MATERIAL_FLOW', reason: 'Cleaned stoppers to filling' },
      { from: 2, to: 4, type: 'MATERIAL_FLOW', reason: 'Filled units to sterilization' },
      { from: 4, to: 6, type: 'MATERIAL_FLOW', reason: 'Sterilized units to staging' },
      { from: 6, to: 7, type: 'MATERIAL_FLOW', reason: 'Staging to warehouse' },
      { from: 5, to: 2, type: 'PERSONNEL_FLOW', reason: 'Gowned personnel to Grade A' },
      { from: 6, to: 8, type: 'MATERIAL_FLOW', reason: 'Samples to QC' }
    ];

    for (const relDef of relDefs) {
      if (nodes[relDef.from] && nodes[relDef.to]) {
        relationships.push({
          id: `rel-${uuidv4()}`,
          type: relDef.type as any,
          fromId: nodes[relDef.from].id,
          toId: nodes[relDef.to].id,
          priority: 1,
          reason: relDef.reason
        });
      }
    }

    // Calculate positions using spatial reasoning
    const positions = await this.spatialService.calculateLayoutPositions(nodes, relationships, {
      layoutStyle: 'linear'
    });

    // Apply positions
    positions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
      }
    });

    return {
      id: uuidv4(),
      name: `Sterile Injectable Facility (${params.batchSize})`,
      nodes,
      relationships,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate Oral Solid Dosage Facility
   */
  private async generateOralSolidDosageFacility(params: any, customizations?: any): Promise<Diagram> {
    const nodes: FunctionalArea[] = [];
    const relationships: SpatialRelationship[] = [];

    const roomDefinitions = [
      { id: 'dispensing', template: 'dispensing-room', class: 'D' },
      { id: 'granulation', template: 'granulation-room', class: 'D' },
      { id: 'blending', template: 'blending-room', class: 'D' },
      { id: 'compression', template: 'compression-room', class: 'D' },
      { id: 'warehouse', template: 'warehouse', class: 'CNC' },
      { id: 'qc-lab', template: 'qc-lab', class: 'CNC' }
    ];

    if (params.includeCoating) {
      roomDefinitions.splice(4, 0, { id: 'coating', template: 'coating-room', class: 'D' });
    }

    // Create nodes
    for (const roomDef of roomDefinitions) {
      const allTemplates = await this.nodeTemplatesService.getTemplates();
      const template = allTemplates.find((t: any) => t.id === roomDef.template);

      if (template) {
        nodes.push({
          id: `node-${roomDef.id}-${uuidv4()}`,
          name: template.name,
          category: template.category,
          cleanroomClass: roomDef.class,
          ...template.defaultSize
        });
      }
    }

    // Material flow relationships
    for (let i = 0; i < nodes.length - 2; i++) {
      relationships.push({
        id: `rel-${uuidv4()}`,
        type: 'MATERIAL_FLOW',
        fromId: nodes[i].id,
        toId: nodes[i + 1].id,
        priority: 1,
        reason: 'Sequential process flow'
      });
    }

    // Calculate positions
    const positions = await this.spatialService.calculateLayoutPositions(nodes, relationships, {
      layoutStyle: 'linear'
    });

    positions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
      }
    });

    return {
      id: uuidv4(),
      name: `Oral Solid Dosage Facility`,
      nodes,
      relationships,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate Biologics Facility
   */
  private async generateBiologicsFacility(params: any, customizations?: any): Promise<Diagram> {
    const nodes: FunctionalArea[] = [];
    const relationships: SpatialRelationship[] = [];

    const roomDefinitions = [
      { id: 'media-prep', template: 'media-prep-room', class: 'C' },
      { id: 'bioreactor', template: 'bioreactor-suite', class: 'C' },
      { id: 'harvest', template: 'harvest-room', class: 'C' },
      { id: 'warehouse', template: 'warehouse', class: 'CNC' }
    ];

    if (params.includeDownstream) {
      roomDefinitions.push(
        { id: 'chromatography', template: 'chromatography-room', class: 'C' },
        { id: 'ultrafiltration', template: 'ultrafiltration-room', class: 'C' }
      );
    }

    // Create nodes
    for (const roomDef of roomDefinitions) {
      const allTemplates = await this.nodeTemplatesService.getTemplates();
      const template = allTemplates.find((t: any) => t.id === roomDef.template);

      if (template) {
        nodes.push({
          id: `node-${roomDef.id}-${uuidv4()}`,
          name: template.name,
          category: template.category,
          cleanroomClass: roomDef.class,
          ...template.defaultSize
        });
      }
    }

    // Create flow
    for (let i = 0; i < nodes.length - 1; i++) {
      relationships.push({
        id: `rel-${uuidv4()}`,
        type: 'MATERIAL_FLOW',
        fromId: nodes[i].id,
        toId: nodes[i + 1].id,
        priority: 1,
        reason: 'Bioprocess flow'
      });
    }

    const positions = await this.spatialService.calculateLayoutPositions(nodes, relationships, {
      layoutStyle: 'linear'
    });

    positions.forEach((pos, nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
      }
    });

    return {
      id: uuidv4(),
      name: `Biologics Facility (${params.bioreactorSize})`,
      nodes,
      relationships,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate API Facility (simplified)
   */
  private async generateAPIFacility(params: any, customizations?: any): Promise<Diagram> {
    // Simplified implementation
    return {
      id: uuidv4(),
      name: 'API Manufacturing Facility',
      nodes: [],
      relationships: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate QC Laboratory (simplified)
   */
  private async generateQCLaboratory(params: any, customizations?: any): Promise<Diagram> {
    return {
      id: uuidv4(),
      name: 'Quality Control Laboratory',
      nodes: [],
      relationships: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate Packaging Facility (simplified)
   */
  private async generatePackagingFacility(params: any, customizations?: any): Promise<Diagram> {
    return {
      id: uuidv4(),
      name: 'Packaging Facility',
      nodes: [],
      relationships: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Scale room size based on batch size
   */
  private scaleRoomSize(defaultSize: { width: number; height: number }, batchSize: string): { width: number; height: number } {
    const sizeMap: Record<string, number> = {
      '50L': 0.8,
      '100L': 0.9,
      '500L': 1.0,
      '1000L': 1.2,
      '2000L': 1.4
    };

    const scale = sizeMap[batchSize] || 1.0;

    return {
      width: Math.round(defaultSize.width * scale),
      height: Math.round(defaultSize.height * scale)
    };
  }
}

export default FacilityTemplatesService;
