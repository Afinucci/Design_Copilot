import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  IconButton,
  Collapse,
  Alert,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Refresh,
  Lightbulb,
  CheckCircle,
  RadioButtonUnchecked,
  ExpandMore,
  ExpandLess,
  Close,
  Help,
  AutoAwesome,
} from '@mui/icons-material';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  isCompleted: boolean;
  isActive: boolean;
  hints: string[];
  expectedActions: string[];
  progressWeight: number;
}

interface GuidedWorkflowPanelProps {
  currentStep: number;
  totalSteps: number;
  isExpanded?: boolean;
  onToggleExpanded: () => void;
  onStepComplete: (stepId: string) => void;
  onResetWorkflow: () => void;
  onClose?: () => void;
  className?: string;
}

const GuidedWorkflowPanel: React.FC<GuidedWorkflowPanelProps> = ({
  currentStep,
  totalSteps,
  isExpanded = true,
  onToggleExpanded,
  onStepComplete,
  onResetWorkflow,
  onClose,
  className
}) => {
  const [showHints, setShowHints] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Define the guided workflow steps
  const workflowSteps: WorkflowStep[] = useMemo(() => [
    {
      id: 'welcome',
      title: 'Welcome to Guided Mode',
      description: 'Learn how to create pharmaceutical facility diagrams with AI assistance',
      instruction: 'This mode will guide you through creating a compliant facility layout step by step.',
      isCompleted: currentStep > 0,
      isActive: currentStep === 0,
      hints: [
        'Guided mode provides intelligent suggestions based on pharmaceutical design rules',
        'Ghost nodes will appear to suggest relevant connections',
        'All suggestions are based on GMP compliance requirements'
      ],
      expectedActions: ['understand-guided-mode'],
      progressWeight: 5
    },
    {
      id: 'create-shape',
      title: 'Create Your First Shape',
      description: 'Draw a shape on the canvas to represent a facility area',
      instruction: 'Use the shape tools or drag from the palette to create your first functional area.',
      isCompleted: currentStep > 1,
      isActive: currentStep === 1,
      hints: [
        'You can draw custom shapes using the shape tools',
        'Or drag pre-made templates from the node palette',
        'Custom shapes give you more flexibility in layout design'
      ],
      expectedActions: ['create-custom-shape', 'drag-from-palette'],
      progressWeight: 15
    },
    {
      id: 'assign-properties',
      title: 'Assign Neo4j Properties',
      description: 'Connect your shape to the pharmaceutical knowledge graph',
      instruction: 'Click the assignment dialog to connect your shape to a Neo4j node for intelligent suggestions.',
      isCompleted: currentStep > 2,
      isActive: currentStep === 2,
      hints: [
        'The assignment dialog will auto-open for new shapes',
        'Search for the type of facility area you created',
        'Properties include cleanroom class, category, and relationships'
      ],
      expectedActions: ['assign-neo4j-node'],
      progressWeight: 25
    },
    {
      id: 'explore-suggestions',
      title: 'Explore Ghost Suggestions',
      description: 'Discover AI-powered suggestions for your facility layout',
      instruction: 'Click on your assigned shape to see ghost suggestions for related areas.',
      isCompleted: currentStep > 3,
      isActive: currentStep === 3,
      hints: [
        'Ghost nodes appear around your selected shape',
        'Suggestions are based on pharmaceutical workflow patterns',
        'Higher confidence suggestions have stronger visual indicators'
      ],
      expectedActions: ['click-assigned-shape', 'view-ghost-suggestions'],
      progressWeight: 20
    },
    {
      id: 'materialize-suggestions',
      title: 'Add Suggested Areas',
      description: 'Convert ghost suggestions into actual facility areas',
      instruction: 'Click on ghost suggestions to add them to your diagram.',
      isCompleted: currentStep > 4,
      isActive: currentStep === 4,
      hints: [
        'Click ghost nodes to materialize them',
        'New ghost suggestions will appear for each added area',
        'This creates a step-by-step exploration of your facility'
      ],
      expectedActions: ['materialize-ghost-nodes'],
      progressWeight: 20
    },
    {
      id: 'create-connections',
      title: 'Connect Your Areas',
      description: 'Create relationships between functional areas',
      instruction: 'Drag connections between areas to define their relationships.',
      isCompleted: currentStep > 5,
      isActive: currentStep === 5,
      hints: [
        'Connection types are suggested based on Neo4j relationships',
        'Material flow, personnel flow, and adjacency are common types',
        'The system validates connections against GMP requirements'
      ],
      expectedActions: ['create-connections'],
      progressWeight: 10
    },
    {
      id: 'complete',
      title: 'Congratulations!',
      description: 'You\'ve created a pharmaceutical facility diagram',
      instruction: 'Your guided tour is complete. Continue exploring or save your work.',
      isCompleted: currentStep > 6,
      isActive: currentStep === 6,
      hints: [
        'You can now continue building your facility independently',
        'Use the validation panel to check GMP compliance',
        'Save your diagram for future reference'
      ],
      expectedActions: ['save-diagram', 'continue-building'],
      progressWeight: 5
    }
  ], [currentStep]);

  const progress = useMemo(() => {
    const completedWeight = workflowSteps
      .filter(step => step.isCompleted)
      .reduce((sum, step) => sum + step.progressWeight, 0);
    const totalWeight = workflowSteps.reduce((sum, step) => sum + step.progressWeight, 0);
    return (completedWeight / totalWeight) * 100;
  }, [workflowSteps]);

  const currentStepData = workflowSteps[currentStep] || workflowSteps[workflowSteps.length - 1];

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep) {
      // Allow clicking on completed or current steps
      const step = workflowSteps[stepIndex];
      onStepComplete(step.id);
    }
  };

  return (
    <Paper
      elevation={3}
      className={className}
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        width: isExpanded ? 380 : 60,
        maxHeight: '90vh',
        transition: 'all 0.3s ease-in-out',
        zIndex: 1000,
        overflow: 'hidden',
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          cursor: 'pointer',
        }}
        onClick={onToggleExpanded}
      >
        <AutoAwesome sx={{ mr: 1 }} />
        {isExpanded && (
          <>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Guided Mode
            </Typography>
            <Chip
              label={`${currentStep + 1}/${totalSteps}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'inherit',
                mr: 1
              }}
            />
          </>
        )}
        <IconButton
          size="small"
          sx={{ color: 'inherit' }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpanded();
          }}
        >
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        {onClose && (
          <IconButton
            size="small"
            sx={{ color: 'inherit', ml: 0.5 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Close />
          </IconButton>
        )}
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ p: 2 }}>
          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }}
            />
          </Box>

          {/* Current Step Alert */}
          <Alert
            severity={currentStepData.isCompleted ? 'success' : 'info'}
            icon={currentStepData.isCompleted ? <CheckCircle /> : <Lightbulb />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2" fontWeight="bold">
              {currentStepData.title}
            </Typography>
            <Typography variant="caption" display="block">
              {currentStepData.instruction}
            </Typography>
          </Alert>

          {/* Hints Section */}
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              startIcon={<Help />}
              onClick={() => setShowHints(!showHints)}
              sx={{ mb: 1 }}
            >
              {showHints ? 'Hide' : 'Show'} Hints
            </Button>
            <Collapse in={showHints}>
              <Box sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'info.main' }}>
                {currentStepData.hints.map((hint, index) => (
                  <Typography key={index} variant="caption" display="block" sx={{ mb: 0.5 }}>
                    • {hint}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Box>

          {/* Step Navigation */}
          <Stepper activeStep={currentStep} orientation="vertical" sx={{ mb: 2 }}>
            {workflowSteps.map((step, index) => (
              <Step key={step.id} completed={step.isCompleted}>
                <StepLabel
                  onClick={() => handleStepClick(index)}
                  sx={{
                    cursor: index <= currentStep ? 'pointer' : 'default',
                    '& .MuiStepLabel-label': {
                      fontWeight: step.isActive ? 'bold' : 'normal',
                      color: step.isActive ? 'primary.main' : 'text.primary'
                    }
                  }}
                >
                  {step.title}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={onResetWorkflow}
            >
              Restart
            </Button>
            {currentStep < workflowSteps.length - 1 && (
              <Tooltip title="Complete current step to continue">
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrow />}
                    disabled={!currentStepData.isCompleted}
                    onClick={() => onStepComplete(workflowSteps[currentStep + 1]?.id)}
                  >
                    Next
                  </Button>
                </span>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default GuidedWorkflowPanel;