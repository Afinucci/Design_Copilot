# Pharmaceutical Facility Design Copilot

A comprehensive web application for designing adjacency diagrams for pharmaceutical facilities, with built-in compliance checking and intelligent suggestions based on industry standards and GMP requirements.

## Features

### Core Functionality
- **Interactive Canvas**: Drag-and-drop interface for creating facility layouts
- **Node Palette**: Searchable library of pharmaceutical functional areas
- **Compliance Validation**: Real-time checking against GMP and cleanroom requirements
- **Intelligent Suggestions**: AI-powered placement recommendations based on industry best practices
- **Visual Feedback**: Color-coded relationships, violations, and suggestions
- **Save/Load**: Persistent diagram storage with Neo4j

### Pharmaceutical Domain Features
- **GMP Compliance**: Built-in validation for Good Manufacturing Practice requirements
- **Cleanroom Classifications**: Support for Class A-D cleanroom transitions
- **Spatial Relationships**: Adjacency, prohibition, access, and utility sharing rules
- **Flow Optimization**: Material and personnel flow visualization
- **Contamination Control**: Automatic checking for cross-contamination risks

## Technology Stack

### Frontend
- React 18 with TypeScript
- Material-UI for components
- React Flow for diagram canvas
- Responsive design

### Backend
- Node.js with Express
- TypeScript
- Neo4j graph database
- RESTful API design

### Database
- Neo4j for storing spatial relationships and compliance rules
- Graph-based data model for complex pharmaceutical facility relationships

## Project Structure

```
Design_Copilot/
├── frontend/                  # React TypeScript frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   ├── types/           # TypeScript interfaces
│   │   └── hooks/           # Custom React hooks
│   └── package.json
├── backend/                   # Node.js backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   └── config/          # Configuration
│   └── package.json
└── shared/                    # Shared types and utilities
    └── types/
```

## Installation

### Prerequisites
- Node.js 18+
- Neo4j database (local or cloud instance)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Design_Copilot
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Backend configuration
   cd backend
   cp .env.example .env
   # Edit .env with your Neo4j credentials
   ```

4. **Initialize the database**
   ```bash
   # Start the backend server
   cd backend
   npm run dev

   # Initialize with pharmaceutical templates
   curl -X POST http://localhost:5000/api/nodes/initialize
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Start backend
   cd backend
   npm run dev

   # Terminal 2: Start frontend
   cd frontend
   npm start
   ```

## Usage

### Creating a Diagram

1. **Add Functional Areas**: Drag items from the node palette onto the canvas
2. **Position Areas**: Arrange functional areas according to your facility layout
3. **Connect Areas**: Draw connections between related areas
4. **Validate Design**: Click "Validate" to check compliance
5. **Save Diagram**: Save your completed design

### Validation Features

- **Error Detection**: Identifies critical compliance violations
- **Warning System**: Highlights potential issues and recommendations
- **Suggestion Engine**: Provides intelligent placement suggestions
- **Real-time Feedback**: Instant validation as you design

### Pharmaceutical Areas Included

#### Production Areas
- Weighing Area
- Granulation
- Compression
- Coating
- Packaging

#### Quality Control
- Analytical Lab
- Microbiology Lab
- Stability Chamber
- Release Testing

#### Warehouse
- Raw Materials Storage
- Finished Goods Storage
- Quarantine Storage
- Cold Storage

#### Utilities
- HVAC Room
- Purified Water System
- Compressed Air System
- Electrical Room

#### Personnel Areas
- Gowning Area
- Break Room
- Offices
- Training Room

#### Support Areas
- Waste Disposal
- Maintenance Workshop
- Receiving Area
- Shipping Area

## API Endpoints

### Node Management
- `GET /api/nodes/templates` - Get all node templates
- `GET /api/nodes/category/:category` - Get nodes by category
- `POST /api/nodes/initialize` - Initialize database with templates

### Diagram Operations
- `GET /api/diagrams` - List all diagrams
- `GET /api/diagrams/:id` - Get specific diagram
- `POST /api/diagrams` - Create new diagram
- `PUT /api/diagrams/:id` - Update diagram
- `DELETE /api/diagrams/:id` - Delete diagram

### Validation
- `POST /api/validation` - Validate diagram compliance
- `GET /api/validation/requirements/:nodeType` - Get compliance requirements

## Development

### Backend Development
```bash
cd backend
npm run dev     # Start with hot reload
npm run build   # Build for production
npm start       # Start production server
```

### Frontend Development
```bash
cd frontend
npm start       # Start development server
npm run build   # Build for production
npm test        # Run tests
```

### Database Schema

The Neo4j database uses the following node types:
- `NodeTemplate`: Predefined functional area templates
- `FunctionalArea`: Actual functional areas in diagrams
- `Diagram`: Saved diagram metadata

Relationship types:
- `ADJACENT_TO`: Spatial adjacency requirements
- `PROHIBITED_NEAR`: Separation requirements
- `REQUIRES_ACCESS`: Access control relationships
- `SHARES_UTILITY`: Utility sharing connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the GitHub issues page
- Review the API documentation
- Contact the development team

## Acknowledgments

Built with pharmaceutical industry standards and GMP compliance requirements in mind. Thanks to the pharmaceutical engineering community for domain expertise and best practices.