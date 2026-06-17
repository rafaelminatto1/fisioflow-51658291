import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";
import { jsonSerialize } from "../lib/utils";
import { hermesJson } from "../lib/ai/hermes";
import { EXTRACT_BLOCKS_SYSTEM, coerceBlocks } from "../lib/evolution/extractBlocks";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// POST /api/evolution/extract-blocks { text } → blocos estruturados (via Hermes)
app.post("/extract-blocks", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text ?? "").trim();
  if (text.length < 10) return c.json({ error: "Texto muito curto" }, 400);
  try {
    const raw = await hermesJson(c.env, EXTRACT_BLOCKS_SYSTEM, text.slice(0, 4000));
    return c.json({ data: coerceBlocks(raw) });
  } catch (e) {
    return c.json({ error: "Falha na extração", details: (e as Error).message }, 500);
  }
});

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
  observacao: row.observacao ?? "",
  observacao_preview: row.observacao_preview ?? "",
  pain_scale: row.pain_scale,
  procedures: row.procedures ?? [],
  exercises: row.exercises ?? [],
  measurements: row.measurements ?? [],
  home_exercises: row.home_exercises ?? [],
  status: row.status,
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
        observacao,
        LEFT(regexp_replace(coalesce(observacao,''), E'<[^>]+>', ' ', 'g'), 240) AS observacao_preview,
        pain_scale,
        procedures,
        exercises,
        measurements,
        home_exercises,
        status,
        created_at, updated_at
      FROM sessions
      WHERE patient_id = $1 AND organization_id = $2 AND deleted_at IS NULL
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

  // Modelo único pós-migração SOAP→observação. Aceita campos legados
  // (subjective/objective/assessment/plan/observations) concatenando-os em
  // `observacao`, e os novos canônicos diretos.
  const observacao =
    typeof body.observacao === "string"
      ? body.observacao
      : [body.subjective, body.objective, body.assessment, body.plan, body.observations]
          .filter((v) => v != null && String(v).trim())
          .map((v) => String(v))
          .join("\n\n") || null;

  const painScale =
    body.pain_scale != null
      ? Number(body.pain_scale)
      : body.pain_level_before != null
        ? Number(body.pain_level_before)
        : null;

  const procedures = Array.isArray(body.procedures) ? body.procedures : [];
  const exercises = Array.isArray(body.exercises)
    ? body.exercises
    : Array.isArray(body.exercises_performed)
      ? body.exercises_performed
      : [];
  const measurements = Array.isArray(body.measurements) ? body.measurements : [];
  const homeExercises = Array.isArray(body.home_exercises) ? body.home_exercises : [];

  let result;

  const values = [
    patientId,
    therapistId,
    appointmentId,
    sessionDate,
    observacao,
    painScale,
    jsonSerialize(procedures),
    jsonSerialize(exercises),
    jsonSerialize(measurements),
    jsonSerialize(homeExercises),
    user.organizationId,
    "finalized",
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
          observacao      = $5,
          pain_scale      = $6,
          procedures      = $7::jsonb,
          exercises       = $8::jsonb,
          measurements    = $9::jsonb,
          home_exercises  = $10::jsonb,
          status          = $12,
          updated_at      = NOW()
        WHERE id = $13
        RETURNING *
      `,
      [...values, existing.rows[0].id],
    );
  } else {
    result = await pool.query(
      `
        INSERT INTO sessions (
          patient_id, therapist_id, appointment_id, date,
          observacao, pain_scale, procedures, exercises, measurements, home_exercises,
          organization_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)
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
    `SELECT id, observacao, pain_scale, procedures, exercises, measurements, home_exercises
       FROM sessions WHERE id = $1 AND organization_id = $2 LIMIT 1`,
    [id, user.organizationId],
  );
  if (!existing.rows.length) return c.json({ error: "Sessão não encontrada" }, 404);

  const session = existing.rows[0];
  const sessionDate = parseIsoDate(body.session_date ?? body.date);

  // Modelo único pós-migração. Permite atualizar `observacao` direto OU
  // concatenar campos legados (subjective/objective/assessment/plan/observations)
  // em `observacao` quando o cliente ainda envia o shape antigo.
  let observacao = session.observacao ?? "";
  if (typeof body.observacao === "string") {
    observacao = body.observacao;
  } else {
    const legacyParts = [
      body.subjective,
      body.objective,
      body.assessment,
      body.plan,
      body.observations,
    ]
      .filter((v) => v != null && String(v).trim())
      .map((v) => String(v));
    if (legacyParts.length) observacao = legacyParts.join("\n\n");
  }

  let painScale: number | null = session.pain_scale ?? null;
  if (body.pain_scale !== undefined && body.pain_scale !== null) {
    painScale = Number(body.pain_scale);
  } else if (body.pain_level_before !== undefined) {
    painScale = Number(body.pain_level_before);
  }

  const procedures = Array.isArray(body.procedures) ? body.procedures : (session.procedures ?? []);
  const exercises = Array.isArray(body.exercises)
    ? body.exercises
    : Array.isArray(body.exercises_performed)
      ? body.exercises_performed
      : (session.exercises ?? []);
  const measurements = Array.isArray(body.measurements)
    ? body.measurements
    : (session.measurements ?? []);
  const homeExercises = Array.isArray(body.home_exercises)
    ? body.home_exercises
    : (session.home_exercises ?? []);

  const row = await pool.query(
    `
      UPDATE sessions SET
        observacao      = $1,
        pain_scale      = $2,
        procedures      = $3::jsonb,
        exercises       = $4::jsonb,
        measurements    = $5::jsonb,
        home_exercises  = $6::jsonb,
        date            = COALESCE($7, date),
        updated_at      = NOW()
      WHERE id = $8
      RETURNING *
    `,
    [
      observacao || null,
      painScale,
      jsonSerialize(procedures),
      jsonSerialize(exercises),
      jsonSerialize(measurements),
      jsonSerialize(homeExercises),
      sessionDate,
      id,
    ],
  );

  return c.json({ data: mapTreatmentSession(row.rows[0]) });
});

export { app as evolutionRoutes };
