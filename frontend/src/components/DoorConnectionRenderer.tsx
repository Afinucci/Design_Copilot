import React from 'react';
import { DoorConnection, DoorFlowType } from '../types';

interface DoorConnectionRendererProps {
  connections: DoorConnection[];
  onConnectionClick?: (connectionId: string) => void;
}

/**
 * Get color for flow type
 */
const getFlowColor = (flowType: DoorFlowType): string => {
  switch (flowType) {
    case 'material': return '#2196F3'; // Blue
    case 'personnel': return '#4CAF50'; // Green
    case 'waste': return '#F44336'; // Red
    default: return '#9E9E9E'; // Gray fallback
  }
};

/**
 * Renders door connections with arrows perpendicular to the shared edge
 */
export const DoorConnectionRenderer: React.FC<DoorConnectionRendererProps> = ({
  connections,
  onConnectionClick
}) => {
  const renderArrow = (
    edgePoint: { x: number; y: number },
    edgeAngle: number,
    color: string,
    isBidirectional: boolean
  ) => {
    // Arrow should point PERPENDICULAR to the edge (through the doorway)
    // edgeAngle is the angle of the edge itself
    // We want the arrow to point at 90 degrees to this (through the door)
    const perpendicularAngle = edgeAngle + Math.PI / 2;

    const arrowLength = 30;
    const arrowHeadSize = 10;

    if (isBidirectional) {
      // Two arrows pointing in opposite directions, both perpendicular to edge
      const offset = 8; // Small offset along the edge to separate arrows visually

      // First arrow pointing in one perpendicular direction
      const arrow1Angle = perpendicularAngle;
      const arrow1X = edgePoint.x + offset * Math.cos(edgeAngle);
      const arrow1Y = edgePoint.y + offset * Math.sin(edgeAngle);
      const arrow1StartX = arrow1X - (arrowLength / 2) * Math.cos(arrow1Angle);
      const arrow1StartY = arrow1Y - (arrowLength / 2) * Math.sin(arrow1Angle);
      const arrow1EndX = arrow1X + (arrowLength / 2) * Math.cos(arrow1Angle);
      const arrow1EndY = arrow1Y + (arrowLength / 2) * Math.sin(arrow1Angle);

      // Arrow head 1
      const head1LeftX = arrow1EndX - arrowHeadSize * Math.cos(arrow1Angle - Math.PI / 6);
      const head1LeftY = arrow1EndY - arrowHeadSize * Math.sin(arrow1Angle - Math.PI / 6);
      const head1RightX = arrow1EndX - arrowHeadSize * Math.cos(arrow1Angle + Math.PI / 6);
      const head1RightY = arrow1EndY - arrowHeadSize * Math.sin(arrow1Angle + Math.PI / 6);

      // Second arrow pointing in opposite perpendicular direction
      const arrow2Angle = perpendicularAngle + Math.PI; // 180 degrees opposite
      const arrow2X = edgePoint.x - offset * Math.cos(edgeAngle);
      const arrow2Y = edgePoint.y - offset * Math.sin(edgeAngle);
      const arrow2StartX = arrow2X - (arrowLength / 2) * Math.cos(arrow2Angle);
      const arrow2StartY = arrow2Y - (arrowLength / 2) * Math.sin(arrow2Angle);
      const arrow2EndX = arrow2X + (arrowLength / 2) * Math.cos(arrow2Angle);
      const arrow2EndY = arrow2Y + (arrowLength / 2) * Math.sin(arrow2Angle);

      // Arrow head 2
      const head2LeftX = arrow2EndX - arrowHeadSize * Math.cos(arrow2Angle - Math.PI / 6);
      const head2LeftY = arrow2EndY - arrowHeadSize * Math.sin(arrow2Angle - Math.PI / 6);
      const head2RightX = arrow2EndX - arrowHeadSize * Math.cos(arrow2Angle + Math.PI / 6);
      const head2RightY = arrow2EndY - arrowHeadSize * Math.sin(arrow2Angle + Math.PI / 6);

      return (
        <g>
          {/* First arrow */}
          <line
            x1={arrow1StartX}
            y1={arrow1StartY}
            x2={arrow1EndX}
            y2={arrow1EndY}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line x1={head1LeftX} y1={head1LeftY} x2={arrow1EndX} y2={arrow1EndY} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1={head1RightX} y1={head1RightY} x2={arrow1EndX} y2={arrow1EndY} stroke={color} strokeWidth={3} strokeLinecap="round" />

          {/* Second arrow */}
          <line
            x1={arrow2StartX}
            y1={arrow2StartY}
            x2={arrow2EndX}
            y2={arrow2EndY}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line x1={head2LeftX} y1={head2LeftY} x2={arrow2EndX} y2={arrow2EndY} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1={head2RightX} y1={head2RightY} x2={arrow2EndX} y2={arrow2EndY} stroke={color} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    } else {
      // Single arrow perpendicular to edge
      const arrowAngle = perpendicularAngle;
      const arrowStartX = edgePoint.x - (arrowLength / 2) * Math.cos(arrowAngle);
      const arrowStartY = edgePoint.y - (arrowLength / 2) * Math.sin(arrowAngle);
      const arrowEndX = edgePoint.x + (arrowLength / 2) * Math.cos(arrowAngle);
      const arrowEndY = edgePoint.y + (arrowLength / 2) * Math.sin(arrowAngle);

      // Arrow head
      const headLeftX = arrowEndX - arrowHeadSize * Math.cos(arrowAngle - Math.PI / 6);
      const headLeftY = arrowEndY - arrowHeadSize * Math.sin(arrowAngle - Math.PI / 6);
      const headRightX = arrowEndX - arrowHeadSize * Math.cos(arrowAngle + Math.PI / 6);
      const headRightY = arrowEndY - arrowHeadSize * Math.sin(arrowAngle + Math.PI / 6);

      return (
        <g>
          <line
            x1={arrowStartX}
            y1={arrowStartY}
            x2={arrowEndX}
            y2={arrowEndY}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <line x1={headLeftX} y1={headLeftY} x2={arrowEndX} y2={arrowEndY} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <line x1={headRightX} y1={headRightY} x2={arrowEndX} y2={arrowEndY} stroke={color} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    }
  };

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 100
      }}
    >
      {connections.map((connection) => {
        const color = getFlowColor(connection.flowType);
        const from = connection.fromShape;
        const to = connection.toShape;

        // Use the actual midpoint between the two edge points (which are on the shared edge)
        const edgeMidX = (from.x + to.x) / 2;
        const edgeMidY = (from.y + to.y) / 2;

        // Calculate the angle of the shared edge itself using the edge endpoints
        let edgeAngle = 0;
        if (connection.edgeStartPoint && connection.edgeEndPoint) {
          const dx = connection.edgeEndPoint.x - connection.edgeStartPoint.x;
          const dy = connection.edgeEndPoint.y - connection.edgeStartPoint.y;
          edgeAngle = Math.atan2(dy, dx);
        } else {
          // Fallback: calculate from from/to points
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          edgeAngle = Math.atan2(dy, dx);
        }

        return (
          <g
            key={connection.id}
            style={{ cursor: onConnectionClick ? 'pointer' : 'default' }}
            onClick={() => onConnectionClick?.(connection.id)}
          >
            {/* Flow arrow perpendicular to the shared edge, at the edge midpoint */}
            {renderArrow(
              { x: edgeMidX, y: edgeMidY },
              edgeAngle,
              color,
              connection.flowDirection === 'bidirectional'
            )}
          </g>
        );
      })}
    </svg>
  );
};

export default DoorConnectionRenderer;
