#!/bin/bash

# FisioFlow Asset Generator
# This script generates placeholder assets for both iOS apps

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}FisioFlow Asset Generator${NC}"
echo "================================"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${YELLOW}Warning: ImageMagick not found${NC}"
    echo "Install with: sudo apt-get install imagemagick"
    echo "Or use the online options mentioned in README.md"
    exit 1
fi

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATIENT_DIR="$BASE_DIR/../patient-ios/assets"
PROFESSIONAL_DIR="$BASE_DIR/../professional-ios/assets"

# Create directories if they don't exist
mkdir -p "$PATIENT_DIR"
mkdir -p "$PROFESSIONAL_DIR"

# Generate Patient App Assets (Blue - #3B82F6)
echo -e "${GREEN}Generating Patient App assets...${NC}"

# App Icon (1024x1024)
convert -size 1024x1024 xc:#3B82F6 \
    -fill white \
    -gravity center \
    -pointsize 500 \
    -annotate 0 "F" \
    "$PATIENT_DIR/icon.png"
echo "  ✓ icon.png (1024x1024)"

# Splash Screen (1284x2778)
convert -size 1284x2778 xc:#3B82F6 \
    -fill white \
    -gravity center \
    -pointsize 120 \
    -annotate +0+0 "FisioFlow" \
    -pointsize 60 \
    -annotate +0+200 "Pacientes" \
    "$PATIENT_DIR/splash.png"
echo "  ✓ splash.png (1284x2778)"

# Notification Icon (96x96)
convert -size 96x96 xc:none \
    -fill white \
    -draw "circle 48,48 48,15" \
    -fill #3B82F6 \
    -gravity center \
    -pointsize 50 \
    -annotate 0 "F" \
    "$PATIENT_DIR/notification-icon.png"
echo "  ✓ notification-icon.png (96x96)"

# Generate Professional App Assets (Green - #10B981)
echo -e "${GREEN}Generating Professional App assets...${NC}"

# App Icon (1024x1024)
convert -size 1024x1024 xc:#10B981 \
    -fill white \
    -gravity center \
    -pointsize 500 \
    -annotate 0 "F" \
    "$PROFESSIONAL_DIR/icon.png"
echo "  ✓ icon.png (1024x1024)"

# Splash Screen (1284x2778)
convert -size 1284x2778 xc:#10B981 \
    -fill white \
    -gravity center \
    -pointsize 120 \
    -annotate +0+0 "FisioFlow" \
    -pointsize 60 \
    -annotate +0+200 "Profissionais" \
    "$PROFESSIONAL_DIR/splash.png"
echo "  ✓ splash.png (1284x2778)"

# Notification Icon (96x96)
convert -size 96x96 xc:none \
    -fill white \
    -draw "circle 48,48 48,15" \
    -fill #10B981 \
    -gravity center \
    -pointsize 50 \
    -annotate 0 "F" \
    "$PROFESSIONAL_DIR/notification-icon.png"
echo "  ✓ notification-icon.png (96x96)"

# Generate adaptive icon (Android)
echo -e "${GREEN}Generating Android adaptive icons...${NC}"

# Patient adaptive icon
convert -size 1024x1024 xc:#3B82F6 \
    -fill white \
    -gravity center \
    -pointsize 500 \
    -annotate 0 "F" \
    "$PATIENT_DIR/adaptive-icon.png"
echo "  ✓ adaptive-icon.png (Patient)"

# Professional adaptive icon
convert -size 1024x1024 xc:#10B981 \
    -fill white \
    -gravity center \
    -pointsize 500 \
    -annotate 0 "F" \
    "$PROFESSIONAL_DIR/adaptive-icon.png"
echo "  ✓ adaptive-icon.png (Professional)"

# Generate favicon
echo -e "${GREEN}Generating favicons...${NC}"

convert -size 48x48 xc:#3B82F6 \
    -fill white \
    -gravity center \
    -pointsize 30 \
    -annotate 0 "F" \
    "$PATIENT_DIR/favicon.png"
echo "  ✓ favicon.png (Patient)"

convert -size 48x48 xc:#10B981 \
    -fill white \
    -gravity center \
    -pointsize 30 \
    -annotate 0 "F" \
    "$PROFESSIONAL_DIR/favicon.png"
echo "  ✓ favicon.png (Professional)"

echo ""
echo -e "${GREEN}All assets generated successfully!${NC}"
echo ""
echo "Generated files:"
echo "  Patient App: $PATIENT_DIR"
ls -la "$PATIENT_DIR"
echo ""
echo "  Professional App: $PROFESSIONAL_DIR"
ls -la "$PROFESSIONAL_DIR"
echo ""
echo -e "${YELLOW}Note: These are placeholder assets for development.${NC}"
echo "For production, replace with professionally designed icons."
echo ""
echo "To use these assets:"
echo "  1. Verify they appear correctly with: npx expo start"
echo "  2. Test on device/simulator"
echo "  3. Build with EAS for iOS TestFlight"
