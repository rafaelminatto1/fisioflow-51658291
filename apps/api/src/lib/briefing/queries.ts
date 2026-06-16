import type { BriefingAppointment, BriefingRaw } from "./buildBriefing";

type Sql = (q: string, params?: unknown[]) => Promise<{ rows: any[] }>;

export async function gatherBriefingData(sql: Sql, orgId: string): Promise<BriefingRaw> {
  const today = await sql(
    `SELECT id, start_time, status, patient_id
       FROM appointments
      WHERE organization_id = $1 AND date = CURRENT_DATE
      ORDER BY start_time ASC NULLS LAST`,
    [orgId],
  );
  const noShows = await sql(
    `SELECT count(*)::int AS n
       FROM appointments
      WHERE organization_id = $1 AND date = CURRENT_DATE - INTERVAL '1 day'
        AND status LIKE 'faltou%'`,
    [orgId],
  );
  const inactive = await sql(
    `SELECT count(*)::int AS n
       FROM patients p
      WHERE p.organization_id = $1
        AND (p.status = 'ativo' OR p.status IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM sessions s
           WHERE s.patient_id = p.id
             AND s.date > now() - INTERVAL '30 days'
        )`,
    [orgId],
  );

  const appointmentsToday: BriefingAppointment[] = (today.rows ?? []).map((r) => ({
    id: String(r.id),
    startTime: r.start_time ?? null,
    status: r.status ?? "agendado",
    patientId: r.patient_id ?? null,
  }));

  return {
    date: new Date().toISOString().slice(0, 10),
    appointmentsToday,
    noShowsYesterday: noShows.rows?.[0]?.n ?? 0,
    inactivePatients: inactive.rows?.[0]?.n ?? 0,
  };
}
