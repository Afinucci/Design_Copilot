import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Chip, Paper, Tooltip, Badge } from '@mui/material';
import { Build } from '@mui/icons-material';
import './CustomNode.css';

interface Equipment {
  id: string;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  description?: string;
  specifications?: { [key: string]: string };
  maintenanceSchedule?: string;
  status?: 'operational' | 'maintenance' | 'offline';
}

interface CustomNodeData {
  label: string;
  category: string;
  cleanroomClass?: string;
  color: string;
  highlighted?: boolean;
  icon?: string;
  groupId?: string;
  isSelected?: boolean;
  equipment?: Equipment[];
  width?: number;
  height?: number;
}

const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ data, selected }) => {
  const { label, category, cleanroomClass, color, highlighted, icon, groupId, isSelected, equipment, width, height } = data;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Production':
        return '🏭';
      case 'Quality Control':
        return '🔬';
      case 'Warehouse':
        return '📦';
      case 'Utilities':
        return '⚡';
      case 'Personnel':
        return '👥';
      case 'Support':
        return '🔧';
      case 'None':
        return '⚪';
      default:
        // For custom categories, use a default icon
        return `🔖`; // Default icon for custom categories
    }
  };

  // Determine border color based on state
  const getBorderColor = () => {
    if (isSelected) return '3px solid #9c27b0'; // Purple for group selection
    if (selected) return '2px solid #1976d2'; // Blue for normal selection
    if (highlighted) return '2px solid #ff9800'; // Orange for validation highlight
    if (groupId) return '2px solid #4caf50'; // Green for grouped nodes
    return '1px solid #ccc'; // Default border
  };

  return (
    <Paper
      elevation={selected || highlighted || isSelected ? 4 : 2}
      sx={{
        minWidth: 120,
        minHeight: 80,
        backgroundColor: color,
        border: getBorderColor(),
        borderRadius: 2,
        padding: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {/* Left handle - bidirectional (centered) */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={true}
        style={{
          background: '#555',
          width: 5,
          height: 5,
          border: '0.5px solid #fff',
          borderRadius: '50%',
          pointerEvents: 'all',
          cursor: 'crosshair',
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
        }}
        className="custom-handle"
      />

      {/* Right handle - bidirectional (centered) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={true}
        style={{
          background: '#555',
          width: 5,
          height: 5,
          border: '0.5px solid #fff',
          borderRadius: '50%',
          pointerEvents: 'all',
          cursor: 'crosshair',
          top: '50%',
          transform: 'translateY(-50%)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
        }}
        className="custom-handle"
      />

      {/* Top handle - bidirectional (centered) */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={true}
        style={{
          background: '#555',
          width: 5,
          height: 5,
          border: '0.5px solid #fff',
          borderRadius: '50%',
          pointerEvents: 'all',
          cursor: 'crosshair',
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
        }}
        className="custom-handle"
      />

      {/* Bottom handle - bidirectional (centered) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={true}
        style={{
          background: '#555',
          width: 5,
          height: 5,
          border: '0.5px solid #fff',
          borderRadius: '50%',
          pointerEvents: 'all',
          cursor: 'crosshair',
          left: '50%',
          transform: 'translateX(-50%)',
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.1)',
        }}
        className="custom-handle"
      />

      {/* Target handles for accepting incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        isConnectable={true}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        isConnectable={true}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        isConnectable={true}
        style={{ opacity: 0 }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        isConnectable={true}
        style={{ opacity: 0 }}
      />

      {/* Group indicator */}
      {groupId && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 16,
            height: 16,
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          G
        </Box>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" sx={{ mr: 0.5 }}>
          {icon || getCategoryIcon(category)}
        </Typography>
        <Typography
          variant="body2"
          fontWeight="bold"
          textAlign="center"
          sx={{
            color: '#333',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
          }}
        >
          {label}
        </Typography>
      </Box>
      
      {/* Primary Info Row: Category + Cleanroom Class */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center', mb: 0.5 }}>
        <Chip
          label={category}
          size="small"
          sx={{
            fontSize: '0.65rem',
            height: 20,
            backgroundColor: 'rgba(255,255,255,0.8)',
            color: '#333',
          }}
        />

        {cleanroomClass && (
          <Chip
            label={`Class ${cleanroomClass}`}
            size="small"
            sx={{
              fontSize: '0.65rem',
              height: 20,
              backgroundColor: 'rgba(33,150,243,0.8)',
              color: 'white',
            }}
          />
        )}

        {equipment && equipment.length > 0 && (
          <Chip
            label={`${equipment.length} eq.`}
            size="small"
            sx={{
              fontSize: '0.6rem',
              height: 18,
              backgroundColor: 'rgba(123,31,162,0.8)',
              color: 'white',
            }}
          />
        )}
      </Box>

      {/* Equipment indicator */}
      {equipment && equipment.length > 0 && (
        <Tooltip
          title={
            <Box>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Equipment ({equipment.length}):
              </Typography>
              {equipment.slice(0, 5).map((eq) => (
                <Typography key={eq.id} variant="caption" display="block">
                  • {eq.name} ({eq.type})
                </Typography>
              ))}
              {equipment.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  + {equipment.length - 5} more...
                </Typography>
              )}
            </Box>
          }
          placement="top"
        >
          <Badge
            badgeContent={equipment.length}
            color="primary"
            sx={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                minWidth: 16,
                height: 16,
              },
            }}
          >
            <Build
              sx={{
                fontSize: 16,
                color: 'rgba(0,0,0,0.6)',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 1,
                p: 0.2,
              }}
            />
          </Badge>
        </Tooltip>
      )}
    </Paper>
  );
};

export default memo(CustomNode);