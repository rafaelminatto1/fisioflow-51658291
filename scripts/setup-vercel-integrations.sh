#!/bin/bash

# FisioFlow - Vercel Free Integrations Setup Script
# This script helps configure free Vercel integrations
# Usage: ./scripts/setup-vercel-integrations.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  FisioFlow - Vercel Integrations Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}✗ Vercel CLI not found${NC}"
    echo "Install it first: npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✓ Vercel CLI found$(vercel --version)${NC}"
echo ""

# Check if project is linked
PROJECT_INFO=$(vercel project ls --yes 2>&1 || echo "")
if [[ $PROJECT_INFO == *"fisioflow"* ]]; then
    echo -e "${GREEN}✓ Project already linked to Vercel${NC}"
else
    echo -e "${YELLOW}! Linking project to Vercel...${NC}"
    vercel link --yes
fi
echo ""

# ============================================================================
# 1. STATSIG SETUP
# ============================================================================
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}  1. Statsig Setup (Feature Flags)${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "Statsig provides:"
echo "  • Unlimited feature flags (FREE)"
echo "  • 1M events/month (FREE)"
echo "  • A/B testing included"
echo ""
echo -e "${YELLOW}Steps to configure:${NC}"
echo "  1. Create account: https://www.statsig.com/signup"
echo "  2. Create a new project called 'fisioflow'"
echo "  3. Copy your Server Secret Key"
echo "  4. Copy your Client SDK Key"
echo ""
echo -e "${YELLOW}Add to your .env:${NC}"
echo "  NEXT_PUBLIC_STATSIG_CLIENT_KEY=your-key-here"
echo "  STATSIG_SERVER_SECRET=your-secret-here"
echo ""
read -p "Press Enter once you have your Statsig keys..."

# ============================================================================
# 2. VERCEL AI GATEWAY SETUP
# ============================================================================
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}  2. Vercel AI Gateway Setup${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "AI Gateway provides:"
echo "  • \$5/month free credit for AI"
echo "  • Unified routing for OpenAI, Gemini, Grok, etc."
echo "  • Automatic fallback between providers"
echo ""
echo -e "${YELLOW}Steps to configure:${NC}"
echo "  1. Open: https://vercel.com/dashboard"
echo "  2. Go to: Settings → AI Gateway"
echo "  3. Add your provider API keys:"
echo "     - OpenAI API Key"
echo "     - Google AI API Key (for Gemini)"
echo "     - xAI API Key (for Grok)"
echo "  4. Create an AI Gateway API Key"
echo ""
echo -e "${YELLOW}Add to your .env:${NC}"
echo "  VERCEL_AI_GATEWAY_KEY=your-gateway-key"
echo "  OPENAI_API_KEY=your-openai-key"
echo "  GOOGLE_GENERATIVE_AI_API_KEY=your-google-key"
echo "  XAI_API_KEY=your-xai-key"
echo ""

# ============================================================================
# 3. GITHUB ISSUES INTEGRATION
# ============================================================================
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}  3. GitHub Issues Integration${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "This integration allows converting preview deployment"
echo "comments into GitHub issues automatically."
echo ""
echo -e "${YELLOW}Setup via Vercel Dashboard:${NC}"
echo "  1. Open: https://vercel.com/dashboard"
echo "  2. Select your project → Integrations"
echo "  3. Add 'GitHub Issues' integration"
echo "  4. Configure repository and labels"
echo ""

# ============================================================================
# 4. SLACK INTEGRATION
# ============================================================================
echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}  4. Slack Integration${NC}"
echo -e "${BLUE}----------------------------------------${NC}"
echo ""
echo "Get deployment notifications in Slack channels."
echo ""
echo -e "${YELLOW}Setup via Vercel Dashboard:${NC}"
echo "  1. Open: https://vercel.com/dashboard"
echo "  2. Select your project → Integrations"
echo "  3. Add 'Slack' integration"
echo "  4. Configure webhook URL and channels"
echo ""
echo -e "${YELLOW}Or create a Slack Incoming Webhook:${NC}"
echo "  1. Go to: https://api.slack.com/messaging/webhooks"
echo "  2. Create webhook to your channel"
echo "  3. Copy webhook URL"
echo "  4. Add to .env:"
echo "     SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Setup Complete! Next Steps:${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "1. Install dependencies (if not done):"
echo "   ${YELLOW}pnpm add statsig-react statsig-node${NC}"
echo ""
echo "2. Add environment variables to your .env file"
echo "   (Copy from .env.example and fill in your values)"
echo ""
echo "3. Restart your development server:"
echo "   ${YELLOW}pnpm dev${NC}"
echo ""
echo "4. Update your root component (src/App.tsx):"
echo ""
echo -e "${BLUE}import { FeatureFlagProvider } from '@/lib/featureFlags';${NC}"
echo ""
echo -e "${BLUE}function App() {${NC}"
echo -e "${BLUE}  return (${NC}"
echo -e "${BLUE}    <FeatureFlagProvider user={{ userID: currentUser?.id }}>${NC}"
echo -e "${BLUE}      {/* existing app content */}${NC}"
echo -e "${BLUE}    </FeatureFlagProvider>${NC}"
echo -e "${BLUE}  );${NC}"
echo -e "${BLUE}}${NC}"
echo ""
echo "5. Use feature flags in components:"
echo ""
echo -e "${BLUE}import { useFeatureFlag } from '@/lib/featureFlags';${NC}"
echo ""
echo -e "${BLUE}function Dashboard() {${NC}"
echo -e "${BLUE}  const { enabled } = useFeatureFlag('new_dashboard');${NC}"
echo -e "${BLUE}  return enabled ? <NewDashboard /> : <OldDashboard />;${NC}"
echo -e "${BLUE}}${NC}"
echo ""
echo "6. Use AI Gateway in services:"
echo ""
echo -e "${BLUE}import { AIGateway } from '@/lib/ai/gateway';${NC}"
echo ""
echo -e "${BLUE}const response = await AIGateway.generate(prompt);${NC}"
echo ""
echo ""
echo -e "${GREEN}Documentation: docs/VERCEL_FREE_INTEGRATIONS.md${NC}"
echo ""
