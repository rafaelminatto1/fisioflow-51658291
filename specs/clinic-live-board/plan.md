# Clinic Live Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Painel de ocupação/check-in da agenda de hoje que atualiza ao vivo (<2s) para todos os clientes conectados da mesma organização.

**Architecture:** O `OrganizationState` (Durable Object per-org já em prod, com WebSocket hibernável + `broadcastToOrg`) ganha um "tópico" clinic-board: guarda o snapshot do dia + um `seq` no storage do DO, aplica deltas e faz broadcast. As mutações de agenda notificam o DO best-effort via `c.executionCtx.waitUntil` após o commit no Neon. O frontend consome via o WS existente `/api/realtime` com fallback REST. **Neon é a fonte de verdade; o DO é projeção reconstruível.** Reusar o DO existente evita uma migração de DO nova (gotcha CF 10061).

**Tech Stack:** Cloudflare Workers (Hono), Durable Objects (SQLite/hibernation), WebSocket, Neon+Hyperdrive via `createDb`/`createPool` (drizzle/pg), React 19 + Vite, Vitest + Testing Library.

## Global Constraints

- TypeScript strict; sem comentários supérfluos; PT-BR na UI.
- Fonte de verdade = Neon. Notificação ao DO é **best-effort** (`waitUntil`) e **nunca** bloqueia o commit nem a resposta ao usuário.
- Isolamento por `org_id`; auth do WS reusa `verifyToken` (JWT+org+RBAC) já usado em `/api/realtime`.
- 1 DO por org = `OrganizationState.idFromName(orgId)` (não criar classe/binding novos).
- Latência alvo: delta <2s p95; hydrate inicial <1,5s p95.
- Consistência eventual: divergência resolve no próximo hydrate/resync (via `seq`).
- Não usar `pg` fora do padrão existente (`createPool`/`createDb`) — `pg` quebra o bundler de Workers.
- Board é só "hoje" (timezone da clínica); sem histórico no DO.

---

## File Structure

**Backend (`apps/api`)**
- Create `src/lib/clinicBoard/boardState.ts` — tipos + reducer puro (sem I/O): `BoardState`, `BoardEvent`, `applyEvent`, `buildSnapshotFromRows`.
- Create `src/lib/clinicBoard/hydrate.ts` — `hydrateTodayBoard(env, orgId): Promise<BoardState>` (1 query Neon → snapshot).
- Create `src/lib/clinicBoard/notify.ts` — `notifyClinicBoard(env, orgId, event): Promise<void>` (best-effort → DO).
- Modify `src/lib/realtime.ts` — endpoints internos `/clinic-board/apply` e `/clinic-board/snapshot` no `OrganizationState`.
- Create `src/routes/clinicBoard.ts` — `GET /api/clinic-board/today` (fallback/hydrate REST).
- Modify `src/index.ts` — registrar rota `["/api/clinic-board", clinicBoardRoutes]`.
- Modify `src/routes/appointments.ts` — chamar `notifyClinicBoard` no `waitUntil` após create/update/status.

**Frontend (`src`)**
- Create `src/hooks/useLiveClinicBoard.ts` — WS + deltas + gap/resync + fallback REST.
- Create `src/features/clinic-board/ClinicBoardPanel.tsx` — UI mínima do painel ao vivo.

**Interface compartilhada (tipos):** `BoardState`/`BoardEvent` vivem em `boardState.ts` e são reusados pelo hook via um tipo espelhado em `src/features/clinic-board/types.ts` (o front não importa do worker).

---

### Task 1: Reducer puro do board (tipos + applyEvent + buildSnapshot)

**Files:**
- Create: `apps/api/src/lib/clinicBoard/boardState.ts`
- Test: `apps/api/src/lib/clinicBoard/__tests__/boardState.test.ts`

**Interfaces:**
- Produces:
  - `type BoardStatus = "scheduled" | "arrived" | "in_progress" | "done" | "no_show" | "cancelled"`
  - `interface BoardItem { id: string; patientId: string; patientName: string; therapistId: string | null; room: string | null; start: string; end: string; status: BoardStatus }`
  - `interface BoardState { date: string; items: BoardItem[]; seq: number }`
  - `type BoardEvent = { type: "upsert"; item: BoardItem } | { type: "remove"; id: string }`
  - `applyEvent(state: BoardState, event: BoardEvent): BoardState` (retorna novo estado, `seq+1`)
  - `buildSnapshotFromRows(date: string, rows: BoardItem[]): BoardState` (`seq: 0`)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { applyEvent, buildSnapshotFromRows, type BoardState } from "../boardState";

const base = (): BoardState =>
  buildSnapshotFromRows("2026-07-06", [
    { id: "a1", patientId: "p1", patientName: "Ana", therapistId: "t1", room: "1", start: "10:00", end: "10:30", status: "scheduled" },
  ]);

describe("boardState", () => {
  it("buildSnapshotFromRows começa com seq 0", () => {
    expect(base().seq).toBe(0);
  });
  it("upsert de item existente muda status e incrementa seq", () => {
    const next = applyEvent(base(), { type: "upsert", item: { ...base().items[0], status: "arrived" } });
    expect(next.seq).toBe(1);
    expect(next.items[0].status).toBe("arrived");
    expect(next.items).toHaveLength(1);
  });
  it("upsert de item novo adiciona", () => {
    const next = applyEvent(base(), { type: "upsert", item: { id: "a2", patientId: "p2", patientName: "Bia", therapistId: null, room: null, start: "11:00", end: "11:30", status: "scheduled" } });
    expect(next.items).toHaveLength(2);
  });
  it("remove tira o item e incrementa seq", () => {
    const next = applyEvent(base(), { type: "remove", id: "a1" });
    expect(next.items).toHaveLength(0);
    expect(next.seq).toBe(1);
  });
  it("não muta o estado anterior", () => {
    const s = base();
    applyEvent(s, { type: "remove", id: "a1" });
    expect(s.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/boardState.test.ts`
Expected: FAIL ("Cannot find module '../boardState'").

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/clinicBoard/boardState.ts
export type BoardStatus =
  | "scheduled" | "arrived" | "in_progress" | "done" | "no_show" | "cancelled";

export interface BoardItem {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string | null;
  room: string | null;
  start: string;
  end: string;
  status: BoardStatus;
}

export interface BoardState {
  date: string;
  items: BoardItem[];
  seq: number;
}

export type BoardEvent =
  | { type: "upsert"; item: BoardItem }
  | { type: "remove"; id: string };

export function buildSnapshotFromRows(date: string, rows: BoardItem[]): BoardState {
  return { date, items: [...rows], seq: 0 };
}

export function applyEvent(state: BoardState, event: BoardEvent): BoardState {
  if (event.type === "remove") {
    return { ...state, items: state.items.filter((i) => i.id !== event.id), seq: state.seq + 1 };
  }
  const idx = state.items.findIndex((i) => i.id === event.item.id);
  const items =
    idx === -1
      ? [...state.items, event.item]
      : state.items.map((i) => (i.id === event.item.id ? event.item : i));
  return { ...state, items, seq: state.seq + 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/boardState.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/clinicBoard/boardState.ts apps/api/src/lib/clinicBoard/__tests__/boardState.test.ts
git commit -m "feat(clinic-board): reducer puro do board (applyEvent/buildSnapshot)"
```

---

### Task 2: Hydrate do Neon (snapshot de hoje)

**Files:**
- Create: `apps/api/src/lib/clinicBoard/hydrate.ts`
- Test: `apps/api/src/lib/clinicBoard/__tests__/hydrate.test.ts`

**Interfaces:**
- Consumes: `buildSnapshotFromRows`, `BoardItem` (Task 1); `createPool(env)` de `@/lib/db`.
- Produces: `hydrateTodayBoard(env: Env, orgId: string, today: string): Promise<BoardState>` — `today` no formato `YYYY-MM-DD` (o chamador passa a data no TZ da clínica).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { hydrateTodayBoard } from "../hydrate";

const rows = [
  { id: "a1", patient_id: "p1", patient_name: "Ana", therapist_id: "t1", room: "1", start_time: "10:00", end_time: "10:30", status: "arrived" },
];

function fakeEnv() {
  const query = vi.fn().mockResolvedValue({ rows });
  return { env: { CLINIC_TZ: "America/Sao_Paulo" } as any, query, pool: { query, end: vi.fn() } };
}

vi.mock("@/lib/db", () => ({
  createPool: (_env: unknown) => (globalThis as any).__pool,
}));

describe("hydrateTodayBoard", () => {
  it("mapeia linhas do Neon para BoardState com seq 0", async () => {
    const f = fakeEnv();
    (globalThis as any).__pool = f.pool;
    const state = await hydrateTodayBoard(f.env, "org1", "2026-07-06");
    expect(state.seq).toBe(0);
    expect(state.date).toBe("2026-07-06");
    expect(state.items[0]).toMatchObject({ id: "a1", patientName: "Ana", status: "arrived" });
    expect(f.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), expect.arrayContaining(["org1", "2026-07-06"]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/hydrate.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/clinicBoard/hydrate.ts
import { createPool } from "@/lib/db";
import { buildSnapshotFromRows, type BoardItem, type BoardStatus, type BoardState } from "./boardState";
import type { Env } from "@/types/env";

interface Row {
  id: string; patient_id: string; patient_name: string | null;
  therapist_id: string | null; room: string | null;
  start_time: string; end_time: string; status: string;
}

const STATUSES: BoardStatus[] = ["scheduled", "arrived", "in_progress", "done", "no_show", "cancelled"];
function toStatus(s: string): BoardStatus {
  return (STATUSES as string[]).includes(s) ? (s as BoardStatus) : "scheduled";
}

export async function hydrateTodayBoard(env: Env, orgId: string, today: string): Promise<BoardState> {
  const pool = createPool(env);
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.patient_id, p.name AS patient_name, a.therapist_id, a.room,
              to_char(a.start_time, 'HH24:MI') AS start_time,
              to_char(a.end_time, 'HH24:MI') AS end_time, a.status
         FROM appointments a
         LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.organization_id = $1 AND a.date = $2
        ORDER BY a.start_time ASC`,
      [orgId, today],
    ) as { rows: Row[] };
    const items: BoardItem[] = rows.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name ?? "—",
      therapistId: r.therapist_id,
      room: r.room,
      start: r.start_time,
      end: r.end_time,
      status: toStatus(r.status),
    }));
    return buildSnapshotFromRows(today, items);
  } finally {
    if (typeof (pool as { end?: () => Promise<void> }).end === "function") await (pool as { end: () => Promise<void> }).end();
  }
}
```

> **Nota p/ o implementador:** confira os nomes reais das colunas em `apps/api/src/db/schema` (tabela `appointments`/`patients`). Se `room`/`start_time`/`end_time` diferirem, ajuste o SELECT e o `Row`. Rode `grep -n "room\|start_time\|end_time" apps/api/src/db/schema/*.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/hydrate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/clinicBoard/hydrate.ts apps/api/src/lib/clinicBoard/__tests__/hydrate.test.ts
git commit -m "feat(clinic-board): hydrate do snapshot de hoje a partir do Neon"
```

---

### Task 3: Endpoints clinic-board no OrganizationState (apply/snapshot + seq + broadcast)

**Files:**
- Modify: `apps/api/src/lib/realtime.ts`
- Test: `apps/api/src/lib/clinicBoard/__tests__/organizationStateBoard.test.ts`

**Interfaces:**
- Consumes: `applyEvent`, `BoardState`, `BoardEvent` (Task 1).
- Produces (endpoints internos do DO, chamados via `stub.fetch`):
  - `POST /clinic-board/apply` body `{ event: BoardEvent, snapshotIfEmpty?: BoardState }` → aplica no board guardado (ou inicia do `snapshotIfEmpty`), incrementa `seq`, faz broadcast `{ topic: "clinic-board", type: "delta", seq, event }`, retorna `{ seq }`.
  - `GET /clinic-board/snapshot` → `{ state: BoardState | null }` (board guardado no storage do DO ou `null` se frio).
  - `POST /clinic-board/set` body `{ state: BoardState }` → grava snapshot (usado no hydrate/resync). Retorna `{ ok: true }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";

// Harness mínimo: instancia OrganizationState com um storage fake.
import { OrganizationState } from "@/lib/realtime";

function makeState() {
  const store = new Map<string, unknown>();
  const sockets: any[] = [];
  const storage = {
    get: async (k: string) => store.get(k),
    put: async (k: string, v: unknown) => void store.set(k, v),
    setAlarm: async () => {},
  };
  const ctx: any = {
    storage,
    getWebSockets: () => sockets,
    acceptWebSocket: (ws: any) => sockets.push(ws),
  };
  return { do: new OrganizationState(ctx, {} as any), sockets };
}

const snapshot = { date: "2026-07-06", items: [{ id: "a1", patientId: "p1", patientName: "Ana", therapistId: null, room: null, start: "10:00", end: "10:30", status: "scheduled" as const }], seq: 0 };

describe("OrganizationState clinic-board", () => {
  let h: ReturnType<typeof makeState>;
  beforeEach(() => { h = makeState(); });

  it("snapshot retorna null quando frio", async () => {
    const res = await h.do.fetch(new Request("http://do/clinic-board/snapshot"));
    expect(await res.json()).toEqual({ state: null });
  });

  it("apply com snapshotIfEmpty inicia o board e incrementa seq", async () => {
    const res = await h.do.fetch(new Request("http://do/clinic-board/apply", {
      method: "POST",
      body: JSON.stringify({ event: { type: "upsert", item: { ...snapshot.items[0], status: "arrived" } }, snapshotIfEmpty: snapshot }),
    }));
    expect(await res.json()).toEqual({ seq: 1 });
    const snap = await (await h.do.fetch(new Request("http://do/clinic-board/snapshot"))).json() as any;
    expect(snap.state.items[0].status).toBe("arrived");
    expect(snap.state.seq).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/organizationStateBoard.test.ts`
Expected: FAIL (rotas /clinic-board não existem → 404/erro).

- [ ] **Step 3: Write minimal implementation**

No `apps/api/src/lib/realtime.ts`, dentro de `async fetch(request)` do `OrganizationState`, **antes** do `return new Response("Not found", { status: 404 })` final, adicione:

```ts
    if (url.pathname === "/clinic-board/snapshot") {
      const state = (await this.state.storage.get<BoardState>("clinic-board")) ?? null;
      return Response.json({ state });
    }

    if (url.pathname === "/clinic-board/set" && request.method === "POST") {
      const { state } = (await request.json()) as { state: BoardState };
      await this.state.storage.put("clinic-board", state);
      return Response.json({ ok: true });
    }

    if (url.pathname === "/clinic-board/apply" && request.method === "POST") {
      const { event, snapshotIfEmpty } = (await request.json()) as {
        event: BoardEvent;
        snapshotIfEmpty?: BoardState;
      };
      const current =
        (await this.state.storage.get<BoardState>("clinic-board")) ?? snapshotIfEmpty ?? null;
      if (!current) return Response.json({ seq: -1 }); // sem base p/ aplicar; cliente fará hydrate
      const next = applyEvent(current, event);
      await this.state.storage.put("clinic-board", next);
      this.broadcast(JSON.stringify({ topic: "clinic-board", type: "delta", seq: next.seq, event }));
      return Response.json({ seq: next.seq });
    }
```

E no topo do arquivo adicione o import:

```ts
import { applyEvent, type BoardState, type BoardEvent } from "./clinicBoard/boardState";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/organizationStateBoard.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/realtime.ts apps/api/src/lib/clinicBoard/__tests__/organizationStateBoard.test.ts
git commit -m "feat(clinic-board): endpoints apply/snapshot/set no OrganizationState"
```

---

### Task 4: `notifyClinicBoard` (fan-out best-effort para o DO)

**Files:**
- Create: `apps/api/src/lib/clinicBoard/notify.ts`
- Test: `apps/api/src/lib/clinicBoard/__tests__/notify.test.ts`

**Interfaces:**
- Consumes: `BoardEvent`, `BoardState` (Task 1); `ORGANIZATION_STATE` binding.
- Produces: `notifyClinicBoard(env: Env, orgId: string, event: BoardEvent, snapshotIfEmpty?: BoardState): Promise<void>` — nunca lança (loga e engole).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { notifyClinicBoard } from "../notify";

function fakeEnv() {
  const fetch = vi.fn().mockResolvedValue(new Response("{}"));
  const stub = { fetch };
  const ORGANIZATION_STATE = { idFromName: vi.fn().mockReturnValue("id1"), get: vi.fn().mockReturnValue(stub) };
  return { env: { ORGANIZATION_STATE } as any, fetch, ORGANIZATION_STATE };
}

describe("notifyClinicBoard", () => {
  it("chama o DO da org com o evento", async () => {
    const f = fakeEnv();
    await notifyClinicBoard(f.env, "org1", { type: "remove", id: "a1" });
    expect(f.ORGANIZATION_STATE.idFromName).toHaveBeenCalledWith("org1");
    const req = f.fetch.mock.calls[0][0] as Request;
    expect(new URL(req.url).pathname).toBe("/clinic-board/apply");
  });
  it("engole erro do DO (best-effort)", async () => {
    const f = fakeEnv();
    f.fetch.mockRejectedValueOnce(new Error("DO down"));
    await expect(notifyClinicBoard(f.env, "org1", { type: "remove", id: "a1" })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/notify.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/clinicBoard/notify.ts
import type { Env } from "@/types/env";
import type { BoardEvent, BoardState } from "./boardState";

export async function notifyClinicBoard(
  env: Env,
  orgId: string,
  event: BoardEvent,
  snapshotIfEmpty?: BoardState,
): Promise<void> {
  try {
    const id = env.ORGANIZATION_STATE.idFromName(orgId);
    const stub = env.ORGANIZATION_STATE.get(id);
    await stub.fetch(
      new Request("http://do/clinic-board/apply", {
        method: "POST",
        body: JSON.stringify({ event, snapshotIfEmpty }),
      }),
    );
  } catch (err) {
    console.warn("[clinic-board] notify falhou (best-effort):", (err as Error)?.message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/lib/clinicBoard/__tests__/notify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/clinicBoard/notify.ts apps/api/src/lib/clinicBoard/__tests__/notify.test.ts
git commit -m "feat(clinic-board): notifyClinicBoard best-effort para o DO"
```

---

### Task 5: Rota REST de fallback `GET /api/clinic-board/today`

**Files:**
- Create: `apps/api/src/routes/clinicBoard.ts`
- Modify: `apps/api/src/index.ts` (registrar rota)
- Test: `apps/api/src/routes/__tests__/clinicBoard.test.ts`

**Interfaces:**
- Consumes: `hydrateTodayBoard` (Task 2); `verifyToken`/auth middleware do padrão das rotas; `ORGANIZATION_STATE`.
- Produces: `GET /api/clinic-board/today` → `{ state: BoardState }`. Lógica: pede snapshot ao DO; se `null` (frio), `hydrateTodayBoard` + grava no DO (`/clinic-board/set`) e retorna.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import app from "@/routes/clinicBoard";

vi.mock("@/lib/clinicBoard/hydrate", () => ({
  hydrateTodayBoard: vi.fn().mockResolvedValue({ date: "2026-07-06", items: [], seq: 0 }),
}));

function env(snapshot: unknown) {
  const stub = { fetch: vi.fn(async (req: Request) =>
    new URL(req.url).pathname.endsWith("/snapshot")
      ? Response.json({ state: snapshot })
      : Response.json({ ok: true })) };
  return { ORGANIZATION_STATE: { idFromName: () => "i", get: () => stub }, CLINIC_TZ: "America/Sao_Paulo" } as any;
}

describe("GET /api/clinic-board/today", () => {
  it("retorna snapshot do DO quando quente", async () => {
    const warm = { date: "2026-07-06", items: [{ id: "a1" }], seq: 3 };
    const res = await app.request("/today", {}, env(warm));
    expect(await res.json()).toMatchObject({ state: { seq: 3 } });
  });
  it("hydrata do Neon quando DO frio", async () => {
    const res = await app.request("/today", {}, env(null));
    expect((await res.json() as any).state.seq).toBe(0);
  });
});
```

> **Nota:** o teste injeta `authUser` via mock do middleware de auth se o `app` exigir. Siga o padrão de `apps/api/src/routes/__tests__/*.test.ts` (procure como eles mockam `verifyToken`/contexto de org). Ajuste o `app.request(..., env)` conforme o harness existente.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/routes/__tests__/clinicBoard.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/routes/clinicBoard.ts
import { Hono } from "hono";
import { hydrateTodayBoard } from "@/lib/clinicBoard/hydrate";
import type { BoardState } from "@/lib/clinicBoard/boardState";
import type { Env } from "@/types/env";
import { requireAuth } from "@/middleware/auth"; // ajuste ao helper de auth real do projeto

const app = new Hono<{ Bindings: Env; Variables: { authUser: { organizationId: string } } }>();

function todayInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

app.get("/today", requireAuth, async (c) => {
  const orgId = c.get("authUser").organizationId;
  const id = c.env.ORGANIZATION_STATE.idFromName(orgId);
  const stub = c.env.ORGANIZATION_STATE.get(id);

  const snap = (await (await stub.fetch(new Request("http://do/clinic-board/snapshot"))).json()) as { state: BoardState | null };
  if (snap.state) return c.json({ state: snap.state });

  const today = todayInTz(c.env.CLINIC_TZ ?? "America/Sao_Paulo");
  const state = await hydrateTodayBoard(c.env, orgId, today);
  await stub.fetch(new Request("http://do/clinic-board/set", { method: "POST", body: JSON.stringify({ state }) }));
  return c.json({ state });
});

export default app;
```

> **Nota:** substitua `requireAuth`/`c.get("authUser")` pelo mecanismo real (veja como outras rotas em `apps/api/src/routes/` obtêm o usuário/org — provavelmente um middleware que seta `authUser`). Adicione `CLINIC_TZ?: string` em `apps/api/src/types/env.ts` se não existir (default São Paulo).

Em `apps/api/src/index.ts`, adicione ao array `apiRoutes`:

```ts
import clinicBoardRoutes from "./routes/clinicBoard";
// ...
  ["/api/clinic-board", clinicBoardRoutes],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/routes/__tests__/clinicBoard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/clinicBoard.ts apps/api/src/index.ts apps/api/src/routes/__tests__/clinicBoard.test.ts apps/api/src/types/env.ts
git commit -m "feat(clinic-board): rota REST /api/clinic-board/today (fallback + hydrate)"
```

---

### Task 6: Notificar o DO nas mutações de agenda (create/update/status)

**Files:**
- Modify: `apps/api/src/routes/appointments.ts`
- Test: `apps/api/src/routes/__tests__/appointmentsNotifyBoard.test.ts`

**Interfaces:**
- Consumes: `notifyClinicBoard` (Task 4), `BoardEvent` (Task 1).
- Produces: efeito colateral — após commit de create/update/status/cancel, chama `c.executionCtx.waitUntil(notifyClinicBoard(c.env, orgId, event, snapshotIfEmpty?))`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from "vitest";
import { appointmentRowToBoardEvent } from "@/lib/clinicBoard/mapAppointment";

describe("appointmentRowToBoardEvent", () => {
  it("mapeia row de appointment (status) para upsert BoardEvent", () => {
    const ev = appointmentRowToBoardEvent({
      id: "a1", patient_id: "p1", patient_name: "Ana", therapist_id: "t1",
      room: "2", start_time: "10:00", end_time: "10:30", status: "arrived",
    });
    expect(ev).toEqual({ type: "upsert", item: { id: "a1", patientId: "p1", patientName: "Ana", therapistId: "t1", room: "2", start: "10:00", end: "10:30", status: "arrived" } });
  });
  it("status cancelled vira remove", () => {
    const ev = appointmentRowToBoardEvent({ id: "a1", patient_id: "p1", patient_name: "Ana", therapist_id: null, room: null, start_time: "10:00", end_time: "10:30", status: "cancelled" });
    expect(ev).toEqual({ type: "remove", id: "a1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/api exec vitest run src/routes/__tests__/appointmentsNotifyBoard.test.ts`
Expected: FAIL (módulo `mapAppointment` inexistente).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/clinicBoard/mapAppointment.ts
import type { BoardEvent, BoardStatus } from "./boardState";

interface AppointmentRow {
  id: string; patient_id: string; patient_name?: string | null;
  therapist_id: string | null; room: string | null;
  start_time: string; end_time: string; status: string;
}
const STATUSES: BoardStatus[] = ["scheduled", "arrived", "in_progress", "done", "no_show", "cancelled"];

export function appointmentRowToBoardEvent(row: AppointmentRow): BoardEvent {
  if (row.status === "cancelled") return { type: "remove", id: row.id };
  const status = (STATUSES as string[]).includes(row.status) ? (row.status as BoardStatus) : "scheduled";
  return {
    type: "upsert",
    item: {
      id: row.id, patientId: row.patient_id, patientName: row.patient_name ?? "—",
      therapistId: row.therapist_id, room: row.room,
      start: row.start_time, end: row.end_time, status,
    },
  };
}
```

Depois, em `apps/api/src/routes/appointments.ts`, **após cada commit** de create/update/status (onde já existe `c.executionCtx.waitUntil(...)` no create, ~linha 322-336, e nos handlers de update/status), adicione:

```ts
import { notifyClinicBoard } from "@/lib/clinicBoard/notify";
import { appointmentRowToBoardEvent } from "@/lib/clinicBoard/mapAppointment";
// ... após obter `row` persistida e `orgId`:
c.executionCtx.waitUntil(
  notifyClinicBoard(c.env, orgId, appointmentRowToBoardEvent({
    id: row.id, patient_id: row.patientId, patient_name: row.patientName ?? null,
    therapist_id: row.therapistId ?? null, room: row.room ?? null,
    start_time: row.startTime ?? row.start ?? "", end_time: row.endTime ?? row.end ?? "",
    status: row.status,
  })),
);
```

> **Nota:** só notifique quando `row.date` for **hoje** no TZ da clínica (o board é só de hoje). Adicione a guarda `if (rowDateIsToday) c.executionCtx.waitUntil(...)`. Reuse `todayInTz` (extraia para `@/lib/clinicBoard/today.ts` e importe nos dois lugares — DRY).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/api exec vitest run src/routes/__tests__/appointmentsNotifyBoard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/clinicBoard/mapAppointment.ts apps/api/src/routes/appointments.ts apps/api/src/routes/__tests__/appointmentsNotifyBoard.test.ts
git commit -m "feat(clinic-board): notificar DO nas mutações de agenda de hoje"
```

---

### Task 7: Hook `useLiveClinicBoard` (WS + deltas + gap/resync + fallback)

**Files:**
- Create: `src/features/clinic-board/types.ts` (espelho dos tipos do board no front)
- Create: `src/hooks/useLiveClinicBoard.ts`
- Test: `src/hooks/__tests__/useLiveClinicBoard.test.tsx`

**Interfaces:**
- Consumes: WS `/api/realtime?token=...` (mesma URL da colaboração); REST `GET /api/clinic-board/today`.
- Produces: `useLiveClinicBoard(): { items: BoardItem[]; connected: boolean; seq: number }` — aplica deltas com `topic === "clinic-board"`; se `msg.seq !== localSeq + 1` → resync via REST.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLiveClinicBoard } from "../useLiveClinicBoard";

class FakeWS {
  static last: FakeWS;
  onopen?: () => void; onmessage?: (e: { data: string }) => void; onclose?: () => void;
  readyState = 1;
  constructor(public url: string) { FakeWS.last = this; setTimeout(() => this.onopen?.(), 0); }
  send() {} close() { this.onclose?.(); }
}

beforeEach(() => {
  (globalThis as any).WebSocket = FakeWS as any;
  vi.stubGlobal("fetch", vi.fn(async () =>
    ({ ok: true, json: async () => ({ state: { date: "2026-07-06", items: [{ id: "a1", patientId: "p1", patientName: "Ana", therapistId: null, room: null, start: "10:00", end: "10:30", status: "scheduled" }], seq: 5 } }) })));
});

describe("useLiveClinicBoard", () => {
  it("hydrata via REST e aplica delta seq+1", async () => {
    const { result } = renderHook(() => useLiveClinicBoard());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.seq).toBe(5);
    act(() => {
      FakeWS.last.onmessage?.({ data: JSON.stringify({ topic: "clinic-board", type: "delta", seq: 6, event: { type: "upsert", item: { id: "a1", patientId: "p1", patientName: "Ana", therapistId: null, room: null, start: "10:00", end: "10:30", status: "arrived" } } }) });
    });
    expect(result.current.items[0].status).toBe("arrived");
    expect(result.current.seq).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run src/hooks/__tests__/useLiveClinicBoard.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/features/clinic-board/types.ts
export type BoardStatus = "scheduled" | "arrived" | "in_progress" | "done" | "no_show" | "cancelled";
export interface BoardItem { id: string; patientId: string; patientName: string; therapistId: string | null; room: string | null; start: string; end: string; status: BoardStatus }
export interface BoardState { date: string; items: BoardItem[]; seq: number }
export type BoardEvent = { type: "upsert"; item: BoardItem } | { type: "remove"; id: string };
```

```ts
// src/hooks/useLiveClinicBoard.ts
import { useEffect, useRef, useState, useCallback } from "react";
import type { BoardItem, BoardState, BoardEvent } from "@/features/clinic-board/types";
import { getAuthToken } from "@/lib/auth/token"; // ajuste ao helper real de token do projeto

function applyEvent(items: BoardItem[], ev: BoardEvent): BoardItem[] {
  if (ev.type === "remove") return items.filter((i) => i.id !== ev.id);
  const idx = items.findIndex((i) => i.id === ev.item.id);
  return idx === -1 ? [...items, ev.item] : items.map((i) => (i.id === ev.item.id ? ev.item : i));
}

export function useLiveClinicBoard() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [seq, setSeq] = useState(0);
  const [connected, setConnected] = useState(false);
  const seqRef = useRef(0);

  const hydrate = useCallback(async () => {
    const res = await fetch("/api/clinic-board/today", { headers: { Authorization: `Bearer ${await getAuthToken()}` } });
    if (!res.ok) return;
    const { state } = (await res.json()) as { state: BoardState };
    setItems(state.items); setSeq(state.seq); seqRef.current = state.seq;
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;

    const connect = async () => {
      await hydrate();
      const token = await getAuthToken();
      ws = new WebSocket(`${location.origin.replace("http", "ws")}/api/realtime?token=${token}`);
      ws.onopen = () => { setConnected(true); retry = 0; };
      ws.onmessage = (e) => {
        const msg = JSON.parse(typeof e.data === "string" ? e.data : "");
        if (msg?.topic !== "clinic-board" || msg.type !== "delta") return;
        if (msg.seq !== seqRef.current + 1) { void hydrate(); return; } // gap → resync
        setItems((prev) => applyEvent(prev, msg.event as BoardEvent));
        seqRef.current = msg.seq; setSeq(msg.seq);
      };
      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 500 * 2 ** retry); // backoff exponencial
      };
    };
    void connect();
    return () => { closed = true; ws?.close(); };
  }, [hydrate]);

  return { items, connected, seq };
}
```

> **Nota:** ajuste `getAuthToken` / URL do WS ao que a colaboração de evolução já usa (veja `src/contexts/RealtimeContext.tsx`). Se o WS já é centralizado lá, prefira reusar essa conexão em vez de abrir outra.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run src/hooks/__tests__/useLiveClinicBoard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/clinic-board/types.ts src/hooks/useLiveClinicBoard.ts src/hooks/__tests__/useLiveClinicBoard.test.tsx
git commit -m "feat(clinic-board): hook useLiveClinicBoard (WS+resync+fallback)"
```

---

### Task 8: Painel `ClinicBoardPanel` (UI mínima ao vivo)

**Files:**
- Create: `src/features/clinic-board/ClinicBoardPanel.tsx`
- Test: `src/features/clinic-board/__tests__/ClinicBoardPanel.test.tsx`

**Interfaces:**
- Consumes: `useLiveClinicBoard` (Task 7).
- Produces: componente `<ClinicBoardPanel />` — lista os itens do dia agrupados por status, com badge de conexão. Sem glassmorphism (superfícies sólidas).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClinicBoardPanel } from "../ClinicBoardPanel";

vi.mock("@/hooks/useLiveClinicBoard", () => ({
  useLiveClinicBoard: () => ({
    connected: true, seq: 2,
    items: [{ id: "a1", patientId: "p1", patientName: "Ana", therapistId: null, room: "1", start: "10:00", end: "10:30", status: "arrived" }],
  }),
}));

describe("ClinicBoardPanel", () => {
  it("mostra paciente e status ao vivo", () => {
    render(<ClinicBoardPanel />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText(/ao vivo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run src/features/clinic-board/__tests__/ClinicBoardPanel.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/features/clinic-board/ClinicBoardPanel.tsx
import { useLiveClinicBoard } from "@/hooks/useLiveClinicBoard";
import type { BoardStatus } from "@/features/clinic-board/types";

const LABEL: Record<BoardStatus, string> = {
  scheduled: "Agendado", arrived: "Chegou", in_progress: "Em atendimento",
  done: "Concluído", no_show: "Faltou", cancelled: "Cancelado",
};

export function ClinicBoardPanel() {
  const { items, connected } = useLiveClinicBoard();
  return (
    <section className="rounded-xl border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Agenda de hoje</h2>
        <span className={`text-xs font-semibold ${connected ? "text-green-600" : "text-amber-600"}`}>
          {connected ? "● Ao vivo" : "○ Reconectando…"}
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="font-semibold">{it.patientName}</p>
              <p className="text-xs text-muted-foreground">{it.start}–{it.end}{it.room ? ` · Sala ${it.room}` : ""}</p>
            </div>
            <span className="text-sm font-medium">{LABEL[it.status]}</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">Sem agendamentos hoje.</li>}
      </ul>
    </section>
  );
}
```

> **Nota:** para expor na navegação, adicione a rota/uso do `<ClinicBoardPanel />` onde fizer sentido (ex.: um card na `/agenda` ou rota `/agenda/board`). Se criar rota nova, ela deve entrar em `<PageLayout>` (senão fica sem sidebar — gotcha conhecido).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run src/features/clinic-board/__tests__/ClinicBoardPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/clinic-board/ClinicBoardPanel.tsx src/features/clinic-board/__tests__/ClinicBoardPanel.test.tsx
git commit -m "feat(clinic-board): painel ClinicBoardPanel ao vivo"
```

---

## Verificação final (antes do deploy)

- [ ] `pnpm --dir apps/api exec vitest run src/lib/clinicBoard src/routes/__tests__/clinicBoard.test.ts` — verde.
- [ ] `pnpm --dir apps/web exec vitest run src/hooks/__tests__/useLiveClinicBoard.test.tsx src/features/clinic-board` — verde.
- [ ] `pnpm --filter @fisioflow/api type-check` e `pnpm type-check` — 0 erros.
- [ ] Smoke manual em preview: 2 abas logadas na mesma org → marcar "chegou" numa → aparece na outra em <2s; matar o WS (offline) → painel mantém último snapshot e reconecta.
- [ ] Deploy via push na main (auto-deploy); validar em prod com 2 sessões.

## Notas de integração (débitos conhecidos p/ o implementador confirmar)

1. **Nomes de colunas** (`appointments`/`patients`): confirmar `room`, `start_time`, `end_time`, `organization_id`, `date` no schema drizzle antes de rodar o SELECT do hydrate.
2. **Auth nas rotas**: usar o mesmo middleware das demais rotas (`apps/api/src/routes/*` — como obtêm `authUser.organizationId`).
3. **Token/WS no front**: reusar `src/contexts/RealtimeContext.tsx` se ele já centraliza a conexão WS (evitar 2ª conexão).
4. **Guarda "é hoje"**: extrair `todayInTz` p/ `@/lib/clinicBoard/today.ts` e usar no hydrate, na rota e na notificação (DRY).
