#!/bin/bash

# ========================================
# VPN Bot Installation Script
# ========================================
# This script installs and configures the complete VPN Bot system
# including Telegram bot, web panel, and Marzban integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check system requirements
check_system() {
    log "Checking system requirements..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        error "Unsupported operating system. This script supports Ubuntu 20.04+, Debian 11+, and CentOS 8+."
    fi
    
    source /etc/os-release
    
    # Check if supported OS
    case $ID in
        ubuntu|debian|centos|rhel|rocky|almalinux)
            log "Supported OS detected: $PRETTY_NAME"
            ;;
        *)
            error "Unsupported operating system: $PRETTY_NAME"
            ;;
    esac
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" ]]; then
        error "Unsupported architecture: $ARCH. Only x86_64 and aarch64 are supported."
    fi
    
    # Check available memory
    MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [[ $MEMORY -lt 1024 ]]; then
        warn "Low memory detected: ${MEMORY}MB. Recommended minimum is 1GB."
    fi
    
    # Check available disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $DISK_SPACE -lt 5 ]]; then
        error "Insufficient disk space: ${DISK_SPACE}GB. Minimum required is 5GB."
    fi
    
    log "System requirements check passed"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Rocky
        sudo yum update -y
        sudo yum install -y curl wget git unzip epel-release
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf update -y
        sudo dnf install -y curl wget git unzip
    else
        error "Unsupported package manager"
    fi
    
    log "System dependencies installed successfully"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        log "Node.js already installed: v$NODE_VERSION"
        
        # Check if version is sufficient
        if [[ $(echo "$NODE_VERSION" | cut -d'.' -f1) -lt 18 ]]; then
            warn "Node.js version $NODE_VERSION is too old. Installing Node.js 18+..."
        else
            return 0
        fi
    fi
    
    # Install Node.js 18+
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Rocky
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif command -v dnf &> /dev/null; then
        # Fedora
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo dnf install -y nodejs
    fi
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log "Node.js installed: $NODE_VERSION, npm: $NPM_VERSION"
}

# Install PostgreSQL
install_postgresql() {
    log "Installing PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        log "PostgreSQL already installed"
        return 0
    fi
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Rocky
        sudo yum install -y postgresql postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y postgresql postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi
    
    log "PostgreSQL installed and started successfully"
}

# Install PM2
install_pm2() {
    log "Installing PM2 process manager..."
    
    if command -v pm2 &> /dev/null; then
        log "PM2 already installed"
        return 0
    fi
    
    sudo npm install -g pm2
    
    # Setup PM2 startup script
    pm2 startup
    log "PM2 installed and startup script configured"
}

# Install Nginx
install_nginx() {
    log "Installing Nginx..."
    
    if command -v nginx &> /dev/null; then
        log "Nginx already installed"
        return 0
    fi
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Rocky
        sudo yum install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
    fi
    
    log "Nginx installed and started successfully"
}

# Install Certbot for SSL
install_certbot() {
    log "Installing Certbot for SSL certificates..."
    
    if command -v certbot &> /dev/null; then
        log "Certbot already installed"
        return 0
    fi
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Rocky
        sudo yum install -y certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        # Fedora
        sudo dnf install -y certbot python3-certbot-nginx
    fi
    
    log "Certbot installed successfully"
}

# Create application directory
create_app_directory() {
    log "Creating application directory..."
    
    APP_DIR="$HOME/vpn-bot"
    if [[ -d "$APP_DIR" ]]; then
        warn "Application directory already exists: $APP_DIR"
        read -p "Do you want to backup and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_DIR="$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"
            log "Backing up existing directory to: $BACKUP_DIR"
            mv "$APP_DIR" "$BACKUP_DIR"
        else
            log "Using existing application directory"
            return 0
        fi
    fi
    
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    log "Application directory created: $APP_DIR"
}

# Clone or download application
download_application() {
    log "Downloading application files..."
    
    # Check if we're in a git repository
    if [[ -d ".git" ]]; then
        log "Already in git repository, pulling latest changes..."
        git pull origin main
    else
        # Download from GitHub release or clone repository
        if command -v git &> /dev/null; then
            log "Cloning from git repository..."
            git clone https://github.com/yourusername/vpn-bot.git .
        else
            log "Git not available, downloading zip file..."
            wget -O vpn-bot.zip "https://github.com/yourusername/vpn-bot/archive/main.zip"
            unzip vpn-bot.zip
            mv vpn-bot-main/* .
            rm -rf vpn-bot-main vpn-bot.zip
        fi
    fi
    
    log "Application files downloaded successfully"
}

# Install application dependencies
install_app_dependencies() {
    log "Installing application dependencies..."
    
    # Install backend dependencies
    if [[ -d "backend" ]]; then
        cd backend
        npm install
        cd ..
        log "Backend dependencies installed"
    fi
    
    # Install frontend dependencies
    if [[ -d "frontend" ]]; then
        cd frontend
        npm install
        cd ..
        log "Frontend dependencies installed"
    fi
    
    log "Application dependencies installed successfully"
}

# Setup environment variables
setup_environment() {
    log "Setting up environment variables..."
    
    ENV_FILE=".env"
    if [[ -f "$ENV_FILE" ]]; then
        warn "Environment file already exists: $ENV_FILE"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            mv "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
        else
            log "Using existing environment file"
            return 0
        fi
    fi
    
    # Create environment file
    cat > "$ENV_FILE" << EOF
# ========================================
# VPN Bot Environment Configuration
# ========================================

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vpn_bot
DB_USER=vpn_bot_user
DB_PASSWORD=$(openssl rand -base64 32)

# JWT
JWT_SECRET=$(openssl rand -base64 64)

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -base64 32)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Payment Gateways
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_id
ZARINPAL_CALLBACK_URL=https://yourdomain.com/api/payments/zarinpal/callback

# Security
SESSION_SECRET=$(openssl rand -base64 64)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# VPN Configuration
MAX_CONNECTIONS_PER_USER=3
DATA_USAGE_CHECK_INTERVAL=3600
SUBSCRIPTION_RENEWAL_REMINDER=true
PAYMENT_REMINDER=true

# Maintenance
MAINTENANCE_MODE=false
MAINTENANCE_MESSAGE=System is under maintenance. Please try again later.
EOF
    
    log "Environment file created: $ENV_FILE"
    warn "Please edit $ENV_FILE and configure your settings before starting the application"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Create database user
    sudo -u postgres psql -c "CREATE USER vpn_bot_user WITH PASSWORD '$(grep DB_PASSWORD .env | cut -d'=' -f2)';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE vpn_bot OWNER vpn_bot_user;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE vpn_bot TO vpn_bot_user;" 2>/dev/null || true
    
    log "Database setup completed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Build backend
    if [[ -d "backend" ]]; then
        cd backend
        npm run build
        cd ..
        log "Backend built successfully"
    fi
    
    # Build frontend
    if [[ -d "frontend" ]]; then
        cd frontend
        npm run build
        cd ..
        log "Frontend built successfully"
    fi
    
    log "Application built successfully"
}

# Setup Nginx configuration
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    NGINX_CONF="/etc/nginx/sites-available/vpn-bot"
    NGINX_ENABLED="/etc/nginx/sites-enabled/vpn-bot"
    
    # Create Nginx configuration
    sudo tee "$NGINX_CONF" > /dev/null << EOF
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        root /home/\$USER/vpn-bot/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    }
    
    # Telegram webhook
    location /webhook/telegram {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
EOF
    
    # Enable site
    sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    
    # Test configuration
    sudo nginx -t
    if [[ $? -eq 0 ]]; then
        sudo systemctl reload nginx
        log "Nginx configuration applied successfully"
    else
        error "Nginx configuration test failed"
    fi
}

# Setup SSL certificate
setup_ssl() {
    log "Setting up SSL certificate..."
    
    read -p "Do you want to set up SSL with Let's Encrypt? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log "SSL setup skipped"
        return 0
    fi
    
    read -p "Enter your domain name: " DOMAIN_NAME
    if [[ -z "$DOMAIN_NAME" ]]; then
        error "Domain name is required for SSL setup"
    fi
    
    # Update Nginx configuration with domain
    sudo sed -i "s/yourdomain.com/$DOMAIN_NAME/g" /etc/nginx/sites-available/vpn-bot
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    # Obtain SSL certificate
    sudo certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@"$DOMAIN_NAME"
    
    if [[ $? -eq 0 ]]; then
        log "SSL certificate obtained successfully"
        
        # Setup auto-renewal
        (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -
        log "SSL auto-renewal configured"
    else
        error "Failed to obtain SSL certificate"
    fi
}

# Setup PM2 ecosystem
setup_pm2() {
    log "Setting up PM2 ecosystem..."
    
    PM2_FILE="ecosystem.config.js"
    cat > "$PM2_FILE" << EOF
module.exports = {
  apps: [
    {
      name: 'vpn-bot-backend',
      script: 'backend/dist/server.js',
      cwd: '/home/\$USER/vpn-bot',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
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
      min_uptime: '10s'
    }
  ]
};
EOF
    
    log "PM2 ecosystem file created: $PM2_FILE"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    LOGROTATE_CONF="/etc/logrotate.d/vpn-bot"
    sudo tee "$LOGROTATE_CONF" > /dev/null << EOF
/home/\$USER/vpn-bot/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 \$USER \$USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    log "Log rotation configured"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian
        sudo ufw allow ssh
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw --force enable
        log "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL/Rocky
        sudo firewall-cmd --permanent --add-service=ssh
        sudo firewall-cmd --permanent --add-service=http
        sudo firewall-cmd --permanent --add-service=https
        sudo firewall-cmd --reload
        log "Firewalld configured"
    else
        warn "No supported firewall detected"
    fi
}

# Setup systemd service
setup_systemd() {
    log "Setting up systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/vpn-bot.service"
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=VPN Bot Service
After=network.target postgresql.service

[Service]
Type=forking
User=\$USER
WorkingDirectory=/home/\$USER/vpn-bot
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 stop all
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable vpn-bot
    sudo systemctl start vpn-bot
    
    log "Systemd service configured and started"
}

# Setup cron jobs
setup_cron() {
    log "Setting up cron jobs..."
    
    # Create cron file
    CRON_FILE="/tmp/vpn-bot-cron"
    cat > "$CRON_FILE" << EOF
# VPN Bot Maintenance Tasks

# Clean up expired subscriptions (daily at 2 AM)
0 2 * * * cd /home/\$USER/vpn-bot && /usr/bin/node backend/dist/scripts/cleanup.js >> logs/cron.log 2>&1

# Backup database (daily at 3 AM)
0 3 * * * cd /home/\$USER/vpn-bot && /usr/bin/pg_dump -h localhost -U vpn_bot_user vpn_bot > backups/backup_\$(date +\%Y\%m\%d).sql 2>> logs/cron.log

# Check panel status (every 6 hours)
0 */6 * * * cd /home/\$USER/vpn-bot && /usr/bin/node backend/dist/scripts/check-panels.js >> logs/cron.log 2>&1

# Send payment reminders (daily at 9 AM)
0 9 * * * cd /home/\$USER/vpn-bot && /usr/bin/node backend/dist/scripts/payment-reminders.js >> logs/cron.log 2>&1

# Rotate logs (weekly on Sunday at 1 AM)
0 1 * * 0 cd /home/\$USER/vpn-bot && /usr/bin/node backend/dist/scripts/rotate-logs.js >> logs/cron.log 2>&1
EOF
    
    # Install cron jobs
    crontab "$CRON_FILE"
    rm "$CRON_FILE"
    
    log "Cron jobs configured"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory..."
    
    mkdir -p backups
    log "Backup directory created: backups/"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    MONITOR_SCRIPT="scripts/monitor.sh"
    mkdir -p scripts
    cat > "$MONITOR_SCRIPT" << 'EOF'
#!/bin/bash

# VPN Bot Monitoring Script

LOG_FILE="logs/monitor.log"
ALERT_EMAIL="admin@yourdomain.com"

# Check if services are running
check_service() {
    local service_name=$1
    local service_status=$2
    
    if [[ "$service_status" != "online" ]]; then
        echo "$(date): $service_name is $service_status" >> "$LOG_FILE"
        # Send alert email
        echo "VPN Bot Alert: $service_name is $service_status" | mail -s "VPN Bot Alert" "$ALERT_EMAIL"
    fi
}

# Check PM2 processes
pm2_status=$(pm2 jlist | jq -r '.[] | select(.name == "vpn-bot-backend") | .pm2_env.status')
check_service "VPN Bot Backend" "$pm2_status"

# Check database connection
db_status=$(pg_isready -h localhost -U vpn_bot_user -d vpn_bot >/dev/null 2>&1 && echo "online" || echo "offline")
check_service "Database" "$db_status"

# Check disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $disk_usage -gt 80 ]]; then
    echo "$(date): Disk usage is ${disk_usage}%" >> "$LOG_FILE"
fi

# Check memory usage
mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [[ $mem_usage -gt 80 ]]; then
    echo "$(date): Memory usage is ${mem_usage}%" >> "$LOG_FILE"
fi
EOF
    
    chmod +x "$MONITOR_SCRIPT"
    
    # Add to crontab (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /home/\$USER/vpn-bot/$MONITOR_SCRIPT") | crontab -
    
    log "Monitoring configured"
}

# Final setup and start
final_setup() {
    log "Performing final setup..."
    
    # Create logs directory
    mkdir -p logs
    
    # Set proper permissions
    chmod 755 .
    chmod 644 .env
    
    # Initialize database
    if [[ -d "backend" ]]; then
        cd backend
        npm run setup:db
        cd ..
        log "Database initialized"
    fi
    
    # Start application with PM2
    pm2 start ecosystem.config.js
    pm2 save
    
    log "Application started with PM2"
    
    # Show status
    pm2 status
}

# Display completion message
show_completion() {
    log "Installation completed successfully!"
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}           VPN Bot Installed!           ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Edit .env file with your configuration"
    echo "2. Configure your Telegram bot token"
    echo "3. Set up your domain and SSL certificate"
    echo "4. Configure payment gateways"
    echo "5. Add your Marzban panels"
    echo
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  pm2 status                    - Check application status"
    echo "  pm2 logs                      - View application logs"
    echo "  pm2 restart vpn-bot-backend   - Restart backend"
    echo "  sudo systemctl status nginx   - Check Nginx status"
    echo "  sudo systemctl status postgresql - Check database status"
    echo
    echo -e "${BLUE}Access URLs:${NC}"
    echo "  Frontend: https://yourdomain.com"
    echo "  Backend API: https://yourdomain.com/api"
    echo "  Health Check: https://yourdomain.com/health"
    echo
    echo -e "${YELLOW}Important:${NC}"
    echo "- Change default passwords"
    echo "- Configure firewall rules"
    echo "- Set up regular backups"
    echo "- Monitor system resources"
    echo
    echo -e "${GREEN}Installation completed at: $(date)${NC}"
}

# Main installation function
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}        VPN Bot Installation           ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
    
    # Check system requirements
    check_root
    check_system
    
    # Install dependencies
    install_dependencies
    install_nodejs
    install_postgresql
    install_pm2
    install_nginx
    install_certbot
    
    # Setup application
    create_app_directory
    download_application
    install_app_dependencies
    setup_environment
    setup_database
    build_application
    
    # Setup infrastructure
    setup_nginx
    setup_ssl
    setup_pm2
    setup_log_rotation
    setup_firewall
    setup_systemd
    setup_cron
    create_backup_dir
    setup_monitoring
    
    # Final setup
    final_setup
    
    # Show completion message
    show_completion
}

# Run main function
main "$@"
