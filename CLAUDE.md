# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Pharmaceutical Facility Design Copilot

## Project Overview

A sophisticated web application for designing GMP-compliant pharmaceutical manufacturing facility layouts using a logic-based approach. The system stores pharmaceutical design knowledge as reusable templates in Neo4j, which guide users in creating compliant facility adjacency diagrams.

## Core Concept

Instead of storing individual facility layouts in a graph database, this system uses Neo4j to store the **design logic and rules** that govern how pharmaceutical facilities should be laid out. This creates a knowledge base of pharmaceutical design patterns that can be reused across multiple projects.

## Key Features

### 1. Logic Template Management
- Create and store pharmaceutical design logic as graph-based templates
- Define room requirements, adjacency rules, and flow patterns
- Support for various product types (mRNA vaccines, monoclonal antibodies, oral solids, etc.)
- Version control for regulatory compliance

### 2. Interactive Diagram Editor
- Drag-and-drop interface for room placement
- Real-time validation against selected logic templates
- Visual connection system showing material/personnel flows
- Room property editing (cleanroom grades, pressure differentials, etc.)

### 3. Reference Library
- Browse pre-built logic templates for common facility types
- Visual previews of standard layouts
- One-click loading of templates for new projects

### 4. Design Wizard
- Step-by-step guidance for inexperienced users
- Automated layout generation based on requirements
- Questions about facility type, product type, capacity, etc.

## Technical Architecture

### Database Design

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Neo4j Aura    │     │   PostgreSQL    │     │   S3/Blob       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Logic Templates │     │ Facility        │     │ Version History │
│ Room Types      │     │ Diagrams        │     │ Exports         │
│ Adjacency Rules │     │ User Management │     │ Documents       │
│ Flow Patterns   │     │ Audit Trails    │     │ Attachments     │
│ Compliance      │     │ Project Data    │     └─────────────────┘
└─────────────────┘     └─────────────────┘
```

### Neo4j Data Model

#### Nodes
1. **LogicTemplate**
   - Properties: id, name, productType, version, status, regulatoryStandard
   - Example: "mRNA_Vaccine_v2.1"

2. **RoomType**
   - Properties: name, cleanroomGrade, pressureRequirement, temperatureRange, humidityRange
   - Example: "mRNA_Synthesis" with Grade B cleanroom

3. **FlowRule**
   - Properties: flowType, direction, criticality, validationMessage
   - Example: Material flow must be unidirectional

4. **ComplianceRule**
   - Properties: ruleText, regulation, severity, checkQuery
   - Example: "No direct path from waste to cleanroom"

#### Relationships
- `REQUIRES_ROOM`: Links templates to mandatory rooms
- `MUST_CONNECT_TO`: Defines required adjacencies
- `CANNOT_CONNECT_TO`: Defines prohibited connections
- `HAS_FLOW_RULE`: Links templates to flow requirements

### PostgreSQL Schema

```sql
-- Core tables
CREATE TABLE facility_diagrams (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    template_id VARCHAR(255),  -- References Neo4j template
    template_version VARCHAR(50),
    diagram_data JSONB,        -- Complete diagram structure
    validation_status VARCHAR(50),
    created_by UUID,
    created_at TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(50),
    user_id UUID,
    timestamp TIMESTAMP,
    changes JSONB
);
```

## User Workflows

### Creating a Logic Template
1. Expert defines product type and regulatory requirements
2. Specifies required rooms and their properties
3. Defines adjacency rules (must connect/cannot connect)
4. Sets flow patterns and compliance rules
5. Publishes template for use

### Designing a Facility
1. User selects appropriate logic template
2. System loads required rooms and rules
3. User places rooms with real-time validation
4. System suggests valid connections
5. Validates against all rules before saving
6. Stores diagram with reference to logic version

## Key Algorithms

### Path Validation (Neo4j Cypher)
```cypher
// Find contamination paths
MATCH path = (waste:Room {type: 'waste'})-[*]-(clean:Room {type: 'cleanroom'})
WHERE length(path) < 5
RETURN path
```

### Connection Suggestions
```cypher
// Suggest valid connections for selected room
MATCH (selected:RoomType {name: $selectedRoom})
OPTIONAL MATCH (selected)-[rule:MUST_CONNECT_TO]->(mandatory)
OPTIONAL MATCH (selected)-[can:CAN_CONNECT_TO]->(optional)
RETURN mandatory, optional
```

## Implementation Technologies

- **Frontend**: React with Tailwind CSS
- **Graph Database**: Neo4j Aura for logic storage
- **Relational Database**: PostgreSQL for project data
- **File Storage**: S3 for version history and documents
- **Real-time**: Redis for collaborative editing (optional)

## Business Benefits

1. **Compliance Assurance**: Can't create non-compliant designs
2. **Knowledge Reuse**: One template guides many facilities
3. **Reduced Errors**: Real-time validation prevents mistakes
4. **Faster Design**: Guided process speeds up layout creation
5. **Regulatory Tracking**: Know which logic version each facility used

## Future Enhancements

### Advanced Validation
- Contamination risk scoring
- Automated flow analysis
- Pressure cascade verification
- Cross-contamination prevention

### Integration Features
- CAD export (DXF, DWG)
- BIM integration
- Equipment database connection
- Regulatory submission generation

### Collaboration
- Multi-user real-time editing
- Comment and annotation system
- Approval workflows
- Change request management

### Analytics
- Design pattern analysis
- Compliance trend tracking
- Optimization suggestions
- Cost estimation

## Example Use Cases

1. **mRNA Vaccine Facility**
   - Template enforces Grade B cleanrooms for synthesis
   - Requires unidirectional material flow
   - Mandates airlocks between different grades

2. **Monoclonal Antibody Plant**
   - Template includes cell culture requirements
   - Defines harvest to purification flow
   - Enforces segregation of pre/post viral clearance

3. **Oral Solid Dosage Facility**
   - Template for tablet/capsule production
   - Defines powder handling requirements
   - Includes containment rules for potent compounds

## Critical Success Factors

1. **Expert Input**: Logic templates must be created by GMP experts
2. **Regular Updates**: Templates need updates as regulations change
3. **User Training**: Designers need to understand the logic system
4. **Performance**: Real-time validation must be fast
5. **Flexibility**: System must handle exceptions and special cases

## Notes for Implementation

- Start with a few well-tested logic templates
- Focus on the most common facility types first
- Ensure strong version control for regulatory compliance
- Build comprehensive validation error messages
- Consider offline mode for remote site work
- Plan for template migration as regulations evolve

This system transforms pharmaceutical facility design from an art to a science by encoding expert knowledge into reusable, validated patterns.