import React from 'react';
import { Node } from 'reactflow';
import { MIN_SEPARATION_DISTANCE, EDGE_CONTACT_TOLERANCE } from '../services/connectorLogic';

interface EdgeContactIndicatorProps {
  node: Node;
  canBeAdjacent: boolean;
  distance: number;
  isActive: boolean;
}

/**
 * Visual indicator for edge contact and separation zones
 */
const EdgeContactIndicator: React.FC<EdgeContactIndicatorProps> = ({
  node,
  canBeAdjacent,
  distance,
  isActive
}) => {
  if (!isActive) return null;

  const x = node.position.x;
  const y = node.position.y;
  const width = node.width || 150;
  const height = node.height || 80;

  // Determine what type of indicator to show
  let indicatorType: 'edge-glow' | 'separation-zone' | 'warning' = 'edge-glow';
  let indicatorColor = '#4CAF50';
  let strokeDasharray = 'none';
  let fillOpacity = 0;
  let strokeWidth = 2;
  let animation = '';

  if (canBeAdjacent) {
    // Show green glow for valid adjacency
    if (distance <= EDGE_CONTACT_TOLERANCE) {
      indicatorType = 'edge-glow';
      indicatorColor = '#4CAF50';
      strokeWidth = 3;
      animation = 'adjacency-pulse 1.5s infinite';
    }
  } else {
    // Show red zone for required separation
    if (distance < MIN_SEPARATION_DISTANCE) {
      indicatorType = 'separation-zone';
      indicatorColor = '#f44336';
      strokeDasharray = '5,5';
      fillOpacity = 0.1;
      strokeWidth = 2;
      animation = 'separation-warning 1s infinite';
    }
  }

  // Render appropriate indicator
  return (
    <g className="edge-contact-indicator">
      {indicatorType === 'edge-glow' && (
        <>
          {/* Top edge */}
          <line
            x1={x}
            y1={y}
            x2={x + width}
            y2={y}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            filter="url(#glow)"
            style={{ animation }}
          />
          {/* Right edge */}
          <line
            x1={x + width}
            y1={y}
            x2={x + width}
            y2={y + height}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            filter="url(#glow)"
            style={{ animation }}
          />
          {/* Bottom edge */}
          <line
            x1={x + width}
            y1={y + height}
            x2={x}
            y2={y + height}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            filter="url(#glow)"
            style={{ animation }}
          />
          {/* Left edge */}
          <line
            x1={x}
            y1={y + height}
            x2={x}
            y2={y}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            filter="url(#glow)"
            style={{ animation }}
          />
        </>
      )}

      {indicatorType === 'separation-zone' && (
        <>
          {/* Separation zone rectangle with padding */}
          <rect
            x={x - MIN_SEPARATION_DISTANCE}
            y={y - MIN_SEPARATION_DISTANCE}
            width={width + MIN_SEPARATION_DISTANCE * 2}
            height={height + MIN_SEPARATION_DISTANCE * 2}
            fill={indicatorColor}
            fillOpacity={fillOpacity}
            stroke={indicatorColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ animation }}
          />
          {/* Inner boundary */}
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="none"
            stroke={indicatorColor}
            strokeWidth={1}
            opacity={0.5}
          />
        </>
      )}

      {/* SVG filter for glow effect */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </g>
  );
};

export default EdgeContactIndicator;