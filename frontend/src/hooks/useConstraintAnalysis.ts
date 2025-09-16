import { useMemo, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { SpatialRelationship } from '../types';
import { getMandatoryAdjacencies, analyzeFacilityLayout } from '../services/connectorLogic';
import { PERFORMANCE_CONSTANTS, PerformanceMonitor } from '../utils/performance';

interface ConstraintViolation {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  nodeIds: string[];
  suggestion?: string;
}

interface ConstraintSuggestion {
  id: string;
  type: 'add_connection' | 'remove_connection' | 'reposition_node';
  description: string;
  nodeIds: string[];
  metadata?: any;
}

interface ConstraintAnalysisResult {
  violations: ConstraintViolation[];
  suggestions: ConstraintSuggestion[];
  score: number;
  violationCounts: {
    error: number;
    warning: number;
    info: number;
    total: number;
  };
  getComplianceColor: () => 'success' | 'warning' | 'error';
  getViolationsByType: (type: ConstraintViolation['type']) => ConstraintViolation[];
  getSuggestionsByType: (type: ConstraintSuggestion['type']) => ConstraintSuggestion[];
}

interface UseConstraintAnalysisProps {
  nodes: Node[];
  edges: Edge[];
}

export const useConstraintAnalysis = ({
  nodes,
  edges,
}: UseConstraintAnalysisProps): ConstraintAnalysisResult => {
  // Memoized constraint analysis with performance monitoring
  const constraintAnalysis = useMemo(() => {
    return PerformanceMonitor.measure('constraint-analysis', () => {
      if (!nodes.length) {
        return {
          violations: [],
          suggestions: [],
          score: 100,
        };
      }

      // Check component complexity
      const { isWithinLimits, warnings } = PerformanceMonitor.checkComponentComplexity(
        nodes.length,
        edges.length
      );

      if (!isWithinLimits) {
        warnings.forEach(warning => console.warn(warning));
      }

      try {
      const analysisNodes = nodes.map((node) => ({
        id: node.id,
        category: node.data.category,
        position: node.position,
      }));

      const analysisEdges = edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: (edge.data?.relationshipType || 'ADJACENT_TO') as SpatialRelationship['type'],
      }));

      const { score, suggestions: layoutSuggestions, violations: layoutViolations } =
        analyzeFacilityLayout(analysisNodes, analysisEdges);

      const newViolations: ConstraintViolation[] = [];
      const newSuggestions: ConstraintSuggestion[] = [];

      // Convert violations to UI format
      layoutViolations.forEach((violation, index) => {
        newViolations.push({
          id: `violation-${index}`,
          type: 'error',
          message: violation,
          nodeIds: [],
        });
      });

      // Perform additional constraint checks for each node
      nodes.forEach((node) => {
        const nodeConnections = edges
          .filter((e) => e.source === node.id || e.target === node.id)
          .map((e) => {
            const connectedNodeId = e.source === node.id ? e.target : e.source;
            const connectedNode = nodes.find((n) => n.id === connectedNodeId);
            return connectedNode
              ? {
                  category: connectedNode.data.category,
                  relationshipType: (e.data?.relationshipType || 'ADJACENT_TO') as SpatialRelationship['type'],
                }
              : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        const mandatoryMissing = getMandatoryAdjacencies(node.data.category, nodeConnections);

        mandatoryMissing.forEach((missing) => {
          const violationId = `missing-${node.id}-${missing.category}`;
          newViolations.push({
            id: violationId,
            type: 'warning',
            message: `${node.data.name} is missing ${missing.relationshipType} connection to ${missing.category}`,
            nodeIds: [node.id],
            suggestion: missing.reason,
          });

          newSuggestions.push({
            id: `suggest-${violationId}`,
            type: 'add_connection',
            description: `Add ${missing.category} area near ${node.data.name}`,
            nodeIds: [node.id],
            metadata: {
              targetCategory: missing.category,
              relationshipType: missing.relationshipType,
              reason: missing.reason,
            },
          });
        });

        // Check for isolated nodes
        const connections = edges.filter(
          (e) => e.source === node.id || e.target === node.id
        ).length;

        if (connections === 0 && nodes.length > 1) {
          newViolations.push({
            id: `isolated-${node.id}`,
            type: 'info',
            message: `${node.data.name} is not connected to any other area`,
            nodeIds: [node.id],
            suggestion: 'Consider connecting this area to related functional areas',
          });
        }
      });

      return {
        violations: newViolations,
        suggestions: newSuggestions,
        score,
      };
    } catch (error) {
      console.error('Constraint analysis failed:', error);
      return {
        violations: [{
          id: 'analysis-error',
          type: 'error' as const,
          message: 'Failed to analyze constraints. Please check your diagram.',
          nodeIds: [],
        }],
        suggestions: [],
        score: 0,
      };
    }
    });
  }, [nodes, edges]);

  // Memoized violation counts
  const violationCounts = useMemo(() => {
    return constraintAnalysis.violations.reduce(
      (acc, v) => {
        acc[v.type]++;
        acc.total++;
        return acc;
      },
      { error: 0, warning: 0, info: 0, total: 0 }
    );
  }, [constraintAnalysis.violations]);

  // Helper functions
  const getComplianceColor = useCallback(() => {
    if (constraintAnalysis.score >= PERFORMANCE_CONSTANTS.GOOD_COMPLIANCE_SCORE) return 'success';
    if (constraintAnalysis.score >= PERFORMANCE_CONSTANTS.WARNING_COMPLIANCE_SCORE) return 'warning';
    return 'error';
  }, [constraintAnalysis.score]);

  const getViolationsByType = useCallback((type: ConstraintViolation['type']) => {
    return constraintAnalysis.violations.filter(v => v.type === type);
  }, [constraintAnalysis.violations]);

  const getSuggestionsByType = useCallback((type: ConstraintSuggestion['type']) => {
    return constraintAnalysis.suggestions.filter(s => s.type === type);
  }, [constraintAnalysis.suggestions]);

  return {
    violations: constraintAnalysis.violations,
    suggestions: constraintAnalysis.suggestions,
    score: constraintAnalysis.score,
    violationCounts,
    getComplianceColor,
    getViolationsByType,
    getSuggestionsByType,
  };
};

export type { ConstraintViolation, ConstraintSuggestion, ConstraintAnalysisResult };