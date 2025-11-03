import React from 'react';
import { Box } from '@mui/material';
import { UnitConverter } from '../../utils/unitConversion';

export interface RulerOverlayProps {
  canvasWidth: number;
  canvasHeight: number;
  unitConverter: UnitConverter;
  rulerSize?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const RulerOverlay: React.FC<RulerOverlayProps> = ({
  canvasWidth,
  canvasHeight,
  unitConverter,
  rulerSize = 30,
  backgroundColor = '#f0f0f0',
  textColor = '#333',
}) => {
  const config = unitConverter.getConfig();
  const pixelsPerUnit = config.pixelsPerUnit;

  // Calculate major tick interval (show every 5 or 10 units depending on scale)
  const unitsPerMajorTick = pixelsPerUnit > 50 ? 5 : 10;
  const pixelsPerMajorTick = pixelsPerUnit * unitsPerMajorTick;

  // Generate horizontal ruler ticks
  const horizontalTicks: React.ReactNode[] = [];
  for (let x = 0; x <= canvasWidth; x += pixelsPerMajorTick) {
    const unitValue = unitConverter.pixelsToUnits(x);
    const displayValue = Math.round(unitValue / unitsPerMajorTick) * unitsPerMajorTick;

    // Major tick
    horizontalTicks.push(
      <line
        key={`h-major-${x}`}
        x1={x}
        y1={rulerSize}
        x2={x}
        y2={rulerSize - 10}
        stroke={textColor}
        strokeWidth={2}
      />
    );

    // Label
    horizontalTicks.push(
      <text
        key={`h-label-${x}`}
        x={x}
        y={rulerSize - 14}
        textAnchor="middle"
        fontSize={10}
        fill={textColor}
        fontWeight="bold"
      >
        {displayValue}
      </text>
    );

    // Minor ticks (between major ticks)
    const minorTickCount = 5;
    const minorTickSpacing = pixelsPerMajorTick / minorTickCount;
    for (let i = 1; i < minorTickCount; i++) {
      const minorX = x + i * minorTickSpacing;
      if (minorX <= canvasWidth) {
        horizontalTicks.push(
          <line
            key={`h-minor-${x}-${i}`}
            x1={minorX}
            y1={rulerSize}
            y2={rulerSize - 5}
            x2={minorX}
            stroke={textColor}
            strokeWidth={1}
            opacity={0.5}
          />
        );
      }
    }
  }

  // Generate vertical ruler ticks
  const verticalTicks: React.ReactNode[] = [];
  for (let y = 0; y <= canvasHeight; y += pixelsPerMajorTick) {
    const unitValue = unitConverter.pixelsToUnits(y);
    const displayValue = Math.round(unitValue / unitsPerMajorTick) * unitsPerMajorTick;

    // Major tick
    verticalTicks.push(
      <line
        key={`v-major-${y}`}
        x1={rulerSize}
        y1={y}
        x2={rulerSize - 10}
        y2={y}
        stroke={textColor}
        strokeWidth={2}
      />
    );

    // Label (rotated)
    verticalTicks.push(
      <text
        key={`v-label-${y}`}
        x={rulerSize - 14}
        y={y}
        textAnchor="middle"
        fontSize={10}
        fill={textColor}
        fontWeight="bold"
        transform={`rotate(-90, ${rulerSize - 14}, ${y})`}
      >
        {displayValue}
      </text>
    );

    // Minor ticks
    const minorTickCount = 5;
    const minorTickSpacing = pixelsPerMajorTick / minorTickCount;
    for (let i = 1; i < minorTickCount; i++) {
      const minorY = y + i * minorTickSpacing;
      if (minorY <= canvasHeight) {
        verticalTicks.push(
          <line
            key={`v-minor-${y}-${i}`}
            x1={rulerSize}
            y1={minorY}
            x2={rulerSize - 5}
            y2={minorY}
            stroke={textColor}
            strokeWidth={1}
            opacity={0.5}
          />
        );
      }
    }
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasWidth,
        height: canvasHeight,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Horizontal Ruler (Top) */}
      <svg
        width={canvasWidth}
        height={rulerSize}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <rect
          width={canvasWidth}
          height={rulerSize}
          fill={backgroundColor}
          opacity={0.95}
        />
        <line
          x1={0}
          y1={rulerSize - 1}
          x2={canvasWidth}
          y2={rulerSize - 1}
          stroke={textColor}
          strokeWidth={2}
        />
        {horizontalTicks}

        {/* Unit label */}
        <text
          x={canvasWidth - 40}
          y={12}
          fontSize={11}
          fill={textColor}
          fontWeight="bold"
        >
          ({config.abbreviation})
        </text>
      </svg>

      {/* Vertical Ruler (Left) */}
      <svg
        width={rulerSize}
        height={canvasHeight}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <rect
          width={rulerSize}
          height={canvasHeight}
          fill={backgroundColor}
          opacity={0.95}
        />
        <line
          x1={rulerSize - 1}
          y1={0}
          x2={rulerSize - 1}
          y2={canvasHeight}
          stroke={textColor}
          strokeWidth={2}
        />
        {verticalTicks}

        {/* Unit label */}
        <text
          x={12}
          y={canvasHeight - 20}
          fontSize={11}
          fill={textColor}
          fontWeight="bold"
          transform={`rotate(-90, 12, ${canvasHeight - 20})`}
        >
          ({config.abbreviation})
        </text>
      </svg>

      {/* Corner square */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: rulerSize,
          height: rulerSize,
          backgroundColor: backgroundColor,
          opacity: 0.95,
          borderRight: `2px solid ${textColor}`,
          borderBottom: `2px solid ${textColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={20} height={20}>
          <line x1={2} y1={18} x2={18} y2={2} stroke={textColor} strokeWidth={2} />
          <polygon points="18,2 14,2 18,6" fill={textColor} />
          <polygon points="2,18 2,14 6,18" fill={textColor} />
        </svg>
      </Box>
    </Box>
  );
};

export default RulerOverlay;
