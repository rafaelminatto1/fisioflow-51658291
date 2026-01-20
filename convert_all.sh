#!/bin/bash
# Enable error handling (removed set -e to allow continuing on failure)

AVIFENC="/home/rafael/Downloads/lightroom-download-2026-01-17T15_33_36Z/libavif/build/avifenc"

if [ ! -f "$AVIFENC" ]; then
    echo "Error: avifenc not found at $AVIFENC"
    exit 1
fi

# Find all relevant images
find . -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.vercel/*" | while read img; do
    dir=$(dirname "$img")
    base=$(basename "$img")
    filename="${base%.*}"
    extension="${base##*.}"
    output="$dir/$filename.avif"
    
    # Skip if output already exists (optional, but good for resuming)
    if [ -f "$output" ]; then
        echo "Skipping $img, $output already exists."
        continue
    fi

    echo "Converting $img to $output..."
    if "$AVIFENC" "$img" "$output"; then
        echo "Successfully converted $img"
    else
        echo "Failed to convert $img"
    fi
done

echo "Conversion finished."
