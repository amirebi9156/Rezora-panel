import axios from 'axios';
import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

export interface MarzbanPanel {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  status: 'connected' | 'disconnected' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface MarzbanUser {
  id: string;
  username: string;
  data_limit: number;
  expire: number;
  status: string;
  created_at: string;
}

export interface MarzbanConfig {
  id: string;
  username: string;
  config: string;
  subscription_url: string;
}

export class MarzbanService {
  private db = getDatabase();

  async createPanel(panelData: Omit<MarzbanPanel, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<MarzbanPanel> {
    try {
      // Test connection to panel
      const isConnected = await this.testPanelConnection(panelData.url, panelData.username, panelData.password);
      
      const status = isConnected ? 'connected' : 'error';
      
      const result = await this.db.query(
        `INSERT INTO marzban_panels (name, url, username, password, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [panelData.name, panelData.url, panelData.username, panelData.password, status]
      );

      logger.info(`Panel created: ${panelData.name}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating panel:', error);
      throw new Error('Failed to create panel');
    }
  }

  async getAllPanels(): Promise<MarzbanPanel[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM marzban_panels ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching panels:', error);
      throw new Error('Failed to fetch panels');
    }
  }

  async getPanelById(id: string): Promise<MarzbanPanel | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM marzban_panels WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching panel by ID:', error);
      throw new Error('Failed to fetch panel');
    }
  }

  async updatePanel(id: string, updates: Partial<MarzbanPanel>): Promise<MarzbanPanel> {
    try {
      const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`);
      const values = Object.values(updates);
      
      const result = await this.db.query(
        `UPDATE marzban_panels 
         SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      );

      if (result.rows.length === 0) {
        throw new Error('Panel not found');
      }

      logger.info(`Panel updated: ${id}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating panel:', error);
      throw new Error('Failed to update panel');
    }
  }

  async deletePanel(id: string): Promise<void> {
    try {
      const result = await this.db.query(
        'DELETE FROM marzban_panels WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('Panel not found');
      }

      logger.info(`Panel deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting panel:', error);
      throw new Error('Failed to delete panel');
    }
  }

  async testPanelConnection(url: string, username: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(`${url}/api/admin/token`, {
        username,
        password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.status === 200 && response.data.access_token;
    } catch (error) {
      logger.error('Panel connection test failed:', error);
      return false;
    }
  }

  async getPanelToken(panelId: string): Promise<string | null> {
    try {
      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.post(`${panel.url}/api/admin/token`, {
        username: panel.username,
        password: panel.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.access_token) {
        return response.data.access_token;
      }

      return null;
    } catch (error) {
      logger.error('Error getting panel token:', error);
      return null;
    }
  }

  async createUser(panelId: string, userData: {
    username: string;
    data_limit: number;
    expire: number;
    status?: string;
  }): Promise<MarzbanUser> {
    try {
      const token = await this.getPanelToken(panelId);
      if (!token) {
        throw new Error('Failed to get panel token');
      }

      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.post(`${panel.url}/api/user`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        logger.info(`User created in panel ${panelId}: ${userData.username}`);
        return response.data;
      }

      throw new Error('Failed to create user in panel');
    } catch (error) {
      logger.error('Error creating user in panel:', error);
      throw new Error('Failed to create user in panel');
    }
  }

  async getUserConfig(panelId: string, username: string): Promise<MarzbanConfig | null> {
    try {
      const token = await this.getPanelToken(panelId);
      if (!token) {
        throw new Error('Failed to get panel token');
      }

      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.get(`${panel.url}/api/user/${username}/subscription`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return {
          id: username,
          username,
          config: response.data.config,
          subscription_url: response.data.subscription_url
        };
      }

      return null;
    } catch (error) {
      logger.error('Error getting user config:', error);
      return null;
    }
  }

  async updateUserStatus(panelId: string, username: string, status: string): Promise<boolean> {
    try {
      const token = await this.getPanelToken(panelId);
      if (!token) {
        throw new Error('Failed to get panel token');
      }

      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.put(`${panel.url}/api/user/${username}`, {
        status
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      logger.error('Error updating user status:', error);
      return false;
    }
  }

  async deleteUser(panelId: string, username: string): Promise<boolean> {
    try {
      const token = await this.getPanelToken(panelId);
      if (!token) {
        throw new Error('Failed to get panel token');
      }

      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.delete(`${panel.url}/api/user/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      return response.status === 200;
    } catch (error) {
      logger.error('Error deleting user:', error);
      return false;
    }
  }

  async getPanelStats(panelId: string): Promise<any> {
    try {
      const token = await this.getPanelToken(panelId);
      if (!token) {
        throw new Error('Failed to get panel token');
      }

      const panel = await this.getPanelById(panelId);
      if (!panel) {
        throw new Error('Panel not found');
      }

      const response = await axios.get(`${panel.url}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      if (response.status === 200) {
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Error getting panel stats:', error);
      return null;
    }
  }

  async refreshPanelStatus(): Promise<void> {
    try {
      const panels = await this.getAllPanels();
      
      for (const panel of panels) {
        const isConnected = await this.testPanelConnection(panel.url, panel.username, panel.password);
        const status = isConnected ? 'connected' : 'error';
        
        if (panel.status !== status) {
          await this.updatePanel(panel.id, { status });
          logger.info(`Panel ${panel.name} status updated to: ${status}`);
        }
      }
    } catch (error) {
      logger.error('Error refreshing panel status:', error);
    }
  }
}
