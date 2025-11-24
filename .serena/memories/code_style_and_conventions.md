# Code Style and Conventions

## TypeScript Usage
- **Strict TypeScript** used throughout the project
- Type definitions in `shared/types/index.ts` for common interfaces
- Component props are strongly typed with interfaces
- Avoid `any` types; use proper type definitions

## React Patterns
- **Functional Components** with hooks (no class components)
- **Custom Hooks** for reusable logic (e.g., `useGhostSuggestions`)
- **Material-UI** components for consistent UI
- **ReactFlow** for diagram functionality

## Naming Conventions
- **Components**: PascalCase (e.g., `DiagramEditor`, `CustomNode`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useGhostSuggestions`)
- **Files**: Component files match component names
- **Constants**: UPPER_SNAKE_CASE for configuration constants
- **Functions**: camelCase for methods and handlers
- **Event Handlers**: prefix with 'handle' (e.g., `handleNodeClick`)

## File Organization
- Components grouped by feature in `components/` directory
- Services for API calls in `services/` directory
- Custom hooks in `hooks/` directory
- Type definitions centralized in `types/` directories

## State Management
- React hooks (useState, useEffect, useCallback, useMemo)
- Props drilling for component communication
- No external state management library (Redux, MobX, etc.)

## API Communication
- Centralized API service (`apiService`) for all backend calls
- RESTful endpoints with consistent naming
- Error handling in try-catch blocks
- Type-safe request/response interfaces

## Comments and Documentation
- Comments should be minimal and explain "why" not "what"
- Complex logic should have brief explanatory comments
- Console.log statements used for debugging (especially ghost functionality)
- No JSDoc or extensive documentation comments

## CSS/Styling
- Material-UI theme system
- Inline styles using sx prop
- CSS modules for component-specific styles
- Consistent spacing using MUI theme spacing

## Best Practices
- Memoize expensive computations with useMemo
- Use useCallback for event handlers to prevent rerenders
- Clean up effects with return statements in useEffect
- Handle loading and error states appropriately
- Validate props and handle edge cases