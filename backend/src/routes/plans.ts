import express from 'express';
import { body, validationResult } from 'express-validator';
import { PlanService } from '../services/planService.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const planService = new PlanService();

// Validation middleware
const validatePlan = [
  body('name').isString().notEmpty().withMessage('Plan name is required'),
  body('panelId').isUUID().withMessage('Valid panel ID is required'),
  body('dataLimit').isInt({ min: 1 }).withMessage('Data limit must be a positive integer'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('maxConnections').optional().isInt({ min: 1 }).withMessage('Max connections must be a positive integer'),
  body('features').optional().isArray().withMessage('Features must be an array')
];

const validatePlanUpdate = [
  body('name').optional().isString().notEmpty().withMessage('Plan name cannot be empty'),
  body('panelId').optional().isUUID().withMessage('Valid panel ID is required'),
  body('dataLimit').optional().isInt({ min: 1 }).withMessage('Data limit must be a positive integer'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('price').optional().isInt({ min: 0 }).withMessage('Price must be a non-negative integer'),
  body('maxConnections').optional().isInt({ min: 1 }).withMessage('Max connections must be a positive integer'),
  body('features').optional().isArray().withMessage('Features must be an array')
];

// Get all plans
router.get('/', asyncHandler(async (req, res) => {
  try {
    const plans = await planService.getAllPlans();
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({
      error: 'Failed to fetch plans'
    });
  }
}));

// Get active plans (public)
router.get('/active', asyncHandler(async (req, res) => {
  try {
    const plans = await planService.getActivePlans();
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching active plans:', error);
    res.status(500).json({
      error: 'Failed to fetch active plans'
    });
  }
}));

// Get plan by ID
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await planService.getPlanById(id);
    
    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found'
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('Error fetching plan:', error);
    res.status(500).json({
      error: 'Failed to fetch plan'
    });
  }
}));

// Create new plan (admin only)
router.post('/', adminMiddleware, validatePlan, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const planData = req.body;
    
    // Validate plan data
    const validation = await planService.validatePlanData(planData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Plan validation failed',
        details: validation.errors
      });
    }

    const plan = await planService.createPlan(planData);

    logger.info('Plan created successfully', {
      planId: plan.id,
      planName: plan.name,
      adminId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    logger.error('Error creating plan:', error);
    res.status(500).json({
      error: 'Failed to create plan'
    });
  }
}));

// Update plan (admin only)
router.put('/:id', adminMiddleware, validatePlanUpdate, asyncHandler(async (req, res) => {
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

    // Validate plan data
    const validation = await planService.validatePlanData(updates);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Plan validation failed',
        details: validation.errors
      });
    }

    const updatedPlan = await planService.updatePlan(id, updates);

    logger.info('Plan updated successfully', {
      planId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    logger.error('Error updating plan:', error);
    res.status(500).json({
      error: 'Failed to update plan'
    });
  }
}));

// Delete plan (admin only)
router.delete('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    await planService.deletePlan(id);

    logger.info('Plan deleted successfully', {
      planId: id,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting plan:', error);
    res.status(500).json({
      error: 'Failed to delete plan'
    });
  }
}));

// Toggle plan visibility (admin only)
router.patch('/:id/toggle-visibility', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPlan = await planService.togglePlanVisibility(id);

    logger.info('Plan visibility toggled', {
      planId: id,
      isVisible: updatedPlan.is_visible,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: `Plan ${updatedPlan.is_visible ? 'made visible' : 'hidden'} successfully`,
      data: updatedPlan
    });
  } catch (error) {
    logger.error('Error toggling plan visibility:', error);
    res.status(500).json({
      error: 'Failed to toggle plan visibility'
    });
  }
}));

// Duplicate plan (admin only)
router.post('/:id/duplicate', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'New plan name is required'
      });
    }

    const newPlan = await planService.duplicatePlan(id, name);

    logger.info('Plan duplicated successfully', {
      originalPlanId: id,
      newPlanId: newPlan.id,
      newPlanName: newPlan.name,
      adminId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Plan duplicated successfully',
      data: newPlan
    });
  } catch (error) {
    logger.error('Error duplicating plan:', error);
    res.status(500).json({
      error: 'Failed to duplicate plan'
    });
  }
}));

// Get plans by panel
router.get('/panel/:panelId', asyncHandler(async (req, res) => {
  try {
    const { panelId } = req.params;
    const plans = await planService.getPlansByPanel(panelId);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching plans by panel:', error);
    res.status(500).json({
      error: 'Failed to fetch plans by panel'
    });
  }
}));

// Search plans
router.get('/search/:query', asyncHandler(async (req, res) => {
  try {
    const { query } = req.params;
    const plans = await planService.searchPlans(query);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error searching plans:', error);
    res.status(500).json({
      error: 'Failed to search plans'
    });
  }
}));

// Get plans by price range
router.get('/price-range/:min/:max', asyncHandler(async (req, res) => {
  try {
    const { min, max } = req.params;
    const minPrice = parseInt(min);
    const maxPrice = parseInt(max);

    if (isNaN(minPrice) || isNaN(maxPrice)) {
      return res.status(400).json({
        error: 'Invalid price range'
      });
    }

    const plans = await planService.getPlansByPriceRange(minPrice, maxPrice);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching plans by price range:', error);
    res.status(500).json({
      error: 'Failed to fetch plans by price range'
    });
  }
}));

// Get plans by data range
router.get('/data-range/:min/:max', asyncHandler(async (req, res) => {
  try {
    const { min, max } = req.params;
    const minData = parseInt(min);
    const maxData = parseInt(max);

    if (isNaN(minData) || isNaN(maxData)) {
      return res.status(400).json({
        error: 'Invalid data range'
      });
    }

    const plans = await planService.getPlansByDataRange(minData, maxData);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching plans by data range:', error);
    res.status(500).json({
      error: 'Failed to fetch plans by data range'
    });
  }
}));

// Get plans by duration
router.get('/duration/:days', asyncHandler(async (req, res) => {
  try {
    const { days } = req.params;
    const duration = parseInt(days);

    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        error: 'Invalid duration'
      });
    }

    const plans = await planService.getPlansByDuration(duration);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching plans by duration:', error);
    res.status(500).json({
      error: 'Failed to fetch plans by duration'
    });
  }
}));

// Get popular plans
router.get('/popular/:limit?', asyncHandler(async (req, res) => {
  try {
    const { limit } = req.params;
    const limitNum = limit ? parseInt(limit) : 5;

    if (isNaN(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        error: 'Invalid limit'
      });
    }

    const plans = await planService.getPopularPlans(limitNum);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error fetching popular plans:', error);
    res.status(500).json({
      error: 'Failed to fetch popular plans'
    });
  }
}));

// Update plan features (admin only)
router.patch('/:id/features', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return res.status(400).json({
        error: 'Features must be an array'
      });
    }

    const updatedPlan = await planService.updatePlanFeatures(id, features);

    logger.info('Plan features updated', {
      planId: id,
      featuresCount: features.length,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Plan features updated successfully',
      data: updatedPlan
    });
  } catch (error) {
    logger.error('Error updating plan features:', error);
    res.status(500).json({
      error: 'Failed to update plan features'
    });
  }
}));

// Get plan statistics (admin only)
router.get('/stats/overview', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const stats = await planService.getPlanStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching plan statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch plan statistics'
    });
  }
}));

export default router;
