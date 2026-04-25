# FisioFlow - Guia do Desenvolvedor (v4.0.0 - 2026)

Este guia documenta o ecossistema técnico do FisioFlow, focado na arquitetura de alta performance baseada em **Cloudflare Workers**, **Neon DB** e **Drizzle ORM**.

## 1. Stack Tecnológica Core

A aplicação foi migrada para uma arquitetura "Edge-First" para garantir latência mínima e escalabilidade global.

- **Frontend:** React 19.2.0 + Vite 8.0.7 (Rolldown)
- **Backend:** Hono.js (Cloudflare Workers v4)
- **Database:** Neon PostgreSQL (Serverless) + Hyperdrive (Pooling)
- **ORM:** Drizzle ORM v0.45.2
- **Auth:** Neon Auth (Better Auth v1.5.6) via JWKS
- **Styling:** Tailwind CSS v4.2.2 + Radix UI
- **Tools:** Turbo v2.8.21, Biome v2.4.9, Vitest v4.1.2
- **AI/ML:** Gemini 3.0 (Structured Outputs) + Cloudflare AI

## 2. Estrutura do Monorepo

O projeto está organizado como um monorepo para facilitar o compartilhamento de tipos e lógica entre frontend e backend.

```text
/
├── apps/
│   ├── api/            # Hono Backend (Cloudflare Worker)
│   ├── web/            # Dashboard Frontend (Cloudflare Pages)
│   ├── patient-app/    # Mobile Frontend (Expo/React Native)
│   └── professional-app/ # Mobile Pro (Expo/React Native)
├── packages/
│   ├── db/             # Drizzle Schema e Migrações (Shared)
│   ├── ui/             # Design System (Shared Components)
│   └── core/           # Interfaces e Lógica de Negócio (Shared)
└── docs/               # Documentação Unificada
```

## 3. Guia de Desenvolvimento Backend (API)

A API reside em `apps/api/` e utiliza o framework **Hono**.

### 3.1 Padrão de Rota (Drizzle + Tenant Isolation)

Todas as rotas devem garantir o isolamento por organização (`organizationId`).

```typescript
// apps/api/src/routes/patients.ts
app.get("/", requireAuth, async (c) => {
  const user = c.get("user"); // Injetado pelo middleware de auth
  const db = createDb(c.env);

  const result = await db
    .select()
    .from(patients)
    .where(and(eq(patients.organizationId, user.organizationId), isNull(patients.deletedAt)));

  return c.json({ data: result });
});
```

### 3.2 Comandos Úteis (API)

```bash
cd apps/api
npm run dev      # Inicia Wrangler localmente
npm run deploy   # Deploy para Cloudflare Production
npm run test     # Executa Vitest
```

## 4. Guia de Desenvolvimento Frontend (Web)

O frontend utiliza **React 19** com foco em componentes funcionais e performance extrema.

### 4.1 Estado e Fetching

Utilizamos **TanStack Query (React Query)** para gerenciamento de estado assíncrono.

```typescript
// Exemplo de fetcher centralizado
export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const resp = await api.get("/api/patients");
      return resp.data;
    },
  });
}
```

## 5. Banco de Dados e Migrações

O schema está centralizado em `packages/db/src/schema.ts`.

### 5.1 Fluxo de Migração

1.  Altere o schema em `packages/db/src/schema.ts`.
2.  Gere a migração: `cd packages/db && npm run generate`.
3.  Aplique localmente: `npm run push`.
4.  O CI/CD aplicará automaticamente no Neon DB via GitHub Actions.

## 6. Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou `dev.vars` dentro de `apps/api`) com as seguintes chaves obrigatórias:

```env
# Database
NEON_DATABASE_URL=postgresql://...
NEON_API_KEY=neon_...

# Auth (JWKS)
NEON_AUTH_JWKS_URL=https://.../.well-known/jwks.json
NEON_AUTH_ISSUER=...

# Cloudflare (Wrangler/Deploy)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

---

**Última Atualização:** Abril 2026
**Responsável:** Antigravity AI Kit
