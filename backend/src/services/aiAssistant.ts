import Anthropic from '@anthropic-ai/sdk';
import Neo4jService from '../config/database';

interface QueryResult {
  query: string;
  results: any[];
  explanation: string;
}

class AIAssistantService {
  private anthropic: Anthropic;
  private neo4jService: Neo4jService;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });

    this.neo4jService = Neo4jService.getInstance();
  }

  /**
   * Database schema for context
   */
  private getDatabaseSchema(): string {
    return `
Neo4j Database Schema for Pharmaceutical Facility Design:

NODE TYPES:
1. NodeTemplate
   Properties: id, name, category, cleanroomClass, description, requiredAdjacencies, prohibitedAdjacencies

2. FunctionalArea
   Properties: id, name, category, cleanroomClass, description, x, y, width, height

3. Diagram
   Properties: id, name, description, createdAt, updatedAt

RELATIONSHIP TYPES:
1. ADJACENT_TO
   Properties: required (boolean), reason (string)
   Description: Indicates two areas should be positioned next to each other

2. PROHIBITED_NEAR
   Properties: reason (string)
   Description: Indicates two areas cannot be placed near each other

3. REQUIRES_ACCESS
   Properties: accessType (string)
   Description: Indicates controlled entry/exit requirements

4. SHARES_UTILITY
   Properties: utilityType (string)
   Description: Indicates shared infrastructure connections

CATEGORIES:
- Production (Weighing, Granulation, Compression, Coating, Packaging)
- Quality Control (Analytical Lab, Microbiology Lab, Stability Chamber)
- Warehouse (Raw Materials, Finished Goods, Quarantine, Cold Storage)
- Utilities (HVAC, Purified Water, Compressed Air, Electrical)
- Personnel (Gowning Area, Break Room, Offices, Training)
- Support (Waste Disposal, Maintenance, Receiving, Shipping)

CLEANROOM CLASSIFICATIONS:
- Class A, B, C, D (cleanroom air quality standards)
- Non-Classified

Example Queries:
- MATCH (n:NodeTemplate) RETURN n
- MATCH (n:FunctionalArea)-[r:ADJACENT_TO]->(m:FunctionalArea) WHERE r.required = true RETURN n, r, m
- MATCH (n:NodeTemplate) WHERE n.category = 'Production' RETURN n
- MATCH (n:NodeTemplate)-[r:PROHIBITED_NEAR]->(m:NodeTemplate) RETURN n.name, m.name, r.reason
`;
  }

  /**
   * Validate that a Cypher query is safe to execute (read-only)
   */
  private validateQuery(query: string): { valid: boolean; error?: string } {
    const upperQuery = query.toUpperCase().trim();

    // Block dangerous operations
    const dangerousKeywords = [
      'DELETE',
      'DETACH DELETE',
      'REMOVE',
      'SET',
      'CREATE',
      'MERGE',
      'DROP',
      'ALTER',
      'CALL {',
    ];

    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return {
          valid: false,
          error: `Query contains disallowed operation: ${keyword}. Only read operations (MATCH, RETURN) are allowed.`,
        };
      }
    }

    // Ensure query contains MATCH and RETURN
    if (!upperQuery.includes('MATCH') || !upperQuery.includes('RETURN')) {
      return {
        valid: false,
        error: 'Query must contain both MATCH and RETURN clauses.',
      };
    }

    return { valid: true };
  }

  /**
   * Execute a Cypher query against Neo4j
   */
  private async executeCypherQuery(query: string): Promise<any[]> {
    const driver = this.neo4jService.getDriver();
    const session = driver.session();

    try {
      const result = await session.run(query);

      // Convert Neo4j records to plain objects
      const records = result.records.map(record => {
        const obj: any = {};
        record.keys.forEach(key => {
          const value = record.get(key);

          // Handle Neo4j node objects
          if (value && typeof value === 'object' && 'properties' in value) {
            obj[key] = {
              ...value.properties,
              labels: value.labels,
              identity: value.identity?.toString(),
            };
          }
          // Handle Neo4j relationship objects
          else if (value && typeof value === 'object' && 'type' in value) {
            obj[key] = {
              type: value.type,
              properties: value.properties,
              start: value.start?.toString(),
              end: value.end?.toString(),
            };
          }
          // Handle arrays
          else if (Array.isArray(value)) {
            obj[key] = value.map(item => {
              if (item && typeof item === 'object' && 'properties' in item) {
                return { ...item.properties, labels: item.labels };
              }
              return item;
            });
          }
          // Handle regular values
          else {
            obj[key] = value;
          }
        });
        return obj;
      });

      return records;
    } finally {
      await session.close();
    }
  }

  /**
   * Convert natural language question to Cypher query using Claude
   */
  private async generateCypherQuery(question: string): Promise<{ query: string; explanation: string }> {
    const systemPrompt = `You are an expert in Neo4j Cypher queries for pharmaceutical facility design knowledge graphs.
Your task is to convert natural language questions into valid, read-only Cypher queries.

${this.getDatabaseSchema()}

IMPORTANT RULES:
1. Only generate READ queries using MATCH and RETURN
2. Never use CREATE, DELETE, SET, REMOVE, MERGE, or other write operations
3. Use proper Cypher syntax with correct property access
4. Include WHERE clauses for filtering when appropriate
5. Use LIMIT to restrict large result sets (default: LIMIT 100)
6. Return meaningful property names, not just node/relationship IDs

Respond with a JSON object containing:
{
  "query": "the Cypher query",
  "explanation": "brief explanation of what the query does"
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Convert this question to a Cypher query: "${question}"`,
        },
      ],
      system: systemPrompt,
    });

    // Extract the text response
    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON response
    const responseText = textContent.text.trim();

    // Try to extract JSON from the response (handles markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);

    return {
      query: parsed.query,
      explanation: parsed.explanation,
    };
  }

  /**
   * Answer a natural language question about the knowledge graph
   */
  async answerQuestion(question: string): Promise<QueryResult> {
    try {
      // Step 1: Generate Cypher query from natural language
      console.log('Generating Cypher query for:', question);
      const { query, explanation } = await this.generateCypherQuery(question);
      console.log('Generated query:', query);

      // Step 2: Validate the query is safe
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.error}`);
      }

      // Step 3: Execute the query
      console.log('Executing query...');
      const results = await this.executeCypherQuery(query);
      console.log('Query returned', results.length, 'results');

      return {
        query,
        results,
        explanation,
      };
    } catch (error: any) {
      console.error('AI Assistant error:', error);
      throw new Error(`Failed to answer question: ${error.message}`);
    }
  }

  /**
   * Execute a user-provided Cypher query (with safety validation)
   */
  async executeQuery(query: string): Promise<QueryResult> {
    try {
      // Validate the query is safe
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        throw new Error(`Query validation failed: ${validation.error}`);
      }

      // Execute the query
      console.log('Executing user query:', query);
      const results = await this.executeCypherQuery(query);
      console.log('Query returned', results.length, 'results');

      return {
        query,
        results,
        explanation: 'User-provided query executed successfully',
      };
    } catch (error: any) {
      console.error('Query execution error:', error);
      throw new Error(`Failed to execute query: ${error.message}`);
    }
  }

  /**
   * Get database schema information
   */
  getSchema(): string {
    return this.getDatabaseSchema();
  }
}

export default AIAssistantService;
