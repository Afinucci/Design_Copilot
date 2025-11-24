import { Edge } from 'reactflow';

export function addMultiEdge<T>(edges: Edge<T>[], newEdge: Edge<T>): Edge<T>[] {
  return [...edges, newEdge];
}

/**
 * Format relationship type for display as edge label
 * Converts SNAKE_CASE relationship types to Title Case
 */
export function formatRelationshipLabel(relationshipType: string): string {
  if (!relationshipType) return '';

  return relationshipType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

