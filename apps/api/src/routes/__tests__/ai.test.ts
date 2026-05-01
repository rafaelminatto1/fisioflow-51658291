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

// ============================================================================
// #18 S4-T2 — Voice Assessment Endpoints Validation
// ============================================================================

vi.mock("../../services/ai/AssessmentRecordingService", () => ({
  AssessmentRecordingService: class {
    processRecording() {
      return Promise.resolve({
        form: {
          chief_complaint: "Dor lombar",
          pain_location: "Lombar",
          pain_intensity: 7,
          functional_limitations: ["Dificuldade ao sentar"],
        },
        transcript: "Paciente relata dor lombar há 3 dias",
        patientContextUsed: false,
      });
    }
    processTranscript() {
      return Promise.resolve({
        form: {
          chief_complaint: "Dor no ombro",
          pain_location: "Ombro direito",
          pain_intensity: 5,
          functional_limitations: ["Dificuldade ao levantar o braço"],
        },
        transcript: "Dor no ombro há 1 semana",
        patientContextUsed: false,
      });
    }
  },
}));

describe("Voice Assessment Endpoints (#18 S4-T2)", () => {
  async function buildVoiceApp() {
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

  it("POST /api/ai/assessment/recording — returns form and transcript on valid audio", async () => {
    const app = await buildVoiceApp();
    const env = makeUnderLimitEnv();

    const res = await app.fetch(
      new Request("http://localhost/api/ai/assessment/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: "a".repeat(200),
          patientId: undefined,
        }),
      }),
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.transcript).toBe("Paciente relata dor lombar há 3 dias");
  });

  it("POST /api/ai/assessment/recording — returns 400 when audioBase64 missing", async () => {
    const app = await buildVoiceApp();
    const env = makeUnderLimitEnv();

    const res = await app.fetch(
      new Request("http://localhost/api/ai/assessment/recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      env,
    );

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toMatch(/audioBase64/);
  });

  it("POST /api/ai/assessment/transcript — returns form on valid transcript text", async () => {
    const app = await buildVoiceApp();
    const env = makeUnderLimitEnv();

    const res = await app.fetch(
      new Request("http://localhost/api/ai/assessment/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "Dor no ombro há 1 semana com limitação de movimento" }),
      }),
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("POST /api/ai/assessment/transcript — returns 400 when transcript too short", async () => {
    const app = await buildVoiceApp();
    const env = makeUnderLimitEnv();

    const res = await app.fetch(
      new Request("http://localhost/api/ai/assessment/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "curto" }),
      }),
      env,
    );

    expect(res.status).toBe(400);
  });

  it("GET /api/ai/assessment/live-ws — returns 403 when premium not enabled", async () => {
    const app = await buildVoiceApp();
    const env = { ...makeUnderLimitEnv(), GOOGLE_AI_PREMIUM_ENABLED: "false" };

    const res = await app.fetch(
      new Request("http://localhost/api/ai/assessment/live-ws?patientId=00000000-0000-0000-0000-000000000001"),
      env,
    );

    expect(res.status).toBe(403);
  });
});
