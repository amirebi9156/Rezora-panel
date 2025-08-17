module.exports = {
  apps: [
    {
      name: 'vpn-bot-backend',
      script: 'backend/dist/server.js',
      cwd: process.cwd(),
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        '*.log',
        'dist',
        'uploads'
      ],
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Auto restart
      autorestart: true,
      // Environment variables
      env_file: '.env',
      // Monitoring
      pmx: true,
      // Metrics
      metrics: {
        http: true,
        custom_metrics: {
          'vpn-users': {
            type: 'counter',
            unit: 'users'
          },
          'sales-amount': {
            type: 'counter',
            unit: 'toman'
          }
        }
      }
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/vpn-bot.git',
      path: '/home/ubuntu/vpn-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  },

  // PM2 configuration
  pm2: {
    // Global PM2 settings
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    
    // Logging
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/err.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    pmx: true,
    monitor: true,
    
    // Notifications
    notify: true,
    notify_mode: 'on_error'
  }
};
