import { mapFreeExerciseDb } from "./mapFreeExerciseDb";
import type { ExerciseCandidate } from "./types";

const SOURCE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

type Sql = (q: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;

export async function ingestFreeExerciseDb(sql: Sql): Promise<{ fetched: number; inserted: number }> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`free-exercise-db fetch failed: ${res.status}`);
  const data = (await res.json()) as unknown[];

  const seen = new Set<string>();
  const candidates: ExerciseCandidate[] = [];
  for (const rec of data) {
    const c = mapFreeExerciseDb(rec);
    if (seen.has(c.sourceId)) continue;
    seen.add(c.sourceId);
    candidates.push(c);
  }

  for (const c of candidates) {
    await sql(
      `INSERT INTO exercise_import_candidates
         (dedup_key, source, source_id, source_url, source_license, name, name_en, difficulty,
          muscles_primary, muscles_secondary, equipment, body_parts, instructions, category, image_urls, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (source, source_id) DO NOTHING`,
      [
        c.dedupKey, c.source, c.sourceId, c.sourceUrl, c.sourceLicense, c.name, c.nameEn, c.difficulty,
        c.musclesPrimary, c.musclesSecondary, c.equipment, c.bodyParts, c.instructions, c.category,
        c.imageUrls, JSON.stringify(c.raw),
      ],
    );
  }
  return { fetched: data.length, inserted: candidates.length };
}
