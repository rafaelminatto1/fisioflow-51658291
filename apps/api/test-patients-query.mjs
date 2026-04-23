import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("No DATABASE_URL found");

const sql = neon(dbUrl);

async function run() {
  const orgId = "00000000-0000-0000-0000-000000000000"; // Dummy UUID
  try {
    const res = await sql`
			WITH appointment_agg AS (
				SELECT
					a.patient_id,
					COUNT(*)::int AS total_appointments,
					COUNT(*) FILTER (
						WHERE LOWER(COALESCE(a.status, '')) IN ('atendido', 'realizado', 'completed', 'concluido', 'concluído')
					)::int AS completed_appointments,
					COUNT(*) FILTER (
						WHERE LOWER(COALESCE(a.status, '')) IN ('faltou', 'faltou_sem_aviso', 'faltou_com_aviso', 'no_show', 'missed')
					)::int AS no_show_count,
					COUNT(*) FILTER (
						WHERE a.date >= CURRENT_DATE
							AND LOWER(COALESCE(a.status, '')) IN ('agendado', 'avaliacao', 'presenca_confirmada', 'scheduled', 'confirmed')
					)::int AS upcoming_appointments,
					MAX(a.date) AS last_appointment_date,
					MIN(a.date) FILTER (
						WHERE a.date >= CURRENT_DATE
							AND LOWER(COALESCE(a.status, '')) IN ('agendado', 'avaliacao', 'presenca_confirmada', 'scheduled', 'confirmed')
					) AS next_appointment_date,
					COUNT(*) FILTER (
						WHERE LOWER(COALESCE(a.payment_status, '')) = 'pending'
							AND LOWER(COALESCE(a.status, '')) IN ('atendido', 'realizado', 'completed', 'concluido', 'concluído')
					)::int AS unpaid_appointments
				FROM appointments a
				WHERE a.organization_id = ${orgId}::uuid
				GROUP BY a.patient_id
			),
			pathology_agg AS (
				SELECT
					pp.patient_id,
					ARRAY_REMOVE(ARRAY_AGG(DISTINCT pp.name), NULL) AS pathology_names,
					ARRAY_REMOVE(
						ARRAY_AGG(
							DISTINCT CASE
								WHEN LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')
									THEN pp.name
								ELSE NULL
							END
						),
						NULL
					) AS active_pathology_names,
					ARRAY_REMOVE(ARRAY_AGG(DISTINCT LOWER(COALESCE(pp.status, ''))), NULL) AS pathology_statuses,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')) AS has_active_pathology,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('monitoramento', 'monitoring', 'cronico', 'crônico')) AS has_monitor_pathology,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('resolvido', 'treated', 'tratada', 'tratado', 'alta')) AS has_treated_pathology,
					MIN(pp.name) FILTER (
						WHERE LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')
					) AS primary_pathology
				FROM patient_pathologies pp
				WHERE pp.organization_id = ${orgId}::uuid
				GROUP BY pp.patient_id
			),
			surgery_agg AS (
				SELECT
					ps.patient_id,
					TRUE AS has_surgery,
					BOOL_OR(ps.surgery_date >= CURRENT_DATE - INTERVAL '90 days') AS recent_surgery
				FROM patient_surgeries ps
				WHERE ps.organization_id = ${orgId}::uuid
				GROUP BY ps.patient_id
			),
			finance_agg AS (
				SELECT
					cf.patient_id,
					COUNT(*) FILTER (
						WHERE LOWER(COALESCE(cf.status, '')) IN ('pendente', 'pending', 'aberto', 'open')
					)::int AS open_count,
					COUNT(*) FILTER (
						WHERE LOWER(COALESCE(cf.status, '')) IN ('pendente', 'pending', 'aberto', 'open')
							AND cf.data_vencimento < CURRENT_DATE
					)::int AS overdue_count,
					COALESCE(SUM(
						CASE
							WHEN LOWER(COALESCE(cf.tipo, '')) = 'receita'
								THEN cf.valor::numeric
							ELSE 0::numeric
						END
					), 0::numeric) AS receivable_total,
					COALESCE(SUM(
						CASE
							WHEN LOWER(COALESCE(cf.status, '')) IN ('pendente', 'pending', 'aberto', 'open')
								THEN cf.valor::numeric
							ELSE 0::numeric
						END
					), 0::numeric) AS open_amount
				FROM contas_financeiras cf
				WHERE cf.organization_id = ${orgId}::uuid
					AND COALESCE(cf.deleted_at IS NULL, TRUE)
					AND cf.patient_id IS NOT NULL
				GROUP BY cf.patient_id
			),
			payments_agg AS (
				SELECT
					pg.patient_id,
					COALESCE(SUM(pg.valor::numeric), 0::numeric) AS paid_total
				FROM pagamentos pg
				WHERE pg.organization_id = ${orgId}::uuid
					AND COALESCE(pg.deleted_at IS NULL, TRUE)
					AND pg.patient_id IS NOT NULL
				GROUP BY pg.patient_id
			),
			unbilled_agg AS (
				SELECT
					a.patient_id,
					COUNT(*)::int AS unbilled_count
				FROM appointments a
				LEFT JOIN contas_financeiras cf
					ON cf.appointment_id = a.id
					AND cf.organization_id = a.organization_id
					AND COALESCE(cf.deleted_at IS NULL, TRUE)
				LEFT JOIN pagamentos pg
					ON pg.appointment_id = a.id
					AND pg.organization_id = a.organization_id
					AND COALESCE(pg.deleted_at IS NULL, TRUE)
				WHERE a.organization_id = ${orgId}::uuid
					AND LOWER(COALESCE(a.status, '')) IN ('atendido', 'realizado', 'completed', 'concluido', 'concluído')
					AND a.package_id IS NULL
					AND cf.id IS NULL
					AND pg.id IS NULL
				GROUP BY a.patient_id
			),
			directory_rows AS (
				SELECT
					p.id,
					p.organization_id AS "organizationId",
					p.full_name AS "fullName",
					p.nickname,
					p.social_name AS "socialName",
					p.photo_url AS "photoUrl",
					p.email,
					p.phone,
					p.phone_secondary AS "phoneSecondary",
					p.cpf,
					p.rg,
					p.gender,
					p.status,
					p.is_active AS "isActive",
					p.created_at AS "createdAt",
					p.updated_at AS "updatedAt",
					p.origin,
					p.referred_by AS "referredBy",
					p.profile_id AS "profileId",
					p.user_id AS "userId",
					p.professional_id AS "professionalId",
					p.professional_name AS "professionalName",
					p.progress,
					p.blood_type AS "bloodType",
					p.weight_kg AS "weightKg",
					p.height_cm AS "heightCm",
					p.marital_status AS "maritalStatus",
					p.education_level AS "educationLevel",
					p.session_value AS "sessionValue",
					p.consent_data AS "consentData",
					p.consent_image AS "consentImage",
					p.incomplete_registration AS "incompleteRegistration",
					p.address,
					p.emergency_contact AS "emergencyContact",
					p.insurance,
					p.date_of_birth AS "birthDate",
					p.observations,
					p.notes,
					COALESCE((p.insurance ->> 'provider'), NULL) AS "healthInsurance",
					COALESCE(p.main_condition, pathology_agg.primary_pathology) AS "mainCondition",
					COALESCE(pathology_agg.primary_pathology, p.main_condition) AS "primaryPathology",
					COALESCE(pathology_agg.pathology_names, ARRAY[]::text[]) AS "pathologyNames",
					COALESCE(pathology_agg.active_pathology_names, ARRAY[]::text[]) AS "activePathologyNames",
					COALESCE(pathology_agg.pathology_statuses, ARRAY[]::text[]) AS "pathologyStatuses",
					COALESCE(pathology_agg.has_active_pathology, FALSE) AS "hasActivePathology",
					COALESCE(pathology_agg.has_monitor_pathology, FALSE) AS "hasMonitorPathology",
					COALESCE(pathology_agg.has_treated_pathology, FALSE) AS "hasTreatedPathology",
					COALESCE(p.care_profiles, ARRAY[]::text[]) AS "careProfiles",
					COALESCE(p.sports_practiced, ARRAY[]::text[]) AS "sportsPracticed",
					COALESCE(p.therapy_focuses, ARRAY[]::text[]) AS "therapyFocuses",
					COALESCE(
						p.payer_model,
						CASE
							WHEN COALESCE(p.partner_company_name, '') <> '' THEN 'parceria'
							WHEN COALESCE((p.insurance ->> 'provider'), '') <> '' THEN 'convenio'
							ELSE 'particular'
						END
					) AS "payerModel",
					p.partner_company_name AS "partnerCompanyName",
					COALESCE(surgery_agg.has_surgery, FALSE) AS "hasSurgery",
					COALESCE(surgery_agg.recent_surgery, FALSE) AS "recentSurgery",
					COALESCE(appointment_agg.completed_appointments, 0) AS "sessionsCompleted",
					COALESCE(appointment_agg.total_appointments, 0) AS "totalAppointments",
					COALESCE(appointment_agg.no_show_count, 0) AS "noShowCount",
					COALESCE(appointment_agg.upcoming_appointments, 0) AS "upcomingAppointmentsCount",
					appointment_agg.last_appointment_date AS "lastAppointmentDate",
					appointment_agg.next_appointment_date AS "nextAppointmentDate",
					COALESCE(finance_agg.open_amount, 0::numeric) AS "openBalance",
					CASE
						WHEN COALESCE(payments_agg.paid_total, 0::numeric) > COALESCE(finance_agg.receivable_total, 0::numeric)
							AND COALESCE(finance_agg.receivable_total, 0::numeric) > 0::numeric
							THEN 'credit'
						WHEN COALESCE(finance_agg.overdue_count, 0) > 0 THEN 'in_collection'
						WHEN COALESCE(unbilled_agg.unbilled_count, 0) > 0 THEN 'uninvoiced'
						WHEN COALESCE(finance_agg.open_count, 0) > 0 THEN 'pending_balance'
						ELSE 'current'
					END AS "financialStatus",
					CASE
						WHEN LOWER(COALESCE(p.status, '')) IN ('concluído', 'concluido', 'alta', 'arquivado')
							THEN 'completed'
						WHEN COALESCE(appointment_agg.total_appointments, 0) = 0
							AND p.created_at >= NOW() - INTERVAL '30 days'
							THEN 'new_patient'
						WHEN (
							COALESCE(appointment_agg.no_show_count, 0) > 0
							AND COALESCE(appointment_agg.upcoming_appointments, 0) = 0
						) OR (
							appointment_agg.last_appointment_date IS NOT NULL
							AND appointment_agg.last_appointment_date < CURRENT_DATE - INTERVAL '30 days'
							AND COALESCE(appointment_agg.upcoming_appointments, 0) = 0
						)
							THEN 'at_risk'
						ELSE 'active'
					END AS classification
				FROM patients p
				LEFT JOIN appointment_agg ON appointment_agg.patient_id = p.id
				LEFT JOIN pathology_agg ON pathology_agg.patient_id = p.id
				LEFT JOIN surgery_agg ON surgery_agg.patient_id = p.id
				LEFT JOIN finance_agg ON finance_agg.patient_id = p.id
				LEFT JOIN payments_agg ON payments_agg.patient_id = p.id
				LEFT JOIN unbilled_agg ON unbilled_agg.patient_id = p.id
				WHERE p.organization_id = ${orgId}::uuid
					AND COALESCE(p.archived, FALSE) = FALSE
			)
      SELECT * FROM directory_rows LIMIT 1
    `;
    console.log("Success! Data:", res.length);
  } catch (err) {
    console.error("SQL Error:", err.message);
  }
}

run();
