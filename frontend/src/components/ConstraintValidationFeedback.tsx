import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Badge,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Warning,
  Error,
  CheckCircle,
  Info,
  ExpandMore,
  ExpandLess,
  Security,
  Link,
  Speed,
  Assignment,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { Node, Edge } from 'reactflow';
import { apiService } from '../services/api';
import { CustomShapeData } from '../types';

interface ConstraintViolation {
  type: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  ruleType: string;
  priority: number;
  reason: string;
  nodeIds?: string[];
}

interface ConstraintValidationFeedbackProps {
  nodes: Node[];
  edges: Edge[];
  mode: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const ConstraintValidationFeedback: React.FC<ConstraintValidationFeedbackProps> = ({
  nodes,
  edges,
  mode,
  isVisible,
  onToggleVisibility
}) => {
  const [violations, setViolations] = useState<ConstraintViolation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState({
    totalConstraints: 0,
    activeConstraints: 0,
    associatedShapes: 0,
    totalShapes: 0
  });

  // Count constraint violations by type
  const violationCounts = {
    errors: violations.filter(v => v.type === 'ERROR').length,
    warnings: violations.filter(v => v.type === 'WARNING').length,
    info: violations.filter(v => v.type === 'INFO').length
  };

  // Calculate constraint compliance
  const compliancePercentage = violations.length === 0 ? 100 : 
    Math.max(0, 100 - (violationCounts.errors * 20 + violationCounts.warnings * 10));

  // Real-time constraint validation
  const validateConstraints = useCallback(async () => {
    if (mode !== 'guided') {
      setViolations([]);
      return;
    }

    setLoading(true);
    const newViolations: ConstraintViolation[] = [];
    let totalConstraints = 0;
    let activeConstraints = 0;
    let associatedShapes = 0;

    try {
      // Analyze each connection for constraint violations
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) continue;

        // Check if nodes are associated with Neo4j templates
        const sourceHasAssociation = sourceNode.type === 'customShape' && 
          (sourceNode.data as CustomShapeData).assignedNodeId;
        const targetHasAssociation = targetNode.type === 'customShape' && 
          (targetNode.data as CustomShapeData).assignedNodeId;

        if (sourceHasAssociation && targetHasAssociation) {
          try {
            const sourceNodeId = (sourceNode.data as CustomShapeData).assignedNodeId!;
            const targetNodeId = (targetNode.data as CustomShapeData).assignedNodeId!;

            const validationResult = await apiService.validateConnection(
              sourceNodeId,
              targetNodeId,
              (edge.data as any)?.relationshipType
            );

            // Add violations from this connection
            validationResult.violations.forEach(violation => {
              newViolations.push({
                ...violation,
                nodeIds: [edge.source, edge.target]
              });
            });

            activeConstraints++;
          } catch (error) {
            console.warn('Error validating connection:', error);
          }
        }
      }

      // Count associated shapes and their constraints
      for (const node of nodes) {
        if (node.type === 'customShape') {
          const customData = node.data as CustomShapeData;
          if (customData.assignedNodeId) {
            associatedShapes++;
            totalConstraints += customData.constraintsCount || 0;
          }
        }
      }

      setStats({
        totalConstraints,
        activeConstraints,
        associatedShapes,
        totalShapes: nodes.filter(n => n.type === 'customShape').length
      });

    } catch (error) {
      console.error('Error validating constraints:', error);
      newViolations.push({
        type: 'ERROR',
        message: 'Failed to validate constraints',
        ruleType: 'SYSTEM_ERROR',
        priority: 10,
        reason: 'Constraint validation service unavailable'
      });
    } finally {
      setViolations(newViolations);
      setLoading(false);
    }
  }, [nodes, edges, mode]);

  // Validate constraints when nodes or edges change
  useEffect(() => {
    if (mode === 'guided') {
      const timeoutId = setTimeout(() => {
        validateConstraints();
      }, 500); // Debounce to avoid excessive API calls

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, mode, validateConstraints]);

  // Get icon for violation type
  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'ERROR':
        return <Error color="error" />;
      case 'WARNING':
        return <Warning color="warning" />;
      case 'INFO':
        return <Info color="info" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  // Get color for violation type
  const getViolationColor = (type: string) => {
    switch (type) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      default:
        return 'success';
    }
  };

  if (mode !== 'guided') {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: isVisible ? 400 : 60,
        maxHeight: '60vh',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        backgroundColor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isVisible ? 1 : 0,
          borderColor: 'divider',
          cursor: 'pointer'
        }}
        onClick={() => !isVisible && onToggleVisibility()}
      >
        {isVisible ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security color="primary" />
              <Typography variant="subtitle2" fontWeight="bold">
                Constraint Monitor
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={violationCounts.errors} color="error">
                <Badge badgeContent={violationCounts.warnings} color="warning">
                  <IconButton size="small" onClick={onToggleVisibility}>
                    <VisibilityOff />
                  </IconButton>
                </Badge>
              </Badge>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <Badge badgeContent={violationCounts.errors + violationCounts.warnings} color="error">
              <Security color="primary" />
            </Badge>
          </Box>
        )}
      </Box>

      {/* Content */}
      <Collapse in={isVisible}>
        <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
          {loading && <LinearProgress />}

          {/* Statistics */}
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Constraint Statistics
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                size="small"
                icon={<Assignment />}
                label={`${stats.associatedShapes}/${stats.totalShapes} Associated`}
                color={stats.associatedShapes === stats.totalShapes ? 'success' : 'default'}
              />
              <Chip
                size="small"
                icon={<Link />}
                label={`${stats.activeConstraints} Active`}
                color="primary"
              />
              <Chip
                size="small"
                icon={<Security />}
                label={`${stats.totalConstraints} Total Rules`}
                color="info"
              />
            </Box>

            {/* Compliance meter */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">Compliance</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {compliancePercentage.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={compliancePercentage}
                color={compliancePercentage >= 90 ? 'success' : compliancePercentage >= 70 ? 'warning' : 'error'}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>
          </Box>

          {/* Violations */}
          {violations.length > 0 ? (
            <Box sx={{ p: 2, pt: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Constraint Violations ({violations.length})
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={expanded}>
                <List dense>
                  {violations.slice(0, 10).map((violation, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {getViolationIcon(violation.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {violation.message}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {violation.reason}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={violation.ruleType}
                                color={getViolationColor(violation.type) as any}
                                sx={{ fontSize: '0.7rem', height: 18 }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                  {violations.length > 10 && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="caption" color="text.secondary" align="center">
                            ... and {violations.length - 10} more violations
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>
          ) : (
            <Box sx={{ p: 2, pt: 0 }}>
              <Alert severity="success" sx={{ '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
                <Typography variant="body2">
                  ✅ All constraints satisfied
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Your pharmaceutical facility design complies with all active constraints
                </Typography>
              </Alert>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ConstraintValidationFeedback;