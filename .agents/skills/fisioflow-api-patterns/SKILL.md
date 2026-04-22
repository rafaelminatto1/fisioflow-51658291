# FisioFlow API Patterns & Conventions

Reference guide for creating new routes that match the existing codebase. The API is a Cloudflare Worker built with Hono.js, Drizzle ORM, and Neon Auth.

---

## 1. Route File Structure

Every route file follows this pattern:

```ts
import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import { withTenant } from "../lib/db-utils";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env, "read");
  const result = await db.select().from(/* table */).where(
    withTenant(/* table */, user.organizationId)
  );
  return c.json({ data: result });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = createDb(c.env);
  const body = await c.req.json();
  const result = await db.insert(/* table */).values(/* values */).returning();
  return c.json({ data: result[0] }, 201);
});

export { app as myFeatureRoutes };
```

### File naming
- Route files: `apps/api/src/routes/<featureName>.ts`
- Export name: `<featureName>Routes`

### Registration in index.ts
Add to the `apiRoutes` array in `apps/api/src/index.ts`:

```ts
["/api/my-feature", myFeatureRoutes],
```

---

## 2. Hono App Type

Every route creates its own Hono app with this type signature:

```ts
const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
```

Unauthenticated routes (e.g. auth, webhooks, public booking) omit `AuthVariables`:

```ts
const app = new Hono<{ Bindings: Env }>();
```

---

## 3. Middleware Chain

Global middleware (applied in `index.ts` in this order):

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `cors()` | Origin allowlist from `ALLOWED_ORIGINS` env var. Wildcard only outside production. |
| 2 | `logger()` | Request logging |
| 3 | `secureHeaders()` | Security headers |
| 4 | `requestIdMiddleware` | Generates/propagates `X-Request-ID` |
| 5 | `analyticsMiddleware` | Fire-and-forget analytics |
| 6 | `errorHandler` | Global error handler via `app.onError()` |

### Per-route middleware

**Auth** — applied two ways:

```ts
app.use("*", requireAuth);
```

```ts
app.get("/", requireAuth, async (c) => { });
```

Both work. The first applies to all routes in the sub-app. The second is per-handler.

**Rate limiting** — applied per-handler with config:

```ts
app.post("/", requireAuth, rateLimit({ limit: 20, windowSeconds: 3600, endpoint: "feature-name" }), async (c) => { });
```

For unauthenticated routes, provide `keyFn`:

```ts
rateLimit({
  limit: 10,
  windowSeconds: 900,
  endpoint: "auth-login",
  keyFn: (c) => c.req.header("CF-Connecting-IP") ?? "unknown",
})
```

**Validation** — inline in handler (most common) or via `validate(schema)` middleware:

```ts
app.post("/", requireAuth, validate(myZodSchema), async (c) => {
  const body = c.get("validatedBody");
});
```

---

## 4. Authentication Flow

`requireAuth` middleware in `lib/auth.ts`:

1. Extracts token from `Authorization: Bearer <token>`, query param `?token=`, or cookies (`__Secure-neon-auth.session_token`, `better-auth.session-token`, `auth_session`, `__session`)
2. If JWT: verifies against JWKS (`NEON_AUTH_JWKS_URL`) using `jose`
3. If opaque session token: tries `/get-session` endpoint, then falls back to DB lookup in `neon_auth.session`
4. Resolves user's `organizationId` and `role` from the `profiles` table
5. Sets `c.set("user", { uid, email, organizationId, role })`
6. Calls `runWithOrg(user.organizationId, () => next())` to set RLS context via `AsyncLocalStorage`

**Access the user in handlers:**

```ts
const user = c.get("user");
user.uid
user.email
user.organizationId
user.role
```

---

## 5. Database Access Patterns

Two approaches are used in the codebase:

### Drizzle ORM (preferred for new routes)

```ts
import { createDb } from "../lib/db";
import { withTenant } from "../lib/db-utils";
import { patients } from "@fisioflow/db";
import { eq, and, sql, desc } from "drizzle-orm";

const db = createDb(c.env, "read");
const result = await db
  .select()
  .from(patients)
  .where(withTenant(patients, user.organizationId, eq(patients.id, id)));

const db = createDb(c.env);
const [row] = await db.insert(patients).values(payload).returning();
const [row] = await db.update(patients).set(payload).where(
  withTenant(patients, user.organizationId, eq(patients.id, id))
).returning();
```

**`withTenant` helper** — always use this for tenant-scoped queries. It adds `organizationId = $1` and `deletedAt IS NULL` filters:

```ts
withTenant(table, user.organizationId)
withTenant(table, user.organizationId, eq(table.id, id))
```

**Read vs Write:**

```ts
createDb(c.env, "read")
createDb(c.env)
createDb(c.env, "write")
```

### Raw SQL via `createPool` (for complex queries)

```ts
import { createPool } from "../lib/db";

const pool = createPool(c.env);
const result = await pool.query(
  "SELECT * FROM table WHERE organization_id = $1 AND status = $2",
  [user.organizationId, "active"]
);
```

### Raw SQL via `getRawSql` (for simple queries)

```ts
import { getRawSql } from "../lib/db";
const sql = getRawSql(c.env);
const result = await sql("SELECT 1 as test");
```

### RLS Context

Row Level Security is handled automatically. `requireAuth` sets the org context via `runWithOrg()`. Every `createDb`/`createPool`/`getRawSql` call wraps queries in a transaction that runs `set_config('app.org_id', $1, true)`.

---

## 6. Validation Patterns

### Inline validation (most common)

```ts
const body = await c.req.json();
if (!body.name) return c.json({ error: "Nome é obrigatório" }, 400);
if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
```

### Zod schema validation middleware

```ts
import { validate } from "../middleware/validation";

app.post("/", validate(mySchema), async (c) => {
  const body = c.get("validatedBody");
});
```

### Zod schemas for AI outputs

```ts
import { z } from "zod";

export const MySchema = z.object({
  name: z.string().describe("Description for AI context"),
  items: z.array(z.string()).min(1),
});
export type MyType = z.infer<typeof MySchema>;
```

Schemas live in `apps/api/src/schemas/`.

### UUID validation

```ts
import { isUuid } from "../lib/validators";

if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
```

---

## 7. Response Format Patterns

All responses follow consistent shapes:

**Success (single item):**
```ts
return c.json({ data: normalizedRow });
```

**Success (list with pagination):**
```ts
return c.json({ data: items, total: 100, page: 1, perPage: 50 });
```

**Success (created):**
```ts
return c.json({ data: normalizedRow }, 201);
```

**Success (action):**
```ts
return c.json({ success: true });
return c.json({ ok: true });
```

**Error:**
```ts
return c.json({ error: "Human-readable message" }, 400);
return c.json({ error: "Message", details: "Technical details" }, 500);
return c.json({ error: "Message", code: "VALIDATION_ERROR" }, 400);
```

**HTTP status codes used:**
- `200` — success
- `201` — created
- `400` — validation error, bad request
- `401` — unauthorized
- `404` — not found
- `409` — conflict (duplicate, capacity exceeded)
- `429` — rate limited
- `500` — internal server error
- `504` — timeout

---

## 8. Error Handling Conventions

### In-route try/catch (standard pattern)

```ts
try {
  const result = await db.select().from(table).where(condition);
  return c.json({ data: result });
} catch (error) {
  console.error("[Feature/Action] Error:", error);
  return c.json({ error: "Erro ao buscar X" }, 500);
}
```

### Database-specific error handling

```ts
function dbErrorResponse(error: unknown): { message: string; status: 409 | 500 } {
  const err = error as any;
  if (err?.code === "23505") {
    return { message: "Registro duplicado", status: 409 };
  }
  return { message: err instanceof Error ? err.message : "Erro desconhecido", status: 500 };
}
```

### Global error handler

`errorHandler` in `middleware/errorHandler.ts` catches unhandled errors, classifies them (DATABASE, TIMEOUT, AUTH, VALIDATION, NOT_FOUND, RATE_LIMIT, INTERNAL), logs to Axiom for 5xx errors, and returns standardized JSON with `requestId`.

---

## 9. Row Normalization Pattern

Every route file defines a `normalizeXxxRow()` function that maps DB columns (both camelCase from Drizzle and snake_case from raw SQL) to a consistent response shape:

```ts
function normalizeFeatureRow(row: any) {
  return {
    ...row,
    id: String(row.id),
    name: row.fullName ?? row.full_name ?? row.name,
    created_at: row.createdAt ? String(row.createdAt) : null,
    updated_at: row.updatedAt ? String(row.updatedAt) : null,
  };
}
```

Always use the normalizer before returning data.

---

## 10. Background Tasks

Use `c.executionCtx.waitUntil()` for fire-and-forget work after sending the response:

```ts
c.executionCtx.waitUntil((async () => {
  await broadcastToOrg(c.env, user.organizationId, {
    type: "ITEM_UPDATED",
    payload: { id, action: "updated" },
  });
  await triggerInngestEvent(c.env, c.executionCtx, "item.created", { id }, { id: user.uid });
})());
```

---

## 11. Accepting Both camelCase and snake_case

The API accepts both naming conventions from clients:

```ts
const patientId = body.patientId || body.patient_id;
const startTime = body.startTime || body.start_time;
```

---

## 12. Soft Delete Pattern

Most entities use soft delete (archiving):

```ts
await db.update(patients).set({
  isActive: false,
  status: "Arquivado",
  deletedAt: new Date(),
  updatedAt: new Date(),
}).where(condition);
```

The `withTenant()` helper automatically filters `deletedAt IS NULL` from queries.

---

## 13. New Route Checklist

1. Create `apps/api/src/routes/<feature>.ts` with the Hono sub-app pattern
2. Import `requireAuth`, `AuthVariables`, `Env`, `createDb`/`createPool`, `withTenant`
3. Define a `normalizeXxxRow()` function
4. Add CRUD handlers following the response format patterns above
5. Export as `<feature>Routes`
6. Register in `index.ts` `apiRoutes` array: `["/api/<feature>", <feature>Routes]`
7. Import the table from `@fisioflow/db` if using Drizzle ORM
8. Always use `withTenant()` for tenant-scoped queries
9. Use `isUuid()` for ID param validation
10. Wrap background work in `c.executionCtx.waitUntil()`
