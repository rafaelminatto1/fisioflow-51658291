# Vercel Edge Functions for Vite

This directory contains Vercel Edge Functions that work with Vite.

## Important Note

Since this project uses **Vite** (not Next.js), Edge Functions need to be deployed differently. There are two approaches:

### Option 1: Keep Using Supabase Edge Functions (Recommended)

The project already has 52 Supabase Edge Functions in `supabase/functions/`. These work great and are already integrated.

**For new AI features**, continue using Supabase Edge Functions:
- `supabase/functions/ai-transcribe/`
- `supabase/functions/ai-chat/`
- `supabase/functions/ai-suggest-conduct/`

### Option 2: Use Vercel Edge Functions (Advanced)

To use Vercel Edge Functions with Vite, you need to:

1. Install the adapter:
```bash
pnpm add -D @vercel/node
```

2. Configure vercel.json to build edge functions correctly

3. Use the function format in this directory

## Current Setup

The Edge Functions in `api/` directory were created in Next.js format. For this Vite project, they should either:
- Be moved to Supabase Edge Functions (recommended)
- Be rewritten as standard Node.js functions for Vercel
- Use Supabase Edge Functions instead

## Recommendation

**Continue using Supabase Edge Functions** for all serverless logic. They're already:
- ✅ Configured and working (52 functions)
- ✅ Integrated with the database
- ✅ Have proper authentication
- ✅ Have rate limiting
- ✅ Have error handling

Use Vercel Pro features for:
- ⚡ KV Caching (client-side or via Supabase functions)
- 🚩 Edge Config (feature flags)
- ⏰ Cron Jobs (scheduled tasks)
- 🔄 Preview Deployments (automatic)

See `INTEGRATIONS_GUIDE.md` for detailed implementation guide.
