---
inclusion: always
---

# FisioFlow — Estrutura do Projeto

## Layout do Monorepo (Turborepo + pnpm)

```
fisioflow-51658291/
├── apps/
│   ├── api/                   # Cloudflare Workers API (Hono + Drizzle + Neon)
│   ├── web/                   # Web app principal (React Router v7 + Vite)
│   ├── mobile-ios/            # App mobile iOS (Capacitor)
│   ├── professional-app/      # App profissional
│   ├── patient-app/           # App paciente
│   └── jules-bot/             # Bot Jules
├── packages/
│   ├── db/                    # Schema Drizzle ORM + tipos do banco
│   ├── core/                  # Lógica de negócio compartilhada
│   ├── ui/                    # Componentes shadcn/ui compartilhados
│   ├── config/                # Configurações compartilhadas (tsconfig, etc.)
│   └── shared-api/            # Cliente de API compartilhado
├── .kiro/
│   ├── specs/                 # Especificações de features
│   └── steering/              # Regras de steering para IA (este arquivo)
├── .agent/                    # Configuração de agentes IA e documentação
├── package.json               # Root workspace (pnpm)
└── turbo.json                 # Configuração Turborepo
```

## App Web (`apps/web/`)

Framework: **React Router v7** (SSR/SPA híbrido) + Vite 8

```
apps/web/
├── src/
│   ├── components/
│   │   └── layout/            # Componentes de layout
│   ├── pages/                 # Páginas por domínio (React Router file-based)
│   │   ├── financeiro/
│   │   └── patients/
│   ├── lib/                   # Utilitários, auth client, api client
│   ├── styles/                # CSS global
│   ├── tests/ e test/         # Utilitários de teste
│   ├── routes.ts              # Definição de rotas
│   ├── root.tsx               # Root layout
│   └── main.tsx               # Entry point
├── vite.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

> **Nota**: A maioria dos componentes React (schedule, settings, hooks, etc.) ainda vive em `src/` na raiz do monorepo (legado), sendo migrada gradualmente para `apps/web/src/`.

## API Cloudflare Workers (`apps/api/`)

Framework: **Hono** + **Drizzle ORM** + **Neon via Hyperdrive**

```
apps/api/
├── src/
│   ├── routes/                # Handlers de rota Hono (agrupados por domínio)
│   ├── middleware/            # Auth (JWT/JWKS), CORS, rate-limit
│   ├── services/              # Lógica de negócio
│   ├── schemas/               # Schemas Zod para validação de request/response
│   ├── agents/                # Durable Object agents
│   ├── workflows/             # Cloudflare Workflows (automações duráveis)
│   ├── lib/                   # Utilitários (logger Axiom, etc.)
│   ├── types/                 # Tipos TypeScript
│   ├── index.ts               # Entry point Hono app
│   ├── cron.ts                # Cron triggers
│   └── queue.ts               # Queue consumer
├── migrations/                # Migrations SQL (Drizzle Kit)
├── wrangler.toml              # Configuração Cloudflare Workers
└── package.json
```

### Bindings Cloudflare disponíveis no Worker

| Binding | Tipo | Uso |
|---------|------|-----|
| `HYPERDRIVE` | Hyperdrive | Conexão Neon PostgreSQL com pool |
| `MEDIA_BUCKET` | R2 | Armazenamento de mídia/documentos |
| `FISIOFLOW_CONFIG` | KV | Configurações globais em cache |
| `DB` | D1 | Índice de evoluções, feriados |
| `EDGE_CACHE` | D1 | Cache de queries, rate limiting |
| `ANALYTICS` | Analytics Engine | Observabilidade de eventos |
| `CLINICAL_KNOWLEDGE` | Vectorize | Base RAG clínica |
| `EVENTS_PIPELINE` | Pipeline | Data warehouse → R2 |
| `BACKGROUND_QUEUE` | Queue | Tarefas assíncronas |
| `ORGANIZATION_STATE` | Durable Object | Estado real-time por org |
| `PATIENT_AGENT` | Durable Object | Agente por paciente |
| `AI` | Workers AI | Modelos de IA na edge |

## Pacote de Banco de Dados (`packages/db/`)

```
packages/db/src/
├── schema/                    # Tabelas Drizzle ORM (um arquivo por domínio)
│   ├── index.ts               # Barrel de exports de todos os schemas
│   ├── patients.ts
│   ├── appointments.ts
│   ├── userAgendaAppearance.ts
│   └── ...
└── index.ts                   # Export principal do pacote
```

- Importar como `@fisioflow/db` nos outros packages/apps
- Schemas usam `pgTable` do `drizzle-orm/pg-core`
- Migrations geradas com `drizzle-kit` em `apps/api/migrations/`

## Convenções de Código

### Nomenclatura de Arquivos

- **Componentes React**: PascalCase — `PatientCard.tsx`
- **Hooks**: camelCase com prefixo `use` — `useAgendaAppearance.ts`
- **Rotas Hono**: camelCase — `agendaAppearance.ts`
- **Schemas Drizzle**: camelCase — `userAgendaAppearance.ts`
- **Testes**: mesmo nome + `.test.ts(x)` — `PatientCard.test.tsx`

### Imports

```typescript
// Path aliases (web app)
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

// Pacotes do workspace
import { db } from "@fisioflow/db";
import type { Patient } from "@fisioflow/core";

// Preferir lodash-es (tree-shakeable)
import { debounce } from "lodash-es";
```

### Padrões de API (Hono)

```typescript
// Validação com @hono/zod-validator
import { zValidator } from "@hono/zod-validator";

app.put("/api/v1/user/agenda-appearance",
  authMiddleware,
  zValidator("json", AgendaAppearanceSchema),
  async (c) => {
    const { profileId, organizationId } = c.get("auth");
    // ...
    return c.json({ data: result });
  }
);
```

### Multi-tenant

Toda query ao banco **deve** filtrar por `organizationId`:

```typescript
const result = await db
  .select()
  .from(table)
  .where(
    and(
      eq(table.organizationId, organizationId),
      eq(table.profileId, profileId)
    )
  );
```

## Testes

- **Unit/Integration**: Vitest (colocado junto ao source — `*.test.ts`)
- **Property-Based**: fast-check 4.5.3 (tag obrigatória: `// Feature: X, Property N: ...`)
- **E2E**: Playwright (`apps/web/playwright.config.ts`)
- **Rodar testes web**: `pnpm --filter fisioflow-web test:unit`
- **Rodar testes API**: `pnpm --filter @fisioflow/api test`

## Linting e Formatação

- **Linter**: `oxlint` (não ESLint)
- **Formatter**: `oxfmt`
- Rodar: `pnpm lint` / `pnpm fmt`
