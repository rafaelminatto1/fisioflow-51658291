import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const parseIsoDate = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

const jsonSerialize = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

app.get('/treatment-sessions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 20), 1), 200);
  const rows = await pool.query(
    `
      SELECT *
      FROM treatment_sessions
      WHERE patient_id = $1 AND organization_id = $2
      ORDER BY session_date DESC, created_at DESC
      LIMIT $3
    `,
    [patientId, user.organizationId, limitValue],
  );

  return c.json({ data: rows.rows.map(mapTreatmentSession) });
});

app.get('/measurements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const patientId = c.req.query('patientId');
  if (!patientId) return c.json({ error: 'patientId é obrigatório' }, 400);

  const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 0), 0), 200);
  const params: Array<string | number> = [patientId, user.organizationId];
  let limitClause = '';
  if (limitValue > 0) {
    limitClause = 'LIMIT $3';
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

app.post('/measurements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const patientId = String(body.patient_id ?? '').trim();
  const measurementType = String(body.measurement_type ?? '').trim();
  const measurementName = String(body.measurement_name ?? '').trim();

  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);
  if (!measurementType || !measurementName) {
    return c.json({ error: 'measurement_type e measurement_name são obrigatórios' }, 400);
  }

  const measuredAt = parseIsoDate(body.measured_at) ?? new Date().toISOString().split('T')[0];
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

app.get('/required-measurements', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const pathologiesParam = c.req.query('pathologies') ?? '';
  const pathologies = pathologiesParam
    .split(',')
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

app.post('/treatment-sessions', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const patientId = String(body.patient_id ?? '').trim();
  const appointmentId = String(body.appointment_id ?? '').trim();
  const therapistId = String(body.therapist_id ?? user.uid).trim();

  if (!patientId) return c.json({ error: 'patient_id é obrigatório' }, 400);
  if (!appointmentId) return c.json({ error: 'appointment_id é obrigatório' }, 400);

  const sessionDate = parseIsoDate(body.session_date) ?? new Date().toISOString().split('T')[0];
  const objectiveJson = jsonSerialize(body.objective);
  const values = [
    patientId,
    therapistId || user.uid,
    appointmentId,
    sessionDate,
    body.subjective ? String(body.subjective) : null,
    objectiveJson,
    body.assessment ? String(body.assessment) : null,
    body.plan ? String(body.plan) : null,
    body.observations ? String(body.observations) : null,
    jsonSerialize(body.exercises_performed) ?? '[]',
    Number(body.pain_level_before ?? 0),
    Number(body.pain_level_after ?? 0),
    user.organizationId,
  ];

  const existing = await pool.query(
    `SELECT id FROM treatment_sessions WHERE appointment_id = $1 AND organization_id = $2 LIMIT 1`,
    [appointmentId, user.organizationId],
  );

  let result;
  if (existing.rows.length) {
    const row = await pool.query(
      `
        UPDATE treatment_sessions SET
          patient_id         = $1,
          therapist_id       = $2,
          session_date       = $4,
          subjective         = $5,
          objective          = $6::jsonb,
          assessment         = $7,
          plan               = $8,
          observations       = $9,
          exercises_performed = $10::jsonb,
          pain_level_before  = $11,
          pain_level_after   = $12,
          updated_at         = NOW()
        WHERE id = $13
        RETURNING *
      `,
      [...values.slice(0, 12), existing.rows[0].id],
    );
    result = row;
  } else {
    const row = await pool.query(
      `
        INSERT INTO treatment_sessions (
          patient_id,
          therapist_id,
          appointment_id,
          session_date,
          subjective,
          objective,
          assessment,
          plan,
          observations,
          exercises_performed,
          pain_level_before,
          pain_level_after,
          organization_id
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11, $12, $13)
        RETURNING *
      `,
      values,
    );
    result = row;
  }

  return c.json({ data: mapTreatmentSession(result.rows[0]) });
});

export { app as evolutionRoutes };
