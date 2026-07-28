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
const mockRunAi = vi.fn();
const mockReadAiText = vi.fn((response: { response?: string }) => response.response ?? "");

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
  runAi: mockRunAi,
  readAiText: mockReadAiText,
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
    mockRunAi.mockResolvedValue({ response: "{}" });
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
        rows: [
          {
            id: "a",
            slug: "ex-x",
            name: "Ex X",
            difficulty: "iniciante",
            missing_category: true,
            missing_body_parts: true,
          },
        ],
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
    expect(body.data.contentGaps[0].missing).toEqual(["category_id", "body_parts"]);
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

describe("POST /api/exercises/content/backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue(null);
    mockKvSet.mockResolvedValue(undefined);
  });

  it("preenche campos estruturados em lote e valida a categoria retornada pela IA", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: "category-core", slug: "core", name: "Core / Estabilização" }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exercise-1",
            name: "Prancha frontal",
            description: "Exercício executado em colchonete para estabilização do tronco.",
            tips: null,
            precautions: null,
            benefits: null,
            category_id: null,
            subcategory: null,
            muscles_primary: [],
            muscles_secondary: [],
            body_parts: [],
            equipment: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    mockRunAi.mockResolvedValueOnce({
      response: JSON.stringify({
        description: "Exercício isométrico para estabilização do tronco.",
        category_slug: "core",
        muscles_primary: ["Transverso do abdômen", "Transverso do abdômen"],
        body_parts: ["Coluna lombar"],
        equipment: ["Colchonete"],
      }),
    });

    const app = await buildApp();
    const exCtx = { waitUntil: vi.fn((promise: Promise<unknown>) => promise) } as any;
    const res = await app.fetch(
      new Request("http://localhost/api/exercises/content/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fields: ["description", "category_id", "muscles_primary", "body_parts", "equipment"],
          batchSize: 20,
        }),
      }),
      env(),
      exCtx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      processed: 1,
      failed: 0,
      remaining: 0,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE exercises"),
      expect.arrayContaining([
        "category-core",
        ["Transverso do Abdômen"],
        ["Coluna Lombar"],
        ["Colchonete"],
        "exercise-1",
      ]),
    );
  });

  it("faz dry run sem persistir mudanças", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exercise-1",
            name: "Prancha frontal",
            description: null,
            tips: null,
            precautions: null,
            benefits: null,
            category_id: null,
            subcategory: null,
            muscles_primary: [],
            muscles_secondary: [],
            body_parts: [],
            equipment: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] });
    mockRunAi.mockResolvedValueOnce({ response: JSON.stringify({ description: "Descrição clínica." }) });

    const app = await buildApp();
    const exCtx = { waitUntil: vi.fn() } as any;
    const res = await app.fetch(
      new Request("http://localhost/api/exercises/content/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields: ["description"], dryRun: true }),
      }),
      env(),
      exCtx,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 1, dryRun: true, remaining: 1 });
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE exercises"), expect.anything());
  });

  it("descarta equipamento fora do vocabulário e normaliza os termos permitidos", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exercise-1",
            name: "Abdominal",
            description: null,
            tips: null,
            precautions: null,
            benefits: null,
            category_id: "category-core",
            subcategory: "Core",
            muscles_primary: ["Reto Abdominal"],
            muscles_secondary: ["Oblíquos"],
            body_parts: ["Abdômen"],
            equipment: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });
    mockRunAi.mockResolvedValueOnce({
      response: JSON.stringify({
        description: "Fortalecimento do tronco.",
        equipment: ["Bicicleta de abdominais", "sem equipamento"],
      }),
    });

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/exercises/content/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields: ["description", "equipment"] }),
      }),
      env(),
      { waitUntil: vi.fn() } as any,
    );

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE exercises"),
      expect.arrayContaining([["Sem Equipamento"]]),
    );
  });

  it("não grava equipamento não sustentado pelo nome ou descrição do exercício", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exercise-1",
            name: "Abdominal Bicicleta",
            description: "Fortalecimento dinâmico de oblíquos.",
            tips: "",
            precautions: "",
            benefits: "",
            category_id: "category-core",
            subcategory: "Core",
            muscles_primary: ["Reto Abdominal"],
            muscles_secondary: ["Oblíquos"],
            body_parts: ["Abdômen"],
            equipment: [],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ n: 1 }] });
    mockRunAi.mockResolvedValueOnce({ response: JSON.stringify({ equipment: "Bicicleta Ergométrica" }) });

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/exercises/content/backfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields: ["equipment"] }),
      }),
      env(),
      { waitUntil: vi.fn() } as any,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ processed: 0, failed: 1, remaining: 1 });
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining("UPDATE exercises"), expect.anything());
  });
});
