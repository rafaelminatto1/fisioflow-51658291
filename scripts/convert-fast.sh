#!/bin/bash

# Fast conversion - parallel processing

CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/tmp/avif_fast"
mkdir -p "$TEMP_DIR"

UUIDS=(
  "725e7c07-fe79-46fb-99f4-b6fd1738ce82" "73573738-bb4b-43ad-b67a-f78548ad210c"
  "74ad1c8a-c300-419d-b6a0-4f331a98b611" "75ea596d-7506-43fc-b4f7-b86a97ac0583"
  "794029e9-4902-47db-b7e9-7f547467a026" "79739c5b-4d8d-4e20-b064-ee1c1aa4bc5e"
  "79d3afbb-49a6-4957-ae4a-38477cbdf58f" "7a349c3c-6a9b-43fb-bf86-525e5264210a"
  "7c602d5c-bbbb-4ddb-97d0-6ebcc3ddfa20" "7d5a4d7d-9386-450e-91f7-5bfe6e70e12e"
  "7de5e406-fd14-4b51-958d-0c26e9be6eca" "7e21f14a-72e3-4535-9ef9-10392d908432"
  "7fc51511-d748-40e8-8a1d-620bf1781e0a" "81b9bb61-e0b5-4736-88a6-2a635d9a908b"
  "81cadc1c-8ff5-4093-abd1-713f133fb4ca" "81f95733-aa81-4bde-8c4a-25adc832dcbb"
  "831a4893-7d40-417b-8469-633910020002" "8371d239-46d5-45e4-98d4-5c350d76ba9b"
  "851e26fa-08a7-4dfe-848e-408184efb167" "8597c8ee-caca-45cb-8c2d-a3c7bb1f88dc"
  "88c5043c-6ddb-42a6-99b5-96cd3a3ec56b" "89fe1888-aa91-4dbb-9372-64b702e67aa0"
  "8a7ffd62-5075-453c-89e6-057843dcb8e1" "8e3d37be-eb88-4a4a-8891-6fb0ee9f0ac3"
  "92c07ed7-e61c-43c4-8651-08a34ca3e1fe" "952feafb-55e0-4fc6-90b6-1d380bf26bcf"
  "96cc9b30-d14a-4938-b490-4d2775343539" "9723383b-ccdc-4815-a219-8e42d0c87944"
  "9cbff473-4215-4a0e-9fbd-2ddfbed8ddf4" "9cc3f8a7-4e9b-4ad0-82c7-6e4c8e451002"
)

SUCCESS=0
FAILED=0

for UUID in "${UUIDS[@]}"; do
  for type in image thumbnail; do
    src="${CDN_BASE}/exercises/${UUID}/${type}.png"
    dst="${BUCKET}/exercises/${UUID}/${type}.avif"
    
    # Download
    curl -s -o "${TEMP_DIR}/${UUID}_${type}" "$src" 2>/dev/null
    
    # Check if valid image
    if [ ! -s "${TEMP_DIR}/${UUID}_${type}" ] || file "${TEMP_DIR}/${UUID}_${type}" | grep -q HTML; then
      rm -f "${TEMP_DIR}/${UUID}_${type}"
      continue
    fi
    
    # Convert
    node -e "require('sharp')('${TEMP_DIR}/${UUID}_${type}').avif({quality:75,effort:4}).toFile('${TEMP_DIR}/${UUID}_${type}.avif').then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null
    
    if [ -f "${TEMP_DIR}/${UUID}_${type}.avif" ]; then
      npx wrangler r2 object put "$dst" --file "${TEMP_DIR}/${UUID}_${type}.avif" --content-type "image/avif" --remote 2>&1 | grep -q "Upload complete" && {
        npx wrangler r2 object delete "${BUCKET}/exercises/${UUID}/${type}.png" --remote 2>&1 | grep -q "Delete complete"
        SUCCESS=$((SUCCESS + 1))
      }
    fi
    
    rm -f "${TEMP_DIR}/${UUID}_${type}"*
  done
  echo "Processed $UUID - Success: $SUCCESS, Failed: $FAILED"
done

echo "=== FINAL: Success: $SUCCESS, Failed: $FAILED ==="
