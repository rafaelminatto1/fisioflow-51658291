# Cloudflare Provisioning Runbook

**Created**: 2026-04-28  
**Applies to**: Cloudflare account resources used by `fisioflow-api` and `fisioflow-web`

## Safety Rules

- Never commit Cloudflare tokens, Neon URLs with credentials, PEM certificates, private keys, webhook secrets, or patient data.
- Create and validate staging resources before production config changes.
- Use `wrangler deploy --dry-run` before any deploy.
- Keep resource-creation commits separate from code behavior changes where possible.
- If a command requires account permissions, record the intended command and actual result here.

## Naming Convention

| Environment | Suffix | Example |
|-------------|--------|---------|
| Production | none | `fisioflow-clinical` |
| Staging | `-staging` | `fisioflow-clinical-staging` |
| Development/local | `-dev` when remote resource is required | `fisioflow-clinical-dev` |

## Required Provisioning

### P1: Staging Vectorize

Completed:

```bash
wrangler vectorize create fisioflow-clinical-staging --dimensions=768 --metric=cosine
```

Result: created `fisioflow-clinical-staging`.

Post-provisioning config:

```toml
[[env.staging.vectorize]]
binding = "CLINICAL_KNOWLEDGE"
index_name = "fisioflow-clinical-staging"
```

Validation:

- Upsert a staging-only test vector.
- Query staging index.
- Confirm production `fisioflow-clinical` does not contain the staging test vector.

### P1: Staging Pipeline

Completed stream:

```bash
wrangler pipelines streams create fisioflow_events_staging_stream
```

Result: stream ID `cbf62503169e4dadacbcb72b0534100f`.

Completed sink:

```bash
wrangler pipelines sinks create fisioflow_events_staging_sink --type r2 --bucket fisioflow-media-staging --format json --path pipelines/events-staging --roll-interval 300
```

Result: sink ID `d140b32fd2e04153a7d0295c375f41b2`, bucket `fisioflow-media-staging`, path `pipelines/events-staging`.

Completed pipeline:

```bash
wrangler pipelines create fisioflow_events_staging --sql "INSERT INTO fisioflow_events_staging_sink SELECT value FROM fisioflow_events_staging_stream"
```

Result: pipeline ID `b4e3ff097651457b9f73e87a1cb94924`.

Post-provisioning config:

```toml
[[env.staging.pipelines]]
binding = "EVENTS_PIPELINE"
pipeline = "cbf62503169e4dadacbcb72b0534100f"
```

Validation:

- Send one staging event.
- Confirm it lands only in the staging destination.

### P1: Observability Sampling

Recommended initial values:

| Environment | Logs | Traces |
|-------------|------|--------|
| Production | `0.1` | `0.05` |
| Staging | `1` | `1` |

Incident override:

- Temporarily increase production sampling only during active debugging.
- Record the reason, start time, expected end time, and rollback owner.

### P1: Health Monitor Environment Variables

Add per environment:

```toml
MONITOR_HEALTH_URL = "https://api-pro.moocafisio.com.br/api/health/ready"
MONITOR_NTFY_TOPIC = "fisioflow-mon-rafael-prod"
```

Staging:

```toml
MONITOR_HEALTH_URL = "https://fisioflow-api-staging.rafalegollas.workers.dev/api/health/ready"
MONITOR_NTFY_TOPIC = "fisioflow-mon-rafael-staging"
```

Confirm the staging URL after deploy.

### P2: NFS-e mTLS

Required secret/binding names:

- `NFSE_SP_CERT`: Cloudflare mTLS certificate binding.
- `NFSE_SP_CERT_PEM`: PEM certificate secret for XML signing.
- `NFSE_SP_KEY_PEM`: PEM private key secret for XML signing.

Do not commit certificate material.

Current CLI status:

- `wrangler mtls-certificate list` failed with Cloudflare API authentication error `10000`.
- The active token works for Workers, Vectorize, Pipelines, and R2 Pipeline OAuth, but does not have the required mTLS certificate API permission.
- Next action: create or switch to a Cloudflare API token that can manage account mTLS certificates, then upload/list the certificate and add the resulting `certificate_id` to Wrangler.

Wrangler config shape after certificate upload:

```toml
[[env.staging.mtls_certificates]]
binding = "NFSE_SP_CERT"
certificate_id = "<homologation-certificate-id>"

[[env.production.mtls_certificates]]
binding = "NFSE_SP_CERT"
certificate_id = "<production-certificate-id>"
```

Validation:

- Homologation send.
- Consultation.
- DANFSe generation.
- R2 storage with tenant metadata.

## Rollback Steps

1. Revert the specific Wrangler config commit.
2. Run `wrangler deploy --dry-run --env staging --config apps/api/wrangler.toml`.
3. If already deployed, redeploy the previous known-good Worker version or revert through Cloudflare dashboard versions.
4. For sampling incidents, restore production logs/traces to the baseline values in this runbook.
5. For route protection regressions, disable only the affected route middleware via a guarded config flag if one was added; otherwise revert that route patch.

## Web Asset Routing Decision

The current `apps/web/src/asset-worker.ts` keeps explicit logic for two important behaviors:

- Extensionless SPA navigations return the app shell.
- Missing asset files such as `.js`, `.css`, `.png`, and `.svg` remain real 404 responses.

Do not switch root `wrangler.toml` to native `not_found_handling = "single-page-application"` unless staging proves missing asset files still return 404. Returning `index.html` for a missing script or image would hide asset/build errors.

## R2 Lifecycle Provisioning

Recommended lifecycle rules to create in the Cloudflare dashboard or API after compliance approval:

| Prefix | Action | Timing | Reason |
|--------|--------|--------|--------|
| `tmp/ai/` | Delete objects | 1-7 days | Temporary AI artifacts should not persist |
| `pipelines/events-staging/` | Delete or archive | 30-90 days | Staging operational data should not grow forever |
| `recordings/` | Review before automatic deletion | Clinic policy | Telemedicine recordings may be clinical records |
| `orgs/*/nfse/` | Retain | Fiscal policy | DANFSe retention follows fiscal rules |
| `orgs/*/patients/` | Retain | Clinical/legal policy | Patient records follow healthcare retention |

Provisioning notes:

- Keep lifecycle rules environment-specific.
- Do not apply automatic deletion to clinical/fiscal prefixes until legal retention is approved.
- Validate lifecycle in staging with non-PHI test objects before production.

## Staging Validation Checklist

- [ ] `pnpm --filter @fisioflow/api type-check` passes.
- [ ] `pnpm --filter @fisioflow/api test` passes.
- [ ] `wrangler deploy --dry-run --env staging --config apps/api/wrangler.toml` passes.
- [ ] `/api/health` returns 200 in staging.
- [ ] `/api/health/ready` returns 200 or expected degraded details.
- [ ] Vectorize staging smoke test does not touch production.
- [ ] Pipeline staging smoke test does not touch production.
- [ ] Logs/traces sampling matches the environment.
- [ ] No PHI appears in logs/traces/analytics during smoke tests.
