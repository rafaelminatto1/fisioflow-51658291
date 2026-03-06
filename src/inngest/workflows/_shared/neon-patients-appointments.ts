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
