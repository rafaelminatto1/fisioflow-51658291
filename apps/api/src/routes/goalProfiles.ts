/**
 * Rotas: Goal Profiles Admin
 *
 * GET    /api/goal-profiles              — list (org + global)
 * GET    /api/goal-profiles/:id          — get one
 * POST   /api/goal-profiles              — create (DRAFT)
 * PUT    /api/goal-profiles/:id          — update
 * POST   /api/goal-profiles/:id/publish  — publish (DRAFT → PUBLISHED)
 * DELETE /api/goal-profiles/:id          — delete
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  const result = await pool.query(
    `SELECT * FROM goal_profiles
     WHERE organization_id = $1 OR organization_id IS NULL
     ORDER BY status, name`,
    [user.organizationId],
  );
  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `SELECT * FROM goal_profiles
     WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

app.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const id = String(body.id || "").trim();
  if (!id) return c.json({ error: "id é obrigatório" }, 400);

  const result = await pool.query(
    `INSERT INTO goal_profiles
       (id, organization_id, name, description, applicable_tests,
        quality_gate, targets, clinician_notes_template, patient_notes_template,
        evidence, default_pinned_metric_keys, tags, status, version)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, 'DRAFT', 1)
     ON CONFLICT (id) DO NOTHING
     RETURNING *`,
    [
      id,
      user.organizationId,
      String(body.name || "").trim() || "Perfil sem nome",
      body.description ?? null,
      JSON.stringify(body.applicable_tests ?? body.applicableTests ?? []),
      body.quality_gate != null || body.qualityGate != null
        ? JSON.stringify(body.quality_gate ?? body.qualityGate)
        : null,
      JSON.stringify(body.targets ?? []),
      body.clinician_notes_template ?? body.clinicianNotesTemplate ?? null,
      body.patient_notes_template ?? body.patientNotesTemplate ?? null,
      JSON.stringify(body.evidence ?? []),
      JSON.stringify(body.default_pinned_metric_keys ?? body.defaultPinnedMetricKeys ?? []),
      JSON.stringify(body.tags ?? []),
    ],
  );

  if (!result.rows.length) return c.json({ error: "ID já existe" }, 409);
  return c.json({ data: result.rows[0] }, 201);
});

app.put("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;

  const check = await pool.query(
    "SELECT id FROM goal_profiles WHERE id = $1 AND organization_id = $2",
    [id, user.organizationId],
  );
  if (!check.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);

  const fields: string[] = [];
  const values: unknown[] = [id, user.organizationId];
  let idx = 3;

  const maybeSet = (col: string, val: unknown, jsonb = false) => {
    if (val === undefined) return;
    fields.push(`${col} = $${idx++}${jsonb ? "::jsonb" : ""}`);
    values.push(jsonb ? JSON.stringify(val) : val);
  };

  maybeSet("name", body.name);
  maybeSet("description", body.description);
  maybeSet("applicable_tests", body.applicable_tests ?? body.applicableTests, true);
  maybeSet("quality_gate", body.quality_gate ?? body.qualityGate, true);
  maybeSet("targets", body.targets, true);
  maybeSet(
    "clinician_notes_template",
    body.clinician_notes_template ?? body.clinicianNotesTemplate,
  );
  maybeSet("patient_notes_template", body.patient_notes_template ?? body.patientNotesTemplate);
  maybeSet("evidence", body.evidence, true);
  maybeSet(
    "default_pinned_metric_keys",
    body.default_pinned_metric_keys ?? body.defaultPinnedMetricKeys,
    true,
  );
  maybeSet("tags", body.tags, true);

  if (!fields.length) return c.json({ error: "Nenhum campo para atualizar" }, 400);
  fields.push("updated_at = NOW()");

  const result = await pool.query(
    `UPDATE goal_profiles SET ${fields.join(", ")} WHERE id = $1 AND organization_id = $2 RETURNING *`,
    values,
  );
  return c.json({ data: result.rows[0] });
});

app.post("/:id/publish", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `UPDATE goal_profiles
     SET status = 'PUBLISHED', published_at = NOW(), version = version + 1, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    "DELETE FROM goal_profiles WHERE id = $1 AND organization_id = $2 RETURNING id",
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);
  return c.json({ ok: true });
});

export { app as goalProfilesRoutes };
