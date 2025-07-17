import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Button,
  ListItemButton,
} from '@mui/material';
import {
  Error,
  Warning,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Lightbulb,
  Visibility,
} from '@mui/icons-material';
import { ValidationResult, ValidationViolation } from '../types';

interface ValidationPanelProps {
  validationResult: ValidationResult;
  onViolationClick: (violation: ValidationViolation) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationResult,
  onViolationClick,
}) => {
  const [expandedViolations, setExpandedViolations] = useState<string[]>([]);

  const handleViolationToggle = (violationId: string) => {
    setExpandedViolations(prev =>
      prev.includes(violationId)
        ? prev.filter(id => id !== violationId)
        : [...prev, violationId]
    );
  };

  const errors = validationResult.violations.filter(v => v.type === 'ERROR');
  const warnings = validationResult.violations.filter(v => v.type === 'WARNING');

  const getViolationIcon = (type: 'ERROR' | 'WARNING') => {
    switch (type) {
      case 'ERROR':
        return <Error color="error" />;
      case 'WARNING':
        return <Warning color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  const getViolationColor = (type: 'ERROR' | 'WARNING') => {
    switch (type) {
      case 'ERROR':
        return 'error';
      case 'WARNING':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        width: '100%',
        maxHeight: '50vh',
        borderRadius: 0,
        borderLeft: '1px solid #e0e0e0',
        borderTop: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Typography variant="h6" gutterBottom>
          Validation Results
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {validationResult.isValid ? (
            <Alert severity="success" sx={{ flex: 1 }}>
              <Typography variant="body2">
                Diagram validation passed!
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error" sx={{ flex: 1 }}>
              <Typography variant="body2">
                {errors.length} error(s), {warnings.length} warning(s)
              </Typography>
            </Alert>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Chip
            icon={<Error />}
            label={`${errors.length} Errors`}
            color="error"
            size="small"
            variant={errors.length > 0 ? 'filled' : 'outlined'}
          />
          <Chip
            icon={<Warning />}
            label={`${warnings.length} Warnings`}
            color="warning"
            size="small"
            variant={warnings.length > 0 ? 'filled' : 'outlined'}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {validationResult.violations.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="body2">
              All validation checks passed!
            </Typography>
          </Box>
        ) : (
          <List dense>
            {validationResult.violations.map((violation) => (
              <React.Fragment key={violation.id}>
                <ListItemButton
                  onClick={() => handleViolationToggle(violation.id)}
                  sx={{
                    borderBottom: '1px solid #f0f0f0',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                  }}
                >
                  <ListItemIcon>
                    {getViolationIcon(violation.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {violation.message}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          label={violation.type}
                          size="small"
                          color={getViolationColor(violation.type)}
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                        <Chip
                          label={`${violation.nodeIds.length} node(s)`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViolationClick(violation);
                    }}
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton size="small">
                    {expandedViolations.includes(violation.id) ? (
                      <ExpandLess />
                    ) : (
                      <ExpandMore />
                    )}
                  </IconButton>
                </ListItemButton>
                
                <Collapse
                  in={expandedViolations.includes(violation.id)}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ pl: 4, pr: 2, pb: 2, backgroundColor: '#f9f9f9' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Affected Nodes:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      {violation.nodeIds.map((nodeId) => (
                        <Chip
                          key={nodeId}
                          label={nodeId.replace('node-', '').replace(/-\d+$/, '')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      ))}
                    </Box>
                    
                    {violation.suggestion && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <Lightbulb sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          Suggestion:
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {violation.suggestion}
                        </Typography>
                      </Box>
                    )}
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => onViolationClick(violation)}
                      sx={{ mt: 1 }}
                    >
                      Highlight Nodes
                    </Button>
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default ValidationPanel;