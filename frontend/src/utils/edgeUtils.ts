export function addMultiEdge<T extends {id: string}>(edges: T[], newEdge: T): T[] {
  return [...edges, newEdge];
}

