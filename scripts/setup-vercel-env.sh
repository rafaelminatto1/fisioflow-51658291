#!/bin/bash

# Setup Vercel Environment Variables for Inngest Integration
# Execute: bash ./scripts/setup-vercel-env.sh

set -e

echo "🔧 Setting up Vercel environment variables..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "Adding environment variables to Vercel..."
echo ""

# Inngest Keys
echo "📦 Adding INNGEST_EVENT_KEY..."
vercel env add INNGEST_EVENT_KEY production <<EOF
***REMOVED***
y
EOF

echo "📦 Adding INNGEST_SIGNING_KEY..."
vercel env add INNGEST_SIGNING_KEY production <<EOF
***REMOVED***
y
EOF

# Resend API Key
echo "📧 Adding RESEND_API_KEY..."
vercel env rm RESEND_API_KEY production --yes 2>/dev/null || true
vercel env add RESEND_API_KEY production <<EOF
***REMOVED***
y
EOF

# Evolution API (placeholder - configure with your actual URL)
echo "💬 Adding WHATSAPP_API_URL (placeholder - update with your Evolution API URL)..."
vercel env add WHATSAPP_API_URL production <<EOF
https://your-evolution-api-url.com
y
EOF

echo "🔑 Adding WHATSAPP_API_KEY (placeholder - update with your actual key)..."
vercel env add WHATSAPP_API_KEY production <<EOF
your-evolution-api-key-here
y
EOF

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "⚠️  IMPORTANT: Update these variables with your actual values:"
echo "   - WHATSAPP_API_URL"
echo "   - WHATSAPP_API_KEY"
echo ""
echo "To update them:"
echo "   vercel env rm WHATSAPP_API_URL production"
echo "   vercel env add WHATSAPP_API_URL production"
echo ""
