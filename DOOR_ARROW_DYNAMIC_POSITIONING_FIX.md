# Door Arrow Dynamic Positioning Fix

## Problem

When users moved rooms in Layout Designer mode, the door connection arrows (which show flow direction between rooms) were not updating their positions. The arrows remained at their original positions even after the rooms were moved, causing a visual disconnect between the door arrows and the actual edge connection points.

### Root Cause

The door connection objects stored edge points (`edgeStartPoint` and `edgeEndPoint`) that were calculated when the door was created, but these points were **never recalculated** when shapes moved. This meant:

1. When a door connection was created, the shared edge points were correctly calculated
2. When shapes were moved (via drag, resize, or keyboard nudge), only the shape positions were updated
3. The door connections still referenced the old edge points, causing arrows to render at outdated positions

## Solution

The fix involves two main components:

### 1. New Utility Function (`doorConnectionUtils.ts`)

Created a new utility module with two key functions:

#### `findSharedEdge()`
- Recalculates the shared edge between two shapes based on their current positions
- Takes the two shapes and optionally their edge indices
- Returns the new edge start/end points and midpoint
- Handles both horizontal and vertical edge alignments
- Uses the same logic as the original door creation code for consistency

#### `updateDoorConnectionsEdgePoints()`
- Takes all door connections and current shape positions
- For each connection, finds the two shapes involved
- Recalculates the shared edge using the stored edge indices
- Updates the connection with new edge points and midpoint
- Returns the updated connections array

### 2. LayoutDesigner Updates

Modified [LayoutDesigner.tsx](frontend/src/components/LayoutDesigner/LayoutDesigner.tsx) to call `updateDoorConnectionsEdgePoints()` whenever shapes change position:

#### Integration Points:

1. **`handleShapeUpdate` (Line 476-491)**
   - Called when shape properties are updated via the properties panel
   - Now updates door connections after updating shapes

2. **`startShapeDrag` → `handleMouseUp` (Line 992-1006)**
   - Called when user finishes dragging a shape with the mouse
   - Updates door connections after the drag operation completes
   - Uses `shapesRef.current` to access the latest shape positions

3. **`startShapeResize` → `handleMouseUp` (Line 1195-1207)**
   - Called when user finishes resizing a shape
   - Updates door connections after resize completes
   - Ensures arrows stay centered even when room dimensions change

4. **Keyboard Arrow Nudging (Line 1239-1255)**
   - Called when user moves shapes using arrow keys
   - Updates door connections immediately after nudge
   - Works for both regular and shift-accelerated nudges

## Implementation Details

### Why Use Edge Indices?

The door connections store `edgeIndex` for both shapes. This is crucial because:
- A shape can have multiple edges (4 for rectangles, N for polygons)
- When shapes move, we need to recalculate the **same edge pair** that was originally connected
- Edge indices ensure we're always updating the correct edge, even if shapes rotate or multiple edges are close

### Performance Considerations

- Updates only happen **after** user interactions complete (mouse up, keyboard release)
- During dragging, shapes update every frame but door connections update only once at the end
- This prevents excessive recalculations while maintaining smooth interactions
- Uses React's state update mechanisms efficiently with `setDoorConnections(prevConnections => ...)`

### Backward Compatibility

- ✅ Existing door connections without `edgeStartPoint`/`edgeEndPoint` are handled gracefully (fallback in DoorConnectionRenderer)
- ✅ If shapes are deleted, connections are not updated (returns unchanged)
- ✅ If edge calculation fails, connection remains unchanged rather than breaking

## Files Modified

1. **`/frontend/src/utils/doorConnectionUtils.ts`** (NEW)
   - Utility functions for door connection edge calculations
   - Extracted shared logic from LayoutDesigner

2. **`/frontend/src/components/LayoutDesigner/LayoutDesigner.tsx`**
   - Added import for `updateDoorConnectionsEdgePoints`
   - Updated 4 locations where shapes change to also update door connections
   - Line 24: Import statement
   - Line 484-487: `handleShapeUpdate`
   - Line 1000-1003: Drag `handleMouseUp`
   - Line 1201-1204: Resize `handleMouseUp`
   - Line 1249-1252: Keyboard nudge

## Testing

### Manual Test Scenario

1. **Create two adjacent rooms** (e.g., Weighing Area and Granulation)
2. **Add a door connection** between them with a unidirectional arrow
3. **Move one room** by dragging it to a new position
4. **Verify**: The arrow should now be centered on the new connecting edge
5. **Move the other room**
6. **Verify**: The arrow updates to stay centered between both rooms

### Expected Behavior

- ✅ Arrow always stays at the midpoint of the shared edge
- ✅ Arrow direction (perpendicular to edge) updates correctly
- ✅ Works with drag, resize, and keyboard nudging
- ✅ Works with both bidirectional and unidirectional arrows
- ✅ Multiple door connections between different shapes all update correctly

## Architecture Benefits

### Separation of Concerns
- Edge calculation logic is now in a dedicated utility module
- LayoutDesigner doesn't need to duplicate the `findSharedEdge` logic
- Makes the code more maintainable and testable

### Consistency
- Uses the **exact same algorithm** for both creation and updates
- Eliminates potential bugs from having two different implementations
- Edge indices ensure we're always working with the correct edge pair

### Future Enhancements Made Easy
- Adding real-time updates during drag (just move call from mouseUp to mouseMove)
- Implementing door connection constraints based on edge positions
- Adding visual feedback for edge alignment during door creation

## Known Limitations

1. **No Real-Time Updates During Drag**: Currently updates only happen when drag/resize completes. This is intentional for performance but could be changed if needed.

2. **Assumes Edge Indices Remain Valid**: If shape type changes (e.g., rectangle → polygon), edge indices might not map correctly. Currently, this scenario is rare as shapes don't change types after creation.

## Future Improvements

1. **Optimize for Multiple Shapes**: If user moves multiple shapes at once, could batch the edge point updates
2. **Animation**: Add smooth transition when arrow position updates
3. **Visual Feedback**: Show edge highlight during drag to preview where arrow will end up
4. **Edge Snapping**: Auto-align edges when close to each other during drag

## Summary

This fix ensures that door connection arrows **always stay centered on the connecting edge** between two rooms, regardless of how the rooms are moved or resized. The implementation is:

- ✅ **Correct**: Uses the same edge calculation logic as door creation
- ✅ **Complete**: Handles all shape movement methods (drag, resize, keyboard)
- ✅ **Performant**: Updates only when needed, not on every frame
- ✅ **Maintainable**: Extracted into reusable utility functions
- ✅ **Backward Compatible**: Works with existing door connections

Users can now confidently move rooms around in their facility designs, knowing that the door arrows will always accurately represent the connections between spaces.
