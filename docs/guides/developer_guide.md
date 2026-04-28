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

## 7. Workflow de Spec Kit

O FisioFlow agora inclui integração com GitHub Spec Kit para apoiar o desenvolvimento orientado por especificações.

### Arquivos principais
- `constitution.md`: princípios e políticas globais do projeto.
- `specs/<feature>/spec.md`: especificação da feature com histórias de usuário e critérios de aceitação.
- `specs/<feature>/plan.md`: plano de implementação técnico para a feature.
- `specs/<feature>/tasks.md`: lista de tarefas acionáveis organizadas por prioridade.

### Comandos principais
- `specify init --here`: inicializa o Spec Kit no repositório existente.
- `/speckit.constitution`: gera ou atualiza a constituição do projeto.
- `/speckit.specify`: cria a especificação de uma feature.
- `/speckit.plan`: gera o plano de implementação.
- `/speckit.tasks`: gera a lista de tarefas da feature.
- `/speckit.analyze`: verifica consistência entre spec, plan e tasks.
- `/speckit.checklist`: produz checklist de qualidade para revisão.

### Como usar
1. Crie um diretório de feature em `specs/<feature>/`.
2. Execute `/speckit.specify` com a descrição do recurso.
3. Use `/speckit.plan` para converter a spec em decisões técnicas.
4. Gere tarefas com `/speckit.tasks`.
5. Opcionalmente, rode `/speckit.analyze` e `/speckit.checklist` antes da implementação.

### Exemplos de prompts no chat

- Para iniciar uma nova funcionalidade:
  `/speckit.specify Create a new follow-up dashboard page in the web app that shows upcoming patient appointments, active home exercise programs, and quick reminder actions. Use the current FisioFlow monorepo stack with React 19, Next.js 16, Tailwind CSS, and shared UI packages.`

- Para criar um plano técnico:
  `/speckit.plan Use React 19 + Next.js 16 to implement the page in `apps/web`, reuse shared components from `packages/ui`, fetch follow-up data from the existing API, and ensure tenant isolation and mobile responsiveness.`

- Para gerar tarefas:
  `/speckit.tasks`

- Para revisar consistência entre artefatos:
  `/speckit.analyze`

- Para obter um checklist de qualidade:
  `/speckit.checklist`

### Como escrever o prompt corretamente
- Seja específico sobre a camada que você quer criar: `page`, `feature`, `API endpoint`, `component`, `integration`.
- Mencione a stack do FisioFlow quando precisar: `React 19`, `Next.js 16`, `Hono`, `Drizzle`, `Neon`, `Capacitor`.
- Diga o objetivo do usuário e a métrica de sucesso, por exemplo: `allow therapists to send follow-up reminders quickly`.
- Inclua se você quer um MVP ou se precisa de suporte total para `mobile`/`desktop`.

---

**Última Atualização:** Abril 2026
**Responsável:** Antigravity AI Kit
