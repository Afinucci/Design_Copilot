import React, { useState, useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Chip, Divider, Tooltip } from '@mui/material';
import { 
  SwapHoriz, 
  Person, 
  Settings, 
  Speed, 
  Warning, 
  Room,
  TrendingUp,
  Schedule,
  Security
} from '@mui/icons-material';

interface RelationshipPreviewData {
  id: string;
  type: string;
  fromNodeName: string;
  toNodeName: string;
  reason?: string;
  priority?: number;
  confidence?: number;
  flowDirection?: string;
  flowType?: string;
  doorType?: string;
  minDistance?: number;
  maxDistance?: number;
}

interface RelationshipPreviewProps {
  relationships: RelationshipPreviewData[];
  triggerNodeName: string;
  targetNodeName: string;
  position: { x: number; y: number };
  visible: boolean;
  onConnectionPreview?: (relationshipType: string) => void;
}

const RelationshipPreview: React.FC<RelationshipPreviewProps> = ({
  relationships,
  triggerNodeName,
  targetNodeName,
  position,
  visible,
  onConnectionPreview
}) => {
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null);

  // Get relationship styling and metadata
  const getRelationshipInfo = useCallback((type: string) => {
    switch (type) {
      case 'ADJACENT_TO':
        return {
          icon: <Room />,
          color: '#1976d2',
          label: 'Adjacent',
          description: 'Areas should be physically next to each other'
        };
      case 'PROHIBITED_NEAR':
        return {
          icon: <Warning />,
          color: '#d32f2f',
          label: 'Prohibited',
          description: 'Areas must be kept separate for safety/compliance'
        };
      case 'REQUIRES_ACCESS':
        return {
          icon: <Speed />,
          color: '#0288d1',
          label: 'Access Required',
          description: 'Personnel need access between these areas'
        };
      case 'SHARES_UTILITY':
        return {
          icon: <Settings />,
          color: '#388e3c',
          label: 'Shared Utilities',
          description: 'Areas share utilities like HVAC, electrical, or water'
        };
      case 'MATERIAL_FLOW':
        return {
          icon: <SwapHoriz />,
          color: '#9c27b0',
          label: 'Material Flow',
          description: 'Materials move between these areas'
        };
      case 'PERSONNEL_FLOW':
        return {
          icon: <Person />,
          color: '#ff9800',
          label: 'Personnel Flow',
          description: 'Staff movement between areas'
        };
      case 'WORKFLOW_SUGGESTION':
        return {
          icon: <TrendingUp />,
          color: '#795548',
          label: 'Workflow',
          description: 'Part of a workflow pattern'
        };
      default:
        return {
          icon: <Room />,
          color: '#757575',
          label: 'Relationship',
          description: 'Connection between areas'
        };
    }
  }, []);

  // Sort relationships by priority and confidence
  const sortedRelationships = useMemo(() => {
    return [...relationships].sort((a, b) => {
      const priorityA = a.priority || 5;
      const priorityB = b.priority || 5;
      const confidenceA = a.confidence || 0.5;
      const confidenceB = b.confidence || 0.5;
      
      // Higher priority first, then higher confidence
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return confidenceB - confidenceA;
    });
  }, [relationships]);

  const getPriorityColor = useCallback((priority: number = 5) => {
    if (priority >= 8) return '#d32f2f'; // High priority - red
    if (priority >= 6) return '#f57c00'; // Medium priority - orange
    return '#388e3c'; // Low priority - green
  }, []);

  const getFlowTypeLabel = useCallback((flowType: string = '') => {
    switch (flowType) {
      case 'raw_material': return 'Raw Materials';
      case 'finished_product': return 'Finished Products';
      case 'intermediate': return 'Intermediates';
      case 'personnel': return 'Personnel';
      case 'waste': return 'Waste';
      case 'cleaning': return 'Cleaning';
      default: return flowType;
    }
  }, []);

  if (!visible || relationships.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        left: position.x + 20,
        top: position.y - 10,
        width: 320,
        maxHeight: 400,
        overflowY: 'auto',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
      onClick={(e) => e.stopPropagation()} // Prevent canvas clicks
    >
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Relationship Preview
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          {triggerNodeName} → {targetNodeName}
        </Typography>
      </Box>

      {/* Relationships List */}
      <Box sx={{ p: 0 }}>
        {sortedRelationships.map((relationship, index) => {
          const info = getRelationshipInfo(relationship.type);
          const isHovered = hoveredRelationship === relationship.id;
          
          return (
            <Box
              key={relationship.id}
              sx={{
                p: 2,
                borderBottom: index < sortedRelationships.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                cursor: onConnectionPreview ? 'pointer' : 'default',
                backgroundColor: isHovered ? 'action.hover' : 'transparent',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'action.hover',
                }
              }}
              onMouseEnter={() => {
                setHoveredRelationship(relationship.id);
                if (onConnectionPreview) {
                  onConnectionPreview(relationship.type);
                }
              }}
              onMouseLeave={() => {
                setHoveredRelationship(null);
                if (onConnectionPreview) {
                  onConnectionPreview('');
                }
              }}
              onClick={() => {
                if (onConnectionPreview) {
                  onConnectionPreview(relationship.type);
                }
              }}
            >
              {/* Relationship Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: info.color,
                    color: 'white',
                    mr: 2
                  }}
                >
                  {React.cloneElement(info.icon, { sx: { fontSize: 18 } })}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight="bold" color={info.color}>
                    {info.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {info.description}
                  </Typography>
                </Box>
              </Box>

              {/* Relationship Details */}
              {relationship.reason && (
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                  {relationship.reason}
                </Typography>
              )}

              {/* Chips for metadata */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                {relationship.priority && (
                  <Chip
                    label={`Priority: ${relationship.priority}`}
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: 20,
                      backgroundColor: getPriorityColor(relationship.priority),
                      color: 'white'
                    }}
                  />
                )}
                
                {relationship.confidence && (
                  <Chip
                    label={`${Math.round(relationship.confidence * 100)}% confidence`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.6rem',
                      height: 20,
                    }}
                  />
                )}

                {relationship.flowType && (
                  <Chip
                    label={getFlowTypeLabel(relationship.flowType)}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.6rem',
                      height: 20,
                      borderColor: info.color,
                      color: info.color
                    }}
                  />
                )}
              </Box>

              {/* Additional Details */}
              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
                {relationship.flowDirection && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SwapHoriz sx={{ fontSize: 14 }} />
                    <Typography variant="caption">
                      {relationship.flowDirection === 'bidirectional' ? 'Both ways' : 'One way'}
                    </Typography>
                  </Box>
                )}
                
                {relationship.doorType && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Security sx={{ fontSize: 14 }} />
                    <Typography variant="caption">
                      {relationship.doorType}
                    </Typography>
                  </Box>
                )}

                {(relationship.minDistance || relationship.maxDistance) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Schedule sx={{ fontSize: 14 }} />
                    <Typography variant="caption">
                      {relationship.minDistance && relationship.maxDistance
                        ? `${relationship.minDistance}m - ${relationship.maxDistance}m`
                        : relationship.minDistance
                          ? `≥${relationship.minDistance}m`
                          : `≤${relationship.maxDistance}m`
                      }
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 1.5, backgroundColor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          {onConnectionPreview ? 'Click to preview connection' : 'Hover to see details'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default RelationshipPreview;