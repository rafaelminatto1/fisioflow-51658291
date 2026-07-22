import type { Env } from "../types/env";
import { createPool } from "./db";
import { deleteIndexedItemsByFilenames } from "./wikiIndexing";
import { chunkClinicalDoc, type DocMeta } from "./ai/sectionChunker";

export interface IndexChunkFile {
  filename: string;
  text: string;
  metadata: Record<string, unknown>;
}

/**
 * Aplica chunking section-aware a um documento e produz um arquivo indexável por
 * chunk (`{base}--{n}.md`), cada um com breadcrumb no texto e a metadata mesclada
 * (status/especialidade + source/id/title + heading da seção).
 */
export function buildIndexChunks(
  baseFilename: string,
  doc: string,
  meta: DocMeta,
  extra: Record<string, unknown> = {},
): IndexChunkFile[] {
  const base = baseFilename.replace(/\.md$/, "");
  return chunkClinicalDoc(doc, meta).map((chunk, i) => ({
    filename: `${base}--${i}.md`,
    text: chunk.text,
    metadata: { ...extra, ...chunk.metadata, heading: chunk.heading },
  }));
}

/** Prefixo de busca para localizar todos os chunks de um documento no índice. */
function chunkFilePrefix(baseFilename: string): string {
  return `${baseFilename.replace(/\.md$/, "")}--`;
}

/** Remove todos os chunks antigos de um documento antes de reupload (upsert). */
export async function deleteChunkFiles(
  env: Env,
  baseFilename: string,
  binding = env.AI_SEARCH,
): Promise<void> {
  if (!binding?.items) return;
  const prefix = chunkFilePrefix(baseFilename);
  try {
    const listing = await binding.items.list({ search: prefix, per_page: 100 });
    const items: Array<{ id: string; key?: string; filename?: string }> =
      listing?.result ?? listing?.items ?? [];
    const matches = items.filter((it) => (it.key ?? it.filename ?? "").startsWith(prefix));
    await Promise.all(matches.map((it) => binding.items.delete(it.id)));
  } catch (error) {
    console.warn(`[contentIndexing] chunk cleanup failed for ${baseFilename}:`, error);
  }
}

/** Sobe os chunks de um documento no índice (após limpar os antigos). */
async function uploadChunks(env: Env, files: IndexChunkFile[]): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  await Promise.all(
    files.map((f) => env.AI_SEARCH!.items.upload(f.filename, f.text, { metadata: f.metadata })),
  );
}

export function exerciseIndexFilename(id: string): string {
  return `exercise-${id}.md`;
}

export function protocolIndexFilename(id: string): string {
  return `protocol-${id}.md`;
}

export type ExerciseIndexRow = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  category: string | null;
  difficulty: string | null;
  muscles_primary: string[] | null;
  muscles_secondary: string[] | null;
  body_parts: string[] | null;
  tips: string | null;
  precautions: string | null;
  benefits: string | null;
};

export function buildExerciseDoc(row: ExerciseIndexRow): string {
  const parts: string[] = [`# Exercício: ${row.name}`];
  if (row.category) parts.push(`**Categoria:** ${row.category}`);
  if (row.difficulty) parts.push(`**Dificuldade:** ${row.difficulty}`);
  if (row.muscles_primary?.length)
    parts.push(`**Músculos primários:** ${row.muscles_primary.join(", ")}`);
  if (row.muscles_secondary?.length)
    parts.push(`**Músculos secundários:** ${row.muscles_secondary.join(", ")}`);
  if (row.body_parts?.length) parts.push(`**Regiões corporais:** ${row.body_parts.join(", ")}`);
  if (row.description) parts.push(`\n## Descrição\n${row.description}`);
  if (row.instructions) parts.push(`\n## Instruções de Execução\n${row.instructions}`);
  if (row.benefits) parts.push(`\n## Benefícios Clínicos\n${row.benefits}`);
  if (row.tips) parts.push(`\n## Dicas Clínicas\n${row.tips}`);
  if (row.precautions) parts.push(`\n## Precauções\n${row.precautions}`);
  return parts.join("\n");
}

export type ProtocolIndexRow = {
  id: string;
  name: string;
  description: string | null;
  condition_name: string | null;
  weeks_total: number | null;
  objectives: string | null;
  contraindications: string | null;
  evidence_level: string | null;
  protocol_type: string | null;
};

export function buildProtocolDoc(row: ProtocolIndexRow): string {
  const parts: string[] = [`# Protocolo Clínico: ${row.name}`];
  if (row.condition_name) parts.push(`**Condição clínica:** ${row.condition_name}`);
  if (row.protocol_type) parts.push(`**Tipo:** ${row.protocol_type}`);
  if (row.evidence_level) parts.push(`**Nível de evidência:** ${row.evidence_level}`);
  if (row.weeks_total) parts.push(`**Duração:** ${row.weeks_total} semanas`);
  if (row.description) parts.push(`\n## Descrição do Protocolo\n${row.description}`);
  if (row.objectives) parts.push(`\n## Objetivos\n${row.objectives}`);
  if (row.contraindications) parts.push(`\n## Contraindicações\n${row.contraindications}`);
  return parts.join("\n");
}

export async function syncExerciseToIndex(env: Env, exerciseId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  try {
    const pool = createPool(env);
    const res = await pool.query<ExerciseIndexRow>(
      `SELECT e.id, e.name, e.description, e.instructions,
              ec.name AS category, e.difficulty,
              e.muscles_primary, e.muscles_secondary, e.body_parts,
              e.tips, e.precautions, e.benefits
       FROM exercises e
       LEFT JOIN exercise_categories ec ON ec.id = e.category_id
       WHERE e.id = $1 AND e.is_active = true`,
      [exerciseId],
    );
    const row = res.rows[0];
    if (!row) {
      await removeExerciseFromIndex(env, exerciseId);
      return;
    }
    const base = exerciseIndexFilename(row.id);
    const files = buildIndexChunks(
      base,
      buildExerciseDoc(row),
      { status: "current", sourceType: "exercise", specialty: row.category ?? undefined },
      { source: "exercises", id: row.id, title: row.name, category: row.category ?? "" },
    );
    await deleteChunkFiles(env, base);
    await uploadChunks(env, files);
  } catch (error) {
    console.error(`[contentIndexing] exercise sync failed for ${exerciseId}:`, error);
  }
}

export async function syncProtocolToIndex(env: Env, protocolId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  try {
    const pool = createPool(env);
    const res = await pool.query<ProtocolIndexRow>(
      `SELECT id, name, description, condition_name, weeks_total,
              objectives, contraindications, evidence_level, protocol_type
       FROM exercise_protocols
       WHERE id = $1`,
      [protocolId],
    );
    const row = res.rows[0];
    if (!row) {
      await removeProtocolFromIndex(env, protocolId);
      return;
    }
    const base = protocolIndexFilename(row.id);
    const files = buildIndexChunks(
      base,
      buildProtocolDoc(row),
      { status: "current", sourceType: "protocol", specialty: row.protocol_type ?? undefined },
      {
        source: "protocols",
        id: row.id,
        title: row.name,
        condition: row.condition_name ?? "",
      },
    );
    await deleteChunkFiles(env, base);
    await uploadChunks(env, files);
  } catch (error) {
    console.error(`[contentIndexing] protocol sync failed for ${protocolId}:`, error);
  }
}

export async function removeExerciseFromIndex(env: Env, exerciseId: string): Promise<void> {
  const base = exerciseIndexFilename(exerciseId);
  await deleteChunkFiles(env, base); // chunks section-aware
  await deleteIndexedItemsByFilenames(env, [base]); // doc legado single-file
}

export async function removeProtocolFromIndex(env: Env, protocolId: string): Promise<void> {
  const base = protocolIndexFilename(protocolId);
  await deleteChunkFiles(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}
