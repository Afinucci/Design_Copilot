# Door Position Fix - Multiple Connections Issue

## Problem Description

When a single room (e.g., "Weighing Area") had multiple door connections to different rooms (e.g., "Packaging" and "Coating"), all door arrows were appearing on the same edge, even though the actual connections were on different edges.

### Visual Example of the Bug:

```
Before Fix:
┌─────────────┐
│  Weighing   │ ← Both arrows here!
│   Area      │ ⇄ ⇄
└─────────────┘
     │     │
     │     └──────┐
     │            │
┌────▼────┐  ┌───▼──────┐
│Packaging│  │  Coating │
└─────────┘  └──────────┘

After Fix:
┌─────────────┐
│  Weighing   │ ⇄ (to Packaging)
│   Area      │
└─────────────┘
     │ 
     │ ⇄ (to Coating)
     │
┌────▼────┐  ┌───▼──────┐
│Packaging│  │  Coating │
└─────────┘  └──────────┘
```

## Root Cause

The `DoorConnectionRenderer` was using `connection.fromShape.x` and `connection.toShape.x` to calculate the door arrow position. These values represented generic connection points, not the actual shared edge between the specific rooms.

### Problematic Code:
```typescript
// OLD CODE (WRONG)
const edgeMidX = (from.x + to.x) / 2;
const edgeMidY = (from.y + to.y) / 2;
```

This calculated the midpoint between two stored points, which didn't distinguish between different edges of the same shape.

## Solution

The `DoorConnection` interface already contains `edgeStartPoint` and `edgeEndPoint` properties that define the actual shared edge between two shapes. The fix prioritizes these edge points when calculating the door position.

### Fixed Code:
```typescript
// NEW CODE (CORRECT)
let edgeMidX, edgeMidY, edgeAngle;

if (connection.edgeStartPoint && connection.edgeEndPoint) {
  // Calculate midpoint of the actual shared edge
  edgeMidX = (connection.edgeStartPoint.x + connection.edgeEndPoint.x) / 2;
  edgeMidY = (connection.edgeStartPoint.y + connection.edgeEndPoint.y) / 2;
  
  // Calculate angle of the shared edge
  const dx = connection.edgeEndPoint.x - connection.edgeStartPoint.x;
  const dy = connection.edgeEndPoint.y - connection.edgeStartPoint.y;
  edgeAngle = Math.atan2(dy, dx);
} else {
  // Fallback: use stored connection points (old behavior)
  edgeMidX = (from.x + to.x) / 2;
  edgeMidY = (from.y + to.y) / 2;
  
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  edgeAngle = Math.atan2(dy, dx);
}
```

## How It Works

### DoorConnection Data Structure:
```typescript
interface DoorConnection {
  fromShape: DoorConnectionPoint;  // Generic connection point
  toShape: DoorConnectionPoint;    // Generic connection point
  edgeStartPoint?: { x, y };       // Start of ACTUAL shared edge
  edgeEndPoint?: { x, y };         // End of ACTUAL shared edge
  // ... other properties
}
```

### Example Data:

**Connection 1: Weighing Area ↔ Packaging**
```typescript
{
  fromShape: { shapeId: 'weighing', x: 650, y: 350 },
  toShape: { shapeId: 'packaging', x: 850, y: 350 },
  edgeStartPoint: { x: 827, y: 273 },  // Top-right edge of Weighing
  edgeEndPoint: { x: 827, y: 420 },    // Bottom-right edge of Weighing
}
```

**Connection 2: Weighing Area ↔ Coating**
```typescript
{
  fromShape: { shapeId: 'weighing', x: 650, y: 450 },
  toShape: { shapeId: 'coating', x: 590, y: 520 },
  edgeStartPoint: { x: 509, y: 421 },  // Bottom-left edge of Weighing
  edgeEndPoint: { x: 676, y: 421 },    // Bottom-right edge of Weighing
}
```

### Calculation:

**Old Method (Wrong):**
- Both connections would use generic midpoints
- Resulted in same position for different connections

**New Method (Correct):**
- Connection 1 midpoint: `((827+827)/2, (273+420)/2)` = `(827, 346.5)` → Right edge
- Connection 2 midpoint: `((509+676)/2, (421+421)/2)` = `(592.5, 421)` → Bottom edge

Each connection now appears on its correct edge!

## Files Modified

**`/frontend/src/components/DoorConnectionRenderer.tsx`**
- Updated door position calculation to use `edgeStartPoint` and `edgeEndPoint`
- Maintained backward compatibility with fallback to old method

## Testing

### Test Scenario 1: Multiple Connections from One Room
✅ Create room A
✅ Create rooms B and C adjacent to different sides of A
✅ Add door from A to B
✅ Add door from A to C
✅ Verify doors appear on correct edges

### Test Scenario 2: Backward Compatibility
✅ Existing doors without edgeStartPoint/edgeEndPoint still work
✅ Falls back to old calculation method

### Test Scenario 3: All Edge Types
✅ Top edge connections
✅ Right edge connections
✅ Bottom edge connections
✅ Left edge connections

## Benefits

1. ✅ **Correct Positioning**: Each door appears on its actual shared edge
2. ✅ **Multiple Connections**: Supports unlimited connections from single room
3. ✅ **Clear Visual**: No overlapping arrows on wrong edges
4. ✅ **Backward Compatible**: Old connections still work
5. ✅ **Accurate Angles**: Arrow direction matches actual edge orientation

## Impact

This fix resolves the major issue where multiple door connections from the same room were all rendered on the same edge. Now each connection correctly appears on its respective shared edge between the two rooms.

### Before vs After:

**Before:**
- Confusing: All doors on same edge
- Incorrect: Doesn't match actual layout
- Overlapping: Multiple arrows in same spot

**After:**
- Clear: Each door on correct edge
- Accurate: Matches actual shared walls
- Separated: Each connection distinct

## Related Issues

This fix also improves:
- Arrow angle accuracy (now based on actual edge)
- Click detection (each door has unique position)
- Visual clarity in complex layouts
- GMP compliance documentation accuracy

## Summary

The fix ensures that door connections use the actual shared edge geometry (`edgeStartPoint` and `edgeEndPoint`) instead of generic connection points. This resolves the issue where multiple connections from the same room appeared on the wrong edge.

**Status**: ✅ **Fixed and Tested**
**Build**: ✅ **Successful**
**Backward Compatibility**: ✅ **Maintained**
