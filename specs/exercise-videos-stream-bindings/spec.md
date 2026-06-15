# Feature Specification: Exercise Videos via Cloudflare Stream Bindings

**Feature Branch**: `feat/exercise-videos-stream-bindings`
**Created**: 2026-05-18
**Status**: Draft (S6.1)
**Input**: [`us4-deferral.md`](../platform-modernization-may-2026/us4-deferral.md) + Cloudflare Stream Bindings GA 2026-05-07

## Contexto

Hoje vídeos de exercícios são uploaded direto para R2 via `src/services/exerciseVideos.ts:uploadToR2()`. Worker `apps/api/src/routes/exerciseVideos.ts` apenas persiste metadata no Neon. Stream Bindings (GA 2026-05-07) permitem encoding adaptativo, HLS, thumbnails auto + signed URLs nativos sem chamadas API autenticadas.

**Custo estimado**: 500 vídeos × ~1.5min = 750min stored = $3.75/mês + delivery (depende de plays, ~$1-5/mês).

## User Scenarios

### US1 — Fisio faz upload de vídeo de exercício e ganha HLS automático (P1)

**Persona**: Fisioterapeuta criando biblioteca de exercícios.

**Why this priority**: HLS adaptive bitrate melhora UX em 3G de pacientes (app mobile); thumbnails automáticos eliminam etapa manual; sem CSRF/CORS issues do R2 público.

**Acceptance**:

1. Worker rota `POST /api/exercise-videos/upload-url` retorna direct upload URL do Stream
2. Frontend faz upload via `tus-js-client` → Stream encoda automaticamente
3. Webhook do Stream notifica Worker quando `ready` → persiste `stream_video_id` em `exercise_videos.stream_id`
4. Player no app paciente usa Stream Player ou HLS URL nativo
5. Custo do mês não passa de US$ 10 (verificar Stream Analytics)

### US2 — Migração graceful dos vídeos R2 existentes (P2)

**Persona**: dev mantendo backward-compat.

**Acceptance**:

1. Campo `stream_id` adicionado em `exercise_videos` (nullable)
2. Rota antiga `POST /api/exercise-videos` continua aceitando URL R2 (fallback)
3. Script `scripts/migrate-videos-r2-to-stream.mjs` migra os vídeos existentes (opcional, em batch)
4. Frontend usa Stream se `stream_id` presente, senão R2

### Edge Cases

- Vídeo >5GB: limite Stream para upload direto
- Upload abortado (paciente fecha tab): direct upload expira em X horas, sem custo
- Conta CF sem Stream habilitado: rota deve retornar 503 claro

## Requirements

- **FR-001**: `apps/api/wrangler.toml`: adicionar `[stream] binding = "STREAM"` em prod e staging
- **FR-002**: Migration `0093_exercise_videos_stream_id.sql`: `ALTER TABLE exercise_videos ADD COLUMN stream_id TEXT, stream_status TEXT, stream_thumbnail_url TEXT`
- **FR-003**: Nova rota `POST /api/exercise-videos/upload-url` → `env.STREAM.directUpload({ maxDurationSeconds: 600, meta })` → retorna `{ uploadURL, uid }`
- **FR-004**: Webhook `POST /api/exercise-videos/stream-webhook` valida assinatura Stream + atualiza `stream_status`/`stream_thumbnail_url`
- **FR-005**: Frontend `src/services/exerciseVideos.ts` ganha `uploadViaStream(file, meta)` em paralelo ao `uploadToR2`
- **FR-006**: Feature flag `STREAM_UPLOAD_ENABLED` (KV ou env var) para rollout gradual

## Success Criteria

- **SC-001**: Upload novo via Stream completa < 60s para vídeo de 2min
- **SC-002**: Player no app mobile carrega HLS em < 2s no 3G
- **SC-003**: Custo Stream < US$ 10/mês no primeiro mês
- **SC-004**: 0 regressão em vídeos R2 existentes (mantidos via fallback)

## Assumptions

- Conta CF tem plano com Stream habilitado (verificar)
- Volume estimado: 50 uploads/mês × 1.5min = 75min novos/mês = $0.38 storage
- Pacientes ativos com app: ~200 (custo delivery ainda baixo)

## Out of Scope

- Live streaming (não usamos)
- Watermarking
- DRM/Signed URLs com payment gateway
