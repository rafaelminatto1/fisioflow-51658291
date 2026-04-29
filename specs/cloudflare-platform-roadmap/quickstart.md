# Quickstart: Validate the Cloudflare Platform Roadmap

Use this quickstart before implementing and again after each roadmap slice.

## 1. Verify Spec Kit Context

```bash
specify version
specify check
```

Expected result: Specify CLI is available and the repository has `.specify/` and `specs/`.

## 2. Inspect Current Cloudflare Config

```bash
sed -n '1,520p' apps/api/wrangler.toml
sed -n '1,120p' wrangler.toml
```

Check:

- Production and staging bindings are present.
- Staging data-bearing bindings are distinct from production.
- Observability sampling is explicit per environment.
- mTLS binding for NFS-e is documented/configured before production emission.

Current staging resources created for this roadmap:

- Vectorize: `fisioflow-clinical-staging`
- Pipeline: `fisioflow_events_staging`
- Pipeline stream binding value: `cbf62503169e4dadacbcb72b0534100f`
- Pipeline sink: `fisioflow_events_staging_sink` to `fisioflow-media-staging/pipelines/events-staging`

## 3. Run Type and Test Validation

```bash
pnpm --filter @fisioflow/api type-check
pnpm --filter @fisioflow/api test
```

Expected result: API Worker types and tests pass.

## 4. Validate Wrangler Dry Runs

```bash
pnpm --filter @fisioflow/api build
wrangler deploy --dry-run --env staging --config apps/api/wrangler.toml
wrangler deploy --dry-run --env production --config apps/api/wrangler.toml
```

Expected result: Wrangler accepts all bindings and environment config. If account resources are missing, record them as provisioning tasks instead of editing secrets into the repository.

## 5. Validate Web Asset Behavior

After building `apps/web/dist`, deploy or preview the web Worker and check:

- `/` returns the app shell.
- A SPA deep link returns the app shell.
- A valid hashed asset returns 200.
- A missing path with an asset extension returns 404.

## 6. Validate Observability

Generate staging traffic for:

- `/api/health`
- `/api/health/ready`
- One authenticated route
- One rate-limited route
- One route returning a controlled 4xx

Then verify:

- Workers logs/traces are sampled according to environment.
- Analytics Engine receives normalized route metrics.
- No PHI appears in logs, traces, or analytics blobs.

## 7. Validate Route Protection Matrix

For each route category in `contracts/operational-checks.md`, perform one positive and one negative check:

- Public booking/signup without Turnstile should fail.
- Authenticated route without token should fail.
- Webhook with invalid signature should fail.
- AI route over limit should rate-limit.
- Upload route should enforce auth, size/type policy, and tenant scope.

## 8. Validate NFS-e Homologation

Only after Cloudflare mTLS and PEM secrets are configured:

Current blocker: the active Cloudflare API token returned authentication error `10000` for `wrangler mtls-certificate list`. Use a token with mTLS certificate management permission before this step.

- Create a draft invoice in staging/homologation.
- Send to homologation provider.
- Consult status.
- Generate DANFSe.
- Confirm R2 object metadata and signed URL behavior.

## 9. Validate Queue/DLQ Replay

In staging:

- Enqueue a test task that intentionally fails.
- Confirm retry behavior.
- Confirm DLQ capture.
- Replay with idempotency key.
- Confirm audit/analytics event and no duplicate business side effects.

## 10. Validate R2 Governance

Upload representative files for each storage class:

- Clinical document.
- Image/video/audio.
- DICOM.
- Telemedicine recording.
- DANFSe.
- Temporary AI artifact.

Check prefix, metadata, signed URL TTL, audit event, and lifecycle behavior.
