import type { Env } from "../types/env";
import { createPool } from "./db";
import { deleteIndexedItemsByFilenames } from "./wikiIndexing";
import { chunkClinicalDoc, type DocMeta } from "./ai/sectionChunker";
import { chunksToDelete, getChunkCount, setChunkCount, deleteChunkState } from "./kbIndexState";

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

/** Apaga chunks órfãos por chave exata (só quando o doc encolheu). Best-effort. */
async function cleanupOldChunks(env: Env, baseFilename: string, newCount: number): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const docKey = baseFilename;
  const oldCount = await getChunkCount(env, docKey).catch(() => 0);
  const keys = chunksToDelete(baseFilename, oldCount, newCount);
  for (const key of keys) {
    try {
      const listing = await env.AI_SEARCH.items.list({ key, source: "builtin", per_page: 1 } as any);
      const items: Array<{ id: string }> = listing?.result ?? listing?.items ?? [];
      await Promise.all(items.map((it) => env.AI_SEARCH!.items.delete(it.id)));
    } catch (error) {
      console.warn(`[contentIndexing] orphan cleanup skipped for ${key}:`, error);
    }
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

export function wikiIndexFilename(id: string): string {
  return `wiki/${id}.md`;
}

function buildWikiIndexDoc(row: {
  title: string;
  content: string | null;
  category: string | null;
}): string {
  const parts: string[] = [`# ${row.title}`];
  if (row.category) parts.push(`**Categoria:** ${row.category}`);
  if (row.content) parts.push(`\n${row.content}`);
  return parts.join("\n");
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

export async function indexExercise(env: Env, exerciseId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
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
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "exercises", files.length);
}

export async function syncExerciseToIndex(env: Env, exerciseId: string): Promise<void> {
  try {
    await indexExercise(env, exerciseId);
  } catch (error) {
    console.error(`[contentIndexing] exercise sync failed for ${exerciseId}:`, error);
  }
}

export async function indexProtocol(env: Env, protocolId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
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
    { source: "protocols", id: row.id, title: row.name, condition: row.condition_name ?? "" },
  );
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "protocols", files.length);
}

export async function syncProtocolToIndex(env: Env, protocolId: string): Promise<void> {
  try {
    await indexProtocol(env, protocolId);
  } catch (error) {
    console.error(`[contentIndexing] protocol sync failed for ${protocolId}:`, error);
  }
}

export async function indexWiki(env: Env, wikiId: string): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const pool = createPool(env);
  const res = await pool.query<{ id: string; title: string; content: string | null; category: string | null }>(
    `SELECT wp.id, wp.title, LEFT(wp.content, 3000) AS content, wc.name AS category
     FROM wiki_pages wp
     LEFT JOIN wiki_categories wc ON wc.id = wp.category_id
     WHERE wp.id = $1`,
    [wikiId],
  );
  const row = res.rows[0];
  if (!row) {
    await removeWikiFromIndex(env, wikiId);
    return;
  }
  const base = wikiIndexFilename(row.id);
  const files = buildIndexChunks(
    base,
    buildWikiIndexDoc(row),
    { status: "current", sourceType: "wiki", specialty: row.category ?? undefined },
    { source: "wiki", id: row.id, title: row.title, category: row.category ?? "" },
  );
  await cleanupOldChunks(env, base, files.length);
  await uploadChunks(env, files);
  await setChunkCount(env, base, "wiki", files.length);
}

export async function syncWikiToIndex(env: Env, wikiId: string): Promise<void> {
  try {
    await indexWiki(env, wikiId);
  } catch (error) {
    console.error(`[contentIndexing] wiki sync failed for ${wikiId}:`, error);
  }
}

async function removeChunksByCount(env: Env, base: string): Promise<void> {
  const count = await getChunkCount(env, base).catch(() => 0);
  for (const key of chunksToDelete(base, count, 0)) {
    try {
      const listing = await env.AI_SEARCH?.items.list({ key, source: "builtin", per_page: 1 } as any);
      const items: Array<{ id: string }> = listing?.result ?? listing?.items ?? [];
      await Promise.all(items.map((it) => env.AI_SEARCH!.items.delete(it.id)));
    } catch {
      /* best-effort */
    }
  }
  await deleteChunkState(env, base).catch(() => {});
}

export async function removeExerciseFromIndex(env: Env, exerciseId: string): Promise<void> {
  const base = exerciseIndexFilename(exerciseId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}

export async function removeProtocolFromIndex(env: Env, protocolId: string): Promise<void> {
  const base = protocolIndexFilename(protocolId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}

export async function removeWikiFromIndex(env: Env, wikiId: string): Promise<void> {
  const base = wikiIndexFilename(wikiId);
  await removeChunksByCount(env, base);
  await deleteIndexedItemsByFilenames(env, [base]);
}
