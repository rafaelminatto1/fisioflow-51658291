#!/usr/bin/env bash
# =============================================================================
# scripts/mobile-build.sh — FisioFlow Patient App: build + submit para stores
#
# Uso:
#   bash scripts/mobile-build.sh build:ios        # Build iOS produção
#   bash scripts/mobile-build.sh build:android    # Build Android produção
#   bash scripts/mobile-build.sh build:all        # Ambos em paralelo
#   bash scripts/mobile-build.sh submit:ios       # Submit para TestFlight
#   bash scripts/mobile-build.sh submit:android   # Submit para Google Play
#   bash scripts/mobile-build.sh release          # Build + submit tudo
# =============================================================================

set -euo pipefail

APP_DIR="apps/patient-app"
PROFILE="production"

log()  { echo -e "\033[0;36m[mobile]\033[0m $*"; }
ok()   { echo -e "\033[0;32m[mobile ✓]\033[0m $*"; }
fail() { echo -e "\033[0;31m[mobile ✗]\033[0m $*"; exit 1; }

check_eas() {
  if ! command -v eas &>/dev/null; then
    log "EAS CLI não encontrado. Instalando..."
    npm install -g eas-cli
  fi
  eas whoami 2>/dev/null || fail "Não autenticado no EAS. Execute: eas login"
}

build_ios() {
  log "Building iOS ($PROFILE)..."
  pnpm --dir "$APP_DIR" exec eas build \
    --platform ios \
    --profile "$PROFILE" \
    --non-interactive
  ok "iOS build enfileirado no EAS."
}

build_android() {
  log "Building Android ($PROFILE)..."
  pnpm --dir "$APP_DIR" exec eas build \
    --platform android \
    --profile "$PROFILE" \
    --non-interactive
  ok "Android build enfileirado no EAS."
}

submit_ios() {
  log "Submetendo iOS para TestFlight / App Store Connect..."
  # ascAppId e appleTeamId já configurados em eas.json
  pnpm --dir "$APP_DIR" exec eas submit \
    --platform ios \
    --profile "$PROFILE" \
    --non-interactive
  ok "iOS submetido. Acesse https://appstoreconnect.apple.com para publicar."
}

submit_android() {
  log "Submetendo Android para Google Play Console (Internal Testing)..."
  pnpm --dir "$APP_DIR" exec eas submit \
    --platform android \
    --profile "$PROFILE" \
    --non-interactive
  ok "Android submetido. Acesse https://play.google.com/console para promover."
}

case "${1:-help}" in
  build:ios)     check_eas; build_ios ;;
  build:android) check_eas; build_android ;;
  build:all)     check_eas; build_ios & build_android & wait ;;
  submit:ios)    check_eas; submit_ios ;;
  submit:android) check_eas; submit_android ;;
  release)
    check_eas
    log "=== RELEASE COMPLETO: build + submit iOS + Android ==="
    build_ios
    build_android
    submit_ios
    submit_android
    ok "Release completo! Verifique App Store Connect e Play Console."
    ;;
  *)
    echo "Uso: bash scripts/mobile-build.sh [build:ios|build:android|build:all|submit:ios|submit:android|release]"
    ;;
esac
