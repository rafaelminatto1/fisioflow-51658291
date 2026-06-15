# FisioFlow — Convenções para agentes

## Stack canônica

- Neon Postgres 17 + Hyperdrive + Drizzle ORM (Worker via `pg`)
- Cloudflare Workers (Hono) — `apps/api/`, `compatibility_date = 2026-05-14`
- React 19.2 + Vite 8.0.13 + Tailwind v4 + Shadcn/Radix — `src/` (dashboard) + `apps/web/`
- Auth: Neon Auth (JWT, JWKS); logout via POST `/sign-out` (não `keepalive`)
- 100% Cloudflare + Neon — Firebase removido completamente

## Workflow Spec-Driven (Spec Kit instalado)

Qualquer feature > 3 tasks:

1. Cria `specs/<slug>/spec.md` (user stories P1/P2/P3 + acceptance scenarios)
2. `specs/<slug>/plan.md` (technical context + Constitution Check)
3. `specs/<slug>/tasks.md` (tasks T0xx por user story)
4. Constitution em `.specify/memory/constitution.md` — gates obrigatórios

## Documentação atualizada (fetchar quando precisar)

- `https://developers.cloudflare.com/changelog/llms.txt` — índice changelog Cloudflare
- `https://developers.cloudflare.com/workers/llms.txt` — Workers API
- `https://developers.cloudflare.com/agents/llms.txt` — Agents SDK
- `https://developers.cloudflare.com/r2/llms.txt` — R2 storage + SQL
- `https://neon.com/docs/llms.txt` — Neon docs
- `https://developers.cloudflare.com/agent-setup/prompt.md` — Cloudflare agent setup

## MCP servers configurados

- `Neon` — MCP oficial; usar para SQL + branches + Data API provisioning
- `context7` — fetchar docs de libs/frameworks (preferir sobre web search)
- `exa` + `brave` — web search com snippets
- `chrome-devtools` — inspeção de UI quando necessário
- TODO: `cloudflare` MCP (`claude mcp add cloudflare --transport http https://mcp.cloudflare.com/sse`)

## Convenções de código

- TypeScript strict; sem comentários supérfluos
- Português (PT-BR) em UI
- Sem glassmorphism (sem backdrop-blur/transparências) — superfícies sólidas
- Tests: Vitest + Testing Library; Playwright p/ E2E
- RLS pattern: `current_setting('app.org_id', true)` para Worker; `current_setting('request.jwt.claim.sub', true)` para Data API

## Áreas críticas

- `apps/api/src/lib/workersAi.ts` — registry centralizado de modelos AI (não hardcode strings `@cf/...`)
- `apps/api/migrations/` — usar próximo número sequencial; sempre criar `.down.sql` se destrutivo
- Cloudflare AI deprecações: ver `DEPRECATED_MODELS_2026_05_30` em `workersAi.ts`
- Data API CORS: `server_cors_allowed_origins` (CSV) via PATCH `/projects/.../data-api/{db}`
