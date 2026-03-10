import { neon } from '@neondatabase/serverless';

type NeonQueryClient = ReturnType<typeof neon>;

let cachedClient: NeonQueryClient | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL ausente para workflows Inngest (Neon).');
  }
  return url;
}

function getSql(): NeonQueryClient {
  if (!cachedClient) {
    cachedClient = neon(getDatabaseUrl());
  }
  return cachedClient;
}

function rowsFrom(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown[] }).rows)) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

export type NeonPatient = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  organization_id?: string;
  created_at?: string;
  birth_date?: string;
};

export type NeonAppointment = {
  id: string;
  patient_id: string;
  organization_id?: string;
  therapist_id?: string;
  date: string;
  start_time?: string;
  status?: string;
};

export type NeonOrganization = {
  id: string;
  name?: string;
  settings?: { email_enabled?: boolean; whatsapp_enabled?: boolean };
};

export type NeonProfile = {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
};

export async function getOrganizationsByIds(ids: string[]): Promise<Map<string, NeonOrganization>> {
  if (!ids.length) return new Map();
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        name,
        settings::jsonb AS settings
      FROM organizations
      WHERE id::text = ANY($1::text[])
    `,
    [Array.from(new Set(ids))],
  );

  const map = new Map<string, NeonOrganization>();
  for (const row of rowsFrom(result)) {
    map.set(String(row.id), row as unknown as NeonOrganization);
  }
  return map;
}

export async function getProfilesByIds(ids: string[]): Promise<Map<string, NeonProfile>> {
  if (!ids.length) return new Map();
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        full_name,
        email,
        role
      FROM profiles
      WHERE id::text = ANY($1::text[])
    `,
    [Array.from(new Set(ids))],
  );

  const map = new Map<string, NeonProfile>();
  for (const row of rowsFrom(result)) {
    map.set(String(row.id), row as unknown as NeonProfile);
  }
  return map;
}

export async function getActiveOrganizations(): Promise<NeonOrganization[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        name,
        settings::jsonb AS settings
      FROM organizations
      WHERE active = true
    `,
    [],
  );
  return rowsFrom(result) as NeonOrganization[];
}

export async function logNotificationHistory(data: {
  user_id: string;
  organization_id: string;
  type: string;
  channel: string;
  status: string;
  payload: any;
}): Promise<string> {
  const sql = getSql();
  const result = await sql.query(
    `
      INSERT INTO notification_history (
        user_id, organization_id, type, channel, status, data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
      RETURNING id::text
    `,
    [data.user_id, data.organization_id, data.type, data.channel, data.status, JSON.stringify(data.payload)],
  );
  return String(rowsFrom(result)[0]?.id);
}

export async function updateNotificationStatus(id: string, status: string, errorMessage?: string | null): Promise<void> {
  const sql = getSql();
  await sql.query(
    `
      UPDATE notification_history
      SET status = $1, sent_at = NOW(), error_message = $2
      WHERE id::text = $3
    `,
    [status, errorMessage, id],
  );
}

export async function getUserPushTokens(userId: string): Promise<string[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT token
      FROM user_push_tokens
      WHERE user_id::text = $1 AND active = true
    `,
    [userId],
  );
  return rowsFrom(result).map(r => String(r.token));
}

export async function getLatestSessionsByPatient(patientId: string, limit = 10): Promise<any[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        pain_level_after::int AS pain_level_after,
        created_at::text AS created_at,
        patient_id::text AS patient_id,
        subjective,
        objective,
        assessment,
        plan,
        status
      FROM soap_records
      WHERE patient_id::text = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [patientId, limit],
  );
  return rowsFrom(result);
}

export async function storePatientInsight(data: {
  patient_id: string;
  organization_id: string;
  insights: any;
}): Promise<void> {
  const sql = getSql();
  await sql.query(
    `
      INSERT INTO patient_insights (
        patient_id, organization_id, insights, generated_at
      ) VALUES ($1, $2, $3::jsonb, NOW())
    `,
    [data.patient_id, data.organization_id, JSON.stringify(data.insights)],
  );
}

export async function deleteOldRecords(table: string, timeColumn: string, days: number): Promise<number> {
  const sql = getSql();
  const result = await sql.query(
    `
      DELETE FROM ${table}
      WHERE ${timeColumn} < NOW() - ($1::int || ' days')::interval
      RETURNING id
    `,
    [days],
  );
  return rowsFrom(result).length;
}

export async function cleanupIncompleteSessions(days: number): Promise<number> {
  const sql = getSql();
  const result = await sql.query(
    `
      DELETE FROM soap_records
      WHERE status = 'in_progress'
        AND updated_at < NOW() - ($1::int || ' days')::interval
      RETURNING id
    `,
    [days],
  );
  return rowsFrom(result).length;
}

export async function getExpiringVouchers(daysFromNow: number): Promise<any[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        v.id::text AS id,
        v.expiration_date::text AS expiration_date,
        v.patient_id::text AS patient_id,
        v.organization_id::text AS organization_id,
        p.full_name AS patient_name,
        p.email AS patient_email,
        p.phone AS patient_phone,
        o.name AS organization_name
      FROM vouchers v
      JOIN patients p ON p.id = v.patient_id
      JOIN organizations o ON o.id = v.organization_id
      WHERE v.active = true
        AND v.expiration_date::date = (CURRENT_DATE + ($1::int || ' days')::interval)::date
    `,
    [daysFromNow],
  );
  return rowsFrom(result);
}

export async function getWeeklyStats(organizationId: string, startIso: string, endIso: string): Promise<{ totalSessions: number }> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT COUNT(*)::int AS total
      FROM soap_records
      WHERE organization_id::text = $1
        AND created_at >= $2::timestamptz
        AND created_at <= $3::timestamptz
    `,
    [organizationId, startIso, endIso],
  );
  return { totalSessions: Number(rowsFrom(result)[0]?.total ?? 0) };
}

export async function getAppointmentsForReminder(startDate: Date, endDateExclusive: Date): Promise<NeonAppointment[]> {
  const sql = getSql();
  const start = toIsoDate(startDate);
  const end = toIsoDate(endDateExclusive);

  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        patient_id::text AS patient_id,
        organization_id::text AS organization_id,
        therapist_id::text AS therapist_id,
        date::text AS date,
        start_time::text AS start_time,
        status::text AS status
      FROM appointments
      WHERE date >= $1::date
        AND date < $2::date
        AND lower(status::text) IN ('scheduled', 'confirmed', 'agendado', 'confirmado')
      ORDER BY date ASC, start_time ASC
    `,
    [start, end],
  );

  return rowsFrom(result) as NeonAppointment[];
}

export async function getAppointmentById(appointmentId: string): Promise<NeonAppointment | null> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        patient_id::text AS patient_id,
        organization_id::text AS organization_id,
        therapist_id::text AS therapist_id,
        date::text AS date,
        start_time::text AS start_time,
        status::text AS status
      FROM appointments
      WHERE id::text = $1
      LIMIT 1
    `,
    [appointmentId],
  );
  const rows = rowsFrom(result);
  return (rows[0] as NeonAppointment | undefined) ?? null;
}

export async function getExistingAppointmentIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT id::text AS id
      FROM appointments
      WHERE id::text = ANY($1::text[])
    `,
    [Array.from(new Set(ids))],
  );
  return new Set(rowsFrom(result).map((r) => String(r.id)));
}

export async function getPatientsByIds(ids: string[]): Promise<Map<string, NeonPatient>> {
  if (!ids.length) return new Map();
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        full_name,
        email,
        phone,
        organization_id::text AS organization_id,
        created_at::text AS created_at,
        birth_date::text AS birth_date
      FROM patients
      WHERE id::text = ANY($1::text[])
    `,
    [Array.from(new Set(ids))],
  );

  const map = new Map<string, NeonPatient>();
  for (const row of rowsFrom(result)) {
    map.set(String(row.id), row as unknown as NeonPatient);
  }
  return map;
}

export async function getPatientById(patientId: string): Promise<NeonPatient | null> {
  const map = await getPatientsByIds([patientId]);
  return map.get(patientId) ?? null;
}

export async function getActivePatients(): Promise<NeonPatient[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        full_name,
        email,
        phone,
        organization_id::text AS organization_id,
        created_at::text AS created_at,
        birth_date::text AS birth_date
      FROM patients
      WHERE is_active = true
    `,
    [],
  );
  return rowsFrom(result) as NeonPatient[];
}

export async function getLatestCompletedAppointmentByPatient(sinceDays = 60): Promise<Map<string, { date: string; status?: string }>> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT DISTINCT ON (patient_id)
        patient_id::text AS patient_id,
        date::text AS date,
        status::text AS status
      FROM appointments
      WHERE date >= (CURRENT_DATE - ($1::int || ' days')::interval)
        AND lower(status::text) IN ('completed', 'in_progress', 'realizado', 'concluido', 'attended')
      ORDER BY patient_id, date DESC
    `,
    [sinceDays],
  );

  const map = new Map<string, { date: string; status?: string }>();
  for (const row of rowsFrom(result)) {
    map.set(String(row.patient_id), {
      date: String(row.date),
      status: row.status ? String(row.status) : undefined,
    });
  }
  return map;
}

export async function countPatientsCreatedBetween(organizationId: string, startInclusiveIso: string, endExclusiveIso: string): Promise<number> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT COUNT(*)::int AS total
      FROM patients
      WHERE organization_id::text = $1
        AND created_at >= $2::timestamptz
        AND created_at < $3::timestamptz
    `,
    [organizationId, startInclusiveIso, endExclusiveIso],
  );
  const rows = rowsFrom(result);
  return Number(rows[0]?.total ?? 0);
}

export async function getPatientsByBirthdayMMDD(mmdd: string): Promise<NeonPatient[]> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT
        id::text AS id,
        full_name,
        email,
        phone,
        organization_id::text AS organization_id,
        created_at::text AS created_at,
        birth_date::text AS birth_date
      FROM patients
      WHERE is_active = true
        AND birth_date IS NOT NULL
        AND to_char(birth_date, 'MM-DD') = $1
    `,
    [mmdd],
  );
  return rowsFrom(result) as NeonPatient[];
}

export async function countOrphanedAppointments(limit = 100): Promise<number> {
  const sql = getSql();
  const result = await sql.query(
    `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT a.id
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE p.id IS NULL
        LIMIT $1
      ) t
    `,
    [limit],
  );
  const rows = rowsFrom(result);
  return Number(rows[0]?.total ?? 0);
}

export async function countOrphanedPatientsFromOrganizations(limit = 100): Promise<number> {
  const sql = getSql();
  const tableCheck = await sql.query(
    `SELECT to_regclass('public.organizations')::text AS table_name`,
    [],
  );
  const tableName = rowsFrom(tableCheck)[0]?.table_name;
  if (!tableName) return 0;

  const result = await sql.query(
    `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT p.id
        FROM patients p
        LEFT JOIN organizations o ON o.id::text = p.organization_id::text
        WHERE p.organization_id IS NOT NULL AND o.id IS NULL
        LIMIT $1
      ) t
    `,
    [limit],
  );
  const rows = rowsFrom(result);
  return Number(rows[0]?.total ?? 0);
}
