import type { Env } from "../../types/env";
import { runAi } from "../ai-native";
import { WORKERS_AI_MODELS } from "../workersAi";
import { zodToToolSchema } from "./zodToToolSchema";
import type { CallModel, CopilotTool, ToolCall } from "./types";

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

export function makeCallModel(env: Env, tools: CopilotTool[]): CallModel {
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: zodToToolSchema(t.parameters),
  }));

  return async (messages) => {
    const res = (await runAi(env, WORKERS_AI_MODELS.llama_3_1_8b, {
      messages,
      tools: toolDefs,
    })) as {
      response?: string;
      tool_calls?: Array<{ name: string; arguments: unknown }>;
    };
    const toolCalls: ToolCall[] = (res.tool_calls ?? []).map((c) => ({
      name: c.name,
      arguments: normalizeArgs(c.arguments),
    }));
    return { content: res.response, toolCalls };
  };
}
