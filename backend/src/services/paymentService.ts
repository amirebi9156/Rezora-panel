import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

export interface Payment {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  method: 'card' | 'crypto' | 'zarinpal';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalSales: number;
  totalOrders: number;
  todaySales: number;
  monthSales: number;
  activeUsers: number;
}

export class PaymentService {
  private db = getDatabase();

  async createPayment(paymentData: Omit<Payment, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    try {
      const result = await this.db.query(
        `INSERT INTO payments (user_id, plan_id, amount, method, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [paymentData.userId, paymentData.planId, paymentData.amount, paymentData.method, 'pending']
      );

      logger.info(`Payment created: ${result.rows[0].id} for user ${paymentData.userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error fetching payment by ID:', error);
      throw new Error('Failed to fetch payment');
    }
  }

  async updatePaymentStatus(id: string, status: Payment['status'], transactionId?: string): Promise<Payment> {
    try {
      const result = await this.db.query(
        `UPDATE payments 
         SET status = $2, transaction_id = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, status, transactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      logger.info(`Payment ${id} status updated to: ${status}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  async getPaymentsByUserId(userId: string): Promise<Payment[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching payments by user ID:', error);
      throw new Error('Failed to fetch user payments');
    }
  }

  async getPaymentsByStatus(status: Payment['status']): Promise<Payment[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM payments WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching payments by status:', error);
      throw new Error('Failed to fetch payments by status');
    }
  }

  async createZarinPalPayment(paymentId: string, amount: number): Promise<string> {
    try {
      const merchantId = process.env.ZARINPAL_MERCHANT_ID;
      if (!merchantId) {
        throw new Error('ZARINPAL_MERCHANT_ID not configured');
      }

      const callbackUrl = process.env.ZARINPAL_CALLBACK_URL || `http://localhost:3000/api/payments/zarinpal/callback`;

      const response = await axios.post('https://api.zarinpal.com/pg/v4/payment/request.json', {
        merchant_id: merchantId,
        amount: amount,
        callback_url: callbackUrl,
        description: `VPN Payment - ${paymentId}`,
        metadata: {
          payment_id: paymentId,
          mobile: '',
          email: ''
        }
      });

      if (response.data.data && response.data.data.code === 100) {
        const authority = response.data.data.authority;
        const paymentUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
        
        // Update payment with authority
        await this.db.query(
          'UPDATE payments SET metadata = $2, updated_at = NOW() WHERE id = $1',
          [paymentId, { authority, paymentUrl }]
        );

        logger.info(`ZarinPal payment created for payment ${paymentId}: ${authority}`);
        return paymentUrl;
      } else {
        throw new Error(`ZarinPal error: ${response.data.errors?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error creating ZarinPal payment:', error);
      throw new Error('Failed to create ZarinPal payment');
    }
  }

  async verifyZarinPalPayment(authority: string, status: string): Promise<Payment | null> {
    try {
      if (status !== 'OK') {
        logger.warn(`ZarinPal payment failed for authority: ${authority}`);
        return null;
      }

      const merchantId = process.env.ZARINPAL_MERCHANT_ID;
      if (!merchantId) {
        throw new Error('ZARINPAL_MERCHANT_ID not configured');
      }

      // Find payment by authority
      const paymentResult = await this.db.query(
        'SELECT * FROM payments WHERE metadata->>\'authority\' = $1 AND status = $2',
        [authority, 'pending']
      );

      if (paymentResult.rows.length === 0) {
        logger.warn(`No pending payment found for authority: ${authority}`);
        return null;
      }

      const payment = paymentResult.rows[0];

      // Verify with ZarinPal
      const response = await axios.post('https://api.zarinpal.com/pg/v4/payment/verify.json', {
        merchant_id: merchantId,
        authority: authority,
        amount: payment.amount
      });

      if (response.data.data && response.data.data.code === 100) {
        // Payment verified successfully
        const verifiedPayment = await this.updatePaymentStatus(
          payment.id,
          'completed',
          response.data.data.ref_id
        );

        logger.info(`ZarinPal payment verified for payment ${payment.id}: ${response.data.data.ref_id}`);
        return verifiedPayment;
      } else {
        logger.error(`ZarinPal verification failed for authority ${authority}: ${response.data.errors?.message}`);
        await this.updatePaymentStatus(payment.id, 'failed');
        return null;
      }
    } catch (error) {
      logger.error('Error verifying ZarinPal payment:', error);
      throw new Error('Failed to verify ZarinPal payment');
    }
  }

  async processCardToCardPayment(paymentId: string, transactionDetails: any): Promise<Payment> {
    try {
      // For card-to-card payments, we typically wait for manual verification
      // This method updates the payment with transaction details
      const result = await this.db.query(
        `UPDATE payments 
         SET metadata = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentId, { ...transactionDetails, method: 'card_to_card' }]
      );

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      logger.info(`Card-to-card payment details updated for payment ${paymentId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error processing card-to-card payment:', error);
      throw new Error('Failed to process card-to-card payment');
    }
  }

  async processCryptoPayment(paymentId: string, transactionHash: string, amount: number): Promise<Payment> {
    try {
      // For crypto payments, we verify the transaction hash
      // This is a simplified implementation - in production you'd want to verify with blockchain APIs
      
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Basic validation - amount should match
      if (Math.abs(payment.amount - amount) > 0.0001) { // Allow for small differences due to exchange rates
        logger.warn(`Crypto payment amount mismatch for payment ${paymentId}: expected ${payment.amount}, received ${amount}`);
        await this.updatePaymentStatus(paymentId, 'failed');
        throw new Error('Payment amount mismatch');
      }

      // Update payment with transaction hash
      const result = await this.db.query(
        `UPDATE payments 
         SET metadata = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentId, { transactionHash, amount, method: 'crypto' }]
      );

      logger.info(`Crypto payment processed for payment ${paymentId}: ${transactionHash}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error processing crypto payment:', error);
      throw new Error('Failed to process crypto payment');
    }
  }

  async getSalesStats(): Promise<PaymentStats> {
    try {
      // Total sales
      const totalSalesResult = await this.db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1',
        ['completed']
      );

      // Total orders
      const totalOrdersResult = await this.db.query(
        'SELECT COUNT(*) as total FROM payments WHERE status = $1',
        ['completed']
      );

      // Today's sales
      const todaySalesResult = await this.db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1 AND DATE(created_at) = CURRENT_DATE',
        ['completed']
      );

      // This month's sales
      const monthSalesResult = await this.db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1 AND DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE)',
        ['completed']
      );

      // Active users (users with active subscriptions)
      const activeUsersResult = await this.db.query(
        'SELECT COUNT(DISTINCT user_id) as total FROM subscriptions WHERE expires_at > NOW()'
      );

      return {
        totalSales: parseInt(totalSalesResult.rows[0].total) || 0,
        totalOrders: parseInt(totalOrdersResult.rows[0].total) || 0,
        todaySales: parseInt(todaySalesResult.rows[0].total) || 0,
        monthSales: parseInt(monthSalesResult.rows[0].total) || 0,
        activeUsers: parseInt(activeUsersResult.rows[0].total) || 0
      };
    } catch (error) {
      logger.error('Error getting sales stats:', error);
      throw new Error('Failed to get sales statistics');
    }
  }

  async getPaymentMethodsStats(): Promise<Record<string, number>> {
    try {
      const result = await this.db.query(
        'SELECT method, COUNT(*) as count FROM payments WHERE status = $1 GROUP BY method',
        ['completed']
      );

      const stats: Record<string, number> = {};
      result.rows.forEach(row => {
        stats[row.method] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      logger.error('Error getting payment methods stats:', error);
      throw new Error('Failed to get payment methods statistics');
    }
  }

  async getMonthlySalesData(months: number = 12): Promise<Array<{ month: string; sales: number }>> {
    try {
      const result = await this.db.query(
        `SELECT 
           DATE_TRUNC('month', created_at) as month,
           COALESCE(SUM(amount), 0) as sales
         FROM payments 
         WHERE status = $1 
           AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '$2 months')
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month`,
        ['completed', months]
      );

      return result.rows.map(row => ({
        month: row.month.toISOString().slice(0, 7), // YYYY-MM format
        sales: parseInt(row.sales) || 0
      }));
    } catch (error) {
      logger.error('Error getting monthly sales data:', error);
      throw new Error('Failed to get monthly sales data');
    }
  }

  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    try {
      const payment = await this.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Update payment status to refunded
      const result = await this.db.query(
        `UPDATE payments 
         SET status = $2, metadata = COALESCE(metadata, '{}') || $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentId, 'refunded', { refundReason: reason, refundedAt: new Date().toISOString() }]
      );

      logger.info(`Payment ${paymentId} refunded: ${reason}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw new Error('Failed to refund payment');
    }
  }
}
