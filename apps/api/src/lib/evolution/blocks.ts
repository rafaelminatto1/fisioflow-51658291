import { z } from "zod";

/** Tipos de bloco do editor modular de evolução (estilo Notion). */
export const blockTypes = ["text", "vas", "goniometry", "photo", "checklist", "ai_insight"] as const;
export type BlockType = (typeof blockTypes)[number];

// Base validada; campos específicos por tipo passam livres (passthrough) — a UI define o shape.
export const evolutionBlockSchema = z
  .object({ id: z.string().min(1), type: z.enum(blockTypes) })
  .passthrough();

export type EvolutionBlock = z.infer<typeof evolutionBlockSchema>;

const MAX_BLOCKS = 200;

/**
 * Valida e sanitiza os blocos recebidos: mantém apenas entradas com id + type válidos,
 * descarta o resto (nunca lança). Retorna no máximo MAX_BLOCKS.
 */
export function parseBlocks(input: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(input)) return [];
  return input
    .map((b) => evolutionBlockSchema.safeParse(b))
    .filter((r): r is { success: true; data: EvolutionBlock } => r.success)
    .map((r) => r.data as Record<string, unknown>)
    .slice(0, MAX_BLOCKS);
}
