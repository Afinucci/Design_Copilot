import OpenAI from 'openai';
import Neo4jService from '../config/database';
import { ChatRequest, ChatResponse, ChatAction, NodeTemplate, SpatialRelationship } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AIChatService {
  private openai: OpenAI;
  private neo4jService: Neo4jService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.neo4jService = Neo4jService.getInstance();
  }

  /**
   * Query Neo4j to get all available node templates
   */
  private async getNodeTemplates(): Promise<NodeTemplate[]> {
    const session = this.neo4jService.getSession();
    try {
      const result = await session.run(`
        MATCH (n:FunctionalArea)
        RETURN n {
          .id,
          .name,
          .category,
          .cleanroomClass,
          .color,
          .description
        } as template
      `);

      return result.records.map(record => {
        const template = record.get('template');
        return {
          id: template.id,
          name: template.name,
          category: template.category,
          cleanroomClass: template.cleanroomClass,
          color: template.color,
          description: template.description,
          defaultSize: { width: 150, height: 100 }
        };
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Query Neo4j to get relationship rules
   */
  private async getRelationshipRules(): Promise<Array<{
    fromNode: string;
    relationshipType: string;
    toNode: string;
    reason?: string;
    priority?: number;
  }>> {
    const session = this.neo4jService.getSession();
    try {
      const result = await session.run(`
        MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
        RETURN from.name as fromNode,
               type(r) as relationshipType,
               to.name as toNode,
               r.reason as reason,
               r.priority as priority
      `);

      return result.records.map(record => ({
        fromNode: record.get('fromNode'),
        relationshipType: record.get('relationshipType'),
        toNode: record.get('toNode'),
        reason: record.get('reason'),
        priority: record.get('priority')
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Query Neo4j to get constraint rules
   */
  private async getConstraintRules(): Promise<Array<{
    rule: string;
    description: string;
  }>> {
    const session = this.neo4jService.getSession();
    try {
      // Get cleanroom transition rules
      const cleanroomRules = [
        { rule: 'Cleanroom Class Progression', description: 'Cleanroom classes must follow A → B → C → D progression. Direct transitions from Class A to Class D are prohibited.' },
        { rule: 'Material Flow Separation', description: 'Material flow and personnel flow must be separated to prevent contamination.' },
        { rule: 'Airlock Requirements', description: 'Transitions between different cleanroom classes require airlocks.' }
      ];

      // Get CANNOT_CONNECT_TO relationships
      const cannotConnectResult = await session.run(`
        MATCH (from:FunctionalArea)-[r:CANNOT_CONNECT_TO]->(to:FunctionalArea)
        RETURN from.name as fromNode,
               to.name as toNode,
               r.reason as reason
      `);

      const cannotConnectRules = cannotConnectResult.records.map(record => ({
        rule: `Cannot Connect: ${record.get('fromNode')} to ${record.get('toNode')}`,
        description: record.get('reason') || 'Connection prohibited by GMP rules'
      }));

      return [...cleanroomRules, ...cannotConnectRules];
    } finally {
      await session.close();
    }
  }

  /**
   * Query Neo4j to get relationships for a specific node
   */
  private async getNodeRelationships(
    nodeName: string, 
    nodeId?: string,
    cleanroomClass?: string
  ): Promise<{
    outgoing: Array<{ 
      relationshipType: string; 
      toNode: string;
      toNodeId: string;
      toNodeCleanroomClass?: string;
      toNodeCategory?: string;
      reason?: string; 
      priority?: number;
    }>;
    incoming: Array<{ 
      relationshipType: string; 
      fromNode: string;
      fromNodeId: string;
      fromNodeCleanroomClass?: string;
      fromNodeCategory?: string;
      reason?: string; 
      priority?: number;
    }>;
  }> {
    const session = this.neo4jService.getSession();
    try {
      // Build WHERE clause that includes cleanroom class filtering
      const whereClause = cleanroomClass 
        ? `(from.name = $nodeName OR from.id = $nodeName OR from.id = $nodeId) AND from.cleanroomClass = $cleanroomClass`
        : `from.name = $nodeName OR from.id = $nodeName OR from.id = $nodeId`;
      
      const whereClauseIncoming = cleanroomClass
        ? `(to.name = $nodeName OR to.id = $nodeName OR to.id = $nodeId) AND to.cleanroomClass = $cleanroomClass`
        : `to.name = $nodeName OR to.id = $nodeName OR to.id = $nodeId`;

      // Get outgoing relationships with full node details
      const outgoingResult = await session.run(`
        MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
        WHERE ${whereClause}
        RETURN type(r) as relationshipType,
               to.name as toNode,
               to.id as toNodeId,
               to.cleanroomClass as toNodeCleanroomClass,
               to.category as toNodeCategory,
               r.reason as reason,
               r.priority as priority
        ORDER BY coalesce(r.priority, 999), to.name
      `, { nodeName, nodeId, cleanroomClass });

      // Get incoming relationships with full node details
      const incomingResult = await session.run(`
        MATCH (from:FunctionalArea)-[r]->(to:FunctionalArea)
        WHERE ${whereClauseIncoming}
        RETURN type(r) as relationshipType,
               from.name as fromNode,
               from.id as fromNodeId,
               from.cleanroomClass as fromNodeCleanroomClass,
               from.category as fromNodeCategory,
               r.reason as reason,
               r.priority as priority
        ORDER BY coalesce(r.priority, 999), from.name
      `, { nodeName, nodeId, cleanroomClass });

      return {
        outgoing: outgoingResult.records.map(record => ({
          relationshipType: record.get('relationshipType'),
          toNode: record.get('toNode'),
          toNodeId: record.get('toNodeId'),
          toNodeCleanroomClass: record.get('toNodeCleanroomClass'),
          toNodeCategory: record.get('toNodeCategory'),
          reason: record.get('reason'),
          priority: record.get('priority')
        })),
        incoming: incomingResult.records.map(record => ({
          relationshipType: record.get('relationshipType'),
          fromNode: record.get('fromNode'),
          fromNodeId: record.get('fromNodeId'),
          fromNodeCleanroomClass: record.get('fromNodeCleanroomClass'),
          fromNodeCategory: record.get('fromNodeCategory'),
          reason: record.get('reason'),
          priority: record.get('priority')
        }))
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Build system prompt with Neo4j knowledge
   */
  private async buildSystemPrompt(): Promise<string> {
    const [nodeTemplates, relationshipRules, constraintRules] = await Promise.all([
      this.getNodeTemplates(),
      this.getRelationshipRules(),
      this.getConstraintRules()
    ]);

    return `You are an AI assistant specialized in pharmaceutical facility layout design. You help users create GMP-compliant facility layouts using knowledge from a Neo4j graph database.

**CRITICAL INSTRUCTION:**
When the user asks about specific nodes (e.g., "what can be connected to the Process Suite?"), you will receive "**IMPORTANT - Actual Neo4j Graph Data**" in the context. 
⚠️ You MUST use ONLY the actual connections shown in that graph data. DO NOT suggest additional connections based on general GMP rules unless:
1. No graph data is provided for that specific node, OR
2. The user explicitly asks for recommendations or additional possible connections

When actual graph data is provided, your response should be based EXCLUSIVELY on what exists in the Neo4j database.

**Your Capabilities:**
1. Answer questions about pharmaceutical facility design
2. Query actual relationships from the Neo4j graph database
3. Suggest appropriate room types and their placement
4. Recommend relationships between rooms (adjacency, flow, etc.)
5. Validate layouts against GMP constraints
6. Create nodes on the canvas automatically
7. Highlight specific nodes when discussing them

**Available Room Types (Node Templates):**
${nodeTemplates.map(t => `- ${t.name} (${t.category}, Cleanroom Class: ${t.cleanroomClass || 'N/A'})`).join('\n')}

**General Relationship Rules (use ONLY when actual graph data is not provided):**
${relationshipRules.map(r => `- ${r.fromNode} → ${r.relationshipType} → ${r.toNode}${r.reason ? `: ${r.reason}` : ''}`).join('\n')}

**GMP Constraints:**
${constraintRules.map(c => `- ${c.rule}: ${c.description}`).join('\n')}

**Response Format:**
When suggesting actions, use this JSON structure in your response:
\`\`\`json
{
  "actions": [
    {
      "type": "add_node",
      "label": "Add Coating Room",
      "data": {
        "nodeTemplate": { "id": "coating-room", "name": "Coating Room", ... },
        "position": { "x": 100, "y": 200 }
      }
    },
    {
      "type": "highlight_node",
      "label": "Highlight existing nodes",
      "data": {
        "highlightNodeIds": ["node-123", "node-456"]
      }
    }
  ]
}
\`\`\`

**Guidelines:**
- ALWAYS prioritize actual Neo4j graph data over general rules when provided
- When actual graph data shows specific connections, list ONLY those connections
- Consider cleanroom class transitions (A → B → C → D) for general recommendations
- Suggest appropriate relationships between rooms when asked for recommendations
- Validate against GMP constraints
- Provide clear explanations for your suggestions
- When referring to existing nodes in the layout, use their IDs for highlighting
`;
  }

  /**
   * Process chat request and generate response
   */
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const systemPrompt = await this.buildSystemPrompt();

      // Detect if user is asking about a specific node's relationships
      let specificNodeContext = '';
      const nodeQueryPatterns = [
        /what\s+(?:can|should|could)\s+(?:be\s+)?connect(?:ed)?\s+to\s+(?:the\s+)?(.+?)(?:\s+now)?[\?\s]/i,
        /what\s+(?:nodes|rooms|areas)\s+(?:can|should|could)\s+(?:the\s+)?(.+?)\s+connect\s+to[\?\s]/i,
        /(?:connections|relationships)\s+(?:for|of)\s+(?:the\s+)?(.+?)[\?\s]/i,
        /show\s+(?:me\s+)?(?:the\s+)?(?:connections|relationships)\s+(?:for|of)\s+(?:the\s+)?(.+?)[\?\s]/i,
        // Handle "this" queries by checking if there's only one node on canvas
        /what\s+(?:can|should|could)\s+(?:be\s+)?connect(?:ed)?\s+to\s+this/i
      ];

      for (const pattern of nodeQueryPatterns) {
        const match = request.message.match(pattern);
        if (match) {
          // Handle "this" queries - use the first/only node on canvas if available
          let queryText = match[1] ? match[1].trim().toLowerCase() : null;

          // If no capture group (e.g., "this" query) and only one node exists, use it
          if (!queryText && request.context.currentNodes.length === 1) {
            queryText = request.context.currentNodes[0].name.toLowerCase();
            console.log(`Detected "this" query with single node: "${queryText}"`);
          } else if (!queryText) {
            console.log(`Detected "this" query but multiple or no nodes on canvas - skipping`);
            continue; // Skip if "this" but multiple nodes
          } else {
            console.log(`Detected node-specific query for: "${queryText}"`);
          }

          // Try to find matching node from current layout context
          let targetNode = null;
          let nodeName = queryText;
          let nodeId = undefined;

          // First, try to match against nodes currently on the canvas
          for (const node of request.context.currentNodes) {
            const nodeLower = node.name.toLowerCase();
            const nodeTemplateLower = node.templateId?.toLowerCase() || '';

            // Check for various match patterns
            if (
              nodeLower.includes(queryText) ||
              queryText.includes(nodeLower) ||
              nodeTemplateLower.includes(queryText) ||
              // Handle abbreviations like "MAL" for "Material Airlock (MAL)"
              nodeLower.match(new RegExp(`\\(${queryText}\\)`, 'i'))
            ) {
              targetNode = node;
              // CRITICAL: Use node NAME for Neo4j query, not templateId
              // Neo4j stores nodes with their full names like "Material Airlock (MAL)"
              nodeName = node.name;
              nodeId = node.id;
              console.log(`Matched canvas node: ${node.name} (ID: ${node.id}, Template: ${node.templateId}, Class: ${node.cleanroomClass})`);
              break;
            }
          }
          
          try {
            // CRITICAL: Pass cleanroom class to filter Neo4j query for exact node match
            const cleanroomClass = targetNode?.cleanroomClass;
            console.log(`🔍 Querying Neo4j for node: ${nodeName}, cleanroom class: ${cleanroomClass || 'any'}`);

            const relationships = await this.getNodeRelationships(nodeName, nodeId, cleanroomClass);

            if (relationships.outgoing.length > 0 || relationships.incoming.length > 0) {
              const displayName = targetNode ?
                `${targetNode.name} (${targetNode.category}, Cleanroom Class ${targetNode.cleanroomClass || 'N/A'})` :
                nodeName;
              
              specificNodeContext = `\n\n**━━━ ACTUAL NEO4J KNOWLEDGE GRAPH DATA ━━━**\n`;
              specificNodeContext += `**Queried Node:** ${displayName}\n`;
              
              if (relationships.outgoing.length > 0) {
                specificNodeContext += `\n**✓ OUTGOING CONNECTIONS** (what this node CAN connect to):\n`;
                specificNodeContext += relationships.outgoing.map(r => {
                  const targetDesc = r.toNodeCleanroomClass ? 
                    `${r.toNode} (${r.toNodeCategory}, Class ${r.toNodeCleanroomClass})` :
                    `${r.toNode} (${r.toNodeCategory})`;
                  return `  • ${r.relationshipType} → **${targetDesc}**${r.reason ? `\n    Reason: ${r.reason}` : ''}`;
                }).join('\n');
              } else {
                specificNodeContext += `\n**✗ OUTGOING CONNECTIONS:** None found in Neo4j database\n`;
              }
              
              if (relationships.incoming.length > 0) {
                specificNodeContext += `\n\n**✓ INCOMING CONNECTIONS** (what CAN connect to this node):\n`;
                specificNodeContext += relationships.incoming.map(r => {
                  const sourceDesc = r.fromNodeCleanroomClass ? 
                    `${r.fromNode} (${r.fromNodeCategory}, Class ${r.fromNodeCleanroomClass})` :
                    `${r.fromNode} (${r.fromNodeCategory})`;
                  return `  • **${sourceDesc}** → ${r.relationshipType}${r.reason ? `\n    Reason: ${r.reason}` : ''}`;
                }).join('\n');
              } else {
                specificNodeContext += `\n**✗ INCOMING CONNECTIONS:** None found in Neo4j database\n`;
              }
              
              specificNodeContext += `\n\n⚠️  **CRITICAL INSTRUCTION:**`;
              specificNodeContext += `\nYou MUST answer ONLY based on the connections listed above from the Neo4j knowledge graph.`;
              specificNodeContext += `\nDo NOT suggest additional connections based on general GMP rules.`;
              specificNodeContext += `\nDo NOT mention generic node types without their specific cleanroom class.`;
              specificNodeContext += `\nIf the user asks "what can I connect?", list ONLY the specific nodes shown above with their exact cleanroom classes.\n`;
              specificNodeContext += `**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n`;
            } else {
              const displayName = targetNode ? 
                `"${targetNode.name}" (${targetNode.category}, Cleanroom Class ${targetNode.cleanroomClass || 'N/A'})` : 
                `"${nodeName}"`;
              specificNodeContext = `\n\n**IMPORTANT:** No existing relationships found in the Neo4j knowledge graph for ${displayName}. This node type currently has no predefined connections in the database.\n`;
            }
          } catch (error) {
            console.error(`Error querying relationships for ${nodeName}:`, error);
            specificNodeContext = `\n\n**Note:** Could not retrieve specific relationship data for "${nodeName}" from Neo4j. ${error}\n`;
          }
          
          break;
        }
      }

      // Build user message with context
      const contextMessage = `
**Current Layout State:**
Nodes on Canvas: ${request.context.currentNodes.map(n => `${n.name} (ID: ${n.id}, Category: ${n.category}, Class: ${n.cleanroomClass || 'N/A'}, Template: ${n.templateId || 'custom'})`).join(', ') || 'None'}
Relationships: ${request.context.currentRelationships.map(r => `${r.fromId} → ${r.type} → ${r.toId}`).join(', ') || 'None'}
${specificNodeContext}
**User Question:**
${request.message}
`;

      // Build conversation history
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...request.conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: contextMessage }
      ];

      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseContent = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

      // Extract actions from response
      const actions = this.extractActionsFromResponse(responseContent, request.context);

      return {
        message: responseContent,
        actions
      };
    } catch (error: any) {
      console.error('Error processing chat:', error);
      throw new Error(`AI chat service error: ${error.message}`);
    }
  }

  /**
   * Extract action suggestions from AI response
   */
  private extractActionsFromResponse(response: string, context: any): ChatAction[] {
    const actions: ChatAction[] = [];

    // Try to extract JSON from code blocks
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.actions && Array.isArray(parsed.actions)) {
          return parsed.actions.map((action: any) => ({
            id: uuidv4(),
            ...action
          }));
        }
      } catch (e) {
        console.warn('Failed to parse JSON from response:', e);
      }
    }

    // Fallback: extract actions from natural language
    // Look for phrases like "add a coating room", "highlight the gowning area"
    const addNodePattern = /(?:add|create|place)\s+(?:a|an)\s+([\w\s]+?)(?:\s+at\s+\((\d+),\s*(\d+)\))?/gi;
    let match;
    while ((match = addNodePattern.exec(response)) !== null) {
      const nodeName = match[1].trim();
      // This is a simplified version - in production, you'd want to match against actual templates
      actions.push({
        id: uuidv4(),
        type: 'add_node',
        label: `Add ${nodeName}`,
        data: {
          nodeTemplate: undefined, // Would need to match against templates
          position: match[2] && match[3] ? { x: parseInt(match[2]), y: parseInt(match[3]) } : { x: 0, y: 0 }
        }
      });
    }

    return actions;
  }

  /**
   * Save chat history to Neo4j
   */
  async saveChatHistory(diagramId: string, messages: Array<{ role: string; content: string }>): Promise<void> {
    const session = this.neo4jService.getSession();
    try {
      await session.run(`
        MERGE (d:Diagram {id: $diagramId})
        SET d.chatHistory = $messages,
            d.chatHistoryUpdatedAt = datetime()
      `, {
        diagramId,
        messages: JSON.stringify(messages)
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Load chat history from Neo4j
   */
  async loadChatHistory(diagramId: string): Promise<Array<{ role: string; content: string }>> {
    const session = this.neo4jService.getSession();
    try {
      const result = await session.run(`
        MATCH (d:Diagram {id: $diagramId})
        RETURN d.chatHistory as history
      `, { diagramId });

      if (result.records.length > 0) {
        const history = result.records[0].get('history');
        return history ? JSON.parse(history) : [];
      }
      return [];
    } finally {
      await session.close();
    }
  }
}

export default AIChatService;
