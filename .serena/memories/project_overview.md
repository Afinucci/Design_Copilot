# Pharmaceutical Facility Design Copilot

## Project Purpose
The Design Copilot is a specialized web application for designing adjacency diagrams for pharmaceutical facilities. It provides intelligent compliance checking and suggestions based on GMP (Good Manufacturing Practice) requirements and cleanroom standards.

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Material-UI** for UI components
- **ReactFlow** for the diagram canvas and node/edge visualization
- **Craco** for configuration overrides

### Backend
- **Node.js** with Express 5
- **TypeScript** for type safety
- **Neo4j** graph database for storing spatial relationships and compliance rules
- **Cors, Helmet, Morgan** for middleware

### Shared
- Common TypeScript types between frontend and backend

## Project Structure
```
Design_Copilot/
├── frontend/       # React TypeScript frontend
├── backend/        # Node.js Express backend
└── shared/         # Shared types and utilities
```

## Key Features
- Interactive drag-and-drop canvas for facility layout design
- Node palette with searchable pharmaceutical functional areas
- Real-time GMP compliance validation
- Ghost suggestions for intelligent placement recommendations
- Visual feedback with color-coded relationships and violations
- Save/load diagrams with Neo4j persistence
- Two operation modes:
  - **Creation Mode**: Design new facilities using template library
  - **Exploration/Guided Mode**: Query and visualize existing knowledge graph data with ghost suggestions

## Domain Focus
- Pharmaceutical facility design
- GMP compliance checking
- Cleanroom classifications (Class A-D)
- Spatial relationships (adjacency, prohibition, access, utility sharing)
- Material and personnel flow optimization
- Cross-contamination risk detection