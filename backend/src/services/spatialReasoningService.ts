import {
  FunctionalArea,
  SpatialRelationship,
  SpatialPlacement,
  PlacementConstraint,
  SmartGhostSuggestion,
  GhostSuggestion,
  NodeTemplate
} from '../types';

/**
 * Spatial Reasoning Service
 * Advanced algorithms for optimal node placement in pharmaceutical facility layouts
 * Implements force-directed layout with GMP-specific constraints
 */
export class SpatialReasoningService {
  private static instance: SpatialReasoningService;

  // Layout configuration
  private readonly GRID_SIZE = 50; // Snap grid
  private readonly NODE_SPACING = 200; // Minimum spacing between nodes
  private readonly CANVAS_PADDING = 100;
  private readonly DEFAULT_CANVAS_WIDTH = 3000;
  private readonly DEFAULT_CANVAS_HEIGHT = 2000;

  // Force simulation parameters
  private readonly ATTRACTION_STRENGTH = 0.5;
  private readonly REPULSION_STRENGTH = 1000;
  private readonly MAX_ITERATIONS = 100;
  private readonly CONVERGENCE_THRESHOLD = 0.01;

  private constructor() {}

  public static getInstance(): SpatialReasoningService {
    if (!SpatialReasoningService.instance) {
      SpatialReasoningService.instance = new SpatialReasoningService();
    }
    return SpatialReasoningService.instance;
  }

  /**
   * Calculate optimal position for a new node given existing layout
   */
  public async calculateOptimalPosition(
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    preferences?: {
      preferredZone?: { x: number; y: number; width: number; height: number };
      avoidOverlap?: boolean;
      clusterBySimilarity?: boolean;
    }
  ): Promise<SpatialPlacement> {
    const constraints = this.buildPlacementConstraints(newNode, existingNodes, relationships);

    // Multi-objective optimization
    const objectives = [
      this.minimizeOverlapObjective,
      this.satisfyDistanceConstraintsObjective,
      this.clusterBySimilarityObjective,
      this.maintainFlowPathsObjective,
      this.respectCleanroomZoningObjective
    ];

    // Generate candidate positions
    const candidates = this.generateCandidatePositions(newNode, existingNodes, relationships, preferences);

    // Score each candidate
    const scoredCandidates = candidates.map(position => {
      const score = this.scorePosition(position, newNode, existingNodes, relationships, objectives);
      return { position, score };
    });

    // Select best position
    scoredCandidates.sort((a, b) => b.score - a.score);
    const bestPosition = scoredCandidates[0];

    return {
      nodeId: newNode.id,
      position: bestPosition.position,
      score: bestPosition.score,
      reasoning: this.generatePositioningReasoning(bestPosition.position, newNode, existingNodes, relationships),
      constraints
    };
  }

  /**
   * Calculate positions for multiple nodes simultaneously
   * Uses force-directed graph layout algorithm
   */
  public async calculateLayoutPositions(
    nodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    options?: {
      preserveExisting?: boolean;
      layoutStyle?: 'linear' | 'clustered' | 'circular' | 'grid';
    }
  ): Promise<Map<string, { x: number; y: number }>> {
    const positions = new Map<string, { x: number; y: number }>();

    // Initialize positions
    if (options?.layoutStyle === 'grid') {
      this.initializeGridLayout(nodes, positions);
    } else if (options?.layoutStyle === 'circular') {
      this.initializeCircularLayout(nodes, positions);
    } else if (options?.layoutStyle === 'linear') {
      this.initializeLinearLayout(nodes, positions, relationships);
    } else {
      // Clustered (default) - use force-directed
      this.initializeRandomLayout(nodes, positions);
    }

    // Run force-directed simulation
    const finalPositions = await this.runForceDirectedSimulation(nodes, relationships, positions, options);

    return finalPositions;
  }

  /**
   * Enhance ghost suggestion with spatial intelligence
   */
  public async enhanceGhostSuggestion(
    ghostSuggestion: GhostSuggestion,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): Promise<SmartGhostSuggestion> {
    // Find node template
    const nodeTemplate: NodeTemplate = {
      id: ghostSuggestion.nodeId,
      name: ghostSuggestion.name,
      category: ghostSuggestion.category as any,
      cleanroomClass: ghostSuggestion.cleanroomClass,
      color: '#4A90E2',
      defaultSize: { width: 150, height: 100 }
    };

    // Calculate optimal position
    const placement = await this.calculateOptimalPosition(nodeTemplate, existingNodes, relationships);

    // Generate alternative positions
    const alternatives = this.generateAlternativePositions(placement.position, existingNodes, 3);

    // Determine auto-connections
    const autoConnections = relationships.filter(
      r => r.fromId === ghostSuggestion.sourceNodeId
    );

    return {
      ...ghostSuggestion,
      optimalPosition: placement.position,
      alternativePositions: alternatives.map(pos => ({ ...pos, score: 0.8 })),
      spatialScore: placement.score,
      placementReasoning: placement.reasoning,
      autoConnections
    };
  }

  /**
   * Build placement constraints from relationships and GMP rules
   */
  private buildPlacementConstraints(
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): PlacementConstraint[] {
    const constraints: PlacementConstraint[] = [];

    // Adjacency constraints
    const adjacentRels = relationships.filter(r => r.type === 'ADJACENT_TO');
    for (const rel of adjacentRels) {
      constraints.push({
        type: 'adjacency',
        targetNodeId: rel.toId,
        maxValue: this.NODE_SPACING * 1.5,
        priority: 'high',
        description: `Should be adjacent to ${rel.toId}`
      });
    }

    // Separation constraints
    const prohibitedRels = relationships.filter(r => r.type === 'PROHIBITED_NEAR');
    for (const rel of prohibitedRels) {
      constraints.push({
        type: 'separation',
        targetNodeId: rel.toId,
        minValue: this.NODE_SPACING * 3,
        priority: 'required',
        description: `Must be separated from ${rel.toId}`
      });
    }

    // Cleanroom zone constraints
    if (newNode.cleanroomClass) {
      const sameClassRooms = existingNodes.filter(n => n.cleanroomClass === newNode.cleanroomClass);
      if (sameClassRooms.length > 0) {
        constraints.push({
          type: 'cleanroom-zone',
          priority: 'high',
          description: `Should cluster with other Class ${newNode.cleanroomClass} rooms`
        });
      }
    }

    // Flow path constraints
    const flowRels = relationships.filter(r =>
      r.type === 'MATERIAL_FLOW' || r.type === 'PERSONNEL_FLOW'
    );
    for (const rel of flowRels) {
      constraints.push({
        type: 'flow-path',
        targetNodeId: rel.toId,
        priority: 'medium',
        description: `Optimize for ${rel.type} to ${rel.toId}`
      });
    }

    return constraints;
  }

  /**
   * Generate candidate positions for evaluation
   */
  private generateCandidatePositions(
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    preferences?: any
  ): Array<{ x: number; y: number }> {
    const candidates: Array<{ x: number; y: number }> = [];

    if (existingNodes.length === 0) {
      // First node - place at center
      return [{ x: this.DEFAULT_CANVAS_WIDTH / 2, y: this.DEFAULT_CANVAS_HEIGHT / 2 }];
    }

    // Strategy 1: Near related nodes
    const relatedNodes = this.findRelatedNodes(newNode, existingNodes, relationships);
    for (const relatedNode of relatedNodes.slice(0, 3)) {
      candidates.push(...this.generatePositionsAroundNode(relatedNode, existingNodes));
    }

    // Strategy 2: In cleanroom zone clusters
    if (newNode.cleanroomClass) {
      const sameClassNodes = existingNodes.filter(n => n.cleanroomClass === newNode.cleanroomClass);
      if (sameClassNodes.length > 0) {
        const centroid = this.calculateCentroid(sameClassNodes);
        candidates.push(...this.generatePositionsAroundPoint(centroid, existingNodes));
      }
    }

    // Strategy 3: Empty spaces on grid
    candidates.push(...this.findEmptyGridSpaces(existingNodes, 10));

    // Deduplicate
    return this.deduplicatePositions(candidates);
  }

  /**
   * Generate positions around a specific node
   */
  private generatePositionsAroundNode(
    centerNode: FunctionalArea,
    existingNodes: FunctionalArea[]
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const angles = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 directions
    const distance = this.NODE_SPACING;

    for (const angle of angles) {
      const rad = (angle * Math.PI) / 180;
      const x = (centerNode.x || 0) + distance * Math.cos(rad);
      const y = (centerNode.y || 0) + distance * Math.sin(rad);

      const snapped = this.snapToGrid({ x, y });
      if (!this.overlapsExisting(snapped, existingNodes)) {
        positions.push(snapped);
      }
    }

    return positions;
  }

  /**
   * Generate positions around a point
   */
  private generatePositionsAroundPoint(
    center: { x: number; y: number },
    existingNodes: FunctionalArea[]
  ): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];
    const radius = this.NODE_SPACING;

    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const x = center.x + radius * Math.cos(rad);
      const y = center.y + radius * Math.sin(rad);

      const snapped = this.snapToGrid({ x, y });
      if (!this.overlapsExisting(snapped, existingNodes)) {
        positions.push(snapped);
      }
    }

    return positions;
  }

  /**
   * Find empty grid spaces
   */
  private findEmptyGridSpaces(existingNodes: FunctionalArea[], maxCandidates: number): Array<{ x: number; y: number }> {
    const candidates: Array<{ x: number; y: number }> = [];

    // Sample grid positions
    for (let x = this.CANVAS_PADDING; x < this.DEFAULT_CANVAS_WIDTH - this.CANVAS_PADDING; x += this.GRID_SIZE * 4) {
      for (let y = this.CANVAS_PADDING; y < this.DEFAULT_CANVAS_HEIGHT - this.CANVAS_PADDING; y += this.GRID_SIZE * 4) {
        const pos = { x, y };
        if (!this.overlapsExisting(pos, existingNodes)) {
          candidates.push(pos);
          if (candidates.length >= maxCandidates) {
            return candidates;
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Score a candidate position based on multiple objectives
   */
  private scorePosition(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    objectives: Array<(pos: { x: number; y: number }, node: NodeTemplate, nodes: FunctionalArea[], rels: SpatialRelationship[]) => number>
  ): number {
    let totalScore = 0;
    const weights = [1.0, 0.8, 0.6, 0.5, 0.7]; // Objective weights

    for (let i = 0; i < objectives.length; i++) {
      const objectiveScore = objectives[i].call(this, position, newNode, existingNodes, relationships);
      totalScore += objectiveScore * weights[i];
    }

    return totalScore / objectives.length;
  }

  /**
   * Objective: Minimize overlap with existing nodes
   */
  private minimizeOverlapObjective(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[]
  ): number {
    const overlaps = this.overlapsExisting(position, existingNodes);
    return overlaps ? 0 : 1.0;
  }

  /**
   * Objective: Satisfy distance constraints
   */
  private satisfyDistanceConstraintsObjective(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): number {
    const adjacentRels = relationships.filter(r => r.type === 'ADJACENT_TO');
    if (adjacentRels.length === 0) return 1.0;

    let score = 0;
    for (const rel of adjacentRels) {
      const targetNode = existingNodes.find(n => n.id === rel.toId);
      if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
        const distance = this.calculateDistance(position, { x: targetNode.x, y: targetNode.y });
        const idealDistance = this.NODE_SPACING;
        const distanceScore = 1 - Math.abs(distance - idealDistance) / idealDistance;
        score += Math.max(0, distanceScore);
      }
    }

    return score / adjacentRels.length;
  }

  /**
   * Objective: Cluster by similarity (cleanroom class, category)
   */
  private clusterBySimilarityObjective(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[]
  ): number {
    const similarNodes = existingNodes.filter(n =>
      n.cleanroomClass === newNode.cleanroomClass || n.category === newNode.category
    );

    if (similarNodes.length === 0) return 0.5;

    const centroid = this.calculateCentroid(similarNodes);
    const distance = this.calculateDistance(position, centroid);
    const maxDistance = Math.sqrt(this.DEFAULT_CANVAS_WIDTH ** 2 + this.DEFAULT_CANVAS_HEIGHT ** 2);

    return 1 - (distance / maxDistance);
  }

  /**
   * Objective: Maintain efficient flow paths
   */
  private maintainFlowPathsObjective(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): number {
    const flowRels = relationships.filter(r =>
      r.type === 'MATERIAL_FLOW' || r.type === 'PERSONNEL_FLOW'
    );

    if (flowRels.length === 0) return 0.5;

    let totalPathScore = 0;
    for (const rel of flowRels) {
      const sourceNode = existingNodes.find(n => n.id === rel.fromId);
      const targetNode = existingNodes.find(n => n.id === rel.toId);

      if (sourceNode && targetNode) {
        const directDistance = this.calculateDistance(
          { x: sourceNode.x || 0, y: sourceNode.y || 0 },
          { x: targetNode.x || 0, y: targetNode.y || 0 }
        );

        const distanceViaNewNode =
          this.calculateDistance({ x: sourceNode.x || 0, y: sourceNode.y || 0 }, position) +
          this.calculateDistance(position, { x: targetNode.x || 0, y: targetNode.y || 0 });

        const efficiency = directDistance / distanceViaNewNode;
        totalPathScore += efficiency;
      }
    }

    return totalPathScore / flowRels.length;
  }

  /**
   * Objective: Respect cleanroom zoning
   */
  private respectCleanroomZoningObjective(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[]
  ): number {
    if (!newNode.cleanroomClass) return 1.0;

    const sameClassNodes = existingNodes.filter(n => n.cleanroomClass === newNode.cleanroomClass);
    if (sameClassNodes.length === 0) return 0.5;

    const centroid = this.calculateCentroid(sameClassNodes);
    const distance = this.calculateDistance(position, centroid);

    // Prefer positions closer to same-class centroid
    const maxDistance = Math.sqrt(this.DEFAULT_CANVAS_WIDTH ** 2 + this.DEFAULT_CANVAS_HEIGHT ** 2);
    return 1 - (distance / maxDistance);
  }

  /**
   * Force-directed layout simulation
   */
  private async runForceDirectedSimulation(
    nodes: FunctionalArea[],
    relationships: SpatialRelationship[],
    initialPositions: Map<string, { x: number; y: number }>,
    options?: any
  ): Promise<Map<string, { x: number; y: number }>> {
    const positions = new Map(initialPositions);
    const velocities = new Map<string, { x: number; y: number }>();

    // Initialize velocities
    for (const node of nodes) {
      velocities.set(node.id, { x: 0, y: 0 });
    }

    // Simulation loop
    for (let iteration = 0; iteration < this.MAX_ITERATIONS; iteration++) {
      const forces = new Map<string, { x: number; y: number }>();

      // Initialize forces
      for (const node of nodes) {
        forces.set(node.id, { x: 0, y: 0 });
      }

      // Calculate repulsion forces (all nodes repel each other)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          const pos1 = positions.get(node1.id)!;
          const pos2 = positions.get(node2.id)!;

          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const repulsion = this.REPULSION_STRENGTH / (distance * distance);
          const fx = (dx / distance) * repulsion;
          const fy = (dy / distance) * repulsion;

          const force1 = forces.get(node1.id)!;
          const force2 = forces.get(node2.id)!;

          force1.x -= fx;
          force1.y -= fy;
          force2.x += fx;
          force2.y += fy;
        }
      }

      // Calculate attraction forces (connected nodes attract)
      for (const rel of relationships) {
        const node1 = nodes.find(n => n.id === rel.fromId);
        const node2 = nodes.find(n => n.id === rel.toId);

        if (node1 && node2) {
          const pos1 = positions.get(node1.id);
          const pos2 = positions.get(node2.id);

          if (pos1 && pos2) {
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;

            const attraction = this.ATTRACTION_STRENGTH * distance;
            const fx = (dx / distance) * attraction;
            const fy = (dy / distance) * attraction;

            const force1 = forces.get(node1.id)!;
            const force2 = forces.get(node2.id)!;

            force1.x += fx;
            force1.y += fy;
            force2.x -= fx;
            force2.y -= fy;
          }
        }
      }

      // Apply forces and update positions
      let maxDisplacement = 0;
      for (const node of nodes) {
        const force = forces.get(node.id)!;
        const velocity = velocities.get(node.id)!;
        const position = positions.get(node.id)!;

        // Update velocity
        velocity.x += force.x;
        velocity.y += force.y;

        // Apply damping
        velocity.x *= 0.8;
        velocity.y *= 0.8;

        // Update position
        const newPosition = {
          x: position.x + velocity.x,
          y: position.y + velocity.y
        };

        // Keep within bounds
        newPosition.x = Math.max(this.CANVAS_PADDING, Math.min(this.DEFAULT_CANVAS_WIDTH - this.CANVAS_PADDING, newPosition.x));
        newPosition.y = Math.max(this.CANVAS_PADDING, Math.min(this.DEFAULT_CANVAS_HEIGHT - this.CANVAS_PADDING, newPosition.y));

        const displacement = Math.sqrt((newPosition.x - position.x) ** 2 + (newPosition.y - position.y) ** 2);
        maxDisplacement = Math.max(maxDisplacement, displacement);

        positions.set(node.id, this.snapToGrid(newPosition));
      }

      // Check convergence
      if (maxDisplacement < this.CONVERGENCE_THRESHOLD) {
        console.log(`Force simulation converged after ${iteration} iterations`);
        break;
      }
    }

    return positions;
  }

  /**
   * Initialize grid layout
   */
  private initializeGridLayout(nodes: FunctionalArea[], positions: Map<string, { x: number; y: number }>): void {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = 300;

    nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positions.set(node.id, {
        x: this.CANVAS_PADDING + col * spacing,
        y: this.CANVAS_PADDING + row * spacing
      });
    });
  }

  /**
   * Initialize circular layout
   */
  private initializeCircularLayout(nodes: FunctionalArea[], positions: Map<string, { x: number; y: number }>): void {
    const centerX = this.DEFAULT_CANVAS_WIDTH / 2;
    const centerY = this.DEFAULT_CANVAS_HEIGHT / 2;
    const radius = Math.min(centerX, centerY) - this.CANVAS_PADDING;

    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    });
  }

  /**
   * Initialize linear layout (flow-based)
   */
  private initializeLinearLayout(
    nodes: FunctionalArea[],
    positions: Map<string, { x: number; y: number }>,
    relationships: SpatialRelationship[]
  ): void {
    // Topological sort based on flow relationships
    const sorted = this.topologicalSort(nodes, relationships);
    const spacing = 300;

    sorted.forEach((node, index) => {
      positions.set(node.id, {
        x: this.CANVAS_PADDING + index * spacing,
        y: this.DEFAULT_CANVAS_HEIGHT / 2
      });
    });
  }

  /**
   * Initialize random layout
   */
  private initializeRandomLayout(nodes: FunctionalArea[], positions: Map<string, { x: number; y: number }>): void {
    nodes.forEach(node => {
      positions.set(node.id, {
        x: this.CANVAS_PADDING + Math.random() * (this.DEFAULT_CANVAS_WIDTH - 2 * this.CANVAS_PADDING),
        y: this.CANVAS_PADDING + Math.random() * (this.DEFAULT_CANVAS_HEIGHT - 2 * this.CANVAS_PADDING)
      });
    });
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private findRelatedNodes(
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): FunctionalArea[] {
    const relatedIds = relationships.map(r => r.toId);
    return existingNodes.filter(n => relatedIds.includes(n.id));
  }

  private calculateCentroid(nodes: FunctionalArea[]): { x: number; y: number } {
    const sum = nodes.reduce(
      (acc, node) => ({
        x: acc.x + (node.x || 0),
        y: acc.y + (node.y || 0)
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / nodes.length,
      y: sum.y / nodes.length
    };
  }

  private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  private overlapsExisting(position: { x: number; y: number }, existingNodes: FunctionalArea[]): boolean {
    const buffer = 50; // Minimum clearance
    return existingNodes.some(node =>
      node.x !== undefined &&
      node.y !== undefined &&
      Math.abs(position.x - node.x) < this.NODE_SPACING - buffer &&
      Math.abs(position.y - node.y) < this.NODE_SPACING - buffer
    );
  }

  private snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.round(position.x / this.GRID_SIZE) * this.GRID_SIZE,
      y: Math.round(position.y / this.GRID_SIZE) * this.GRID_SIZE
    };
  }

  private deduplicatePositions(positions: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    const unique = new Map<string, { x: number; y: number }>();
    positions.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      if (!unique.has(key)) {
        unique.set(key, pos);
      }
    });
    return Array.from(unique.values());
  }

  private generateAlternativePositions(
    optimal: { x: number; y: number },
    existingNodes: FunctionalArea[],
    count: number
  ): Array<{ x: number; y: number }> {
    const alternatives: Array<{ x: number; y: number }> = [];
    const offsets = [
      { x: this.NODE_SPACING, y: 0 },
      { x: -this.NODE_SPACING, y: 0 },
      { x: 0, y: this.NODE_SPACING },
      { x: 0, y: -this.NODE_SPACING }
    ];

    for (const offset of offsets) {
      const alt = {
        x: optimal.x + offset.x,
        y: optimal.y + offset.y
      };

      if (!this.overlapsExisting(alt, existingNodes)) {
        alternatives.push(this.snapToGrid(alt));
        if (alternatives.length >= count) break;
      }
    }

    return alternatives;
  }

  private generatePositioningReasoning(
    position: { x: number; y: number },
    newNode: NodeTemplate,
    existingNodes: FunctionalArea[],
    relationships: SpatialRelationship[]
  ): string {
    const reasons: string[] = [];

    // Check adjacency
    const adjacentRels = relationships.filter(r => r.type === 'ADJACENT_TO');
    if (adjacentRels.length > 0) {
      reasons.push(`Positioned to be adjacent to ${adjacentRels.length} connected room(s)`);
    }

    // Check cleanroom clustering
    if (newNode.cleanroomClass) {
      const sameClass = existingNodes.filter(n => n.cleanroomClass === newNode.cleanroomClass);
      if (sameClass.length > 0) {
        reasons.push(`Clustered with ${sameClass.length} other Class ${newNode.cleanroomClass} room(s)`);
      }
    }

    // Check flow optimization
    const flowRels = relationships.filter(r => r.type === 'MATERIAL_FLOW' || r.type === 'PERSONNEL_FLOW');
    if (flowRels.length > 0) {
      reasons.push(`Optimized for ${flowRels.length} flow path(s)`);
    }

    if (reasons.length === 0) {
      reasons.push('Positioned in available space with minimal overlap');
    }

    return reasons.join('. ');
  }

  private topologicalSort(nodes: FunctionalArea[], relationships: SpatialRelationship[]): FunctionalArea[] {
    // Simple topological sort based on flow relationships
    const sorted: FunctionalArea[] = [];
    const visited = new Set<string>();

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const outgoing = relationships.filter(r => r.fromId === nodeId && r.type === 'MATERIAL_FLOW');
      for (const rel of outgoing) {
        visit(rel.toId);
      }

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        sorted.unshift(node);
      }
    };

    for (const node of nodes) {
      visit(node.id);
    }

    return sorted;
  }
}

export default SpatialReasoningService;
