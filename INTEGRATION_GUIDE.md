# Layout Designer Enhancement Integration Guide

This guide explains how to integrate the new professional floor plan features into your existing Layout Designer system.

## 🎯 New Features Added

1. **Unit System** - Convert between pixels, feet, meters, centimeters, inches
2. **Wall Drawing Tool** - Draw walls with configurable thickness (2-16 inches)
3. **Measurement Annotations** - Add dimension lines and area labels
4. **Scale Settings** - Professional architectural scales (1/4"=1', 1:50, 1:100, etc.)
5. **Ruler Overlay** - Professional rulers on canvas edges
6. **PDF/SVG Export** - Export layouts with title blocks and measurements

## 📁 New Files Created

```
frontend/src/
├── utils/
│   ├── unitConversion.ts          # Unit system and scale presets
│   └── layoutExport.ts             # PDF/SVG export utilities
└── components/LayoutDesigner/
    ├── WallTool.tsx                # Wall drawing panel
    ├── MeasurementTool.tsx         # Measurement annotation renderer
    ├── ScaleSettings.tsx           # Scale and unit configuration dialog
    └── RulerOverlay.tsx            # Professional rulers for canvas
```

## 🔧 Integration Steps

### Step 1: Add State to LayoutDesigner Component

Add these new state variables to `LayoutDesigner.tsx`:

```typescript
import { UnitConverter, SCALE_PRESETS } from '../../utils/unitConversion';
import { Measurement } from './MeasurementTool';
import { WallSegment } from './WallTool';
import RulerOverlay from './RulerOverlay';
import ScaleSettings from './ScaleSettings';
import MeasurementRenderer from './MeasurementTool';
import WallTool from './WallTool';
import { downloadSVG, printLayout, exportToPDF } from '../../utils/layoutExport';

// Add to state section (around line 200):
const [unitConverter, setUnitConverter] = useState<UnitConverter>(
  UnitConverter.createDefault() // 1:100 scale, metric
);
const [showScaleSettings, setShowScaleSettings] = useState(false);
const [showRulers, setShowRulers] = useState(true);
const [measurements, setMeasurements] = useState<Measurement[]>([]);
const [walls, setWalls] = useState<WallSegment[]>([]);
const [showWallTool, setShowWallTool] = useState(false);
const [measurementMode, setMeasurementMode] = useState<'dimension' | 'area' | 'label' | null>(null);
```

### Step 2: Update DrawingMode Type

In `types.ts`, add new modes:

```typescript
export type DrawingMode =
  | 'select'
  | 'shape'
  | 'door'
  | 'wall'        // NEW
  | 'measurement' // NEW
  | 'pan';
```

### Step 3: Add New Toolbar Buttons

Update `DrawingTools.tsx` to include these new buttons:

```typescript
import {
  Straighten as WallIcon,
  StraightRuler as MeasureIcon,
  AspectRatio as ScaleIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Add after Door Connection button (around line 227):
<Tooltip title="Wall Drawing Tool - Draw walls with thickness" arrow>
  <IconButton
    size="medium"
    color={drawingMode === 'wall' ? 'primary' : 'default'}
    onClick={() => onDrawingModeChange(drawingMode === 'wall' ? 'select' : 'wall')}
  >
    <WallIcon />
  </IconButton>
</Tooltip>

<Tooltip title="Measurement Tool - Add dimensions and labels" arrow>
  <IconButton
    size="medium"
    color={drawingMode === 'measurement' ? 'primary' : 'default'}
    onClick={() => onDrawingModeChange(drawingMode === 'measurement' ? 'select' : 'measurement')}
  >
    <MeasureIcon />
  </IconButton>
</Tooltip>

<Divider orientation="vertical" flexItem />

<Tooltip title="Scale & Unit Settings" arrow>
  <IconButton
    size="medium"
    onClick={() => setShowScaleSettings(true)}
  >
    <ScaleIcon />
  </IconButton>
</Tooltip>
```

### Step 4: Add Ruler Overlay to Canvas

In `LayoutDesigner.tsx`, add the ruler overlay inside the drawing area (around line 1406):

```typescript
{/* Ruler Overlay - Professional rulers */}
{showRulers && (
  <RulerOverlay
    canvasWidth={canvasSettings.width}
    canvasHeight={canvasSettings.height}
    unitConverter={unitConverter}
  />
)}
```

### Step 5: Add Measurement Renderer

Add after the door placement overlay (around line 1476):

```typescript
{/* Measurement Layer */}
<MeasurementRenderer
  measurements={measurements}
  unitConverter={unitConverter}
  selectedMeasurementId={selectedMeasurementId}
  onMeasurementClick={(id) => setSelectedMeasurementId(id)}
/>
```

### Step 6: Add Wall Tool Panel

Add after the Shape Library sidebar (around line 1650):

```typescript
{/* Wall Tool Panel */}
{showWallTool && drawingMode === 'wall' && (
  <WallTool
    onClose={() => {
      setShowWallTool(false);
      setDrawingMode('select');
    }}
    onWallCreate={(wall) => {
      setWalls(prev => [...prev, wall]);
    }}
    pixelsPerFoot={unitConverter.getConfig().pixelsPerUnit}
  />
)}
```

### Step 7: Add Scale Settings Dialog

Add before the closing `</Box>` tag (around line 1908):

```typescript
{/* Scale Settings Dialog */}
<ScaleSettings
  open={showScaleSettings}
  onClose={() => setShowScaleSettings(false)}
  onApply={(converter) => {
    setUnitConverter(converter);
    console.log('✅ Scale updated:', converter.getConfig());
  }}
  currentConverter={unitConverter}
/>
```

### Step 8: Add Export Functionality

Add export buttons to the toolbar or as a floating action button:

```typescript
// In DrawingTools.tsx or as a separate ExportMenu component:
const handleExportSVG = () => {
  downloadSVG(
    {
      shapes,
      measurements,
      walls,
      canvasWidth: canvasSettings.width,
      canvasHeight: canvasSettings.height,
      unitConverter,
    },
    {
      filename: 'pharmaceutical-layout',
      title: 'Facility Layout Plan',
      projectName: 'Pharmaceutical Facility Design',
      drawingNumber: 'FL-001',
      revision: 'A',
      includeMeasurements: true,
      includeGrid: canvasSettings.showGrid,
    }
  );
};

const handlePrint = () => {
  printLayout(
    { shapes, measurements, walls, canvasWidth, canvasHeight, unitConverter },
    {
      filename: 'pharmaceutical-layout',
      title: 'Facility Layout Plan',
      includeMeasurements: true,
    }
  );
};
```

### Step 9: Update Shape Labels with Area

Modify the shape label rendering (around line 1590) to show area in real-world units:

```typescript
<Typography
  variant="caption"
  fontWeight="bold"
  color="text.primary"
  textAlign="center"
  sx={{ wordBreak: 'break-word', px: 1 }}
>
  {shape.name}
  {shape.area && (
    <Box component="span" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.7 }}>
      {unitConverter.formatArea(shape.area)}
    </Box>
  )}
</Typography>
```

## 🎨 Usage Examples

### Setting the Scale

```typescript
// Use a preset scale (1:100)
const converter = UnitConverter.fromPreset(SCALE_PRESETS[3], true); // true = metric
setUnitConverter(converter);

// Or create custom scale
const customConverter = new UnitConverter('feet', 48); // 48 pixels = 1 foot
setUnitConverter(customConverter);
```

### Adding Walls

When wall mode is active and user clicks twice on canvas:

```typescript
const newWall: WallSegment = {
  id: `wall-${Date.now()}`,
  startPoint: { x: startX, y: startY },
  endPoint: { x: endX, y: endY },
  thickness: getWallThicknessPixels(6, unitConverter.getConfig().pixelsPerUnit),
  thicknessInches: 6,
  wallType: 'Standard Wall',
  color: '#333333',
  createdAt: new Date(),
};
setWalls(prev => [...prev, newWall]);
```

### Adding Measurements

```typescript
const newMeasurement: Measurement = {
  id: `measure-${Date.now()}`,
  type: 'dimension',
  startPoint: { x: 100, y: 100 },
  endPoint: { x: 300, y: 100 },
  position: { x: 200, y: 90 },
  autoCalculate: true,
  fontSize: 12,
  color: '#000000',
  createdAt: new Date(),
};
setMeasurements(prev => [...prev, newMeasurement]);
```

### Converting Units

```typescript
// Convert 100 pixels to feet/meters
const valueInUnits = unitConverter.pixelsToUnits(100);
console.log(`100px = ${valueInUnits} ${unitConverter.getConfig().abbreviation}`);

// Format for display
const formatted = unitConverter.formatPixels(100);
console.log(formatted); // "10.4 ft" or "3.2 m" depending on scale

// Format area
const areaFormatted = unitConverter.formatArea(10000);
console.log(areaFormatted); // "104.2 sq ft" or "9.6 m²"
```

## 🧪 Testing

Test these scenarios:

1. **Scale Changes**
   - Switch between metric and imperial
   - Change scale presets
   - Verify measurements update correctly

2. **Wall Drawing**
   - Draw walls with different thicknesses
   - Verify wall thickness scales correctly
   - Test wall colors and types

3. **Measurements**
   - Add dimension lines between shapes
   - Verify auto-calculation works
   - Test area labels

4. **Export**
   - Export to SVG
   - Print layout
   - Verify title block appears correctly

5. **Rulers**
   - Verify rulers show correct scale
   - Check unit labels are displayed
   - Test ruler with different zoom levels

## 🎯 Next Steps (Optional Enhancements)

1. **Wall Drawing Canvas Logic** - Implement click-to-place wall endpoints with visual feedback
2. **Measurement Drawing** - Add interactive measurement placement (click start, click end)
3. **PDF Generation** - Integrate jsPDF or use server-side PDF generation
4. **3D Visualization** - Add Three.js-based 3D viewer (separate component)
5. **Template Library** - Save/load scale and measurement presets
6. **Auto-Dimensioning** - Automatically add dimensions to all shapes
7. **BIM Integration** - Export to IFC format for BIM software

## 🐛 Common Issues

**Issue: Measurements don't update when scale changes**
- Solution: Force re-render of MeasurementRenderer when unitConverter changes

**Issue: Walls too thin/thick**
- Solution: Check pixelsPerFoot in getWallThicknessPixels()

**Issue: Rulers overlap shapes**
- Solution: Adjust ruler zIndex or add toggle to hide/show

**Issue: Export missing shapes**
- Solution: Verify all shape types are handled in exportToSVG()

## 📚 References

- [unitConversion.ts](frontend/src/utils/unitConversion.ts) - Unit system utilities
- [layoutExport.ts](frontend/src/utils/layoutExport.ts) - Export functions
- [WallTool.tsx](frontend/src/components/LayoutDesigner/WallTool.tsx) - Wall tool component
- [MeasurementTool.tsx](frontend/src/components/LayoutDesigner/MeasurementTool.tsx) - Measurement renderer
- [ScaleSettings.tsx](frontend/src/components/LayoutDesigner/ScaleSettings.tsx) - Scale configuration
- [RulerOverlay.tsx](frontend/src/components/LayoutDesigner/RulerOverlay.tsx) - Professional rulers

## 💡 Benefits Over react-planner

✅ **Modern React 19 compatible** (no dependency conflicts)
✅ **Seamlessly integrates with existing Neo4j validation**
✅ **Pharmaceutical-specific features preserved**
✅ **No Redux/Immutable.js complexity**
✅ **Lightweight and performant**
✅ **Full control over codebase**

---

**Questions?** Check the inline comments in each component file for detailed usage instructions.
