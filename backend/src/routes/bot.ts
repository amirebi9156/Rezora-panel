import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { adminMiddleware } from '../middleware/auth.js';
import { validateTelegramWebhook, sanitizeTelegramData, logTelegramWebhook } from '../middleware/telegramAuth.js';

const router = express.Router();

// Validation middleware
const validateBotCommand = [
  body('command').isString().notEmpty().withMessage('Command is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean')
];

const validateBotMessage = [
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('type').isIn(['welcome', 'help', 'support', 'error']).withMessage('Invalid message type')
];

// Get bot status (admin only)
router.get('/status', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically check the actual bot status
    // For now, we'll return a mock status
    const botStatus = {
      isRunning: true,
      uptime: process.uptime(),
      totalUsers: 0, // This would come from database
      activeUsers: 0, // This would come from database
      lastActivity: new Date().toISOString(),
      version: '1.0.0'
    };
    
    res.json({
      success: true,
      data: botStatus
    });
  } catch (error) {
    logger.error('Error fetching bot status:', error);
    res.status(500).json({
      error: 'Failed to fetch bot status'
    });
  }
}));

// Get bot statistics (admin only)
router.get('/stats', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically fetch statistics from the database
    // For now, we'll return mock statistics
    const botStats = {
      totalCommands: 0,
      totalMessages: 0,
      totalCallbacks: 0,
      averageResponseTime: 0,
      errorRate: 0,
      popularCommands: [],
      userGrowth: []
    };
    
    res.json({
      success: true,
      data: botStats
    });
  } catch (error) {
    logger.error('Error fetching bot statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch bot statistics'
    });
  }
}));

// Get bot commands (admin only)
router.get('/commands', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically fetch commands from the database or bot configuration
    // For now, we'll return the default commands
    const commands = [
      {
        command: '/start',
        description: 'Start the bot and show welcome message',
        enabled: true,
        usage: 0
      },
      {
        command: '/help',
        description: 'Show help and available commands',
        enabled: true,
        usage: 0
      },
      {
        command: '/plans',
        description: 'Show available VPN plans',
        enabled: true,
        usage: 0
      },
      {
        command: '/buy',
        description: 'Start VPN purchase process',
        enabled: true,
        usage: 0
      },
      {
        command: '/my_vpn',
        description: 'Show user\'s active VPN subscriptions',
        enabled: true,
        usage: 0
      },
      {
        command: '/support',
        description: 'Show support information',
        enabled: true,
        usage: 0
      }
    ];
    
    res.json({
      success: true,
      data: commands
    });
  } catch (error) {
    logger.error('Error fetching bot commands:', error);
    res.status(500).json({
      error: 'Failed to fetch bot commands'
    });
  }
}));

// Update bot command (admin only)
router.put('/commands/:command', adminMiddleware, validateBotCommand, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { command } = req.params;
    const { description, enabled } = req.body;

    // This would typically update the command in the database or bot configuration
    logger.info('Bot command updated', {
      command,
      description,
      enabled,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot command updated successfully',
      data: {
        command,
        description,
        enabled
      }
    });
  } catch (error) {
    logger.error('Error updating bot command:', error);
    res.status(500).json({
      error: 'Failed to update bot command'
    });
  }
}));

// Get bot messages (admin only)
router.get('/messages', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically fetch messages from the database
    // For now, we'll return default messages
    const messages = {
      welcome: '🎉 به ربات فروش VPN خوش آمدید!',
      help: '📚 راهنمای استفاده از ربات',
      support: '📞 برای پشتیبانی با ما تماس بگیرید',
      error: '❌ خطایی رخ داده است. لطفاً دوباره تلاش کنید.'
    };
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Error fetching bot messages:', error);
    res.status(500).json({
      error: 'Failed to fetch bot messages'
    });
  }
}));

// Update bot message (admin only)
router.put('/messages/:type', adminMiddleware, validateBotMessage, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { type } = req.params;
    const { message } = req.body;

    // This would typically update the message in the database
    logger.info('Bot message updated', {
      type,
      message,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot message updated successfully',
      data: {
        type,
        message
      }
    });
  } catch (error) {
    logger.error('Error updating bot message:', error);
    res.status(500).json({
      error: 'Failed to update bot message'
    });
  }
}));

// Restart bot (admin only)
router.post('/restart', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically restart the bot process
    // For now, we'll just log the request
    logger.info('Bot restart requested', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot restart initiated successfully'
    });
  } catch (error) {
    logger.error('Error restarting bot:', error);
    res.status(500).json({
      error: 'Failed to restart bot'
    });
  }
}));

// Stop bot (admin only)
router.post('/stop', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically stop the bot process
    // For now, we'll just log the request
    logger.info('Bot stop requested', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot stop initiated successfully'
    });
  } catch (error) {
    logger.error('Error stopping bot:', error);
    res.status(500).json({
      error: 'Failed to stop bot'
    });
  }
}));

// Start bot (admin only)
router.post('/start', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically start the bot process
    // For now, we'll just log the request
    logger.info('Bot start requested', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot start initiated successfully'
    });
  } catch (error) {
    logger.error('Error starting bot:', error);
    res.status(500).json({
      error: 'Failed to start bot'
    });
  }
}));

// Get bot logs (admin only)
router.get('/logs', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // This would typically fetch logs from the database or log files
    // For now, we'll return a mock response
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Bot started successfully',
        metadata: {}
      }
    ];
    
    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        level,
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    logger.error('Error fetching bot logs:', error);
    res.status(500).json({
      error: 'Failed to fetch bot logs'
    });
  }
}));

// Clear bot logs (admin only)
router.delete('/logs', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically clear logs from the database or log files
    logger.info('Bot logs cleared', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot logs cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing bot logs:', error);
    res.status(500).json({
      error: 'Failed to clear bot logs'
    });
  }
}));

// Get bot webhook info (admin only)
router.get('/webhook', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically fetch webhook configuration
    const webhookInfo = {
      url: process.env.WEBHOOK_URL || 'Not configured',
      secret: process.env.TELEGRAM_WEBHOOK_SECRET ? 'Configured' : 'Not configured',
      isActive: true,
      lastUpdate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: webhookInfo
    });
  } catch (error) {
    logger.error('Error fetching webhook info:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook info'
    });
  }
}));

// Set bot webhook (admin only)
router.post('/webhook', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { url, secret } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Webhook URL is required'
      });
    }

    // This would typically set the webhook with Telegram
    logger.info('Bot webhook set', {
      url,
      hasSecret: !!secret,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Webhook set successfully',
      data: {
        url,
        isActive: true
      }
    });
  } catch (error) {
    logger.error('Error setting webhook:', error);
    res.status(500).json({
      error: 'Failed to set webhook'
    });
  }
}));

// Delete bot webhook (admin only)
router.delete('/webhook', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically delete the webhook with Telegram
    logger.info('Bot webhook deleted', {
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({
      error: 'Failed to delete webhook'
    });
  }
}));

// Send broadcast message (admin only)
router.post('/broadcast', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { message, userFilter } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // This would typically send the message to all users or filtered users
    logger.info('Broadcast message sent', {
      message: message.substring(0, 100) + '...',
      userFilter,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Broadcast message sent successfully',
      data: {
        messageCount: 0, // This would be the actual count
        userFilter
      }
    });
  } catch (error) {
    logger.error('Error sending broadcast message:', error);
    res.status(500).json({
      error: 'Failed to send broadcast message'
    });
  }
}));

// Get bot settings (admin only)
router.get('/settings', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    // This would typically fetch bot settings from the database
    const settings = {
      autoReply: true,
      maintenanceMode: false,
      maxConnectionsPerUser: 3,
      dataUsageCheckInterval: 3600,
      subscriptionRenewalReminder: true,
      paymentReminder: true
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error fetching bot settings:', error);
    res.status(500).json({
      error: 'Failed to fetch bot settings'
    });
  }
}));

// Update bot settings (admin only)
router.put('/settings', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    // This would typically update bot settings in the database
    logger.info('Bot settings updated', {
      updates,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Bot settings updated successfully',
      data: updates
    });
  } catch (error) {
    logger.error('Error updating bot settings:', error);
    res.status(500).json({
      error: 'Failed to update bot settings'
    });
  }
}));

// Telegram webhook endpoint (no authentication required)
router.post('/webhook/telegram', 
  validateTelegramWebhook,
  sanitizeTelegramData,
  logTelegramWebhook,
  asyncHandler(async (req, res) => {
    try {
      // This endpoint would handle incoming Telegram updates
      // The actual bot logic would be handled here
      
      logger.info('Telegram webhook received', {
        updateId: req.body?.update_id,
        messageType: req.body?.message ? 'message' : 
                    req.body?.callback_query ? 'callback_query' : 'other'
      });

      // Always respond with 200 OK to Telegram
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error('Error processing Telegram webhook:', error);
      // Still respond with 200 OK to prevent Telegram from retrying
      res.status(200).json({ ok: false, error: 'Internal error' });
    }
  })
);

export default router;
