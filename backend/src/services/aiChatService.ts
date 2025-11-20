import OpenAI from 'openai';
import Neo4jService from '../config/database';
import { ChatRequest, ChatResponse, ChatAction, NodeTemplate, SpatialRelationship } from '../types';
import { v4 as uuidv4 } from 'uuid';
import GenerativeLayoutService from './generativeLayoutService';
import FacilityTemplatesService from './facilityTemplatesService';
import {
  calculateRoomCost,
  calculateProjectCost,
  DEFAULT_COST_SETTINGS
} from '../config/costConfiguration';
import { ProjectCostEstimate } from '../../../shared/types';

export class AIChatService {
  private openai: OpenAI;
  private neo4jService: Neo4jService;
  private generativeService: GenerativeLayoutService;
  private templatesService: FacilityTemplatesService;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.neo4jService = Neo4jService.getInstance();
    this.generativeService = GenerativeLayoutService.getInstance();
    this.templatesService = FacilityTemplatesService.getInstance();
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
      // Use case-insensitive matching with toLower() for node names
      const whereClause = cleanroomClass
        ? `(toLower(from.name) = toLower($nodeName) OR from.id = $nodeName OR from.id = $nodeId) AND from.cleanroomClass = $cleanroomClass`
        : `toLower(from.name) = toLower($nodeName) OR from.id = $nodeName OR from.id = $nodeId`;

      const whereClauseIncoming = cleanroomClass
        ? `(toLower(to.name) = toLower($nodeName) OR to.id = $nodeName OR to.id = $nodeId) AND to.cleanroomClass = $cleanroomClass`
        : `toLower(to.name) = toLower($nodeName) OR to.id = $nodeName OR to.id = $nodeId`;

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

**🚨 CRITICAL ROOM SELECTION CONSTRAINT 🚨**
You MUST ONLY suggest rooms from the "Available Room Types" list below.
❌ DO NOT suggest ANY room types that are not explicitly listed in the Available Room Types.
❌ DO NOT invent or hallucinate room names like "Material Air-Lock (Class B)" or "Gowning Area" unless they appear EXACTLY in the list below.
✅ ONLY use room names that exist in the Neo4j knowledge graph (listed below).
✅ When suggesting a room, use the EXACT name and cleanroom class from the list.

**Available Room Types (Node Templates):**
${nodeTemplates.length > 0
        ? nodeTemplates.map(t => `- ${t.name} (${t.category}, Cleanroom Class: ${t.cleanroomClass || 'N/A'})`).join('\n')
        : '⚠️ WARNING: No functional areas found in Neo4j database. Cannot make room suggestions.'}

**Your Capabilities:**
1. Answer questions about pharmaceutical facility design
2. **Query the Neo4j knowledge graph directly using the \`query_neo4j\` function**
3. Suggest appropriate room types and their placement **ONLY from the Available Room Types list above**
4. Recommend relationships between rooms (adjacency, flow, etc.)
5. Validate layouts against GMP constraints
6. Create nodes on the canvas automatically
7. Highlight specific nodes when discussing them
8. **GENERATE COMPLETE LAYOUTS** from natural language descriptions (e.g., "Generate a sterile vial filling facility for 500L batches")
9. **INSTANTIATE FACILITY TEMPLATES** with custom parameters (e.g., "Create an oral solid dosage facility")
10. **OPTIMIZE LAYOUTS** to improve flow efficiency and GMP compliance

**🔍 Neo4j Query Function:**
You have access to a \`query_neo4j\` function that allows you to execute Cypher queries directly against the knowledge graph.

**When to use it:**
- User asks general questions about nodes (e.g., "what do you know about the Material Corridor?")
- You need to retrieve specific node properties, relationships, or constraints
- You need to explore the knowledge graph for information not provided in context

**Example Queries:**
- Get node details: \`MATCH (n:FunctionalArea) WHERE toLower(n.name) = toLower('Material Corridor') RETURN n\`
- Get relationships: \`MATCH (n:FunctionalArea)-[r]->(m:FunctionalArea) WHERE toLower(n.name) = toLower('Material Corridor') RETURN type(r) as relationshipType, m.name, m.cleanroomClass, m.category, r.reason\`
- Get all connections (bidirectional): \`MATCH (n:FunctionalArea)-[r]-(m:FunctionalArea) WHERE toLower(n.name) = toLower('Material Corridor') RETURN type(r) as relationshipType, m.name, m.cleanroomClass, m.category, r.reason\`
- Count nodes by category: \`MATCH (n:FunctionalArea) RETURN n.category, count(n) as count ORDER BY count(n) DESC\`
- Find prohibited connections: \`MATCH (n:FunctionalArea)-[r:CANNOT_CONNECT_TO]->(m) RETURN n.name, m.name, r.reason\`

**Important:** Always use the \`query_neo4j\` function when you need real-time data from Neo4j, rather than relying solely on the static lists above.

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
      "type": "generate_layout",
      "label": "Generate Complete Facility Layout",
      "data": {
        "description": "Sterile vial filling facility for 500L batches",
        "constraints": { "batchSize": 500, "productType": "sterile" }
      }
    },
    {
      "type": "instantiate_template",
      "label": "Create from Template",
      "data": {
        "templateId": "sterile-injectable-facility",
        "parameters": { "batchSize": "500L", "fillSpeed": 300 }
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

**Action Types:**
- \`add_node\`: Add a single node to canvas
- \`generate_layout\`: Generate a complete facility layout from description
- \`instantiate_template\`: Create layout from facility template
- \`highlight_node\`: Highlight existing nodes
- \`add_relationship\`: Create relationship between nodes

**Guidelines:**
- 🚨 NEVER suggest room types not in the "Available Room Types" list above
- ALWAYS prioritize actual Neo4j graph data over general rules when provided
- When actual graph data shows specific connections, list ONLY those connections
- Consider cleanroom class transitions (A → B → C → D) for general recommendations
- Suggest appropriate relationships between rooms when asked for recommendations
- Validate against GMP constraints
- Provide clear explanations for your suggestions
- When referring to existing nodes in the layout, use their IDs for highlighting
- If asked to suggest rooms and no templates are available in Neo4j, inform the user that the knowledge graph is empty
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
        /what\s+(?:can|should|could)\s+(?:be\s+)?connect(?:ed)?\s+to\s+this/i,
        // NEW: Catch general questions about nodes
        /what.*(?:know|about|tell|information).*(?:about|on)\s+(?:the\s+)?(.+?)[\?\s]/i,
        /(?:tell|describe|explain).*(?:about|me about)\s+(?:the\s+)?(.+?)[\?\s]/i
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

      // Define function for Neo4j queries
      const tools: OpenAI.Chat.ChatCompletionTool[] = [
        {
          type: 'function',
          function: {
            name: 'query_neo4j',
            description: 'Execute a Cypher query against the Neo4j knowledge graph database to retrieve information about functional areas, their relationships, cleanroom classes, categories, and GMP compliance rules.',
            parameters: {
              type: 'object',
              properties: {
                cypher: {
                  type: 'string',
                  description: 'The Cypher query to execute. Example: "MATCH (n:FunctionalArea {name: \'Material Corridor\'}) RETURN n"'
                },
                explanation: {
                  type: 'string',
                  description: 'Brief explanation of what this query is trying to find'
                }
              },
              required: ['cypher', 'explanation']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'calculate_cost',
            description: 'Calculate the estimated cost of the current facility layout based on room types, areas, and cleanroom classes. Use this when the user asks about costs, budget, or price.',
            parameters: {
              type: 'object',
              properties: {
                currency: {
                  type: 'string',
                  description: 'Currency code (e.g., USD, EUR). Defaults to USD.',
                  enum: ['USD', 'EUR', 'GBP']
                }
              }
            }
          }
        }
      ];

      // Call OpenAI with function calling support
      let completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      });

      // Handle function calls
      let responseContent = completion.choices[0]?.message?.content || '';
      const toolCalls = completion.choices[0]?.message?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        console.log(`🔧 AI requested ${toolCalls.length} function call(s)`);

        // Execute each function call
        const toolMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'query_neo4j') {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              console.log(`🔍 Executing Cypher query: ${args.cypher}`);
              console.log(`   Explanation: ${args.explanation}`);

              const session = this.neo4jService.getSession();
              try {
                const result = await session.run(args.cypher);
                const records = result.records.map(record => {
                  const obj: any = {};
                  record.keys.forEach(key => {
                    const value = record.get(key);
                    // Handle Neo4j node objects
                    if (value && typeof value === 'object' && value.properties) {
                      obj[key] = value.properties;
                    } else {
                      obj[key] = value;
                    }
                  });
                  return obj;
                });

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    success: true,
                    records,
                    recordCount: records.length,
                    explanation: args.explanation
                  })
                });

                console.log(`✅ Query returned ${records.length} records`);
              } finally {
                await session.close();
              }
            } catch (error: any) {
              console.error('❌ Neo4j query error:', error);
              toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: error.message || 'Query execution failed'
                })
              });
            }
          }

          if (toolCall.type === 'function' && toolCall.function.name === 'calculate_cost') {
            try {
              console.log('💰 Calculating project cost...');
              const args = JSON.parse(toolCall.function.arguments);

              // Map context nodes to room format expected by calculateProjectCost
              // Use the area already calculated on the frontend (in square meters)
              const rooms = request.context.currentNodes.map((node: any) => ({
                id: node.id,
                name: node.name,
                roomType: node.category ? node.category.toLowerCase().replace(/\s+/g, '-') : 'production',
                cleanroomClass: node.cleanroomClass || 'D',
                area: node.area || 15, // Use the area sent from frontend (already in m²), default to 15m² if not provided
                equipment: [] // Equipment not yet tracked in nodes
              }));

              const settings = { ...DEFAULT_COST_SETTINGS };
              if (args.currency) settings.currency = args.currency;

              // Calculate detailed cost breakdown
              const estimate: ProjectCostEstimate = {
                rooms: [],
                equipment: [],
                settings,
                subtotal: 0,
                contingency: 0,
                grandTotal: 0,
                currency: settings.currency,
                estimatedDate: new Date()
              };

              for (const room of rooms) {
                const roomCostData = calculateRoomCost(room.area, room.cleanroomClass, room.roomType, settings);

                const costBreakdown = {
                  constructionCost: roomCostData.constructionCost,
                  hvacCost: roomCostData.hvacCost,
                  equipmentPurchaseCost: 0,
                  equipmentInstallationCost: 0,
                  validationCost: roomCostData.validationCost,
                  otherCosts: 0,
                  totalCost: roomCostData.totalCost
                };

                estimate.rooms.push({
                  roomId: room.id,
                  roomName: room.name,
                  area: room.area,
                  costBreakdown
                });

                estimate.subtotal += costBreakdown.totalCost;
              }

              estimate.contingency = estimate.subtotal * (settings.contingencyPercentage / 100);
              estimate.grandTotal = estimate.subtotal + estimate.contingency;

              toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: true,
                  estimate: {
                    total: estimate.grandTotal,
                    currency: estimate.currency,
                    breakdown: estimate.rooms.map(r => ({
                      room: r.roomName,
                      area: `${r.area.toFixed(1)} m²`,
                      class: rooms.find(rm => rm.id === r.roomId)?.cleanroomClass,
                      cost: r.costBreakdown.totalCost
                    })),
                    subtotal: estimate.subtotal,
                    contingency: estimate.contingency,
                    explanation: "Cost calculated based on room area, cleanroom class, and type. Equipment costs are not included as equipment data is not available on nodes."
                  }
                })
              });
              console.log(`✅ Cost calculated: ${estimate.grandTotal} ${estimate.currency}`);
            } catch (error: any) {
              console.error('❌ Cost calculation error:', error);
              toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: error.message || 'Cost calculation failed'
                })
              });
            }
          }
        }

        // If we executed functions, call OpenAI again with the results
        if (toolMessages.length > 0) {
          messages.push(completion.choices[0].message as OpenAI.Chat.ChatCompletionMessageParam);
          messages.push(...toolMessages);

          completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 2000
          });

          responseContent = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response after querying the database.';
        }
      }

      if (!responseContent) {
        responseContent = 'I apologize, I could not generate a response.';
      }

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
