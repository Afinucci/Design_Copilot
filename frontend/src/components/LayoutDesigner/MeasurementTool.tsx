import React from 'react';
import { UnitConverter } from '../../utils/unitConversion';

export interface Measurement {
  id: string;
  type: 'dimension' | 'area' | 'label';
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  position: { x: number; y: number };
  value?: number; // in pixels
  text?: string; // custom label
  autoCalculate: boolean;
  fontSize: number;
  color: string;
  createdAt: Date;
}

export interface MeasurementRendererProps {
  measurements: Measurement[];
  unitConverter: UnitConverter;
  selectedMeasurementId?: string | null;
  onMeasurementClick: (id: string) => void;
  onMeasurementMove?: (id: string, position: { x: number; y: number }) => void;
}

export const MeasurementRenderer: React.FC<MeasurementRendererProps> = ({
  measurements,
  unitConverter,
  selectedMeasurementId,
  onMeasurementClick,
  onMeasurementMove,
}) => {
  const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const calculateAngle = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
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
        zIndex: 15,
      }}
    >
      {measurements.map((measurement) => {
        const isSelected = measurement.id === selectedMeasurementId;

        if (measurement.type === 'dimension' && measurement.startPoint && measurement.endPoint) {
          const distance = calculateDistance(measurement.startPoint, measurement.endPoint);
          const angle = calculateAngle(measurement.startPoint, measurement.endPoint);
          const midX = (measurement.startPoint.x + measurement.endPoint.x) / 2;
          const midY = (measurement.startPoint.y + measurement.endPoint.y) / 2;

          const offset = 20; // Offset from the line
          const perpAngle = angle + 90;
          const labelX = midX + offset * Math.cos(perpAngle * Math.PI / 180);
          const labelY = midY + offset * Math.sin(perpAngle * Math.PI / 180);

          return (
            <g key={measurement.id}>
              {/* Main dimension line */}
              <line
                x1={measurement.startPoint.x}
                y1={measurement.startPoint.y}
                x2={measurement.endPoint.x}
                y2={measurement.endPoint.y}
                stroke={isSelected ? '#FF5722' : measurement.color}
                strokeWidth={isSelected ? 3 : 2}
                strokeDasharray="5,5"
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onClick={() => onMeasurementClick(measurement.id)}
              />

              {/* End markers */}
              <circle
                cx={measurement.startPoint.x}
                cy={measurement.startPoint.y}
                r={4}
                fill={measurement.color}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
              />
              <circle
                cx={measurement.endPoint.x}
                cy={measurement.endPoint.y}
                r={4}
                fill={measurement.color}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
              />

              {/* Dimension label */}
              <g transform={`translate(${labelX}, ${labelY})`}>
                <rect
                  x={-40}
                  y={-12}
                  width={80}
                  height={24}
                  fill="white"
                  stroke={measurement.color}
                  strokeWidth={1}
                  rx={4}
                  pointerEvents="all"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onMeasurementClick(measurement.id)}
                />
                <text
                  x={0}
                  y={4}
                  textAnchor="middle"
                  fontSize={measurement.fontSize}
                  fill={measurement.color}
                  fontWeight="bold"
                  pointerEvents="none"
                >
                  {unitConverter.formatPixels(distance)}
                </text>
              </g>
            </g>
          );
        }

        if (measurement.type === 'area') {
          return (
            <g key={measurement.id}>
              <rect
                x={measurement.position.x - 60}
                y={measurement.position.y - 15}
                width={120}
                height={30}
                fill="white"
                stroke={isSelected ? '#FF5722' : measurement.color}
                strokeWidth={isSelected ? 3 : 2}
                rx={6}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onClick={() => onMeasurementClick(measurement.id)}
              />
              <text
                x={measurement.position.x}
                y={measurement.position.y + 5}
                textAnchor="middle"
                fontSize={measurement.fontSize}
                fill={measurement.color}
                fontWeight="bold"
                pointerEvents="none"
              >
                {measurement.value
                  ? unitConverter.formatArea(measurement.value)
                  : 'Area'}
              </text>
            </g>
          );
        }

        if (measurement.type === 'label') {
          return (
            <g key={measurement.id}>
              <rect
                x={measurement.position.x - 50}
                y={measurement.position.y - 15}
                width={100}
                height={30}
                fill="rgba(255, 255, 255, 0.9)"
                stroke={isSelected ? '#FF5722' : measurement.color}
                strokeWidth={isSelected ? 3 : 2}
                rx={4}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onClick={() => onMeasurementClick(measurement.id)}
              />
              <text
                x={measurement.position.x}
                y={measurement.position.y + 5}
                textAnchor="middle"
                fontSize={measurement.fontSize}
                fill={measurement.color}
                fontWeight="500"
                pointerEvents="none"
              >
                {measurement.text || 'Label'}
              </text>
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
};

export default MeasurementRenderer;
