# Implementation Plan: Stream Bindings (S6.1)

**Branch**: `feat/exercise-videos-stream-bindings` | **Date**: 2026-05-18

## Summary
Substituir upload R2 → Stream Bindings para vídeos de exercícios. Aditivo (não destrutivo): campo novo `stream_id` em `exercise_videos`, fallback R2 mantido.

## Technical Context
**Stack**: Hono Worker (`apps/api/`), React (`src/`), Neon Postgres
**New deps**: `tus-js-client` (frontend) — backend usa binding nativo
**Risk**: BAIXO — código novo paralelo, feature flag controla cutover

## Constitution Check
- ✅ Spec-Driven: este spec/plan/tasks
- ✅ Multi-plataforma: Worker + dashboard + mobile (player HLS funciona em todos)
- ✅ Privacy/LGPD: vídeos de exercícios não contêm PHI; Stream encoda em CF (mesma jurisdição que R2 atual)
- ✅ Test-First: smoke test do upload + webhook signature
- ✅ Observability: Stream Analytics nativo + `ANALYTICS.writeEvent('stream_upload', ...)`

## Project Structure
```
apps/api/
├── wrangler.toml                          # + binding STREAM
├── src/routes/exerciseVideos.ts          # + POST /upload-url, POST /stream-webhook
├── src/types/env.ts                       # + STREAM: StreamBinding
└── migrations/0093_exercise_videos_stream_id.sql

src/
├── services/exerciseVideos.ts             # + uploadViaStream()
└── components/exercises/VideoUploader.tsx # gate por feature flag
```

## Risks & Mitigations
| Risco | Severidade | Mitigação |
|---|---|---|
| Plano CF sem Stream | Médio | Rota retorna 503 + mantém R2 |
| Webhook não chega | Baixo | Poll `/api/exercise-videos/:id/status` como fallback |
| Custo runaway | Baixo | Stream Analytics alerta + cap diário |

## Out of Scope
- Migração em lote dos vídeos R2 existentes (US2 fica como TODO de script manual)
