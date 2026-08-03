import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ATTENDED_STATUSES,
  MAX_RANGE_DAYS,
  PENDENCY_LABELS,
  PLATEAU_RECENT_DAYS,
  assertRange,
  listAppointmentPendencies,
} from "../appointmentPendencies";

const sqlSpy = vi.fn();
vi.mock("../../db", () => ({
  getRawSql: () => (...args: unknown[]) => sqlSpy(...args),
}));

const ORG = "11111111-1111-1111-1111-111111111111";

function row(over: Record<string, unknown> = {}) {
  return {
    appointmentId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    patientId: "22222222-2222-2222-2222-222222222222",
    semEvolucao: false,
    plato: false,
    plateauSessions: null,
    plateauLastDate: null,
    totalAppointments: 1,
    ...over,
  };
}

beforeEach(() => sqlSpy.mockReset().mockResolvedValue({ rows: [] }));

describe("critérios", () => {
  it("não conta falta nem cancelamento como atendimento realizado", () => {
    // Não existe evolução a escrever para quem não veio.
    expect([...ATTENDED_STATUSES]).toEqual(["atendido", "presenca_confirmada", "avaliacao"]);
  });

  it("limita o platô aos últimos 90 dias", () => {
    // Sem o corte o alerta sobe de 2,0% para 8,2% dos cards apontando
    // sequências encerradas há meses.
    expect(PLATEAU_RECENT_DAYS).toBe(90);
  });

  it("expõe o critério de cada badge para o tooltip", () => {
    expect(PENDENCY_LABELS.sem_evolucao.criterio).toMatch(/evolução/i);
    expect(PENDENCY_LABELS.plato.criterio).toMatch(/conduta/i);
  });
});

describe("assertRange", () => {
  it("rejeita data fora de YYYY-MM-DD", () => {
    expect(() => assertRange("01/08/2026", "2026-08-07")).toThrow(/YYYY-MM-DD/);
  });

  it("rejeita intervalo invertido", () => {
    expect(() => assertRange("2026-08-10", "2026-08-01")).toThrow(/posterior/);
  });

  it("rejeita janela maior que o mês — agenda não é varredura", () => {
    expect(() => assertRange("2026-01-01", "2026-06-01")).toThrow(/intervalo máximo/);
  });

  it("aceita o pior caso legítimo (visão de mês)", () => {
    expect(() => assertRange("2026-08-01", "2026-08-31")).not.toThrow();
    expect(MAX_RANGE_DAYS).toBe(62);
  });
});

describe("listAppointmentPendencies", () => {
  it("isola por organização", async () => {
    await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(sqlSpy.mock.calls[0].slice(1)).toContain(ORG);
  });

  it("usa uma única consulta para a janela inteira", async () => {
    await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(sqlSpy).toHaveBeenCalledTimes(1);
  });

  it("propaga o erro de intervalo antes de tocar o banco", async () => {
    await expect(
      listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-01-01", to: "2026-12-31" }),
    ).rejects.toThrow(/intervalo máximo/);
    expect(sqlSpy).not.toHaveBeenCalled();
  });

  it("omite agendamento sem pendência — mapa carrega só o que é acionável", async () => {
    sqlSpy.mockResolvedValue({ rows: [row(), row({ appointmentId: "b", semEvolucao: true })] });
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(Object.keys(rep.byAppointment)).toEqual(["b"]);
  });

  it("indexa por agendamento, não por paciente", async () => {
    sqlSpy.mockResolvedValue({
      rows: [
        row({ appointmentId: "a1", semEvolucao: true }),
        row({ appointmentId: "a2", semEvolucao: true }),
      ],
    });
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(Object.keys(rep.byAppointment).sort()).toEqual(["a1", "a2"]);
  });

  it("acumula os dois sinais no mesmo card", async () => {
    sqlSpy.mockResolvedValue({
      rows: [row({ semEvolucao: true, plato: true, plateauSessions: 5, plateauLastDate: "2026-07-20" })],
    });
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    const item = rep.byAppointment["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"];
    expect(item.flags).toEqual(["sem_evolucao", "plato"]);
    expect(item.plateauSessions).toBe(5);
    expect(item.plateauLastDate).toBe("2026-07-20");
  });

  it("normaliza data de platô vinda como Date", async () => {
    sqlSpy.mockResolvedValue({
      rows: [row({ plato: true, plateauLastDate: new Date("2026-07-20T00:00:00Z") })],
    });
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(rep.byAppointment["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"].plateauLastDate).toBe("2026-07-20");
  });

  it("devolve o denominador da janela, não só os pendentes", async () => {
    // Badge sem denominador não é auditável: 12 de 109 é informação, 12 não é.
    sqlSpy.mockResolvedValue({
      rows: [row({ semEvolucao: true, totalAppointments: 109 }), row({ appointmentId: "b", totalAppointments: 109 })],
    });
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(rep.totalAppointments).toBe(109);
    expect(rep.counts).toEqual({ sem_evolucao: 1, plato: 0 });
  });

  it("não quebra quando a janela vem vazia", async () => {
    const rep = await listAppointmentPendencies({} as any, { organizationId: ORG, from: "2026-08-01", to: "2026-08-07" });
    expect(rep).toEqual({ byAppointment: {}, totalAppointments: 0, counts: { sem_evolucao: 0, plato: 0 } });
  });
});
