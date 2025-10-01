# Door Feature Implementation Guide

## Overview

The door feature allows users to add pharmaceutical-standard door symbols to connections between shapes in the 2D layout creator. This provides professional architectural-level detail for pharmaceutical facility designs with GMP compliance considerations.

## Architecture

### Pure SVG Approach

**Why SVG Instead of React Konva?**
- ✅ **Consistency**: Your app already uses ReactFlow which is SVG-based
- ✅ **Performance**: No canvas/SVG rendering conflicts
- ✅ **Integration**: Seamless integration with existing edge components
- ✅ **Simplicity**: No additional heavy dependencies (Konva is 550KB+)
- ✅ **Flexibility**: EdgeLabelRenderer allows custom SVG components on edges

## Files Created/Modified

### 1. **DoorSymbol.tsx** (NEW)
`frontend/src/components/DoorSymbol.tsx`

Professional SVG door symbols following architectural standards:

#### Door Types

| Door Type | Description | GMP Context |
|-----------|-------------|-------------|
| `standard` | Regular hinged door with arc swing | General access |
| `double` | Two-panel meeting center | Wide material/equipment transfer |
| `sliding` | Horizontal sliding door | Space-efficient personnel access |
| `airlock` | Interlocked double doors with "AL" label | **GMP CRITICAL** - Cleanroom transitions |
| `pass-through` | Small rectangular hatch with "PT" label | Small material transfer |
| `emergency` | Exit door with arrow and running figure | Fire-rated emergency exit |
| `roll-up` | Overhead door with horizontal lines | Large equipment entry |
| `automatic` | Sensor-activated with eye symbol | Hands-free operation |
| `cleanroom-rated` | Airtight seal with "CR" label | Specialized cleanroom transitions |

#### Key Features
- **Professional Symbols**: Each door type has distinct visual representation
- **Color-Coded**: GMP-critical doors (airlock, cleanroom) highlighted in red/green
- **Interactive**: Hover tooltips and click handlers
- **Scalable**: Scale parameter for different zoom levels
- **Rotational**: Auto-rotates perpendicular to connection line

### 2. **MultiRelationshipEdge.tsx** (MODIFIED)
`frontend/src/components/MultiRelationshipEdge.tsx`

#### Changes Made
- Imported `DoorSymbol` and `calculateDoorRotation`
- Changed `doorType` from `string` to typed `DoorType`
- Added door rendering in SVG context:
  ```typescript
  {data.doorType && (
    <DoorSymbol
      doorType={data.doorType}
      x={labelX}
      y={labelY}
      rotation={doorRotation}
      scale={1}
      interactive={true}
    />
  )}
  ```
- Doors render at the midpoint of connection lines
- Automatically rotate perpendicular to edge angle

### 3. **InlineRelationshipEditDialog.tsx** (MODIFIED)
`frontend/src/components/InlineRelationshipEditDialog.tsx`

#### Changes Made
- Imported `DoorType` and `getDoorDescription`
- Replaced simple text input with dropdown Select component
- Added all 9 pharmaceutical door types with descriptions
- Shows door description in view mode for better UX
- Door field only appears for `ADJACENT_TO` relationships

#### UI Flow
1. **View Mode**: Shows door type name + description
2. **Edit Mode**: Dropdown with 9 door options + "No door" option
3. **Validation**: Typed as `DoorType` for type safety

### 4. **shared/types/index.ts** (MODIFIED)
`shared/types/index.ts`

#### Changes Made
- Added `DoorType` type export (shared between frontend and backend)
- Updated `SpatialRelationship.doorType` from `string?` to `DoorType?`
- Comments explain GMP context for each door type

## How to Use

### For Users

1. **Connect two shapes** in the diagram editor
2. **Click the connection line** to open the relationship edit dialog
3. **Click "Edit"** button in the dialog
4. **Select a door type** from the dropdown (appears for ADJACENT_TO relationships)
5. **Click "Save"** to apply

The door symbol will appear at the midpoint of the connection line, automatically oriented perpendicular to the line direction.

### For Developers

#### Rendering Doors Programmatically

```typescript
import DoorSymbol from './components/DoorSymbol';

<svg>
  <DoorSymbol
    doorType="airlock"
    x={100}
    y={200}
    rotation={45}
    scale={1.2}
    color="#FF0000"
    interactive={true}
    onClick={() => console.log('Door clicked')}
  />
</svg>
```

#### Calculating Door Rotation

```typescript
import { calculateDoorRotation } from './components/DoorSymbol';

const rotation = calculateDoorRotation(
  sourceX,
  sourceY,
  targetX,
  targetY
);
// Returns angle in degrees (perpendicular to line)
```

#### Adding New Door Types

1. Add to `DoorType` union in [shared/types/index.ts](shared/types/index.ts)
2. Add rendering case in `DoorSymbol.tsx` `renderDoorSymbol()` switch
3. Add description in `getDoorDescription()`
4. Add menu option in `InlineRelationshipEditDialog.tsx`

## Visual Examples

### Airlock Door (GMP Critical)
```
┌─────────────┐
│  ┌───────┐  │  (Outer airlock boundary - dashed)
│  │   X   │  │  (Inner door with interlock symbol)
│  │  AL   │  │  (Label: "AL")
│  └───────┘  │
└─────────────┘
```

### Pass-Through Hatch
```
┌─────────┐
│─────────│  (Hatch indicator lines)
│         │
│─────────│
│   PT    │  (Label: "PT")
└─────────┘
```

### Double Door
```
┌─────┬─────┐
│     │     │  (Two panels with center line)
│     │     │
│     │     │
└─────┴─────┘
```

## GMP Compliance Considerations

### Critical Transitions
- **Airlock Doors**: Required between different cleanroom grades (Class A → B → C → D)
- **Pass-Through Hatches**: Minimize personnel movement between contamination zones
- **Cleanroom-Rated Doors**: Airtight seals for maintaining pressure differentials

### Material vs. Personnel Flow
- **Double Doors**: Wide access for material carts and equipment
- **Sliding/Automatic**: Hands-free operation for gowned personnel
- **Standard**: General personnel access

### Emergency Compliance
- **Emergency Exits**: Fire-rated, outward-opening, clearly marked
- **Roll-Up Doors**: For loading dock areas and equipment bays

## Performance Notes

- **SVG Rendering**: Each door is ~50 lines of SVG path/rect elements
- **No External Dependencies**: Pure React + ReactFlow
- **Lightweight**: ~8KB uncompressed for DoorSymbol component
- **Interactive**: Hover/click handlers don't impact canvas performance

## Future Enhancements

### Potential Features
1. **Door Swing Animation**: Animated arc showing door opening direction
2. **Access Control Icons**: Badge reader, keypad, biometric symbols
3. **Door Schedules**: Generate table of all doors with types and specifications
4. **Custom Door Symbols**: User-uploaded SVG symbols
5. **Door Sizing**: Width parameter (e.g., 36", 48", 72")
6. **Export to CAD**: Door symbols compatible with DXF/DWG export

### Backend Integration
Current implementation is frontend-only. To persist doors:
1. Door data already flows through `SpatialRelationship` interface
2. Backend validation routes can enforce GMP rules (e.g., airlocks between cleanroom grades)
3. Neo4j can store door specifications as relationship properties

## Troubleshooting

### Doors Not Appearing
- **Check doorType is set**: Edge data must have `doorType` property
- **Check relationship type**: Doors only render for `ADJACENT_TO` by default
- **Check renderAsIcon flag**: Doors hidden when edge is in icon-only mode

### Doors Misaligned
- **Rotation issue**: Verify `calculateDoorRotation` receives correct coordinates
- **Position issue**: Verify `labelX, labelY` calculation in edge component

### TypeScript Errors
- **Import DoorType**: Must import from `./DoorSymbol` in frontend or `../shared/types` in backend
- **Type mismatch**: Ensure edge data interface uses `DoorType` not `string`

## Testing

### Manual Testing Checklist
- [ ] Create ADJACENT_TO relationship between two shapes
- [ ] Open edit dialog and select each door type
- [ ] Verify door symbol appears at midpoint
- [ ] Verify door rotates with edge angle
- [ ] Hover over door to see tooltip
- [ ] Change door type and verify symbol updates
- [ ] Remove door (select "No door specified")
- [ ] Verify door data persists in edge data
- [ ] Test with horizontal, vertical, diagonal edges

### Automated Testing (Future)
```typescript
describe('DoorSymbol', () => {
  it('renders correct symbol for each door type', () => {
    // Test each of 9 door types
  });

  it('calculates rotation correctly', () => {
    expect(calculateDoorRotation(0, 0, 100, 0)).toBe(90);
  });
});
```

## Best Practices

### When to Use Doors
✅ **DO** use doors for:
- Physical connections between rooms
- ADJACENT_TO relationships
- Material/personnel access points

❌ **DON'T** use doors for:
- PROHIBITED_NEAR relationships (no physical connection)
- SHARES_UTILITY relationships (use utility symbols instead)
- Abstract WORKFLOW_SUGGESTION connections

### Door Selection Guidelines
- **Cleanroom Transitions**: Use airlock or cleanroom-rated doors
- **Material Transfer**: Use double doors or pass-through hatches
- **Personnel Movement**: Use sliding or automatic doors
- **Equipment Access**: Use roll-up or double doors
- **Emergency Routes**: Use emergency exit doors
- **General Access**: Use standard hinged doors

## Summary

The door feature provides professional architectural detail to pharmaceutical facility layouts using pure SVG rendering. It's lightweight, type-safe, GMP-aware, and seamlessly integrated with the existing ReactFlow canvas. No external libraries required beyond what's already in your project.

**Total Lines of Code**: ~400 lines across 4 files
**Dependencies Added**: None
**Render Performance**: Negligible impact (pure SVG)
**Type Safety**: Full TypeScript coverage
**GMP Compliance**: 9 pharmaceutical-specific door types

Enjoy creating professional pharmaceutical facility layouts! 🚪🏭