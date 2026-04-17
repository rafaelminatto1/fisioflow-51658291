import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "../lib/auth";
import { createDb, createPool } from "../lib/db";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

const PROFILE_SELECT_COLUMNS = [
	"id",
	"user_id",
	"name",
	"email",
	"full_name",
	"phone",
	"role",
	"crefito",
	"specialties",
	"bio",
	"avatar_url",
	"address",
	"birth_date",
	"slug",
	"organization_id",
	"email_verified",
	"preferences",
	"created_at",
	"updated_at",
] as const;

const PROFILE_SELECT_COLUMN_SQL = PROFILE_SELECT_COLUMNS.map(
	(column) => `'${column}'`,
).join(", ");

type ProfileColumn = (typeof PROFILE_SELECT_COLUMNS)[number];
type ProfileColumnMap = Partial<
	Record<ProfileColumn, { dataType: string; udtName: string }>
>;

async function getProfileColumns(
	pool: ReturnType<typeof createPool>,
): Promise<ProfileColumnMap> {
	const result = await pool.query(
		`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name IN (${PROFILE_SELECT_COLUMN_SQL})
    `,
	);

	return Object.fromEntries(
		result.rows.map(
			(row: {
				column_name?: unknown;
				data_type?: unknown;
				udt_name?: unknown;
			}) => [
				row.column_name as ProfileColumn,
				{
					dataType: String(row.data_type ?? ""),
					udtName: String(row.udt_name ?? ""),
				},
			],
		),
	) as ProfileColumnMap;
}

function hasProfileColumn(
	columns: ProfileColumnMap,
	column: ProfileColumn,
): boolean {
	return Boolean(columns[column]);
}

function selectColumnOrNull(
	columns: ProfileColumnMap,
	column: ProfileColumn,
	pgType: string,
): string {
	return hasProfileColumn(columns, column)
		? `"${column}"`
		: `NULL::${pgType} AS "${column}"`;
}

function buildFullNameSelect(columns: ProfileColumnMap): string {
	const fallbacks: string[] = [];
	if (hasProfileColumn(columns, "full_name")) {
		fallbacks.push(`NULLIF("full_name", '')`);
	}
	if (hasProfileColumn(columns, "name")) {
		fallbacks.push(`NULLIF("name", '')`);
	}
	if (hasProfileColumn(columns, "email")) {
		fallbacks.push(`NULLIF(split_part("email", '@', 1), '')`);
	}
	fallbacks.push(`'Usuário'`);

	return `COALESCE(${fallbacks.join(", ")}) AS "full_name"`;
}

function buildAddressSelect(columns: ProfileColumnMap): string {
	const address = columns.address;
	if (!address) return `NULL::text AS "address"`;

	if (address.dataType === "jsonb" || address.dataType === "json") {
		return `
      CASE
        WHEN "address" IS NULL THEN NULL
        WHEN jsonb_typeof("address"::jsonb) = 'string' THEN "address"::jsonb #>> '{}'
        WHEN "address"::jsonb ? 'formatted' THEN "address"::jsonb ->> 'formatted'
        ELSE "address"::text
      END AS "address"
    `;
	}

	return `"address"::text AS "address"`;
}

function buildSpecialtySelects(columns: ProfileColumnMap): string[] {
	const specialties = columns.specialties;
	if (!specialties) {
		return [`NULL::jsonb AS "specialties"`, `NULL::text AS "specialty"`];
	}

	if (specialties.dataType === "jsonb" || specialties.dataType === "json") {
		return [
			`"specialties"`,
			`
        CASE
          WHEN "specialties" IS NULL THEN NULL
          WHEN jsonb_typeof("specialties"::jsonb) = 'array' THEN "specialties"::jsonb ->> 0
          WHEN jsonb_typeof("specialties"::jsonb) = 'string' THEN "specialties"::jsonb #>> '{}'
          ELSE NULL
        END AS "specialty"
      `,
		];
	}

	return [`"specialties"`, `"specialties"::text AS "specialty"`];
}

function buildProfileSelectList(columns: ProfileColumnMap): string {
	return [
		selectColumnOrNull(columns, "id", "uuid"),
		selectColumnOrNull(columns, "user_id", "text"),
		selectColumnOrNull(columns, "email", "text"),
		buildFullNameSelect(columns),
		selectColumnOrNull(columns, "phone", "text"),
		selectColumnOrNull(columns, "role", "text"),
		selectColumnOrNull(columns, "crefito", "text"),
		...buildSpecialtySelects(columns),
		selectColumnOrNull(columns, "bio", "text"),
		selectColumnOrNull(columns, "avatar_url", "text"),
		buildAddressSelect(columns),
		selectColumnOrNull(columns, "birth_date", "date"),
		selectColumnOrNull(columns, "slug", "text"),
		selectColumnOrNull(columns, "organization_id", "uuid"),
		selectColumnOrNull(columns, "email_verified", "boolean"),
		selectColumnOrNull(columns, "preferences", "jsonb"),
		selectColumnOrNull(columns, "created_at", "timestamp"),
		selectColumnOrNull(columns, "updated_at", "timestamp"),
	].join(",\n        ");
}

app.get("/me", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = createPool(c.env);

	const fallbackProfile = {
		id: user.uid,
		user_id: user.uid,
		email: user.email ?? null,
		full_name: user.email?.split("@")[0] ?? "Usuário",
		role: user.role ?? "admin",
		organization_id: user.organizationId,
		email_verified: false,
	};

	try {
		const columns = await getProfileColumns(pool);
		const whereColumn = hasProfileColumn(columns, "user_id")
			? "user_id"
			: hasProfileColumn(columns, "id")
				? "id"
				: null;

		if (!whereColumn) return c.json({ data: fallbackProfile });

		const profile = await pool.query(
			`
        SELECT
        ${buildProfileSelectList(columns)}
        FROM profiles
        WHERE "${whereColumn}"::text = $1
        LIMIT 1
      `,
			[user.uid],
		);

		if (!profile.rows.length) return c.json({ data: fallbackProfile });
		const row = profile.rows[0];

		return c.json({
			data: {
				...fallbackProfile,
				...row,
				id: row.id ?? fallbackProfile.id,
				user_id: row.user_id ?? fallbackProfile.user_id,
				email: row.email ?? fallbackProfile.email,
				full_name: row.full_name ?? fallbackProfile.full_name,
				role: row.role ?? fallbackProfile.role,
				organization_id: row.organization_id ?? fallbackProfile.organization_id,
				email_verified: Boolean(row.email_verified),
			},
		});
	} catch (error) {
		console.error("[Profile/Me] error:", error);
		return c.json({ data: fallbackProfile });
	}
});

app.get("/therapists", requireAuth, async (c) => {
	const user = c.get("user");
	const db = createDb(c.env, 'read');
	try {
		const therapists = await db.query.profiles.findMany({
			where: (profiles, { and, eq, inArray }) =>
				and(
					eq(profiles.organizationId, user.organizationId),
					inArray(profiles.role, ["admin", "fisioterapeuta"]),
				),
			columns: {
				id: true,
				fullName: true,
			},
		});

		return c.json({
			data: therapists.map((t) => ({ id: t.id, name: t.fullName })),
		});
	} catch (error) {
		console.error("[Profile/Therapists] Drizzle error:", error);
		return c.json({ data: [] });
	}
});

app.put("/me", requireAuth, async (c) => {
	const user = c.get("user");
	const pool = createPool(c.env);
	const payload: Record<string, unknown> = await c.req
		.json<Record<string, unknown>>()
		.catch(() => ({}) as Record<string, unknown>);

	const hasFullName = typeof payload.full_name === "string";
	const hasBirthDate = Object.hasOwn(payload, "birth_date");

	if (!hasFullName && !hasBirthDate) {
		return c.json(
			{ error: "Nenhum campo suportado enviado para atualizacao." },
			400,
		);
	}

	const fullName = hasFullName ? String(payload.full_name).trim() : null;
	const birthDateValue =
		hasBirthDate &&
		typeof payload.birth_date === "string" &&
		payload.birth_date.trim()
			? String(payload.birth_date).trim()
			: null;

	try {
		const existing = await pool.query(
			`
        SELECT id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        FROM profiles
        WHERE user_id = $1
        LIMIT 1
      `,
			[user.uid],
		);

		const query =
			existing.rows.length > 0
				? `
          UPDATE profiles
          SET
            full_name = CASE WHEN $1::boolean THEN $2 ELSE full_name END,
            birth_date = CASE WHEN $3::boolean THEN $4::date ELSE birth_date END,
            updated_at = NOW()
          WHERE user_id = $5
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        `
				: `
          INSERT INTO profiles (
            user_id,
            email,
            full_name,
            role,
            organization_id,
            birth_date,
            created_at,
            updated_at
          )
          VALUES ($5, $6, $7, $8, $9, $10::date, NOW(), NOW())
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, created_at, updated_at
        `;

		const params =
			existing.rows.length > 0
				? [hasFullName, fullName, hasBirthDate, birthDateValue, user.uid]
				: [
						hasFullName,
						fullName,
						hasBirthDate,
						birthDateValue,
						user.uid,
						user.email ?? null,
						fullName || user.email?.split("@")[0] || "Usuário",
						user.role ?? "admin",
						user.organizationId,
						birthDateValue,
					];

		const result = await pool.query(query, params);
		const row = result.rows[0];

		return c.json({
			data: {
				id: row.id,
				user_id: row.user_id,
				email: row.email,
				full_name: row.full_name,
				role: row.role,
				organization_id: row.organization_id,
				birth_date: row.birth_date,
				created_at: row.created_at,
				updated_at: row.updated_at,
			},
		});
	} catch (error) {
		console.error("[Profile/Update] error:", error);
		return c.json({ error: "Falha ao atualizar perfil." }, 500);
	}
});

app.get("/users/:id", requireAuth, async (c) => {
	const userId = c.req.param("id");
	const pool = createPool(c.env);

	try {
		const profileResult = await pool.query(
			`
        SELECT id, user_id, email, full_name, phone, role, crefito, specialties, bio,
               avatar_url, organization_id, is_active, email_verified, preferences,
               created_at, updated_at
        FROM profiles
        WHERE user_id = $1
        LIMIT 1
      `,
			[userId],
		);

		if (profileResult.rows.length === 0) {
			return c.json({ error: "Perfil não encontrado" }, 404);
		}

		const profile = profileResult.rows[0];

		const orgResult = await pool.query(
			`
        SELECT id, name, trade_name, phone, address
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
			[profile.organization_id],
		);

		const organization = orgResult.rows[0];

		return c.json({
			id: profile.user_id,
			name: profile.full_name,
			email: profile.email,
			phone: profile.phone || undefined,
			specialty:
				Array.isArray(profile.specialties) && profile.specialties.length > 0
					? profile.specialties[0]
					: undefined,
			crefito: profile.crefito || undefined,
			avatarUrl: profile.avatar_url || undefined,
			bio: profile.bio || undefined,
			clinicName: organization?.name || undefined,
			clinicAddress: organization?.address
				? organization.address.toString()
				: undefined,
			clinicPhone: organization?.phone || undefined,
			organizationId: profile.organization_id,
			createdAt: profile.created_at,
			updatedAt: profile.updated_at,
		});
	} catch (error) {
		console.error("[Profile/UserById] error:", error);
		return c.json({ error: "Erro ao buscar perfil." }, 500);
	}
});

app.put("/users/:id", requireAuth, async (c) => {
	const currentUser = c.get("user");
	const userId = c.req.param("id");
	const pool = createPool(c.env);
	const payload: Record<string, unknown> = await c.req
		.json<Record<string, unknown>>()
		.catch(() => ({}) as Record<string, unknown>);

	if (userId !== currentUser.uid && currentUser.role !== "admin") {
		return c.json({ error: "Acesso negado" }, 403);
	}

	try {
		const profileUpdate: string[] = [];
		const profileValues: unknown[] = [];
		let paramIndex = 1;

		if (typeof payload.name === "string" && payload.name.trim()) {
			profileUpdate.push(`full_name = $${paramIndex}`);
			profileValues.push(payload.name.trim());
			paramIndex++;
		}

		if (typeof payload.phone === "string" && payload.phone.trim()) {
			profileUpdate.push(`phone = $${paramIndex}`);
			profileValues.push(payload.phone.trim());
			paramIndex++;
		}

		if (typeof payload.specialty === "string" && payload.specialty.trim()) {
			profileUpdate.push(`specialties = $${paramIndex}`);
			profileValues.push(JSON.stringify([payload.specialty.trim()]));
			paramIndex++;
		}

		if (typeof payload.crefito === "string" && payload.crefito.trim()) {
			profileUpdate.push(`crefito = $${paramIndex}`);
			profileValues.push(payload.crefito.trim());
			paramIndex++;
		}

		if (typeof payload.avatarUrl === "string" && payload.avatarUrl.trim()) {
			profileUpdate.push(`avatar_url = $${paramIndex}`);
			profileValues.push(payload.avatarUrl.trim());
			paramIndex++;
		}

		if (typeof payload.bio === "string") {
			profileUpdate.push(`bio = $${paramIndex}`);
			profileValues.push(payload.bio.trim());
			paramIndex++;
		}

		if (profileUpdate.length === 0) {
			return c.json({ error: "Nenhum campo válido fornecido" }, 400);
		}

		profileUpdate.push("updated_at = NOW()");

		await pool.query(
			`
        UPDATE profiles
        SET ${profileUpdate.join(", ")}
        WHERE user_id = $${paramIndex}
      `,
			[...profileValues, userId],
		);

		const organizationUpdate: string[] = [];
		const organizationValues: unknown[] = [];
		paramIndex = 1;

		if (typeof payload.clinicName === "string" && payload.clinicName.trim()) {
			organizationUpdate.push(`name = $${paramIndex}`);
			organizationValues.push(payload.clinicName.trim());
			paramIndex++;
		}

		if (
			typeof payload.clinicAddress === "string" &&
			payload.clinicAddress.trim()
		) {
			organizationUpdate.push(`address = $${paramIndex}`);
			organizationValues.push(
				JSON.stringify({ formatted: payload.clinicAddress.trim() }),
			);
			paramIndex++;
		}

		if (typeof payload.clinicPhone === "string" && payload.clinicPhone.trim()) {
			organizationUpdate.push(`phone = $${paramIndex}`);
			organizationValues.push(payload.clinicPhone.trim());
			paramIndex++;
		}

		if (organizationUpdate.length > 0) {
			const orgIdResult = await pool.query(
				`SELECT organization_id FROM profiles WHERE user_id = $1`,
				[userId],
			);

			if (orgIdResult.rows.length > 0) {
				organizationUpdate.push("updated_at = NOW()");

				await pool.query(
					`
            UPDATE organizations
            SET ${organizationUpdate.join(", ")}
            WHERE id = $${paramIndex}
          `,
					[...organizationValues, orgIdResult.rows[0].organization_id],
				);
			}
		}

		const updatedProfile = await pool.query(
			`
        SELECT id, user_id, email, full_name, phone, role, crefito, specialties, bio,
               avatar_url, organization_id, created_at, updated_at
        FROM profiles
        WHERE user_id = $1
        LIMIT 1
      `,
			[userId],
		);

		const profile = updatedProfile.rows[0];

		const orgResult = await pool.query(
			`
        SELECT id, name, trade_name, phone, address
        FROM organizations
        WHERE id = $1
        LIMIT 1
      `,
			[profile.organization_id],
		);

		const organization = orgResult.rows[0];

		return c.json({
			id: profile.user_id,
			name: profile.full_name,
			email: profile.email,
			phone: profile.phone || undefined,
			specialty:
				Array.isArray(profile.specialties) && profile.specialties.length > 0
					? profile.specialties[0]
					: undefined,
			crefito: profile.crefito || undefined,
			avatarUrl: profile.avatar_url || undefined,
			bio: profile.bio || undefined,
			clinicName: organization?.name || undefined,
			clinicAddress: organization?.address
				? organization.address.toString()
				: undefined,
			clinicPhone: organization?.phone || undefined,
			organizationId: profile.organization_id,
			createdAt: profile.created_at,
			updatedAt: profile.updated_at,
		});
	} catch (error) {
		console.error("[Profile/UpdateUser] error:", error);
		return c.json({ error: "Erro ao atualizar perfil." }, 500);
	}
});

export { app as profileRoutes };
