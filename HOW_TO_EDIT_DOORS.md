# How to Edit Door Connections - Complete Guide

## Understanding Your Door Systems

Your app has **TWO different door connection systems**:

### 1. Icon-Based Doors (Old System)
- **What they look like**: Green arrow icons floating between rooms
- **Where**: You're currently seeing these in your screenshot
- **Visual**: Arrows with icon representation

### 2. Wall-Based Doors (New Hypar-Style System)
- **What they look like**: Colored lines on shared walls between rooms
- **Where**: Activated by clicking the Door (🚪) button in toolbar
- **Visual**: Actual door gaps in walls with flow indicators

---

## How to Edit Icon-Based Doors (What You're Seeing Now)

### Steps to Edit:

1. **Look for the green double-arrow icon** between your rooms
   - In your screenshot: between "Weighing Area" and "Packaging"

2. **Click directly on the icon**
   - You should see console message: `🚪 Old-style door clicked: door-xxx`
   - Cursor will change to pointer when hovering

3. **Edit Dialog Opens** showing:
   - Connected rooms (as chips)
   - Flow Type options:
     - Material Flow (Blue) 🚚
     - Personnel Flow (Green) 👤
     - Waste Flow (Red) 🗑️
   - Flow Direction options:
     - Unidirectional (one-way) →
     - Bidirectional (two-way) ↔

4. **Select your changes**
   - Click the radio button for new Flow Type
   - Click the radio button for new Flow Direction

5. **Save or Delete**
   - Click **"Update"** to save changes
   - Click **"Delete"** to remove the door connection
   - Click **"X"** or **"Close"** to cancel

### What Happens After Update:
- Icon color changes based on flow type
- Arrow style changes based on direction
- Changes are immediate

---

## How to Use Wall-Based Doors (New Hypar System)

### Creating a New Wall Door:

1. **Click the Door button (🚪)** in the bottom toolbar

2. **Blue dashed lines appear** on all shared walls between adjacent rooms

3. **Hover over a wall**
   - Line turns green
   - Crosshair indicator appears

4. **Click where you want the door**
   - Dialog opens

5. **Configure the door**
   - Select Flow Type (Material/Personnel/Waste)
   - Select Flow Direction (Unidirectional/Bidirectional)
   - Click "Create Connection"

6. **Door appears** as a colored line on the wall

### Editing a Wall Door:

1. **Click on the colored door line** on the wall
   - Works in any mode, not just door mode

2. **Properties panel opens** on the right side

3. **Review current properties**
   - Flow Type with color indicator
   - Flow Direction
   - Door Width

4. **Click "Edit Properties"** button

5. **Make changes** in the dialog

6. **Click "Create Connection"** to save

### Moving a Wall Door:

1. **Click and drag the door** along the wall
2. Release to set new position

### Deleting a Wall Door:

1. Click on door to select it
2. In properties panel, click "Delete Door"

---

## Troubleshooting

### Problem: Can't click the green arrow icon

**Solutions:**
- ✅ **Make sure you click directly on the green arrows** (not the room)
- ✅ **Look for cursor change to pointer** (finger icon)
- ✅ **Check browser console** for click message
- ✅ **Try refreshing the page** (Ctrl+R or Cmd+R)
- ✅ **Click in the center of the icon** where the arrows meet

### Problem: Nothing happens when I click

**Check:**
1. Open browser console (F12)
2. Look for message: `🚪 Old-style door clicked: door-xxx`
3. If you see this message but no dialog, there's a state issue
4. If you don't see any message, the click isn't registering

### Problem: Can't find the Door button for wall-based doors

**Location:**
- Bottom toolbar
- Look for 🚪 icon
- Next to shape tools (Rectangle, Circle, etc.)
- May need to scroll toolbar if window is narrow

### Problem: Door edit dialog doesn't show up

**Try:**
1. Reload the page
2. Check if any other dialogs/panels are open
3. Look at z-index (dialog might be behind something)
4. Check browser console for errors

---

## Visual Reference

### Icon-Based Door (Current View):
```
┌─────────────┐         ┌─────────────┐
│  Weighing   │   ⇄     │  Packaging  │
│    Area     │  [🚪]   │             │
└─────────────┘         └─────────────┘
     ↑
  Click here on the green arrows!
```

### Wall-Based Door (New System):
```
┌─────────────┬─────────────┐
│  Weighing   │─[DOOR]─│ Packaging  │
│    Area     │  💙↔    │            │
└─────────────┴─────────────┘
                ↑
             Door on wall
```

---

## Quick Reference Card

| Task | Icon Doors | Wall Doors |
|------|-----------|------------|
| **Create** | Use old 3-step process | Door mode → Click wall |
| **Edit** | Click icon → Edit dialog | Click door → Properties panel → Edit |
| **Move** | Not possible | Drag along wall |
| **Delete** | Click icon → Delete button | Click door → Delete button |
| **Visual** | Floating green arrows | Colored line on wall |

---

## Recommended Workflow

For your current layout with icon-based doors:

1. ✅ **Click the green arrow icon** between Weighing Area and Packaging
2. ✅ **Wait for dialog** to open
3. ✅ **Make your changes**
4. ✅ **Click Update**

If you want to try the new Hypar-style wall doors:

1. ✅ **Click Door button (🚪)** in toolbar
2. ✅ **Look for blue dashed lines** on walls
3. ✅ **Click on a dashed line** to place a door
4. ✅ **Configure and create**

---

## Summary

**Current System (Icon Doors):**
- ✅ Fixed click detection
- ✅ Added larger hit area (25px radius)
- ✅ Added console logging for debugging
- ✅ Dialog should now open when you click

**Just click the green arrow icon and the edit dialog will open!** 🚪

If it still doesn't work after refreshing:
1. Open browser console (F12)
2. Click the icon
3. Look for `🚪 Old-style door clicked:` message
4. Share what you see in the console
