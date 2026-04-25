import { Hono } from "hono";
import type { Env } from "../types/env";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { createPool } from "../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column],
  );
  return result.rows.length > 0;
}

function normalizePatientRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? row.name ?? ""),
    name: String(row.full_name ?? row.name ?? ""),
    birth_date: row.birth_date ? String(row.birth_date) : "",
    gender: String(row.gender ?? "masculino")
      .toLowerCase()
      .startsWith("f")
      ? "feminino"
      : "masculino",
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    cpf: String(row.cpf ?? ""),
    status: String(row.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active",
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    main_condition: String(row.main_condition ?? row.notes ?? ""),
    notes: row.notes ? String(row.notes) : undefined,
    organization_id: String(row.organization_id ?? ""),
    incomplete_registration: Boolean(row.incomplete_registration),
    source: "activity_lab" as const,
  };
}

function normalizeSessionRow(row: Record<string, unknown>) {
  const rawPoints = Array.isArray(row.raw_force_data) ? row.raw_force_data : [];

  return {
    id: String(row.id),
    patient_id: String(row.patient_id),
    patientId: String(row.patient_id),
    protocol_name: String(row.protocol_name ?? "Protocolo Desconhecido"),
    protocolName: String(row.protocol_name ?? "Protocolo Desconhecido"),
    body_part: String(row.body_part ?? "N/A"),
    bodyPart: String(row.body_part ?? "N/A"),
    side: String(row.side ?? "LEFT") === "RIGHT" ? "RIGHT" : "LEFT",
    test_type: "isometric" as const,
    created_at: String(row.created_at ?? new Date().toISOString()),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    peak_force: Number(row.peak_force ?? 0),
    peakForce: Number(row.peak_force ?? 0),
    avg_force: Number(row.avg_force ?? 0),
    avgForce: Number(row.avg_force ?? 0),
    duration: Number(row.duration ?? 0),
    rfd: Number(row.rfd ?? 0),
    rateOfForceDevelopment: Number(row.rfd ?? 0),
    sensitivity: Number(row.sensitivity ?? 3),
    raw_force_data: rawPoints as Array<{ value: number; timestamp: number }>,
    rawForceData: rawPoints as Array<{ value: number; timestamp: number }>,
    sample_rate: Number(row.sample_rate ?? 80),
    sampleRate: Number(row.sample_rate ?? 80),
    device_model: String(row.device_model ?? "Tindeq"),
    deviceModel: String(row.device_model ?? "Tindeq"),
    device_firmware: String(row.device_firmware ?? ""),
    deviceFirmware: String(row.device_firmware ?? ""),
    device_battery: Number(row.device_battery ?? 0),
    deviceBattery: Number(row.device_battery ?? 0),
    measurement_mode: "isometric" as const,
    measurementMode: String(row.measurement_mode ?? "isometric"),
    is_simulated: Boolean(row.is_simulated),
    isSimulated: Boolean(row.is_simulated),
    notes: String(row.notes ?? ""),
    organization_id: String(row.organization_id ?? ""),
    source: "activity_lab" as const,
  };
}

app.use("*", requireAuth);

app.get("/patients", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const search = String(c.req.query("search") ?? "").trim();
  const limit = Math.min(200, Math.max(1, Number.parseInt(c.req.query("limit") ?? "50", 10) || 50));
  const hasIncompleteRegistration = await hasColumn(pool, "patients", "incomplete_registration");

  const params: Array<string | number> = [user.organizationId];
  let where = `WHERE p.organization_id = $1 AND p.is_active = true`;

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.full_name ILIKE $${params.length} OR p.cpf ILIKE $${params.length} OR p.email ILIKE $${params.length})`;
  }

  params.push(limit);

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.organization_id,
        p.full_name,
        p.birth_date,
        p.gender,
        p.phone,
        p.email,
        p.cpf,
        p.status,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.main_condition,
        ${hasIncompleteRegistration ? "COALESCE(p.incomplete_registration, false)" : "false"} AS incomplete_registration
      FROM patients p
      ${where}
      ORDER BY p.full_name ASC
      LIMIT $${params.length}
    `,
    params,
  );

  return c.json({
    data: result.rows.map((row) => normalizePatientRow(row as Record<string, unknown>)),
  });
});

app.get("/patients/:id", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  const hasIncompleteRegistration = await hasColumn(pool, "patients", "incomplete_registration");

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.organization_id,
        p.full_name,
        p.birth_date,
        p.gender,
        p.phone,
        p.email,
        p.cpf,
        p.status,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.main_condition,
        ${hasIncompleteRegistration ? "COALESCE(p.incomplete_registration, false)" : "false"} AS incomplete_registration
      FROM patients p
      WHERE p.id = $1 AND p.organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  return c.json({
    data: result.rows[0] ? normalizePatientRow(result.rows[0] as Record<string, unknown>) : null,
  });
});

app.get("/patients/:id/sessions", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT *
      FROM activity_lab_sessions
      WHERE patient_id = $1
        AND organization_id = $2
      ORDER BY created_at DESC
    `,
    [id, user.organizationId],
  );

  return c.json({
    data: result.rows.map((row) => normalizeSessionRow(row as Record<string, unknown>)),
  });
});

app.get("/sessions/:id", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const { id } = c.req.param();

  const result = await pool.query(
    `
      SELECT *
      FROM activity_lab_sessions
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  return c.json({
    data: result.rows[0] ? normalizeSessionRow(result.rows[0] as Record<string, unknown>) : null,
  });
});

app.get("/clinic/profile", async (c) => {
  const user = c.get("user");
  const pool = await createPool(c.env);
  const hasCrefito = await hasColumn(pool, "profiles", "crefito");

  const profileResult = await pool.query(
    `
      SELECT
        cp.id,
        cp.clinic_name,
        cp.professional_name,
        cp.registration_number,
        cp.updated_at
      FROM activity_lab_clinic_profiles cp
      WHERE cp.organization_id = $1
      LIMIT 1
    `,
    [user.organizationId],
  );

  if (profileResult.rows[0]) {
    return c.json({
      data: {
        ...profileResult.rows[0],
        source: "activity_lab",
      },
    });
  }

  const fallback = await pool.query(
    `
      SELECT
        o.id AS organization_id,
        o.name AS clinic_name,
        p.full_name AS professional_name,
        ${hasCrefito ? "p.crefito" : "NULL::text"} AS registration_number,
        COALESCE(p.updated_at, NOW()) AS updated_at
      FROM organizations o
      LEFT JOIN profiles p ON p.user_id = $2
      WHERE o.id = $1
      LIMIT 1
    `,
    [user.organizationId, user.uid],
  );

  const row = fallback.rows[0];
  return c.json({
    data: row
      ? {
          id: String(row.organization_id),
          clinic_name: String(row.clinic_name ?? ""),
          professional_name: row.professional_name ? String(row.professional_name) : "",
          registration_number: row.registration_number ? String(row.registration_number) : "",
          updated_at: String(row.updated_at ?? new Date().toISOString()),
          source: "activity_lab",
        }
      : null,
  });
});

export { app as activityLabRoutes };
