import type { Env } from "../types/env";
import { createPool } from "./db";

/** Chaves dos chunks órfãos a apagar quando um doc passa de oldN para newN chunks. */
export function chunksToDelete(baseFilename: string, oldN: number, newN: number): string[] {
  const base = baseFilename.replace(/\.md$/, "");
  const out: string[] = [];
  for (let i = newN; i < oldN; i++) out.push(`${base}--${i}.md`);
  return out;
}

export async function getChunkCount(env: Env, docKey: string): Promise<number> {
  const pool = createPool(env);
  const res = await pool.query<{ chunk_count: number }>(
    `SELECT chunk_count FROM kb_index_chunks WHERE doc_key = $1`,
    [docKey],
  );
  return res.rows[0]?.chunk_count ?? 0;
}

export async function setChunkCount(
  env: Env,
  docKey: string,
  source: string,
  count: number,
): Promise<void> {
  const pool = createPool(env);
  await pool.query(
    `INSERT INTO kb_index_chunks (doc_key, source, chunk_count, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (doc_key) DO UPDATE SET chunk_count = EXCLUDED.chunk_count, updated_at = now()`,
    [docKey, source, count],
  );
}

export async function deleteChunkState(env: Env, docKey: string): Promise<void> {
  const pool = createPool(env);
  await pool.query(`DELETE FROM kb_index_chunks WHERE doc_key = $1`, [docKey]);
}
