import type { Env } from "../types/env";
import { createPool } from "./db";
import { deleteIndexedItemsByFilenames } from "./wikiIndexing";

const MAX_NOTE_INDEX_CHARS = 24_000;

export function noteIndexFilename(noteId: string): string {
  return `notes/${noteId}.md`;
}

/** Só notas sem contexto clínico ou classificação restrita podem sair do Neon. */
export function isNoteIndexable(note: {
  classification: string;
  sensitivity: string;
  patient_id: string | null;
  deleted_at: Date | string | null;
}): boolean {
  return !note.deleted_at && !note.patient_id && note.classification !== "clinical" && note.sensitivity === "internal";
}

export async function syncNoteToSemanticIndex(
  env: Env,
  payload: { noteId: string; organizationId: string },
): Promise<void> {
  if (!env.AI_SEARCH?.items) return;
  const pool = createPool(env, undefined, "read");
  const result = await pool.query<{
    id: string;
    organization_id: string;
    title: string;
    type: string;
    classification: string;
    sensitivity: string;
    patient_id: string | null;
    content_text: string | null;
    tags: string[] | null;
    deleted_at: Date | null;
  }>(
    `SELECT id, organization_id, title, type, classification, sensitivity, patient_id,
            LEFT(content_text, $3) AS content_text, tags, deleted_at
     FROM notes WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [payload.noteId, payload.organizationId, MAX_NOTE_INDEX_CHARS],
  );
  const note = result.rows[0];
  const filename = noteIndexFilename(payload.noteId);
  if (!note || !isNoteIndexable(note)) {
    await deleteIndexedItemsByFilenames(env, [filename]);
    return;
  }

  const markdown = [
    `# ${note.title}`,
    `Tipo: ${note.type}`,
    note.tags?.length ? `Tags: ${note.tags.join(", ")}` : "",
    note.content_text ?? "",
  ].filter(Boolean).join("\n\n");

  // Upsert explícito: evita resultados obsoletos quando uma nota é atualizada.
  await deleteIndexedItemsByFilenames(env, [filename]);
  await env.AI_SEARCH.items.upload(filename, markdown, {
    metadata: {
      source: "notes",
      organization_id: note.organization_id,
      note_id: note.id,
      type: note.type,
      title: note.title,
    },
  });
}
