# FisioFlow - Project Context for Jules

## Project Overview
FisioFlow is a comprehensive physiotherapy clinic management SPA (Single Page Application) built with React + Vite + TypeScript. It includes patient management, appointments, clinical records (SOAP notes), billing, and AI-assisted features.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **State**: React Query (TanStack Query) + Zustand
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Package Manager**: pnpm (required)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Mobile**: Expo (React Native) - in `/expo-mobile/`

## Project Structure
```
/
├── src/                    # Main React application
│   ├── components/         # React components (61 subdirectories)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── lib/                # Utilities, services, constants
│   ├── contexts/           # React contexts
│   ├── integrations/       # External integrations (Supabase client)
│   └── schemas/            # Zod validation schemas
├── supabase/
│   ├── functions/          # Supabase Edge Functions (Deno)
│   └── migrations/         # SQL migrations
├── api/                    # Vercel serverless functions (NOT Next.js app router)
├── e2e/                    # Playwright E2E tests
└── expo-mobile/            # React Native mobile app
```

## Important Commands
```bash
# Development
pnpm dev                    # Start dev server (port 8080)
pnpm build:prod             # Production build (with increased memory)
pnpm lint                   # ESLint check
pnpm lint:fix               # Auto-fix lint issues

# Testing
pnpm test:e2e               # Playwright tests
pnpm test:unit              # Vitest unit tests

# Database
pnpm db:push                # Push Drizzle schema changes
pnpm db:generate            # Generate migrations
```

## Critical Rules (from .jules/bolt.md)

### 1. Hook Consolidation
- **DO NOT** create new debounce/throttle hooks
- **USE** hooks from `src/hooks/performance/` (useDebounce, useDebouncedCallback, etc.)

### 2. Supabase Query Optimization
- **NEVER** use `select('*')` in Supabase queries
- **ALWAYS** specify exact columns needed
- Large text fields (clinical notes, SOAP records) should only be fetched when needed

### 3. Build Settings
- Use `pnpm build:prod` (not `pnpm build`) for production builds
- Memory is increased via `NODE_OPTIONS='--max-old-space-size=4096'`

### 4. Testing
- Vitest has JSDOM issues - prefer Playwright for UI testing
- Unit tests may fail due to environment issues, not code bugs

## File Path Conventions
- Components: `src/components/{feature}/{ComponentName}.tsx`
- Hooks: `src/hooks/use{HookName}.ts`
- Pages: `src/pages/{PageName}.tsx`
- Edge Functions: `supabase/functions/{function-name}/index.ts`
- API Routes: `api/{route}.ts` (NOT `app/api/` - this is NOT Next.js)

## Database
- Uses Supabase PostgreSQL with Row Level Security (RLS)
- Migrations are in `supabase/migrations/`
- Auth is handled by Supabase Auth

## Environment Variables
Required environment variables (in Supabase Edge Functions):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (for email)
- `STRIPE_SECRET_KEY` (for payments)

## Common Patterns

### React Query Usage
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Always specify columns
const { data } = await supabase
  .from('patients')
  .select('id, full_name, phone, email')
  .eq('id', patientId);
```

### Edge Function Pattern
```typescript
// supabase/functions/{name}/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  // Rate limiting is in _shared/rate-limit.ts
  // CORS is in _shared/cors.ts
});
```

## Known Issues
1. Some old sessions reference `app/api/` paths (Next.js structure) - this project uses `api/` (Vercel functions)
2. Some sessions reference `components/` instead of `src/components/`
3. Pre-commit hooks check lint and TypeScript - may fail on TS6305 errors (stale .d.ts files)

## Backlog Priority
See `BACKLOG_PRIORIZADO.md` for prioritized tasks including:
- Security (RLS audits, rate limiting) ✅ Done
- File Uploads (Supabase Storage) ✅ Done
- Stripe Integration (Vouchers) ✅ Done
- AI Features
- PWA/Mobile improvements
