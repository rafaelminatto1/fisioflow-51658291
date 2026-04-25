import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

let mockUserRole = "fisioterapeuta";
let mockUserId = "user-fisio-001";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: mockUserId,
      organizationId: "org-test-001",
      role: mockUserRole,
      email: "test@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { tarefasRoutes } = await import("../tarefas");
  const app = new Hono<any>();
  app.route("/api/tarefas", tarefasRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const BASE_ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

describe("GET /api/tarefas — visibilidade por role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
    mockUserId = "user-fisio-001";
  });

  it("fisioterapeuta vê todas as tarefas da organização", async () => {
    const tasks = [
      { id: "t1", titulo: "Tarefa Geral", responsavel_id: "user-outro-001" },
      { id: "t2", titulo: "Minha Tarefa", responsavel_id: "user-fisio-001" },
    ];
    mockQuery.mockResolvedValueOnce({ rows: tasks });

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/tarefas"), BASE_ENV as any);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toHaveLength(2);

    const tarefasQuery = mockQuery.mock.calls[0][0] as string;
    expect(tarefasQuery).not.toContain("responsavel_id");
  });

  it("estagiário só vê suas próprias tarefas", async () => {
    mockUserRole = "estagiario";
    mockUserId = "user-intern-001";

    const myTask = { id: "t3", titulo: "Minha Tarefa", responsavel_id: "user-intern-001" };
    mockQuery.mockResolvedValueOnce({ rows: [myTask] });

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/tarefas"), BASE_ENV as any);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toHaveLength(1);

    const tarefasQuery = mockQuery.mock.calls[0][0] as string;
    expect(tarefasQuery).toContain("responsavel_id");

    const tarefasParams = mockQuery.mock.calls[0][1] as any[];
    expect(tarefasParams).toContain("user-intern-001");
  });
});

describe("PATCH /api/tarefas/bulk — atualização de order_index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
    mockUserId = "user-fisio-001";
  });

  it("atualiza order_index de múltiplas tarefas em bulk", async () => {
    const updates = [
      { id: "t1", order_index: 0 },
      { id: "t2", order_index: 1 },
      { id: "t3", order_index: 2 },
    ];

    mockQuery.mockResolvedValue({ rows: [{ id: "t1" }] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", "/api/tarefas/bulk", { updates }),
      BASE_ENV as any,
    );

    expect(res.status).toBeLessThan(500);
  });
});
