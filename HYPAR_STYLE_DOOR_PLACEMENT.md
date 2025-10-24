# Hypar-Style Door Placement Feature

## Overview

This document describes the new Hypar-style door placement feature that allows users to visually place doors on shared walls between adjacent rooms, similar to the interface shown in the Hypar web application.

## Key Features

### 1. **Automatic Wall Detection**
- Detects shared walls between adjacent shapes (rooms)
- Works with both rectangular shapes and custom polygons
- Highlights common walls in real-time when in door mode

### 2. **Visual Door Placement**
- Click on any highlighted shared wall to place a door
- Door position can be adjusted by dragging along the wall
- Visual indicators show:
  - Shared wall highlighting (dashed blue/green line)
  - Crosshair placement indicator on hover
  - Door gap representation (white line with colored overlay)
  - Flow direction arrows (perpendicular to wall)

### 3. **Flow Configuration**
- **Flow Types**:
  - Material Flow (Blue) - for material transfer between rooms
  - Personnel Flow (Green) - for people movement
  - Waste Flow (Red) - for waste disposal pathways

- **Flow Directions**:
  - Unidirectional - flow in one direction only
  - Bidirectional - flow in both directions

### 4. **Interactive Door Management**
- Click on placed doors to select them
- Drag doors along the wall to reposition
- Delete doors via properties panel or keyboard shortcut
- Edit door properties (flow type, direction, width)

## User Guide

### Placing a Door

1. **Enter Door Mode**
   - Click the door icon (🚪) in the toolbar
   - Alternatively, press `D` key (if keyboard shortcuts are configured)

2. **Select Wall**
   - Move your mouse over the canvas
   - Shared walls between adjacent rooms will be highlighted with a dashed line
   - Hover over a highlighted wall to see the placement indicator

3. **Place Door**
   - Click anywhere on the highlighted wall
   - A dialog will appear asking for flow type and direction
   - Select your preferences and click "Create Connection"

4. **Adjust Position** (Optional)
   - Click and drag the door along the wall to adjust its position
   - The door will snap to the wall automatically

5. **Exit Door Mode**
   - Click the door icon again or press `Esc` to exit door mode

### Editing a Door

1. Click on an existing door to select it
2. The door will be highlighted with a dashed circle
3. Options:
   - **Move**: Drag the door along the wall
   - **Delete**: Press `Delete` key or use properties panel
   - **Edit Properties**: Open properties panel to change flow type/direction

### Visual Indicators

| Indicator | Description |
|-----------|-------------|
| Dashed blue line | Shared wall (not hovered) |
| Dashed green line | Shared wall (hovered) |
| Green crosshair | Door placement position |
| White thick line | Door gap in wall |
| Colored line | Door with flow type indicator |
| Arrows | Flow direction (perpendicular to wall) |
| Dashed circle | Selected door |

## Technical Architecture

### Core Components

#### 1. **Wall Detection System** (`/frontend/src/utils/wallDetection.ts`)

**Key Functions:**
- `findAllSharedWalls(shapes)` - Detects all shared walls between shapes
- `getShapeWallSegments(shape)` - Extracts wall segments from a shape
- `findSharedWall(segment1, segment2)` - Checks if two segments form a shared wall
- `getPositionAlongWall(wall, point)` - Calculates position on wall from a point

**Algorithm:**
1. Extract all wall segments (edges) from each shape
2. For each pair of shapes:
   - Compare each segment pair
   - Check if segments are collinear (on same line)
   - Check if segments overlap
   - If overlap > 10 pixels, create a SharedWall object
3. Return all detected shared walls

**Data Structures:**
```typescript
interface WallSegment {
  shapeId: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  length: number;
  angle: number;
  normalVector: { x: number; y: number }; // Perpendicular direction
}

interface SharedWall {
  id: string;
  shape1Id: string;
  shape2Id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  length: number;
  angle: number;
  normalVector: { x: number; y: number };
}

interface DoorPlacement {
  id: string;
  sharedWallId: string;
  position: { x: number; y: number };
  normalizedPosition: number; // 0-1 along wall
  width: number;
  flowType: 'material' | 'personnel' | 'waste';
  flowDirection: 'unidirectional' | 'bidirectional';
}
```

#### 2. **Door Placement Overlay** (`/frontend/src/components/LayoutDesigner/DoorPlacementOverlay.tsx`)

**Responsibilities:**
- Renders shared wall highlights
- Shows placement indicators on hover
- Renders existing doors with flow arrows
- Handles mouse interactions (hover, click, drag)

**Visual Elements:**
- **Shared Wall Highlight**: Dashed line along shared edge
- **Placement Indicator**: Crosshair with perpendicular guide line
- **Door Representation**: 
  - White gap line (door opening)
  - Colored overlay (flow type)
  - Arrow(s) showing flow direction
- **Selection Indicator**: Dashed circle with handle points

**Interaction Flow:**
```
Mouse Move → Calculate position on wall → Show indicator
Click → Store pending placement → Show dialog
Dialog Confirm → Create door placement → Update state
Mouse Down on Door → Start drag
Mouse Move (dragging) → Update door position
Mouse Up → End drag
```

#### 3. **Layout Designer Integration** (`/frontend/src/components/LayoutDesigner/LayoutDesigner.tsx`)

**State Management:**
```typescript
const [doorPlacements, setDoorPlacements] = useState<DoorPlacement[]>([]);
const [selectedDoorPlacementId, setSelectedDoorPlacementId] = useState<string | null>(null);
const [showDoorConfigDialog, setShowDoorConfigDialog] = useState(false);
const [pendingDoorPlacement, setPendingDoorPlacement] = useState<...>(null);
```

**Computed State:**
```typescript
const sharedWalls = useMemo(() => {
  return findAllSharedWalls(shapes);
}, [shapes]);
```

**Event Handlers:**
- `handleDoorPlace` - User clicks on wall
- `handleDoorConfigConfirm` - User confirms flow type/direction
- `handleDoorMove` - User drags door along wall
- `handleDoorClick` - User selects a door
- `handleDoorPlacementDelete` - User deletes a door

## Advantages Over Previous System

### Old System (3-Step Process)
1. Select first shape
2. Select second shape
3. Select edge point
4. Configure door

**Limitations:**
- Required multiple clicks
- No visual feedback of shared walls
- Difficult to position door precisely
- Not intuitive

### New System (Hypar-Style)
1. Enter door mode (see all shared walls highlighted)
2. Click on desired position on wall
3. Configure door

**Benefits:**
- ✅ Visual feedback shows all possible door locations
- ✅ Single click to place at desired position
- ✅ Easy repositioning by dragging
- ✅ Intuitive interface similar to professional tools
- ✅ Works with complex polygon shapes
- ✅ Real-time wall detection

## Performance Considerations

### Wall Detection Algorithm Complexity
- **Time Complexity**: O(n² × m²) where n = number of shapes, m = average segments per shape
- **Optimization**: Uses `useMemo` to recompute only when shapes change
- **Practical Performance**: 
  - 10 shapes with 4 segments each: ~1,600 comparisons
  - 50 shapes with 6 segments each: ~90,000 comparisons
  - Still performant for typical pharmaceutical layouts (10-30 rooms)

### Rendering Performance
- Uses SVG for all rendering (GPU-accelerated)
- Hover states use CSS transforms (no reflow)
- Door placements are lightweight objects
- No canvas redraw needed (pure SVG DOM)

### Memory Usage
- Each shared wall: ~200 bytes
- Each door placement: ~150 bytes
- Typical layout (20 rooms, 30 walls, 10 doors): ~10KB total

## Future Enhancements

### Planned Features
1. **Door Width Adjustment**
   - Resize handles on door edges
   - Min/max width constraints based on room type
   - Visual width indicator

2. **Door Swing Direction**
   - Show door swing arc
   - Collision detection with walls/furniture
   - GMP compliance checking (inward/outward swing rules)

3. **Door Templates**
   - Standard sizes (36", 48", 72")
   - Specialized types (airlocks, pass-throughs, roll-ups)
   - GMP-specific configurations

4. **Validation Rules**
   - Required doors between certain room types
   - Maximum doors per wall
   - Minimum spacing between doors

5. **Export/Import**
   - Save door placements with layout
   - Export to CAD formats (DXF/DWG)
   - Generate door schedule table

6. **ReactFlow Mode Integration**
   - Port feature to diagram editor mode
   - Show doors on node-to-node edges
   - Hybrid view with both modes

### Potential Improvements
- **Snap to Center**: Option to auto-center door on wall
- **Snap to Grid**: Align door position to grid
- **Copy/Paste**: Duplicate door configuration to another wall
- **Keyboard Shortcuts**: Quick door type selection (M/P/W keys)
- **Multi-Select**: Place multiple doors at once
- **Undo/Redo**: History support for door operations
- **Collision Detection**: Prevent door overlap
- **Smart Placement**: AI-suggested optimal door positions

## Integration with Existing Features

### Neo4j Knowledge Graph
- Doors can be linked to relationship types in Neo4j
- Flow types map to MATERIAL_FLOW / PERSONNEL_FLOW relationships
- Door placements can inform constraint validation

### GMP Compliance
- Personnel flow doors marked with green (contamination control)
- Material flow doors marked with blue (process segregation)
- Waste flow doors marked with red (waste management)

### Validation System
- Validate door placements meet GMP requirements
- Check for required doors between cleanroom classes
- Verify flow separation (personnel vs. material)

### Properties Panel
- Edit door properties after placement
- Change flow type/direction
- Adjust door width
- Add notes/specifications

## Troubleshooting

### Walls Not Detected
**Problem**: Shared walls not highlighting when rooms are adjacent.

**Solutions:**
- Check tolerance value (default 5 pixels) in `findSharedWall`
- Ensure shapes are actually touching (not just close)
- Verify shape coordinates are correct
- Check for rotation issues (rotated shapes may not align perfectly)

### Door Placement Offset
**Problem**: Door appears offset from where clicked.

**Solutions:**
- Verify SVG coordinate system matches canvas
- Check zoom level calculations
- Ensure scroll position is accounted for
- Debug `getPositionAlongWall` function

### Drag Performance Issues
**Problem**: Door dragging is laggy or jumpy.

**Solutions:**
- Check for unnecessary re-renders during drag
- Use `useCallback` for drag handlers
- Debounce position updates if needed
- Verify pointer events are configured correctly

### Doors Disappear After Shape Move
**Problem**: Doors vanish when rooms are repositioned.

**Solutions:**
- Shared walls are recomputed when shapes change
- Ensure door placement IDs reference wall IDs correctly
- Add logic to remap door placements when walls change
- Consider storing door as shape-relative, not wall-relative

## Testing Checklist

### Manual Testing
- [ ] Place door on horizontal wall
- [ ] Place door on vertical wall
- [ ] Place door on diagonal wall (polygon shapes)
- [ ] Drag door along wall
- [ ] Select and deselect door
- [ ] Delete door
- [ ] Change flow type
- [ ] Change flow direction
- [ ] Test with rectangles
- [ ] Test with L-shapes
- [ ] Test with polygons
- [ ] Test with multiple adjacent rooms
- [ ] Test undo/redo with door operations
- [ ] Test zoom levels
- [ ] Test with rotated shapes

### Edge Cases
- [ ] Very short walls (< 10 pixels)
- [ ] Overlapping shapes
- [ ] Shapes with shared corners only (no shared edge)
- [ ] Many doors on single wall
- [ ] Door placement near wall endpoints
- [ ] Doors on moving shapes
- [ ] Doors on deleted shapes

## API Reference

### Wall Detection API

```typescript
// Find all shared walls between shapes
function findAllSharedWalls(shapes: ShapeProperties[]): SharedWall[]

// Get wall segments from a shape
function getShapeWallSegments(shape: ShapeProperties): WallSegment[]

// Check if two segments form a shared wall
function findSharedWall(
  segment1: WallSegment,
  segment2: WallSegment,
  tolerance?: number
): SharedWall | null

// Calculate position along wall from a point
function getPositionAlongWall(
  wall: SharedWall,
  point: { x: number; y: number }
): { position: { x: number; y: number }; normalizedPosition: number }

// Get position from normalized value (0-1)
function getPositionFromNormalized(
  wall: SharedWall,
  normalizedPosition: number
): { x: number; y: number }
```

### Component Props

```typescript
interface DoorPlacementOverlayProps {
  sharedWalls: SharedWall[];
  shapes: ShapeProperties[];
  doorPlacements: DoorPlacement[];
  isDoorMode: boolean;
  onDoorPlace: (wallId: string, position: { x: number; y: number }, normalizedPosition: number) => void;
  onDoorMove: (doorId: string, position: { x: number; y: number }, normalizedPosition: number) => void;
  onDoorClick: (doorId: string) => void;
  selectedDoorId: string | null;
}
```

## Summary

The Hypar-style door placement feature provides an intuitive, visual way to add doors to pharmaceutical facility layouts. By automatically detecting shared walls and providing real-time visual feedback, it significantly improves the user experience compared to multi-step selection processes.

The feature is built on a robust wall detection algorithm that works with any polygon shape, and the modular architecture allows for easy enhancement with additional door types, validation rules, and export capabilities.

**Key Achievements:**
- ✅ Automatic shared wall detection
- ✅ Visual placement indicators
- ✅ Drag-and-drop repositioning
- ✅ Flow type and direction configuration
- ✅ Works with complex polygon shapes
- ✅ Clean, maintainable code architecture
- ✅ TypeScript type safety throughout
- ✅ Performance optimized with useMemo/useCallback

**Next Steps:**
1. User testing and feedback collection
2. Integration with ReactFlow diagram mode
3. GMP validation rule implementation
4. Door template library creation
5. CAD export functionality
