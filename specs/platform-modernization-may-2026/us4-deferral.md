# US4 — Cloudflare primitives — DEFERRED para Sprint S6

**Decisão**: 2026-05-18
**Status**: deferida explicitamente

## Por quê deferir agora

US4 cobre 3 refactors significativos (Stream Bindings, R2 SQL pipeline, Agents SDK Voice) que justificam PRDs próprios:

1. **Stream Bindings** (`apps/api/src/routes/exercise-videos.ts`)
   - Pré-requisito ✅: `compatibility_date = 2026-05-14` (aplicado nesta sprint)
   - Adicionar `[stream] binding = "STREAM"` em `wrangler.toml`
   - Refatorar upload para `env.STREAM.upload(url, { meta })`
   - **Risco**: requer revisão de quotas Stream + custo por minuto vs R2 atual

2. **R2 SQL JOINs pipeline** (`sessions` arquivamento >90d)
   - Criar namespace R2 Data Catalog `fisioflow_archive`
   - Criar tabelas Iceberg `sessions_archive`, `patients_archive`
   - Cron Worker mensal para move
   - **Risco**: LGPD — arquivamento é "retenção" diferente de "operação"; precisa parecer DPO

3. **Agents SDK v0.12.4 Voice Scribe**
   - Upgrade `agents` 0.8.2 → 0.12.4 (4 minor versions, breaking)
   - Criar `apps/api/src/agents/VoiceScribeAgent.ts` (Durable Object novo)
   - Adicionar tag de migration DO v9
   - Refactor `src/hooks/useVoiceScribe.ts` para `useAgent`
   - **Risco**: state migration de sessões de voz em andamento; tag DO é imutável após deploy

## Pré-requisitos já cumpridos nesta sprint (US3)

- ✅ `wrangler 4.92.0` no devDependencies
- ✅ `compatibility_date = "2026-05-14"` em `apps/api/wrangler.toml`
- ✅ `agents` SDK no Worker (versão 0.8.2 já instalada — bump separado)
- ✅ MCP/skills Cloudflare disponíveis no Claude Code

## Próximo passo

Quando S6 abrir:

1. Criar `specs/voice-scribe-v2-agents-sdk/` (spec + plan + tasks)
2. Criar `specs/exercise-videos-stream-bindings/`
3. Criar `specs/sessions-r2-archive-pipeline/`

Cada um vira PR próprio com seu próprio gate de Constitution Check.
