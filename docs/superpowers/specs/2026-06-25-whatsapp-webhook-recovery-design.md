# WhatsApp Webhook Recovery Design

## Context

The CRM WhatsApp UI at `/crm-whatsapp` is active and reading conversation data from the current inbox API, but production observability for the active worker `fisioflow-api` showed no requests to `POST /api/whatsapp/webhook` in the period from 2026-06-18 through 2026-06-25.

Relevant current implementation points:

- webhook receive route in [apps/api/src/routes/whatsapp-webhook.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/whatsapp-webhook.ts:1)
- CRM inbox send route in [apps/api/src/routes/whatsapp-inbox.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/whatsapp-inbox.ts:835)
- legacy webhook logs route in [apps/api/src/routes/whatsapp.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/whatsapp.ts:344)
- message persistence helpers in [apps/api/src/lib/whatsapp-conversations.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/lib/whatsapp-conversations.ts:870)

Static analysis also found a configuration split:

- inbound webhook routing resolves organization by `organizations.settings.whatsapp_phone_number_id`
- outbound sends use worker-level `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`

That split creates a credible failure mode where messages can be sent from one configured number while inbound events are expected on a different organization mapping.

## Goal

Recover reliable WhatsApp-to-CRM delivery by:

- validating the real Meta webhook configuration in production
- ensuring inbound webhook events are visible even when routing fails
- removing silent discard paths from the backend
- making organization mapping and credential usage operationally auditable

## Non-Goals

- redesigning the CRM WhatsApp UI
- changing conversation schema beyond fields required for observability and idempotency
- redesigning WhatsApp automations, templates, or campaign flows
- replacing Meta as the transport provider

## Recommended Approach

Treat the incident as two coordinated tracks:

1. operational validation in the Meta dashboard
2. backend hardening so future misconfiguration is immediately diagnosable

Operational validation is the first-order dependency because current evidence suggests the webhook may not be targeting the active API at all. Backend hardening proceeds in parallel because the current code loses evidence when signature validation or organization resolution fails.

## Operational Validation

### Meta Checklist

Validate the following in the Meta app connected to the production WhatsApp Business number:

- callback URL is exactly `https://api-pro.moocafisio.com.br/api/whatsapp/webhook`
- verify token matches the production `WHATSAPP_VERIFY_TOKEN`
- app secret used by the webhook route matches the active Meta app
- webhook subscription includes message-related events required by CRM ingestion
- the linked phone number and business account correspond to the clinic organization expected to receive inbound messages

### Required Test

Use Meta's webhook test mechanism immediately after verification:

- trigger a test event for `messages` if available
- confirm the worker receives `POST /api/whatsapp/webhook`
- confirm the event is persisted even if business routing later fails

### Expected Outcomes

There are only three useful outcomes:

1. Meta points to an old or wrong callback URL
2. Meta points to the correct URL but verification or signature fails
3. Meta points to the correct URL and the worker receives events, but routing/persistence fails after receipt

The backend changes below are designed to make outcomes 2 and 3 explicit.

## Backend Design

### 1. Preserve Webhook Evidence Before Routing

Current flow in [apps/api/src/routes/whatsapp-webhook.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/whatsapp-webhook.ts:56) resolves `orgId` before writing the raw event. If `phone_number_id` is missing or unmapped, the event is discarded without durable evidence.

Change the flow so that raw webhook evidence is recorded before organization resolution completes.

Recommended behavior:

- create a raw event record for every parseable webhook payload
- store `phone_number_id`, top-level event identifiers, and raw body
- allow `organization_id` to be null for unresolved events, or use a dedicated unresolved-events table if nullability is not acceptable
- record a `processing_state` such as `received`, `signature_failed`, `org_unresolved`, `processed`, `processing_error`

This is the most important backend change.

### 2. Make Signature Failures Observable

Current behavior returns `401` for invalid signatures and `500` if `WHATSAPP_APP_SECRET` is missing, but no durable event trail is created.

Add explicit structured logging for:

- missing `WHATSAPP_APP_SECRET`
- missing signature header
- failed signature validation
- invalid JSON payload

These logs must include:

- request timestamp
- request path
- whether the request reached the webhook route
- `phone_number_id` if it can be extracted safely
- request correlation id

### 3. Fix Idempotency

Current raw-event idempotency uses a random UUID suffix, so duplicate delivery is never actually deduplicated.

Replace it with a deterministic key based on:

- entry id
- message id or status id when present
- event type
- phone number id

If no provider event id exists, hash the canonical payload subset instead of appending randomness.

### 4. Unify Configuration Semantics

Inbound organization routing depends on organization settings while outbound sends use worker-level secrets.

Recommended design:

- keep provider credentials at the worker level if required operationally
- treat organization-level `whatsapp_phone_number_id` as the mandatory routing key for inbound
- add startup or request-time validation that detects when worker-level phone number and organization-level routing data are inconsistent
- surface this mismatch through a settings/status endpoint used by the CRM settings screen

The system must make it obvious when the clinic appears connected in UI but cannot route inbound events.

### 5. Replace Legacy Webhook Logs View

The current `/api/whatsapp/webhook-logs` route in [apps/api/src/routes/whatsapp.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/whatsapp.ts:344) reads from legacy `whatsapp_messages`, not the active CRM inbox pipeline.

Replace or deprecate it in favor of a route backed by:

- `wa_raw_events`
- `wa_messages`
- routing and processing metadata

The new log view should support:

- filter by organization
- filter by processing state
- filter by `phone_number_id`
- list recent unresolved events
- inspect signature failures and provider status callbacks

### 6. Explicit Routing Failure Path

When `resolveOrgId` cannot match `phone_number_id`, the system should:

- persist the unresolved raw event
- log a structured warning with the unmatched `phone_number_id`
- avoid pretending success internally
- expose unresolved counts in operational tooling

This prevents silent failure when Meta is connected to the wrong clinic or old number.

## Data Model Impact

Preferred option:

- extend `wa_raw_events` to support nullable `organization_id`
- add columns such as:
  - `phone_number_id`
  - `event_type`
  - `processing_state`
  - `failure_reason`
  - `provider_event_id`
  - `signature_valid`
  - `processed_at`

Fallback option if nullable org is too invasive:

- add a dedicated pre-routing webhook audit table for unresolved events

Preferred option is better because it keeps one canonical raw-event pipeline.

## Error Handling

The webhook should classify failures into stable categories:

- `signature_failed`
- `secret_missing`
- `payload_invalid`
- `org_unresolved`
- `contact_resolution_failed`
- `conversation_persist_failed`
- `message_persist_failed`
- `status_update_failed`

These categories should be emitted in logs and stored in raw-event metadata so support can diagnose incidents without database forensics.

## Testing

### Operational Tests

- Meta test event reaches `POST /api/whatsapp/webhook`
- real inbound WhatsApp message appears in worker observability
- unresolved routing produces a visible raw-event record instead of silent loss

### Backend Tests

- valid webhook with mapped `phone_number_id` persists raw event and inbox message
- valid webhook with unmapped `phone_number_id` persists unresolved raw event
- invalid signature produces `401` and structured log entry
- duplicate webhook delivery does not create duplicate processed events
- status callback updates existing message state correctly

## Rollout

1. validate and correct the Meta callback configuration
2. deploy raw-event observability and deterministic idempotency
3. deploy updated webhook logs endpoint
4. verify with Meta test event
5. verify with a real inbound message from the clinic number

## Success Criteria

- production worker observability shows webhook traffic at `/api/whatsapp/webhook`
- every parseable webhook request leaves a durable trace
- unmatched `phone_number_id` is visible within minutes, not discovered through user complaints
- inbound WhatsApp messages appear in `/crm-whatsapp` without manual intervention
