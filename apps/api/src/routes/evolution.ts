import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import { jsonSerialize } from "../lib/utils";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const parseIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
};

const mapMeasurement = (row: Record<string, unknown>) => ({
  id: row.id,
  patient_id: row.patient_id,
  measurement_type: row.measurement_type,
  measurement_name: row.measurement_name,
  value: row.value,
  unit: row.unit,
  notes: row.notes,
  custom_data: row.custom_data,
  measured_at: row.measured_at,
  created_by: row.created_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapTreatmentSession = (row: Record<string, unknown>) => ({
  id: row.id,
  patient_id: row.patient_id,
  therapist_id: row.therapist_id,
  appointment_id: row.appointment_id,
  session_date: row.session_date,
  subjective: row.subjective,
  objective: row.objective,
  assessment: row.assessment,
  plan: row.plan,
  observations: row.observations,
  exercises_performed: row.exercises_performed,
  pain_level_before: row.pain_level_before,
  pain_level_after: row.pain_level_after,
  next_session_goals: row.next_session_goals,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

app.get("/treatment-sessions", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  const limitValue = Math.min(Math.max(Number(c.req.query("limit") ?? 20), 1), 200);
  const rows = await pool.query(
    `
      SELECT
        id, patient_id, appointment_id, therapist_id, organization_id,
        date as session_date,
        subjective->>'notes' as subjective,
        objective,
        assessment->>'notes' as assessment,
        plan->>'notes' as plan,
        plan->>'nextSessionGoals' as next_session_goals,
        plan->>'orientations' as observations,
        plan->'exercises' as exercises_performed,
        (subjective->>'painScale')::int as pain_level_before,
        created_at, updated_at
      FROM sessions
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY date DESC, created_at DESC
      LIMIT $3
    `,
    [patientId, user.organizationId, limitValue],
  );

  return c.json({ data: rows.rows.map(mapTreatmentSession) });
});

app.get("/measurements", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const patientId = c.req.query("patientId");
  if (!patientId) return c.json({ error: "patientId é obrigatório" }, 400);

  const limitValue = Math.min(Math.max(Number(c.req.query("limit") ?? 0), 0), 200);
  const params: Array<string | number> = [patientId, user.organizationId];
  let limitClause = "";
  if (limitValue > 0) {
    limitClause = "LIMIT $3";
    params.push(limitValue);
  }

  const rows = await pool.query(
    `
      SELECT *
      FROM evolution_measurements
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY measured_at DESC
      ${limitClause}
    `,
    params,
  );

  return c.json({ data: rows.rows.map(mapMeasurement) });
});

app.post("/measurements", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const patientId = String(body.patient_id ?? "").trim();
  const measurementType = String(body.measurement_type ?? "").trim();
  const measurementName = String(body.measurement_name ?? "").trim();

  if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);
  if (!measurementType || !measurementName) {
    return c.json({ error: "measurement_type e measurement_name são obrigatórios" }, 400);
  }

  const measuredAt = parseIsoDate(body.measured_at) ?? new Date().toISOString().split("T")[0];
  const result = await pool.query(
    `
      INSERT INTO evolution_measurements (
        patient_id,
        organization_id,
        measurement_type,
        measurement_name,
        value,
        unit,
        notes,
        custom_data,
        measured_at,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz, $10)
      RETURNING *
    `,
    [
      patientId,
      user.organizationId,
      measurementType,
      measurementName,
      body.value ?? null,
      body.unit ?? null,
      body.notes ?? null,
      jsonSerialize(body.custom_data),
      measuredAt,
      user.uid,
    ],
  );

  return c.json({ data: mapMeasurement(result.rows[0]) });
});

app.get("/required-measurements", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const pathologiesParam = c.req.query("pathologies") ?? "";
  const pathologies = pathologiesParam
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (pathologies.length === 0) {
    return c.json({ data: [] });
  }

  const rows = await pool.query(
    `
      SELECT
        id,
        pathology_name,
        measurement_name,
        measurement_unit,
        alert_level,
        instructions,
        created_at,
        updated_at
      FROM pathology_required_measurements
      WHERE pathology_name = ANY($1) AND organization_id = $2
      ORDER BY pathology_name ASC, measurement_name ASC
    `,
    [pathologies, user.organizationId],
  );

  return c.json({ data: rows.rows });
});

app.post("/treatment-sessions", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const patientId = String(body.patient_id ?? "").trim();
  const appointmentId = body.appointment_id ? String(body.appointment_id).trim() : null;
  const therapistId = String(body.therapist_id ?? user.uid).trim();

  if (!patientId) return c.json({ error: "patient_id é obrigatório" }, 400);

  const sessionDate = parseIsoDate(body.session_date) ?? new Date().toISOString().split("T")[0];

  // Map to new schema (JSONB)
  const subjective = jsonSerialize({
    notes: body.subjective ? String(body.subjective) : undefined,
    painScale: body.pain_level_before != null ? Number(body.pain_level_before) : undefined,
  });
  const objective = jsonSerialize(body.objective);
  const assessment = jsonSerialize({
    notes: body.assessment ? String(body.assessment) : undefined,
  });
  const plan = jsonSerialize({
    notes: body.plan ? String(body.plan) : undefined,
    orientations: body.observations ? String(body.observations) : undefined,
    exercises: body.exercises_performed,
    nextSessionGoals: body.next_session_goals,
  });

  let result;

  const values = [
    patientId,
    therapistId,
    appointmentId,
    sessionDate,
    subjective,
    objective,
    assessment,
    plan,
    user.organizationId,
    "finalized", // Status set to finalized on create for simplicity in this migration
  ];

  const existing = appointmentId
    ? await pool.query(
        `SELECT id FROM sessions WHERE appointment_id = $1 AND organization_id = $2 LIMIT 1`,
        [appointmentId, user.organizationId],
      )
    : { rows: [] };

  if (existing.rows.length) {
    result = await pool.query(
      `
        UPDATE sessions SET
          patient_id      = $1,
          therapist_id    = $2,
          date            = $4,
          subjective      = $5::jsonb,
          objective       = $6::jsonb,
          assessment      = $7::jsonb,
          plan            = $8::jsonb,
          status          = $10,
          updated_at      = NOW()
        WHERE id = $11
        RETURNING *
      `,
      [...values, existing.rows[0].id],
    );
  } else {
    result = await pool.query(
      `
        INSERT INTO sessions (
          patient_id, therapist_id, appointment_id, date,
          subjective, objective, assessment, plan, organization_id, status
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)
        RETURNING *
      `,
      values,
    );

    // --- AUTOMATION: Create Medical Report Task ---
    try {
      const patientRes = await pool.query(`SELECT full_name FROM patients WHERE id = $1 LIMIT 1`, [
        patientId,
      ]);
      const patientName = patientRes.rows[0]?.full_name || "Desconhecido";

      await pool.query(
        `INSERT INTO tarefas (organization_id, created_by, responsavel_id, titulo, descricao, status, prioridade, tipo, data_vencimento)
         VALUES ($1, $2, $3, $4, $5, 'A_FAZER', 'ALTA', 'TAREFA', NOW() + INTERVAL '2 days')`,
        [
          user.organizationId,
          user.uid,
          therapistId,
          `Relatório Médico - ${patientName}`,
          "Gerar relatório médico detalhado baseado na última evolução clínica.",
        ],
      );
    } catch (e) {
      console.error("Error creating automation task:", e);
    }
  }

  // --- TRIGGER AI WORKFLOW ---
  if (c.env.WORKFLOW_SESSION_SUMMARY) {
    try {
      await c.env.WORKFLOW_SESSION_SUMMARY.create({
        params: {
          sessionId: result.rows[0].id,
          patientId,
          orgId: user.organizationId,
        },
      });
    } catch (e) {
      console.error("Error triggering SessionSummaryWorkflow:", e);
    }
  }

  return c.json({ data: mapTreatmentSession(result.rows[0]) });
});

// PATCH /treatment-sessions/:id — atualiza uma sessão existente pelo ID
app.patch("/treatment-sessions/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const id = c.req.param("id");
  const body = (await c.req.json()) as Record<string, unknown>;

  const existing = await pool.query(
    `SELECT id FROM treatment_sessions WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );
  if (!existing.rows.length) return c.json({ error: "Sessão não encontrada" }, 404);

  const sessionDate = parseIsoDate(body.session_date ?? body.date);
  const objectiveJson = jsonSerialize(body.objective);

  const row = await pool.query(
    `
      UPDATE treatment_sessions SET
        subjective          = COALESCE($1, subjective),
        objective           = COALESCE($2::jsonb, objective),
        assessment          = COALESCE($3, assessment),
        plan                = COALESCE($4, plan),
        observations        = COALESCE($5, observations),
        pain_level_before   = COALESCE($6, pain_level_before),
        pain_level_after    = COALESCE($7, pain_level_after),
        session_date        = COALESCE($8, session_date),
        updated_at          = NOW()
      WHERE id = $9
      RETURNING *
    `,
    [
      body.subjective != null ? String(body.subjective) : null,
      objectiveJson,
      body.assessment != null ? String(body.assessment) : null,
      body.plan != null ? String(body.plan) : null,
      body.observations != null ? String(body.observations) : null,
      body.pain_level_before != null ? Number(body.pain_level_before) : null,
      body.pain_level_after != null ? Number(body.pain_level_after) : null,
      sessionDate,
      id,
    ],
  );

  return c.json({ data: mapTreatmentSession(row.rows[0]) });
});

export { app as evolutionRoutes };
