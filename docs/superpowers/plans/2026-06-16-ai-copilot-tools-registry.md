# AI Copilot Tools Registry — Implementation Plan

> REQUIRED SUB-SKILL: subagent-driven-development or executing-plans. Checkbox steps.

**Goal:** `POST /api/copilot/chat` clinical copilot with function-calling over a Zod tools registry, LLM via AI Gateway, org/RLS-safe.

**Tech:** Cloudflare Workers (Hono), Workers AI via `runAi` (gateway), Zod v4, Vitest, TS strict.

## File Structure
| File | Responsibility |
|---|---|
| `apps/api/src/lib/copilot/types.ts` | `CopilotMessage`, `ToolCall`, `ModelReply`, `CallModel`, `CopilotTool`, `ToolCtx` |
| `apps/api/src/lib/copilot/runCopilot.ts` | tool-calling loop (injected `callModel`) |
| `apps/api/src/lib/copilot/zodToToolSchema.ts` | flat ZodObject → JSON-schema params |
| `apps/api/src/lib/copilot/workersAiAdapter.ts` | `makeCallModel(env, tools)` via `runAi` |
| `apps/api/src/agents/tools.ts` | registry: 4 tools + executors |
| `apps/api/src/routes/copilot.ts` | `POST /api/copilot/chat` |
| `apps/api/src/index.ts` | register `/api/copilot` |
| `apps/api/src/lib/copilot/__tests__/*.test.ts` | unit tests |

## Task 1 — types.ts (no test; consumed by tested modules)
```ts
import type { z } from "zod";
import type { Env } from "../../types/env";
import type { AuthUser } from "../auth";

export type CopilotMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; name?: string };
export type ToolCall = { name: string; arguments: Record<string, unknown> };
export type ModelReply = { content?: string; toolCalls?: ToolCall[] };
export type CallModel = (messages: CopilotMessage[]) => Promise<ModelReply>;
export type ToolCtx = { env: Env; user: AuthUser; token: string; baseUrl: string };
export interface CopilotTool {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  execute: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<unknown>;
}
```
Commit: `feat(copilot): core types`

## Task 2 — runCopilot.ts (TDD)
Test `__tests__/runCopilot.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { runCopilot } from "../runCopilot";
import { z } from "zod";

const tool = {
  name: "echo", description: "echo", parameters: z.object({ msg: z.string() }),
  execute: vi.fn(async (_ctx, a) => ({ echoed: a.msg })),
} as any;

describe("runCopilot", () => {
  it("executes a requested tool then returns the final answer", async () => {
    const callModel = vi.fn()
      .mockResolvedValueOnce({ toolCalls: [{ name: "echo", arguments: { msg: "hi" } }] })
      .mockResolvedValueOnce({ content: "done" });
    const out = await runCopilot({ callModel, tools: [tool], ctx: {} as any, messages: [{ role: "user", content: "x" }] });
    expect(out.answer).toBe("done");
    expect(tool.execute).toHaveBeenCalled();
    expect(out.toolCalls[0].name).toBe("echo");
    expect(callModel).toHaveBeenCalledTimes(2);
  });
  it("returns content immediately when no tool calls", async () => {
    const callModel = vi.fn().mockResolvedValueOnce({ content: "hello" });
    const out = await runCopilot({ callModel, tools: [], ctx: {} as any, messages: [] });
    expect(out.answer).toBe("hello");
  });
  it("stops at maxTurns and returns last content", async () => {
    const callModel = vi.fn().mockResolvedValue({ toolCalls: [{ name: "echo", arguments: { msg: "x" } }] });
    const out = await runCopilot({ callModel, tools: [tool], ctx: {} as any, messages: [], maxTurns: 2 });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(out.answer).toBeDefined();
  });
  it("reports an error for an unknown tool without throwing", async () => {
    const callModel = vi.fn()
      .mockResolvedValueOnce({ toolCalls: [{ name: "nope", arguments: {} }] })
      .mockResolvedValueOnce({ content: "ok" });
    const out = await runCopilot({ callModel, tools: [tool], ctx: {} as any, messages: [] });
    expect(out.answer).toBe("ok");
  });
});
```
Impl:
```ts
import type { CallModel, CopilotMessage, CopilotTool, ToolCall, ToolCtx } from "./types";

export async function runCopilot(opts: {
  callModel: CallModel;
  tools: CopilotTool[];
  ctx: ToolCtx;
  messages: CopilotMessage[];
  maxTurns?: number;
}): Promise<{ answer: string; toolCalls: ToolCall[] }> {
  const { callModel, tools, ctx, maxTurns = 4 } = opts;
  const messages = [...opts.messages];
  const executed: ToolCall[] = [];
  let lastContent = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    const reply = await callModel(messages);
    lastContent = reply.content ?? lastContent;
    if (!reply.toolCalls || reply.toolCalls.length === 0) {
      return { answer: reply.content ?? lastContent, toolCalls: executed };
    }
    for (const call of reply.toolCalls) {
      executed.push(call);
      const tool = tools.find((t) => t.name === call.name);
      let result: unknown;
      if (!tool) {
        result = { error: `Ferramenta desconhecida: ${call.name}` };
      } else {
        const parsed = tool.parameters.safeParse(call.arguments);
        if (!parsed.success) {
          result = { error: `Args inválidos: ${parsed.error.message}` };
        } else {
          try {
            result = await tool.execute(ctx, parsed.data);
          } catch (e) {
            result = { error: String((e as Error)?.message ?? e) };
          }
        }
      }
      messages.push({ role: "tool", name: call.name, content: JSON.stringify(result) });
    }
  }
  return { answer: lastContent || "Não foi possível concluir.", toolCalls: executed };
}
```
Commit: `feat(copilot): tool-calling orchestrator (runCopilot)`

## Task 3 — zodToToolSchema.ts (TDD)
Test:
```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToToolSchema } from "../zodToToolSchema";

it("maps a flat zod object to json-schema params", () => {
  const s = zodToToolSchema(z.object({ q: z.string(), limit: z.number().optional() }));
  expect(s.type).toBe("object");
  expect(s.properties.q.type).toBe("string");
  expect(s.properties.limit.type).toBe("number");
  expect(s.required).toEqual(["q"]);
});
```
Impl (handles string/number/boolean + optional; unwraps `.optional()`):
```ts
import { z } from "zod";

type JsonProp = { type: string; description?: string };
export function zodToToolSchema(schema: z.ZodObject<z.ZodRawShape>): {
  type: "object"; properties: Record<string, JsonProp>; required: string[];
} {
  const properties: Record<string, JsonProp> = {};
  const required: string[] = [];
  for (const [key, raw] of Object.entries(schema.shape)) {
    let def = raw as z.ZodTypeAny;
    let optional = false;
    while (def instanceof z.ZodOptional || def instanceof z.ZodDefault) {
      optional = optional || def instanceof z.ZodOptional;
      def = def._def.innerType as z.ZodTypeAny;
    }
    let type = "string";
    if (def instanceof z.ZodNumber) type = "number";
    else if (def instanceof z.ZodBoolean) type = "boolean";
    properties[key] = { type };
    if (!optional) required.push(key);
  }
  return { type: "object", properties, required };
}
```
> Verify `z.ZodOptional`/`ZodDefault`/`_def.innerType` shape against installed Zod v4; adjust unwrap if the internal API differs (Zod v4 may expose `.unwrap()` — prefer `def.unwrap()` when available).
Commit: `feat(copilot): zod→tool json-schema`

## Task 4 — workersAiAdapter.ts (TDD)
Test:
```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { makeCallModel } from "../workersAiAdapter";

vi.mock("../../ai-native", () => ({
  runAi: vi.fn(async () => ({ response: "hi", tool_calls: [{ name: "echo", arguments: { msg: "x" } }] })),
}));

it("calls runAi and normalizes tool_calls", async () => {
  const tools = [{ name: "echo", description: "d", parameters: z.object({ msg: z.string() }), execute: async () => ({}) }];
  const call = makeCallModel({} as any, tools as any);
  const reply = await call([{ role: "user", content: "hi" }]);
  expect(reply.content).toBe("hi");
  expect(reply.toolCalls?.[0]).toEqual({ name: "echo", arguments: { msg: "x" } });
});
```
Impl:
```ts
import type { Env } from "../../types/env";
import { runAi } from "../ai-native";
import { WORKERS_AI_MODELS } from "../workersAi";
import { zodToToolSchema } from "./zodToToolSchema";
import type { CallModel, CopilotTool, ToolCall } from "./types";

export function makeCallModel(env: Env, tools: CopilotTool[]): CallModel {
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToToolSchema(t.parameters),
  }));
  return async (messages) => {
    const res = (await runAi(env, WORKERS_AI_MODELS.llama_3_3_70b, { messages, tools: toolDefs })) as {
      response?: string;
      tool_calls?: Array<{ name: string; arguments: Record<string, unknown> }>;
    };
    const toolCalls: ToolCall[] = (res.tool_calls ?? []).map((c) => ({
      name: c.name,
      arguments: (c.arguments ?? {}) as Record<string, unknown>,
    }));
    return { content: res.response, toolCalls };
  };
}
```
> Confirm Workers AI tool-calling response field names (`response`, `tool_calls`, `arguments`) for `llama_3_3_70b` against current docs; some models return `arguments` as a JSON string — if so, `JSON.parse` it defensively.
Commit: `feat(copilot): Workers AI function-calling adapter`

## Task 5 — agents/tools.ts (TDD executors)
Executors. `search_evidence` reuses `runSearch`; `search_exercises`/`get_patient_history` use `getRawSql` (org-scoped); `schedule_session` self-fetches `POST {baseUrl}/api/appointments`.
Test `__tests__/tools.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildRegistry } from "../../../agents/tools";

vi.mock("../../../routes/evidence", () => ({ runSearch: vi.fn(async () => ({ count: 1, data: [{ pmid: "1" }] })) }));

const sql = vi.fn(async () => ({ rows: [{ id: "p1", name: "X" }] }));
vi.mock("../../db", () => ({ getRawSql: () => sql }));

const ctx = { env: {} as any, user: { uid: "u", organizationId: "11111111-1111-4111-8111-111111111111" } as any, token: "tok", baseUrl: "https://api.test" };

describe("copilot tools registry", () => {
  beforeEach(() => vi.clearAllMocks());
  it("exposes the four tools", () => {
    const names = buildRegistry().map((t) => t.name).sort();
    expect(names).toEqual(["get_patient_history", "schedule_session", "search_evidence", "search_exercises"]);
  });
  it("search_evidence delegates to runSearch", async () => {
    const t = buildRegistry().find((t) => t.name === "search_evidence")!;
    const out: any = await t.execute(ctx, { q: "knee pain" });
    expect(out.count).toBe(1);
  });
  it("search_exercises queries the db", async () => {
    const t = buildRegistry().find((t) => t.name === "search_exercises")!;
    const out: any = await t.execute(ctx, { q: "agachamento" });
    expect(Array.isArray(out)).toBe(true);
    expect(sql).toHaveBeenCalled();
  });
  it("schedule_session self-fetches the appointments endpoint", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: { id: "a1" } }), { status: 201 }));
    vi.stubGlobal("fetch", f);
    const t = buildRegistry().find((t) => t.name === "schedule_session")!;
    await t.execute(ctx, { patientId: "11111111-1111-4111-8111-111111111111", date: "2026-07-01", startTime: "09:00" });
    expect(String(f.mock.calls[0][0])).toContain("https://api.test/api/appointments");
  });
});
```
Impl:
```ts
import { z } from "zod";
import { getRawSql } from "../lib/db";
import { runSearch } from "../routes/evidence";
import type { CopilotTool } from "../lib/copilot/types";

export function buildRegistry(): CopilotTool[] {
  return [
    {
      name: "search_evidence",
      description: "Busca evidência científica (PubMed) por palavra-chave clínica.",
      parameters: z.object({ q: z.string().min(3), limit: z.number().int().min(1).max(20).optional() }),
      execute: (ctx, args) => runSearch(ctx.env, args as Record<string, unknown>),
    },
    {
      name: "search_exercises",
      description: "Busca exercícios na biblioteca da clínica.",
      parameters: z.object({ q: z.string().min(2), limit: z.number().int().min(1).max(20).optional() }),
      execute: async (ctx, args) => {
        const sql = getRawSql(ctx.env, "read");
        const limit = Math.min(Number(args.limit ?? 10), 20);
        const res = await sql(
          `SELECT id, name, difficulty, body_parts, equipment
             FROM exercises
            WHERE (organization_id = $1 OR is_public = true) AND is_active = true
              AND to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(name_en,'')) @@ websearch_to_tsquery('portuguese', $2)
            LIMIT $3`,
          [ctx.user.organizationId, String(args.q), limit],
        );
        return res.rows ?? [];
      },
    },
    {
      name: "get_patient_history",
      description: "Histórico clínico de um paciente (dados + últimas sessões).",
      parameters: z.object({ patientId: z.string().uuid() }),
      execute: async (ctx, args) => {
        const sql = getRawSql(ctx.env, "read");
        const patient = await sql(`SELECT * FROM patients WHERE id = $1 AND organization_id = $2`, [args.patientId, ctx.user.organizationId]);
        const sessions = await sql(
          `SELECT id, date, observacao FROM sessions WHERE patient_id = $1 AND organization_id = $2 ORDER BY date DESC LIMIT 10`,
          [args.patientId, ctx.user.organizationId],
        );
        return { patient: patient.rows?.[0] ?? null, sessions: sessions.rows ?? [] };
      },
    },
    {
      name: "schedule_session",
      description: "Agenda uma sessão/consulta para um paciente.",
      parameters: z.object({
        patientId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        durationMinutes: z.number().int().min(5).max(480).optional(),
        notes: z.string().max(2000).optional(),
      }),
      execute: async (ctx, args) => {
        const res = await fetch(`${ctx.baseUrl}/api/appointments`, {
          method: "POST",
          headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: `Falha ao agendar: ${res.status}`, detail: data };
        return data;
      },
    },
  ];
}
```
> Verify `sessions` columns (`observacao`, `date`, `organization_id`) and `patients`/`exercises`
> column names against the schema before finalizing; adjust SELECTs. `runSearch` is exported from
> `routes/evidence.ts`.
Commit: `feat(copilot): tools registry (evidence/exercises/patient/schedule)`

## Task 6 — routes/copilot.ts + register (TDD via exported handler logic)
Test `__tests__/copilotRoute.test.ts` exercises an exported `runCopilotChat(env, user, token, baseUrl, messages)` with mocked `makeCallModel`/`buildRegistry`. Then route wraps it with auth.
Impl `routes/copilot.ts`:
```ts
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables, type AuthUser } from "../lib/auth";
import { rateLimit } from "../middleware/rateLimit";
import { buildRegistry } from "../agents/tools";
import { makeCallModel } from "../lib/copilot/workersAiAdapter";
import { runCopilot } from "../lib/copilot/runCopilot";
import type { CopilotMessage } from "../lib/copilot/types";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.string(),
    name: z.string().optional(),
  })).min(1),
});

const SYSTEM: CopilotMessage = {
  role: "system",
  content: "Você é o copiloto clínico do FisioFlow. Responda em português (PT-BR), com base em evidência. Use as ferramentas quando precisar de dados (evidência, exercícios, histórico do paciente). Não invente dados clínicos.",
};

export async function runCopilotChat(env: Env, user: AuthUser, token: string, baseUrl: string, messages: CopilotMessage[]) {
  const tools = buildRegistry();
  const callModel = makeCallModel(env, tools);
  return runCopilot({ callModel, tools, ctx: { env, user, token, baseUrl }, messages: [SYSTEM, ...messages] });
}

app.post("/chat", requireAuth, rateLimit({ endpoint: "copilot", limit: 60, windowSeconds: 3600 }), async (c) => {
  const body = BodySchema.parse(await c.req.json());
  const user = c.get("user");
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  const baseUrl = new URL(c.req.url).origin;
  const out = await runCopilotChat(c.env, user, token, baseUrl, body.messages as CopilotMessage[]);
  return c.json(out);
});

export default app;
```
Register in `index.ts`: import + `["/api/copilot", copilotRoutes],`.
Commit: `feat(copilot): POST /api/copilot/chat route`

## Task 7 — verify
- `cd apps/api && npx vitest run src/lib/copilot src/agents` → green
- `npx tsc --noEmit` no new errors in touched files; `npx oxlint` clean
- full `npx vitest run` no regressions
Commit any fixes.

## Self-Review
- Spec coverage: registry ✓, runCopilot loop ✓, adapter ✓, route ✓, 4 tools ✓ (schedule via self-fetch reuses conflict logic), AI Gateway ✓, RLS via org-scoped SQL ✓.
- Risks flagged: Zod v4 unwrap internals; Workers AI tool-calling response shape; sessions/exercises column names.
- Deferred: chat UI, streaming, write/draft tools, conversation memory, Llama Guard.
