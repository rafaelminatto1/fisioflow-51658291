#!/usr/bin/env bash

set -euo pipefail

RUN_AUDIT=false
RUN_E2E=false
RUN_WRANGLER=false
RUN_MIGRATIONS=true
RUN_BUILD=true
RUN_TESTS=true
RUN_WEB_TESTS=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  echo -e "${BLUE}[predeploy]${NC} $1"
}

success() {
  echo -e "${GREEN}[predeploy]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[predeploy]${NC} $1"
}

run_step() {
  local title="$1"
  shift

  log "$title"
  "$@"
  success "$title"
}

usage() {
  cat <<'EOF'
Usage: bash scripts/predeploy-check.sh [options]

Options:
  --all             Run every check, including audit, wrangler dry-run and E2E smoke
  --audit           Run pnpm audit --audit-level high
  --e2e             Run Playwright smoke tests (@smoke)
  --web-tests       Run web unit tests
  --workers         Run wrangler deploy --dry-run for apps/api
  --skip-tests      Skip unit tests
  --skip-build      Skip frontend build
  --skip-migrations Skip migration filename/rollback validation
  -h, --help        Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      RUN_AUDIT=true
      RUN_E2E=true
      RUN_WRANGLER=true
      RUN_WEB_TESTS=true
      shift
      ;;
    --audit)
      RUN_AUDIT=true
      shift
      ;;
    --e2e)
      RUN_E2E=true
      shift
      ;;
    --web-tests)
      RUN_WEB_TESTS=true
      shift
      ;;
    --workers)
      RUN_WRANGLER=true
      shift
      ;;
    --skip-tests)
      RUN_TESTS=false
      shift
      ;;
    --skip-build)
      RUN_BUILD=false
      shift
      ;;
    --skip-migrations)
      RUN_MIGRATIONS=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found on PATH" >&2
  exit 1
fi

if ! command -v bash >/dev/null 2>&1; then
  echo "bash not found on PATH" >&2
  exit 1
fi

if [[ "$RUN_MIGRATIONS" == true ]]; then
  run_step "Validating migration files" bash scripts/check-migrations.sh
fi

run_step "Linting web" pnpm --filter fisioflow-web lint
run_step "Linting api" pnpm --filter @fisioflow/api lint

run_step "Type-checking web" pnpm --filter fisioflow-web type-check
run_step "Type-checking api" pnpm --filter @fisioflow/api type-check

if [[ "$RUN_TESTS" == true ]]; then
  run_step "Running api unit tests" pnpm --filter @fisioflow/api test:unit
  if [[ "$RUN_WEB_TESTS" == true ]]; then
    run_step "Running web unit tests" pnpm --filter fisioflow-web test:unit
  else
    warn "Skipping web unit tests by default. Use --web-tests or --all to include them."
  fi
fi

if [[ "$RUN_BUILD" == true ]]; then
  run_step "Building web" pnpm --filter fisioflow-web build
fi

if [[ "$RUN_AUDIT" == true ]]; then
  run_step "Running dependency audit" pnpm audit --audit-level high
fi

if [[ "$RUN_WRANGLER" == true ]]; then
  log "Running wrangler dry-run for apps/api"
  (
    cd apps/api
    pnpm exec wrangler deploy --dry-run --env production
  )
  success "Wrangler dry-run for apps/api"
fi

if [[ "$RUN_E2E" == true ]]; then
  if [[ -z "${TEST_BASE_URL:-}" ]]; then
    warn "TEST_BASE_URL is not set. Using local default http://127.0.0.1:5173"
  fi
  run_step "Running Playwright smoke tests" pnpm --filter fisioflow-web test:e2e:ci --grep "@smoke"
fi

success "Predeploy checks complete"
