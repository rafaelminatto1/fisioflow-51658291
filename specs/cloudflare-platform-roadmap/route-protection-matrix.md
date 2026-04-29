# Route Protection Matrix

**Created**: 2026-04-28  
**Purpose**: Map API route categories to Cloudflare/Hono protection controls before broad hardening changes.

## Current Controls Observed

| Route Category | Representative Paths | Current Controls | Required Next Step |
|----------------|----------------------|------------------|--------------------|
| Auth login | `/api/auth/login` | D1 `rateLimit` by IP; Neon Auth proxy | Add audit/analytics signal for repeated failures without logging email/password |
| Auth signup | `/api/auth/signup` | D1 `rateLimit`; Turnstile | Add explicit tests for Turnstile failure and rate-limit behavior |
| Password reset | `/api/auth/forgot-password`, `/api/auth/reset-password` | D1 `rateLimit`; Turnstile | Add explicit tests and audit/analytics signal |
| Public booking | `/api/public-booking/*` | Turnstile on all routes | Add IP rate limit and tests for public booking submission |
| Webhooks | `/api/whatsapp/webhook`, `/api/webhooks/*` | Provider-specific code exists | Confirm signature verification coverage and replay tolerance |
| AI routes | `/api/ai/*` | Auth required; D1 rate limit for AI route group; premium daily limit in route | Add per-org usage metrics/failure analytics where missing |
| Media upload | `/api/media/*`, `/api/image-processor/*` | Auth and R2 helpers in route modules | Add storage class metadata, signed URL TTL policy, and audit event |
| Billing/NFS-e | `/api/nfse/*`, `/api/financial/*` | Auth in NFS-e routes; R2 DANFSe support | Add role checks for emission/cancelation and mTLS readiness validation |
| Admin/operator | `/api/admin/*` | Route-specific auth expectations | Require admin role and audit event for future DLQ replay/status endpoints |
| Patient portal | `/api/patient-portal/*` | Patient portal auth/scope route code | Confirm rate limits on sensitive write actions |
| Realtime | `/api/realtime` | Token verification before Durable Object WebSocket | Confirm no PHI in connection logs and add connection metrics |

## Required Controls by Category

| Category | Auth | Turnstile | Rate Limit | Signature | Audit/Analytics | Notes |
|----------|------|-----------|------------|-----------|-----------------|-------|
| Human public entry | Optional/none | Required | IP + route | N/A | Required for accepted/rejected writes | Signup, reset, public booking |
| Provider webhook | Provider secret | No | Provider-compatible | Required | Required | Turnstile would break provider retries |
| Authenticated clinical API | Required | No | Org/user route tier | N/A | Required for mutations | Avoid PHI in logs |
| High-cost AI API | Required | No | Org/user daily/hourly | N/A | Required with cost/value field | Use AI Gateway metrics |
| File/media API | Required | No | Org/user + size limits | N/A | Required | Signed URL TTL and storage class policy |
| Billing/fiscal API | Required | No | Org/user conservative | Provider where applicable | Required | Role/permission checks before emission/cancelation |
| Admin/operator API | Required admin | No | User/IP | N/A | Required | Redact payloads by default |

## Implementation Notes

- Keep Turnstile limited to browser-originated public actions.
- Prefer D1 `EDGE_CACHE` rate limits for routes already handled by the API Worker.
- Use provider HMAC/signature verification for WhatsApp and external webhooks.
- Add tests before broad middleware changes so legitimate provider retries are not blocked.
- Analytics dimensions must use normalized route names and safe identifiers only.

