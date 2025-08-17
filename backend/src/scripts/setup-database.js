#!/usr/bin/env node

/**
 * Database Setup Script for Marzban VPN Bot System
 * This script creates all necessary tables and initial data
 */

import { getDatabase } from '../database/connection.js';
import { logger } from '../utils/logger.js';

const db = getDatabase();

const createTables = async () => {
  try {
    logger.info('Creating database tables...');

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id VARCHAR(20) UNIQUE NOT NULL,
        telegram_username VARCHAR(50),
        email VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Marzban panels table
    await db.query(`
      CREATE TABLE IF NOT EXISTS marzban_panels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        url VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // VPN plans table
    await db.query(`
      CREATE TABLE IF NOT EXISTS vpn_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        panel_id UUID REFERENCES marzban_panels(id) ON DELETE CASCADE,
        data_limit INTEGER NOT NULL CHECK (data_limit > 0),
        duration INTEGER NOT NULL CHECK (duration > 0),
        price INTEGER NOT NULL CHECK (price >= 0),
        is_visible BOOLEAN DEFAULT true,
        max_connections INTEGER DEFAULT 1 CHECK (max_connections > 0),
        features JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Subscriptions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES vpn_plans(id) ON DELETE CASCADE,
        panel_id UUID REFERENCES marzban_panels(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        data_limit INTEGER NOT NULL CHECK (data_limit > 0),
        used_data INTEGER DEFAULT 0 CHECK (used_data >= 0),
        remaining_data INTEGER NOT NULL CHECK (remaining_data >= 0),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(20) NOT NULL,
        plan_id UUID REFERENCES vpn_plans(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        method VARCHAR(20) NOT NULL CHECK (method IN ('card', 'crypto', 'zarinpal')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
        transaction_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Bot sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id VARCHAR(20) NOT NULL,
        session_data JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // System settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Audit logs table
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(50),
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    logger.info('Creating database indexes...');

    // Users table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)');

    // Marzban panels table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_panels_status ON marzban_panels(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_panels_created_at ON marzban_panels(created_at)');

    // VPN plans table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_plans_panel_id ON vpn_plans(panel_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_plans_is_visible ON vpn_plans(is_visible)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_plans_price ON vpn_plans(price)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_plans_data_limit ON vpn_plans(data_limit)');

    // Subscriptions table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_panel_id ON subscriptions(panel_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at)');

    // Payments table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(plan_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)');

    // Bot sessions table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_bot_sessions_telegram_id ON bot_sessions(telegram_id)');

    // Audit logs table indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
};

const insertInitialData = async () => {
  try {
    logger.info('Inserting initial data...');

    // Check if admin user already exists
    const adminExists = await db.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
    
    if (parseInt(adminExists.rows[0].count) === 0) {
      // Create default admin user
      await db.query(`
        INSERT INTO users (telegram_id, telegram_username, role, status)
        VALUES ($1, $2, $3, $4)
      `, ['123456789', 'admin', 'admin', 'active']);
      
      logger.info('Default admin user created');
    }

    // Check if system settings already exist
    const settingsExist = await db.query('SELECT COUNT(*) as count FROM system_settings');
    
    if (parseInt(settingsExist.rows[0].count) === 0) {
      // Insert default system settings
      const defaultSettings = [
        ['bot_welcome_message', '🎉 به ربات فروش VPN خوش آمدید!', 'Welcome message for new users'],
        ['bot_support_message', '📞 برای پشتیبانی با ما تماس بگیرید', 'Support message'],
        ['payment_card_number', '6037-1234-5678-9012', 'Default card number for card-to-card payments'],
        ['payment_card_holder', 'احمد احمدی', 'Default card holder name'],
        ['crypto_wallet_address', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Default Bitcoin wallet address'],
        ['maintenance_mode', 'false', 'System maintenance mode'],
        ['max_connections_per_user', '3', 'Maximum VPN connections per user'],
        ['data_usage_check_interval', '3600', 'Data usage check interval in seconds']
      ];

      for (const [key, value, description] of defaultSettings) {
        await db.query(`
          INSERT INTO system_settings (key, value, description)
          VALUES ($1, $2, $3)
        `, [key, value, description]);
      }
      
      logger.info('Default system settings created');
    }

    logger.info('Initial data inserted successfully');
  } catch (error) {
    logger.error('Error inserting initial data:', error);
    throw error;
  }
};

const createTriggers = async () => {
  try {
    logger.info('Creating database triggers...');

    // Function to update updated_at timestamp
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Triggers for updated_at columns
    const tables = ['users', 'marzban_panels', 'vpn_plans', 'subscriptions', 'payments', 'bot_sessions', 'system_settings'];
    
    for (const table of tables) {
      await db.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}
      `);
      
      await db.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);
    }

    logger.info('Database triggers created successfully');
  } catch (error) {
    logger.error('Error creating triggers:', error);
    throw error;
  }
};

const createViews = async () => {
  try {
    logger.info('Creating database views...');

    // View for active subscriptions with user and plan details
    await db.query(`
      CREATE OR REPLACE VIEW active_subscriptions_view AS
      SELECT 
        s.id,
        s.username,
        s.data_limit,
        s.used_data,
        s.remaining_data,
        s.expires_at,
        s.status,
        u.telegram_username,
        u.telegram_id,
        p.name as plan_name,
        p.price as plan_price,
        mp.name as panel_name,
        mp.url as panel_url
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      JOIN vpn_plans p ON s.plan_id = p.id
      JOIN marzban_panels mp ON s.panel_id = mp.id
      WHERE s.status = 'active' AND s.expires_at > NOW()
    `);

    // View for payment statistics
    await db.query(`
      CREATE OR REPLACE VIEW payment_stats_view AS
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as average_amount
      FROM payments
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `);

    // View for user statistics
    await db.query(`
      CREATE OR REPLACE VIEW user_stats_view AS
      SELECT 
        DATE_TRUNC('day', u.created_at) as date,
        COUNT(*) as new_users,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as premium_users
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.expires_at > NOW()
      GROUP BY DATE_TRUNC('day', u.created_at)
      ORDER BY date DESC
    `);

    logger.info('Database views created successfully');
  } catch (error) {
    logger.error('Error creating views:', error);
    throw error;
  }
};

const main = async () => {
  try {
    logger.info('Starting database setup...');

    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Create tables
    await createTables();

    // Create indexes
    await createIndexes();

    // Create triggers
    await createTriggers();

    // Create views
    await createViews();

    // Insert initial data
    await insertInitialData();

    logger.info('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database setup failed:', error);
    process.exit(1);
  }
};

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
