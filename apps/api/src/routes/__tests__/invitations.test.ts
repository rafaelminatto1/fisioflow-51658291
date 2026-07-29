import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: (_c: any, next: any) => next(),
  requireRole: (allowedRoles: string | string[]) => async (c: any, next: any) => {
    const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) =>
      r.toLowerCase(),
    );
    const user = c.get("user");
    const roles: string[] = [
      String(user?.role ?? ""),
      ...(Array.isArray(user?.roles) ? user.roles : []),
    ]
      .map((r) => String(r).trim().toLowerCase())
      .filter(Boolean);
    if (!roles.some((r) => allowed.includes(r))) {
      return c.json({ error: "admin_only" }, 403);
    }
    await next();
  },
}));

const adminUser = {
  uid: "admin-1",
  email: "rafael.minatto@yahoo.com.br",
  organizationId: "00000000-0000-0000-0000-000000000001",
  role: "admin",
  roles: ["admin", "fisioterapeuta"],
};

const fisioUser = {
  uid: "fisio-1",
  email: "fisio@example.com",
  organizationId: "00000000-0000-0000-0000-000000000001",
  role: "fisioterapeuta",
  roles: ["fisioterapeuta"],
};

async function buildApp(user: any) {
  const { Hono } = await import("hono");
  const { invitationsRoutes } = await import("../invitations");
  const app = new Hono<any>();
  app.use("/*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/api/invitations", invitationsRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const env = { ENVIRONMENT: "development", ALLOWED_ORIGINS: "*" } as any;

beforeEach(() => {
  mockQuery.mockReset();
});

describe("POST /api/invitations", () => {
  it("bloqueia não-admin com 403 (convite define papel no signup)", async () => {
    const app = await buildApp(fisioUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", { email: "x@example.com", role: "admin" }),
      env,
    );

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejeita papel fora da allowlist", async () => {
    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", { email: "x@example.com", role: "superuser" }),
      env,
    );

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejeita e-mail inválido", async () => {
    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", { email: "não-é-email", role: "admin" }),
      env,
    );

    expect(res.status).toBe(400);
  });

  it("cria convite de admin para admin autenticado", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "inv-1", role: "admin" }] });

    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", {
        email: "  Amanda_Notoya@Hotmail.com ",
        role: "admin",
      }),
      env,
    );

    expect(res.status).toBe(201);
    const insertParams = mockQuery.mock.calls[1][1];
    expect(insertParams).toContain("amanda_notoya@hotmail.com");
    expect(insertParams).toContain("admin");
  });

  it("recusa convite duplicado pendente com 409", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "inv-1" }] });

    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", { email: "x@example.com", role: "admin" }),
      env,
    );

    expect(res.status).toBe(409);
  });
});

describe("PATCH /api/invitations/:id", () => {
  it("bloqueia não-admin com 403", async () => {
    const app = await buildApp(fisioUser);
    const res = await app.fetch(
      makeRequest("PATCH", "/api/invitations/inv-1", { role: "admin" }),
      env,
    );

    expect(res.status).toBe(403);
  });

  it("rejeita papel fora da allowlist", async () => {
    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("PATCH", "/api/invitations/inv-1", { role: "superuser" }),
      env,
    );

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/invitations/:id", () => {
  it("bloqueia não-admin com 403", async () => {
    const app = await buildApp(fisioUser);
    const res = await app.fetch(makeRequest("DELETE", "/api/invitations/inv-1"), env);

    expect(res.status).toBe(403);
  });
});

describe("GET /api/invitations", () => {
  it("bloqueia não-admin com 403 (token concede acesso)", async () => {
    const app = await buildApp(fisioUser);
    const res = await app.fetch(makeRequest("GET", "/api/invitations"), env);

    expect(res.status).toBe(403);
  });
});
