# Feature Specification: Cloudflare Platform Roadmap for FisioFlow

**Feature Branch**: `cloudflare-platform-roadmap`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Use GitHub Spec Kit and create a complete plan for what we can improve or implement with Cloudflare."

## User Scenarios & Testing

### User Story 1 - Separate production and staging Cloudflare data paths (Priority: P1)

As the platform owner, I want Cloudflare staging resources to be isolated from production resources so that tests, embeddings, analytics events, and operational experiments cannot pollute clinical production data.

**Why this priority**: The current Wrangler configuration already separates many bindings, but staging still references production-like shared Cloudflare resources in places such as Vectorize and Pipelines. This is the highest privacy and operational safety risk.

**Independent Test**: Deploy or dry-run the staging Worker and verify every data-bearing binding points to a staging-specific resource, while production keeps production-specific resource IDs.

**Acceptance Scenarios**:

1. **Given** the staging environment, **When** the Worker is deployed, **Then** Vectorize, Pipeline, Analytics Engine, D1, R2, KV, Queues, and Hyperdrive bindings must resolve to staging resources.
2. **Given** a test semantic-search or event-ingestion operation in staging, **When** it writes data, **Then** no production index, bucket, dataset, queue, or pipeline receives the write.
3. **Given** production deployment, **When** bindings are checked, **Then** production resources remain unchanged and do not point to staging resources.

---

### User Story 2 - Control observability cost and signal quality (Priority: P1)

As the operator, I want Cloudflare logs, traces, custom analytics, and alerts to be sampled and structured by environment so that production remains observable without unnecessary cost or noise.

**Why this priority**: The API Worker currently enables Workers logs and traces at 100% sampling. Cloudflare documentation recommends sampling for high-traffic workloads to control volume while preserving meaningful insight.

**Independent Test**: Inspect deployed Wrangler configuration and generate API traffic to confirm production samples logs/traces at the configured rates while Analytics Engine keeps route-level metrics.

**Acceptance Scenarios**:

1. **Given** production traffic, **When** logs and traces are collected, **Then** sampling is lower than 100% unless an explicit incident override is active.
2. **Given** staging traffic, **When** engineers debug a change, **Then** staging can keep higher sampling for diagnosis.
3. **Given** an API route with elevated error rate or latency, **When** metrics are queried, **Then** the operator can identify route, method, status, organization scope when available, and p95 latency.

---

### User Story 3 - Harden public and sensitive Cloudflare entry points (Priority: P1)

As a security-conscious clinic operator, I want public booking, auth, AI, upload, webhook, and billing/NFS-e routes protected with Cloudflare-native controls so that abuse, bot traffic, and accidental exposure are reduced.

**Why this priority**: FisioFlow handles PHI/LGPD data. Turnstile and D1-based rate limits already exist, but protection should be consistently mapped across public and high-cost routes.

**Independent Test**: Run targeted requests against public/sensitive endpoints and verify Turnstile, rate limits, CORS, secure headers, webhook validation, and audit events behave as expected.

**Acceptance Scenarios**:

1. **Given** unauthenticated traffic to public booking or signup, **When** the request lacks a valid Turnstile token, **Then** the request is rejected.
2. **Given** repeated login, reset-password, AI, upload, or webhook attempts, **When** limits are exceeded, **Then** the API returns a rate-limit response and records a security/analytics signal.
3. **Given** a WhatsApp or external webhook request, **When** the provider signature is invalid, **Then** the request is rejected without writing business data.

---

### User Story 4 - Make NFS-e emission production-ready on Cloudflare (Priority: P2)

As the finance operator, I want direct NFS-e emission through Cloudflare Workers to use the correct mTLS certificate binding and secrets so that invoice issuance can run without manual fallback services.

**Why this priority**: Code references an `NFSE_SP_CERT` mTLS binding and PEM secrets, but the current Wrangler config does not show the binding. Without this, direct São Paulo NFS-e emission remains partially configured.

**Independent Test**: Validate the binding exists in the Cloudflare environment and run homologation emission, status check, DANFSe generation, and R2 storage for one draft invoice.

**Acceptance Scenarios**:

1. **Given** homologation credentials and certificate, **When** a draft NFS-e is sent, **Then** the Worker uses the mTLS binding and records the provider response.
2. **Given** an authorized NFS-e, **When** DANFSe is generated, **Then** the PDF is stored in R2 with tenant-scoped metadata and can be accessed through a signed URL.
3. **Given** missing certificate configuration, **When** sending is attempted, **Then** the API returns an actionable configuration error and does not mark the invoice as emitted.

---

### User Story 5 - Operationalize queues, workflows, and replay (Priority: P2)

As the support/operator team, I want background jobs, workflows, and dead-letter messages to be visible and recoverable so that failed WhatsApp, AI, R2, NFS-e, and patient automation tasks can be diagnosed and replayed safely.

**Why this priority**: Queues and Workflows are already configured. The next value is operational control: failed tasks need traceability, safe retry, and business context.

**Independent Test**: Force a background task failure, verify it reaches the dead-letter queue, inspect the payload, replay it with authorization, and confirm idempotency.

**Acceptance Scenarios**:

1. **Given** a queue task fails after retries, **When** it reaches DLQ, **Then** an operator can identify task type, organization, patient/appointment context when present, error, and retry count.
2. **Given** an authorized operator, **When** they replay a DLQ item, **Then** the task is re-enqueued with an idempotency key.
3. **Given** a workflow instance, **When** status is requested, **Then** status, error, timestamps, and business entity references are visible without exposing unnecessary PHI.

---

### User Story 6 - Improve frontend asset delivery with Workers Static Assets (Priority: P2)

As a FisioFlow user, I want the app shell and static assets to load reliably and quickly through Cloudflare so that navigation refreshes, deep links, and cached assets work predictably.

**Why this priority**: The web asset Worker already exists, but the config can better use Cloudflare Static Assets SPA handling and selective Worker execution to reduce unnecessary invocations.

**Independent Test**: Load known assets, unknown asset paths, and SPA deep links in staging and confirm correct status codes, cache behavior, and app-shell fallback.

**Acceptance Scenarios**:

1. **Given** a SPA route, **When** the browser refreshes it, **Then** the app shell loads successfully.
2. **Given** a missing static asset with an extension, **When** it is requested, **Then** the response remains a 404 instead of returning the app shell.
3. **Given** a valid hashed asset, **When** it is requested repeatedly, **Then** Cloudflare serves it through static asset caching without unnecessary Worker-first processing.

---

### User Story 7 - Establish Cloudflare governance for PHI/LGPD storage (Priority: P3)

As the compliance owner, I want R2 object lifecycle, signed URL rules, retention classes, and audit signals documented and implemented so that clinical media, documents, recordings, and invoices follow privacy-by-default policies.

**Why this priority**: R2 stores sensitive media and documents. Governance can be delivered after the highest risk environment/security work, but it is essential for long-term compliance.

**Independent Test**: Upload representative objects in each storage class and verify prefix, metadata, signed URL duration, audit event, lifecycle policy, and deletion/retention behavior.

**Acceptance Scenarios**:

1. **Given** a clinical document upload, **When** it is stored in R2, **Then** the object key and metadata include tenant scope and content class without exposing unnecessary identifiers publicly.
2. **Given** a temporary AI-processing artifact, **When** its retention window expires, **Then** lifecycle policy removes it.
3. **Given** a user accesses a protected file, **When** a signed URL is generated, **Then** the URL expires within the policy limit and the access is auditable.

---

### User Story 8 - Expand Cloudflare AI platform usage safely (Priority: P3)

As the clinical intelligence team, I want AI Gateway, Vectorize, and optionally AI Search/AutoRAG to be governed by tenant-aware limits and evaluation criteria so that AI features improve without uncontrolled cost or data leakage.

**Why this priority**: AI features and Vectorize already exist. The next step is safer cost controls, evals, and gradual adoption of managed retrieval where it helps.

**Independent Test**: Run AI search/analysis flows under production-like limits and verify gateway metrics, tenant limits, retrieval quality, and fallback behavior.

**Acceptance Scenarios**:

1. **Given** an AI request, **When** it is executed, **Then** it flows through the configured gateway/registry path with metrics and per-org controls.
2. **Given** staging RAG tests, **When** documents are indexed, **Then** they use staging-only indexes and never production clinical indexes.
3. **Given** an AI provider error, **When** fallback is available, **Then** the system returns a controlled response and records the failure.

### Edge Cases

- Cloudflare resource creation may require account permissions not available locally; tasks must separate code/config changes from dashboard/CLI provisioning.
- Some Cloudflare features may be paid, beta, or account-gated; each item must be validated before implementation.
- Production secrets must never be committed to the repository.
- Health checks must not create recursive alert storms or alert on transient single-request failures.
- Staging may intentionally use lower capacity but must not share PHI-bearing resources with production.
- Webhook retries from providers may duplicate events; replay and queue handling must be idempotent.
- Deep links should return the SPA shell, while missing assets should remain real 404s.

## Requirements

### Functional Requirements

- **FR-001**: The roadmap MUST inventory all current Cloudflare bindings in `apps/api/wrangler.toml` and the root `wrangler.toml`.
- **FR-002**: The system MUST isolate staging and production data-bearing Cloudflare resources, including Vectorize and Pipelines.
- **FR-003**: Production Workers logs and traces MUST use explicit sampling values appropriate for production traffic, while staging may keep higher sampling.
- **FR-004**: Analytics Engine route metrics MUST remain available for latency, status, route, method, event type, and organization-scoped analysis when organization context exists.
- **FR-005**: Public and sensitive routes MUST have a documented protection matrix covering auth, Turnstile, rate limiting, CORS, signature verification, and audit/analytics events.
- **FR-006**: NFS-e direct emission MUST include Cloudflare mTLS binding configuration, required secrets, homologation validation, and R2 DANFSe storage validation.
- **FR-007**: Queue and Workflow operations MUST have an operator-facing replay/status design before any replay endpoint is implemented.
- **FR-008**: DLQ replay MUST include authorization, idempotency, audit logging, and payload redaction rules.
- **FR-009**: R2 media governance MUST define object prefixes, content classes, metadata, signed URL TTLs, retention/lifecycle policies, and audit signals.
- **FR-010**: Static asset delivery MUST preserve SPA deep-link fallback and real 404 behavior for missing asset files.
- **FR-011**: AI Gateway and Vectorize usage MUST include environment separation, tenant-aware limits, cost metrics, and fallback behavior.
- **FR-012**: The plan MUST include validation commands or manual checks for each Cloudflare improvement area.
- **FR-013**: The plan MUST avoid exposing secrets or PHI in logs, analytics blobs, traces, queue payloads, and documentation.
- **FR-014**: All implementation tasks MUST be grouped into independently testable increments following Spec Kit conventions.

### Key Entities

- **Cloudflare Environment**: A deploy target such as production or staging with its own variables, resource bindings, secrets, routes, and observability settings.
- **Binding Inventory**: A structured list of configured Workers bindings and their intended resource ownership by environment.
- **Protection Matrix**: A route-category map describing auth, Turnstile, rate limit, CORS, signature, and audit requirements.
- **Observability Policy**: Sampling rates, metric dimensions, alerting rules, and dashboards/queries used to monitor the platform.
- **Storage Class**: A category of R2 object such as clinical document, media, DICOM, telemedicine recording, DANFSe, temporary AI artifact, or public exercise media.
- **Background Task**: A Queue message or Workflow instance with task type, business context, retries, status, idempotency, and audit state.
- **AI Retrieval Index**: A Vectorize or AI Search/AutoRAG resource scoped by environment and content domain.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of staging Cloudflare data-bearing bindings are distinct from production before staging is used for PHI-like test data.
- **SC-002**: Production logs and traces have explicit sampling below 100% unless an incident override is documented.
- **SC-003**: At least 95% of API requests can be grouped by normalized route, method, status, and latency in Analytics Engine.
- **SC-004**: All public and high-cost route categories have documented protections and tests/checks before rollout.
- **SC-005**: NFS-e homologation can issue, consult, store DANFSe in R2, and return a signed URL without manual intervention.
- **SC-006**: A failed background task can be identified and safely replayed in staging without duplicate business side effects.
- **SC-007**: SPA deep-link refresh succeeds while missing asset URLs still return 404.
- **SC-008**: R2 storage classes have documented retention and signed URL TTLs approved for LGPD/PHI handling.
- **SC-009**: AI requests have visible gateway metrics and environment-specific retrieval indexes.

## Assumptions

- The project continues using Cloudflare Workers for API and web asset delivery.
- Neon remains the primary relational database, with Hyperdrive used by the API Worker.
- Existing Hono routes, middleware, Queues, Workflows, Durable Objects, R2, D1, KV, Analytics Engine, and Vectorize code should be improved incrementally rather than replaced.
- Cloudflare account access is available for creating staging resources, mTLS bindings, dashboards, and lifecycle policies.
- Production rollout should be gated by staging validation and `wrangler deploy --dry-run --env production`.
- This spec defines planning and implementation scope; it does not directly create Cloudflare resources or change production runtime behavior.
