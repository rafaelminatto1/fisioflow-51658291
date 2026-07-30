import { describe, expect, it } from "vitest";
import {
  deriveQueueIdempotencyKey,
  summarizeQueueTask,
  buildWhatsAppRequestBodies,
  type QueueTask,
} from "../queue";

const waPayload = {
  to: "+55 11 93433-5858",
  templateName: "lembrete_consulta_botoes",
  languageCode: "pt_BR",
  bodyParameters: [{ type: "text" as const, text: "Maria" }],
  organizationId: "org-1",
  patientId: "pat-1",
  messageText: "Lembrete: sua sessão é às 10:00.",
  appointmentId: "appt-1",
};

describe("buildWhatsAppRequestBodies", () => {
  it("preferTemplate → template primeiro, texto como fallback", () => {
    const reqs = buildWhatsAppRequestBodies({ ...waPayload, preferTemplate: true });
    expect(reqs.map((r) => r.kind)).toEqual(["template", "text"]);
    expect((reqs[0].body as any).type).toBe("template");
    expect((reqs[0].body as any).to).toBe("5511934335858"); // sanitizado
    expect((reqs[0].body as any).template.name).toBe("lembrete_consulta_botoes");
  });
  it("default (sem flag) → texto primeiro, template como fallback", () => {
    const reqs = buildWhatsAppRequestBodies(waPayload);
    expect(reqs.map((r) => r.kind)).toEqual(["text", "template"]);
    expect((reqs[0].body as any).type).toBe("text");
  });
});

describe("queue operations helpers", () => {
  it("derives stable idempotency keys from business context", () => {
    const task: QueueTask = {
      type: "SEND_WHATSAPP",
      payload: {
        to: "+5511999999999",
        templateName: "lembrete_sessao",
        languageCode: "pt_BR",
        bodyParameters: [],
        organizationId: "org-1",
        patientId: "patient-1",
        messageText: "hidden in summaries",
        appointmentId: "appointment-1",
      },
    };

    expect(deriveQueueIdempotencyKey(task)).toBe("queue:SEND_WHATSAPP:org-1:appointment-1");
  });

  it("summarizes replayable tasks without exposing message text", () => {
    const task: QueueTask = {
      type: "SEND_WHATSAPP",
      payload: {
        to: "+5511999999999",
        templateName: "lembrete_sessao",
        languageCode: "pt_BR",
        bodyParameters: [{ type: "text", text: "09:00" }],
        organizationId: "org-1",
        patientId: "patient-1",
        messageText: "Paciente com dados sensiveis",
        appointmentId: "appointment-1",
      },
    };

    expect(summarizeQueueTask(task)).toEqual({
      taskType: "SEND_WHATSAPP",
      organizationId: "org-1",
      entityRefs: {
        patientId: "patient-1",
        appointmentId: "appointment-1",
      },
      replayable: true,
      idempotencyKey: "queue:SEND_WHATSAPP:org-1:appointment-1",
    });
  });

  it("marks placeholder maintenance tasks as not replayable", () => {
    const task: QueueTask = { type: "CLEANUP_LOGS", payload: { organizationId: "org-1" } };

    expect(summarizeQueueTask(task).replayable).toBe(false);
  });
});
