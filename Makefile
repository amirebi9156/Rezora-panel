# ========================================
# VPN Bot Makefile
# ========================================
# This Makefile provides easy commands for managing the VPN Bot project

.PHONY: help install deploy start stop restart logs clean build test backup update

# Default target
help:
	@echo "VPN Bot - Available Commands:"
	@echo ""
	@echo "🔧 Setup & Installation:"
	@echo "  install     - Install and setup the complete system"
	@echo "  deploy      - Deploy the system to production"
	@echo "  build       - Build Docker images"
	@echo ""
	@echo "🚀 Service Management:"
	@echo "  start       - Start all services"
	@echo "  stop        - Stop all services"
	@echo "  restart     - Restart all services"
	@echo "  status      - Show service status"
	@echo ""
	@echo "📊 Monitoring & Logs:"
	@echo "  logs        - View service logs"
	@echo "  logs-follow - Follow service logs in real-time"
	@echo "  monitor     - Open monitoring dashboards"
	@echo ""
	@echo "🔄 Maintenance:"
	@echo "  backup      - Create database backup"
	@echo "  update      - Update all services"
	@echo "  clean       - Clean up containers and images"
	@echo "  test        - Run tests"
	@echo ""
	@echo "📁 Development:"
	@echo "  dev         - Start development environment"
	@echo "  shell       - Open shell in backend container"
	@echo "  db-shell    - Open PostgreSQL shell"
	@echo ""

# Installation
install:
	@echo "🚀 Installing VPN Bot system..."
	@chmod +x install.sh
	@./install.sh

# Deployment
deploy:
	@echo "🚀 Deploying VPN Bot system..."
	@chmod +x deploy.sh
	@./deploy.sh

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	docker-compose build --no-cache

# Start services
start:
	@echo "🚀 Starting VPN Bot services..."
	docker-compose up -d
	@echo "✅ Services started successfully!"

# Stop services
stop:
	@echo "🛑 Stopping VPN Bot services..."
	docker-compose down
	@echo "✅ Services stopped successfully!"

# Restart services
restart:
	@echo "🔄 Restarting VPN Bot services..."
	docker-compose restart
	@echo "✅ Services restarted successfully!"

# Show service status
status:
	@echo "📊 VPN Bot Service Status:"
	docker-compose ps

# View logs
logs:
	@echo "📋 Showing service logs..."
	docker-compose logs

# Follow logs in real-time
logs-follow:
	@echo "📋 Following service logs in real-time..."
	docker-compose logs -f

# Open monitoring dashboards
monitor:
	@echo "📊 Opening monitoring dashboards..."
	@echo "🌐 Grafana Dashboard: http://localhost:3002"
	@echo "📈 Prometheus: http://localhost:9090"
	@echo "🔧 PM2 Dashboard: http://localhost:9615"
	@if command -v xdg-open > /dev/null; then \
		xdg-open http://localhost:3002; \
	elif command -v open > /dev/null; then \
		open http://localhost:3002; \
	else \
		echo "Please open the URLs manually in your browser"; \
	fi

# Create database backup
backup:
	@echo "💾 Creating database backup..."
	docker-compose exec backup sh /backup.sh

# Update services
update:
	@echo "🔄 Updating VPN Bot services..."
	docker-compose pull
	docker-compose up -d
	@echo "✅ Services updated successfully!"

# Clean up containers and images
clean:
	@echo "🧹 Cleaning up containers and images..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup completed!"

# Run tests
test:
	@echo "🧪 Running tests..."
	docker-compose exec backend npm test

# Development environment
dev:
	@echo "🔧 Starting development environment..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "✅ Development environment started!"

# Open shell in backend container
shell:
	@echo "🐚 Opening shell in backend container..."
	docker-compose exec backend sh

# Open PostgreSQL shell
db-shell:
	@echo "🗄️ Opening PostgreSQL shell..."
	docker-compose exec postgres psql -U vpn_bot_user -d vpn_bot

# Health check
health:
	@echo "🏥 Checking system health..."
	@echo "Backend API:"
	@curl -f http://localhost:3000/health || echo "❌ Backend API is down"
	@echo "Frontend:"
	@curl -f http://localhost:3001 > /dev/null && echo "✅ Frontend is up" || echo "❌ Frontend is down"
	@echo "Database:"
	@docker-compose exec -T postgres pg_isready -U vpn_bot_user -d vpn_bot && echo "✅ Database is up" || echo "❌ Database is down"

# Show system info
info:
	@echo "📋 VPN Bot System Information:"
	@echo "Version: $(shell git describe --tags --always --dirty 2>/dev/null || echo 'Unknown')"
	@echo "Docker Compose: $(shell docker-compose --version)"
	@echo "Docker: $(shell docker --version)"
	@echo ""
	@echo "Service URLs:"
	@echo "  Frontend: http://localhost:3001"
	@echo "  Backend API: http://localhost:3000"
	@echo "  Grafana: http://localhost:3002"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  PM2: http://localhost:9615"

# Quick start (install + deploy)
quick-start: install deploy

# Emergency stop
emergency-stop:
	@echo "🚨 EMERGENCY STOP - Stopping all services immediately!"
	docker-compose down --remove-orphans
	docker stop $(shell docker ps -q) 2>/dev/null || true
	@echo "✅ All services stopped!"

# Show resource usage
resources:
	@echo "💻 System Resource Usage:"
	docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

# Backup and restore
backup-create:
	@echo "💾 Creating backup..."
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U vpn_bot_user -d vpn_bot > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created successfully!"

backup-restore:
	@echo "⚠️  WARNING: This will overwrite the current database!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🔄 Restoring backup..."
	@docker-compose exec -T postgres psql -U vpn_bot_user -d vpn_bot < backups/$(shell ls -t backups/*.sql | head -1)
	@echo "✅ Backup restored successfully!"

# SSL certificate renewal
ssl-renew:
	@echo "🔒 Renewing SSL certificates..."
	docker-compose run --rm certbot renew
	docker-compose restart nginx
	@echo "✅ SSL certificates renewed!"

# Show logs for specific service
logs-backend:
	@echo "📋 Backend logs:"
	docker-compose logs backend

logs-frontend:
	@echo "📋 Frontend logs:"
	docker-compose logs frontend

logs-db:
	@echo "📋 Database logs:"
	docker-compose logs postgres

# Database operations
db-reset:
	@echo "⚠️  WARNING: This will reset the database!"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "🔄 Resetting database..."
	docker-compose down -v
	docker-compose up -d postgres
	sleep 10
	docker-compose exec -T backend node src/scripts/setup-database.js
	@echo "✅ Database reset completed!"

# Performance optimization
optimize:
	@echo "⚡ Optimizing system performance..."
	docker-compose exec backend npm run build
	docker-compose restart backend
	@echo "✅ Performance optimization completed!"

# Security check
security-check:
	@echo "🔒 Running security checks..."
	@echo "Checking for exposed ports..."
	@netstat -tlnp 2>/dev/null | grep -E ":(80|443|3000|3001|5432|6379)" || echo "✅ No critical ports exposed"
	@echo "Checking Docker security..."
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL $(shell docker images -q | head -1) || echo "⚠️  Security scan completed with warnings"
	@echo "✅ Security check completed!"
