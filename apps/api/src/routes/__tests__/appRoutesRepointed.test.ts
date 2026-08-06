import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Rotas criadas/corrigidas em 08/2026 para os caminhos que o app profissional
 * chamava e recebia 404. O que estes testes protegem não é o "200 OK" — é o
 * ESCOPO: nenhuma dessas tabelas tem `organization_id` próprio (ou tinha o
 * filtro faltando), então o isolamento depende de um JOIN que é fácil de
 * remover sem perceber.
 */

const mockQuery = vi.fn();

vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
  createReplicaPool: vi.fn(() => ({ query: mockQuery })),
  createDb: vi.fn(() => ({})),
  getRawSql: vi.fn(),
}));

const ORG = "00000000-0000-0000-0000-000000000001";
const OTHER_ORG = "00000000-0000-0000-0000-000000000002";
const USER = { uid: "user-1", profileId: "profile-1", organizationId: ORG, email: "a@b.com" };

vi.mock("../../lib/auth", () => ({
  requireAuth: async (c: any, next: any) => {
    c.set("user", USER);
    await next();
  },
}));

async function buildApp(prefix: string, moduleName: string, exportName: string) {
  const { Hono } = await import("hono");
  const mod: any = await import(moduleName);
  const app = new Hono<any>();
  app.route(prefix, mod[exportName]);
  return app;
}

const ENV = { ENVIRONMENT: "development" } as any;

/** Concatena os SQLs executados, para asserção sobre o filtro aplicado. */
function executedSql(): string {
  return mockQuery.mock.calls.map((call) => String(call[0])).join("\n---\n");
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /api/clinic-metrics/clinical-alerts", () => {
  it("filtra pela organização do token via join com patients", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp("/api/clinic-metrics", "../clinicMetrics", "clinicMetricsRoutes");

    const res = await app.request("/api/clinic-metrics/clinical-alerts", {}, ENV);

    expect(res.status).toBe(200);
    expect(executedSql()).toContain("p.organization_id = $1");
    expect(mockQuery.mock.calls[0][1][0]).toBe(ORG);
  });

  it("usa status pending por padrão e aceita override", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp("/api/clinic-metrics", "../clinicMetrics", "clinicMetricsRoutes");

    await app.request("/api/clinic-metrics/clinical-alerts", {}, ENV);
    expect(mockQuery.mock.calls[0][1][1]).toBe("pending");

    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
    await app.request("/api/clinic-metrics/clinical-alerts?status=resolved&severity=high", {}, ENV);
    expect(mockQuery.mock.calls[0][1][1]).toBe("resolved");
    expect(mockQuery.mock.calls[0][1][2]).toBe("high");
  });
});

describe("POST /api/clinic-metrics/clinical-alerts/:id/resolve", () => {
  it("devolve 404 quando o alerta não é da organização", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp("/api/clinic-metrics", "../clinicMetrics", "clinicMetricsRoutes");

    const res = await app.request(
      "/api/clinic-metrics/clinical-alerts/alert-de-outra-org/resolve",
      { method: "POST" },
      ENV,
    );

    expect(res.status).toBe(404);
    expect(executedSql()).toContain("p.organization_id = $1");
  });

  it("resolve e registra quem resolveu", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "alert-1" }] });
    const app = await buildApp("/api/clinic-metrics", "../clinicMetrics", "clinicMetricsRoutes");

    const res = await app.request(
      "/api/clinic-metrics/clinical-alerts/alert-1/resolve",
      { method: "POST" },
      ENV,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockQuery.mock.calls[0][1]).toEqual([ORG, "alert-1", USER.profileId]);
  });
});

describe("GET /api/groups/sessions/:sessionId/attendees", () => {
  it("lista matriculados da turma da sessão, escopado pela organização", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: "enrollment-1",
          patient_id: "patient-1",
          patient_name: "Maria",
          status: "pending",
          checked_in_at: null,
        },
      ],
    });
    const app = await buildApp("/api/groups", "../groups", "groupsRoutes");

    const res = await app.request("/api/groups/sessions/session-1/attendees", {}, ENV);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [
        {
          id: "enrollment-1",
          patient_id: "patient-1",
          patient_name: "Maria",
          status: "pending",
          checked_in_at: null,
        },
      ],
    });
    expect(executedSql()).toContain("gs.organization_id = $1");
    expect(mockQuery.mock.calls[0][1]).toEqual([ORG, "session-1"]);
  });
});

describe("POST /api/groups/attendees/:enrollmentId/confirm", () => {
  it("exige sessionId", async () => {
    const app = await buildApp("/api/groups", "../groups", "groupsRoutes");

    const res = await app.request(
      "/api/groups/attendees/enrollment-1/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
      ENV,
    );

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("não repete linha quando a presença é confirmada duas vezes", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: "checkin-1" }] }) // já existe
      .mockResolvedValueOnce({ rows: [{ id: "checkin-1", status: "confirmed" }] });

    const app = await buildApp("/api/groups", "../groups", "groupsRoutes");

    const res = await app.request(
      "/api/groups/attendees/enrollment-1/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1" }),
      },
      ENV,
    );

    expect(res.status).toBe(200);
    expect(executedSql()).toContain("UPDATE group_checkins");
    expect(executedSql()).not.toContain("INSERT INTO group_checkins");
  });

  it("insere derivando patient_id da matrícula, não do corpo", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // não existe ainda
      .mockResolvedValueOnce({ rows: [{ id: "checkin-1" }] });

    const app = await buildApp("/api/groups", "../groups", "groupsRoutes");

    const res = await app.request(
      "/api/groups/attendees/enrollment-1/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1", patient_id: "paciente-de-outra-org" }),
      },
      ENV,
    );

    expect(res.status).toBe(201);
    const insertSql = String(mockQuery.mock.calls[1][0]);
    expect(insertSql).toContain("SELECT $1, gs.id, e.id, e.patient_id");
    expect(mockQuery.mock.calls[1][1]).not.toContain("paciente-de-outra-org");
  });

  it("devolve 404 quando a matrícula não pertence à organização", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const app = await buildApp("/api/groups", "../groups", "groupsRoutes");

    const res = await app.request(
      "/api/groups/attendees/enrollment-de-outra-org/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: "session-1" }),
      },
      ENV,
    );

    expect(res.status).toBe(404);
  });
});

describe("GET /api/exercise-sessions", () => {
  it("escopa por organização via join com patients", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp("/api/exercise-sessions", "../exerciseSessions", "exerciseSessionsRoutes");

    const res = await app.request("/api/exercise-sessions?patientId=patient-1", {}, ENV);

    expect(res.status).toBe(200);
    expect(executedSql()).toContain("p.organization_id = $1");
    expect(mockQuery.mock.calls[0][1][0]).toBe(ORG);
  });
});

describe("POST /api/exercise-sessions", () => {
  it("recusa paciente de outra organização", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // paciente não encontrado na org
    const app = await buildApp("/api/exercise-sessions", "../exerciseSessions", "exerciseSessionsRoutes");

    const res = await app.request(
      "/api/exercise-sessions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patient_id: "patient-de-outra-org" }),
      },
      ENV,
    );

    expect(res.status).toBe(404);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][1]).toEqual(["patient-de-outra-org", ORG]);
  });
});

describe("POST /api/clinical/generated-reports", () => {
  it("valida campos obrigatórios antes de tocar no banco", async () => {
    const app = await buildApp("/api/clinical", "../clinical", "clinicalRoutes");

    const res = await app.request(
      "/api/clinical/generated-reports",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "texto" }),
      },
      ENV,
    );

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("devolve 404 quando o paciente não é da organização", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const app = await buildApp("/api/clinical", "../clinical", "clinicalRoutes");

    const res = await app.request(
      "/api/clinical/generated-reports",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patient_id: "patient-de-outra-org", content: "texto" }),
      },
      ENV,
    );

    expect(res.status).toBe(404);
    // O INSERT alimenta-se de um SELECT sobre patients filtrado por organização:
    // patient_id de outra org não cria linha órfã.
    expect(executedSql()).toContain("FROM patients p");
    expect(executedSql()).toContain("p.organization_id = $1");
    expect(mockQuery.mock.calls[0][1][0]).toBe(ORG);
  });

  it("aceita tanto `content` quanto `report_content`", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "report-1" }] });
    const app = await buildApp("/api/clinical", "../clinical", "clinicalRoutes");

    const res = await app.request(
      "/api/clinical/generated-reports",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId: "patient-1", report_content: "texto" }),
      },
      ENV,
    );

    expect(res.status).toBe(201);
    expect(mockQuery.mock.calls[0][1][3]).toBe("texto");
  });
});

describe("regressão: OTHER_ORG nunca vaza", () => {
  it("o id de organização usado é sempre o do token, nunca o do corpo", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: "x" }] });
    const app = await buildApp("/api/clinical", "../clinical", "clinicalRoutes");

    await app.request(
      "/api/clinical/generated-reports",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: "patient-1",
          content: "texto",
          organization_id: OTHER_ORG,
        }),
      },
      ENV,
    );

    expect(mockQuery.mock.calls[0][1]).not.toContain(OTHER_ORG);
  });
});
