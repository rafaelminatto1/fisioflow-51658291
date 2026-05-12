import type { Env } from "../types/env";
import { createPool } from "./db";

const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5"; // 768 dims — matches fisioflow-clinical index
const BATCH_SIZE = 20; // CF AI embedding: até 100 texts por request, Vectorize upsert: até 1000 vetores

/**
 * Popula o índice Vectorize `fisioflow-clinical` com exercícios e protocolos públicos.
 * Seguro para re-executar (upsert por ID estável).
 */
export async function syncVectorizeIndex(env: Env): Promise<{ indexed: number; skipped: number }> {
  if (!env.CLINICAL_KNOWLEDGE) {
    throw new Error("Binding CLINICAL_KNOWLEDGE não disponível");
  }

  const pool = createPool(env);
  let indexed = 0;
  let skipped = 0;

  // ── Exercícios ──────────────────────────────────────────────────────────────
  const exRes = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    muscles_primary: string[] | null;
    body_parts: string[] | null;
  }>(
    `SELECT e.id, e.name, e.description, ec.name AS category,
            e.muscles_primary, e.body_parts
     FROM exercises e
     LEFT JOIN exercise_categories ec ON ec.id = e.category_id
     WHERE e.is_public = true
     LIMIT 500`,
  );

  const exercises = exRes.rows;
  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => buildExerciseText(r));

    try {
      const embedRes = await env.AI.run(EMBED_MODEL, { text: texts });
      const embeddings: number[][] = embedRes?.data ?? [];
      if (embeddings.length !== batch.length) {
        skipped += batch.length;
        continue;
      }

      const vectors = batch.map((r, idx) => ({
        id: `ex-${r.id}`,
        values: embeddings[idx],
        metadata: {
          type: "exercise",
          name: r.name,
          category: r.category ?? "",
          body_parts: (r.body_parts ?? []).join(","),
        },
      }));

      await env.CLINICAL_KNOWLEDGE!.upsert(vectors);
      indexed += vectors.length;
    } catch (err) {
      console.error(`[VectorizeSync] Exercise batch ${i}-${i + BATCH_SIZE} failed:`, err);
      skipped += batch.length;
    }
  }

  // ── Protocolos ─────────────────────────────────────────────────────────────
  const prRes = await pool.query<{
    id: string;
    name: string;
    description: string | null;
    condition_name: string | null;
    objectives: string | null;
  }>(
    `SELECT id, name, description, condition_name, objectives
     FROM exercise_protocols
     WHERE is_public = true
     LIMIT 300`,
  );

  const protocols = prRes.rows;
  for (let i = 0; i < protocols.length; i += BATCH_SIZE) {
    const batch = protocols.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => buildProtocolText(r));

    try {
      const embedRes = await env.AI.run(EMBED_MODEL, { text: texts });
      const embeddings: number[][] = embedRes?.data ?? [];
      if (embeddings.length !== batch.length) {
        skipped += batch.length;
        continue;
      }

      const vectors = batch.map((r, idx) => ({
        id: `pr-${r.id}`,
        values: embeddings[idx],
        metadata: {
          type: "protocol",
          name: r.name,
          condition: r.condition_name ?? "",
        },
      }));

      await env.CLINICAL_KNOWLEDGE!.upsert(vectors);
      indexed += vectors.length;
    } catch (err) {
      console.error(`[VectorizeSync] Protocol batch ${i}-${i + BATCH_SIZE} failed:`, err);
      skipped += batch.length;
    }
  }

  console.log(`[VectorizeSync] Done — indexed: ${indexed}, skipped: ${skipped}`);
  return { indexed, skipped };
}

function buildExerciseText(r: {
  name: string;
  description: string | null;
  category: string | null;
  muscles_primary: string[] | null;
  body_parts: string[] | null;
}): string {
  const parts = [r.name];
  if (r.category) parts.push(r.category);
  if (r.body_parts?.length) parts.push(r.body_parts.join(", "));
  if (r.muscles_primary?.length) parts.push(r.muscles_primary.join(", "));
  if (r.description) parts.push(r.description.slice(0, 300));
  return parts.join(". ");
}

function buildProtocolText(r: {
  name: string;
  description: string | null;
  condition_name: string | null;
  objectives: string | null;
}): string {
  const parts = [r.name];
  if (r.condition_name) parts.push(r.condition_name);
  if (r.description) parts.push(r.description.slice(0, 300));
  if (r.objectives) parts.push(r.objectives.slice(0, 200));
  return parts.join(". ");
}
