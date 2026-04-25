import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQuery = vi.fn();
const mockGenerateEmbedding = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-search-001",
      organizationId: "org-test-001",
      role: "admin",
      email: "search@example.com",
    });
    await next();
  }),
}));

vi.mock("../../lib/ai-native", () => ({
  generateEmbedding: vi.fn((...args) => mockGenerateEmbedding(...args)),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { searchRoutes } = await import("../search");
  const app = new Hono<any>();
  app.route("/api/search", searchRoutes);
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

describe("search routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  it("GET /api/search rejects short queries", async () => {
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/search?q=a"), BASE_ENV as any);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Parâmetro q obrigatório (mínimo 2 caracteres)",
    });
  });

  it("GET /api/search uses Vectorize when available", async () => {
    const vectorQuery = vi.fn().mockResolvedValue({
      matches: [
        {
          id: "exercise:abc",
          score: 0.93,
          metadata: {
            content_type: "exercises",
            name: "Ponte",
            description: "Exercício de cadeia posterior",
          },
        },
      ],
    });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/search?q=lombalgia&type=exercises&limit=5"),
      {
        ...BASE_ENV,
        CLINICAL_KNOWLEDGE: { query: vectorQuery },
      } as any,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      source: "vectorize",
      query: "lombalgia",
      results: [
        {
          id: "exercise:abc",
          type: "exercises",
          name: "Ponte",
        },
      ],
    });
    expect(mockGenerateEmbedding).toHaveBeenCalledWith(expect.anything(), "lombalgia");
    expect(vectorQuery).toHaveBeenCalledWith([0.1, 0.2, 0.3], {
      topK: 5,
      returnMetadata: "all",
      filter: { content_type: "exercises" },
    });
  });

  it("POST /api/search/index returns 503 when Vectorize is unavailable", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/search/index", { type: "all" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: "Vectorize não configurado",
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("DELETE /api/search/index/:id returns 503 when Vectorize is unavailable", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("DELETE", "/api/search/index/exercise:abc"),
      BASE_ENV as any,
    );

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      error: "Vectorize não configurado",
    });
  });
});
