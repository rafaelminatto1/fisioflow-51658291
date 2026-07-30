import { describe, it, expect, vi } from "vitest";

// `cloudflare:workers` só existe no runtime workerd; este teste roda no
// projeto "node" do vitest, então mockamos o módulo para poder importar
// `shouldStillSend` sem subir o pool de workers.
vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {},
}));

// Testa a lógica pura de recheck extraída: shouldStillSend(row)
import { shouldStillSend, buildReminderQueueMessage } from "./appointmentReminder";

describe("shouldStillSend", () => {
  it("true p/ agendamento ativo no mesmo horário", () => {
    expect(
      shouldStillSend(
        { status: "agendado", date_str: "2026-08-05", time_str: "10:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(true);
  });
  it("false p/ cancelado", () => {
    expect(
      shouldStillSend(
        { status: "cancelado", date_str: "2026-08-05", time_str: "10:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(false);
  });
  it("false se remarcado p/ outro horário", () => {
    expect(
      shouldStillSend(
        { status: "agendado", date_str: "2026-08-06", time_str: "11:00" },
        { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any,
      ),
    ).toBe(false);
  });
  it("false se agendamento não existe (row null)", () => {
    expect(
      shouldStillSend(null, { apptDateStr: "2026-08-05", apptTimeStr: "10:00" } as any),
    ).toBe(false);
  });
});

describe("buildReminderQueueMessage", () => {
  const base = {
    appointmentId: "appt-1",
    organizationId: "org-1",
    patientId: "pat-1",
    patientPhone: "+5511999998888",
    patientName: "Maria Silva Souza",
    therapistName: "Dr. João",
    apptDateStr: "2026-08-05",
    apptTimeStr: "10:00",
    sendAtMs: 0,
    templateName: "lembrete_consulta_botoes",
  };

  it("monta SEND_WHATSAPP com paridade do poll (texto-livre + template + CRM)", () => {
    const msg = buildReminderQueueMessage(base);
    expect(msg.type).toBe("SEND_WHATSAPP");
    expect(msg.payload).toMatchObject({
      to: "+5511999998888",
      languageCode: "pt_BR",
      templateName: "lembrete_consulta_botoes",
      organizationId: "org-1",
      patientId: "pat-1",
      appointmentId: "appt-1",
      messageText: "Lembrete: sua sessão é às 10:00 com Dr. João.",
      preferTemplate: true,
    });
    // primeiro nome apenas + horário + terapeuta (paridade cron.ts)
    expect(msg.payload.bodyParameters).toEqual([
      { type: "text", text: "Maria" },
      { type: "text", text: "10:00" },
      { type: "text", text: "Dr. João" },
    ]);
  });

  it("usa fallbacks 'Fisioterapeuta' e 'paciente' quando nomes faltam", () => {
    const msg = buildReminderQueueMessage({ ...base, patientName: "", therapistName: "" });
    expect(msg.payload.messageText).toBe("Lembrete: sua sessão é às 10:00 com Fisioterapeuta.");
    expect(msg.payload.bodyParameters[0]).toEqual({ type: "text", text: "paciente" });
    expect(msg.payload.bodyParameters[2]).toEqual({ type: "text", text: "Fisioterapeuta" });
  });
});
