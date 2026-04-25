import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export type GeminiModel =
  | "gemini-3.1-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite";

export type ThinkingLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH";

function isGemini3(model: GeminiModel): boolean {
  return model.startsWith("gemini-3");
}

function createClient(env: {
  GOOGLE_AI_API_KEY: string;
  FISIOFLOW_AI_GATEWAY_URL?: string;
}): GoogleGenAI {
  const baseUrl = env.FISIOFLOW_AI_GATEWAY_URL
    ? `${env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
    : undefined;

  return new GoogleGenAI({
    apiKey: env.GOOGLE_AI_API_KEY,
    httpOptions: baseUrl ? { baseUrl } : undefined,
  });
}

function buildThinkingConfig(
  model: GeminiModel,
  level?: ThinkingLevel,
): Record<string, unknown> | undefined {
  if (!level) return undefined;
  if (isGemini3(model)) {
    return { thinkingLevel: level };
  }
  const budget = {
    MINIMAL: 0,
    LOW: 512,
    MEDIUM: 1024,
    HIGH: 4096,
  }[level];
  return { thinkingBudget: budget };
}

export interface InlineImagePart {
  inlineData: { mimeType: string; data: string };
}

export type ContentPart = { text: string } | InlineImagePart;

export interface StructuredCallOptions<T> {
  schema: z.ZodType<T>;
  prompt: string | ContentPart[];
  model?: GeminiModel;
  thinkingLevel?: ThinkingLevel;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  cachedContent?: string;
  gatewayMetadata?: Record<string, string>;
}

export async function callGeminiStructured<T>(
  env: { GOOGLE_AI_API_KEY: string; FISIOFLOW_AI_GATEWAY_URL?: string },
  opts: StructuredCallOptions<T>,
): Promise<T> {
  const model = opts.model ?? "gemini-3-flash-preview";
  const client = createClient(env);

  const jsonSchema = z.toJSONSchema(opts.schema, { target: "openapi-3.0" });

  const contents =
    typeof opts.prompt === "string" ? opts.prompt : [{ role: "user" as const, parts: opts.prompt }];

  const response = await client.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      thinkingConfig: buildThinkingConfig(model, opts.thinkingLevel) as never,
      cachedContent: opts.cachedContent,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  const parsed = JSON.parse(text);
  return opts.schema.parse(parsed);
}

export interface ThinkingCallOptions {
  prompt: string;
  model?: GeminiModel;
  thinkingLevel?: ThinkingLevel;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  cachedContent?: string;
  includeThoughts?: boolean;
}

export interface ThinkingCallResult {
  text: string;
  thoughts?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

export async function callGeminiThinking(
  env: { GOOGLE_AI_API_KEY: string; FISIOFLOW_AI_GATEWAY_URL?: string },
  opts: ThinkingCallOptions,
): Promise<ThinkingCallResult> {
  const model = opts.model ?? "gemini-3-flash-preview";
  const client = createClient(env);

  const response = await client.models.generateContent({
    model,
    contents: opts.prompt,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      thinkingConfig: {
        ...(buildThinkingConfig(model, opts.thinkingLevel) as object),
        includeThoughts: opts.includeThoughts ?? false,
      } as never,
      cachedContent: opts.cachedContent,
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const thoughtParts: string[] = [];
  const answerParts: string[] = [];
  for (const part of parts) {
    if (!part.text) continue;
    if ((part as { thought?: boolean }).thought) {
      thoughtParts.push(part.text);
    } else {
      answerParts.push(part.text);
    }
  }

  return {
    text: answerParts.join("") || response.text || "",
    thoughts: thoughtParts.length > 0 ? thoughtParts.join("\n") : undefined,
    usageMetadata: response.usageMetadata as ThinkingCallResult["usageMetadata"],
  };
}

export async function createContextCache(
  env: { GOOGLE_AI_API_KEY: string; FISIOFLOW_AI_GATEWAY_URL?: string },
  opts: {
    model?: GeminiModel;
    content: string;
    systemInstruction?: string;
    ttlSeconds?: number;
    displayName?: string;
  },
): Promise<{ name: string; expireTime?: string }> {
  const model = opts.model ?? "gemini-3-flash-preview";
  const client = createClient(env);

  const cache = await client.caches.create({
    model,
    config: {
      contents: [{ role: "user", parts: [{ text: opts.content }] }],
      systemInstruction: opts.systemInstruction,
      ttl: `${opts.ttlSeconds ?? 3600}s`,
      displayName: opts.displayName,
    },
  });

  return { name: cache.name ?? "", expireTime: cache.expireTime };
}

export async function deleteContextCache(
  env: { GOOGLE_AI_API_KEY: string; FISIOFLOW_AI_GATEWAY_URL?: string },
  cacheName: string,
): Promise<void> {
  const client = createClient(env);
  await client.caches.delete({ name: cacheName });
}
