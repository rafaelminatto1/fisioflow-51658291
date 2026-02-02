#!/usr/bin/env bash
# Deploy das functions que falharam por cota de CPU, uma por vez com intervalo.
# Uso: ./scripts/deploy-failed-functions.sh

set -e
# Restantes que falharam por cota CPU (listTreatmentSessions, createAdminUser, confirmUpload já deployadas)
FAILED_FUNCTIONS=(
  apiRouter
  birthdays
  emailWebhook
  dataIntegrity
  processNotificationQueue
  importPatients
  scheduledDailyReport
  cleanup
  onAppointmentCreatedWorkflow
)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "Deploying ${#FAILED_FUNCTIONS[@]} functions one by one (60s between each)..."
for fn in "${FAILED_FUNCTIONS[@]}"; do
  echo "--- Deploying function: $fn ---"
  if firebase deploy --only "functions:$fn"; then
    echo "OK: $fn"
  else
    echo "FAIL: $fn (will continue with next)"
  fi
  if [ "$fn" != "${FAILED_FUNCTIONS[-1]}" ]; then
    echo "Waiting 60s for quota/readiness..."
    sleep 60
  fi
done
echo "Done."
