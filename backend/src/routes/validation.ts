import { Router } from 'express';
import { ValidationResult, ValidationViolation, FunctionalArea } from '../types';
import { StaticNodeTemplatesService } from '../services/staticNodeTemplatesService';
import { 
  getRelationshipsByType,
  getTemplateById,
  hasRelationship,
  getRelationshipsForTemplate 
} from '../config/nodeTemplates';

const router = Router();

// Validate a diagram
router.post('/', async (req, res) => {
  try {
    const { nodes, relationships } = req.body;
    const violations: ValidationViolation[] = [];
    const staticService = StaticNodeTemplatesService.getInstance();
    await staticService.initialize();
    
    console.log('🔍 Validating diagram with static templates:', {
      nodeCount: nodes.length,
      relationshipCount: relationships.length
    });
    
    // Helper function to extract template ID from node ID
    const getTemplateId = (nodeId: string): string => {
      return nodeId.replace(/^node-/, '');
    };
    
    // Validation 1: Check prohibited adjacencies using static templates
    for (const node of nodes) {
      const templateId = getTemplateId(node.id);
      const prohibitedRels = getRelationshipsByType(templateId, 'PROHIBITED_NEAR');
      
      for (const rel of prohibitedRels) {
        const prohibitedTemplateId = rel.fromTemplateId === templateId 
          ? rel.toTemplateId 
          : rel.fromTemplateId;
        
        const prohibitedTemplate = getTemplateById(prohibitedTemplateId);
        if (!prohibitedTemplate) continue;
        
        // Check if prohibited node exists in diagram
        const prohibitedNode = nodes.find((n: any) => 
          getTemplateId(n.id) === prohibitedTemplateId
        );
        
        if (prohibitedNode) {
          // Calculate distance between nodes
          const distance = Math.sqrt(
            Math.pow(node.x - prohibitedNode.x, 2) + 
            Math.pow(node.y - prohibitedNode.y, 2)
          );
          
          const minDistance = rel.relationship.minDistance || 10;
          
          if (distance < minDistance) {
            violations.push({
              id: `prohibition-${node.id}-${prohibitedNode.id}`,
              type: 'ERROR',
              message: `${node.name} must be at least ${minDistance}m away from ${prohibitedNode.name}: ${rel.relationship.reason}`,
              nodeIds: [node.id, prohibitedNode.id],
              suggestion: `Increase distance between ${node.name} and ${prohibitedNode.name}`
            });
          }
        }
      }
    }
    
    // Validation 2: Check cleanroom classification transitions
    for (const rel of relationships) {
      const fromNode = nodes.find((n: any) => n.id === rel.fromId);
      const toNode = nodes.find((n: any) => n.id === rel.toId);
      
      if (fromNode && toNode) {
        // Get cleanroom classes from static templates
        const fromTemplateId = getTemplateId(fromNode.id);
        const toTemplateId = getTemplateId(toNode.id);
        const fromTemplate = getTemplateById(fromTemplateId);
        const toTemplate = getTemplateById(toTemplateId);
        
        const fromClass = fromTemplate?.cleanroomClass;
        const toClass = toTemplate?.cleanroomClass;
        
        if (fromClass && toClass) {
          // Check for invalid cleanroom transitions (A is cleanest, D is least clean)
          const cleanroomHierarchy = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
          const fromLevel = cleanroomHierarchy[fromClass as keyof typeof cleanroomHierarchy];
          const toLevel = cleanroomHierarchy[toClass as keyof typeof cleanroomHierarchy];
          
          if (Math.abs(fromLevel - toLevel) > 1) {
            violations.push({
              id: `cleanroom-${rel.id}`,
              type: 'WARNING',
              message: `Direct transition from cleanroom class ${fromClass} to ${toClass} may require airlock`,
              nodeIds: [rel.fromId, rel.toId],
              suggestion: `Consider adding airlock or staging area between ${fromNode.name} and ${toNode.name}`
            });
          }
        }
      }
    }
    
    // Validation 3: Check required adjacencies using static templates
    for (const node of nodes) {
      const templateId = getTemplateId(node.id);
      const adjacentRels = getRelationshipsByType(templateId, 'ADJACENT_TO');
      
      // Only check high priority adjacency requirements
      const requiredAdjacencies = adjacentRels.filter(rel => rel.relationship.priority >= 8);
      
      for (const rel of requiredAdjacencies) {
        const requiredTemplateId = rel.fromTemplateId === templateId 
          ? rel.toTemplateId 
          : rel.fromTemplateId;
        
        const requiredTemplate = getTemplateById(requiredTemplateId);
        if (!requiredTemplate) continue;
        
        // Check if required adjacent node exists in diagram
        const requiredNode = nodes.find((n: any) => 
          getTemplateId(n.id) === requiredTemplateId
        );
        
        if (!requiredNode) {
          violations.push({
            id: `missing-${node.id}-${requiredTemplateId}`,
            type: 'WARNING',
            message: `${node.name} should be adjacent to ${requiredTemplate.name}: ${rel.relationship.reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${requiredTemplate.name} near ${node.name}`
          });
        } else {
          // Check if they are actually adjacent (close enough)
          const distance = Math.sqrt(
            Math.pow(node.x - requiredNode.x, 2) + 
            Math.pow(node.y - requiredNode.y, 2)
          );
          
          if (distance > 200) { // Arbitrary threshold for "adjacent"
            violations.push({
              id: `far-${node.id}-${requiredNode.id}`,
              type: 'WARNING',
              message: `${node.name} and ${requiredTemplate.name} should be closer together: ${rel.relationship.reason}`,
              nodeIds: [node.id, requiredNode.id],
              suggestion: `Move ${node.name} and ${requiredTemplate.name} closer together`
            });
          }
        }
      }
    }
    
    // Validation 4: Check for overlapping nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i];
        const node2 = nodes[j];
        
        // Check for overlap (simple bounding box collision)
        if (node1.x < node2.x + (node2.width || 120) &&
            node1.x + (node1.width || 120) > node2.x &&
            node1.y < node2.y + (node2.height || 80) &&
            node1.y + (node1.height || 80) > node2.y) {
          
          violations.push({
            id: `overlap-${node1.id}-${node2.id}`,
            type: 'ERROR',
            message: `${node1.name} and ${node2.name} are overlapping`,
            nodeIds: [node1.id, node2.id],
            suggestion: `Separate ${node1.name} and ${node2.name}`
          });
        }
      }
    }
    
    // Validation 5: Check utility requirements using static templates
    for (const node of nodes) {
      const templateId = getTemplateId(node.id);
      const utilityRels = getRelationshipsByType(templateId, 'SHARES_UTILITY');
      
      // Only check high priority utility requirements
      const requiredUtilities = utilityRels.filter(rel => rel.relationship.priority >= 7);
      
      for (const rel of requiredUtilities) {
        const utilityTemplateId = rel.fromTemplateId === templateId 
          ? rel.toTemplateId 
          : rel.fromTemplateId;
        
        const utilityTemplate = getTemplateById(utilityTemplateId);
        if (!utilityTemplate) continue;
        
        const utilityNode = nodes.find((n: any) => 
          getTemplateId(n.id) === utilityTemplateId
        );
        
        if (!utilityNode) {
          violations.push({
            id: `utility-${node.id}-${utilityTemplateId}`,
            type: 'WARNING',
            message: `${node.name} requires ${utilityTemplate.name}: ${rel.relationship.reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${utilityTemplate.name} to support ${node.name}`
          });
        }
      }
    }
    
    // Validation 6: Check material flow continuity using static templates
    for (const node of nodes) {
      const templateId = getTemplateId(node.id);
      const materialFlowRels = getRelationshipsByType(templateId, 'MATERIAL_FLOW');
      
      // Only check high priority unidirectional flows
      const requiredFlows = materialFlowRels.filter(rel => 
        rel.relationship.priority >= 8 && 
        rel.relationship.flowDirection === 'unidirectional' &&
        rel.fromTemplateId === templateId // Only outgoing flows
      );
      
      for (const rel of requiredFlows) {
        const targetTemplateId = rel.toTemplateId;
        const targetTemplate = getTemplateById(targetTemplateId);
        if (!targetTemplate) continue;
        
        const targetNode = nodes.find((n: any) => 
          getTemplateId(n.id) === targetTemplateId
        );
        
        if (!targetNode) {
          const flowType = rel.relationship.flowType || 'material';
          violations.push({
            id: `material-flow-${node.id}-${targetTemplateId}`,
            type: 'WARNING',
            message: `${node.name} requires ${targetTemplate.name} for ${flowType} flow: ${rel.relationship.reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${targetTemplate.name} to complete ${flowType} flow from ${node.name}`
          });
        }
      }
    }
    
    // Validation 7: Check personnel flow access using static templates
    for (const node of nodes) {
      const templateId = getTemplateId(node.id);
      const personnelFlowRels = getRelationshipsByType(templateId, 'PERSONNEL_FLOW');
      
      // Only check high priority personnel flows
      const requiredPersonnelAccess = personnelFlowRels.filter(rel => 
        rel.relationship.priority >= 8 && 
        rel.relationship.flowType === 'personnel'
      );
      
      for (const rel of requiredPersonnelAccess) {
        const accessTemplateId = rel.fromTemplateId === templateId 
          ? rel.toTemplateId 
          : rel.fromTemplateId;
        
        const accessTemplate = getTemplateById(accessTemplateId);
        if (!accessTemplate) continue;
        
        const accessNode = nodes.find((n: any) => 
          getTemplateId(n.id) === accessTemplateId
        );
        
        if (!accessNode) {
          violations.push({
            id: `personnel-flow-${node.id}-${accessTemplateId}`,
            type: 'WARNING',
            message: `${node.name} requires access through ${accessTemplate.name}: ${rel.relationship.reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${accessTemplate.name} to provide personnel access to ${node.name}`
          });
        }
      }
    }
    
    const validationResult: ValidationResult = {
      isValid: violations.filter(v => v.type === 'ERROR').length === 0,
      violations
    };
    
    console.log('✅ Validation complete:', {
      totalViolations: violations.length,
      errors: violations.filter(v => v.type === 'ERROR').length,
      warnings: violations.filter(v => v.type === 'WARNING').length,
      isValid: validationResult.isValid
    });
    
    res.json(validationResult);
  } catch (error) {
    console.error('❌ Error validating diagram:', error);
    res.status(500).json({ 
      error: 'Failed to validate diagram',
      isValid: false,
      violations: []
    });
  }
});

// Get compliance requirements for a specific node type using static templates
router.get('/requirements/:nodeType', async (req, res) => {
  try {
    const { nodeType } = req.params;
    const staticService = StaticNodeTemplatesService.getInstance();
    await staticService.initialize();
    
    console.log('📋 Fetching requirements for node type:', nodeType);
    
    // Validate that the node type exists
    const template = getTemplateById(nodeType);
    if (!template) {
      return res.status(404).json({ error: 'Node type not found' });
    }
    
    // Get all relationships for this template
    const allRelationships = getRelationshipsForTemplate(nodeType);
    
    // Organize relationships by type
    const requirements = {
      adjacencies: [] as any[],
      prohibitions: [] as any[],
      utilities: [] as any[],
      materialFlows: [] as any[],
      personnelFlows: [] as any[]
    };
    
    for (const rel of allRelationships) {
      const targetTemplateId = rel.fromTemplateId === nodeType 
        ? rel.toTemplateId 
        : rel.fromTemplateId;
      
      const targetTemplate = getTemplateById(targetTemplateId);
      if (!targetTemplate) continue;
      
      const baseInfo = {
        target: targetTemplate.name,
        priority: rel.relationship.priority,
        reason: rel.relationship.reason
      };
      
      switch (rel.relationship.type) {
        case 'ADJACENT_TO':
          requirements.adjacencies.push({
            type: 'ADJACENT_TO',
            ...baseInfo
          });
          break;
          
        case 'PROHIBITED_NEAR':
          requirements.prohibitions.push({
            type: 'PROHIBITED_NEAR',
            ...baseInfo,
            minDistance: rel.relationship.minDistance || 10
          });
          break;
          
        case 'SHARES_UTILITY':
          requirements.utilities.push({
            type: 'SHARES_UTILITY',
            ...baseInfo
          });
          break;
          
        case 'MATERIAL_FLOW':
          requirements.materialFlows.push({
            type: 'MATERIAL_FLOW',
            ...baseInfo,
            flowDirection: rel.relationship.flowDirection || 'bidirectional',
            flowType: rel.relationship.flowType || 'material'
          });
          break;
          
        case 'PERSONNEL_FLOW':
          requirements.personnelFlows.push({
            type: 'PERSONNEL_FLOW',
            ...baseInfo,
            flowDirection: rel.relationship.flowDirection || 'bidirectional',
            flowType: rel.relationship.flowType || 'personnel'
          });
          break;
      }
    }
    
    console.log('✅ Requirements fetched:', {
      nodeType,
      templateName: template.name,
      totalRelationships: allRelationships.length,
      adjacencies: requirements.adjacencies.length,
      prohibitions: requirements.prohibitions.length,
      utilities: requirements.utilities.length,
      materialFlows: requirements.materialFlows.length,
      personnelFlows: requirements.personnelFlows.length
    });
    
    res.json(requirements);
  } catch (error) {
    console.error('❌ Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  }
});

// Validate edge superimposition between two nodes
router.post('/edge-superimposition', async (req, res) => {
  try {
    const { sourceNodeId, targetNodeId } = req.body;
    
    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({ 
        error: 'Both sourceNodeId and targetNodeId are required' 
      });
    }
    
    // Import constraint enforcement service
    const { ConstraintEnforcementService } = await import('../services/constraintEnforcement');
    const constraintService = new ConstraintEnforcementService();
    
    // Validate edge superimposition
    const result = await constraintService.validateEdgeSuperimposition(
      sourceNodeId,
      targetNodeId
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error validating edge superimposition:', error);
    res.status(500).json({ 
      error: 'Failed to validate edge superimposition',
      hasAdjacency: false,
      hasProhibition: false,
      canSuperimpose: false
    });
  }
});

export default router;