import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CropSquare as RectangleIcon,
  RadioButtonUnchecked as CircleIcon,
  ChangeHistory as TriangleIcon,
  Pentagon as PolygonIcon,
} from '@mui/icons-material';
import { ShapeType, NodeCategory } from '../../types';

export interface PharmaceuticalShapeTemplate {
  id: string;
  name: string;
  shapeType: ShapeType;
  category: NodeCategory;
  description: string;
  defaultDimensions: {
    width: number;
    height: number;
  };
  typicalUse: string;
  cleanroomClass?: string;
  icon: string;
  svgPreview: string;
  pharmaceuticalContext: string;
  minArea?: number; // square meters
  maxArea?: number; // square meters
  aspectRatio?: number; // width/height ratio
}

export interface ShapeLibraryProps {
  onShapeSelect: (template: PharmaceuticalShapeTemplate) => void;
  onShapeToolSelect: (shapeType: ShapeType) => void;
  selectedShapeType?: ShapeType | null;
}

// Pharmaceutical shape templates organized by category
const pharmaceuticalShapeTemplates: PharmaceuticalShapeTemplate[] = [
  // Production Rooms
  {
    id: 'production-rectangle',
    name: 'Standard Production Room',
    shapeType: 'rectangle',
    category: 'Production',
    description: 'Basic rectangular production room for most manufacturing processes',
    defaultDimensions: { width: 120, height: 80 },
    typicalUse: 'General manufacturing, mixing, filling',
    cleanroomClass: 'C',
    icon: '🏭',
    svgPreview: 'M 10 10 L 70 10 L 70 40 L 10 40 Z',
    pharmaceuticalContext: 'Suitable for tablet compression, liquid filling, packaging operations',
    minArea: 20,
    maxArea: 200,
    aspectRatio: 1.5,
  },
  {
    id: 'production-l-shape',
    name: 'L-Shaped Production Suite',
    shapeType: 'L-shape',
    category: 'Production',
    description: 'L-shaped room with separate preparation and processing zones',
    defaultDimensions: { width: 150, height: 100 },
    typicalUse: 'Multi-stage processes, equipment separation',
    cleanroomClass: 'B',
    icon: '🏭',
    svgPreview: 'M 10 10 L 70 10 L 70 30 L 40 30 L 40 50 L 10 50 Z',
    pharmaceuticalContext: 'Ideal for aseptic filling with separate prep area',
    minArea: 40,
    maxArea: 300,
  },
  {
    id: 'production-u-shape',
    name: 'U-Shaped Flow Room',
    shapeType: 'U-shape',
    category: 'Production',
    description: 'U-shaped layout optimizing material flow',
    defaultDimensions: { width: 180, height: 120 },
    typicalUse: 'Continuous processing, conveyor systems',
    cleanroomClass: 'C',
    icon: '🏭',
    svgPreview: 'M 10 10 L 70 10 L 70 50 L 60 50 L 60 20 L 20 20 L 20 50 L 10 50 Z',
    pharmaceuticalContext: 'Perfect for tablet coating, packaging lines',
    minArea: 60,
    maxArea: 400,
  },

  // Storage Areas
  {
    id: 'storage-rectangle',
    name: 'Standard Storage Room',
    shapeType: 'rectangle',
    category: 'Storage',
    description: 'Rectangular storage area with optimal space utilization',
    defaultDimensions: { width: 100, height: 60 },
    typicalUse: 'Raw materials, finished goods, equipment',
    icon: '📦',
    svgPreview: 'M 10 10 L 70 10 L 70 40 L 10 40 Z',
    pharmaceuticalContext: 'Standard warehouse storage with controlled environment',
    minArea: 25,
    maxArea: 500,
    aspectRatio: 1.67,
  },
  {
    id: 'cold-storage',
    name: 'Temperature-Controlled Storage',
    shapeType: 'rectangle',
    category: 'Storage',
    description: 'Insulated storage for temperature-sensitive materials',
    defaultDimensions: { width: 80, height: 80 },
    typicalUse: 'Biologics, vaccines, cold chain products',
    icon: '❄️',
    svgPreview: 'M 10 10 L 70 10 L 70 50 L 10 50 Z',
    pharmaceuticalContext: '2-8°C or -20°C storage for biologics',
    minArea: 15,
    maxArea: 100,
    aspectRatio: 1.0,
  },

  // Quality Control
  {
    id: 'qc-lab-rectangle',
    name: 'QC Laboratory',
    shapeType: 'rectangle',
    category: 'Quality Control',
    description: 'Laboratory space with bench layouts',
    defaultDimensions: { width: 140, height: 70 },
    typicalUse: 'Analytical testing, sample preparation',
    cleanroomClass: 'D',
    icon: '🔬',
    svgPreview: 'M 10 10 L 70 10 L 70 40 L 10 40 Z',
    pharmaceuticalContext: 'HPLC, dissolution testing, microbiology',
    minArea: 30,
    maxArea: 150,
    aspectRatio: 2.0,
  },
  {
    id: 'microbiology-lab',
    name: 'Microbiology Laboratory',
    shapeType: 'L-shape',
    category: 'Quality Control',
    description: 'Segregated areas for sterility and bioburden testing',
    defaultDimensions: { width: 120, height: 90 },
    typicalUse: 'Sterility testing, environmental monitoring',
    cleanroomClass: 'B',
    icon: '🦠',
    svgPreview: 'M 10 10 L 70 10 L 70 30 L 40 30 L 40 50 L 10 50 Z',
    pharmaceuticalContext: 'Separate prep and testing areas to prevent contamination',
    minArea: 25,
    maxArea: 100,
  },

  // Utilities
  {
    id: 'hvac-rectangle',
    name: 'HVAC Equipment Room',
    shapeType: 'rectangle',
    category: 'Utilities',
    description: 'Air handling and conditioning equipment',
    defaultDimensions: { width: 100, height: 80 },
    typicalUse: 'AHUs, fans, filters, controls',
    icon: '🌬️',
    svgPreview: 'M 10 10 L 70 10 L 70 40 L 10 40 Z',
    pharmaceuticalContext: 'Critical for cleanroom pressure cascades',
    minArea: 20,
    maxArea: 200,
    aspectRatio: 1.25,
  },
  {
    id: 'utility-corridor',
    name: 'Utility Corridor',
    shapeType: 'rectangle',
    category: 'Utilities',
    description: 'Long narrow space for utilities distribution',
    defaultDimensions: { width: 200, height: 40 },
    typicalUse: 'Pipes, cables, maintenance access',
    icon: '⚡',
    svgPreview: 'M 10 20 L 70 20 L 70 30 L 10 30 Z',
    pharmaceuticalContext: 'Access to utilities without entering clean areas',
    minArea: 10,
    maxArea: 100,
    aspectRatio: 5.0,
  },

  // Support Areas
  {
    id: 'airlock',
    name: 'Personnel Airlock',
    shapeType: 'rectangle',
    category: 'Support',
    description: 'Transition area between cleanroom grades',
    defaultDimensions: { width: 60, height: 40 },
    typicalUse: 'Personnel gowning, material transfer',
    cleanroomClass: 'D',
    icon: '🚪',
    svgPreview: 'M 15 15 L 55 15 L 55 35 L 15 35 Z',
    pharmaceuticalContext: 'Maintains pressure differential between areas',
    minArea: 6,
    maxArea: 20,
    aspectRatio: 1.5,
  },
  {
    id: 'gowning-room',
    name: 'Gowning Room',
    shapeType: 'L-shape',
    category: 'Support',
    description: 'Staged gowning with clean/dirty sides',
    defaultDimensions: { width: 100, height: 70 },
    typicalUse: 'Cleanroom garment change',
    cleanroomClass: 'D',
    icon: '👔',
    svgPreview: 'M 10 10 L 70 10 L 70 30 L 40 30 L 40 50 L 10 50 Z',
    pharmaceuticalContext: 'Progressive gowning from street clothes to cleanroom garments',
    minArea: 15,
    maxArea: 50,
  },
];

// Basic drawing tools
const drawingTools = [
  {
    shapeType: 'rectangle' as ShapeType,
    name: 'Rectangle',
    icon: <RectangleIcon />,
    description: 'Draw rectangular shapes',
  },
  {
    shapeType: 'circle' as ShapeType,
    name: 'Circle',
    icon: <CircleIcon />,
    description: 'Draw circular shapes',
  },
  {
    shapeType: 'triangle' as ShapeType,
    name: 'Triangle',
    icon: <TriangleIcon />,
    description: 'Draw triangular shapes',
  },
  {
    shapeType: 'polygon' as ShapeType,
    name: 'Polygon',
    icon: <PolygonIcon />,
    description: 'Draw custom polygons',
  },
];

const ShapeLibrary: React.FC<ShapeLibraryProps> = ({
  onShapeSelect,
  onShapeToolSelect,
  selectedShapeType,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string>('production');

  // Group templates by category
  const templatesByCategory = pharmaceuticalShapeTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, PharmaceuticalShapeTemplate[]>);

  const getCategoryColor = (category: NodeCategory): string => {
    const colors: Record<NodeCategory, string> = {
      'Production': '#3B82F6',
      'Storage': '#10B981',
      'Quality Control': '#F59E0B',
      'Quality Assurance': '#EF4444',
      'Utilities': '#6B7280',
      'Support': '#8B5CF6',
      'Logistics': '#14B8A6',
      'Personnel': '#F97316',
      'Waste Management': '#991B1B',
    };
    return colors[category] || '#94A3B8';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        Shape Library
      </Typography>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {/* Drawing Tools Section */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Drawing Tools
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {drawingTools.map((tool) => (
                <Box key={tool.shapeType} flex="0 0 calc(50% - 4px)">
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor:
                        selectedShapeType === tool.shapeType
                          ? 'primary.light'
                          : 'background.paper',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        transform: 'scale(1.02)',
                      },
                    }}
                    onClick={() => onShapeToolSelect(tool.shapeType)}
                  >
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <IconButton
                          size="small"
                          color={selectedShapeType === tool.shapeType ? 'primary' : 'default'}
                        >
                          {tool.icon}
                        </IconButton>
                        <Typography variant="caption" textAlign="center" mt={0.5}>
                          {tool.name}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Pharmaceutical Templates */}
        {Object.entries(templatesByCategory).map(([category, templates]) => (
          <Accordion
            key={category}
            expanded={expandedCategory === category.toLowerCase()}
            onChange={() =>
              setExpandedCategory(
                expandedCategory === category.toLowerCase() ? '' : category.toLowerCase()
              )
            }
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" fontWeight="medium">
                  {category}
                </Typography>
                <Chip
                  label={templates.length}
                  size="small"
                  sx={{
                    backgroundColor: getCategoryColor(category as NodeCategory),
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 18,
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={1}>
                {templates.map((template) => (
                  <Box key={template.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                      }}
                      onClick={() => onShapeSelect(template)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box display="flex" alignItems="flex-start" gap={1.5}>
                          {/* Shape Preview */}
                          <Box
                            sx={{
                              width: 60,
                              height: 40,
                              backgroundColor: 'grey.100',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg width="50" height="30" viewBox="0 0 80 60">
                              <path
                                d={template.svgPreview}
                                fill={`${getCategoryColor(template.category)}20`}
                                stroke={getCategoryColor(template.category)}
                                strokeWidth="2"
                              />
                            </svg>
                          </Box>

                          {/* Template Info */}
                          <Box flexGrow={1} minWidth={0}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Typography variant="body2" fontWeight="medium" noWrap>
                                {template.icon} {template.name}
                              </Typography>
                              {template.cleanroomClass && (
                                <Chip
                                  label={`Class ${template.cleanroomClass}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.6rem', height: 16 }}
                                />
                              )}
                            </Box>

                            <Typography variant="caption" color="text.secondary" display="block">
                              {template.description}
                            </Typography>

                            <Typography variant="caption" color="text.primary" display="block" mt={0.5}>
                              {template.pharmaceuticalContext}
                            </Typography>

                            {/* Dimensions */}
                            <Box display="flex" gap={1} mt={1}>
                              <Chip
                                label={`${template.defaultDimensions.width}×${template.defaultDimensions.height}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 18 }}
                              />
                              {template.minArea && (
                                <Chip
                                  label={`${template.minArea}-${template.maxArea}m²`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.65rem', height: 18 }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
};

export { pharmaceuticalShapeTemplates };
export default ShapeLibrary;