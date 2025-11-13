# AI Assistant for Layout Designer Mode

## Overview

The AI Assistant is a powerful new feature that allows users to query the Neo4j knowledge graph using natural language. The assistant automatically converts questions into Cypher queries, executes them safely against the Neo4j Aura database, and presents the results in an easy-to-understand format.

## Features

### 1. Natural Language Queries
Ask questions in plain English about your pharmaceutical facility design knowledge graph:
- "Show all production areas"
- "What areas must be adjacent to a Gowning Area?"
- "Find all Class A cleanroom areas"
- "What areas are prohibited near Weighing?"
- "Show me all utility relationships"

### 2. Direct Cypher Query Execution
For advanced users, switch to Cypher mode to write and execute custom queries:
- Full Cypher query syntax support
- Real-time query execution
- Formatted result display

### 3. Safety & Validation
- **Read-Only Queries**: Only MATCH and RETURN operations are allowed
- **Query Validation**: Blocks dangerous operations (DELETE, CREATE, SET, etc.)
- **Error Handling**: Clear error messages for invalid queries

### 4. Intelligent Query Generation
- Powered by Claude AI (Anthropic)
- Context-aware query generation
- Includes explanations of what each query does
- Optimized for pharmaceutical facility domain knowledge

## Architecture

### Backend Components

#### 1. AI Assistant Service (`/backend/src/services/aiAssistant.ts`)
- **Natural Language Processing**: Uses Claude API to convert questions to Cypher
- **Query Validation**: Ensures all queries are read-only and safe
- **Query Execution**: Executes validated queries against Neo4j
- **Result Formatting**: Converts Neo4j records to JSON objects

#### 2. API Routes (`/backend/src/routes/ai.ts`)
- `POST /api/ai/ask` - Ask a natural language question
- `POST /api/ai/execute` - Execute a Cypher query directly
- `GET /api/ai/schema` - Get database schema information
- `GET /api/ai/health` - Check AI Assistant configuration status

#### 3. Database Schema Context
The AI Assistant has built-in knowledge of:
- Node types: NodeTemplate, FunctionalArea, Diagram
- Relationship types: ADJACENT_TO, PROHIBITED_NEAR, REQUIRES_ACCESS, SHARES_UTILITY
- Categories: Production, Quality Control, Warehouse, Utilities, Personnel, Support
- Cleanroom classifications: Class A, B, C, D, Non-Classified

### Frontend Components

#### 1. AI Assistant Panel (`/frontend/src/components/AIAssistantPanel.tsx`)
- Chat-like interface for asking questions
- Mode toggle: Natural Language vs. Cypher Query
- Message history with timestamps
- Example questions for quick start
- Collapsible results display with JSON formatting

#### 2. Integration with DiagramEditor
- Toggle button in the main toolbar
- Slides in from the right side
- Does not interfere with existing panels
- Persistent state during session

## Setup & Configuration

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

The `@anthropic-ai/sdk` package is already included in dependencies.

**Frontend:**
No additional dependencies required.

### 2. Configure Environment Variables

Add the following to your backend `.env` file:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

To get an API key:
1. Sign up at https://console.anthropic.com/
2. Go to API Keys section
3. Create a new API key
4. Copy and paste into your `.env` file

### 3. Build and Run

**Backend:**
```bash
cd backend
npm run build  # Build TypeScript
npm start      # Production
# OR
npm run dev    # Development with hot reload
```

**Frontend:**
```bash
cd frontend
npm start      # Development server on port 3000
```

## Usage Guide

### Opening the AI Assistant

1. Open the application in your browser
2. Click the **"AI Assistant"** button in the top toolbar (robot icon)
3. The AI Assistant panel will slide in from the right side

### Natural Language Mode

1. Ensure "Natural Language" is selected in the mode toggle
2. Type your question in the input field
3. Click "Send" or press Enter
4. The assistant will:
   - Generate a Cypher query
   - Execute it against the database
   - Display the results with an explanation

**Example Questions:**
- "Show all production areas"
- "What areas must be adjacent to a Gowning Area?"
- "Find all Class A cleanroom areas"
- "What relationships exist for the Weighing area?"

### Cypher Query Mode

1. Click "Cypher Query" in the mode toggle
2. Write your Cypher query in the input field
3. Click "Send" to execute

**Example Queries:**
```cypher
MATCH (n:NodeTemplate) RETURN n LIMIT 10

MATCH (n:NodeTemplate)-[r:ADJACENT_TO]->(m:NodeTemplate)
WHERE r.required = true
RETURN n.name, m.name, r.reason

MATCH (n:NodeTemplate)
WHERE n.category = 'Production'
RETURN n.name, n.cleanroomClass

MATCH (n:NodeTemplate)-[r:PROHIBITED_NEAR]->(m:NodeTemplate)
RETURN n.name, m.name, r.reason
```

### Understanding Results

Results are displayed as JSON objects with:
- Node properties (id, name, category, cleanroomClass, etc.)
- Relationship properties (type, required, reason, etc.)
- Labels and metadata

## API Reference

### POST /api/ai/ask

Ask a natural language question about the knowledge graph.

**Request Body:**
```json
{
  "question": "Show all production areas"
}
```

**Response:**
```json
{
  "success": true,
  "question": "Show all production areas",
  "query": "MATCH (n:NodeTemplate) WHERE n.category = 'Production' RETURN n LIMIT 100",
  "explanation": "Finds all nodes with Production category",
  "results": [...],
  "resultCount": 5
}
```

### POST /api/ai/execute

Execute a Cypher query directly.

**Request Body:**
```json
{
  "query": "MATCH (n:NodeTemplate) RETURN n LIMIT 10"
}
```

**Response:**
```json
{
  "success": true,
  "query": "MATCH (n:NodeTemplate) RETURN n LIMIT 10",
  "explanation": "User-provided query executed successfully",
  "results": [...],
  "resultCount": 10
}
```

### GET /api/ai/schema

Get the database schema information.

**Response:**
```json
{
  "success": true,
  "schema": "Neo4j Database Schema for Pharmaceutical Facility Design:\n\nNODE TYPES:..."
}
```

### GET /api/ai/health

Check if the AI Assistant is properly configured.

**Response:**
```json
{
  "success": true,
  "configured": true,
  "status": "AI Assistant is ready"
}
```

## Security Considerations

### Query Safety

The AI Assistant implements multiple layers of security:

1. **Whitelist Approach**: Only MATCH and RETURN clauses are allowed
2. **Blacklist Validation**: Blocks dangerous operations:
   - DELETE
   - DETACH DELETE
   - REMOVE
   - SET
   - CREATE
   - MERGE
   - DROP
   - ALTER
   - CALL {}

3. **Read-Only Operations**: All queries are strictly read-only

### API Key Security

- Store API keys in environment variables only
- Never commit `.env` files to version control
- Use different API keys for development and production
- Regularly rotate API keys
- Monitor API usage in Anthropic console

## Troubleshooting

### AI Assistant Not Configured

**Symptom:** Yellow warning banner: "AI Assistant is not configured"

**Solution:**
1. Check that `ANTHROPIC_API_KEY` is set in backend `.env`
2. Restart the backend server
3. Verify the API key is valid in Anthropic console

### Connection Errors

**Symptom:** "Failed to connect to AI Assistant"

**Solution:**
1. Check that the backend server is running
2. Verify `http://localhost:5000` is accessible
3. Check browser console for CORS errors
4. Ensure Neo4j database is connected

### Query Validation Errors

**Symptom:** "Query validation failed: Query contains disallowed operation"

**Solution:**
1. Remove any write operations (CREATE, DELETE, SET, etc.)
2. Ensure query has both MATCH and RETURN clauses
3. Switch to Natural Language mode and let Claude generate the query

### No Results Found

**Symptom:** Query executes but returns 0 results

**Solution:**
1. Check that your Neo4j database has data
2. Run `/api/nodes/initialize` to populate with templates
3. Verify node labels match (NodeTemplate vs FunctionalArea)
4. Check property names match the schema

## Example Use Cases

### 1. Exploring Compliance Requirements

**Question:** "What areas must be adjacent to a Gowning Area?"

**Generated Query:**
```cypher
MATCH (n:NodeTemplate {name: 'Gowning Area'})-[r:ADJACENT_TO {required: true}]->(m:NodeTemplate)
RETURN n.name, m.name, r.reason
LIMIT 100
```

**Use Case:** Understanding GMP compliance requirements for facility layout

### 2. Finding Cleanroom Areas

**Question:** "Find all Class A cleanroom areas"

**Generated Query:**
```cypher
MATCH (n:NodeTemplate)
WHERE n.cleanroomClass = 'Class A'
RETURN n.name, n.category, n.cleanroomClass
LIMIT 100
```

**Use Case:** Identifying high-grade cleanroom spaces for sterile operations

### 3. Identifying Prohibited Relationships

**Question:** "What areas are prohibited near Weighing?"

**Generated Query:**
```cypher
MATCH (n:NodeTemplate {name: 'Weighing'})-[r:PROHIBITED_NEAR]->(m:NodeTemplate)
RETURN n.name, m.name, r.reason
LIMIT 100
```

**Use Case:** Avoiding cross-contamination and regulatory violations

### 4. Utility Sharing Analysis

**Question:** "Show me all utility relationships"

**Generated Query:**
```cypher
MATCH (n:NodeTemplate)-[r:SHARES_UTILITY]->(m:NodeTemplate)
RETURN n.name, m.name, r.utilityType
LIMIT 100
```

**Use Case:** Optimizing infrastructure design and utility distribution

## Future Enhancements

Potential improvements for future releases:

1. **Query History**: Save and reuse previous queries
2. **Favorites**: Bookmark frequently used queries
3. **Export Results**: Download results as CSV or JSON
4. **Visualization**: Display graph results visually on the canvas
5. **Query Builder**: Visual query builder for complex queries
6. **Suggestions**: AI-powered query suggestions based on context
7. **Multi-Query**: Execute multiple queries in sequence
8. **Query Templates**: Pre-built query templates for common tasks
9. **Result Filtering**: Filter and sort results in the UI
10. **Collaboration**: Share queries and results with team members

## Technical Details

### Technology Stack

- **Backend Framework**: Express.js + TypeScript
- **AI Model**: Claude 3.5 Sonnet (Anthropic)
- **Database**: Neo4j Aura
- **Database Driver**: neo4j-driver v5.28+
- **Frontend Framework**: React + TypeScript
- **UI Components**: Material-UI
- **Styling**: CSS Modules

### Performance Considerations

- **Query Limits**: Default LIMIT 100 for safety
- **Session Management**: Neo4j sessions are properly closed after each query
- **Connection Pooling**: Uses Neo4j driver connection pooling
- **Response Time**: Typical query execution: 1-3 seconds
- **AI Response Time**: Claude API typically responds in 2-5 seconds

### Error Handling

All errors are caught and returned with descriptive messages:

```typescript
{
  "error": "Query validation failed: Query contains disallowed operation: DELETE",
  "details": "..."
}
```

## Support & Contribution

For issues, questions, or contributions:

1. Check existing documentation
2. Review troubleshooting section
3. Examine browser console for errors
4. Check backend logs for detailed error messages
5. Create an issue in the repository

## License

This feature is part of the Pharmaceutical Facility Design Copilot project and follows the same license terms.

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
**Author**: Claude AI Assistant Implementation Team
