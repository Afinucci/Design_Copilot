# Door Selection Fix - Complete

## Problem
Users could not click on doors to select them and open the properties panel for editing.

## Root Cause
The click event was being blocked by the drag detection logic. The component was treating every mouse down as the start of a drag operation, which prevented the click event from firing.

## Solution Implemented

### 1. Drag vs Click Detection
Added proper distinction between dragging and clicking by:

**State Added:**
```typescript
const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
const [hasDragged, setHasDragged] = useState(false);
```

**Logic:**
- Record mouse position on mouse down
- Track if mouse has moved more than 5 pixels (drag threshold)
- Only set `hasDragged = true` if movement exceeds threshold
- Click handler only fires if `!hasDragged`

### 2. Enhanced Click Handler
```typescript
onMouseDown={(e) => handleDoorMouseDown(door.id, sharedWall.id, e)}
onClick={(e) => {
  e.stopPropagation();
  // Only trigger click if we didn't drag (or barely moved)
  if (!hasDragged) {
    onDoorClick(door.id);
  }
}}
```

### 3. Improved Properties Panel

**Enhanced Visual Design:**
- Elevated Paper component with border
- Color-coded flow type indicator box
- Organized sections for each property
- Better typography and spacing
- Full-width buttons

**Features:**
- Shows current door properties
- Edit Properties button (opens config dialog)
- Delete Door button
- Auto-closes when door is deselected
- Deselects shapes when door is selected (prevents conflicting panels)

## Code Changes

### DoorPlacementOverlay.tsx

**Added drag tracking:**
```typescript
// On mouse down - record start position
setDragStartPos({ x: event.clientX, y: event.clientY });
setHasDragged(false);

// On mouse move - check if moved enough to be a drag
const deltaX = Math.abs(event.clientX - dragStartPos.x);
const deltaY = Math.abs(event.clientY - dragStartPos.y);

if (deltaX > 5 || deltaY > 5) {
  setHasDragged(true);
} else {
  return; // Don't update position for small movements
}

// On click - only fire if not dragged
if (!hasDragged) {
  onDoorClick(door.id);
}
```

### LayoutDesigner.tsx

**Updated click handler:**
```typescript
const handleDoorClick = useCallback((doorId: string) => {
  console.log('🚪 Door clicked:', doorId);
  setSelectedDoorPlacementId(doorId);
  // Deselect any selected shape to avoid conflicting panels
  setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
  setShowPropertiesPanel(false);
}, []);
```

**Enhanced properties panel:**
```typescript
{selectedDoorPlacementId && (
  <Paper elevation={8} sx={{ /* prominent positioning */ }}>
    <Typography variant="h6" color="primary">
      🚪 Door Properties
    </Typography>
    
    {/* Color-coded flow type display */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ bgcolor: flowTypeColor, ... }} />
      <Typography>{flowType}</Typography>
    </Box>
    
    {/* Action buttons */}
    <Button fullWidth onClick={editDoor}>Edit Properties</Button>
    <Button fullWidth onClick={deleteDoor}>Delete Door</Button>
  </Paper>
)}
```

## User Workflow Now

### Selecting a Door
1. **Click on any door** (the door line or hit area)
2. Console shows: `🚪 Door clicked: door-xxx-xxx`
3. **Properties panel appears** on the right side
4. Door shows selection indicator (dashed circle)

### Editing a Door
1. Click on door to select it
2. Properties panel shows current settings
3. Click **"Edit Properties"** button
4. Dialog opens with current flow type and direction
5. Make changes and click "Create Connection"
6. Door updates immediately

### Deleting a Door
1. Click on door to select it
2. Click **"Delete Door"** button in properties panel
3. Door is removed

### Moving a Door (Still Works)
1. Click and hold on door
2. Drag along wall (movement > 5px triggers drag mode)
3. Release to set new position
4. If you barely moved the mouse (< 5px), it's treated as a click instead

## Visual Improvements

### Properties Panel Styling
- **Position**: Fixed at `top: 100px, right: 20px`
- **Size**: `340px` wide with `70vh` max height
- **Elevation**: `8` with blue border
- **Sections**: Each property in its own outlined Paper
- **Flow Type**: Shows colored box matching door color
- **Buttons**: Full-width, primary (Edit) and error (Delete)

### Door Selection Feedback
- Dashed circle around selected door
- Handle points visible
- Properties panel opens immediately
- Console log for debugging

## Testing Results

✅ **Click Detection**: Doors respond to clicks immediately
✅ **Drag Detection**: Dragging still works smoothly (5px threshold)
✅ **Properties Panel**: Opens and displays correctly
✅ **Edit Functionality**: Can modify door properties
✅ **Delete Functionality**: Can remove doors
✅ **Deselection**: Clicking elsewhere closes panel
✅ **No Conflicts**: Shape and door panels don't overlap

## Technical Details

### Drag Threshold
- **5 pixels**: Sweet spot between sensitivity and accidental drags
- Prevents jitter from mouse shakiness
- Allows precise clicking without triggering drag

### Event Flow
```
Mouse Down → Record position, reset hasDragged
  ↓
Mouse Move (if >5px) → Set hasDragged = true, update position
  ↓
Mouse Up → Reset drag state
  ↓
Click → Check hasDragged, fire onDoorClick if false
  ↓
Properties Panel → Opens, displays door info
```

### State Management
```typescript
// Door selection state
selectedDoorPlacementId: string | null

// Drag tracking state
draggingDoorId: string | null
draggingWallId: string | null
dragStartPos: { x, y } | null
hasDragged: boolean
```

## Known Issues (None!)
All functionality working as expected.

## Future Enhancements

1. **Keyboard Shortcut**: Press `E` to edit selected door
2. **Double-Click to Edit**: Skip properties panel, go straight to dialog
3. **Multi-Select**: Select multiple doors at once
4. **Copy/Paste**: Duplicate door configuration
5. **Context Menu**: Right-click door for options

## Summary

The door selection issue has been **completely fixed**. Users can now:

✅ Click on doors to select them
✅ See properties panel immediately
✅ Edit door properties easily
✅ Delete doors with one click
✅ Still drag doors along walls smoothly

The implementation uses a **5-pixel drag threshold** to properly distinguish between clicks and drags, ensuring both interactions work perfectly without interfering with each other.

**Status**: ✅ **COMPLETE AND TESTED**
