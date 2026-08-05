import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

const mockUserId = "user-001";
const mockOrgId = "org-test-001";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: mockUserId,
      organizationId: mockOrgId,
      role: "fisioterapeuta",
      email: "test@fisioflow.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { fcmTokensRoutes } = await import("../fcmTokens");
  const app = new Hono<any>();
  app.route("/api/fcm-tokens", fcmTokensRoutes);
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

const TOKEN_ROW = {
  id: "fcm-001",
  token: "ExponentPushToken[abc123]",
  user_id: mockUserId,
  tenant_id: mockOrgId,
  active: true,
};

describe("POST /api/fcm-tokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("grava o token no usuário e org autenticados, ignorando userId/tenantId do body", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TOKEN_ROW] });
    const app = await buildApp();

    const res = await app.fetch(
      req("POST", "/api/fcm-tokens", {
        token: "ExponentPushToken[abc123]",
        userId: "attacker-user",
        tenantId: "org-de-outra-clinica",
        deviceInfo: { platform: "ios", model: "iPhone15,3" },
      }),
      ENV,
    );

    expect(res.status).toBe(200);
    const params = mockQuery.mock.calls[0][1];
    expect(params[1]).toBe(mockUserId);
    expect(params[2]).toBe(mockOrgId);
    expect(params).not.toContain("attacker-user");
    expect(params).not.toContain("org-de-outra-clinica");
  });

  it("400 sem token", async () => {
    const app = await buildApp();
    const res = await app.fetch(req("POST", "/api/fcm-tokens", { deviceInfo: {} }), ENV);
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/fcm-tokens/:token", () => {
  beforeEach(() => vi.clearAllMocks());

  it("só desativa token do próprio usuário", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TOKEN_ROW] });
    const app = await buildApp();

    const res = await app.fetch(req("DELETE", "/api/fcm-tokens/ExponentPushToken%5Babc123%5D"), ENV);

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(["ExponentPushToken[abc123]", mockUserId]);
  });

  it("404 quando o token é de outro usuário", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();
    const res = await app.fetch(req("DELETE", "/api/fcm-tokens/token-alheio"), ENV);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/fcm-tokens — vazamento entre organizações", () => {
  beforeEach(() => vi.clearAllMocks());

  it("/tenant/:tenantId ignora o tenantId da URL e usa a org do token", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ token: "t1" }] });
    const app = await buildApp();

    const res = await app.fetch(req("GET", "/api/fcm-tokens/tenant/org-de-outra-clinica"), ENV);

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([mockOrgId]);
    expect(await res.json()).toEqual({ data: ["t1"] });
  });

  it("/user/:userId filtra também pela org do token", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const app = await buildApp();

    await app.fetch(req("GET", "/api/fcm-tokens/user/user-de-outra-clinica"), ENV);

    expect(mockQuery.mock.calls[0][1]).toEqual(["user-de-outra-clinica", mockOrgId]);
  });
});
