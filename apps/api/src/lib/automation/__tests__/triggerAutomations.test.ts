import { describe, it, expect, vi } from "vitest";
import { runAutomationsForEvent } from "../triggerAutomations";

const def = {
  nodes: [
    { id: "t", type: "trigger" },
    { id: "a", type: "action", action: "log_event" },
  ],
  edges: [{ from: "t", to: "a" }],
};

describe("runAutomationsForEvent", () => {
  it("skips when execution is disabled (flag off)", async () => {
    const sql = vi.fn(async () => ({ rows: [] }));
    const out = await runAutomationsForEvent(sql as any, {} as any, { type: "evolution.updated", data: { orgId: "o1" } });
    expect(out.skipped).toBe("disabled");
    expect(sql).not.toHaveBeenCalled();
  });

  it("skips when the event has no org", async () => {
    const sql = vi.fn(async () => ({ rows: [] }));
    const out = await runAutomationsForEvent(sql as any, { AUTOMATION_EXECUTION_ENABLED: "true" } as any, { type: "x", data: {} });
    expect(out.skipped).toBe("no org");
  });

  it("runs matching enabled automations with injected handlers", async () => {
    const sql = vi.fn(async (_q: string, _p?: unknown[]) => ({ rows: [{ id: "au1", definition: def }] }));
    const log = vi.fn(async () => ({ ok: true }));
    const out = await runAutomationsForEvent(
      sql as any,
      { AUTOMATION_EXECUTION_ENABLED: "true" } as any,
      { type: "evolution.updated", data: { organizationId: "o1", vas: 2 } },
      { log_event: log },
    );
    expect(out.matched).toBe(1);
    expect(out.ran).toBe(1);
    expect(log).toHaveBeenCalled();
    // org + event type scoped query
    expect(sql.mock.calls[0][1]).toEqual(["o1", "evolution.updated"]);
    // writes an automation_logs row
    expect(sql.mock.calls.some((c) => String(c[0]).includes("INSERT INTO automation_logs"))).toBe(true);
  });

  it("creates a durable Workflow when WORKFLOW_AUTOMATION is bound", async () => {
    const sql = vi.fn(async (_q: string, _p?: unknown[]) => ({ rows: [{ id: "au1", definition: def }] }));
    const create = vi.fn(async (_o: any) => ({ id: "wf1" }));
    const out = await runAutomationsForEvent(
      sql as any,
      { AUTOMATION_EXECUTION_ENABLED: "true", WORKFLOW_AUTOMATION: { create } } as any,
      { type: "evolution.updated", data: { organizationId: "o1" } },
    );
    expect(out.ran).toBe(1);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].params.automationId).toBe("au1");
  });
});
