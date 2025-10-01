# Complete Door Implementation Guide for Layout Designer

## What I've Implemented So Far

### ✅ Completed Files

1. **`DoorSymbol.tsx`** - Professional SVG door symbols (9 types)
2. **`ConnectionRenderer.tsx`** - Renders connections with doors
3. **`types.ts`** (LayoutDesigner) - Connection interfaces and utility functions
4. **`DrawingTools.tsx`** - Added connection mode button (partially)
5. **`shared/types/index.ts`** - Added DoorType to shared types

### ⚠️ Problem Discovered

The original MultiRelationshipEdge implementation was for React

Flow (which is currently disabled), but **LayoutDesigner** uses a completely different architecture (pure SVG canvas). I've started adding connection support to LayoutDesigner, but it needs significant integration.

## Complete Implementation Steps

### Step 1: Update LayoutDesigner.tsx (MAIN FILE)

Add to state:
```typescript
const [connections, setConnections] = useState<Connection[]>([]);
const [drawingMode, setDrawingMode] = useState<DrawingMode>('select');
const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
const [connectionDrawing, setConnectionDrawing] = useState<ConnectionDrawingState>({
  isDrawing: false,
  fromShapeId: null,
  hoveredShapeId: null,
  previewEndPoint: null,
});
```

Add connection handlers:
```typescript
const handleConnectionCreate = (fromShapeId: string, toShapeId: string) => {
  const newConnection: Connection = {
    id: `connection-${Date.now()}`,
    fromShapeId,
    toShapeId,
    lineType: 'straight',
    color: '#666',
    width: 2,
    createdAt: new Date(),
  };
  setConnections(prev => [...prev, newConnection]);
  setConnectionDrawing({
    isDrawing: false,
    fromShapeId: null,
    hoveredShapeId: null,
    previewEndPoint: null,
  });
};

const handleConnectionUpdate = (connectionId: string, updates: Partial<Connection>) => {
  setConnections(prev => prev.map(conn =>
    conn.id === connectionId ? { ...conn, ...updates } : conn
  ));
};

const handleConnectionDelete = (connectionId: string) => {
  setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  setSelectedConnectionId(null);
};
```

### Step 2: Update SVG Rendering in LayoutDesigner.tsx

Find the SVG rendering section (around line 881) and add:
```tsx
<svg
  ref={svgRef}
  width={canvasSettings.width}
  height={canvasSettings.height}
  style={{
    border: '1px solid #ddd',
    background: canvasSettings.backgroundColor,
    cursor: getCursor(),
  }}
  onMouseDown={handleSVGMouseDown}
  onMouseMove={handleSVGMouseMove}
  onMouseUp={handleSVGMouseUp}
>
  {/* Grid */}
  {canvasSettings.showGrid && renderGrid()}

  {/* Connections Layer - RENDER BEFORE SHAPES */}
  <ConnectionRenderer
    connections={connections}
    shapes={shapes}
    selectedConnectionId={selectedConnectionId}
    onConnectionClick={(id) => {
      setSelectedConnectionId(id);
      setDrawingState(prev => ({ ...prev, selectedShapeId: null }));
    }}
  />

  {/* Connection Preview (while drawing) */}
  {drawingMode === 'connection' && connectionDrawing.isDrawing && connectionDrawing.previewEndPoint && (
    <ConnectionPreview
      fromShapeId={connectionDrawing.fromShapeId!}
      shapes={shapes}
      previewEndPoint={connectionDrawing.previewEndPoint}
    />
  )}

  {/* Shapes */}
  {shapes.map(shape => (
    // existing shape rendering...
  ))}
</svg>
```

### Step 3: Add Connection Drawing Logic

Add mouse handlers for connection mode:
```typescript
const handleShapeClickForConnection = (shapeId: string) => {
  if (drawingMode !== 'connection') return;

  if (!connectionDrawing.isDrawing) {
    // Start connection from this shape
    setConnectionDrawing({
      isDrawing: true,
      fromShapeId: shapeId,
      hoveredShapeId: null,
      previewEndPoint: null,
    });
  } else if (connectionDrawing.fromShapeId !== shapeId) {
    // Complete connection to this shape
    handleConnectionCreate(connectionDrawing.fromShapeId!, shapeId);
  }
};

const handleMouseMoveOnCanvas = (e: React.MouseEvent) => {
  if (drawingMode === 'connection' && connectionDrawing.isDrawing) {
    const point = getCanvasCoordinates(e);
    setConnectionDrawing(prev => ({
      ...prev,
      previewEndPoint: point,
    }));
  }
};
```

### Step 4: Update PropertiesPanel.tsx for Connections

Add to PropertiesPanelProps:
```typescript
export interface PropertiesPanelProps {
  selectedShape: ShapeProperties | null;
  selectedConnection: Connection | null;  // ADD THIS
  onShapeUpdate: (id: string, updates: Partial<ShapeProperties>) => void;
  onConnectionUpdate: (id: string, updates: Partial<Connection>) => void;  // ADD THIS
  onShapeDelete: (id: string) => void;
  onConnectionDelete: (id: string) => void;  // ADD THIS
  onShapeDuplicate: (id: string) => void;
  onClose: () => void;
}
```

Add connection editing UI (after shape properties):
```tsx
{selectedConnection && !selectedShape && (
  <Box>
    <Typography variant="h6" gutterBottom>
      Connection Properties
    </Typography>

    {/* Door Type Selector */}
    <Box mb={2}>
      <Typography variant="subtitle2" gutterBottom>
        Door Type
      </Typography>
      <FormControl fullWidth size="small">
        <Select
          value={selectedConnection.doorType || ''}
          onChange={(e) => onConnectionUpdate(selectedConnection.id, {
            doorType: e.target.value as DoorType
          })}
          displayEmpty
        >
          <MenuItem value=""><em>No door</em></MenuItem>
          <MenuItem value="standard">Standard - Hinged door</MenuItem>
          <MenuItem value="double">Double - Wide access</MenuItem>
          <MenuItem value="sliding">Sliding - Space-efficient</MenuItem>
          <MenuItem value="airlock">Airlock - GMP critical</MenuItem>
          <MenuItem value="pass-through">Pass-Through - Material transfer</MenuItem>
          <MenuItem value="emergency">Emergency - Fire exit</MenuItem>
          <MenuItem value="roll-up">Roll-Up - Equipment bay</MenuItem>
          <MenuItem value="automatic">Automatic - Sensor-activated</MenuItem>
          <MenuItem value="cleanroom-rated">Cleanroom-Rated - Airtight</MenuItem>
        </Select>
      </FormControl>
    </Box>

    {/* Line Type */}
    <Box mb={2}>
      <Typography variant="subtitle2" gutterBottom>
        Line Type
      </Typography>
      <FormControl fullWidth size="small">
        <Select
          value={selectedConnection.lineType}
          onChange={(e) => onConnectionUpdate(selectedConnection.id, {
            lineType: e.target.value as 'straight' | 'curved' | 'orthogonal'
          })}
        >
          <MenuItem value="straight">Straight</MenuItem>
          <MenuItem value="orthogonal">Orthogonal (90° angles)</MenuItem>
          <MenuItem value="curved">Curved</MenuItem>
        </Select>
      </FormControl>
    </Box>

    {/* Color Picker */}
    <Box mb={2}>
      <Typography variant="subtitle2" gutterBottom>
        Color
      </Typography>
      <TextField
        fullWidth
        size="small"
        type="color"
        value={selectedConnection.color}
        onChange={(e) => onConnectionUpdate(selectedConnection.id, {
          color: e.target.value
        })}
      />
    </Box>

    {/* Delete Button */}
    <Button
      fullWidth
      variant="outlined"
      color="error"
      startIcon={<DeleteIcon />}
      onClick={() => onConnectionDelete(selectedConnection.id)}
    >
      Delete Connection
    </Button>
  </Box>
)}
```

### Step 5: Create ConnectionPreview Component

Create `ConnectionPreview.tsx`:
```tsx
import React from 'react';
import { ShapeProperties } from './PropertiesPanel';
import { getShapeConnectionPoint } from './types';

interface ConnectionPreviewProps {
  fromShapeId: string;
  shapes: ShapeProperties[];
  previewEndPoint: { x: number; y: number };
}

const ConnectionPreview: React.FC<ConnectionPreviewProps> = ({
  fromShapeId,
  shapes,
  previewEndPoint,
}) => {
  const fromShape = shapes.find(s => s.id === fromShapeId);
  if (!fromShape) return null;

  const fromPoint = getShapeConnectionPoint(
    fromShape,
    previewEndPoint.x,
    previewEndPoint.y
  );

  return (
    <g>
      <line
        x1={fromPoint.x}
        y1={fromPoint.y}
        x2={previewEndPoint.x}
        y2={previewEndPoint.y}
        stroke="#2196F3"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.6}
      />
      <circle
        cx={previewEndPoint.x}
        cy={previewEndPoint.y}
        r={4}
        fill="#2196F3"
      />
    </g>
  );
};

export default ConnectionPreview;
```

### Step 6: Update DrawingTools.tsx (Complete the integration)

Already done - just need to wire it up in LayoutDesigner:
```tsx
<DrawingTools
  drawingMode={drawingMode}
  onDrawingModeChange={setDrawingMode}
  activeShapeTool={drawingState.activeShapeTool}
  onShapeToolChange={(tool) => {
    setDrawingState(prev => ({ ...prev, activeShapeTool: tool }));
    if (tool) setDrawingMode('shape');
  }}
  // ...other props
/>
```

### Step 7: Save/Load Connections

Update LayoutData interface in LayoutDesigner.tsx:
```typescript
export interface LayoutData {
  id: string;
  name: string;
  shapes: ShapeProperties[];
  connections: Connection[];  // ADD THIS
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
```

Update save/load handlers:
```typescript
const handleSave = () => {
  const layoutData: LayoutData = {
    id: `layout-${Date.now()}`,
    name: `Layout ${new Date().toLocaleDateString()}`,
    shapes: shapes,
    connections: connections,  // ADD THIS
    canvasSettings: {
      width: canvasSettings.width,
      height: canvasSettings.height,
      backgroundColor: canvasSettings.backgroundColor,
    },
    metadata: {
      createdAt: new Date(),
      modifiedAt: new Date(),
      version: '1.0.0',
    },
  };

  onSave?.(layoutData);
};
```

## Quick Start: Minimal Working Version

If you want to get doors working ASAP, here's the minimal approach:

1. **Add this to LayoutDesigner** right after the shapes state:
```typescript
const [connections, setConnections] = useState<Connection[]>([]);
const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
```

2. **Add ConnectionRenderer** to the SVG (before shapes):
```tsx
<ConnectionRenderer
  connections={connections}
  shapes={shapes}
  selectedConnectionId={selectedConnectionId}
  onConnectionClick={setSelectedConnectionId}
/>
```

3. **Add temporary "Add Connection" button** in the UI:
```tsx
<Button onClick={() => {
  if (shapes.length >= 2) {
    setConnections(prev => [...prev, {
      id: `conn-${Date.now()}`,
      fromShapeId: shapes[0].id,
      toShapeId: shapes[1].id,
      doorType: 'airlock',
      lineType: 'straight',
      color: '#666',
      width: 2,
      createdAt: new Date(),
    }]);
  }
}}>
  Add Test Connection with Door
</Button>
```

This will let you see doors working immediately!

## Testing Checklist

- [ ] Draw two shapes
- [ ] Click connection tool
- [ ] Click first shape → visual feedback
- [ ] Click second shape → connection appears
- [ ] Click connection → properties panel opens
- [ ] Select door type → door appears on connection
- [ ] Change line type → connection updates
- [ ] Delete connection → connection disappears
- [ ] Save layout → connections persist
- [ ] Load layout → connections restore with doors

## Troubleshooting

**Connections not appearing?**
- Check ConnectionRenderer is imported
- Verify connections array has data
- Check shapes array has matching IDs

**Doors not rotating?**
- Verify `getConnectionAngle()` is being called
- Check DoorSymbol rotation prop

**Can't select connections?**
- Ensure invisible wide path has onClick handler
- Check z-index ordering (connections before shapes)

**State not updating?**
- Verify all `set` functions are being called
- Check React DevTools for state values

## Next Steps

1. Implement the full connection drawing logic (Steps 1-3)
2. Add door selection UI (Step 4)
3. Add connection preview (Step 5)
4. Test thoroughly
5. Add connection deletion when shapes are deleted
6. Add validation (no duplicate connections)
7. Add connection labels
8. Export connections to backend for persistence

## Files Reference

- `DoorSymbol.tsx` - ✅ Complete
- `ConnectionRenderer.tsx` - ✅ Complete
- `types.ts` (LayoutDesigner) - ✅ Complete
- `DrawingTools.tsx` - ✅ Complete
- `LayoutDesigner.tsx` - ⚠️ Needs integration (Steps 1-3, 6-7)
- `PropertiesPanel.tsx` - ⚠️ Needs connection UI (Step 4)
- `ConnectionPreview.tsx` - ❌ Not created yet (Step 5)

Total estimated time to complete: **2-3 hours** for full integration

Good luck! The foundation is solid - just needs wiring together! 🚪✨