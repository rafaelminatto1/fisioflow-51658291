# 11. Deploy e Produção

## 🚀 Visão Geral

O FisioFlow é deployado automaticamente na **Vercel Pro** com CI/CD via GitHub Actions, monitoramento com **Sentry**, e backups automáticos via **Supabase Pro**.

## 📦 Deploy na Vercel

### Configuração

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "vite",
  "outputDirectory": "dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "env": {
    "VITE_SUPABASE_URL": "@supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "VITE_SENTRY_DSN": "@sentry-dsn"
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ],
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/expiring-vouchers",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/birthday-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/weekly-summary",
      "schedule": "0 9 * * 1"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/data-integrity",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### Variáveis de Ambiente

```bash
# Vercel Dashboard → Settings → Environment Variables

# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Sentry (Error tracking)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=seu-token

# Analytics
VITE_ENABLE_ANALYTICS=true

# Feature Flags
VITE_ENABLE_TELEMEDICINE=true
VITE_ENABLE_GAMIFICATION=true
```

## 🔄 CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Test
        run: pnpm test:run

      - name: E2E Test
        run: pnpm test:e2e

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 📊 Monitoramento

### Sentry (Error Tracking)

```typescript
// main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', 'fisioflow.com', /^\//],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,  // 10% das transações
  replaysSessionSampleRate: 0.1,  // 10% das sessões
  replaysOnErrorSampleRate: 1.0,  // 100% dos erros
  environment: import.meta.env.MODE,
  beforeSend(event, hint) {
    // Filtrar dados sensíveis
    if (event.request?.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['authorization'];
    }
    return event;
  },
});
```

### Vercel Analytics

```typescript
// App.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  return (
    <>
      <Routes>{/* ... */}</Routes>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
```

### Web Vitals

```typescript
// lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);
  onFID(console.log);
  onFCP(console.log);
  onLCP(console.log);
  onTTFB(console.log);
}

// main.tsx
reportWebVitals();
```

## 💾 Backups

### Supabase Automated Backups

```yaml
# Supabase Pro Features
Backup Schedule: Daily
Retention: 30 days
Point-in-time Recovery: 7 days
```

### Backup Manual

```bash
# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d).sql

# Via pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
# Via Supabase Dashboard
# Project → Database → Backups → Restore

# Via CLI
supabase db reset --db-url "postgresql://..."
```

## 🔄 Rollback

### Vercel Rollback

```bash
# Via CLI
vercel rollback

# Via Dashboard
# Deployments → Selecionar versão anterior → Promote to Production
```

### Database Rollback

```sql
-- Supabase Dashboard
-- Database → Backups → Select backup → Restore
```

## 🔐 Segurança em Produção

### Headers de Segurança

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" }
      ]
    }
  ]
}
```

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { kv } from '@vercel/kv';

export async function rateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60000
) {
  const key = `ratelimit:${identifier}`;
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, window / 1000);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Date.now() + window,
  };
}
```

## 📈 Performance

### Otimizações Ativadas

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'charts': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Performance Budget

```
Target Lighthouse Scores:
- Performance: >90
- Accessibility: >90
- Best Practices: >90
- SEO: >90
```

## 🔗 Recursos Relacionados

- [Ambiente de Desenvolvimento](./03-ambiente-desenvolvimento.md) - Setup local
- [Configuração Vercel](./guias/configuracao-vercel.md) - Guia detalhado
- [APIs e Integrações](./07-api-integracoes.md) - Webhooks
