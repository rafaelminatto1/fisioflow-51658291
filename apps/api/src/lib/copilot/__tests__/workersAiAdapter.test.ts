import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

vi.mock("../../ai-native", () => ({
  runAi: vi.fn(async () => ({
    response: "hi",
    tool_calls: [{ name: "echo", arguments: { msg: "x" } }],
  })),
}));

import { makeCallModel } from "../workersAiAdapter";

describe("makeCallModel", () => {
  it("calls runAi and normalizes tool_calls", async () => {
    const tools = [
      { name: "echo", description: "d", parameters: z.object({ msg: z.string() }), execute: async () => ({}) },
    ];
    const call = makeCallModel({} as any, tools as any);
    const reply = await call([{ role: "user", content: "hi" }]);
    expect(reply.content).toBe("hi");
    expect(reply.toolCalls?.[0]).toEqual({ name: "echo", arguments: { msg: "x" } });
  });

  it("parses string arguments defensively", async () => {
    const { runAi } = await import("../../ai-native");
    (runAi as any).mockResolvedValueOnce({ response: "y", tool_calls: [{ name: "echo", arguments: '{"msg":"z"}' }] });
    const call = makeCallModel({} as any, [] as any);
    const reply = await call([]);
    expect(reply.toolCalls?.[0].arguments).toEqual({ msg: "z" });
  });
});
