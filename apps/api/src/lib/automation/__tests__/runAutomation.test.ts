import { describe, it, expect, vi } from "vitest";
import { runAutomation } from "../runAutomation";
import type { AutomationDefinition } from "../types";

const noopSleep = vi.fn(async () => {});

describe("runAutomation", () => {
  it("runs trigger → action and calls the handler", async () => {
    const def: AutomationDefinition = {
      nodes: [
        { id: "t", type: "trigger" },
        { id: "a", type: "action", action: "send_email", params: { to: "x" } },
      ],
      edges: [{ from: "t", to: "a" }],
    };
    const send = vi.fn(async () => ({ ok: true }));
    const out = await runAutomation(def, {}, { actions: { send_email: send }, sleep: noopSleep });
    expect(send).toHaveBeenCalledWith({ to: "x" }, {});
    expect(out.completed).toBe(true);
    expect(out.trace.map((t) => t.type)).toEqual(["trigger", "action"]);
  });

  it("branches a condition to the matching edge", async () => {
    const def: AutomationDefinition = {
      nodes: [
        { id: "t", type: "trigger" },
        { id: "c", type: "condition", field: "vas", op: "lt", value: 4 },
        { id: "yes", type: "action", action: "praise" },
        { id: "no", type: "action", action: "alert" },
      ],
      edges: [
        { from: "t", to: "c" },
        { from: "c", to: "yes", branch: "true" },
        { from: "c", to: "no", branch: "false" },
      ],
    };
    const praise = vi.fn(async () => "ok");
    const alert = vi.fn(async () => "ok");
    const out = await runAutomation(def, { vas: 2 }, { actions: { praise, alert }, sleep: noopSleep });
    expect(praise).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    expect(out.trace.find((t) => t.type === "condition")?.passed).toBe(true);
  });

  it("waits via injected sleep", async () => {
    const def: AutomationDefinition = {
      nodes: [
        { id: "t", type: "trigger" },
        { id: "w", type: "wait", seconds: 60 },
      ],
      edges: [{ from: "t", to: "w" }],
    };
    const sleep = vi.fn(async () => {});
    await runAutomation(def, {}, { actions: {}, sleep });
    expect(sleep).toHaveBeenCalledWith(60);
  });

  it("records an error for an unknown action without throwing", async () => {
    const def: AutomationDefinition = {
      nodes: [
        { id: "t", type: "trigger" },
        { id: "a", type: "action", action: "ghost" },
      ],
      edges: [{ from: "t", to: "a" }],
    };
    const out = await runAutomation(def, {}, { actions: {}, sleep: noopSleep });
    expect(out.trace.find((t) => t.id === "a")?.error).toMatch(/ausente/);
  });

  it("stops at maxSteps on a cycle", async () => {
    const def: AutomationDefinition = {
      nodes: [
        { id: "t", type: "trigger" },
        { id: "a", type: "action", action: "loop" },
      ],
      edges: [
        { from: "t", to: "a" },
        { from: "a", to: "a" },
      ],
    };
    const out = await runAutomation(def, {}, { actions: { loop: async () => 1 }, sleep: noopSleep, maxSteps: 5 });
    expect(out.steps).toBe(5);
    expect(out.completed).toBe(false);
  });
});
