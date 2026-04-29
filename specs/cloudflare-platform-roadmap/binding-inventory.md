# Cloudflare Binding Inventory

**Created**: 2026-04-28  
**Scope**: `apps/api/wrangler.toml`, root `wrangler.toml`

## API Worker

| Binding | Type | Default/Production Resource | Staging Resource | Data Bearing | PHI Risk | Status |
|---------|------|-----------------------------|------------------|--------------|----------|--------|
| `HYPERDRIVE` | Hyperdrive | `12b9fefcfbc04074a63342a9212e1b4f` | `37189eb42d314a0a8fd0e169a2b27ad1` | Yes | High | Isolated |
| `MEDIA_BUCKET` | R2 | `fisioflow-media` | `fisioflow-media-staging` | Yes | High | Isolated |
| `FISIOFLOW_CONFIG` | KV | `4284b33fa7ed40b6bc9c59b6041c03ed` | `774bb5738e634d7ea9dc53d410a13218` | Yes | Medium | Isolated |
| `DB` | D1 | `fisioflow-db` / `bf781be2-527d-471d-9cf2-dd18f8e6c2b2` | `fisioflow-db-staging` / `39b12788-3de4-4421-b5c3-1cc594abe207` | Yes | Medium | Isolated |
| `EDGE_CACHE` | D1 | `fisioflow-edge-cache` / `9eba3eb7-5486-49d0-9684-c325f8b1ddc2` | `fisioflow-edge-cache-staging` / `adb59c9c-f22b-467d-a04e-e8e54cf987ed` | Yes | Medium | Isolated |
| `ANALYTICS` | Analytics Engine | `fisioflow_events` | `fisioflow_events_staging` | Yes | Low/Medium | Isolated |
| `CLINICAL_KNOWLEDGE` | Vectorize | `fisioflow-clinical` | `fisioflow-clinical-staging` | Yes | High | Isolated |
| `EVENTS_PIPELINE` | Pipeline stream | `701aff68d26e4c45a29f090389bcd4f2` | `cbf62503169e4dadacbcb72b0534100f` | Yes | Medium | Isolated |
| `WORKFLOW_APPOINTMENT_REMINDER` | Workflow | `appointment-reminder` | `appointment-reminder` | Yes | Medium | Shared name, env-scoped binding |
| `WORKFLOW_PATIENT_ONBOARDING` | Workflow | `patient-onboarding` | `patient-onboarding` | Yes | Medium | Shared name, env-scoped binding |
| `WORKFLOW_NFSE` | Workflow | `nfse-emission` | `nfse-emission` | Yes | High | Shared name, env-scoped binding |
| `WORKFLOW_HEP_COMPLIANCE` | Workflow | `hep-compliance` | `hep-compliance` | Yes | High | Shared name, env-scoped binding |
| `WORKFLOW_DISCHARGE` | Workflow | `patient-discharge` | `patient-discharge` | Yes | High | Shared name, env-scoped binding |
| `WORKFLOW_REENGAGEMENT` | Workflow | `patient-reengagement` | `patient-reengagement` | Yes | Medium | Shared name, env-scoped binding |
| `WORKFLOW_DIGITAL_TWIN` | Workflow | `patient-digital-twin` | `patient-digital-twin` | Yes | High | Bound in staging |
| `ORGANIZATION_STATE` | Durable Object | `OrganizationState` | `OrganizationState` | Yes | Medium | Class shared, namespace env-scoped by Worker |
| `PATIENT_AGENT` | Durable Object | `PatientAgent` | `PatientAgent` | Yes | High | Class shared, namespace env-scoped by Worker |
| `ASSESSMENT_LIVE_SESSION` | Durable Object | `AssessmentLiveSession` | `AssessmentLiveSession` | Yes | High | Class shared, namespace env-scoped by Worker |
| `AI` | Workers AI | Account binding | Account binding | No direct storage | Medium | Shared account capability |
| `BROWSER` | Browser Rendering | Account binding | Account binding | No direct storage | Medium | Shared account capability |
| `BACKGROUND_QUEUE` | Queue | `fisioflow-background-tasks` | `fisioflow-background-tasks-staging` | Yes | Medium | Isolated |

## API Variables

| Variable | Production | Staging | Notes |
|----------|------------|---------|-------|
| `ENVIRONMENT` | `production` | `staging` | Correctly separated |
| `R2_PUBLIC_URL` | `https://media.moocafisio.com.br` | R2 dev URL | Correctly separated |
| `ALLOWED_ORIGINS` | Production domains and dev URLs | Staging and localhost | Review production dev URLs before final hardening |
| `NEON_AUTH_*` | Production Neon Auth host | Staging Neon Auth host | Correctly separated |
| `FISIOFLOW_AI_GATEWAY_URL` | Production gateway | Staging gateway | Correctly separated |
| `TURNSTILE_SITE_KEY` | Shared site key | Shared site key | Acceptable only if dashboard domain rules cover both envs |
| `MONITOR_NTFY_TOPIC` | Production topic | Staging topic | Environment-specific |
| `MONITOR_HEALTH_URL` | Production readiness URL | Staging workers.dev readiness URL | Environment-specific |

## Web Asset Worker

| Binding | Type | Production Resource | Staging Resource | Data Bearing | Status |
|---------|------|---------------------|------------------|--------------|--------|
| `ASSETS` | Workers Static Assets | `./apps/web/dist` | `./apps/web/dist` | No | Shared build output path |

## Immediate Risks

1. Staging monitor URL uses the expected workers.dev host and should be confirmed after deploy.
2. NFS-e mTLS binding is typed in `Env` but not configured in Wrangler.

## Recommended Resource Names

| Resource | Recommended Staging Name |
|----------|--------------------------|
| Vectorize clinical index | `fisioflow-clinical-staging` |
| Pipeline stream | `cbf62503169e4dadacbcb72b0534100f` |
| Workflow digital twin | `patient-digital-twin-staging` or same workflow name if Cloudflare env-scoped |
| Monitor URL var | `MONITOR_HEALTH_URL` |
