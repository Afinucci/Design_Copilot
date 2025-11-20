/**
 * Layout Generation Service
 * 
 * Converts natural language descriptions into GMP-compliant pharmaceutical facility layouts
 * for the Layout Designer mode (shape-based canvas).
 * 
 * Key features:
 * - Natural language parsing to extract rooms, capacity, and constraints
 * - Neo4j relationship queries for connectivity rules
 * - Force-directed layout algorithm with GMP compliance constraints
 * - Automatic door connection creation between adjacent shapes
 * - Airlock insertion for cleanroom class transitions
 */

import OpenAI from 'openai';
import Neo4jService from '../config/database';
import {
    LayoutGenerationParams,
    GeneratedShapeLayout,
    RoomSizeData,
    NodeCategory,
    DoorType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
    ROOM_SIZE_DATABASE,
    findRoomSize,
    scaleRoomDimensions,
} from '../config/roomSizeDatabase';
import { getCleanroomColor } from '../../../shared/types';

interface RoomNode {
    id: string;
    name: string;
    neo4jId?: string; // For querying relationships
    category: NodeCategory;
    cleanroomClass?: 'A' | 'B' | 'C' | 'D' | 'CNC';
    width: number; // meters
    height: number; // meters
    area: number; // square meters
    x: number; // Temporary positioning (meters)
    y: number; // Temporary positioning (meters)
    sizeData?: RoomSizeData;
}

interface RoomRelationship {
    fromRoomId: string;
    toRoomId: string;
    type: 'MATERIAL_FLOW' | 'PERSONNEL_FLOW' | 'REQUIRES_ACCESS' | 'PROHIBITED_NEAR';
    priority: number;
    flowType?: 'raw_material' | 'finished_product' | 'waste' | 'personnel' | 'equipment';
    flowDirection?: 'bidirectional' | 'unidirectional';
    reason?: string;
}

class LayoutGenerationService {
    private static instance: LayoutGenerationService;
    private openai: OpenAI;
    private neo4jService: Neo4jService;

    // Layout algorithm parameters
    private readonly ITERATIONS = 150;
    private readonly ATTRACTION_STRENGTH = 0.3;
    private readonly REPULSION_STRENGTH = 50.0;
    private readonly CLUSTERING_STRENGTH = 0.2;
    private readonly MIN_DISTANCE = 2.0; // meters
    private readonly PIXELS_PER_METER = 40; // Canvas scale: 40 pixels = 1 meter

    private constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        this.neo4jService = Neo4jService.getInstance();
    }

    public static getInstance(): LayoutGenerationService {
        if (!LayoutGenerationService.instance) {
            LayoutGenerationService.instance = new LayoutGenerationService();
        }
        return LayoutGenerationService.instance;
    }

    /**
     * Main entry point: Generate shape-based layout from natural language
     */
    public async generateLayout(params: LayoutGenerationParams): Promise<GeneratedShapeLayout> {
        console.log('🏭 Layout generation started:', params.description);

        // Step 1: Parse natural language to extract rooms and requirements
        const parsedRequirements = await this.parseNaturalLanguage(params);
        console.log('📝 Parsed requirements:', parsedRequirements);

        // Step 2: Match rooms to size database and create room nodes
        const roomNodes = await this.createRoomNodes(parsedRequirements, params.capacity);
        console.log(`🏗️ Created ${roomNodes.length} room nodes`);

        // Step 3: Query Neo4j for relationships between rooms
        const relationships = await this.queryRoomRelationships(roomNodes);
        console.log(`🔗 Found ${relationships.length} relationships`);

        // Step 4: Position rooms using force-directed layout
        const positionedRooms = await this.positionRooms(roomNodes, relationships, params.constraints);
        console.log('📐 Positioned rooms on canvas');

        // Step 5: Insert airlocks for cleanroom transitions
        const roomsWithAirlocks = await this.insertAirlocks(positionedRooms, relationships);
        console.log(`🚪 Added ${roomsWithAirlocks.length - positionedRooms.length} airlocks`);

        // Step 6: Convert to canvas coordinates (meters → pixels)
        const shapes = this.convertToCanvasShapes(roomsWithAirlocks);

        // Step 7: Create door connections between adjacent shapes
        const doorConnections = this.createDoorConnections(shapes, roomsWithAirlocks, relationships);
        console.log(`🚪 Created ${doorConnections.length} door connections`);

        // Step 8: Generate metadata (compliance score, warnings, rationale)
        const metadata = await this.generateMetadata(
            roomsWithAirlocks,
            relationships,
            params.description
        );

        console.log('✅ Layout generation complete');

        return {
            shapes,
            doorConnections,
            metadata,
        };
    }

    /**
     * Step 1: Parse natural language using OpenAI to extract rooms and requirements
     */
    private async parseNaturalLanguage(
        params: LayoutGenerationParams
    ): Promise<{
        rooms: string[];
        capacity?: { batchSize?: number; throughput?: number };
        layoutStyle?: 'linear' | 'clustered' | 'compact' | 'modular';
        prioritizeFlow?: 'material' | 'personnel' | 'balanced';
    }> {
        // If explicit rooms provided, use them
        if (params.requiredRooms && params.requiredRooms.length > 0) {
            return {
                rooms: params.requiredRooms,
                capacity: params.capacity,
                layoutStyle: params.constraints?.layoutStyle,
                prioritizeFlow: params.constraints?.prioritizeFlow,
            };
        }

        // Otherwise, use AI to extract rooms from description
        try {
            const systemPrompt = `You are a pharmaceutical facility design expert. Extract required rooms and parameters from natural language descriptions.

Available room types:
${ROOM_SIZE_DATABASE.map(r => `- ${r.roomType} (${r.category}, ${r.cleanroomClass || 'N/A'})`).join('\n')}

Return JSON format:
{
  "rooms": ["room name 1", "room name 2", ...],
  "batchSize": <number in liters, if mentioned>,
  "throughput": <number in units/day, if mentioned>,
  "layoutStyle": "linear" | "clustered" | "compact" | "modular",
  "prioritizeFlow": "material" | "personnel" | "balanced"
}`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: params.description },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
            });

            const parsed = JSON.parse(response.choices[0].message.content || '{}');

            return {
                rooms: parsed.rooms || [],
                capacity: {
                    batchSize: parsed.batchSize,
                    throughput: parsed.throughput,
                },
                layoutStyle: parsed.layoutStyle || params.constraints?.layoutStyle,
                prioritizeFlow: parsed.prioritizeFlow || params.constraints?.prioritizeFlow,
            };
        } catch (error: any) {
            console.error('❌ Error parsing natural language with OpenAI:', error);
            throw new Error(`Failed to parse layout requirements: ${error.message || 'OpenAI API error'}`);
        }
    }

    /**
     * Step 2: Create room nodes with sizes from database
     */
    private async createRoomNodes(
        requirements: {
            rooms: string[];
            capacity?: { batchSize?: number; throughput?: number };
        },
        capacity?: { batchSize?: number; throughput?: number }
    ): Promise<RoomNode[]> {
        const roomNodes: RoomNode[] = [];
        const capacityParams = capacity || requirements.capacity;

        for (const roomName of requirements.rooms) {
            // Find room in size database
            const sizeData = findRoomSize(roomName);
            if (!sizeData) {
                console.warn(`⚠️ Room not found in database: ${roomName}, using default size`);
                // Create default room
                roomNodes.push({
                    id: uuidv4(),
                    name: roomName,
                    category: 'Production',
                    width: 8,
                    height: 10,
                    area: 80,
                    x: 0,
                    y: 0,
                });
                continue;
            }

            // Scale dimensions based on capacity
            const dimensions = scaleRoomDimensions(sizeData, capacityParams);

            // Query Neo4j to get node template ID for relationship queries
            const neo4jId = await this.findNeo4jTemplateId(sizeData.roomType, sizeData.category);

            roomNodes.push({
                id: uuidv4(),
                name: sizeData.roomType,
                neo4jId,
                category: sizeData.category,
                cleanroomClass: sizeData.cleanroomClass,
                width: dimensions.width,
                height: dimensions.height,
                area: dimensions.area,
                x: 0, // Will be positioned later
                y: 0,
                sizeData,
            });
        }

        return roomNodes;
    }

    /**
     * Find Neo4j node template ID for relationship queries
     */
    private async findNeo4jTemplateId(roomType: string, category: string): Promise<string | undefined> {
        const session = this.neo4jService.getSession();
        try {
            const result = await session.run(
                `MATCH (n:NodeTemplate)
         WHERE toLower(n.name) CONTAINS toLower($roomType) OR toLower(n.category) = toLower($category)
         RETURN elementId(n) as id, n.name as name
         LIMIT 1`,
                { roomType, category }
            );

            if (result.records.length > 0) {
                return result.records[0].get('id');
            }
        } catch (error) {
            console.error('Error finding Neo4j template:', error);
        } finally {
            await session.close();
        }
        return undefined;
    }

    /**
     * Step 3: Query Neo4j for relationships between rooms
     */
    private async queryRoomRelationships(roomNodes: RoomNode[]): Promise<RoomRelationship[]> {
        const relationships: RoomRelationship[] = [];
        const session = this.neo4jService.getSession();

        try {
            // For each pair of rooms, check if they have relationships in Neo4j
            for (let i = 0; i < roomNodes.length; i++) {
                for (let j = i + 1; j < roomNodes.length; j++) {
                    const room1 = roomNodes[i];
                    const room2 = roomNodes[j];

                    if (!room1.neo4jId || !room2.neo4jId) continue;

                    // Query for relationships (MATERIAL_FLOW, PERSONNEL_FLOW, PROHIBITED_NEAR)
                    const result = await session.run(
                        `MATCH (n1:NodeTemplate)-[r]->(n2:NodeTemplate)
             WHERE elementId(n1) = $id1 AND elementId(n2) = $id2
             AND type(r) IN ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'REQUIRES_ACCESS', 'PROHIBITED_NEAR']
             RETURN type(r) as relType, r.priority as priority, 
                    r.flowType as flowType, r.flowDirection as flowDirection,
                    r.reason as reason`,
                        { id1: room1.neo4jId, id2: room2.neo4jId }
                    );

                    for (const record of result.records) {
                        relationships.push({
                            fromRoomId: room1.id,
                            toRoomId: room2.id,
                            type: record.get('relType') as any,
                            priority: record.get('priority') || 5,
                            flowType: record.get('flowType'),
                            flowDirection: record.get('flowDirection'),
                            reason: record.get('reason'),
                        });
                    }

                    // Check reverse direction
                    const reverseResult = await session.run(
                        `MATCH (n1:NodeTemplate)-[r]->(n2:NodeTemplate)
             WHERE elementId(n1) = $id2 AND elementId(n2) = $id1
             AND type(r) IN ['MATERIAL_FLOW', 'PERSONNEL_FLOW', 'REQUIRES_ACCESS', 'PROHIBITED_NEAR']
             RETURN type(r) as relType, r.priority as priority,
                    r.flowType as flowType, r.flowDirection as flowDirection,
                    r.reason as reason`,
                        { id1: room1.neo4jId, id2: room2.neo4jId }
                    );

                    for (const record of reverseResult.records) {
                        relationships.push({
                            fromRoomId: room2.id,
                            toRoomId: room1.id,
                            type: record.get('relType') as any,
                            priority: record.get('priority') || 5,
                            flowType: record.get('flowType'),
                            flowDirection: record.get('flowDirection'),
                            reason: record.get('reason'),
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error querying relationships:', error);
        } finally {
            await session.close();
        }

        return relationships;
    }

    /**
     * Step 4: Position rooms using force-directed layout algorithm with GMP constraints
     */
    private async positionRooms(
        roomNodes: RoomNode[],
        relationships: RoomRelationship[],
        constraints?: {
            layoutStyle?: 'linear' | 'clustered' | 'compact' | 'modular';
            prioritizeFlow?: 'material' | 'personnel' | 'balanced';
        }
    ): Promise<RoomNode[]> {
        // Initialize random positions
        const positioned = roomNodes.map(room => ({
            ...room,
            x: Math.random() * 100,
            y: Math.random() * 100,
            vx: 0,
            vy: 0,
        }));

        // Force-directed layout iterations
        for (let iter = 0; iter < this.ITERATIONS; iter++) {
            const forces = positioned.map(() => ({ fx: 0, fy: 0 }));

            // 1. Attraction forces for connected rooms
            for (const rel of relationships) {
                if (rel.type === 'PROHIBITED_NEAR') continue; // Skip prohibited

                const fromIdx = positioned.findIndex(r => r.id === rel.fromRoomId);
                const toIdx = positioned.findIndex(r => r.id === rel.toRoomId);
                if (fromIdx === -1 || toIdx === -1) continue;

                const from = positioned[fromIdx];
                const to = positioned[toIdx];

                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    const strength = this.ATTRACTION_STRENGTH * rel.priority;
                    forces[fromIdx].fx += (dx / distance) * strength;
                    forces[fromIdx].fy += (dy / distance) * strength;
                    forces[toIdx].fx -= (dx / distance) * strength;
                    forces[toIdx].fy -= (dy / distance) * strength;
                }
            }

            // 2. Repulsion forces (prevent overlap)
            for (let i = 0; i < positioned.length; i++) {
                for (let j = i + 1; j < positioned.length; j++) {
                    const r1 = positioned[i];
                    const r2 = positioned[j];

                    const dx = r2.x - r1.x;
                    const dy = r2.y - r1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Check if rooms are prohibited near each other
                    const isProhibited = relationships.some(
                        rel =>
                            rel.type === 'PROHIBITED_NEAR' &&
                            ((rel.fromRoomId === r1.id && rel.toRoomId === r2.id) ||
                                (rel.fromRoomId === r2.id && rel.toRoomId === r1.id))
                    );

                    const repulsionStrength = isProhibited
                        ? this.REPULSION_STRENGTH * 3
                        : this.REPULSION_STRENGTH;

                    if (distance > 0 && distance < 50) {
                        const force = repulsionStrength / (distance * distance);
                        forces[i].fx -= (dx / distance) * force;
                        forces[i].fy -= (dy / distance) * force;
                        forces[j].fx += (dx / distance) * force;
                        forces[j].fy += (dy / distance) * force;
                    }
                }
            }

            // 3. Clustering forces (group by cleanroom class)
            for (let i = 0; i < positioned.length; i++) {
                for (let j = i + 1; j < positioned.length; j++) {
                    const r1 = positioned[i];
                    const r2 = positioned[j];

                    if (r1.cleanroomClass && r2.cleanroomClass && r1.cleanroomClass === r2.cleanroomClass) {
                        const dx = r2.x - r1.x;
                        const dy = r2.y - r1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > 0) {
                            forces[i].fx += (dx / distance) * this.CLUSTERING_STRENGTH;
                            forces[i].fy += (dy / distance) * this.CLUSTERING_STRENGTH;
                            forces[j].fx -= (dx / distance) * this.CLUSTERING_STRENGTH;
                            forces[j].fy -= (dy / distance) * this.CLUSTERING_STRENGTH;
                        }
                    }
                }
            }

            // Apply forces with damping
            const damping = 0.8;
            for (let i = 0; i < positioned.length; i++) {
                (positioned[i] as any).vx = ((positioned[i] as any).vx + forces[i].fx) * damping;
                (positioned[i] as any).vy = ((positioned[i] as any).vy + forces[i].fy) * damping;
                positioned[i].x += (positioned[i] as any).vx;
                positioned[i].y += (positioned[i] as any).vy;
            }
        }

        // Ensure minimum distances
        this.enforceMinimumDistances(positioned);

        return positioned;
    }

    /**
     * Enforce minimum distances between rooms (collision resolution)
     */
    private enforceMinimumDistances(rooms: RoomNode[]): void {
        for (let iteration = 0; iteration < 10; iteration++) {
            let hasOverlap = false;

            for (let i = 0; i < rooms.length; i++) {
                for (let j = i + 1; j < rooms.length; j++) {
                    const r1 = rooms[i];
                    const r2 = rooms[j];

                    const dx = r2.x - r1.x;
                    const dy = r2.y - r1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDist = (r1.width + r2.width) / 2 + this.MIN_DISTANCE;

                    if (distance < minDist) {
                        hasOverlap = true;
                        const overlap = minDist - distance;
                        const pushX = (dx / distance) * (overlap / 2);
                        const pushY = (dy / distance) * (overlap / 2);

                        r1.x -= pushX;
                        r1.y -= pushY;
                        r2.x += pushX;
                        r2.y += pushY;
                    }
                }
            }

            if (!hasOverlap) break;
        }
    }

    /**
     * Step 5: Insert airlocks for cleanroom class transitions
     */
    private async insertAirlocks(
        roomNodes: RoomNode[],
        relationships: RoomRelationship[]
    ): Promise<RoomNode[]> {
        const roomsWithAirlocks = [...roomNodes];
        const cleanroomOrder = { A: 4, B: 3, C: 2, D: 1, CNC: 0 };

        // Check each relationship for cleanroom transitions
        for (const rel of relationships) {
            if (rel.type === 'PROHIBITED_NEAR') continue;

            const from = roomNodes.find(r => r.id === rel.fromRoomId);
            const to = roomNodes.find(r => r.id === rel.toRoomId);

            if (!from || !to || !from.cleanroomClass || !to.cleanroomClass) continue;

            const fromLevel = cleanroomOrder[from.cleanroomClass];
            const toLevel = cleanroomOrder[to.cleanroomClass];

            // Insert airlock if transitioning between Grade A/B or significant class differences
            const needsAirlock =
                Math.abs(fromLevel - toLevel) >= 2 ||
                (fromLevel >= 3 && toLevel >= 3 && fromLevel !== toLevel);

            if (needsAirlock) {
                // Find room size data for airlock
                const airlockType = rel.type === 'MATERIAL_FLOW' ? 'Material Airlock' : 'Personnel Airlock';
                const airlockSize = findRoomSize(airlockType);

                if (airlockSize) {
                    const dimensions = scaleRoomDimensions(airlockSize);

                    // Position airlock between the two rooms
                    const airlockRoom: RoomNode = {
                        id: uuidv4(),
                        name: airlockType,
                        category: 'Support',
                        cleanroomClass: from.cleanroomClass > to.cleanroomClass ? from.cleanroomClass : to.cleanroomClass,
                        width: dimensions.width,
                        height: dimensions.height,
                        area: dimensions.area,
                        x: (from.x + to.x) / 2,
                        y: (from.y + to.y) / 2,
                        sizeData: airlockSize,
                    };

                    roomsWithAirlocks.push(airlockRoom);
                    console.log(`🚪 Inserted ${airlockType} between ${from.name} and ${to.name}`);
                }
            }
        }

        return roomsWithAirlocks;
    }

    /**
     * Step 6: Convert rooms from meters to canvas pixel coordinates
     */
    private convertToCanvasShapes(roomNodes: RoomNode[]): GeneratedShapeLayout['shapes'] {
        // Find bounding box
        const minX = Math.min(...roomNodes.map(r => r.x - r.width / 2));
        const minY = Math.min(...roomNodes.map(r => r.y - r.height / 2));

        // Offset to start at (100, 100) on canvas
        const offsetX = 100 - minX * this.PIXELS_PER_METER;
        const offsetY = 100 - minY * this.PIXELS_PER_METER;

        return roomNodes.map(room => ({
            id: room.id,
            name: room.name,
            shapeType: room.sizeData?.shapeType || 'rectangle',
            category: room.category,
            cleanroomClass: room.cleanroomClass,
            width: room.width * this.PIXELS_PER_METER,
            height: room.height * this.PIXELS_PER_METER,
            area: room.area * this.PIXELS_PER_METER * this.PIXELS_PER_METER,
            x: room.x * this.PIXELS_PER_METER + offsetX,
            y: room.y * this.PIXELS_PER_METER + offsetY,
            rotation: 0,
            pressureRegime: room.cleanroomClass && ['A', 'B', 'C'].includes(room.cleanroomClass) ? 'positive' : 'neutral',
            temperatureRange: { min: 18, max: 26, unit: 'C' as const },
            humidityRange: { min: 30, max: 60 },
            fillColor: getCleanroomColor(room.cleanroomClass),
            borderColor: '#333333',
            borderWidth: 2,
            opacity: 0.8,
            isCompliant: true,
            complianceIssues: [],
            assignedNodeName: room.name,
            assignedNodeId: room.neo4jId,
            customProperties: {
                generatedFromAI: true,
                roomSizeData: room.sizeData,
            },
        }));
    }

    /**
     * Step 7: Create door connections between adjacent or connected shapes
     */
    private createDoorConnections(
        shapes: GeneratedShapeLayout['shapes'],
        roomNodes: RoomNode[],
        relationships: RoomRelationship[]
    ): GeneratedShapeLayout['doorConnections'] {
        const doorConnections: GeneratedShapeLayout['doorConnections'] = [];

        // Create doors for relationships (material flow, personnel flow)
        for (const rel of relationships) {
            if (rel.type === 'PROHIBITED_NEAR') continue;

            const fromShape = shapes.find(s => s.id === rel.fromRoomId);
            const toShape = shapes.find(s => s.id === rel.toRoomId);

            if (!fromShape || !toShape) continue;

            // Check if shapes are reasonably close (within 3x their combined width)
            const dx = toShape.x - fromShape.x;
            const dy = toShape.y - fromShape.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = (fromShape.width + toShape.width) * 1.5;

            if (distance > maxDistance) continue;

            // Determine flow type
            const flowType = rel.type === 'MATERIAL_FLOW' ? 'material' :
                rel.type === 'PERSONNEL_FLOW' ? 'personnel' : 'material';

            // Determine door type based on cleanroom transition
            let doorType: DoorType = 'standard';
            if (fromShape.cleanroomClass && toShape.cleanroomClass) {
                const cleanroomOrder = { A: 4, B: 3, C: 2, D: 1, CNC: 0 };
                const diff = Math.abs(
                    cleanroomOrder[fromShape.cleanroomClass] - cleanroomOrder[toShape.cleanroomClass]
                );
                if (diff >= 2) {
                    doorType = 'airlock';
                }
            }

            doorConnections.push({
                id: uuidv4(),
                fromShape: {
                    shapeId: fromShape.id,
                    x: fromShape.x + fromShape.width / 2,
                    y: fromShape.y + fromShape.height / 2,
                    edgeIndex: 0,
                    normalizedPosition: 0.5,
                },
                toShape: {
                    shapeId: toShape.id,
                    x: toShape.x + toShape.width / 2,
                    y: toShape.y + toShape.height / 2,
                    edgeIndex: 0,
                    normalizedPosition: 0.5,
                },
                flowType,
                flowDirection: rel.flowDirection || 'bidirectional',
                doorType,
            });
        }

        return doorConnections;
    }

    /**
     * Step 8: Generate metadata (compliance score, warnings, rationale)
     */
    private async generateMetadata(
        roomNodes: RoomNode[],
        relationships: RoomRelationship[],
        originalDescription: string
    ): Promise<GeneratedShapeLayout['metadata']> {
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Check for prohibited relationships
        const prohibitedCount = relationships.filter(r => r.type === 'PROHIBITED_NEAR').length;
        if (prohibitedCount > 0) {
            warnings.push(`Found ${prohibitedCount} prohibited room adjacencies that need separation`);
        }

        // Check for missing critical rooms
        const hasFillingRoom = roomNodes.some(r => r.name.toLowerCase().includes('filling'));
        const hasQCLab = roomNodes.some(r => r.category === 'Quality Control');

        if (hasFillingRoom && !hasQCLab) {
            suggestions.push('Consider adding a Quality Control laboratory for in-process testing');
        }

        // Calculate total area
        const totalArea = roomNodes.reduce((sum, room) => sum + room.area, 0);

        // Generate compliance score (basic heuristic)
        let complianceScore = 100;
        complianceScore -= prohibitedCount * 10;
        complianceScore -= relationships.length === 0 ? 20 : 0; // Penalty if no relationships
        complianceScore = Math.max(0, Math.min(100, complianceScore));

        // Generate AI rationale
        const rationale = await this.generateRationale(roomNodes, originalDescription);

        return {
            totalArea: Math.round(totalArea * 10) / 10,
            complianceScore,
            warnings,
            suggestions,
            rationale,
        };
    }

    /**
     * Generate human-readable rationale for layout decisions
     */
    private async generateRationale(
        roomNodes: RoomNode[],
        originalDescription: string
    ): Promise<string> {
        const systemPrompt = `You are a pharmaceutical facility design expert. Explain the layout decisions in 2-3 sentences.
Focus on GMP compliance, cleanroom zoning, and material/personnel flow.`;

        const userPrompt = `Original request: "${originalDescription}"

Generated layout with ${roomNodes.length} rooms:
${roomNodes.map(r => `- ${r.name} (${r.category}, ${r.cleanroomClass || 'N/A'}, ${r.area}m²)`).join('\n')}

Explain why this layout is appropriate for GMP compliance.`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 150,
                temperature: 0.7,
            });

            return response.choices[0].message.content || 'Layout generated based on GMP requirements.';
        } catch (error) {
            console.error('Error generating rationale:', error);
            return `Generated ${roomNodes.length} rooms organized by cleanroom classification and workflow requirements.`;
        }
    }
}

export default LayoutGenerationService;
