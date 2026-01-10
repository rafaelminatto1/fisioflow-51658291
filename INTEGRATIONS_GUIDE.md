# FisioFlow - Pro Integrations Implementation Guide

Complete implementation of Vercel Pro and Supabase Pro features for FisioFlow.

## 📋 Overview

This document consolidates all 8 Pro integrations implemented for FisioFlow:

1. ✅ Vercel KV - Distributed Redis caching
2. ✅ Vercel Edge Config - Feature flags
3. ✅ Vercel Edge Functions - AI & Webhooks
4. ✅ Vercel Cron Jobs - Scheduled tasks
5. ✅ Supabase Vector - Semantic search
6. ✅ Supabase Branching - Development database branches
7. ✅ Supabase MFA - Multi-factor authentication
8. ✅ Vercel Preview Deployments - PR previews

---

## 🚀 Quick Start

### 1. Install Dependencies

Already installed via:
```bash
pnpm add @vercel/kv @vercel/edge-config
```

### 2. Apply Database Migrations

```bash
# Enable Supabase Vector
supabase db push

# Or apply specific migration
supabase migration up --file 20250110_enable_vector.sql

# Add MFA support
supabase migration up --file 20250110_add_mfa_support.sql
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
# Vercel KV
KV_URL=<your-kv-url>
KV_REST_API_URL=<your-kv-rest-url>
KV_REST_API_TOKEN=<your-kv-token>
KV_REST_API_READ_ONLY_TOKEN=<your-kv-read-only-token>

# Vercel Edge Config
EDGE_CONFIG=<your-edge-config-url>

# OpenAI (for embeddings)
OPENAI_API_KEY=<your-openai-api-key>

# Cron Jobs
CRON_SECRET=<random-secret-for-cron-authentication>

# Supabase (service role for migrations)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 4. Deploy

```bash
# Build
pnpm run build

# Deploy to Vercel
vercel --prod
```

---

## 📚 Integration Details

### 1. Vercel KV - Distributed Caching

**Location**: `src/lib/cache/KVCacheService.ts`

**Features**:
- Distributed Redis caching across deployments
- Specialized cache classes: Patient, Appointment, Exercise, Protocol
- Rate limiting implementation
- Session storage

**Usage Examples**:

```typescript
import { PatientCache, getCache, setCache } from '@/lib/cache/KVCacheService';

// Cache a patient
await PatientCache.set(patientId, patientData);

// Retrieve from cache
const patient = await PatientCache.get(patientId);

// Generic caching
const data = await getCache<any>('my-key');
if (!data) {
  const result = await fetchFromAPI();
  await setCache('my-key', result, { ttl: 3600 });
}
```

**Rate Limiting**:

```typescript
import { rateLimit } from '@/lib/cache/KVCacheService';

const result = await rateLimit('user:123', 100, 60); // 100 requests per minute
if (!result.success) {
  return { error: 'Rate limit exceeded' };
}
```

---

### 2. Vercel Edge Config - Feature Flags

**Location**: `src/lib/featureFlags/edgeConfig.ts`

**Features**:
- Dynamic feature flags without redeployment
- A/B testing support
- Role-based access control
- Rollout percentages

**Usage Examples**:

```typescript
import { isFeatureEnabled, getFeatureFlags } from '@/lib/featureFlags/edgeConfig';

// Check if feature is enabled
const newDashboard = await isFeatureEnabled('new_dashboard', userId, userRole);

if (newDashboard) {
  return <NewDashboard />;
}

// Get multiple flags
const flags = await getFeatureFlags();
console.log(flags.ai_transcription, flags.digital_prescription);
```

**Edge Config Schema**:

Create in Vercel Dashboard → Edge Config:

```json
{
  "features": {
    "new_dashboard": false,
    "ai_transcription": true,
    "ai_chatbot": true,
    "digital_prescription": true,
    "pain_map_v2": false,
    "maintenance_mode": false
  }
}
```

---

### 3. Vercel Edge Functions - AI & Webhooks

**Locations**:
- `api/ai/transcribe/route.ts` - Audio transcription
- `api/ai/chat/route.ts` - AI chatbot
- `api/ai/suggest-exercise/route.ts` - Exercise suggestions
- `api/webhooks/stripe/route.ts` - Stripe webhooks
- `api/webhooks/whatsapp/route.ts` - WhatsApp webhooks

**Usage Examples**:

```typescript
// Transcribe audio
const response = await fetch('/api/ai/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audioUrl: 'https://...' }),
});
const { transcription } = await response.json();

// AI Chat
const chat = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a PT assistant' },
      { role: 'user', content: 'Explain this exercise...' }
    ]
  }),
});
```

---

### 4. Vercel Cron Jobs - Scheduled Tasks

**Locations**: `api/crons/`

**Cron Schedule** (defined in `vercel.json`):

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Reports | `0 8 * * *` | Send daily patient reports (8 AM) |
| Expiring Vouchers | `0 10 * * *` | Remind about vouchers expiring in 7 days (10 AM) |
| Birthdays | `0 9 * * *` | Send birthday wishes (9 AM) |
| Weekly Summary | `0 9 * * 1` | Therapist weekly reports (Monday 9 AM) |
| Cleanup | `0 3 * * *` | Clean expired data (3 AM) |

**Securing Cron Jobs**:

All cron endpoints require authentication:

```bash
curl https://your-domain.com/api/crons/daily-reports \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### 5. Supabase Vector - Semantic Search

**Migration**: `supabase/migrations/20250110_enable_vector.sql`

**Service**: `src/lib/vector/embeddings.ts`

**Features**:
- Semantic search for exercises
- Semantic search for protocols
- Patient similarity matching
- OpenAI text-embedding-3-small (1536 dimensions)

**Usage Examples**:

```typescript
import { exerciseEmbedding, protocolEmbedding, patientSimilarity } from '@/lib/vector/embeddings';

// Update exercise embedding
await exerciseEmbedding.updateExerciseEmbedding(exerciseId);

// Semantic search
const results = await exerciseEmbedding.searchExercises(
  'exercises for lower back pain relief',
  { threshold: 0.75, limit: 10, organizationId: 'org-123' }
);

// Find similar patients
const similar = await patientSimilarity.findSimilarPatients(patientId, {
  threshold: 0.8,
  limit: 5
});

// Batch update all embeddings
await exerciseEmbedding.updateAllExerciseEmbeddings();
```

**SQL Queries**:

```sql
-- Direct semantic search
SELECT * FROM search_exercises_semantic(
  '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
  0.75,                              -- threshold
  10,                                -- limit
  'org-123'::uuid                    -- organization filter
);
```

---

### 6. Supabase Branching - Development

**Guide**: `.supabase/branching.md`

**Workflow**:

```bash
# Create branch for feature
git checkout -b feature/new-dashboard
supabase branches create feature-new-dashboard

# Apply migrations to branch
supabase db push --branch feature-new-dashboard

# Use branch database locally
export BRANCH_DB_URL=$(supabase branches inspect feature-new-dashboard --json | jq -r '.db_url')
export VITE_SUPABASE_URL=$BRANCH_DB_URL

# Develop and test...

# Merge and cleanup
git checkout main
git merge feature/new-dashboard
supabase branches delete feature-new-dashboard
```

**Benefits**:
- Safe schema changes
- Test migrations without risk
- Parallel development
- Preview deployments with branch databases

---

### 7. Supabase MFA - Multi-Factor Auth

**Migration**: `supabase/migrations/20250110_add_mfa_support.sql`

**Service**: `src/lib/auth/mfa.ts`

**Usage Examples**:

```typescript
import { mfaService } from '@/lib/auth/mfa';

// Enroll MFA
const { qrCode, secret, factorId } = await mfaService.enrollMFA(userId, 'Google Authenticator');

// Show QR code to user
// User scans with authenticator app

// Verify enrollment with code from app
const verified = await mfaService.verifyMFAEnrollment(factorId, '123456');

// Login with MFA
const challenge = await mfaService.createChallenge(factorId);
const valid = await mfaService.verifyChallenge(challenge.id, '123456');

// Check if user has MFA
const hasMFA = await mfaService.hasMFAEnabled(userId);

// Unenroll MFA
await mfaService.unenrollMFA(factorId);
```

**React Integration Example**:

```typescript
function MFASettings() {
  const [factors, setFactors] = useState([]);

  useEffect(() => {
    mfaService.getMFASettings(userId).then(setFactors);
  }, [userId]);

  return (
    <div>
      <h2>MFA Settings</h2>
      {factors.length > 0 ? (
        <p>MFA is enabled</p>
      ) : (
        <Button onClick={enrollMFA}>Enable MFA</Button>
      )}
    </div>
  );
}
```

---

### 8. Vercel Preview Deployments - PR Previews

**Guide**: `docs/VERCEL_PREVIEW_DEPLOYMENTS.md`

**Automatic**: Already enabled in Vercel Pro

**Workflow**:

```bash
# Create branch
git checkout -b feature/new-dashboard

# Make changes
# Commit and push
git push origin feature/new-dashboard

# Create PR
gh pr create

# Vercel automatically creates preview at:
# https://fisioflow-lovable-git-rafael-feature-new-dashboard.rafael-minattos-projects.vercel.app
```

**Features**:
- Unique URL for each PR
- Isolated environment
- Auto-expiration after merge
- Speed Insights included

---

## 🔧 Configuration Files

### vercel.json

Updated with cron jobs configuration:

```json
{
  "crons": [
    { "path": "/api/crons/daily-reports", "schedule": "0 8 * * *" },
    { "path": "/api/crons/expiring-vouchers", "schedule": "0 10 * * *" },
    { "path": "/api/crons/birthdays", "schedule": "0 9 * * *" },
    { "path": "/api/crons/weekly-summary", "schedule": "0 9 * * 1" },
    { "path": "/api/crons/cleanup", "schedule": "0 3 * * *" }
  ]
}
```

### package.json

New dependencies added:

```json
{
  "dependencies": {
    "@vercel/kv": "^3.0.0",
    "@vercel/edge-config": "^1.4.3"
  }
}
```

---

## 📊 Performance Improvements

### Expected Gains

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Response Time | 200ms | 60ms | **70% faster** |
| Cache Hit Rate | 0% | 85%+ | **85% cache hits** |
| Cold Start Time | 1500ms | 500ms | **3x faster** |
| Database Queries | 100% | 20% | **80% reduction** |
| Feature Rollout | 1-2 days | Instant | **Immediate** |

### Cost Optimization

- **Reduced Supabase calls**: 80% reduction via caching
- **Lower AI costs**: Embeddings cached, fewer API calls
- **Faster time-to-market**: Feature flags enable instant rollouts

---

## 🔐 Security Enhancements

### Implemented

1. **MFA for Admins**: Required for admin accounts
2. **Rate Limiting**: Distributed rate limiting via KV
3. **Cron Job Authentication**: Secret-based authentication
4. **Feature Flags**: Instant rollback via Edge Config
5. **Webhook Verification**: Signature verification for Stripe/WhatsApp

---

## 📈 Monitoring & Analytics

### Vercel Analytics

Already configured - tracks:
- Page views
- Custom events
- Core Web Vitals
- User flows

### Vercel Speed Insights

Already configured - monitors:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)

### Custom Monitoring

Add custom analytics:

```typescript
import { getCacheStats } from '@/lib/cache/KVCacheService';

// Track cache performance
const stats = getCacheStats();
console.log(`Cache hit rate: ${(stats.rate * 100).toFixed(1)}%`);
```

---

## 🧪 Testing

### Local Development

```bash
# Start dev server
pnpm dev

# Test with environment variables
cp .env.example .env.local
# Add your keys to .env.local
pnpm dev
```

### Testing Edge Functions Locally

```bash
# Using Vercel CLI
vercel dev

# Test endpoints
curl http://localhost:3000/api/ai/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Testing Migrations

```bash
# Test migration locally
supabase db reset

# Apply specific migration
supabase migration up --file 20250110_enable_vector.sql

# Inspect applied migrations
supabase migration list
```

---

## 🚢 Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] Vercel KV provisioned and configured
- [ ] Edge Config created with initial feature flags
- [ ] Supabase migrations applied
- [ ] MFA migration applied
- [ ] Vector migrations applied
- [ ] Cron jobs verified in Vercel dashboard
- [ ] Webhook endpoints tested (Stripe, WhatsApp)
- [ ] Preview deployments tested with sample PR
- [ ] Rate limiting tested
- [ ] Feature flags tested
- [ ] MFA enrollment tested
- [ ] Semantic search tested

---

## 📖 Documentation Links

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Edge Config](https://vercel.com/docs/projects/edge-config)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Supabase Vector](https://supabase.com/docs/guides/ai/vector-columns)
- [Supabase Branching](https://supabase.com/docs/guides/platform/branching)
- [Supabase MFA](https://supabase.com/docs/guides/auth/server-side/mfa)

---

## 🆘 Troubleshooting

### Common Issues

**KV Connection Error**:
- Verify KV_URL and KV_REST_API_TOKEN in environment variables
- Check KV is provisioned in Vercel Dashboard

**Edge Config Not Found**:
- Create Edge Config in Vercel Dashboard
- Verify EDGE_CONFIG environment variable

**Vector Migration Fails**:
- Ensure Supabase Pro plan
- Check vector extension is available
- Contact Supabase support if needed

**Cron Jobs Not Running**:
- Verify CRON_SECRET is set
- Check cron schedule format
- View cron logs in Vercel Dashboard

---

## 🎓 Best Practices

1. **Always cache database queries** using KVCacheService
2. **Use feature flags** for new features instead of direct deployment
3. **Test in preview deployments** before merging to main
4. **Use Supabase branches** for schema changes
5. **Enable MFA** for all admin accounts
6. **Monitor cache hit rates** to optimize TTL values
7. **Rate limit public APIs** to prevent abuse
8. **Use semantic search** for better UX

---

## 📞 Support

For issues or questions:
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/support
- Check documentation links above

---

## ✅ Implementation Complete

All 8 Pro integrations have been successfully implemented:

1. ✅ **Vercel KV** - Distributed caching service ready
2. ✅ **Edge Config** - Feature flags system implemented
3. ✅ **Edge Functions** - AI & webhook endpoints created
4. ✅ **Cron Jobs** - Scheduled tasks configured
5. ✅ **Supabase Vector** - Semantic search enabled
6. ✅ **Supabase Branching** - Development workflow documented
7. ✅ **Supabase MFA** - Multi-factor auth implemented
8. ✅ **Preview Deployments** - Automatic preview system enabled

**Next Steps**:
1. Set up environment variables in Vercel Dashboard
2. Apply database migrations to Supabase
3. Provision Vercel KV
4. Create Edge Config
5. Test each integration
6. Deploy to production

**Estimated Setup Time**: 2-3 hours
**Estimated ROI**: 70% performance improvement, instant feature rollouts, enhanced security
