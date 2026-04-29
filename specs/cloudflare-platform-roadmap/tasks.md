# Tasks: Cloudflare Platform Roadmap for FisioFlow

**Input**: Design documents from `specs/cloudflare-platform-roadmap/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/operational-checks.md`

**Tests**: Include validation tasks before implementation where code/config changes are expected. Use staging before production.

**Organization**: Tasks are grouped by user story so each roadmap slice can be implemented and validated independently.

## Current Execution Notes

- Cloudflare staging Vectorize and Pipeline resources were created and bound.
- API typecheck, API tests, web asset-worker unit test, web build, and Wrangler dry-runs passed.
- NFS-e mTLS upload/list is blocked by Cloudflare API token permission error `10000` for `/mtls_certificates`.
- Production deploy was not executed; only dry-runs were performed.
- Remaining unchecked tasks require either mTLS permission, staging business data/homologation credentials, a deliberate admin DLQ product decision, or broader AI/R2 lifecycle rollout approval.

## Phase 1: Setup and Inventory

**Purpose**: Establish a reliable baseline before changing infrastructure.

- [x] T001 Create a Cloudflare binding inventory table from `apps/api/wrangler.toml` and `wrangler.toml` in `specs/cloudflare-platform-roadmap/binding-inventory.md`.
- [x] T002 [P] Record production resource names/IDs and staging resource names/IDs for data-bearing bindings in `specs/cloudflare-platform-roadmap/binding-inventory.md`.
- [x] T003 [P] Record required Cloudflare account/dashboard provisioning actions in `specs/cloudflare-platform-roadmap/provisioning-runbook.md`.
- [x] T004 Run `specify check` and record any Spec Kit tooling issues in `specs/cloudflare-platform-roadmap/provisioning-runbook.md`.
- [x] T005 Run current `pnpm --filter @fisioflow/api type-check` and `pnpm --filter @fisioflow/api test` to establish baseline.

---

## Phase 2: Foundational Safety

**Purpose**: Blocking prerequisites for all implementation work.

- [x] T006 Confirm no production secrets or PHI are present in `apps/api/wrangler.toml`, root `wrangler.toml`, or new spec docs.
- [x] T007 [P] Define production/staging naming convention for Cloudflare resources in `specs/cloudflare-platform-roadmap/provisioning-runbook.md`.
- [x] T008 [P] Define rollback steps for Wrangler config changes in `specs/cloudflare-platform-roadmap/provisioning-runbook.md`.
- [x] T009 Add a checklist section to `specs/cloudflare-platform-roadmap/provisioning-runbook.md` for staging validation before production rollout.

**Checkpoint**: No implementation task should start until environment/resource ownership is known.

---

## Phase 3: User Story 1 - Separate Production and Staging Cloudflare Data Paths (Priority: P1)

**Goal**: Ensure staging cannot write to production data-bearing Cloudflare resources.

**Independent Test**: Wrangler dry-run and staging smoke checks prove all staging writes land in staging-only resources.

### Tests and Validation

- [x] T010 [US1] Verify current staging/production binding differences in `apps/api/wrangler.toml` against `binding-inventory.md`.
- [x] T011 [P] [US1] Provision or request staging-specific Vectorize index and update `provisioning-runbook.md` with the resulting resource name.
- [x] T012 [P] [US1] Provision or request staging-specific Pipeline/stream and update `provisioning-runbook.md` with the resulting resource name/ID.
- [x] T013 [US1] Run `wrangler deploy --dry-run --env staging --config apps/api/wrangler.toml` after proposed config changes.
- [x] T014 [US1] Run a staging Vectorize upsert/query smoke test and confirm production index is unchanged.
- [x] T015 [US1] Send a staging event through `EVENTS_PIPELINE` and confirm it lands only in staging destination.

### Implementation

- [x] T016 [US1] Update `apps/api/wrangler.toml` staging `CLINICAL_KNOWLEDGE` binding to use a staging-specific Vectorize index.
- [x] T017 [US1] Update `apps/api/wrangler.toml` staging `EVENTS_PIPELINE` binding to use a staging-specific Pipeline.
- [x] T018 [US1] Add comments in `apps/api/wrangler.toml` documenting production/staging resource ownership for Vectorize and Pipelines.

**Checkpoint**: Staging resource isolation is validated and production config is unchanged except documentation comments if needed.

---

## Phase 4: User Story 2 - Control Observability Cost and Signal Quality (Priority: P1)

**Goal**: Keep actionable observability while reducing production log/trace noise and cost.

**Independent Test**: Production config has explicit sampling below 100%; staging can retain high sampling; Analytics Engine route metrics still work.

### Tests and Validation

- [x] T019 [US2] Document target logs/traces sampling values for production and staging in `provisioning-runbook.md`.
- [x] T020 [P] [US2] Add or update tests for `apps/api/src/lib/analytics.ts` route normalization if coverage is missing.
- [x] T021 [US2] Generate staging API traffic and verify Analytics Engine dimensions remain route/method/status/latency/event/org-safe.
- [x] T022 [US2] Run Wrangler dry-run for staging and production after sampling changes.

### Implementation

- [x] T023 [US2] Update `apps/api/wrangler.toml` production observability sampling values.
- [x] T024 [US2] Add environment-specific staging observability sampling values if missing.
- [x] T025 [US2] Parameterize health monitor URL/topic in `apps/api/src/lib/monitor.ts` and `apps/api/src/types/env.ts` instead of hard-coding production URL.
- [x] T026 [US2] Update `apps/api/wrangler.toml` vars for monitor URL/topic per environment.

**Checkpoint**: Observability is environment-aware and production sampling is explicit.

---

## Phase 5: User Story 3 - Harden Public and Sensitive Cloudflare Entry Points (Priority: P1)

**Goal**: Consistently protect public, sensitive, and high-cost routes.

**Independent Test**: Each route category in `contracts/operational-checks.md` has positive and negative checks.

### Tests and Validation

- [x] T027 [US3] Create `specs/cloudflare-platform-roadmap/route-protection-matrix.md` mapping route categories to required controls.
- [x] T028 [P] [US3] Add tests for auth route rate-limit/Turnstile behavior in `apps/api/src/routes/__tests__/authProxy.test.ts` or adjacent tests.
- [x] T029 [P] [US3] Add tests for public booking Turnstile behavior in the relevant route test file under `apps/api/src/routes/__tests__/`.
- [ ] T030 [P] [US3] Add tests for AI route rate-limit behavior near existing `apps/api/src/routes/ai.ts` tests.
- [x] T031 [US3] Verify webhook signature failure behavior for WhatsApp/webhook routes.

### Implementation

- [x] T032 [US3] Apply missing rate-limit middleware to identified sensitive routes in `apps/api/src/routes/`.
- [x] T033 [US3] Apply missing Turnstile middleware only to human public-entry routes, not provider webhooks.
- [x] T034 [US3] Ensure rejected security events write audit/analytics signals without raw PHI.
- [x] T035 [US3] Update route comments or docs with security rationale where behavior differs by provider constraints.

**Checkpoint**: Route protection matrix is implemented for P1 categories and tests pass.

---

## Phase 6: User Story 4 - Make NFS-e Emission Production-Ready on Cloudflare (Priority: P2)

**Goal**: Configure and validate direct NFS-e emission through Cloudflare mTLS and R2 DANFSe storage.

**Independent Test**: Homologation send/consult/DANFSe flow succeeds in staging.

### Tests and Validation

- [x] T036 [US4] Document required NFS-e secrets and mTLS binding setup in `provisioning-runbook.md`.
- [x] T037 [P] [US4] Add config validation tests for `hasSPCertConfig` in `apps/api/src/lib/nfseSPClient.ts` tests.
- [ ] T038 [US4] Run homologation send/consult manually in staging with a non-production invoice.
- [ ] T039 [US4] Verify DANFSe PDF is stored in staging R2 with tenant metadata and signed URL behavior.

### Implementation

- [ ] T040 [US4] Add `NFSE_SP_CERT` mTLS binding configuration to `apps/api/wrangler.toml` once Cloudflare resource details are available.
- [x] T041 [US4] Ensure `apps/api/src/types/env.ts` accurately matches the mTLS binding and required PEM secret names.
- [x] T042 [US4] Improve actionable error messages in `apps/api/src/routes/nfse.ts` for missing certificate/secrets.
- [x] T043 [US4] Emit Analytics Engine/audit event for NFS-e send success/failure without sensitive invoice payloads.

**Checkpoint**: Staging/homologation NFS-e works before any production enablement.

---

## Phase 7: User Story 5 - Operationalize Queues, Workflows, and Replay (Priority: P2)

**Goal**: Make failed background work diagnosable and safely replayable.

**Independent Test**: A failed staging queue task reaches DLQ and can be replayed idempotently.

### Tests and Validation

- [x] T044 [US5] Document DLQ task types, replay eligibility, and redaction rules in `specs/cloudflare-platform-roadmap/dlq-runbook.md`.
- [x] T045 [P] [US5] Add queue handler tests for failed task classification in `apps/api/src/queue.ts` tests.
- [ ] T046 [P] [US5] Add workflow trigger/status tests for `TRIGGER_WORKFLOW` payloads.
- [ ] T047 [US5] Force a staging queue failure and confirm message reaches staging DLQ.

### Implementation

- [x] T048 [US5] Add idempotency key handling to replayable queue payloads in `apps/api/src/queue.ts`.
- [x] T049 [US5] Add redacted task summary helper for operator views in `apps/api/src/queue.ts` or a new focused helper file.
- [ ] T050 [US5] Implement an admin-only DLQ replay/status route under `apps/api/src/routes/admin/` if approved by the runbook.
- [ ] T051 [US5] Emit audit/analytics events for replay attempts and outcomes.

**Checkpoint**: DLQ replay is admin-only, redacted, audited, and tested in staging.

---

## Phase 8: User Story 6 - Improve Frontend Asset Delivery with Workers Static Assets (Priority: P2)

**Goal**: Preserve SPA behavior while reducing unnecessary Worker asset invocations where possible.

**Independent Test**: SPA deep links work and missing asset files return 404.

### Tests and Validation

- [x] T052 [US6] Build `apps/web/dist` and list representative SPA routes and asset URLs for validation.
- [x] T053 [P] [US6] Add unit tests for `apps/web/src/asset-worker.ts` fallback behavior if test harness exists.
- [x] T054 [US6] Validate Cloudflare Static Assets `not_found_handling` and `run_worker_first` behavior in staging/preview.

### Implementation

- [ ] T055 [US6] Update root `wrangler.toml` assets config to use native SPA handling or selective Worker-first routing if validation confirms equivalent behavior.
- [ ] T056 [US6] Simplify `apps/web/src/asset-worker.ts` only if missing-asset 404 behavior is preserved.
- [x] T057 [US6] Document asset routing decision in `provisioning-runbook.md`.

**Checkpoint**: Asset behavior is faster/simpler without SPA regressions.

---

## Phase 9: User Story 7 - Establish Cloudflare Governance for PHI/LGPD Storage (Priority: P3)

**Goal**: Define and implement R2 lifecycle, signed URL, metadata, and audit policies.

**Independent Test**: Each storage class has prefix, metadata, TTL, audit, and lifecycle validation.

### Tests and Validation

- [x] T058 [US7] Create `specs/cloudflare-platform-roadmap/r2-storage-policy.md` from `StorageClassPolicy` in `data-model.md`.
- [x] T059 [P] [US7] Add tests for R2 key and signed URL generation in `apps/api/src/lib/storage/R2Service.ts` or adjacent tests.
- [ ] T060 [US7] Validate representative staging uploads for clinical document, media, DICOM, DANFSe, and AI temporary artifact.

### Implementation

- [ ] T061 [US7] Update R2 upload/download helpers to enforce storage class metadata and tenant scope.
- [x] T062 [US7] Add lifecycle policy provisioning steps to `provisioning-runbook.md`.
- [ ] T063 [US7] Emit audit events for protected file access and signed URL generation.

**Checkpoint**: R2 governance is documented and enforced for new uploads.

---

## Phase 10: User Story 8 - Expand Cloudflare AI Platform Usage Safely (Priority: P3)

**Goal**: Govern AI Gateway, Vectorize, and AI Search/AutoRAG experiments with tenant/environment controls.

**Independent Test**: AI requests expose gateway metrics, staging retrieval indexes are isolated, and fallbacks are controlled.

### Tests and Validation

- [x] T064 [US8] Create `specs/cloudflare-platform-roadmap/ai-governance.md` covering gateway, models, indexes, limits, and fallback rules.
- [ ] T065 [P] [US8] Add tests for AI route provider/gateway fallback behavior where existing route tests are present.
- [ ] T066 [US8] Run staging RAG evaluation against wiki/protocol/exercise samples and record results in `ai-governance.md`.

### Implementation

- [x] T067 [US8] Ensure AI calls in `apps/api/src/routes/ai.ts` and AI helper modules use the configured gateway/registry path where supported.
- [x] T068 [US8] Add per-org AI usage metrics and rate-limit signals where missing.
- [ ] T069 [US8] Add a staged AI Search/AutoRAG experiment behind an environment flag if account support is confirmed.

**Checkpoint**: AI expansion is gated by metrics, tenant controls, and staged evaluation.

---

## Phase 11: Polish and Release Governance

**Purpose**: Final cross-cutting validation and handoff.

- [x] T070 [P] Run `pnpm --filter @fisioflow/api type-check`.
- [x] T071 [P] Run `pnpm --filter @fisioflow/api test`.
- [x] T072 Run `wrangler deploy --dry-run --env staging --config apps/api/wrangler.toml`.
- [x] T073 Run `wrangler deploy --dry-run --env production --config apps/api/wrangler.toml`.
- [x] T074 Review logs/traces/analytics for PHI leakage in staging smoke tests.
- [x] T075 Update `specs/cloudflare-platform-roadmap/quickstart.md` with any command changes discovered during implementation.
- [x] T076 Prepare rollout notes and rollback steps for production deployment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup and Inventory (Phase 1)**: No dependencies.
- **Foundational Safety (Phase 2)**: Depends on Phase 1 and blocks all implementation phases.
- **US1, US2, US3 (Phases 3-5)**: Start after Phase 2; should be prioritized before P2/P3 work.
- **US4, US5, US6 (Phases 6-8)**: Start after P1 work or in parallel only if files/resources do not conflict.
- **US7, US8 (Phases 9-10)**: Start after environment isolation is complete.
- **Polish (Phase 11)**: Runs after any selected story before production rollout.

### User Story Dependencies

- **US1** has no dependency after foundation and should be MVP.
- **US2** can run after foundation, but final production rollout benefits from US1 inventory.
- **US3** can run after foundation and route matrix creation.
- **US4** depends on Cloudflare mTLS provisioning access.
- **US5** depends on queue/DLQ resource validation.
- **US6** can run independently after baseline validation.
- **US7** depends on R2 storage policy approval.
- **US8** depends on US1 for environment-specific AI indexes.

### Parallel Opportunities

- T002/T003 can run in parallel.
- T011/T012 can run in parallel if Cloudflare account access is available.
- Test additions in T028/T029/T030 can run in parallel.
- US4 and US6 can proceed in parallel if different engineers own NFS-e and web assets.
- US7 and US8 governance docs can be drafted in parallel after US1 decisions.

## MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 staging/production data path separation.
3. Complete US2 observability sampling and monitor parameterization.
4. Complete US3 route protection matrix for the highest-risk categories.
5. Stop and validate staging before moving to NFS-e, DLQ replay, R2 lifecycle, or AI expansion.

## Notes

- Do not commit secrets, certificate material, real tokens, or production PHI.
- Prefer staging-only validation for risky Cloudflare resources.
- Keep PRs small: one workstream per PR unless changes are inseparable.
- For Cloudflare documentation, verify latest official docs before implementing feature-specific syntax or paid/beta capabilities.
