#!/usr/bin/env node

// Script to update all node templates with cost factors and typical equipment
// This script should be run once to update the nodeTemplates.ts file

import * as fs from 'fs';
import * as path from 'path';

const nodeTemplatesPath = path.join(__dirname, '../config/nodeTemplates.ts');
const fileContent = fs.readFileSync(nodeTemplatesPath, 'utf8');

// Templates and their cleanroom classes
const templateUpdates = [
  // Quality Control
  { id: 'analytical-lab', cleanroom: 'C' },
  { id: 'microbiology', cleanroom: 'B' },
  { id: 'stability-chamber', cleanroom: 'CNC' },
  { id: 'release-testing', cleanroom: 'C' },

  // Warehouse
  { id: 'raw-materials', cleanroom: 'CNC' },
  { id: 'finished-goods', cleanroom: 'CNC' },
  { id: 'quarantine', cleanroom: 'CNC' },
  { id: 'cold-storage', cleanroom: 'CNC' },

  // Utilities
  { id: 'hvac', cleanroom: 'CNC' },
  { id: 'purified-water', cleanroom: 'CNC' },
  { id: 'compressed-air', cleanroom: 'CNC' },
  { id: 'electrical', cleanroom: 'CNC' },

  // Personnel
  { id: 'gowning-area', cleanroom: 'D' },
  { id: 'break-room', cleanroom: 'CNC' },
  { id: 'offices', cleanroom: 'CNC' },
  { id: 'training-room', cleanroom: 'CNC' },

  // Support
  { id: 'waste-disposal', cleanroom: 'CNC' },
  { id: 'maintenance', cleanroom: 'CNC' },
  { id: 'receiving', cleanroom: 'CNC' },
  { id: 'shipping', cleanroom: 'CNC' },

  // Additional templates
  { id: 'hvac-room', cleanroom: 'CNC' },
  { id: 'electrical-room', cleanroom: 'CNC' },
  { id: 'change-room', cleanroom: 'D' }
];

let updatedContent = fileContent;

// Update each template
templateUpdates.forEach(template => {
  // Find the pattern for this template
  const regex = new RegExp(
    `(\\s+\\{\\s*\\n\\s*id:\\s*'${template.id}',[^}]*?)(\\s*\\}\\s*)`,
    'g'
  );

  // Replace to add cost factors and equipment if not already there
  updatedContent = updatedContent.replace(regex, (match: string, group1: string, group2: string) => {
    // Check if cost factors already exist
    if (match.includes('costFactors:')) {
      return match; // Already updated
    }

    // Find the closing of defaultSize
    const defaultSizeRegex = /(defaultSize:\s*\{[^}]+\})/;
    const updatedMatch = group1.replace(defaultSizeRegex, (sizeMatch: string) => {
      return `${sizeMatch},
    costFactors: getCostFactors('${template.cleanroom}', '${template.id}'),
    typicalEquipment: getTypicalEquipmentIds('${template.id}')`;
    });

    return updatedMatch + group2;
  });
});

// Write the updated content
fs.writeFileSync(nodeTemplatesPath, updatedContent, 'utf8');
console.log('✅ Updated all node templates with cost factors and typical equipment');