import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const { patientId, therapistId, startDate, endDate, responded } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT * FROM satisfaction_surveys WHERE organization_id = $1`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;

  if (patientId) {
    sql += ` AND patient_id = $${idx++}`;
    params.push(patientId);
  }
  if (therapistId) {
    sql += ` AND therapist_id = $${idx++}`;
    params.push(therapistId);
  }
  if (startDate) {
    sql += ` AND sent_at >= $${idx++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND sent_at <= $${idx++}`;
    params.push(endDate);
  }
  if (responded === "true") {
    sql += ` AND responded_at IS NOT NULL`;
  } else if (responded === "false") {
    sql += ` AND responded_at IS NULL`;
  }

  sql += " ORDER BY sent_at DESC";

  const result = await db.query(sql, params);
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.get("/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const db = await createPool(c.env);

  const result = await db.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(responded_at) AS responded_count,
       ROUND(AVG(nps_score) FILTER (WHERE nps_score IS NOT NULL), 1) AS avg_nps,
       ROUND(AVG(q_care_quality) FILTER (WHERE q_care_quality IS NOT NULL), 1) AS avg_care_quality,
       ROUND(AVG(q_professionalism) FILTER (WHERE q_professionalism IS NOT NULL), 1) AS avg_professionalism,
       ROUND(AVG(q_communication) FILTER (WHERE q_communication IS NOT NULL), 1) AS avg_communication,
       COUNT(*) FILTER (WHERE nps_score >= 9) AS promotores,
       COUNT(*) FILTER (WHERE nps_score BETWEEN 7 AND 8) AS neutros,
       COUNT(*) FILTER (WHERE nps_score <= 6) AS detratores
     FROM satisfaction_surveys WHERE organization_id = $1`,
    [user.organizationId],
  );
  const row = result.rows[0];
  const total = Number(row.total);
  const respondedCount = Number(row.responded_count);
  const promotores = Number(row.promotores);
  const detratores = Number(row.detratores);
  const nps =
    respondedCount > 0 ? Math.round(((promotores - detratores) / respondedCount) * 100) : 0;

  return c.json({
    data: {
      total,
      responded_count: respondedCount,
      response_rate: total > 0 ? Math.round((respondedCount / total) * 100) : 0,
      nps,
      promotores,
      neutros: Number(row.neutros),
      detratores,
      avg_nps: Number(row.avg_nps),
      avg_care_quality: Number(row.avg_care_quality),
      avg_professionalism: Number(row.avg_professionalism),
      avg_communication: Number(row.avg_communication),
    },
  });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO satisfaction_surveys
       (organization_id, patient_id, appointment_id, therapist_id, nps_score,
        q_care_quality, q_professionalism, q_facility_cleanliness, q_scheduling_ease,
        q_communication, comments, suggestions, responded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW()) RETURNING *`,
    [
      user.organizationId,
      body.patient_id,
      body.appointment_id ?? null,
      body.therapist_id ?? null,
      body.nps_score ?? null,
      body.q_care_quality ?? null,
      body.q_professionalism ?? null,
      body.q_facility_cleanliness ?? null,
      body.q_scheduling_ease ?? null,
      body.q_communication ?? null,
      body.comments ?? null,
      body.suggestions ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  const body = await c.req.json();
  const db = await createPool(c.env);

  const allowed = [
    "nps_score",
    "q_care_quality",
    "q_professionalism",
    "q_facility_cleanliness",
    "q_scheduling_ease",
    "q_communication",
    "comments",
    "suggestions",
    "responded_at",
  ];
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = $${idx++}`);
      params.push(body[key]);
    }
  }
  if (!sets.length) return c.json({ error: "No fields to update" }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id, user.organizationId);

  const result = await db.query(
    `UPDATE satisfaction_surveys SET ${sets.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
    params,
  );
  if (!result.rowCount) return c.json({ error: "Not found" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  const db = await createPool(c.env);
  await db.query(`DELETE FROM satisfaction_surveys WHERE id = $1 AND organization_id = $2`, [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

export { app as satisfactionSurveysRoutes };
