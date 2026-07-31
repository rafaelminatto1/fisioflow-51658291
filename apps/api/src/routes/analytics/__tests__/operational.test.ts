import { beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "00000000-0000-0000-0000-000000000001";

const sqlSpy = vi.fn();

vi.mock("../../../lib/db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

vi.mock("../../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { uid: "u-1", organizationId: ORG, role: "admin", email: "a@b.c" });
    await next();
  }),
}));

/** Números medidos em produção: o teste trava a forma da resposta, não o dado. */
const AGREGADO = {
  faltas: "3032",
  base_falta: "14475",
  com_atendimento: "890",
  com_proxima: "25",
  ativos_sem_proxima: "146",
  risco_abandono: "80",
  intervalo_medio: "5.76",
  ativos_30d: "92",
  sessoes_30d: "333",
};

/** Junta os fragmentos do template tag para inspecionar o SQL emitido. */
function sqlDe(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray;
  return Array.from(strings).join(" ");
}

function todoSql(): string {
  return sqlSpy.mock.calls.map(sqlDe).join("\n");
}

async function buildApp() {
  const { Hono } = await import("hono");
  const rotas = (await import("../operational")).default;
  const app = new Hono<any>();
  app.route("/api/analytics", rotas);
  return app;
}

beforeEach(() => {
  sqlSpy.mockReset();
  // Primeira chamada é sempre o agregado; as listas voltam vazias por padrão.
  sqlSpy.mockImplementation(() =>
    Promise.resolve({
      rows: sqlSpy.mock.calls.length === 1 ? [AGREGADO] : [],
      rowCount: 1,
      fields: [],
      command: "SELECT",
    }),
  );
});

describe("GET /api/analytics/operational", () => {
  it("reproduz os números medidos em produção", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/operational");
    expect(res.status).toBe(200);
    const body = await res.json() as any;

    expect(body.data.taxaFalta.valor).toBe(20.9);
    expect(body.data.taxaFalta.base).toBe(14475);
    expect(body.data.pacientesComAtendimento.valor).toBe(890);
    expect(body.data.comProximaSessao.valor).toBe(25);
    expect(body.data.ativosSemProximaSessao.valor).toBe(146);
    expect(body.data.riscoAbandono.valor).toBe(80);
    expect(body.data.intervaloMedioSessoesDias.valor).toBe(5.8);
    expect(body.data.pacientesAtivos30d.valor).toBe(92);
    expect(body.data.sessoes30d.valor).toBe(333);
  });

  it("isola por organização em todas as consultas", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational?includeList=true");
    expect(sqlSpy.mock.calls.length).toBeGreaterThan(1);
    for (const call of sqlSpy.mock.calls) {
      expect(sqlDe(call)).toContain("organization_id");
      expect(call.slice(1)).toContain(ORG);
    }
  });

  it("não busca listas quando includeList não é pedido", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational");
    expect(sqlSpy).toHaveBeenCalledTimes(1);
  });

  it("busca só a lista do indicador pedido", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational?includeList=true&indicador=riscoAbandono");
    expect(sqlSpy).toHaveBeenCalledTimes(2);
  });

  it("limita a paginação para não exportar a base inteira", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational?includeList=true&limit=9999&offset=-5");
    const params = sqlSpy.mock.calls[1].slice(1);
    expect(params).toContain(200);
    expect(params).toContain(0);
  });

  it("usa apenas os status reais do enum de agendamento", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational");
    const params = sqlSpy.mock.calls[0].slice(1).flat();
    // 'confirmed'/'completed'/'realizado' são valores legados inexistentes no enum.
    for (const legado of ["confirmed", "completed", "realizado"]) {
      expect(params).not.toContain(legado);
    }
    expect(params).toContain("faltou_com_aviso");
    expect(params).toContain("nao_atendido");
  });

  it("nunca agrupa falta por profissional", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/operational?includeList=true");
    const texto = todoSql();
    // Só o volume de atendimentos pode ser agrupado por terapeuta; a autoria
    // histórica das faltas é enviesada (94,6% sem autor).
    const blocosComFalta = sqlSpy.mock.calls
      .map((call) => ({ sql: sqlDe(call), params: call.slice(1).flat() }))
      .filter((b) => b.params.includes("faltou"));
    for (const bloco of blocosComFalta) {
      expect(bloco.sql).not.toMatch(/GROUP BY[^)]*therapist_id/i);
    }
    expect(texto).toContain("therapist_id");

    const body = await res.json() as any;
    expect(body.meta.naoDisponivel.taxaFaltaPorProfissional).toBeTruthy();
    expect(body.data).not.toHaveProperty("taxaFaltaPorProfissional");
  });

  it("não usa patients.created_at como coorte de admissão", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/operational?includeList=true");
    expect(todoSql()).not.toMatch(/p\.created_at|patients\.created_at/);
  });

  it("devolve 500 com mensagem quando a consulta falha", async () => {
    sqlSpy.mockRejectedValueOnce(new Error("boom"));
    const app = await buildApp();
    const res = await app.request("/api/analytics/operational");
    expect(res.status).toBe(500);
    expect((await res.json() as any).error).toMatch(/indicadores operacionais/i);
  });
});
