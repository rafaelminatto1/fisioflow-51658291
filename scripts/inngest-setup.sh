#!/bin/bash

# Inngest Development Setup Script for FisioFlow
# This script helps set up Inngest for local development

set -e

echo "🚀 Setting up Inngest for FisioFlow..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Check if inngest CLI is installed
if ! command -v inngest &> /dev/null; then
    echo "📦 Installing Inngest CLI globally..."
    npm install -g inngest-cli
    echo "✅ Inngest CLI installed"
else
    echo "✅ Inngest CLI already installed"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please update the INNGEST_* variables in your .env file"
else
    echo "✅ .env file exists"
fi

# Check if INNGEST_DEV is set
if grep -q "INNGEST_DEV=" .env; then
    echo "✅ INNGEST_DEV is configured in .env"
else
    echo ""
    echo "📝 Adding INNGEST_DEV to .env..."
    echo "" >> .env
    echo "# Inngest Development" >> .env
    echo "INNGEST_DEV=http://localhost:8288" >> .env
    echo "✅ INNGEST_DEV added to .env"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Inngest setup complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "To start using Inngest:"
echo ""
echo "1. Start the Inngest dev server in one terminal:"
echo "   $ inngest dev"
echo ""
echo "2. Start your FisioFlow app in another terminal:"
echo "   $ pnpm dev"
echo ""
echo "3. View the Inngest dashboard at:"
echo "   http://localhost:8288"
echo ""
echo "For production, install the Inngest integration from:"
echo "https://vercel.com/marketplace/inngest"
echo ""
