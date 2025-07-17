import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Room, Warning, Speed, Settings, SwapHoriz, Person } from '@mui/icons-material';

const RelationshipLegend: React.FC = () => {
  const relationshipTypes = [
    { type: 'ADJACENT_TO', label: 'Adjacent To', color: '#1976d2', icon: <Room />, dash: undefined },
    { type: 'PROHIBITED_NEAR', label: 'Prohibited Near', color: '#d32f2f', icon: <Warning />, dash: '10,5' },
    { type: 'REQUIRES_ACCESS', label: 'Requires Access', color: '#0288d1', icon: <Speed />, dash: '5,5' },
    { type: 'SHARES_UTILITY', label: 'Shares Utility', color: '#388e3c', icon: <Settings />, dash: '3,3' },
    { type: 'MATERIAL_FLOW', label: 'Material Flow', color: '#9c27b0', icon: <SwapHoriz />, dash: '8,3,3,3' },
    { type: 'PERSONNEL_FLOW', label: 'Personnel Flow', color: '#ff9800', icon: <Person />, dash: '5,3,5,3' }
  ];

  return (
    <Paper elevation={2} sx={{ p: 2, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Relationship Types
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {relationshipTypes.map((rel) => (
          <Box key={rel.type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
              {React.cloneElement(rel.icon, { sx: { color: rel.color } })}
              <Typography variant="body2" sx={{ color: rel.color, fontWeight: 'bold' }}>
                {rel.label}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <svg width="50" height="2" style={{ overflow: 'visible' }}>
                <line
                  x1="0"
                  y1="1"
                  x2="50"
                  y2="1"
                  stroke={rel.color}
                  strokeWidth="2"
                  strokeDasharray={rel.dash}
                />
              </svg>
              <Typography variant="caption" color="text.secondary">
                {rel.dash ? 'Dashed' : 'Solid'}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Multiple relationships between the same nodes are offset visually for clarity.
      </Typography>
    </Paper>
  );
};

export default RelationshipLegend;