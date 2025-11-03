/**
 * Export layout to PDF and SVG with professional formatting
 * Includes title block, scale indicator, and measurements
 */

import { ShapeProperties } from '../components/LayoutDesigner/PropertiesPanel';
import { Measurement } from '../components/LayoutDesigner/MeasurementTool';
import { WallSegment } from '../components/LayoutDesigner/WallTool';
import { UnitConverter } from './unitConversion';

export interface ExportOptions {
  filename: string;
  title?: string;
  projectName?: string;
  drawingNumber?: string;
  revision?: string;
  drawnBy?: string;
  date?: string;
  includeGrid?: boolean;
  includeMeasurements?: boolean;
  includeRulers?: boolean;
  pageSize?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Tabloid';
  orientation?: 'portrait' | 'landscape';
}

export interface LayoutData {
  shapes: ShapeProperties[];
  measurements: Measurement[];
  walls: WallSegment[];
  canvasWidth: number;
  canvasHeight: number;
  unitConverter: UnitConverter;
}

/**
 * Page sizes in millimeters
 */
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
  A0: { width: 841, height: 1189 },
  Letter: { width: 215.9, height: 279.4 },
  Tabloid: { width: 279.4, height: 431.8 },
};

/**
 * Export layout to SVG format
 */
export function exportToSVG(
  layoutData: LayoutData,
  options: ExportOptions
): string {
  const {
    shapes,
    measurements,
    walls,
    canvasWidth,
    canvasHeight,
    unitConverter,
  } = layoutData;

  const config = unitConverter.getConfig();
  const titleBlockHeight = 100;
  const margin = 20;

  const svgWidth = canvasWidth + 2 * margin;
  const svgHeight = canvasHeight + titleBlockHeight + 2 * margin;

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${svgWidth}" height="${svgHeight}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${svgWidth} ${svgHeight}">
  <defs>
    <style>
      .shape-label { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; }
      .measurement { font-family: Arial, sans-serif; font-size: 10px; }
      .title-text { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; }
      .title-label { font-family: Arial, sans-serif; font-size: 10px; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${svgWidth}" height="${svgHeight}" fill="#ffffff"/>

  <!-- Drawing Area -->
  <g transform="translate(${margin}, ${margin})">
`;

  // Draw grid if enabled
  if (options.includeGrid) {
    const gridSize = 20; // pixels
    svg += `    <!-- Grid -->\n`;
    svg += `    <g opacity="0.2">\n`;

    for (let x = 0; x <= canvasWidth; x += gridSize) {
      svg += `      <line x1="${x}" y1="0" x2="${x}" y2="${canvasHeight}" stroke="#cccccc" stroke-width="1"/>\n`;
    }
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      svg += `      <line x1="0" y1="${y}" x2="${canvasWidth}" y2="${y}" stroke="#cccccc" stroke-width="1"/>\n`;
    }

    svg += `    </g>\n`;
  }

  // Draw walls
  svg += `    <!-- Walls -->\n`;
  walls.forEach((wall) => {
    svg += `    <line x1="${wall.startPoint.x}" y1="${wall.startPoint.y}"
                   x2="${wall.endPoint.x}" y2="${wall.endPoint.y}"
                   stroke="${wall.color}"
                   stroke-width="${wall.thickness}"
                   stroke-linecap="butt"/>\n`;
  });

  // Draw shapes
  svg += `    <!-- Shapes -->\n`;
  shapes.forEach((shape) => {
    const fillColor = shape.fillColor || '#3498db';
    const borderColor = shape.borderColor || '#333333';
    const opacity = shape.opacity || 0.8;

    if (shape.shapeType === 'rectangle') {
      svg += `    <rect x="${shape.x}" y="${shape.y}"
                   width="${shape.width}" height="${shape.height}"
                   fill="${fillColor}" fill-opacity="${opacity}"
                   stroke="${borderColor}" stroke-width="${shape.borderWidth || 2}"/>\n`;
    } else if (shape.shapeType === 'circle') {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const r = Math.min(shape.width, shape.height) / 2;
      svg += `    <circle cx="${cx}" cy="${cy}" r="${r}"
                   fill="${fillColor}" fill-opacity="${opacity}"
                   stroke="${borderColor}" stroke-width="${shape.borderWidth || 2}"/>\n`;
    }

    // Add label
    const labelX = shape.x + shape.width / 2;
    const labelY = shape.y + shape.height / 2;
    svg += `    <text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" class="shape-label">${shape.name}</text>\n`;

    // Add area label if room
    if (shape.area) {
      const areaText = unitConverter.formatArea(shape.area);
      svg += `    <text x="${labelX}" y="${labelY + 15}" text-anchor="middle" class="measurement" opacity="0.7">${areaText}</text>\n`;
    }
  });

  // Draw measurements if enabled
  if (options.includeMeasurements && measurements.length > 0) {
    svg += `    <!-- Measurements -->\n`;
    measurements.forEach((measurement) => {
      if (measurement.type === 'dimension' && measurement.startPoint && measurement.endPoint) {
        const distance = Math.sqrt(
          Math.pow(measurement.endPoint.x - measurement.startPoint.x, 2) +
          Math.pow(measurement.endPoint.y - measurement.startPoint.y, 2)
        );
        const midX = (measurement.startPoint.x + measurement.endPoint.x) / 2;
        const midY = (measurement.startPoint.y + measurement.endPoint.y) / 2;

        svg += `    <line x1="${measurement.startPoint.x}" y1="${measurement.startPoint.y}"
                     x2="${measurement.endPoint.x}" y2="${measurement.endPoint.y}"
                     stroke="${measurement.color}" stroke-width="2" stroke-dasharray="5,5"/>\n`;
        svg += `    <text x="${midX}" y="${midY - 10}" text-anchor="middle" class="measurement">${unitConverter.formatPixels(distance)}</text>\n`;
      }
    });
  }

  svg += `  </g>\n`;

  // Title Block
  svg += `  <!-- Title Block -->\n`;
  svg += `  <g transform="translate(${margin}, ${canvasHeight + margin + 20})">\n`;
  svg += `    <rect width="${canvasWidth}" height="${titleBlockHeight - 20}" fill="#f5f5f5" stroke="#333" stroke-width="2"/>\n`;

  const titleBlockData = [
    { label: 'Project:', value: options.projectName || 'Pharmaceutical Facility' },
    { label: 'Drawing:', value: options.title || 'Layout Plan' },
    { label: 'Drawing No:', value: options.drawingNumber || '-' },
    { label: 'Revision:', value: options.revision || 'A' },
    { label: 'Scale:', value: `${config.pixelsPerUnit.toFixed(1)} px/${config.abbreviation}` },
    { label: 'Drawn By:', value: options.drawnBy || '-' },
    { label: 'Date:', value: options.date || new Date().toLocaleDateString() },
  ];

  let yOffset = 20;
  titleBlockData.forEach((item, index) => {
    const xOffset = 20 + (index % 4) * 220;
    if (index > 0 && index % 4 === 0) yOffset += 30;

    svg += `    <text x="${xOffset}" y="${yOffset}" class="title-label" fill="#666">${item.label}</text>\n`;
    svg += `    <text x="${xOffset}" y="${yOffset + 15}" class="title-text">${item.value}</text>\n`;
  });

  svg += `  </g>\n`;

  svg += `</svg>`;

  return svg;
}

/**
 * Export layout to PDF (generates SVG that can be converted to PDF client-side)
 */
export function exportToPDF(
  layoutData: LayoutData,
  options: ExportOptions
): void {
  // Generate SVG
  const svgContent = exportToSVG(layoutData, options);

  // Create a temporary link to download the SVG
  // In a real application, you would use a library like jsPDF or puppeteer
  // to convert SVG to PDF on the server or client side
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log('📄 SVG exported. For PDF conversion, integrate a library like jsPDF or use server-side rendering.');
}

/**
 * Download SVG file
 */
export function downloadSVG(
  layoutData: LayoutData,
  options: ExportOptions
): void {
  const svgContent = exportToSVG(layoutData, options);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${options.filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print layout
 */
export function printLayout(
  layoutData: LayoutData,
  options: ExportOptions
): void {
  const svgContent = exportToSVG(layoutData, options);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - ${options.title || 'Layout'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              svg { width: 100%; height: auto; }
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
