# Ghost Suggestion System Overview

## Purpose
The ghost suggestion system provides intelligent placement recommendations in "guided" mode by showing semi-transparent "ghost" nodes and edges on the canvas. These suggestions come from the Neo4j knowledge graph and help users build compliant pharmaceutical facility layouts.

## Key Components

### Frontend
1. **useGhostSuggestions Hook** (`frontend/src/hooks/useGhostSuggestions.ts`)
   - Central state management for ghost suggestions
   - Handles API calls to fetch suggestions
   - Manages ghost node acceptance/dismissal
   - Auto-enables in guided mode

2. **GhostNode Component** (`frontend/src/components/GhostNode.tsx`)
   - Renders semi-transparent nodes with category colors
   - Currently has debug styling (bright magenta for visibility testing)
   - Handles click events to materialize nodes
   - Shows confidence-based opacity

3. **GhostEdge Component** (`frontend/src/components/GhostEdge.tsx`)
   - Renders connections between trigger node and ghost nodes
   - Shows relationship types

4. **DiagramEditor Integration**
   - Computes `ghostNodes` and `ghostEdges` in useMemo
   - Renders them in the ReactFlow canvas
   - Handles node selection to trigger suggestions

### Backend
- `/api/nodes/ghost-suggestions` endpoint
- Queries Neo4j for related nodes based on trigger node
- Returns suggestions with confidence scores and relationships

## Current Issues
1. Ghost nodes may not be visible on canvas despite being in state
2. Debug logging shows nodes are created but not rendered
3. Bright magenta debug color suggests rendering issue
4. Need to verify ReactFlow nodeTypes includes 'ghost'

## How It Should Work
1. User selects a node in guided mode
2. System fetches suggestions from knowledge graph
3. Ghost nodes appear around selected node
4. User clicks ghost to materialize it
5. New suggestions appear for the newly created node (recursive exploration)