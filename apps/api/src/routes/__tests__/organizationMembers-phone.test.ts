import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(async () => ({ query: mockQuery })),
}));

let mockUserRole = "admin";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-admin-001",
      organizationId: "org-test-001",
      role: mockUserRole,
      email: "admin@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { organizationMembersRoutes } = await import("../organizationMembers");
  const app = new Hono<any>();
  app.route("/api/organization-members", organizationMembersRoutes);
  return app;
}

function patchPhone(userId: string, phone: unknown) {
  return new Request(`http://localhost/api/organization-members/${userId}/phone`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer fake" },
    body: JSON.stringify({ phone }),
  });
}

const BASE_ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

beforeEach(() => {
  vi.clearAllMocks();
  mockUserRole = "admin";
});

describe("PATCH /api/organization-members/:userId/phone", () => {
  it("normaliza e salva o telefone", async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ user_id: "u1", phone: "+5511999998888" }],
    });
    const app = await buildApp();
    const res = await app.fetch(patchPhone("u1", "+55 (11) 99999-8888"), BASE_ENV as any);
    expect(res.status).toBe(200);
    const params = mockQuery.mock.calls[0][1] as unknown[];
    expect(params[0]).toBe("+5511999998888");
    expect(params[2]).toBe("org-test-001");
  });

  it("vazio limpa o telefone (null)", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ user_id: "u1", phone: null }] });
    const app = await buildApp();
    const res = await app.fetch(patchPhone("u1", ""), BASE_ENV as any);
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[0][1] as unknown[])[0]).toBeNull();
  });

  it("rejeita telefone curto", async () => {
    const app = await buildApp();
    const res = await app.fetch(patchPhone("u1", "1234"), BASE_ENV as any);
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("não-admin recebe 403", async () => {
    mockUserRole = "fisioterapeuta";
    const app = await buildApp();
    const res = await app.fetch(patchPhone("u1", "+5511999998888"), BASE_ENV as any);
    expect(res.status).toBe(403);
  });

  it("404 quando o perfil não existe na org", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const app = await buildApp();
    const res = await app.fetch(patchPhone("u-x", "+5511999998888"), BASE_ENV as any);
    expect(res.status).toBe(404);
  });
});
