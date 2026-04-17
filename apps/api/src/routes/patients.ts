import { Hono } from "hono";
import { eq, and, or, count, sql, desc, asc, isNull } from "drizzle-orm";
import { patients, sessions } from "@fisioflow/db";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb } from "../lib/db";
import { searchFilter, withTenant } from "../lib/db-utils";
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
	const fullName = row.full_name ?? row.fullName;
	const orgId = row.organization_id ?? row.organizationId;
	const phoneSecondary = row.phone_secondary ?? row.phoneSecondary;
	const photoUrl = row.photo_url ?? row.photoUrl;
	const profileId = row.profile_id ?? row.profileId;
	const userId = row.user_id ?? row.userId;
	const referredBy = row.referred_by ?? row.referredBy;
	const professionalId = row.professional_id ?? row.professionalId;
	const professionalName = row.professional_name ?? row.professionalName;
	const isActive = row.is_active ?? row.isActive;
	const mainCondition = row.main_condition ?? row.mainCondition;
	const bloodType = row.blood_type ?? row.bloodType;
	const weightKg = row.weight_kg ?? row.weightKg;
	const heightCm = row.height_cm ?? row.heightCm;
	const maritalStatus = row.marital_status ?? row.maritalStatus;
	const educationLevel = row.education_level ?? row.educationLevel;
	const sessionValue = row.session_value ?? row.sessionValue;
	const consentData = row.consent_data ?? row.consentData;
	const consentImage = row.consent_image ?? row.consentImage;
	const incompleteReg =
		row.incomplete_registration ?? row.incompleteRegistration;
	const birthDate =
		row.birth_date ?? row.legacyDateOfBirth ?? row.date_of_birth;
	const createdAt = row.created_at ?? row.createdAt;
	const updatedAt = row.updated_at ?? row.updatedAt;
	const rawEmergencyContact = row.emergency_contact ?? row.emergencyContact;
	const rawInsurance = row.insurance;

	const address = parseJsonObject(row.address);
	const emergencyContact = parseJsonObject(rawEmergencyContact);
	const insurance = parseJsonObject(rawInsurance);

	const name = trimmedString(fullName) ?? trimmedString(row.name) ?? "Sem nome";

	return {
		...row,
		id: String(row.id),
		name,
		full_name: name,
		organization_id: trimmedString(orgId) ?? "",
		organizationId: trimmedString(orgId) ?? "",
		phone: trimmedString(row.phone) ?? null,
		phone_secondary: trimmedString(phoneSecondary) ?? null,
		email: trimmedString(row.email) ?? null,
		cpf: trimmedString(row.cpf) ?? null,
		rg: trimmedString(row.rg) ?? null,
		photo_url: trimmedString(photoUrl) ?? null,
		profile_id: trimmedString(profileId) ?? null,
		user_id: trimmedString(userId) ?? null,
		referred_by: trimmedString(referredBy) ?? null,
		professional_id: trimmedString(professionalId) ?? null,
		professional_name: trimmedString(professionalName) ?? null,
		birth_date: birthDate ? String(birthDate) : null,
		gender: normalizeGenderFromDb(row.gender),
		nickname: trimmedString(row.nickname) ?? null,
		social_name: trimmedString(row.social_name ?? row.socialName) ?? null,
		address: trimmedString(address?.street ?? row.address) ?? null,
		city: trimmedString(address?.city ?? row.city) ?? null,
		state: trimmedString(address?.state ?? row.state) ?? null,
		zip_code: trimmedString(address?.cep ?? row.zip_code) ?? null,
		emergency_contact:
			trimmedString(emergencyContact?.name ?? rawEmergencyContact) ?? null,
		emergency_contact_relationship:
			trimmedString(
				emergencyContact?.relationship ?? row.emergency_contact_relationship,
			) ?? null,
		emergency_phone:
			trimmedString(emergencyContact?.phone ?? row.emergency_phone) ?? null,
		health_insurance:
			trimmedString(insurance?.provider ?? row.health_insurance) ?? null,
		insurance_number:
			trimmedString(insurance?.cardNumber ?? row.insurance_number) ?? null,
		main_condition: trimmedString(mainCondition) ?? null,
		profession: trimmedString(row.profession) ?? null,
		observations: trimmedString(row.observations ?? row.notes) ?? null,
		status: trimmedString(row.status) ?? "Inicial",
		progress: nullableNumber(row.progress) ?? 0,
		blood_type: trimmedString(bloodType) ?? null,
		weight_kg: nullableNumber(weightKg),
		height_cm: nullableNumber(heightCm),
		marital_status: trimmedString(maritalStatus) ?? null,
		education_level: trimmedString(educationLevel) ?? null,
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
	if (body.photo_url !== undefined) {
		payload.photoUrl = nullableString(body.photo_url);
	}
	if (body.session_value !== undefined) {
		payload.sessionValue = nullableNumber(body.session_value)?.toString();
	}

	payload.updatedAt = new Date();
	if (isCreate) {
		payload.createdAt = new Date();
	}

	return payload;
}

// Removed buildInsertStatement and buildUpdateStatement as we shift to Drizzle ORM

app.use("*", requireAuth);

app.get("/", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);

	const search = trimmedString(c.req.query("search"));
	const requestedStatus = trimmedString(c.req.query("status"));
	const sortBy = trimmedString(c.req.query("sortBy"));
	const limit = Math.min(
		200,
		Math.max(1, Number.parseInt(c.req.query("limit") ?? "100", 10) || 100),
	);
	const offset = Math.max(
		0,
		Number.parseInt(c.req.query("offset") ?? "0", 10) || 0,
	);

	try {
		let conditions: any = withTenant(patients, user.organizationId);

		const normalizedStatus = requestedStatus?.toLowerCase();
		if (normalizedStatus) {
			if (["active", "ativo"].includes(normalizedStatus)) {
				conditions = and(conditions, eq(patients.isActive, true))!;
			} else if (["inactive", "inativo"].includes(normalizedStatus)) {
				conditions = and(conditions, eq(patients.isActive, false))!;
			}
		} else {
			conditions = and(conditions, eq(patients.isActive, true))!;
		}

		if (search) {
			conditions = and(
				conditions,
				or(
					searchFilter(patients.fullName, search),
					searchFilter(patients.nickname, search),
					searchFilter(patients.socialName, search),
					searchFilter(patients.email, search),
					searchFilter(patients.cpf, search),
					searchFilter(patients.phone, search),
				),
			)!;
		}

		// Count total using sql<number> for consistency
		const totalResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(patients)
			.where(conditions);
		const total = Number(totalResult[0]?.count ?? 0);

		// Order by
		let orderBy: any = desc(patients.createdAt);
		if (sortBy === "created_at_asc") orderBy = asc(patients.createdAt);
		if (sortBy === "name_asc") orderBy = asc(patients.fullName);

		// Data query
		const data = await db
			.select()
			.from(patients)
			.where(conditions)
			.orderBy(orderBy)
			.limit(limit)
			.offset(offset);

		return c.json({
			data: data.map((row) => normalizePatientRow(row as DbRow)),
			total,
			page: Math.floor(offset / limit) + 1,
			perPage: limit,
		});
	} catch (error) {
		console.error("[Patients/List] Error:", error);
		return c.json(
			{
				data: [],
				total: 0,
				error: "Erro ao listar pacientes",
				details: error instanceof Error ? error.message : String(error),
			},
			500,
		);
	}
});

app.get("/last-updated", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);

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
	const db = createDb(c.env);
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

		const result = await db
			.insert(patients)
			.values(insertValues as any)
			.returning();
		const row = result[0];
		console.log("[Patients/Create] DB insert successful:", row?.id);

		if (!row) {
			console.log("[Patients/Create] Error: no row returned");
			return c.json({ error: "Falha ao criar paciente" }, 500);
		}

		const patient = normalizePatientRow(row as DbRow);
		console.log("[Patients/Create] Patient created:", patient.id);

		// Inngest Event: Patient Created (Sequência de Boas-vindas)
		triggerInngestEvent(
			c.env,
			c.executionCtx,
			"patient.created",
			{
				patientId: patient.id,
				name: patient.name,
				email: patient.email,
				phone: patient.phone,
			},
			{ id: user.uid },
		);

		return c.json({ data: patient }, 201);
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
	const db = createDb(c.env);
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		// Drizzle approach for stats: using sql template literal for complex aggregation
		// or multiple queries if needed. Here we stick to a custom select.
		const result = await db
			.select({
				total_sessions: sql<number>`count(*) filter (where status = 'completed')`,
				upcoming_appointments: sql<number>`count(*) filter (where date >= current_date and (status not in ('cancelled', 'completed') or status is null))`,
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
	const db = createDb(c.env);
	const { id } = c.req.param();
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		const result = await db
			.select()
			.from(patients)
			.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
			.limit(1);

		const row = result[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);

		return c.json({ data: normalizePatientRow(row as DbRow) });
	} catch (error) {
		console.error("[Patients/Get] Error:", error);
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
	if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);

	try {
		// Logically delete by setting isActive = false
		const result = await db
			.update(patients)
			.set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
			.where(withTenant(patients, user.organizationId, eq(patients.id, id)))
			.returning({ id: patients.id });

		const row = result[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);
		return c.json({ success: true });
	} catch (error) {
		console.error("[Patients/Delete] Error:", error);
		return c.json(
			{
				error: "Erro ao excluir paciente",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
});

app.get("/:id/timeline", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);
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

registerPatientClinicalDetailRoutes(app);

export { app as patientsRoutes };
