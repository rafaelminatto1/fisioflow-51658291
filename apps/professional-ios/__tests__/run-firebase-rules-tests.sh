#!/bin/bash

# Firebase Security Rules Test Runner
# This script starts the Firebase emulators and runs the security rules tests

set -e

echo "🔥 Firebase Security Rules Test Runner"
echo "======================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✓ Firebase CLI found${NC}"

# Check if emulators are already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Firestore emulator already running on port 8080${NC}"
    EMULATOR_RUNNING=true
else
    EMULATOR_RUNNING=false
fi

# Start emulators if not running
if [ "$EMULATOR_RUNNING" = false ]; then
    echo ""
    echo "🚀 Starting Firebase emulators..."
    
    # Start emulators in background
    firebase emulators:start --only firestore,storage --project fisioflow-test > /tmp/firebase-emulator.log 2>&1 &
    EMULATOR_PID=$!
    
    # Wait for emulators to be ready
    echo "⏳ Waiting for emulators to start..."
    sleep 5
    
    # Check if emulators started successfully
    if ! lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start emulators${NC}"
        echo "Check logs at: /tmp/firebase-emulator.log"
        cat /tmp/firebase-emulator.log
        exit 1
    fi
    
    echo -e "${GREEN}✓ Emulators started successfully${NC}"
    echo "  - Firestore: http://localhost:8080"
    echo "  - Storage: http://localhost:9199"
    echo ""
else
    echo -e "${GREEN}✓ Using existing emulator instance${NC}"
    echo ""
fi

# Run the tests
echo "🧪 Running security rules tests..."
echo ""

cd "$(dirname "$0")/../../.." # Go to project root

if pnpm test apps/professional-ios/__tests__/firebase-security-rules.test.ts; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    TEST_EXIT_CODE=0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    TEST_EXIT_CODE=1
fi

# Stop emulators if we started them
if [ "$EMULATOR_RUNNING" = false ]; then
    echo ""
    echo "🛑 Stopping emulators..."
    kill $EMULATOR_PID 2>/dev/null || true
    
    # Wait for process to stop
    sleep 2
    
    # Force kill if still running
    if ps -p $EMULATOR_PID > /dev/null 2>&1; then
        kill -9 $EMULATOR_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Emulators stopped${NC}"
fi

echo ""
echo "======================================="

exit $TEST_EXIT_CODE
