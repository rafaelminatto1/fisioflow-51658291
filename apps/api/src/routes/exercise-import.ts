import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types/env";
import type { AuthVariables } from "../lib/auth";
import { requireAuth } from "../lib/auth";
import { getRawSql } from "../lib/db";
import { runAi } from "../lib/ai-native";
import { ingestFreeExerciseDb } from "../lib/exerciseImport/ingest";
import { embedExercise } from "../lib/exerciseImport/embed";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

interface CandidateRow {
  name: string;
  name_en: string | null;
  difficulty: string | null;
  muscles_primary: string[];
  muscles_secondary: string[];
  equipment: string[];
  body_parts: string[];
  instructions: string | null;
  category: string | null;
  image_urls: string[];
  source: string;
  source_id: string | null;
  source_url: string | null;
  source_license: string | null;
}

export function buildPromoteInsert(
  c: CandidateRow,
  reviewerUid: string,
): { text: string; params: unknown[] } {
  return {
    text: `INSERT INTO exercises
      (name, name_en, difficulty, muscles_primary, muscles_secondary, equipment, body_parts,
       instructions, image_url, is_public, review_status, source, source_id, source_url, source_license,
       reviewed_by, reviewed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10,$11,$12,$13,$14,$15, now())
      RETURNING id`,
    params: [
      c.name,
      c.name_en,
      c.difficulty,
      c.muscles_primary,
      c.muscles_secondary,
      c.equipment,
      c.body_parts,
      c.instructions,
      c.image_urls?.[0] ?? null,
      "approved",
      c.source,
      c.source_id,
      c.source_url,
      c.source_license,
      reviewerUid,
    ],
  };
}

function isAdmin(role?: string): boolean {
  return role === "admin";
}

app.post("/ingest", requireAuth, async (c) => {
  if (!isAdmin(c.get("user").role)) return c.json({ error: "Apenas admin" }, 403);
  const sql = getRawSql(c.env, "write");
  const result = await ingestFreeExerciseDb((q, p) => sql(q, p));
  return c.json(result);
});

app.get("/candidates", requireAuth, async (c) => {
  const status = z
    .enum(["pending", "approved", "rejected"])
    .catch("pending")
    .parse(c.req.query("status"));
  const sql = getRawSql(c.env, "read");
  const res = await sql(
    `SELECT * FROM exercise_import_candidates WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
    [status],
  );
  return c.json({ data: res.rows ?? [] });
});

app.post("/candidates/:id/approve", requireAuth, async (c) => {
  const user = c.get("user");
  if (!isAdmin(user.role)) return c.json({ error: "Apenas admin" }, 403);
  const id = c.req.param("id");
  const sql = getRawSql(c.env, "write");
  const found = await sql(`SELECT * FROM exercise_import_candidates WHERE id = $1`, [id]);
  const row = found.rows?.[0] as CandidateRow | undefined;
  if (!row) return c.json({ error: "Candidato não encontrado" }, 404);

  const ins = buildPromoteInsert(row, user.uid);
  const created = await sql(ins.text, ins.params);
  const newId = (created.rows?.[0] as { id: string })?.id;

  await sql(
    `UPDATE exercise_import_candidates
       SET status='approved', reviewed_by=$1, reviewed_at=now(), promoted_exercise_id=$2 WHERE id=$3`,
    [user.uid, newId, id],
  );

  try {
    const vec = await embedExercise(
      { name: row.name, musclesPrimary: row.muscles_primary ?? [], instructions: row.instructions ?? "" },
      (model, input) => runAi(c.env, model, input) as Promise<{ data?: number[][] }>,
    );
    if (vec) {
      await sql(`UPDATE exercises SET embedding = $1 WHERE id = $2`, [JSON.stringify(vec), newId]);
    }
  } catch (e) {
    console.error("[exercise-import] embedding failed", e);
  }

  return c.json({ ok: true, exerciseId: newId });
});

app.post("/candidates/:id/reject", requireAuth, async (c) => {
  const user = c.get("user");
  if (!isAdmin(user.role)) return c.json({ error: "Apenas admin" }, 403);
  const id = c.req.param("id");
  const sql = getRawSql(c.env, "write");
  await sql(
    `UPDATE exercise_import_candidates SET status='rejected', reviewed_by=$1, reviewed_at=now() WHERE id=$2`,
    [user.uid, id],
  );
  return c.json({ ok: true });
});

export default app;
