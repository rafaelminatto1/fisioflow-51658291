import { describe, expect, it, vi } from "vitest";
import { summarizeQueueTask, type QueueTask } from "../queue";

describe("TRIGGER_WORKFLOW queue task handling", () => {
  it("classifies TRIGGER_WORKFLOW tasks as replayable", () => {
    const task: QueueTask = {
      type: "TRIGGER_WORKFLOW",
      payload: {
        workflowType: "appointment-reminder",
        params: { appointmentId: "apt-1" },
        organizationId: "org-1",
      },
    };

    expect(summarizeQueueTask(task).replayable).toBe(true);
  });

  it("derives idempotency key from workflowType and organizationId", () => {
    const task: QueueTask = {
      type: "TRIGGER_WORKFLOW",
      payload: {
        workflowType: "nfse",
        params: { nfseId: "nfse-123" },
        organizationId: "org-42",
      },
    };

    expect(summarizeQueueTask(task).idempotencyKey).toBe("queue:TRIGGER_WORKFLOW:org-42:nfse");
  });

  it("includes workflowType in entity refs", () => {
    const task: QueueTask = {
      type: "TRIGGER_WORKFLOW",
      payload: {
        workflowType: "patient-onboarding",
        params: { patientId: "p-1" },
        organizationId: "org-1",
      },
    };

    const summary = summarizeQueueTask(task);
    expect(summary.entityRefs.workflowType).toBe("patient-onboarding");
    expect(summary.organizationId).toBe("org-1");
  });

  it("handles all known workflow types in idempotency key", () => {
    const workflowTypes = [
      "appointment-reminder",
      "patient-onboarding",
      "nfse",
      "hep-compliance",
      "discharge",
      "reengagement",
    ] as const;

    for (const workflowType of workflowTypes) {
      const task: QueueTask = {
        type: "TRIGGER_WORKFLOW",
        payload: { workflowType, params: {}, organizationId: "org-1" },
      };

      const key = summarizeQueueTask(task).idempotencyKey;
      expect(key).toContain(workflowType);
      expect(key).toBe(`queue:TRIGGER_WORKFLOW:org-1:${workflowType}`);
    }
  });
});
