import type { Env } from "../types/env";
import { createPool } from "./db";
import {
  syncProtocolToIndex,
  syncExerciseToIndex,
  syncWikiToIndex,
} from "./contentIndexing";

/**
 * Reindexação assíncrona da base de conhecimento via Cloudflare Queues.
 *
 * Em vez de um request HTTP síncrono que roda por minutos (e arrisca timeout /
 * limite de subrequests do Worker), o endpoint admin enfileira 1 mensagem por
 * item e cada uma reindexa 1 documento no consumidor da fila — usando os syncs
 * per-item já testados (que aplicam chunking section-aware).
 */

export type KbSource = "protocols" | "exercises" | "wiki";

export interface ReindexKbItemPayload {
  source: KbSource;
  id: string;
}

export interface ReindexKbItemTask {
  type: "REINDEX_KB_ITEM";
  payload: ReindexKbItemPayload;
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildReindexMessages(
  source: KbSource,
  ids: string[],
): { body: ReindexKbItemTask }[] {
  return ids.map((id) => ({ body: { type: "REINDEX_KB_ITEM", payload: { source, id } } }));
}

const ID_QUERIES: Record<KbSource, string> = {
  protocols: `SELECT id FROM exercise_protocols WHERE is_public = true`,
  exercises: `SELECT id FROM exercises WHERE is_public = true AND is_active = true`,
  wiki: `SELECT id FROM wiki_pages WHERE is_public = true`,
};

/** Enfileira a reindexação de todos os itens dos tipos pedidos. Retorna quantos por tipo. */
export async function enqueueKbReindex(
  env: Env,
  types: KbSource[] = ["protocols", "exercises", "wiki"],
): Promise<Record<string, number>> {
  const pool = createPool(env);
  const counts: Record<string, number> = {};
  for (const source of types) {
    const res = await pool.query<{ id: string }>(ID_QUERIES[source]);
    const ids = res.rows.map((r) => r.id);
    const messages = buildReindexMessages(source, ids);
    // Queues aceita até 100 mensagens por sendBatch.
    for (const batch of chunkArray(messages, 100)) {
      await env.BACKGROUND_QUEUE.sendBatch(batch);
    }
    counts[source] = ids.length;
  }
  return counts;
}

/** Processa 1 item da fila reindexando o documento correspondente (com chunking). */
export async function reindexKbItem(payload: ReindexKbItemPayload, env: Env): Promise<void> {
  switch (payload.source) {
    case "protocols":
      await syncProtocolToIndex(env, payload.id);
      break;
    case "exercises":
      await syncExerciseToIndex(env, payload.id);
      break;
    case "wiki":
      await syncWikiToIndex(env, payload.id);
      break;
  }
}
