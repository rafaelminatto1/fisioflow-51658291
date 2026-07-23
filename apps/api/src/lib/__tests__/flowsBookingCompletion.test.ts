import { describe, it, expect, vi } from "vitest";
import {
  isBookingIntent,
  parseBookListId,
  createConfirmedAppointmentFromFlow,
} from "../flowsBookingCompletion";

vi.mock("../whatsapp-identity", () => ({ linkContactToPatient: vi.fn(async () => {}) }));

describe("isBookingIntent", () => {
  it("detecta pedidos claros de agendar", () => {
    expect(isBookingIntent("quero agendar")).toBe(true);
    expect(isBookingIntent("gostaria de marcar uma avaliação")).toBe(true);
    expect(isBookingIntent("agendar sessão de fisio")).toBe(true);
    expect(isBookingIntent("Agendamento")).toBe(true);
  });
  it("ignora mensagens sem intenção", () => {
    expect(isBookingIntent("quanto custa a sessão?")).toBe(false);
    expect(isBookingIntent("bom dia")).toBe(false);
    expect(isBookingIntent("")).toBe(false);
  });
});

describe("parseBookListId", () => {
  it("parseia o id da lista de fallback", () => {
    expect(parseBookListId("book|session|2026-08-03|08:30")).toEqual({
      type: "session",
      date: "2026-08-03",
      slot: "08:30",
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
