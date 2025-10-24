# Door Placement Fixes - Summary

## Issues Fixed

### 1. ✅ Door Positioning Not Working
**Problem**: Users could not drag doors along the wall to reposition them.

**Root Cause**: 
- Door drag events were not properly tracking which wall the door was on
- Mouse move events were only tracked over the specific wall element
- No global mouse tracking during drag operation

**Solution**:
- Added `draggingWallId` state to track which wall a door belongs to during drag
- Implemented `handleGlobalMouseMove` that tracks mouse position globally during drag
- Updated `handleDoorMouseDown` to accept and store the wall ID
- Added proper event listeners for global `mousemove` during drag operation

**Code Changes**:
```typescript
// Added wall ID tracking
const [draggingWallId, setDraggingWallId] = useState<string | null>(null);

// Pass wall ID when starting drag
const handleDoorMouseDown = useCallback((doorId: string, wallId: string, event: React.MouseEvent) => {
  setDraggingDoorId(doorId);
  setDraggingWallId(wallId);
}, []);

// Global mouse move handler
const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
  if (!draggingDoorId || !draggingWallId) return;
  const wall = sharedWalls.find(w => w.id === draggingWallId);
  // Calculate position and update door
}, [draggingDoorId, draggingWallId, sharedWalls, onDoorMove]);
```

### 2. ✅ Door Not Clickable When Not in Door Mode
**Problem**: Doors were only interactive when in door mode, making it impossible to select/edit them in normal mode.

**Root Cause**:
- SVG overlay had `pointerEvents: drawingMode === 'door' ? 'all' : 'none'`
- This disabled all mouse events on doors when not in door mode

**Solution**:
- Changed SVG overlay to `pointerEvents: 'none'` at root level
- Added `pointerEvents: 'all'` to individual door elements
- Doors now always respond to clicks regardless of mode

**Code Changes**:
```typescript
// LayoutDesigner.tsx - SVG overlay
<svg style={{ pointerEvents: 'none' }}>  // Root doesn't block
  <DoorPlacementOverlay ... />
</svg>

// DoorPlacementOverlay.tsx - Door groups
<g style={{ 
  cursor: 'pointer',
  pointerEvents: 'all'  // Doors always interactive
}}>
```

### 3. ✅ Door Click Area Too Small
**Problem**: Users had to click precisely on the thin door line to interact with it.

**Solution**:
- Added invisible hit area with 30px stroke width
- Changed cursor from 'grab' to 'pointer' for better UX
- Added proper cursor change during drag ('grabbing')

**Code Changes**:
```typescript
{/* Invisible hit area for easier interaction */}
<line
  stroke="transparent"
  strokeWidth={30}  // Large hit area
  style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
/>
```

### 4. ✅ Door Property Editing
**Problem**: No way to edit door properties after placement.

**Solution**:
- Created door properties panel that appears when a door is selected
- Added "Edit Properties" button to reopen configuration dialog
- Modified `handleDoorConfigConfirm` to support both create and update modes
- Shows current door properties (flow type, direction, width)
- Provides delete functionality

**Code Changes**:
```typescript
// Door Properties Panel
{selectedDoorPlacementId && (
  <Paper sx={{ position: 'fixed', right: 20, ... }}>
    <Typography>Door Properties</Typography>
    <Typography>Flow Type: {flowType}</Typography>
    <Button onClick={editDoor}>Edit Properties</Button>
    <Button onClick={deleteDoor}>Delete Door</Button>
  </Paper>
)}

// Updated handler to support editing
const handleDoorConfigConfirm = useCallback((flowType, flowDirection) => {
  if (selectedDoorPlacementId) {
    // Update existing door
    setDoorPlacements(prev => prev.map(door =>
      door.id === selectedDoorPlacementId
        ? { ...door, flowType, flowDirection }
        : door
    ));
  } else {
    // Create new door
    setDoorPlacements(prev => [...prev, newDoor]);
  }
}, [selectedDoorPlacementId]);
```

## Updated User Workflow

### Placing a Door
1. Click Door icon in toolbar
2. Hover over shared wall (highlighted in blue/green)
3. Click desired position on wall
4. Select flow type and direction in dialog
5. Click "Create Connection"

### Moving a Door
1. Click on door to select it (shows selection indicator)
2. Click and drag door along the wall
3. Release to set new position
4. **Works in any mode, not just door mode**

### Editing a Door
1. Click on door to select it
2. Door properties panel appears on the right
3. Click "Edit Properties" to change flow type/direction
4. Or click "Delete Door" to remove it

### Visual Feedback
- **Blue dashed line**: Shared wall (normal)
- **Green dashed line**: Shared wall (hover)
- **Green crosshair**: Placement position
- **White + colored line**: Door with flow indicator
- **Arrows perpendicular to wall**: Flow direction
- **Dashed circle + handles**: Selected door
- **Pointer cursor**: Door is clickable
- **Grabbing cursor**: Door is being dragged

## Technical Implementation Details

### Component Structure
```
LayoutDesigner
├── DoorPlacementOverlay (SVG overlay)
│   ├── Shared wall highlights (only in door mode)
│   ├── Placement indicators (hover)
│   └── Door placements (always visible)
└── Door Properties Panel (when door selected)
```

### State Management
```typescript
// Door placement state
const [doorPlacements, setDoorPlacements] = useState<DoorPlacement[]>([]);
const [selectedDoorPlacementId, setSelectedDoorPlacementId] = useState<string | null>(null);
const [draggingDoorId, setDraggingDoorId] = useState<string | null>(null);
const [draggingWallId, setDraggingWallId] = useState<string | null>(null);

// Computed shared walls
const sharedWalls = useMemo(() => findAllSharedWalls(shapes), [shapes]);
```

### Event Flow
```
Door Click → onDoorClick → setSelectedDoorPlacementId → Properties Panel Opens
Door Mouse Down → handleDoorMouseDown → Start Drag
Global Mouse Move → handleGlobalMouseMove → Update Position
Mouse Up → handleMouseUp → End Drag
Edit Button → Open Config Dialog → handleDoorConfigConfirm (update mode)
Delete Button → handleDoorPlacementDelete → Remove from array
```

## Files Modified

1. **`/frontend/src/components/LayoutDesigner/DoorPlacementOverlay.tsx`**
   - Added `draggingWallId` state
   - Implemented `handleGlobalMouseMove`
   - Updated `handleDoorMouseDown` to accept wall ID
   - Added large invisible hit areas
   - Added `pointerEvents: 'all'` to door groups
   - Changed cursor styles

2. **`/frontend/src/components/LayoutDesigner/LayoutDesigner.tsx`**
   - Changed SVG overlay to `pointerEvents: 'none'`
   - Added door properties panel
   - Updated `handleDoorConfigConfirm` to support editing
   - Added edit functionality in properties panel

## Testing Performed

✅ Door placement on horizontal walls
✅ Door placement on vertical walls
✅ Door dragging along wall
✅ Door selection with click
✅ Door properties panel display
✅ Door property editing
✅ Door deletion
✅ Door interaction in normal mode (not just door mode)
✅ Build compilation
✅ TypeScript type checking

## Known Limitations

1. **Door Width Adjustment**: Currently fixed at 40px, no resize handles yet
2. **Door on Diagonal Walls**: Works but may need visual refinement for angled polygons
3. **Multiple Doors on Same Wall**: No collision detection yet
4. **Undo/Redo**: Door operations don't integrate with history system yet
5. **Persistence**: Door placements not saved with layout data yet (need to add to `LayoutData` interface)

## Next Steps

### Immediate Improvements
- [ ] Add door placements to layout save/load
- [ ] Integrate with undo/redo system
- [ ] Add keyboard shortcuts (Delete key to remove selected door)
- [ ] Add door width adjustment with slider in properties panel

### Future Enhancements
- [ ] Door swing direction indicator
- [ ] Door collision detection
- [ ] Door templates library
- [ ] GMP validation for required doors
- [ ] Export door schedule table
- [ ] Integration with ReactFlow diagram mode

## Summary

The door placement feature is now fully functional with:
- ✅ Smooth dragging along walls
- ✅ Click-to-select in any mode
- ✅ Easy property editing
- ✅ Visual feedback throughout
- ✅ Intuitive user experience matching Hypar's approach

Users can now place, move, edit, and delete doors with an intuitive point-and-click interface!
