import { useState, useCallback, useEffect } from 'react';
import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';
import {
  validateDoorConnection,
  DoorValidationResult,
  DoorValidationStatus,
  getValidationColor,
} from '../utils/doorConnectionUtils';

export interface ShapeValidationState {
  [shapeId: string]: {
    status: DoorValidationStatus;
    color: string;
    message?: string;
    details?: string;
  };
}

interface UseDoorConnectionValidationProps {
  shapes: ShapeProperties[];
  drawingMode: 'select' | 'door' | 'shape' | 'pan';
  firstSelectedShapeId: string | null;
  hoveredShapeId: string | null;
}

interface UseDoorConnectionValidationReturn {
  shapeValidationStates: ShapeValidationState;
  validateConnection: (sourceId: string, targetId: string) => Promise<DoorValidationResult | null>;
  clearValidation: () => void;
  validationMessage: string | null;
}

/**
 * Hook for managing door connection validation in Layout Designer mode
 * Provides real-time validation feedback on hover and click
 */
export function useDoorConnectionValidation({
  shapes,
  drawingMode,
  firstSelectedShapeId,
  hoveredShapeId,
}: UseDoorConnectionValidationProps): UseDoorConnectionValidationReturn {
  const [shapeValidationStates, setShapeValidationStates] = useState<ShapeValidationState>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  /**
   * Validate a connection between two shapes
   */
  const validateConnection = useCallback(
    async (sourceId: string, targetId: string): Promise<DoorValidationResult | null> => {
      const sourceShape = shapes.find(s => s.id === sourceId);
      const targetShape = shapes.find(s => s.id === targetId);

      if (!sourceShape || !targetShape) {
        return null;
      }

      const result = await validateDoorConnection(sourceShape, targetShape);
      return result;
    },
    [shapes]
  );

  /**
   * Clear all validation states
   */
  const clearValidation = useCallback(() => {
    setShapeValidationStates({});
    setValidationMessage(null);
  }, []);

  /**
   * Effect: Validate on hover when in door mode with a first shape selected
   */
  useEffect(() => {
    if (drawingMode !== 'door' || !firstSelectedShapeId || !hoveredShapeId) {
      return;
    }

    // Don't validate if hovering over the same shape
    if (firstSelectedShapeId === hoveredShapeId) {
      return;
    }

    const validateHover = async () => {
      const result = await validateConnection(firstSelectedShapeId, hoveredShapeId);

      if (!result) return;

      const color = getValidationColor(result.status);

      // Update validation state for the hovered shape
      setShapeValidationStates({
        [hoveredShapeId]: {
          status: result.status,
          color,
          message: result.message,
          details: result.details,
        },
      });

      // Set validation message
      setValidationMessage(result.message);
    };

    validateHover();
  }, [drawingMode, firstSelectedShapeId, hoveredShapeId, validateConnection]);

  /**
   * Effect: Clear validation when exiting door mode or deselecting
   */
  useEffect(() => {
    if (drawingMode !== 'door' || !firstSelectedShapeId) {
      clearValidation();
    }
  }, [drawingMode, firstSelectedShapeId, clearValidation]);

  /**
   * Effect: Validate all shapes when first shape is selected in door mode
   * This shows which shapes can/cannot be connected
   */
  useEffect(() => {
    if (drawingMode !== 'door' || !firstSelectedShapeId) {
      return;
    }

    const validateAllShapes = async () => {
      const newStates: ShapeValidationState = {};

      // Validate against all other shapes
      for (const shape of shapes) {
        if (shape.id === firstSelectedShapeId) continue;

        const result = await validateConnection(firstSelectedShapeId, shape.id);

        if (result) {
          const color = getValidationColor(result.status);
          newStates[shape.id] = {
            status: result.status,
            color,
            message: result.message,
            details: result.details,
          };
        }
      }

      setShapeValidationStates(newStates);
    };

    validateAllShapes();
  }, [drawingMode, firstSelectedShapeId, shapes, validateConnection]);

  return {
    shapeValidationStates,
    validateConnection,
    clearValidation,
    validationMessage,
  };
}
