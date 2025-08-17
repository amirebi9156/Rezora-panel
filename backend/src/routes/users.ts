import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/userService.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const userService = new UserService();

// Validation middleware
const validateUserUpdate = [
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'suspended', 'banned']).withMessage('Invalid status')
];

const validateUserSearch = [
  body('query').isString().notEmpty().withMessage('Search query is required')
];

// Get all users (admin only)
router.get('/', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, role } = req.query;
    
    const users = await userService.getAllUsers();
    
    // Apply filters
    let filteredUsers = users;
    
    if (status) {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }
    
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }
    
    // Apply pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredUsers.length,
          pages: Math.ceil(filteredUsers.length / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users'
    });
  }
}));

// Get user by ID (admin only)
router.get('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
}));

// Get user by Telegram ID
router.get('/telegram/:telegramId', asyncHandler(async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await userService.getUserByTelegramId(parseInt(telegramId));
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user by Telegram ID:', error);
    res.status(500).json({
      error: 'Failed to fetch user'
    });
  }
}));

// Update user (admin only)
router.put('/:id', adminMiddleware, validateUserUpdate, asyncHandler(async (req, res) => {
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
    
    const updatedUser = await userService.updateUser(id, updates);

    logger.info('User updated successfully', {
      userId: id,
      adminId: req.user?.id,
      updates
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
}));

// Delete user (admin only)
router.delete('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);

    logger.info('User deleted successfully', {
      userId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user'
    });
  }
}));

// Ban user (admin only)
router.post('/:id/ban', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Ban reason is required'
      });
    }

    const bannedUser = await userService.banUser(id, reason);

    logger.info('User banned successfully', {
      userId: id,
      reason,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'User banned successfully',
      data: bannedUser
    });
  } catch (error) {
    logger.error('Error banning user:', error);
    res.status(500).json({
      error: 'Failed to ban user'
    });
  }
}));

// Unban user (admin only)
router.post('/:id/unban', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const unbannedUser = await userService.unbanUser(id);

    logger.info('User unbanned successfully', {
      userId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: unbannedUser
    });
  } catch (error) {
    logger.error('Error unbanning user:', error);
    res.status(500).json({
      error: 'Failed to unban user'
    });
  }
}));

// Search users (admin only)
router.post('/search', adminMiddleware, validateUserSearch, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { query } = req.body;
    const users = await userService.searchUsers(query);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Error searching users:', error);
    res.status(500).json({
      error: 'Failed to search users'
    });
  }
}));

// Get user statistics (admin only)
router.get('/stats/overview', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const stats = await userService.getUserStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics'
    });
  }
}));

// Get user subscriptions
router.get('/:id/subscriptions', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;
    
    let subscriptions;
    if (status === 'active') {
      subscriptions = await userService.getActiveSubscriptions(id);
    } else {
      subscriptions = await userService.getAllSubscriptions(id);
    }
    
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching user subscriptions:', error);
    res.status(500).json({
      error: 'Failed to fetch user subscriptions'
    });
  }
}));

// Create subscription for user (admin only)
router.post('/:id/subscriptions', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, expiresAt, dataLimit } = req.body;

    if (!planId || !expiresAt || !dataLimit) {
      return res.status(400).json({
        error: 'Plan ID, expiry date, and data limit are required'
      });
    }

    const subscription = await userService.createSubscription({
      userId: id,
      planId,
      expiresAt: new Date(expiresAt),
      dataLimit
    });

    logger.info('Subscription created for user', {
      userId: id,
      subscriptionId: subscription.id,
      adminId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    logger.error('Error creating subscription for user:', error);
    res.status(500).json({
      error: 'Failed to create subscription'
    });
  }
}));

// Update subscription (admin only)
router.put('/subscriptions/:subscriptionId', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const updates = req.body;
    
    const updatedSubscription = await userService.updateSubscription(subscriptionId, updates);

    logger.info('Subscription updated successfully', {
      subscriptionId,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({
      error: 'Failed to update subscription'
    });
  }
}));

// Delete subscription (admin only)
router.delete('/subscriptions/:subscriptionId', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    await userService.deleteSubscription(subscriptionId);

    logger.info('Subscription deleted successfully', {
      subscriptionId,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting subscription:', error);
    res.status(500).json({
      error: 'Failed to delete subscription'
    });
  }
}));

// Renew subscription (admin only)
router.post('/subscriptions/:subscriptionId/renew', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newExpiryDate } = req.body;

    if (!newExpiryDate) {
      return res.status(400).json({
        error: 'New expiry date is required'
      });
    }

    const renewedSubscription = await userService.renewSubscription(subscriptionId, new Date(newExpiryDate));

    logger.info('Subscription renewed successfully', {
      subscriptionId,
      newExpiryDate,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: renewedSubscription
    });
  } catch (error) {
    logger.error('Error renewing subscription:', error);
    res.status(500).json({
      error: 'Failed to renew subscription'
    });
  }
}));

// Update subscription data usage (admin only)
router.post('/subscriptions/:subscriptionId/usage', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { usedData } = req.body;

    if (usedData === undefined || usedData < 0) {
      return res.status(400).json({
        error: 'Valid used data amount is required'
      });
    }

    const updatedSubscription = await userService.updateDataUsage(subscriptionId, usedData);

    logger.info('Subscription data usage updated', {
      subscriptionId,
      usedData,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Data usage updated successfully',
      data: updatedSubscription
    });
  } catch (error) {
    logger.error('Error updating subscription data usage:', error);
    res.status(500).json({
      error: 'Failed to update data usage'
    });
  }
}));

// Get expired subscriptions (admin only)
router.get('/subscriptions/expired', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const expiredSubscriptions = await userService.getExpiredSubscriptions();
    
    res.json({
      success: true,
      data: expiredSubscriptions
    });
  } catch (error) {
    logger.error('Error fetching expired subscriptions:', error);
    res.status(500).json({
      error: 'Failed to fetch expired subscriptions'
    });
  }
}));

// Cleanup expired subscriptions (admin only)
router.post('/subscriptions/cleanup', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    await userService.cleanupExpiredSubscriptions();
    
    logger.info('Expired subscriptions cleaned up', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Expired subscriptions cleaned up successfully'
    });
  } catch (error) {
    logger.error('Error cleaning up expired subscriptions:', error);
    res.status(500).json({
      error: 'Failed to cleanup expired subscriptions'
    });
  }
}));

export default router;
