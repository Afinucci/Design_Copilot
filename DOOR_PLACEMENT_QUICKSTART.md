# Door Placement Quick Start Guide

## Overview
The new Hypar-style door placement feature allows you to visually place doors on shared walls between adjacent rooms with a simple point-and-click interface.

## Quick Start (3 Steps)

### Step 1: Enter Door Mode
Click the **Door icon** (🚪) in the toolbar at the bottom of the screen.

### Step 2: Place a Door
- Move your mouse over the canvas
- **Shared walls between adjacent rooms will highlight** with a dashed blue/green line
- Hover over a wall to see a **crosshair placement indicator**
- **Click** where you want to place the door

### Step 3: Configure the Door
A dialog will appear. Select:
- **Flow Type**: Material (Blue), Personnel (Green), or Waste (Red)
- **Flow Direction**: Unidirectional or Bidirectional

Click **"Create Connection"** and you're done!

## Moving a Door
1. Click on the door to select it (you'll see a dashed circle and handle points)
2. Click and drag it along the wall to reposition
3. Release to set the new position
4. **Note**: You can move doors in any mode, not just door mode!

## Editing a Door
1. Click on the door to select it (in any mode)
2. A **Door Properties panel** will appear on the right showing:
   - Current flow type
   - Current flow direction
   - Door width
3. Click **"Edit Properties"** to change flow type or direction
4. Make your changes in the dialog and click "Create Connection"

## Deleting a Door
1. Click on the door to select it
2. In the Door Properties panel on the right, click **"Delete Door"**
3. The door will be removed immediately

## Visual Guide

### What the colors mean:
- **Blue (Material Flow)**: For material transfer, equipment, and raw materials
- **Green (Personnel Flow)**: For people movement between rooms
- **Red (Waste Flow)**: For waste disposal pathways

### What the indicators mean:
| Indicator | Meaning |
|-----------|---------|
| Dashed blue line | Shared wall (normal) |
| Dashed green line | Shared wall (hover) |
| Green crosshair | Where door will be placed |
| White + colored line | Existing door |
| Arrow(s) | Flow direction through door |
| Dashed circle | Selected door |

## Tips

✅ **DO:**
- Place doors on shared walls that are highlighted
- Use material flow for supply and equipment rooms
- Use personnel flow for access between work areas
- Use waste flow for dedicated waste removal paths

❌ **DON'T:**
- Try to place doors on non-adjacent walls (they won't highlight)
- Place too many doors on a single wall (keep it realistic)
- Forget to consider GMP flow separation requirements

## Example Workflow

**Creating a Production Area Layout with Doors:**

1. Draw 3 rooms: "Weighing Room", "Mixing Room", "Filling Room"
2. Arrange them adjacent to each other
3. Click the Door icon
4. Add Material Flow door between Weighing → Mixing
5. Add Material Flow door between Mixing → Filling
6. Add Personnel Flow door to each room from corridor
7. Add Waste Flow door from Filling room to waste room
8. Exit door mode (click Door icon again)

## Keyboard Shortcuts (Coming Soon)
- `D` - Toggle door mode
- `M` - Quick select Material flow
- `P` - Quick select Personnel flow
- `W` - Quick select Waste flow
- `Delete` - Delete selected door
- `Esc` - Exit door mode

## Troubleshooting

**Problem**: Walls not highlighting
- **Solution**: Make sure rooms are actually touching (not just close)
- Try zooming in to verify walls are aligned
- Check that you're in Door mode (icon should be highlighted)

**Problem**: Can't place door
- **Solution**: Only shared walls between adjacent rooms can have doors
- Verify the wall is highlighted (blue/green dashed line)
- Make sure you clicked on the dashed line

**Problem**: Door won't move
- **Solution**: Make sure the door is selected first (click on it)
- You must be in Door mode to move doors
- Drag along the wall, not perpendicular to it

## Need More Help?

See the comprehensive documentation: [HYPAR_STYLE_DOOR_PLACEMENT.md](./HYPAR_STYLE_DOOR_PLACEMENT.md)

## GMP Compliance Notes

When designing pharmaceutical facilities, follow these best practices:

### Material Flow (Blue Doors)
- Raw material entry
- Equipment transfer
- Product movement between processing areas

### Personnel Flow (Green Doors)
- Gowning room entries
- Corridor access
- Emergency exits
- Should be separated from material flow where possible

### Waste Flow (Red Doors)
- Dedicated waste removal paths
- Must not cross material input paths
- Should lead directly to waste processing areas

### Cleanroom Transitions
- Use airlocks between different cleanroom classes
- Maintain pressure cascades (A → B → C → D)
- Consider personnel and material flow separation

## What's Next?

Future enhancements planned:
- Door width adjustment with resize handles
- Door swing direction indicators
- Door templates (standard sizes)
- GMP validation rules
- Export to CAD formats
- Door schedule generation

---

**Enjoy placing doors the easy way!** 🚪✨
