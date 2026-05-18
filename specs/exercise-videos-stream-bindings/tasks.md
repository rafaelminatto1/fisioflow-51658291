---
description: "Tasks — S6.1 Stream Bindings"
---

# Tasks: Stream Bindings (S6.1)

## Phase 1: Setup
- [ ] T001 Verificar se conta CF tem Stream habilitado: `npx wrangler stream list` (apps/api/)
- [ ] T002 Criar branch `feat/exercise-videos-stream-bindings`

## Phase 2: Backend
- [ ] T010 [US1] Migration `0093_exercise_videos_stream_id.sql`: ADD COLUMN `stream_id`, `stream_status`, `stream_thumbnail_url`, `stream_ready_at`
- [ ] T011 [US1] `wrangler.toml`: adicionar `[stream] binding = "STREAM"` em base + env.production + env.staging
- [ ] T012 [US1] `src/types/env.ts`: adicionar `STREAM: StreamBinding` (tipo do `@cloudflare/workers-types`)
- [ ] T013 [US1] `routes/exerciseVideos.ts`: nova rota `POST /upload-url` chama `env.STREAM.directUpload({ maxDurationSeconds: 600, meta: { exercise_id, org_id } })` e retorna `{ uploadURL, uid }`
- [ ] T014 [US1] `routes/exerciseVideos.ts`: nova rota `POST /stream-webhook` valida `Webhook-Signature` (HMAC com secret Stream) e atualiza linha por `stream_id`
- [ ] T015 [US1] Configurar webhook no dashboard CF Stream → `https://api-pro.moocafisio.com.br/api/exercise-videos/stream-webhook`
- [ ] T016 [US1] Smoke test `apps/api/src/__tests__/exerciseVideos-stream.test.ts`

## Phase 3: Frontend
- [ ] T020 [US1] `pnpm add tus-js-client` em root
- [ ] T021 [US1] `src/services/exerciseVideos.ts`: nova função `uploadViaStream(file, meta)` → fetch upload-url → tus
- [ ] T022 [US1] `src/components/exercises/VideoUploader.tsx`: gate por env `VITE_STREAM_UPLOAD_ENABLED=true`
- [ ] T023 [US1] `useExerciseVideos.ts`: hook ganha state `streamStatus` (querystring/poll)

## Phase 4: Cutover & Observability
- [ ] T030 Feature flag `STREAM_UPLOAD_ENABLED` default `false` em prod; `true` em staging
- [ ] T031 Instrumentar `analytics.ts` com `stream_upload_started/completed/failed`
- [ ] T032 Habilitar prod após 1 semana em staging sem incidentes

## Phase 5: Polish
- [ ] T040 PR `feat(videos): Cloudflare Stream Bindings para exercise_videos`
- [ ] T041 README seção "Upload de vídeos" atualizado
