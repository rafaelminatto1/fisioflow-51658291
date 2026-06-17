import type { Env } from "../../types/env";
import { runAi } from "../ai-native";
import { WORKERS_AI_MODELS } from "../workersAi";
import { zodToToolSchema } from "./zodToToolSchema";
import type { CallModel, CopilotTool, OpenAiToolCall, ToolCall } from "./types";

function normalizeArgs(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as Record<string, unknown>;
}

type RawToolCall = {
  id?: string;
  function?: { name?: string; arguments?: unknown };
  name?: string;
  arguments?: unknown;
};

export function makeCallModel(
  env: Env,
  tools: CopilotTool[],
  model: string = WORKERS_AI_MODELS.llama_3_1_8b,
): CallModel {
  // Workers AI `-fast` models route through vLLM's OpenAI-compatible endpoint,
  // which requires the OpenAI tool format: { type: "function", function: {...} }.
  const toolDefs = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: zodToToolSchema(t.parameters),
    },
  }));

  return async (messages) => {
    const res = (await runAi(env, model, {
      messages,
      tools: toolDefs,
    })) as {
      response?: string;
      tool_calls?: RawToolCall[];
      choices?: Array<{ message?: { content?: string; tool_calls?: RawToolCall[] } }>;
    };

    const message = res.choices?.[0]?.message;
    const content = res.response ?? message?.content ?? "";
    const rawCalls = res.tool_calls ?? message?.tool_calls ?? [];

    const rawToolCalls: OpenAiToolCall[] = rawCalls.map((c, i) => {
      const name = c.function?.name ?? c.name ?? "";
      const args = c.function?.arguments ?? c.arguments ?? {};
      return {
        id: c.id ?? `call_${i}`,
        type: "function",
        function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) },
      };
    });

    const toolCalls: ToolCall[] = rawToolCalls.map((c) => ({
      id: c.id,
      name: c.function.name,
      arguments: normalizeArgs(c.function.arguments),
    }));

    return { content, toolCalls, rawToolCalls };
  };
}
