/**
 * Unit system for professional floor plans
 * Converts between pixels and real-world units (feet, meters, cm)
 */

export type Unit = 'pixels' | 'feet' | 'meters' | 'centimeters' | 'inches';

export interface UnitConfig {
  unit: Unit;
  pixelsPerUnit: number; // How many pixels represent one unit
  displayName: string;
  abbreviation: string;
  precision: number; // Decimal places for display
}

export const DEFAULT_UNIT_CONFIGS: Record<Unit, Omit<UnitConfig, 'pixelsPerUnit'>> = {
  pixels: {
    unit: 'pixels',
    displayName: 'Pixels',
    abbreviation: 'px',
    precision: 0,
  },
  feet: {
    unit: 'feet',
    displayName: 'Feet',
    abbreviation: 'ft',
    precision: 1,
  },
  meters: {
    unit: 'meters',
    displayName: 'Meters',
    abbreviation: 'm',
    precision: 2,
  },
  centimeters: {
    unit: 'centimeters',
    displayName: 'Centimeters',
    abbreviation: 'cm',
    precision: 1,
  },
  inches: {
    unit: 'inches',
    displayName: 'Inches',
    abbreviation: 'in',
    precision: 1,
  },
};

/**
 * Standard scale presets for pharmaceutical facility plans
 */
export interface ScalePreset {
  name: string;
  description: string;
  pixelsPerFoot: number;
  pixelsPerMeter: number;
}

export const SCALE_PRESETS: ScalePreset[] = [
  {
    name: '1/4" = 1\'',
    description: 'Architectural - Quarter inch scale',
    pixelsPerFoot: 48, // 1/4 inch per foot at 96 DPI
    pixelsPerMeter: 157.5,
  },
  {
    name: '1/8" = 1\'',
    description: 'Architectural - Eighth inch scale',
    pixelsPerFoot: 24,
    pixelsPerMeter: 78.7,
  },
  {
    name: '1:50',
    description: 'Metric - Standard architectural',
    pixelsPerFoot: 58.4,
    pixelsPerMeter: 191.7,
  },
  {
    name: '1:100',
    description: 'Metric - Site plans',
    pixelsPerFoot: 29.2,
    pixelsPerMeter: 95.8,
  },
  {
    name: '1:200',
    description: 'Metric - Large facilities',
    pixelsPerFoot: 14.6,
    pixelsPerMeter: 47.9,
  },
  {
    name: 'Custom',
    description: 'Custom scale',
    pixelsPerFoot: 30,
    pixelsPerMeter: 100,
  },
];

export class UnitConverter {
  private config: UnitConfig;

  constructor(unit: Unit, pixelsPerUnit: number) {
    this.config = {
      ...DEFAULT_UNIT_CONFIGS[unit],
      unit,
      pixelsPerUnit,
    };
  }

  /**
   * Convert pixels to the current unit
   */
  pixelsToUnits(pixels: number): number {
    if (this.config.unit === 'pixels') {
      return pixels;
    }
    return pixels / this.config.pixelsPerUnit;
  }

  /**
   * Convert units to pixels
   */
  unitsToPixels(units: number): number {
    if (this.config.unit === 'pixels') {
      return units;
    }
    return units * this.config.pixelsPerUnit;
  }

  /**
   * Format a pixel value for display in current units
   */
  formatPixels(pixels: number): string {
    const value = this.pixelsToUnits(pixels);
    return `${value.toFixed(this.config.precision)} ${this.config.abbreviation}`;
  }

  /**
   * Format an area (square pixels) for display
   */
  formatArea(squarePixels: number): string {
    const areaInUnits = squarePixels / (this.config.pixelsPerUnit * this.config.pixelsPerUnit);

    if (this.config.unit === 'feet') {
      return `${areaInUnits.toFixed(this.config.precision)} sq ft`;
    } else if (this.config.unit === 'meters') {
      return `${areaInUnits.toFixed(this.config.precision)} m²`;
    } else if (this.config.unit === 'centimeters') {
      return `${areaInUnits.toFixed(this.config.precision)} cm²`;
    } else if (this.config.unit === 'inches') {
      return `${areaInUnits.toFixed(this.config.precision)} sq in`;
    }

    return `${squarePixels.toFixed(0)} px²`;
  }

  /**
   * Get the current unit configuration
   */
  getConfig(): UnitConfig {
    return this.config;
  }

  /**
   * Create converter from a scale preset
   */
  static fromPreset(preset: ScalePreset, useMetric: boolean = false): UnitConverter {
    if (useMetric) {
      return new UnitConverter('meters', preset.pixelsPerMeter);
    }
    return new UnitConverter('feet', preset.pixelsPerFoot);
  }

  /**
   * Create default converter (1:100 scale, metric)
   */
  static createDefault(): UnitConverter {
    const preset = SCALE_PRESETS[3]; // 1:100 scale
    return new UnitConverter('meters', preset.pixelsPerMeter);
  }

  /**
   * Convert between different unit systems
   */
  static convert(value: number, fromUnit: Unit, toUnit: Unit): number {
    // Conversion factors to meters
    const toMeters: Record<Unit, number> = {
      pixels: 0.01, // Assume 100 pixels = 1 meter for base conversion
      feet: 0.3048,
      meters: 1,
      centimeters: 0.01,
      inches: 0.0254,
    };

    const valueInMeters = value * toMeters[fromUnit];
    return valueInMeters / toMeters[toUnit];
  }
}

/**
 * Calculate wall thickness in pixels based on real-world dimensions
 */
export function getWallThicknessPixels(
  thicknessInInches: number,
  pixelsPerFoot: number
): number {
  // Convert inches to feet, then to pixels
  const thicknessInFeet = thicknessInInches / 12;
  return thicknessInFeet * pixelsPerFoot;
}

/**
 * Common wall thicknesses in pharmaceutical facilities
 */
export const WALL_THICKNESS_PRESETS = [
  { name: 'Interior Partition', inches: 4.5, description: '2x4 framing + drywall' },
  { name: 'Standard Wall', inches: 6, description: '2x4 framing + insulation' },
  { name: 'Exterior Wall', inches: 8, description: '2x6 framing + insulation' },
  { name: 'Cleanroom Wall', inches: 6, description: 'Modular cleanroom panel' },
  { name: 'Fire Wall', inches: 8, description: 'Fire-rated construction' },
  { name: 'Custom', inches: 6, description: 'Custom thickness' },
];
