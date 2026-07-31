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

/** Números medidos em produção (31/jul/2026), sem filtro de data. */
const TERMOS = [
  { category: "conduta", code: "liberacao_miofascial_manual", evolucoes: "8299", pacientes: "719" },
  { category: "conduta", code: "tens", evolucoes: "7597", pacientes: "702" },
  { category: "conduta", code: "eletroestimulacao_neuromuscular", evolucoes: "5237", pacientes: "454" },
  { category: "conduta", code: "terapia_combinada", evolucoes: "5171", pacientes: "642" },
  { category: "conduta", code: "liberacao_miofascial_massage_gun", evolucoes: "5146", pacientes: "574" },
  { category: "regiao", code: "mmii", evolucoes: "5342", pacientes: "518" },
  { category: "regiao", code: "joelho", evolucoes: "3750", pacientes: "364" },
  { category: "exercicio", code: "ponte", evolucoes: "3940", pacientes: "410" },
  { category: "exercicio", code: "agachamento", evolucoes: "3530", pacientes: "409" },
];

const BASE = { evolucoes: "11336", pacientes: "1020" };

function sqlDe(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray;
  return Array.from(strings).join(" ");
}

async function buildApp() {
  const { Hono } = await import("hono");
  const rotas = (await import("../clinicalPatterns")).default;
  const app = new Hono<any>();
  app.route("/api/analytics", rotas);
  return app;
}

beforeEach(() => {
  sqlSpy.mockReset();
  sqlSpy.mockImplementation(() =>
    Promise.resolve({
      rows: sqlSpy.mock.calls.length === 1 ? TERMOS : [BASE],
      rowCount: 1,
      fields: [],
      command: "SELECT",
    }),
  );
});

describe("GET /api/analytics/clinical-patterns", () => {
  it("reproduz os números medidos em produção e rotula em PT-BR", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/clinical-patterns");
    expect(res.status).toBe(200);
    const body = await res.json() as any;

    const condutas = body.data.condutas;
    expect(condutas[0]).toMatchObject({
      codigo: "liberacao_miofascial_manual",
      rotulo: "Liberação miofascial manual",
      evolucoes: 8299,
      pacientes: 719,
    });
    expect(condutas.map((c: any) => c.evolucoes)).toEqual([8299, 7597, 5237, 5171, 5146]);
    expect(body.data.regioes[0].evolucoes).toBe(5342);
    expect(body.data.exercicios[0].codigo).toBe("ponte");
  });

  it("expõe evoluções e pacientes separadamente", async () => {
    const app = await buildApp();
    const body = await (await app.request("/api/analytics/clinical-patterns")).json() as any;
    // Volume de trabalho e abrangência são leituras diferentes; um recurso pode
    // ter muitas evoluções e poucos pacientes.
    const combinada = body.data.condutas.find((c: any) => c.codigo === "terapia_combinada");
    expect(combinada.evolucoes).toBe(5171);
    expect(combinada.pacientes).toBe(642);
    expect(body.meta.base.evolucoes).toBe(11336);
  });

  it("isola por organização e descarta extração rejeitada", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/clinical-patterns");
    expect(sqlSpy.mock.calls.length).toBe(2);
    for (const call of sqlSpy.mock.calls) {
      expect(sqlDe(call)).toContain("organization_id");
      expect(call.slice(1)).toContain(ORG);
    }
    expect(sqlDe(sqlSpy.mock.calls[0])).toContain("rejected = false");
  });

  it("agrega só evolução, não avaliação", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/clinical-patterns");
    const texto = sqlDe(sqlSpy.mock.calls[0]);
    expect(texto).toContain("e.source_table = 'sessions'");
    expect(texto).not.toContain("patient_evaluation_responses");
    // Sessão apagada não pode continuar contando conduta.
    expect(texto).toContain("s.deleted_at IS NULL");
  });

  it("aceita filtros de período e de paciente", async () => {
    const app = await buildApp();
    const pid = "11111111-2222-3333-4444-555555555555";
    await app.request(
      `/api/analytics/clinical-patterns?desde=2026-01-01&ate=2026-06-30&patientId=${pid}`,
    );
    const params = sqlSpy.mock.calls[0].slice(1).flat();
    expect(params).toContain("2026-01-01");
    expect(params).toContain("2026-06-30");
    expect(params).toContain(pid);
  });

  it("ignora filtro malformado em vez de injetá-lo na consulta", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/clinical-patterns?desde=ontem&patientId=1;DROP TABLE");
    const params = sqlSpy.mock.calls[0].slice(1).flat();
    expect(params).not.toContain("ontem");
    expect(params.some((p: unknown) => typeof p === "string" && p.includes("DROP"))).toBe(false);
    const body = await (await app.request("/api/analytics/clinical-patterns?desde=ontem")).json() as any;
    expect(body.meta.filtros.desde).toBeNull();
  });

  it("limita a quantidade de termos por categoria", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/clinical-patterns?limit=9999");
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(100);
  });

  it("não oferece recorte por profissional nem leitura de efetividade", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/clinical-patterns");
    const body = await res.json() as any;
    expect(sqlDe(sqlSpy.mock.calls[0])).not.toContain("therapist_id");
    expect(body.meta.naoDisponivel.porProfissional).toBeTruthy();
    expect(body.meta.naoDisponivel.desfecho).toBeTruthy();
  });

  it("devolve 500 com mensagem quando a consulta falha", async () => {
    sqlSpy.mockRejectedValueOnce(new Error("boom"));
    const app = await buildApp();
    const res = await app.request("/api/analytics/clinical-patterns");
    expect(res.status).toBe(500);
    expect((await res.json() as any).error).toMatch(/padrões clínicos/i);
  });
});
