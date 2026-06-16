import type { z } from "zod";
import type { Env } from "../../types/env";
import type { AuthUser } from "../auth";

export type CopilotMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
};
export type ToolCall = { name: string; arguments: Record<string, unknown> };
export type ModelReply = { content?: string; toolCalls?: ToolCall[] };
export type CallModel = (messages: CopilotMessage[]) => Promise<ModelReply>;
export type ToolCtx = { env: Env; user: AuthUser; token: string; baseUrl: string };

export interface CopilotTool {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  execute: (ctx: ToolCtx, args: Record<string, unknown>) => Promise<unknown>;
}
