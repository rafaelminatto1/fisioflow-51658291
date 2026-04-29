import { describe, expect, it } from "vitest";
import { deriveQueueIdempotencyKey, summarizeQueueTask, type QueueTask } from "../queue";

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

