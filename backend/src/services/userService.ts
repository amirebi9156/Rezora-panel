import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { MarzbanService } from './marzbanService.js';

export interface User {
  id: string;
  telegramId: string;
  telegramUsername: string;
  email?: string;
  phone?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  panelId: string;
  username: string;
  password: string;
  dataLimit: number; // in GB
  usedData: number; // in GB
  remainingData: number; // in GB
  expiresAt: string;
  status: 'active' | 'expired' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisMonth: number;
  premiumUsers: number;
}

export class UserService {
  private db = getDatabase();
  private marzbanService = new MarzbanService();

  async initializeUser(telegramId: number, telegramUsername: string): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByTelegramId(telegramId);
      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const result = await this.db.query(
        `INSERT INTO users (telegram_id, telegram_username, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [telegramId.toString(), telegramUsername, 'user', 'active']
      );

      logger.info(`New user created: ${telegramId} (${telegramUsername})`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error initializing user:', error);
      throw new Error('Failed to initialize user');
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [telegramId.toString()]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching user by Telegram ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching all users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
      const values = Object.values(updates);
      
      const result = await this.db.query(
        `UPDATE users 
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Delete user subscriptions first
      await this.db.query(
        'DELETE FROM subscriptions WHERE user_id = $1',
        [id]
      );

      // Delete user payments
      await this.db.query(
        'DELETE FROM payments WHERE user_id = $1',
        [id]
      );

      // Delete user
      const result = await this.db.query(
        'DELETE FROM users WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async createSubscription(subscriptionData: {
    userId: string;
    planId: string;
    expiresAt: Date;
    dataLimit: number;
  }): Promise<Subscription> {
    try {
      // Get plan details to find panel ID
      const planResult = await this.db.query(
        'SELECT * FROM vpn_plans WHERE id = $1',
        [subscriptionData.planId]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = planResult.rows[0];
      const panelId = plan.panel_id;

      // Generate unique username
      const username = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const password = Math.random().toString(36).substr(2, 12);

      // Create user in Marzban panel
      const marzbanUser = await this.marzbanService.createUser(panelId, {
        username,
        data_limit: subscriptionData.dataLimit * 1024 * 1024 * 1024, // Convert GB to bytes
        expire: Math.floor(subscriptionData.expiresAt.getTime() / 1000), // Convert to Unix timestamp
        status: 'active'
      });

      // Create subscription in database
      const result = await this.db.query(
        `INSERT INTO subscriptions (
           user_id, plan_id, panel_id, username, password, data_limit, 
           used_data, remaining_data, expires_at, status, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [
          subscriptionData.userId,
          subscriptionData.planId,
          panelId,
          username,
          password,
          subscriptionData.dataLimit,
          0, // used_data
          subscriptionData.dataLimit, // remaining_data
          subscriptionData.expiresAt,
          'active'
        ]
      );

      logger.info(`Subscription created for user ${subscriptionData.userId}: ${username}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async getSubscriptionById(id: string): Promise<Subscription | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subscriptions WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching subscription by ID:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  async getActiveSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subscriptions WHERE user_id = $1 AND status = $2 AND expires_at > NOW() ORDER BY created_at DESC',
        [userId, 'active']
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching active subscriptions:', error);
      throw new Error('Failed to fetch active subscriptions');
    }
  }

  async getAllSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching all subscriptions:', error);
      throw new Error('Failed to fetch subscriptions');
    }
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
      const values = Object.values(updates);
      
      const result = await this.db.query(
        `UPDATE subscriptions 
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );

      if (result.rows.length === 0) {
        throw new Error('Subscription not found');
      }

      logger.info(`Subscription updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  async deleteSubscription(id: string): Promise<void> {
    try {
      const subscription = await this.getSubscriptionById(id);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Delete user from Marzban panel
      await this.marzbanService.deleteUser(subscription.panelId, subscription.username);

      // Delete subscription from database
      const result = await this.db.query(
        'DELETE FROM subscriptions WHERE id = $1',
        [id]
      );

      logger.info(`Subscription deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting subscription:', error);
      throw new Error('Failed to delete subscription');
    }
  }

  async renewSubscription(subscriptionId: string, newExpiryDate: Date): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Update expiry date in Marzban panel
      await this.marzbanService.updateUserStatus(subscription.panelId, subscription.username, 'active');

      // Update subscription in database
      const result = await this.db.query(
        `UPDATE subscriptions 
         SET expires_at = $2, status = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [subscriptionId, newExpiryDate, 'active']
      );

      logger.info(`Subscription renewed: ${subscriptionId} until ${newExpiryDate}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw new Error('Failed to renew subscription');
    }
  }

  async updateDataUsage(subscriptionId: string, usedData: number): Promise<Subscription> {
    try {
      const subscription = await this.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const remainingData = Math.max(0, subscription.dataLimit - usedData);
      const status = remainingData === 0 ? 'suspended' : subscription.status;

      const result = await this.db.query(
        `UPDATE subscriptions 
         SET used_data = $2, remaining_data = $3, status = $4, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [subscriptionId, usedData, remainingData, status]
      );

      // Update user status in Marzban panel if data is exhausted
      if (remainingData === 0) {
        await this.marzbanService.updateUserStatus(subscription.panelId, subscription.username, 'disabled');
      }

      logger.info(`Data usage updated for subscription ${subscriptionId}: ${usedData}GB used, ${remainingData}GB remaining`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating data usage:', error);
      throw new Error('Failed to update data usage');
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      // Total users
      const totalUsersResult = await this.db.query(
        'SELECT COUNT(*) as total FROM users'
      );

      // Active users
      const activeUsersResult = await this.db.query(
        'SELECT COUNT(*) as total FROM users WHERE status = $1',
        ['active']
      );

      // New users today
      const newUsersTodayResult = await this.db.query(
        'SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURRENT_DATE'
      );

      // New users this month
      const newUsersThisMonthResult = await this.db.query(
        'SELECT COUNT(*) as total FROM users WHERE DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE)'
      );

      // Premium users (users with active subscriptions)
      const premiumUsersResult = await this.db.query(
        'SELECT COUNT(DISTINCT user_id) as total FROM subscriptions WHERE status = $1 AND expires_at > NOW()',
        ['active']
      );

      return {
        totalUsers: parseInt(totalUsersResult.rows[0].total) || 0,
        activeUsers: parseInt(activeUsersResult.rows[0].total) || 0,
        newUsersToday: parseInt(newUsersTodayResult.rows[0].total) || 0,
        newUsersThisMonth: parseInt(newUsersThisMonthResult.rows[0].total) || 0,
        premiumUsers: parseInt(premiumUsersResult.rows[0].total) || 0
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM users 
         WHERE telegram_username ILIKE $1 
            OR telegram_id::text LIKE $1 
            OR email ILIKE $1
         ORDER BY created_at DESC`,
        [`%${query}%`]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }
  }

  async banUser(userId: string, reason: string): Promise<User> {
    try {
      const result = await this.db.query(
        `UPDATE users 
         SET status = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [userId, 'banned']
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Suspend all active subscriptions
      await this.db.query(
        `UPDATE subscriptions 
         SET status = $2, updated_at = NOW()
         WHERE user_id = $1 AND status = $3`,
        [userId, 'suspended', 'active']
      );

      logger.info(`User banned: ${userId}, reason: ${reason}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error banning user:', error);
      throw new Error('Failed to ban user');
    }
  }

  async unbanUser(userId: string): Promise<User> {
    try {
      const result = await this.db.query(
        `UPDATE users 
         SET status = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [userId, 'active']
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info(`User unbanned: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error unbanning user:', error);
      throw new Error('Failed to unban user');
    }
  }

  async getExpiredSubscriptions(): Promise<Subscription[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM subscriptions WHERE expires_at < NOW() AND status = $1',
        ['active']
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching expired subscriptions:', error);
      throw new Error('Failed to fetch expired subscriptions');
    }
  }

  async cleanupExpiredSubscriptions(): Promise<void> {
    try {
      const expiredSubscriptions = await this.getExpiredSubscriptions();
      
      for (const subscription of expiredSubscriptions) {
        // Update status to expired
        await this.updateSubscription(subscription.id, { status: 'expired' });
        
        // Optionally disable user in Marzban panel
        try {
          await this.marzbanService.updateUserStatus(subscription.panelId, subscription.username, 'disabled');
        } catch (error) {
          logger.warn(`Failed to disable user in panel for subscription ${subscription.id}:`, error);
        }
      }

      logger.info(`Cleaned up ${expiredSubscriptions.length} expired subscriptions`);
    } catch (error) {
      logger.error('Error cleaning up expired subscriptions:', error);
      throw new Error('Failed to cleanup expired subscriptions');
    }
  }
}
