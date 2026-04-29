# Research: Cloudflare Platform Roadmap for FisioFlow

## Sources Consulted

- GitHub Spec Kit README, Get Started section: install/use flow for `specify`, `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement`.
- Cloudflare Workers Logs documentation: observability settings and head-based sampling.
- Cloudflare Workers Traces documentation: trace enablement and `head_sampling_rate`.
- Cloudflare Workers Static Assets documentation: SPA `not_found_handling` and `run_worker_first` routing behavior.
- Cloudflare Workers Placement documentation: Smart Placement use cases and limitation that it affects fetch handlers.
- Local FisioFlow files: `apps/api/wrangler.toml`, `wrangler.toml`, `apps/api/src/index.ts`, `apps/api/src/types/env.ts`, `apps/api/src/cron.ts`, `apps/api/src/lib/analytics.ts`, `apps/web/src/asset-worker.ts`.

## Current State Findings

### API Worker

The API Worker is configured in `apps/api/wrangler.toml` and uses Hono in `apps/api/src/index.ts`. It already has:

- Hyperdrive for Neon Postgres.
- R2 media storage.
- KV config/monitor state.
- D1 databases for primary edge data and edge cache/rate limits.
- Analytics Engine.
- Vectorize for clinical knowledge.
- Pipelines for event ingestion.
- Workflows for reminders, onboarding, NFS-e, HEP, discharge, reengagement, and digital twin.
- Durable Objects for organization realtime, patient agent, and assessment live session.
- Workers AI and Browser Rendering.
- Queue producer/consumer with DLQ.
- Cron triggers, including a minute-level health monitor.
- Turnstile middleware and D1 rate-limit middleware.

### Web Asset Worker

The root `wrangler.toml` serves `apps/web/dist` through Workers Static Assets with a custom `apps/web/src/asset-worker.ts`. The worker manually implements SPA fallback and protects missing assets from being rewritten to the app shell.

### Observability

Workers logs and traces are configured at 100% sampling in `apps/api/wrangler.toml`. Analytics Engine custom metrics are written by `apps/api/src/lib/analytics.ts`, normalizing paths and recording route, method, org ID, event type, latency, and status.

### Security and Compliance

The platform already has secure headers, CORS allowlist, auth middleware, Turnstile middleware, rate limiting, audit logging, webhook code, and LGPD-oriented security UI/features. The improvement area is consistency and coverage across route categories.

## Decisions

### Decision 1: Treat environment isolation as the MVP

**Decision**: The first implementable slice is staging/production isolation for Cloudflare resources.

**Rationale**: Shared staging and production resources create the highest risk for PHI contamination, misleading analytics, and unsafe experiments.

**Alternatives Considered**:

- Start with AI or NFS-e features: higher product visibility, but would build on unclear environment boundaries.
- Start with dashboards: useful, but metrics are less trustworthy if staging/prod are mixed.

### Decision 2: Keep Analytics Engine and reduce Workers log/trace sampling

**Decision**: Preserve custom Analytics Engine metrics while reducing production Workers logs/traces sampling.

**Rationale**: Analytics Engine provides structured route-level business/technical metrics. Cloudflare logs/traces at 100% can become noisy and costly at production scale.

**Alternatives Considered**:

- Disable traces entirely: reduces volume but loses debugging value.
- Keep 100% sampling: simpler but not cost/noise conscious.

### Decision 3: Use a protection matrix before adding more middleware

**Decision**: Document route categories and required controls before changing middleware broadly.

**Rationale**: The API has many route modules. A matrix avoids inconsistent protection and helps review PHI/high-cost routes intentionally.

**Alternatives Considered**:

- Add global strict rate limits: could break legitimate users and webhooks.
- Patch only known endpoints: faster but leaves unknown gaps.

### Decision 4: Model DLQ replay as an operator workflow

**Decision**: DLQ replay should be designed as an authenticated, idempotent operator workflow, not a raw queue resend tool.

**Rationale**: Queue payloads may trigger patient communication, invoice actions, AI processing, or storage writes. Replay must avoid duplicate side effects.

**Alternatives Considered**:

- Manual Cloudflare dashboard replay only: less code, but weaker business context and auditability.
- Automatic replay forever: unsafe for poison messages and duplicate communications.

### Decision 5: Keep Static Assets Worker but simplify where Cloudflare can handle SPA fallback

**Decision**: Evaluate `not_found_handling = "single-page-application"` and selective `run_worker_first`, but preserve explicit 404 behavior for missing asset files.

**Rationale**: Cloudflare Static Assets can handle SPA fallback natively, but the current worker protects asset 404 semantics. Any simplification must keep that behavior.

### Decision 6: Add R2 governance before expanding media-heavy features

**Decision**: Define storage classes, signed URL TTLs, metadata, retention, and lifecycle before adding more clinical media/AI artifact flows.

**Rationale**: R2 contains sensitive clinical data and generated documents. Governance reduces long-term LGPD risk.

### Decision 7: Treat AI Search/AutoRAG as an experiment after Vectorize governance

**Decision**: First ensure Vectorize separation and AI Gateway metrics; then test AI Search/AutoRAG for wiki/protocol/exercise knowledge.

**Rationale**: Existing Vectorize code is already integrated. Managed retrieval may help, but should be evaluated against quality, cost, tenant isolation, and data controls.

## Open Questions

- Which Cloudflare paid features are enabled on the production account today?
- Are Cloudflare Health Checks/Notifications preferred over the current ntfy-based monitor?
- What retention periods should apply to each R2 storage class under the clinic's LGPD/legal policy?
- Should DLQ replay be exposed through an admin route, internal script, or Cloudflare dashboard runbook first?
- Which AI providers must be routed through AI Gateway in the first iteration?
