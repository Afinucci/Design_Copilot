/**
 * Constants for edge rendering and positioning
 */

// Edge spacing and positioning
export const EDGE_SPACING = 15; // px spacing between parallel lines
export const OVERLAP_OFFSET_RATIO = 1.2; // Increased ratio for better visibility when nodes overlap
export const MIN_DISTANCE_MULTIPLIER = 2.2; // More aggressive overlap detection for better icon positioning

// Node dimensions defaults
export const DEFAULT_NODE_WIDTH = 120;
export const DEFAULT_NODE_HEIGHT = 80;

// Arrow configuration
export const ARROW_SIZE = 8;

// Relationship colors with accessibility in mind - Enhanced for pharma context
export const RELATIONSHIP_COLORS = {
  ADJACENT_TO: '#1976d2', // Professional blue for adjacency
  MATERIAL_FLOW: '#7b1fa2', // Rich purple for material flow (pharma-appropriate)
  PERSONNEL_FLOW: '#ff6f00', // Vibrant orange for personnel movement
  REQUIRES_ACCESS: '#0277bd', // Bright blue for access requirements
  SHARES_UTILITY: '#2e7d32', // Forest green for shared utilities
  PROHIBITED_NEAR: '#c62828', // Strong red for prohibited relationships
  DEFAULT: '#1976d2'
} as const;

// Enhanced color scheme for guided mode - more vibrant and distinct
export const GUIDED_MODE_COLORS = {
  ADJACENT_TO: '#1565c0', // Deeper blue with better contrast
  MATERIAL_FLOW: '#6a1b9a', // Enhanced purple for pharmaceutical context
  PERSONNEL_FLOW: '#ef6c00', // Professional orange for personnel
  REQUIRES_ACCESS: '#0277bd', // Bright access blue
  SHARES_UTILITY: '#2e7d32', // Professional green for utilities
  PROHIBITED_NEAR: '#c62828', // Alert red for restrictions
  DEFAULT: '#1565c0'
} as const;

// Relationship labels for accessibility - Enhanced with pharmaceutical context
export const RELATIONSHIP_LABELS = {
  ADJACENT_TO: 'Adjacent',
  MATERIAL_FLOW: 'Material Flow',
  PERSONNEL_FLOW: 'Personnel',
  REQUIRES_ACCESS: 'Cleanroom Access',
  SHARES_UTILITY: 'Shared Utility',
  PROHIBITED_NEAR: 'Prohibited Zone',
  DEFAULT: 'Connected'
} as const;

// Enhanced pharmaceutical-specific labels for guided mode
export const GUIDED_RELATIONSHIP_LABELS = {
  ADJACENT_TO: 'Adjacent Rooms',
  MATERIAL_FLOW: 'Material Transfer',
  PERSONNEL_FLOW: 'Staff Movement',
  REQUIRES_ACCESS: 'Controlled Access',
  SHARES_UTILITY: 'Utility Connection',
  PROHIBITED_NEAR: 'Separation Required',
  DEFAULT: 'Connected Areas'
} as const;

// Animation and styling constants
export const EDGE_ANIMATION_DURATION = '2s';
export const EDGE_HOVER_SCALE = 1.1;
export const EDGE_Z_INDEX = 1000;
export const EDGE_BORDER_RADIUS = 2;
export const EDGE_FONT_SIZE = 12;
export const EDGE_FONT_WEIGHT = 500;

// Guided mode specific constants - Enhanced for better visual hierarchy
export const GUIDED_CHIP_HEIGHT = 36;
export const GUIDED_CHIP_MIN_WIDTH = 90;
export const GUIDED_ICON_SIZE = 22;
export const GUIDED_BORDER_WIDTH = 2;
export const GUIDED_BORDER_RADIUS = 18; // More rounded for modern look
export const GUIDED_BOX_SHADOW = '0 6px 20px rgba(0,0,0,0.25)';
export const GUIDED_BOX_SHADOW_HOVER = '0 8px 28px rgba(0,0,0,0.35)';

// Typography constants for guided mode
export const GUIDED_FONT_SIZE = '13px';
export const GUIDED_FONT_WEIGHT = '600';
export const GUIDED_ICON_MARGIN = '6px';

// Enhanced visual constants for mode differentiation
export const CREATION_MODE_OPACITY = 0.9;
export const GUIDED_MODE_OPACITY = 1.0;
export const GUIDED_MODE_SCALE_HOVER = 1.15;
export const CREATION_MODE_SCALE_HOVER = 1.05;

// Advanced positioning constants for overlap scenarios
export const CRITICAL_OVERLAP_RATIO = 1.8;
export const ICON_COLLISION_RADIUS = 45;
export const MINIMUM_BOUNDARY_CLEARANCE = 20;
export const POSITIONING_ATTEMPTS = 8;

// Dynamic z-index constants
export const GUIDED_EDGE_Z_INDEX = 1500;
export const GUIDED_EDGE_HOVER_Z_INDEX = 1600;
export const GUIDED_EDGE_CRITICAL_Z_INDEX = 1700;

// Relationship type priority mapping for z-index
export const RELATIONSHIP_PRIORITY_Z_INDEX = {
  'PROHIBITED_NEAR': 100,
  'MATERIAL_FLOW': 80,
  'PERSONNEL_FLOW': 60,
  'REQUIRES_ACCESS': 40,
  'ADJACENT_TO': 20,
  'SHARES_UTILITY': 10
} as const;