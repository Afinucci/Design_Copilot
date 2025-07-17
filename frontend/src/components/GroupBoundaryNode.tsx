import React from 'react';
import { NodeProps } from 'reactflow';

interface GroupBoundaryData {
  groupId: string;
  groupName: string;
  groupColor: string;
  width: number;
  height: number;
}

const GroupBoundaryNode: React.FC<NodeProps<GroupBoundaryData>> = ({ data }) => {
  const { groupName, groupColor, width, height } = data;

  // Convert group color to rgba for transparency
  const getGroupColor = (color: string, alpha: number = 0.05) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  };

  return (
    <div
      style={{
        width: width,
        height: height,
        border: `2px dashed ${groupColor}`,
        backgroundColor: getGroupColor(groupColor, 0.05),
        borderRadius: '8px',
        pointerEvents: 'none',
        position: 'relative',
        zIndex: -1,
      }}
    >
      {/* Group label */}
      <div
        style={{
          position: 'absolute',
          top: -25,
          left: 0,
          backgroundColor: groupColor,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        {groupName}
      </div>
    </div>
  );
};

export default GroupBoundaryNode;