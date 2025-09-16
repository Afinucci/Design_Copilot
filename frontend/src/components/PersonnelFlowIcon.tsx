import React from 'react';

interface PersonnelFlowIconProps {
  x: number;
  y: number;
  direction?: 'forward' | 'backward' | 'bidirectional';
  size?: number;
  color?: string;
}

const PersonnelFlowIcon: React.FC<PersonnelFlowIconProps> = ({
  x,
  y,
  direction = 'forward',
  size = 24,
  color = '#4CAF50'
}) => {
  const arrowOffset = size * 0.6;
  
  return (
    <g transform={`translate(${x - size/2}, ${y - size/2})`}>
      {/* Human icon */}
      <g>
        {/* Head */}
        <circle 
          cx={size/2} 
          cy={size * 0.25} 
          r={size * 0.15} 
          fill={color} 
          stroke="white" 
          strokeWidth="1"
        />
        
        {/* Body */}
        <rect 
          x={size * 0.35} 
          y={size * 0.4} 
          width={size * 0.3} 
          height={size * 0.4} 
          rx={size * 0.05}
          fill={color} 
          stroke="white" 
          strokeWidth="1"
        />
        
        {/* Arms */}
        <rect 
          x={size * 0.2} 
          y={size * 0.45} 
          width={size * 0.6} 
          height={size * 0.08} 
          rx={size * 0.04}
          fill={color} 
          stroke="white" 
          strokeWidth="1"
        />
        
        {/* Legs */}
        <rect 
          x={size * 0.38} 
          y={size * 0.75} 
          width={size * 0.08} 
          height={size * 0.2} 
          rx={size * 0.04}
          fill={color} 
          stroke="white" 
          strokeWidth="1"
        />
        <rect 
          x={size * 0.54} 
          y={size * 0.75} 
          width={size * 0.08} 
          height={size * 0.2} 
          rx={size * 0.04}
          fill={color} 
          stroke="white" 
          strokeWidth="1"
        />
      </g>
      
      {/* Direction arrow */}
      {direction !== 'bidirectional' && (
        <g transform={`translate(${direction === 'forward' ? size + 5 : -15}, ${size/2})`}>
          <path 
            d={direction === 'forward' 
              ? "M0,0 L8,0 M5,-3 L8,0 L5,3" 
              : "M8,0 L0,0 M3,-3 L0,0 L3,3"
            }
            stroke={color} 
            strokeWidth="2" 
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      
      {/* Bidirectional arrows */}
      {direction === 'bidirectional' && (
        <>
          <g transform={`translate(${size + 5}, ${size/2})`}>
            <path 
              d="M0,0 L8,0 M5,-3 L8,0 L5,3" 
              stroke={color} 
              strokeWidth="2" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <g transform={`translate(-15, ${size/2})`}>
            <path 
              d="M8,0 L0,0 M3,-3 L0,0 L3,3" 
              stroke={color} 
              strokeWidth="2" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </>
      )}
    </g>
  );
};

export default PersonnelFlowIcon;