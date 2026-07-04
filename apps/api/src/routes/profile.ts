import { Hono } from "hono";
import { type AuthVariables, requireAuth } from "../lib/auth";
import { createPool } from "../lib/db";
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
  "roles",
  "crefito",
  "specialties",
  "bio",
  "avatar_url",
  "address",
  "birth_date",
  "gender",
  "slug",
  "organization_id",
  "email_verified",
  "preferences",
  "created_at",
  "updated_at",
] as const;

const PROFILE_SELECT_COLUMN_SQL = PROFILE_SELECT_COLUMNS.map((column) => `'${column}'`).join(", ");

type ProfileColumn = (typeof PROFILE_SELECT_COLUMNS)[number];
type ProfileColumnMap = Partial<Record<ProfileColumn, { dataType: string; udtName: string }>>;

async function getProfileColumns(pool: ReturnType<typeof createPool>): Promise<ProfileColumnMap> {
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
    result.rows.map((row: { column_name?: unknown; data_type?: unknown; udt_name?: unknown }) => [
      row.column_name as ProfileColumn,
      {
        dataType: String(row.data_type ?? ""),
        udtName: String(row.udt_name ?? ""),
      },
    ]),
  ) as ProfileColumnMap;
}

function hasProfileColumn(columns: ProfileColumnMap, column: ProfileColumn): boolean {
  return Boolean(columns[column]);
}

function selectColumnOrNull(
  columns: ProfileColumnMap,
  column: ProfileColumn,
  pgType: string,
): string {
  return hasProfileColumn(columns, column) ? `"${column}"` : `NULL::${pgType} AS "${column}"`;
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
    hasProfileColumn(columns, "roles") ? `"roles"` : `NULL::text[] AS "roles"`,
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
    role: user.role ?? "viewer",
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
        WHERE "user_id" = $1
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
  const pool = createPool(c.env);
  try {
    // Include users whose primary role is fisioterapeuta OR who have fisioterapeuta in their roles array (multi-role support)
    const result = await pool.query(
      `SELECT id, COALESCE(NULLIF(full_name,''), NULLIF(name,''), split_part(email,'@',1), 'Sem nome') AS name, crefito
       FROM profiles
       WHERE organization_id = $1
         AND (role = 'fisioterapeuta' OR ('fisioterapeuta' = ANY(roles) AND roles IS NOT NULL))
         AND (is_active IS NULL OR is_active = true)
       ORDER BY name ASC`,
      [user.organizationId],
    );

    return c.json({
      data: result.rows.map((t: any) => ({
        id: String(t.id),
        name: String(t.name),
        crefito: t.crefito ?? undefined,
      })),
    });
  } catch (error) {
    console.error("[Profile/Therapists] error:", error);
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
  const hasGender = Object.hasOwn(payload, "gender");

  if (!hasFullName && !hasBirthDate && !hasGender) {
    return c.json({ error: "Nenhum campo suportado enviado para atualizacao." }, 400);
  }

  const fullName = hasFullName ? String(payload.full_name).trim() : null;
  const birthDateValue =
    hasBirthDate && typeof payload.birth_date === "string" && payload.birth_date.trim()
      ? String(payload.birth_date).trim()
      : null;
  const genderValue =
    hasGender && typeof payload.gender === "string" && payload.gender.trim()
      ? String(payload.gender).trim().toUpperCase().slice(0, 1)
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
            gender = CASE WHEN $6::boolean THEN $7 ELSE gender END,
            updated_at = NOW()
          WHERE user_id = $5
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, gender, created_at, updated_at
        `
        : `
          INSERT INTO profiles (
            user_id,
            email,
            full_name,
            role,
            organization_id,
            birth_date,
            gender,
            created_at,
            updated_at
          )
          VALUES ($5, $6, $7, $8, $9, $10::date, $11, NOW(), NOW())
          RETURNING id, user_id, email, full_name, role, organization_id, birth_date, gender, created_at, updated_at
        `;

    const params =
      existing.rows.length > 0
        ? [hasFullName, fullName, hasBirthDate, birthDateValue, user.uid, hasGender, genderValue]
        : [
            hasFullName,
            fullName,
            hasBirthDate,
            birthDateValue,
            user.uid,
            user.email ?? null,
            fullName || user.email?.split("@")[0] || "Usuário",
            user.role ?? "viewer",
            user.organizationId,
            birthDateValue,
            genderValue,
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
        gender: row.gender,
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
      clinicAddress: organization?.address ? organization.address.toString() : undefined,
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

    if (typeof payload.clinicAddress === "string" && payload.clinicAddress.trim()) {
      organizationUpdate.push(`address = $${paramIndex}`);
      organizationValues.push(JSON.stringify({ formatted: payload.clinicAddress.trim() }));
      paramIndex++;
    }

    if (typeof payload.clinicPhone === "string" && payload.clinicPhone.trim()) {
      organizationUpdate.push(`phone = $${paramIndex}`);
      organizationValues.push(payload.clinicPhone.trim());
      paramIndex++;
    }

    const isAdmin = currentUser.role === "admin" || currentUser.roles?.includes("admin");
    if (organizationUpdate.length > 0 && !isAdmin) {
      return c.json({ error: "Apenas administradores podem atualizar dados da clínica" }, 403);
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
      clinicAddress: organization?.address ? organization.address.toString() : undefined,
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

// PATCH /api/profile/me/public — Update public profile fields (FisioLink)
app.patch("/me/public", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as Record<string, unknown>;

  const allowedFields = ["slug", "is_public", "specialty", "bio", "avatar_url", "public_services"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "Nenhum campo válido para atualizar" }, 400);
  }

  if (updates.slug) {
    const slug = String(updates.slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    if (slug.length < 2 || slug.length > 100) {
      return c.json({ error: "slug deve ter entre 2 e 100 caracteres" }, 400);
    }
    updates.slug = slug;
  }

  const pool = createPool(c.env);

  try {
    if (updates.slug) {
      const existing = await pool.query(
        `SELECT user_id FROM profiles WHERE slug = $1 AND user_id != $2 LIMIT 1`,
        [updates.slug, user.uid],
      );
      if (existing.rows.length) {
        return c.json({ error: "Este slug já está em uso" }, 409);
      }
    }

    const setClauses = Object.keys(updates)
      .map((k, i) => `"${k}" = $${i + 2}`)
      .join(", ");
    const values = [user.uid, ...Object.values(updates)];

    await pool.query(
      `UPDATE profiles SET ${setClauses}, updated_at = NOW() WHERE user_id = $1`,
      values,
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("[Profile/Public] error:", error);
    return c.json({ error: "Erro ao atualizar perfil público." }, 500);
  }
});

// DELETE /api/profile/me — Request account deletion (Apple 5.1.1 Compliance)
app.delete("/me", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);

  try {
    // 1. Log the deletion request in audit_logs
    await pool.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'ACCOUNT_DELETION_REQUESTED', 'profile', $2, $3)`,
      [
        user.organizationId,
        user.uid,
        JSON.stringify({
          reason: "User requested account deletion via App/Profile",
          retention_policy: "20 years (Law 13.787/2018)",
        }),
      ],
    );

    // 2. Mark profile as inactive and set deletion flag
    // We keep the medical records but block access
    await pool.query(
      `UPDATE profiles 
       SET is_active = false, 
           updated_at = NOW(),
           preferences = jsonb_set(COALESCE(preferences, '{}'), '{deletion_requested_at}', $2)
       WHERE user_id = $1`,
      [user.uid, new Date().toISOString()],
    );

    // 3. In a real production environment, you would also call your auth provider
    // to disable the user login (e.g., Neon Auth / Better Auth / Clerk)
    // For now, setting is_active = false will block most application flows via requireAuth if checked.

    return c.json({
      success: true,
      message:
        "Solicitação de exclusão processada. Seu acesso foi desativado, mas seus registros clínicos serão mantidos por 20 anos conforme exigido pela Lei nº 13.787/2018.",
    });
  } catch (error) {
    console.error("[Profile/Delete] error:", error);
    return c.json({ error: "Erro ao processar exclusão de conta." }, 500);
  }
});

// ===== ADMIN: Gerenciamento de usuários pendentes =====

app.get("/admin/pending", requireAuth, async (c) => {
  const caller = c.get("user");
  if (caller.role !== "admin" && !caller.roles?.includes("admin")) {
    return c.json({ error: "Acesso negado" }, 403);
  }
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT id, user_id, COALESCE(NULLIF(full_name,''), NULLIF(name,''), split_part(email,'@',1)) AS full_name, email, role, roles, created_at
       FROM profiles
       WHERE (role = 'pending' OR 'pending' = ANY(roles))
         AND organization_id = $1
       ORDER BY created_at DESC`,
      [caller.organizationId],
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Profile/Admin/Pending] error:", error);
    return c.json({ data: [] });
  }
});

app.post("/admin/approve/:profileId", requireAuth, async (c) => {
  const caller = c.get("user");
  if (caller.role !== "admin" && !caller.roles?.includes("admin")) {
    return c.json({ error: "Acesso negado" }, 403);
  }
  const profileId = c.req.param("profileId");
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!profileId || !UUID_RE.test(profileId)) return c.json({ error: "profileId inválido" }, 400);

  const { role, roles } = await c.req.json<{ role: string; roles?: string[] }>();

  if (!role) return c.json({ error: "role é obrigatório" }, 400);
  const allowedRoles = [
    "admin",
    "fisioterapeuta",
    "estagiario",
    "paciente",
    "parceiro",
    "recepcionista",
  ];
  if (!allowedRoles.includes(role)) return c.json({ error: "role inválido" }, 400);

  const filteredRoles = roles?.filter((r) => allowedRoles.includes(r));
  const finalRoles = filteredRoles?.length ? filteredRoles : [role];
  if (!finalRoles.length) return c.json({ error: "roles inválidos" }, 400);

  const pool = createPool(c.env);
  try {
    await pool.query(
      `UPDATE profiles SET role = $1, roles = $2, updated_at = NOW() WHERE id = $3 AND organization_id = $4`,
      [role, finalRoles, profileId, caller.organizationId],
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error("[Profile/Admin/Approve] error:", error);
    return c.json({ error: "Erro ao aprovar usuário" }, 500);
  }
});

export { app as profileRoutes };
