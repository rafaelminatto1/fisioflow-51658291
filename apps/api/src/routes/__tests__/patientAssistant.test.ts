import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSearchAiSearchOn = vi.fn();
const mockCallAI = vi.fn();

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", {
      uid: "user-patient-001",
      organizationId: "org-test-001",
      role: "patient",
      email: "patient@example.com",
    });
    await next();
  }),
}));

vi.mock("../../lib/cloudflareAiSearch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/cloudflareAiSearch")>();
  return {
    ...actual,
    searchAiSearchOn: vi.fn((...args) => mockSearchAiSearchOn(...args)),
  };
});

vi.mock("../../lib/ai/callAI", () => ({
  callAI: vi.fn((...args) => mockCallAI(...args)),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { patientAssistantRoutes } = await import("../patientAssistant");
  const app = new Hono<any>();
  app.route("/api/patient/assistant", patientAssistantRoutes);
  return app;
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/patient/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer fake-token",
    },
    body: JSON.stringify(body),
  });
}

const BASE_ENV = {
  AI_SEARCH_PATIENT: {},
  ANALYTICS: { writeDataPoint: vi.fn() },
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "development",
};

function sources(content: string, score: number, id: string, title: string) {
  return [{ id, filename: `${id}.md`, content, metadata: { title }, score }];
}

describe("patient assistant guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks emergency prompts before calling AI Search", async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest({ query: "Estou com dor no peito e falta de ar depois da sessão" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    expect(mockSearchAiSearchOn).not.toHaveBeenCalled();
    expect(mockCallAI).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({
      answered: false,
      blocked: true,
      reason: "emergency_symptoms",
      sources: [],
    });
  });

  it("blocks unsafe generated answers before returning them to the patient", async () => {
    mockSearchAiSearchOn.mockResolvedValue({
      raw: {},
      sources: sources("conteudo de orientação", 0.9, "wiki:1", "Orientação"),
    });
    mockCallAI.mockResolvedValue({
      content: "Tome 600mg de anti-inflamatório e não precisa procurar atendimento.",
    });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest({ query: "Como aliviar desconforto muscular leve?" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    // Geração passou pelo callAI (logo, pelo AI Gateway)
    expect(mockCallAI).toHaveBeenCalledTimes(1);
    await expect(res.json()).resolves.toMatchObject({
      answered: false,
      blocked: true,
      reason: "unsafe_response",
      sources: [],
    });
  });

  it("returns normal patient guidance when the prompt and answer are safe", async () => {
    mockSearchAiSearchOn.mockResolvedValue({
      raw: {},
      sources: sources("conteudo de ergonomia", 0.72, "wiki:ergonomia", "Postura e ergonomia"),
    });
    mockCallAI.mockResolvedValue({
      content: "Use pausas curtas e varie a posição ao longo do dia.",
    });

    const app = await buildApp();
    const res = await app.fetch(
      makeRequest({ query: "Como ajustar minha postura no trabalho?" }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data).toMatchObject({
      answered: true,
      answer: "Use pausas curtas e varie a posição ao longo do dia.",
      sources: [{ id: "wiki:ergonomia", title: "Postura e ergonomia" }],
    });
    expect(data).not.toHaveProperty("blocked");
  });
});
