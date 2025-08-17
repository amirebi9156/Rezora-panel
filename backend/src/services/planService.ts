import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

export interface VPNPlan {
  id: string;
  name: string;
  description?: string;
  panelId: string;
  dataLimit: number; // in GB
  duration: number; // in days
  price: number; // in Tomans
  isVisible: boolean;
  maxConnections: number;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  totalSubscriptions: number;
  averagePrice: number;
  mostPopularPlan: string | null;
}

export class PlanService {
  private db = getDatabase();

  async createPlan(planData: Omit<VPNPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<VPNPlan> {
    try {
      const result = await this.db.query(
        `INSERT INTO vpn_plans (
           name, description, panel_id, data_limit, duration, price, 
           is_visible, max_connections, features, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         RETURNING *`,
        [
          planData.name,
          planData.description,
          planData.panelId,
          planData.dataLimit,
          planData.duration,
          planData.price,
          planData.isVisible,
          planData.maxConnections,
          JSON.stringify(planData.features)
        ]
      );

      logger.info(`Plan created: ${planData.name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating plan:', error);
      throw new Error('Failed to create plan');
    }
  }

  async getPlanById(id: string): Promise<VPNPlan | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE id = $1',
        [id]
      );
      
      if (result.rows[0]) {
        // Parse features JSON
        const plan = result.rows[0];
        plan.features = plan.features ? JSON.parse(plan.features) : [];
        return plan;
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching plan by ID:', error);
      throw new Error('Failed to fetch plan');
    }
  }

  async getAllPlans(): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans ORDER BY price ASC, data_limit ASC'
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching all plans:', error);
      throw new Error('Failed to fetch plans');
    }
  }

  async getActivePlans(): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE is_visible = true ORDER BY price ASC, data_limit ASC'
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching active plans:', error);
      throw new Error('Failed to fetch active plans');
    }
  }

  async getPlansByPanel(panelId: string): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE panel_id = $1 ORDER BY price ASC',
        [panelId]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching plans by panel:', error);
      throw new Error('Failed to fetch plans by panel');
    }
  }

  async updatePlan(id: string, updates: Partial<VPNPlan>): Promise<VPNPlan> {
    try {
      const fields = Object.keys(updates).map((key, index) => {
        // Handle special cases
        if (key === 'features') {
          return `features = $${index + 2}::jsonb`;
        }
        return `${key} = $${index + 2}`;
      });
      
      const values = Object.values(updates).map(value => {
        // Handle special cases
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        return value;
      });
      
      const result = await this.db.query(
        `UPDATE vpn_plans 
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );

      if (result.rows.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = result.rows[0];
      plan.features = plan.features ? JSON.parse(plan.features) : [];
      
      logger.info(`Plan updated: ${id}`);
      return plan;
    } catch (error) {
      logger.error('Error updating plan:', error);
      throw new Error('Failed to update plan');
    }
  }

  async deletePlan(id: string): Promise<void> {
    try {
      // Check if plan has active subscriptions
      const subscriptionsResult = await this.db.query(
        'SELECT COUNT(*) as count FROM subscriptions WHERE plan_id = $1 AND status = $2',
        [id, 'active']
      );

      if (parseInt(subscriptionsResult.rows[0].count) > 0) {
        throw new Error('Cannot delete plan with active subscriptions');
      }

      const result = await this.db.query(
        'DELETE FROM vpn_plans WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('Plan not found');
      }

      logger.info(`Plan deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting plan:', error);
      throw new Error('Failed to delete plan');
    }
  }

  async togglePlanVisibility(id: string): Promise<VPNPlan> {
    try {
      const result = await this.db.query(
        `UPDATE vpn_plans 
         SET is_visible = NOT is_visible, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = result.rows[0];
      plan.features = plan.features ? JSON.parse(plan.features) : [];
      
      logger.info(`Plan visibility toggled: ${id} -> ${plan.is_visible ? 'visible' : 'hidden'}`);
      return plan;
    } catch (error) {
      logger.error('Error toggling plan visibility:', error);
      throw new Error('Failed to toggle plan visibility');
    }
  }

  async duplicatePlan(id: string, newName: string): Promise<VPNPlan> {
    try {
      const originalPlan = await this.getPlanById(id);
      if (!originalPlan) {
        throw new Error('Original plan not found');
      }

      const newPlan = await this.createPlan({
        ...originalPlan,
        name: newName,
        isVisible: false // Start as hidden
      });

      logger.info(`Plan duplicated: ${id} -> ${newPlan.id}`);
      return newPlan;
    } catch (error) {
      logger.error('Error duplicating plan:', error);
      throw new Error('Failed to duplicate plan');
    }
  }

  async getPlanStats(): Promise<PlanStats> {
    try {
      // Total plans
      const totalPlansResult = await this.db.query(
        'SELECT COUNT(*) as total FROM vpn_plans'
      );

      // Active plans
      const activePlansResult = await this.db.query(
        'SELECT COUNT(*) as total FROM vpn_plans WHERE is_visible = true'
      );

      // Total subscriptions
      const totalSubscriptionsResult = await this.db.query(
        'SELECT COUNT(*) as total FROM subscriptions'
      );

      // Average price
      const averagePriceResult = await this.db.query(
        'SELECT COALESCE(AVG(price), 0) as average FROM vpn_plans WHERE is_visible = true'
      );

      // Most popular plan
      const mostPopularResult = await this.db.query(
        `SELECT p.name, COUNT(s.id) as subscription_count
         FROM vpn_plans p
         LEFT JOIN subscriptions s ON p.id = s.plan_id
         WHERE p.is_visible = true
         GROUP BY p.id, p.name
         ORDER BY subscription_count DESC
         LIMIT 1`
      );

      return {
        totalPlans: parseInt(totalPlansResult.rows[0].total) || 0,
        activePlans: parseInt(activePlansResult.rows[0].total) || 0,
        totalSubscriptions: parseInt(totalSubscriptionsResult.rows[0].total) || 0,
        averagePrice: parseInt(averagePriceResult.rows[0].average) || 0,
        mostPopularPlan: mostPopularResult.rows[0]?.name || null
      };
    } catch (error) {
      logger.error('Error getting plan stats:', error);
      throw new Error('Failed to get plan statistics');
    }
  }

  async searchPlans(query: string): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM vpn_plans 
         WHERE name ILIKE $1 
            OR description ILIKE $1
         ORDER BY price ASC, data_limit ASC`,
        [`%${query}%`]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error searching plans:', error);
      throw new Error('Failed to search plans');
    }
  }

  async getPlansByPriceRange(minPrice: number, maxPrice: number): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE price BETWEEN $1 AND $2 AND is_visible = true ORDER BY price ASC',
        [minPrice, maxPrice]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching plans by price range:', error);
      throw new Error('Failed to fetch plans by price range');
    }
  }

  async getPlansByDataRange(minData: number, maxData: number): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE data_limit BETWEEN $1 AND $2 AND is_visible = true ORDER BY data_limit ASC',
        [minData, maxData]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching plans by data range:', error);
      throw new Error('Failed to fetch plans by data range');
    }
  }

  async getPlansByDuration(duration: number): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM vpn_plans WHERE duration = $1 AND is_visible = true ORDER BY price ASC',
        [duration]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching plans by duration:', error);
      throw new Error('Failed to fetch plans by duration');
    }
  }

  async updatePlanFeatures(id: string, features: string[]): Promise<VPNPlan> {
    try {
      const result = await this.db.query(
        `UPDATE vpn_plans 
         SET features = $2::jsonb, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, JSON.stringify(features)]
      );

      if (result.rows.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = result.rows[0];
      plan.features = plan.features ? JSON.parse(plan.features) : [];
      
      logger.info(`Plan features updated: ${id}`);
      return plan;
    } catch (error) {
      logger.error('Error updating plan features:', error);
      throw new Error('Failed to update plan features');
    }
  }

  async getPopularPlans(limit: number = 5): Promise<VPNPlan[]> {
    try {
      const result = await this.db.query(
        `SELECT p.*, COUNT(s.id) as subscription_count
         FROM vpn_plans p
         LEFT JOIN subscriptions s ON p.id = s.plan_id
         WHERE p.is_visible = true
         GROUP BY p.id
         ORDER BY subscription_count DESC, p.price ASC
         LIMIT $1`,
        [limit]
      );
      
      // Parse features JSON for each plan
      return result.rows.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : []
      }));
    } catch (error) {
      logger.error('Error fetching popular plans:', error);
      throw new Error('Failed to fetch popular plans');
    }
  }

  async validatePlanData(planData: Partial<VPNPlan>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!planData.name || planData.name.trim().length < 3) {
      errors.push('Plan name must be at least 3 characters long');
    }

    if (!planData.panelId) {
      errors.push('Panel ID is required');
    }

    if (!planData.dataLimit || planData.dataLimit <= 0) {
      errors.push('Data limit must be greater than 0');
    }

    if (!planData.duration || planData.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (!planData.price || planData.price < 0) {
      errors.push('Price must be non-negative');
    }

    if (planData.maxConnections && planData.maxConnections <= 0) {
      errors.push('Max connections must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
