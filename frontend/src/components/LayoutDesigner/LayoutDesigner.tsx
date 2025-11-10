import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import DrawingCanvas from './DrawingCanvas';
import ShapeLibrary, { PharmaceuticalShapeTemplate } from './ShapeLibrary';
import DrawingTools from './DrawingTools';
import PropertiesPanel, { ShapeProperties } from './PropertiesPanel';
import ValidationOverlay, { ValidationResult } from './ValidationOverlay';
import ConnectionRenderer from './ConnectionRenderer';
import SuggestionSidebar from './SuggestionSidebar';
import { ShapeType, NodeCategory, getCleanroomColor } from '../../types';
import apiService from '../../services/api';
import {
  DrawingMode,
  Connection,
  DoorConnectionDrawingState,
  areShapesAdjacent
} from './types';
import { DoorConnection, DoorFlowType, DoorFlowDirection } from '../../types';
import DoorConnectionRenderer from '../DoorConnectionRenderer';
import DoorConnectionDialog from '../DoorConnectionDialog';
import DoorConnectionEditDialog from '../DoorConnectionEditDialog';
import { useSuggestions } from '../../hooks/useSuggestions';
import { useDoorConnectionValidation } from '../../hooks/useDoorConnectionValidation';
import DoorPlacementOverlay from './DoorPlacementOverlay';
import { findAllSharedWalls, DoorPlacement } from '../../utils/wallDetection';
import { updateDoorConnectionsEdgePoints } from '../../utils/doorConnectionUtils';
import { Snackbar, Alert } from '@mui/material';
import { UnitConverter } from '../../utils/unitConversion';
import { Measurement } from './MeasurementTool';
import { WallSegment } from './WallTool';
import RulerOverlay from './RulerOverlay';
import ScaleSettings from './ScaleSettings';
import MeasurementRenderer from './MeasurementTool';
import WallTool from './WallTool';
import ChatPanel from '../ChatPanel';
import { useChatAssistant } from '../../hooks/useChatAssistant';
import { ChatAction } from '../../types';
import { Fab, Tooltip } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import GenerativeApiService from '../../services/generativeApi';

export interface LayoutDesignerProps {
  onClose?: () => void;
  onSave?: (layoutData: LayoutData) => void;
  onLoad?: () => void;
  initialLayout?: LayoutData;
}

export interface LayoutData {
  id: string;
  name: string;
  shapes: ShapeProperties[];
  connections: Connection[];
  doorConnections: DoorConnection[];
  canvasSettings: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  metadata: {
    createdAt: Date;
    modifiedAt: Date;
    version: string;
  };
}

interface DrawingState {
  activeShapeTool: ShapeType | null;
  isDrawing: boolean;
  selectedShapeId: string | null;
  hoveredShapeId: string | null;
}

interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  zoom: number;
}

interface HistoryState {
  shapes: ShapeProperties[];
  timestamp: number;
}

const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1200,
  height: 800,
  backgroundColor: '#f8f9fa',
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  zoom: 1,
};

const LayoutDesigner: React.FC<LayoutDesignerProps> = ({
  onClose,
  onSave,
  onLoad,
  initialLayout,
}) => {
  // Helper: which shape types should render as polygons
  const polygonRenderTypes = new Set<ShapeType>([
    'triangle',
    'polygon',
    'pentagon',
    'hexagon',
    'octagon',
    'diamond',
    'trapezoid',
    'parallelogram',
    'L-shape',
    'C-shape',
  ]);

  const generateRegularPolygonPoints = (sides: number, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(1, Math.min(width, height) / 2);
    const points: { x: number; y: number }[] = [];
    // Rotate so one vertex is at top for odd sides
    const startAngle = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + (i * 2 * Math.PI) / sides;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return points;
  };

  const computePointsRelative = (shape: ShapeProperties) => {
    const rel: Array<{ x: number; y: number }> | undefined = (shape as any).customProperties?.pointsRelative;
    if (Array.isArray(rel) && rel.length >= 3) return rel;

    // Fallbacks for template-based polygonal shapes
    if (shape.shapeType === 'diamond') {
      const w = shape.width, h = shape.height;
      return [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ];
    }
    if (shape.shapeType === 'trapezoid') {
      const w = shape.width, h = shape.height;
      const inset = Math.min(w, h) * 0.2;
      return [
        { x: inset, y: 0 },
        { x: w - inset, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
    }
    if (shape.shapeType === 'parallelogram') {
      const w = shape.width, h = shape.height;
      const skew = Math.min(w, h) * 0.2;
      return [
        { x: skew, y: 0 },
        { x: w, y: 0 },
        { x: w - skew, y: h },
        { x: 0, y: h },
      ];
    }
    if (shape.shapeType === 'pentagon' || shape.shapeType === 'hexagon' || shape.shapeType === 'octagon') {
      const sides = shape.shapeType === 'pentagon' ? 5 : shape.shapeType === 'hexagon' ? 6 : 8;
      return generateRegularPolygonPoints(sides, shape.width, shape.height);
    }
    if (shape.shapeType === 'L-shape') {
      const w = shape.width, h = shape.height;
      const arm = Math.min(w, h) * 0.45; // thickness of the L arms
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: arm },
        { x: arm, y: arm },
        { x: arm, y: h },
        { x: 0, y: h },
      ];
    }
    if (shape.shapeType === 'C-shape') {
      const w = shape.width, h = shape.height;
      const t = Math.min(w, h) * 0.25; // thickness of the C
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: t },
        { x: t, y: t },
        { x: t, y: h - t },
        { x: w, y: h - t },
        { x: w, y: h },
        { x: 0, y: h },
      ];
    }
    if (shape.shapeType === 'triangle') {
      const w = shape.width, h = shape.height;
      return [
        { x: w / 2, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ];
    }
    // Default: rectangle
    return [
      { x: 0, y: 0 },
      { x: shape.width, y: 0 },
      { x: shape.width, y: shape.height },
      { x: 0, y: shape.height },
    ];
  };
  // Core state
  const [shapes, setShapes] = useState<ShapeProperties[]>(initialLayout?.shapes || []);
  const [connections, setConnections] = useState<Connection[]>(initialLayout?.connections || []);
  const [doorConnections, setDoorConnections] = useState<DoorConnection[]>(initialLayout?.doorConnections || []);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    activeShapeTool: null,
    isDrawing: false,
    selectedShapeId: null,
    hoveredShapeId: null,
  });
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');
  const [doorConnectionDrawing, setDoorConnectionDrawing] = useState<DoorConnectionDrawingState>({
    step: 'idle',
    firstShapeId: null,
    secondShapeId: null,
    edgePoint: null,
  });
  
  // New door placement state (Hypar-style)
  const [doorPlacements, setDoorPlacements] = useState<DoorPlacement[]>([]);
  const [selectedDoorPlacementId, setSelectedDoorPlacementId] = useState<string | null>(null);
  const [showDoorConfigDialog, setShowDoorConfigDialog] = useState(false);
  const [pendingDoorPlacement, setPendingDoorPlacement] = useState<{
    wallId: string;
    position: { x: number; y: number };
    normalizedPosition: number;
  } | null>(null);
  
  const [showDoorDialog, setShowDoorDialog] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedDoorConnectionId, setSelectedDoorConnectionId] = useState<string | null>(null);

  // Snackbar state for validation messages
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // New professional floor plan features
  const [unitConverter, setUnitConverter] = useState<UnitConverter>(
    UnitConverter.createDefault() // 1:100 scale, metric by default
  );
  const [showScaleSettings, setShowScaleSettings] = useState(false);
  const [showRulers, setShowRulers] = useState(true);

  // AI Chat Assistant state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Convert shapes to nodes for chat context - create empty arrays as placeholders
  const chatNodes = shapes.map(shape => ({
    id: shape.id,
    type: 'custom',
    position: { x: shape.x, y: shape.y },
    data: {
      ...shape,
      label: shape.name
    }
  })) as any[];

  // Convert door connections to edges for chat context
  const chatEdges = doorConnections.map(conn => ({
    id: conn.id,
    source: conn.fromShape.shapeId,
    target: conn.toShape.shapeId,
    data: {
      type: 'MATERIAL_FLOW', // Default type
      priority: 1
    }
  })) as any[];

  // Initialize chat assistant hook
  const {
    messages,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage,
    clearHistory,
    executeAction,
    highlightedNodeIds
  } = useChatAssistant({
    nodes: chatNodes,
    edges: chatEdges,
    diagramId: initialLayout?.id
  });
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [walls, setWalls] = useState<WallSegment[]>([]);
  const [showWallTool, setShowWallTool] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  // Derived state: get selected connection object from ID
  const selectedConnection = selectedConnectionId
    ? connections.find(conn => conn.id === selectedConnectionId) || null
    : null;

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<HistoryState[]>([]);
  const shapesRef = useRef<ShapeProperties[]>(shapes);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  // Initialize history with initial layout or empty state
  useEffect(() => {
    if (historyRef.current.length === 0) {
      const initialHistoryEntry: HistoryState = {
        shapes: JSON.parse(JSON.stringify(initialLayout?.shapes || [])),
        timestamp: Date.now(),
      };
      historyRef.current = [initialHistoryEntry];
      setHistory([initialHistoryEntry]);
      setHistoryIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update canvas size to match viewport dimensions
  useEffect(() => {
    const updateCanvasSize = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const newWidth = Math.max(Math.floor(rect.width), 2000);
        const newHeight = Math.max(Math.floor(rect.height), 1500);

        setCanvasSettings(prev => {
          // Only update if dimensions changed significantly (avoid infinite loops)
          if (Math.abs(prev.width - newWidth) > 10 || Math.abs(prev.height - newHeight) > 10) {
            return {
              ...prev,
              width: newWidth,
              height: newHeight,
            };
          }
          return prev;
        });
      }
    };

    // Delay initial size calculation to ensure container is mounted
    const timeoutId = setTimeout(updateCanvasSize, 100);

    // Update on window resize
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // UI state
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showValidationOverlay, setShowValidationOverlay] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    issues: [],
    summary: { errors: 0, warnings: 0, infos: 0 },
  });

  // Compute shared walls between shapes (for door placement)
  const sharedWalls = useMemo(() => {
    return findAllSharedWalls(shapes);
  }, [shapes]);

  // Generate unique ID for new shapes
  const generateShapeId = useCallback(() => {
    return `shape-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Add to history
  const addToHistory = useCallback((newShapes: ShapeProperties[]) => {
    const historyEntry: HistoryState = {
      shapes: JSON.parse(JSON.stringify(newShapes)),
      timestamp: Date.now(),
    };

    // Remove any history after current index
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(historyEntry);

    // Limit history size to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    historyRef.current = newHistory;
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [historyIndex]);

  // Get category color
  const getCategoryColor = useCallback((category: NodeCategory): string => {
    const colors: Record<NodeCategory, string> = {
      'Production': '#3B82F6',
      'Storage': '#10B981',
      'Quality Control': '#F59E0B',
      'Quality Assurance': '#EF4444',
      'Utilities': '#6B7280',
      'Support': '#8B5CF6',
      'Logistics': '#14B8A6',
      'Personnel': '#F97316',
      'Waste Management': '#991B1B',
    };
    return colors[category] || '#94A3B8';
  }, []);

  // Validation
  const runValidation = useCallback((shapesToValidate: ShapeProperties[]) => {
    setValidationResult({
      isValid: shapesToValidate.length > 0,
      issues: [],
      summary: { errors: 0, warnings: 0, infos: 0 },
    });
  }, []);

  // Handle shape creation from template
  const handleShapeSelect = useCallback((template: PharmaceuticalShapeTemplate) => {
    const newShape: ShapeProperties = {
      id: generateShapeId(),
      name: template.name,
      shapeType: template.shapeType,
      category: template.category,
      cleanroomClass: (template.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'D',

      x: canvasSettings.width / 2 - template.defaultDimensions.width / 2,
      y: canvasSettings.height / 2 - template.defaultDimensions.height / 2,

      width: template.defaultDimensions.width,
      height: template.defaultDimensions.height,
      area: template.defaultDimensions.width * template.defaultDimensions.height,

      pressureRegime: 'positive',
      temperatureRange: { min: 18, max: 26, unit: 'C' },
      humidityRange: { min: 30, max: 60 },

      fillColor: getCleanroomColor(template.cleanroomClass),
      borderColor: '#333333',
      borderWidth: 2,
      opacity: 0.8,

      isCompliant: true,
      complianceIssues: [],

      customProperties: {
        templateId: template.id,
        pharmaceuticalContext: template.pharmaceuticalContext,
        typicalUse: template.typicalUse,
      },
    };

    setShapes(prevShapes => {
      const newShapes = [...prevShapes, newShape];
      addToHistory(newShapes);
      runValidation(newShapes);
      return newShapes;
    });

    setDrawingState(prev => ({ ...prev, selectedShapeId: newShape.id }));
    setShowPropertiesPanel(true);
  }, [canvasSettings, generateShapeId, addToHistory, runValidation]);

  // Handle free-form shape creation
  const handleShapeComplete = useCallback((shapeData: {
    shapeType: ShapeType;
    points: any[];
    dimensions: { width: number; height: number; area: number };
  }) => {
    // Calculate bounding box to anchor the shape correctly
    const xs = (shapeData.points || []).map((p: any) => p.x);
    const ys = (shapeData.points || []).map((p: any) => p.y);
    const minX = xs.length ? Math.min(...xs) : 0;
    const minY = ys.length ? Math.min(...ys) : 0;

    const newShape: ShapeProperties = {
      id: generateShapeId(),
      name: `New ${shapeData.shapeType} Room`,
      shapeType: shapeData.shapeType,
      category: 'Production', // Default category
      // cleanroomClass should only be assigned after Neo4j functional area assignment

      // Use bounding box top-left as position
      x: minX,
      y: minY,

      // FIX: Use dimensions from shapeData instead of calculating again
      width: shapeData.dimensions.width,
      height: shapeData.dimensions.height,
      area: shapeData.dimensions.area,

      // Default pharmaceutical properties
      pressureRegime: 'positive',
      temperatureRange: { min: 18, max: 26, unit: 'C' },
      humidityRange: { min: 30, max: 60 },

      // Visual properties - neutral color until cleanroom class is assigned
      fillColor: getCleanroomColor(), // Default light gray for unclassified
      borderColor: '#333333',
      borderWidth: 2,
      opacity: 0.8,

      // Compliance
      isCompliant: true,
      complianceIssues: [],

      // Custom properties
      customProperties: {
        // Store original points and relative points for rendering polygons
        points: shapeData.points,
        pointsRelative: (shapeData.points || []).map((p: any) => ({ x: p.x - minX, y: p.y - minY })),
      },
    };

    setShapes(prevShapes => {
      const newShapes = [...prevShapes, newShape];
      addToHistory(newShapes);
      runValidation(newShapes);
      return newShapes;
    });

    setDrawingState(prev => ({
      ...prev,
      selectedShapeId: newShape.id,
      activeShapeTool: null,
      isDrawing: false,
    }));
    setShowPropertiesPanel(true);
  }, [generateShapeId, addToHistory, runValidation]);

  

  // Handle shape updates
  const handleShapeUpdate = useCallback((id: string, updates: Partial<ShapeProperties>) => {
    setShapes(prevShapes => {
      const newShapes = prevShapes.map(shape =>
        shape.id === id ? { ...shape, ...updates } : shape
      );
      addToHistory(newShapes);
      runValidation(newShapes);

      // Update door connections edge points when shapes move
      setDoorConnections(prevConnections =>
        updateDoorConnectionsEdgePoints(prevConnections, newShapes)
      );

      return newShapes;
    });
  }, [addToHistory, runValidation]);

  // Handle shape deletion
  const handleShapeDelete = useCallback((id: string) => {
    setShapes(prevShapes => {
      const newShapes = prevShapes.filter(shape => shape.id !== id);
      addToHistory(newShapes);
      runValidation(newShapes);
      return newShapes;
    });

    if (drawingState.selectedShapeId === id) {
      setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
      setShowPropertiesPanel(false);
    }
  }, [drawingState.selectedShapeId, addToHistory, runValidation]);

  // Handle shape duplication
  const handleShapeDuplicate = useCallback((id: string) => {
    setShapes(prevShapes => {
      const originalShape = prevShapes.find(shape => shape.id === id);
      if (!originalShape) return prevShapes;

      const duplicatedShape: ShapeProperties = {
        ...originalShape,
        id: generateShapeId(),
        name: `${originalShape.name} (Copy)`,
        x: originalShape.x + 20,
        y: originalShape.y + 20,
      };

      const newShapes = [...prevShapes, duplicatedShape];
      addToHistory(newShapes);
      runValidation(newShapes);

      setDrawingState(prev => ({ ...prev, selectedShapeId: duplicatedShape.id }));
      return newShapes;
    });
  }, [generateShapeId, addToHistory, runValidation]);

  // Handle rotation
  const handleRotateLeft = useCallback(() => {
    if (!drawingState.selectedShapeId) return;

    const shape = shapes.find(s => s.id === drawingState.selectedShapeId);
    if (!shape) return;

    handleShapeUpdate(drawingState.selectedShapeId, {
      rotation: ((shape.rotation || 0) - 15 + 360) % 360
    });
  }, [drawingState.selectedShapeId, shapes, handleShapeUpdate]);

  const handleRotateRight = useCallback(() => {
    if (!drawingState.selectedShapeId) return;

    const shape = shapes.find(s => s.id === drawingState.selectedShapeId);
    if (!shape) return;

    handleShapeUpdate(drawingState.selectedShapeId, {
      rotation: ((shape.rotation || 0) + 15) % 360
    });
  }, [drawingState.selectedShapeId, shapes, handleShapeUpdate]);

  // Connection handlers
  const handleConnectionUpdate = useCallback((id: string, updates: Partial<Connection>) => {
    setConnections(prev => prev.map(conn =>
      conn.id === id ? { ...conn, ...updates } : conn
    ));
  }, []);

  const handleConnectionDelete = useCallback((id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
    setSelectedConnectionId(null);
  }, []);

  // Door connection update/delete handlers
  const handleDoorConnectionUpdate = useCallback((id: string, flowType: DoorFlowType, flowDirection: DoorFlowDirection, unidirectionalDirection?: 'fromFirstToSecond' | 'fromSecondToFirst') => {
    setDoorConnections(prev => prev.map(conn =>
      conn.id === id ? { ...conn, flowType, flowDirection, unidirectionalDirection, updatedAt: new Date() } : conn
    ));
    setSelectedDoorConnectionId(null);
  }, []);

  const handleDoorConnectionDelete = useCallback((id: string) => {
    setDoorConnections(prev => prev.filter(conn => conn.id !== id));
    setSelectedDoorConnectionId(null);
  }, []);

  // New door placement handlers (Hypar-style)
  const handleDoorPlace = useCallback((wallId: string, position: { x: number; y: number }, normalizedPosition: number) => {
    // Store pending placement and show config dialog
    setPendingDoorPlacement({ wallId, position, normalizedPosition });
    setShowDoorConfigDialog(true);
  }, []);

  const handleDoorConfigConfirm = useCallback((flowType: DoorFlowType, flowDirection: DoorFlowDirection, unidirectionalDirection?: 'fromFirstToSecond' | 'fromSecondToFirst') => {
    if (!pendingDoorPlacement) return;

    const sharedWall = sharedWalls.find(w => w.id === pendingDoorPlacement.wallId);
    if (!sharedWall) return;

    // Check if we're editing an existing door
    if (selectedDoorPlacementId) {
      // Update existing door
      setDoorPlacements(prev => prev.map(door =>
        door.id === selectedDoorPlacementId
          ? { ...door, flowType, flowDirection, unidirectionalDirection }
          : door
      ));
      setSelectedDoorPlacementId(null);
    } else {
      // Create new door
      const newDoor: DoorPlacement = {
        id: `door-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sharedWallId: pendingDoorPlacement.wallId,
        shape1Id: sharedWall.shape1Id,
        shape2Id: sharedWall.shape2Id,
        position: pendingDoorPlacement.position,
        normalizedPosition: pendingDoorPlacement.normalizedPosition,
        width: 40, // Default door width in pixels
        flowType,
        flowDirection,
        unidirectionalDirection,
      };

      setDoorPlacements(prev => [...prev, newDoor]);
    }

    setPendingDoorPlacement(null);
    setShowDoorConfigDialog(false);
  }, [pendingDoorPlacement, sharedWalls, selectedDoorPlacementId]);

  const handleDoorMove = useCallback((doorId: string, position: { x: number; y: number }, normalizedPosition: number) => {
    setDoorPlacements(prev => prev.map(door =>
      door.id === doorId
        ? { ...door, position, normalizedPosition }
        : door
    ));
  }, []);

  const handleDoorClick = useCallback((doorId: string) => {
    console.log('🚪 Door clicked:', doorId);
    setSelectedDoorPlacementId(doorId);
    // Also deselect any selected shape to avoid conflicting panels
    setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
    setShowPropertiesPanel(false);
  }, []);

  const handleDoorPlacementDelete = useCallback(() => {
    if (!selectedDoorPlacementId) return;
    setDoorPlacements(prev => prev.filter(d => d.id !== selectedDoorPlacementId));
    setSelectedDoorPlacementId(null);
  }, [selectedDoorPlacementId]);

  // Chat action handler
  const handleChatAction = useCallback((action: ChatAction) => {
    console.log('🤖 Executing chat action:', action);

    switch (action.type) {
      case 'add_node':
        if (action.data.nodeTemplate && action.data.position) {
          // Create a new shape from the node template
          const width = action.data.nodeTemplate.defaultSize?.width || 150;
          const height = action.data.nodeTemplate.defaultSize?.height || 100;
          const newShape: ShapeProperties = {
            id: `shape-${Date.now()}`,
            shapeType: 'rectangle',
            x: action.data.position.x,
            y: action.data.position.y,
            width,
            height,
            area: width * height,
            fillColor: action.data.nodeTemplate.color || '#3498db',
            borderColor: '#000',
            borderWidth: 2,
            opacity: 1,
            rotation: 0,
            name: action.data.nodeTemplate.name,
            category: action.data.nodeTemplate.category,
            cleanroomClass: (action.data.nodeTemplate.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'CNC',
            pressureRegime: 'positive',
            temperatureRange: { min: 20, max: 25, unit: 'C' },
            humidityRange: { min: 30, max: 50 },
            isCompliant: true,
            complianceIssues: [],
            assignedNodeName: action.data.nodeTemplate.name,
            assignedNodeId: action.data.nodeTemplate.id,
            customProperties: {}
          };
          setShapes(prev => [...prev, newShape]);
          setSnackbarMessage(`Added ${newShape.name} to layout`);
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }
        break;

      case 'highlight_node':
        if (action.data.highlightNodeIds && action.data.highlightNodeIds.length > 0) {
          // Highlight is already handled by the hook's highlightedNodeIds state
          // We just need to show a message
          setSnackbarMessage(`Highlighting ${action.data.highlightNodeIds.length} area(s)`);
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
        break;

      case 'add_relationship':
        if (action.data.relationship) {
          // This would add a door connection or other relationship
          setSnackbarMessage('Relationship feature coming soon');
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
        break;

      case 'suggest_layout':
        if (action.data.layoutSuggestion) {
          setSnackbarMessage('Layout suggestion feature coming soon');
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
        }
        break;

      case 'generate_layout':
        if (action.data.description) {
          // Generate layout from natural language description
          (async () => {
            try {
              setSnackbarMessage('Generating layout...');
              setSnackbarSeverity('info');
              setSnackbarOpen(true);

              const generatedLayout = await GenerativeApiService.generateLayout({
                description: action.data.description!,
                constraints: action.data.constraints || {},
                mode: 'detailed'
              });

              // Convert generated layout to shapes
              const newShapes: ShapeProperties[] = generatedLayout.nodes.map((node: any) => ({
                id: `shape-${node.id}-${Date.now()}`,
                shapeType: 'rectangle' as ShapeType,
                x: node.x || 0,
                y: node.y || 0,
                width: node.width || 150,
                height: node.height || 100,
                area: (node.width || 150) * (node.height || 100),
                fillColor: node.color || getCleanroomColor(node.cleanroomClass),
                borderColor: '#000',
                borderWidth: 2,
                opacity: 1,
                rotation: 0,
                name: node.name,
                category: node.category as NodeCategory,
                cleanroomClass: (node.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'CNC',
                pressureRegime: 'positive',
                temperatureRange: { min: 20, max: 25, unit: 'C' },
                humidityRange: { min: 30, max: 50 },
                isCompliant: true,
                complianceIssues: [],
                assignedNodeName: node.name,
                assignedNodeId: node.id,
                customProperties: {}
              }));

              setShapes(newShapes);
              setSnackbarMessage(`Generated ${newShapes.length} functional areas. Compliance score: ${generatedLayout.complianceScore}/100`);
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            } catch (error: any) {
              console.error('Failed to generate layout:', error);
              setSnackbarMessage(`Failed to generate layout: ${error.message}`);
              setSnackbarSeverity('error');
              setSnackbarOpen(true);
            }
          })();
        }
        break;

      case 'instantiate_template':
        if (action.data.templateId) {
          // Instantiate a facility template
          (async () => {
            try {
              setSnackbarMessage('Instantiating template...');
              setSnackbarSeverity('info');
              setSnackbarOpen(true);

              const diagram = await GenerativeApiService.instantiateTemplate({
                templateId: action.data.templateId!,
                parameters: action.data.parameters || {}
              });

              // Convert diagram to shapes
              const newShapes: ShapeProperties[] = diagram.nodes.map((node: any) => ({
                id: `shape-${node.id}-${Date.now()}`,
                shapeType: 'rectangle' as ShapeType,
                x: node.x || 0,
                y: node.y || 0,
                width: node.width || 150,
                height: node.height || 100,
                area: (node.width || 150) * (node.height || 100),
                fillColor: node.color || getCleanroomColor(node.cleanroomClass),
                borderColor: '#000',
                borderWidth: 2,
                opacity: 1,
                rotation: 0,
                name: node.name,
                category: node.category as NodeCategory,
                cleanroomClass: (node.cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC') || 'CNC',
                pressureRegime: 'positive',
                temperatureRange: { min: 20, max: 25, unit: 'C' },
                humidityRange: { min: 30, max: 50 },
                isCompliant: true,
                complianceIssues: [],
                assignedNodeName: node.name,
                assignedNodeId: node.id,
                customProperties: {}
              }));

              setShapes(newShapes);
              setSnackbarMessage(`Created ${diagram.name} with ${newShapes.length} functional areas`);
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            } catch (error: any) {
              console.error('Failed to instantiate template:', error);
              setSnackbarMessage(`Failed to instantiate template: ${error.message}`);
              setSnackbarSeverity('error');
              setSnackbarOpen(true);
            }
          })();
        }
        break;

      case 'optimize_layout':
        // Optimize current layout
        (async () => {
          try {
            if (shapes.length === 0) {
              setSnackbarMessage('No shapes to optimize');
              setSnackbarSeverity('warning');
              setSnackbarOpen(true);
              return;
            }

            setSnackbarMessage('Optimizing layout...');
            setSnackbarSeverity('info');
            setSnackbarOpen(true);

            // Convert shapes to nodes array
            const nodes = shapes.map(shape => ({
              id: shape.id,
              name: shape.name || '',
              category: shape.category,
              cleanroomClass: shape.cleanroomClass,
              x: shape.x,
              y: shape.y,
              width: shape.width,
              height: shape.height
            }));

            const optimizedPositions = await GenerativeApiService.optimizeLayout(
              nodes,
              [], // No relationships for now
              {
                objectives: ['minimize_overlap', 'optimize_flow', 'cluster_by_cleanroom']
              }
            );

            // Update shapes with optimized positions
            const optimizedShapes = shapes.map(shape => {
              const newPosition = optimizedPositions[shape.id];
              if (newPosition) {
                return {
                  ...shape,
                  x: newPosition.x,
                  y: newPosition.y
                };
              }
              return shape;
            });

            setShapes(optimizedShapes);
            setSnackbarMessage('Layout optimized successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
          } catch (error: any) {
            console.error('Failed to optimize layout:', error);
            setSnackbarMessage(`Failed to optimize layout: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
          }
        })();
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }

    // Also call the executeAction from the hook to update highlights
    executeAction(action);
  }, [executeAction, shapes]);

  // Initialize door connection validation hook
  const {
    shapeValidationStates,
    validateConnection,
    clearValidation,
    validationMessage
  } = useDoorConnectionValidation({
    shapes,
    drawingMode,
    firstSelectedShapeId: doorConnectionDrawing.firstShapeId,
    hoveredShapeId: drawingState.hoveredShapeId,
  });

  // Door connection handlers (3-step process)
  const handleDoorConnectionClick = useCallback((event: React.MouseEvent, shapeId?: string) => {
    if (drawingMode !== 'door') return;

    const step = doorConnectionDrawing.step;

    // Step 1: Select first shape
    if (step === 'idle' && shapeId) {
      setDoorConnectionDrawing({
        step: 'selectSecondShape',
        firstShapeId: shapeId,
        secondShapeId: null,
        edgePoint: null,
      });
      return;
    }

    // Step 2: Select second shape
    if (step === 'selectSecondShape' && shapeId) {
      if (shapeId === doorConnectionDrawing.firstShapeId) {
        // Clicked same shape - cancel
        setDoorConnectionDrawing({
          step: 'idle',
          firstShapeId: null,
          secondShapeId: null,
          edgePoint: null,
        });
        return;
      }

      setDoorConnectionDrawing(prev => ({
        ...prev,
        step: 'selectEdgePoint',
        secondShapeId: shapeId,
      }));
      return;
    }

    // Step 3: Select edge on one of the two shapes
    if (step === 'selectEdgePoint' && shapeId) {
      // Only allow clicking on one of the two selected shapes
      if (shapeId !== doorConnectionDrawing.firstShapeId && shapeId !== doorConnectionDrawing.secondShapeId) {
        return;
      }

      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = (event.clientX - rect.left) / canvasSettings.zoom;
      const clickY = (event.clientY - rect.top) / canvasSettings.zoom;

      setDoorConnectionDrawing(prev => ({
        ...prev,
        edgePoint: { x: clickX, y: clickY },
      }));

      // Show dialog to select flow type and direction
      setShowDoorDialog(true);
    }
  }, [drawingMode, doorConnectionDrawing, canvasSettings.zoom]);

  const handleDoorDialogConfirm = useCallback(async (flowType: DoorFlowType, flowDirection: DoorFlowDirection, unidirectionalDirection?: 'fromFirstToSecond' | 'fromSecondToFirst') => {
    if (!doorConnectionDrawing.firstShapeId || !doorConnectionDrawing.secondShapeId || !doorConnectionDrawing.edgePoint) {
      return;
    }

    const firstShape = shapes.find(s => s.id === doorConnectionDrawing.firstShapeId);
    const secondShape = shapes.find(s => s.id === doorConnectionDrawing.secondShapeId);

    if (!firstShape || !secondShape) {
      setShowDoorDialog(false);
      setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
      return;
    }

    // Validate the door connection before creating it
    const validationResult = await validateConnection(doorConnectionDrawing.firstShapeId, doorConnectionDrawing.secondShapeId);

    if (validationResult) {
      // Check if connection is allowed
      if (!validationResult.canConnect) {
        // Show error in snackbar
        setSnackbarMessage(validationResult.message + (validationResult.details ? ': ' + validationResult.details : ''));
        setSnackbarSeverity(validationResult.status === 'no-neo4j-assignment' ? 'warning' : 'error');
        setSnackbarOpen(true);

        setShowDoorDialog(false);
        setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
        return;
      }

      // Check if the requested flow type is allowed
      if (!validationResult.allowedFlowTypes.includes(flowType)) {
        setSnackbarMessage(`${flowType} flow not allowed. Allowed: ${validationResult.allowedFlowTypes.join(', ')}`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);

        setShowDoorDialog(false);
        setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
        return;
      }

      // Connection is valid - show success message
      setSnackbarMessage('Door connection created successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    }

    // Find the shared edge between the two shapes
    const findSharedEdge = () => {
      const shape1Points = computePointsRelative(firstShape);
      const shape2Points = computePointsRelative(secondShape);
      const tolerance = 5;

      // Convert relative points to absolute coordinates
      const shape1Edges = shape1Points.map((p, i) => ({
        p1: { x: firstShape.x + p.x, y: firstShape.y + p.y },
        p2: {
          x: firstShape.x + shape1Points[(i + 1) % shape1Points.length].x,
          y: firstShape.y + shape1Points[(i + 1) % shape1Points.length].y
        },
        index: i
      }));

      const shape2Edges = shape2Points.map((p, i) => ({
        p1: { x: secondShape.x + p.x, y: secondShape.y + p.y },
        p2: {
          x: secondShape.x + shape2Points[(i + 1) % shape2Points.length].x,
          y: secondShape.y + shape2Points[(i + 1) % shape2Points.length].y
        },
        index: i
      }));

      // Find overlapping edges
      for (const edge1 of shape1Edges) {
        for (const edge2 of shape2Edges) {
          // Check if edges overlap (are on same line and overlap in their ranges)
          const isVertical1 = Math.abs(edge1.p2.x - edge1.p1.x) < tolerance;
          const isVertical2 = Math.abs(edge2.p2.x - edge2.p1.x) < tolerance;
          const isHorizontal1 = Math.abs(edge1.p2.y - edge1.p1.y) < tolerance;
          const isHorizontal2 = Math.abs(edge2.p2.y - edge2.p1.y) < tolerance;

          // Check for horizontal overlap
          if (isHorizontal1 && isHorizontal2 && Math.abs(edge1.p1.y - edge2.p1.y) < tolerance) {
            const minX1 = Math.min(edge1.p1.x, edge1.p2.x);
            const maxX1 = Math.max(edge1.p1.x, edge1.p2.x);
            const minX2 = Math.min(edge2.p1.x, edge2.p2.x);
            const maxX2 = Math.max(edge2.p1.x, edge2.p2.x);

            const overlapStart = Math.max(minX1, minX2);
            const overlapEnd = Math.min(maxX1, maxX2);

            if (overlapStart < overlapEnd) {
              const midX = (overlapStart + overlapEnd) / 2;
              const midY = (edge1.p1.y + edge2.p1.y) / 2;
              return {
                point1: { x: overlapStart, y: midY },
                point2: { x: overlapEnd, y: midY },
                midpoint: { x: midX, y: midY },
                edge1Index: edge1.index,
                edge2Index: edge2.index
              };
            }
          }

          // Check for vertical overlap
          if (isVertical1 && isVertical2 && Math.abs(edge1.p1.x - edge2.p1.x) < tolerance) {
            const minY1 = Math.min(edge1.p1.y, edge1.p2.y);
            const maxY1 = Math.max(edge1.p1.y, edge1.p2.y);
            const minY2 = Math.min(edge2.p1.y, edge2.p2.y);
            const maxY2 = Math.max(edge2.p1.y, edge2.p2.y);

            const overlapStart = Math.max(minY1, minY2);
            const overlapEnd = Math.min(maxY1, maxY2);

            if (overlapStart < overlapEnd) {
              const midX = (edge1.p1.x + edge2.p1.x) / 2;
              const midY = (overlapStart + overlapEnd) / 2;
              return {
                point1: { x: midX, y: overlapStart },
                point2: { x: midX, y: overlapEnd },
                midpoint: { x: midX, y: midY },
                edge1Index: edge1.index,
                edge2Index: edge2.index
              };
            }
          }
        }
      }

      return null;
    };

    const sharedEdge = findSharedEdge();

    if (!sharedEdge) {
      alert('Shapes must share a common edge to create a door connection!');
      setShowDoorDialog(false);
      setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
      return;
    }

    const newDoorConnection: DoorConnection = {
      id: `door-${Date.now()}`,
      fromShape: {
        shapeId: doorConnectionDrawing.firstShapeId,
        x: sharedEdge.midpoint.x,
        y: sharedEdge.midpoint.y,
        edgeIndex: sharedEdge.edge1Index,
        normalizedPosition: 0.5,
      },
      toShape: {
        shapeId: doorConnectionDrawing.secondShapeId,
        x: sharedEdge.midpoint.x,
        y: sharedEdge.midpoint.y,
        edgeIndex: sharedEdge.edge2Index,
        normalizedPosition: 0.5,
      },
      flowType,
      flowDirection,
      unidirectionalDirection,
      edgeStartPoint: sharedEdge.point1,
      edgeEndPoint: sharedEdge.point2,
      createdAt: new Date(),
    };

    setDoorConnections(prev => [...prev, newDoorConnection]);
    setShowDoorDialog(false);
    setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
  }, [doorConnectionDrawing, shapes, validateConnection]);

  const handleDoorDialogCancel = useCallback(() => {
    setShowDoorDialog(false);
    setDoorConnectionDrawing({ step: 'idle', firstShapeId: null, secondShapeId: null, edgePoint: null });
  }, []);

  // History operations
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = historyRef.current[historyIndex - 1];
      setShapes(previousState.shapes);
      setHistoryIndex(historyIndex - 1);
      runValidation(previousState.shapes);
    }
  }, [historyIndex, runValidation]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyRef.current.length - 1) {
      const nextState = historyRef.current[historyIndex + 1];
      setShapes(nextState.shapes);
      setHistoryIndex(historyIndex + 1);
      runValidation(nextState.shapes);
    }
  }, [historyIndex, runValidation]);

  const handleClear = useCallback(() => {
    setShapes([]);
    addToHistory([]);
    setDrawingState({
      activeShapeTool: null,
      isDrawing: false,
      selectedShapeId: null,
      hoveredShapeId: null,
    });
    setShowPropertiesPanel(false);
    runValidation([]);
  }, [addToHistory, runValidation]);

  // Canvas settings
  const handleCanvasSizeChange = useCallback((width: number, height: number) => {
    setCanvasSettings(prev => ({ ...prev, width, height }));
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setCanvasSettings(prev => ({ ...prev, zoom }));
  }, []);

  const handleFitToWindow = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || shapes.length === 0) return;

    // Calculate bounding box of all shapes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.forEach(shape => {
      // For polygon shapes, calculate actual bounds from points
      if (polygonRenderTypes.has(shape.shapeType)) {
        const points = computePointsRelative(shape);
        points.forEach(point => {
          const absX = shape.x + point.x;
          const absY = shape.y + point.y;
          minX = Math.min(minX, absX);
          minY = Math.min(minY, absY);
          maxX = Math.max(maxX, absX);
          maxY = Math.max(maxY, absY);
        });
      } else {
        // For simple rectangular shapes
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + shape.width);
        maxY = Math.max(maxY, shape.y + shape.height);
      }
    });

    // Add padding around the content
    const padding = 50;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    // Get viewport dimensions
    const viewportWidth = container.clientWidth;
    const viewportHeight = container.clientHeight;

    // Calculate zoom to fit content in viewport
    const zoomX = viewportWidth / contentWidth;
    const zoomY = viewportHeight / contentHeight;
    const newZoom = clampZoom(Math.min(zoomX, zoomY));

    // Calculate scroll position to center content
    const centerX = (minX + maxX) / 2 - padding;
    const centerY = (minY + maxY) / 2 - padding;

    setCanvasSettings(prev => ({ ...prev, zoom: newZoom }));

    // Apply scroll position after zoom is applied
    requestAnimationFrame(() => {
      const scaledCenterX = centerX * newZoom;
      const scaledCenterY = centerY * newZoom;
      container.scrollLeft = scaledCenterX - viewportWidth / 2;
      container.scrollTop = scaledCenterY - viewportHeight / 2;
    });
  }, [shapes, polygonRenderTypes, computePointsRelative]);

  const handleToggleGrid = useCallback(() => {
    setCanvasSettings(prev => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const handleToggleSnap = useCallback(() => {
    setCanvasSettings(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  }, []);

  const handleGridSizeChange = useCallback((size: number) => {
    setCanvasSettings(prev => ({ ...prev, gridSize: size }));
  }, []);

  // Get selected shape
  const selectedShape = drawingState.selectedShapeId
    ? shapes.find(shape => shape.id === drawingState.selectedShapeId)
    : null;

  // Initialize suggestions hook
  const { handleSuggestionClick } = useSuggestions({
    selectedShapeId: drawingState.selectedShapeId,
    selectedShapeNeo4jNode: (selectedShape as any)?.assignedNodeName || null,
    shapes,
    onShapeCreate: useCallback((newShape: ShapeProperties) => {
      setShapes(prev => [...prev, newShape]);
      addToHistory([...shapes, newShape]);
      runValidation([...shapes, newShape]);
    }, [shapes, addToHistory, runValidation]),
    enabled: true
  });

  // Drag state for moving shapes
  const draggingRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Middle-mouse panning state
  const panningRef = useRef<{
    startClientX: number;
    startClientY: number;
    startScrollLeft: number;
    startScrollTop: number;
    active: boolean;
  }>({ startClientX: 0, startClientY: 0, startScrollLeft: 0, startScrollTop: 0, active: false });

  // Resize state
  const resizingRef = useRef<{
    id: string;
    handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l';
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const startShapeDrag = useCallback((e: React.MouseEvent, shape: ShapeProperties) => {
    if (e.button !== 0) return; // only left-click drags shape
    // Prevent starting drag while drawing a shape
    if (drawingState.isDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    setDrawingState(prev => ({ ...prev, selectedShapeId: shape.id }));

    draggingRef.current = {
      id: shape.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: shape.x,
      startY: shape.y,
    };

    const handleMouseMove = (me: MouseEvent) => {
      if (!draggingRef.current) return;
      const { id, startClientX, startClientY, startX, startY } = draggingRef.current;

      const dx = (me.clientX - startClientX) / (canvasSettings.zoom || 1);
      const dy = (me.clientY - startClientY) / (canvasSettings.zoom || 1);

      let newX = startX + dx;
      let newY = startY + dy;

      // Snap to grid if enabled
      if (canvasSettings.snapToGrid) {
        const g = canvasSettings.gridSize || 20;
        newX = Math.round(newX / g) * g;
        newY = Math.round(newY / g) * g;
      }

      // Clamp within canvas
      newX = clamp(newX, 0, Math.max(0, canvasSettings.width - shape.width));
      newY = clamp(newY, 0, Math.max(0, canvasSettings.height - shape.height));

      // Update position without pushing history on every frame
      setShapes(prev => prev.map(s => (s.id === id ? { ...s, x: newX, y: newY } : s)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Push final position to history and re-run validation
      addToHistory(shapesRef.current);
      runValidation(shapesRef.current);

      // Update door connections edge points after shape drag ends
      setDoorConnections(prevConnections =>
        updateDoorConnectionsEdgePoints(prevConnections, shapesRef.current)
      );

      draggingRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [drawingState.isDrawing, canvasSettings, addToHistory, runValidation]);

  // Middle mouse panning handlers on the scroll container
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1) return; // middle button only
    const el = scrollContainerRef.current;
    if (!el) return;
    panningRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
      active: true,
    };
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    e.preventDefault();
  }, []);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (!panningRef.current.active) return;
    const dx = e.clientX - panningRef.current.startClientX;
    const dy = e.clientY - panningRef.current.startClientY;
    el.scrollLeft = panningRef.current.startScrollLeft - dx;
    el.scrollTop = panningRef.current.startScrollTop - dy;
  }, []);

  const handleContainerMouseUp = useCallback(() => {
    if (panningRef.current.active) {
      const el = scrollContainerRef.current;
      if (el) el.style.cursor = 'default';
      panningRef.current.active = false;
    }
  }, []);

  const clampZoom = (z: number) => Math.min(4, Math.max(0.25, z));

  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    // Zoom with wheel (middle wheel). Prevent default scrolling.
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;
    const oldZoom = canvasSettings.zoom;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = clampZoom(oldZoom * zoomFactor);
    if (newZoom === oldZoom) return;

    // Mouse position relative to container content
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const offsetX = mouseX + scrollLeft;
    const offsetY = mouseY + scrollTop;
    const scale = newZoom / oldZoom;

    setCanvasSettings(prev => ({ ...prev, zoom: newZoom }));

    // Adjust scroll to keep mouse focus stable
    const newScrollLeft = offsetX * scale - mouseX;
    const newScrollTop = offsetY * scale - mouseY;
    // Slight delay to allow layout apply transform
    requestAnimationFrame(() => {
      container.scrollLeft = newScrollLeft;
      container.scrollTop = newScrollTop;
    });
  }, [canvasSettings.zoom]);

  // Double-click background to deselect
  const handleBackgroundDoubleClick = useCallback((e: React.MouseEvent) => {
    // Ignore when drawing
    if (drawingState.isDrawing || drawingState.activeShapeTool) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-shape-overlay="true"]')) return; // clicked a shape
    setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
    setShowPropertiesPanel(false);
  }, [drawingState.isDrawing, drawingState.activeShapeTool]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Only handle canvas background clicks (not shape clicks) in door mode
    if (drawingMode === 'door' && !target.closest('[data-shape-overlay="true"]')) {
      handleDoorConnectionClick(e);
    }
  }, [drawingMode, handleDoorConnectionClick]);

  const startShapeResize = useCallback((e: React.MouseEvent, shape: ShapeProperties, handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') => {
    if (drawingState.isDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    setDrawingState(prev => ({ ...prev, selectedShapeId: shape.id }));

    resizingRef.current = {
      id: shape.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: shape.x,
      startY: shape.y,
      startW: shape.width,
      startH: shape.height,
    };

    const minSize = 20;

    const handleMouseMove = (me: MouseEvent) => {
      if (!resizingRef.current) return;
      const { id, handle, startClientX, startClientY, startX, startY, startW, startH } = resizingRef.current;

      const dx = (me.clientX - startClientX) / (canvasSettings.zoom || 1);
      const dy = (me.clientY - startClientY) / (canvasSettings.zoom || 1);

      let newX = startX;
      let newY = startY;
      let newW = startW;
      let newH = startH;

      switch (handle) {
        case 'tl':
          newX = startX + dx;
          newY = startY + dy;
          newW = startW - dx;
          newH = startH - dy;
          break;
        case 'tr':
          newY = startY + dy;
          newW = startW + dx;
          newH = startH - dy;
          break;
        case 'bl':
          newX = startX + dx;
          newW = startW - dx;
          newH = startH + dy;
          break;
        case 'br':
          newW = startW + dx;
          newH = startH + dy;
          break;
        case 't':
          newY = startY + dy;
          newH = startH - dy;
          break;
        case 'b':
          newH = startH + dy;
          break;
        case 'l':
          newX = startX + dx;
          newW = startW - dx;
          break;
        case 'r':
          newW = startW + dx;
          break;
      }

      // Enforce min size before snapping
      newW = Math.max(minSize, newW);
      newH = Math.max(minSize, newH);

      // Clamp within canvas bounds
      newX = clamp(newX, 0, canvasSettings.width - newW);
      newY = clamp(newY, 0, canvasSettings.height - newH);

      // Snap to grid
      if (canvasSettings.snapToGrid) {
        const g = canvasSettings.gridSize || 20;
        const snappedX = Math.round(newX / g) * g;
        const snappedY = Math.round(newY / g) * g;
        const snappedW = Math.max(minSize, Math.round(newW / g) * g);
        const snappedH = Math.max(minSize, Math.round(newH / g) * g);

        newX = clamp(snappedX, 0, canvasSettings.width - snappedW);
        newY = clamp(snappedY, 0, canvasSettings.height - snappedH);
        newW = Math.min(snappedW, canvasSettings.width - newX);
        newH = Math.min(snappedH, canvasSettings.height - newY);
      }

      setShapes(prev => prev.map(s => (s.id === id ? { ...s, x: newX, y: newY, width: newW, height: newH, area: Math.round(newW * newH) } : s)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      addToHistory(shapesRef.current);
      runValidation(shapesRef.current);

      // Update door connections edge points after shape resize ends
      setDoorConnections(prevConnections =>
        updateDoorConnectionsEdgePoints(prevConnections, shapesRef.current)
      );

      resizingRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [drawingState.isDrawing, canvasSettings, addToHistory, runValidation]);

  // Keyboard nudging and deletion for selected shape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const selectedId = drawingState.selectedShapeId;
      if (!selectedId) return;

      // Handle Delete and Backspace keys
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleShapeDelete(selectedId);
        return;
      }

      let dx = 0;
      let dy = 0;
      const baseStep = canvasSettings.snapToGrid ? canvasSettings.gridSize : 5;
      const step = e.shiftKey ? baseStep * 2 : baseStep;

      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else return;

      e.preventDefault();

      setShapes(prev => {
        const newShapes = prev.map(s => {
          if (s.id !== selectedId) return s;
          const nx = clamp(s.x + dx, 0, Math.max(0, canvasSettings.width - s.width));
          const ny = clamp(s.y + dy, 0, Math.max(0, canvasSettings.height - s.height));
          return { ...s, x: nx, y: ny };
        });
        addToHistory(newShapes);
        runValidation(newShapes);

        // Update door connections edge points after keyboard nudge
        setDoorConnections(prevConnections =>
          updateDoorConnectionsEdgePoints(prevConnections, newShapes)
        );

        return newShapes;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawingState.selectedShapeId, canvasSettings, addToHistory, runValidation, handleShapeDelete]);

  return (
    <Box sx={{ height: '100vh', position: 'relative' }}>
      {/* Main Canvas Area - Full viewport */}
      <Box sx={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {/* Canvas Container */}
        <Box
          ref={scrollContainerRef}
          sx={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: '#e5e5e5',
            position: 'relative',
          }}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp}
          onWheel={handleWheelZoom}
          onClick={handleCanvasClick}
          onDoubleClick={handleBackgroundDoubleClick}
        >
          <Box
            ref={contentRef}
            sx={{
              transform: `scale(${canvasSettings.zoom})`,
              transformOrigin: 'top left',
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            <DrawingCanvas
              width={canvasSettings.width}
              height={canvasSettings.height}
              onShapeComplete={handleShapeComplete}
              gridSize={canvasSettings.gridSize}
              showGrid={canvasSettings.showGrid}
              snapToGrid={canvasSettings.snapToGrid}
              activeShapeTool={drawingState.activeShapeTool}
              isDrawing={drawingState.isDrawing}
              onDrawingStateChange={React.useCallback((drawing: boolean) => {
                setDrawingState(prev => ({ ...prev, isDrawing: drawing }));
              }, [])}
              backgroundColor={canvasSettings.backgroundColor}
            />

            {/* Professional Rulers */}
            {showRulers && (
              <RulerOverlay
                canvasWidth={canvasSettings.width}
                canvasHeight={canvasSettings.height}
                unitConverter={unitConverter}
              />
            )}

            {/* Connection Layer (SVG) */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSettings.width,
                height: canvasSettings.height,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <g style={{ pointerEvents: 'all' }}>
                <ConnectionRenderer
                  connections={connections}
                  shapes={shapes}
                  selectedConnectionId={selectedConnectionId}
                  onConnectionClick={(id) => {
                    setSelectedConnectionId(id);
                    setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
                    setShowPropertiesPanel(true);
                  }}
                />
              </g>
            </svg>

            {/* Door Connection Layer */}
            <DoorConnectionRenderer
              connections={doorConnections}
              onConnectionClick={(id) => setSelectedDoorConnectionId(id)}
            />

            {/* Door Placement Overlay (Hypar-style) */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSettings.width,
                height: canvasSettings.height,
                pointerEvents: 'none', // Individual elements control their own pointer events
                zIndex: 10,
              }}
            >
              <DoorPlacementOverlay
                sharedWalls={sharedWalls}
                shapes={shapes}
                doorPlacements={doorPlacements}
                isDoorMode={drawingMode === 'door'}
                onDoorPlace={handleDoorPlace}
                onDoorMove={handleDoorMove}
                onDoorClick={handleDoorClick}
                selectedDoorId={selectedDoorPlacementId}
              />
            </svg>

            {/* Measurement Layer */}
            <MeasurementRenderer
              measurements={measurements}
              unitConverter={unitConverter}
              selectedMeasurementId={selectedMeasurementId}
              onMeasurementClick={(id) => setSelectedMeasurementId(id)}
            />

            {/* Shape Overlays */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: canvasSettings.width,
                height: canvasSettings.height,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {shapes.map((shape) => {
                // Get validation state for this shape (if in door mode and validating)
                const validationState = shapeValidationStates[shape.id];
                const isValidating = drawingMode === 'door' && doorConnectionDrawing.firstShapeId && validationState;
                const validationColor = validationState?.color;
                const validationBorderWidth = isValidating ? 4 : shape.borderWidth;

                return (
                <Box
                  key={shape.id}
                  data-shape-overlay="true"
                  sx={{
                    position: 'absolute',
                    left: shape.x,
                    top: shape.y,
                    width: shape.width,
                    height: shape.height,
                    backgroundColor:
                      isValidating
                        ? validationColor + '40'
                        : polygonRenderTypes.has(shape.shapeType)
                        ? 'transparent'
                        : shape.fillColor + '40',
                    border: polygonRenderTypes.has(shape.shapeType)
                      ? (isValidating ? `${validationBorderWidth}px solid ${validationColor}` : 'none')
                      : `${isValidating ? validationBorderWidth : shape.borderWidth}px solid ${isValidating ? validationColor : shape.borderColor}`,
                    borderRadius: shape.shapeType === 'circle' ? '50%' : 1,
                    opacity: shape.opacity,
                    cursor: 'grab',
                    pointerEvents: 'all',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    transform: `rotate(${shape.rotation || 0}deg)`,
                    transformOrigin: 'center center',
                    ...(polygonRenderTypes.has(shape.shapeType)
                      ? {
                          '&:hover': {
                            backgroundColor: 'transparent',
                          },
                        }
                      : {
                          '&:hover': {
                            backgroundColor: shape.fillColor + '60',
                            transform: `rotate(${shape.rotation || 0}deg) scale(1.02)`,
                          },
                          ...(drawingState.selectedShapeId === shape.id && {
                            boxShadow: `0 0 0 3px ${shape.fillColor}`,
                          }),
                          // AI Chat highlight effect
                          ...(highlightedNodeIds.includes(shape.id) && {
                            boxShadow: '0 0 0 4px #FFD700, 0 0 20px rgba(255, 215, 0, 0.6)',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': {
                                boxShadow: '0 0 0 4px #FFD700, 0 0 20px rgba(255, 215, 0, 0.6)',
                              },
                              '50%': {
                                boxShadow: '0 0 0 6px #FFD700, 0 0 30px rgba(255, 215, 0, 0.8)',
                              },
                              '100%': {
                                boxShadow: '0 0 0 4px #FFD700, 0 0 20px rgba(255, 215, 0, 0.6)',
                              },
                            },
                          }),
                        }),
                  }}
                  onClick={(e) => {
                    if (drawingMode === 'door') {
                      handleDoorConnectionClick(e, shape.id);
                    } else {
                      setDrawingState(prev => ({
                        ...prev,
                        selectedShapeId: shape.id,
                      }));
                      setShowPropertiesPanel(true);
                    }
                  }}
                  onMouseEnter={() => {
                    setDrawingState(prev => ({ ...prev, hoveredShapeId: shape.id }));
                  }}
                  onMouseLeave={() => {
                    setDrawingState(prev => ({ ...prev, hoveredShapeId: null }));
                  }}
                  onMouseDown={(e) => {
                    startShapeDrag(e, shape);
                  }}
                >
                  {/* SVG for polygonal shapes */}
                  {polygonRenderTypes.has(shape.shapeType) && (
                    <svg
                      width={shape.width}
                      height={shape.height}
                      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                      data-testid={`polygon-path-${shape.id}`}
                    >
                      <g transform={`rotate(${shape.rotation || 0} ${shape.width / 2} ${shape.height / 2})`}>
                        {(drawingState.selectedShapeId === shape.id || isValidating) && (
                          <path
                            d={`M ${computePointsRelative(shape).map((p, i) => `${i === 0 ? '' : 'L '}${p.x} ${p.y}`).join(' ')} Z`}
                            fill="none"
                            stroke={isValidating ? validationColor : shape.fillColor}
                            strokeOpacity={0.5}
                            strokeWidth={isValidating ? validationBorderWidth : 4}
                          />
                        )}
                        <path
                          d={`M ${computePointsRelative(shape).map((p, i) => `${i === 0 ? '' : 'L '}${p.x} ${p.y}`).join(' ')} Z`}
                          fill={isValidating ? validationColor + '40' : shape.fillColor + '40'}
                          stroke={isValidating ? validationColor : shape.borderColor}
                          strokeWidth={isValidating ? validationBorderWidth : shape.borderWidth}
                        />
                      </g>
                    </svg>
                  )}
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.primary"
                    textAlign="center"
                    sx={{ wordBreak: 'break-word', px: 1 }}
                  >
                    {shape.name}

                    {/* Cleanroom Class Badge */}
                    {shape.cleanroomClass && shape.cleanroomClass !== 'CNC' && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          ml: 0.5,
                          px: 0.8,
                          py: 0.2,
                          borderRadius: 1,
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          backgroundColor: getCleanroomColor(shape.cleanroomClass),
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        }}
                      >
                        Class {shape.cleanroomClass}
                      </Box>
                    )}

                    {/* Area Display */}
                    {shape.area && (
                      <Box component="span" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8, mt: 0.5 }}>
                        📏 {unitConverter.formatArea(shape.area)}
                      </Box>
                    )}

                    {/* Wall Dimensions */}
                    {(shape.shapeType === 'rectangle' || shape.shapeType === 'custom') && (
                      <Box component="span" sx={{ display: 'block', fontSize: '0.65rem', opacity: 0.7, mt: 0.3, fontStyle: 'italic' }}>
                        {unitConverter.formatPixels(shape.width)} × {unitConverter.formatPixels(shape.height)}
                      </Box>
                    )}
                  </Typography>

                  {/* Resize handles - show only for selected shape */}
                  {drawingState.selectedShapeId === shape.id && (
                    <>
                      {/* Corner handles */}
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'tl')} sx={{ position: 'absolute', left: -6, top: -6, width: 12, height: 12, backgroundColor: '#1976d2', border: '2px solid #fff', borderRadius: 2, cursor: 'nw-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'tr')} sx={{ position: 'absolute', right: -6, top: -6, width: 12, height: 12, backgroundColor: '#1976d2', border: '2px solid #fff', borderRadius: 2, cursor: 'ne-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'bl')} sx={{ position: 'absolute', left: -6, bottom: -6, width: 12, height: 12, backgroundColor: '#1976d2', border: '2px solid #fff', borderRadius: 2, cursor: 'sw-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'br')} sx={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, backgroundColor: '#1976d2', border: '2px solid #fff', borderRadius: 2, cursor: 'se-resize' }} />

                      {/* Edge handles */}
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 't')} sx={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, backgroundColor: '#ff9800', border: '2px solid #fff', borderRadius: '50%', cursor: 'n-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'b')} sx={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, backgroundColor: '#ff9800', border: '2px solid #fff', borderRadius: '50%', cursor: 's-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'l')} sx={{ position: 'absolute', left: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, backgroundColor: '#ff9800', border: '2px solid #fff', borderRadius: '50%', cursor: 'w-resize' }} />
                      <Box onMouseDown={(e) => startShapeResize(e, shape, 'r')} sx={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, backgroundColor: '#ff9800', border: '2px solid #fff', borderRadius: '50%', cursor: 'e-resize' }} />
                    </>
                  )}
                </Box>
              );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Shape Library Sidebar - Floating overlay */}
      {isSidebarVisible && (
        <Paper
          elevation={2}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 320,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            zIndex: 100,
          }}
        >
          <ShapeLibrary
            onShapeSelect={handleShapeSelect}
            onShapeToolSelect={(tool) =>
              setDrawingState(prev => ({
                ...prev,
                activeShapeTool: prev.activeShapeTool === tool ? null : tool,
              }))
            }
            selectedShapeType={drawingState.activeShapeTool}
          />
        </Paper>
      )}

      {/* Drawing Tools */}
      <DrawingTools
        drawingMode={drawingMode}
        onDrawingModeChange={(mode) => {
          setDrawingMode(mode);
          // Show wall tool panel when entering wall mode
          if (mode === 'wall') {
            setShowWallTool(true);
          } else {
            setShowWallTool(false);
          }
        }}
        activeShapeTool={drawingState.activeShapeTool}
        onShapeToolChange={(tool) => {
          setDrawingState(prev => ({ ...prev, activeShapeTool: tool }));
          if (tool) setDrawingMode('shape');
        }}
        showGrid={canvasSettings.showGrid}
        onToggleGrid={handleToggleGrid}
        snapToGrid={canvasSettings.snapToGrid}
        onToggleSnap={handleToggleSnap}
        gridSize={canvasSettings.gridSize}
        onGridSizeChange={handleGridSizeChange}
        canvasWidth={canvasSettings.width}
        canvasHeight={canvasSettings.height}
        onCanvasSizeChange={handleCanvasSizeChange}
        zoom={canvasSettings.zoom}
        onZoomChange={handleZoomChange}
        onFitToWindow={handleFitToWindow}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        isSidebarVisible={isSidebarVisible}
        onToggleRulers={() => setShowRulers(!showRulers)}
        showRulers={showRulers}
        onOpenScaleSettings={() => setShowScaleSettings(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        isDrawing={drawingState.isDrawing}
        hasSelectedShape={!!drawingState.selectedShapeId}
        position="bottom"
      />

      {/* Properties Panel */}
      {showPropertiesPanel && (selectedShape || selectedConnection) && (
        <PropertiesPanel
          selectedShape={selectedShape || null}
          selectedConnection={selectedConnection}
          onShapeUpdate={handleShapeUpdate}
          onConnectionUpdate={handleConnectionUpdate}
          onShapeDelete={handleShapeDelete}
          onConnectionDelete={handleConnectionDelete}
          onShapeDuplicate={handleShapeDuplicate}
          onClose={() => {
            setShowPropertiesPanel(false);
            setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
            setSelectedConnectionId(null);
          }}
          isVisible={showPropertiesPanel}
        />
      )}

      {/* Door Properties Panel - Shows when a door is selected */}
      {selectedDoorPlacementId && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            right: 20,
            top: 100,
            width: 340,
            maxHeight: '70vh',
            overflow: 'auto',
            p: 3,
            zIndex: 1200,
            border: '2px solid',
            borderColor: 'primary.main',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" color="primary">
              🚪 Door Properties
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedDoorPlacementId(null)}
            >
              Close
            </Button>
          </Box>
          
          {(() => {
            const selectedDoor = doorPlacements.find(d => d.id === selectedDoorPlacementId);
            if (!selectedDoor) return null;

            const flowTypeColor = selectedDoor.flowType === 'material' 
              ? '#2196F3' 
              : selectedDoor.flowType === 'personnel' 
              ? '#4CAF50' 
              : '#F44336';

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Flow Type
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: 1,
                        bgcolor: flowTypeColor,
                      }}
                    />
                    <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                      {selectedDoor.flowType}
                    </Typography>
                  </Box>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Flow Direction
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {selectedDoor.flowDirection}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Door Width
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedDoor.width}px
                  </Typography>
                </Paper>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => {
                      // Open edit dialog
                      const sharedWall = sharedWalls.find(w => w.id === selectedDoor.sharedWallId);
                      if (sharedWall) {
                        setPendingDoorPlacement({
                          wallId: sharedWall.id,
                          position: selectedDoor.position,
                          normalizedPosition: selectedDoor.normalizedPosition,
                        });
                        setShowDoorConfigDialog(true);
                      }
                    }}
                  >
                    Edit Properties
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    onClick={handleDoorPlacementDelete}
                  >
                    Delete Door
                  </Button>
                </Box>
              </Box>
            );
          })()}
        </Paper>
      )}

      {/* Suggestion Sidebar - Shows Neo4j relationship-based suggestions */}
      {(() => {
        const assignedNodeName = (selectedShape as any)?.assignedNodeName || null;
        console.log('🎯 LayoutDesigner: Passing to SuggestionSidebar', {
          selectedShape: selectedShape?.id,
          assignedNodeName,
          isVisible: !!selectedShape,
          fullShape: selectedShape
        });
        return (
          <SuggestionSidebar
            selectedShapeId={drawingState.selectedShapeId}
            selectedShapeNeo4jNode={assignedNodeName}
            selectedShapeCleanroomClass={selectedShape?.cleanroomClass}
            onSuggestionClick={handleSuggestionClick}
            onAssignNode={(shapeId, nodeName, nodeId, cleanroomClass, color) => {
              console.log('🎯 LayoutDesigner: Assigning node to shape', {
                shapeId,
                nodeName,
                nodeId,
                cleanroomClass,
                color,
                updates: {
                  assignedNodeName: nodeName,
                  assignedNodeId: nodeId,
                  name: nodeName,
                  cleanroomClass
                }
              });

              const updates: Partial<ShapeProperties> = {
                assignedNodeName: nodeName,
                assignedNodeId: nodeId,
                name: nodeName // Also update the shape's display name
              };

              // Inherit cleanroom class and color from Neo4j functional area
              if (cleanroomClass) {
                updates.cleanroomClass = cleanroomClass as 'A' | 'B' | 'C' | 'D' | 'CNC';
                updates.fillColor = color || getCleanroomColor(cleanroomClass);
                console.log('✅ LayoutDesigner: Inherited cleanroom class from Neo4j:', cleanroomClass);
              }

              handleShapeUpdate(shapeId, updates);

              console.log('🎯 LayoutDesigner: Shape updated with cleanroom class, new shape:',
                shapes.find(s => s.id === shapeId)
              );
            }}
            isVisible={!!selectedShape}
          />
        );
      })()}

      {/* Door Connection Dialog (old 3-step system) */}
      <DoorConnectionDialog
        open={showDoorDialog}
        onClose={handleDoorDialogCancel}
        onConfirm={handleDoorDialogConfirm}
        fromShapeId={doorConnectionDrawing.firstShapeId || undefined}
        toShapeId={doorConnectionDrawing.secondShapeId || undefined}
      />

      {/* Door Placement Config Dialog (new Hypar-style) */}
      <DoorConnectionDialog
        open={showDoorConfigDialog}
        onClose={() => {
          setShowDoorConfigDialog(false);
          setPendingDoorPlacement(null);
        }}
        onConfirm={handleDoorConfigConfirm}
      />

      {/* Door Connection Edit Dialog */}
      <DoorConnectionEditDialog
        open={!!selectedDoorConnectionId}
        connection={doorConnections.find(c => c.id === selectedDoorConnectionId) || null}
        onClose={() => setSelectedDoorConnectionId(null)}
        onUpdate={handleDoorConnectionUpdate}
        onDelete={handleDoorConnectionDelete}
      />

      {/* Validation Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Wall Tool Panel */}
      {showWallTool && drawingMode === 'wall' && (
        <WallTool
          onClose={() => {
            setShowWallTool(false);
            setDrawingMode('select');
          }}
          onWallCreate={(wall) => {
            setWalls(prev => [...prev, wall]);
            console.log('✅ Wall created:', wall);
          }}
          pixelsPerFoot={unitConverter.getConfig().pixelsPerUnit}
        />
      )}

      {/* Scale Settings Dialog */}
      <ScaleSettings
        open={showScaleSettings}
        onClose={() => setShowScaleSettings(false)}
        onApply={(converter) => {
          setUnitConverter(converter);
          const config = converter.getConfig();
          console.log('✅ Scale updated:', config.unit, config.pixelsPerUnit);
          setSnackbarMessage(`Scale updated to ${config.unit} (${config.pixelsPerUnit.toFixed(1)} px/${config.abbreviation})`);
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }}
        currentConverter={unitConverter}
      />

      {/* Floating AI Chat Button */}
      <Tooltip title="AI Layout Assistant" placement="left">
        <Fab
          color="primary"
          aria-label="open ai chat"
          onClick={() => setIsChatOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            }
          }}
        >
          <ChatIcon />
        </Fab>
      </Tooltip>

      {/* AI Chat Panel */}
      <ChatPanel
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        isLoading={isChatLoading}
        onSendMessage={sendMessage}
        onClearHistory={clearHistory}
        onExecuteAction={handleChatAction}
      />
    </Box>
  );
};

export default LayoutDesigner;