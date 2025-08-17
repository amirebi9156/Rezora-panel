#!/bin/bash

# ========================================
# VPN Bot Database Backup Script
# ========================================
# This script creates automated backups of the database
# and uploads them to cloud storage if configured

set -e

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-vpn_bot}"
DB_USER="${DB_USER:-vpn_bot_user}"
DB_PASSWORD="${DB_PASSWORD:-vpn_bot_password}"
RETENTION_DAYS=30
COMPRESSION_LEVEL=9

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/vpn_bot_backup_$TIMESTAMP.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

log "Starting database backup..."

# Wait for database to be ready
log "Waiting for database to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
    sleep 2
done

# Create database backup
log "Creating database backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --clean \
    --create \
    --if-exists \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --no-unlogged-table-data \
    --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Database backup created successfully: $BACKUP_FILE"
else
    error "Failed to create database backup"
fi

# Compress backup file
log "Compressing backup file..."
gzip -$COMPRESSION_LEVEL "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    log "Backup compressed successfully: $COMPRESSED_FILE"
    BACKUP_FILE="$COMPRESSED_FILE"
else
    warn "Failed to compress backup file, keeping uncompressed version"
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup size: $BACKUP_SIZE"

# Verify backup integrity
log "Verifying backup integrity..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -t "$BACKUP_FILE"
else
    # For uncompressed files, try to read the first few lines
    head -n 5 "$BACKUP_FILE" > /dev/null
fi

if [ $? -eq 0 ]; then
    log "Backup integrity verified successfully"
else
    error "Backup integrity check failed"
fi

# Clean up old backups
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "vpn_bot_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -delete

# Count remaining backups
REMAINING_BACKUPS=$(find "$BACKUP_DIR" -name "vpn_bot_backup_*.sql*" -type f | wc -l)
log "Remaining backups: $REMAINING_BACKUPS"

# Optional: Upload to cloud storage (AWS S3 example)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ] && [ -n "$S3_BUCKET" ]; then
    log "Uploading backup to S3..."
    
    # Install AWS CLI if not available
    if ! command -v aws &> /dev/null; then
        log "Installing AWS CLI..."
        apk add --no-cache aws-cli
    fi
    
    # Upload to S3
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        log "Backup uploaded to S3 successfully"
    else
        warn "Failed to upload backup to S3"
    fi
fi

# Optional: Upload to Google Cloud Storage
if [ -n "$GOOGLE_CLOUD_PROJECT" ] && [ -n "$GOOGLE_CLOUD_BUCKET" ]; then
    log "Uploading backup to Google Cloud Storage..."
    
    # Install gsutil if not available
    if ! command -v gsutil &> /dev/null; then
        log "Installing Google Cloud SDK..."
        apk add --no-cache curl
        curl -sSL https://sdk.cloud.google.com | bash
        export PATH=$PATH:/root/google-cloud-sdk/bin
    fi
    
    # Upload to GCS
    gsutil cp "$BACKUP_FILE" "gs://$GOOGLE_CLOUD_BUCKET/backups/"
    
    if [ $? -eq 0 ]; then
        log "Backup uploaded to Google Cloud Storage successfully"
    else
        warn "Failed to upload backup to Google Cloud Storage"
    fi
fi

# Create backup report
REPORT_FILE="$BACKUP_DIR/backup_report_$TIMESTAMP.txt"
cat > "$REPORT_FILE" << EOF
VPN Bot Database Backup Report
=============================
Date: $(date)
Backup File: $(basename "$BACKUP_FILE")
File Size: $BACKUP_SIZE
Database: $DB_NAME
Host: $DB_HOST:$DB_PORT
Status: SUCCESS
Integrity: VERIFIED
Retention: $RETENTION_DAYS days
Remaining Backups: $REMAINING_BACKUPS

Backup completed successfully at $(date)
EOF

log "Backup report created: $REPORT_FILE"
log "Database backup completed successfully!"

# Exit with success
exit 0
