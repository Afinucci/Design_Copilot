/**
 * Auto-layout utility for positioning nodes imported from Neo4j
 * Uses a force-directed algorithm for optimal node placement
 */

export interface LayoutNode {
  id: string;
  x?: number;
  y?: number;
}

export interface LayoutEdge {
  fromId: string;
  toId: string;
}

export interface LayoutOptions {
  width?: number;
  height?: number;
  iterations?: number;
  nodeSpacing?: number;
  edgeLength?: number;
}

/**
 * Force-directed layout algorithm
 * Positions nodes based on their relationships to create a balanced diagram
 */
export function applyForceDirectedLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const {
    width = 1200,
    height = 800,
    iterations = 300,
    nodeSpacing = 150,
    edgeLength = 200,
  } = options;

  // Initialize positions randomly if not set
  const positions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

  nodes.forEach(node => {
    if (node.x !== undefined && node.y !== undefined) {
      positions.set(node.id, { x: node.x, y: node.y, vx: 0, vy: 0 });
    } else {
      positions.set(node.id, {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
      });
    }
  });

  // Build adjacency list
  const adjacency = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (!adjacency.has(edge.fromId)) adjacency.set(edge.fromId, new Set());
    if (!adjacency.has(edge.toId)) adjacency.set(edge.toId, new Set());
    adjacency.get(edge.fromId)!.add(edge.toId);
    adjacency.get(edge.toId)!.add(edge.fromId);
  });

  // Force-directed algorithm parameters
  const repulsionStrength = 50000;
  const attractionStrength = 0.01;
  const dampingFactor = 0.8;

  // Run simulation
  for (let iter = 0; iter < iterations; iter++) {
    // Cool down over time
    const temperature = 1 - iter / iterations;

    // Calculate repulsive forces (all nodes repel each other)
    nodes.forEach(nodeA => {
      const posA = positions.get(nodeA.id)!;

      nodes.forEach(nodeB => {
        if (nodeA.id === nodeB.id) return;

        const posB = positions.get(nodeB.id)!;
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        // Coulomb's law for repulsion
        const force = (repulsionStrength * temperature) / (distance * distance);
        posA.vx += (dx / distance) * force;
        posA.vy += (dy / distance) * force;
      });
    });

    // Calculate attractive forces (connected nodes attract)
    edges.forEach(edge => {
      const posFrom = positions.get(edge.fromId);
      const posTo = positions.get(edge.toId);

      if (!posFrom || !posTo) return;

      const dx = posTo.x - posFrom.x;
      const dy = posTo.y - posFrom.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;

      // Hooke's law for attraction
      const force = attractionStrength * (distance - edgeLength) * temperature;

      posFrom.vx += (dx / distance) * force;
      posFrom.vy += (dy / distance) * force;
      posTo.vx -= (dx / distance) * force;
      posTo.vy -= (dy / distance) * force;
    });

    // Update positions with velocity and damping
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;

      // Apply velocity
      pos.x += pos.vx;
      pos.y += pos.vy;

      // Apply damping
      pos.vx *= dampingFactor;
      pos.vy *= dampingFactor;

      // Keep nodes within bounds (with padding)
      const padding = 100;
      pos.x = Math.max(padding, Math.min(width - padding, pos.x));
      pos.y = Math.max(padding, Math.min(height - padding, pos.y));
    });
  }

  // Return final positions
  const finalPositions = new Map<string, { x: number; y: number }>();
  nodes.forEach(node => {
    const pos = positions.get(node.id)!;
    finalPositions.set(node.id, { x: Math.round(pos.x), y: Math.round(pos.y) });
  });

  return finalPositions;
}

/**
 * Hierarchical layout algorithm
 * Arranges nodes in layers based on their relationships
 */
export function applyHierarchicalLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const {
    width = 1200,
    nodeSpacing = 200,
  } = options;

  // Build adjacency list and find root nodes (nodes with no incoming edges)
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();

  nodes.forEach(node => {
    outgoing.set(node.id, new Set());
    incoming.set(node.id, new Set());
  });

  edges.forEach(edge => {
    outgoing.get(edge.fromId)?.add(edge.toId);
    incoming.get(edge.toId)?.add(edge.fromId);
  });

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(node => incoming.get(node.id)!.size === 0);

  // If no roots found, use nodes with most outgoing connections
  const startNodes = roots.length > 0
    ? roots
    : nodes.slice().sort((a, b) =>
        outgoing.get(b.id)!.size - outgoing.get(a.id)!.size
      ).slice(0, 3);

  // Assign layers using BFS
  const layers = new Map<string, number>();
  const visited = new Set<string>();
  const queue: string[] = [];

  startNodes.forEach(node => {
    queue.push(node.id);
    layers.set(node.id, 0);
    visited.add(node.id);
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const currentLayer = layers.get(nodeId)!;

    outgoing.get(nodeId)?.forEach(targetId => {
      if (!visited.has(targetId)) {
        layers.set(targetId, currentLayer + 1);
        visited.add(targetId);
        queue.push(targetId);
      }
    });
  }

  // Handle disconnected nodes
  nodes.forEach(node => {
    if (!layers.has(node.id)) {
      layers.set(node.id, 0);
    }
  });

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  layers.forEach((layer, nodeId) => {
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(nodeId);
  });

  // Calculate positions
  const positions = new Map<string, { x: number; y: number }>();
  const layerHeight = 150;

  layerGroups.forEach((nodeIds, layerIndex) => {
    const layerWidth = nodeIds.length * nodeSpacing;
    const startX = (width - layerWidth) / 2;
    const y = 100 + layerIndex * layerHeight;

    nodeIds.forEach((nodeId, index) => {
      const x = startX + index * nodeSpacing;
      positions.set(nodeId, { x: Math.round(x), y: Math.round(y) });
    });
  });

  return positions;
}

/**
 * Grid layout algorithm
 * Arranges nodes in a simple grid pattern
 */
export function applyGridLayout(
  nodes: LayoutNode[],
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  const {
    nodeSpacing = 200,
  } = options;

  const positions = new Map<string, { x: number; y: number }>();
  const cols = Math.ceil(Math.sqrt(nodes.length));

  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    positions.set(node.id, {
      x: 100 + col * nodeSpacing,
      y: 100 + row * nodeSpacing,
    });
  });

  return positions;
}

/**
 * Main layout function - applies the best layout algorithm
 */
export function autoLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  algorithm: 'force-directed' | 'hierarchical' | 'grid' = 'force-directed',
  options: LayoutOptions = {}
): Map<string, { x: number; y: number }> {
  console.log(`📐 Auto-layout: Applying ${algorithm} layout to ${nodes.length} nodes and ${edges.length} edges`);

  switch (algorithm) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges, options);
    case 'grid':
      return applyGridLayout(nodes, options);
    case 'force-directed':
    default:
      return applyForceDirectedLayout(nodes, edges, options);
  }
}
