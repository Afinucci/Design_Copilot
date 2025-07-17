import { Edge } from 'reactflow';

export function addMultiEdge<T>(edges: Edge<T>[], newEdge: Edge<T>): Edge<T>[] {
  return [...edges, newEdge];
}

