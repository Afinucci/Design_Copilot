import { useState, useCallback, useRef } from 'react';
import { Node } from 'reactflow';
import { ValidationResult, DiagramEdge } from '../types';
import { apiService } from '../services/api';

interface UseValidationProps {
  nodes: Node[];
  edges: DiagramEdge[];
  isConnected: boolean;
}

export const useValidation = ({ nodes, edges, isConnected }: UseValidationProps) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced validation function
  const validateDiagram = useCallback(async (immediate = false) => {
    if (!isConnected || nodes.length === 0) {
      setValidationResults([]);
      return;
    }

    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    const performValidation = async () => {
      setIsValidating(true);
      try {
        // Extract functional areas and relationships for validation
        const functionalAreas = nodes
          .filter(node => node.type === 'functionalArea')
          .map(node => ({
            id: node.id,
            name: node.data.label,
            category: node.data.category,
            cleanroomClass: node.data.cleanroomClass,
            position: node.position,
            templateId: node.data.templateId,
          }));

        const relationships = edges.map(edge => ({
          id: edge.id,
          fromId: edge.source,
          toId: edge.target,
          type: (edge.data as any)?.relationshipType || 'ADJACENT_TO',
          priority: (edge.data as any)?.priority || 5,
          reason: (edge.data as any)?.reason || 'User defined relationship',
        }));

        const results = await apiService.validateDiagram(
          functionalAreas,
          relationships
        );

        setValidationResults(Array.isArray(results) ? results : [results]);
      } catch (error) {
        console.error('Validation failed:', error);
        setValidationResults([]);
      } finally {
        setIsValidating(false);
      }
    };

    if (immediate) {
      performValidation();
    } else {
      // Debounce validation by 1 second
      validationTimeoutRef.current = setTimeout(performValidation, 1000);
    }
  }, [nodes, edges, isConnected]);

  // Clear validation results
  const clearValidation = useCallback(() => {
    setValidationResults([]);
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
  }, []);

  // Get validation results by severity
  const getValidationsByType = useCallback(() => {
    const allViolations = validationResults.flatMap(r => r.violations || []);
    const errors = allViolations.filter(v => v.type === 'ERROR');
    const warnings = allViolations.filter(v => v.type === 'WARNING');
    const info: any[] = [];
    const suggestions: any[] = [];

    return { errors, warnings, info, suggestions };
  }, [validationResults]);

  // Get validation result for specific node
  const getNodeValidation = useCallback((nodeId: string) => {
    return validationResults.flatMap(r => r.violations?.filter(v => v.nodeIds?.includes(nodeId)) || []);
  }, [validationResults]);

  // Get validation result for specific edge
  const getEdgeValidation = useCallback((edgeId: string) => {
    return validationResults.flatMap(r => r.violations || []).filter(v => v.id === edgeId);
  }, [validationResults]);

  // Check if diagram has any validation issues
  const hasValidationIssues = useCallback(() => {
    return validationResults.some(r => r.violations && r.violations.length > 0);
  }, [validationResults]);

  return {
    validationResults,
    isValidating,
    validateDiagram,
    clearValidation,
    getValidationsByType,
    getNodeValidation,
    getEdgeValidation,
    hasValidationIssues,
  };
};