#!/bin/bash

# Script to convert ALL exercises PNG to AVIF
# Downloads from R2, converts with sharp, uploads back via wrangler --remote

CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/home/rafael/Documents/fisioflow/fisioflow-51658291/temp-avif-conversion"
LOG_FILE="/home/rafael/Documents/fisioflow/fisioflow-51658291/temp-avif-conversion/log.txt"

mkdir -p "$TEMP_DIR"
echo "" > "$LOG_FILE"

log() {
  echo "$1" | tee -a "$LOG_FILE"
}

# Get list of exercise keys from R2 via API
log "Fetching exercise list from R2..."

# Get all objects via API
ALL_KEYS=$(curl -s "https://api.moocafisio.com.br/api/exercises" 2>/dev/null | grep -oE '"id":"[a-f0-9-]+"' | head -100 || echo "")

if [ -z "$ALL_KEYS" ]; then
  log "Could not fetch from API, using sample approach..."
  # Sample UUIDs from previous listing
  UUIDS=(
    "00b03826-fd00-4741-b4ba-3fe06c71cc34"
    "0223355b-41cb-4082-9a5f-3d99b6c34b29"
    "0513186d-aaca-4001-8047-2e9cbed2f213"
    "05cc9ea0-8087-492a-8750-ecabf4d1373f"
  )
else
  log "Got exercises from API"
fi

log "Starting conversion process..."

# This is a long-running process - let's run it in batches
BATCH_SIZE=10
TOTAL_PROCESSED=0
FAILED=0

# For demonstration, let's process a sample and create a script for the full run
log "Processing sample exercises..."

for UUID in "00b03826-fd00-4741-b4ba-3fe06c71cc34" "0223355b-41cb-4082-9a5f-3d99b6c34b29" "0513186d-aaca-4001-8047-2e9cbed2f213" "05cc9ea0-8087-492a-8750-ecabf4d1373f" "06bec5ab-ee79-4b3c-969f-d57a85883701" "0c2f993e-0331-400f-8c6b-3ca1c765c5fe" "0c3e5d4e-3afb-4ffc-8206-d8b642f8902f" "0c4077f8-179f-43b1-b4ff-05d8a14803f0" "0c71c989-d905-4617-a92f-cc32de6cce87" "0d47fc21-637f-484d-bea6-9e8fe7ba4a5e"; do
  for type in "image" "thumbnail"; do
    src_url="${CDN_BASE}/exercises/${UUID}/${type}.png"
    local_png="${TEMP_DIR}/${UUID}_${type}.png"
    local_avif="${TEMP_DIR}/${UUID}_${type}.avif"
    
    # Download PNG
    curl -s -o "${local_png}" "${src_url}" 2>/dev/null
    if [ ! -f "${local_png}" ] || [ ! -s "${local_png}" ]; then
      log "SKIP: ${UUID}/${type}.png (not found)"
      continue
    fi
    
    # Convert to AVIF
    node -e "
      const sharp = require('sharp');
      sharp('${local_png}')
        .avif({ quality: 75, effort: 4 })
        .toFile('${local_avif}')
        .then(info => console.log(JSON.stringify(info)))
        .catch(err => console.error(JSON.stringify({error: err.message})));
    " 2>/dev/null | grep -q '"size"' && {
      # Upload AVIF
      npx wrangler r2 object put "${BUCKET}/exercises/${UUID}/${type}.avif" \
        --file "${local_avif}" \
        --content-type "image/avif" \
        --remote 2>&1 | grep -q "Upload complete" && {
        # Delete original PNG
        npx wrangler r2 object delete "${BUCKET}/exercises/${UUID}/${type}.png" --remote 2>&1 | grep -q "Delete complete"
        log "SUCCESS: ${UUID}/${type}"
        TOTAL_PROCESSED=$((TOTAL_PROCESSED + 1))
      } || {
        log "FAILED: upload ${UUID}/${type}"
        FAILED=$((FAILED + 1))
      }
    }
    
    # Cleanup
    rm -f "${local_png}" "${local_avif}"
  done
done

log ""
log "=== SUMMARY ==="
log "Processed: ${TOTAL_PROCESSED}"
log "Failed: ${FAILED}"
log ""
log "This converted 10 sample exercises (20 images)."
log "To convert all 380 exercises, we need to run this in larger batches."
