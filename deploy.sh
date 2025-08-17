#!/bin/bash

# ========================================
# VPN Bot Deployment Script
# ========================================
# This script deploys the VPN Bot system to production
# including database migrations, SSL setup, and service management

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if .env file exists
    if [ ! -f "$ENV_FILE" ]; then
        error ".env file not found. Please create it first using the install script."
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "docker-compose.yml file not found."
    fi
    
    log "Prerequisites check passed!"
}

# Load environment variables
load_env() {
    log "Loading environment variables..."
    
    if [ -f "$ENV_FILE" ]; then
        export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
        log "Environment variables loaded successfully"
    else
        error "Environment file not found: $ENV_FILE"
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/nginx/ssl"
    mkdir -p "$PROJECT_DIR/nginx/www"
    mkdir -p "$PROJECT_DIR/monitoring/grafana/provisioning/datasources"
    mkdir -p "$PROJECT_DIR/monitoring/grafana/provisioning/dashboards"
    
    log "Directories created successfully"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [ -n "$DOMAIN_NAME" ] && [ -n "$CERTBOT_EMAIL" ]; then
        info "Domain: $DOMAIN_NAME"
        info "Email: $CERTBOT_EMAIL"
        
        # Check if certificates already exist
        if [ -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ] && [ -f "$PROJECT_DIR/nginx/ssl/privkey.pem" ]; then
            warn "SSL certificates already exist. Skipping SSL setup."
            return 0
        fi
        
        # Start nginx for SSL verification
        log "Starting nginx for SSL verification..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" up -d nginx
        
        # Wait for nginx to be ready
        sleep 10
        
        # Run certbot
        log "Running certbot to obtain SSL certificates..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm certbot
        
        # Check if certificates were obtained
        if [ -f "$PROJECT_DIR/nginx/ssl/fullchain.pem" ] && [ -f "$PROJECT_DIR/nginx/ssl/privkey.pem" ]; then
            log "SSL certificates obtained successfully!"
            
            # Restart nginx with SSL
            log "Restarting nginx with SSL configuration..."
            docker-compose -f "$DOCKER_COMPOSE_FILE" restart nginx
        else
            warn "Failed to obtain SSL certificates. Continuing without SSL..."
        fi
    else
        warn "Domain name or email not configured. Skipping SSL setup."
    fi
}

# Build and start services
deploy_services() {
    log "Building and starting services..."
    
    # Build images
    log "Building Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log "Checking service health..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    log "Services deployed successfully!"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    until docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_isready -U vpn_bot_user -d vpn_bot; do
        sleep 5
    done
    
    # Run setup script
    log "Running database setup script..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T backend node src/scripts/setup-database.js
    
    log "Database migrations completed successfully!"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create Prometheus datasource for Grafana
    cat > "$PROJECT_DIR/monitoring/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    # Create default dashboard
    cat > "$PROJECT_DIR/monitoring/grafana/provisioning/dashboards/dashboard.yml" << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF
    
    log "Monitoring setup completed successfully!"
}

# Setup backup cron job
setup_backup_cron() {
    log "Setting up backup cron job..."
    
    # Create backup script
    cat > "$PROJECT_DIR/scripts/backup-cron.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
docker-compose exec -T backup sh /backup.sh
EOF
    
    chmod +x "$PROJECT_DIR/scripts/backup-cron.sh"
    
    # Add to crontab (daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * $PROJECT_DIR/scripts/backup-cron.sh") | crontab -
    
    log "Backup cron job set up successfully (daily at 2 AM)"
}

# Final verification
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all services are running
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        log "All services are running successfully!"
    else
        error "Some services failed to start. Check logs for details."
    fi
    
    # Check API health
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "Backend API is healthy!"
    else
        warn "Backend API health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log "Frontend is accessible!"
    else
        warn "Frontend accessibility check failed"
    fi
    
    log "Deployment verification completed!"
}

# Show deployment information
show_deployment_info() {
    log "=== VPN Bot Deployment Information ==="
    echo
    echo "🌐 Frontend URL: http://localhost:3001"
    echo "🔧 Backend API: http://localhost:3000"
    echo "📊 Grafana Dashboard: http://localhost:3002"
    echo "📈 Prometheus: http://localhost:9090"
    echo "🗄️  PostgreSQL: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo
    echo "📋 Useful Commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  Update services: docker-compose pull && docker-compose up -d"
    echo
    echo "🔐 Admin Panel: http://localhost:3001/admin"
    echo "📱 Telegram Bot: @$(grep TELEGRAM_BOT_USERNAME .env | cut -d'=' -f2)"
    echo
    log "Deployment completed successfully!"
}

# Main deployment function
main() {
    log "Starting VPN Bot deployment..."
    
    # Check if running as root
    check_root
    
    # Check prerequisites
    check_prerequisites
    
    # Load environment variables
    load_env
    
    # Create directories
    create_directories
    
    # Setup SSL (if configured)
    setup_ssl
    
    # Deploy services
    deploy_services
    
    # Run migrations
    run_migrations
    
    # Setup monitoring
    setup_monitoring
    
    # Setup backup cron
    setup_backup_cron
    
    # Verify deployment
    verify_deployment
    
    # Show deployment information
    show_deployment_info
}

# Run main function
main "$@"
