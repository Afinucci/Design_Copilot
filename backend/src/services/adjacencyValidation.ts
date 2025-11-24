import { Driver } from 'neo4j-driver';

export interface AdjacencyValidationResult {
  canBeAdjacent: boolean;
  relationshipType?: string;
  reason: string;
  confidence: number;
}

export interface BulkAdjacencyRequest {
  nodeId1: string;
  nodeId2: string;
}

export interface BulkAdjacencyResult {
  nodeId1: string;
  nodeId2: string;
  canBeAdjacent: boolean;
  relationshipType?: string;
  reason: string;
}

export class AdjacencyValidationService {
  private driver: Driver;
  private adjacencyCache = new Map<string, AdjacencyValidationResult>();

  constructor(driver: Driver) {
    this.driver = driver;
  }

  /**
   * Check if two Neo4j nodes can be adjacent based on their relationships
   */
  async validateAdjacency(nodeId1: string, nodeId2: string): Promise<AdjacencyValidationResult> {
    const cacheKey = `${nodeId1}-${nodeId2}`;
    const reverseCacheKey = `${nodeId2}-${nodeId1}`;
    
    // Check cache first
    if (this.adjacencyCache.has(cacheKey)) {
      return this.adjacencyCache.get(cacheKey)!;
    }
    if (this.adjacencyCache.has(reverseCacheKey)) {
      return this.adjacencyCache.get(reverseCacheKey)!;
    }

    const session = this.driver.session();
    
    try {
      // Query for direct adjacency relationships
      const adjacencyQuery = `
        MATCH (n1:FunctionalArea {name: $nodeId1})
        MATCH (n2:FunctionalArea {name: $nodeId2})
        OPTIONAL MATCH (n1)-[r1:ADJACENT_TO]-(n2)
        OPTIONAL MATCH (n1)-[r2:PROHIBITED_NEAR]-(n2)
        RETURN n1, n2, r1, r2,
               n1.name as node1Name, n2.name as node2Name,
               n1.category as node1Category, n2.category as node2Category
      `;

      const result = await session.run(adjacencyQuery, { nodeId1, nodeId2 });

      if (result.records.length === 0) {
        const noNodeResult: AdjacencyValidationResult = {
          canBeAdjacent: false,
          reason: `One or both nodes not found in knowledge graph: ${nodeId1}, ${nodeId2}`,
          confidence: 0
        };
        this.adjacencyCache.set(cacheKey, noNodeResult);
        return noNodeResult;
      }

      const record = result.records[0];
      const prohibitionRel = record.get('r2');
      const adjacencyRel = record.get('r1');

      // Check for explicit prohibition first
      if (prohibitionRel) {
        const prohibitedResult: AdjacencyValidationResult = {
          canBeAdjacent: false,
          reason: prohibitionRel.properties.reason || 'These areas are prohibited from being adjacent by GMP guidelines',
          confidence: 1.0
        };
        this.adjacencyCache.set(cacheKey, prohibitedResult);
        return prohibitedResult;
      }

      // Check for explicit adjacency relationship (ONLY ADJACENT_TO qualifies)
      if (adjacencyRel) {
        const relationship = adjacencyRel;
        const allowedResult: AdjacencyValidationResult = {
          canBeAdjacent: true,
          relationshipType: relationship.type,
          reason: relationship.properties.reason || 'Areas are designed to be adjacent according to pharmaceutical facility guidelines',
          confidence: 1.0
        };
        this.adjacencyCache.set(cacheKey, allowedResult);
        return allowedResult;
      }

      // If no explicit relationship exists, check category-level rules
      const node1Category = record.get('node1Category');
      const node2Category = record.get('node2Category');

      if (node1Category && node2Category) {
        const categoryResult = await this.validateCategoryAdjacency(node1Category, node2Category);
        this.adjacencyCache.set(cacheKey, categoryResult);
        return categoryResult;
      }

      // Default: no relationship found
      const noRelationshipResult: AdjacencyValidationResult = {
        canBeAdjacent: false,
        reason: 'No adjacency relationship defined between these pharmaceutical areas',
        confidence: 0.8
      };
      this.adjacencyCache.set(cacheKey, noRelationshipResult);
      return noRelationshipResult;

    } catch (error) {
      console.error('Error validating adjacency:', error);
      return {
        canBeAdjacent: false,
        reason: 'Error checking adjacency rules - connection blocked for safety',
        confidence: 0
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Validate adjacency based on category-level rules
   */
  private async validateCategoryAdjacency(category1: string, category2: string): Promise<AdjacencyValidationResult> {
    const session = this.driver.session();
    
    try {
      const categoryQuery = `
        MATCH (c1:Category {name: $category1})
        MATCH (c2:Category {name: $category2})
        OPTIONAL MATCH (c1)-[r1:CATEGORY_ADJACENT_TO]-(c2)
        OPTIONAL MATCH (c1)-[r2:CATEGORY_PROHIBITED_NEAR]-(c2)
        RETURN r1, r2
      `;

      const result = await session.run(categoryQuery, { category1, category2 });

      if (result.records.length > 0) {
        const record = result.records[0];
        const categoryProhibition = record.get('r2');
        const categoryAdjacency = record.get('r1');

        if (categoryProhibition) {
          return {
            canBeAdjacent: false,
            reason: `${category1} and ${category2} categories cannot be adjacent by design standards`,
            confidence: 0.7
          };
        }

        if (categoryAdjacency) {
          return {
            canBeAdjacent: true,
            relationshipType: 'CATEGORY_ADJACENT_TO',
            reason: `${category1} and ${category2} categories can be adjacent`,
            confidence: 0.6
          };
        }
      }

      // Apply default pharmaceutical facility rules
      return this.applyDefaultPharmaceuticalRules(category1, category2);

    } catch (error) {
      console.error('Error validating category adjacency:', error);
      return {
        canBeAdjacent: false,
        reason: 'Error checking category rules - connection blocked for safety',
        confidence: 0
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Apply default pharmaceutical facility design rules
   */
  private applyDefaultPharmaceuticalRules(category1: string, category2: string): AdjacencyValidationResult {
    const prohibitedAdjacencies = [
      ['Waste Management', 'Sterile Processing'],
      ['Raw Material Storage', 'Finished Product Storage'],
      ['Personnel Entry', 'Material Exit'],
      ['Contaminated Area', 'Clean Area']
    ];

    const allowedAdjacencies = [
      ['Manufacturing', 'Quality Control'],
      ['Preparation', 'Manufacturing'],
      ['Material Storage', 'Preparation'],
      ['Personnel Entry', 'Personnel Exit']
    ];

    // Check prohibitions
    for (const [cat1, cat2] of prohibitedAdjacencies) {
      if ((category1 === cat1 && category2 === cat2) || (category1 === cat2 && category2 === cat1)) {
        return {
          canBeAdjacent: false,
          reason: `${category1} and ${category2} cannot be adjacent due to contamination risk`,
          confidence: 0.5
        };
      }
    }

    // Check allowed adjacencies
    for (const [cat1, cat2] of allowedAdjacencies) {
      if ((category1 === cat1 && category2 === cat2) || (category1 === cat2 && category2 === cat1)) {
        return {
          canBeAdjacent: true,
          relationshipType: 'DEFAULT_ADJACENT_TO',
          reason: `${category1} and ${category2} can be adjacent for operational efficiency`,
          confidence: 0.4
        };
      }
    }

    return {
      canBeAdjacent: false,
      reason: `No specific adjacency rule defined for ${category1} and ${category2}`,
      confidence: 0.3
    };
  }

  /**
   * Validate multiple adjacency pairs in bulk for performance
   */
  async validateBulkAdjacency(requests: BulkAdjacencyRequest[]): Promise<BulkAdjacencyResult[]> {
    const results: BulkAdjacencyResult[] = [];
    
    // Process in batches to avoid overwhelming Neo4j
    const batchSize = 10;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(async (request) => {
        const validation = await this.validateAdjacency(request.nodeId1, request.nodeId2);
        return {
          nodeId1: request.nodeId1,
          nodeId2: request.nodeId2,
          canBeAdjacent: validation.canBeAdjacent,
          relationshipType: validation.relationshipType,
          reason: validation.reason
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Clear the adjacency cache (useful for testing or when knowledge graph is updated)
   */
  clearCache(): void {
    this.adjacencyCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.adjacencyCache.size,
      keys: Array.from(this.adjacencyCache.keys())
    };
  }
}