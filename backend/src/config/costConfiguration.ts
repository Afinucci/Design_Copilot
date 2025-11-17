import { RoomCostFactors, CostEstimationSettings } from '../../../shared/types';

// Default cost factors by cleanroom class (USD per square meter)
export const CLEANROOM_COST_FACTORS: Record<string, RoomCostFactors> = {
  'A': {
    baseConstructionCostPerSqm: 5000, // Class A (highest grade)
    cleanroomMultiplier: 3.0,
    hvacCostPerSqm: 1500,
    validationCostPerSqm: 800
  },
  'B': {
    baseConstructionCostPerSqm: 3500, // Class B
    cleanroomMultiplier: 2.5,
    hvacCostPerSqm: 1200,
    validationCostPerSqm: 600
  },
  'C': {
    baseConstructionCostPerSqm: 2500, // Class C
    cleanroomMultiplier: 2.0,
    hvacCostPerSqm: 900,
    validationCostPerSqm: 400
  },
  'D': {
    baseConstructionCostPerSqm: 1800, // Class D
    cleanroomMultiplier: 1.5,
    hvacCostPerSqm: 600,
    validationCostPerSqm: 300
  },
  'CNC': {
    baseConstructionCostPerSqm: 800, // Controlled Non-Classified
    cleanroomMultiplier: 1.0,
    hvacCostPerSqm: 300,
    validationCostPerSqm: 150
  }
};

// Room type specific cost adjustments (multipliers)
export const ROOM_TYPE_COST_ADJUSTMENTS: Record<string, number> = {
  // Production areas
  'weighing-area': 1.2, // Requires precision environmental control
  'granulation': 1.3, // Heavy equipment and dust control
  'compression': 1.4, // Specialized equipment and vibration control
  'coating': 1.3, // Specialized ventilation requirements
  'packaging': 1.1, // Standard production area

  // Quality Control
  'analytical-lab': 1.5, // Specialized lab equipment and utilities
  'microbiology': 1.8, // Highest requirements for sterility
  'stability-chamber': 1.4, // Environmental control systems
  'release-testing': 1.3, // Testing equipment

  // Warehouse
  'raw-materials': 1.0, // Basic storage
  'finished-goods': 1.0, // Basic storage
  'quarantine': 1.1, // Controlled access
  'cold-storage': 1.6, // Refrigeration systems

  // Utilities
  'hvac': 1.2, // Technical equipment
  'hvac-room': 1.2, // Technical equipment
  'purified-water': 1.8, // Water treatment systems
  'compressed-air': 1.4, // Compression equipment
  'electrical': 1.3, // Electrical infrastructure
  'electrical-room': 1.3, // Electrical infrastructure

  // Personnel
  'gowning-area': 1.2, // Special fixtures and airflow
  'change-room': 1.2, // Special fixtures and airflow
  'break-room': 0.8, // Standard office construction
  'offices': 0.7, // Standard office construction
  'training-room': 0.8, // Standard construction

  // Support
  'waste-disposal': 1.1, // Special handling requirements
  'maintenance': 0.9, // Workshop space
  'receiving': 0.8, // Standard warehouse construction
  'shipping': 0.8, // Standard warehouse construction
};

// Default equipment catalog with costs (USD)
export interface EquipmentCatalogItem {
  id: string;
  name: string;
  type: string;
  purchaseCost: number;
  installationCost: number;
  validationCost: number;
  annualMaintenanceCost: number;
  lifespan: number;
  linkedRoomTypes: string[];
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  // Weighing equipment
  {
    id: 'analytical-balance',
    name: 'Analytical Balance',
    type: 'Weighing',
    purchaseCost: 15000,
    installationCost: 2000,
    validationCost: 3000,
    annualMaintenanceCost: 2000,
    lifespan: 10,
    linkedRoomTypes: ['weighing-area', 'analytical-lab']
  },
  {
    id: 'precision-scale',
    name: 'Precision Scale',
    type: 'Weighing',
    purchaseCost: 8000,
    installationCost: 1000,
    validationCost: 2000,
    annualMaintenanceCost: 1500,
    lifespan: 10,
    linkedRoomTypes: ['weighing-area']
  },

  // Granulation equipment
  {
    id: 'high-shear-mixer',
    name: 'High Shear Mixer Granulator',
    type: 'Granulation',
    purchaseCost: 350000,
    installationCost: 50000,
    validationCost: 30000,
    annualMaintenanceCost: 25000,
    lifespan: 15,
    linkedRoomTypes: ['granulation']
  },
  {
    id: 'fluid-bed-dryer',
    name: 'Fluid Bed Dryer',
    type: 'Drying',
    purchaseCost: 280000,
    installationCost: 40000,
    validationCost: 25000,
    annualMaintenanceCost: 20000,
    lifespan: 15,
    linkedRoomTypes: ['granulation']
  },

  // Compression equipment
  {
    id: 'tablet-press',
    name: 'Rotary Tablet Press',
    type: 'Compression',
    purchaseCost: 450000,
    installationCost: 60000,
    validationCost: 40000,
    annualMaintenanceCost: 30000,
    lifespan: 20,
    linkedRoomTypes: ['compression']
  },

  // Coating equipment
  {
    id: 'coating-pan',
    name: 'Perforated Coating Pan',
    type: 'Coating',
    purchaseCost: 380000,
    installationCost: 50000,
    validationCost: 35000,
    annualMaintenanceCost: 25000,
    lifespan: 15,
    linkedRoomTypes: ['coating']
  },

  // Packaging equipment
  {
    id: 'blister-machine',
    name: 'Blister Packaging Machine',
    type: 'Packaging',
    purchaseCost: 320000,
    installationCost: 40000,
    validationCost: 25000,
    annualMaintenanceCost: 20000,
    lifespan: 15,
    linkedRoomTypes: ['packaging']
  },
  {
    id: 'bottle-filling-line',
    name: 'Bottle Filling Line',
    type: 'Packaging',
    purchaseCost: 280000,
    installationCost: 35000,
    validationCost: 20000,
    annualMaintenanceCost: 18000,
    lifespan: 15,
    linkedRoomTypes: ['packaging']
  },

  // Laboratory equipment
  {
    id: 'hplc',
    name: 'HPLC System',
    type: 'Analytical',
    purchaseCost: 85000,
    installationCost: 10000,
    validationCost: 15000,
    annualMaintenanceCost: 8000,
    lifespan: 10,
    linkedRoomTypes: ['analytical-lab', 'release-testing']
  },
  {
    id: 'dissolution-tester',
    name: 'Dissolution Tester',
    type: 'Analytical',
    purchaseCost: 45000,
    installationCost: 5000,
    validationCost: 8000,
    annualMaintenanceCost: 4000,
    lifespan: 10,
    linkedRoomTypes: ['analytical-lab', 'release-testing']
  },
  {
    id: 'spectrophotometer',
    name: 'UV-Vis Spectrophotometer',
    type: 'Analytical',
    purchaseCost: 35000,
    installationCost: 3000,
    validationCost: 5000,
    annualMaintenanceCost: 3000,
    lifespan: 10,
    linkedRoomTypes: ['analytical-lab']
  },

  // Microbiology equipment
  {
    id: 'laminar-flow-hood',
    name: 'Laminar Flow Hood',
    type: 'Sterility',
    purchaseCost: 25000,
    installationCost: 5000,
    validationCost: 8000,
    annualMaintenanceCost: 3000,
    lifespan: 15,
    linkedRoomTypes: ['microbiology']
  },
  {
    id: 'autoclave',
    name: 'Laboratory Autoclave',
    type: 'Sterilization',
    purchaseCost: 45000,
    installationCost: 8000,
    validationCost: 10000,
    annualMaintenanceCost: 4000,
    lifespan: 15,
    linkedRoomTypes: ['microbiology']
  },
  {
    id: 'incubator',
    name: 'Microbiological Incubator',
    type: 'Incubation',
    purchaseCost: 15000,
    installationCost: 2000,
    validationCost: 3000,
    annualMaintenanceCost: 2000,
    lifespan: 10,
    linkedRoomTypes: ['microbiology']
  },

  // Stability equipment
  {
    id: 'stability-chamber-unit',
    name: 'Walk-in Stability Chamber',
    type: 'Environmental',
    purchaseCost: 120000,
    installationCost: 20000,
    validationCost: 15000,
    annualMaintenanceCost: 10000,
    lifespan: 15,
    linkedRoomTypes: ['stability-chamber']
  },

  // Warehouse equipment
  {
    id: 'pallet-racking',
    name: 'Pallet Racking System',
    type: 'Storage',
    purchaseCost: 50000,
    installationCost: 10000,
    validationCost: 2000,
    annualMaintenanceCost: 1000,
    lifespan: 20,
    linkedRoomTypes: ['raw-materials', 'finished-goods', 'quarantine']
  },
  {
    id: 'cold-room-unit',
    name: 'Walk-in Cold Room',
    type: 'Refrigeration',
    purchaseCost: 80000,
    installationCost: 15000,
    validationCost: 10000,
    annualMaintenanceCost: 8000,
    lifespan: 15,
    linkedRoomTypes: ['cold-storage']
  },

  // Utility equipment
  {
    id: 'ahu',
    name: 'Air Handling Unit',
    type: 'HVAC',
    purchaseCost: 150000,
    installationCost: 30000,
    validationCost: 20000,
    annualMaintenanceCost: 12000,
    lifespan: 20,
    linkedRoomTypes: ['hvac', 'hvac-room']
  },
  {
    id: 'water-purification',
    name: 'Water Purification System',
    type: 'Utility',
    purchaseCost: 200000,
    installationCost: 40000,
    validationCost: 30000,
    annualMaintenanceCost: 15000,
    lifespan: 15,
    linkedRoomTypes: ['purified-water']
  },
  {
    id: 'air-compressor',
    name: 'Industrial Air Compressor',
    type: 'Utility',
    purchaseCost: 80000,
    installationCost: 15000,
    validationCost: 10000,
    annualMaintenanceCost: 8000,
    lifespan: 15,
    linkedRoomTypes: ['compressed-air']
  }
];

// Default cost estimation settings
export const DEFAULT_COST_SETTINGS: CostEstimationSettings = {
  currency: 'USD',
  regionalFactor: 1.0,
  escalationFactor: 1.0,
  contingencyPercentage: 10
};

// Regional cost factors (examples)
export const REGIONAL_FACTORS: Record<string, number> = {
  'North America': 1.0,
  'Western Europe': 1.1,
  'Eastern Europe': 0.7,
  'Asia Pacific': 0.6,
  'Latin America': 0.65,
  'Middle East': 0.9,
  'Africa': 0.55
};

// Currency conversion rates (example - should be updated regularly)
export const CURRENCY_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 0.85,
  'GBP': 0.73,
  'JPY': 110,
  'CNY': 6.5,
  'INR': 75
};

// Helper function to calculate room cost
export function calculateRoomCost(
  area: number,
  cleanroomClass: string,
  roomType: string,
  settings: CostEstimationSettings = DEFAULT_COST_SETTINGS
): {
  constructionCost: number;
  hvacCost: number;
  validationCost: number;
  totalCost: number;
} {
  const baseCostFactors = CLEANROOM_COST_FACTORS[cleanroomClass] || CLEANROOM_COST_FACTORS['CNC'];
  const roomTypeAdjustment = ROOM_TYPE_COST_ADJUSTMENTS[roomType] || 1.0;

  const constructionCost = area * baseCostFactors.baseConstructionCostPerSqm * roomTypeAdjustment * settings.regionalFactor * settings.escalationFactor;
  const hvacCost = area * baseCostFactors.hvacCostPerSqm * roomTypeAdjustment * settings.regionalFactor * settings.escalationFactor;
  const validationCost = area * baseCostFactors.validationCostPerSqm * settings.regionalFactor * settings.escalationFactor;

  return {
    constructionCost,
    hvacCost,
    validationCost,
    totalCost: constructionCost + hvacCost + validationCost
  };
}

// Helper function to get equipment for room type
export function getEquipmentForRoomType(roomType: string): EquipmentCatalogItem[] {
  return EQUIPMENT_CATALOG.filter(equipment =>
    equipment.linkedRoomTypes.includes(roomType)
  );
}

// Helper function to calculate total project cost
export function calculateProjectCost(
  rooms: { area: number; cleanroomClass: string; roomType: string; equipment?: string[] }[],
  settings: CostEstimationSettings = DEFAULT_COST_SETTINGS
): {
  roomsCost: number;
  equipmentCost: number;
  subtotal: number;
  contingency: number;
  total: number;
} {
  let roomsCost = 0;
  let equipmentCost = 0;

  rooms.forEach(room => {
    const roomCostData = calculateRoomCost(room.area, room.cleanroomClass, room.roomType, settings);
    roomsCost += roomCostData.totalCost;

    if (room.equipment) {
      room.equipment.forEach(equipmentId => {
        const equipment = EQUIPMENT_CATALOG.find(e => e.id === equipmentId);
        if (equipment) {
          equipmentCost += (equipment.purchaseCost + equipment.installationCost + equipment.validationCost) * settings.regionalFactor * settings.escalationFactor;
        }
      });
    }
  });

  const subtotal = roomsCost + equipmentCost;
  const contingency = subtotal * (settings.contingencyPercentage / 100);

  return {
    roomsCost,
    equipmentCost,
    subtotal,
    contingency,
    total: subtotal + contingency
  };
}