import { Router } from 'express';
import { Session } from 'neo4j-driver';
import Neo4jService from '../config/database';
import { ValidationResult, ValidationViolation, FunctionalArea } from '../types';

const router = Router();

// Validate a diagram
router.post('/', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { nodes, relationships } = req.body;
    const violations: ValidationViolation[] = [];
    
    // Validation 1: Check prohibited adjacencies
    for (const node of nodes) {
      const prohibitedResult = await session.run(
        `MATCH (nt1:NodeTemplate {id: $nodeId})-[r:PROHIBITED_NEAR]->(nt2:NodeTemplate)
         RETURN nt2.id as prohibitedId, r.reason as reason, r.minDistance as minDistance`,
        { nodeId: node.id.replace(/^node-/, '') }
      );
      
      for (const record of prohibitedResult.records) {
        const prohibitedId = record.get('prohibitedId');
        const reason = record.get('reason');
        const minDistance = record.get('minDistance');
        
        // Check if prohibited node exists in diagram
        const prohibitedNode = nodes.find((n: any) => n.id.includes(prohibitedId));
        if (prohibitedNode) {
          // Calculate distance between nodes
          const distance = Math.sqrt(
            Math.pow(node.x - prohibitedNode.x, 2) + 
            Math.pow(node.y - prohibitedNode.y, 2)
          );
          
          if (distance < minDistance) {
            violations.push({
              id: `prohibition-${node.id}-${prohibitedNode.id}`,
              type: 'ERROR',
              message: `${node.name} must be at least ${minDistance}m away from ${prohibitedNode.name}: ${reason}`,
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
      
      if (fromNode && toNode && fromNode.cleanroomClass && toNode.cleanroomClass) {
        const fromClass = fromNode.cleanroomClass;
        const toClass = toNode.cleanroomClass;
        
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
    
    // Validation 3: Check required adjacencies
    for (const node of nodes) {
      const requiredResult = await session.run(
        `MATCH (nt1:NodeTemplate {id: $nodeId})-[r:ADJACENT_TO]->(nt2:NodeTemplate)
         WHERE r.priority >= 8
         RETURN nt2.id as requiredId, nt2.name as requiredName, r.reason as reason`,
        { nodeId: node.id.replace(/^node-/, '') }
      );
      
      for (const record of requiredResult.records) {
        const requiredId = record.get('requiredId');
        const requiredName = record.get('requiredName');
        const reason = record.get('reason');
        
        // Check if required adjacent node exists in diagram
        const requiredNode = nodes.find((n: any) => n.id.includes(requiredId));
        if (!requiredNode) {
          violations.push({
            id: `missing-${node.id}-${requiredId}`,
            type: 'WARNING',
            message: `${node.name} should be adjacent to ${requiredName}: ${reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${requiredName} near ${node.name}`
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
              message: `${node.name} and ${requiredName} should be closer together: ${reason}`,
              nodeIds: [node.id, requiredNode.id],
              suggestion: `Move ${node.name} and ${requiredName} closer together`
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
    
    // Validation 5: Check utility requirements
    for (const node of nodes) {
      const utilityResult = await session.run(
        `MATCH (nt1:NodeTemplate {id: $nodeId})-[r:SHARES_UTILITY]->(nt2:NodeTemplate)
         WHERE r.priority >= 7
         RETURN nt2.id as utilityId, nt2.name as utilityName, r.reason as reason`,
        { nodeId: node.id.replace(/^node-/, '') }
      );
      
      for (const record of utilityResult.records) {
        const utilityId = record.get('utilityId');
        const utilityName = record.get('utilityName');
        const reason = record.get('reason');
        
        const utilityNode = nodes.find((n: any) => n.id.includes(utilityId));
        if (!utilityNode) {
          violations.push({
            id: `utility-${node.id}-${utilityId}`,
            type: 'WARNING',
            message: `${node.name} requires ${utilityName}: ${reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${utilityName} to support ${node.name}`
          });
        }
      }
    }
    
    // Validation 6: Check material flow continuity
    for (const node of nodes) {
      const materialFlowResult = await session.run(
        `MATCH (nt1:NodeTemplate {id: $nodeId})-[r:MATERIAL_FLOW]->(nt2:NodeTemplate)
         WHERE r.priority >= 8 AND r.flowDirection = 'unidirectional'
         RETURN nt2.id as targetId, nt2.name as targetName, r.reason as reason, r.flowType as flowType`,
        { nodeId: node.id.replace(/^node-/, '') }
      );
      
      for (const record of materialFlowResult.records) {
        const targetId = record.get('targetId');
        const targetName = record.get('targetName');
        const reason = record.get('reason');
        const flowType = record.get('flowType');
        
        const targetNode = nodes.find((n: any) => n.id.includes(targetId));
        if (!targetNode) {
          violations.push({
            id: `material-flow-${node.id}-${targetId}`,
            type: 'WARNING',
            message: `${node.name} requires ${targetName} for ${flowType} flow: ${reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${targetName} to complete ${flowType} flow from ${node.name}`
          });
        }
      }
    }
    
    // Validation 7: Check personnel flow access
    for (const node of nodes) {
      const personnelFlowResult = await session.run(
        `MATCH (nt1:NodeTemplate {id: $nodeId})-[r:PERSONNEL_FLOW]->(nt2:NodeTemplate)
         WHERE r.priority >= 8 AND r.flowType = 'personnel'
         RETURN nt2.id as accessId, nt2.name as accessName, r.reason as reason`,
        { nodeId: node.id.replace(/^node-/, '') }
      );
      
      for (const record of personnelFlowResult.records) {
        const accessId = record.get('accessId');
        const accessName = record.get('accessName');
        const reason = record.get('reason');
        
        const accessNode = nodes.find((n: any) => n.id.includes(accessId));
        if (!accessNode) {
          violations.push({
            id: `personnel-flow-${node.id}-${accessId}`,
            type: 'WARNING',
            message: `${node.name} requires access through ${accessName}: ${reason}`,
            nodeIds: [node.id],
            suggestion: `Add ${accessName} to provide personnel access to ${node.name}`
          });
        }
      }
    }
    
    const validationResult: ValidationResult = {
      isValid: violations.filter(v => v.type === 'ERROR').length === 0,
      violations
    };
    
    res.json(validationResult);
  } catch (error) {
    console.error('Error validating diagram:', error);
    res.status(500).json({ error: 'Failed to validate diagram' });
  } finally {
    await session.close();
  }
});

// Get compliance requirements for a specific node type
router.get('/requirements/:nodeType', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();
  
  try {
    const { nodeType } = req.params;
    
    const result = await session.run(
      `MATCH (nt:NodeTemplate {id: $nodeType})
       OPTIONAL MATCH (nt)-[r1:ADJACENT_TO]->(required:NodeTemplate)
       OPTIONAL MATCH (nt)-[r2:PROHIBITED_NEAR]->(prohibited:NodeTemplate)
       OPTIONAL MATCH (nt)-[r3:SHARES_UTILITY]->(utility:NodeTemplate)
       OPTIONAL MATCH (nt)-[r4:MATERIAL_FLOW]->(material:NodeTemplate)
       OPTIONAL MATCH (nt)-[r5:PERSONNEL_FLOW]->(personnel:NodeTemplate)
       RETURN 
         collect(DISTINCT {type: 'ADJACENT_TO', target: required.name, priority: r1.priority, reason: r1.reason}) as adjacencies,
         collect(DISTINCT {type: 'PROHIBITED_NEAR', target: prohibited.name, priority: r2.priority, reason: r2.reason, minDistance: r2.minDistance}) as prohibitions,
         collect(DISTINCT {type: 'SHARES_UTILITY', target: utility.name, priority: r3.priority, reason: r3.reason}) as utilities,
         collect(DISTINCT {type: 'MATERIAL_FLOW', target: material.name, priority: r4.priority, reason: r4.reason, flowDirection: r4.flowDirection, flowType: r4.flowType}) as materialFlows,
         collect(DISTINCT {type: 'PERSONNEL_FLOW', target: personnel.name, priority: r5.priority, reason: r5.reason, flowDirection: r5.flowDirection, flowType: r5.flowType}) as personnelFlows`,
      { nodeType }
    );
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node type not found' });
    }
    
    const record = result.records[0];
    const requirements = {
      adjacencies: record.get('adjacencies').filter((adj: any) => adj.target !== null),
      prohibitions: record.get('prohibitions').filter((proh: any) => proh.target !== null),
      utilities: record.get('utilities').filter((util: any) => util.target !== null),
      materialFlows: record.get('materialFlows').filter((flow: any) => flow.target !== null),
      personnelFlows: record.get('personnelFlows').filter((flow: any) => flow.target !== null)
    };
    
    res.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch requirements' });
  } finally {
    await session.close();
  }
});

export default router;