# Task Completion Checklist

When completing a coding task in this project, ensure you:

## 1. Code Quality
- [ ] Follow TypeScript best practices (no `any` types)
- [ ] Use proper type definitions from shared types
- [ ] Follow existing code patterns and conventions
- [ ] Remove or comment debug console.log statements

## 2. Testing
- [ ] Test the feature manually in the browser
- [ ] Verify both frontend and backend changes work together
- [ ] Check for console errors
- [ ] Test edge cases and error scenarios

## 3. Neo4j Integration
- [ ] Ensure database queries are optimized
- [ ] Handle offline mode gracefully
- [ ] Verify data persistence works correctly

## 4. ReactFlow Specific
- [ ] Ensure nodes and edges render correctly
- [ ] Verify drag-and-drop functionality
- [ ] Check connection validation works
- [ ] Test canvas interactions (zoom, pan, select)

## 5. Documentation
- [ ] Update type definitions if adding new interfaces
- [ ] Add brief comments for complex logic
- [ ] Update API documentation if endpoints change

## 6. Performance
- [ ] Check for unnecessary re-renders
- [ ] Optimize large data operations
- [ ] Ensure smooth UI interactions

## 7. Error Handling
- [ ] Add proper error boundaries where needed
- [ ] Show user-friendly error messages
- [ ] Log errors appropriately

## 8. Before Committing
- [ ] Run the application and test all changes
- [ ] Check browser console for errors/warnings
- [ ] Verify both dev modes work (frontend + backend)
- [ ] Clean up temporary debug code

Note: Currently no automated linting or formatting commands are configured, so manual code review is important.