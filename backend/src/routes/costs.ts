import { Router, Request, Response } from 'express';
import Neo4jService from '../config/database';
import {
  EQUIPMENT_CATALOG,
  DEFAULT_COST_SETTINGS,
  REGIONAL_FACTORS,
  CURRENCY_RATES,
  calculateRoomCost,
  getEquipmentForRoomType
} from '../config/costConfiguration';
import { CostEstimationSettings, ProjectCostEstimate, CostBreakdown } from '../../../shared/types';
import { asyncHandler } from '../middleware/errorHandler';
import costDatabaseService, { CleanroomCostProfileInput } from '../services/costDatabaseService';

const router = Router();

/**
 * GET /api/costs/settings
 * Get current cost estimation settings
 */
router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  try {
    const neo4jService = Neo4jService.getInstance();
    const session = neo4jService.getSession();

    try {
      // Try to get settings from Neo4j
      const result = await session.run(
        `MATCH (s:CostSettings {type: 'default'})
         RETURN s`
      );

      if (result.records.length > 0) {
        const settings = result.records[0].get('s').properties;
        res.json({
          success: true,
          settings
        });
      } else {
        // Return default settings
        res.json({
          success: true,
          settings: DEFAULT_COST_SETTINGS
        });
      }
    } finally {
      await session.close();
    }
  } catch (error) {
    // If Neo4j is not available, return default settings
    res.json({
      success: true,
      settings: DEFAULT_COST_SETTINGS,
      message: 'Using default settings (database not available)'
    });
  }
}));

/**
 * POST /api/costs/settings
 * Update cost estimation settings
 */
router.post('/settings', asyncHandler(async (req: Request, res: Response) => {
  const settings: CostEstimationSettings = req.body;

  try {
    const neo4jService = Neo4jService.getInstance();
    const session = neo4jService.getSession();

    try {
      // Save settings to Neo4j
      await session.run(
        `MERGE (s:CostSettings {type: 'default'})
         SET s.currency = $currency,
             s.regionalFactor = $regionalFactor,
             s.escalationFactor = $escalationFactor,
             s.contingencyPercentage = $contingencyPercentage,
             s.updatedAt = datetime()
         RETURN s`,
        {
          currency: settings.currency,
          regionalFactor: settings.regionalFactor,
          escalationFactor: settings.escalationFactor,
          contingencyPercentage: settings.contingencyPercentage
        }
      );

      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save settings to database',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/costs/equipment-catalog
 * Get the equipment catalog with costs
 */
router.get('/equipment-catalog', asyncHandler(async (req: Request, res: Response) => {
  const { roomType } = req.query;

  if (roomType && typeof roomType === 'string') {
    res.json({
      success: true,
      equipment: getEquipmentForRoomType(roomType)
    });
  } else {
    res.json({
      success: true,
      equipment: EQUIPMENT_CATALOG
    });
  }
}));

/**
 * GET /api/costs/database/cleanroom-costs
 * Retrieve custom cleanroom cost profiles
 */
router.get('/database/cleanroom-costs', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const profiles = await costDatabaseService.getCleanroomCostProfiles();
    res.json({
      success: true,
      profiles,
      metadata: {
        updatedAt: costDatabaseService.getLastUpdated()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load cleanroom cost profiles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/costs/database/cleanroom-costs
 * Create a new cleanroom cost profile
 */
router.post('/database/cleanroom-costs', asyncHandler(async (req: Request, res: Response) => {
  const payload = req.body as CleanroomCostProfileInput;

  if (!payload.cleanroomClass) {
    return res.status(400).json({
      success: false,
      error: 'cleanroomClass is required'
    });
  }

  try {
    const profile = await costDatabaseService.upsertCleanroomCostProfile(payload);
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save cleanroom cost profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * PUT /api/costs/database/cleanroom-costs/:id
 * Update an existing cleanroom cost profile
 */
router.put('/database/cleanroom-costs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const payload = { ...req.body, id } as CleanroomCostProfileInput;

  try {
    const profile = await costDatabaseService.upsertCleanroomCostProfile(payload);
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update cleanroom cost profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * DELETE /api/costs/database/cleanroom-costs/:id
 * Remove a cleanroom cost profile
 */
router.delete('/database/cleanroom-costs/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await costDatabaseService.deleteCleanroomCostProfile(id);
    res.json({
      success: true,
      message: 'Profile deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete cleanroom cost profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/costs/calculate
 * Calculate costs for a given layout
 */
router.post('/calculate', asyncHandler(async (req: Request, res: Response) => {
  const { rooms, settings = DEFAULT_COST_SETTINGS } = req.body;

  if (!rooms || !Array.isArray(rooms)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: rooms array is required'
    });
  }

  const projectCostEstimate: ProjectCostEstimate = {
    rooms: [],
    equipment: [],
    settings,
    subtotal: 0,
    contingency: 0,
    grandTotal: 0,
    currency: settings.currency,
    estimatedDate: new Date()
  };

  const cleanroomOverrides = await costDatabaseService.getCleanroomCostFactorsMap();

  // Calculate costs for each room
  for (const room of rooms) {
    const { area, cleanroomClass, roomType, equipment = [] } = room;

    if (!area || !cleanroomClass || !roomType) {
      continue; // Skip incomplete room data
    }

    const normalizedClass = cleanroomClass?.toUpperCase?.() || cleanroomClass;
    const customFactors = normalizedClass ? cleanroomOverrides[normalizedClass] : undefined;
    const roomCostData = calculateRoomCost(area, cleanroomClass, roomType, settings, customFactors);

    // Calculate equipment costs for this room
    let equipmentPurchaseCost = 0;
    let equipmentInstallationCost = 0;
    let equipmentValidationCost = 0;

    for (const equipmentId of equipment) {
      const equipmentItem = EQUIPMENT_CATALOG.find(e => e.id === equipmentId);
      if (equipmentItem) {
        equipmentPurchaseCost += equipmentItem.purchaseCost * settings.regionalFactor * settings.escalationFactor;
        equipmentInstallationCost += equipmentItem.installationCost * settings.regionalFactor * settings.escalationFactor;
        equipmentValidationCost += equipmentItem.validationCost * settings.regionalFactor * settings.escalationFactor;

        // Add to equipment list
        const existingEquipment = projectCostEstimate.equipment.find(e => e.equipmentId === equipmentId);
        if (existingEquipment) {
          existingEquipment.quantity += 1;
          existingEquipment.totalCost += equipmentItem.purchaseCost + equipmentItem.installationCost + equipmentItem.validationCost;
        } else {
          projectCostEstimate.equipment.push({
            equipmentId: equipmentItem.id,
            equipmentName: equipmentItem.name,
            quantity: 1,
            unitCost: equipmentItem.purchaseCost,
            totalCost: equipmentItem.purchaseCost + equipmentItem.installationCost + equipmentItem.validationCost
          });
        }
      }
    }

    const costBreakdown: CostBreakdown = {
      constructionCost: roomCostData.constructionCost,
      hvacCost: roomCostData.hvacCost,
      equipmentPurchaseCost,
      equipmentInstallationCost,
      validationCost: roomCostData.validationCost + equipmentValidationCost,
      otherCosts: 0,
      totalCost: roomCostData.totalCost + equipmentPurchaseCost + equipmentInstallationCost + equipmentValidationCost
    };

    projectCostEstimate.rooms.push({
      roomId: room.id || room.roomType,
      roomName: room.name || room.roomType,
      area,
      costBreakdown
    });

    projectCostEstimate.subtotal += costBreakdown.totalCost;
  }

  // Calculate contingency and grand total
  projectCostEstimate.contingency = projectCostEstimate.subtotal * (settings.contingencyPercentage / 100);
  projectCostEstimate.grandTotal = projectCostEstimate.subtotal + projectCostEstimate.contingency;

  res.json({
    success: true,
    estimate: projectCostEstimate
  });
}));

/**
 * POST /api/costs/save-to-kg
 * Save cost estimate to Neo4j knowledge graph
 */
router.post('/save-to-kg', asyncHandler(async (req: Request, res: Response) => {
  const { projectName, estimate }: { projectName: string; estimate: ProjectCostEstimate } = req.body;

  if (!projectName || !estimate) {
    return res.status(400).json({
      success: false,
      error: 'Project name and estimate are required'
    });
  }

  try {
    const neo4jService = Neo4jService.getInstance();
    const session = neo4jService.getSession();

    try {
      // Create project node with cost estimate
      const result = await session.run(
        `CREATE (p:Project {
           name: $projectName,
           estimatedDate: datetime($estimatedDate),
           currency: $currency,
           subtotal: $subtotal,
           contingency: $contingency,
           grandTotal: $grandTotal,
           createdAt: datetime()
         })
         WITH p
         UNWIND $rooms as room
         CREATE (r:RoomEstimate {
           roomId: room.roomId,
           roomName: room.roomName,
           area: room.area,
           constructionCost: room.costBreakdown.constructionCost,
           hvacCost: room.costBreakdown.hvacCost,
           equipmentPurchaseCost: room.costBreakdown.equipmentPurchaseCost,
           equipmentInstallationCost: room.costBreakdown.equipmentInstallationCost,
           validationCost: room.costBreakdown.validationCost,
           totalCost: room.costBreakdown.totalCost
         })
         CREATE (p)-[:HAS_ROOM_ESTIMATE]->(r)
         WITH p
         UNWIND $equipment as eq
         CREATE (e:EquipmentEstimate {
           equipmentId: eq.equipmentId,
           equipmentName: eq.equipmentName,
           quantity: eq.quantity,
           unitCost: eq.unitCost,
           totalCost: eq.totalCost
         })
         CREATE (p)-[:HAS_EQUIPMENT_ESTIMATE]->(e)
         RETURN p`,
        {
          projectName,
          estimatedDate: estimate.estimatedDate.toISOString(),
          currency: estimate.currency,
          subtotal: estimate.subtotal,
          contingency: estimate.contingency,
          grandTotal: estimate.grandTotal,
          rooms: estimate.rooms,
          equipment: estimate.equipment
        }
      );

      res.json({
        success: true,
        message: 'Cost estimate saved to knowledge graph',
        projectId: result.records[0].get('p').identity.toString()
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save estimate to knowledge graph',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/costs/historical
 * Get historical cost data from Neo4j
 */
router.get('/historical', asyncHandler(async (req: Request, res: Response) => {
  const { roomType, cleanroomClass, limit = 10 } = req.query;

  try {
    const neo4jService = Neo4jService.getInstance();
    const session = neo4jService.getSession();

    try {
      let query = `
        MATCH (p:Project)-[:HAS_ROOM_ESTIMATE]->(r:RoomEstimate)
      `;

      const params: any = { limit: parseInt(limit as string, 10) };
      const conditions = [];

      if (roomType) {
        conditions.push('r.roomId = $roomType');
        params.roomType = roomType;
      }

      if (cleanroomClass) {
        conditions.push('r.cleanroomClass = $cleanroomClass');
        params.cleanroomClass = cleanroomClass;
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += `
        RETURN p, r
        ORDER BY p.estimatedDate DESC
        LIMIT $limit
      `;

      const result = await session.run(query, params);

      const historicalData = result.records.map(record => ({
        project: record.get('p').properties,
        room: record.get('r').properties
      }));

      res.json({
        success: true,
        data: historicalData
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    res.json({
      success: true,
      data: [],
      message: 'No historical data available (database not connected)'
    });
  }
}));

/**
 * GET /api/costs/regional-factors
 * Get regional cost adjustment factors
 */
router.get('/regional-factors', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    factors: REGIONAL_FACTORS
  });
}));

/**
 * GET /api/costs/currency-rates
 * Get currency conversion rates
 */
router.get('/currency-rates', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    rates: CURRENCY_RATES
  });
}));

export default router;