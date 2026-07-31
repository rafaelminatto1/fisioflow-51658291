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

/** Números medidos em produção. */
const AGREGADO = {
  sem_sessao: "902",
  sem_sessao_recente: "326",
  sem_avaliacao: "334",
  sem_telefone: "997",
  observacao_curta: "107",
};

function sqlDe(call: unknown[]): string {
  const strings = call[0] as TemplateStringsArray;
  return Array.from(strings).join(" ");
}

async function buildApp() {
  const { Hono } = await import("hono");
  const rotas = (await import("../recordQuality")).default;
  const app = new Hono<any>();
  app.route("/api/analytics", rotas);
  return app;
}

beforeEach(() => {
  sqlSpy.mockReset();
  sqlSpy.mockImplementation(() =>
    Promise.resolve({
      rows: sqlSpy.mock.calls.length === 1 ? [AGREGADO] : [],
      rowCount: 1,
      fields: [],
      command: "SELECT",
    }),
  );
});

describe("GET /api/analytics/record-quality", () => {
  it("reproduz os números medidos em produção", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/record-quality");
    expect(res.status).toBe(200);
    const body = await res.json() as any;

    expect(body.data.agendamentosSemSessao.valor).toBe(902);
    expect(body.data.agendamentosSemSessao.recentes).toBe(326);
    expect(body.data.pacientesSemAvaliacao.valor).toBe(334);
    expect(body.data.pacientesSemTelefone.valor).toBe(997);
    expect(body.data.sessoesObservacaoCurta.valor).toBe(107);
  });

  it("isola por organização em todas as consultas", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/record-quality?includeList=true");
    expect(sqlSpy.mock.calls.length).toBe(5);
    for (const call of sqlSpy.mock.calls) {
      expect(sqlDe(call)).toContain("organization_id");
      expect(call.slice(1)).toContain(ORG);
    }
  });

  it("cada número acompanha a lista dos registros afetados", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/record-quality?includeList=true");
    const body = await res.json() as any;
    for (const chave of [
      "agendamentosSemSessao",
      "pacientesSemAvaliacao",
      "pacientesSemTelefone",
      "sessoesObservacaoCurta",
    ]) {
      expect(Array.isArray(body.data[chave].lista)).toBe(true);
    }
  });

  it("não busca listas quando includeList não é pedido", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/record-quality");
    expect(sqlSpy).toHaveBeenCalledTimes(1);
  });

  it("busca só a lista do indicador pedido", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/record-quality?includeList=true&indicador=pacientesSemTelefone");
    expect(sqlSpy).toHaveBeenCalledTimes(2);
  });

  it("limita a paginação", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/record-quality?includeList=true&limit=5000");
    expect(sqlSpy.mock.calls[1].slice(1)).toContain(200);
  });

  it("usa a primeira sessão, não patients.created_at, como proxy de admissão", async () => {
    const app = await buildApp();
    await app.request("/api/analytics/record-quality?includeList=true");
    const texto = sqlSpy.mock.calls.map(sqlDe).join("\n");
    expect(texto).not.toMatch(/p\.created_at|patients\.created_at/);
    expect(texto).toContain("primeiraSessao");
  });

  it("não atribui lacuna de prontuário a profissional", async () => {
    const app = await buildApp();
    const res = await app.request("/api/analytics/record-quality?includeList=true");
    const texto = sqlSpy.mock.calls.map(sqlDe).join("\n");
    expect(texto).not.toContain("therapist_id");
    expect((await res.json() as any).meta.naoDisponivel.porProfissional).toBeTruthy();
  });

  it("devolve 500 com mensagem quando a consulta falha", async () => {
    sqlSpy.mockRejectedValueOnce(new Error("boom"));
    const app = await buildApp();
    const res = await app.request("/api/analytics/record-quality");
    expect(res.status).toBe(500);
    expect((await res.json() as any).error).toMatch(/qualidade de prontuário/i);
  });
});
