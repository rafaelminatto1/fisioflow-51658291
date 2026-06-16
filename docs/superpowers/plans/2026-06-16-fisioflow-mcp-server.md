# FisioFlow MCP Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A remote MCP server on Cloudflare Workers exposing 4 FisioFlow tools (evidence, exercises, patient history, scheduling) as thin authenticated HTTP clients of the existing `fisioflow-api`.

**Architecture:** `apps/mcp-server` Worker using Agents SDK `McpAgent` + `@modelcontextprotocol/sdk`. Pure tool functions `(apiUrl, token, args) → result` (unit-tested with mocked fetch); a thin McpAgent registers them; the fetch handler extracts the Bearer JWT and mounts SSE/HTTP. Tools call the existing API which enforces auth/RLS.

**Tech Stack:** Cloudflare Workers, Agents SDK `agents@^0.15`, `@modelcontextprotocol/sdk`, Zod, Vitest, TypeScript strict.

**API contracts (verified):**
- `GET /api/evidence/search?q=&limit=` → `{ count, data:[...] }`
- `GET /api/exercises?q=&limit=` → list payload
- `GET /api/patients/:id` → patient; `GET /api/sessions?patientId=<uuid>` → sessions
- `POST /api/appointments` body `{ patientId, date (YYYY-MM-DD), startTime (HH:MM), durationMinutes, notes? }`
- All require `Authorization: Bearer <Neon Auth JWT>`.

---

## File Structure
| File | Responsibility |
|------|----------------|
| `apps/mcp-server/package.json` | pkg `@fisioflow/mcp-server` + deps |
| `apps/mcp-server/tsconfig.json` | extends root tsconfig |
| `apps/mcp-server/wrangler.jsonc` | DO binding (McpAgent), `nodejs_compat`, var `FISIOFLOW_API_URL` |
| `apps/mcp-server/src/apiClient.ts` | `fetchApi(apiUrl, token, path, init?)` pure wrapper |
| `apps/mcp-server/src/tools/searchEvidence.ts` | `searchEvidence(apiUrl, token, args)` |
| `apps/mcp-server/src/tools/searchExercises.ts` | `searchExercises(apiUrl, token, args)` |
| `apps/mcp-server/src/tools/getPatientHistory.ts` | `getPatientHistory(apiUrl, token, args)` |
| `apps/mcp-server/src/tools/scheduleSession.ts` | `scheduleSession(apiUrl, token, args)` |
| `apps/mcp-server/src/server.ts` | `FisioFlowMCP extends McpAgent<Env>` registers tools |
| `apps/mcp-server/src/index.ts` | fetch handler: extract Bearer, mount McpAgent |
| `apps/mcp-server/src/__tests__/*.test.ts` | unit tests |

---

## Task 1: Scaffold package + config

**Files:** `apps/mcp-server/package.json`, `tsconfig.json`, `wrangler.jsonc`, `vitest.config.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@fisioflow/mcp-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "agents": "^0.15.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "wrangler": "^4.100.0",
    "vitest": "^4.1.8",
    "typescript": "^5.6.0",
    "@cloudflare/workers-types": "^4.20240000.0"
  }
}
```
> Match `zod` / `@cloudflare/workers-types` / `typescript` versions to the root lockfile (run `grep '"zod"' ../../package.json apps/api/package.json` and align). Use the same major as the rest of the monorepo.

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src"]
}
```
> If `../../tsconfig.json` doesn't exist or conflicts, mirror `apps/api/tsconfig.json` instead.

- [ ] **Step 3: wrangler.jsonc**

```jsonc
{
  "name": "fisioflow-mcp",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-14",
  "compatibility_flags": ["nodejs_compat"],
  "vars": { "FISIOFLOW_API_URL": "https://fisioflow-api.rafalegollas.workers.dev" },
  "durable_objects": {
    "bindings": [{ "name": "MCP_OBJECT", "class_name": "FisioFlowMCP" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["FisioFlowMCP"] }]
}
```

- [ ] **Step 4: vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node" } });
```

- [ ] **Step 5: Install + commit**

```bash
cd /home/rafael/Documents/fisioflow/fisioflow-51658291/.claude/worktrees/fisioflow-mcp-server
corepack pnpm install
git add apps/mcp-server/package.json apps/mcp-server/tsconfig.json apps/mcp-server/wrangler.jsonc apps/mcp-server/vitest.config.ts pnpm-lock.yaml
git commit -m "feat(mcp-server): scaffold package + wrangler config"
```

---

## Task 2: apiClient wrapper

**Files:** `apps/mcp-server/src/apiClient.ts`, `apps/mcp-server/src/__tests__/apiClient.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApi } from "../apiClient";

describe("fetchApi", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("GETs with bearer token and returns json", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const out = await fetchApi("https://api.test", "tok", "/api/x?q=1");
    expect(out).toEqual({ ok: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.test/api/x?q=1");
    expect((init as any).headers.Authorization).toBe("Bearer tok");
  });
  it("throws a clean error on non-ok without leaking the token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    await expect(fetchApi("https://api.test", "secret-tok", "/api/x")).rejects.toThrow(/401/);
    await expect(fetchApi("https://api.test", "secret-tok", "/api/x")).rejects.not.toThrow(/secret-tok/);
  });
  it("rejects when no token provided", async () => {
    await expect(fetchApi("https://api.test", "", "/api/x")).rejects.toThrow(/autentic/i);
  });
});
```

- [ ] **Step 2: Run test → fail.** `cd apps/mcp-server && npx vitest run src/__tests__/apiClient.test.ts`

- [ ] **Step 3: Implement**

```ts
export async function fetchApi<T = unknown>(
  apiUrl: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!token) throw new Error("Não autenticado: token Bearer ausente.");
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      detail = "";
    }
    throw new Error(`API ${path} falhou: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 4: Run test → pass.**

- [ ] **Step 5: Commit** `git commit -am "feat(mcp-server): authenticated apiClient wrapper"`

---

## Task 3: Tool — search_evidence

**Files:** `apps/mcp-server/src/tools/searchEvidence.ts`, `apps/mcp-server/src/__tests__/searchEvidence.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchEvidence, searchEvidenceSchema } from "../tools/searchEvidence";

describe("searchEvidence", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("has a zod schema requiring q", () => {
    expect(() => searchEvidenceSchema.parse({})).toThrow();
    expect(searchEvidenceSchema.parse({ q: "knee" }).q).toBe("knee");
  });
  it("calls the evidence endpoint with q and limit", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ count: 1, data: [{ pmid: "1" }] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const out = await searchEvidence("https://api.test", "tok", { q: "knee pain", limit: 5 });
    expect(out.count).toBe(1);
    expect(String(f.mock.calls[0][0])).toContain("/api/evidence/search?q=knee+pain&limit=5");
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";
import { fetchApi } from "../apiClient";

export const searchEvidenceSchema = z.object({
  q: z.string().min(3, "consulta muito curta"),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchEvidenceArgs = z.infer<typeof searchEvidenceSchema>;

export async function searchEvidence(apiUrl: string, token: string, args: SearchEvidenceArgs) {
  const qs = new URLSearchParams({ q: args.q });
  if (args.limit) qs.set("limit", String(args.limit));
  return fetchApi<{ count: number; data: unknown[] }>(apiUrl, token, `/api/evidence/search?${qs.toString()}`);
}
```

- [ ] **Step 4: Run → pass.**  **Step 5: Commit** `git commit -am "feat(mcp-server): search_evidence tool"`

---

## Task 4: Tool — search_exercises

**Files:** `apps/mcp-server/src/tools/searchExercises.ts`, test `src/__tests__/searchExercises.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExercises, searchExercisesSchema } from "../tools/searchExercises";

describe("searchExercises", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires q in schema", () => {
    expect(() => searchExercisesSchema.parse({})).toThrow();
  });
  it("calls /api/exercises with q and limit", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    await searchExercises("https://api.test", "tok", { q: "agachamento", limit: 10 });
    expect(String(f.mock.calls[0][0])).toContain("/api/exercises?q=agachamento&limit=10");
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";
import { fetchApi } from "../apiClient";

export const searchExercisesSchema = z.object({
  q: z.string().min(2, "consulta muito curta"),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SearchExercisesArgs = z.infer<typeof searchExercisesSchema>;

export async function searchExercises(apiUrl: string, token: string, args: SearchExercisesArgs) {
  const qs = new URLSearchParams({ q: args.q });
  if (args.limit) qs.set("limit", String(args.limit));
  return fetchApi(apiUrl, token, `/api/exercises?${qs.toString()}`);
}
```

- [ ] **Step 4: Run → pass.**  **Step 5: Commit** `git commit -am "feat(mcp-server): search_exercises tool"`

---

## Task 5: Tool — get_patient_history

**Files:** `apps/mcp-server/src/tools/getPatientHistory.ts`, test `src/__tests__/getPatientHistory.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPatientHistory, getPatientHistorySchema } from "../tools/getPatientHistory";

describe("getPatientHistory", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("requires a uuid patientId", () => {
    expect(() => getPatientHistorySchema.parse({ patientId: "x" })).toThrow();
    expect(getPatientHistorySchema.parse({ patientId: "11111111-1111-1111-1111-111111111111" }).patientId)
      .toMatch(/1111/);
  });
  it("fetches patient then sessions and merges", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("/api/sessions")
        ? new Response(JSON.stringify({ data: [{ id: "s1" }] }), { status: 200 })
        : new Response(JSON.stringify({ id: "p1", full_name: "Maria" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    const out = await getPatientHistory("https://api.test", "tok", { patientId: "11111111-1111-1111-1111-111111111111" });
    expect(out.patient).toMatchObject({ id: "p1" });
    expect(out.sessions).toHaveLength(1);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/api/patients/11111111-1111-1111-1111-111111111111"))).toBe(true);
    expect(urls.some((u) => u.includes("/api/sessions?patientId=11111111-1111-1111-1111-111111111111"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";
import { fetchApi } from "../apiClient";

export const getPatientHistorySchema = z.object({
  patientId: z.string().uuid("patientId deve ser UUID"),
});
export type GetPatientHistoryArgs = z.infer<typeof getPatientHistorySchema>;

export async function getPatientHistory(apiUrl: string, token: string, args: GetPatientHistoryArgs) {
  const patient = await fetchApi(apiUrl, token, `/api/patients/${args.patientId}`);
  const sessionsResp = await fetchApi<{ data?: unknown[] }>(
    apiUrl,
    token,
    `/api/sessions?patientId=${args.patientId}`,
  );
  return { patient, sessions: sessionsResp?.data ?? [] };
}
```

- [ ] **Step 4: Run → pass.**  **Step 5: Commit** `git commit -am "feat(mcp-server): get_patient_history tool"`

---

## Task 6: Tool — schedule_session

**Files:** `apps/mcp-server/src/tools/scheduleSession.ts`, test `src/__tests__/scheduleSession.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleSession, scheduleSessionSchema } from "../tools/scheduleSession";

describe("scheduleSession", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("validates required fields and formats", () => {
    expect(() => scheduleSessionSchema.parse({ patientId: "11111111-1111-1111-1111-111111111111" })).toThrow();
    const ok = scheduleSessionSchema.parse({
      patientId: "11111111-1111-1111-1111-111111111111", date: "2026-07-01", startTime: "09:00",
    });
    expect(ok.date).toBe("2026-07-01");
  });
  it("POSTs to /api/appointments with the body", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ id: "a1" }), { status: 201 }));
    vi.stubGlobal("fetch", f);
    await scheduleSession("https://api.test", "tok", {
      patientId: "11111111-1111-1111-1111-111111111111", date: "2026-07-01", startTime: "09:00", durationMinutes: 50,
    });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/api/appointments");
    expect((init as any).method).toBe("POST");
    const body = JSON.parse((init as any).body);
    expect(body).toMatchObject({ patientId: "11111111-1111-1111-1111-111111111111", date: "2026-07-01", startTime: "09:00", durationMinutes: 50 });
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement**

```ts
import { z } from "zod";
import { fetchApi } from "../apiClient";

export const scheduleSessionSchema = z.object({
  patientId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date deve ser YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime deve ser HH:MM"),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  notes: z.string().max(2000).optional(),
});
export type ScheduleSessionArgs = z.infer<typeof scheduleSessionSchema>;

export async function scheduleSession(apiUrl: string, token: string, args: ScheduleSessionArgs) {
  return fetchApi(apiUrl, token, `/api/appointments`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}
```

- [ ] **Step 4: Run → pass.**  **Step 5: Commit** `git commit -am "feat(mcp-server): schedule_session tool"`

---

## Task 7: McpAgent server + fetch handler

**Files:** `apps/mcp-server/src/server.ts`, `apps/mcp-server/src/index.ts`

> Tool callbacks read the caller token from `this.props.token` (populated in `index.ts` from the
> request's `Authorization` header). Each tool returns MCP `content` text. Verify the exact
> `McpAgent` props/mount API against the installed `agents@^0.15` (the `init()` + `this.server.tool`
> shape and `McpAgent.serveSSE("/sse")` / `.serve("/mcp")` are current per Cloudflare docs).

- [ ] **Step 1: Write `server.ts`**

```ts
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchEvidence, searchEvidenceSchema } from "./tools/searchEvidence";
import { searchExercises, searchExercisesSchema } from "./tools/searchExercises";
import { getPatientHistory, getPatientHistorySchema } from "./tools/getPatientHistory";
import { scheduleSession, scheduleSessionSchema } from "./tools/scheduleSession";

export interface Env {
  FISIOFLOW_API_URL: string;
  MCP_OBJECT: DurableObjectNamespace;
}
type Props = { token: string };

export class FisioFlowMCP extends McpAgent<Env, unknown, Props> {
  server = new McpServer({ name: "fisioflow", version: "1.0.0" });

  async init() {
    const apiUrl = this.env.FISIOFLOW_API_URL;
    const token = () => this.props.token ?? "";
    const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });
    const err = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: String((e as Error)?.message ?? e) }] });

    this.server.tool("search_evidence", "Busca evidência científica (PubMed) no FisioFlow.", searchEvidenceSchema.shape, async (a) => {
      try { return ok(await searchEvidence(apiUrl, token(), a)); } catch (e) { return err(e); }
    });
    this.server.tool("search_exercises", "Busca exercícios na biblioteca do FisioFlow.", searchExercisesSchema.shape, async (a) => {
      try { return ok(await searchExercises(apiUrl, token(), a)); } catch (e) { return err(e); }
    });
    this.server.tool("get_patient_history", "Histórico do paciente (dados + sessões).", getPatientHistorySchema.shape, async (a) => {
      try { return ok(await getPatientHistory(apiUrl, token(), a)); } catch (e) { return err(e); }
    });
    this.server.tool("schedule_session", "Agenda uma sessão/consulta para um paciente.", scheduleSessionSchema.shape, async (a) => {
      try { return ok(await scheduleSession(apiUrl, token(), a)); } catch (e) { return err(e); }
    });
  }
}
```

- [ ] **Step 2: Write `index.ts`**

```ts
import { FisioFlowMCP, type Env } from "./server";

export { FisioFlowMCP };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const auth = request.headers.get("Authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
    // Pass the caller token to the agent instance via props.
    (ctx as unknown as { props?: Record<string, unknown> }).props = { token };
    const url = new URL(request.url);
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return FisioFlowMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return FisioFlowMCP.serve("/mcp").fetch(request, env, ctx);
    }
    if (url.pathname === "/health") return new Response("ok");
    return new Response("Not found", { status: 404 });
  },
};
```
> **Token plumbing is the integration risk.** The exact way to inject per-request `props` into
> `McpAgent` depends on `agents@^0.15`. If `(ctx).props` is not the supported channel, use the
> SDK's documented auth/props mechanism (e.g., passing `{ props }` to `serveSSE`/`serve`, or an
> `onRequest`/context hook). Confirm against the installed version and the cloudflare/agents `mcp`
> example before finalizing; adjust this handler accordingly. Keep `server.ts` tool wiring intact.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mcp-server && npx tsc --noEmit`
Expected: 0 errors (adjust imports/types to the installed `agents` typings as needed).

- [ ] **Step 4: Commit** `git commit -am "feat(mcp-server): McpAgent server + SSE/HTTP handler with bearer props"`

---

## Task 8: Verify + deploy + register

**Files:** none (verification) + `mcp.json` / `.mcp.json` (registration, optional)

- [ ] **Step 1: Full unit suite**

Run: `cd apps/mcp-server && npx vitest run`
Expected: all green (apiClient + 4 tools).

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/mcp-server && npx tsc --noEmit && npx oxlint src`
Expected: 0 errors.

- [ ] **Step 3: Local dev smoke**

Run: `cd apps/mcp-server && npx wrangler dev` then in another shell:
```bash
curl -s http://localhost:8787/health   # → ok
```
Connect an MCP client (e.g. MCP Inspector) to `http://localhost:8787/sse` with header
`Authorization: Bearer <valid Neon Auth JWT>` and confirm `tools/list` shows the 4 tools and
`search_evidence {q:"knee"}` returns data.

- [ ] **Step 4: Deploy**

Run: `cd apps/mcp-server && npx wrangler deploy`
Expected: deploys `fisioflow-mcp`. Note the URL.

- [ ] **Step 5 (optional): Register the server**

Add to root `.mcp.json` (Claude Code) and `mcp.json` (Codex) an entry pointing at the deployed
`/sse` URL with the Bearer token, so local agents can use it.

---

## Self-Review Notes (addressed)
- **Spec coverage:** 4 tools as HTTP clients (✓), Bearer-JWT passthrough (✓ via `props.token`),
  McpAgent remote server (✓), unit tests per tool + apiClient (✓), deploy (✓).
- **API-contract accuracy:** evidence `?q=&limit=`; exercises `?q=&limit=`; patient `/api/patients/:id`
  + `/api/sessions?patientId=`; appointments POST `{patientId,date,startTime,durationMinutes,notes}` —
  all verified against route source.
- **Integration risks flagged:** (1) `agents@^0.15` McpAgent props/mount API — verify token plumbing
  and `serveSSE`/`serve` signatures against installed version + cloudflare/agents example; (2) dep
  versions aligned to monorepo lockfile.
- **Type consistency:** each tool exports `<name>` fn + `<name>Schema`; `fetchApi` signature
  `(apiUrl, token, path, init?)` used uniformly.
- **Deferred:** OAuth provider; exercise-import/curation tools; MCP resources; summarize/save tools.
