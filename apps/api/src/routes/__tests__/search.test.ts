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
  generateTurboSketch: vi.fn(() => "mock-sketch"),
  parseTurboSketch: vi.fn(() => new Uint8Array([1, 2, 3])),
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
  });

  it("GET /api/search rejects short queries", async () => {
    const app = await buildApp();
    const res = await app.fetch(makeRequest("GET", "/api/search?q=a"), BASE_ENV as any);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Parâmetro q obrigatório (mínimo 2 caracteres)",
    });
  });

  it("GET /api/search uses AI Search when available", async () => {
    const mockAiSearch = {
      search: vi.fn().mockResolvedValue({
        sources: [
          {
            id: "exercise:abc",
            score: 0.93,
            content: "Ponte - exercício pélvico",
            metadata: {
              source: "exercises",
              name: "Ponte",
            },
          },
        ],
      }),
    };

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("GET", "/api/search?q=lombalgia&type=exercises&limit=5"),
      {
        ...BASE_ENV,
        AI_SEARCH: mockAiSearch,
      } as any,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.source).toBe("ai_search");
    expect(data.query).toBe("lombalgia");
    expect(data.results).toHaveLength(1);
    expect(data.results[0]).toMatchObject({
      id: "exercise:abc",
      score: 0.93,
      content: "Ponte - exercício pélvico",
      type: "exercises",
    });
    expect(mockAiSearch.search).toHaveBeenCalledWith({
      messages: [
        { role: "system", content: "You are a physiotherapy knowledge assistant." },
        { role: "user", content: "lombalgia" },
      ],
      ai_search_options: {
        retrieval: {
          retrieval_type: "hybrid",
          max_num_results: 5,
          context_expansion: 0,
          filters: { source: { $eq: "exercises" } },
        },
        query_rewrite: { enabled: true },
        reranking: { enabled: true },
        cache: { enabled: true, cache_threshold: "close_enough" },
      },
    });
  });

  it("POST /api/search/index returns 200 (no-op compatible with frontend)", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("POST", "/api/search/index", { type: "all" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      indexed: 0,
    });
  });

  it("DELETE /api/search/index/:id returns 200 (no-op compatible with frontend)", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest("DELETE", "/api/search/index/exercise:abc"),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      deleted: true,
    });
  });
});
