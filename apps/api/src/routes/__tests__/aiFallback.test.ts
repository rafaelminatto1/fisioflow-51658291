import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/auth", () => ({
  requireAuth: (_c: any, next: any) => next(),
}));

vi.mock("../../lib/ai-gemini", () => ({
  callGemini: vi.fn().mockResolvedValue("gemini fallback response"),
  transcribeAudioWithGemini: vi.fn().mockResolvedValue("gemini transcript fallback"),
  streamGeminiChat: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../lib/ai/smartAI", () => ({
  smartChat: vi.fn(),
  smartStructured: vi.fn(),
  smartTranscribe: vi.fn(),
}));

vi.mock("../../lib/ai/unifiedAI", () => ({
  unifiedThinking: vi.fn(),
  unifiedStructured: vi.fn(),
}));

vi.mock("../../lib/ai/callAI", () => ({
  callAIVision: vi.fn(),
}));

vi.mock("../../lib/ai-context-cache", () => ({
  getOrCreatePatientCache: vi.fn(),
  invalidatePatientCache: vi.fn(),
  readPatientCacheEntry: vi.fn(),
}));

vi.mock("../../lib/ai-native", () => ({
  runAi: vi.fn(),
  transcribeAudio: vi.fn(),
  summarizeClinicalNote: vi.fn(),
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
  uid: "user-1",
  email: "test@example.com",
  organizationId: "org-1",
  role: "admin",
};

function makeEnv(overrides?: Record<string, unknown>) {
  return {
    ENVIRONMENT: "development" as const,
    ALLOWED_ORIGINS: "*",
    GOOGLE_AI_API_KEY: "test-key",
    FISIOFLOW_AI_GATEWAY_URL: "",
    FISIOFLOW_AI_GATEWAY_TOKEN: "",
    EDGE_CACHE: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ first: vi.fn().mockResolvedValue({ count: 1 }) })),
      })),
    },
    ANALYTICS: { writeDataPoint: vi.fn() },
    ...overrides,
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

describe("AI route provider fallback", () => {
  beforeEach(async () => {
    const { smartChat, smartStructured } = await import("../../lib/ai/smartAI");
    (smartChat as any).mockReset();
    (smartStructured as any).mockReset();
    const { unifiedStructured } = await import("../../lib/ai/unifiedAI");
    (unifiedStructured as any).mockReset();
  });

  it("falls back to callGemini when smartChat fails in clinicalChat", async () => {
    const { smartChat } = await import("../../lib/ai/smartAI");
    (smartChat as any).mockRejectedValueOnce(new Error("smartAI unavailable"));

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/ai/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clinicalChat", data: { message: "test question" } }),
      }),
      makeEnv(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { response: string } };
    expect(body.data.response).toBe("gemini fallback response");
  });

  it("returns fallback form suggestions when structured output fails", async () => {
    const { unifiedStructured } = await import("../../lib/ai/unifiedAI");
    (unifiedStructured as any).mockRejectedValueOnce(new Error("schema error"));

    const app = await buildApp();
    const res = await app.fetch(
      new Request("http://localhost/api/ai/form-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: "paciente com dor lombar crônica" }),
      }),
      makeEnv(),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { suggestions: Array<{ label: string }> } };
    expect(body.data.suggestions.length).toBeGreaterThan(0);
    expect(body.data.suggestions.some((s) => s.label.includes("coluna") || s.label.includes("Lasègue"))).toBe(true);
  });
});
