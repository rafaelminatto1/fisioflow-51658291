import { describe, it, expect, vi } from "vitest";
import {
  isBookingIntent,
  parseBookListId,
  createConfirmedAppointmentFromFlow,
  detectPeriodFromText,
  resolveTargetDateFromText,
  extractSpecificTimeFromText,
} from "../flowsBookingCompletion";

vi.mock("../whatsapp-identity", () => ({ linkContactToPatient: vi.fn(async () => {}) }));

describe("extractSpecificTimeFromText", () => {
  it("extrai horários válidos entre 07h e 20h", () => {
    expect(extractSpecificTimeFromText("teria às 10h?")).toBe("10:00");
    expect(extractSpecificTimeFromText("tem às 14:00?")).toBe("14:00");
    expect(extractSpecificTimeFromText("pode ser 9h30?")).toBe("09:30");
    expect(extractSpecificTimeFromText("olá amanhã no período da tarde teria horário?")).toBeNull();
  });
});

describe("resolveTargetDateFromText", () => {
  it("resolve corretamente o próximo sábado a partir de uma quinta-feira (23/07/2026)", () => {
    const ThursdayMs = Date.parse("2026-07-23T12:00:00Z");
    const { isoDate, isSaturday } = resolveTargetDateFromText("olá quais horários disponíveis para sábado", ThursdayMs);
    expect(isoDate).toBe("2026-07-25");
    expect(isSaturday).toBe(true);
  });

  it("resolve amanhã como padrão quando não especifica o dia", () => {
    const ThursdayMs = Date.parse("2026-07-23T12:00:00Z");
    const { isoDate, isSaturday } = resolveTargetDateFromText("quais horários disponíveis?", ThursdayMs);
    expect(isoDate).toBe("2026-07-24");
    expect(isSaturday).toBe(false);
  });
});

describe("detectPeriodFromText", () => {
  it("detecta tarde_noite quando o usuário menciona tarde ou noite", () => {
    expect(detectPeriodFromText("olá amanha no periodo da tarde teria horario?")).toBe("tarde_noite");
    expect(detectPeriodFromText("teria no periodo da tarde?")).toBe("tarde_noite");
    expect(detectPeriodFromText("tem horário à noite?")).toBe("tarde_noite");
  });

  it("detecta manha quando o usuário menciona manhã ou cedo", () => {
    expect(detectPeriodFromText("quais horários de manhã?")).toBe("manha");
    expect(detectPeriodFromText("posso ir de manhã cedo?")).toBe("manha");
  });

  it("retorna undefined se nenhum período for especificado", () => {
    expect(detectPeriodFromText("gostaria de agendar para amanhã")).toBeUndefined();
  });
});

describe("isBookingIntent", () => {
  it("detecta pedidos claros de agendar e consultas de disponibilidade", () => {
    expect(isBookingIntent("quero agendar")).toBe(true);
    expect(isBookingIntent("gostaria de marcar uma avaliação")).toBe(true);
    expect(isBookingIntent("agendar sessão de fisio")).toBe(true);
    expect(isBookingIntent("Agendamento")).toBe(true);
    expect(isBookingIntent("olá amanha no periodo da tarde teria horario?")).toBe(true);
    expect(isBookingIntent("teria no periodo da tarde?")).toBe(true);
    expect(isBookingIntent("Quais horários temos disponível para amanhã de manhã?")).toBe(true);
    expect(isBookingIntent("tem vaga amanhã?")).toBe(true);
    expect(isBookingIntent("sábado tem horário?")).toBe(true);
    expect(isBookingIntent("teria às 10h?")).toBe(true);
  });
  it("ignora mensagens sem intenção", () => {
    expect(isBookingIntent("quanto custa a sessão?")).toBe(false);
    expect(isBookingIntent("bom dia")).toBe(false);
    expect(isBookingIntent("")).toBe(false);
  });
});

describe("parseBookListId", () => {
  it("parseia o id da lista de fallback e dos botões rápidos (Modelo B)", () => {
    expect(parseBookListId("book|session|2026-08-03|08:00")).toEqual({
      type: "session",
      date: "2026-08-03",
      slot: "08:00",
    });
    expect(parseBookListId("book_slot|session|2026-08-03|14:00")).toEqual({
      type: "session",
      date: "2026-08-03",
      slot: "14:00",
    });
    expect(parseBookListId("outra_coisa")).toBeNull();
    expect(parseBookListId(undefined)).toBeNull();
  });
});

describe("createConfirmedAppointmentFromFlow", () => {
  function makePool(overrides: Record<string, (params: any[]) => any> = {}) {
    const calls: any[] = [];
    const pool = {
      query: vi.fn(async (sql: string, params: any[] = []) => {
        calls.push({ sql, params });
        for (const [re, fn] of Object.entries(overrides)) {
          if (new RegExp(re).test(sql)) return fn(params);
        }
        if (/settings->'crm_whatsapp'->>'evaluation_professional_id'/.test(sql)) return { rows: [{ pid: null }] };
        if (/EXISTS \(SELECT 1 FROM unnest\(roles\)/.test(sql) && /SELECT id FROM profiles/.test(sql))
          return { rows: [{ id: "fisio-1" }] };
        if (/SELECT id, full_name FROM profiles/.test(sql)) return { rows: [{ id: "fisio-1", full_name: "Dra. Ana" }] };
        if (/FROM patients WHERE organization_id/.test(sql)) return { rows: [] };
        if (/INSERT INTO patients/.test(sql)) return { rows: [{ id: "patient-1" }] };
        if (/INSERT INTO appointments/.test(sql)) return { rows: [{ id: "appt-1" }] };
        return { rows: [] };
      }),
    } as any;
    return { pool, calls };
  }

  it("cria agendamento de SESSÃO confirmado (atribui fisio livre, cria paciente)", async () => {
    const { pool, calls } = makePool();
    const res = await createConfirmedAppointmentFromFlow(
      pool,
      "org-1",
      { id: "contact-1", display_name: "João", patient_id: null },
      "5511999999999",
      { type: "session", date: "1785715200000", slot: "08:30" }, // epoch -> 2026-08-03
    );
    expect(res).not.toBeNull();
    expect(res!.appointmentId).toBe("appt-1");
    expect(res!.typeLabel).toBe("Sessão");
    expect(res!.professionalName).toBe("Dra. Ana");
    expect(res!.confirmationText).toContain("Agendamento confirmado");
    expect(res!.confirmationText).toContain("03/08/2026 às 08:30");

    const insertAppt = calls.find((c) => /INSERT INTO appointments/.test(c.sql));
    expect(insertAppt.params).toContain("2026-08-03");
    expect(insertAppt.params).toContain("08:30:00");
    expect(insertAppt.params).toContain("session");
    const insertPatient = calls.find((c) => /INSERT INTO patients/.test(c.sql));
    expect(insertPatient.params).toContain("5511999999999");
  });

  it("AVALIAÇÃO usa o profissional designado", async () => {
    const { pool, calls } = makePool({
      "evaluation_professional_id": () => ({ rows: [{ pid: "eval-pro" }] }),
      "SELECT 1 FROM appointments WHERE therapist_id": () => ({ rows: [] }), // livre
      "SELECT id, full_name FROM profiles WHERE id": () => ({ rows: [{ id: "eval-pro", full_name: "Dr. Avaliador" }] }),
    });
    const res = await createConfirmedAppointmentFromFlow(
      pool,
      "org-1",
      { id: "contact-1", display_name: "Maria", patient_id: "patient-9" },
      "5511888888888",
      { type: "evaluation", date: "2026-08-03", slot: "09:00" },
    );
    expect(res).not.toBeNull();
    expect(res!.professionalName).toBe("Dr. Avaliador");
    expect(res!.typeLabel).toBe("Avaliação");
    const insertAppt = calls.find((c) => /INSERT INTO appointments/.test(c.sql));
    expect(insertAppt.params).toContain("eval-pro");
    expect(insertAppt.params).toContain("patient-9"); // reusa patient_id do contato
  });

  it("retorna null se o horário não tem profissional livre", async () => {
    const { pool } = makePool({
      "SELECT id, full_name FROM profiles\\s*\\n\\s*WHERE id = ANY": () => ({ rows: [] }), // nenhum livre
    });
    const res = await createConfirmedAppointmentFromFlow(
      pool,
      "org-1",
      { id: "c", display_name: "X", patient_id: null },
      "5511",
      { type: "session", date: "2026-08-03", slot: "08:30" },
    );
    expect(res).toBeNull();
  });
});
