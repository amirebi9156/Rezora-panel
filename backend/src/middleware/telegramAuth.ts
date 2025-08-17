import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface TelegramRequest extends Request {
  telegramData?: any;
}

export const validateTelegramWebhook = (
  req: TelegramRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the secret token from environment
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (!secretToken) {
      logger.warn('TELEGRAM_WEBHOOK_SECRET not configured, skipping validation');
      return next();
    }

    // Get the X-Telegram-Bot-Api-Secret-Token header
    const token = req.headers['x-telegram-bot-api-secret-token'];
    
    if (!token) {
      logger.warn('Missing X-Telegram-Bot-Api-Secret-Token header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate the token
    if (token !== secretToken) {
      logger.warn('Invalid Telegram webhook token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request origin (optional but recommended)
    const userAgent = req.get('User-Agent');
    if (userAgent && !userAgent.includes('TelegramBot')) {
      logger.warn('Suspicious User-Agent for Telegram webhook:', userAgent);
      // Don't block, just log for monitoring
    }

    // Validate request method
    if (req.method !== 'POST') {
      logger.warn('Invalid HTTP method for Telegram webhook:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate content type
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid Content-Type for Telegram webhook:', contentType);
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      logger.warn('Invalid request body for Telegram webhook');
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Validate required Telegram fields
    const { update_id, message, callback_query, edited_message, channel_post } = req.body;
    
    if (!update_id) {
      logger.warn('Missing update_id in Telegram webhook');
      return res.status(400).json({ error: 'Invalid Telegram update' });
    }

    // Check if at least one valid update type is present
    const hasValidUpdate = message || callback_query || edited_message || channel_post;
    if (!hasValidUpdate) {
      logger.warn('No valid update type in Telegram webhook');
      return res.status(400).json({ error: 'Invalid Telegram update' });
    }

    // Rate limiting check (basic implementation)
    const clientIP = req.ip;
    const rateLimitKey = `telegram_webhook:${clientIP}`;
    
    // This is a simplified rate limiting - in production you'd use Redis or similar
    const currentTime = Date.now();
    const lastRequest = (req as any).lastTelegramRequest || 0;
    const minInterval = 100; // Minimum 100ms between requests
    
    if (currentTime - lastRequest < minInterval) {
      logger.warn('Rate limit exceeded for Telegram webhook from IP:', clientIP);
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    (req as any).lastTelegramRequest = currentTime;

    // Validate message structure if present
    if (message) {
      if (!message.from || !message.from.id || !message.chat || !message.chat.id) {
        logger.warn('Invalid message structure in Telegram webhook');
        return res.status(400).json({ error: 'Invalid message structure' });
      }
    }

    // Validate callback query structure if present
    if (callback_query) {
      if (!callback_query.from || !callback_query.from.id || !callback_query.data) {
        logger.warn('Invalid callback query structure in Telegram webhook');
        return res.status(400).json({ error: 'Invalid callback query structure' });
      }
    }

    // Add Telegram data to request for later use
    req.telegramData = {
      updateId: update_id,
      message,
      callbackQuery: callback_query,
      editedMessage: edited_message,
      channelPost: channel_post,
      timestamp: new Date().toISOString()
    };

    logger.debug('Telegram webhook validated successfully', {
      updateId: update_id,
      updateType: message ? 'message' : callback_query ? 'callback_query' : 'other',
      fromId: message?.from?.id || callback_query?.from?.id
    });

    next();
  } catch (error) {
    logger.error('Error validating Telegram webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateTelegramSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the secret token from environment
    const secretToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!secretToken) {
      logger.warn('TELEGRAM_BOT_TOKEN not configured, skipping signature validation');
      return next();
    }

    // Get the signature from headers
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
      logger.warn('Missing X-Hub-Signature-256 header');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the raw body
    const rawBody = JSON.stringify(req.body);
    
    // Calculate expected signature
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secretToken)
      .update(rawBody)
      .digest('hex')}`;

    // Compare signatures
    if (signature !== expectedSignature) {
      logger.warn('Invalid Telegram signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.debug('Telegram signature validated successfully');
    next();
  } catch (error) {
    logger.error('Error validating Telegram signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const sanitizeTelegramData = (
  req: TelegramRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.telegramData) {
      return next();
    }

    // Sanitize user data
    if (req.telegramData.message?.from) {
      const from = req.telegramData.message.from;
      
      // Remove sensitive fields
      delete from.language_code;
      delete from.can_join_groups;
      delete from.can_read_all_group_messages;
      delete from.supports_inline_queries;
      
      // Sanitize username
      if (from.username) {
        from.username = from.username.replace(/[^a-zA-Z0-9_]/g, '');
      }
    }

    // Sanitize callback query data
    if (req.telegramData.callbackQuery?.from) {
      const from = req.telegramData.callbackQuery.from;
      
      // Remove sensitive fields
      delete from.language_code;
      delete from.can_join_groups;
      delete from.can_read_all_group_messages;
      delete from.supports_inline_queries;
      
      // Sanitize username
      if (from.username) {
        from.username = from.username.replace(/[^a-zA-Z0-9_]/g, '');
      }
    }

    // Sanitize message text (remove potential XSS)
    if (req.telegramData.message?.text) {
      req.telegramData.message.text = req.telegramData.message.text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    // Sanitize callback query data
    if (req.telegramData.callbackQuery?.data) {
      req.telegramData.callbackQuery.data = req.telegramData.callbackQuery.data
        .replace(/[^a-zA-Z0-9:_\-]/g, '');
    }

    logger.debug('Telegram data sanitized successfully');
    next();
  } catch (error) {
    logger.error('Error sanitizing Telegram data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const logTelegramWebhook = (
  req: TelegramRequest,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Log the incoming webhook
  logger.info('Telegram webhook received', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    updateId: req.telegramData?.updateId,
    updateType: req.telegramData?.message ? 'message' : 
                req.telegramData?.callbackQuery ? 'callback_query' : 'other'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Telegram webhook processed', {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      updateId: req.telegramData?.updateId
    });
    
    originalEnd.call(this, chunk, encoding);
  };

  next();
};
