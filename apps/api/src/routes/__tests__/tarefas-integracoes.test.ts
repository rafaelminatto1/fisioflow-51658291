import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

const mockNotifyAssignment = vi.fn().mockResolvedValue(undefined);
const mockInsertNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("../../lib/tarefaNotifications", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/tarefaNotifications")>();
  return {
    ...actual,
    notifyTaskAssignment: (...args: unknown[]) => mockNotifyAssignment(...args),
    insertTaskNotification: (...args: unknown[]) => mockInsertNotification(...args),
  };
});

const mockRunAi = vi.fn();
vi.mock("../../lib/ai-native", () => ({
  runAi: (...args: unknown[]) => mockRunAi(...args),
  readAiText: (r: unknown) => (r as { response?: string })?.response ?? "",
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
const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRole = "fisioterapeuta";
  mockUserId = "user-fisio-001";
});

describe("POST /api/tarefas — notificação de atribuição", () => {
  it("notifica responsável diferente do autor", async () => {
    const created = { id: UUID, titulo: "T", responsavel_id: "user-outro", prioridade: "MEDIA" };
    mockQuery.mockResolvedValue({ rows: [created] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/tarefas", { titulo: "T", responsavel_id: "user-outro" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(201);
    expect(mockNotifyAssignment).toHaveBeenCalledTimes(1);
    expect(mockNotifyAssignment.mock.calls[0][4]).toBe("user-outro");
  });

  it("não notifica auto-atribuição", async () => {
    const created = { id: UUID, titulo: "T", responsavel_id: "user-fisio-001" };
    mockQuery.mockResolvedValue({ rows: [created] });

    const app = await buildApp();
    await app.fetch(
      makeRequest("POST", "/api/tarefas", { titulo: "T", responsavel_id: "user-fisio-001" }),
      BASE_ENV as any,
    );
    expect(mockNotifyAssignment).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/tarefas/:id — reatribuição e recorrência", () => {
  it("notifica quando responsavel_id muda", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: "A_FAZER", responsavel_id: "user-a" }] }) // before
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: UUID, titulo: "T", responsavel_id: "user-b", status: "A_FAZER" }],
      })
      .mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { responsavel_id: "user-b" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
    expect(mockNotifyAssignment).toHaveBeenCalledTimes(1);
  });

  it("concluir tarefa recorrente cria próxima instância", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: "A_FAZER", responsavel_id: null }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: UUID,
            titulo: "Rotina",
            status: "CONCLUIDO",
            data_vencimento: "2026-07-09",
            recurrence: { freq: "weekly", interval: 1 },
            recurrence_parent_id: null,
            tags: [],
            label_ids: [],
            checklists: [],
            dependencies: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // dedup: nenhuma instância aberta
      .mockResolvedValue({ rows: [] }); // insert da próxima

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { status: "CONCLUIDO" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 10));

    const insertCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes("INSERT INTO tarefas") && call[1]?.includes("Rotina"),
    );
    expect(insertCall).toBeTruthy();
    expect(insertCall![1]).toContain("2026-07-16"); // próximo vencimento semanal
    expect(insertCall![1]).toContain(UUID); // recurrence_parent_id = raiz
  });

  it("não cria instância se já existe aberta na série", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: "A_FAZER", responsavel_id: null }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: UUID,
            titulo: "Rotina",
            status: "CONCLUIDO",
            data_vencimento: "2026-07-09",
            recurrence: { freq: "weekly" },
            recurrence_parent_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] }); // já tem aberta

    const app = await buildApp();
    await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { status: "CONCLUIDO" }),
      BASE_ENV as any,
    );
    await new Promise((r) => setTimeout(r, 10));

    const insertCall = mockQuery.mock.calls.find(
      (call) => String(call[0]).includes("INSERT INTO tarefas") && call[1]?.includes("Rotina"),
    );
    expect(insertCall).toBeFalsy();
  });
});

describe("Comentários", () => {
  it("POST cria comentário e notifica mencionados", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: UUID, titulo: "T" }] }) // task lookup
      .mockResolvedValueOnce({ rows: [{ name: "Rafael Minatto" }] }) // profile
      .mockResolvedValueOnce({
        rows: [{ id: UUID2, content: "olá @maria", mentions: ["user-maria"] }],
      });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", `/api/tarefas/${UUID}/comments`, {
        content: "olá @maria",
        mentions: ["user-maria"],
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(201);
    expect(mockInsertNotification).toHaveBeenCalledTimes(1);
    expect(mockInsertNotification.mock.calls[0][2]).toBe("user-maria");
  });

  it("POST rejeita comentário vazio", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", `/api/tarefas/${UUID}/comments`, { content: "  " }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(400);
  });

  it("GET lista comentários da tarefa", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: UUID2, content: "c1" }] });
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", `/api/tarefas/${UUID}/comments`), BASE_ENV as any);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data).toHaveLength(1);
  });

  it("DELETE só apaga do próprio autor quando não-admin", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("DELETE", `/api/tarefas/${UUID}/comments/${UUID2}`),
      BASE_ENV as any,
    );
    expect(res.status).toBe(404);
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params).toContain(false); // isAdmin
    expect(params).toContain("user-fisio-001");
  });
});

describe("POST /api/tarefas/:id/duplicate", () => {
  it("duplica com sufixo (cópia) e status A_FAZER", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: UUID2, titulo: "T (cópia)" }] });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", `/api/tarefas/${UUID}/duplicate`),
      BASE_ENV as any,
    );
    expect(res.status).toBe(201);
    const sql = String(mockQuery.mock.calls[0][0]);
    expect(sql).toContain("(cópia)");
    expect(sql).toContain("'A_FAZER'");
  });

  it("404 quando tarefa não existe", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", `/api/tarefas/${UUID}/duplicate`),
      BASE_ENV as any,
    );
    expect(res.status).toBe(404);
  });
});

describe("Templates de tarefa", () => {
  it("POST /templates exige name e titulo", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/tarefas/templates", { name: "x" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(400);
  });

  it("POST /templates cria template", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: UUID, name: "Onboarding" }] });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/tarefas/templates", {
        name: "Onboarding",
        titulo: "Onboarding de paciente",
        checklists: [{ id: "c1", title: "Passos", items: [] }],
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(201);
  });

  it("GET /templates lista por organização", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: UUID }] });
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/tarefas/templates"), BASE_ENV as any);
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[0][1] as unknown[])[0]).toBe("org-test-001");
  });
});

describe("POST /api/tarefas/ai/suggest-priority (US-13)", () => {
  it("extrai prioridade válida da resposta da IA", async () => {
    mockRunAi.mockResolvedValueOnce({ response: "URGENTE" });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/tarefas/ai/suggest-priority", {
        titulo: "Cobrar convênio hoje",
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.prioridade).toBe("URGENTE");
  });

  it("400 sem titulo e 502 com resposta inválida", async () => {
    const app = await buildApp();
    const res1 = await app.fetch(
      makeRequest("POST", "/api/tarefas/ai/suggest-priority", {}),
      BASE_ENV as any,
    );
    expect(res1.status).toBe(400);

    mockRunAi.mockResolvedValueOnce({ response: "não sei" });
    const res2 = await app.fetch(
      makeRequest("POST", "/api/tarefas/ai/suggest-priority", { titulo: "x" }),
      BASE_ENV as any,
    );
    expect(res2.status).toBe(502);
  });
});

describe("PATCH — bloqueio por dependências abertas (US-17)", () => {
  it("retorna 409 ao concluir tarefa com blocked_by aberta", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: "EM_PROGRESSO", responsavel_id: null, dependencies: [UUID2] }],
      })
      .mockResolvedValueOnce({ rows: [{ id: UUID2, titulo: "Bloqueadora" }] }); // deps abertas

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { status: "CONCLUIDO" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(409);
    const json = (await res.json()) as any;
    expect(json.blocked_by).toHaveLength(1);
  });

  it("permite concluir com _force=true", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: "EM_PROGRESSO", responsavel_id: null, dependencies: [UUID2] }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: UUID, titulo: "T", status: "CONCLUIDO" }],
      })
      .mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { status: "CONCLUIDO", _force: true }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
  });

  it("permite concluir quando dependências já estão concluídas", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ status: "EM_PROGRESSO", responsavel_id: null, dependencies: [UUID2] }],
      })
      .mockResolvedValueOnce({ rows: [] }) // nenhuma dependência aberta
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: UUID, titulo: "T", status: "CONCLUIDO" }],
      })
      .mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("PATCH", `/api/tarefas/${UUID}`, { status: "CONCLUIDO" }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/tarefas/bulk — campos estendidos", () => {
  it("aceita prioridade e responsavel_id", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/tarefas/bulk", {
        updates: [{ id: UUID, prioridade: "ALTA", responsavel_id: "user-b" }],
      }),
      BASE_ENV as any,
    );
    expect(res.status).toBe(200);
    const sql = String(mockQuery.mock.calls[0][0]);
    expect(sql).toContain("prioridade");
    expect(sql).toContain("responsavel_id");
  });
});
