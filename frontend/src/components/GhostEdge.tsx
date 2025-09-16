import React from 'react';
import {
  EdgeProps,
  getStraightPath,
  EdgeLabelRenderer,
} from 'reactflow';
import { GhostRelationship } from '../types';

interface GhostEdgeData {
  relationship: GhostRelationship;
}

const GhostEdge: React.FC<EdgeProps<GhostEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected = false,
}) => {
  const relationship = data?.relationship;
  if (!relationship) return null;


  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return '#1976d2';
      case 'PROHIBITED_NEAR': return '#d32f2f';
      case 'REQUIRES_ACCESS': return '#0288d1';
      case 'SHARES_UTILITY': return '#388e3c';
      case 'MATERIAL_FLOW': return '#9c27b0';
      case 'PERSONNEL_FLOW': return '#ff9800';
      default: return '#757575';
    }
  };

  const getRelationshipDashArray = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return '8,4';
      case 'PROHIBITED_NEAR': return '12,6';
      case 'REQUIRES_ACCESS': return '6,6';
      case 'SHARES_UTILITY': return '4,4';
      case 'MATERIAL_FLOW': return '10,4,4,4';
      case 'PERSONNEL_FLOW': return '6,4,6,4';
      default: return '8,4';
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO': return 'Adjacent';
      case 'PROHIBITED_NEAR': return 'Prohibited';
      case 'REQUIRES_ACCESS': return 'Access';
      case 'SHARES_UTILITY': return 'Utility';
      case 'MATERIAL_FLOW': return 'Material';
      case 'PERSONNEL_FLOW': return 'Personnel';
      default: return 'Relation';
    }
  };

  const color = getRelationshipColor(relationship.type);
  const dashArray = getRelationshipDashArray(relationship.type);
  const label = getRelationshipLabel(relationship.type);
  
  // Fixed opacity for all ghost edges
  const opacity = 0.8;
  

  return (
    <>
      <path
        id={id}
        style={{
          stroke: color,
          strokeWidth: 4, // Increased from 2 for better visibility
          strokeDasharray: dashArray,
          strokeOpacity: opacity,
          fill: 'none',
        }}
        className="ghost-edge-path"
        d={edgePath}
      />
      
      {/* Add arrow marker for directional flows */}
      {(relationship.type === 'MATERIAL_FLOW' || relationship.type === 'PERSONNEL_FLOW') && 
       relationship.flowDirection === 'unidirectional' && (
        <defs>
          <marker
            id={`ghost-arrow-${id}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="3"
            orient="auto"
            markerWidth="10"
            markerHeight="10"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              fill={color}
              fillOpacity={opacity}
            />
          </marker>
        </defs>
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            fontWeight: 600,
            pointerEvents: 'all',
            opacity: opacity,
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: `1px dashed ${color}`,
              borderRadius: '4px',
              padding: '2px 6px',
              color: color,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {label}
          </div>
        </div>
      </EdgeLabelRenderer>

      <style>{`
        .ghost-edge-path:hover {
          stroke-width: 6; // Increased from 3 to match thicker base
          transition: stroke-width 0.2s ease;
          filter: brightness(1.2);
        }
        
        .ghost-edge-path {
          cursor: pointer;
          drop-shadow: 0 0 4px rgba(0,0,0,0.3);
        }
      `}</style>
    </>
  );
};

export default GhostEdge;