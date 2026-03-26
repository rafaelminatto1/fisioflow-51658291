import { Hono } from "hono";
import { eq, and, or, ilike, count, sql, desc, asc } from "drizzle-orm";
import { patients } from "@fisioflow/db";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import { triggerInngestEvent } from "../lib/inngest-client";
import { registerPatientClinicalDetailRoutes } from "./patients/clinical-details";
import {
	type DbPool,
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
	const address = parseJsonObject(row.address);
	const emergencyContact = parseJsonObject(row.emergency_contact);
	const insurance = parseJsonObject(row.insurance);

	return {
		...row,
		id: String(row.id),
		name: trimmedString(row.full_name) ?? trimmedString(row.name) ?? "Sem nome",
		full_name:
			trimmedString(row.full_name) ?? trimmedString(row.name) ?? "Sem nome",
		organization_id: trimmedString(row.organization_id) ?? "",
		organizationId: trimmedString(row.organization_id) ?? "",
		phone: trimmedString(row.phone) ?? null,
		phone_secondary: trimmedString(row.phone_secondary) ?? null,
		email: trimmedString(row.email) ?? null,
		cpf: trimmedString(row.cpf) ?? null,
		rg: trimmedString(row.rg) ?? null,
		birth_date: row.birth_date ? String(row.birth_date) : (row.legacyDateOfBirth ? String(row.legacyDateOfBirth) : null),
		gender: normalizeGenderFromDb(row.gender),
		address: trimmedString(address?.street ?? row.address) ?? null,
		city: trimmedString(address?.city ?? row.city) ?? null,
		state: trimmedString(address?.state ?? row.state) ?? null,
		zip_code: trimmedString(address?.cep ?? row.zip_code) ?? null,
		emergency_contact:
			trimmedString(emergencyContact?.name ?? row.emergency_contact) ?? null,
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
		main_condition: trimmedString(row.main_condition) ?? null,
		profession: trimmedString(row.profession) ?? null,
		observations: trimmedString(row.observations ?? row.notes) ?? null,
		status: trimmedString(row.status) ?? "Inicial",
		progress: nullableNumber(row.progress) ?? 0,
		blood_type: trimmedString(row.blood_type) ?? null,
		weight_kg: nullableNumber(row.weight_kg),
		height_cm: nullableNumber(row.height_cm),
		marital_status: trimmedString(row.marital_status) ?? null,
		education_level: trimmedString(row.education_level) ?? null,
		session_value: nullableNumber(row.session_value),
		consent_data: row.consent_data !== false,
		consent_image: Boolean(row.consent_image),
		incomplete_registration: Boolean(row.incomplete_registration),
		is_active: row.is_active !== false,
		isActive: row.is_active !== false,
		created_at: row.created_at
			? String(row.created_at)
			: new Date().toISOString(),
		updated_at: row.updated_at
			? String(row.updated_at)
			: new Date().toISOString(),
		createdAt: row.created_at
			? String(row.created_at)
			: new Date().toISOString(),
		updatedAt: row.updated_at
			? String(row.updated_at)
			: new Date().toISOString(),
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
		payload.incompleteRegistration = nullableBoolean(body.incomplete_registration);
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

function getPatientOrderClause(sortBy: string | undefined): string {
	switch (sortBy) {
		case "created_at_asc":
			return "created_at ASC, full_name ASC";
		case "created_at_desc":
			return "created_at DESC, full_name ASC";
		case "name_asc":
		default:
			return "full_name ASC, created_at DESC";
	}
}

app.use("*", requireAuth);

app.get("/", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);

	const search = trimmedString(c.req.query("search"));
	const requestedStatus = trimmedString(c.req.query("status"));
	const sortBy = trimmedString(c.req.query("sortBy"));
	const limit = Math.min(
		500,
		Math.max(1, Number.parseInt(c.req.query("limit") ?? "100", 10) || 100),
	);
	const offset = Math.max(
		0,
		Number.parseInt(c.req.query("offset") ?? "0", 10) || 0,
	);

	try {
		let conditions = eq(patients.organizationId, user.organizationId);

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
			const searchPattern = `%${search}%`;
			conditions = and(
				conditions,
				or(
					ilike(patients.fullName, searchPattern),
					ilike(patients.email, searchPattern),
					ilike(patients.cpf, searchPattern),
					ilike(patients.phone, searchPattern),
				),
			)!;
		}

		// Count total
		const totalResult = await db
			.select({ count: count() })
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
				error:
					error instanceof Error ? error.message : "Erro ao listar pacientes",
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
			.where(eq(patients.organizationId, user.organizationId));

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
				and(
					eq(patients.profileId, profileId),
					eq(patients.organizationId, user.organizationId),
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
	const body = (await c.req.json()) as PatientPayload;

	const fullName = trimmedString(body.full_name ?? body.name);
	if (!fullName) return c.json({ error: "Nome é obrigatório" }, 400);

	try {
		const insertValues = buildPatientWritePayload(
			body,
			user.organizationId,
			true,
		);
		insertValues.fullName = fullName;

		const result = await db
			.insert(patients)
			.values(insertValues as any)
			.returning();
		const row = result[0];

		if (!row) {
			return c.json({ error: "Falha ao criar paciente" }, 500);
		}

		const patient = normalizePatientRow(row as DbRow);

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
		return c.json(
			{
				error: "Erro ao criar paciente",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
});

app.get("/:id/stats", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);
	const { id } = c.req.param();

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

	try {
		const result = await db
			.select()
			.from(patients)
			.where(
				and(eq(patients.id, id), eq(patients.organizationId, user.organizationId)),
			)
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
	const body = (await c.req.json()) as PatientPayload;

	try {
		const updateValues = buildPatientWritePayload(body, user.organizationId, false);
		if (Object.keys(updateValues).length === 0) {
			return c.json({ error: "Nenhum campo para atualizar" }, 400);
		}

		const result = await db
			.update(patients)
			.set(updateValues as any)
			.where(
				and(eq(patients.id, id), eq(patients.organizationId, user.organizationId)),
			)
			.returning();

		const row = result[0];
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);

		return c.json({ data: normalizePatientRow(row as DbRow) });
	} catch (error) {
		console.error("[Patients/Update] Error:", error);
		return c.json(
			{
				error: "Erro ao atualizar paciente",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
};

app.put("/:id", updatePatientHandler);
app.patch("/:id", updatePatientHandler);

app.delete("/:id", async (c) => {
	const user = c.get("user");
	const db = createDb(c.env);
	const { id } = c.req.param();

	try {
		// Logically delete by setting isActive = false
		const result = await db
			.update(patients)
			.set({ isActive: false, updatedAt: new Date() })
			.where(
				and(eq(patients.id, id), eq(patients.organizationId, user.organizationId)),
			)
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

		// 3. Fetch Evolutions (SOAP)
		const evolutions = await db
			.select({
				id: sql`id`,
				entry_type: sql`'evolution'`,
				category: sql`'clinical'`,
				body: sql`preview_text`,
				created_at: sql`created_at`,
			})
			.from(sql`evolution_index`)
			.where(
				and(
					sql`patient_id = ${id}::uuid`,
					sql`organization_id = ${user.organizationId}::uuid`,
				),
			)
			.catch(() => []); // If table doesn't exist yet, return empty

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
