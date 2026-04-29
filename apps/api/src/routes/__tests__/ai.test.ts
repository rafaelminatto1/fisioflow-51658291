import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/auth", () => ({
  requireAuth: (_c: any, next: any) => next(),
}));

vi.mock("../../lib/ai-gemini", () => ({
  callGemini: vi.fn().mockResolvedValue("response"),
  transcribeAudioWithGemini: vi.fn().mockResolvedValue("transcript"),
  streamGeminiChat: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../lib/ai/smartAI", () => ({
  smartChat: vi.fn().mockResolvedValue({ text: "response", thoughts: null }),
  smartStructured: vi.fn().mockResolvedValue({ data: {} }),
  smartTranscribe: vi.fn().mockResolvedValue("transcript"),
}));

vi.mock("../../lib/ai/unifiedAI", () => ({
  unifiedThinking: vi.fn().mockResolvedValue({ text: "result", thoughts: null }),
  unifiedStructured: vi.fn().mockResolvedValue({ result: "structured" }),
}));

vi.mock("../../lib/ai/callAI", () => ({
  callAIVision: vi.fn().mockResolvedValue({ content: "result", usage: {}, latencyMs: 100 }),
}));

vi.mock("../../lib/ai-context-cache", () => ({
  getOrCreatePatientCache: vi.fn().mockResolvedValue({
    cacheName: "caches/test",
    model: "test-model",
    createdNew: true,
    expireTime: "2026-04-29T00:00:00Z",
    context: { approxTokens: 100, counts: {}, generatedAt: "2026-04-28T00:00:00Z" },
  }),
  invalidatePatientCache: vi.fn(),
  readPatientCacheEntry: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../lib/ai-native", () => ({
  runAi: vi.fn().mockResolvedValue({}),
  transcribeAudio: vi.fn().mockResolvedValue("transcript"),
  summarizeClinicalNote: vi.fn().mockResolvedValue("summary"),
}));

vi.mock("../../lib/axiom", () => ({
  logToAxiom: vi.fn(),
}));

vi.mock("../../schemas/ai-schemas", () => ({
  ClinicalReportSchema: {},
  ExerciseSuggestionSchema: {},
  FastProcessingSchema: {},
  FormSuggestionSchema: {},
  ReceiptOcrSchema: {},
  SoapSchema: {},
  TreatmentAdherenceSchema: {},
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  organizationId: "org-1",
  role: "admin",
};

function makeOverLimitEnv() {
  return {
    ENVIRONMENT: "development" as const,
    ALLOWED_ORIGINS: "*",
    GOOGLE_AI_API_KEY: "test-key",
    FISIOFLOW_AI_GATEWAY_URL: "",
    FISIOFLOW_AI_GATEWAY_TOKEN: "",
    EDGE_CACHE: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ count: 101 }),
        })),
      })),
    },
    ANALYTICS: { writeDataPoint: vi.fn() },
  } as any;
}

function makeUnderLimitEnv() {
  return {
    ENVIRONMENT: "development" as const,
    ALLOWED_ORIGINS: "*",
    GOOGLE_AI_API_KEY: "test-key",
    FISIOFLOW_AI_GATEWAY_URL: "",
    FISIOFLOW_AI_GATEWAY_TOKEN: "",
    EDGE_CACHE: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ count: 1 }),
        })),
      })),
    },
    ANALYTICS: { writeDataPoint: vi.fn() },
  } as any;
}

async function buildApp() {
  const { Hono } = await import("hono");
  const { aiRoutes } = await import("../../routes/ai");

  const app = new Hono<any>();
  app.use("/*", async (c, next) => {
    c.set("user", mockUser);
    await next();
  });
  app.route("/api/ai", aiRoutes);
  return app;
}

describe("AI route rate limiting", () => {
  it("allows requests under the rate limit", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/ai/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clinicalChat", data: { message: "test" } }),
      }),
      makeUnderLimitEnv(),
    );

    expect(res.status).not.toBe(429);
  });

  it("returns 429 when the AI rate limit is exceeded", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/ai/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clinicalChat", data: { message: "test" } }),
      }),
      makeOverLimitEnv(),
    );

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("includes Retry-After header on rate limit", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/ai/fast-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "test", mode: "fix_grammar" }),
      }),
      makeOverLimitEnv(),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("emits analytics event on rate limit rejection", async () => {
    const app = await buildApp();
    const writeDataPoint = vi.fn();
    const env = makeOverLimitEnv();
    env.ANALYTICS = { writeDataPoint };

    await app.fetch(
      new Request("http://localhost/api/ai/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clinicalChat" }),
      }),
      env,
    );

    expect(writeDataPoint).toHaveBeenCalled();
    const call = writeDataPoint.mock.calls[0][0];
    expect(call.blobs).toEqual(
      expect.arrayContaining([expect.stringContaining("rate_limit:ai")]),
    );
  });
});
