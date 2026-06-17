import { parseBlocks } from "./blocks";

export const EXTRACT_BLOCKS_SYSTEM =
  "Você converte um texto de evolução de fisioterapia em blocos estruturados (JSON). " +
  "Tipos permitidos: " +
  '"text" {text}; ' +
  '"vas" {value:0-10}; ' +
  '"goniometry" {joint, movement, degrees}; ' +
  '"checklist" {items:[{text, done:false}]}. ' +
  "Extraia EVA/dor como vas, medições de ADM como goniometry, condutas/exercícios como checklist, " +
  "e o restante como text. Responda APENAS um array JSON de blocos, cada um com {type, ...campos}.";

function genId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `b-${Date.now()}-${Math.random()}`).toString();
}

/**
 * Normaliza a saída do LLM em blocos válidos: garante id em cada bloco e
 * valida via parseBlocks (descarta inválidos). Aceita array ou {blocks:[...]}.
 */
export function coerceBlocks(raw: unknown): Array<Record<string, unknown>> {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { blocks?: unknown })?.blocks)
      ? (raw as { blocks: unknown[] }).blocks
      : [];
  const withIds = arr.map((b) => {
    const obj = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
    return { id: typeof obj.id === "string" && obj.id ? obj.id : genId(), ...obj };
  });
  return parseBlocks(withIds);
}
