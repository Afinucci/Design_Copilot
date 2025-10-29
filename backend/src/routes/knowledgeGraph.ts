import { Router } from 'express';
import Neo4jService from '../config/database';

const router = Router();

console.log('🔍 KnowledgeGraph route module loaded');

// Simple test endpoint
router.get('/test', (req, res) => {
  console.log('🔍 KnowledgeGraph test endpoint called');
  res.json({ message: 'Knowledge Graph route is working!' });
});

// Knowledge Graph Explorer endpoint
router.get('/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const confidence = parseFloat(req.query.confidence as string) || 0.3;
    
    console.log('🔍 KnowledgeGraph: Fetching graph data for node:', nodeId, 'with confidence:', confidence);

    const session = Neo4jService.getInstance().getDriver().session();
    
    try {
      // Enhanced query to get pharmaceutical facility relationships and context
      const query = `
        // First, try to find the node by exact ID match
        OPTIONAL MATCH (center:FunctionalArea {id: $nodeId})
        
        // If no exact match, try to find by name variations (for shape assignments)
        WITH center, 
             CASE WHEN center IS NULL 
                  THEN $nodeId 
                  ELSE center.name 
             END as searchName
        
        // Extract meaningful name from node ID if it's a shape ID
        WITH center, 
             CASE 
               WHEN searchName STARTS WITH 'shape-' THEN 
                 CASE 
                   WHEN searchName CONTAINS 'analytical' THEN 'Analytical Lab'
                   WHEN searchName CONTAINS 'coating' THEN 'Coating'
                   WHEN searchName CONTAINS 'compression' THEN 'Compression'
                   WHEN searchName CONTAINS 'packaging' THEN 'Packaging'
                   WHEN searchName CONTAINS 'weighing' THEN 'Weighing'
                   WHEN searchName CONTAINS 'granulation' THEN 'Granulation'
                   WHEN searchName CONTAINS 'quality' THEN 'Quality Control'
                   WHEN searchName CONTAINS 'storage' THEN 'Storage'
                   WHEN searchName CONTAINS 'warehouse' THEN 'Warehouse'
                   WHEN searchName CONTAINS 'lab' THEN 'Laboratory'
                   ELSE 'Production Area'
                 END
               ELSE searchName
             END as finalSearchName
        
        // Find the center node using name matching
        WITH center, finalSearchName
        OPTIONAL MATCH (centerByName:FunctionalArea) 
        WHERE toLower(centerByName.name) CONTAINS toLower(finalSearchName) 
           OR toLower(finalSearchName) CONTAINS toLower(centerByName.name)
        WITH COALESCE(center, centerByName) as centerNode, finalSearchName
        
        // If still no center node found, create sample pharmaceutical relationships
        WITH centerNode, finalSearchName,
             CASE WHEN centerNode IS NULL THEN true ELSE false END as useSample
        
        // Get real relationships if center node exists
        OPTIONAL MATCH (centerNode)-[r]-(connected:FunctionalArea)
        WHERE centerNode IS NOT NULL
        WITH centerNode, finalSearchName, useSample,
             collect({
               node: {
                 id: connected.id,
                 name: connected.name,
                 category: connected.category,
                 cleanroomClass: connected.cleanroomClass,
                 description: connected.description
               },
               relationship: properties(r),
               relType: type(r),
               confidence: COALESCE(r.priority / 10.0, 0.5),
               isOutgoing: startNode(r) = centerNode
             }) as realRelationships
        
        // Sample pharmaceutical relationships for when no center node exists
        WITH centerNode, finalSearchName, useSample, realRelationships,
             CASE WHEN useSample 
             THEN [
               {
                 node: {id: 'sample-qc-lab', name: 'QC Laboratory', category: 'Quality Control', cleanroomClass: 'Class B'},
                 relationship: {type: 'REQUIRES_ACCESS', reason: 'Quality testing required', priority: 8},
                 relType: 'REQUIRES_ACCESS',
                 confidence: 0.8
               },
               {
                 node: {id: 'sample-packaging', name: 'Packaging Area', category: 'Production', cleanroomClass: 'Class D'},
                 relationship: {type: 'MATERIAL_FLOW', reason: 'Process continuation', priority: 9, isOutgoing: true},
                 relType: 'MATERIAL_FLOW', 
                 confidence: 0.9
               },
               {
                 node: {id: 'sample-storage', name: 'Raw Materials Storage', category: 'Storage', cleanroomClass: 'Class D'},
                 relationship: {type: 'MATERIAL_FLOW', reason: 'Material supply', priority: 7, isOutgoing: false},
                 relType: 'MATERIAL_FLOW',
                 confidence: 0.7
               },
               {
                 node: {id: 'sample-utilities', name: 'HVAC Control Room', category: 'Utilities', cleanroomClass: 'N/A'},
                 relationship: {type: 'SHARES_UTILITY', reason: 'Environmental control', priority: 6},
                 relType: 'SHARES_UTILITY',
                 confidence: 0.6
               },
               {
                 node: {id: 'sample-compression', name: 'Compression Room', category: 'Production', cleanroomClass: 'Class C'},
                 relationship: {type: 'ADJACENT_TO', reason: 'Similar process requirements', priority: 7},
                 relType: 'ADJACENT_TO',
                 confidence: 0.75
               }
             ]
             ELSE []
             END as sampleRelationships
        
        // Combine real and sample relationships
        WITH centerNode, finalSearchName, useSample,
             CASE WHEN useSample THEN sampleRelationships ELSE realRelationships END as allRelationships
        
        // Filter by confidence threshold  
        WITH centerNode, finalSearchName, useSample, 
             [rel IN allRelationships WHERE rel.confidence >= $confidence] as filteredRelationships
        
        // Create center node if using samples
        WITH CASE WHEN useSample
             THEN {
               id: $nodeId,
               name: finalSearchName,
               category: CASE
                 WHEN finalSearchName CONTAINS 'Lab' THEN 'Quality Control'
                 WHEN finalSearchName CONTAINS 'Quality' THEN 'Quality Control'
                 WHEN finalSearchName CONTAINS 'Storage' THEN 'Storage'
                 WHEN finalSearchName CONTAINS 'Warehouse' THEN 'Storage'
                 WHEN finalSearchName CONTAINS 'Packaging' THEN 'Production'
                 ELSE 'Production'
               END,
               cleanroomClass: CASE
                 WHEN finalSearchName CONTAINS 'Lab' THEN 'Class B'
                 WHEN finalSearchName CONTAINS 'Quality' THEN 'Class B'
                 ELSE 'Class C'
               END
             }
             ELSE {
               id: centerNode.id,
               name: centerNode.name,
               category: centerNode.category,
               cleanroomClass: centerNode.cleanroomClass,
               description: centerNode.description
             }
             END as finalCenterNode,
             filteredRelationships, useSample
        
        // Return nodes and links (fix list comprehension syntax)
        UNWIND [finalCenterNode] + [rel IN filteredRelationships | rel.node] as node
        WITH finalCenterNode, filteredRelationships, useSample, collect(DISTINCT node) as allNodes
        
        RETURN
          allNodes,
          [rel IN filteredRelationships | {
            source: CASE
              WHEN rel.isOutgoing THEN finalCenterNode.id
              ELSE rel.node.id
            END,
            target: CASE
              WHEN rel.isOutgoing THEN rel.node.id
              ELSE finalCenterNode.id
            END,
            type: rel.relType,
            confidence: rel.confidence,
            reason: COALESCE(rel.relationship.reason, 'Pharmaceutical facility relationship'),
            priority: COALESCE(rel.relationship.priority, 5)
          }] as allLinks,
          useSample
      `;

      const result = await session.run(query, { 
        nodeId, 
        confidence 
      });

      if (result.records.length === 0) {
        console.log('🔍 KnowledgeGraph: No data found, returning empty graph');
        return res.json({ nodes: [], links: [] });
      }

      const record = result.records[0];
      const nodes = record.get('allNodes') || [];
      const links = record.get('allLinks') || [];
      const usedSample = record.get('useSample') || false;

      console.log(`🔍 KnowledgeGraph: Found ${nodes.length} nodes and ${links.length} links (sample: ${usedSample})`);

      // Process nodes for React Force Graph
      const processedNodes = nodes.map((node: any) => {
        // Handle both Neo4j node objects and plain objects
        const nodeData = node.properties || node;
        const nodeId_extracted = nodeData.id || `unknown-${Date.now()}`;

        return {
          id: nodeId_extracted,
          name: nodeData.name || 'Unknown',
          category: nodeData.category || 'Unknown',
          cleanroomGrade: nodeData.cleanroomClass,
          description: nodeData.description || `${nodeData.category || 'Unknown'} facility in pharmaceutical manufacturing`,
          val: nodeId_extracted === nodeId ? 20 : 10, // Make center node larger
        };
      });

      // Process links for React Force Graph  
      const processedLinks = links.map((link: any) => ({
        source: link.source,
        target: link.target,
        type: link.type,
        confidence: link.confidence,
        reason: link.reason,
        value: Math.max(link.confidence * 10, 1),
      }));

      const response = {
        nodes: processedNodes,
        links: processedLinks,
        metadata: {
          centerNodeId: nodeId,
          confidence,
          usedSampleData: usedSample,
          totalNodes: processedNodes.length,
          totalLinks: processedLinks.length,
          timestamp: new Date().toISOString()
        }
      };

      console.log('🔍 KnowledgeGraph: ✅ Returning knowledge graph data:', {
        nodes: processedNodes.length,
        links: processedLinks.length,
        sampleData: usedSample
      });

      res.json(response);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('🔍 KnowledgeGraph: ❌ Error fetching knowledge graph data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch knowledge graph data',
      details: error instanceof Error ? error.message : 'Unknown error',
      nodeId: req.params.nodeId
    });
  }
});

export default router;