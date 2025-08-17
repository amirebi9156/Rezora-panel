import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { generateToken } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
const userService = new UserService();

// Validation middleware
const validateLogin = [
  body('telegramId').isString().notEmpty().withMessage('Telegram ID is required'),
  body('password').isString().notEmpty().withMessage('Password is required')
];

const validateRegister = [
  body('telegramId').isString().notEmpty().withMessage('Telegram ID is required'),
  body('telegramUsername').optional().isString().withMessage('Telegram username must be a string'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isString().withMessage('Phone must be a string')
];

// Login route
router.post('/login', validateLogin, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { telegramId, password } = req.body;

    // For now, we'll use a simple authentication
    // In production, you might want to implement more secure methods
    const user = await userService.getUserByTelegramId(parseInt(telegramId));
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account is not active',
        status: user.status
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      telegramId: user.telegramId,
      role: user.role
    });

    // Log successful login
    logger.info('User logged in successfully', {
      userId: user.id,
      telegramId: user.telegramId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          email: user.email,
          role: user.role,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Register route
router.post('/register', validateRegister, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { telegramId, telegramUsername, email, phone } = req.body;

    // Check if user already exists
    const existingUser = await userService.getUserByTelegramId(parseInt(telegramId));
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists'
      });
    }

    // Create new user
    const newUser = await userService.initializeUser(parseInt(telegramId), telegramUsername || '');

    // Update additional fields if provided
    if (email || phone) {
      const updates: any = {};
      if (email) updates.email = email;
      if (phone) updates.phone = phone;
      
      await userService.updateUser(newUser.id, updates);
    }

    // Generate JWT token
    const token = generateToken({
      id: newUser.id,
      telegramId: newUser.telegramId,
      role: newUser.role
    });

    // Log successful registration
    logger.info('User registered successfully', {
      userId: newUser.id,
      telegramId: newUser.telegramId,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser.id,
          telegramId: newUser.telegramId,
          telegramUsername: newUser.telegramUsername,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Telegram login route (for bot users)
router.post('/telegram-login', asyncHandler(async (req, res) => {
  try {
    const { telegramId, telegramUsername } = req.body;

    if (!telegramId) {
      return res.status(400).json({
        error: 'Telegram ID is required'
      });
    }

    // Initialize or get user
    const user = await userService.initializeUser(parseInt(telegramId), telegramUsername || '');

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      telegramId: user.telegramId,
      role: user.role
    });

    // Log successful Telegram login
    logger.info('Telegram user logged in', {
      userId: user.id,
      telegramId: user.telegramId,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Telegram login successful',
      data: {
        user: {
          id: user.id,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          role: user.role,
          status: user.status
        },
        token
      }
    });
  } catch (error) {
    logger.error('Telegram login error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Refresh token route
router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token is required'
      });
    }

    // In a real implementation, you would verify the token and generate a new one
    // For now, we'll return an error indicating this needs to be implemented
    res.status(501).json({
      error: 'Token refresh not implemented yet'
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Logout route
router.post('/logout', asyncHandler(async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    
    logger.info('User logged out', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Get current user route
router.get('/me', asyncHandler(async (req, res) => {
  try {
    // This route should be protected by auth middleware
    // For now, we'll return an error indicating it needs authentication
    res.status(401).json({
      error: 'Authentication required'
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Change password route
router.post('/change-password', asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // This route should be protected by auth middleware
    // For now, we'll return an error indicating it needs authentication
    res.status(401).json({
      error: 'Authentication required'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Forgot password route
router.post('/forgot-password', asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // This route should implement password reset functionality
    // For now, we'll return an error indicating it needs to be implemented
    res.status(501).json({
      error: 'Password reset not implemented yet'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

// Reset password route
router.post('/reset-password', asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // This route should implement password reset functionality
    // For now, we'll return an error indicating it needs to be implemented
    res.status(501).json({
      error: 'Password reset not implemented yet'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}));

export default router;
