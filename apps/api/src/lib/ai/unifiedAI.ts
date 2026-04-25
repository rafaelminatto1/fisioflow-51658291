import { z } from "zod";
import type { Env } from "../../types/env";
import type { ThinkingLevel } from "./modelRegistry";
import { smartChat, smartStructured } from "./smartAI";
import {
  callGeminiThinking,
  callGeminiStructured as callGeminiStructuredOriginal,
} from "../ai-gemini-v2";
import { callGemini } from "../ai-gemini";

type ThinkingResult = { text: string; thoughts?: string; usageMetadata?: Record<string, any> };

export async function unifiedThinking(
  env: Env,
  opts: {
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    thinkingLevel?: ThinkingLevel;
    model?: string;
    cachedContent?: string;
    includeThoughts?: boolean;
    organizationId?: string;
  },
): Promise<ThinkingResult> {
  if (opts.cachedContent) {
    const { organizationId: _, ...geminiOpts } = opts;
    return callGeminiThinking(env, geminiOpts as any);
  }

  try {
    const result = await smartChat(env, {
      task: "chat",
      prompt: opts.prompt,
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature,
      maxTokens: opts.maxOutputTokens,
      thinkingLevel: opts.thinkingLevel,
      organizationId: opts.organizationId,
    });
    return { text: result.text, thoughts: result.thoughts };
  } catch {
    const { organizationId: _, ...geminiOpts } = opts;
    return callGeminiThinking(env, geminiOpts as any);
  }
}

export async function unifiedStructured<T>(
  env: Env,
  opts: {
    schema: z.ZodType<T>;
    prompt: string | Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    thinkingLevel?: ThinkingLevel;
    model?: string;
    cachedContent?: string;
    organizationId?: string;
  },
): Promise<T> {
  if (opts.cachedContent) {
    return callGeminiStructuredOriginal(env, opts as any);
  }

  if (typeof opts.prompt !== "string") {
    return callGeminiStructuredOriginal(env, opts as any);
  }

  try {
    const result = await smartStructured(env, {
      task: "chat",
      schema: opts.schema,
      prompt: opts.prompt,
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature,
      maxTokens: opts.maxOutputTokens,
      thinkingLevel: opts.thinkingLevel,
      organizationId: opts.organizationId,
    });
    return result.data;
  } catch {
    return callGeminiStructuredOriginal(env, opts as any);
  }
}
