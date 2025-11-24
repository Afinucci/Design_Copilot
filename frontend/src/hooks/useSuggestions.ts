/**
 * useSuggestions Hook
 *
 * Manages Neo4j relationship-based suggestions for Layout Designer mode.
 * Handles fetching suggestions, auto-placement logic, and shape creation.
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { calculateOptimalPlacement } from '../utils/shapeAutoPlacement';
import { NodeCategory, ShapeType, getCleanroomColor } from '../types';
import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';

interface RelationshipSuggestion {
  id: string;
  name: string;
  category: string;
  cleanroomClass?: string;
  color?: string;
  relationships: SuggestionRelationship[];
  confidence: number;
  reason: string;
}

interface SuggestionRelationship {
  type: string;
  direction: 'incoming' | 'outgoing' | 'bidirectional';
  reason?: string;
  priority?: number;
}

interface UseSuggestionsOptions {
  selectedShapeId: string | null;
  selectedShapeNeo4jNode: string | null; // The Neo4j functional area assigned to the selected shape
  shapes: ShapeProperties[];
  onShapeCreate: (newShape: ShapeProperties) => void;
  enabled?: boolean; // Whether suggestions should be active
}

interface UseSuggestionsReturn {
  suggestions: RelationshipSuggestion[];
  isLoading: boolean;
  error: string | null;
  handleSuggestionClick: (suggestion: RelationshipSuggestion) => void;
  clearSuggestions: () => void;
}

/**
 * Custom hook for managing relationship-based suggestions
 */
export function useSuggestions(options: UseSuggestionsOptions): UseSuggestionsReturn {
  const {
    selectedShapeId,
    selectedShapeNeo4jNode,
    shapes,
    onShapeCreate,
    enabled = true
  } = options;

  const [suggestions, setSuggestions] = useState<RelationshipSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions when selected shape changes
  useEffect(() => {
    if (!enabled || !selectedShapeNeo4jNode) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🎯 useSuggestions: Fetching suggestions for:', selectedShapeNeo4jNode);

        const response = await apiService.getRelationshipSuggestions(selectedShapeNeo4jNode);

        console.log('🎯 useSuggestions: Received', response.count, 'suggestions');
        setSuggestions(response.suggestions);

      } catch (err) {
        console.error('🎯 useSuggestions: Error fetching suggestions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [enabled, selectedShapeNeo4jNode]);

  /**
   * Handle suggestion click - create new shape with auto-placement
   */
  const handleSuggestionClick = useCallback((suggestion: RelationshipSuggestion) => {
    if (!selectedShapeId) {
      console.warn('🎯 useSuggestions: No selected shape ID');
      return;
    }

    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (!selectedShape) {
      console.warn('🎯 useSuggestions: Selected shape not found:', selectedShapeId);
      return;
    }

    console.log('🎯 useSuggestions: Creating shape from suggestion:', suggestion.name);

    // Get the primary relationship type for auto-placement
    const primaryRelationship = suggestion.relationships[0];
    const relationshipType = primaryRelationship?.type;

    // Calculate optimal position using auto-placement logic
    const placement = calculateOptimalPlacement({
      selectedShape: {
        id: selectedShape.id,
        type: 'customShape',
        position: { x: selectedShape.x, y: selectedShape.y },
        data: {
          id: selectedShape.id,
          shapeType: selectedShape.shapeType,
          shapePoints: [],
          width: selectedShape.width,
          height: selectedShape.height,
          label: selectedShape.name,
          color: selectedShape.fillColor
        } as any // Use 'as any' since we're bridging between different shape type systems
      },
      existingShapes: shapes.map(s => ({
        id: s.id,
        type: 'customShape',
        position: { x: s.x, y: s.y },
        data: {
          id: s.id,
          shapeType: s.shapeType,
          shapePoints: [],
          width: s.width,
          height: s.height,
          label: s.name,
          color: s.fillColor
        } as any
      })),
      relationshipType
    });

    // Map suggestion category to NodeCategory
    const mapCategory = (cat: string): NodeCategory => {
      const categoryMap: { [key: string]: NodeCategory } = {
        'Production': 'Production',
        'Quality Control': 'Quality Control',
        'Warehouse': 'Warehouse',
        'Utilities': 'Utilities',
        'Personnel': 'Personnel',
        'Support': 'Support'
      };
      return categoryMap[cat] || 'Support';
    };

    // Create new shape with suggested properties
    const newShape: ShapeProperties = {
      id: `shape-${Date.now()}`,
      name: suggestion.name,
      shapeType: 'rectangle' as ShapeType,
      category: mapCategory(suggestion.category),
      cleanroomClass: (suggestion.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'CNC',

      // Position and dimensions from auto-placement
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      area: placement.width * placement.height,

      // Default pharmaceutical properties
      pressureRegime: 'neutral',
      temperatureRange: { min: 20, max: 25, unit: 'C' },
      humidityRange: { min: 30, max: 70 },

      // Visual properties - color based on cleanroom grade
      fillColor: getCleanroomColor((suggestion.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'CNC'),
      borderColor: '#2c3e50',
      borderWidth: 2,
      opacity: 1,

      // Compliance
      isCompliant: true,
      complianceIssues: [],

      // Neo4j Knowledge Graph Integration - AUTOMATICALLY ASSIGN THE NODE
      assignedNodeName: suggestion.name,
      assignedNodeId: suggestion.id,

      // Custom properties
      customProperties: {}
    };

    console.log('🎯 useSuggestions: New shape created with Neo4j assignment:', {
      id: newShape.id,
      name: newShape.name,
      assignedNodeName: newShape.assignedNodeName,
      assignedNodeId: newShape.assignedNodeId,
      position: { x: newShape.x, y: newShape.y },
      relationshipType
    });

    // Call the shape creation callback
    onShapeCreate(newShape);

    // Note: We don't clear suggestions here so the user can add multiple related shapes

  }, [selectedShapeId, shapes, onShapeCreate]);

  /**
   * Clear all suggestions manually
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    handleSuggestionClick,
    clearSuggestions
  };
}
