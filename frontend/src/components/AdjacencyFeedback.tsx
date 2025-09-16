import React from 'react';
import {
  Box,
  Alert,
  AlertTitle,
  Chip,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ExpandMore,
  ExpandLess,
  Block as BlockIcon,
  TouchApp as TouchIcon
} from '@mui/icons-material';
import { ConstraintViolation } from '../hooks/useAdjacencyConstraints';

interface AdjacencyFeedbackProps {
  violations: ConstraintViolation[];
  isValidating: boolean;
  mode: 'creation' | 'guided';
  selectedShapeId?: string;
  onDismissViolation?: (violation: ConstraintViolation) => void;
  style?: React.CSSProperties;
}

const AdjacencyFeedback: React.FC<AdjacencyFeedbackProps> = ({
  violations,
  isValidating,
  mode,
  selectedShapeId,
  onDismissViolation,
  style
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Filter violations for selected shape if specified
  const relevantViolations = selectedShapeId 
    ? violations.filter(v => v.shapeId === selectedShapeId || v.targetShapeId === selectedShapeId)
    : violations;

  const errorViolations = relevantViolations.filter(v => v.severity === 'error');
  const warningViolations = relevantViolations.filter(v => v.severity === 'warning');

  if (mode === 'creation') {
    return null; // No constraints in creation mode
  }

  if (relevantViolations.length === 0 && !isValidating) {
    return (
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, ...style }}>
        <Paper elevation={3} sx={{ p: 2, bgcolor: 'success.light', maxWidth: 300 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="body2" color="success.dark">
              All adjacency constraints satisfied
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (isValidating) {
    return (
      <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, ...style }}>
        <Paper elevation={3} sx={{ p: 2, bgcolor: 'info.light', maxWidth: 300 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <InfoIcon color="info" />
            <Typography variant="body2" color="info.dark">
              Validating adjacency constraints...
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? <ErrorIcon color="error" /> : <WarningIcon color="warning" />;
  };

  const getCollisionTypeIcon = (collisionType: string) => {
    switch (collisionType) {
      case 'overlap':
        return <BlockIcon color="error" />;
      case 'edge-touch':
        return <TouchIcon color="warning" />;
      case 'near-proximity':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning') => {
    return severity === 'error' ? 'error' : 'warning';
  };

  return (
    <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, ...style }}>
      <Paper elevation={6} sx={{ maxWidth: 400, minWidth: 300 }}>
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            bgcolor: errorViolations.length > 0 ? 'error.light' : 'warning.light',
            borderRadius: '4px 4px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {getSeverityIcon(errorViolations.length > 0 ? 'error' : 'warning')}
            <Typography 
              variant="subtitle1" 
              color={errorViolations.length > 0 ? 'error.dark' : 'warning.dark'}
              fontWeight="bold"
            >
              Adjacency Constraints
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {errorViolations.length > 0 && (
              <Chip 
                label={`${errorViolations.length} Error${errorViolations.length > 1 ? 's' : ''}`}
                color="error" 
                size="small"
              />
            )}
            {warningViolations.length > 0 && (
              <Chip 
                label={`${warningViolations.length} Warning${warningViolations.length > 1 ? 's' : ''}`}
                color="warning" 
                size="small"
              />
            )}
            
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ color: errorViolations.length > 0 ? 'error.dark' : 'warning.dark' }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {/* Summary when collapsed */}
        {!expanded && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {errorViolations.length > 0 
                ? `${errorViolations.length} shape${errorViolations.length > 1 ? 's' : ''} cannot touch due to pharmaceutical design rules`
                : `${warningViolations.length} adjacency warning${warningViolations.length > 1 ? 's' : ''}`
              }
            </Typography>
          </Box>
        )}

        {/* Detailed violations when expanded */}
        <Collapse in={expanded}>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {/* Error violations */}
            {errorViolations.length > 0 && (
              <>
                <Alert severity="error" variant="outlined" sx={{ m: 1, mb: 2 }}>
                  <AlertTitle>Blocked Adjacencies</AlertTitle>
                  These shapes cannot touch according to GMP guidelines
                </Alert>
                
                <List dense>
                  {errorViolations.map((violation, index) => (
                    <ListItem 
                      key={`error-${index}`}
                      sx={{ 
                        borderLeft: 4, 
                        borderLeftColor: 'error.main',
                        mb: 1,
                        bgcolor: 'error.light',
                        borderRadius: 1
                      }}
                    >
                      <ListItemIcon>
                        <Tooltip title={`Collision type: ${violation.collisionType}`}>
                          {getCollisionTypeIcon(violation.collisionType)}
                        </Tooltip>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="error.dark" fontWeight="medium">
                            Shape collision detected
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="error.dark">
                              {violation.reason}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Between shapes: {violation.shapeId} ↔ {violation.targetShapeId}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Warning violations */}
            {warningViolations.length > 0 && (
              <>
                <Alert severity="warning" variant="outlined" sx={{ m: 1, mb: 2 }}>
                  <AlertTitle>Adjacency Warnings</AlertTitle>
                  These connections may need review
                </Alert>
                
                <List dense>
                  {warningViolations.map((violation, index) => (
                    <ListItem 
                      key={`warning-${index}`}
                      sx={{ 
                        borderLeft: 4, 
                        borderLeftColor: 'warning.main',
                        mb: 1,
                        bgcolor: 'warning.light',
                        borderRadius: 1
                      }}
                    >
                      <ListItemIcon>
                        <Tooltip title={`Collision type: ${violation.collisionType}`}>
                          {getCollisionTypeIcon(violation.collisionType)}
                        </Tooltip>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="warning.dark" fontWeight="medium">
                            Proximity warning
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="warning.dark">
                              {violation.reason}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              Between shapes: {violation.shapeId} ↔ {violation.targetShapeId}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Help text */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: 1, borderTopColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                💡 Tip: Shapes with Neo4j node assignments can only touch if their nodes have adjacency relationships in the pharmaceutical knowledge graph.
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default AdjacencyFeedback;