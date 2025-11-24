import React from 'react';
import { Box, Tooltip, Chip, Typography } from '@mui/material';
import { CheckCircle, Block, Info } from '@mui/icons-material';
import { EdgeValidationResult } from '../hooks/useEdgeValidation';

interface EdgeProximityIndicatorProps {
  validationResults: EdgeValidationResult[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

export const EdgeProximityIndicator: React.FC<EdgeProximityIndicatorProps> = ({
  validationResults,
  position = 'top-right',
  compact = false
}) => {
  if (validationResults.length === 0) {
    return null;
  }

  // Group results by relationship type
  const groupedResults = validationResults.reduce((acc, result) => {
    if (!acc[result.relationshipType]) {
      acc[result.relationshipType] = [];
    }
    acc[result.relationshipType].push(result);
    return acc;
  }, {} as Record<string, EdgeValidationResult[]>);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: 20, left: 20 };
      case 'top-right':
        return { top: 20, right: 20 };
      case 'bottom-left':
        return { bottom: 20, left: 20 };
      case 'bottom-right':
        return { bottom: 20, right: 20 };
      default:
        return { top: 20, right: 20 };
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO':
        return <CheckCircle fontSize="small" />;
      case 'PROHIBITED_NEAR':
        return <Block fontSize="small" />;
      default:
        return <Info fontSize="small" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'ADJACENT_TO':
        return 'success';
      case 'PROHIBITED_NEAR':
        return 'error';
      default:
        return 'default';
    }
  };

  const getLabel = (type: string, count: number) => {
    switch (type) {
      case 'ADJACENT_TO':
        return `${count} Adjacent`;
      case 'PROHIBITED_NEAR':
        return `${count} Prohibited`;
      default:
        return `${count} Undefined`;
    }
  };

  if (compact) {
    // Compact mode: Show only icons with counts
    return (
      <Box
        sx={{
          position: 'absolute',
          ...getPositionStyles(),
          display: 'flex',
          gap: 1,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: 1,
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        {Object.entries(groupedResults).map(([type, results]) => (
          <Tooltip 
            key={type}
            title={
              <Box>
                <Typography variant="subtitle2">{type.replace('_', ' ')}</Typography>
                {results.map((r, idx) => (
                  <Typography key={idx} variant="caption" display="block">
                    {r.visualFeedback.message}
                  </Typography>
                ))}
              </Box>
            }
          >
            <Chip
              icon={getIcon(type)}
              label={results.length}
              size="small"
              color={getColor(type)}
              sx={{
                '& .MuiChip-icon': {
                  marginLeft: '4px',
                },
              }}
            />
          </Tooltip>
        ))}
      </Box>
    );
  }

  // Full mode: Show detailed information
  return (
    <Box
      sx={{
        position: 'absolute',
        ...getPositionStyles(),
        minWidth: 250,
        maxWidth: 350,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 2,
        boxShadow: 3,
        padding: 2,
      }}
    >
      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
        Edge Proximity Status
      </Typography>
      
      {Object.entries(groupedResults).map(([type, results]) => (
        <Box key={type} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {getIcon(type)}
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {getLabel(type, results.length)}
            </Typography>
          </Box>
          
          {results.map((result, idx) => (
            <Box
              key={idx}
              sx={{
                ml: 3,
                mb: 0.5,
                padding: '4px 8px',
                backgroundColor: result.visualFeedback.color + '20',
                borderLeft: `3px solid ${result.visualFeedback.color}`,
                borderRadius: '0 4px 4px 0',
              }}
            >
              <Typography variant="caption" display="block">
                {result.visualFeedback.message}
              </Typography>
              
              {result.visualFeedback.animation && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontStyle: 'italic',
                    color: 'text.secondary' 
                  }}
                >
                  Effect: {result.visualFeedback.animation}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      ))}
      
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          <strong>Legend:</strong><br />
          <CheckCircle fontSize="inherit" /> Can superimpose edges<br />
          <Block fontSize="inherit" /> Must maintain separation<br />
          <Info fontSize="inherit" /> No relationship defined
        </Typography>
      </Box>
    </Box>
  );
};