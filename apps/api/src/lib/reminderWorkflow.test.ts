import { describe, it, expect, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ WorkflowEntrypoint: class {} }));

import {
  buildReminderParams,
  reminderWorkflowId,
  scheduleReminder,
  cancelReminder,
  rescheduleReminder,
} from "./reminderWorkflow";

const appt = {
  id: "appt-1",
  organizationId: "org-1",
  patientId: "pat-1",
  patientPhone: "+5511999",
  patientName: "Maria Silva",
  therapistName: "Rafael",
  dateStr: "2026-08-05",
  timeStr: "10:00",
};

describe("buildReminderParams", () => {
  it("gera params com sendAtMs e template correto (config default)", () => {
    const p = buildReminderParams(appt, null);
    expect(p).not.toBeNull();
    expect(p!.appointmentId).toBe("appt-1");
    expect(p!.patientId).toBe("pat-1");
    expect(p!.templateName).toBe("lembrete_consulta_botoes");
    expect(typeof p!.sendAtMs).toBe("number");
    // sendAt deve ser antes do início da consulta
    const apptMs = Date.parse("2026-08-05T10:00:00-03:00");
    expect(p!.sendAtMs).toBeLessThan(apptMs);
  });
  it("retorna null sem telefone", () => {
    expect(buildReminderParams({ ...appt, patientPhone: null }, null)).toBeNull();
  });
  it("retorna null se reminders.enabled=false", () => {
    expect(buildReminderParams(appt, { enabled: false })).toBeNull();
  });
  it("usa fallbacks quando nome/terapeuta faltam", () => {
    const p = buildReminderParams({ ...appt, patientName: null, therapistName: null }, null);
    expect(p!.patientName).toBe("paciente");
    expect(p!.therapistName).toBe("Fisioterapeuta");
  });
});

describe("reminderWorkflowId", () => {
  it("é determinístico", () => {
    expect(reminderWorkflowId("appt-1")).toBe("reminder-appt-1");
  });
});

describe("scheduleReminder/cancelReminder/rescheduleReminder (best-effort)", () => {
  it("chama create com id determinístico e params", async () => {
    const create = vi.fn().mockResolvedValue({ id: "reminder-appt-1" });
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { create } };
    await scheduleReminder(env, appt, null);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "reminder-appt-1",
        params: expect.objectContaining({ appointmentId: "appt-1" }),
      }),
    );
  });
  it("não agenda quando params é null (sem telefone)", async () => {
    const create = vi.fn();
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { create } };
    await scheduleReminder(env, { ...appt, patientPhone: null }, null);
    expect(create).not.toHaveBeenCalled();
  });
  it("não lança se binding ausente", async () => {
    await expect(scheduleReminder({} as any, appt, null)).resolves.toBeUndefined();
  });
  it("não lança se create falhar", async () => {
    const env: any = {
      WORKFLOW_APPOINTMENT_REMINDER: { create: vi.fn().mockRejectedValue(new Error("boom")) },
    };
    await expect(scheduleReminder(env, appt, null)).resolves.toBeUndefined();
  });
  it("cancelReminder chama get().terminate()", async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({ terminate });
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { get } };
    await cancelReminder(env, "appt-1");
    expect(get).toHaveBeenCalledWith("reminder-appt-1");
    expect(terminate).toHaveBeenCalled();
  });
  it("cancelReminder ignora workflow inexistente", async () => {
    const env: any = {
      WORKFLOW_APPOINTMENT_REMINDER: { get: vi.fn().mockRejectedValue(new Error("not found")) },
    };
    await expect(cancelReminder(env, "appt-1")).resolves.toBeUndefined();
  });
  it("rescheduleReminder = cancel + schedule", async () => {
    const terminate = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({ terminate });
    const create = vi.fn().mockResolvedValue({ id: "reminder-appt-1" });
    const env: any = { WORKFLOW_APPOINTMENT_REMINDER: { get, create } };
    await rescheduleReminder(env, appt, null);
    expect(terminate).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: "reminder-appt-1" }));
  });
});
