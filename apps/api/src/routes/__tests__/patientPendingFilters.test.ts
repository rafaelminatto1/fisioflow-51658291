import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PATIENT_PENDING_FILTERS,
  PATIENT_PENDING_FILTER_KEYS,
  buildPatientPendingCountsSql,
  isPatientPendingFilterKey,
  patientPendingFilterClause,
} from "../../lib/clinical/patientPendingFilters";

const mockQuery = vi.fn();
vi.mock("../../lib/db", () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

const ORG = "00000000-0000-0000-0000-000000000001";

vi.mock("../../lib/auth", () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set("user", { uid: "u-1", organizationId: ORG, role: "admin", email: "a@b.c" });
    await next();
  }),
}));

async function buildApp() {
  const { Hono } = await import("hono");
  const { patientsRoutes } = await import("../patients");
  const app = new Hono<any>();
  app.route("/api/patients", patientsRoutes);
  return app;
}

function req(path: string) {
  return new Request(`http://localhost${path}`, {
    headers: { Authorization: "Bearer fake" },
  });
}

const ENV = { HYPERDRIVE: {}, ALLOWED_ORIGINS: "*", ENVIRONMENT: "development" };

/** Contagens medidas em produção (03/ago/2026) — ver relatório da tarefa. */
const CONTAGENS_PROD = {
  total: 1022,
  semTelefone: 997,
  semAvaliacaoEmReabilitacao: 157,
  atendimentoSemEvolucao: 565,
  ativoSemProximaSessao: 165,
  candidatoAlta: 613,
  platoConfirmado: 29,
};

/** Normaliza espaço para comparar SQL sem depender de indentação. */
function normaliza(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("patientPendingFilters — invariante de critério único", () => {
  it("expõe as seis pendências, cada uma com rótulo e critério em texto", () => {
    expect(PATIENT_PENDING_FILTER_KEYS).toEqual([
      "semTelefone",
      "semAvaliacaoEmReabilitacao",
      "atendimentoSemEvolucao",
      "ativoSemProximaSessao",
      "candidatoAlta",
      "platoConfirmado",
    ]);

    for (const key of PATIENT_PENDING_FILTER_KEYS) {
      const filtro = PATIENT_PENDING_FILTERS[key];
      expect(filtro.label.length).toBeGreaterThan(0);
      // Sem critério visível o filtro vira opinião do sistema.
      expect(filtro.criterio.length).toBeGreaterThan(20);
    }
  });

  /**
   * O teste que justifica o módulo: se a contagem e a listagem pudessem divergir,
   * o painel inteiro perderia credibilidade. Aqui a igualdade é textual — o mesmo
   * predicado, com o mesmo placeholder de org, apenas com a expressão de id
   * trocada para o alias de cada contexto.
   */
  it("a contagem usa literalmente o mesmo predicado que a listagem", () => {
    const countsSql = normaliza(buildPatientPendingCountsSql("$1"));

    for (const key of PATIENT_PENDING_FILTER_KEYS) {
      const predicadoContagem = normaliza(
        PATIENT_PENDING_FILTERS[key].predicate("p.id", "$1"),
      );
      expect(countsSql).toContain(predicadoContagem);

      const predicadoLista = normaliza(patientPendingFilterClause(key, "directory.id", "$1"));
      expect(predicadoLista).toBe(predicadoContagem.replace("p.id IN (", "directory.id IN ("));
    }
  });

  it("nenhum predicado consome parâmetro posicional além do org", () => {
    for (const key of PATIENT_PENDING_FILTER_KEYS) {
      const sql = PATIENT_PENDING_FILTERS[key].predicate("p.id", "$1");
      const placeholders = new Set(sql.match(/\$\d+/g) ?? []);
      // Renumerar parâmetros ao injetar o filtro quebraria todos os outros
      // filtros da listagem, que são posicionais.
      expect([...placeholders]).toEqual(["$1"]);
    }
  });

  it("a base da contagem é a mesma da listagem: org + não arquivado", () => {
    const sql = normaliza(buildPatientPendingCountsSql("$1"));
    expect(sql).toContain("FROM patients p WHERE p.organization_id = $1::uuid");
    expect(sql).toContain("COALESCE(p.archived, FALSE) = FALSE");
  });

  it("reconhece só as chaves conhecidas", () => {
    expect(isPatientPendingFilterKey("candidatoAlta")).toBe(true);
    expect(isPatientPendingFilterKey("semTelefone")).toBe(true);
    expect(isPatientPendingFilterKey("inventado")).toBe(false);
    expect(isPatientPendingFilterKey(null)).toBe(false);
  });
});

describe("GET /api/patients/pending-counts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devolve as seis pendências com contagem, rótulo e critério", async () => {
    mockQuery.mockResolvedValue({ rows: [CONTAGENS_PROD] });

    const app = await buildApp();
    const res = await app.fetch(req("/api/patients/pending-counts"), ENV as any);
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(6);
    expect(body.meta.total).toBe(1022);

    const porChave = Object.fromEntries(body.data.map((d: any) => [d.key, d]));
    expect(porChave.semTelefone.count).toBe(997);
    expect(porChave.candidatoAlta.count).toBe(613);
    expect(porChave.platoConfirmado.criterio).toContain("MCID");
  });

  it("contagem zero vem como zero, nunca omitida da resposta", async () => {
    mockQuery.mockResolvedValue({ rows: [{ total: 10 }] });

    const app = await buildApp();
    const res = await app.fetch(req("/api/patients/pending-counts"), ENV as any);
    const body = (await res.json()) as any;

    expect(body.data).toHaveLength(6);
    for (const item of body.data) {
      expect(item.count).toBe(0);
    }
  });

  it("passa o organization_id como parâmetro, nunca interpolado", async () => {
    mockQuery.mockResolvedValue({ rows: [CONTAGENS_PROD] });

    const app = await buildApp();
    await app.fetch(req("/api/patients/pending-counts"), ENV as any);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(params).toEqual([ORG]);
    expect(sql).not.toContain(ORG);
  });
});

describe("GET /api/patients?pending=", () => {
  beforeEach(() => vi.clearAllMocks());

  it("injeta o predicado da pendência no WHERE da listagem", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const app = await buildApp();
    await app.fetch(req("/api/patients?pending=semTelefone"), ENV as any);

    const sqls = mockQuery.mock.calls.map(([sql]) => normaliza(String(sql)));
    const esperado = normaliza(
      patientPendingFilterClause("semTelefone", "directory.id", "$1"),
    );
    expect(sqls.some((s) => s.includes(esperado))).toBe(true);
  });

  it("chave desconhecida é ignorada em vez de derrubar a listagem", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const app = await buildApp();
    const res = await app.fetch(req("/api/patients?pending=xis"), ENV as any);

    expect(res.status).toBe(200);
    const sqls = mockQuery.mock.calls.map(([sql]) => normaliza(String(sql)));
    for (const key of PATIENT_PENDING_FILTER_KEYS) {
      const predicado = normaliza(patientPendingFilterClause(key, "directory.id", "$1"));
      expect(sqls.some((s) => s.includes(predicado))).toBe(false);
    }
  });

  it("o filtro entra também no summary, que segue o mesmo recorte da lista", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const app = await buildApp();
    await app.fetch(req("/api/patients?pending=platoConfirmado"), ENV as any);

    const esperado = normaliza(
      patientPendingFilterClause("platoConfirmado", "directory.id", "$1"),
    );
    const comFiltro = mockQuery.mock.calls
      .map(([sql]) => normaliza(String(sql)))
      .filter((s) => s.includes(esperado));

    // data + summary + total: os três recortes precisam concordar.
    expect(comFiltro.length).toBe(3);
  });

  /**
   * "Sem evolução" aparece em duas telas: filtro da lista de pacientes e badge da
   * agenda. São o mesmo conceito, e divergir faz a lista dizer um número e a
   * agenda outro — foi o que aconteceu (565 contra 513, 52 pacientes de
   * diferença, porque só o filtro exigia vínculo por `appointment_id` e a base
   * importada não tem esse vínculo).
   */
  it("'sem evolução' usa o mesmo critério do badge da agenda", () => {
    const sql = normaliza(
      patientPendingFilterClause("atendimentoSemEvolucao", "p.id", "$1"),
    );

    // Casa a sessão pelo vínculo direto OU por paciente+data: sem o segundo
    // caminho, todo atendimento importado conta como pendente.
    expect(sql).toContain("s.appointment_id = a.id");
    expect(sql).toContain("s.patient_id = a.patient_id");
    expect(sql).toContain("s.date::date = a.date");

    // Existir a linha em `sessions` não é ter registro clínico.
    expect(sql).toContain("btrim(s.observacao)");
  });
});
