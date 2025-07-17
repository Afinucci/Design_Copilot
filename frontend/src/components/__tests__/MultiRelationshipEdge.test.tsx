import React from 'react';
import { render } from '@testing-library/react';
import MultiRelationshipEdge from '../MultiRelationshipEdge';

const baseProps = {
  id: 'e1',
  sourceX: 0,
  sourceY: 0,
  targetX: 100,
  targetY: 0,
  sourcePosition: 'right' as const,
  targetPosition: 'left' as const,
  style: { stroke: '#000' },
  data: { relationshipType: 'ADJACENT_TO', relationshipIndex: 0, priority: 5, reason: 'test' }
};

describe('MultiRelationshipEdge', () => {
  it('renders distinct paths for different relationship indices', () => {
    const { container: c1 } = render(<svg><MultiRelationshipEdge {...baseProps} /></svg>);
    const { container: c2 } = render(<svg><MultiRelationshipEdge {...{...baseProps, id: 'e2', data: {...baseProps.data, relationshipIndex: 1}}} /></svg>);

    const path1 = c1.querySelector('path');
    const path2 = c2.querySelector('path');

    expect(path1).not.toBeNull();
    expect(path2).not.toBeNull();
    expect(path1!.getAttribute('d')).not.toEqual(path2!.getAttribute('d'));
  });
});

