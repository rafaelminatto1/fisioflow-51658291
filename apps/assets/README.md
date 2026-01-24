# FisioFlow iOS Assets Guide

This guide explains how to set up app icons, splash screens, and notification icons for both the Patient and Professional iOS apps.

## Required Assets

For each app, you need the following assets:

### 1. App Icon
- **Size**: 1024x1024 pixels (PNG)
- **Location**: `apps/patient-ios/assets/icon.png` or `apps/professional-ios/assets/icon.png`
- **Format**: Square PNG with transparency
- **Design**:
  - Patient App: Blue (#3B82F6) background with white "F" logo
  - Professional App: Green (#10B981) background with white "F" logo

### 2. Splash Screen
- **Size**: 1284x2778 pixels (PNG) - iPhone Pro Max size
- **Location**: `apps/patient-ios/assets/splash.png` or `apps/professional-ios/assets/splash.png`
- **Format**: Centered logo on colored background
- **Design**:
  - Patient App: Blue (#3B82F6) background with white FisioFlow logo
  - Professional App: Green (#10B981) background with white FisioFlow logo

### 3. Notification Icon
- **Size**: 96x96 pixels (PNG)
- **Location**: `apps/patient-ios/assets/notification-icon.png` or `apps/professional-ios/assets/notification-icon.png`
- **Format**: White foreground with transparent background (iOS will add the background)
- **Design**: Simple "F" logo in white

## Asset Generation

### Option 1: Using Expo Router Asset Tool (Recommended)

```bash
# Install the tool globally
npm install -g @expo/vector-icons

# Generate icons from a source image
npx expo-icon-cli@latest generate ./assets/icon-source.png \
  --platforms ios \
  --output ./apps/patient-ios/assets

npx expo-icon-cli@latest generate ./assets/icon-source-professional.png \
  --platforms ios \
  --output ./apps/professional-ios/assets
```

### Option 2: Using ImageMagick

```bash
# Convert SVG to PNG at multiple sizes
# App Icon (1024x1024)
convert -background none -resize 1024x1024 icon.svg icon.png

# Splash (1284x2778)
convert -background "#3B82F6" -resize 1284x2778 splash.svg splash.png

# Notification Icon (96x96)
convert -background none -resize 96x96 notification.svg notification-icon.png
```

### Option 3: Online Tools

1. **AppIconGenerator**: https://appicon.co
   - Upload a 1024x1024 PNG
   - Download the iOS icon set
   - Copy to your project

2. **MakeAppIcon**: https://makeappicon.com
   - Similar to above
   - Generates all required sizes

## Manual Creation with Figma/Sketch

### App Icon Specifications

| Size | Usage |
|------|-------|
| 1024x1024 | App Store (iTunesConnect) |
| 180x180 | iPhone @3x |
| 167x167 | iPad Pro @2x |
| 152x152 | iPad @2x |
| 120x120 | iPhone @2x |
| 87x87 | iPhone @3x (Settings) |
| 80x80 | iPhone @2x (Settings) |
| 76x76 | iPad @1x |
| 60x60 | iPhone @2x (Notification) |
| 58x58 | iPhone @3x (Settings) |
| 40x40 | iPhone @2x (Spotlight) |
| 29x29 | iPhone @2x (Settings) |
| 20x20 | iPhone @2x (Notification) |

### Splash Screen Specifications

| Device | Size |
|--------|------|
| iPhone 14 Pro Max | 1284x2778 |
| iPhone 14 Pro | 1179x2556 |
| iPhone 14 | 1170x2532 |
| iPhone SE (3rd gen) | 750x1334 |

## Current Asset Status

### Patient App (`apps/patient-ios/assets/`)
- [ ] icon.png (1024x1024)
- [ ] splash.png (1284x2778)
- [ ] notification-icon.png (96x96)

### Professional App (`apps/professional-ios/assets/`)
- [ ] icon.png (1024x1024)
- [ ] splash.png (1284x2778)
- [ ] notification-icon.png (96x96)

## Quick Start with Placeholder Assets

For development/testing, you can generate placeholder assets:

```bash
cd apps/patient-ios/assets
# Create a simple blue icon
convert -size 1024x1024 xc:#3B82F6 -fill white -gravity center \
  -pointsize 400 -annotate 0 "F" icon.png

# Create splash
convert -size 1284x2778 xc:#3B82F6 -fill white -gravity center \
  -pointsize 200 -annotate +0+0 "FisioFlow" splash.png

# Create notification icon
convert -size 96x96 xc:none -fill white -draw "circle 48,48 48,10" \
  -fill white -gravity center -pointsize 60 -annotate 0 "F" notification-icon.png
```

## Verification

After adding assets, verify them by running:

```bash
# For patient app
cd apps/patient-ios
npx expo start

# For professional app
cd apps/professional-ios
npx expo start
```

The app should display your custom icon and splash screen.

## EAS Build with Custom Assets

When building with EAS, assets are automatically processed:

```bash
# Development build
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios
```

## Firebase Configuration Files

Don't forget to add:

1. **GoogleService-Info.plist** - Firebase iOS configuration
   - Place in: `apps/patient-ios/` and `apps/professional-ios/`
   - Get from Firebase Console > Project Settings > iOS App

2. **google-services.json** - Firebase Android configuration
   - Place in: `apps/patient-ios/` and `apps/professional-ios/`
   - Get from Firebase Console > Project Settings > Android App

## Next Steps

1. Design your app icons using Figma/Sketch
2. Export as 1024x1024 PNG
3. Use Expo's asset tool to generate all sizes
4. Copy to the appropriate assets folders
5. Test with `expo start`
6. Build with EAS to verify on TestFlight
