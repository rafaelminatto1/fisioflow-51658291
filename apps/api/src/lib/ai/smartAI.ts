import type { Env } from "../../types/env";
import type { ThinkingLevel } from "./modelRegistry";
import {
  callAI,
  callAIStructured,
  type AITask,
  type CallAIOptions,
  type CallAIResult,
} from "./callAI";
import { z } from "zod";

export interface UnifiedAIOptions {
  task: AITask;
  model?: string;
  organizationId?: string;
  systemInstruction?: string;
  prompt?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: ThinkingLevel;
  cacheKey?: string;
  cacheTtl?: number;
}

export async function smartChat(
  env: Env,
  opts: UnifiedAIOptions,
): Promise<{ text: string; thoughts?: string; usage: CallAIResult["usage"] }> {
  const result = await callAI(env, {
    task: opts.task,
    model: opts.model,
    organizationId: opts.organizationId,
    systemInstruction: opts.systemInstruction,
    prompt: opts.prompt,
    messages: opts.messages,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    thinkingLevel: opts.thinkingLevel,
    cacheKey: opts.cacheKey,
    cacheTtl: opts.cacheTtl,
  });
  return { text: result.content, thoughts: result.thinking, usage: result.usage };
}

export async function smartStructured<T>(
  env: Env,
  opts: UnifiedAIOptions & { schema: z.ZodType<T> },
): Promise<{ data: T; thoughts?: string; usage: CallAIResult["usage"] }> {
  const result = await callAIStructured(env, {
    task: opts.task,
    model: opts.model,
    organizationId: opts.organizationId,
    systemInstruction: opts.systemInstruction,
    prompt: opts.prompt,
    messages: opts.messages,
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    thinkingLevel: opts.thinkingLevel,
    cacheKey: opts.cacheKey,
    cacheTtl: opts.cacheTtl,
    schema: opts.schema,
  });
  return { data: result.data, thoughts: result.thinking, usage: result.usage };
}

export async function smartTranscribe(
  env: Env,
  audio: ArrayBuffer,
  language?: string,
  organizationId?: string,
): Promise<string> {
  const { callAITranscribe } = await import("./callAI");
  const result = await callAITranscribe(env, { audio, language, organizationId });
  return result.text;
}
