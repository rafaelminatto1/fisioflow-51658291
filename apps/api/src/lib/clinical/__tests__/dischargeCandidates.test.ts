import { describe, it, expect, vi, beforeEach } from "vitest";
import { listDischargeCandidates, CANDIDATE_SIGNALS } from "../dischargeCandidates";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";

function row(over: Record<string, unknown> = {}) {
  return {
    patientId: "22222222-2222-2222-2222-222222222222",
    patientName: "Paciente Teste",
    lastSessionAt: "2026-01-10",
    daysInactive: 200,
    sessionsCount: 12,
    score: 0,
    temAltaTexto: false,
    temAcademia: false,
    temSemDor: false,
    temOrientacao: false,
    lastEvolutionExcerpt: "Lib mio manual em TFS",
    hasPhone: false,
    total: 1,
    semTelefone: 1,
    ...over,
  };
}

beforeEach(() => sqlSpy.mockReset().mockResolvedValue({ rows: [] }));

describe("pesos dos sinais", () => {
  it("alta mencionada no prontuário é o sinal mais forte", () => {
    const outros = Object.entries(CANDIDATE_SIGNALS)
      .filter(([k]) => k !== "altaNoTexto")
      .map(([, v]) => v);
    for (const v of outros) expect(CANDIDATE_SIGNALS.altaNoTexto).toBeGreaterThan(v);
  });
});

describe("listDischargeCandidates", () => {
  it("isola por organização", async () => {
    await listDischargeCandidates({} as any, { organizationId: ORG });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(ORG);
  });

  it("nunca aceita janela de inatividade abaixo de 30 dias", async () => {
    // Abaixo disso pegaria paciente em tratamento ativo com intervalo maior
    // (o intervalo médio da clínica é 5,8 dias, mas há casos quinzenais).
    await listDischargeCandidates({} as any, { organizationId: ORG, minInactiveDays: 5 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(30);
  });

  it("limita o retorno", async () => {
    await listDischargeCandidates({} as any, { organizationId: ORG, limit: 9999 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(200);
  });

  it("traduz os sinais em texto legível para a recepção", async () => {
    sqlSpy.mockResolvedValue({
      rows: [row({ temAltaTexto: true, temAcademia: true, sessionsCount: 14, score: 80 })],
    });
    const { candidates } = await listDischargeCandidates({} as any, { organizationId: ORG });
    expect(candidates[0].signals).toEqual(
      expect.arrayContaining([
        "alta mencionada no prontuário",
        "última evolução menciona academia",
        "tratamento longo (14 sessões)",
      ]),
    );
  });

  it("não inventa sinal quando não há evidência", async () => {
    sqlSpy.mockResolvedValue({ rows: [row({ sessionsCount: 3 })] });
    const { candidates } = await listDischargeCandidates({} as any, { organizationId: ORG });
    expect(candidates[0].signals).toEqual([]);
    expect(candidates[0].score).toBe(0);
  });

  it("reporta quantos candidatos não têm telefone", async () => {
    // 997 de 1.022 pacientes estão sem telefone: sem isso a fila é inexequível,
    // e esconder o número faria a recepção descobrir só ao tentar ligar.
    sqlSpy.mockResolvedValue({ rows: [row({ total: 612, semTelefone: 598 })] });
    const r = await listDischargeCandidates({} as any, { organizationId: ORG });
    expect(r.total).toBe(612);
    expect(r.semTelefone).toBe(598);
  });

  it("lista vazia não quebra os totais", async () => {
    const r = await listDischargeCandidates({} as any, { organizationId: ORG });
    expect(r).toMatchObject({ candidates: [], total: 0, semTelefone: 0 });
  });
});
