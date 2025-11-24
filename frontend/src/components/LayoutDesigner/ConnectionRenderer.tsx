import React from 'react';
import { Connection, getSharedEdgePoint } from './types';
import { ShapeProperties } from './PropertiesPanel';

interface ConnectionRendererProps {
  connections: Connection[];
  shapes: ShapeProperties[];
  selectedConnectionId: string | null;
  onConnectionClick: (id: string) => void;
}

const ConnectionRenderer: React.FC<ConnectionRendererProps> = ({
  connections,
  shapes,
  selectedConnectionId,
  onConnectionClick,
}) => {
  // Calculate arrow size based on connection type
  const getArrowSize = (type: Connection['type']) => {
    return type === 'personnel' ? 12 : 10;
  };

  // Get color for connection type
  const getConnectionColor = (type: Connection['type']) => {
    return type === 'personnel' ? '#2196F3' : '#4CAF50'; // Blue for personnel, green for material
  };

  // Render a single arrow
  const renderArrow = (
    x: number,
    y: number,
    angle: number,
    type: Connection['type'],
    isSelected: boolean
  ) => {
    const size = getArrowSize(type);
    const color = getConnectionColor(type);

    // Convert angle to radians for calculation
    const rad = (angle * Math.PI) / 180;

    // Calculate arrow head points
    const arrowLength = size;
    const arrowWidth = size * 0.6;

    // Arrow tip point
    const tipX = x + Math.cos(rad) * arrowLength;
    const tipY = y + Math.sin(rad) * arrowLength;

    // Arrow base points (perpendicular to direction)
    const baseX1 = x + Math.cos(rad - Math.PI / 2) * arrowWidth / 2;
    const baseY1 = y + Math.sin(rad - Math.PI / 2) * arrowWidth / 2;
    const baseX2 = x + Math.cos(rad + Math.PI / 2) * arrowWidth / 2;
    const baseY2 = y + Math.sin(rad + Math.PI / 2) * arrowWidth / 2;

    // Create arrow path
    const arrowPath = `M ${tipX} ${tipY} L ${baseX1} ${baseY1} L ${baseX2} ${baseY2} Z`;

    // Render arrow based on type
    if (type === 'personnel') {
      // Solid arrow for personnel
      return (
        <path
          d={arrowPath}
          fill={color}
          stroke={isSelected ? '#FF9800' : color}
          strokeWidth={isSelected ? 2 : 1}
        />
      );
    } else {
      // Dashed/outlined arrow for material
      return (
        <>
          <path
            d={arrowPath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="3,2"
          />
          {isSelected && (
            <path
              d={arrowPath}
              fill="none"
              stroke="#FF9800"
              strokeWidth={3}
              opacity={0.5}
            />
          )}
        </>
      );
    }
  };

  return (
    <>
      {connections.map((connection) => {
        const fromShape = shapes.find(s => s.id === connection.fromShapeId);
        const toShape = shapes.find(s => s.id === connection.toShapeId);

        if (!fromShape || !toShape) return null;

        const edgePoint = getSharedEdgePoint(fromShape, toShape);
        if (!edgePoint) return null;

        const isSelected = connection.id === selectedConnectionId;

        // Group connections at the same edge (count existing connections)
        const connectionsAtSameEdge = connections.filter(c => {
          if (c.id === connection.id) return false;
          const from = shapes.find(s => s.id === c.fromShapeId);
          const to = shapes.find(s => s.id === c.toShapeId);
          if (!from || !to) return false;
          const otherEdge = getSharedEdgePoint(from, to);
          if (!otherEdge) return false;
          // Check if they're at roughly the same position
          return Math.abs(otherEdge.x - edgePoint.x) < 5 && Math.abs(otherEdge.y - edgePoint.y) < 5;
        });

        const connectionIndex = connections.indexOf(connection);
        const offset = connectionsAtSameEdge.length > 0 ? connectionIndex * 20 : 0;

        // Apply offset perpendicular to the arrow direction
        const offsetRad = ((edgePoint.angle + 90) * Math.PI) / 180;
        const offsetX = Math.cos(offsetRad) * offset;
        const offsetY = Math.sin(offsetRad) * offset;

        const adjustedX = edgePoint.x + offsetX;
        const adjustedY = edgePoint.y + offsetY;

        return (
          <g
            key={connection.id}
            onClick={(e) => {
              e.stopPropagation();
              onConnectionClick(connection.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            {/* Clickable area around the arrows */}
            <circle
              cx={adjustedX}
              cy={adjustedY}
              r={20}
              fill="transparent"
              stroke="none"
            />

            {connection.direction === 'bidirectional' ? (
              <>
                {/* Forward arrow */}
                {renderArrow(adjustedX, adjustedY, edgePoint.angle, connection.type, isSelected)}
                {/* Backward arrow (opposite direction) */}
                {renderArrow(adjustedX, adjustedY, edgePoint.angle + 180, connection.type, isSelected)}
              </>
            ) : (
              <>
                {/* Single arrow for unidirectional */}
                {renderArrow(adjustedX, adjustedY, edgePoint.angle, connection.type, isSelected)}
              </>
            )}

            {/* Label if present */}
            {connection.label && (
              <text
                x={adjustedX}
                y={adjustedY - 20}
                textAnchor="middle"
                fontSize={10}
                fill={getConnectionColor(connection.type)}
                fontWeight="bold"
              >
                {connection.label}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
};

export default ConnectionRenderer;