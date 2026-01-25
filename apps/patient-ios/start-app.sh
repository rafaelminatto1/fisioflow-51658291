#!/bin/bash
# Improved script to start Expo with tunnel and cache clearing
echo "🚀 Starting Expo for Patient iOS..."

# Clean up possible port conflicts
fuser -k 8081/tcp 2>/dev/null
fuser -k 8082/tcp 2>/dev/null

# Clear metro cache to ensure clean bundle
npm run dev
