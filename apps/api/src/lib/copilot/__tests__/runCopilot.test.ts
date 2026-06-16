import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { runCopilot } from "../runCopilot";

const tool = {
  name: "echo",
  description: "echo",
  parameters: z.object({ msg: z.string() }),
  execute: vi.fn(async (_ctx: unknown, a: Record<string, unknown>) => ({ echoed: a.msg })),
} as any;

describe("runCopilot", () => {
  it("executes a requested tool then returns the final answer", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({ toolCalls: [{ name: "echo", arguments: { msg: "hi" } }] })
      .mockResolvedValueOnce({ content: "done" });
    const out = await runCopilot({
      callModel,
      tools: [tool],
      ctx: {} as any,
      messages: [{ role: "user", content: "x" }],
    });
    expect(out.answer).toBe("done");
    expect(tool.execute).toHaveBeenCalled();
    expect(out.toolCalls[0].name).toBe("echo");
    expect(callModel).toHaveBeenCalledTimes(2);
  });

  it("returns content immediately when no tool calls", async () => {
    const callModel = vi.fn().mockResolvedValueOnce({ content: "hello" });
    const out = await runCopilot({ callModel, tools: [], ctx: {} as any, messages: [] });
    expect(out.answer).toBe("hello");
  });

  it("stops at maxTurns", async () => {
    const callModel = vi.fn().mockResolvedValue({ toolCalls: [{ name: "echo", arguments: { msg: "x" } }] });
    const out = await runCopilot({ callModel, tools: [tool], ctx: {} as any, messages: [], maxTurns: 2 });
    expect(callModel).toHaveBeenCalledTimes(2);
    expect(out.answer).toBeDefined();
  });

  it("reports an error for an unknown tool without throwing", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({ toolCalls: [{ name: "nope", arguments: {} }] })
      .mockResolvedValueOnce({ content: "ok" });
    const out = await runCopilot({ callModel, tools: [tool], ctx: {} as any, messages: [] });
    expect(out.answer).toBe("ok");
  });
});
