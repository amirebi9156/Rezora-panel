import express from 'express';
import { body, validationResult } from 'express-validator';
import { MarzbanService } from '../services/marzbanService.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const marzbanService = new MarzbanService();

// Validation middleware
const validatePanel = [
  body('name').isString().notEmpty().withMessage('Panel name is required'),
  body('url').isURL().withMessage('Valid panel URL is required'),
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('password').isString().notEmpty().withMessage('Password is required')
];

const validatePanelUpdate = [
  body('name').optional().isString().notEmpty().withMessage('Panel name cannot be empty'),
  body('url').optional().isURL().withMessage('Valid panel URL is required'),
  body('username').optional().isString().notEmpty().withMessage('Username cannot be empty'),
  body('password').optional().isString().notEmpty().withMessage('Password cannot be empty')
];

// Get all panels
router.get('/', asyncHandler(async (req, res) => {
  try {
    const panels = await marzbanService.getAllPanels();
    
    res.json({
      success: true,
      data: panels
    });
  } catch (error) {
    logger.error('Error fetching panels:', error);
    res.status(500).json({
      error: 'Failed to fetch panels'
    });
  }
}));

// Get panel by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await marzbanService.getPanelById(id);
    
    if (!panel) {
      return res.status(404).json({
        error: 'Panel not found'
      });
    }
    
    res.json({
      success: true,
      data: panel
    });
  } catch (error) {
    logger.error('Error fetching panel:', error);
    res.status(500).json({
      error: 'Failed to fetch panel'
    });
  }
}));

// Create new panel (admin only)
router.post('/', adminMiddleware, validatePanel, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, url, username, password } = req.body;
    
    // Test connection to panel
    const isConnected = await marzbanService.testPanelConnection(url, username, password);
    
    if (!isConnected) {
      return res.status(400).json({
        error: 'Failed to connect to panel. Please check your credentials.'
      });
    }

    const panel = await marzbanService.createPanel({
      name,
      url,
      username,
      password
    });

    logger.info('Panel created successfully', {
      panelId: panel.id,
      panelName: panel.name,
      adminId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Panel created successfully',
      data: panel
    });
  } catch (error) {
    logger.error('Error creating panel:', error);
    res.status(500).json({
      error: 'Failed to create panel'
    });
  }
}));

// Update panel (admin only)
router.put('/:id', adminMiddleware, validatePanelUpdate, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // If credentials are being updated, test the connection
    if (updates.url || updates.username || updates.password) {
      const panel = await marzbanService.getPanelById(id);
      if (!panel) {
        return res.status(404).json({
          error: 'Panel not found'
        });
      }

      const testUrl = updates.url || panel.url;
      const testUsername = updates.username || panel.username;
      const testPassword = updates.password || panel.password;

      const isConnected = await marzbanService.testPanelConnection(testUrl, testUsername, testPassword);
      
      if (!isConnected) {
        return res.status(400).json({
          error: 'Failed to connect to panel with new credentials'
        });
      }
    }

    const updatedPanel = await marzbanService.updatePanel(id, updates);

    logger.info('Panel updated successfully', {
      panelId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Panel updated successfully',
      data: updatedPanel
    });
  } catch (error) {
    logger.error('Error updating panel:', error);
    res.status(500).json({
      error: 'Failed to update panel'
    });
  }
}));

// Delete panel (admin only)
router.delete('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if panel has active plans
    // This would require additional logic to check for dependencies
    
    await marzbanService.deletePanel(id);

    logger.info('Panel deleted successfully', {
      panelId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Panel deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting panel:', error);
    res.status(500).json({
      error: 'Failed to delete panel'
    });
  }
}));

// Test panel connection
router.post('/:id/test', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await marzbanService.getPanelById(id);
    
    if (!panel) {
      return res.status(404).json({
        error: 'Panel not found'
      });
    }

    const isConnected = await marzbanService.testPanelConnection(panel.url, panel.username, panel.password);
    
    if (isConnected) {
      // Update panel status to connected
      await marzbanService.updatePanel(id, { status: 'connected' });
    } else {
      // Update panel status to error
      await marzbanService.updatePanel(id, { status: 'error' });
    }

    res.json({
      success: true,
      data: {
        connected: isConnected,
        status: isConnected ? 'connected' : 'error'
      }
    });
  } catch (error) {
    logger.error('Error testing panel connection:', error);
    res.status(500).json({
      error: 'Failed to test panel connection'
    });
  }
}));

// Get panel statistics
router.get('/:id/stats', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const stats = await marzbanService.getPanelStats(id);
    
    if (!stats) {
      return res.status(404).json({
        error: 'Panel statistics not available'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching panel stats:', error);
    res.status(500).json({
      error: 'Failed to fetch panel statistics'
    });
  }
}));

// Refresh all panel statuses
router.post('/refresh-status', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    await marzbanService.refreshPanelStatus();
    
    logger.info('Panel statuses refreshed', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Panel statuses refreshed successfully'
    });
  } catch (error) {
    logger.error('Error refreshing panel statuses:', error);
    res.status(500).json({
      error: 'Failed to refresh panel statuses'
    });
  }
}));

// Get panel users
router.get('/:id/users', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const panel = await marzbanService.getPanelById(id);
    
    if (!panel) {
      return res.status(404).json({
        error: 'Panel not found'
      });
    }

    // This would require additional implementation to get users from the panel
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: {
        message: 'Panel users functionality not implemented yet',
        panelId: id
      }
    });
  } catch (error) {
    logger.error('Error fetching panel users:', error);
    res.status(500).json({
      error: 'Failed to fetch panel users'
    });
  }
}));

// Create user in panel
router.post('/:id/users', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { username, dataLimit, expire, status } = req.body;

    if (!username || !dataLimit || !expire) {
      return res.status(400).json({
        error: 'Username, data limit, and expire time are required'
      });
    }

    const user = await marzbanService.createUser(id, {
      username,
      data_limit: dataLimit,
      expire,
      status: status || 'active'
    });

    logger.info('User created in panel', {
      panelId: id,
      username,
      adminId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error creating user in panel:', error);
    res.status(500).json({
      error: 'Failed to create user in panel'
    });
  }
}));

// Get user configuration from panel
router.get('/:id/users/:username/config', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id, username } = req.params;
    const config = await marzbanService.getUserConfig(id, username);
    
    if (!config) {
      return res.status(404).json({
        error: 'User configuration not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Error fetching user config:', error);
    res.status(500).json({
      error: 'Failed to fetch user configuration'
    });
  }
}));

// Update user status in panel
router.put('/:id/users/:username/status', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id, username } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    const success = await marzbanService.updateUserStatus(id, username, status);
    
    if (!success) {
      return res.status(500).json({
        error: 'Failed to update user status'
      });
    }

    logger.info('User status updated in panel', {
      panelId: id,
      username,
      status,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'User status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user status:', error);
    res.status(500).json({
      error: 'Failed to update user status'
    });
  }
}));

// Delete user from panel
router.delete('/:id/users/:username', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id, username } = req.params;
    const success = await marzbanService.deleteUser(id, username);
    
    if (!success) {
      return res.status(500).json({
        error: 'Failed to delete user from panel'
      });
    }

    logger.info('User deleted from panel', {
      panelId: id,
      username,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user from panel:', error);
    res.status(500).json({
      error: 'Failed to delete user from panel'
    });
  }
}));

export default router;
