import React, { useState, memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Paper, Typography, Tooltip, Chip, LinearProgress } from '@mui/material';
import { GhostSuggestion } from '../types';
import RelationshipPreview from './RelationshipPreview';

interface GhostNodeData {
  suggestion: GhostSuggestion;
  width: number;
  height: number;
  onMaterialize: (suggestion: GhostSuggestion) => void;
  triggerNodeName?: string;
  showRelationshipPreview?: boolean;
}

const GhostNode: React.FC<NodeProps<GhostNodeData>> = memo(({
  data,
  selected = false
}) => {
  const { suggestion, width, height, onMaterialize, triggerNodeName, showRelationshipPreview = true } = data;
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Memoize expensive color and icon calculations
  const categoryColor = React.useMemo(() => {
    switch (suggestion.category) {
      case 'Production': return '#FF6B6B';
      case 'Quality Control': return '#4ECDC4';
      case 'Warehouse': return '#45B7D1';
      case 'Utilities': return '#F7DC6F';
      case 'Personnel': return '#BB8FCE';
      case 'Support': return '#85C1E9';
      default: return '#95A5A6';
    }
  }, [suggestion.category]);

  const categoryIcon = React.useMemo(() => {
    switch (suggestion.category) {
      case 'Production': return '🏭';
      case 'Quality Control': return '🔬';
      case 'Warehouse': return '📦';
      case 'Utilities': return '⚡';
      case 'Personnel': return '👥';
      case 'Support': return '🔧';
      default: return '📋';
    }
  }, [suggestion.category]);

  // Confidence-based styling
  const confidenceLevel = React.useMemo(() => {
    const confidence = suggestion.confidence || 0.5;
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }, [suggestion.confidence]);

  const confidenceColor = React.useMemo(() => {
    switch (confidenceLevel) {
      case 'high': return '#2e7d32'; // Green
      case 'medium': return '#f57c00'; // Orange
      case 'low': return '#d32f2f'; // Red
      default: return '#757575'; // Grey
    }
  }, [confidenceLevel]);

  const confidenceOpacity = React.useMemo(() => {
    const confidence = suggestion.confidence || 0.5;
    return Math.max(0.4, Math.min(0.9, confidence)); // Between 40% and 90% opacity
  }, [suggestion.confidence]);

  const borderStyle = React.useMemo(() => {
    switch (confidenceLevel) {
      case 'high': return 'solid';
      case 'medium': return 'dashed';
      case 'low': return 'dotted';
      default: return 'dashed';
    }
  }, [confidenceLevel]);

  // Memoize tooltip content to prevent unnecessary re-renders
  const tooltipContent = React.useMemo(() => (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Click to add "{suggestion.name}" to diagram
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
        Confidence: {Math.round((suggestion.confidence || 0.5) * 100)}%
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
        Reason: {suggestion.reason}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>
        From: {suggestion.sourceNodeName}
      </Typography>
      {suggestion.relationships && suggestion.relationships.length > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          Relationship: {suggestion.relationships[0].type.replace('_', ' ')}
        </Typography>
      )}
    </Box>
  ), [suggestion.name, suggestion.reason, suggestion.sourceNodeName, suggestion.confidence, suggestion.relationships]);
  
  const handleClick = useCallback(() => {
    setIsClicked(true);
    onMaterialize(suggestion);

    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 200);
  }, [onMaterialize, suggestion]);

  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    setIsHovered(true);
    if (showRelationshipPreview && suggestion.relationships && suggestion.relationships.length > 0) {
      setMousePosition({ x: event.clientX, y: event.clientY });
      setShowPreview(true);
    }
  }, [showRelationshipPreview, suggestion.relationships]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowPreview(false);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (showPreview) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  }, [showPreview]);

  // Prepare relationship data for preview
  const relationshipPreviewData = React.useMemo(() => {
    if (!suggestion.relationships) return [];
    
    return suggestion.relationships.map(rel => ({
      id: rel.id || `${rel.type}-${suggestion.id}`,
      type: rel.type,
      fromNodeName: triggerNodeName || suggestion.sourceNodeName || 'Source',
      toNodeName: suggestion.name,
      reason: rel.reason,
      priority: rel.priority,
      confidence: rel.confidence || suggestion.confidence,
      flowDirection: rel.flowDirection,
      flowType: rel.flowType,
      doorType: rel.doorType,
      minDistance: rel.minDistance,
      maxDistance: rel.maxDistance,
    }));
  }, [suggestion.relationships, suggestion.name, suggestion.sourceNodeName, suggestion.confidence, triggerNodeName]);


  return (
    <>
      {/* Simplified handles for connections */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top"
        className="ghost-handle"
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        className="ghost-handle"
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right"
        className="ghost-handle"
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom"
        className="ghost-handle"
      />

      <Tooltip
        title={tooltipContent}
        placement="top"
        arrow
      >
        <Paper
          elevation={0}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          sx={{
            width: width,
            height: height,
            padding: 1,
            backgroundColor: confidenceLevel === 'high' 
              ? `${categoryColor}40` 
              : `${categoryColor}${Math.round(confidenceOpacity * 50)}`, // Confidence-based background opacity
            border: `2px ${borderStyle} ${confidenceColor}`,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            opacity: isHovered ? Math.min(1.0, confidenceOpacity + 0.2) : confidenceOpacity,
            position: 'relative',
            transition: 'all 0.3s ease-in-out',
            transform: isClicked ? 'scale(0.95)' : (isHovered ? 'scale(1.05)' : 'scale(1.0)'),
            boxShadow: isHovered 
              ? `0 0 20px ${confidenceColor}80, 0 0 40px ${categoryColor}40`
              : confidenceLevel === 'high' 
                ? `0 0 8px ${confidenceColor}40` 
                : 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: confidenceLevel === 'high' 
                ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
              borderRadius: 2,
              pointerEvents: 'none',
            },
            // Add a subtle pulse animation for high confidence suggestions
            ...(confidenceLevel === 'high' && {
              animation: 'ghost-pulse 3s ease-in-out infinite',
              '@keyframes ghost-pulse': {
                '0%': {
                  boxShadow: `0 0 8px ${confidenceColor}40`,
                },
                '50%': {
                  boxShadow: `0 0 16px ${confidenceColor}60`,
                },
                '100%': {
                  boxShadow: `0 0 8px ${confidenceColor}40`,
                },
              },
            })
          }}
        >
          {/* Category Icon */}
          <Typography 
            variant="h5" 
            sx={{ 
              mb: 0.5,
              opacity: 0.8,
              filter: 'grayscale(20%)'
            }}
          >
            {categoryIcon}
          </Typography>
          
          {/* Node Name */}
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600,
              textAlign: 'center',
              color: 'text.primary',
              mb: 0.5,
              maxWidth: width - 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {suggestion.name}
          </Typography>
          
          {/* Confidence and Category Chips */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip
              label={`${Math.round((suggestion.confidence || 0.5) * 100)}%`}
              size="small"
              sx={{
                fontSize: '0.6rem',
                height: 18,
                backgroundColor: confidenceColor,
                color: 'white',
                fontWeight: 'bold',
                '& .MuiChip-label': {
                  px: 0.75
                }
              }}
            />
            {suggestion.cleanroomClass && (
              <Chip
                label={suggestion.cleanroomClass}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.6rem',
                  height: 18,
                  borderColor: confidenceColor,
                  color: confidenceColor,
                  '& .MuiChip-label': {
                    px: 0.75
                  }
                }}
              />
            )}
          </Box>

          {/* Confidence Progress Bar */}
          <Box sx={{ width: '80%', mb: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={(suggestion.confidence || 0.5) * 100}
              sx={{
                height: 3,
                borderRadius: 1.5,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: confidenceColor,
                  borderRadius: 1.5,
                }
              }}
            />
          </Box>
          
          {/* Ghost Indicator */}
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: 4,
              right: 8,
              fontSize: '0.5rem',
              fontWeight: 'bold',
              color: confidenceColor,
              opacity: 0.8,
              backgroundColor: 'rgba(255,255,255,0.9)',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5
            }}
          >
            GHOST
          </Typography>

          {/* Confidence Level Indicator */}
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: confidenceColor,
              boxShadow: `0 0 6px ${confidenceColor}80`,
              ...(confidenceLevel === 'high' && {
                animation: 'confidence-pulse 2s ease-in-out infinite',
                '@keyframes confidence-pulse': {
                  '0%': { opacity: 1, transform: 'scale(1)' },
                  '50%': { opacity: 0.7, transform: 'scale(1.2)' },
                  '100%': { opacity: 1, transform: 'scale(1)' },
                },
              })
            }}
          />
        </Paper>
      </Tooltip>

      {/* Relationship Preview */}
      {showPreview && relationshipPreviewData.length > 0 && (
        <RelationshipPreview
          relationships={relationshipPreviewData}
          triggerNodeName={triggerNodeName || suggestion.sourceNodeName || 'Source'}
          targetNodeName={suggestion.name}
          position={mousePosition}
          visible={showPreview}
        />
      )}
      
      <style>{`
        .ghost-handle {
          opacity: 0.5 !important;
          background: rgba(255, 255, 255, 0.8) !important;
          border: 1px solid rgba(0, 0, 0, 0.2) !important;
        }
        
        .ghost-node-paper {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 8px !important;
          cursor: pointer !important;
          border: 2px dashed !important;
          border-radius: 12px !important;
          position: relative !important;
          overflow: hidden !important;
          transition: all 0.3s ease !important;
        }
        
        .ghost-node-paper::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
          pointer-events: none;
        }
        
        .ghost-node-paper:hover {
          transform: scale3d(1.05, 1.05, 1) !important;
          transition: all 0.2s ease-out !important;
        }
        
        .ghost-node-icon {
          margin-bottom: 4px !important;
          font-size: 1.2rem !important;
          filter: brightness(0.8);
        }
        
        .ghost-node-name {
          font-weight: 600 !important;
          text-align: center !important;
          color: rgba(51, 51, 51, 0.9) !important;
          font-size: 0.75rem !important;
          line-height: 1.2 !important;
          margin-bottom: 4px !important;
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        }
        
        .ghost-node-chips {
          display: flex !important;
          gap: 2.4px !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          align-items: center !important;
        }
        
        .ghost-node-confidence-chip {
          font-size: 0.6rem !important;
          height: 16px !important;
          background-color: rgba(255,255,255,0.8) !important;
          color: #333 !important;
          font-weight: bold !important;
        }
        
        .ghost-node-confidence-chip .MuiChip-label {
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        
        .ghost-node-cleanroom-chip {
          font-size: 0.6rem !important;
          height: 16px !important;
          background-color: rgba(25, 118, 210, 0.2) !important;
          color: #1976d2 !important;
        }
        
        .ghost-node-cleanroom-chip .MuiChip-label {
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        
        .ghost-node-indicator {
          position: absolute !important;
          top: 2px !important;
          right: 4px !important;
          font-size: 0.5rem !important;
          color: rgba(51, 51, 51, 0.6) !important;
          font-weight: bold !important;
        }
      `}</style>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.data.suggestion.id === nextProps.data.suggestion.id &&
    prevProps.data.width === nextProps.data.width &&
    prevProps.data.height === nextProps.data.height &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.suggestion.confidence === nextProps.data.suggestion.confidence
  );
});

export default GhostNode;