---
inclusion: always
---

# FisioFlow — Stack Tecnológico

## Monorepo & Build

- **Package Manager**: pnpm 10.33.0+ (obrigatório)
- **Node.js**: 22.12.0+ (obrigatório)
- **Monorepo**: Turborepo 2.x
- **Build Tool (web)**: Vite 8.x
- **TypeScript**: 6.x com strict mode

## Frontend (`apps/web`)

### Core

- **React**: 19.2.0
- **Framework**: React Router v7 (SSR/SPA híbrido)
- **Build**: Vite 8 + `@vitejs/plugin-react`

### UI & Estilo

- **Componentes**: shadcn/ui (Radix UI primitives) — `packages/ui/`
- **Estilo**: Tailwind CSS 4.x
- **Ícones**: Lucide React
- **Animações**: Framer Motion 12.x
- **Calendário**: FullCalendar 6.x

### Estado

- **Server State**: TanStack Query 5.x (React Query)
- **Client State**: Zustand 5.x
- **Forms**: React Hook Form 7.x + Zod 4.x

### Mobile

- **Bridge**: Capacitor 8.x (iOS/Android)
- **Storage**: AsyncStorage 2.x

## Backend (`apps/api`)

### Runtime & Framework

- **Runtime**: Cloudflare Workers (edge, sem Node.js nativo)
- **Framework**: Hono 4.x
- **Validação**: `@hono/zod-validator` + Zod 4.x
- **Deploy**: Wrangler 4.x (`wrangler.toml`)

### Banco de Dados

- **Primário**: Neon PostgreSQL serverless (`sa-east-1`) via **Cloudflare Hyperdrive**
- **Edge/Cache**: Cloudflare D1 (SQLite na edge — rate limiting, índices, feriados)
- **ORM**: Drizzle ORM 0.45.x
- **Migrations**: Drizzle Kit 0.31.x
- **Schema**: `packages/db/src/schema/` — importado como `@fisioflow/db`

### Auth

- **Provider**: Neon Auth (JWT verificado via JWKS)
- **Verificação**: `jose` (JWKS endpoint configurado em `wrangler.toml`)
- **Contexto**: `profileId` + `organizationId` + `role` extraídos do JWT
- **⚠️ Não usa Firebase Auth, better-auth ou qualquer outro provider**

### Storage & Serviços Cloudflare

- **Mídia**: Cloudflare R2 (`fisioflow-media`) — URL pública: `media.moocafisio.com.br`
- **Cache Global**: Cloudflare KV (`FISIOFLOW_CONFIG`)
- **Real-time/State**: Durable Objects (`OrganizationState`, `PatientAgent`, `AssessmentLiveSession`)
- **Filas**: Cloudflare Queues (`fisioflow-background-tasks`)
- **Automações**: Cloudflare Workflows (appointment-reminder, patient-onboarding, etc.)
- **Observabilidade**: Cloudflare Analytics Engine + Axiom (logs)
- **IA na Edge**: Cloudflare AI binding + AI Gateway
- **RAG**: Cloudflare Vectorize (`fisioflow-clinical`)

### Integrações Externas

- **Email**: Resend
- **Pagamentos**: Stripe 20.x
- **WhatsApp**: Meta Business API
- **AI/ML**: Google Gemini (via Cloudflare AI Gateway)
- **Background Jobs**: Inngest 3.x
- **Error Tracking**: Sentry 10.x
- **Analytics**: PostHog

## Testes

| Ferramenta | Versão | Uso |
|-----------|--------|-----|
| Vitest | 4.x | Unit/Integration (web e API) |
| fast-check | 4.5.3 | Property-based testing |
| Playwright | 1.58.x | E2E |
| @testing-library/react | 16.x | Testes de componentes |

### Comandos de Teste

```bash
# Web (rodar da raiz)
pnpm --filter fisioflow-web test:unit    # Vitest uma vez
pnpm --filter fisioflow-web test         # Vitest watch
pnpm --filter fisioflow-web test:e2e    # Playwright

# API
pnpm --filter @fisioflow/api test        # Vitest uma vez

# Da raiz (todos)
pnpm test
```

## Comandos de Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Dev (web + api em paralelo via Turborepo)
pnpm dev

# Apenas web
pnpm --filter fisioflow-web dev

# Apenas API (Cloudflare Workers local)
pnpm --filter @fisioflow/api dev

# Build web
pnpm --filter fisioflow-web build

# Deploy API para Cloudflare
pnpm --filter @fisioflow/api deploy

# Deploy staging
pnpm --filter @fisioflow/api deploy:staging
```

## Banco de Dados

```bash
# Gerar migration SQL (requer DATABASE_URL)
pnpm --filter @fisioflow/db db:generate

# Aplicar migrations
pnpm --filter @fisioflow/db db:push
```

## Linting & Formatação

```bash
pnpm lint          # oxlint (não ESLint)
pnpm lint:fix      # oxlint --fix
pnpm fmt           # oxfmt
pnpm fmt:check     # oxfmt --check
```

## Path Aliases (web)

```typescript
@/*   →  apps/web/src/*
```

## Variáveis de Ambiente Relevantes (API)

Configuradas via `wrangler.toml` (vars públicas) ou `wrangler secret put` (secrets):

```bash
# Neon Auth (JWT verification)
NEON_AUTH_JWKS_URL
NEON_AUTH_ISSUER
NEON_AUTH_AUDIENCE

# Banco (secret)
NEON_URL                    # Connection string Neon

# Cloudflare
HYPERDRIVE                  # Binding automático (wrangler.toml)
MEDIA_BUCKET                # R2 binding

# Integrações (secrets)
RESEND_API_KEY
STRIPE_SECRET_KEY
INNGEST_EVENT_KEY
AXIOM_TOKEN
```

## Regras Críticas para IA

1. **Nunca usar Firebase** — não existe no projeto
2. **API usa Hono**, não Express, Fastify ou Cloud Functions
3. **Auth é Neon Auth** — JWT via JWKS, não Firebase Auth
4. **Banco é Neon PostgreSQL** via Hyperdrive — não Cloud SQL
5. **ORM é Drizzle** — não Prisma, não Sequelize
6. **Linter é oxlint** — não ESLint; formatter é oxfmt, não Prettier
7. **React Router v7** no frontend — não Next.js
8. **Workers rodam na edge** — sem `fs`, sem `process.env` direto (usar `c.env`)
9. **Multi-tenant obrigatório** — sempre filtrar por `organizationId` nas queries
10. **Zod 4.x** — API mudou em relação ao Zod 3 (ex: `z.string().min()` ainda funciona, mas verificar breaking changes)
