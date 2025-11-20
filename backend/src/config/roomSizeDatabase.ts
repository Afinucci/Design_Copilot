/**
 * Pharmaceutical Room Size Database
 * 
 * Comprehensive database of typical room dimensions for pharmaceutical facilities.
 * Based on industry standards from FDA, EMA, ICH, and PIC/S guidelines.
 * 
 * All dimensions are in meters (m) and square meters (m²).
 * Scaling factors help adjust room sizes based on production capacity.
 */

export interface RoomSizeData {
    roomType: string;
    aliases: string[]; // Alternative names for NLP matching
    category: 'Production' | 'Quality Control' | 'Warehouse' | 'Utilities' | 'Personnel' | 'Support';
    cleanroomClass?: 'A' | 'B' | 'C' | 'D' | 'CNC';
    typicalDimensions: {
        width: number; // meters
        height: number; // meters
        area: number; // square meters
    };
    sizeRange: {
        minArea: number;
        maxArea: number;
    };
    scalingFactors?: {
        perBatchLiter?: number; // m² increase per liter of batch size
        perThroughputUnit?: number; // m² increase per unit/day throughput
    };
    equipmentFootprint?: number; // Percentage of area occupied by equipment (0-1)
    shapeType?: string; // Preferred shape ('rectangle', 'L-shape', etc.)
    description?: string;
}

/**
 * Comprehensive room size database for pharmaceutical facilities
 */
export const ROOM_SIZE_DATABASE: RoomSizeData[] = [
    // ===================================
    // PRODUCTION AREAS - Grade A/B
    // ===================================
    {
        roomType: 'Sterile Filling Room',
        aliases: ['filling room', 'aseptic filling', 'vial filling', 'filling area', 'grade a filling'],
        category: 'Production',
        cleanroomClass: 'A',
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 100 },
        scalingFactors: {
            perBatchLiter: 0.5, // Small increase, highly automated
            perThroughputUnit: 0.001, // Area per vial/day
        },
        equipmentFootprint: 0.5, // 50% for filling line, isolators
        shapeType: 'rectangle',
        description: 'Grade A aseptic filling area for sterile products (vials, syringes, ampoules)',
    },
    {
        roomType: 'Sterile Preparation Room',
        aliases: ['prep room', 'aseptic prep', 'grade b prep', 'preparation area', 'compounding room'],
        category: 'Production',
        cleanroomClass: 'B',
        typicalDimensions: { width: 7, height: 9, area: 63 },
        sizeRange: { minArea: 40, maxArea: 120 },
        scalingFactors: {
            perBatchLiter: 0.8,
            perThroughputUnit: 0.0015,
        },
        equipmentFootprint: 0.45,
        shapeType: 'rectangle',
        description: 'Grade B background for aseptic preparation and compounding',
    },
    {
        roomType: 'Lyophilization Room',
        aliases: ['freeze drying', 'lyophilizer room', 'lyo room', 'freeze dryer area'],
        category: 'Production',
        cleanroomClass: 'B',
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 150 },
        scalingFactors: {
            perBatchLiter: 1.2, // Large lyophilizer equipment
        },
        equipmentFootprint: 0.6,
        shapeType: 'rectangle',
        description: 'Freeze-drying/lyophilization area for sterile products',
    },

    // ===================================
    // PRODUCTION AREAS - Grade C/D
    // ===================================
    {
        roomType: 'Granulation Room',
        aliases: ['granulator room', 'wet granulation', 'dry granulation', 'granulation area'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 150 },
        scalingFactors: {
            perBatchLiter: 1.0,
        },
        equipmentFootprint: 0.5,
        shapeType: 'rectangle',
        description: 'Granulation area for tablet/capsule production',
    },
    {
        roomType: 'Compression Room',
        aliases: ['tablet compression', 'tableting', 'compression area', 'tablet press room'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 9, height: 11, area: 99 },
        sizeRange: { minArea: 60, maxArea: 180 },
        scalingFactors: {
            perThroughputUnit: 0.00005, // Tablets per day
        },
        equipmentFootprint: 0.4,
        shapeType: 'rectangle',
        description: 'Tablet compression and forming area',
    },
    {
        roomType: 'Coating Room',
        aliases: ['film coating', 'tablet coating', 'coating area', 'coater room'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 7, height: 9, area: 63 },
        sizeRange: { minArea: 40, maxArea: 120 },
        scalingFactors: {
            perBatchLiter: 0.8,
        },
        equipmentFootprint: 0.5,
        shapeType: 'rectangle',
        description: 'Film coating area for tablets',
    },
    {
        roomType: 'Capsule Filling Room',
        aliases: ['encapsulation', 'capsule filling', 'filling area', 'capsule area'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 7, height: 9, area: 63 },
        sizeRange: { minArea: 40, maxArea: 120 },
        scalingFactors: {
            perThroughputUnit: 0.00003,
        },
        equipmentFootprint: 0.45,
        shapeType: 'rectangle',
        description: 'Capsule filling and sealing area',
    },
    {
        roomType: 'Packaging Room',
        aliases: ['primary packaging', 'secondary packaging', 'packaging area', 'pack room'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 12, height: 15, area: 180 },
        sizeRange: { minArea: 100, maxArea: 400 },
        scalingFactors: {
            perThroughputUnit: 0.0001,
        },
        equipmentFootprint: 0.35,
        shapeType: 'rectangle',
        description: 'Primary and secondary packaging area',
    },
    {
        roomType: 'Labeling Room',
        aliases: ['labeling area', 'label application', 'labelling'],
        category: 'Production',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 150 },
        equipmentFootprint: 0.3,
        shapeType: 'rectangle',
        description: 'Labeling and serialization area',
    },

    // ===================================
    // WEIGHING & DISPENSING
    // ===================================
    {
        roomType: 'Weighing Room',
        aliases: ['dispensing', 'weighing area', 'dispensary', 'weighing booth'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 5, height: 6, area: 30 },
        sizeRange: { minArea: 20, maxArea: 60 },
        equipmentFootprint: 0.4,
        shapeType: 'rectangle',
        description: 'Raw material weighing and dispensing area',
    },
    {
        roomType: 'Sampling Room',
        aliases: ['sampling booth', 'sample room', 'sampling area'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 4, height: 5, area: 20 },
        sizeRange: { minArea: 15, maxArea: 40 },
        equipmentFootprint: 0.3,
        shapeType: 'rectangle',
        description: 'Material sampling area with containment',
    },

    // ===================================
    // AIRLOCKS & PASS-THROUGHS
    // ===================================
    {
        roomType: 'Material Airlock',
        aliases: ['material pass', 'material pass-through', 'mat airlock', 'transfer airlock'],
        category: 'Support',
        cleanroomClass: 'B', // Matches adjacent cleanroom
        typicalDimensions: { width: 3, height: 3, area: 9 },
        sizeRange: { minArea: 6, maxArea: 20 },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Airlock for material transfer between cleanroom grades',
    },
    {
        roomType: 'Personnel Airlock',
        aliases: ['personnel pass', 'personnel gowning', 'entry airlock', 'gowning airlock'],
        category: 'Personnel',
        cleanroomClass: 'C',
        typicalDimensions: { width: 3, height: 4, area: 12 },
        sizeRange: { minArea: 8, maxArea: 25 },
        equipmentFootprint: 0.1,
        shapeType: 'rectangle',
        description: 'Airlock for personnel entry/exit with gowning',
    },

    // ===================================
    // QUALITY CONTROL
    // ===================================
    {
        roomType: 'Analytical Laboratory',
        aliases: ['analytical lab', 'chemistry lab', 'qc lab', 'testing lab', 'analysis lab'],
        category: 'Quality Control',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 80, maxArea: 250 },
        equipmentFootprint: 0.5,
        shapeType: 'rectangle',
        description: 'Analytical testing laboratory for chemical analysis',
    },
    {
        roomType: 'Microbiology Laboratory',
        aliases: ['micro lab', 'microbiology lab', 'bio lab', 'sterility testing'],
        category: 'Quality Control',
        cleanroomClass: 'B',
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 150 },
        equipmentFootprint: 0.45,
        shapeType: 'rectangle',
        description: 'Microbiology laboratory for sterility and bioburden testing',
    },
    {
        roomType: 'Stability Chamber Room',
        aliases: ['stability room', 'stability storage', 'stability testing', 'climate chamber'],
        category: 'Quality Control',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 100 },
        equipmentFootprint: 0.6, // Large chambers
        shapeType: 'rectangle',
        description: 'Controlled environment for stability testing',
    },
    {
        roomType: 'Instrument Room',
        aliases: ['instrument lab', 'hplc room', 'gcms room', 'analytical instruments'],
        category: 'Quality Control',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 7, height: 8, area: 56 },
        sizeRange: { minArea: 35, maxArea: 120 },
        equipmentFootprint: 0.55,
        shapeType: 'rectangle',
        description: 'Room for analytical instruments (HPLC, GC-MS, etc.)',
    },

    // ===================================
    // WAREHOUSE & STORAGE
    // ===================================
    {
        roomType: 'Raw Material Warehouse',
        aliases: ['raw material storage', 'rm warehouse', 'raw materials', 'incoming storage'],
        category: 'Warehouse',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 15, height: 20, area: 300 },
        sizeRange: { minArea: 150, maxArea: 1000 },
        scalingFactors: {
            perThroughputUnit: 0.0005,
        },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Storage for raw materials and excipients',
    },
    {
        roomType: 'Finished Goods Warehouse',
        aliases: ['finished goods storage', 'fg warehouse', 'finished product storage', 'product warehouse'],
        category: 'Warehouse',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 15, height: 20, area: 300 },
        sizeRange: { minArea: 150, maxArea: 1000 },
        scalingFactors: {
            perThroughputUnit: 0.0008,
        },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Storage for finished pharmaceutical products',
    },
    {
        roomType: 'Quarantine Storage',
        aliases: ['quarantine area', 'quarantine room', 'hold area', 'quarantine warehouse'],
        category: 'Warehouse',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 40, maxArea: 200 },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Quarantine storage for materials pending release',
    },
    {
        roomType: 'Cold Storage',
        aliases: ['refrigerated storage', 'cold room', 'cold chain', 'cold warehouse'],
        category: 'Warehouse',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 25, maxArea: 150 },
        equipmentFootprint: 0.15,
        shapeType: 'rectangle',
        description: 'Temperature-controlled storage (2-8°C)',
    },
    {
        roomType: 'Packaging Material Storage',
        aliases: ['packaging storage', 'pm storage', 'packaging warehouse', 'pack material storage'],
        category: 'Warehouse',
        cleanroomClass: 'CNC',
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 60, maxArea: 300 },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Storage for packaging materials',
    },

    // ===================================
    // UTILITIES
    // ===================================
    {
        roomType: 'HVAC Room',
        aliases: ['air handling unit', 'ahu room', 'hvac equipment', 'air conditioning room'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 80, maxArea: 300 },
        equipmentFootprint: 0.7,
        shapeType: 'rectangle',
        description: 'HVAC equipment and air handling units',
    },
    {
        roomType: 'Purified Water System',
        aliases: ['water treatment', 'pw system', 'wfi system', 'water purification', 'water room'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 200 },
        equipmentFootprint: 0.65,
        shapeType: 'rectangle',
        description: 'Purified water and WFI generation system',
    },
    {
        roomType: 'Compressed Air System',
        aliases: ['compressed air room', 'air compressor', 'utility air'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 100 },
        equipmentFootprint: 0.6,
        shapeType: 'rectangle',
        description: 'Compressed air generation and distribution',
    },
    {
        roomType: 'Electrical Room',
        aliases: ['electrical switchgear', 'power distribution', 'electrical equipment'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 120 },
        equipmentFootprint: 0.5,
        shapeType: 'rectangle',
        description: 'Electrical distribution and control equipment',
    },
    {
        roomType: 'Boiler Room',
        aliases: ['boiler', 'steam generation', 'steam room'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 7, height: 9, area: 63 },
        sizeRange: { minArea: 40, maxArea: 150 },
        equipmentFootprint: 0.6,
        shapeType: 'rectangle',
        description: 'Steam generation for facility',
    },
    {
        roomType: 'Chiller Room',
        aliases: ['chiller', 'cooling system', 'refrigeration plant'],
        category: 'Utilities',
        cleanroomClass: undefined,
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 200 },
        equipmentFootprint: 0.65,
        shapeType: 'rectangle',
        description: 'Chilled water generation for HVAC',
    },

    // ===================================
    // PERSONNEL AREAS
    // ===================================
    {
        roomType: 'Gowning Room',
        aliases: ['changing room', 'gowning area', 'dress room', 'cleanroom gowning'],
        category: 'Personnel',
        cleanroomClass: 'D',
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 100 },
        equipmentFootprint: 0.2, // Lockers and benches
        shapeType: 'rectangle',
        description: 'Personnel gowning and changing area',
    },
    {
        roomType: 'Washroom',
        aliases: ['bathroom', 'restroom', 'toilet', 'washing facilities'],
        category: 'Personnel',
        cleanroomClass: undefined,
        typicalDimensions: { width: 4, height: 5, area: 20 },
        sizeRange: { minArea: 12, maxArea: 40 },
        equipmentFootprint: 0.4,
        shapeType: 'rectangle',
        description: 'Personnel washrooms and toilets',
    },
    {
        roomType: 'Break Room',
        aliases: ['cafeteria', 'canteen', 'lunch room', 'rest area'],
        category: 'Personnel',
        cleanroomClass: undefined,
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 40, maxArea: 200 },
        equipmentFootprint: 0.3,
        shapeType: 'rectangle',
        description: 'Employee break and dining area',
    },
    {
        roomType: 'Office Area',
        aliases: ['office', 'administrative office', 'desk area'],
        category: 'Personnel',
        cleanroomClass: undefined,
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 50, maxArea: 300 },
        equipmentFootprint: 0.25,
        shapeType: 'rectangle',
        description: 'Administrative office space',
    },
    {
        roomType: 'Training Room',
        aliases: ['training area', 'meeting room', 'conference room'],
        category: 'Personnel',
        cleanroomClass: undefined,
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 40, maxArea: 150 },
        equipmentFootprint: 0.3,
        shapeType: 'rectangle',
        description: 'Training and meeting facilities',
    },

    // ===================================
    // SUPPORT AREAS
    // ===================================
    {
        roomType: 'Waste Disposal Room',
        aliases: ['waste room', 'waste management', 'disposal area', 'waste storage'],
        category: 'Support',
        cleanroomClass: undefined,
        typicalDimensions: { width: 5, height: 6, area: 30 },
        sizeRange: { minArea: 20, maxArea: 80 },
        equipmentFootprint: 0.3,
        shapeType: 'rectangle',
        description: 'Waste segregation and temporary storage',
    },
    {
        roomType: 'Maintenance Workshop',
        aliases: ['maintenance room', 'workshop', 'tool room', 'maintenance area'],
        category: 'Support',
        cleanroomClass: undefined,
        typicalDimensions: { width: 8, height: 10, area: 80 },
        sizeRange: { minArea: 50, maxArea: 150 },
        equipmentFootprint: 0.4,
        shapeType: 'rectangle',
        description: 'Maintenance and repair workshop',
    },
    {
        roomType: 'Receiving Area',
        aliases: ['receiving dock', 'goods receiving', 'inbound dock', 'receiving bay'],
        category: 'Support',
        cleanroomClass: undefined,
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 80, maxArea: 300 },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Material receiving and inspection area',
    },
    {
        roomType: 'Shipping Area',
        aliases: ['shipping dock', 'dispatch', 'outbound dock', 'loading bay'],
        category: 'Support',
        cleanroomClass: undefined,
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 80, maxArea: 300 },
        equipmentFootprint: 0.2,
        shapeType: 'rectangle',
        description: 'Finished goods shipping and dispatch',
    },
    {
        roomType: 'Equipment Staging',
        aliases: ['staging area', 'equipment storage', 'clean equipment storage'],
        category: 'Support',
        cleanroomClass: 'D',
        typicalDimensions: { width: 6, height: 8, area: 48 },
        sizeRange: { minArea: 30, maxArea: 100 },
        equipmentFootprint: 0.25,
        shapeType: 'rectangle',
        description: 'Clean equipment staging and storage',
    },
    {
        roomType: 'Corridor',
        aliases: ['hallway', 'corridor area', 'passageway'],
        category: 'Support',
        cleanroomClass: 'D',
        typicalDimensions: { width: 2.5, height: 10, area: 25 },
        sizeRange: { minArea: 15, maxArea: 100 },
        equipmentFootprint: 0.05,
        shapeType: 'rectangle',
        description: 'Cleanroom corridor for material/personnel movement',
    },

    // ===================================
    // SPECIALIZED PRODUCTION
    // ===================================
    {
        roomType: 'API Manufacturing',
        aliases: ['api room', 'active ingredient', 'api synthesis', 'api production'],
        category: 'Production',
        cleanroomClass: 'D',
        typicalDimensions: { width: 12, height: 15, area: 180 },
        sizeRange: { minArea: 100, maxArea: 400 },
        scalingFactors: {
            perBatchLiter: 2.0,
        },
        equipmentFootprint: 0.55,
        shapeType: 'rectangle',
        description: 'Active Pharmaceutical Ingredient manufacturing',
    },
    {
        roomType: 'Fermentation Room',
        aliases: ['bioreactor room', 'fermentation', 'cell culture', 'bioreactor area'],
        category: 'Production',
        cleanroomClass: 'C',
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 80, maxArea: 300 },
        scalingFactors: {
            perBatchLiter: 1.5,
        },
        equipmentFootprint: 0.6,
        shapeType: 'rectangle',
        description: 'Fermentation and bioreactor area for biologics',
    },
    {
        roomType: 'Purification Room',
        aliases: ['purification', 'chromatography', 'downstream processing'],
        category: 'Production',
        cleanroomClass: 'C',
        typicalDimensions: { width: 10, height: 12, area: 120 },
        sizeRange: { minArea: 70, maxArea: 250 },
        equipmentFootprint: 0.55,
        shapeType: 'rectangle',
        description: 'Protein purification and chromatography',
    },
];

/**
 * Search room size data by room type name (fuzzy matching)
 */
export function findRoomSize(roomName: string): RoomSizeData | null {
    const searchTerm = roomName.toLowerCase().trim();

    // Exact match on roomType
    const exactMatch = ROOM_SIZE_DATABASE.find(
        room => room.roomType.toLowerCase() === searchTerm
    );
    if (exactMatch) return exactMatch;

    // Check aliases
    const aliasMatch = ROOM_SIZE_DATABASE.find(room =>
        room.aliases.some(alias => alias.toLowerCase() === searchTerm)
    );
    if (aliasMatch) return aliasMatch;

    // Partial match on roomType
    const partialMatch = ROOM_SIZE_DATABASE.find(room =>
        room.roomType.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(room.roomType.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Partial match on aliases
    const aliasPartialMatch = ROOM_SIZE_DATABASE.find(room =>
        room.aliases.some(alias =>
            alias.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(alias.toLowerCase())
        )
    );

    return aliasPartialMatch || null;
}

/**
 * Get all rooms in a category
 */
export function getRoomsByCategory(
    category: 'Production' | 'Quality Control' | 'Warehouse' | 'Utilities' | 'Personnel' | 'Support'
): RoomSizeData[] {
    return ROOM_SIZE_DATABASE.filter(room => room.category === category);
}

/**
 * Get all rooms with a specific cleanroom class
 */
export function getRoomsByCleanroomClass(
    cleanroomClass: 'A' | 'B' | 'C' | 'D' | 'CNC'
): RoomSizeData[] {
    return ROOM_SIZE_DATABASE.filter(room => room.cleanroomClass === cleanroomClass);
}

/**
 * Scale room dimensions based on capacity parameters
 */
export function scaleRoomDimensions(
    room: RoomSizeData,
    capacity?: { batchSize?: number; throughput?: number }
): { width: number; height: number; area: number } {
    let area = room.typicalDimensions.area;

    // Apply scaling factors
    if (capacity) {
        if (capacity.batchSize && room.scalingFactors?.perBatchLiter) {
            area += capacity.batchSize * room.scalingFactors.perBatchLiter;
        }
        if (capacity.throughput && room.scalingFactors?.perThroughputUnit) {
            area += capacity.throughput * room.scalingFactors.perThroughputUnit;
        }
    }

    // Clamp to min/max range
    area = Math.max(room.sizeRange.minArea, Math.min(area, room.sizeRange.maxArea));

    // Calculate width and height maintaining aspect ratio
    const aspectRatio = room.typicalDimensions.width / room.typicalDimensions.height;
    const height = Math.sqrt(area / aspectRatio);
    const width = area / height;

    return {
        width: Math.round(width * 10) / 10, // Round to 1 decimal
        height: Math.round(height * 10) / 10,
        area: Math.round(area * 10) / 10,
    };
}

/**
 * Get all available room types (for autocomplete/suggestions)
 */
export function getAllRoomTypes(): string[] {
    return ROOM_SIZE_DATABASE.map(room => room.roomType);
}

export default ROOM_SIZE_DATABASE;
