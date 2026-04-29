# Data Model: Cloudflare Platform Roadmap for FisioFlow

This feature is primarily infrastructure and governance. The model below defines planning and operational records rather than new application tables by default.

## CloudflareEnvironment

Represents one deployment environment.

**Fields**

- `name`: `production`, `staging`, or `development`.
- `workerName`: Cloudflare Worker name.
- `routes`: custom domains or workers.dev URLs.
- `vars`: non-secret environment variables.
- `secrets`: secret names required; values are never documented.
- `bindings`: list of `CloudflareBinding`.
- `observabilityPolicy`: related `ObservabilityPolicy`.

**Relationships**

- Has many `CloudflareBinding`.
- Has one `ObservabilityPolicy`.

## CloudflareBinding

Represents one Worker binding in Wrangler.

**Fields**

- `bindingName`: e.g. `MEDIA_BUCKET`, `EDGE_CACHE`, `CLINICAL_KNOWLEDGE`.
- `bindingType`: Hyperdrive, R2, KV, D1, Analytics Engine, Vectorize, Pipeline, Workflow, Queue, Durable Object, AI, Browser, mTLS.
- `resourceName`: Cloudflare resource name.
- `resourceId`: Cloudflare resource ID where applicable.
- `environment`: owning `CloudflareEnvironment`.
- `containsPHI`: boolean.
- `dataBearing`: boolean.
- `provisioningStatus`: planned, created, bound, validated.

**Validation Rules**

- A staging `dataBearing` binding must not share the same resource ID/name as production unless explicitly classified as non-PHI and approved.
- Secrets must be referenced by name only.

## RouteProtectionRule

Represents required protections for a route category.

**Fields**

- `routePattern`: normalized route or category.
- `category`: auth, public-booking, webhook, AI, upload, billing, media, admin, patient-portal.
- `requiresAuth`: boolean.
- `requiresTurnstile`: boolean.
- `rateLimitPolicy`: limit/window/key strategy.
- `requiresSignature`: provider signature rule when applicable.
- `corsPolicy`: allowed origin class.
- `auditEvent`: event name to emit.
- `analyticsEvent`: event name/dimensions to emit.

## ObservabilityPolicy

Represents logging, tracing, metrics, and alerting behavior.

**Fields**

- `environment`: production/staging.
- `logsSamplingRate`: number from 0 to 1.
- `tracesSamplingRate`: number from 0 to 1.
- `analyticsDimensions`: route, method, status, org ID, event, latency, value.
- `alertRules`: health, error-rate, latency, DLQ, workflow failure.
- `retentionNotes`: Cloudflare/account limits and export needs.

## StorageClassPolicy

Represents governance for a class of R2 objects.

**Fields**

- `className`: clinical-document, image, video, dicom, audio, telemedicine-recording, danfse, ai-temporary-artifact, public-exercise-media.
- `keyPrefix`: canonical R2 key prefix.
- `metadata`: required object metadata fields.
- `signedUrlTtlSeconds`: maximum signed URL duration.
- `retentionPolicy`: retain, expire, archive, or legal-hold.
- `containsPHI`: boolean.
- `auditRequired`: boolean.

## BackgroundTaskRecord

Represents an observable queue/workflow task for operations.

**Fields**

- `taskId`: generated UUID or provider/workflow instance ID.
- `taskType`: SEND_WHATSAPP, PROCESS_R2_EVENT, AI_PROCESSING, TRIGGER_WORKFLOW, NFS_E, etc.
- `organizationId`: tenant scope when available.
- `entityRefs`: patient, appointment, invoice, media, workflow references as safe identifiers.
- `status`: queued, processing, succeeded, failed, dead-lettered, replayed.
- `attemptCount`: number.
- `lastErrorClass`: redacted error category.
- `idempotencyKey`: stable replay guard.
- `createdAt`, `updatedAt`.

**Validation Rules**

- Payload views must redact PHI by default.
- Replay must require authorization and an idempotency key.

## AIRetrievalResource

Represents a retrieval/search resource.

**Fields**

- `resourceType`: Vectorize, AI Search, AutoRAG.
- `environment`: production/staging.
- `contentDomain`: clinical, wiki, protocols, exercises.
- `indexName`: resource name.
- `embeddingModel`: model used, if applicable.
- `dimensions`: vector dimensions where applicable.
- `tenantIsolationMode`: metadata filter, per-tenant namespace, or per-environment only.
- `costPolicy`: gateway, per-org limit, fallback.

## State Transitions

### Binding Provisioning

`planned -> created -> bound -> dry-run-validated -> staging-validated -> production-approved`

### Background Task

`queued -> processing -> succeeded`

`queued -> processing -> failed -> queued`

`queued -> processing -> failed -> dead-lettered -> replayed -> queued`

### R2 Object Governance

`uploaded -> classified -> available-via-signed-url -> retained`

`uploaded -> classified -> temporary -> expired`
