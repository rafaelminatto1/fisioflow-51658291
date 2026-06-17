import type { Env } from "../../types/env";
import { runThinkingModel } from "../ai-native";

/** Hermes 2 Pro (Nous Research) — forte em function-calling / saída estruturada (JSON). */
export const HERMES_MODEL = "@hf/nousresearch/hermes-2-pro-mistral-7b";

/**
 * Extrai um bloco JSON de uma resposta de LLM (tolerante a cercas markdown e texto ao redor).
 * Retorna o objeto/array parseado ou null.
 */
export function parseJsonLoose(text: string): unknown {
  if (!text) return null;
  let s = text.trim();
  // remove cercas ```json ... ``` ou ``` ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    /* tenta extrair o primeiro objeto/array balanceado */
  }
  const start = s.search(/[[{]/);
  if (start < 0) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Roda o Hermes pedindo JSON e retorna o parse (ou null). `system` deve descrever o schema esperado.
 */
export async function hermesJson<T = unknown>(
  env: Env,
  system: string,
  user: string,
): Promise<T | null> {
  const res = await runThinkingModel(env, {
    prompt: `${system}\n\nEntrada:\n${user}\n\nResponda APENAS com JSON válido.`,
    model: HERMES_MODEL,
    responseFormat: "json",
    temperature: 0.2,
  });
  return parseJsonLoose(res.content) as T | null;
}
