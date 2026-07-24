import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { id: "test-user", uid: "test-user", role: "admin", email: "a@x.com" });
    await next();
  }),
}));

const mockQuery = vi.fn();
const mockKvGet = vi.fn();
const mockKvSet = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
  createDb: vi.fn(),
  getRawSql: vi.fn(() => mockQuery),
}));

vi.mock("../../lib/contentIndexing", () => ({
  removeExerciseFromIndex: vi.fn(),
  syncExerciseToIndex: vi.fn(),
}));

vi.mock("../../lib/cloudflareAiSearch", () => ({
  searchAiSearch: vi.fn(),
}));

vi.mock("../../lib/ai-native", () => ({
  generateEmbedding1024: vi.fn(),
  generateTurboSketch: vi.fn(() => "sketch"),
  runAi: vi.fn(),
  readAiText: vi.fn(),
}));

vi.mock("../../lib/workersAi", () => ({
  WORKERS_AI_MODELS: { llama_3_1_8b: "@cf/meta/llama-3.1-8b-instruct-fast" },
}));

vi.mock("@fisioflow/db", () => ({
  exercises: {},
  exerciseCategories: {},
  exerciseFavorites: {},
  exerciseMediaAttachments: {},
  wikiDictionary: {},
}));

function env() {
  return {
    FISIOFLOW_CONFIG: {
      get: mockKvGet,
      put: mockKvSet,
      delete: vi.fn(),
    },
    AI: {},
    ALLOWED_ORIGINS: "*",
    ENVIRONMENT: "development",
    executionCtx: {
      waitUntil: vi.fn((p: any) => Promise.resolve(p)),
    },
  } as any;
}

async function buildApp() {
  const { Hono } = await import("hono");
  const { exercisesRoutes } = await import("../exercises");
  const app = new Hono<any>();
  app.route("/api/exercises", exercisesRoutes);
  return app;
}

describe("GET /api/exercises/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue(undefined);
  });

  it("returns structured catalog with counts, categories and gaps", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { difficulty: "iniciante", count: 5 },
          { difficulty: "intermediario", count: 3 },
          { difficulty: "avancado", count: 2 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { difficulty: "iniciante", category_slug: "core", category_name: "Core", category_color: "#ff0", count: 3 },
          { difficulty: "avancado", category_slug: "joelho", category_name: "Joelho", category_color: "#00f", count: 2 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "a", slug: "ex-x", name: "Ex X", difficulty: "iniciante" }],
      });

    const app = await buildApp();
    const exCtx = { waitUntil: vi.fn() } as any;
    const res = await app.fetch(new Request("http://localhost/api/exercises/catalog"), env(), exCtx);

    expect(res.status).toBe(200);
    const body: any = await res.json();

    expect(body.data.total).toBe(10);
    expect(body.data.byDifficulty).toHaveProperty("iniciante");
    expect(body.data.byDifficulty.iniciante.count).toBe(5);
    expect(body.data.byDifficulty.iniciante.categories).toHaveLength(1);
    expect(body.data.byDifficulty.avancado.count).toBe(2);
    expect(body.data.contentGaps).toHaveLength(1);
    expect(body.data.contentGaps[0].slug).toBe("ex-x");
    expect(body.data.contentGapsCount).toBe(1);
  });

  it("returns cached data when KV has it", async () => {
    const cached = { data: { total: 399, byDifficulty: {}, contentGaps: [], contentGapsCount: 0 } };
    mockKvGet.mockResolvedValueOnce(cached);

    const app = await buildApp();
    const exCtx2 = { waitUntil: vi.fn() } as any;
    const res = await app.fetch(new Request("http://localhost/api/exercises/catalog"), env(), exCtx2);

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toEqual(cached);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
