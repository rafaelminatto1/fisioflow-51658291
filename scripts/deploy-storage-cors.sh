#!/bin/bash
# Script to deploy CORS configuration to Firebase Storage
# Usage: ./scripts/deploy-storage-cors.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Deploying CORS configuration to Firebase Storage...${NC}"

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo -e "${RED}Error: gsutil is not installed${NC}"
    echo "Please install gsutil:"
    echo "  - On macOS: brew install gsutil"
    echo "  - On Linux: pip install gsutil"
    echo "  - Or use: gcloud components install gsutil"
    exit 1
fi

# Check if CORS config file exists
CORS_CONFIG="$(dirname "$0")/../storage-cors.json"
if [ ! -f "$CORS_CONFIG" ]; then
    echo -e "${RED}Error: CORS config file not found at $CORS_CONFIG${NC}"
    exit 1
fi

# Get the bucket name from environment or use default
BUCKET_NAME=${FIREBASE_STORAGE_BUCKET:-"fisioflow-migration.firebasestorage.app"}

echo -e "${YELLOW}Bucket: gs://$BUCKET_NAME${NC}"
echo -e "${YELLOW}CORS Config:${NC}"
cat "$CORS_CONFIG"
echo ""

# Deploy CORS configuration
echo -e "${YELLOW}Setting CORS configuration...${NC}"
gsutil cors set "$CORS_CONFIG" "gs://$BUCKET_NAME"

# Verify the configuration
echo -e "${YELLOW}Verifying CORS configuration...${NC}"
gsutil cors get "gs://$BUCKET_NAME"

echo -e "${GREEN}✓ CORS configuration deployed successfully!${NC}"
echo -e "${YELLOW}Note: It may take a few minutes for the changes to take effect.${NC}"
