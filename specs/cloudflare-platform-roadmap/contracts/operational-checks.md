# Operational Checks Contract: Cloudflare Platform Roadmap

This contract defines expected checks for implementation and review. It is intentionally operational rather than API-first because this roadmap mainly changes infrastructure configuration and platform controls.

## Environment Binding Contract

| Binding Type | Production Requirement | Staging Requirement | Validation |
|--------------|------------------------|---------------------|------------|
| Hyperdrive | Production Neon pooler | Staging Neon pooler | Wrangler dry-run and Cloudflare dashboard resource ID |
| R2 | Production media bucket | Staging media bucket | Upload test object to staging only |
| KV | Production config namespace | Staging config namespace | Read/write `__healthcheck__` staging key |
| D1 DB | Production D1 DB | Staging D1 DB | Query staging tables |
| D1 EDGE_CACHE | Production edge cache | Staging edge cache | Rate-limit test writes staging only |
| Analytics Engine | Production dataset | Staging dataset | Route metric appears in correct dataset |
| Vectorize | Production clinical index | Staging clinical index | Staging upsert/query does not affect production |
| Pipeline | Production pipeline/stream | Staging pipeline/stream | Test event lands only in staging destination |
| Queue | Production queue and DLQ | Staging queue and DLQ | Failing test task reaches staging DLQ |
| Workflows | Production workflow bindings | Staging workflow bindings | Create test instance in staging |
| Durable Objects | Production namespaces/classes | Staging namespaces/classes | WebSocket/agent smoke test in staging |
| mTLS | Production certificate binding | Homologation/staging certificate binding | NFS-e homologation request uses binding |

## Route Protection Contract

| Route Category | Required Controls |
|----------------|-------------------|
| Auth login/session | Rate limit by IP and identity hint; secure cookies/headers; no PHI logs |
| Signup/password reset | Turnstile; rate limit by IP/email; audit event |
| Public booking/pre-cadastro | Turnstile; rate limit by IP; input validation; tenant-safe writes |
| Webhooks | Provider signature verification; replay tolerance; no Turnstile; rate limit where provider-compatible |
| AI routes | Auth; per-org rate limit; gateway metrics; cost/error analytics |
| Upload/media | Auth; tenant scope; file type/size validation; signed URL TTL; audit event |
| Billing/NFS-e | Auth; role/permission check; audit event; idempotency |
| Admin/operator | Auth; admin role; audit event; no broad payload exposure |
| Patient portal | Patient identity scope; CORS allowlist; rate limit for sensitive actions |

## Observability Contract

- Production logs sampling must be explicitly set below 1 unless incident override is documented.
- Production traces sampling must be explicitly set below 1 unless incident override is documented.
- Staging may use sampling of 1 for debugging.
- Analytics Engine must record normalized route, method, status, latency, event type, and org ID when available.
- Logs, traces, and analytics must not include raw CPF, CNPJ, phone, email, access token, certificate material, full clinical notes, or full queue payloads.

## DLQ Replay Contract

Before replaying a failed task, the operator workflow must verify:

- Authenticated admin/operator identity.
- Task type is replayable.
- Payload can be displayed in redacted form.
- Idempotency key exists or can be derived.
- Replay action is audited.
- Replay result is visible as success, failed, or re-dead-lettered.

## R2 Governance Contract

Every protected object class must define:

- Prefix.
- Tenant metadata.
- Content class metadata.
- Signed URL maximum TTL.
- Retention/lifecycle behavior.
- Audit requirement.
- Whether public access is forbidden, allowed, or CDN-only.

## AI Governance Contract

AI and retrieval flows must define:

- Environment-specific index/resource.
- Provider/gateway path.
- Per-org usage limit.
- Error/fallback behavior.
- Evaluation sample or acceptance criteria.
- PHI logging restrictions.
