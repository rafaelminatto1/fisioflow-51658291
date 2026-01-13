# Vercel Free Integrations - Implementation Guide

This document outlines the free Vercel Marketplace integrations implemented in FisioFlow.

## Overview

FisioFlow now leverages several free Vercel integrations to provide enterprise-grade features at zero cost:

| Integration | Free Tier | Benefit | Status |
|-------------|-----------|---------|--------|
| **Vercel AI Gateway** | $5/month credit | Unified AI routing | ✅ Implemented |
| **Statsig** | Unlimited flags + 1M events | Feature flags + analytics | ✅ Implemented |
| **GitHub Issues** | Free | Comments → Issues | 🔄 To configure |
| **Slack** | Free | Deployment notifications | 🔄 To configure |

---

## 1. Vercel AI Gateway

### Benefits
- **$5 free credit/month** for AI usage
- Single endpoint for OpenAI, Google Gemini, Grok, Anthropic
- Automatic fallback between providers
- Built-in caching and rate limiting
- Usage analytics

### Implementation

**Files created:**
- [`src/lib/ai/gateway.ts`](src/lib/ai/gateway.ts) - Main AI Gateway service

**Usage example:**

```typescript
import { AIGateway } from '@/lib/ai/gateway';

// Generate clinical analysis using free Gemini Flash
const response = await AIGateway.clinical.generateAnalysis(
  patientData,
  history
);

// Chat with automatic fallback
const chatResponse = await AIGateway.chat(
  "How do I treat shoulder impingement?"
);
```

**Configuration (.env):**
```bash
VERCEL_AI_GATEWAY_URL=https://gateway.vercel.sh/api/v1
VERCEL_AI_GATEWAY_KEY=your-key
OPENAI_API_KEY=your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key
XAI_API_KEY=your-grok-key
```

### Cost Savings

| Provider | Before (GPT-4o) | After (Gemini Flash) | Savings |
|----------|-----------------|---------------------|---------|
| Clinical analysis | ~$0.15/call | **FREE** | 100% |
| Chat messages | ~$0.01/message | **FREE** | 100% |
| Exercise suggestions | ~$0.05/call | **FREE** | 100% |

---

## 2. Statsig (Feature Flags & Analytics)

### Benefits
- **Unlimited feature flags** (vs LaunchDarkly's $40k+/year)
- **1M events/month free** (analytics included)
- A/B testing built-in
- Dynamic configs without redeployment

### Implementation

**Files created:**
- [`src/lib/featureFlags/statsig.ts`](src/lib/featureFlags/statsig.ts) - Statsig service
- [`src/lib/featureFlags/hooks.tsx`](src/lib/featureFlags/hooks.tsx) - React hooks

**Usage example:**

```tsx
import { FeatureFlagProvider, useFeatureFlag } from '@/lib/featureFlags/hooks';

// Wrap your app
function App() {
  return (
    <FeatureFlagProvider user={{ userID: 'user-123' }}>
      <Dashboard />
    </FeatureFlagProvider>
  );
}

// Use in components
function Dashboard() {
  const { enabled } = useFeatureFlag('new_dashboard');

  if (!enabled) return <OldDashboard />;
  return <NewDashboard />;
}
```

**Replacing environment variables:**

| Before (.env) | After (Statsig) |
|---------------|-----------------|
| `VITE_FEATURE_NEW_DASHBOARD=true` | Gate: `new_dashboard` |
| `VITE_FEATURE_AI_CHATBOT=true` | Gate: `ai_chatbot` |
| `VITE_FEATURE_MAINTENANCE_MODE=false` | Gate: `maintenance_mode` |

### Available Feature Flags

```typescript
// Dashboard
new_dashboard
dashboard_analytics_v2

// AI Features
ai_transcription
ai_chatbot
ai_exercise_suggestions
ai_clinsight_insights

// Clinical Features
digital_prescription
pain_map_v2
soap_records_v2
exercise_library_v2

// Analytics
advanced_analytics
patient_reports_v2
performance_metrics

// Integration
whatsapp_notifications
google_calendar_sync
email_reminders

// System
maintenance_mode
beta_features
dark_mode
```

### Analytics Events

```typescript
import { useAnalytics } from '@/lib/featureFlags/hooks';

function MyComponent() {
  const { Analytics } = useAnalytics();

  const handleAppointmentBooked = () => {
    Analytics.appointmentCreated('apt-123', 'therapist-456');
  };
}
```

---

## 3. GitHub Issues Integration (Vercel Native)

### Benefits
- Convert preview deployment comments to GitHub issues
- Track feedback directly in your workflow
- Free with Vercel account

### Setup Instructions

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Integrations
3. Add **GitHub Issues** integration
4. Configure:
   - Repository owner
   - Repository name
   - Label prefix (optional)

**Usage:**
When viewing a preview deployment, comment `@vercel create issue` to convert the conversation to a GitHub issue.

---

## 4. Slack Integration (Vercel Native)

### Benefits
- Real-time deployment notifications
- Error alerts in Slack channels
- Free with Vercel account

### Setup Instructions

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Integrations
3. Add **Slack** integration
4. Configure notifications:
   - Deployment success
   - Deployment failure
   - Deployment comments
   - Error rates

**Configuration (.env):**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_DEPLOYMENT_CHANNEL=#deployments
SLACK_ERROR_CHANNEL=#errors
```

---

## Migration Guide

### Step 1: Install Dependencies

```bash
pnpm add statsig-react statsig-node
```

### Step 2: Configure Environment Variables

Copy the new variables from `.env.example` to your `.env`:

```bash
# AI Gateway
VERCEL_AI_GATEWAY_KEY=your-key

# Statsig
NEXT_PUBLIC_STATSIG_CLIENT_KEY=your-key
```

### Step 3: Update AI Service Calls

Replace direct OpenAI/Gemini calls:

```typescript
// Before
import OpenAI from 'openai';
const openai = new OpenAI();

// After
import { AIGateway } from '@/lib/ai/gateway';
const response = await AIGateway.generate(prompt);
```

### Step 4: Add Feature Flag Provider

Wrap your app root component:

```tsx
// src/App.tsx
import { FeatureFlagProvider } from '@/lib/featureFlags/hooks';

function App() {
  return (
    <FeatureFlagProvider user={{ userID: currentUser.id }}>
      {/* existing app content */}
    </FeatureFlagProvider>
  );
}
```

---

## Comparison: Before vs After

| Feature | Before | After | Savings |
|---------|--------|-------|---------|
| Feature Flags | Environment vars (requires redeploy) | Statsig (dynamic) | ~$40,000/year vs LaunchDarkly |
| AI Routing | Direct API calls | Gateway with $5 credit | $5/month + optimization |
| Analytics | Basic | 1M events/month | ~$100/month |
| Error Tracking | Sentry only | + Slack notifications | Faster response time |

---

## Getting Started

### 1. Get Statsig Keys

1. Sign up at [statsig.com](https://www.statsig.com)
2. Create a new project
3. Copy **Client SDK Key** (for frontend)
4. Copy **Server Secret** (for backend)

### 2. Get Vercel AI Gateway Key

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Settings → AI Gateway
3. Get your Gateway key

### 3. Configure Integrations

1. Install the integration from [Vercel Marketplace](https://vercel.com/marketplace)
2. Follow the setup wizard
3. Add environment variables to `.env`

---

## Troubleshooting

### Statsig not initializing

```typescript
// Check if SDK key is set
console.log('Statsig key:', process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY);

// Check initialization status
import { StatsigService } from '@/lib/featureFlags/statsig';
console.log('Initialized:', StatsigService.isInitialized());
```

### AI Gateway returning errors

```typescript
// Test individual providers
import { AIGateway } from '@/lib/ai/gateway';

const health = await AIGateway.health();
console.log('Provider health:', health);
```

### Feature flags not updating

1. Check Statsig dashboard for gate status
2. Verify user ID matches
3. Check browser console for errors
4. Try hard refresh (Cmd+Shift+R)

---

## Resources

- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [Statsig Documentation](https://docs.statsig.com)
- [Vercel Marketplace](https://vercel.com/marketplace)
- [Vercel Integrations](https://vercel.com/docs/integrations)
