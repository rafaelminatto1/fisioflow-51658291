import { requireAuth } from '../../lib/auth';
import { createPool, getRawSql, type DbRow } from "../../lib/db";
import { determineOutcomeCategory, getAgeGroup, hashPatientId, roundTo } from '../mlHelpers';
import { parseDate, type AnalyticsRouteApp } from './shared';

const AGE_GROUP_RANGES: Record<string, [number, number]> = {
  '0-17': [0, 17],
  '18-30': [18, 30],
  '31-50': [31, 50],
  '51-65': [51, 65],
  '65+': [65, 120],
};

const matchesAgeGroup = (ageGroup: string | undefined, minAge?: number, maxAge?: number): boolean => {
  if (!ageGroup) return true;
  if (!minAge && !maxAge) return true;
  const range = AGE_GROUP_RANGES[ageGroup];
  if (!range) return true;
  const [lower, upper] = range;
  if (minAge && upper < minAge) return false;
  if (maxAge && lower > maxAge) return false;
  return true;
};

export const registerMlAnalyticsRoutes = (app: AnalyticsRouteApp) => {
  app.get('/ml-training-data/patient/:patientId', requireAuth, async (c) => {
    const { patientId } = c.req.param();
    const user = c.get('user');
    const pool = await createPool(c.env);
    const salt = c.env.ML_SALT ?? c.env.VITE_ML_SALT ?? 'fisioflow-ml-salt';

    interface PatientRow extends DbRow {
      birth_date: string | Date | null;
      gender: string | null;
      created_at: string | Date | null;
    }

    const patientRes = await pool.query<PatientRow>(
      `
        SELECT birth_date, gender, created_at
        FROM patients
        WHERE id = $1 AND organization_id = $2
      `,
      [patientId, user.organizationId],
    );

    if (patientRes.rows.length === 0) {
      return c.json({ error: 'Paciente não encontrado' }, 404);
    }

    const patient = patientRes.rows[0];
    interface MetricRow extends DbRow {
      pain_level_before: number | null;
      pain_level_after: number | null;
      functional_score_before: number | null;
      functional_score_after: number | null;
      patient_satisfaction: number | null;
      session_date: string | Date | null;
    }

    const sessionsRes = await pool.query<MetricRow>(
      `
        SELECT pain_level_before, pain_level_after, functional_score_before, functional_score_after,
               patient_satisfaction, session_date
        FROM patient_session_metrics
        WHERE patient_id = $1 AND organization_id = $2
        ORDER BY session_date ASC
      `,
      [patientId, user.organizationId],
    );
    const sessions = sessionsRes.rows;

    const appointmentsRes = await pool.query(
      `
        SELECT status
        FROM appointments
        WHERE patient_id = $1 AND organization_id = $2
      `,
      [patientId, user.organizationId],
    );

    const pathologiesRes = await pool.query(
      `
        SELECT name, status, is_primary, created_at
        FROM patient_pathologies
        WHERE patient_id = $1 AND organization_id = $2
        ORDER BY is_primary DESC, created_at DESC
      `,
      [patientId, user.organizationId],
    );

    const totalSessions = sessions.length;
    const completedAppointments = (appointmentsRes.rows ?? []).filter((row) =>
      ['atendido', 'avaliacao', 'completed', 'realizado', 'concluido'].includes(String(row.status ?? '').toLowerCase()),
    );
    const totalAppointments = appointmentsRes.rows.length;
    const attendanceRate =
      totalAppointments > 0 ? completedAppointments.length / totalAppointments : 0;

    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];
    const initialPain = Number(firstSession?.pain_level_before ?? 0);
    const finalPain = Number(lastSession?.pain_level_after ?? initialPain);
    const initialFunction = Number(firstSession?.functional_score_before ?? 0);
    const finalFunction = Number(lastSession?.functional_score_after ?? initialFunction);

    const painReduction = initialPain > 0 ? ((initialPain - finalPain) / initialPain) * 100 : 0;
    const functionalImprovement =
      initialFunction < 100
        ? ((finalFunction - initialFunction) / (100 - initialFunction)) * 100
        : 0;

    const satisfactionSum = sessions.reduce(
      (sum, session) => sum + Number(session.patient_satisfaction ?? 0),
      0,
    );
    const avgSatisfaction = totalSessions > 0 ? satisfactionSum / totalSessions : 0;

    const firstDate = firstSession?.session_date ? new Date(firstSession.session_date) : new Date();
    const lastDate = lastSession?.session_date ? new Date(lastSession.session_date) : new Date();
    const weeksActive =
      totalSessions > 0
        ? Math.max(
            1,
            Math.abs(lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
          )
        : 1;
    const sessionFrequency = totalSessions / weeksActive;

    const primaryPathology =
      pathologiesRes.rows.find((row) => row.status === 'ativo')?.name ||
      pathologiesRes.rows[0]?.name ||
      'unknown';
    const chronicCondition = pathologiesRes.rows.some((row) => row.status === 'cronico');

    const startPeriod = patient.created_at ?? new Date().toISOString();
    const endPeriod = lastSession?.session_date
      ? new Date(lastSession.session_date).toISOString()
      : new Date().toISOString();

    const trainingData = {
      patient_hash: await hashPatientId(patientId, salt),
      age_group: getAgeGroup(patient.birth_date),
      gender: patient.gender ?? 'unknown',
      primary_pathology: primaryPathology,
      chronic_condition: chronicCondition,
      baseline_pain_level: roundTo(initialPain, 1),
      baseline_functional_score: roundTo(initialFunction, 1),
      treatment_type: 'physical_therapy',
      session_frequency_weekly: roundTo(sessionFrequency, 1),
      total_sessions: totalSessions,
      attendance_rate: roundTo(attendanceRate, 2),
      home_exercise_compliance: 0.5,
      portal_login_frequency: 0.1,
      outcome_category: determineOutcomeCategory(
        totalSessions,
        painReduction,
        functionalImprovement,
      ),
      sessions_to_discharge: totalSessions,
      pain_reduction_percentage: roundTo(painReduction, 1),
      functional_improvement_percentage: roundTo(functionalImprovement, 1),
      patient_satisfaction_score: roundTo(avgSatisfaction, 1),
      data_collection_period_start: startPeriod,
      data_collection_period_end: endPeriod,
      created_at: new Date().toISOString(),
    };

    return c.json({ data: trainingData });
  });

  app.get('/ml-training-data/patients', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 50), 1), 200);
    const rows = await pool.query(
      `
        SELECT id, created_at
        FROM patients
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [user.organizationId, limitValue],
    );

    return c.json({ data: rows.rows });
  });

  app.get('/ml-training-data/stats', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const rows = await pool.query(
      `
        SELECT outcome_category, age_group, pain_reduction_percentage, functional_improvement_percentage
        FROM ml_training_data
        WHERE organization_id = $1
      `,
      [user.organizationId],
    );
    const records = rows.rows;
    const totalRecords = records.length;

    const outcomeCounts = records.reduce<Record<string, number>>((acc, row) => {
      const key = row.outcome_category ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const ageDistribution = records.reduce<Record<string, number>>((acc, row) => {
      const key = row.age_group ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const avgPainReduction =
      totalRecords > 0
        ? roundTo(
            records.reduce(
              (sum, row) => sum + Number(row.pain_reduction_percentage ?? 0),
              0,
            ) / totalRecords,
            1,
          )
        : 0;

    const avgFunctionalImprovement =
      totalRecords > 0
        ? roundTo(
            records.reduce(
              (sum, row) => sum + Number(row.functional_improvement_percentage ?? 0),
              0,
            ) / totalRecords,
            1,
          )
        : 0;

    const successRate =
      totalRecords > 0 ? roundTo(((outcomeCounts.success ?? 0) / totalRecords) * 100, 1) : 0;

    return c.json({
      data: {
        totalRecords,
        outcomeCounts,
        ageDistribution,
        avgPainReduction,
        avgFunctionalImprovement,
        successRate,
      },
    });
  });

  app.get('/ml-training-data/similar', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const condition = c.req.query('condition');
    const minAge = Number(c.req.query('minAge') ?? 0);
    const maxAge = Number(c.req.query('maxAge') ?? 0);
    const limitValue = Math.min(Math.max(Number(c.req.query('limit') ?? 50), 1), 200);

    if (!condition) {
      return c.json({ data: [] });
    }

    const rows = await pool.query(
      `
        SELECT *
        FROM ml_training_data
        WHERE organization_id = $1 AND primary_pathology = $2
        ORDER BY created_at DESC
        LIMIT $3
      `,
      [user.organizationId, condition, limitValue],
    );

    const candidates = rows.rows.filter((row) =>
      matchesAgeGroup(row.age_group, minAge || undefined, maxAge || undefined),
    );

    return c.json({ data: candidates });
  });

  app.post('/ml-training-data', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const payload = (await c.req.json()) as Record<string, unknown>;
    const columns = [
      'patient_hash',
      'age_group',
      'gender',
      'primary_pathology',
      'chronic_condition',
      'baseline_pain_level',
      'baseline_functional_score',
      'treatment_type',
      'session_frequency_weekly',
      'total_sessions',
      'attendance_rate',
      'home_exercise_compliance',
      'portal_login_frequency',
      'outcome_category',
      'sessions_to_discharge',
      'pain_reduction_percentage',
      'functional_improvement_percentage',
      'patient_satisfaction_score',
      'data_collection_period_start',
      'data_collection_period_end',
      'created_at',
    ];

    const values = columns.map((column) => payload[column] ?? null);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const updateClause = columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');

    const insertRes = await pool.query(
      `
        INSERT INTO ml_training_data (${columns.join(', ')}, organization_id, updated_at)
        VALUES (${placeholders}, $${columns.length + 1}, NOW())
        ON CONFLICT (organization_id, patient_hash)
        DO UPDATE SET ${updateClause}, updated_at = NOW()
        RETURNING *
      `,
      [...values, user.organizationId],
    );

    return c.json({ data: insertRes.rows[0] });
  });

  app.post('/patient-predictions/upsert', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const body = (await c.req.json()) as {
      patient_id?: string;
      predictions?: Array<Record<string, unknown>>;
    };

    if (!body.patient_id || !Array.isArray(body.predictions)) {
      return c.json({ error: 'patient_id e predictions são obrigatórios' }, 400);
    }

    const client = pool as any;
    try {
      await client.query('BEGIN');
      await client.query(
        `
          UPDATE patient_predictions
          SET is_active = false, updated_at = NOW()
          WHERE patient_id = $1 AND organization_id = $2 AND is_active = true
        `,
        [body.patient_id, user.organizationId],
      );

      const inserted: Record<string, unknown>[] = [];

      for (const prediction of body.predictions) {
        const res = await client.query(
          `
            INSERT INTO patient_predictions (
              patient_id, organization_id, prediction_type, prediction_date, features,
              predicted_value, predicted_class, confidence_score, confidence_interval,
              target_date, timeframe_days, model_version, model_name,
              is_active, milestones, risk_factors, treatment_recommendations, similar_cases,
              created_at, updated_at
            ) VALUES (
              $1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
            ) RETURNING *
          `,
          [
            body.patient_id,
            user.organizationId,
            prediction.prediction_type,
            prediction.features ?? {},
            prediction.predicted_value ?? null,
            prediction.predicted_class ?? null,
            prediction.confidence_score ?? 0,
            prediction.confidence_interval ?? null,
            prediction.target_date ?? null,
            prediction.timeframe_days ?? null,
            prediction.model_version ?? 'custom',
            prediction.model_name ?? null,
            true,
            prediction.milestones ?? [],
            prediction.risk_factors ?? [],
            prediction.treatment_recommendations ?? {},
            prediction.similar_cases ?? {},
          ],
        );
        inserted.push(res.rows[0]);
      }

      await client.query('COMMIT');
      return c.json({ data: inserted });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  app.get('/population-health', requireAuth, async (c) => {
    const pool = await createPool(c.env);
    const user = c.get('user');
    const startDate = parseDate(c.req.query('startDate')) ?? new Date().toISOString().split('T')[0];
    const endDate = parseDate(c.req.query('endDate')) ?? new Date().toISOString().split('T')[0];

    const patientsRes = await pool.query(
      `
        SELECT id, full_name, gender, created_at, birth_date
        FROM patients
        WHERE organization_id = $1
          AND created_at BETWEEN $2::timestamp AND $3::timestamp
      `,
      [user.organizationId, `${startDate}T00:00:00`, `${endDate}T23:59:59`],
    );

    const mlRes = await pool.query(
      `
        SELECT *
        FROM ml_training_data
        WHERE organization_id = $1
          AND data_collection_period_start >= $2::date
          AND data_collection_period_end <= $3::date
        ORDER BY created_at DESC
        LIMIT 500
      `,
      [user.organizationId, startDate, endDate],
    );

    const appointmentsRes = await pool.query(
      `
        SELECT id, patient_id, date, status, type
        FROM appointments
        WHERE organization_id = $1
          AND date BETWEEN $2::date AND $3::date
        ORDER BY date ASC
      `,
      [user.organizationId, startDate, endDate],
    );

    return c.json({
      data: {
        patients: patientsRes.rows,
        mlData: mlRes.rows,
        appointments: appointmentsRes.rows,
        totalRecords:
          (patientsRes.rowCount ?? 0) + (mlRes.rowCount ?? 0) + (appointmentsRes.rowCount ?? 0),
      },
    });
  });
};
