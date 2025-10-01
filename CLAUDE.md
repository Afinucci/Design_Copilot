# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Pharmaceutical Facility Design Copilot

## Project Overview

A React/Node.js web application for designing GMP-compliant pharmaceutical facility layouts. The system uses Neo4j to store design knowledge (room types, adjacency rules, flow patterns) as reusable templates, enabling users to create validated facility adjacency diagrams with real-time compliance checking.

## Tech Stack

- **Frontend**: React 19 + TypeScript, Material-UI, ReactFlow (diagram canvas)
- **Backend**: Node.js + Express + TypeScript
- **Database**: Neo4j Aura (graph database for design logic)
- **Architecture**: Monorepo with workspace structure

## Development Commands

### Running the Application

```bash
# Start both frontend and backend concurrently (from root)
npm start

# Or start individually:
npm run start:backend    # Backend on port 5000
npm run start:frontend   # Frontend on port 3000

# Backend only (from backend/)
cd backend && npm run dev

# Frontend only (from frontend/)
cd frontend && npm start
```

### Building

```bash
# Build both frontend and backend
npm run build

# Build backend only (TypeScript compilation)
cd backend && npm run build

# Build frontend only (production build)
cd frontend && npm run build
```

### Testing

```bash
# Frontend tests
cd frontend && npm test

# Playwright E2E tests (from root)
npx playwright test

# Specific test suites
npx playwright test tests/constraint-system.spec.ts
npx playwright test frontend/tests/polygon.spec.ts
```

### Installation

```bash
# Install all dependencies (root + workspaces)
npm run install:all

# Or individually
npm install && cd backend && npm install && cd ../frontend && npm install
```

### Environment Setup

Backend requires `.env` file (see [backend/.env.example](backend/.env.example)):
```
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
PORT=5000
NODE_ENV=development
```

## Architecture Overview

### Data Flow Architecture

The application uses a **dual-mode data architecture**:

1. **Static Templates Mode** (Default): Uses in-memory `StaticNodeTemplatesService` with 28 pre-defined pharmaceutical room templates across 6 categories (Production, Quality Control, Warehouse, Utilities, Personnel, Support). No Neo4j connection required.

2. **Knowledge Graph Mode**: Connects to Neo4j to store/retrieve design patterns, adjacency rules, and learned relationships from saved diagrams. Used for ghost suggestions and constraint enforcement.

### Key Architectural Patterns

**Backend Services Layer**:
- `staticNodeTemplatesService.ts` - Singleton managing in-memory room templates
- `ghostSuggestions.ts` - AI-powered placement recommendations based on Neo4j patterns
- `constraintEnforcement.ts` - Real-time validation of spatial constraints
- `adjacencyValidation.ts` - GMP compliance checking
- `relationshipPositioning.ts` - Optimal node positioning algorithms

**Frontend Component Hierarchy**:
```
App.tsx (Theme, Mode Management)
└── DiagramEditor.tsx (Main canvas orchestrator)
    ├── NodePalette.tsx (Draggable room templates)
    ├── SnapCanvas.tsx (ReactFlow wrapper with snap-to-grid)
    ├── PropertyPanel.tsx (Node/relationship editing)
    ├── ValidationPanel.tsx (GMP compliance feedback)
    ├── KnowledgeGraphPanel.tsx (Neo4j connectivity)
    ├── CustomShapeNode.tsx (Freeform shapes with Neo4j assignment)
    ├── MultiRelationshipEdge.tsx (Multiple connections between nodes)
    └── GhostNode.tsx / GhostEdge.tsx (AI suggestions)
```

### Application Modes

The app supports 3 modes (controlled by `AppMode` type):

1. **creation** - Build diagrams from scratch using static templates
2. **exploration** - View and interact with Neo4j knowledge graph patterns
3. **layoutDesigner** - Advanced freeform shape drawing with Neo4j node assignment

Mode switching affects:
- Data source (templates vs. knowledge graph)
- Available features (ghost suggestions, constraints)
- UI elements (palette visibility, toolbar options)

### Key Data Models

**Shared Types** ([shared/types/index.ts](shared/types/index.ts)):
- `FunctionalArea` - Represents a pharmaceutical room/area
- `SpatialRelationship` - Adjacency rules between areas (ADJACENT_TO, REQUIRES_ACCESS, PROHIBITED_NEAR, MATERIAL_FLOW, PERSONNEL_FLOW, etc.)
- `NodeTemplate` - Template definition for room types

**Frontend Extensions** ([frontend/src/types/index.ts](frontend/src/types/index.ts)):
- Extends shared types with React-specific properties
- `GhostSuggestion` / `GhostState` - AI placement suggestions
- `CustomShapeData` - Freeform shapes with optional Neo4j node assignment
- `NodeIdUtils` - Utilities for managing node ID prefixes (handles "node-node-" double-prefix edge cases)

### Neo4j Integration Points

**Database Connection**:
- Singleton pattern in [backend/src/config/database.ts](backend/src/config/database.ts)
- Auto-retry with configurable timeouts for Neo4j Aura
- Connection verification on startup with fallback to offline mode

**Key Neo4j Queries** (in route handlers):
- Relationship discovery: Find all adjacent/prohibited connections for a node
- Ghost suggestions: Query historical patterns to suggest next nodes
- Constraint queries: Validate cleanroom transitions, flow rules
- Learning: Persist user-created diagrams back to Neo4j as patterns

**API Endpoints**:
```
/api/nodes/templates              GET    - Static templates
/api/nodes/:id/relationships      GET    - Neo4j relationships
/api/nodes/:id/suggestions        GET    - Ghost suggestions
/api/knowledge-graph/persist      POST   - Save diagram to Neo4j
/api/validation                   POST   - Validate diagram compliance
/api/relationships                POST   - Create/update relationships
/api/diagrams                     GET/POST/PUT/DELETE - CRUD operations
```

## Critical Implementation Details

### Node ID Management

The codebase has **node ID normalization utilities** ([frontend/src/types/index.ts:338-400](frontend/src/types/index.ts)) to handle edge cases:
- Prevents double-prefixing ("node-node-coating-123-456")
- Extracts base names from various ID formats
- Always use `NodeIdUtils.generateNodeId()` when creating nodes

### Ghost Suggestions System

**Flow**:
1. User places a node on canvas
2. `useGhostSuggestions` hook triggers debounced API call
3. Backend queries Neo4j for frequently adjacent nodes
4. Frontend renders semi-transparent "ghost" nodes with confidence scores
5. User clicks ghost to materialize it with pre-configured relationships

**Key Files**:
- [frontend/src/hooks/useGhostSuggestions.ts](frontend/src/hooks/useGhostSuggestions.ts)
- [backend/src/services/ghostSuggestions.ts](backend/src/services/ghostSuggestions.ts)
- [backend/src/routes/nodes.ts](backend/src/routes/nodes.ts) (`/kg/ghost-suggestions` endpoint)

### Constraint Enforcement

When Neo4j node is assigned to a custom shape:
- `constraintEnforcement.ts` validates all Neo4j relationships
- Checks for CANNOT_CONNECT_TO rules
- Enforces cleanroom class transitions (A→B→C→D progression)
- Shows real-time feedback via `ConstraintFeedback.tsx`

### Multi-Relationship Edges

Nodes can have **multiple simultaneous relationships** (e.g., ADJACENT_TO + MATERIAL_FLOW):
- Rendered using `MultiRelationshipEdge.tsx` with stacked icons
- Each relationship has priority, type, reason
- Inline editing via `InlineRelationshipEditDialog.tsx`

### Shape Drawing System

**Layout Designer Mode** features:
- Freeform polygon/shape drawing on canvas
- Shape templates (L-shape, U-shape, T-shape, etc.)
- Resize handles with 8-point manipulation
- **Neo4j Node Assignment**: Shapes can be linked to Neo4j functional areas, inheriting relationships and constraints
- See [frontend/src/components/LayoutDesigner/](frontend/src/components/LayoutDesigner/)

## Common Development Patterns

### Adding a New Node Template

Edit [backend/src/services/staticNodeTemplatesService.ts](backend/src/services/staticNodeTemplatesService.ts):
```typescript
private readonly templates: NodeTemplate[] = [
  {
    id: 'my-new-area',
    name: 'My New Area',
    category: 'Production',
    cleanroomClass: 'C',
    color: '#3498db',
    defaultSize: { width: 150, height: 100 }
  },
  // ... existing templates
];
```

No database migration needed - templates are in-memory.

### Adding a New Relationship Type

1. Update type in [shared/types/index.ts](shared/types/index.ts):
```typescript
export interface SpatialRelationship {
  type: 'ADJACENT_TO' | 'NEW_TYPE' | ...;
  // ...
}
```

2. Add validation logic in [backend/src/services/adjacencyValidation.ts](backend/src/services/adjacencyValidation.ts)

3. Add visual representation in [frontend/src/components/MultiRelationshipEdge.tsx](frontend/src/components/MultiRelationshipEdge.tsx)

### Adding Neo4j Queries

Use the Neo4j service singleton:
```typescript
import Neo4jService from '../config/database';

const neo4jService = Neo4jService.getInstance();
const session = neo4jService.getSession();

try {
  const result = await session.run(
    'MATCH (n:FunctionalArea {id: $id}) RETURN n',
    { id: nodeId }
  );
  // Process results
} finally {
  await session.close();
}
```

Always close sessions in finally blocks.

## Testing Strategy

- **Frontend Unit Tests**: React Testing Library for components
- **E2E Tests**: Playwright for full user workflows
- **Shape Drawing Tests**: Specialized Playwright tests in `frontend/tests/` for polygon collision, L-shapes, triangles

## Performance Considerations

- **Query Caching**: [backend/src/services/queryCache.ts](backend/src/services/queryCache.ts) caches Neo4j results
- **Debounced Ghost Suggestions**: 500ms delay to avoid excessive API calls
- **Static Templates**: In-memory service avoids database overhead for common operations
- **Viewport Optimization**: ReactFlow only renders visible nodes

## Deployment Notes

- Backend uses environment variables for Neo4j connection
- Frontend proxies API requests to backend (port 3000 → 5000)
- Neo4j Aura requires `neo4j+s://` URI scheme (TLS enabled)
- Build artifacts: `backend/dist/` and `frontend/build/`

## GMP Pharmaceutical Context

The application is **domain-specific** for pharmaceutical facility design:
- Cleanroom classifications (Class A/B/C/D) with validation rules
- Material flow vs. personnel flow separation
- Contamination control (PROHIBITED_NEAR relationships)
- Equipment rooms, gowning areas, airlocks, waste disposal
- Regulatory compliance checking (GMP, cleanroom standards)

When adding features, consider pharmaceutical engineering requirements and GMP best practices.