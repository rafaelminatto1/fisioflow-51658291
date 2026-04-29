# Implementation Plan: Cloudflare Platform Roadmap for FisioFlow

**Branch**: `cloudflare-platform-roadmap` | **Date**: 2026-04-28 | **Spec**: `specs/cloudflare-platform-roadmap/spec.md`  
**Input**: Feature specification from `specs/cloudflare-platform-roadmap/spec.md`

## Summary

Create an incremental Cloudflare platform roadmap for FisioFlow that first removes environment-mixing risk, then improves observability and security, then operationalizes NFS-e, queues/workflows, static assets, R2 governance, and AI platform controls. The implementation should keep the existing Workers/Hono architecture and improve configuration, validation, and operational workflows in small, independently testable slices.

## Technical Context

**Language/Version**: TypeScript, Node.js >=22.12.0, Cloudflare Workers compatibility date 2026-03-25  
**Primary Dependencies**: Hono, Wrangler 4.85.0, Cloudflare Workers types, Drizzle/Kysely/Postgres clients, Neon, Cloudflare Workers AI/Vectorize/R2/D1/KV/Queues/Workflows/Durable Objects/Analytics Engine  
**Storage**: Neon PostgreSQL via Hyperdrive; R2 for media/DANFSe; D1 for edge cache and rate limits; KV for config/monitor state; Vectorize for clinical search  
**Testing**: `pnpm --filter @fisioflow/api type-check`, `pnpm --filter @fisioflow/api test`, `pnpm build`/`wrangler deploy --dry-run --env staging|production`, targeted staging smoke checks, Cloudflare dashboard/CLI verification  
**Target Platform**: Cloudflare Workers API, Cloudflare Workers Static Assets web Worker, Cloudflare account resources in production and staging  
**Project Type**: Brownfield infrastructure/platform roadmap for a healthcare SaaS monorepo  
**Performance Goals**: Maintain low-latency API operation; keep production logs/traces useful while reducing event volume; preserve fast SPA asset delivery; avoid added latency on hot routes except where security checks are required  
**Constraints**: LGPD/PHI privacy by default; no secrets in repo; staging must not write to production data-bearing resources; paid/beta Cloudflare features require account validation; production changes must be independently deployable and reversible  
**Scale/Scope**: FisioFlow API Worker with dozens of route modules, multi-tenant clinical data, WhatsApp/NFS-e/AI/telemedicine/background automation workloads

## Constitution Check

- **Spec-Driven by Default**: Pass. This feature adds `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, and `tasks.md`.
- **Multi-plataforma Consistency**: Pass. The plan focuses on API Worker and web assets while respecting the monorepo structure.
- **Privacy & Compliance First**: Pass. Environment separation, PHI-safe logging, R2 governance, and DLQ redaction are explicit.
- **Test-First and Incremental Delivery**: Pass. Each user story has independent validation and the task list is grouped by deliverable slices.
- **Observability and Security**: Pass. Observability sampling, Analytics Engine queries, route protection, and audit signals are core workstreams.

## Project Structure

### Documentation (this feature)

```text
specs/cloudflare-platform-roadmap/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── operational-checks.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/api/
├── wrangler.toml
├── src/
│   ├── index.ts
│   ├── cron.ts
│   ├── queue.ts
│   ├── types/env.ts
│   ├── middleware/
│   ├── lib/
│   ├── routes/
│   └── workflows/

apps/web/
└── src/asset-worker.ts

wrangler.toml
```

**Structure Decision**: Keep the current Cloudflare split: API Worker under `apps/api` and frontend asset Worker at the repository root config pointing to `apps/web`. Add documentation in `specs/cloudflare-platform-roadmap/`. Future implementation should touch only the Cloudflare config and related API/web infrastructure files needed by each task.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Multiple Cloudflare products in one roadmap | The existing platform already uses Workers, Hyperdrive, R2, D1, KV, Vectorize, Queues, Workflows, Durable Objects, Analytics Engine, Pipelines, AI, Browser Rendering, and Static Assets | A single-product plan would miss cross-cutting production risks such as environment isolation, PHI-safe logs, and replay safety |
| Operational docs before code changes | Cloudflare provisioning and paid/account-gated features require human/account validation | Editing code first could create config drift or production deploy failures |

## Implementation Approach

1. **Inventory and safety baseline**: Create a binding matrix for production and staging; identify shared data-bearing resources; decide resource names/IDs for missing staging resources.
2. **Configuration hardening**: Update Wrangler environment separation, observability sampling, health monitor configurability, and static assets behavior in small PRs.
3. **Security matrix**: Map public/sensitive routes to protection requirements; add missing middleware/tests per route category.
4. **Operational workflows**: Add NFS-e mTLS binding support, DLQ replay/status design, workflow status checks, and audit-safe operator actions.
5. **Governance and AI**: Define R2 lifecycle policies and AI Gateway/Vectorize/AI Search controls; implement only after account validation.

## Validation Strategy

- Run `pnpm --filter @fisioflow/api type-check` after any API Worker TypeScript changes.
- Run `pnpm --filter @fisioflow/api test` for middleware/routes/queue/workflow changes.
- Run `pnpm build` or `pnpm --filter @fisioflow/api build` to execute Wrangler dry-run for production when appropriate.
- Use `wrangler deploy --dry-run --env staging` and `wrangler deploy --dry-run --env production` for config changes.
- Validate staging through real Cloudflare bindings before production rollout.
- Keep production rollout behind explicit resource and secret checks.

## Rollout Order

1. Staging resource isolation and binding inventory.
2. Observability sampling and health monitor parameterization.
3. Route protection matrix and rate-limit expansion.
4. NFS-e mTLS homologation.
5. Queue/DLQ replay design and staging implementation.
6. Static assets delivery refinement.
7. R2 lifecycle and signed URL governance.
8. AI Gateway/Vectorize/AI Search governance.

## Rollback Plan

- Wrangler config changes should be one workstream per PR and revertible independently.
- New Cloudflare resources should be additive until staging validation passes.
- Sampling changes can be reverted or temporarily increased during incidents.
- Security middleware rollout should begin in staging and support feature flags where user impact is possible.
- DLQ replay endpoints must ship disabled or admin-only until verified.
