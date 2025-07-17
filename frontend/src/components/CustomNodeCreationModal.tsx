import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  Divider,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { NodeCategory, NodeTemplate } from '../types';

interface CustomNodeCreationModalProps {
  open: boolean;
  onClose: () => void;
  onCreateNode: (nodeTemplate: Omit<NodeTemplate, 'id'>) => void;
  existingCategories?: string[];
}

const availableIcons = [
  { emoji: '🏭', label: 'Factory' },
  { emoji: '🔬', label: 'Lab' },
  { emoji: '📦', label: 'Warehouse' },
  { emoji: '⚡', label: 'Power' },
  { emoji: '👥', label: 'Personnel' },
  { emoji: '🔧', label: 'Tools' },
  { emoji: '🌡️', label: 'Temperature' },
  { emoji: '💊', label: 'Pills' },
  { emoji: '🧪', label: 'Test Tube' },
  { emoji: '📋', label: 'Clipboard' },
  { emoji: '🏥', label: 'Medical' },
  { emoji: '🔍', label: 'Magnifying' },
  { emoji: '⚗️', label: 'Chemistry' },
  { emoji: '💉', label: 'Injection' },
  { emoji: '🧬', label: 'DNA' },
  { emoji: '🔐', label: 'Secure' },
  { emoji: '📊', label: 'Chart' },
  { emoji: '⚙️', label: 'Settings' },
  { emoji: '🚪', label: 'Door' },
  { emoji: '🌪️', label: 'Ventilation' },
  { emoji: '💧', label: 'Water' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❄️', label: 'Cold' },
  { emoji: '📝', label: 'Document' },
];

const defaultCategories: NodeCategory[] = [
  'Production',
  'Quality Control', 
  'Warehouse',
  'Utilities',
  'Personnel',
  'Support',
  'None'
];

const cleanroomClasses = [
  // EU GMP Classifications
  { value: 'A', label: 'Grade A - Sterile Operations' },
  { value: 'B', label: 'Grade B - Aseptic Preparation' },
  { value: 'C', label: 'Grade C - Clean Production' },
  { value: 'D', label: 'Grade D - General Production' },
  
  // Extended Classifications
  { value: 'E', label: 'Class E - Controlled Environment' },
  { value: 'F', label: 'Class F - Basic Clean Environment' },
  { value: 'G', label: 'Class G - Minimal Clean Requirements' },
  { value: 'H', label: 'Class H - Standard Environment' },
  
  // ISO 14644 Classifications
  { value: 'ISO 3', label: 'ISO 3 - Ultra Clean (≤1,000 particles/m³)' },
  { value: 'ISO 4', label: 'ISO 4 - Super Clean (≤10,000 particles/m³)' },
  { value: 'ISO 5', label: 'ISO 5 - Very Clean (≤100,000 particles/m³)' },
  { value: 'ISO 6', label: 'ISO 6 - Clean (≤1,000,000 particles/m³)' },
  { value: 'ISO 7', label: 'ISO 7 - Fairly Clean (≤10,000,000 particles/m³)' },
  { value: 'ISO 8', label: 'ISO 8 - Moderately Clean (≤100,000,000 particles/m³)' },
  { value: 'ISO 9', label: 'ISO 9 - Room Air Quality' },
  
  // Federal Standard 209E Classifications
  { value: 'Class 1', label: 'Class 1 - Highest Cleanliness (≤1 particle/ft³)' },
  { value: 'Class 10', label: 'Class 10 - Very High Cleanliness (≤10 particles/ft³)' },
  { value: 'Class 100', label: 'Class 100 - High Cleanliness (≤100 particles/ft³)' },
  { value: 'Class 1000', label: 'Class 1000 - Moderate Cleanliness (≤1,000 particles/ft³)' },
  { value: 'Class 10000', label: 'Class 10000 - Basic Cleanliness (≤10,000 particles/ft³)' },
  { value: 'Class 100000', label: 'Class 100000 - Minimum Cleanliness (≤100,000 particles/ft³)' },
  
  // Special Classifications
  { value: 'CNC', label: 'CNC - Controlled not Classified' },
  { value: 'None', label: 'No Cleanroom Classification' },
];

const getCategoryColor = (category: NodeCategory) => {
  switch (category) {
    case 'Production':
      return '#FF6B6B';
    case 'Quality Control':
      return '#4ECDC4';
    case 'Warehouse':
      return '#45B7D1';
    case 'Utilities':
      return '#F7DC6F';
    case 'Personnel':
      return '#BB8FCE';
    case 'Support':
      return '#85C1E9';
    case 'None':
      return '#95A5A6';
    default:
      // Generate a color for custom categories based on hash of category name
      if (!category || typeof category !== 'string') {
        return '#95A5A6'; // Default fallback color
      }
      const hash = category.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 60%, 65%)`;
  }
};

const CustomNodeCreationModal: React.FC<CustomNodeCreationModalProps> = ({
  open,
  onClose,
  onCreateNode,
  existingCategories = [],
}) => {
  const [nodeName, setNodeName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NodeCategory>('Production');
  const [selectedCleanroomClass, setSelectedCleanroomClass] = useState<string>('D');
  const [selectedIcon, setSelectedIcon] = useState<string>('📋');
  const [nodeWidth, setNodeWidth] = useState<number>(120);
  const [nodeHeight, setNodeHeight] = useState<number>(80);
  const [customCategories, setCustomCategories] = useState<string[]>(existingCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const handleReset = () => {
    setNodeName('');
    setSelectedCategory('Production');
    setSelectedCleanroomClass('D');
    setSelectedIcon('📋');
    setNodeWidth(120);
    setNodeHeight(80);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !allCategories.includes(newCategoryName.trim())) {
      const newCategory = newCategoryName.trim();
      setCustomCategories(prev => [...prev, newCategory]);
      setSelectedCategory(newCategory);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const allCategories = [...defaultCategories, ...customCategories];

  const handleCreate = () => {
    if (!nodeName.trim()) return;
    if (!selectedCategory || selectedCategory.trim() === '') return;

    const newNodeTemplate: Omit<NodeTemplate, 'id'> = {
      name: nodeName.trim(),
      category: selectedCategory,
      cleanroomClass: selectedCleanroomClass,
      color: getCategoryColor(selectedCategory),
      icon: selectedIcon,
      defaultSize: {
        width: nodeWidth,
        height: nodeHeight,
      },
    };

    onCreateNode(newNodeTemplate);
    handleReset();
    onClose();
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1,
      }}>
        <Typography variant="h6" component="div">
          Create Custom Node
        </Typography>
        <IconButton onClick={handleCancel} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Node Name */}
          <TextField
            fullWidth
            label="Node Name"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            placeholder="Enter the name of your custom node"
            required
          />

          {/* Category Selection */}
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              label="Category"
              onChange={(e) => setSelectedCategory(e.target.value as NodeCategory)}
            >
              {allCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: getCategoryColor(category),
                      }}
                    />
                    {category}
                  </Box>
                </MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={() => setShowAddCategory(true)}>
                <ListItemIcon>
                  <Add />
                </ListItemIcon>
                <ListItemText primary="Add New Category" />
              </MenuItem>
            </Select>
          </FormControl>

          {/* Add Category Dialog */}
          {showAddCategory && (
            <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Add New Category
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
                >
                  Add
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                  }}
                >
                  Cancel
                </Button>
              </Box>
              {newCategoryName.trim() && allCategories.includes(newCategoryName.trim()) && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  Category already exists
                </Typography>
              )}
            </Box>
          )}

          {/* Cleanroom Class Selection */}
          <FormControl fullWidth>
            <InputLabel>Cleanroom Class</InputLabel>
            <Select
              value={selectedCleanroomClass}
              label="Cleanroom Class"
              onChange={(e) => setSelectedCleanroomClass(e.target.value)}
            >
              {cleanroomClasses.map((cls) => (
                <MenuItem key={cls.value} value={cls.value}>
                  {cls.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Icon Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Icon
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableIcons.map((icon) => (
                  <IconButton
                    key={icon.emoji}
                    onClick={() => setSelectedIcon(icon.emoji)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: selectedIcon === icon.emoji ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      borderRadius: 1,
                      backgroundColor: selectedIcon === icon.emoji ? '#e3f2fd' : 'transparent',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <Typography variant="h6">{icon.emoji}</Typography>
                  </IconButton>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Node Size */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Default Size
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Width"
                type="number"
                value={nodeWidth}
                onChange={(e) => setNodeWidth(Math.max(80, parseInt(e.target.value) || 80))}
                slotProps={{
                  input: {
                    inputProps: { min: 80, max: 300 },
                  },
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Height"
                type="number"
                value={nodeHeight}
                onChange={(e) => setNodeHeight(Math.max(60, parseInt(e.target.value) || 60))}
                slotProps={{
                  input: {
                    inputProps: { min: 60, max: 200 },
                  },
                }}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>

          {/* Preview */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Preview
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                backgroundColor: '#f9f9f9',
              }}
            >
              <Box
                sx={{
                  width: Math.min(nodeWidth / 2, 60),
                  height: Math.min(nodeHeight / 2, 40),
                  backgroundColor: getCategoryColor(selectedCategory),
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                {selectedIcon}
              </Box>
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {nodeName || 'Custom Node'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip
                    label={selectedCategory}
                    size="small"
                    sx={{
                      backgroundColor: getCategoryColor(selectedCategory),
                      color: '#fff',
                      fontSize: '0.7rem',
                    }}
                  />
                  <Chip
                    label={`Class ${selectedCleanroomClass}`}
                    size="small"
                    sx={{
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2',
                      fontSize: '0.7rem',
                    }}
                  />
                  <Chip
                    label={`${nodeWidth}×${nodeHeight}`}
                    size="small"
                    sx={{
                      backgroundColor: '#f3e5f5',
                      color: '#7b1fa2',
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!nodeName.trim()}
        >
          Create Node
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomNodeCreationModal;