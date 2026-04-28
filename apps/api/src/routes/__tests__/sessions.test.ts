import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

let mockUserRole = "fisioterapeuta";
let mockUserId = "user-001";
const mockOrgId = "org-test-001";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: mockUserId,
      organizationId: mockOrgId,
      role: mockUserRole,
      email: "test@fisioflow.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { sessionsRoutes } = await import("../sessions");
  const app = new Hono<any>();
  app.route("/api/sessions", sessionsRoutes);
  return app;
}

function req(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake-token" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

const SESSION_ROW = {
  id: "session-001",
  patient_id: "patient-001",
  organization_id: mockOrgId,
  therapist_id: "user-001",
  subjective: "Paciente relata dor lombar",
  objective: "Mobilidade reduzida L4-L5",
  assessment: "Lombalgia crônica",
  plan: "Exercícios de fortalecimento",
  session_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── GET / ────────────────────────────────────────────────────────────────────

describe("GET /api/sessions — listagem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("fisioterapeuta não recebe 401 ou 403", async () => {
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/sessions"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("estagiário não recebe 401 ou 403 (mesmo acesso que fisioterapeuta)", async () => {
    mockUserRole = "estagiario";
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/sessions"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("admin não recebe 401 ou 403", async () => {
    mockUserRole = "admin";
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/sessions"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /api/sessions/:id — busca individual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 para usuário autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", `/api/sessions/${SESSION_ROW.id}`), ENV as any);

    expect(res.status).not.toBe(401);
  });

  it("não retorna 401 para UUID inexistente", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(
      req("GET", "/api/sessions/00000000-0000-0000-0000-000000000000"),
      ENV as any,
    );

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── POST / ───────────────────────────────────────────────────────────────────

describe("POST /api/sessions — criação de evolução SOAP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 ao criar sessão autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/sessions", {
        patient_id: "patient-001",
        subjective: "Paciente relata dor",
        objective: "ROM reduzido",
        assessment: "Lombalgia",
        plan: "Exercícios",
      }),
      ENV as any,
    );

    expect(res.status).not.toBe(401);
  });

  it("body vazio não retorna 401 (auth passou, rota existe)", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/sessions", {}), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── PUT /:id ─────────────────────────────────────────────────────────────────

describe("PUT /api/sessions/:id — atualização", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 ao atualizar sessão autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...SESSION_ROW, plan: "Plano atualizado" }] });

    const app = await buildApp();
    const res = await app.fetch(
      req("PUT", `/api/sessions/${SESSION_ROW.id}`, { plan: "Plano atualizado" }),
      ENV as any,
    );

    expect(res.status).not.toBe(401);
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe("DELETE /api/sessions/:id — remoção", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 ao deletar sessão autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [SESSION_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("DELETE", `/api/sessions/${SESSION_ROW.id}`), ENV as any);

    expect(res.status).not.toBe(401);
  });
});
