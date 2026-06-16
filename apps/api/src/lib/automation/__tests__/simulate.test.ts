import { describe, it, expect } from "vitest";
import { runSimulation } from "../../../routes/automation";

describe("runSimulation", () => {
  it("dry-runs a definition with no-op actions and returns the trace", async () => {
    const out = await runSimulation({
      definition: {
        nodes: [
          { id: "t", type: "trigger" },
          { id: "c", type: "condition", field: "vas", op: "lt", value: 4 },
          { id: "a", type: "action", action: "send_whatsapp", params: { msg: "parabéns" } },
        ],
        edges: [
          { from: "t", to: "c" },
          { from: "c", to: "a", branch: "true" },
        ],
      },
      context: { vas: 2 },
    });
    expect(out.completed).toBe(true);
    const action = out.trace.find((t) => t.id === "a");
    expect((action?.result as any)?.simulated).toBe(true);
    expect((action?.result as any)?.action).toBe("send_whatsapp");
  });

  it("rejects an invalid definition", async () => {
    await expect(runSimulation({ definition: { nodes: [] }, context: {} })).rejects.toBeTruthy();
  });
});
