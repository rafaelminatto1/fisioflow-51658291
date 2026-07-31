import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DISCHARGE_REASONS,
  DISCHARGE_REASON_LABELS,
  isDischargeReason,
  recordDischarge,
  suggestDischargeContent,
  outcomeBreakdown,
} from "../dischargeService";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";
const PAC = "22222222-2222-2222-2222-222222222222";

beforeEach(() => sqlSpy.mockReset().mockResolvedValue({ rows: [{}] }));

describe("taxonomia", () => {
  it("não inclui 'abandono' — é sempre inferido, nunca declarado", () => {
    // Registrar abandono como evento daria a ele a confiabilidade de um desfecho
    // observado, o que seria falso: ninguém declara que abandonou.
    expect(DISCHARGE_REASONS).not.toContain("abandono" as never);
  });

  it("cobre os desfechos que a literatura e o corpus mostram", () => {
    expect(DISCHARGE_REASONS).toEqual(
      expect.arrayContaining([
        "alta_objetivo_atingido",
        "alta_maximo_funcional",
        "alta_transicao_autonomia",
        "alta_medica",
        "encaminhado",
        "interrompido_paciente",
      ]),
    );
  });

  it("tem rótulo PT-BR para todo motivo", () => {
    for (const r of DISCHARGE_REASONS) {
      expect(DISCHARGE_REASON_LABELS[r]).toBeTruthy();
    }
  });

  it("valida motivo desconhecido", () => {
    expect(isDischargeReason("alta_objetivo_atingido")).toBe(true);
    expect(isDischargeReason("abandono")).toBe(false);
    expect(isDischargeReason(null)).toBe(false);
  });
});

describe("suggestDischargeContent", () => {
  it("usa a PRIMEIRA linha de base e a primeira/última EVA", async () => {
    sqlSpy.mockResolvedValue({
      rows: [{
        baseline_summary: "LB: Abd GUD - 90°",
        pain_initial: 8, pain_final: 2,
        sessions_count: 14,
        first_session_at: "2026-01-10", last_session_at: "2026-04-02",
      }],
    });
    const s = await suggestDischargeContent({} as any, { organizationId: ORG, patientId: PAC });
    expect(s).toMatchObject({ painInitial: 8, painFinal: 2, sessionsCount: 14 });
    expect(s.baselineSummary).toContain("Abd GUD");
  });

  it("devolve nulos quando não há linha de base nem EVA — sem inventar", async () => {
    sqlSpy.mockResolvedValue({ rows: [{ sessions_count: 5 }] });
    const s = await suggestDischargeContent({} as any, { organizationId: ORG, patientId: PAC });
    expect(s.baselineSummary).toBeNull();
    expect(s.painInitial).toBeNull();
    expect(s.sessionsCount).toBe(5);
  });
});

describe("recordDischarge", () => {
  it("grava com origem 'profissional' por padrão", async () => {
    await recordDischarge({} as any, {
      organizationId: ORG, patientId: PAC, reason: "alta_objetivo_atingido",
    });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain("profissional");
  });

  it("aceita alta parcial com escopo — tratamento continua", async () => {
    await recordDischarge({} as any, {
      organizationId: ORG, patientId: PAC, reason: "alta_objetivo_atingido", scope: "ombro D",
    });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain("ombro D");
  });
});

describe("outcomeBreakdown", () => {
  it("separa abandono inferido de desfecho declarado", async () => {
    sqlSpy.mockResolvedValue({
      rows: [{
        total: 890, com_desfecho_declarado: 12, alta_a_confirmar: 22,
        em_tratamento: 25, abandono_inferido: 700, sem_retorno_recente: 131,
      }],
    });
    const r = await outcomeBreakdown({} as any, { organizationId: ORG });
    expect(r.abandonoInferido).toBe(700);
    expect(r.comDesfechoDeclarado).toBe(12);
    // Alta vinda do texto não entra em "declarado" enquanto não confirmada.
    expect(r.altaAConfirmar).toBe(22);
  });

  it("usa janela de inatividade configurável", async () => {
    await outcomeBreakdown({} as any, { organizationId: ORG, inactiveDays: 120 });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(120);
  });
});
