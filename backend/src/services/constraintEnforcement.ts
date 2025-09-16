import { SpatialRelationship, NodeCategory } from '../types';
import { getNodeNameVariations } from './ghostSuggestions';
import { StaticNodeTemplatesService } from './staticNodeTemplatesService';
import { 
  getTemplateById,
  getRelationshipsForTemplate,
  getRelationshipsByType,
  hasRelationship 
} from '../config/nodeTemplates';

export interface ConstraintValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  suggestions: string[];
}

export interface ConstraintViolation {
  type: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  ruleType: string;
  priority: number;
  reason: string;
}

export interface ShapeAssociationData {
  shapeId: string;
  nodeTemplateId: string;
  nodeTemplateName: string;
  category: NodeCategory;
  cleanroomClass?: string;
  customProperties?: Record<string, any>;
}

export interface ValidConnectionTarget {
  nodeId: string;
  nodeName: string;
  relationshipTypes: string[];
  confidence: number;
  reason: string;
}

export class ConstraintEnforcementService {
  private staticService: StaticNodeTemplatesService;

  constructor() {
    this.staticService = StaticNodeTemplatesService.getInstance();
  }

  /**
   * Associate a shape with a static node template and activate constraints
   */
  async associateShapeWithNode(associationData: ShapeAssociationData): Promise<{
    success: boolean;
    constraints: any[];
    message: string;
    nodeTemplate?: any;
    templateId?: string;
  }> {
    try {
      await this.staticService.initialize();
      
      console.log('🔗 Enhanced shape-node association started (static templates):', {
        shapeId: associationData.shapeId,
        templateId: associationData.nodeTemplateId,
        templateName: associationData.nodeTemplateName,
        category: associationData.category
      });

      // Enhanced template lookup with name variations using static templates
      const templateResult = await this.findStaticTemplateWithVariations(
        associationData.nodeTemplateId,
        associationData.nodeTemplateName
      );

      if (!templateResult.found) {
        const allTemplates = await this.staticService.getTemplates();
        const availableNames = allTemplates.map(t => t.name);
        
        console.warn('⚠️ Template not found after comprehensive search:', {
          originalId: associationData.nodeTemplateId,
          originalName: associationData.nodeTemplateName,
          variations: templateResult.searchedVariations,
          availableTemplates: availableNames
        });
        
        return {
          success: false,
          constraints: [],
          message: `Node template not found: ${associationData.nodeTemplateName}. Available templates: ${availableNames.join(', ')}`
        };
      }

      const foundTemplate = templateResult.template;
      console.log('✅ Template found successfully:', {
        id: foundTemplate.id,
        name: foundTemplate.name,
        category: foundTemplate.category,
        matchedBy: templateResult.matchedBy
      });

      // Get all constraints that apply to this node type using static relationships
      const constraints = this.getConstraintsForStaticTemplate(
        foundTemplate.id,
        foundTemplate.name
      );

      console.log(`✅ Constraint analysis complete:`, {
        templateName: foundTemplate.name,
        constraintsFound: constraints.length,
        constraintTypes: [...new Set(constraints.map(c => c.relationship.type))]
      });

      return {
        success: true,
        constraints,
        nodeTemplate: foundTemplate,
        templateId: foundTemplate.id,
        message: `Successfully associated shape with ${foundTemplate.name}. Found ${constraints.length} applicable constraints.`
      };

    } catch (error) {
      console.error('❌ Enhanced association error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        associationData
      });
      return {
        success: false,
        constraints: [],
        message: `Failed to associate shape: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Enhanced template lookup with comprehensive name variation handling using static templates
   */
  private async findStaticTemplateWithVariations(
    templateId: string,
    templateName: string
  ): Promise<{
    found: boolean;
    template?: any;
    matchedBy?: string;
    searchedVariations?: string[];
  }> {
    console.log('🔍 Starting comprehensive template search (static):', { templateId, templateName });
    
    const searchedVariations: string[] = [];
    
    // Strategy 1: Direct ID lookup
    try {
      const template = getTemplateById(templateId);
      searchedVariations.push(`ID: ${templateId}`);
      
      if (template) {
        console.log('✅ Found template by direct ID lookup');
        return {
          found: true,
          template,
          matchedBy: 'direct_id',
          searchedVariations
        };
      }
    } catch (error) {
      console.warn('⚠️ Direct ID lookup failed:', error);
    }

    // Strategy 2: Direct name lookup (case-insensitive)
    try {
      const allTemplates = await this.staticService.getTemplates();
      const directMatch = allTemplates.find(t => 
        t.name.toLowerCase() === templateName.toLowerCase()
      );
      searchedVariations.push(`Direct name: ${templateName}`);
      
      if (directMatch) {
        console.log('✅ Found template by direct name lookup');
        return {
          found: true,
          template: directMatch,
          matchedBy: 'direct_name',
          searchedVariations
        };
      }
    } catch (error) {
      console.warn('⚠️ Direct name lookup failed:', error);
    }

    // Strategy 3: Name variations lookup
    const nameVariations = getNodeNameVariations(templateName);
    console.log('🔄 Trying name variations:', nameVariations);
    
    for (const variation of nameVariations) {
      try {
        const allTemplates = await this.staticService.getTemplates();
        const variationMatch = allTemplates.find(t => 
          t.name.toLowerCase() === variation.toLowerCase()
        );
        searchedVariations.push(`Variation: ${variation}`);
        
        if (variationMatch) {
          console.log(`✅ Found template by name variation: ${variation}`);
          return {
            found: true,
            template: variationMatch,
            matchedBy: `variation: ${variation}`,
            searchedVariations
          };
        }
      } catch (error) {
        console.warn(`⚠️ Variation lookup failed for ${variation}:`, error);
      }
    }

    // Strategy 4: Partial name matching (contains)
    try {
      const allTemplates = await this.staticService.getTemplates();
      const partialMatches = allTemplates
        .map(template => ({
          template,
          score: template.name.toLowerCase() === templateName.toLowerCase() ? 3 :
                 template.name.toLowerCase().includes(templateName.toLowerCase()) ? 2 :
                 templateName.toLowerCase().includes(template.name.toLowerCase()) ? 1 : 0
        }))
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score);
      
      searchedVariations.push(`Partial match: ${templateName}`);
      
      if (partialMatches.length > 0) {
        console.log('✅ Found template by partial name matching');
        return {
          found: true,
          template: partialMatches[0].template,
          matchedBy: 'partial_match',
          searchedVariations
        };
      }
    } catch (error) {
      console.warn('⚠️ Partial matching failed:', error);
    }

    console.log('❌ Template not found after all strategies:', { searchedVariations });
    return {
      found: false,
      searchedVariations
    };
  }

  /**
   * Enhanced constraint retrieval with detailed logging using static relationships
   */
  private getConstraintsForStaticTemplate(
    templateId: string,
    templateName: string
  ): any[] {
    console.log('🔍 Retrieving constraints for template (static):', { templateId, templateName });
    
    try {
      // Get all relationships for this template
      const allRelationships = getRelationshipsForTemplate(templateId);
      
      const constraints = allRelationships.map(rel => {
        const isOutgoing = rel.fromTemplateId === templateId;
        const targetTemplateId = isOutgoing ? rel.toTemplateId : rel.fromTemplateId;
        const targetTemplate = getTemplateById(targetTemplateId);
        const sourceTemplate = getTemplateById(templateId);
        
        return {
          sourceNode: sourceTemplate,
          targetNode: targetTemplate,
          relationship: {
            type: rel.relationship.type,
            properties: rel.relationship,
            priority: rel.relationship.priority || 5,
            reason: rel.relationship.reason || `${rel.relationship.type} relationship`,
            flowDirection: rel.relationship.flowDirection,
            flowType: rel.relationship.flowType,
            minDistance: rel.relationship.minDistance,
            maxDistance: rel.relationship.maxDistance,
            direction: isOutgoing ? 'outgoing' : 'incoming'
          }
        };
      })
      .filter(constraint => constraint.sourceNode && constraint.targetNode) // Filter out invalid templates
      .sort((a, b) => {
        // Sort by priority DESC, then by type, then by target name
        const priorityDiff = (b.relationship.priority || 5) - (a.relationship.priority || 5);
        if (priorityDiff !== 0) return priorityDiff;
        
        const typeDiff = a.relationship.type.localeCompare(b.relationship.type);
        if (typeDiff !== 0) return typeDiff;
        
        return (a.targetNode?.name || '').localeCompare(b.targetNode?.name || '');
      });

      console.log('📋 Constraint retrieval summary:', {
        templateId,
        templateName,
        totalConstraints: constraints.length,
        constraintBreakdown: constraints.reduce((acc: any, c: any) => {
          const type = c.relationship.type;
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      return constraints;
    } catch (error) {
      console.error('❌ Error retrieving constraints:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        templateId,
        templateName
      });
      return [];
    }
  }

  /**
   * Validate if a connection between two nodes is allowed based on static template constraints
   */
  async validateConnection(
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType?: string
  ): Promise<ConstraintValidationResult> {
    try {
      await this.staticService.initialize();
      console.log('🔍 Validating connection (static):', { sourceNodeId, targetNodeId, relationshipType });

      // Get the static node templates for both nodes
      const sourceTemplate = getTemplateById(sourceNodeId);
      const targetTemplate = getTemplateById(targetNodeId);

      if (!sourceTemplate || !targetTemplate) {
        return {
          isValid: false,
          violations: [{
            type: 'ERROR',
            message: 'One or both nodes are not associated with static templates',
            ruleType: 'ASSOCIATION_REQUIRED',
            priority: 10,
            reason: 'Nodes must be associated with static templates for constraint validation'
          }],
          suggestions: ['Associate both shapes with appropriate static node templates']
        };
      }

      // Get all relationships between these node types
      const sourceRelationships = getRelationshipsForTemplate(sourceNodeId);
      const targetRelationships = getRelationshipsForTemplate(targetNodeId);
      
      // Find direct relationships between these two templates
      const directRelationships = sourceRelationships.filter(rel => 
        rel.toTemplateId === targetNodeId || rel.fromTemplateId === targetNodeId
      );

      const violations: ConstraintViolation[] = [];
      const suggestions: string[] = [];

      // Check for prohibited relationships
      const prohibitedRels = directRelationships.filter(rel => 
        rel.relationship.type === 'PROHIBITED_NEAR'
      );

      if (prohibitedRels.length > 0) {
        prohibitedRels.forEach(rel => {
          violations.push({
            type: 'ERROR',
            message: `Connection prohibited between ${sourceTemplate.name} and ${targetTemplate.name}`,
            ruleType: 'PROHIBITED_NEAR',
            priority: rel.relationship.priority || 8,
            reason: rel.relationship.reason || 'Pharmaceutical design constraints prohibit this connection'
          });
        });
      }

      // Check for required relationships if a specific type is requested
      if (relationshipType) {
        const requiredRels = directRelationships.filter(rel => 
          rel.relationship.type === relationshipType
        );

        if (requiredRels.length === 0) {
          violations.push({
            type: 'WARNING',
            message: `No explicit ${relationshipType} relationship defined between ${sourceTemplate.name} and ${targetTemplate.name}`,
            ruleType: 'UNDEFINED_RELATIONSHIP',
            priority: 5,
            reason: 'This connection type is not explicitly defined in the pharmaceutical design rules'
          });
          
          suggestions.push(`Consider if ${relationshipType} connection is appropriate for pharmaceutical facility design`);
        }
      }

      // Check for mandatory relationships that might be missing
      const requiredRels = directRelationships.filter(rel => 
        ['REQUIRES_ACCESS', 'ADJACENT_TO'].includes(rel.relationship.type)
      );

      if (requiredRels.length > 0) {
        const relationshipTypes = requiredRels.map(r => r.relationship.type);
        suggestions.push(`This connection supports required pharmaceutical design patterns: ${relationshipTypes.join(', ')}`);
      }

      const isValid = violations.filter(v => v.type === 'ERROR').length === 0;

      return {
        isValid,
        violations,
        suggestions
      };

    } catch (error) {
      console.error('❌ Error validating connection:', error);
      return {
        isValid: false,
        violations: [{
          type: 'ERROR',
          message: 'Failed to validate connection due to system error',
          ruleType: 'SYSTEM_ERROR',
          priority: 10,
          reason: error instanceof Error ? error.message : 'Unknown error'
        }],
        suggestions: []
      };
    }
  }

  /**
   * Validate edge superimposition between two nodes based on static template relationships
   * Returns whether edges can touch (ADJACENT_TO) or must remain separated (PROHIBITED_NEAR)
   */
  async validateEdgeSuperimposition(
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<{
    hasAdjacency: boolean;
    hasProhibition: boolean;
    canSuperimpose: boolean;
    minimumSeparation?: number;
    relationshipDetails?: {
      type: string;
      priority: number;
      reason: string;
    }[];
  }> {
    try {
      await this.staticService.initialize();
      console.log('🔍 Validating edge superimposition (static):', { sourceNodeId, targetNodeId });

      // Get the static node templates for both nodes
      const sourceTemplate = getTemplateById(sourceNodeId);
      const targetTemplate = getTemplateById(targetNodeId);

      if (!sourceTemplate || !targetTemplate) {
        console.log('⚠️ No templates found for edge validation');
        return {
          hasAdjacency: false,
          hasProhibition: false,
          canSuperimpose: false // Default: edges cannot superimpose without explicit permission
        };
      }

      // Check for relationships between these templates
      const hasAdjacency = hasRelationship(sourceNodeId, targetNodeId, 'ADJACENT_TO');
      const hasProhibition = hasRelationship(sourceNodeId, targetNodeId, 'PROHIBITED_NEAR');
      
      const relationshipDetails: any[] = [];
      
      // Get adjacency relationship details
      if (hasAdjacency) {
        const adjacentRels = getRelationshipsByType(sourceNodeId, 'ADJACENT_TO').filter(rel =>
          rel.fromTemplateId === targetNodeId || rel.toTemplateId === targetNodeId
        );
        
        adjacentRels.forEach(rel => {
          relationshipDetails.push({
            type: 'ADJACENT_TO',
            priority: rel.relationship.priority || 5,
            reason: rel.relationship.reason || 'Adjacency allowed between nodes'
          });
        });
      }
      
      // Get prohibition relationship details
      if (hasProhibition) {
        const prohibitedRels = getRelationshipsByType(sourceNodeId, 'PROHIBITED_NEAR').filter(rel =>
          rel.fromTemplateId === targetNodeId || rel.toTemplateId === targetNodeId
        );
        
        prohibitedRels.forEach(rel => {
          relationshipDetails.push({
            type: 'PROHIBITED_NEAR',
            priority: rel.relationship.priority || 8,
            reason: rel.relationship.reason || 'Proximity prohibited between nodes',
            minDistance: rel.relationship.minDistance || 10
          });
        });
      }

      // Determine if edge superimposition is allowed
      // Priority: PROHIBITED_NEAR overrides ADJACENT_TO
      const canSuperimpose = hasAdjacency && !hasProhibition;
      
      // Get minimum separation distance if prohibited
      let minimumSeparation = undefined;
      if (hasProhibition) {
        const prohibitedRels = getRelationshipsByType(sourceNodeId, 'PROHIBITED_NEAR').filter(rel =>
          rel.fromTemplateId === targetNodeId || rel.toTemplateId === targetNodeId
        );
        
        if (prohibitedRels.length > 0) {
          minimumSeparation = prohibitedRels[0].relationship.minDistance || 20;
        }
      }

      console.log(`✅ Edge validation result for ${sourceTemplate.name} <-> ${targetTemplate.name}:`, {
        hasAdjacency,
        hasProhibition,
        canSuperimpose,
        minimumSeparation
      });

      return {
        hasAdjacency,
        hasProhibition,
        canSuperimpose,
        minimumSeparation,
        relationshipDetails
      };

    } catch (error) {
      console.error('❌ Error validating edge superimposition:', error);
      return {
        hasAdjacency: false,
        hasProhibition: false,
        canSuperimpose: false
      };
    }
  }

  /**
   * Get valid connection targets for a given node using static templates
   */
  async getValidConnectionTargets(nodeId: string): Promise<ValidConnectionTarget[]> {
    try {
      await this.staticService.initialize();
      console.log('🎯 Getting valid connection targets (static):', nodeId);

      // Get all relationships for this node template
      const allRelationships = getRelationshipsForTemplate(nodeId);
      
      // Filter for valid connection types (exclude prohibited relationships)
      const validConnectionTypes = ['ADJACENT_TO', 'REQUIRES_ACCESS', 'SHARES_UTILITY', 'MATERIAL_FLOW', 'PERSONNEL_FLOW'];
      const validRelationships = allRelationships.filter(rel => 
        validConnectionTypes.includes(rel.relationship.type) &&
        rel.relationship.type !== 'PROHIBITED_NEAR'
      );

      // Group by target template ID to consolidate multiple relationship types
      const targetMap = new Map<string, {
        template: any;
        relationshipTypes: string[];
        priorities: number[];
        reasons: string[];
      }>();

      for (const rel of validRelationships) {
        const targetId = rel.fromTemplateId === nodeId ? rel.toTemplateId : rel.fromTemplateId;
        const targetTemplate = getTemplateById(targetId);
        
        if (!targetTemplate) continue;
        
        if (!targetMap.has(targetId)) {
          targetMap.set(targetId, {
            template: targetTemplate,
            relationshipTypes: [],
            priorities: [],
            reasons: []
          });
        }
        
        const target = targetMap.get(targetId)!;
        target.relationshipTypes.push(rel.relationship.type);
        target.priorities.push(rel.relationship.priority || 5);
        if (rel.relationship.reason) {
          target.reasons.push(rel.relationship.reason);
        }
      }

      // Convert to ValidConnectionTarget array
      const validTargets: ValidConnectionTarget[] = Array.from(targetMap.values()).map(target => {
        const avgPriority = target.priorities.reduce((sum, p) => sum + p, 0) / target.priorities.length;
        return {
          nodeId: target.template.id,
          nodeName: target.template.name,
          relationshipTypes: [...new Set(target.relationshipTypes)], // Remove duplicates
          confidence: Math.min(avgPriority / 10, 1.0),
          reason: target.reasons.length > 0 
            ? target.reasons.join('; ') 
            : 'Compatible pharmaceutical design connection'
        };
      }).sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending

      console.log(`✅ Found ${validTargets.length} valid connection targets`);
      return validTargets;

    } catch (error) {
      console.error('❌ Error getting valid connection targets:', error);
      return [];
    }
  }

  /**
   * Get all constraints that apply to a given node using static templates
   */
  async getNodeConstraints(nodeId: string): Promise<any[]> {
    try {
      await this.staticService.initialize();
      console.log('📋 Getting node constraints (static):', nodeId);

      // Get all relationships for this node template
      const allRelationships = getRelationshipsForTemplate(nodeId);

      const constraints = allRelationships.map(rel => {
        const isOutgoing = rel.fromTemplateId === nodeId;
        const otherTemplateId = isOutgoing ? rel.toTemplateId : rel.fromTemplateId;
        const otherTemplate = getTemplateById(otherTemplateId);
        
        return {
          relationship: {
            type: rel.relationship.type,
            properties: rel.relationship,
            direction: isOutgoing ? 'outgoing' : 'incoming'
          },
          otherNode: otherTemplate
        };
      })
      .filter(constraint => constraint.otherNode) // Filter out invalid templates
      .sort((a, b) => {
        // Sort by priority descending
        const priorityA = a.relationship.properties.priority || 5;
        const priorityB = b.relationship.properties.priority || 5;
        return priorityB - priorityA;
      });

      console.log(`✅ Found ${constraints.length} constraints for node ${nodeId}`);
      return constraints;

    } catch (error) {
      console.error('❌ Error getting node constraints:', error);
      return [];
    }
  }
}