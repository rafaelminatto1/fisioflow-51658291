import type { Env } from "../../types/env";
import { runAi } from "../ai-native";

/**
 * Modelo para saída estruturada (JSON).
 * NOTA: Hermes 2 Pro (@hf/nousresearch/hermes-2-pro-mistral-7b) foi DEPRECADO no Cloudflare
 * Workers AI em 2026-05-30. Usamos o llama-3.3-70b `-fast` (ativo, forte em JSON) no lugar.
 */
export const STRUCTURED_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Extrai o texto de resposta de Workers AI em ambos os formatos: `.response` ou OpenAI `choices[].message.content`. */
function readAiContent(resp: unknown): string {
  const r = resp as {
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  if (typeof r?.response === "string") return r.response;
  const c = r?.choices?.[0]?.message?.content;
  if (typeof c === "string") return c;
  if (r?.response && typeof r.response === "object") return JSON.stringify(r.response);
  return "";
}

/**
 * Extrai um bloco JSON de uma resposta de LLM (tolerante a cercas markdown e texto ao redor).
 * Retorna o objeto/array parseado ou null. Aceita não-string (alguns gateways já retornam objeto).
 */
export function parseJsonLoose(text: unknown): unknown {
  if (text == null) return null;
  if (typeof text !== "string") return text;
  if (!text) return null;
  let s = text.trim();
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
 * Roda o modelo estruturado pedindo JSON e retorna o parse (ou null). `system` descreve o schema.
 */
export async function structuredJson<T = unknown>(
  env: Env,
  system: string,
  user: string,
): Promise<T | null> {
  const resp = await runAi(
    env,
    STRUCTURED_MODEL,
    {
      messages: [
        { role: "system", content: `${system} Responda APENAS com JSON válido, sem markdown.` },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    },
    { cache: false },
  );
  return parseJsonLoose(readAiContent(resp)) as T | null;
}
