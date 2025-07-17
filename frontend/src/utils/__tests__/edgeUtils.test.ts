import { addMultiEdge } from '../edgeUtils';

describe('addMultiEdge', () => {
  it('allows multiple edges between the same nodes', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
    ];

    const newEdge = { id: 'e2', source: 'a', target: 'b' };

    const result = addMultiEdge(edges, newEdge);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(newEdge);
  });
});

