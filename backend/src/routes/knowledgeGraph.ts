import { Router } from 'express';
import Neo4jService from '../config/database';

const router = Router();

console.log('🔍 KnowledgeGraph route module loaded');

// Simple test endpoint
router.get('/test', (req, res) => {
  console.log('🔍 KnowledgeGraph test endpoint called');
  res.json({ message: 'Knowledge Graph route is working!' });
});

// Export entire Neo4j graph - MUST BE BEFORE /:nodeId route!
router.get('/export-all', async (req, res) => {
  try {
    console.log('📤 KnowledgeGraph: Exporting entire Neo4j graph...');

    const session = Neo4jService.getInstance().getDriver().session();

    try {
      // Query to get all FunctionalArea nodes and their relationships
      const query = `
        // Get all FunctionalArea nodes
        MATCH (n:FunctionalArea)
        OPTIONAL MATCH (n)-[r]-(connected:FunctionalArea)

        WITH n, collect(DISTINCT {
          node: connected,
          relationship: r,
          relType: type(r),
          isOutgoing: startNode(r) = n
        }) as relationships

        RETURN collect({
          node: {
            id: n.id,
            name: n.name,
            category: n.category,
            cleanroomClass: n.cleanroomClass,
            description: n.description,
            equipment: n.equipment,
            color: n.color
          },
          relationships: [rel IN relationships WHERE rel.node IS NOT NULL | {
            connectedNodeId: rel.node.id,
            connectedNodeName: rel.node.name,
            type: rel.relType,
            priority: COALESCE(rel.relationship.priority, 5),
            reason: COALESCE(rel.relationship.reason, 'Neo4j relationship'),
            flowDirection: rel.relationship.flowDirection,
            doorType: rel.relationship.doorType,
            flowType: rel.relationship.flowType,
            minDistance: rel.relationship.minDistance,
            maxDistance: rel.relationship.maxDistance,
            isOutgoing: rel.isOutgoing
          }]
        }) as nodesWithRelationships
      `;

      const result = await session.run(query);

      if (result.records.length === 0 || !result.records[0].get('nodesWithRelationships') || result.records[0].get('nodesWithRelationships').length === 0) {
        console.log('📤 KnowledgeGraph: No data found in Neo4j');
        return res.json({
          nodes: [],
          relationships: [],
          metadata: {
            totalNodes: 0,
            totalRelationships: 0,
            timestamp: new Date().toISOString()
          }
        });
      }

      const nodesWithRelationships = result.records[0].get('nodesWithRelationships');

      console.log('📤 KnowledgeGraph: Processing Neo4j data...', {
        itemCount: nodesWithRelationships.length,
        sampleItem: nodesWithRelationships[0] ? {
          nodeId: nodesWithRelationships[0].node?.id,
          nodeName: nodesWithRelationships[0].node?.name,
          relationshipsCount: nodesWithRelationships[0].relationships?.length
        } : null
      });

      // Process nodes
      const nodesMap = new Map();
      const relationshipsSet = new Set();

      nodesWithRelationships.forEach((item: any, index: number) => {
        try {
          const node = item.node;
          if (!node || !node.id) {
            console.warn(`📤 Skipping item ${index}: missing node or node.id`);
            return;
          }

          if (!nodesMap.has(node.id)) {
            nodesMap.set(node.id, {
              id: node.id,
              name: node.name || 'Unnamed Node',
              category: node.category || 'Unknown',
              cleanroomClass: node.cleanroomClass || 'N/A',
              description: node.description || '',
              equipment: Array.isArray(node.equipment) ? node.equipment : [],
              color: node.color || '#90CAF9'
            });
          }

          // Process relationships
          if (Array.isArray(item.relationships)) {
            item.relationships.forEach((rel: any) => {
              if (!rel || !rel.connectedNodeId) return;

              const relKey = rel.isOutgoing
                ? `${node.id}-${rel.connectedNodeId}-${rel.type}`
                : `${rel.connectedNodeId}-${node.id}-${rel.type}`;

              if (!relationshipsSet.has(relKey)) {
                relationshipsSet.add(relKey);
              }
            });
          }
        } catch (err) {
          console.error(`📤 Error processing item ${index}:`, err);
        }
      });

      // Build unique relationships
      const relationships: any[] = [];
      nodesWithRelationships.forEach((item: any) => {
        try {
          const sourceNodeId = item.node?.id;
          if (!sourceNodeId) return;

          if (Array.isArray(item.relationships)) {
            item.relationships.forEach((rel: any) => {
              if (!rel || !rel.connectedNodeId) return;

              // Only add outgoing relationships to avoid duplicates
              if (rel.isOutgoing) {
                const relId = `rel-${sourceNodeId}-${rel.connectedNodeId}-${rel.type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                relationships.push({
                  id: relId,
                  fromId: sourceNodeId,
                  toId: rel.connectedNodeId,
                  type: rel.type || 'RELATED_TO',
                  priority: rel.priority ?? 5,
                  reason: rel.reason || 'Neo4j relationship',
                  flowDirection: rel.flowDirection || null,
                  doorType: rel.doorType || null,
                  flowType: rel.flowType || null,
                  minDistance: rel.minDistance ?? null,
                  maxDistance: rel.maxDistance ?? null
                });
              }
            });
          }
        } catch (err) {
          console.error('📤 Error processing relationships:', err);
        }
      });

      // Deduplicate relationships
      const uniqueRelationships = Array.from(
        new Map(relationships.map(rel => [
          `${rel.fromId}-${rel.toId}-${rel.type}`,
          rel
        ])).values()
      );

      const nodes = Array.from(nodesMap.values());

      console.log(`📤 KnowledgeGraph: ✅ Exported ${nodes.length} nodes and ${uniqueRelationships.length} relationships`);
      console.log('📤 Sample node:', nodes[0]);
      console.log('📤 Sample relationship:', uniqueRelationships[0]);
      console.log('📤 Total relationships before dedup:', relationships.length);

      const responseData = {
        nodes,
        relationships: uniqueRelationships,
        metadata: {
          totalNodes: nodes.length,
          totalRelationships: uniqueRelationships.length,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📤 Response structure:', {
        hasNodes: !!responseData.nodes,
        isNodesArray: Array.isArray(responseData.nodes),
        nodesLength: responseData.nodes?.length,
        hasRelationships: !!responseData.relationships,
        isRelationshipsArray: Array.isArray(responseData.relationships),
        relationshipsLength: responseData.relationships?.length
      });

      res.json(responseData);

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('📤 KnowledgeGraph: ❌ Error exporting graph:', error);
    res.status(500).json({
      error: 'Failed to export knowledge graph',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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