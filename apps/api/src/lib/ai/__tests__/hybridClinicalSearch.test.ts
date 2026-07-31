import { describe, it, expect, vi, beforeEach } from "vitest";
import { hybridClinicalSearch } from "../hybridClinicalSearch";
import { CLINICAL_EMBEDDING_DIM } from "../../workersAi";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";
const PAC = "22222222-2222-2222-2222-222222222222";
const OUTRO = "33333333-3333-3333-3333-333333333333";

// `null` e não `undefined`: passar undefined acionaria o parâmetro default do
// JS e o mock nunca ficaria vazio — o teste passaria sem testar nada.
function env(vector: number[] | null = Array(CLINICAL_EMBEDDING_DIM).fill(0.1)) {
  return { AI: { run: vi.fn().mockResolvedValue({ data: vector ? [vector] : [] }) } } as any;
}

beforeEach(() => sqlSpy.mockReset().mockResolvedValue({ rows: [] }));

describe("isolamento entre pacientes", () => {
  it("aplica o filtro de paciente dentro da query, não no pós-processamento", async () => {
    // Defesa central contra vazamento entre prontuários: se o filtro ficasse
    // fora da query, um erro de map() exporia evolução de outro paciente.
    await hybridClinicalSearch(env(), { organizationId: ORG, query: "dor lombar", patientId: PAC });
    const params = sqlSpy.mock.calls[0].slice(1);
    expect(params).toContain(PAC);
  });

  it("sempre restringe pela organização", async () => {
    await hybridClinicalSearch(env(), { organizationId: ORG, query: "dor lombar" });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(ORG);
  });

  it("não devolve evolução fora do escopo pedido", async () => {
    // O JOIN com `escopo` garante isso no SQL; aqui travamos o contrato de que
    // o resultado carrega o patientId para a UI poder verificar.
    sqlSpy.mockResolvedValue({
      rows: [{ evolutionId: "e1", patientId: PAC, patientName: "A", sessionDate: "2026-01-01",
               excerpt: "x", lexicalRank: 1, vectorRank: 1, rrfScore: 0.03 }],
    });
    const hits = await hybridClinicalSearch(env(), {
      organizationId: ORG, query: "dor lombar", patientId: PAC,
    });
    expect(hits.every((h) => h.patientId === PAC)).toBe(true);
    expect(hits.some((h) => h.patientId === OUTRO)).toBe(false);
  });
});

describe("consulta", () => {
  it("recusa consulta curta demais sem chamar a IA nem o banco", async () => {
    const e = env();
    expect(await hybridClinicalSearch(e, { organizationId: ORG, query: "ab" })).toEqual([]);
    expect(e.AI.run).not.toHaveBeenCalled();
    expect(sqlSpy).not.toHaveBeenCalled();
  });

  it("trata consulta vazia", async () => {
    expect(await hybridClinicalSearch(env(), { organizationId: ORG, query: "   " })).toEqual([]);
  });

  it("falha alto se a IA não devolver vetor", async () => {
    await expect(
      hybridClinicalSearch(env(null), { organizationId: ORG, query: "dor lombar" }),
    ).rejects.toThrow(/não devolveu vetor/);
  });

  it("limita o retorno", async () => {
    await hybridClinicalSearch(env(), { organizationId: ORG, query: "dor lombar", limit: 9999 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(50);
  });
});

describe("fusão de rankings", () => {
  it("preserva a posição em cada lista, inclusive quando o item só aparece em uma", async () => {
    // É esse par que explica o resultado ao usuário: um item achado só pelo
    // léxico (jargão local) ou só pelo vetor (paráfrase) é informação útil.
    sqlSpy.mockResolvedValue({
      rows: [
        { evolutionId: "e1", patientId: PAC, patientName: "A", sessionDate: "2026-01-01",
          excerpt: "TFS", lexicalRank: 1, vectorRank: null, rrfScore: 0.016 },
        { evolutionId: "e2", patientId: PAC, patientName: "A", sessionDate: "2026-01-02",
          excerpt: "alívio lombar", lexicalRank: null, vectorRank: 2, rrfScore: 0.016 },
      ],
    });
    const hits = await hybridClinicalSearch(env(), { organizationId: ORG, query: "dor lombar" });
    expect(hits[0]).toMatchObject({ lexicalRank: 1, vectorRank: null });
    expect(hits[1]).toMatchObject({ lexicalRank: null, vectorRank: 2 });
  });
});
