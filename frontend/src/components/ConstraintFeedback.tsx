import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Error,
  Warning,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Info,
  Lightbulb,
  AutoFixHigh,
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { NodeData, SpatialRelationship } from '../types';
import { useConstraintAnalysis, ConstraintSuggestion, ConstraintViolation } from '../hooks/useConstraintAnalysis';
import ErrorBoundary from './ErrorBoundary';
import { PERFORMANCE_CONSTANTS, usePerformanceMonitoring } from '../utils/performance';

interface ConstraintFeedbackProps {
  nodes: Node[];
  edges: Edge[];
  onSuggestionApply?: (suggestion: ConstraintSuggestion) => void;
  isVisible?: boolean;
}

const ConstraintFeedback: React.FC<ConstraintFeedbackProps> = ({
  nodes,
  edges,
  onSuggestionApply,
  isVisible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { measureRender, logMemory } = usePerformanceMonitoring('ConstraintFeedback');

  // Use the constraint analysis hook
  const {
    violations,
    suggestions,
    score: complianceScore,
    violationCounts,
    getComplianceColor,
  } = useConstraintAnalysis({ nodes, edges });

  // Log memory usage on component mount in development
  useEffect(() => {
    logMemory();
  }, [logMemory]);


  const getViolationIcon = (type: ConstraintViolation['type']) => {
    switch (type) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      default:
        return <Info />;
    }
  };


  if (!isVisible || nodes.length === 0) return null;

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('ConstraintFeedback Error:', error, errorInfo);
      }}
      fallback={
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 350,
            p: 2,
            zIndex: 100,
          }}
        >
          <Typography color="error">
            Error loading constraint feedback
          </Typography>
        </Paper>
      }
    >
      <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 350,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color={getComplianceColor()} />
            Compliance Check
          </Typography>
          <IconButton size="small">
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Compliance Score
            </Typography>
            <Typography variant="body2" fontWeight="bold" color={getComplianceColor()}>
              {complianceScore}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={complianceScore}
            color={getComplianceColor()}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </Box>

        {violationCounts.total > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            {violationCounts.error > 0 && (
              <Chip
                size="small"
                label={`${violationCounts.error} Errors`}
                color="error"
                sx={{ height: 20 }}
              />
            )}
            {violationCounts.warning > 0 && (
              <Chip
                size="small"
                label={`${violationCounts.warning} Warnings`}
                color="warning"
                sx={{ height: 20 }}
              />
            )}
            {violationCounts.info > 0 && (
              <Chip
                size="small"
                label={`${violationCounts.info} Info`}
                color="info"
                sx={{ height: 20 }}
              />
            )}
          </Box>
        )}
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ flex: 1, overflow: 'auto', maxHeight: 400 }}>
          {violations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                All constraints satisfied!
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Your facility layout meets all GMP requirements.
              </Typography>
            </Box>
          ) : (
            <List dense>
              {violations.map((violation) => (
                <ListItem key={violation.id} sx={{ alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    {getViolationIcon(violation.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {violation.message}
                      </Typography>
                    }
                    secondary={
                      violation.suggestion && (
                        <Typography variant="caption" color="text.secondary">
                          {violation.suggestion}
                        </Typography>
                      )
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {suggestions.length > 0 && (
          <>
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography
                variant="subtitle2"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}
              >
                <Lightbulb color="primary" sx={{ fontSize: 18 }} />
                Suggestions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {suggestions.slice(0, PERFORMANCE_CONSTANTS.MAX_SUGGESTIONS_DISPLAY).map((suggestion) => (
                  <Alert
                    key={suggestion.id}
                    severity="info"
                    action={
                      onSuggestionApply && (
                        <Tooltip title="Apply suggestion">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onSuggestionApply(suggestion)}
                          >
                            <AutoFixHigh />
                          </IconButton>
                        </Tooltip>
                      )
                    }
                    sx={{ py: 0.5 }}
                  >
                    <Typography variant="caption">{suggestion.description}</Typography>
                  </Alert>
                ))}
                {suggestions.length > PERFORMANCE_CONSTANTS.MAX_SUGGESTIONS_DISPLAY && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    +{suggestions.length - PERFORMANCE_CONSTANTS.MAX_SUGGESTIONS_DISPLAY} more suggestions available
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </Collapse>
    </Paper>
    </ErrorBoundary>
  );
};

export default ConstraintFeedback;