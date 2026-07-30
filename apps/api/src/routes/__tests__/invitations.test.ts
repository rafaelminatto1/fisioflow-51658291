import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockSendInvitationEmail = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/email", () => ({
  sendInvitationEmail: (...args: unknown[]) => mockSendInvitationEmail(...args),
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

const env = {
  ENVIRONMENT: "development",
  ALLOWED_ORIGINS: "*",
  PAGES_URL: "https://moocafisio.com.br",
} as any;

beforeEach(() => {
  mockQuery.mockReset();
  mockSendInvitationEmail.mockReset();
  mockSendInvitationEmail.mockResolvedValue(undefined);
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

  it("cria convite de admin para admin autenticado e envia o e-mail", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] }).mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "inv-1",
          role: "admin",
          email: "amanda_notoya@hotmail.com",
          token: "tok-123",
          expires_at: "2026-08-05T20:58:50.946Z",
        },
      ],
    });

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

    expect(mockSendInvitationEmail).toHaveBeenCalledTimes(1);
    const [, to, data] = mockSendInvitationEmail.mock.calls[0];
    expect(to).toBe("amanda_notoya@hotmail.com");
    expect(data.inviteUrl).toBe(
      "https://moocafisio.com.br/auth?invite=tok-123&mode=register",
    );
    expect(await res.json()).toMatchObject({ email_sent: true });
  });

  it("cria o convite mesmo se o e-mail falhar (email_sent false)", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] }).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: "inv-1", role: "admin", email: "x@example.com", token: "t", expires_at: "" }],
    });
    mockSendInvitationEmail.mockRejectedValueOnce(new Error("RESEND_API_KEY não configurado"));

    const app = await buildApp(adminUser);
    const res = await app.fetch(
      makeRequest("POST", "/api/invitations", { email: "x@example.com", role: "admin" }),
      env,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email_sent: false });
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

describe("POST /api/invitations/:id/resend", () => {
  it("bloqueia não-admin com 403", async () => {
    const app = await buildApp(fisioUser);
    const res = await app.fetch(makeRequest("POST", "/api/invitations/inv-1/resend"), env);

    expect(res.status).toBe(403);
    expect(mockSendInvitationEmail).not.toHaveBeenCalled();
  });

  it("reenvia o e-mail de um convite pendente", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "inv-1",
          email: "amanda_notoya@hotmail.com",
          role: "admin",
          token: "tok-123",
          expires_at: "2026-08-05T20:58:50.946Z",
        },
      ],
    });

    const app = await buildApp(adminUser);
    const res = await app.fetch(makeRequest("POST", "/api/invitations/inv-1/resend"), env);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email_sent: true });
    const [, to, data] = mockSendInvitationEmail.mock.calls[0];
    expect(to).toBe("amanda_notoya@hotmail.com");
    expect(data.inviteUrl).toContain("tok-123");
  });

  it("404 quando o convite não existe, já foi usado ou expirou", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = await buildApp(adminUser);
    const res = await app.fetch(makeRequest("POST", "/api/invitations/inv-1/resend"), env);

    expect(res.status).toBe(404);
    expect(mockSendInvitationEmail).not.toHaveBeenCalled();
  });

  it("502 quando o provedor de e-mail falha", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: "inv-1", email: "x@example.com", role: "admin", token: "t", expires_at: "" }],
    });
    mockSendInvitationEmail.mockRejectedValueOnce(new Error("domain not verified"));

    const app = await buildApp(adminUser);
    const res = await app.fetch(makeRequest("POST", "/api/invitations/inv-1/resend"), env);

    expect(res.status).toBe(502);
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
