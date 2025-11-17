import {
  CostEstimationSettings,
  ProjectCostEstimate
} from '../../../shared/types';

// Equipment catalog item interface
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

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

class CostService {
  /**
   * Get current cost estimation settings
   */
  async getSettings(): Promise<CostEstimationSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/settings`);
      const data = await response.json();
      if (data.success) {
        return data.settings;
      }
      throw new Error(data.error || 'Failed to fetch settings');
    } catch (error) {
      console.error('Error fetching cost settings:', error);
      throw error;
    }
  }

  /**
   * Update cost estimation settings
   */
  async updateSettings(settings: CostEstimationSettings): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating cost settings:', error);
      throw error;
    }
  }

  /**
   * Get equipment catalog
   */
  async getEquipmentCatalog(roomType?: string): Promise<EquipmentCatalogItem[]> {
    try {
      const url = roomType
        ? `${API_BASE_URL}/api/costs/equipment-catalog?roomType=${encodeURIComponent(roomType)}`
        : `${API_BASE_URL}/api/costs/equipment-catalog`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        return data.equipment;
      }
      throw new Error(data.error || 'Failed to fetch equipment catalog');
    } catch (error) {
      console.error('Error fetching equipment catalog:', error);
      throw error;
    }
  }

  /**
   * Calculate project costs
   */
  async calculateCosts(
    rooms: {
      id?: string;
      name?: string;
      area: number;
      cleanroomClass: string;
      roomType: string;
      equipment?: string[];
    }[],
    settings?: CostEstimationSettings
  ): Promise<ProjectCostEstimate> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rooms, settings }),
      });
      const data = await response.json();
      if (data.success) {
        return data.estimate;
      }
      throw new Error(data.error || 'Failed to calculate costs');
    } catch (error) {
      console.error('Error calculating costs:', error);
      throw error;
    }
  }

  /**
   * Save cost estimate to knowledge graph
   */
  async saveToKnowledgeGraph(
    projectName: string,
    estimate: ProjectCostEstimate
  ): Promise<{ projectId: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/save-to-kg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName, estimate }),
      });
      const data = await response.json();
      if (data.success) {
        return { projectId: data.projectId };
      }
      throw new Error(data.error || 'Failed to save to knowledge graph');
    } catch (error) {
      console.error('Error saving to knowledge graph:', error);
      throw error;
    }
  }

  /**
   * Get historical cost data
   */
  async getHistoricalData(
    roomType?: string,
    cleanroomClass?: string,
    limit?: number
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (roomType) params.append('roomType', roomType);
      if (cleanroomClass) params.append('cleanroomClass', cleanroomClass);
      if (limit) params.append('limit', limit.toString());

      const url = `${API_BASE_URL}/api/costs/historical?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error || 'Failed to fetch historical data');
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Get regional factors
   */
  async getRegionalFactors(): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/regional-factors`);
      const data = await response.json();
      if (data.success) {
        return data.factors;
      }
      throw new Error(data.error || 'Failed to fetch regional factors');
    } catch (error) {
      console.error('Error fetching regional factors:', error);
      throw error;
    }
  }

  /**
   * Get currency rates
   */
  async getCurrencyRates(): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/costs/currency-rates`);
      const data = await response.json();
      if (data.success) {
        return data.rates;
      }
      throw new Error(data.error || 'Failed to fetch currency rates');
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      throw error;
    }
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(value);
  }

  /**
   * Format large numbers with abbreviations
   */
  formatLargeNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }
}

// Export singleton instance
const costService = new CostService();
export default costService;

// Export the class for testing
export { CostService };