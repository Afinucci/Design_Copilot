# Suggested Commands

## Running the Application

### Full Stack Development
```bash
# From project root - runs both frontend and backend concurrently
npm start
```

### Frontend Only
```bash
cd frontend
npm start         # Development server on port 3000
npm run build     # Production build
npm test          # Run tests
```

### Backend Only
```bash
cd backend
npm run dev       # Development with nodemon hot reload
npm run build     # Compile TypeScript to JavaScript
npm start         # Production server
```

## Installation Commands
```bash
# Install all dependencies (from root)
npm run install:all

# Or manually:
cd backend && npm install
cd ../frontend && npm install
```

## Database Initialization
```bash
# Start the backend server first
cd backend && npm run dev

# Then initialize pharmaceutical templates
curl -X POST http://localhost:5000/api/nodes/initialize
```

## System Utilities (Linux)
- `git` - Version control
- `ls` - List directory contents
- `cd` - Change directory
- `grep` / `rg` (ripgrep) - Search files
- `find` - Find files/directories

## Build Commands
```bash
# Build both frontend and backend
npm run build

# Or separately:
npm run build:backend
npm run build:frontend
```

## Testing Commands
- Frontend: `cd frontend && npm test`
- Backend: No tests configured yet (shows error message)

## Linting/Formatting
- Frontend uses React ESLint config (configured in package.json)
- No specific linting commands configured yet

## Environment Setup
```bash
# Backend configuration
cd backend
cp .env.example .env
# Edit .env with Neo4j credentials
```