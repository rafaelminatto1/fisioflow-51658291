#!/usr/bin/env bash
#
# neon-restore.sh
# 
# Helper script to perform LGPD-compliant point-in-time recovery using Neon.
# 
# Usage:
#   ./neon-restore.sh --list [--project-id "proj-xyz"]
#   ./neon-restore.sh --timestamp "2026-08-07T10:00:00Z" --branch-name "recovery-branch" [--project-id "proj-xyz"] [--dry-run]
#

set -e

# Default values
PROJECT_ID=""
TIMESTAMP=""
BRANCH_NAME=""
DRY_RUN=false
LIST_ONLY=false


# Usage message
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -l, --list          List existing branches (as references for restore operations)"
    echo "  -t, --timestamp     Target point-in-time (e.g., '2026-08-07T10:00:00Z') (Required unless --list)"
    echo "  -b, --branch-name   Name for the new restored branch (Required unless --list)"
    echo "  -p, --project-id    Neon project ID (Optional, falls back to neonctl default context)"
    echo "  -d, --dry-run       Validate without actually creating the branch"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --list"
    echo "  $0 --timestamp '2026-08-07T12:00:00Z' --branch-name 'lgpd-recovery-01'"
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -l|--list) LIST_ONLY=true ;;
        -t|--timestamp) TIMESTAMP="$2"; shift ;;
        -b|--branch-name) BRANCH_NAME="$2"; shift ;;
        -p|--project-id) PROJECT_ID="$2"; shift ;;
        -d|--dry-run) DRY_RUN=true ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; usage; exit 1 ;;
    esac
    shift
done

if [ "$LIST_ONLY" = true ]; then
    CMD="neonctl branches list"
    if [[ -n "$PROJECT_ID" ]]; then
        CMD="$CMD --project-id \"$PROJECT_ID\""
    fi
    echo "Listing existing restore branches:"
    eval $CMD
    exit 0
fi

if [[ -z "$TIMESTAMP" || -z "$BRANCH_NAME" ]]; then
    echo "Error: --timestamp and --branch-name are required."
    usage
    exit 1
fi

echo "=========================================================="
echo "    LGPD Instant Restore Utility (Point-in-Time)          "
echo "=========================================================="
echo "Target Timestamp: $TIMESTAMP"
echo "New Branch Name:  $BRANCH_NAME"
if [[ -n "$PROJECT_ID" ]]; then
    echo "Project ID:       $PROJECT_ID"
fi
echo "=========================================================="

if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would create branch '$BRANCH_NAME' at $TIMESTAMP"
    exit 0
fi

# Confirm action
read -p "Are you sure you want to create a restoration branch for this timestamp? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Operation aborted by user."
    exit 0
fi

# Build neonctl command
CMD="neonctl branches create --name \"$BRANCH_NAME\" --timestamp \"$TIMESTAMP\""
if [[ -n "$PROJECT_ID" ]]; then
    CMD="$CMD --project-id \"$PROJECT_ID\""
fi

echo "Running: $CMD"
eval $CMD

echo "=========================================================="
echo "Branch created successfully!"
echo "Next Steps:"
echo "1. Connect to the new branch and verify the data."
echo "2. Extract the needed data (LGPD Portability/Restoration)."
echo "3. Log this action in the 'restore_audit_logs' table."
echo "=========================================================="
