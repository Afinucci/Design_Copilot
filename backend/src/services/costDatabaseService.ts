import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { CleanroomCostProfile, RoomCostFactors } from '../../../shared/types';

interface CostDatabaseFile {
  cleanroomCosts: CleanroomCostProfile[];
  updatedAt: string;
}

export interface CleanroomCostProfileInput extends RoomCostFactors {
  id?: string;
  cleanroomClass: string;
  name?: string;
  description?: string;
  currency?: string;
  unitType?: string;
  unitLabel?: string;
}

class CostDatabaseService {
  private static instance: CostDatabaseService;
  private data: CostDatabaseFile | null = null;
  private readonly filePath: string;
  private initialized = false;
  private defaultFactors: Record<string, RoomCostFactors> = {};

  private constructor() {
    this.filePath = path.join(process.cwd(), 'backend', 'data', 'cleanroom-costs.json');
  }

  public static getInstance(): CostDatabaseService {
    if (!CostDatabaseService.instance) {
      CostDatabaseService.instance = new CostDatabaseService();
    }
    return CostDatabaseService.instance;
  }

  public async initialize(defaultFactors: Record<string, RoomCostFactors>): Promise<void> {
    // Persist defaults for later use (even if initialize is called multiple times)
    if (Object.keys(defaultFactors || {}).length > 0) {
      this.defaultFactors = defaultFactors;
    }

    if (this.initialized) {
      return;
    }

    await this.ensureDirectoryExists();
    await this.loadOrCreateDatabase();
    this.initialized = true;
  }

  public async getCleanroomCostProfiles(): Promise<CleanroomCostProfile[]> {
    await this.ensureDataLoaded();
    return this.data!.cleanroomCosts;
  }

  public async getCleanroomCostFactor(cleanroomClass: string): Promise<CleanroomCostProfile | undefined> {
    await this.ensureDataLoaded();
    const normalized = cleanroomClass?.toUpperCase();
    return this.data!.cleanroomCosts.find(profile => profile.cleanroomClass?.toUpperCase() === normalized);
  }

  public async getCleanroomCostFactorsMap(): Promise<Record<string, CleanroomCostProfile>> {
    await this.ensureDataLoaded();
    return this.data!.cleanroomCosts.reduce<Record<string, CleanroomCostProfile>>((acc, profile) => {
      if (profile.cleanroomClass) {
        acc[profile.cleanroomClass.toUpperCase()] = profile;
      }
      return acc;
    }, {});
  }

  public getLastUpdated(): string | null {
    return this.data?.updatedAt || null;
  }

  public async upsertCleanroomCostProfile(input: CleanroomCostProfileInput): Promise<CleanroomCostProfile> {
    await this.ensureDataLoaded();

    const normalizedClass = input.cleanroomClass?.toUpperCase();
    if (!normalizedClass) {
      throw new Error('Cleanroom class is required');
    }

    const timestamp = new Date().toISOString();
    const normalizedUnitType = input.unitType
      ? input.unitType
      : input.unitLabel?.toLowerCase() === 'm²'
        ? 'sqm'
        : undefined;
    const unitType = normalizedUnitType || 'sqm';

    const payload: CleanroomCostProfile = {
      id: input.id || randomUUID(),
      cleanroomClass: normalizedClass,
      name: input.name || `Class ${normalizedClass}`,
      description: input.description,
      baseConstructionCostPerSqm: Number(input.baseConstructionCostPerSqm),
      cleanroomMultiplier: Number(input.cleanroomMultiplier || 1),
      hvacCostPerSqm: Number(input.hvacCostPerSqm),
      validationCostPerSqm: Number(input.validationCostPerSqm),
      currency: input.currency || 'USD',
      unitType: unitType,
      unitLabel: input.unitLabel || (unitType === 'sqm' ? 'm²' : unitType),
      notes: input.notes,
      isDefault: false,
      createdAt: input.id
        ? this.findProfileById(input.id)?.createdAt || timestamp
        : timestamp,
      updatedAt: timestamp
    };

    const existingByIdIndex = input.id
      ? this.data!.cleanroomCosts.findIndex(profile => profile.id === input.id)
      : -1;

    const existingByClassIndex = this.data!.cleanroomCosts.findIndex(
      profile => profile.cleanroomClass.toUpperCase() === normalizedClass
    );

    if (existingByIdIndex !== -1) {
      this.data!.cleanroomCosts[existingByIdIndex] = {
        ...this.data!.cleanroomCosts[existingByIdIndex],
        ...payload
      };
    } else if (existingByClassIndex !== -1) {
      // Replace by class to keep one entry per grade
      const existing = this.data!.cleanroomCosts[existingByClassIndex];
      this.data!.cleanroomCosts[existingByClassIndex] = {
        ...existing,
        ...payload,
        id: payload.id,
        createdAt: existing.createdAt || payload.createdAt
      };
    } else {
      this.data!.cleanroomCosts.push(payload);
    }

    await this.persist();
    return payload;
  }

  public async deleteCleanroomCostProfile(id: string): Promise<void> {
    await this.ensureDataLoaded();
    const initialLength = this.data!.cleanroomCosts.length;
    this.data!.cleanroomCosts = this.data!.cleanroomCosts.filter(profile => profile.id !== id);
    if (this.data!.cleanroomCosts.length === initialLength) {
      throw new Error('Profile not found');
    }
    await this.persist();
  }

  private async ensureDataLoaded(): Promise<void> {
    if (!this.initialized) {
      await this.initialize(this.defaultFactors);
    } else if (!this.data) {
      await this.loadOrCreateDatabase();
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async loadOrCreateDatabase(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(raw) as CostDatabaseFile;

      if (!Array.isArray(this.data.cleanroomCosts)) {
        throw new Error('Invalid cost database format');
      }
    } catch (error) {
      // Create from defaults if file missing or invalid
      this.data = {
        cleanroomCosts: this.buildDefaultProfiles(),
        updatedAt: new Date().toISOString()
      };
      await this.persist();
    }
  }

  private buildDefaultProfiles(): CleanroomCostProfile[] {
    const timestamp = new Date().toISOString();
    return Object.entries(this.defaultFactors || {}).map(([cleanroomClass, factors]) => ({
      id: `default-${cleanroomClass}`,
      cleanroomClass: cleanroomClass.toUpperCase(),
      name: `Class ${cleanroomClass.toUpperCase()}`,
      description: 'Default cost factors',
      baseConstructionCostPerSqm: factors.baseConstructionCostPerSqm,
      cleanroomMultiplier: factors.cleanroomMultiplier,
      hvacCostPerSqm: factors.hvacCostPerSqm,
      validationCostPerSqm: factors.validationCostPerSqm,
      unitType: factors.unitType || 'sqm',
      unitLabel: factors.unitLabel || 'm²',
      currency: factors.currency || 'USD',
      notes: factors.notes,
      isDefault: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }));
  }

  private async persist(): Promise<void> {
    if (!this.data) return;
    this.data.updatedAt = new Date().toISOString();
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private findProfileById(id?: string): CleanroomCostProfile | undefined {
    if (!id || !this.data) return undefined;
    return this.data.cleanroomCosts.find(profile => profile.id === id);
  }
}

export default CostDatabaseService.getInstance();

