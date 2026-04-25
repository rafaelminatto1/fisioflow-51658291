import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-test-001",
      organizationId: "org-test-001",
      role: "admin",
      email: "test@example.com",
    });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { knowledgeRoutes } = await import("../knowledge");
  const app = new Hono<any>();
  app.route("/api/knowledge", knowledgeRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const BASE_ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

describe("knowledge routes schema fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/knowledge/articles returns empty data when knowledge_articles is missing", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ table_name: null }] });

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/knowledge/articles"), BASE_ENV as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [] });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("GET /api/knowledge/articles returns empty data on missing-table database error", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ table_name: "knowledge_articles" }] });
    mockQuery.mockRejectedValueOnce(
      Object.assign(new Error('relation "knowledge_articles" does not exist'), { code: "42P01" }),
    );

    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/knowledge/articles"), BASE_ENV as any);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [] });
  });

  it("POST /api/knowledge/articles returns 501 when schema is unavailable", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ table_name: null }] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/knowledge/articles", { title: "Teste" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toMatchObject({
      error: "KNOWLEDGE_SCHEMA_UNAVAILABLE",
    });
  });

  it("GET /api/knowledge/profiles returns empty object when organization_members is missing", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ table_name: "profiles" }] })
      .mockResolvedValueOnce({ rows: [{ table_name: null }] });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/knowledge/profiles?ids=user-a,user-b"),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: {} });
  });
});
