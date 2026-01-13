# Setup Guide - Vercel Free Integrations

Follow this guide to configure the free Vercel integrations for FisioFlow.

---

## ✅ Step 1: Run the Setup Script

```bash
./scripts/setup-vercel-integrations.sh
```

This will guide you through the setup process.

---

## ✅ Step 2: Create Statsig Account

1. Go to [statsig.com/signup](https://www.statsig.com/signup)
2. Create a new project named **fisioflow**
3. Get your keys:
   - **Client SDK Key** (for frontend)
   - **Server Secret** (for backend)

### Add to Vercel Environment Variables

Via Vercel Dashboard:
1. Open [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select **fisioflow-51658291** project
3. Go to **Settings → Environment Variables**
4. Add the following variables:

| Name | Value | Environment |
|------|-------|--------------|
| `NEXT_PUBLIC_STATSIG_CLIENT_KEY` | `your-client-key-here` | Production, Preview, Development |
| `STATSIG_SERVER_SECRET` | `your-server-secret-here` | Production only (NOT Preview/Development) |

---

## ✅ Step 3: Configure Vercel AI Gateway

### 3.1 Enable AI Gateway

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings → AI Gateway**
3. Enable AI Gateway for your project

### 3.2 Add Provider API Keys

In the AI Gateway settings, add your provider keys:

| Provider | Key Name | Get Key From |
|----------|----------|-------------|
| OpenAI | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| xAI (Grok) | `XAI_API_KEY` | [x.ai](https://x.ai) |

### 3.3 Create Gateway Key

1. In AI Gateway settings, go to **API Keys**
2. Click **Create key**
3. Add to Vercel env:

| Name | Value |
|------|-------|
| `VERCEL_AI_GATEWAY_KEY` | `your-gateway-key` |

**Free Tier Benefit:** $5/month credit automatically applied!

---

## ✅ Step 4: Configure GitHub Issues Integration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **fisioflow-51658291** → **Integrations**
3. Add **GitHub Issues** integration
4. Configure:
   - Repository: `your-username/fisioflow`
   - Label prefix: `preview-feedback`

---

## ✅ Step 5: Configure Slack Integration (Optional)

1. Create a Slack Incoming Webhook:
   - Go to [api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
   - Create webhook to your `#deployments` channel
   - Copy the webhook URL

2. Add to Vercel via CLI:

```bash
vercel env add SLACK_WEBHOOK_URL "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

## ✅ Step 6: Update Your App Code

### 6.1 Add Feature Flag Provider to App Root

```tsx
// src/App.tsx
import { FeatureFlagProvider } from '@/lib/featureFlags';

function App() {
  const user = { userID: 'user-123' }; // Get from your auth

  return (
    <FeatureFlagProvider user={user}>
      {/* existing app content */}
    </FeatureFlagProvider>
  );
}
```

### 6.2 Use Feature Flags in Components

```tsx
// src/components/dashboard/Dashboard.tsx
import { useFeatureFlag } from '@/lib/featureFlags';

function Dashboard() {
  const { enabled: newDashboard } = useFeatureFlag('new_dashboard');

  if (!newDashboard) {
    return <ClassicDashboard />;
  }

  return <NewDashboard />;
}
```

### 6.3 Use AI Gateway in Services

```typescript
// src/services/ai/clinicalService.ts
import { AIGateway } from '@/lib/ai/gateway';

export async function generateAnalysis(patientData: PatientData) {
  // Automatically uses free Gemini Flash with fallback
  const response = await AIGateway.clinical.generateAnalysis(
    patientData,
    patientData.history
  );

  return response.data;
}
```

---

## 📋 Environment Variables Checklist

Copy these from `.env.example` to your `.env`:

```bash
# ========================================
# Vercel AI Gateway Configuration
# ========================================
VERCEL_AI_GATEWAY_URL=https://gateway.vercel.sh/api/v1
VERCEL_AI_GATEWAY_KEY=your-vercel-ai-gateway-key

# AI Provider Keys
OPENAI_API_KEY=your-openai-api-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-google-ai-api-key-here
XAI_API_KEY=your-xai-api-key-for-grok

# ========================================
# Statsig Configuration
# ========================================
NEXT_PUBLIC_STATSIG_CLIENT_KEY=your-statsig-client-key-here
STATSIG_SERVER_SECRET=your-statsig-server-secret-here

# ========================================
# GitHub Integration
# ========================================
GITHUB_REPO_OWNER=your-github-username-or-org
GITHUB_REPO_NAME=fisioflow
GITHUB_TOKEN=your-github-personal-access-token

# ========================================
# Slack Integration
# ========================================
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

---

## 🚀 Deploy and Test

```bash
# Deploy to Vercel
vercel --prod

# Or preview
vercel
```

### Test Feature Flags

Create a test gate in Statsig:
1. Go to [Statsig Console](https://console.statsig.com)
2. Navigate to **Feature Gates**
3. Create a gate named `new_dashboard`
4. Set it to **Pass** for 100% of users
5. Refresh your app - the new dashboard should appear!

### Test AI Gateway

```typescript
// Test in browser console
import { AIGateway } from '@/lib/ai/gateway';

const test = await AIGateway.chat("Hello!");
console.log(test);
```

---

## 💰 Cost Savings Summary

| Integration | Regular Cost | Free Tier | Annual Savings |
|--------------|--------------|-----------|----------------|
| Statsig (vs LaunchDarkly) | ~$40,000 | $0 | **$40,000** |
| Vercel AI Gateway Credit | $5/month | $5 free | **$60** |
| 1M Analytics Events | ~$100/month | $0 | **$1,200** |
| GitHub Issues | $0 | $0 | **$0** |
| **TOTAL** | | | **~$41,260/year** |

---

## 📚 Documentation

- [Vercel AI Gateway Docs](https://vercel.com/docs/ai-gateway)
- [Statsig Documentation](https://docs.statsig.com)
- [Vercel Marketplace](https://vercel.com/marketplace)
- [Full Integration Guide](docs/VERCEL_FREE_INTEGRATIONS.md)

---

## ❓ Troubleshooting

### Statsig not initializing

```typescript
// Check if keys are set
console.log('Client Key:', import.meta.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY);
console.log('Server Key:', process.env.STATSIG_SERVER_SECRET);
```

### AI Gateway returning errors

1. Check if keys are added in [Vercel Dashboard → Settings → AI Gateway](https://vercel.com/dashboard)
2. Verify your Vercel AI Gateway key is set in env vars
3. Check provider accounts have credits

### Feature flags not updating

1. Check Statsig Console for gate status
2. Hard refresh browser (Cmd+Shift+R)
3. Verify user ID matches in Statsig
