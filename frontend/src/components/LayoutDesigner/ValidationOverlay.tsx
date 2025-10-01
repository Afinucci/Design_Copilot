import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { ShapeProperties } from './PropertiesPanel';

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'adjacency' | 'overlap' | 'spacing' | 'compliance' | 'flow' | 'contamination';
  title: string;
  description: string;
  affectedShapeIds: string[];
  position?: { x: number; y: number };
  suggestedFix?: string;
  complianceReference?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface ValidationOverlayProps {
  shapes: ShapeProperties[];
  validationResult: ValidationResult;
  onIssueHighlight: (issueId: string, highlight: boolean) => void;
  onShapeSelect: (shapeId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Pharmaceutical-specific validation rules
const validatePharmaceuticalConstraints = (shapes: ShapeProperties[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // Check for each shape
  shapes.forEach((shape) => {
    // Cleanroom class adjacency rules
    const adjacentShapes = findAdjacentShapes(shape, shapes);

    adjacentShapes.forEach((adjacent) => {
      // Class A should not be directly adjacent to Class D
      if ((shape.cleanroomClass === 'A' && adjacent.cleanroomClass === 'D') ||
          (shape.cleanroomClass === 'D' && adjacent.cleanroomClass === 'A')) {
        issues.push({
          id: `cleanroom-adjacency-${shape.id}-${adjacent.id}`,
          severity: 'error',
          category: 'compliance',
          title: 'Invalid Cleanroom Adjacency',
          description: `Class ${shape.cleanroomClass} room "${shape.name}" should not be directly adjacent to Class ${adjacent.cleanroomClass} room "${adjacent.name}"`,
          affectedShapeIds: [shape.id, adjacent.id],
          suggestedFix: 'Add intermediate cleanroom grade or airlock',
          complianceReference: 'EU GMP Annex 1',
        });
      }

      // Production areas should have proper pressure cascades
      if (shape.category === 'Production' && adjacent.category === 'Production') {
        const pressureConflict =
          (shape.cleanroomClass === 'A' && adjacent.cleanroomClass === 'B' && shape.pressureRegime !== 'positive') ||
          (shape.cleanroomClass === 'B' && adjacent.cleanroomClass === 'C' && shape.pressureRegime !== 'positive');

        if (pressureConflict) {
          issues.push({
            id: `pressure-cascade-${shape.id}-${adjacent.id}`,
            severity: 'warning',
            category: 'compliance',
            title: 'Pressure Cascade Issue',
            description: `Pressure regime may not maintain proper cascade between "${shape.name}" and "${adjacent.name}"`,
            affectedShapeIds: [shape.id, adjacent.id],
            suggestedFix: 'Ensure positive pressure in higher grade cleanroom',
            complianceReference: 'EU GMP Annex 1, Section 4.14',
          });
        }
      }
    });

    // Minimum area requirements
    const minAreas: Record<string, number> = {
      'Production': 20,
      'Quality Control': 15,
      'Storage': 25,
    };

    if (minAreas[shape.category] && shape.area < minAreas[shape.category] * 100) {
      issues.push({
        id: `min-area-${shape.id}`,
        severity: 'warning',
        category: 'compliance',
        title: 'Below Minimum Area',
        description: `${shape.name} (${Math.round(shape.area / 100)}m²) is below recommended minimum of ${minAreas[shape.category]}m²`,
        affectedShapeIds: [shape.id],
        suggestedFix: `Increase room size to at least ${minAreas[shape.category]}m²`,
      });
    }

    // Cross-contamination risks
    if (shape.category === 'Production' && shape.cleanroomClass !== 'CNC') {
      const nearbyWasteManagement = shapes.find(s =>
        s.category === 'Waste Management' &&
        getDistance(shape, s) < 100
      );

      if (nearbyWasteManagement) {
        issues.push({
          id: `contamination-risk-${shape.id}`,
          severity: 'error',
          category: 'contamination',
          title: 'Cross-Contamination Risk',
          description: `Production room "${shape.name}" is too close to waste management area`,
          affectedShapeIds: [shape.id, nearbyWasteManagement.id],
          suggestedFix: 'Increase separation distance or add containment measures',
          complianceReference: 'FDA 21 CFR 211.42(c)',
        });
      }
    }
  });

  return issues;
};

// Helper functions
const findAdjacentShapes = (shape: ShapeProperties, allShapes: ShapeProperties[]): ShapeProperties[] => {
  const threshold = 10; // pixels
  return allShapes.filter(other =>
    other.id !== shape.id && getDistance(shape, other) <= threshold
  );
};

const getDistance = (shape1: ShapeProperties, shape2: ShapeProperties): number => {
  const dx = shape1.x - shape2.x;
  const dy = shape1.y - shape2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const shapesOverlap = (shape1: ShapeProperties, shape2: ShapeProperties): boolean => {
  return !(
    shape1.x + shape1.width < shape2.x ||
    shape2.x + shape2.width < shape1.x ||
    shape1.y + shape1.height < shape2.y ||
    shape2.y + shape2.height < shape1.y
  );
};

const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  shapes,
  validationResult: externalValidation,
  onIssueHighlight,
  onShapeSelect,
  isVisible,
  onToggleVisibility,
  position = 'bottom-left',
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>(['error']);
  const [highlightedIssues, setHighlightedIssues] = React.useState<string[]>([]);

  // Run pharmaceutical validation
  const pharmaceuticalIssues = useMemo(() =>
    validatePharmaceuticalConstraints(shapes), [shapes]
  );

  // Combine external and pharmaceutical validation
  const allIssues = useMemo(() => {
    const combined = [...pharmaceuticalIssues];
    if (externalValidation?.issues) {
      combined.push(...externalValidation.issues);
    }
    return combined;
  }, [pharmaceuticalIssues, externalValidation]);

  // Group issues by category
  const issuesByCategory = useMemo(() => {
    const groups: Record<string, ValidationIssue[]> = {};
    allIssues.forEach(issue => {
      if (!groups[issue.category]) {
        groups[issue.category] = [];
      }
      groups[issue.category].push(issue);
    });
    return groups;
  }, [allIssues]);

  // Calculate summary
  const summary = useMemo(() => ({
    errors: allIssues.filter(i => i.severity === 'error').length,
    warnings: allIssues.filter(i => i.severity === 'warning').length,
    infos: allIssues.filter(i => i.severity === 'info').length,
  }), [allIssues]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleIssueHover = (issueId: string, isHovering: boolean) => {
    onIssueHighlight(issueId, isHovering);

    if (isHovering) {
      setHighlightedIssues(prev => [...prev, issueId]);
    } else {
      setHighlightedIssues(prev => prev.filter(id => id !== issueId));
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'info':
        return <InfoIcon color="info" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
      default:
        return '#666';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'compliance':
        return '📋';
      case 'contamination':
        return '🚫';
      case 'overlap':
        return '🔄';
      case 'adjacency':
        return '🔗';
      case 'spacing':
        return '📏';
      case 'flow':
        return '➡️';
      default:
        return '⚠️';
    }
  };

  const getPositionStyle = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 1000,
      maxWidth: 400,
      maxHeight: '60vh',
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: 20, left: 20 };
      case 'top-right':
        return { ...base, top: 20, right: 20 };
      case 'bottom-left':
        return { ...base, bottom: 20, left: 20 };
      case 'bottom-right':
        return { ...base, bottom: 20, right: 20 };
      default:
        return { ...base, bottom: 20, left: 20 };
    }
  };

  if (allIssues.length === 0 && isVisible) {
    return (
      <Paper elevation={3} sx={getPositionStyle()}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckIcon color="success" />
          <Typography variant="body2" color="success.main">
            All validation checks passed
          </Typography>
          <IconButton size="small" onClick={onToggleVisibility}>
            <VisibilityOffIcon />
          </IconButton>
        </Box>
      </Paper>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      {!isVisible && allIssues.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            ...getPositionStyle(),
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          onClick={onToggleVisibility}
        >
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box display="flex" gap={0.5}>
              {summary.errors > 0 && (
                <Chip
                  size="small"
                  icon={<ErrorIcon />}
                  label={summary.errors}
                  color="error"
                />
              )}
              {summary.warnings > 0 && (
                <Chip
                  size="small"
                  icon={<WarningIcon />}
                  label={summary.warnings}
                  color="warning"
                />
              )}
            </Box>
            <VisibilityIcon fontSize="small" />
          </Box>
        </Paper>
      )}

      {/* Full Validation Panel */}
      {isVisible && allIssues.length > 0 && (
        <Paper elevation={3} sx={getPositionStyle()}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: summary.errors > 0 ? 'error.light' : 'warning.light',
              color: summary.errors > 0 ? 'error.contrastText' : 'warning.contrastText',
            }}
          >
            <Typography variant="h6">
              Validation Issues
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Box display="flex" gap={0.5}>
                {summary.errors > 0 && (
                  <Chip
                    size="small"
                    label={summary.errors}
                    sx={{ backgroundColor: 'error.main', color: 'error.contrastText' }}
                  />
                )}
                {summary.warnings > 0 && (
                  <Chip
                    size="small"
                    label={summary.warnings}
                    sx={{ backgroundColor: 'warning.main', color: 'warning.contrastText' }}
                  />
                )}
                {summary.infos > 0 && (
                  <Chip
                    size="small"
                    label={summary.infos}
                    sx={{ backgroundColor: 'info.main', color: 'info.contrastText' }}
                  />
                )}
              </Box>
              <IconButton
                size="small"
                onClick={onToggleVisibility}
                sx={{ color: 'inherit' }}
              >
                <VisibilityOffIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Issues List */}
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {Object.entries(issuesByCategory).map(([category, issues]) => (
              <Box key={category}>
                <Box
                  sx={{
                    p: 1.5,
                    backgroundColor: 'grey.50',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => toggleCategory(category)}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <span>{getCategoryIcon(category)}</span>
                    <Typography variant="subtitle2" textTransform="capitalize">
                      {category.replace('-', ' ')}
                    </Typography>
                    <Chip size="small" label={issues.length} />
                  </Box>
                  {expandedCategories.includes(category) ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </Box>

                <Collapse in={expandedCategories.includes(category)}>
                  <List dense>
                    {issues.map((issue) => (
                      <ListItem
                        key={issue.id}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' },
                          backgroundColor: highlightedIssues.includes(issue.id) ? 'action.selected' : 'transparent',
                          borderLeft: `4px solid ${getSeverityColor(issue.severity)}`,
                        }}
                        onMouseEnter={() => handleIssueHover(issue.id, true)}
                        onMouseLeave={() => handleIssueHover(issue.id, false)}
                        onClick={() => {
                          if (issue.affectedShapeIds.length > 0) {
                            onShapeSelect(issue.affectedShapeIds[0]);
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {getSeverityIcon(issue.severity)}
                        </ListItemIcon>
                        <ListItemText
                          primary={issue.title}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block" component="div">
                                {issue.description}
                              </Typography>
                              {issue.suggestedFix && (
                                <Typography variant="caption" color="info.main" display="block" component="div">
                                  💡 {issue.suggestedFix}
                                </Typography>
                              )}
                              {issue.complianceReference && (
                                <Chip
                                  size="small"
                                  label={issue.complianceReference}
                                  variant="outlined"
                                  sx={{ mt: 0.5, fontSize: '0.6rem', height: 16 }}
                                />
                              )}
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </>
  );
};

export default ValidationOverlay;