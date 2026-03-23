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

const tableColumnsCache = new Map<string, Promise<Set<string>>>();

function cacheKey(table: string) {
	return `public.${table}`;
}

async function getTableColumns(
	pool: DbPool,
	table: string,
): Promise<Set<string>> {
	const key = cacheKey(table);
	const cached = tableColumnsCache.get(key);
	if (cached) return cached;

	const pending = pool
		.query(
			`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
      `,
			[table],
		)
		.then(
			(result) =>
				new Set(result.rows.map((row) => String((row as DbRow).column_name))),
		);

	tableColumnsCache.set(key, pending);
	return pending;
}

async function hasColumn(
	pool: DbPool,
	table: string,
	column: string,
): Promise<boolean> {
	return (await getTableColumns(pool, table)).has(column);
}

async function hasTable(pool: DbPool, table: string): Promise<boolean> {
	return (await getTableColumns(pool, table)).size > 0;
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
		birth_date: row.birth_date ? String(row.birth_date) : null,
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
	availableColumns: Set<string>,
	organizationId: string,
	isCreate: boolean,
): Record<string, unknown> {
	const payload: Record<string, unknown> = {};

	if (isCreate && availableColumns.has("organization_id")) {
		payload.organization_id = organizationId;
	}

	if (body.full_name !== undefined || body.name !== undefined) {
		payload.full_name = trimmedString(body.full_name ?? body.name) ?? "";
	}

	if (availableColumns.has("email") && body.email !== undefined) {
		payload.email = nullableString(body.email);
	}
	if (availableColumns.has("phone") && (body.phone !== undefined || isCreate)) {
		payload.phone = nullableString(body.phone) ?? (isCreate ? "" : null);
	}
	if (
		availableColumns.has("phone_secondary") &&
		body.phone_secondary !== undefined
	) {
		payload.phone_secondary = nullableString(body.phone_secondary);
	}
	if (availableColumns.has("cpf") && body.cpf !== undefined) {
		payload.cpf = nullableString(body.cpf);
	}
	if (availableColumns.has("rg") && body.rg !== undefined) {
		payload.rg = nullableString(body.rg);
	}
	if (availableColumns.has("birth_date") && body.birth_date !== undefined) {
		payload.birth_date = nullableString(body.birth_date);
	}
	if (availableColumns.has("gender") && body.gender !== undefined) {
		payload.gender = normalizeGenderToDb(body.gender);
	}
	if (
		availableColumns.has("address") &&
		["address", "city", "state", "zip_code"].some(
			(key) => body[key] !== undefined,
		)
	) {
		payload.address = buildAddressPayload(body);
	}
	if (
		availableColumns.has("emergency_contact") &&
		[
			"emergency_contact",
			"emergency_phone",
			"emergency_contact_relationship",
		].some((key) => body[key] !== undefined)
	) {
		payload.emergency_contact = buildEmergencyContactPayload(body);
	}
	if (
		availableColumns.has("insurance") &&
		[
			"health_insurance",
			"insurance_plan",
			"insurance_number",
			"insurance_validity",
		].some((key) => body[key] !== undefined)
	) {
		payload.insurance = buildInsurancePayload(body);
	}
	if (
		availableColumns.has("main_condition") &&
		body.main_condition !== undefined
	) {
		payload.main_condition = nullableString(body.main_condition);
	}
	if (availableColumns.has("profession") && body.profession !== undefined) {
		payload.profession = nullableString(body.profession);
	}
	if (availableColumns.has("observations") && body.observations !== undefined) {
		payload.observations = nullableString(body.observations);
	}
	if (availableColumns.has("notes") && body.observations !== undefined) {
		payload.notes = nullableString(body.observations);
	}
	if (
		availableColumns.has("status") &&
		(body.status !== undefined || isCreate)
	) {
		payload.status = normalizePatientStatus(body.status);
	}
	if (
		availableColumns.has("is_active") &&
		(body.is_active !== undefined || body.status !== undefined || isCreate)
	) {
		payload.is_active = deriveIsActive(body);
	}
	if (
		availableColumns.has("progress") &&
		(body.progress !== undefined || isCreate)
	) {
		payload.progress = nullableNumber(body.progress) ?? 0;
	}
	if (availableColumns.has("blood_type") && body.blood_type !== undefined) {
		payload.blood_type = nullableString(body.blood_type);
	}
	if (availableColumns.has("weight_kg") && body.weight_kg !== undefined) {
		payload.weight_kg = nullableNumber(body.weight_kg);
	}
	if (availableColumns.has("height_cm") && body.height_cm !== undefined) {
		payload.height_cm = nullableNumber(body.height_cm);
	}
	if (
		availableColumns.has("marital_status") &&
		body.marital_status !== undefined
	) {
		payload.marital_status = nullableString(body.marital_status);
	}
	if (
		availableColumns.has("education_level") &&
		body.education_level !== undefined
	) {
		payload.education_level = nullableString(body.education_level);
	}
	if (availableColumns.has("consent_data") && body.consent_data !== undefined) {
		payload.consent_data = nullableBoolean(body.consent_data);
	}
	if (
		availableColumns.has("consent_image") &&
		body.consent_image !== undefined
	) {
		payload.consent_image = nullableBoolean(body.consent_image);
	}
	if (
		availableColumns.has("incomplete_registration") &&
		body.incomplete_registration !== undefined
	) {
		payload.incomplete_registration = nullableBoolean(
			body.incomplete_registration,
		);
	}
	if (availableColumns.has("origin") && body.origin !== undefined) {
		payload.origin = nullableString(body.origin);
	}
	if (availableColumns.has("referred_by") && body.referred_by !== undefined) {
		payload.referred_by = nullableString(body.referred_by);
	}
	if (availableColumns.has("photo_url") && body.photo_url !== undefined) {
		payload.photo_url = nullableString(body.photo_url);
	}
	if (
		availableColumns.has("session_value") &&
		body.session_value !== undefined
	) {
		payload.session_value = nullableNumber(body.session_value);
	}
	if (availableColumns.has("updated_at")) {
		payload.updated_at = new Date().toISOString();
	}
	if (isCreate && availableColumns.has("created_at")) {
		payload.created_at = new Date().toISOString();
	}

	return Object.fromEntries(
		Object.entries(payload).filter(([, value]) => value !== undefined),
	);
}

function buildInsertStatement(table: string, values: Record<string, unknown>) {
	const entries = Object.entries(values);
	const columns = entries.map(([column]) => column);
	const placeholders = entries.map((_, index) => `$${index + 1}`);
	const params = entries.map(([, value]) => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return JSON.stringify(value);
		}
		if (Array.isArray(value)) {
			return JSON.stringify(value);
		}
		return value;
	});

	return {
		sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
		params,
	};
}

function buildUpdateStatement(
	table: string,
	idColumn: string,
	idValue: string,
	organizationId: string,
	values: Record<string, unknown>,
) {
	const entries = Object.entries(values);
	const sets = entries.map(([column], index) => `${column} = $${index + 1}`);
	const params = entries.map(([, value]) => {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return JSON.stringify(value);
		}
		if (Array.isArray(value)) {
			return JSON.stringify(value);
		}
		return value;
	});

	params.push(idValue, organizationId);

	return {
		sql: `UPDATE ${table}
          SET ${sets.join(", ")}
          WHERE ${idColumn} = $${params.length - 1}::uuid
            AND organization_id = $${params.length}::uuid
          RETURNING *`,
		params,
	};
}

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
	const db = await createPool(c.env);

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
		const params: any[] = [user.organizationId];
		let where = `WHERE organization_id = $1::uuid`;
		let idx = 2;

		const normalizedStatus = requestedStatus?.toLowerCase();
		if (normalizedStatus) {
			if (["active", "ativo"].includes(normalizedStatus)) {
				where += ` AND is_active = true`;
			} else if (["inactive", "inativo"].includes(normalizedStatus)) {
				where += ` AND is_active = false`;
			}
		} else {
			where += ` AND is_active = true`;
		}

		if (search) {
			const searchPattern = `%${search}%`;
			params.push(searchPattern);
			where += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx} OR cpf ILIKE $${idx} OR phone ILIKE $${idx})`;
			idx++;
		}

		// Count total
		const totalResult = await db.query(
			`SELECT COUNT(*) as count FROM patients ${where}`,
			params,
		);
		const total = Number(totalResult.rows[0]?.count ?? 0);

		// Order by
		let orderBy = "full_name ASC, created_at DESC";
		if (sortBy === "created_at_asc") orderBy = "created_at ASC, full_name ASC";
		if (sortBy === "created_at_desc")
			orderBy = "created_at DESC, full_name ASC";

		// Data query
		const finalParams = [...params, limit, offset];
		const dataResult = await db.query(
			`SELECT * FROM patients ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
			finalParams,
		);

		return c.json({
			data: dataResult.rows.map((row) => normalizePatientRow(row as DbRow)),
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
	const db = await createPool(c.env);

	if (!(await hasColumn(db, "patients", "updated_at"))) {
		return c.json({ data: { last_updated_at: null } });
	}

	const result = await db.query(
		`
      SELECT MAX(updated_at) AS last_updated_at
      FROM patients
      WHERE organization_id = $1::uuid
    `,
		[user.organizationId],
	);

	const lastUpdated = (result.rows[0] as DbRow | undefined)?.last_updated_at;
	return c.json({
		data: { last_updated_at: lastUpdated ? String(lastUpdated) : null },
	});
});

app.get("/by-profile/:profileId", async (c) => {
	const user = c.get("user");
	const db = await createPool(c.env);
	const { profileId } = c.req.param();

	if (!(await hasColumn(db, "patients", "profile_id"))) {
		return c.json({ data: null });
	}

	const result = await db.query(
		`
      SELECT *
      FROM patients
      WHERE profile_id = $1::uuid
        AND organization_id = $2::uuid
      LIMIT 1
    `,
		[profileId, user.organizationId],
	);

	const row = result.rows[0] as DbRow | undefined;
	return c.json({ data: row ? normalizePatientRow(row) : null });
});

app.post("/", async (c) => {
	const user = c.get("user");
	const db = await createPool(c.env);
	const body = (await c.req.json()) as PatientPayload;
	const columns = await getTableColumns(db, "patients");

	if (columns.size === 0) {
		return c.json({ error: "Tabela patients não encontrada no Neon DB" }, 500);
	}

	const fullName = trimmedString(body.full_name ?? body.name);
	if (!fullName) return c.json({ error: "Nome é obrigatório" }, 400);

	try {
		const insertValues = buildPatientWritePayload(
			body,
			columns,
			user.organizationId,
			true,
		);
		insertValues.full_name = fullName;

		const { sql, params } = buildInsertStatement("patients", insertValues);
		const result = await db.query(sql, params);
		const row = result.rows[0] as DbRow | undefined;

		if (!row) {
			return c.json({ error: "Falha ao criar paciente" }, 500);
		}

		const patient = normalizePatientRow(row);

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
	const db = await createPool(c.env, 15000); // 15s timeout for complex stats query
	const { id } = c.req.param();

	if (!(await hasTable(db, "appointments"))) {
		return c.json({
			data: { totalSessions: 0, upcomingAppointments: 0, lastVisit: null },
		});
	}

	const result = await db.query(
		`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::int AS total_sessions,
        COUNT(*) FILTER (
          WHERE date >= CURRENT_DATE
            AND (status NOT IN ('cancelled', 'completed') OR status IS NULL)
        )::int AS upcoming_appointments,
        MAX(date) FILTER (WHERE date <= CURRENT_DATE) AS last_visit
      FROM appointments
      WHERE patient_id = $1::uuid
        AND organization_id = $2::uuid
    `,
		[id, user.organizationId],
	);

	const row = (result.rows[0] as DbRow | undefined) ?? {};

	return c.json({
		data: {
			totalSessions: Number(row.total_sessions ?? 0),
			upcomingAppointments: Number(row.upcoming_appointments ?? 0),
			lastVisit: row.last_visit ? String(row.last_visit) : null,
		},
	});
});

app.get("/:id", async (c) => {
	const user = c.get("user");
	const db = await createPool(c.env);
	const { id } = c.req.param();

	try {
		const result = await db.query(
			`
        SELECT *
        FROM patients
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        LIMIT 1
      `,
			[id, user.organizationId],
		);

		const row = result.rows[0] as DbRow | undefined;
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);
		return c.json({ data: normalizePatientRow(row) });
	} catch (error) {
		return c.json(
			{
				error: "Erro ao buscar paciente",
				details: error instanceof Error ? error.message : "Erro desconhecido",
			},
			500,
		);
	}
});

const updatePatientHandler = async (c: any) => {
	const user = c.get("user");
	const db = await createPool(c.env);
	const { id } = c.req.param();
	const body = (await c.req.json()) as PatientPayload;
	const columns = await getTableColumns(db, "patients");

	try {
		const updateValues = buildPatientWritePayload(
			body,
			columns,
			user.organizationId,
			false,
		);
		if (Object.keys(updateValues).length === 0) {
			return c.json({ error: "Nenhum campo para atualizar" }, 400);
		}

		const { sql, params } = buildUpdateStatement(
			"patients",
			"id",
			id,
			user.organizationId,
			updateValues,
		);
		const result = await db.query(sql, params);
		const row = result.rows[0] as DbRow | undefined;

		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);
		return c.json({ data: normalizePatientRow(row) });
	} catch (error) {
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
	const db = await createPool(c.env);
	const { id } = c.req.param();
	const columns = await getTableColumns(db, "patients");

	try {
		// Usa archived se disponível, senão usa is_active, senão faz hard delete
		let sql: string;
		if (columns.has("archived")) {
			sql = `
        UPDATE patients
        SET archived = true, updated_at = NOW()
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        RETURNING id
      `;
		} else if (columns.has("is_active")) {
			sql = `
        UPDATE patients
        SET is_active = false, updated_at = NOW()
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        RETURNING id
      `;
		} else {
			sql = `
        DELETE FROM patients
        WHERE id = $1::uuid
          AND organization_id = $2::uuid
        RETURNING id
      `;
		}

		const result = await db.query(sql, [id, user.organizationId]);

		const row = result.rows[0] as DbRow | undefined;
		if (!row) return c.json({ error: "Paciente não encontrado" }, 404);
		return c.json({ success: true });
	} catch (error) {
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
	const db = await createPool(c.env);
	const { id } = c.req.param();

	try {
		// 1. Fetch Communication Logs
		const commsResult = await db.query(
			`SELECT id, type as entry_type, 'communication' as category, subject, body, status, created_at
       FROM communication_logs 
       WHERE patient_id = $1::uuid AND organization_id = $2::uuid`,
			[id, user.organizationId],
		);

		// 2. Fetch Appointments
		const appointmentsResult = await db.query(
			`SELECT id, 'appointment' as entry_type, 'clinical' as category, status, date as created_at, start_time, end_time
       FROM appointments 
       WHERE patient_id = $1::uuid AND organization_id = $2::uuid`,
			[id, user.organizationId],
		);

		// 3. Fetch Evolutions (SOAP)
		let evolutions: any[] = [];
		if (await hasTable(db, "evolution_index")) {
			const evolResult = await db.query(
				`SELECT id, 'evolution' as entry_type, 'clinical' as category, preview_text as body, created_at
         FROM evolution_index 
         WHERE patient_id = $1::uuid AND organization_id = $2::uuid`,
				[id, user.organizationId],
			);
			evolutions = evolResult.rows;
		}

		// Combine and Sort
		const timeline = [
			...commsResult.rows,
			...appointmentsResult.rows,
			...evolutions,
		].sort(
			(a, b) =>
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);

		return c.json({ data: timeline });
	} catch (error: any) {
		console.error("[Patients/Timeline] Error:", error);
		return c.json(
			{ error: "Erro ao carregar linha do tempo", details: error.message },
			500,
		);
	}
});

registerPatientClinicalDetailRoutes(app);

export { app as patientsRoutes };
