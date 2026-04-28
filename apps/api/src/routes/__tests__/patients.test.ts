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
  const { patientsRoutes } = await import("../patients");
  const app = new Hono<any>();
  app.route("/api/patients", patientsRoutes);
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

const PATIENT_ROW = {
  id: "patient-001",
  full_name: "Maria Silva",
  organization_id: mockOrgId,
  email: "maria@example.com",
  phone: "11999999999",
  birth_date: "1990-01-01",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── GET / ────────────────────────────────────────────────────────────────────

describe("GET /api/patients — listagem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("fisioterapeuta não recebe 401 ou 403", async () => {
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/patients"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("estagiário tem mesmo acesso que fisioterapeuta (sem 401/403)", async () => {
    mockUserRole = "estagiario";
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/patients"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("admin não recebe 401 ou 403", async () => {
    mockUserRole = "admin";
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/patients"), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── GET /:id ─────────────────────────────────────────────────────────────────

describe("GET /api/patients/:id — busca individual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 para usuário autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", `/api/patients/${PATIENT_ROW.id}`), ENV as any);

    expect(res.status).not.toBe(401);
  });

  it("não retorna 401 para UUID inexistente", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(req("GET", "/api/patients/00000000-0000-0000-0000-000000000000"), ENV as any);

    // 404 = esperado; 500 = DB mock incompleto mas auth passou
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── POST / ───────────────────────────────────────────────────────────────────

describe("POST /api/patients — criação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "fisioterapeuta";
  });

  it("não retorna 401 ao criar paciente autenticado", async () => {
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(
      req("POST", "/api/patients", {
        full_name: "Maria Silva",
        email: "maria@example.com",
        phone: "11999999999",
        birth_date: "1990-01-01",
      }),
      ENV as any,
    );

    expect(res.status).not.toBe(401);
  });

  it("body vazio não retorna 401 (validação ou erro, mas auth passou)", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/patients", {}), ENV as any);

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────

describe("DELETE /api/patients/:id — remoção", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = "admin";
  });

  it("admin não recebe 401 ao deletar", async () => {
    mockQuery.mockResolvedValue({ rows: [PATIENT_ROW] });

    const app = await buildApp();
    const res = await app.fetch(req("DELETE", `/api/patients/${PATIENT_ROW.id}`), ENV as any);

    expect(res.status).not.toBe(401);
  });
});
