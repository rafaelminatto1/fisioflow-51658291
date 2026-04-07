#!/bin/bash

# Script to convert PNG illustrations to WebP
# Downloads from public R2 URLs, converts with sharp, uploads back via wrangler

CDN_BASE="https://media.moocafisio.com.br"
BUCKET="fisioflow-media"
TEMP_DIR="/home/rafael/Documents/fisioflow/fisioflow-51658291/temp-webp-conversion"

mkdir -p "$TEMP_DIR"

# List of PNG illustration files (from clinicalData.ts)
FILES=(
  "myofascial_release_illustration.png"
  "joint_mobilization_illustration.png"
  "tens_therapy_illustration.png"
  "ultrasound_therapy_illustration.png"
  "dry_needling_illustration.png"
  "cryotherapy_illustration.png"
  "lachman_test_illustration.png"
  "anterior_drawer_test_knee.png"
  "phalen_test_illustration.png"
  "neer_test_shoulder_illustration.png"
  "lasegue_test_spine_illustration.png"
  "jobe_test_shoulder_illustration.png"
)

echo "Starting PNG to WebP conversion for ${#FILES[@]} files..."

for file in "${FILES[@]}"; do
  name="${file%.png}"
  src_url="${CDN_BASE}/illustrations/${file}"
  local_png="${TEMP_DIR}/${file}"
  local_webp="${TEMP_DIR}/${name}.webp"
  
  echo ""
  echo "=== Processing: ${file} ==="
  
  # Download PNG
  echo "Downloading from ${src_url}..."
  curl -s -o "${local_png}" "${src_url}"
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to download ${file}"
    continue
  fi
  
  original_size=$(stat -c%s "${local_png}")
  echo "Downloaded: ${original_size} bytes"
  
  # Convert to WebP
  echo "Converting to WebP..."
  npx --yes sharp-cli convert "${local_png}" --output "${local_webp}" --format webp --quality 80 2>/dev/null
  
  # Alternative: use node directly with sharp
  node -e "
    const sharp = require('sharp');
    sharp('${local_png}')
      .webp({ quality: 80, effort: 6 })
      .toFile('${local_webp}')
      .then(info => {
        console.log('Converted:', info.size, 'bytes');
        console.log('Reduction:', ((1 - info.size/${original_size}) * 100).toFixed(1), '%');
      })
      .catch(err => console.error('Error:', err.message));
  " 2>&1
  
  if [ ! -f "${local_webp}" ]; then
    echo "ERROR: Conversion failed for ${file}"
    continue
  fi
  
  webp_size=$(stat -c%s "${local_webp}")
  echo "WebP size: ${webp_size} bytes ($(echo "scale=1; ${webp_size} * 100 / ${original_size}" | bc)% of original)"
  
  # Upload WebP to R2
  echo "Uploading WebP to R2..."
  npx wrangler r2 object put "${BUCKET}/illustrations/${name}.webp" \
    --file "${local_webp}" \
    --content-type "image/webp" 2>&1
  
  if [ $? -eq 0 ]; then
    echo "SUCCESS: Uploaded ${name}.webp"
    
    # Delete original PNG
    echo "Deleting original PNG from R2..."
    npx wrangler r2 object delete "${BUCKET}/illustrations/${file}" 2>&1
    
    if [ $? -eq 0 ]; then
      echo "SUCCESS: Deleted ${file}"
    else
      echo "WARNING: Failed to delete ${file} (manual cleanup needed)"
    fi
  else
    echo "ERROR: Failed to upload ${name}.webp"
  fi
done

echo ""
echo "=== Conversion Complete ==="
echo "Backups saved to: ${TEMP_DIR}"
echo ""
echo "Next step: Update frontend references from .png to .webp"
