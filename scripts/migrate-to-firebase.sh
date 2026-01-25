#!/bin/bash

# FisioFlow - Migration Script: Supabase → Firebase
#
# Este script aplica todas as migrações criadas e remove dependências Supabase
#
# Uso:
#   bash scripts/migrate-to-firebase.sh [--dry-run]
#
# Opções:
#   --dry-run    Mostra o que seria feito sem executar

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
DRY_RUN=false
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dry run
run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} $1"
  else
    eval "$1"
  fi
}

# Start
log_info "FisioFlow Migration: Supabase → Firebase"
log_info "Project root: $PROJECT_ROOT"

if [ "$DRY_RUN" = true ]; then
  log_warn "DRY RUN MODE - No changes will be made"
fi

echo ""

# Step 1: Backup original files
log_info "Step 1: Creating backup of original files..."

backup_dir="$PROJECT_ROOT/.backup-before-firebase-migration"
run_cmd "mkdir -p $backup_dir"

files_to_backup=(
  "src/hooks/useUserProfile.ts"
  "src/hooks/useOnlineUsers.ts"
  "src/hooks/useGamificationNotifications.ts"
  "src/inngest/workflows/appointments.ts"
  "src/integrations/supabase/client.ts"
)

for file in "${files_to_backup[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    run_cmd "cp $PROJECT_ROOT/$file $backup_dir/$(basename $file).backup"
    log_success "Backed up: $file"
  fi
done

log_success "Backup completed: $backup_dir"
echo ""

# Step 2: Replace migrated files
log_info "Step 2: Replacing original files with migrated versions..."

migrations=(
  "src/hooks/useUserProfile.migrated.ts|src/hooks/useUserProfile.ts"
  "src/hooks/useOnlineUsers.migrated.ts|src/hooks/useOnlineUsers.ts"
  "src/hooks/useGamificationNotifications.migrated.ts|src/hooks/useGamificationNotifications.ts"
  "src/inngest/workflows/appointments.migrated.ts|src/inngest/workflows/appointments.ts"
)

for migration in "${migrations[@]}"; do
  IFS='|' read -r migrated original <<< "$migration"

  if [ -f "$PROJECT_ROOT/$migrated" ]; then
    run_cmd "mv $PROJECT_ROOT/$migrated $PROJECT_ROOT/$original"
    log_success "Replaced: $original"
  else
    log_warn "Migrated file not found: $migrated"
  fi
done

echo ""

# Step 3: Update shared-api package.json
log_info "Step 3: Verifying shared-api exports..."

shared_api_index="$PROJECT_ROOT/packages/shared-api/src/index.ts"
if [ -f "$shared_api_index" ]; then
  if grep -q "export \* from './firebase';" "$shared_api_index"; then
    log_success "shared-api exports are correct"
  else
    log_warn "shared-api exports may need manual verification"
  fi
fi

echo ""

# Step 4: Remove Supabase dependencies (interactive)
log_info "Step 4: Supabase dependency removal"
log_warn "This step will be done manually to verify compatibility"
log_info "Run the following command after verifying all migrations work:"
echo ""
echo -e "${GREEN}pnpm remove @supabase/supabase-js supabase${NC}"
echo ""

# Step 5: Update package.json main
log_info "Step 5: No package.json changes needed (API compatible)"

echo ""

# Step 6: Verification
log_info "Step 6: Migration verification..."

# Check for remaining Supabase imports
supabase_imports=$(grep -r "from '@supabase/supabase-js'" "$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
supabase_client=$(grep -r "from '@/integrations/supabase/client'" "$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")

log_info "Remaining Supabase SDK imports: $supabase_imports"
log_info "Remaining Supabase client imports: $supabase_client"

if [ "$supabase_imports" -gt 0 ] || [ "$supabase_client" -gt 0 ]; then
  log_warn "Some files still import from Supabase"
  log_info "These files need manual migration:"
  grep -r "from '@supabase/supabase-js'\|from '@/integrations/supabase/client'" "$PROJECT_ROOT/src" --include="*.ts" --include="*.tsx" -l 2>/dev/null || true
else
  log_success "No Supabase imports found in src/"
fi

echo ""

# Summary
log_info "Migration Summary"
echo "===================="
echo "Dry run: $DRY_RUN"
echo "Backup location: $backup_dir"
echo ""
echo "Next steps:"
echo "1. Review migrated files"
echo "2. Test the application"
echo "3. Remove Supabase dependencies: pnpm remove @supabase/supabase-js supabase"
echo "4. Remove Supabase integration: rm -rf src/integrations/supabase"
echo "5. Update .env to remove VITE_SUPABASE_* variables"
echo ""

log_success "Migration script completed!"
