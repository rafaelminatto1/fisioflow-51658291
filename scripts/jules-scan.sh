#!/bin/bash

# Jules AI Project Scan Script
# Automated architectural analysis for FisioFlow core components

# Target files for analysis
TARGETS=(
  "src/services/ai/analysisEngine.ts"
  "src/services/ai/poseAnalytics.ts"
  "src/services/offlineSync.ts"
  "src/services/appointmentService.ts"
  "src/components/crm/LeadScoring.tsx"
)

# Output directory
REPORT_DIR="packages/jules/reports"
mkdir -p "$REPORT_DIR"

echo "🚀 Starting Jules AI Architectural Scan..."
echo "----------------------------------------"

for FILE in "${TARGETS[@]}"; do
  if [ -f "$FILE" ]; then
    BASENAME=$(basename "$FILE")
    REPORT_FILE="$REPORT_DIR/${BASENAME}_review.txt"
    
    echo "🔍 Analyzing $FILE..."
    
    # Run jules analyze and capture to report file
    # Note: We use tsx directly to bypass any npm warning noise
    npx tsx packages/jules/src/cli.ts analyze "$FILE" > "$REPORT_FILE" 2>&1
    
    if grep -q -e "--- Review ---" "$REPORT_FILE"; then
      echo "✅ Review captured: $REPORT_FILE"
    else
      echo "⚠️  Analysis failed or returned empty for $FILE. Check $REPORT_FILE for details."
    fi
  else
    echo "❌ File not found: $FILE"
  fi
done

echo "----------------------------------------"
echo "🏁 Scan complete. Reports are in $REPORT_DIR"
