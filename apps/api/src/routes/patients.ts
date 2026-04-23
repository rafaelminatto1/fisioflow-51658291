import { Hono } from "hono";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import { patients, sessions } from "@fisioflow/db";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import { withTenant } from "../lib/db-utils";
import { triggerInngestEvent } from "../lib/inngest-client";
import { registerPatientClinicalDetailRoutes } from "./patients/clinical-details";
import { isUuid } from "../lib/validators";
import {
	type DbRow,
	type PatientPayload,
	trimmedString,
	nullableString,
	nullableBoolean,
	nullableNumber,
	parseJsonObject,
} from "./patients/shared";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Removed tableColumnsCache and helpers as we shift to Drizzle ORM

/** Extracts a user-friendly message from Neon/Postgres DB errors. */
function dbErrorResponse(error: unknown): {
	message: string;
	status: 409 | 500;
} {
	const err = error as any;
	// NeonDbError exposes Postgres error code in `err.code`
	if (err?.code === "23505") {
		const constraint: string = err.constraint ?? "";
		if (constraint.includes("email")) {
			return {
				message: "Já existe um paciente com este e-mail nesta clínica.",
				status: 409,
			};
		}
		if (constraint.includes("cpf")) {
			return { message: "Já existe um paciente com este CPF.", status: 409 };
		}
		return {
			message: "Registro duplicado: já existe um paciente com esses dados.",
			status: 409,
		};
	}
	const raw = err instanceof Error ? err.message : "Erro desconhecido";
	return { message: raw, status: 500 };
}

function normalizeGenderToDb(value: unknown): string | null {
	const normalized = trimmedString(value)?.toLowerCase();
	if (!normalized) return null;
	if (["m", "masculino", "male", "homem"].includes(normalized)) return "M";
	if (["f", "feminino", "female", "mulher"].includes(normalized)) return "F";
	if (
		["o", "outro", "other", "nao informado", "não informado"].includes(
			normalized,
		)
	)
		return "O";
	return normalized.toUpperCase();
}

function normalizeGenderFromDb(
	value: unknown,
): "masculino" | "feminino" | "outro" | null {
	const normalized = trimmedString(value)?.toLowerCase();
	if (!normalized) return null;
	if (["m", "masculino", "male", "homem"].includes(normalized))
		return "masculino";
	if (["f", "feminino", "female", "mulher"].includes(normalized))
		return "feminino";
	return "outro";
}

function normalizePatientStatus(value: unknown): string {
	const normalized = trimmedString(value)?.toLowerCase();
	if (!normalized) return "Inicial";
	if (
		[
			"active",
			"ativo",
			"em tratamento",
			"em_tratamento",
			"in_progress",
		].includes(normalized)
	) {
		return "Em Tratamento";
	}
	if (["initial", "inicial", "novo", "new"].includes(normalized)) {
		return "Inicial";
	}
	if (["recuperacao", "recuperação", "recovery"].includes(normalized)) {
		return "Recuperação";
	}
	if (
		["concluido", "concluído", "completed", "complete"].includes(normalized)
	) {
		return "Concluído";
	}
	if (["alta", "discharged"].includes(normalized)) {
		return "Alta";
	}
	if (["arquivado", "archived"].includes(normalized)) {
		return "Arquivado";
	}
	return trimmedString(value) ?? "Inicial";
}

function jsonbTextToString(value: unknown): string | undefined {
	if (value == null) return undefined;
	if (typeof value === "string") return value;
	if (typeof value === "object") {
		const text = (value as Record<string, unknown>).text;
		return text != null ? String(text) : undefined;
	}
	return undefined;
}

function normalizeTextArray(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map((item) => trimmedString(item))
			.filter((item): item is string => Boolean(item));
	}

	if (typeof value === "string") {
		const normalized = value.trim();
		if (!normalized) return [];

		if (normalized.startsWith("[") || normalized.startsWith("{")) {
			try {
				const parsed = JSON.parse(
					normalized.replace(/^\{/, "[").replace(/\}$/, "]"),
				) as unknown;
				if (Array.isArray(parsed)) {
					return parsed
						.map((item) => trimmedString(item))
						.filter((item): item is string => Boolean(item));
				}
			} catch {
				// Fall through to CSV parsing.
			}
		}

		return normalized
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
	}

	return [];
}

function parseStringArrayInput(value: unknown): string[] | null {
	if (value === undefined) return null;
	return normalizeTextArray(value);
}

function deriveIsActive(body: PatientPayload): boolean {
	const explicit = nullableBoolean(body.is_active ?? body.isActive);
	if (explicit !== null) return explicit;

	const status = trimmedString(body.status)?.toLowerCase();
	if (!status) return true;
	if (
		[
			"inactive",
			"inativo",
			"archived",
			"arquivado",
			"deleted",
			"excluido",
			"excluído",
		].includes(status)
	) {
		return false;
	}
	return true;
}

function buildAddressPayload(
	body: PatientPayload,
): Record<string, unknown> | null {
	const address = trimmedString(body.address);
	const city = trimmedString(body.city);
	const state = trimmedString(body.state);
	const zipCode = trimmedString(body.zip_code ?? body.zipCode);
	const number = trimmedString(body.address_number ?? body.number);
	const complement = trimmedString(body.address_complement ?? body.complement);
	const neighborhood = trimmedString(body.neighborhood);

	if (
		!address &&
		!city &&
		!state &&
		!zipCode &&
		!number &&
		!complement &&
		!neighborhood
	) {
		return null;
	}

	return {
		street: address ?? null,
		city: city ?? null,
		state: state ?? null,
		cep: zipCode ?? null,
		number: number ?? null,
		complement: complement ?? null,
		neighborhood: neighborhood ?? null,
	};
}

function buildEmergencyContactPayload(
	body: PatientPayload,
): Record<string, unknown> | null {
	const name = trimmedString(body.emergency_contact ?? body.emergencyContact);
	const phone = trimmedString(body.emergency_phone ?? body.emergencyPhone);
	const relationship = trimmedString(
		body.emergency_contact_relationship ?? body.emergencyContactRelationship,
	);

	if (!name && !phone && !relationship) return null;

	return {
		name: name ?? null,
		phone: phone ?? null,
		relationship: relationship ?? null,
	};
}

function buildInsurancePayload(
	body: PatientPayload,
): Record<string, unknown> | null {
	const provider = trimmedString(
		body.health_insurance ?? body.insurance_plan ?? body.insurancePlan,
	);
	const plan = trimmedString(body.plan);
	const cardNumber = trimmedString(
		body.insurance_number ?? body.insuranceNumber,
	);
	const validUntil = trimmedString(
		body.insurance_validity ?? body.insuranceValidity,
	);

	if (!provider && !plan && !cardNumber && !validUntil) return null;

	return {
		provider: provider ?? null,
		plan: plan ?? null,
		cardNumber: cardNumber ?? null,
		validUntil: validUntil ?? null,
	};
}

function normalizePatientRow(row: DbRow) {
	// Drizzle ORM returns camelCase keys; raw SQL returns snake_case — support both
	const id = row.id ?? row.ID;
	const fullName = row.fullName ?? row.full_name ?? row.name;
	const orgId = row.organizationId ?? row.organization_id;
	const phone = row.phone;
	const phoneSecondary = row.phoneSecondary ?? row.phone_secondary;
	const photoUrl = row.photoUrl ?? row.photo_url;
	const profileId = row.profileId ?? row.profile_id;
	const userId = row.userId ?? row.user_id;
	const referredBy = row.referredBy ?? row.referred_by;
	const professionalId = row.professionalId ?? row.professional_id;
	const professionalName = row.professionalName ?? row.professional_name;
	const isActive = row.isActive ?? row.is_active;
	const mainCondition = row.mainCondition ?? row.main_condition;
	const bloodType = row.bloodType ?? row.blood_type;
	const weightKg = row.weightKg ?? row.weight_kg;
	const heightCm = row.heightCm ?? row.height_cm;
	const maritalStatus = row.maritalStatus ?? row.marital_status;
	const educationLevel = row.educationLevel ?? row.education_level;
	const sessionValue = row.sessionValue ?? row.session_value;
	const consentData = row.consentData ?? row.consent_data;
	const consentImage = row.consentImage ?? row.consent_image;
	const incompleteReg =
		row.incompleteRegistration ?? row.incomplete_registration;
	const careProfiles = normalizeTextArray(
		row.careProfiles ?? row.care_profiles,
	);
	const sportsPracticed = normalizeTextArray(
		row.sportsPracticed ?? row.sports_practiced,
	);
	const therapyFocuses = normalizeTextArray(
		row.therapyFocuses ?? row.therapy_focuses,
	);
	const birthDate =
		row.birthDate ?? row.birth_date ?? row.legacyDateOfBirth ?? row.date_of_birth;
	const createdAt = row.createdAt ?? row.created_at;
	const updatedAt = row.updatedAt ?? row.updated_at;
	const rawEmergencyContact = row.emergencyContact ?? row.emergency_contact;
	const rawInsurance = row.insurance;

	const address = parseJsonObject(row.address);
	const emergencyContact = parseJsonObject(rawEmergencyContact);
	const insurance = parseJsonObject(rawInsurance);

	const name = trimmedString(fullName as string) ?? "Sem nome";

	return {
		...row,
		id: id ? String(id) : undefined,
		name,
		full_name: name,
		organization_id: trimmedString(orgId as string) ?? "",
		organizationId: trimmedString(orgId as string) ?? "",
		phone: trimmedString(phone as string) ?? null,
		phone_secondary: trimmedString(phoneSecondary as string) ?? null,
		email: trimmedString(row.email as string) ?? null,
		cpf: trimmedString(row.cpf as string) ?? null,
		rg: trimmedString(row.rg as string) ?? null,
		photo_url: trimmedString(photoUrl as string) ?? null,
		profile_id: trimmedString(profileId as string) ?? null,
		user_id: trimmedString(userId as string) ?? null,
		referred_by: trimmedString(referredBy as string) ?? null,
		professional_id: trimmedString(professionalId as string) ?? null,
		professional_name: trimmedString(professionalName as string) ?? null,
		birth_date: birthDate ? String(birthDate) : null,
		gender: normalizeGenderFromDb(row.gender),
		nickname: trimmedString(row.nickname as string) ?? null,
		social_name: trimmedString((row.social_name ?? row.socialName) as string) ?? null,
		address: trimmedString((address?.street ?? row.address) as string) ?? null,
		city: trimmedString((address?.city ?? row.city) as string) ?? null,
		state: trimmedString((address?.state ?? row.state) as string) ?? null,
		zip_code: trimmedString((address?.cep ?? row.zip_code) as string) ?? null,
		emergency_contact:
			trimmedString((emergencyContact?.name ?? rawEmergencyContact) as string) ?? null,
		emergency_contact_relationship:
			trimmedString(
				(emergencyContact?.relationship ?? row.emergency_contact_relationship) as string,
			) ?? null,
		emergency_phone:
			trimmedString((emergencyContact?.phone ?? row.emergency_phone) as string) ?? null,
		health_insurance:
			trimmedString((insurance?.provider ?? row.health_insurance) as string) ?? null,
		insurance_number:
			trimmedString((insurance?.cardNumber ?? row.insurance_number) as string) ?? null,
		origin: trimmedString(row.origin as string) ?? null,
		referredBy: trimmedString(referredBy as string) ?? null,
		professionalId: trimmedString(professionalId as string) ?? null,
		professionalName: trimmedString(professionalName as string) ?? null,
		care_profiles: careProfiles,
		careProfiles,
		sports_practiced: sportsPracticed,
		sportsPracticed,
		therapy_focuses: therapyFocuses,
		therapyFocuses,
		payer_model:
			trimmedString((row.payer_model ?? row.payerModel) as string) ?? null,
		payerModel:
			trimmedString((row.payer_model ?? row.payerModel) as string) ?? null,
		partner_company_name:
			trimmedString(
				(row.partner_company_name ?? row.partnerCompanyName) as string,
			) ?? null,
		partnerCompanyName:
			trimmedString(
				(row.partner_company_name ?? row.partnerCompanyName) as string,
			) ?? null,
		main_condition: trimmedString(mainCondition as string) ?? null,
		mainCondition: trimmedString(mainCondition as string) ?? null,
		profession: trimmedString(row.profession as string) ?? null,
		observations: trimmedString((row.observations ?? row.notes) as string) ?? null,
		status: trimmedString(row.status as string) ?? "Inicial",
		progress: nullableNumber(row.progress) ?? 0,
		blood_type: trimmedString(bloodType as string) ?? null,
		weight_kg: nullableNumber(weightKg),
		height_cm: nullableNumber(heightCm),
		marital_status: trimmedString(maritalStatus as string) ?? null,
		education_level: trimmedString(educationLevel as string) ?? null,
		session_value: nullableNumber(sessionValue),
		consent_data: consentData !== false,
		consent_image: Boolean(consentImage),
		incomplete_registration: Boolean(incompleteReg),
		is_active: isActive !== false,
		isActive: isActive !== false,
		created_at: createdAt ? String(createdAt) : new Date().toISOString(),
		updated_at: updatedAt ? String(updatedAt) : new Date().toISOString(),
		createdAt: createdAt ? String(createdAt) : new Date().toISOString(),
		updatedAt: updatedAt ? String(updatedAt) : new Date().toISOString(),
	};
}

function buildPatientWritePayload(
	body: PatientPayload,
	organizationId: string,
	isCreate: boolean,
): Partial<typeof patients.$inferInsert> {
	const payload: any = {};

	if (isCreate) {
		payload.organizationId = organizationId;
	}

	if (body.full_name !== undefined || body.name !== undefined) {
		payload.fullName = trimmedString(body.full_name ?? body.name) ?? "";
	}

	if (body.email !== undefined) {
		payload.email = nullableString(body.email);
	}
	if (body.phone !== undefined || isCreate) {
		payload.phone = nullableString(body.phone) ?? (isCreate ? "" : null);
	}
	if (body.phone_secondary !== undefined) {
		payload.phoneSecondary = nullableString(body.phone_secondary);
	}
	if (body.cpf !== undefined) {
		payload.cpf = nullableString(body.cpf);
	}
	if (body.rg !== undefined) {
		payload.rg = nullableString(body.rg);
	}
	if (body.birth_date !== undefined) {
		payload.birthDate = nullableString(body.birth_date);
	}
	if (body.gender !== undefined) {
		payload.gender = normalizeGenderToDb(body.gender) as any;
	}
	if (body.nickname !== undefined) {
		payload.nickname = nullableString(body.nickname);
	}
	if (body.social_name !== undefined || body.socialName !== undefined) {
		payload.socialName = nullableString(body.social_name ?? body.socialName);
	}

	// Address, Emergency Contact, Insurance are stored as JSONB in Drizzle/Postgres
	if (
		["address", "city", "state", "zip_code"].some(
			(key) => body[key] !== undefined,
		)
	) {
		payload.address = buildAddressPayload(body);
	}
	if (
		[
			"emergency_contact",
			"emergency_phone",
			"emergency_contact_relationship",
		].some((key) => body[key] !== undefined)
	) {
		payload.emergencyContact = buildEmergencyContactPayload(body);
	}
	if (
		[
			"health_insurance",
			"insurance_plan",
			"insurance_number",
			"insurance_validity",
		].some((key) => body[key] !== undefined)
	) {
		payload.insurance = buildInsurancePayload(body);
	}

	if (body.main_condition !== undefined) {
		payload.mainCondition = nullableString(body.main_condition);
	}
	if (body.profession !== undefined) {
		payload.profession = nullableString(body.profession);
	}
	if (body.observations !== undefined) {
		payload.observations = nullableString(body.observations);
		payload.notes = nullableString(body.observations);
	}

	if (body.status !== undefined || isCreate) {
		payload.status = normalizePatientStatus(body.status);
	}
	if (body.is_active !== undefined || body.status !== undefined || isCreate) {
		payload.isActive = deriveIsActive(body);
	}
	if (body.progress !== undefined || isCreate) {
		payload.progress = nullableNumber(body.progress) ?? 0;
	}

	if (body.blood_type !== undefined) {
		payload.bloodType = nullableString(body.blood_type);
	}
	if (body.weight_kg !== undefined) {
		payload.weightKg = nullableNumber(body.weight_kg)?.toString(); // numeric in drizzle is often string
	}
	if (body.height_cm !== undefined) {
		payload.heightCm = nullableNumber(body.height_cm)?.toString();
	}
	if (body.marital_status !== undefined) {
		payload.maritalStatus = nullableString(body.marital_status);
	}
	if (body.education_level !== undefined) {
		payload.educationLevel = nullableString(body.education_level);
	}
	if (body.consent_data !== undefined) {
		payload.consentData = nullableBoolean(body.consent_data);
	}
	if (body.consent_image !== undefined) {
		payload.consentImage = nullableBoolean(body.consent_image);
	}
	if (body.incomplete_registration !== undefined) {
		payload.incompleteRegistration = nullableBoolean(
			body.incomplete_registration,
		);
	}

	if (body.origin !== undefined) {
		payload.origin = nullableString(body.origin);
	}
	if (body.referred_by !== undefined) {
		payload.referredBy = nullableString(body.referred_by);
	}
	if (body.care_profiles !== undefined || body.careProfiles !== undefined) {
		payload.careProfiles = parseStringArrayInput(
			body.care_profiles ?? body.careProfiles,
		);
	}
	if (
		body.sports_practiced !== undefined ||
		body.sportsPracticed !== undefined
	) {
		payload.sportsPracticed = parseStringArrayInput(
			body.sports_practiced ?? body.sportsPracticed,
		);
	}
	if (
		body.therapy_focuses !== undefined ||
		body.therapyFocuses !== undefined
	) {
		payload.therapyFocuses = parseStringArrayInput(
			body.therapy_focuses ?? body.therapyFocuses,
		);
	}
	if (body.payer_model !== undefined || body.payerModel !== undefined) {
		payload.payerModel = nullableString(body.payer_model ?? body.payerModel);
	}
	if (
		body.partner_company_name !== undefined ||
		body.partnerCompanyName !== undefined
	) {
		payload.partnerCompanyName = nullableString(
			body.partner_company_name ?? body.partnerCompanyName,
		);
	}
	if (body.photo_url !== undefined) {
		payload.photoUrl = nullableString(body.photo_url);
	}
	if (body.session_value !== undefined) {
		payload.sessionValue = nullableNumber(body.session_value)?.toString();
	}

	payload.updatedAt = sql`now()`;
	if (isCreate) {
		payload.createdAt = sql`now()`;
	}

	return payload;
}

function normalizePatientDirectoryRow(row: DbRow) {
	const mainCondition = trimmedString(
		(row.mainCondition ?? row.main_condition ?? row.primaryPathology) as string,
	);
	const primaryPathology = trimmedString(
		(row.primaryPathology ?? row.primary_pathology ?? row.mainCondition) as string,
	);
	const pathologyNames = normalizeTextArray(
		row.pathologyNames ?? row.pathology_names,
	);
	const activePathologyNames = normalizeTextArray(
		row.activePathologyNames ?? row.active_pathology_names,
	);
	const pathologyStatuses = normalizeTextArray(
		row.pathologyStatuses ?? row.pathology_statuses,
	);
	const careProfiles = normalizeTextArray(
		row.careProfiles ?? row.care_profiles,
	);
	const sportsPracticed = normalizeTextArray(
		row.sportsPracticed ?? row.sports_practiced,
	);
	const therapyFocuses = normalizeTextArray(
		row.therapyFocuses ?? row.therapy_focuses,
	);
	const classification = trimmedString(row.classification as string) ?? null;
	const financialStatus =
		trimmedString(
			(row.financialStatus ?? row.financial_status) as string,
		) ?? null;
	const lastAppointmentDate =
		row.lastAppointmentDate ?? row.last_appointment_date;
	const nextAppointmentDate =
		row.nextAppointmentDate ?? row.next_appointment_date;
	const sessionsCompleted = nullableNumber(
		row.sessionsCompleted ?? row.sessions_completed,
	);
	const totalAppointments = nullableNumber(
		row.totalAppointments ?? row.total_appointments,
	);
	const noShowCount = nullableNumber(row.noShowCount ?? row.no_show_count);
	const upcomingAppointmentsCount = nullableNumber(
		row.upcomingAppointmentsCount ?? row.upcoming_appointments_count,
	);
	const openBalance = nullableNumber(row.openBalance ?? row.open_balance);
	const payerModel =
		trimmedString((row.payerModel ?? row.payer_model) as string) ?? null;
	const partnerCompanyName =
		trimmedString(
			(row.partnerCompanyName ?? row.partner_company_name) as string,
		) ?? null;
	const hasSurgery = Boolean(row.hasSurgery ?? row.has_surgery);
	const recentSurgery = Boolean(row.recentSurgery ?? row.recent_surgery);
	const base = normalizePatientRow({
		...row,
		mainCondition: mainCondition ?? primaryPathology,
	});

	return {
		...base,
		main_condition: mainCondition ?? primaryPathology,
		mainCondition: mainCondition ?? primaryPathology,
		primary_pathology: primaryPathology,
		primaryPathology,
		pathology_names: pathologyNames,
		pathologyNames,
		active_pathology_names: activePathologyNames,
		activePathologyNames,
		pathology_statuses: pathologyStatuses,
		pathologyStatuses,
		care_profiles: careProfiles,
		careProfiles,
		sports_practiced: sportsPracticed,
		sportsPracticed,
		therapy_focuses: therapyFocuses,
		therapyFocuses,
		payer_model: payerModel,
		payerModel,
		partner_company_name: partnerCompanyName,
		partnerCompanyName,
		has_surgery: hasSurgery,
		hasSurgery,
		recent_surgery: recentSurgery,
		recentSurgery,
		classification,
		financial_status: financialStatus,
		financialStatus,
		sessions_completed: sessionsCompleted ?? 0,
		sessionsCompleted: sessionsCompleted ?? 0,
		total_appointments: totalAppointments ?? 0,
		totalAppointments: totalAppointments ?? 0,
		no_show_count: noShowCount ?? 0,
		noShowCount: noShowCount ?? 0,
		upcoming_appointments_count: upcomingAppointmentsCount ?? 0,
		upcomingAppointmentsCount: upcomingAppointmentsCount ?? 0,
		last_appointment_date: lastAppointmentDate
			? String(lastAppointmentDate)
			: null,
		lastAppointmentDate: lastAppointmentDate ? String(lastAppointmentDate) : null,
		next_appointment_date: nextAppointmentDate
			? String(nextAppointmentDate)
			: null,
		nextAppointmentDate: nextAppointmentDate ? String(nextAppointmentDate) : null,
		open_balance: openBalance ?? 0,
		openBalance: openBalance ?? 0,
	};
}

// Removed buildInsertStatement and buildUpdateStatement as we shift to Drizzle ORM

app.use("*", requireAuth);

app.get("/", async (c) => {
	const user = c.get("user");
	const pool = createPool(c.env);

	const search = trimmedString(c.req.query("search"));
	const requestedStatus = trimmedString(c.req.query("status"));
	const classification = trimmedString(c.req.query("classification"));
	const sortBy = trimmedString(c.req.query("sortBy"));
	const hasSurgery = c.req.query("hasSurgery") === "true";
	const mainCondition = trimmedString(c.req.query("condition"));
	const pathologies = normalizeTextArray(c.req.queries("pathologies"));
	const pathologyStatus = trimmedString(c.req.query("pathologyStatus"));
	const careProfiles = normalizeTextArray(c.req.queries("careProfiles"));
	const sports = normalizeTextArray(c.req.queries("sports"));
	const therapyFocuses = normalizeTextArray(c.req.queries("therapyFocuses"));
	const paymentModel = trimmedString(c.req.query("paymentModel"));
	const financialStatus = trimmedString(c.req.query("financialStatus"));
	const origin = trimmedString(c.req.query("origin"));
	const partnerCompany = trimmedString(c.req.query("partnerCompany"));
	const limit = Math.min(
		200,
		Math.max(1, Number.parseInt(c.req.query("limit") ?? "100", 10) || 100),
	);
	const offset = Math.max(
		0,
		Number.parseInt(c.req.query("offset") ?? "0", 10) || 0,
	);

	try {
		const cteSql = `
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
				WHERE a.organization_id = $1::uuid
				GROUP BY a.patient_id
			),
			pathology_agg AS (
				SELECT
					pp.patient_id,
					ARRAY_REMOVE(ARRAY_AGG(DISTINCT pp.pathology_name), NULL) AS pathology_names,
					ARRAY_REMOVE(
						ARRAY_AGG(
							DISTINCT CASE
								WHEN LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')
									THEN pp.pathology_name
								ELSE NULL
							END
						),
						NULL
					) AS active_pathology_names,
					ARRAY_REMOVE(ARRAY_AGG(DISTINCT LOWER(COALESCE(pp.status, ''))), NULL) AS pathology_statuses,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')) AS has_active_pathology,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('monitoramento', 'monitoring', 'cronico', 'crônico')) AS has_monitor_pathology,
					BOOL_OR(LOWER(COALESCE(pp.status, '')) IN ('resolvido', 'treated', 'tratada', 'tratado', 'alta')) AS has_treated_pathology,
					MIN(pp.pathology_name) FILTER (
						WHERE LOWER(COALESCE(pp.status, '')) IN ('ativo', 'active', 'em_tratamento', 'em tratamento')
					) AS primary_pathology
				FROM patient_pathologies pp
				WHERE pp.organization_id = $1::uuid
				GROUP BY pp.patient_id
			),
			surgery_agg AS (
				SELECT
					ps.patient_id,
					TRUE AS has_surgery,
					BOOL_OR(ps.surgery_date >= CURRENT_DATE - INTERVAL '90 days') AS recent_surgery
				FROM patient_surgeries ps
				WHERE ps.organization_id = $1::uuid
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
				WHERE cf.organization_id = $1::uuid
					AND COALESCE(cf.deleted_at IS NULL, TRUE)
					AND cf.patient_id IS NOT NULL
				GROUP BY cf.patient_id
			),
			payments_agg AS (
				SELECT
					pg.patient_id,
					COALESCE(SUM(pg.valor::numeric), 0::numeric) AS paid_total
				FROM pagamentos pg
				WHERE pg.organization_id = $1::uuid
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
				WHERE a.organization_id = $1::uuid
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
				WHERE p.organization_id = $1::uuid
					AND COALESCE(p.archived, FALSE) = FALSE
			)
		`;

		const baseConditions: string[] = [];
		const params: Array<string | number | boolean | string[]> = [
			user.organizationId,
		];
		let paramIndex = 2;
		const pushCondition = (
			clause: string,
			value?: string | number | boolean | string[],
		) => {
			baseConditions.push(clause);
			if (value !== undefined) params.push(value);
		};

		const normalizedStatus = requestedStatus?.toLowerCase();
		if (normalizedStatus && normalizedStatus !== "all") {
			if (["active", "ativo"].includes(normalizedStatus)) {
				pushCondition(`directory."isActive" = $${paramIndex++}`, true);
			} else if (["inactive", "inativo"].includes(normalizedStatus)) {
				pushCondition(`directory."isActive" = $${paramIndex++}`, false);
			} else {
				pushCondition(`directory.status = $${paramIndex++}`, requestedStatus!);
			}
		}

		if (search) {
			const searchValue = `%${search}%`;
			pushCondition(
				`(
					directory."fullName" ILIKE $${paramIndex}
					OR COALESCE(directory.nickname, '') ILIKE $${paramIndex}
					OR COALESCE(directory."socialName", '') ILIKE $${paramIndex}
					OR COALESCE(directory.email, '') ILIKE $${paramIndex}
					OR COALESCE(directory.cpf, '') ILIKE $${paramIndex}
					OR COALESCE(directory.phone, '') ILIKE $${paramIndex}
					OR COALESCE(directory."mainCondition", '') ILIKE $${paramIndex}
					OR ARRAY_TO_STRING(directory."pathologyNames", ', ') ILIKE $${paramIndex}
					OR COALESCE(directory.origin, '') ILIKE $${paramIndex}
					OR COALESCE(directory."partnerCompanyName", '') ILIKE $${paramIndex}
					OR COALESCE(directory."professionalName", '') ILIKE $${paramIndex}
				)`,
				searchValue,
			);
			paramIndex += 1;
		}

		if (mainCondition && mainCondition !== "all") {
			pushCondition(
				`(
					directory."mainCondition" = $${paramIndex}
					OR directory."primaryPathology" = $${paramIndex}
				)`,
				mainCondition,
			);
			paramIndex += 1;
		}

		if (pathologies.length > 0) {
			pushCondition(
				`directory."pathologyNames" && $${paramIndex}::text[]`,
				pathologies,
			);
			paramIndex += 1;
		}

		if (pathologyStatus && pathologyStatus !== "all") {
			if (pathologyStatus === "active") {
				baseConditions.push(`directory."hasActivePathology" = TRUE`);
			} else if (pathologyStatus === "monitoring") {
				baseConditions.push(`directory."hasMonitorPathology" = TRUE`);
			} else if (pathologyStatus === "treated") {
				baseConditions.push(`directory."hasTreatedPathology" = TRUE`);
			} else if (pathologyStatus === "historical") {
				baseConditions.push(
					`CARDINALITY(directory."pathologyNames") > 0`,
				);
			}
		}

		if (careProfiles.length > 0) {
			pushCondition(
				`directory."careProfiles" && $${paramIndex}::text[]`,
				careProfiles,
			);
			paramIndex += 1;
		}

		if (sports.length > 0) {
			pushCondition(
				`directory."sportsPracticed" && $${paramIndex}::text[]`,
				sports,
			);
			paramIndex += 1;
		}

		if (therapyFocuses.length > 0) {
			pushCondition(
				`directory."therapyFocuses" && $${paramIndex}::text[]`,
				therapyFocuses,
			);
			paramIndex += 1;
		}

		if (paymentModel && paymentModel !== "all") {
			pushCondition(`directory."payerModel" = $${paramIndex++}`, paymentModel);
		}

		if (financialStatus && financialStatus !== "all") {
			pushCondition(
				`directory."financialStatus" = $${paramIndex++}`,
				financialStatus,
			);
		}

		if (origin && origin !== "all") {
			pushCondition(`directory.origin = $${paramIndex++}`, origin);
		}

		if (partnerCompany && partnerCompany !== "all") {
			pushCondition(
				`directory."partnerCompanyName" = $${paramIndex++}`,
				partnerCompany,
			);
		}

		if (hasSurgery) {
			baseConditions.push(`directory."hasSurgery" = TRUE`);
		}

		const finalConditions = [...baseConditions];
		if (classification && classification !== "all") {
			finalConditions.push(`directory.classification = $${paramIndex++}`);
			params.push(classification);
		}

		const baseWhereSql =
			baseConditions.length > 0 ? `WHERE ${baseConditions.join(" AND ")}` : "";
		const finalWhereSql =
			finalConditions.length > 0
				? `WHERE ${finalConditions.join(" AND ")}`
				: "";

		let orderBy = `directory."createdAt" DESC`;
		switch (sortBy) {
			case "created_at_asc":
				orderBy = `directory."createdAt" ASC`;
				break;
			case "name_asc":
				orderBy = `directory."fullName" ASC`;
				break;
			case "name_desc":
				orderBy = `directory."fullName" DESC`;
				break;
			case "main_condition_asc":
				orderBy = `COALESCE(directory."primaryPathology", directory."mainCondition") ASC NULLS LAST, directory."fullName" ASC`;
				break;
			case "main_condition_desc":
				orderBy = `COALESCE(directory."primaryPathology", directory."mainCondition") DESC NULLS LAST, directory."fullName" ASC`;
				break;
			case "next_appointment_asc":
				orderBy = `directory."nextAppointmentDate" ASC NULLS LAST, directory."fullName" ASC`;
				break;
			case "last_activity_desc":
				orderBy = `directory."lastAppointmentDate" DESC NULLS LAST, directory."fullName" ASC`;
				break;
			case "open_balance_desc":
				orderBy = `directory."openBalance" DESC NULLS LAST, directory."fullName" ASC`;
				break;
			case "risk_desc":
				orderBy = `
					CASE directory.classification
						WHEN 'at_risk' THEN 0
						WHEN 'new_patient' THEN 1
						WHEN 'active' THEN 2
						ELSE 3
					END,
					directory."noShowCount" DESC,
					directory."lastAppointmentDate" ASC NULLS LAST
				`;
				break;
			case "created_at_desc":
			default:
				orderBy = `directory."createdAt" DESC`;
				break;
		}

		let dataResult;
		let summaryResult;
		let facetsResult;
		let totalResult;

		try {
			const startData = Date.now();
			dataResult = await pool.query(
				`
					${cteSql}
					SELECT *, COUNT(*) OVER()::int AS "__total"
					FROM directory_rows directory
					${finalWhereSql}
					ORDER BY ${orderBy}
					LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
				`,
				[...params, limit, offset],
			);
			console.log(`[Patients/List] Data query took ${Date.now() - startData}ms`);
		} catch (e: any) {
			console.error("[Patients/List] Data Query Error:", e.message, e.stack);
			throw new Error(`Data query failed: ${e.message}`);
		}

		try {
			const startSummary = Date.now();
			summaryResult = await pool.query(
				`
					${cteSql}
					SELECT
						COUNT(*)::int AS total,
						COUNT(*) FILTER (WHERE directory.classification = 'active')::int AS active,
						COUNT(*) FILTER (WHERE directory.classification = 'new_patient')::int AS new_patients,
						COUNT(*) FILTER (WHERE directory.classification = 'at_risk')::int AS at_risk,
						COUNT(*) FILTER (WHERE directory.classification = 'completed')::int AS completed,
						COUNT(*) FILTER (
							WHERE directory."lastAppointmentDate" < CURRENT_DATE - INTERVAL '7 days'
								AND directory.classification <> 'completed'
						)::int AS inactive_7,
						COUNT(*) FILTER (
							WHERE directory."lastAppointmentDate" < CURRENT_DATE - INTERVAL '30 days'
								AND directory.classification <> 'completed'
						)::int AS inactive_30,
						COUNT(*) FILTER (
							WHERE directory."lastAppointmentDate" < CURRENT_DATE - INTERVAL '60 days'
								AND directory.classification <> 'completed'
						)::int AS inactive_60,
						COUNT(*) FILTER (WHERE directory."noShowCount" > 0)::int AS no_show_risk,
						COUNT(*) FILTER (
							WHERE directory."financialStatus" IN ('pending_balance', 'in_collection')
						)::int AS has_unpaid
					FROM directory_rows directory
					${baseWhereSql}
				`,
				params.slice(0, params.length - (classification && classification !== "all" ? 1 : 0)),
			);
			console.log(`[Patients/List] Summary query took ${Date.now() - startSummary}ms`);
		} catch (e: any) {
			console.error("[Patients/List] Summary Query Error:", e.message, e.stack);
			// Do not throw, return partial data
			summaryResult = { rows: [] };
		}

		try {
			const startFacets = Date.now();
			facetsResult = await pool.query(
				`
					SELECT
						ARRAY(
							SELECT DISTINCT pp.pathology_name
							FROM patient_pathologies pp
							WHERE pp.organization_id = $1::uuid
								AND pp.pathology_name IS NOT NULL
							ORDER BY 1
						) AS pathologies,
						ARRAY(
							SELECT DISTINCT value
							FROM patients p2, LATERAL UNNEST(COALESCE(p2.care_profiles, ARRAY[]::text[])) AS value
							WHERE p2.organization_id = $1::uuid
								AND COALESCE(value, '') <> ''
							ORDER BY 1
						) AS care_profiles,
						ARRAY(
							SELECT DISTINCT value
							FROM patients p3, LATERAL UNNEST(COALESCE(p3.sports_practiced, ARRAY[]::text[])) AS value
							WHERE p3.organization_id = $1::uuid
								AND COALESCE(value, '') <> ''
							ORDER BY 1
						) AS sports,
						ARRAY(
							SELECT DISTINCT value
							FROM patients p4, LATERAL UNNEST(COALESCE(p4.therapy_focuses, ARRAY[]::text[])) AS value
							WHERE p4.organization_id = $1::uuid
								AND COALESCE(value, '') <> ''
							ORDER BY 1
						) AS therapy_focuses,
						ARRAY(
							SELECT DISTINCT p5.origin
							FROM patients p5
							WHERE p5.organization_id = $1::uuid
								AND COALESCE(p5.origin, '') <> ''
							ORDER BY 1
						) AS origins,
						ARRAY(
							SELECT DISTINCT p6.partner_company_name
							FROM patients p6
							WHERE p6.organization_id = $1::uuid
								AND COALESCE(p6.partner_company_name, '') <> ''
							ORDER BY 1
						) AS partners
				`,
				[user.organizationId],
			);
			console.log(`[Patients/List] Facets query took ${Date.now() - startFacets}ms`);
		} catch (e: any) {
			console.error("[Patients/List] Facets Query Error:", e.message, e.stack);
			facetsResult = { rows: [] };
		}

		try {
			const startTotal = Date.now();
			totalResult = await pool.query(
				`
					${cteSql}
					SELECT COUNT(*)::int AS total
					FROM directory_rows directory
					${finalWhereSql}
				`,
				params,
			);
			console.log(`[Patients/List] Total query took ${Date.now() - startTotal}ms`);
		} catch (e: any) {
			console.error("[Patients/List] Total Query Error:", e.message, e.stack);
			totalResult = { rows: [] };
		}

		const total = Number(totalResult.rows[0]?.total ?? (dataResult.rows[0] as any)?.__total ?? 0);
		const summaryRow = (summaryResult.rows[0] ?? {}) as Record<string, unknown>;
		const facetsRow = (facetsResult.rows[0] ?? {}) as Record<string, unknown>;

		return c.json({
			data: dataResult.rows.map((row) =>
				normalizePatientDirectoryRow(row as DbRow),
			),
			total,
			page: Math.floor(offset / limit) + 1,
			perPage: limit,
			summary: {
				total: Number(summaryRow.total ?? total),
				active: Number(summaryRow.active ?? 0),
				newPatients: Number(summaryRow.new_patients ?? 0),
				atRisk: Number(summaryRow.at_risk ?? 0),
				completed: Number(summaryRow.completed ?? 0),
				inactive7: Number(summaryRow.inactive_7 ?? 0),
				inactive30: Number(summaryRow.inactive_30 ?? 0),
				inactive60: Number(summaryRow.inactive_60 ?? 0),
				noShowRisk: Number(summaryRow.no_show_risk ?? 0),
				hasUnpaid: Number(summaryRow.has_unpaid ?? 0),
			},
			facets: {
				pathologies: normalizeTextArray(facetsRow.pathologies),
				careProfiles: normalizeTextArray(facetsRow.care_profiles),
				sports: normalizeTextArray(facetsRow.sports),
				therapyFocuses: normalizeTextArray(facetsRow.therapy_focuses),
				origins: normalizeTextArray(facetsRow.origins),
				partners: normalizeTextArray(facetsRow.partners),
			},
		});
	} catch (error) {
		console.error("[Patients/List] Error:", error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		
		return c.json(
			{
				data: [],
				total: 0,
				error: "Erro ao listar pacientes",
				details: errorMessage,
				stack: c.env.ENVIRONMENT !== "production" ? errorStack : undefined,
			},
			500,
		);
	}
});

app.get("/last-updated", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');

	try {
		const result = await db
			.select({ last_updated_at: sql<string>`MAX(${patients.updatedAt})` })
			.from(patients)
			.where(withTenant(patients, user.organizationId));

		const lastUpdated = result[0]?.last_updated_at;
		return c.json({
			data: { last_updated_at: lastUpdated ? String(lastUpdated) : null },
		});
	} catch (error) {
		console.error("[Patients/LastUpdated] Error:", error);
		return c.json({ data: { last_updated_at: null } });
	}
});

app.get("/by-profile/:profileId", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	const { profileId } = c.req.param();

	try {
		const result = await db
			.select()
			.from(patients)
			.where(
				withTenant(
					patients,
					user.organizationId,
					eq(patients.profileId, profileId),
				),
			)
			.limit(1);

		const row = result[0];
		return c.json({ data: row ? normalizePatientRow(row as DbRow) : null });
	} catch (error) {
		console.error("[Patients/ByProfile] Error:", error);
		return c.json({ data: null });
	}
});

app.post("/", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);

	console.log("[Patients/Create] Request received", {
		organizationId: user.organizationId,
		userId: user.uid,
	});

	const body = (await c.req.json()) as PatientPayload;
	console.log("[Patients/Create] Body received:", body);

	const fullName = trimmedString(body.full_name ?? body.name);
	if (!fullName) {
		console.log("[Patients/Create] Validation failed: missing fullName");
		return c.json({ error: "Nome é obrigatório" }, 400);
	}

	try {
		console.log("[Patients/Create] Building insert values...");
		const insertValues = buildPatientWritePayload(
			body,
			user.organizationId,
			true,
		);
		insertValues.fullName = fullName;

		console.log("[Patients/Create] Insert values:", insertValues);
		console.log("[Patients/Create] Executing DB insert...");

		const [patient] = await db
			.insert(patients)
			.values(insertValues as any)
			.returning();

		// Inngest Event: Patient Created (Sequência de Boas-vindas)
		triggerInngestEvent(
			c.env,
			c.executionCtx,
			"patient.created",
			{
				patientId: patient.id,
				name: patient.fullName,
				email: patient.email,
				phone: patient.phone,
			},
			{ id: user.uid },
		);

		return c.json({ data: normalizePatientRow(patient as DbRow) }, 201);
	} catch (error) {
		console.error("[Patients/Create] Error:", error);
		console.error(
			"[Patients/Create] Stack:",
			error instanceof Error ? error.stack : "N/A",
		);
		const { message, status } = dbErrorResponse(error);
		return c.json(
			{
				error: status === 409 ? message : "Erro ao criar paciente",
				details: message,
			},
			status,
		);
	}
});

app.get("/:id/stats", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		// Drizzle approach for stats: using sql template literal for complex aggregation
		// or multiple queries if needed. Here we stick to a custom select.
		const result = await db
			.select({
				total_sessions: sql<number>`count(*) filter (
					where status::text in ('atendido', 'avaliacao', 'completed', 'realizado', 'concluido')
				)`,
				upcoming_appointments: sql<number>`count(*) filter (
					where date >= current_date
					and (
						status::text not in (
							'cancelado', 'cancelled',
							'atendido', 'avaliacao', 'completed', 'realizado', 'concluido',
							'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
							'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
							'remarcar', 'remarcado', 'rescheduled'
						)
						or status is null
					)
				)`,
				last_visit: sql<string>`max(date) filter (where date <= current_date)`,
			})
			.from(sql`appointments`) // Fallback to raw table name if not in schema yet
			.where(
				and(
					sql`patient_id = ${id}::uuid`,
					sql`organization_id = ${user.organizationId}::uuid`,
					sql`deleted_at IS NULL`,
				),
			);

		const stats = result[0] ?? {
			total_sessions: 0,
			upcoming_appointments: 0,
			last_visit: null,
		};

		return c.json({
			data: {
				totalSessions: Number(stats.total_sessions || 0),
				upcomingAppointments: Number(stats.upcoming_appointments || 0),
				lastVisit: stats.last_visit ? String(stats.last_visit) : null,
			},
		});
	} catch (error) {
		console.error("[Patients/Stats] Error:", error);
		return c.json({
			data: { totalSessions: 0, upcomingAppointments: 0, lastVisit: null },
		});
	}
});

app.get("/:id", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		const conditions = withTenant(patients, user.organizationId, eq(patients.id, id));
	const query = sql`SELECT * FROM patients WHERE ${conditions} LIMIT 1`;
		const result = await db.execute(query);

		const row = result.rows[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);

		return c.json({ data: normalizePatientRow(row as DbRow) });
	} catch (error: any) {
		console.error("[Patients/Get] Error:", error.message);
		return c.json({ error: "Erro ao buscar paciente" }, 500);
	}
});

const updatePatientHandler = async (c: any) => {
	const user = c.get("user");
	const db = createDb(c.env);
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
	const body = (await c.req.json()) as PatientPayload;

	try {
		const updateValues = buildPatientWritePayload(
			body,
			user.organizationId,
			false,
		);
		if (Object.keys(updateValues).length === 0) {
			return c.json({ error: "Nenhum campo para atualizar" }, 400);
		}

		const result = await db
			.update(patients)
			.set(updateValues as any)
			.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
			.returning();

		const row = result[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);

		return c.json({ data: normalizePatientRow(row as DbRow) });
	} catch (error) {
		console.error("[Patients/Update] Error:", error);
		const { message, status } = dbErrorResponse(error);
		return c.json(
			{
				error: status === 409 ? message : "Erro ao atualizar paciente",
				details: message,
			},
			status,
		);
	}
};

app.put("/:id", updatePatientHandler);
app.patch("/:id", updatePatientHandler);

app.delete("/:id", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);
	const { id } = c.req.param();
	const mode = c.req.query("mode"); // 'hard' for real deletion, restricted to admin
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	const isAdmin = user.role === "admin" || user.email === "rafael.minatto@yahoo.com.br";

	try {
		if (isAdmin && mode === "hard") {
			console.log(`[Patients/Delete] Hard delete requested by admin ${user.email} for patient ${id}`);
			const result = await db
				.delete(patients)
				.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
				.returning({ id: patients.id });

			if (!result.length) return c.json({ error: "Paciente não encontrado" }, 404);
			return c.json({ success: true, deleted: true });
		}

		// Default behavior: Archive (Soft Delete)
		// preserves all data per healthcare legal requirements (CFisio/LGPD)
		const result = await db
			.update(patients)
			.set({ 
				isActive: false, 
				status: "Arquivado", 
				deletedAt: new Date(), 
				updatedAt: new Date() 
			})
			.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
			.returning({ id: patients.id });

		const row = result[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);
		return c.json({ success: true, archived: true });
	} catch (error) {
		console.error("[Patients/Delete] Error:", error);
		return c.json(
			{
				error: "Erro ao processar exclusão/arquivamento",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
});

app.get("/:id/timeline", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	const { id } = c.req.param();

	try {
		// Drizzle approach for timeline: using multiple queries for different tables
		// In a real refactor, we would use Drizzle's `union` if tables are compatible,
		// but since they have different structures, we keep separate queries.

		// 1. Fetch Communication Logs
		const comms = await db
			.select({
				id: sql`id`,
				entry_type: sql`type`,
				category: sql`'communication'`,
				subject: sql`subject`,
				body: sql`body`,
				status: sql`status`,
				created_at: sql`created_at`,
			})
			.from(sql`communication_logs`)
			.where(
				and(
					sql`patient_id = ${id}::uuid`,
					sql`organization_id = ${user.organizationId}::uuid`,
				),
			);

		// 2. Fetch Appointments
		const appointments = await db
			.select({
				id: sql`id`,
				entry_type: sql`'appointment'`,
				category: sql`'clinical'`,
				status: sql`status`,
				created_at: sql`date`,
				start_time: sql`start_time`,
				end_time: sql`end_time`,
			})
			.from(sql`appointments`)
			.where(
				and(
					sql`patient_id = ${id}::uuid`,
					sql`organization_id = ${user.organizationId}::uuid`,
				),
			);

		// 3. Fetch Evolutions (SOAP) from real session records so the timeline can
		// expose the complete clinical content instead of only an index preview.
		const sessionRows = await db
			.select()
			.from(sessions)
			.where(
				withTenant(sessions, user.organizationId, eq(sessions.patientId, id)),
			)
			.orderBy(desc(sessions.createdAt))
			.limit(50);

		const evolutions = sessionRows.map((row) => {
			const subjective = jsonbTextToString(row.subjective);
			const objective = jsonbTextToString(row.objective);
			const assessment = jsonbTextToString(row.assessment);
			const plan = jsonbTextToString(row.plan);
			const bodyPreview =
				[subjective, objective, assessment, plan]
					.filter(Boolean)
					.join("\n\n") || undefined;

			return {
				id: row.id,
				entry_type: "evolution",
				category: "clinical",
				status: String(row.status ?? "draft"),
				created_at: new Date(row.createdAt).toISOString(),
				appointment_id: row.appointmentId ?? undefined,
				record_date: row.date
					? new Date(row.date).toISOString().split("T")[0]
					: undefined,
				subjective,
				objective,
				assessment,
				plan,
				body: bodyPreview,
			};
		});

		// Combine and Sort
		const timeline = [...comms, ...appointments, ...evolutions].sort(
			(a: any, b: any) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);

		return c.json({ data: timeline });
	} catch (error) {
		console.error("[Patients/Timeline] Error:", error);
		return c.json(
			{
				error: "Erro ao carregar linha do tempo",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
});

app.get("/:id/export", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		// 1. Dados Básicos
		const patientResult = await db
			.select()
			.from(patients)
			.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
			.limit(1);
		
		const patient = patientResult[0];
		if (!patient) return c.json({ error: "Paciente não encontrado" }, 404);

		// 2. Prontuários (Medical Records) e suas sub-entidades
		const medicalRecords = await db
			.select()
			.from(sql`medical_records`)
			.where(and(sql`patient_id = ${id}::uuid`, sql`organization_id = ${user.organizationId}::uuid`));

		// 3. Sessões e Evoluções (SOAP)
		const patientSessions = await db
			.select()
			.from(sessions)
			.where(withTenant(sessions, user.organizationId, eq(sessions.patientId, id)));

		// 4. Agendamentos
		const patientAppointments = await db
			.select()
			.from(sql`appointments`)
			.where(and(sql`patient_id = ${id}::uuid`, sql`organization_id = ${user.organizationId}::uuid`));

		// 5. Histórico Financeiro
		const financialHistory = await db
			.select()
			.from(sql`financial_transactions`)
			.where(and(sql`patient_id = ${id}::uuid`, sql`organization_id = ${user.organizationId}::uuid`));

		const exportData = {
			exportedAt: new Date().toISOString(),
			clinicId: user.organizationId,
			patient: normalizePatientRow(patient as DbRow),
			medicalRecords,
			sessions: patientSessions,
			appointments: patientAppointments,
			financialHistory,
			legalNotice: "Este arquivo contém dados sensíveis protegidos pela LGPD. O uso indevido destas informações é de responsabilidade do portador."
		};

		return c.json({ data: exportData });
	} catch (error) {
		console.error("[Patients/Export] Error:", error);
		return c.json({ error: "Erro ao exportar dados do paciente" }, 500);
	}
});

registerPatientClinicalDetailRoutes(app);

export { app as patientsRoutes };
