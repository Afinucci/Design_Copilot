import { SpatialRelationship } from '../types';

export interface NodeGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IconPosition {
  relationshipId: string;
  optimalPosition: { x: number; y: number };
  alternativePositions: Array<{ x: number; y: number; score: number }>;
  collisionRisk: 'none' | 'low' | 'medium' | 'high';
  connectionPoints: {
    source: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
    target: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
  };
}

export class RelationshipPositioningService {
  /**
   * Calculate optimal icon positions for relationship visibility in overlapping scenarios
   */
  calculateOptimalIconPositions(
    relationships: SpatialRelationship[],
    nodeGeometry: NodeGeometry[],
    canvasSize: { width: number; height: number }
  ): IconPosition[] {
    const geometryMap = new Map(nodeGeometry.map(node => [node.id, node]));
    const iconPositions: IconPosition[] = [];
    
    for (const relationship of relationships) {
      const sourceGeometry = geometryMap.get(relationship.fromId);
      const targetGeometry = geometryMap.get(relationship.toId);
      
      if (!sourceGeometry || !targetGeometry) {
        continue;
      }
      
      // Calculate connection points on shape boundaries
      const connectionPoints = this.calculateConnectionPoints(sourceGeometry, targetGeometry);
      
      // Calculate optimal icon position considering overlaps
      const optimalPosition = this.calculateOptimalIconPosition(
        connectionPoints,
        relationship,
        nodeGeometry,
        relationships
      );
      
      // Assess collision risk
      const collisionRisk = this.assessCollisionRisk(
        optimalPosition,
        nodeGeometry,
        iconPositions
      );
      
      // Generate alternative positions if needed
      const alternativePositions = this.generateAlternativePositions(
        connectionPoints,
        optimalPosition,
        nodeGeometry
      );
      
      iconPositions.push({
        relationshipId: relationship.id,
        optimalPosition,
        alternativePositions,
        collisionRisk,
        connectionPoints
      });
    }
    
    return this.optimizeForNonOverlapping(iconPositions, nodeGeometry);
  }
  
  /**
   * Calculate connection points on shape boundaries
   */
  private calculateConnectionPoints(
    source: NodeGeometry,
    target: NodeGeometry
  ): {
    source: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
    target: { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' };
  } {
    // Calculate centers
    const sourceCenterX = source.x + source.width / 2;
    const sourceCenterY = source.y + source.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    
    // Calculate angle between centers
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const angle = Math.atan2(dy, dx);
    
    // Determine optimal connection sides based on relative positions
    const sourceConnection = this.getOptimalConnectionPoint(source, angle);
    const targetConnection = this.getOptimalConnectionPoint(target, angle + Math.PI);
    
    return { source: sourceConnection, target: targetConnection };
  }
  
  /**
   * Get optimal connection point on shape boundary
   */
  private getOptimalConnectionPoint(
    geometry: NodeGeometry,
    angle: number
  ): { x: number; y: number; side: 'top' | 'right' | 'bottom' | 'left' } {
    const centerX = geometry.x + geometry.width / 2;
    const centerY = geometry.y + geometry.height / 2;
    
    // Normalize angle to [0, 2π]
    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    
    // Determine side based on angle
    if (normalizedAngle < Math.PI / 4 || normalizedAngle >= 7 * Math.PI / 4) {
      // Right side
      return { 
        x: geometry.x + geometry.width, 
        y: centerY, 
        side: 'right' 
      };
    } else if (normalizedAngle < 3 * Math.PI / 4) {
      // Bottom side
      return { 
        x: centerX, 
        y: geometry.y + geometry.height, 
        side: 'bottom' 
      };
    } else if (normalizedAngle < 5 * Math.PI / 4) {
      // Left side
      return { 
        x: geometry.x, 
        y: centerY, 
        side: 'left' 
      };
    } else {
      // Top side
      return { 
        x: centerX, 
        y: geometry.y, 
        side: 'top' 
      };
    }
  }
  
  /**
   * Calculate optimal icon position considering overlaps and visibility
   */
  private calculateOptimalIconPosition(
    connectionPoints: {
      source: { x: number; y: number; side: string };
      target: { x: number; y: number; side: string };
    },
    relationship: SpatialRelationship,
    allGeometry: NodeGeometry[],
    allRelationships: SpatialRelationship[]
  ): { x: number; y: number } {
    // Calculate midpoint between connection points
    const midX = (connectionPoints.source.x + connectionPoints.target.x) / 2;
    const midY = (connectionPoints.source.y + connectionPoints.target.y) / 2;
    
    // Apply offset based on relationship type and priority
    const offset = this.getIconOffsetByType(relationship.type, relationship.priority);
    
    // Check for overlaps with shapes and adjust if necessary
    const adjustedPosition = this.adjustForShapeOverlaps(
      { x: midX + offset.x, y: midY + offset.y },
      allGeometry,
      relationship.type
    );
    
    return adjustedPosition;
  }
  
  /**
   * Get icon offset based on relationship type and priority
   */
  private getIconOffsetByType(
    type: string,
    priority: number
  ): { x: number; y: number } {
    const basePriorityOffset = Math.max(0, (priority - 5) * 5); // Higher priority = further from center
    
    switch (type) {
      case 'MATERIAL_FLOW':
        return { x: 0, y: -15 - basePriorityOffset };
      case 'PERSONNEL_FLOW':
        return { x: 15 + basePriorityOffset, y: 0 };
      case 'PROHIBITED_NEAR':
        return { x: 0, y: 20 + basePriorityOffset };
      case 'REQUIRES_ACCESS':
        return { x: -15 - basePriorityOffset, y: 0 };
      default:
        return { x: 0, y: -10 - basePriorityOffset };
    }
  }
  
  /**
   * Adjust position to avoid overlapping with shapes
   */
  private adjustForShapeOverlaps(
    position: { x: number; y: number },
    allGeometry: NodeGeometry[],
    relationshipType: string
  ): { x: number; y: number } {
    const iconSize = this.getIconSize(relationshipType);
    const iconBounds = {
      minX: position.x - iconSize / 2,
      maxX: position.x + iconSize / 2,
      minY: position.y - iconSize / 2,
      maxY: position.y + iconSize / 2
    };
    
    for (const geometry of allGeometry) {
      // Check if icon overlaps with shape
      if (this.boundsOverlap(iconBounds, {
        minX: geometry.x,
        maxX: geometry.x + geometry.width,
        minY: geometry.y,
        maxY: geometry.y + geometry.height
      })) {
        // Move icon away from shape
        return this.findNonOverlappingPosition(position, geometry, iconSize);
      }
    }
    
    return position;
  }
  
  /**
   * Check if two bounding boxes overlap
   */
  private boundsOverlap(
    bounds1: { minX: number; maxX: number; minY: number; maxY: number },
    bounds2: { minX: number; maxX: number; minY: number; maxY: number }
  ): boolean {
    return !(bounds1.maxX < bounds2.minX || 
             bounds1.minX > bounds2.maxX || 
             bounds1.maxY < bounds2.minY || 
             bounds1.minY > bounds2.maxY);
  }
  
  /**
   * Find non-overlapping position for icon
   */
  private findNonOverlappingPosition(
    currentPosition: { x: number; y: number },
    obstacleGeometry: NodeGeometry,
    iconSize: number
  ): { x: number; y: number } {
    const margin = 10;
    const obstacleCenterX = obstacleGeometry.x + obstacleGeometry.width / 2;
    const obstacleCenterY = obstacleGeometry.y + obstacleGeometry.height / 2;
    
    // Calculate direction away from obstacle center
    const dx = currentPosition.x - obstacleCenterX;
    const dy = currentPosition.y - obstacleCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      // If directly on center, move to a default position
      return { x: currentPosition.x + iconSize + margin, y: currentPosition.y };
    }
    
    // Normalize and extend beyond obstacle bounds
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    const requiredDistance = Math.max(
      obstacleGeometry.width / 2,
      obstacleGeometry.height / 2
    ) + iconSize / 2 + margin;
    
    return {
      x: obstacleCenterX + normalizedDx * requiredDistance,
      y: obstacleCenterY + normalizedDy * requiredDistance
    };
  }
  
  /**
   * Get icon size based on relationship type
   */
  private getIconSize(relationshipType: string): number {
    switch (relationshipType) {
      case 'PROHIBITED_NEAR': return 24;
      case 'MATERIAL_FLOW':
      case 'PERSONNEL_FLOW': return 20;
      default: return 16;
    }
  }
  
  /**
   * Assess collision risk for icon position
   */
  private assessCollisionRisk(
    position: { x: number; y: number },
    allGeometry: NodeGeometry[],
    existingIcons: IconPosition[]
  ): 'none' | 'low' | 'medium' | 'high' {
    let riskScore = 0;
    const iconSize = 20; // Average icon size
    
    // Check proximity to shapes
    for (const geometry of allGeometry) {
      const distance = this.calculateDistance(
        position,
        { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 }
      );
      
      if (distance < iconSize) {
        riskScore += 30;
      } else if (distance < iconSize * 2) {
        riskScore += 15;
      } else if (distance < iconSize * 3) {
        riskScore += 5;
      }
    }
    
    // Check proximity to other icons
    for (const existingIcon of existingIcons) {
      const distance = this.calculateDistance(position, existingIcon.optimalPosition);
      
      if (distance < iconSize) {
        riskScore += 25;
      } else if (distance < iconSize * 1.5) {
        riskScore += 10;
      }
    }
    
    if (riskScore >= 40) return 'high';
    if (riskScore >= 20) return 'medium';
    if (riskScore >= 5) return 'low';
    return 'none';
  }
  
  /**
   * Generate alternative positions if primary position has issues
   */
  private generateAlternativePositions(
    connectionPoints: any,
    primaryPosition: { x: number; y: number },
    allGeometry: NodeGeometry[]
  ): Array<{ x: number; y: number; score: number }> {
    const alternatives: Array<{ x: number; y: number; score: number }> = [];
    
    // Generate positions in a spiral pattern around the primary position
    const offsets = [
      { x: 25, y: 0 }, { x: -25, y: 0 }, { x: 0, y: 25 }, { x: 0, y: -25 },
      { x: 25, y: 25 }, { x: -25, y: -25 }, { x: 25, y: -25 }, { x: -25, y: 25 },
      { x: 40, y: 0 }, { x: -40, y: 0 }, { x: 0, y: 40 }, { x: 0, y: -40 }
    ];
    
    for (const offset of offsets) {
      const altPosition = {
        x: primaryPosition.x + offset.x,
        y: primaryPosition.y + offset.y
      };
      
      const score = this.calculatePositionScore(altPosition, allGeometry);
      alternatives.push({ ...altPosition, score });
    }
    
    return alternatives.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  
  /**
   * Calculate score for a position (higher is better)
   */
  private calculatePositionScore(
    position: { x: number; y: number },
    allGeometry: NodeGeometry[]
  ): number {
    let score = 100; // Base score
    
    // Penalize proximity to shapes
    for (const geometry of allGeometry) {
      const distance = this.calculateDistance(
        position,
        { x: geometry.x + geometry.width / 2, y: geometry.y + geometry.height / 2 }
      );
      
      if (distance < 30) {
        score -= (30 - distance) * 2;
      }
    }
    
    return Math.max(0, score);
  }
  
  /**
   * Calculate Euclidean distance between two points
   */
  private calculateDistance(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Optimize all icon positions to minimize overlaps
   */
  private optimizeForNonOverlapping(
    iconPositions: IconPosition[],
    allGeometry: NodeGeometry[]
  ): IconPosition[] {
    // Sort by priority (assuming higher priority relationships should get better positions)
    const sortedPositions = [...iconPositions].sort((a, b) => {
      // Assuming priority is stored in relationship data
      return b.collisionRisk === 'none' ? 1 : -1;
    });
    
    const optimizedPositions: IconPosition[] = [];
    
    for (const position of sortedPositions) {
      if (position.collisionRisk === 'high') {
        // Try to use the best alternative position
        const bestAlternative = position.alternativePositions[0];
        if (bestAlternative && bestAlternative.score > 50) {
          optimizedPositions.push({
            ...position,
            optimalPosition: bestAlternative,
            collisionRisk: 'low'
          });
        } else {
          optimizedPositions.push(position);
        }
      } else {
        optimizedPositions.push(position);
      }
    }
    
    return optimizedPositions;
  }
}