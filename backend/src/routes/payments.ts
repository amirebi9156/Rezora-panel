import express from 'express';
import { body, validationResult } from 'express-validator';
import { PaymentService } from '../services/paymentService.js';
import { logger } from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const paymentService = new PaymentService();

// Validation middleware
const validatePayment = [
  body('userId').isString().notEmpty().withMessage('User ID is required'),
  body('planId').isUUID().withMessage('Valid plan ID is required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('method').isIn(['card', 'crypto', 'zarinpal']).withMessage('Invalid payment method')
];

const validatePaymentUpdate = [
  body('status').isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded']).withMessage('Invalid payment status'),
  body('transactionId').optional().isString().withMessage('Transaction ID must be a string')
];

// Get all payments (admin only)
router.get('/', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method } = req.query;
    
    // This would typically fetch payments with pagination and filtering
    // For now, we'll return a mock response
    const payments = [];
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page as string) || 1,
          limit: parseInt(limit as string) || 20,
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({
      error: 'Failed to fetch payments'
    });
  }
}));

// Get payment by ID (admin only)
router.get('/:id', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    logger.error('Error fetching payment:', error);
    res.status(500).json({
      error: 'Failed to fetch payment'
    });
  }
}));

// Create payment
router.post('/', validatePayment, asyncHandler(async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const paymentData = req.body;
    const payment = await paymentService.createPayment(paymentData);

    logger.info('Payment created successfully', {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      method: payment.method
    });

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Failed to create payment'
    });
  }
}));

// Update payment status (admin only)
router.put('/:id/status', adminMiddleware, validatePaymentUpdate, asyncHandler(async (req, res) => {
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
    const { status, transactionId } = req.body;
    
    const updatedPayment = await paymentService.updatePaymentStatus(id, status, transactionId);

    logger.info('Payment status updated', {
      paymentId: id,
      newStatus: status,
      transactionId,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: updatedPayment
    });
  } catch (error) {
    logger.error('Error updating payment status:', error);
    res.status(500).json({
      error: 'Failed to update payment status'
    });
  }
}));

// Get payments by user ID
router.get('/user/:userId', asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const payments = await paymentService.getPaymentsByUserId(userId);
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Error fetching user payments:', error);
    res.status(500).json({
      error: 'Failed to fetch user payments'
    });
  }
}));

// Get payments by status (admin only)
router.get('/status/:status', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { status } = req.params;
    const payments = await paymentService.getPaymentsByStatus(status as any);
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Error fetching payments by status:', error);
    res.status(500).json({
      error: 'Failed to fetch payments by status'
    });
  }
}));

// Get payment statistics (admin only)
router.get('/stats/overview', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const stats = await paymentService.getSalesStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching payment statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch payment statistics'
    });
  }
}));

// Get payment methods statistics (admin only)
router.get('/stats/methods', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const stats = await paymentService.getPaymentMethodsStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching payment methods statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch payment methods statistics'
    });
  }
}));

// Get monthly sales data (admin only)
router.get('/stats/monthly/:months?', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { months } = req.params;
    const monthsNum = months ? parseInt(months) : 12;
    
    if (isNaN(monthsNum) || monthsNum <= 0) {
      return res.status(400).json({
        error: 'Invalid months parameter'
      });
    }

    const data = await paymentService.getMonthlySalesData(monthsNum);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching monthly sales data:', error);
    res.status(500).json({
      error: 'Failed to fetch monthly sales data'
    });
  }
}));

// Refund payment (admin only)
router.post('/:id/refund', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Refund reason is required'
      });
    }

    const refundedPayment = await paymentService.refundPayment(id, reason);

    logger.info('Payment refunded successfully', {
      paymentId: id,
      reason,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: refundedPayment
    });
  } catch (error) {
    logger.error('Error refunding payment:', error);
    res.status(500).json({
      error: 'Failed to refund payment'
    });
  }
}));

// Process card-to-card payment
router.post('/:id/process-card', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionDetails } = req.body;

    if (!transactionDetails) {
      return res.status(400).json({
        error: 'Transaction details are required'
      });
    }

    const updatedPayment = await paymentService.processCardToCardPayment(id, transactionDetails);

    logger.info('Card-to-card payment processed', {
      paymentId: id,
      transactionDetails
    });

    res.json({
      success: true,
      message: 'Card-to-card payment processed successfully',
      data: updatedPayment
    });
  } catch (error) {
    logger.error('Error processing card-to-card payment:', error);
    res.status(500).json({
      error: 'Failed to process card-to-card payment'
    });
  }
}));

// Process cryptocurrency payment
router.post('/:id/process-crypto', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionHash, amount } = req.body;

    if (!transactionHash || !amount) {
      return res.status(400).json({
        error: 'Transaction hash and amount are required'
      });
    }

    const updatedPayment = await paymentService.processCryptoPayment(id, transactionHash, amount);

    logger.info('Cryptocurrency payment processed', {
      paymentId: id,
      transactionHash,
      amount
    });

    res.json({
      success: true,
      message: 'Cryptocurrency payment processed successfully',
      data: updatedPayment
    });
  } catch (error) {
    logger.error('Error processing cryptocurrency payment:', error);
    res.status(500).json({
      error: 'Failed to process cryptocurrency payment'
    });
  }
}));

// ZarinPal payment callback
router.post('/zarinpal/callback', asyncHandler(async (req, res) => {
  try {
    const { Authority, Status } = req.query;

    if (!Authority || !Status) {
      logger.warn('ZarinPal callback missing required parameters', { query: req.query });
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    logger.info('ZarinPal callback received', {
      authority: Authority,
      status: Status
    });

    // Verify payment with ZarinPal
    const payment = await paymentService.verifyZarinPalPayment(Authority as string, Status as string);

    if (payment) {
      logger.info('ZarinPal payment verified successfully', {
        paymentId: payment.id,
        authority: Authority
      });

      // Redirect to success page
      res.redirect('/payment/success');
    } else {
      logger.warn('ZarinPal payment verification failed', {
        authority: Authority,
        status: Status
      });

      // Redirect to failure page
      res.redirect('/payment/failed');
    }
  } catch (error) {
    logger.error('Error processing ZarinPal callback:', error);
    // Redirect to failure page
    res.redirect('/payment/failed');
  }
}));

// ZarinPal payment verification (for manual verification)
router.post('/zarinpal/verify', asyncHandler(async (req, res) => {
  try {
    const { authority, status } = req.body;

    if (!authority || !status) {
      return res.status(400).json({
        error: 'Authority and status are required'
      });
    }

    const payment = await paymentService.verifyZarinPalPayment(authority, status);

    if (payment) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: payment
      });
    } else {
      res.status(400).json({
        error: 'Payment verification failed'
      });
    }
  } catch (error) {
    logger.error('Error verifying ZarinPal payment:', error);
    res.status(500).json({
      error: 'Failed to verify payment'
    });
  }
}));

// Get payment by transaction ID
router.get('/transaction/:transactionId', asyncHandler(async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // This would typically search for payment by transaction ID
    // For now, we'll return an error
    res.status(404).json({
      error: 'Payment not found'
    });
  } catch (error) {
    logger.error('Error fetching payment by transaction ID:', error);
    res.status(500).json({
      error: 'Failed to fetch payment'
    });
  }
}));

// Export payment data (admin only)
router.post('/export', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'Start date and end date are required'
      });
    }

    // This would typically export payment data in the specified format
    // For now, we'll return a mock response
    logger.info('Payment export requested', {
      startDate,
      endDate,
      format,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Payment export initiated successfully',
      data: {
        exportId: 'mock-export-id',
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
      }
    });
  } catch (error) {
    logger.error('Error initiating payment export:', error);
    res.status(500).json({
      error: 'Failed to initiate payment export'
    });
  }
}));

// Get export status (admin only)
router.get('/export/:exportId', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // This would typically check the export status
    // For now, we'll return a mock response
    res.json({
      success: true,
      data: {
        exportId,
        status: 'completed',
        downloadUrl: `/api/payments/export/${exportId}/download`,
        completedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error checking export status:', error);
    res.status(500).json({
      error: 'Failed to check export status'
    });
  }
}));

// Download exported data (admin only)
router.get('/export/:exportId/download', adminMiddleware, asyncHandler(async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // This would typically serve the exported file
    // For now, we'll return an error
    res.status(404).json({
      error: 'Export file not found'
    });
  } catch (error) {
    logger.error('Error downloading export:', error);
    res.status(500).json({
      error: 'Failed to download export'
    });
  }
}));

export default router;
