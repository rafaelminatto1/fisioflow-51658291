# WhatsApp Webhook Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable WhatsApp inbound delivery into CRM by making webhook receipt observable, preserving unresolved events, fixing raw-event idempotency, and replacing the legacy webhook log endpoint.

**Architecture:** Keep the existing `apps/api/src/routes/whatsapp-webhook.ts` route as the single inbound entrypoint, but move persistence earlier in the flow so every parseable payload leaves a durable trace. Extend `wa_raw_events` with processing metadata, use deterministic idempotency keys, and make the legacy `/api/whatsapp/webhook-logs` endpoint read from the active `wa_*` pipeline instead of `whatsapp_messages`.

**Tech Stack:** Hono, TypeScript, Vitest, PostgreSQL/Neon, Drizzle schema files, SQL migrations, React query consumers in `src/api/v2` and `src/types/workers.ts`.

---

## File Structure

- Modify: `apps/api/src/routes/whatsapp-webhook.ts`
  - Receive webhook requests, validate signature, persist raw events before org routing, update processing state, and classify failures.
- Modify: `packages/db/src/schema/whatsapp-inbox.ts`
  - Extend `wa_raw_events` schema with routing and processing metadata.
- Create: `apps/api/migrations/0130_whatsapp_raw_event_observability.sql`
  - Add new raw-event columns and indexes.
- Create: `apps/api/migrations/0130_whatsapp_raw_event_observability.down.sql`
  - Revert the observability columns and indexes.
- Modify: `apps/api/src/routes/whatsapp.ts`
  - Replace the legacy `/webhook-logs` implementation with a query over `wa_raw_events`.
- Create: `apps/api/src/routes/__tests__/whatsapp-webhook.test.ts`
  - Route-level tests for signature failure, unresolved org persistence, and successful processing.
- Create: `apps/api/src/routes/__tests__/whatsapp-webhook-logs.test.ts`
  - Route-level tests for the new `/api/whatsapp/webhook-logs` payload.
- Modify: `src/types/workers.ts`
  - Expand `WhatsAppWebhookLog` to match the new backend response.

## Task 1: Extend Raw Event Storage for Observability

**Files:**
- Create: `apps/api/migrations/0130_whatsapp_raw_event_observability.sql`
- Create: `apps/api/migrations/0130_whatsapp_raw_event_observability.down.sql`
- Modify: `packages/db/src/schema/whatsapp-inbox.ts`
- Test: `pnpm --dir apps/api type-check`

- [ ] **Step 1: Write the migration SQL**

```sql
ALTER TABLE wa_raw_events
  ADD COLUMN IF NOT EXISTS phone_number_id varchar(64),
  ADD COLUMN IF NOT EXISTS processing_state varchar(40) DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS provider_event_id text,
  ADD COLUMN IF NOT EXISTS signature_valid boolean,
  ADD COLUMN IF NOT EXISTS request_path text;

CREATE INDEX IF NOT EXISTS idx_wa_events_phone_number_id
  ON wa_raw_events (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_wa_events_processing_state
  ON wa_raw_events (processing_state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_events_provider_event_id
  ON wa_raw_events (provider_event_id);
```

- [ ] **Step 2: Write the down migration**

```sql
DROP INDEX IF EXISTS idx_wa_events_provider_event_id;
DROP INDEX IF EXISTS idx_wa_events_processing_state;
DROP INDEX IF EXISTS idx_wa_events_phone_number_id;

ALTER TABLE wa_raw_events
  DROP COLUMN IF EXISTS request_path,
  DROP COLUMN IF EXISTS signature_valid,
  DROP COLUMN IF EXISTS provider_event_id,
  DROP COLUMN IF EXISTS failure_reason,
  DROP COLUMN IF EXISTS processing_state,
  DROP COLUMN IF EXISTS phone_number_id;
```

- [ ] **Step 3: Update the Drizzle schema**

```ts
export const waRawEvents = pgTable(
  "wa_raw_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id"),
    eventType: varchar("event_type", { length: 30 }),
    metaMessageId: text("meta_message_id"),
    phoneNumberId: varchar("phone_number_id", { length: 64 }),
    rawPayload: jsonb("raw_payload"),
    processed: boolean("processed").default(false),
    processingState: varchar("processing_state", { length: 40 }).default("received"),
    failureReason: text("failure_reason"),
    providerEventId: text("provider_event_id"),
    signatureValid: boolean("signature_valid"),
    requestPath: text("request_path"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_wa_events_organization_id").on(table.organizationId),
    index("idx_wa_events_meta_message_id").on(table.metaMessageId),
    index("idx_wa_events_phone_number_id").on(table.phoneNumberId),
    index("idx_wa_events_processing_state").on(table.processingState, table.createdAt),
    index("idx_wa_events_provider_event_id").on(table.providerEventId),
    uniqueIndex("idx_wa_events_idempotency_key").on(table.idempotencyKey),
    withOrganizationPolicy("wa_raw_events", table.organizationId),
  ],
);
```

- [ ] **Step 4: Run type-check to confirm the schema change compiles**

Run: `pnpm --dir apps/api type-check`
Expected: `tsc --noEmit` exits with code `0`

- [ ] **Step 5: Commit**

```bash
git add apps/api/migrations/0130_whatsapp_raw_event_observability.sql \
  apps/api/migrations/0130_whatsapp_raw_event_observability.down.sql \
  packages/db/src/schema/whatsapp-inbox.ts
git commit -m "feat: extend whatsapp raw event observability"
```

## Task 2: Cover Webhook Failure Modes with Route Tests

**Files:**
- Create: `apps/api/src/routes/__tests__/whatsapp-webhook.test.ts`
- Test: `apps/api/src/routes/__tests__/whatsapp-webhook.test.ts`

- [ ] **Step 1: Write the failing tests for signature and unresolved-org behavior**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockVerifyMetaSignature = vi.fn();
const mockIsDuplicate = vi.fn();
const mockMarkProcessed = vi.fn();
const mockResolveOrCreateContact = vi.fn();
const mockFindOrCreateConversation = vi.fn();
const mockAddMessage = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../whatsapp", () => ({
  verifyMetaSignature: (...args: unknown[]) => mockVerifyMetaSignature(...args),
}));

vi.mock("../../lib/whatsapp-idempotency", () => ({
  isDuplicate: (...args: unknown[]) => mockIsDuplicate(...args),
  markProcessed: (...args: unknown[]) => mockMarkProcessed(...args),
}));

vi.mock("../../lib/whatsapp-identity", () => ({
  resolveOrCreateContact: (...args: unknown[]) => mockResolveOrCreateContact(...args),
  linkContactToPatient: vi.fn(),
}));

vi.mock("../../lib/whatsapp-conversations", () => ({
  findOrCreateConversation: (...args: unknown[]) => mockFindOrCreateConversation(...args),
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { whatsappWebhookRoutes } = await import("../whatsapp-webhook");
  const app = new Hono<any>();
  app.route("/api/whatsapp/webhook", whatsappWebhookRoutes);
  return app;
}

const ENV = {
  ENVIRONMENT: "development",
  HYPERDRIVE: {},
  WHATSAPP_APP_SECRET: "secret",
  WHATSAPP_VERIFY_TOKEN: "verify-token",
} as any;

describe("POST /api/whatsapp/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyMetaSignature.mockResolvedValue(true);
    mockIsDuplicate.mockResolvedValue(false);
  });

  it("returns 401 for invalid signatures", async () => {
    mockVerifyMetaSignature.mockResolvedValue(false);
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-signature-256": "bad" },
        body: JSON.stringify({ entry: [] }),
      }),
      ENV,
    );

    expect(res.status).toBe(401);
  });

  it("persists a raw event even when org resolution fails", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "raw-evt-1" }] });

    const app = await buildApp();
    const body = {
      entry: [
        {
          id: "entry-1",
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123456" },
                messages: [{ id: "wamid.abc", from: "5511999999999", type: "text", text: { body: "oi" } }],
              },
            },
          ],
        },
      ],
    };

    const res = await app.fetch(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": "ok",
        },
        body: JSON.stringify(body),
      }),
      ENV,
    );

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO wa_raw_events"),
      expect.arrayContaining([null, "org_unresolved", "123456"]),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails against the current implementation**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook.test.ts`
Expected: FAIL because the current route does not persist unresolved raw events and the insert shape does not exist yet

- [ ] **Step 3: Add a success-path test for processed inbound messages**

```ts
it("marks the raw event as processed after a successful inbound message", async () => {
  mockQuery
    .mockResolvedValueOnce({ rows: [{ id: "org-1" }] })
    .mockResolvedValueOnce({ rows: [{ id: "raw-evt-1" }] })
    .mockResolvedValueOnce({ rows: [] });
  mockResolveOrCreateContact.mockResolvedValue({ id: "contact-1", patient_id: null });
  mockFindOrCreateConversation.mockResolvedValue({ id: "conversation-1" });
  mockAddMessage.mockResolvedValue({ id: "message-1" });

  const app = await buildApp();
  const body = {
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            value: {
              metadata: { phone_number_id: "123456" },
              contacts: [{ wa_id: "5511999999999", profile: { name: "Maria" } }],
              messages: [{ id: "wamid.abc", from: "5511999999999", type: "text", text: { body: "oi" } }],
            },
          },
        ],
      },
    ],
  };

  const res = await app.fetch(
    new Request("http://localhost/api/whatsapp/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": "ok" },
      body: JSON.stringify(body),
    }),
    ENV,
  );

  expect(res.status).toBe(200);
  expect(mockAddMessage).toHaveBeenCalled();
  expect(mockQuery).toHaveBeenCalledWith(
    expect.stringContaining("UPDATE wa_raw_events"),
    expect.arrayContaining(["processed", null]),
  );
});
```

- [ ] **Step 4: Run the test file again**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook.test.ts`
Expected: FAIL until Task 3 is implemented

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/__tests__/whatsapp-webhook.test.ts
git commit -m "test: cover whatsapp webhook failure modes"
```

## Task 3: Harden the Webhook Route and Idempotency

**Files:**
- Modify: `apps/api/src/routes/whatsapp-webhook.ts`
- Test: `apps/api/src/routes/__tests__/whatsapp-webhook.test.ts`

- [ ] **Step 1: Add raw-event helper types and deterministic key builders**

```ts
type RawEventState =
  | "received"
  | "signature_failed"
  | "payload_invalid"
  | "org_unresolved"
  | "processed"
  | "processing_error";

function extractProviderEventId(body: Record<string, unknown>): string | null {
  return (
    (body as any).entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ??
    (body as any).entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id ??
    null
  );
}

function buildRawEventKey(
  eventType: string,
  phoneNumberId: string | null,
  entryId: string,
  providerEventId: string | null,
) {
  return [eventType, phoneNumberId ?? "no-phone", entryId || "no-entry", providerEventId || "no-provider"]
    .join(":")
    .replace(/\s+/g, "_");
}
```

- [ ] **Step 2: Persist invalid-signature and invalid-payload attempts**

```ts
app.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  const appSecret = c.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error("[WhatsApp Webhook] missing WHATSAPP_APP_SECRET");
    return c.json({ error: "App secret not configured" }, 500);
  }

  const valid = await verifyMetaSignature(appSecret, rawBody, signature);
  if (!valid) {
    const phoneNumberId = JSON.parse(rawBody || "{}")?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null;
    c.executionCtx.waitUntil(
      writeWebhookAudit(c.env, {
        organizationId: null,
        eventType: "unknown",
        rawBody,
        phoneNumberId,
        providerEventId: null,
        signatureValid: false,
        processingState: "signature_failed",
        failureReason: "invalid_signature",
        requestPath: "/api/whatsapp/webhook",
      }),
    );
    return c.json({ error: "Assinatura invalida" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    c.executionCtx.waitUntil(
      writeWebhookAudit(c.env, {
        organizationId: null,
        eventType: "unknown",
        rawBody,
        phoneNumberId: null,
        providerEventId: null,
        signatureValid: true,
        processingState: "payload_invalid",
        failureReason: "invalid_json",
        requestPath: "/api/whatsapp/webhook",
      }),
    );
    return c.json({ error: "Payload invalido" }, 400);
  }

  c.executionCtx.waitUntil(processWebhook(body, c.env, rawBody));
  return c.json({ status: "ok" });
});
```

- [ ] **Step 3: Persist the raw event before org routing and update processing state later**

```ts
async function processWebhook(body: Record<string, unknown>, env: Env, rawBody: string): Promise<void> {
  const pool = await createPool(env);
  const entries = (body.entry as any[]) ?? [];

  for (const entry of entries) {
    const changes = entry?.changes ?? [];
    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id ?? null;
      const eventType = value.messages?.length ? "message" : value.statuses?.length ? "status" : value.system ? "system" : "unknown";
      const providerEventId = extractProviderEventId(body);
      const rawEventId = await storeRawEvent(pool, {
        organizationId: null,
        eventType,
        rawBody,
        phoneNumberId,
        providerEventId,
        signatureValid: true,
        processingState: "received",
        failureReason: null,
        requestPath: "/api/whatsapp/webhook",
      });

      const orgId = await resolveOrgId(pool, phoneNumberId ?? undefined);
      if (!orgId) {
        await updateRawEventState(pool, rawEventId, "org_unresolved", "phone_number_id_not_mapped");
        continue;
      }

      await attachRawEventOrganization(pool, rawEventId, orgId);

      try {
        if (value.messages?.length) {
          for (const msg of value.messages) await handleMessage(pool, env, orgId, msg, value.contacts);
        }
        if (value.statuses?.length) {
          for (const status of value.statuses) await handleStatus(pool, env, orgId, status);
        }
        if (value.system) {
          await handleSystem(pool, orgId, value.system);
        }

        await updateRawEventState(pool, rawEventId, "processed", null);
      } catch (error) {
        await updateRawEventState(
          pool,
          rawEventId,
          "processing_error",
          error instanceof Error ? error.message : "unknown_processing_error",
        );
        throw error;
      }
    }
  }
}
```

- [ ] **Step 4: Replace the old raw-event insert helper**

```ts
async function storeRawEvent(
  pool: any,
  params: {
    organizationId: string | null;
    eventType: string;
    rawBody: string;
    phoneNumberId: string | null;
    providerEventId: string | null;
    signatureValid: boolean;
    processingState: RawEventState;
    failureReason: string | null;
    requestPath: string;
  },
): Promise<string> {
  const parsed = JSON.parse(params.rawBody || "{}");
  const entryId = parsed?.entry?.[0]?.id ?? "";
  const idempotencyKey = buildRawEventKey(
    params.eventType,
    params.phoneNumberId,
    entryId,
    params.providerEventId,
  );

  const result = await pool.query(
    `INSERT INTO wa_raw_events (
       organization_id, event_type, meta_message_id, phone_number_id, raw_payload,
       processed, processing_state, failure_reason, provider_event_id,
       signature_valid, request_path, idempotency_key, created_at
     ) VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, now())
     ON CONFLICT (idempotency_key)
     DO UPDATE SET raw_payload = EXCLUDED.raw_payload
     RETURNING id`,
    [
      params.organizationId,
      params.eventType,
      params.providerEventId,
      params.phoneNumberId,
      params.rawBody,
      params.processingState === "processed",
      params.processingState,
      params.failureReason,
      params.providerEventId,
      params.signatureValid,
      params.requestPath,
      idempotencyKey,
    ],
  );

  return result.rows[0].id;
}
```

- [ ] **Step 5: Run the webhook route tests and API type-check**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook.test.ts && pnpm --dir apps/api type-check`
Expected: tests PASS and `tsc --noEmit` exits with code `0`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/whatsapp-webhook.ts \
  apps/api/src/routes/__tests__/whatsapp-webhook.test.ts
git commit -m "fix: preserve whatsapp webhook events before routing"
```

## Task 4: Replace the Legacy Webhook Logs Endpoint

**Files:**
- Modify: `apps/api/src/routes/whatsapp.ts`
- Create: `apps/api/src/routes/__tests__/whatsapp-webhook-logs.test.ts`
- Modify: `src/types/workers.ts`
- Test: `apps/api/src/routes/__tests__/whatsapp-webhook-logs.test.ts`

- [ ] **Step 1: Write the failing test for `/api/whatsapp/webhook-logs`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { uid: "user-1", organizationId: "org-1", role: "admin", email: "admin@test.com" });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { whatsappRoutes } = await import("../whatsapp");
  const app = new Hono<any>();
  app.route("/api/whatsapp", whatsappRoutes);
  return app;
}

describe("GET /api/whatsapp/webhook-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows from wa_raw_events with processing metadata", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "evt-1",
          event_type: "message",
          phone_number_id: "123456",
          meta_message_id: "wamid.abc",
          processing_state: "org_unresolved",
          failure_reason: "phone_number_id_not_mapped",
          signature_valid: true,
          raw_payload: { entry: [] },
          created_at: new Date("2026-06-25T12:00:00Z"),
        },
      ],
    });

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/whatsapp/webhook-logs?limit=10", {
        headers: { Authorization: "Bearer fake-token" },
      }),
      { HYPERDRIVE: {}, ENVIRONMENT: "development" } as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data[0]).toMatchObject({
      id: "evt-1",
      event_type: "message",
      phone_number_id: "123456",
      processing_state: "org_unresolved",
      failure_reason: "phone_number_id_not_mapped",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook-logs.test.ts`
Expected: FAIL because the current route still queries `whatsapp_messages`

- [ ] **Step 3: Replace the route query and response shape**

```ts
app.get("/webhook-logs", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { limit = "100" } = c.req.query();

  const result = await pool.query(
    `
      SELECT
        id,
        organization_id,
        event_type,
        meta_message_id,
        phone_number_id,
        processing_state,
        failure_reason,
        signature_valid,
        raw_payload,
        created_at,
        processed_at
      FROM wa_raw_events
      WHERE organization_id = $1 OR organization_id IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [user.organizationId, Number(limit)],
  );

  return c.json({
    data: result.rows.map((row) => ({
      id: row.id,
      event_type: row.event_type ?? "unknown",
      meta_message_id: row.meta_message_id ?? null,
      phone_number_id: row.phone_number_id ?? null,
      processing_state: row.processing_state ?? "received",
      failure_reason: row.failure_reason ?? null,
      signature_valid: row.signature_valid ?? null,
      payload: row.raw_payload ?? {},
      created_at: row.created_at?.toISOString?.() ?? null,
      processed_at: row.processed_at?.toISOString?.() ?? null,
    })),
  });
});
```

- [ ] **Step 4: Update the shared frontend type**

```ts
export interface WhatsAppWebhookLog {
  id: string;
  event_type: string;
  meta_message_id?: string | null;
  phone_number_id?: string | null;
  processing_state?: string | null;
  failure_reason?: string | null;
  signature_valid?: boolean | null;
  payload: Record<string, unknown>;
  created_at: string;
  processed_at?: string | null;
}
```

- [ ] **Step 5: Run tests and type-check**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook-logs.test.ts && pnpm --dir apps/api type-check`
Expected: test PASS and `tsc --noEmit` exits with code `0`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/whatsapp.ts \
  apps/api/src/routes/__tests__/whatsapp-webhook-logs.test.ts \
  src/types/workers.ts
git commit -m "feat: expose crm webhook logs from wa raw events"
```

## Task 5: Final Verification and Operational Hand-off

**Files:**
- Modify: `docs/superpowers/specs/2026-06-25-whatsapp-webhook-recovery-design.md` only if the implemented behavior changed materially
- Test: worker observability and Meta test event

- [ ] **Step 1: Run the focused backend test suite**

Run: `pnpm --dir apps/api test:unit -- src/routes/__tests__/whatsapp-webhook.test.ts src/routes/__tests__/whatsapp-webhook-logs.test.ts`
Expected: both test files PASS

- [ ] **Step 2: Run the full API type-check**

Run: `pnpm --dir apps/api type-check`
Expected: `tsc --noEmit` exits with code `0`

- [ ] **Step 3: Build the worker**

Run: `pnpm --dir apps/api build`
Expected: `wrangler deploy --dry-run --env production` completes without TypeScript or bundling failures

- [ ] **Step 4: Validate in production observability after deploy**

Run:

```bash
wrangler tail fisioflow-api --format pretty --search "whatsapp/webhook"
```

Expected:

- a Meta test event produces `POST /api/whatsapp/webhook`
- invalid signature cases show structured failure evidence
- unmapped `phone_number_id` cases persist a raw event instead of disappearing

- [ ] **Step 5: Validate in Meta**

Checklist:

```text
Callback URL: https://api-pro.moocafisio.com.br/api/whatsapp/webhook
Verify Token: must match WHATSAPP_VERIFY_TOKEN
Subscribed fields: messages plus required status fields
Test event: reaches the production worker and appears in wa_raw_events-backed logs
```

- [ ] **Step 6: Commit final verification notes if docs changed**

```bash
git add docs/superpowers/specs/2026-06-25-whatsapp-webhook-recovery-design.md
git commit -m "docs: align whatsapp webhook recovery notes"
```

## Self-Review

- Spec coverage:
  - Meta validation checklist: covered in Task 5 Step 5
  - preserve raw events before routing: covered in Task 3
  - deterministic idempotency: covered in Task 3 Step 4
  - replace legacy webhook logs: covered in Task 4
  - schema support for processing metadata: covered in Task 1
- Placeholder scan:
  - no `TBD`, `TODO`, or implicit “add tests later” steps remain
- Type consistency:
  - backend response fields and `WhatsAppWebhookLog` fields match in Task 4

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-25-whatsapp-webhook-recovery.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
