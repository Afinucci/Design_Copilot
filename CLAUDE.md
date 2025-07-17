# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Pharmaceutical Facility Design Copilot is a specialized web application for designing adjacency diagrams for pharmaceutical facilities. It provides intelligent compliance checking and suggestions based on GMP (Good Manufacturing Practice) requirements and cleanroom standards.

## Architecture

### Frontend (React + TypeScript)
- **Main Component**: `DiagramEditor.tsx` - Central editing interface with dual-mode operation
- **Canvas System**: ReactFlow-based drag-and-drop interface for facility layout design
- **Node System**: Custom pharmaceutical functional area nodes with cleanroom classification
- **Validation System**: Real-time GMP compliance checking and violation highlighting
- **Two Operation Modes**:
  - **Creation Mode**: Design new facilities using template library
  - **Exploration Mode**: Query and visualize existing knowledge graph data

### Backend (Node.js + Express + TypeScript)
- **Database**: Neo4j graph database for storing spatial relationships and compliance rules
- **API Routes**: RESTful endpoints for diagrams, nodes, and validation
- **Singleton Pattern**: `Neo4jService` for database connection management
- **Health Check**: `/health` endpoint for database connectivity status

### Database Schema (Neo4j)
- **Node Types**: `NodeTemplate`, `FunctionalArea`, `Diagram`
- **Relationship Types**: `ADJACENT_TO`, `PROHIBITED_NEAR`, `REQUIRES_ACCESS`, `SHARES_UTILITY`
- **Graph Structure**: Pharmaceutical facility relationships with GMP compliance rules

## Development Commands

### Backend Development
```bash
cd backend
npm run dev     # Start with nodemon hot reload
npm run build   # Compile TypeScript to JavaScript
npm start       # Start production server
```

### Frontend Development
```bash
cd frontend
npm start       # Start development server (port 3000)
npm run build   # Build for production
npm test        # Run React tests
```

### Database Setup
```bash
# Initialize pharmaceutical templates
curl -X POST http://localhost:5000/api/nodes/initialize
```

## Key Domain Concepts

### Pharmaceutical Functional Areas
- **Production**: Weighing, Granulation, Compression, Coating, Packaging
- **Quality Control**: Analytical Lab, Microbiology Lab, Stability Chamber
- **Warehouse**: Raw Materials, Finished Goods, Quarantine, Cold Storage
- **Utilities**: HVAC, Purified Water, Compressed Air, Electrical
- **Personnel**: Gowning Area, Break Room, Offices, Training
- **Support**: Waste Disposal, Maintenance, Receiving, Shipping

### Cleanroom Classifications
- **Class A-D**: Cleanroom air quality standards
- **Transitions**: Compliance rules for cleanroom-to-cleanroom connections
- **Contamination Control**: Automatic cross-contamination risk detection

### Spatial Relationships
- **Adjacency Requirements**: Must be positioned next to each other
- **Prohibition Rules**: Cannot be placed near each other
- **Access Control**: Controlled entry/exit requirements
- **Utility Sharing**: Shared infrastructure connections

## API Endpoints

### Node Management
- `GET /api/nodes/templates` - Get all pharmaceutical area templates
- `GET /api/nodes/category/:category` - Get templates by category
- `POST /api/nodes/initialize` - Initialize database with pharmaceutical templates

### Diagram Operations
- `GET /api/diagrams` - List all saved diagrams
- `POST /api/diagrams` - Create new diagram
- `PUT /api/diagrams/:id` - Update existing diagram
- `DELETE /api/diagrams/:id` - Delete diagram

### Validation
- `POST /api/validation` - Validate diagram against GMP compliance
- `GET /api/validation/requirements/:nodeType` - Get compliance requirements for area type

## File Structure Patterns

### Component Organization
- `DiagramEditor.tsx` - Main editor with dual-mode operation
- `NodePalette.tsx` - Draggable template/existing node library
- `PropertyPanel.tsx` - Selected node property editing
- `ValidationPanel.tsx` - Compliance violation display
- `CustomNode.tsx` - Pharmaceutical area node rendering

### Type Definitions
- `shared/types/index.ts` - Core interfaces shared between frontend/backend
- Key types: `FunctionalArea`, `SpatialRelationship`, `Diagram`, `ValidationResult`

### Backend Structure
- `routes/` - API endpoint handlers
- `models/` - Data model definitions
- `config/database.ts` - Neo4j connection singleton
- `index.ts` - Express server setup with middleware

## Development Patterns

### State Management
- ReactFlow hooks for node/edge state management
- Custom hooks for API service integration
- Dual-mode operation switching (Creation vs Exploration)

### Error Handling
- Offline mode fallback when Neo4j unavailable
- Connection status monitoring with health checks
- Graceful degradation with local storage backup

### Validation Flow
1. Extract functional areas and relationships from canvas
2. Send to validation service with pharmaceutical context
3. Display violations with color-coded severity
4. Provide suggestions for compliance improvements

## Testing Strategy

### Unit Tests
- React component rendering and interaction
- API service method functionality
- Validation logic accuracy

### Integration Tests
- Full diagram creation and validation workflow
- Database connectivity and data persistence
- Cross-component communication

### Business Logic Tests
- GMP compliance rule validation
- Spatial relationship constraint checking
- Pharmaceutical area classification rules

## Environment Configuration

### Backend Environment Variables
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
PORT=5000
NODE_ENV=development
```

### Database Requirements
- Neo4j 5.x database instance
- Graph data model for pharmaceutical relationships
- Initialized with pharmaceutical area templates

## Common Issues

### Connection Problems
- Check Neo4j database connectivity via `/health` endpoint
- Verify environment variables are properly configured
- Application runs in offline mode with local fallback data

### Validation Issues
- Ensure all functional areas have required properties
- Check spatial relationships are properly defined
- Verify cleanroom classification compatibility

### Performance Considerations
- ReactFlow optimization for large diagrams
- Neo4j query optimization for complex relationships
- Memory management for real-time validation

## Pharmaceutical Compliance Notes

### GMP Requirements
- Good Manufacturing Practice validation rules
- Cleanroom air quality standards (Class A-D)
- Personnel and material flow optimization
- Cross-contamination prevention

### Industry Standards
- FDA pharmaceutical facility guidelines
- European EMA manufacturing requirements
- ICH quality guidelines implementation
- Risk-based approach to facility design

This application serves pharmaceutical engineers and regulatory professionals who require precise compliance checking and evidence-based facility design recommendations.