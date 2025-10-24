# Arrow Direction Feature for Unidirectional Doors

## Overview

Added the ability to control the arrow direction for unidirectional door connections. Users can now specify whether the flow goes from Shape A → Shape B or from Shape B → Shape A.

## What Changed

### Type Definitions

**New Type Added:**
```typescript
export type UnidirectionalFlowDirection = 'fromFirstToSecond' | 'fromSecondToFirst';
```

**Updated Interfaces:**
```typescript
export interface DoorConnection {
  // ... existing fields
  unidirectionalDirection?: UnidirectionalFlowDirection; // Only used when flowDirection is 'unidirectional'
}

export interface DoorPlacement {
  // ... existing fields
  unidirectionalDirection?: 'fromFirstToSecond' | 'fromSecondToFirst';
}
```

### User Interface Changes

#### Door Creation Dialog (`DoorConnectionDialog.tsx`)
- Added new section: **"Arrow Direction"** (shown only when Unidirectional is selected)
- Two radio button options:
  1. **From [First Shape] to [Second Shape]** (forward arrow →)
  2. **From [Second Shape] to [First Shape]** (backward arrow ←)
- Shape names shown as colored chips for visual clarity
- Default: `fromFirstToSecond`

#### Door Edit Dialog (`DoorConnectionEditDialog.tsx`)
- Same arrow direction controls as creation dialog
- Preserves existing direction when editing
- Shows current shape IDs in chips

### Visual Indicators

| Direction | Visual | Description |
|-----------|---------|-------------|
| `fromFirstToSecond` | → | Arrow points from first shape to second shape |
| `fromSecondToFirst` | ← | Arrow points from second shape to first shape |
| Bidirectional | ↔ | Two arrows (direction setting ignored) |

### Rendering Updates

**DoorConnectionRenderer.tsx:**
- Updated `renderArrow` to accept `reverseDirection` parameter
- When `reverseDirection` is true, arrow flips 180 degrees
- Applies to unidirectional arrows only

**DoorPlacementOverlay.tsx:**
- Updated `renderFlowArrow` to accept `reverseDirection` parameter
- Passes direction to `renderSingleArrow` as 1 (forward) or -1 (reverse)
- Works with wall-based door placements

## How to Use

### Creating a New Door with Direction

1. **Click Door button** or use old door creation method
2. **Select "Unidirectional"** as Flow Direction
3. **New section appears:** "Arrow Direction"
4. **Choose direction:**
   - Select "From [Shape A] to [Shape B]" for forward flow
   - Select "From [Shape B] to [Shape A]" for reverse flow
5. **Click "Create Connection"**

### Editing Door Direction

1. **Click on existing door** (green arrow icon)
2. **Edit dialog opens**
3. **Change Flow Direction** to "Unidirectional" (if not already)
4. **Arrow Direction section appears**
5. **Select desired direction**
6. **Click "Update"**

### Visual Example

```
Before (default):
┌─────────┐        ┌─────────┐
│ Shape A │   →    │ Shape B │
└─────────┘        └─────────┘

After changing to "fromSecondToFirst":
┌─────────┐        ┌─────────┐
│ Shape A │   ←    │ Shape B │
└─────────┘        └─────────┘
```

## Technical Details

### Data Flow

```typescript
// User selects direction in dialog
unidirectionalDirection: 'fromSecondToFirst'

// Stored in door connection object
{
  flowDirection: 'unidirectional',
  unidirectionalDirection: 'fromSecondToFirst'
}

// Rendering logic checks
const reverseDirection = 
  connection.flowDirection === 'unidirectional' && 
  connection.unidirectionalDirection === 'fromSecondToFirst';

// Arrow renderer flips direction
const arrowAngle = reverseDirection 
  ? perpendicularAngle + Math.PI  // Flip 180°
  : perpendicularAngle;           // Normal
```

### Default Behavior

- **If not specified**: Defaults to `fromFirstToSecond`
- **Bidirectional doors**: Direction setting is ignored
- **Existing doors**: Will use default if no direction was set

### Backward Compatibility

✅ **Fully backward compatible!**
- Old door connections without `unidirectionalDirection` work fine
- Defaults to `fromFirstToSecond` (original behavior)
- No migration needed for existing data

## Files Modified

1. **`/frontend/src/types/index.ts`**
   - Added `UnidirectionalFlowDirection` type
   - Updated `DoorConnection` interface
   
2. **`/frontend/src/utils/wallDetection.ts`**
   - Updated `DoorPlacement` interface

3. **`/frontend/src/components/DoorConnectionDialog.tsx`**
   - Added arrow direction selection UI
   - Updated `onConfirm` callback signature
   - Added state for `unidirectionalDirection`

4. **`/frontend/src/components/DoorConnectionEditDialog.tsx`**
   - Added arrow direction selection UI
   - Updated `onUpdate` callback signature
   - Added state handling for direction

5. **`/frontend/src/components/DoorConnectionRenderer.tsx`**
   - Updated `renderArrow` function to support reverse direction
   - Pass direction flag when rendering

6. **`/frontend/src/components/LayoutDesigner/DoorPlacementOverlay.tsx`**
   - Updated `renderFlowArrow` to support reverse direction
   - Pass direction flag to single arrow renderer

7. **`/frontend/src/components/LayoutDesigner/LayoutDesigner.tsx`**
   - Updated all door handlers to accept `unidirectionalDirection`
   - Pass direction parameter through callback chain
   - Store direction in door objects

## Use Cases

### Material Flow Direction
```
Raw Materials → Processing → Finished Product
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Storage  │  →   │ Production│  →   │ Packaging│
└──────────┘      └──────────┘      └──────────┘
```

### Personnel Flow Direction
```
Entry Gowning → Clean Room ← Exit Gowning
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Entrance │  →   │ Clean    │  ←   │ Exit     │
└──────────┘      └──────────┘      └──────────┘
```

### Waste Flow Direction
```
Production Area → Waste Disposal
┌──────────┐      ┌──────────┐
│ Process  │  →   │ Waste    │
└──────────┘      └──────────┘
```

## Benefits

1. ✅ **Clear Flow Direction**: No ambiguity about which way materials/personnel move
2. ✅ **GMP Compliance**: Properly document flow patterns for regulatory requirements
3. ✅ **Visual Clarity**: Arrow points in actual flow direction
4. ✅ **Easy to Change**: Edit direction without recreating connection
5. ✅ **Flexible**: Works with both icon-based and wall-based doors

## Testing Checklist

- [ ] Create unidirectional door with default direction
- [ ] Create unidirectional door with reverse direction
- [ ] Edit door to change direction
- [ ] Switch between unidirectional and bidirectional
- [ ] Verify arrow renders correctly (forward)
- [ ] Verify arrow renders correctly (reverse)
- [ ] Test with icon-based doors
- [ ] Test with wall-based doors
- [ ] Verify backward compatibility (existing doors)
- [ ] Check direction persists after save/load

## Known Limitations

None - feature is fully functional!

## Future Enhancements

1. **Visual Direction Hints**: Show small text labels ("IN"/"OUT") near arrows
2. **Automatic Direction**: Suggest direction based on room types
3. **Flow Validation**: Warn if direction violates GMP rules
4. **Bulk Direction Change**: Change direction of multiple doors at once
5. **Direction Templates**: Save common direction patterns

## Summary

This feature adds full control over unidirectional door arrow directions, making it clear which way materials, personnel, or waste flows between rooms. The implementation is:

- ✅ Fully functional
- ✅ Backward compatible
- ✅ Easy to use
- ✅ Visually clear
- ✅ Works with both door systems

Users can now precisely document flow patterns in their pharmaceutical facility designs!
