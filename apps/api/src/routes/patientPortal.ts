import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type DbPool = ReturnType<typeof createPool>;
type DbRow = Record<string, unknown>;
type PortalPayload = Record<string, unknown>;

const tableColumnsCache = new Map<string, Promise<Set<string>>>();
const PROFESSIONAL_ROLES = ["admin", "fisioterapeuta", "professional"];

function cacheKey(table: string) {
  return `public.${table}`;
}

async function getTableColumns(pool: DbPool, table: string): Promise<Set<string>> {
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
    .then((result) => new Set(result.rows.map((row) => String((row as DbRow).column_name))));

  tableColumnsCache.set(key, pending);
  return pending;
}

async function hasTable(pool: DbPool, table: string): Promise<boolean> {
  return (await getTableColumns(pool, table)).size > 0;
}

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function nullableString(value: unknown): string | null {
  return trimmedString(value) ?? null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeGenderToDb(value: unknown): string | null {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  if (["m", "masculino", "male", "homem"].includes(normalized)) return "M";
  if (["f", "feminino", "female", "mulher"].includes(normalized)) return "F";
  if (["o", "outro", "other"].includes(normalized)) return "O";
  return normalized.toUpperCase();
}

function normalizeGenderFromDb(value: unknown): "masculino" | "feminino" | "outro" | null {
  const normalized = trimmedString(value)?.toLowerCase();
  if (!normalized) return null;
  if (["m", "masculino", "male", "homem"].includes(normalized)) return "masculino";
  if (["f", "feminino", "female", "mulher"].includes(normalized)) return "feminino";
  return "outro";
}

function normalizeAddressPayload(value: unknown): Record<string, unknown> | null {
  const address = parseJsonObject(value);
  if (!address) return null;

  return {
    street: trimmedString(address.street) ?? null,
    number: trimmedString(address.number) ?? null,
    complement: trimmedString(address.complement) ?? null,
    neighborhood: trimmedString(address.neighborhood) ?? null,
    city: trimmedString(address.city) ?? null,
    state: trimmedString(address.state) ?? null,
    zipCode: trimmedString(address.cep ?? address.zipCode) ?? null,
  };
}

function buildAddressPayload(body: PortalPayload): Record<string, unknown> | null {
  if (body.address && typeof body.address === "object") {
    return normalizeAddressPayload(body.address);
  }

  const street = trimmedString(body.address ?? body.street);
  const number = trimmedString(body.number);
  const complement = trimmedString(body.complement);
  const neighborhood = trimmedString(body.neighborhood);
  const city = trimmedString(body.city);
  const state = trimmedString(body.state);
  const zipCode = trimmedString(body.zip_code ?? body.zipCode);

  if (!street && !number && !complement && !neighborhood && !city && !state && !zipCode) {
    return null;
  }

  return {
    street: street ?? null,
    number: number ?? null,
    complement: complement ?? null,
    neighborhood: neighborhood ?? null,
    city: city ?? null,
    state: state ?? null,
    zipCode: zipCode ?? null,
  };
}

function getInviteCode(id: string): string {
  const normalized = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalized.slice(0, 6).padEnd(6, "X");
}

function normalizeProfileRow(
  row: DbRow | null | undefined,
  fallback: { userId: string; email?: string; fullName?: string; organizationId: string },
) {
  const fullName =
    trimmedString(row?.full_name) ??
    trimmedString(row?.name) ??
    fallback.fullName ??
    fallback.email?.split("@")[0] ??
    "Paciente";

  return {
    id: trimmedString(row?.id) ?? "",
    user_id: trimmedString(row?.user_id) ?? fallback.userId,
    email: trimmedString(row?.email) ?? fallback.email ?? null,
    full_name: fullName,
    role: trimmedString(row?.role) ?? "patient",
    organization_id: trimmedString(row?.organization_id) ?? fallback.organizationId,
    created_at: row?.created_at ? String(row.created_at) : new Date().toISOString(),
    updated_at: row?.updated_at ? String(row.updated_at) : new Date().toISOString(),
  };
}

function normalizePatientRow(
  row: DbRow | null | undefined,
  profile: ReturnType<typeof normalizeProfileRow>,
) {
  const address = normalizeAddressPayload(row?.address);
  const fullName = trimmedString(row?.full_name) ?? trimmedString(row?.name) ?? profile.full_name;

  return {
    id: trimmedString(row?.id) ?? "",
    patient_id: trimmedString(row?.id) ?? "",
    profile_id: trimmedString(row?.profile_id) ?? (profile.id || null),
    user_id: trimmedString(row?.user_id) ?? profile.user_id,
    name: fullName,
    full_name: fullName,
    email: trimmedString(row?.email) ?? profile.email,
    phone: trimmedString(row?.phone) ?? null,
    cpf: trimmedString(row?.cpf) ?? null,
    birth_date: row?.birth_date ? String(row.birth_date) : null,
    gender: normalizeGenderFromDb(row?.gender),
    profession: trimmedString(row?.profession) ?? null,
    photo_url: trimmedString(row?.photo_url) ?? null,
    avatarUrl: trimmedString(row?.photo_url) ?? null,
    address,
    professional_id: trimmedString(row?.professional_id) ?? null,
    professional_name:
      trimmedString(row?.professional_name) ?? trimmedString(row?.referred_by) ?? null,
    referred_by: trimmedString(row?.referred_by) ?? null,
    incomplete_registration: row?.incomplete_registration === true,
    created_at: row?.created_at ? String(row.created_at) : profile.created_at,
    updated_at: row?.updated_at ? String(row.updated_at) : profile.updated_at,
  };
}

function normalizePortalProfile(
  profileRow: DbRow | null | undefined,
  patientRow: DbRow | null | undefined,
  user: { uid: string; email?: string; organizationId: string },
) {
  const profile = normalizeProfileRow(profileRow, {
    userId: user.uid,
    email: user.email,
    fullName: trimmedString(profileRow?.full_name) ?? trimmedString(patientRow?.full_name),
    organizationId: user.organizationId,
  });
  const patient = normalizePatientRow(patientRow, profile);

  return {
    ...patient,
    id: patient.patient_id || profile.id || user.uid,
    profile,
  };
}

async function upsertProfile(
  pool: DbPool,
  user: { uid: string; email?: string; organizationId: string },
  body: PortalPayload,
  options: { forcePatientRole?: boolean } = {},
) {
  const existing = await pool.query(
    `
      SELECT *
      FROM profiles
      WHERE user_id = $1
      LIMIT 1
    `,
    [user.uid],
  );

  const fullName =
    trimmedString(body.full_name ?? body.name) ??
    trimmedString(existing.rows[0]?.full_name) ??
    trimmedString(existing.rows[0]?.name) ??
    user.email?.split("@")[0] ??
    "Paciente";

  if (!existing.rows.length) {
    const inserted = await pool.query(
      `
        INSERT INTO profiles (
          id,
          user_id,
          email,
          name,
          full_name,
          role,
          organization_id,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $3,
          $4,
          $5,
          NOW(),
          NOW()
        )
        RETURNING *
      `,
      [
        user.uid,
        user.email ?? null,
        fullName,
        options.forcePatientRole ? "patient" : "patient",
        user.organizationId,
      ],
    );

    return inserted.rows[0] as DbRow;
  }

  const profileRow = existing.rows[0] as DbRow;
  if (!options.forcePatientRole && !body.email && !body.name && !body.full_name) {
    return profileRow;
  }

  const updated = await pool.query(
    `
      UPDATE profiles
      SET
        email = COALESCE($2, email),
        name = COALESCE($3, name),
        full_name = COALESCE($3, full_name),
        role = CASE
          WHEN $4 = true THEN 'patient'
          ELSE role
        END,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [
      user.uid,
      body.email ? String(body.email) : (user.email ?? null),
      fullName,
      options.forcePatientRole,
    ],
  );

  return updated.rows[0] as DbRow;
}

async function findPatientForUser(
  pool: DbPool,
  user: { uid: string; email?: string; organizationId: string },
  profileId?: string,
) {
  const patientColumns = await getTableColumns(pool, "patients");
  if (patientColumns.size === 0) return null;

  if (profileId && patientColumns.has("profile_id")) {
    const result = await pool.query(
      `
        SELECT *
        FROM patients
        WHERE profile_id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [profileId, user.organizationId],
    );
    if (result.rows.length) return result.rows[0] as DbRow;
  }

  if (patientColumns.has("user_id")) {
    const result = await pool.query(
      `
        SELECT *
        FROM patients
        WHERE user_id = $1
          AND organization_id = $2
        LIMIT 1
      `,
      [user.uid, user.organizationId],
    );
    if (result.rows.length) return result.rows[0] as DbRow;
  }

  if (user.email && patientColumns.has("email")) {
    const result = await pool.query(
      `
        SELECT *
        FROM patients
        WHERE email = $1
          AND organization_id = $2
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
        LIMIT 1
      `,
      [user.email, user.organizationId],
    );
    if (result.rows.length) return result.rows[0] as DbRow;
  }

  return null;
}

async function upsertPatient(
  pool: DbPool,
  user: { uid: string; email?: string; organizationId: string },
  profileRow: DbRow,
  body: PortalPayload,
) {
  const patientColumns = await getTableColumns(pool, "patients");
  if (patientColumns.size === 0) return null;

  const existing = await findPatientForUser(pool, user, trimmedString(profileRow.id));
  const fullName =
    trimmedString(body.full_name ?? body.name) ??
    trimmedString(existing?.full_name) ??
    trimmedString(profileRow.full_name) ??
    user.email?.split("@")[0] ??
    "Paciente";

  const addressPayload = buildAddressPayload(body);
  const payload: Record<string, unknown> = {};

  if (patientColumns.has("organization_id")) payload.organization_id = user.organizationId;
  if (patientColumns.has("full_name")) payload.full_name = fullName;
  if (patientColumns.has("email")) payload.email = nullableString(body.email) ?? user.email ?? null;
  if (patientColumns.has("phone") && body.phone !== undefined)
    payload.phone = nullableString(body.phone);
  if (patientColumns.has("cpf") && body.cpf !== undefined) payload.cpf = nullableString(body.cpf);
  if (patientColumns.has("birth_date") && body.birth_date !== undefined)
    payload.birth_date = nullableString(body.birth_date);
  if (patientColumns.has("gender") && body.gender !== undefined)
    payload.gender = normalizeGenderToDb(body.gender);
  if (patientColumns.has("profession") && body.profession !== undefined)
    payload.profession = nullableString(body.profession);
  if (
    patientColumns.has("photo_url") &&
    (body.photo_url !== undefined || body.avatarUrl !== undefined)
  ) {
    payload.photo_url = nullableString(body.photo_url ?? body.avatarUrl);
  }
  if (patientColumns.has("address") && addressPayload) {
    payload.address = JSON.stringify({
      street: addressPayload.street ?? null,
      number: addressPayload.number ?? null,
      complement: addressPayload.complement ?? null,
      neighborhood: addressPayload.neighborhood ?? null,
      city: addressPayload.city ?? null,
      state: addressPayload.state ?? null,
      cep: addressPayload.zipCode ?? null,
    });
  }
  if (patientColumns.has("incomplete_registration")) {
    payload.incomplete_registration = body.incomplete_registration === true;
  }
  if (patientColumns.has("profile_id")) payload.profile_id = trimmedString(profileRow.id);
  if (patientColumns.has("user_id")) payload.user_id = user.uid;
  if (patientColumns.has("professional_id") && body.professional_id !== undefined) {
    payload.professional_id = nullableString(body.professional_id);
  }
  if (patientColumns.has("professional_name") && body.professional_name !== undefined) {
    payload.professional_name = nullableString(body.professional_name);
  }
  if (patientColumns.has("referred_by") && body.professional_name !== undefined) {
    payload.referred_by = nullableString(body.professional_name);
  }
  if (patientColumns.has("updated_at")) payload.updated_at = new Date().toISOString();

  if (!existing) {
    if (patientColumns.has("created_at")) payload.created_at = new Date().toISOString();

    const columns = Object.keys(payload);
    const params = columns.map((column) => payload[column]);
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const inserted = await pool.query(
      `INSERT INTO patients (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
      params,
    );

    return inserted.rows[0] as DbRow;
  }

  const updateEntries = Object.entries(payload).filter(([column]) => column !== "organization_id");
  if (!updateEntries.length) return existing;

  const sets = updateEntries.map(([column], index) => `${column} = $${index + 1}`);
  const params = updateEntries.map(([, value]) => value);
  params.push(String(existing.id));

  const updated = await pool.query(
    `
      UPDATE patients
      SET ${sets.join(", ")}
      WHERE id = $${params.length}
      RETURNING *
    `,
    params,
  );

  return updated.rows[0] as DbRow;
}

async function ensurePortalContext(
  pool: DbPool,
  user: { uid: string; email?: string; organizationId: string },
  body: PortalPayload = {},
  options: { forcePatientRole?: boolean } = {},
) {
  const profileRow = await upsertProfile(pool, user, body, options);
  const patientRow = await upsertPatient(pool, user, profileRow, body);
  return {
    profileRow,
    patientRow,
    data: normalizePortalProfile(profileRow, patientRow, user),
  };
}

app.use("*", requireAuth);

app.post("/bootstrap", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json().catch(() => ({}))) as PortalPayload;

  const context = await ensurePortalContext(pool, user, body, { forcePatientRole: true });
  return c.json({ data: context.data }, 201);
});

app.get("/profile", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const context = await ensurePortalContext(pool, user);
  // Cache de Perfil: 5 min na borda, revalidação em background (stale-while-revalidate)
  c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
  return c.json({ data: context.data });
});

app.patch("/profile", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as PortalPayload;
  const context = await ensurePortalContext(pool, user, body, { forcePatientRole: false });
  return c.json({ data: context.data });
});

app.get("/therapists", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const search = trimmedString(c.req.query("search"))?.toLowerCase();

  const result = await pool.query(
    `
      SELECT id, user_id, full_name, name, email, role
      FROM profiles
      WHERE organization_id = $1
        AND role = ANY($2::text[])
      ORDER BY full_name ASC NULLS LAST, name ASC NULLS LAST
    `,
    [user.organizationId, PROFESSIONAL_ROLES],
  );

  const therapists = result.rows
    .map((row) => {
      const id = trimmedString((row as DbRow).id) ?? "";
      const name =
        trimmedString((row as DbRow).full_name) ??
        trimmedString((row as DbRow).name) ??
        "Profissional";
      const email = trimmedString((row as DbRow).email) ?? null;
      const inviteCode = getInviteCode(id || trimmedString((row as DbRow).user_id) || "");
      return {
        id,
        name,
        email,
        role: trimmedString((row as DbRow).role) ?? "professional",
        invite_code: inviteCode,
      };
    })
    .filter((row) => {
      if (!search) return true;
      return [row.name, row.email ?? "", row.invite_code].some((value) =>
        value.toLowerCase().includes(search),
      );
    });

  return c.json({ data: therapists });
});

app.post("/link-professional", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as PortalPayload;
  const professionalId = trimmedString(body.professional_id ?? body.professionalId);

  if (!professionalId) {
    return c.json({ error: "professional_id é obrigatório" }, 400);
  }

  const professionalResult = await pool.query(
    `
      SELECT id, full_name, name, email
      FROM profiles
      WHERE id = $1
        AND organization_id = $2
        AND role = ANY($3::text[])
      LIMIT 1
    `,
    [professionalId, user.organizationId, PROFESSIONAL_ROLES],
  );

  if (!professionalResult.rows.length) {
    return c.json({ error: "Profissional não encontrado" }, 404);
  }

  const professional = professionalResult.rows[0] as DbRow;
  const professionalName =
    trimmedString(professional.full_name) ?? trimmedString(professional.name) ?? "Profissional";

  const context = await ensurePortalContext(
    pool,
    user,
    {
      professional_id: professionalId,
      professional_name: professionalName,
    },
    { forcePatientRole: false },
  );

  return c.json({ data: context.data });
});

app.get("/appointments", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);

  if (!data.patient_id || !(await hasTable(pool, "appointments"))) {
    return c.json({ data: [] });
  }

  const upcoming = c.req.query("upcoming") === "true";
  const params: unknown[] = [data.patient_id, user.organizationId];
  const filters = ["a.patient_id = $1", "a.organization_id = $2"];

  if (upcoming) {
    filters.push(`a.date >= CURRENT_DATE`);
    filters.push(`COALESCE(a.status::text, 'agendado') NOT IN (
      'cancelado', 'cancelled',
      'atendido', 'avaliacao', 'completed', 'realizado', 'concluido',
      'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
      'nao_atendido', 'nao_atendido_sem_cobranca', 'no_show',
      'remarcar', 'remarcado', 'rescheduled'
    )`);
  }

  const result = await pool.query(
    `
      SELECT
        a.*,
        COALESCE(tp.full_name, tp.name, 'Fisioterapeuta') AS professional_name
      FROM appointments a
      LEFT JOIN profiles tp ON tp.id = a.therapist_id
      WHERE ${filters.join(" AND ")}
      ORDER BY a.date ASC, a.start_time ASC
    `,
    params,
  );

  // Cache de Consultas: 1 min na borda, revalidação em background (stale-while-revalidate)
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=30");

  const appointments = result.rows.map((row) => ({
    id: String((row as DbRow).id ?? ""),
    patient_id: trimmedString((row as DbRow).patient_id) ?? data.patient_id,
    professional_id: trimmedString((row as DbRow).therapist_id) ?? null,
    professional_name: trimmedString((row as DbRow).professional_name) ?? "Fisioterapeuta",
    type: trimmedString((row as DbRow).type) ?? "session",
    date: (row as DbRow).date ? String((row as DbRow).date) : new Date().toISOString().slice(0, 10),
    time: trimmedString((row as DbRow).start_time) ?? "09:00",
    duration: nullableNumber((row as DbRow).duration_minutes) ?? 60,
    status: (row as DbRow).status ? String((row as DbRow).status) : "scheduled",
    notes: trimmedString((row as DbRow).notes) ?? null,
    createdAt: (row as DbRow).created_at
      ? String((row as DbRow).created_at)
      : new Date().toISOString(),
    updatedAt: (row as DbRow).updated_at
      ? String((row as DbRow).updated_at)
      : new Date().toISOString(),
  }));

  return c.json({ data: appointments });
});

app.post("/appointments/:id/confirm", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);
  const id = c.req.param("id");

  if (!data.patient_id) return c.json({ error: "Paciente não encontrado" }, 404);

  await pool.query(
    `
      UPDATE appointments
      SET
        status = 'presenca_confirmada',
        confirmed_at = NOW(),
        confirmed_via = 'app',
        updated_at = NOW()
      WHERE id = $1
        AND patient_id = $2
        AND organization_id = $3
    `,
    [id, data.patient_id, user.organizationId],
  );

  return c.json({ success: true });
});

app.post("/appointments/:id/cancel", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  if (!data.patient_id) return c.json({ error: "Paciente não encontrado" }, 404);

  await pool.query(
    `
      UPDATE appointments
      SET
        status = 'cancelado',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
        AND patient_id = $3
        AND organization_id = $4
    `,
    [body.reason ?? null, id, data.patient_id, user.organizationId],
  );

  return c.json({ success: true });
});

app.get("/exercises", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);

  if (
    !data.patient_id ||
    !(await hasTable(pool, "exercise_plans")) ||
    !(await hasTable(pool, "exercise_plan_items"))
  ) {
    return c.json({ data: [] });
  }

  const hasExercises = await hasTable(pool, "exercises");
  const hasSessions = await hasTable(pool, "exercise_sessions");
  const sessionJoin = hasSessions
    ? `
      LEFT JOIN LATERAL (
        SELECT
          es.id,
          es.completed,
          es.created_at,
          es.metrics
        FROM exercise_sessions es
        WHERE es.patient_id = p.id
          AND (es.exercise_id = i.exercise_id OR (es.exercise_id IS NULL AND i.exercise_id IS NULL))
        ORDER BY es.created_at DESC
        LIMIT 1
      ) latest_session ON true
    `
    : "";

  const result = await pool.query(
    `
      SELECT
        p.id AS patient_id,
        ep.id AS plan_id,
        ep.name AS plan_name,
        ep.description AS plan_description,
        i.id AS assignment_id,
        i.exercise_id,
        i.sets,
        i.repetitions,
        i.duration,
        i.notes,
        ${hasExercises ? "e.name AS exercise_name, e.description AS exercise_description, e.video_url, e.image_url," : ""}
        ${hasSessions ? "latest_session.completed AS latest_completed, latest_session.created_at AS latest_completed_at, latest_session.metrics AS latest_metrics" : "NULL AS latest_completed, NULL AS latest_completed_at, NULL AS latest_metrics"}
      FROM patients p
      JOIN exercise_plans ep ON ep.patient_id = p.id
      JOIN exercise_plan_items i ON i.plan_id = ep.id
      ${hasExercises ? "LEFT JOIN exercises e ON e.id = i.exercise_id" : ""}
      ${sessionJoin}
      WHERE p.id = $1
      ORDER BY ep.created_at DESC, i.order_index ASC
    `,
    [data.patient_id],
  );

  const exercises = result.rows.map((row) => {
    const metrics = parseJsonObject((row as DbRow).latest_metrics);
    return {
      id: String((row as DbRow).assignment_id ?? ""),
      patientId: data.patient_id,
      exerciseId: trimmedString((row as DbRow).exercise_id) ?? "",
      sets: nullableNumber((row as DbRow).sets) ?? 0,
      reps: nullableNumber((row as DbRow).repetitions) ?? 0,
      duration: nullableNumber((row as DbRow).duration),
      notes: trimmedString((row as DbRow).notes) ?? null,
      completed: (row as DbRow).latest_completed === true,
      completedAt: (row as DbRow).latest_completed_at
        ? String((row as DbRow).latest_completed_at)
        : null,
      progress:
        nullableNumber(metrics?.progress) ?? ((row as DbRow).latest_completed === true ? 100 : 0),
      plan: {
        id: trimmedString((row as DbRow).plan_id) ?? "",
        name: trimmedString((row as DbRow).plan_name) ?? "Plano atual",
        description: trimmedString((row as DbRow).plan_description) ?? null,
      },
      exercise: {
        id: trimmedString((row as DbRow).exercise_id) ?? "",
        name: trimmedString((row as DbRow).exercise_name) ?? "Exercício",
        description: trimmedString((row as DbRow).exercise_description) ?? null,
        videoUrl: trimmedString((row as DbRow).video_url) ?? null,
        imageUrl: trimmedString((row as DbRow).image_url) ?? null,
      },
    };
  });

  return c.json({ data: exercises });
});

app.post("/exercises/:assignmentId/complete", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);
  const assignmentId = c.req.param("assignmentId");
  const body = (await c.req.json().catch(() => ({}))) as PortalPayload;

  if (
    !data.patient_id ||
    !(await hasTable(pool, "exercise_plan_items")) ||
    !(await hasTable(pool, "exercise_sessions"))
  ) {
    return c.json({ success: true });
  }

  const itemResult = await pool.query(
    `
      SELECT i.*, ep.patient_id
      FROM exercise_plan_items i
      JOIN exercise_plans ep ON ep.id = i.plan_id
      WHERE i.id = $1
        AND ep.patient_id = $2
      LIMIT 1
    `,
    [assignmentId, data.patient_id],
  );

  if (!itemResult.rows.length) {
    return c.json({ error: "Exercício não encontrado" }, 404);
  }

  const item = itemResult.rows[0] as DbRow;
  const hasProgressPayload =
    body.progress !== undefined ||
    body.difficulty !== undefined ||
    body.painLevel !== undefined ||
    body.pain_level !== undefined ||
    body.notes !== undefined;
  const completed = body.completed === true;

  if (body.completed === false) {
    await pool.query(
      `
        DELETE FROM exercise_sessions
        WHERE id IN (
          SELECT id
          FROM exercise_sessions
          WHERE patient_id = $1
            AND exercise_id = $2
          ORDER BY created_at DESC
          LIMIT 1
        )
      `,
      [data.patient_id, trimmedString(item.exercise_id) ?? null],
    );

    return c.json({ success: true });
  }

  if (!completed && !hasProgressPayload) {
    return c.json({ success: true });
  }

  await pool.query(
    `
      INSERT INTO exercise_sessions (
        patient_id,
        exercise_id,
        repetitions,
        completed,
        metrics,
        start_time,
        end_time,
        duration,
        created_at
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        NOW(),
        NOW(),
        $6,
        NOW()
      )
    `,
    [
      data.patient_id,
      trimmedString(item.exercise_id) ?? null,
      nullableNumber(body.reps) ?? nullableNumber(item.repetitions) ?? 0,
      completed,
      JSON.stringify({
        progress: nullableNumber(body.progress) ?? (completed ? 100 : 0),
        difficulty: nullableNumber(body.difficulty),
        painLevel: nullableNumber(body.painLevel ?? body.pain_level),
        notes: nullableString(body.notes),
      }),
      nullableNumber(body.duration) ?? nullableNumber(item.duration),
    ],
  );

  return c.json({ success: true });
});

app.get("/notifications", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "notifications"))) {
    return c.json({ data: [] });
  }

  const result = await pool.query(
    `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [user.uid],
  );

  const notifications = result.rows.map((row) => ({
    id: String((row as DbRow).id ?? ""),
    user_id: trimmedString((row as DbRow).user_id) ?? user.uid,
    title: trimmedString((row as DbRow).title) ?? "Notificação",
    body: trimmedString((row as DbRow).message) ?? trimmedString((row as DbRow).body) ?? "",
    type: trimmedString((row as DbRow).type) ?? "system",
    read: (row as DbRow).is_read === true,
    data: parseJsonObject((row as DbRow).metadata) ?? {},
    createdAt: (row as DbRow).created_at
      ? String((row as DbRow).created_at)
      : new Date().toISOString(),
  }));

  return c.json({ data: notifications });
});

app.post("/notifications/:id/read", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "notifications"))) {
    return c.json({ success: true });
  }

  await pool.query(
    `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
        AND user_id = $2
    `,
    [c.req.param("id"), user.uid],
  );

  return c.json({ success: true });
});

app.post("/notifications/read-all", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);

  if (!(await hasTable(pool, "notifications"))) {
    return c.json({ success: true });
  }

  await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [user.uid]);
  return c.json({ success: true });
});

app.get("/progress", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { data } = await ensurePortalContext(pool, user);

  if (!data.patient_id) {
    return c.json({ data: { evolutions: [], reports: [] } });
  }

  const evolutions = (await hasTable(pool, "treatment_sessions"))
    ? await pool.query(
        `
          SELECT *
          FROM treatment_sessions
          WHERE patient_id = $1
            AND organization_id = $2
          ORDER BY session_date DESC, created_at DESC
          LIMIT 100
        `,
        [data.patient_id, user.organizationId],
      )
    : { rows: [] as DbRow[] };

  const reports = (await hasTable(pool, "medical_reports"))
    ? await pool.query(
        `
          SELECT *
          FROM medical_reports
          WHERE patient_id = $1
            AND organization_id = $2
          ORDER BY data_emissao DESC, created_at DESC
          LIMIT 50
        `,
        [data.patient_id, user.organizationId],
      )
    : { rows: [] as DbRow[] };

  return c.json({
    data: {
      evolutions: evolutions.rows.map((row: DbRow) => ({
        id: String((row as DbRow).id ?? ""),
        record_date: (row as DbRow).session_date
          ? String((row as DbRow).session_date)
          : new Date().toISOString(),
        subjective: trimmedString((row as DbRow).subjective) ?? null,
        objective: trimmedString((row as DbRow).objective) ?? null,
        assessment: trimmedString((row as DbRow).assessment) ?? null,
        plan: trimmedString((row as DbRow).plan) ?? null,
        pain_level:
          nullableNumber((row as DbRow).pain_level_after) ??
          nullableNumber((row as DbRow).pain_level_before) ??
          0,
        therapist_name: null,
        status: "finalized",
        session_number: null,
      })),
      reports: reports.rows.map((row: DbRow) => ({
        id: String((row as DbRow).id ?? ""),
        data_emissao: (row as DbRow).data_emissao
          ? String((row as DbRow).data_emissao)
          : new Date().toISOString(),
        payload: parseJsonObject((row as DbRow).payload) ?? {},
      })),
    },
  });
});

app.get("/stats", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const context = await ensurePortalContext(pool, user);
  const patientId = context.data.patient_id;

  if (!patientId) {
    return c.json({ data: { totalAppointments: 0, totalExercises: 0, totalMonths: 0 } });
  }

  const appointmentsCount = (await hasTable(pool, "appointments"))
    ? await pool.query(
        "SELECT COUNT(*)::int AS total FROM appointments WHERE patient_id = $1 AND organization_id = $2",
        [patientId, user.organizationId],
      )
    : { rows: [{ total: 0 }] as DbRow[] };

  const exercisesCount = (await hasTable(pool, "exercise_sessions"))
    ? await pool.query(
        "SELECT COUNT(*)::int AS total FROM exercise_sessions WHERE patient_id = $1 AND completed = true",
        [patientId],
      )
    : { rows: [{ total: 0 }] as DbRow[] };

  const createdAt = context.data.created_at ? new Date(context.data.created_at) : new Date();
  const totalMonths = Math.max(
    1,
    Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );

  return c.json({
    data: {
      totalAppointments: Number((appointmentsCount.rows[0] as DbRow | undefined)?.total ?? 0),
      totalExercises: Number((exercisesCount.rows[0] as DbRow | undefined)?.total ?? 0),
      totalMonths,
    },
  });
});

export { app as patientPortalRoutes };
