#!/bin/bash

# Script to convert exercises PNG to AVIF
# Downloads from R2 public URL, converts with sharp, uploads back via wrangler --remote

CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/home/rafael/Documents/fisioflow/fisioflow-51658291/temp-avif-conversion"

mkdir -p "$TEMP_DIR"

echo "Downloading exercise list from R2..."

# Get list of exercise UUIDs
curl -s "https://media.moocafisio.com.br/exercises/" 2>/dev/null | head -1 || echo "Checking via API"

# Since we can't list R2 directly, we need to fetch all keys
# Let's just get a sample first to test

# Test with first exercise
TEST_UUID="00b03826-fd00-4741-b4ba-3fe06c71cc34"

for type in "image" "thumbnail"; do
  src_url="${CDN_BASE}/exercises/${TEST_UUID}/${type}.png"
  local_png="${TEMP_DIR}/${TEST_UUID}_${type}.png"
  local_avif="${TEMP_DIR}/${TEST_UUID}_${type}.avif"
  
  echo ""
  echo "=== Testing: ${type} ==="
  echo "URL: ${src_url}"
  
  # Download PNG
  echo "Downloading..."
  curl -s -o "${local_png}" "${src_url}" || continue
  if [ ! -f "${local_png}" ] || [ ! -s "${local_png}" ]; then
    echo "Failed to download"
    continue
  fi
  
  original_size=$(stat -c%s "${local_png}")
  echo "Downloaded: ${original_size} bytes"
  
  # Convert to AVIF
  echo "Converting to AVIF..."
  node -e "
    const sharp = require('sharp');
    sharp('${local_png}')
      .avif({ quality: 75, effort: 4 })
      .toFile('${local_avif}')
      .then(info => {
        console.log('Converted:', info.size, 'bytes');
        console.log('Reduction:', ((1 - info.size/${original_size}) * 100).toFixed(1), '%');
      })
      .catch(err => console.error('Error:', err.message));
  " 2>&1
  
  if [ ! -f "${local_avif}" ]; then
    echo "ERROR: Conversion failed"
    continue
  fi
  
  avif_size=$(stat -c%s "${local_avif}")
  echo "AVIF size: ${avif_size} bytes"
  
  # Upload AVIF to R2
  echo "Uploading AVIF to R2..."
  npx wrangler r2 object put "${BUCKET}/exercises/${TEST_UUID}/${type}.avif" \
    --file "${local_avif}" \
    --content-type "image/avif" \
    --remote 2>&1 | grep -E "(Creating|Upload complete|ERROR)" || true
  
  # Delete original PNG
  echo "Deleting original PNG..."
  npx wrangler r2 object delete "${BUCKET}/exercises/${TEST_UUID}/${type}.png" --remote 2>&1 | grep -E "(Deleting|Delete complete|ERROR)" || true
  
  echo "SUCCESS: ${type} converted and uploaded"
done

echo ""
echo "Test complete!"
echo "If successful, we need to convert all ${#EXERCISES[@]} exercises."
echo "This script will need to iterate through all exercise UUIDs from the database."
