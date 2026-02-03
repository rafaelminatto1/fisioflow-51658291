#!/bin/bash

################################################################################
# FisioFlow - Firebase Backup Script
#
# Description: Automates daily backups of Firestore and Storage
# Usage: ./scripts/backup-firebase.sh
#
# Requirements:
# - gcloud CLI installed and configured
# - Active Google Cloud project
# - Service account with Storage Admin role
################################################################################

set -e  # Exit on error

# =============================================================================
# CONFIGURATION
# =============================================================================

# Project configuration
PROJECT_ID="${FISIOFLOW_PROJECT_ID:-fisioflow-prod}"
BACKUP_BUCKET="${BACKUP_BUCKET:-gs://${PROJECT_ID}-backups}"

# Backup retention (days)
RETENTION_DAYS=30

# Date format for backup files
DATE_FORMAT=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%s)

# Log file
LOG_FILE="backup_${DATE_FORMAT}.log"

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$LOG_FILE"
}

# =============================================================================
# PRE-BACKUP CHECKS
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed"
        log_info "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    # Check if user is authenticated
    if ! gcloud auth list --filter="status:ACTIVE" &> /dev/null; then
        log_error "Not authenticated with gcloud"
        log_info "Run: gcloud auth login"
        exit 1
    fi

    # Check if project is set
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [[ -z "$CURRENT_PROJECT" ]]; then
        log_info "Setting project to $PROJECT_ID"
        gcloud config set project "$PROJECT_ID"
    fi

    # Check if backup bucket exists, create if not
    if ! gsutil ls "$BACKUP_BUCKET" &> /dev/null; then
        log_info "Creating backup bucket: $BACKUP_BUCKET"
        gsutil mb -p "$PROJECT_ID" "$BACKUP_BUCKET" || {
            log_error "Failed to create backup bucket"
            exit 1
        }

        # Set lifecycle rule for automatic cleanup
        log_info "Setting lifecycle rules (retention: $RETENTION_DAYS days)"
        cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": $RETENTION_DAYS
        }
      }
    ]
  }
}
EOF
        gsutil lifecycle set /tmp/lifecycle.json "$BACKUP_BUCKET"
        rm /tmp/lifecycle.json
    fi

    log_success "Prerequisites check completed"
}

# =============================================================================
# FIRESTORE BACKUP
# =============================================================================

backup_firestore() {
    log_info "Starting Firestore backup..."

    local firestore_backup_path="${BACKUP_BUCKET}/firestore/${DATE_FORMAT}"

    # Export Firestore to GCS
    log_info "Exporting Firestore documents..."
    gcloud firestore exports "$firestore_backup_path" \
        --collection-ids='patients,appointments,evolutions,evaluations,exercises,exercise_protocols,payments,vouchers,notifications,audit_logs,profiles,user_roles,organizations' \
        --async \
        --project="$PROJECT_ID" || {
        log_error "Firestore export failed"
        return 1
    }

    log_success "Firestore backup initiated: $firestore_backup_path"
}

# =============================================================================
# STORAGE BACKUP
# =============================================================================

backup_storage() {
    log_info "Starting Cloud Storage backup..."

    local storage_backup_path="${BACKUP_BUCKET}/storage/${DATE_FORMAT}"

    # Copy all files from production storage to backup
    log_info "Copying Storage files..."

    # List of buckets to backup (excluding the backup bucket itself)
    local buckets=$(gsutil ls | grep -v "$BACKUP_BUCKET" || true)

    if [[ -z "$buckets" ]]; then
        log_info "No storage buckets found to backup"
        return 0
    fi

    while IFS= read -r bucket; do
        bucket_name=$(basename "$bucket")
        log_info "Backing up bucket: $bucket_name"

        gsutil -m rsync -r "$bucket" "${storage_backup_path}/${bucket_name}/" || {
            log_error "Failed to backup bucket: $bucket_name"
            continue
        }
    done <<< "$buckets"

    log_success "Storage backup completed: $storage_backup_path"
}

# =============================================================================
# REALTIME DATABASE BACKUP (if applicable)
# =============================================================================

backup_realtime_database() {
    log_info "Checking for Realtime Database..."

    # Check if Realtime Database is enabled
    if gcloud firestore databases list --project="$PROJECT_ID" 2>/dev/null | grep -q "default"; then
        log_info "Realtime Database found, skipping (Firestore is primary)"
    else
        log_info "No Realtime Database found, skipping"
    fi
}

# =============================================================================
# CLEANUP OLD BACKUPS
# =============================================================================

cleanup_old_backups() {
    log_info "Cleaning up backups older than $RETENTION_DAYS days..."

    # The lifecycle rule handles this automatically, but we can also manually clean
    # This is useful if retention period needs to be changed temporarily
    log_info "Note: Bucket lifecycle rules handle automatic cleanup"
    log_info "Manual cleanup skipped (use --force-cleanup to override)"
}

# =============================================================================
# BACKUP SUMMARY
# =============================================================================

generate_summary() {
    log_info "Generating backup summary..."

    cat > "/tmp/backup_summary_${DATE_FORMAT}.txt" << EOF
================================================================================
FisioFlow Backup Summary
================================================================================
Project:        $PROJECT_ID
Timestamp:      $(date)
Backup Path:    $BACKUP_BUCKET
Retention:      $RETENTION_DAYS days

Backup Components:
- Firestore:     $BACKUP_BUCKET/firestore/${DATE_FORMAT}
- Storage:       $BACKUP_BUCKET/storage/${DATE_FORMAT}

Restore Commands:
# Restore Firestore
gcloud firestore import gs://${PROJECT_ID}-backups/firestore/${DATE_FORMAT}/firestore-export.overallExportMetadata

# Restore Storage (bucket by bucket)
gsutil -m rsync -r $BACKUP_BUCKET/storage/${DATE_FORMAT}/{bucket_name}/ gs://{bucket_name}/

================================================================================
EOF

    # Upload summary to backup bucket
    gsutil cp "/tmp/backup_summary_${DATE_FORMAT}.txt" "${BACKUP_BUCKET}/summaries/"
    rm "/tmp/backup_summary_${DATE_FORMAT}.txt"

    log_success "Backup summary generated and uploaded"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    log_info "=========================================="
    log_info "FisioFlow Firebase Backup Started"
    log_info "=========================================="

    # Run checks
    check_prerequisites

    # Run backups
    backup_firestore
    backup_storage
    backup_realtime_database

    # Generate summary
    generate_summary

    log_info "=========================================="
    log_success "Backup completed successfully!"
    log_info "=========================================="
}

# =============================================================================
# SCRIPT ENTRY POINT
# =============================================================================

# Parse command line arguments
FORCE_CLEANUP=false
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force-cleanup)
            FORCE_CLEANUP=true
            shift
            ;;
        --skip-confirmation)
            SKIP_CONFIRMATION=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force-cleanup      Manually cleanup old backups (bypasses lifecycle rule)"
            echo "  --skip-confirmation Skip confirmation prompts"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Confirm before proceeding
if [[ "$SKIP_CONFIRMATION" = false ]]; then
    echo ""
    echo "This will backup Firebase data for project: $PROJECT_ID"
    echo "Backup destination: $BACKUP_BUCKET"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Backup cancelled by user"
        exit 0
    fi
fi

# Run main function
main

# Cleanup log file older than 7 days
find . -name "backup_*.log" -mtime +7 -delete 2>/dev/null || true
