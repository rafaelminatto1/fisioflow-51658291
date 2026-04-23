---
name: fisioflow-cloudflare-infra
description: Reference for the Cloudflare Workers infrastructure that powers FisioFlow. Use when changing Wrangler config, bindings, queues, workflows, Durable Objects, storage, AI, or deployment setup.
---

# FisioFlow Cloudflare Infrastructure

Complete reference for the FisioFlow API Worker deployed on Cloudflare. All configuration lives in `apps/api/wrangler.toml`. The Worker is a Hono app (`apps/api/src/index.ts`) with 3 environments: top-level (default), `production`, and `staging`.

## 1. Workers Configuration

```toml
name = "fisioflow-api"
main = "src/index.ts"
compatibility_date = "2026-03-25"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

[placement]
mode = "smart"
```

### Bindings Summary

| Binding | Type | Purpose |
|---|---|---|
| `HYPERDRIVE` | Hyperdrive | PostgreSQL connection pooling to Neon |
| `MEDIA_BUCKET` | R2 Bucket | Media file storage |
| `FISIOFLOW_CONFIG` | KV Namespace | Global configuration cache |
| `DB` | D1 Database | `fisioflow-db` — evolution index, holidays |
| `EDGE_CACHE` | D1 Database | `fisioflow-edge-cache` — rate limits, query cache |
| `ANALYTICS` | Analytics Engine | `fisioflow_events` — observability |
| `CLINICAL_KNOWLEDGE` | Vectorize Index | `fisioflow-clinical` — 768-dim cosine RAG |
| `EVENTS_PIPELINE` | Pipeline | Data warehouse streaming to R2 |
| `BACKGROUND_QUEUE` | Queue | Async task processing |
| `ORGANIZATION_STATE` | Durable Object | Realtime WebSocket per org |
| `PATIENT_AGENT` | Durable Object | Retention agent per patient |
| `ASSESSMENT_LIVE_SESSION` | Durable Object | Live assessment WebSocket proxy |
| `AI` | Workers AI | Model inference with gateway |
| `BROWSER` | Browser Rendering | PDF generation |
| `WORKFLOW_APPOINTMENT_REMINDER` | Workflow | D-3/D-1/D-0 reminders |
| `WORKFLOW_PATIENT_ONBOARDING` | Workflow | LGPD + onboarding flow |
| `WORKFLOW_NFSE` | Workflow | NFS-e emission |
| `WORKFLOW_HEP_COMPLIANCE` | Workflow | Home exercise monitoring |
| `WORKFLOW_DISCHARGE` | Workflow | Patient discharge + follow-up |
| `WORKFLOW_REENGAGEMENT` | Workflow | Inactive patient re-engagement |

### Routes and Domains

```toml
routes = [
  { pattern = "api-pro.moocafisio.com.br", custom_domain = true },
  { pattern = "api-paciente.moocafisio.com.br", custom_domain = true }
]
```

### Environment Variables (Production)

```toml
[vars]
ENVIRONMENT = "production"
IMAGE_TRANSFORMATIONS = "enabled"
R2_PUBLIC_URL = "https://media.moocafisio.com.br"
TURNSTILE_SITE_KEY = "0x4AAAAAAC813j31sbl6IHX3"
ALLOWED_ORIGINS = "https://moocafisio.com.br,..."

NEON_AUTH_URL = "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth"
NEON_AUTH_JWKS_URL = "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth/.well-known/jwks.json"
NEON_AUTH_ISSUER = "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech"
NEON_AUTH_AUDIENCE = "https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech"

VITE_HASURA_PROJECT_URL = "https://capital-duckling-42.hasura.app/v1/graphql"
AXIOM_ORG_ID = "activity-dbyc"
AXIOM_DATASET = "fisioflow-logs"
FISIOFLOW_AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/32156f9a72a32d1ece28ab74bcd398fb/fisioflow-gateway"
GOOGLE_AI_PREMIUM_ENABLED = "false"
```

### Secrets (set via `wrangler secret put`)

- `GOOGLE_AI_API_KEY`
- `NEON_URL`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- `VITE_HASURA_ADMIN_SECRET`
- `AXIOM_TOKEN`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `TURNSTILE_SECRET_KEY`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `FOCUS_NFE_TOKEN`

### Cron Triggers

```toml
[triggers]
crons = [
  "0 9 * * *",
  "0 11 * * *",
  "0 12 * * *",
]
```

| Schedule (UTC) | BRT | Handler |
|---|---|---|
| `0 9 * * *` | 06:00 | DB prewarm (`pg_prewarm`), appointment reminders (email + WhatsApp), birthday checks, inactive patient detection |
| `0 11 * * *` | 08:00 | DB cleanup (audit logs > 90 days), D1 rate limit cleanup |
| `0 12 * * *` | 09:00 | Task due-date automations (notifications, label assignment, status changes) |

### Durable Object Migrations

```toml
[[migrations]]
tag = "v6"
new_classes = ["PatientAgent"]

[[migrations]]
tag = "v7"
new_classes = ["AssessmentLiveSession"]
```

Tags v1-v5 are placeholders matching remote state.

### Observability

```toml
[observability]
enabled = true

[observability.logs]
head_sampling_rate = 1

[observability.traces]
enabled = true
head_sampling_rate = 1
```

## 2. R2 Object Storage (MEDIA_BUCKET)

Bucket: `fisioflow-media` (production), `fisioflow-media-staging` (staging)
Public URL: `https://media.moocafisio.com.br`

### Folder Structure

```
recordings/{appointmentId}/{timestamp}.webm
```

Additional folders follow the pattern: `orgs/{orgId}/patients/{patientId}/{type}/{filename}` where type is one of `images`, `videos`, `dicom`, `documents`, `audio`.

### R2Service (S3-Compatible Presigned URLs)

```typescript
import { R2Service } from './lib/storage/R2Service';

const r2 = new R2Service(env);

const uploadUrl = await r2.getUploadUrl('orgs/org123/exams/scan.dcm', 'application/dicom');

const downloadUrl = await r2.getDownloadUrl('recordings/apt456/1234567890.webm', 86400);

const recordingKey = r2.getRecordingKey('apt456');
```

### Direct Upload via Worker

```typescript
await env.MEDIA_BUCKET.put(key, audioBuffer, {
  httpMetadata: { contentType: 'audio/mpeg' },
  customMetadata: { organizationId: orgId, generated: 'tts' },
});
```

### File Types

- Images: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic` — processed via AI for clinical analysis
- Audio: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.webm` — transcribed via Deepgram Nova-3
- Video: `.webm` — telemedicine recordings
- DICOM: `.dcm` — scan storage

## 3. D1 Edge SQLite

### DB (fisioflow-db)

- `evolution_index` — search index for clinical evolution notes
- `feriados_nacionais` — Brazilian national holidays for scheduling

### EDGE_CACHE (fisioflow-edge-cache)

- `rate_limits` — per-org, per-endpoint atomic counters
- `query_cache` — generic query result caching at the edge

### Rate Limiting Pattern

```typescript
import { rateLimit } from './middleware/rateLimit';

app.post('/api/ai/soap', rateLimit({ limit: 50, windowSeconds: 3600, endpoint: 'ai' }), handler);

app.post('/api/auth/login', rateLimit({
  limit: 10,
  windowSeconds: 900,
  endpoint: 'auth',
  keyFn: (c) => c.req.header('cf-connecting-ip') ?? 'unknown',
}), handler);
```

D1 atomic upsert pattern:

```sql
INSERT INTO rate_limits (id, count, window_start)
VALUES (?, 1, ?)
ON CONFLICT(id) DO UPDATE SET count = count + 1
RETURNING count
```

Rate limit key format: `rl:{orgId|ip}:{endpoint}:{windowStart}`

Cleanup via cron (`src/cron.ts`):

```typescript
import { cleanupRateLimits } from './middleware/rateLimit';
const deleted = await cleanupRateLimits(env.EDGE_CACHE);
```

## 4. Hyperdrive (PostgreSQL Connection Pooling)

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "12b9fefcfbc04074a63342a9212e1b4f"
```

Connects to Neon PostgreSQL via pooler endpoint. Cache configured on the Hyperdrive resource:

```bash
wrangler hyperdrive update 12b9fefcfbc04074a63342a9212e1b4f --max-age 3600 --swr 300
```

Production: 1h cache, 5min stale-while-revalidate.
Staging: 1min cache, 15s SWR (`--max-age 60 --swr 15`).

Usage via `createPool`:

```typescript
import { createPool } from './lib/db';

const pool = createPool(env);
const result = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
```

## 5. Durable Objects

### ORGANIZATION_STATE (Realtime WebSocket Hub)

Class: `OrganizationState` (exported from `src/lib/realtime.ts`)
Namespace: `idFromName(organizationId)` — one DO instance per organization
Protocol: WebSocket at `/ws?userId={uid}&orgId={orgId}`
Purpose: Real-time notifications, presence tracking, live updates for all users in an org

Connection flow:

```typescript
const id = env.ORGANIZATION_STATE.idFromName(user.organizationId);
const obj = env.ORGANIZATION_STATE.get(id);
return obj.fetch(new Request(wsUrl.toString(), request));
```

### PATIENT_AGENT (Retention Agent)

Class: `PatientAgent` (exported from `src/agents/PatientAgent.ts`)
Extends: `Agent<Env, RetentionState>` from `agents` SDK
Namespace: One instance per patient
Purpose: Autonomous retention monitoring using Workers AI

State shape:

```typescript
type RetentionState = {
  patientId: string;
  patientName: string;
  missedSessions: number;
  lastPainLevel: number;
  riskScore: number;
  suggestedAction: string | null;
  draftMessage: string | null;
  status: "monitoring" | "at_risk" | "action_needed" | "recovered";
  settings: { autoDraft: boolean; sensitivity: "low" | "medium" | "high" };
};
```

Callable RPCs:
- `updateClinicalStatus({ painLevel?, missedSession?, name? })` — updates risk score, triggers draft generation if `action_needed`
- `generateRetentionDraft()` — generates personalized WhatsApp message via Llama 3.1 8B
- `dismissAction()` — resets state to monitoring

Risk scoring: `riskScore = (missedSessions * 30) + (painLevel > 7 ? 20 : 0)`, capped at 100.

### ASSESSMENT_LIVE_SESSION (Live Assessment Proxy)

Class: `AssessmentLiveSession` (exported from `src/agents/AssessmentLiveSession.ts`)
Implements: `DurableObject` (raw, not Agent SDK)
Purpose: Bidirectional WebSocket proxy between browser client and Gemini Live API for real-time clinical assessments

Protocol client → DO:

```typescript
{ type: "audio", data: base64, mimeType?: "audio/pcm;rate=16000" }
{ type: "text", text: string, turnComplete?: boolean }
{ type: "end_audio" }
{ type: "close" }
```

Protocol DO → client:

```typescript
{ type: "open" }
{ type: "text", text: string }
{ type: "audio", data: base64, mimeType: string }
{ type: "turn_complete" }
{ type: "error", message: string }
```

Uses `@google/genai` SDK with model `gemini-live-2.5-flash-preview`. Requires `GOOGLE_AI_API_KEY` secret. Opt-in via `GOOGLE_AI_PREMIUM_ENABLED = "true"`.

## 6. Queues (BACKGROUND_QUEUE)

```toml
[[queues.producers]]
queue = "fisioflow-background-tasks"
binding = "BACKGROUND_QUEUE"

[[queues.consumers]]
queue = "fisioflow-background-tasks"
max_batch_size = 10
max_batch_timeout = 30
max_retries = 3
dead_letter_queue = "fisioflow-tasks-dlq"
```

### Message Types

```typescript
type QueueTask =
  | { type: 'SEND_WHATSAPP'; payload: WhatsAppQueuePayload }
  | { type: 'R2_OBJECT_CREATED'; payload: R2NotificationPayload }
  | { type: 'PROCESS_EXAM'; payload: ExamProcessPayload }
  | { type: 'GENERATE_TTS'; payload: TTSPayload }
  | { type: 'TRIGGER_WORKFLOW'; payload: WorkflowTriggerPayload }
  | { type: 'PROCESS_BACKUP'; payload: Record<string, unknown> }
  | { type: 'CLEANUP_LOGS'; payload: Record<string, unknown> }
```

### Consumer Handler

```typescript
import { handleQueue } from './queue';

export default {
  queue: handleQueue,
};
```

Processing flow:
1. `SEND_WHATSAPP` — calls Meta WhatsApp Business API, logs to `whatsapp_messages` table, writes analytics
2. `R2_OBJECT_CREATED` — detects file type, enqueues `PROCESS_EXAM` for images/audio
3. `PROCESS_EXAM` — downloads from R2, runs AI (image analysis via Llama 4 Scout, audio transcription via Deepgram Nova-3), saves to `exam_ai_results`
4. `GENERATE_TTS` — calls Deepgram Aura-2 via Workers AI, stores audio in R2
5. `TRIGGER_WORKFLOW` — creates a Workflow instance by type
6. `PROCESS_BACKUP` / `CLEANUP_LOGS` — no-op placeholders

### Enqueueing

```typescript
await env.BACKGROUND_QUEUE.send({
  type: 'SEND_WHATSAPP',
  payload: { to, templateName: 'lembrete_sessao', languageCode: 'pt_BR', bodyParameters: [...], organizationId, patientId, messageText, appointmentId },
});
```

### DLQ

Failed messages after 3 retries go to `fisioflow-tasks-dlq`. Staging has separate queues with `-staging` suffix.

## 7. Workflows

All workflows extend `WorkflowEntrypoint<Env, Params>` from `cloudflare:workers`.

### Appointment Reminder

Binding: `WORKFLOW_APPOINTMENT_REMINDER`, Class: `AppointmentReminderWorkflow`
File: `src/workflows/appointmentReminder.ts`

Sends WhatsApp reminders at 3 touchpoints:
1. D-3: "Your appointment is in 3 days, please confirm"
2. D-1: "Your appointment is tomorrow"
3. D-0 (2h before): "Your appointment is in 2 hours"

Supports cancellation via `sendEvent('cancel')`. Each step uses `step.sleepUntil()` for precise timing.

```typescript
await env.WORKFLOW_APPOINTMENT_REMINDER.create({
  id: `reminder-${appointmentId}`,
  params: { appointmentId, patientPhone, patientName, therapistName, appointmentDate, organizationId },
});
```

### Patient Onboarding

Binding: `WORKFLOW_PATIENT_ONBOARDING`, Class: `PatientOnboardingWorkflow`
File: `src/workflows/patientOnboarding.ts`

1. Immediate WhatsApp welcome message
2. `waitForEvent('lgpd-confirmation', timeout: '7 days')` — awaits patient LGPD consent
3. If timeout → reminder message + another 7-day wait
4. If confirmed → activate patient record + notify therapist
5. Sleep 1 day → send booking link

### NFS-e Emission

Binding: `WORKFLOW_NFSE`, Class: `NFSeWorkflow`
File: `src/workflows/nfseWorkflow.ts`

1. Generate RPS XML (ABRASF standard, Sao Paulo municipality code 3550308)
2. POST to prefeitura SOAP endpoint
3. Parse response for NFS-e number and protocol
4. Update `nfse` table status
5. If processing → `waitForEvent('nfse-confirmation', timeout: '30 minutes')`
6. If timeout → mark as `pendente_revisao` for manual review

### HEP Compliance

Binding: `WORKFLOW_HEP_COMPLIANCE`, Class: `HEPComplianceWorkflow`
File: `src/workflows/hepCompliance.ts`

Weekly loop for `durationWeeks`:
1. Sleep 7 days (except first iteration)
2. Query `exercise_completions` for weekly adherence rate
3. If < 60% → motivational WhatsApp message
4. If >= 80% → congratulations message (gamification)
5. Final step → average adherence report + analytics event

### Patient Discharge

Binding: `WORKFLOW_DISCHARGE`, Class: `PatientDischargeWorkflow`
File: `src/workflows/dischargeWorkflow.ts`

1. D+0: discharge message + satisfaction survey link
2. Sleep 7 days → check if survey answered, send reminder if not
3. Sleep 23 days (D+30) → follow-up WhatsApp message
4. `waitForEvent('archive-approved', timeout: '60 days')` — therapist approval
5. Archive patient record (status = 'alta')

### Patient Re-engagement

Binding: `WORKFLOW_REENGAGEMENT`, Class: `PatientReengagementWorkflow`
File: `src/workflows/reengagementWorkflow.ts`

Progressive 3-attempt re-engagement:
1. D+0: friendly "we miss you" message → `waitForEvent('appointment-booked', timeout: '7 days')`
2. D+7: flexible scheduling offer → `waitForEvent('appointment-booked', timeout: '8 days')`
3. D+15: escalate to human — creates high-priority task for reception + analytics event
4. D+30: if still no booking → mark patient as `inativo`

## 8. Vectorize (CLINICAL_KNOWLEDGE)

```toml
[[vectorize]]
binding = "CLINICAL_KNOWLEDGE"
index_name = "fisioflow-clinical"
```

Created with: `wrangler vectorize create fisioflow-clinical --dimensions=768 --metric=cosine`

Embedding model: `@cf/baai/bge-base-en-v1.5` (768 dimensions)

### Embedding Generation

```typescript
import { generateEmbedding, generateTurboSketch } from './lib/ai-native';

const embedding = await generateEmbedding(env, textContent);
const sketch = generateTurboSketch(embedding);
```

### Upsert Pattern

```typescript
await env.CLINICAL_KNOWLEDGE.upsert([
  { id: `article-${articleId}`, values: embedding, metadata: { orgId, title, type } },
]);
```

### Query Pattern (RAG)

```typescript
const results = await env.CLINICAL_KNOWLEDGE.query(embedding, {
  topK: 5,
  filter: { orgId: organizationId },
});
```

### TurboQuant

`@fisioflow/core` provides `TurboQuant` for compressing embeddings into compact sketches (hex strings) stored in Postgres for O(1) offline similarity search.

## 9. Workers AI + AI Gateway

### Gateway Configuration

Gateway name: `fisioflow-gateway`
Gateway URL: `https://gateway.ai.cloudflare.com/v1/32156f9a72a32d1ece28ab74bcd398fb/fisioflow-gateway`

All AI calls route through the gateway for logging, caching, and rate limiting:

```typescript
import { runAi } from './lib/ai-native';

const response = await runAi(env, model, input, { cache: true, cacheTtl: 3600 });
```

### Model Routing

| Model | Purpose | Cache |
|---|---|---|
| `@cf/deepgram/nova-3` | Audio transcription (pt-BR), fallback: `@cf/openai/whisper-large-v3-turbo` | Never |
| `@cf/deepgram/aura-2-es` | Text-to-speech for exercise audio | 24h |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Clinical note summarization, SOAP notes | Never |
| `@cf/meta/llama-3.1-8b-instruct` | Fast SOAP suggestions, retention drafts | Never |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | Clinical image analysis (multimodal vision) | Never |
| `@cf/meta/llama-guard-3-8b` | Content moderation | 5min |
| `@cf/baai/bge-base-en-v1.5` | Text embeddings for Vectorize | 24h |
| `gemini-live-2.5-flash-preview` | Real-time live assessments via DO | Never |

### Session Affinity (Prompt Caching)

```typescript
await runAi(env, model, input, { sessionId: 'user-123-session' });
```

Sets `x-session-affinity` header to route to same GPU instance, maximizing prompt cache hits for multi-turn conversations.

### AI Search (AutoRAG)

Available via `env.AI.autorag(indexName).aiSearch()`:

```typescript
const results = await env.AI.autorag('fisioflow-knowledge').aiSearch({
  query: patientQuestion,
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  rewrite_query: true,
  max_num_results: 5,
  ranking_options: { score_threshold: 0.7 },
  reranking: { enabled: true },
});
```

## 10. Deploy Commands

### Initial Setup

```bash
wrangler r2 bucket create fisioflow-media
wrangler vectorize create fisioflow-clinical --dimensions=768 --metric=cosine
wrangler hyperdrive create fisioflow-neon --connection-string="postgresql://..."
```

### Secrets

```bash
wrangler secret put GOOGLE_AI_API_KEY
wrangler secret put NEON_URL
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
wrangler secret put WHATSAPP_ACCESS_TOKEN
wrangler secret put WHATSAPP_VERIFY_TOKEN
wrangler secret put WHATSAPP_APP_SECRET
wrangler secret put VITE_HASURA_ADMIN_SECRET
wrangler secret put AXIOM_TOKEN
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put INNGEST_EVENT_KEY --env staging
```

### Deploy

```bash
wrangler deploy
wrangler deploy --env staging
```

### Hyperdrive Cache

```bash
wrangler hyperdrive update 12b9fefcfbc04074a63342a9212e1b4f --max-age 3600 --swr 300
wrangler hyperdrive update 37189eb42d314a0a8fd0e169a2b27ad1 --max-age 60 --swr 15
```

### D1 Operations

```bash
wrangler d1 execute fisioflow-db --command "SELECT * FROM feriados_nacionais LIMIT 5"
wrangler d1 execute fisioflow-edge-cache --command "SELECT * FROM rate_limits LIMIT 10"
```

### Vectorize Operations

```bash
wrangler vectorize list-indexes
wrangler vectorize query fisioflow-clinical --text "exercicios ombro" --model @cf/baai/bge-base-en-v1.5
```

### Observability

```bash
wrangler tail
wrangler tail --env staging
```

### Local Development

```bash
wrangler dev
wrangler dev --env staging
```

## Analytics Engine

Dataset: `fisioflow_events`

```typescript
import { writeEvent } from './lib/analytics';

writeEvent(env, {
  route: '/api/appointments',
  method: 'POST',
  status: 201,
  orgId: organizationId,
  event: 'appointment_booked',
  latencyMs: 150,
});
```

Query via Analytics Engine SQL API:

```sql
SELECT blob1 AS route, count() AS requests, quantileWeighted(0.95)(double1, 1) AS p95_ms
FROM fisioflow_events
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY blob1
ORDER BY requests DESC
```

## Pipelines

```toml
[[pipelines]]
binding = "EVENTS_PIPELINE"
pipeline = "701aff68d26e4c45a29f090389bcd4f2"
```

Streams events to R2 as Iceberg format for data warehousing.

```typescript
await env.EVENTS_PIPELINE?.send([{ event: 'patient_created', orgId, timestamp: Date.now() }]);
```

## KV (FISIOFLOW_CONFIG)

Namespace ID: `4284b33fa7ed40b6bc9c59b6041c03ed`

Used for global configuration values, feature flags, and cached settings that rarely change.

```typescript
await env.FISIOFLOW_CONFIG?.put('feature:ai-tutor', 'enabled');
const flag = await env.FISIOFLOW_CONFIG?.get('feature:ai-tutor');
```
