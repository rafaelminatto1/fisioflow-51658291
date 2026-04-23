import { Hono } from "hono";
import { createDb } from "../../lib/db";
import { sql } from "drizzle-orm";
import type { Env } from "../../types/env";
import type { AuthUser } from "../../lib/auth";

const app = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// Simple regex UUID validation fallback if utils/validation is missing
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

app.post("/bulk", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, "read");
	const body = await c.req.json().catch(() => ({}));
	const patientIds = body.patientIds;

	if (!Array.isArray(patientIds) || patientIds.length === 0) {
		return c.json({ data: {} });
	}

	const validIds = patientIds.filter(isUuid);
	if (validIds.length === 0) {
		return c.json({ data: {} });
	}

	try {
		// Construir lista de IDs para o PostgreSQL (ex: 'uuid1','uuid2')
		const idsString = validIds.map((id) => `'${id}'`).join(",");

		// Realiza toda a matemática em uma única query otimizada no Postgres
		// Essa abordagem substitui dezenas de requisições e processamento no cliente.
		const result = await db.execute(sql`
			WITH patient_appointments AS (
				SELECT
					patient_id,
					COUNT(*) AS total_appointments,
					COUNT(*) FILTER (WHERE status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS completed_appointments,
					COUNT(*) FILTER (WHERE status IN ('faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'no_show', 'nao_atendido')) AS no_show_count,
					COUNT(*) FILTER (WHERE status IN ('cancelado', 'cancelled', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'no_show', 'nao_atendido', 'remarcar', 'remarcado', 'rescheduled')) AS missed_count,
					COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND (status NOT IN ('cancelado', 'cancelled', 'atendido', 'avaliacao', 'completed', 'realizado', 'concluido', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show', 'remarcar', 'remarcado', 'rescheduled') OR status IS NULL)) AS upcoming_count,
					COUNT(*) FILTER (WHERE payment_status = 'pending' AND status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS unpaid_count,
					MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_appointment_date,
					MIN(date) FILTER (WHERE status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS first_appointment_date
				FROM appointments
				WHERE organization_id = ${user.organizationId}::uuid
				  AND patient_id IN (SELECT unnest(string_to_array(${idsString}, ','))::uuid)
				  AND deleted_at IS NULL
				GROUP BY patient_id
			),
			patient_sessions AS (
				SELECT
					patient_id,
					COUNT(*) AS sessions_completed,
					MIN(date) AS first_session_date
				FROM sessions
				WHERE organization_id = ${user.organizationId}::uuid
				  AND patient_id IN (SELECT unnest(string_to_array(${idsString}, ','))::uuid)
				  AND status = 'finalized'
				GROUP BY patient_id
			)
			SELECT
				p.id AS patient_id,
				COALESCE(ps.sessions_completed, 0) AS sessions_completed,
				COALESCE(pa.total_appointments, 0) AS total_appointments,
				LEAST(pa.first_appointment_date, ps.first_session_date) AS first_evaluation_date,
				pa.last_appointment_date AS last_appointment_date,
				EXTRACT(DAY FROM (CURRENT_DATE - pa.last_appointment_date))::int AS days_since_last_appointment,
				COALESCE(pa.unpaid_count, 0) AS unpaid_sessions_count,
				COALESCE(pa.no_show_count, 0) AS no_show_count,
				COALESCE(pa.missed_count, 0) AS missed_appointments_count,
				COALESCE(pa.upcoming_count, 0) AS upcoming_appointments_count
			FROM patients p
			LEFT JOIN patient_appointments pa ON pa.patient_id = p.id
			LEFT JOIN patient_sessions ps ON ps.patient_id = p.id
			WHERE p.organization_id = ${user.organizationId}::uuid
			  AND p.id IN (SELECT unnest(string_to_array(${idsString}, ','))::uuid);
		`);

		// Mapear resultado para um dicionário pelo ID do paciente
		const statsMap: Record<string, any> = {};

		for (const row of result.rows) {
			// Calcular classificação baseado nos limites e lógicas
			const noShowCount = Number(row.no_show_count);
			const unpaidCount = Number(row.unpaid_sessions_count);
			const sessionsCompleted = Number(row.sessions_completed);
			const totalAppointments = Number(row.total_appointments);
			const upcomingCount = Number(row.upcoming_appointments_count);
			const daysSince = row.days_since_last_appointment !== null ? Number(row.days_since_last_appointment) : 0;

			let classification = "active";

			if (unpaidCount > 0 && noShowCount > 0) {
				classification = "has_unpaid";
			} else if (noShowCount >= 3) {
				classification = "no_show_risk";
			} else if (sessionsCompleted === 0 && totalAppointments === 0) {
				classification = "new_patient";
			} else if (upcomingCount > 0) {
				classification = "active";
			} else if (daysSince >= 60) {
				classification = "inactive_custom";
			} else if (daysSince >= 30) {
				classification = "inactive_30";
			} else if (daysSince >= 7) {
				classification = "inactive_7";
			}

			statsMap[row.patient_id as string] = {
				sessionsCompleted,
				totalAppointments,
				firstEvaluationDate: row.first_evaluation_date ? String(row.first_evaluation_date) : undefined,
				lastAppointmentDate: row.last_appointment_date ? String(row.last_appointment_date) : undefined,
				daysSinceLastAppointment: daysSince,
				unpaidSessionsCount: unpaidCount,
				noShowCount,
				missedAppointmentsCount: Number(row.missed_appointments_count),
				upcomingAppointmentsCount: upcomingCount,
				classification
			};
		}

		// Garantir que todos os IDs solicitados tenham uma resposta, mesmo se vazia
		for (const id of validIds) {
			if (!statsMap[id]) {
				statsMap[id] = {
					sessionsCompleted: 0,
					totalAppointments: 0,
					daysSinceLastAppointment: 0,
					unpaidSessionsCount: 0,
					noShowCount: 0,
					missedAppointmentsCount: 0,
					upcomingAppointmentsCount: 0,
					classification: "new_patient"
				};
			}
		}

		return c.json({ data: statsMap });
	} catch (error) {
		console.error("[Patients/Stats/Bulk] Error:", error);
		return c.json({ error: "Erro ao calcular estatísticas", data: {} }, 500);
	}
});

export { app as patientStatsRoutes };

app.get("/:id/detailed-stats", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, "read");
	const patientId = c.req.param("id");

	if (!isUuid(patientId)) {
		return c.json({ error: "ID inválido" }, 400);
	}

	try {
		const result = await db.execute(sql`
			WITH patient_appointments AS (
				SELECT
					patient_id,
					COUNT(*) AS total_appointments,
					COUNT(*) FILTER (WHERE status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS completed_appointments,
					COUNT(*) FILTER (WHERE status IN ('faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'no_show', 'nao_atendido')) AS no_show_count,
					COUNT(*) FILTER (WHERE status IN ('cancelado', 'cancelled', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'no_show', 'nao_atendido', 'remarcar', 'remarcado', 'rescheduled')) AS missed_count,
					COUNT(*) FILTER (WHERE date >= CURRENT_DATE AND (status NOT IN ('cancelado', 'cancelled', 'atendido', 'avaliacao', 'completed', 'realizado', 'concluido', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso', 'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show', 'remarcar', 'remarcado', 'rescheduled') OR status IS NULL)) AS upcoming_count,
					COUNT(*) FILTER (WHERE payment_status = 'pending' AND status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS unpaid_count,
					MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_appointment_date,
					MIN(date) FILTER (WHERE status IN ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')) AS first_appointment_date
				FROM appointments
				WHERE organization_id = ${user.organizationId}::uuid
				  AND patient_id = ${patientId}::uuid
				  AND deleted_at IS NULL
				GROUP BY patient_id
			),
			patient_sessions AS (
				SELECT
					patient_id,
					COUNT(*) AS sessions_completed,
					MIN(date) AS first_session_date
				FROM sessions
				WHERE organization_id = ${user.organizationId}::uuid
				  AND patient_id = ${patientId}::uuid
				  AND status = 'finalized'
				GROUP BY patient_id
			)
			SELECT
				p.id AS patient_id,
				COALESCE(ps.sessions_completed, 0) AS sessions_completed,
				COALESCE(pa.total_appointments, 0) AS total_appointments,
				LEAST(pa.first_appointment_date, ps.first_session_date) AS first_evaluation_date,
				pa.last_appointment_date AS last_appointment_date,
				EXTRACT(DAY FROM (CURRENT_DATE - pa.last_appointment_date))::int AS days_since_last_appointment,
				COALESCE(pa.unpaid_count, 0) AS unpaid_sessions_count,
				COALESCE(pa.no_show_count, 0) AS no_show_count,
				COALESCE(pa.missed_count, 0) AS missed_appointments_count,
				COALESCE(pa.upcoming_count, 0) AS upcoming_appointments_count
			FROM patients p
			LEFT JOIN patient_appointments pa ON pa.patient_id = p.id
			LEFT JOIN patient_sessions ps ON ps.patient_id = p.id
			WHERE p.organization_id = ${user.organizationId}::uuid
			  AND p.id = ${patientId}::uuid;
		`);

		if (!result.rows || result.rows.length === 0) {
			return c.json({
				data: {
					sessionsCompleted: 0,
					totalAppointments: 0,
					daysSinceLastAppointment: 0,
					unpaidSessionsCount: 0,
					noShowCount: 0,
					missedAppointmentsCount: 0,
					upcomingAppointmentsCount: 0,
					classification: "new_patient"
				}
			});
		}

		const row = result.rows[0];

		const noShowCount = Number(row.no_show_count);
		const unpaidCount = Number(row.unpaid_sessions_count);
		const sessionsCompleted = Number(row.sessions_completed);
		const totalAppointments = Number(row.total_appointments);
		const upcomingCount = Number(row.upcoming_appointments_count);
		const daysSince = row.days_since_last_appointment !== null ? Number(row.days_since_last_appointment) : 0;

		let classification = "active";

		if (unpaidCount > 0 && noShowCount > 0) {
			classification = "has_unpaid";
		} else if (noShowCount >= 3) {
			classification = "no_show_risk";
		} else if (sessionsCompleted === 0 && totalAppointments === 0) {
			classification = "new_patient";
		} else if (upcomingCount > 0) {
			classification = "active";
		} else if (daysSince >= 60) {
			classification = "inactive_custom";
		} else if (daysSince >= 30) {
			classification = "inactive_30";
		} else if (daysSince >= 7) {
			classification = "inactive_7";
		}

		const stats = {
			sessionsCompleted,
			totalAppointments,
			firstEvaluationDate: row.first_evaluation_date ? String(row.first_evaluation_date) : undefined,
			lastAppointmentDate: row.last_appointment_date ? String(row.last_appointment_date) : undefined,
			daysSinceLastAppointment: daysSince,
			unpaidSessionsCount: unpaidCount,
			noShowCount,
			missedAppointmentsCount: Number(row.missed_appointments_count),
			upcomingAppointmentsCount: upcomingCount,
			classification
		};

		return c.json({ data: stats });
	} catch (error) {
		console.error("[Patients/Stats/Single] Error:", error);
		return c.json({ error: "Erro ao calcular estatísticas", data: {} }, 500);
	}
});
