import OpenAI from 'openai';
import {
  LayoutGenerationRequest,
  GeneratedLayout,
  FunctionalArea,
  SpatialRelationship,
  ZoneDefinition,
  OptimizationMetrics,
  Diagram
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { StaticNodeTemplatesService } from './staticNodeTemplatesService';
import SpatialReasoningService from './spatialReasoningService';
import GMPKnowledgeService from './gmpKnowledgeService';
import FacilityTemplatesService from './facilityTemplatesService';

/**
 * Generative Layout Service
 * Transforms natural language descriptions into complete pharmaceutical facility layouts
 * Uses AI to understand requirements and generate GMP-compliant designs
 */
export class GenerativeLayoutService {
  private static instance: GenerativeLayoutService;
  private openai: OpenAI;
  private nodeTemplatesService: StaticNodeTemplatesService;
  private spatialService: SpatialReasoningService;
  private gmpService: GMPKnowledgeService;
  private templatesService: FacilityTemplatesService;

  private constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.nodeTemplatesService = StaticNodeTemplatesService.getInstance();
    this.spatialService = SpatialReasoningService.getInstance();
    this.gmpService = GMPKnowledgeService.getInstance();
    this.templatesService = FacilityTemplatesService.getInstance();
  }

  public static getInstance(): GenerativeLayoutService {
    if (!GenerativeLayoutService.instance) {
      GenerativeLayoutService.instance = new GenerativeLayoutService();
    }
    return GenerativeLayoutService.instance;
  }

  /**
   * Generate a complete layout from natural language description
   */
  public async generateLayout(request: LayoutGenerationRequest): Promise<GeneratedLayout> {
    console.log(`🚀 Starting layout generation:`);
    console.log(`   Description: ${request.description}`);
    console.log(`   Mode: ${request.mode || 'detailed'}`);
    console.log(`   Constraints:`, request.constraints);

    try {
      // Step 1: Use AI to extract structured requirements from natural language
      const requirements = await this.extractRequirements(request);
      console.log(`✅ Extracted requirements:`, requirements);

      // Step 2: Select appropriate facility template or build from scratch
      const baseLayout = await this.selectOrBuildBaseLayout(requirements);
      console.log(`✅ Created base layout with ${baseLayout.nodes.length} rooms`);

      // Step 3: Refine and optimize positions
      const optimizedLayout = await this.optimizeLayout(baseLayout, request.preferences);
      console.log(`✅ Optimized layout positions`);

      // Step 4: Create zones/clusters
      const zones = this.createZones(optimizedLayout.nodes);
      console.log(`✅ Created ${zones.length} functional zones`);

      // Step 5: Validate against GMP rules
      const complianceReport = await this.gmpService.checkCompliance(
        optimizedLayout,
        request.constraints.regulatoryZone || 'FDA'
      );
      console.log(`✅ Compliance check: ${complianceReport.overallScore}/100`);

      // Step 6: Calculate metrics
      const metrics = this.calculateMetrics(optimizedLayout);
      console.log(`✅ Calculated optimization metrics`);

      // Step 7: Generate rationale and recommendations
      const rationale = await this.generateRationale(request, optimizedLayout, complianceReport);
      const warnings = this.generateWarnings(complianceReport);
      const suggestions = this.generateSuggestions(optimizedLayout, complianceReport);

      return {
        nodes: optimizedLayout.nodes,
        relationships: optimizedLayout.relationships,
        zones,
        rationale,
        complianceScore: complianceReport.overallScore,
        optimizationMetrics: metrics,
        warnings,
        suggestions
      };
    } catch (error: any) {
      console.error('❌ Error generating layout:', error);
      throw new Error(`Layout generation failed: ${error.message}`);
    }
  }

  /**
   * Extract structured requirements from natural language using AI
   */
  private async extractRequirements(request: LayoutGenerationRequest): Promise<{
    facilityType: string;
    requiredRooms: string[];
    estimatedSize: string;
    specialRequirements: string[];
    matchedTemplate?: string;
  }> {
    const availableTemplates = await this.nodeTemplatesService.getTemplates();
    const facilityTemplates = this.templatesService.getAllTemplates();

    const systemPrompt = `You are an expert pharmaceutical facility designer. Analyze the user's description and extract structured requirements.

Available Room Templates:
${availableTemplates.map((t: any) => `- ${t.id}: ${t.name} (${t.category}, Class ${t.cleanroomClass || 'CNC'})`).join('\n')}

Available Facility Templates:
${facilityTemplates.map((t: any) => `- ${t.id}: ${t.name} (${t.category})`).join('\n')}

Your task: Analyze the description and return JSON with:
{
  "facilityType": "sterile-injectable | oral-solid-dosage | biologics | api | qc-lab | packaging | custom",
  "requiredRooms": ["array", "of", "room", "template", "ids"],
  "estimatedSize": "small | medium | large",
  "specialRequirements": ["any special needs or constraints"],
  "matchedTemplate": "facility-template-id or null if custom"
}

Be specific about room types. Only suggest rooms from the Available Room Templates list.`;

    const userMessage = `Facility Description: ${request.description}

Constraints:
- Product Type: ${request.constraints.productType || 'not specified'}
- Batch Size: ${request.constraints.batchSize || 'not specified'}L
- Throughput: ${request.constraints.throughput || 'not specified'} units/day
- Max Cleanroom Class: ${request.constraints.maxCleanroomClass || 'D'}
- Required Rooms: ${request.constraints.requiredRooms?.join(', ') || 'none specified'}

Analyze this and extract requirements.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(responseText);
  }

  /**
   * Select appropriate template or build custom layout
   */
  private async selectOrBuildBaseLayout(requirements: any): Promise<Diagram> {
    // If there's a matched template, use it
    if (requirements.matchedTemplate) {
      const template = this.templatesService.getTemplateById(requirements.matchedTemplate);
      if (template) {
        console.log(`📋 Using facility template: ${template.name}`);

        // Use default parameters for now (in future, extract from requirements)
        const defaultParams: any = {};
        template.parameters.forEach(param => {
          defaultParams[param.id] = param.defaultValue;
        });

        return await this.templatesService.instantiateTemplate({
          templateId: template.id,
          parameters: defaultParams
        });
      }
    }

    // Build custom layout from required rooms
    console.log(`🏗️  Building custom layout with ${requirements.requiredRooms.length} rooms`);
    return await this.buildCustomLayout(requirements.requiredRooms);
  }

  /**
   * Build custom layout from list of required rooms
   */
  private async buildCustomLayout(roomTemplateIds: string[]): Promise<Diagram> {
    const nodes: FunctionalArea[] = [];
    const relationships: SpatialRelationship[] = [];

    const availableTemplates = await this.nodeTemplatesService.getTemplates();

    // Create nodes from template IDs
    for (const templateId of roomTemplateIds) {
      const template = availableTemplates.find((t: any) => t.id === templateId);
      if (template) {
        nodes.push({
          id: `node-${templateId}-${uuidv4()}`,
          name: template.name,
          category: template.category,
          cleanroomClass: template.cleanroomClass,
          ...template.defaultSize
        });
      }
    }

    // Infer relationships based on pharmaceutical logic
    relationships.push(...this.inferRelationships(nodes));

    // Calculate initial positions
    const positions = await this.spatialService.calculateLayoutPositions(nodes, relationships, {
      layoutStyle: 'clustered'
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
      name: 'Custom Facility Layout',
      nodes,
      relationships,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Infer logical relationships between rooms based on pharmaceutical workflows
   */
  private inferRelationships(nodes: FunctionalArea[]): SpatialRelationship[] {
    const relationships: SpatialRelationship[] = [];

    // Production sequence: Dispensing → Granulation → Blending → Compression/Filling
    const productionOrder = [
      'Dispensing Room',
      'Granulation Room',
      'Blending Room',
      'Compression Room',
      'Filling Room',
      'Coating Room',
      'Packaging Area'
    ];

    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];

      // Check if nodes follow production sequence
      const currentIndex = productionOrder.findIndex(name => currentNode.name.includes(name));
      const nextIndex = productionOrder.findIndex(name => nextNode.name.includes(name));

      if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
        relationships.push({
          id: `rel-${uuidv4()}`,
          type: 'MATERIAL_FLOW',
          fromId: currentNode.id,
          toId: nextNode.id,
          priority: 1,
          reason: 'Sequential production flow'
        });
      }
    }

    // Airlocks adjacent to sterile rooms
    const airlocks = nodes.filter(n => n.name.toLowerCase().includes('airlock'));
    const sterileRooms = nodes.filter(n => n.cleanroomClass === 'A' || n.cleanroomClass === 'B');

    for (const airlock of airlocks) {
      for (const sterileRoom of sterileRooms) {
        relationships.push({
          id: `rel-${uuidv4()}`,
          type: 'ADJACENT_TO',
          fromId: airlock.id,
          toId: sterileRoom.id,
          priority: 2,
          reason: 'Airlock protection for sterile area'
        });
      }
    }

    // Gowning rooms before sterile areas
    const gowningRooms = nodes.filter(n => n.name.toLowerCase().includes('gowning'));
    for (const gowning of gowningRooms) {
      for (const sterileRoom of sterileRooms) {
        relationships.push({
          id: `rel-${uuidv4()}`,
          type: 'PERSONNEL_FLOW',
          fromId: gowning.id,
          toId: sterileRoom.id,
          priority: 2,
          reason: 'Personnel must gown before entering sterile area'
        });
      }
    }

    // Warehouses connect to production
    const warehouses = nodes.filter(n => n.category === 'Warehouse');
    const productionRooms = nodes.filter(n => n.category === 'Production');

    if (warehouses.length > 0 && productionRooms.length > 0) {
      relationships.push({
        id: `rel-${uuidv4()}`,
        type: 'MATERIAL_FLOW',
        fromId: warehouses[0].id,
        toId: productionRooms[0].id,
        priority: 1,
        reason: 'Material supply from warehouse'
      });
    }

    // QC labs receive samples
    const qcLabs = nodes.filter(n => n.category === 'Quality Control');
    if (qcLabs.length > 0 && productionRooms.length > 0) {
      const lastProductionRoom = productionRooms[productionRooms.length - 1];
      relationships.push({
        id: `rel-${uuidv4()}`,
        type: 'MATERIAL_FLOW',
        fromId: lastProductionRoom.id,
        toId: qcLabs[0].id,
        priority: 3,
        reason: 'Sample transfer for testing'
      });
    }

    return relationships;
  }

  /**
   * Optimize layout positions and relationships
   */
  private async optimizeLayout(diagram: Diagram, preferences?: any): Promise<Diagram> {
    // Re-calculate positions with preferences
    const layoutStyle = preferences?.layoutStyle || 'clustered';

    const positions = await this.spatialService.calculateLayoutPositions(
      diagram.nodes,
      diagram.relationships,
      { layoutStyle }
    );

    // Update node positions
    positions.forEach((pos, nodeId) => {
      const node = diagram.nodes.find(n => n.id === nodeId);
      if (node) {
        node.x = pos.x;
        node.y = pos.y;
      }
    });

    return diagram;
  }

  /**
   * Create functional zones from nodes
   */
  private createZones(nodes: FunctionalArea[]): ZoneDefinition[] {
    const zones: ZoneDefinition[] = [];

    // Group by category
    const categories = [...new Set(nodes.map(n => n.category))];

    for (const category of categories) {
      const categoryNodes = nodes.filter(n => n.category === category);

      if (categoryNodes.length > 0) {
        zones.push({
          id: `zone-${category.toLowerCase().replace(/\s+/g, '-')}-${uuidv4()}`,
          name: `${category} Zone`,
          category: this.mapCategoryToZoneCategory(category),
          nodeIds: categoryNodes.map(n => n.id),
          color: this.getCategoryColor(category)
        });
      }
    }

    // Group by cleanroom class
    const cleanroomClasses = [...new Set(nodes.map(n => n.cleanroomClass).filter(Boolean))];

    for (const cleanroomClass of cleanroomClasses) {
      const classNodes = nodes.filter(n => n.cleanroomClass === cleanroomClass);

      if (classNodes.length > 1) {
        zones.push({
          id: `zone-class-${cleanroomClass}-${uuidv4()}`,
          name: `Cleanroom Class ${cleanroomClass} Zone`,
          category: 'production',
          nodeIds: classNodes.map(n => n.id),
          cleanroomClass: cleanroomClass as string,
          color: this.getCleanroomColor(cleanroomClass as string)
        });
      }
    }

    return zones;
  }

  /**
   * Calculate optimization metrics
   */
  private calculateMetrics(diagram: Diagram): OptimizationMetrics {
    const totalArea = diagram.nodes.reduce((sum, node) => {
      return sum + ((node.width || 150) * (node.height || 100)) / 10000; // Convert to sq meters
    }, 0);

    const materialFlows = diagram.relationships.filter(r => r.type === 'MATERIAL_FLOW');
    const personnelFlows = diagram.relationships.filter(r => r.type === 'PERSONNEL_FLOW');

    const avgMaterialDistance = this.calculateAverageFlowDistance(materialFlows, diagram.nodes);
    const avgPersonnelDistance = this.calculateAverageFlowDistance(personnelFlows, diagram.nodes);

    const cleanroomArea = diagram.nodes
      .filter(n => n.cleanroomClass && n.cleanroomClass !== 'CNC')
      .reduce((sum, node) => sum + ((node.width || 150) * (node.height || 100)) / 10000, 0);

    const cleanroomUtilization = totalArea > 0 ? (cleanroomArea / totalArea) * 100 : 0;

    // Flow efficiency: lower distance = higher efficiency
    const maxDistance = 5000; // Assume max distance
    const flowEfficiency = Math.max(0, 1 - avgMaterialDistance / maxDistance);

    // Cross-contamination risk (simplified)
    const prohibitedConnections = diagram.relationships.filter(r => r.type === 'PROHIBITED_NEAR').length;
    const crossContaminationRisk = Math.min(1, prohibitedConnections * 0.1);

    return {
      totalArea,
      flowEfficiency,
      crossContaminationRisk,
      averageMaterialDistance: Math.round(avgMaterialDistance),
      averagePersonnelDistance: Math.round(avgPersonnelDistance),
      cleanroomUtilization: Math.round(cleanroomUtilization)
    };
  }

  /**
   * Calculate average flow distance
   */
  private calculateAverageFlowDistance(flows: SpatialRelationship[], nodes: FunctionalArea[]): number {
    if (flows.length === 0) return 0;

    const totalDistance = flows.reduce((sum, flow) => {
      const fromNode = nodes.find(n => n.id === flow.fromId);
      const toNode = nodes.find(n => n.id === flow.toId);

      if (fromNode && toNode && fromNode.x !== undefined && fromNode.y !== undefined && toNode.x !== undefined && toNode.y !== undefined) {
        const distance = Math.sqrt(
          Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2)
        );
        return sum + distance;
      }

      return sum;
    }, 0);

    return totalDistance / flows.length;
  }

  /**
   * Generate human-readable rationale for design decisions
   */
  private async generateRationale(
    request: LayoutGenerationRequest,
    diagram: Diagram,
    complianceReport: any
  ): Promise<string> {
    const rationale = [
      `Generated pharmaceutical facility layout based on: "${request.description}".`,
      `The design includes ${diagram.nodes.length} functional areas organized into logical flow sequences.`,
      `Cleanroom classifications range from Class ${this.getHighestCleanroomClass(diagram.nodes)} (highest) to CNC (unclassified support areas).`,
      `Layout optimized for ${request.preferences?.prioritizeFlow || 'balanced'} flow patterns.`,
      `Compliance score: ${complianceReport.overallScore}/100 (${complianceReport.regulatoryZone} standards).`
    ];

    return rationale.join(' ');
  }

  /**
   * Generate warnings from compliance report
   */
  private generateWarnings(complianceReport: any): string[] {
    return complianceReport.results
      .filter((r: any) => !r.passed && r.severity === 'critical')
      .map((r: any) => r.message);
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(diagram: Diagram, complianceReport: any): string[] {
    const suggestions: string[] = [];

    // Suggest adding missing airlocks
    const sterileRooms = diagram.nodes.filter(n => n.cleanroomClass === 'A' || n.cleanroomClass === 'B');
    const airlocks = diagram.nodes.filter(n => n.name.toLowerCase().includes('airlock'));

    if (sterileRooms.length > airlocks.length) {
      suggestions.push('Consider adding more airlocks for sterile area protection');
    }

    // Suggest optimization
    const metrics = this.calculateMetrics(diagram);
    if (metrics.flowEfficiency < 0.6) {
      suggestions.push('Flow paths could be optimized to reduce material transfer distances');
    }

    if (metrics.cleanroomUtilization > 70) {
      suggestions.push('High cleanroom utilization - consider if all areas require controlled classification');
    }

    return suggestions;
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private mapCategoryToZoneCategory(category: string): 'production' | 'quality-control' | 'warehouse' | 'utilities' | 'support' {
    const mapping: Record<string, any> = {
      'Production': 'production',
      'Quality Control': 'quality-control',
      'Warehouse': 'warehouse',
      'Utilities': 'utilities',
      'Personnel': 'support',
      'Support': 'support'
    };

    return mapping[category] || 'support';
  }

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      'Production': '#4A90E2',
      'Quality Control': '#F5A623',
      'Warehouse': '#7ED321',
      'Utilities': '#9013FE',
      'Personnel': '#50E3C2',
      'Support': '#B8E986'
    };

    return colors[category] || '#D3D3D3';
  }

  private getCleanroomColor(cleanroomClass: string): string {
    const colors: Record<string, string> = {
      'A': '#DC143C',
      'B': '#FFA500',
      'C': '#4A90E2',
      'D': '#90EE90',
      'CNC': '#D3D3D3'
    };

    return colors[cleanroomClass] || '#D3D3D3';
  }

  private getHighestCleanroomClass(nodes: FunctionalArea[]): string {
    const classes = nodes.map(n => n.cleanroomClass).filter(Boolean);
    if (classes.includes('A')) return 'A';
    if (classes.includes('B')) return 'B';
    if (classes.includes('C')) return 'C';
    if (classes.includes('D')) return 'D';
    return 'CNC';
  }
}

export default GenerativeLayoutService;
