import React, { useEffect, useState } from 'react';
import { Node, useReactFlow } from 'reactflow';
// Removed useGuidedAdjacency hook dependency as guided mode is deprecated

interface AdjacencyHighlightsProps {
  nodes: Node[];
  edges: any[];
  isDragging: boolean;
  draggedNodeId: string | null;
}

export const AdjacencyHighlights: React.FC<AdjacencyHighlightsProps> = ({
  nodes,
  edges,
  isDragging,
  draggedNodeId,
}) => {
  const { project, getViewport } = useReactFlow();
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Stubbed out guided adjacency functionality
  const edgeHighlights: any[] = [];
  const getEdgeHighlightStyle = () => ({ stroke: '#666', strokeWidth: 1 });

  // Debug logging
  useEffect(() => {
    if (isDragging && draggedNodeId) {
      const draggedNode = nodes.find(n => n.id === draggedNodeId);
      const debugMsg = `Dragging: ${draggedNodeId}, Node type: ${draggedNode?.type}, Category: ${draggedNode?.data?.category}, Highlights: ${edgeHighlights.length}`;
      console.log('🎯 AdjacencyHighlights:', debugMsg);
      setDebugInfo(debugMsg);
    } else {
      setDebugInfo('');
    }
  }, [isDragging, draggedNodeId, nodes, edgeHighlights]);

  if (!isDragging || !draggedNodeId || edgeHighlights.length === 0) {
    return (
      <>
        {/* Debug overlay */}
        {debugInfo && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '5px 10px',
            fontSize: '12px',
            zIndex: 9999,
            borderRadius: '4px'
          }}>
            {debugInfo}
          </div>
        )}
      </>
    );
  }

  // Get viewport for coordinate transformation
  const viewport = getViewport();

  return (
    <>
      {/* Debug overlay */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '5px 10px',
        fontSize: '12px',
        zIndex: 9999,
        borderRadius: '4px'
      }}>
        {debugInfo}
      </div>

      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <defs>
          <style>
            {`
              @keyframes pulse {
                0% { opacity: 0.6; }
                50% { opacity: 1; }
                100% { opacity: 0.6; }
              }
              @keyframes dash {
                to {
                  stroke-dashoffset: -10;
                }
              }
            `}
          </style>
        </defs>
        {nodes.map((node) => {
          const nodeHighlights = edgeHighlights.filter((h) => h.nodeId === node.id);
          if (nodeHighlights.length === 0) return null;

          const width = node.width || 150;
          const height = node.height || 80;
          
          // Transform node position to screen coordinates
          const screenPos = project({
            x: node.position.x,
            y: node.position.y,
          });

          const x = screenPos.x;
          const y = screenPos.y;

          // Scale dimensions with zoom
          const scaledWidth = width * viewport.zoom;
          const scaledHeight = height * viewport.zoom;

          return (
            <g key={node.id}>
              {/* Highlight box for visibility - different styles for adjacency vs prohibition */}
              <rect
                x={x}
                y={y}
                width={scaledWidth}
                height={scaledHeight}
                fill={nodeHighlights.some(h => h.canConnect) ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}
                stroke={nodeHighlights.some(h => h.canConnect) ? '#4CAF50' : '#f44336'}
                strokeWidth="3"
                strokeDasharray={nodeHighlights.some(h => h.canConnect) ? 'none' : '8,4'}
                opacity="0.8"
              />
              
              {/* Superimposition indicator for allowed adjacency */}
              {nodeHighlights.some(h => h.canConnect) && (
                <>
                  <rect
                    x={x - 10}
                    y={y - 10}
                    width={scaledWidth + 20}
                    height={scaledHeight + 20}
                    fill="none"
                    stroke="#4CAF50"
                    strokeWidth="2"
                    strokeDasharray="10,5"
                    opacity="0.4"
                  />
                  <text
                    x={x + scaledWidth / 2}
                    y={y - 15}
                    textAnchor="middle"
                    fill="#4CAF50"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    ✓ Can Superimpose
                  </text>
                </>
              )}

              {/* Add connection indicators at corners */}
              {nodeHighlights.some((h) => h.canConnect) && (
                <>
                  {/* Top edge indicator */}
                  <circle
                    cx={x + scaledWidth / 2}
                    cy={y}
                    r="6"
                    fill="#4CAF50"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;8;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Bottom edge indicator */}
                  <circle
                    cx={x + scaledWidth / 2}
                    cy={y + scaledHeight}
                    r="6"
                    fill="#4CAF50"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;8;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Left edge indicator */}
                  <circle
                    cx={x}
                    cy={y + scaledHeight / 2}
                    r="6"
                    fill="#4CAF50"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;8;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Right edge indicator */}
                  <circle
                    cx={x + scaledWidth}
                    cy={y + scaledHeight / 2}
                    r="6"
                    fill="#4CAF50"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="r"
                      values="5;8;5"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
              
              {/* Add prohibition indicators */}
              {nodeHighlights.some((h) => !h.canConnect) && (
                <g opacity="0.8">
                  <text
                    x={x + scaledWidth / 2}
                    y={y - 10}
                    textAnchor="middle"
                    fill="#f44336"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    ⚠ Must Stay Separated
                  </text>
                  
                  {/* Visual separator lines to indicate forced separation */}
                  <g opacity="0.6">
                    <line 
                      x1={x - 25} 
                      y1={y + scaledHeight / 2} 
                      x2={x - 5} 
                      y2={y + scaledHeight / 2}
                      stroke="#f44336" 
                      strokeWidth="3"
                    />
                    <line 
                      x1={x + scaledWidth + 5} 
                      y1={y + scaledHeight / 2} 
                      x2={x + scaledWidth + 25} 
                      y2={y + scaledHeight / 2}
                      stroke="#f44336" 
                      strokeWidth="3"
                    />
                    <line 
                      x1={x + scaledWidth / 2} 
                      y1={y - 25} 
                      x2={x + scaledWidth / 2} 
                      y2={y - 5}
                      stroke="#f44336" 
                      strokeWidth="3"
                    />
                    <line 
                      x1={x + scaledWidth / 2} 
                      y1={y + scaledHeight + 5} 
                      x2={x + scaledWidth / 2} 
                      y2={y + scaledHeight + 25}
                      stroke="#f44336" 
                      strokeWidth="3"
                    />
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </>
  );
};