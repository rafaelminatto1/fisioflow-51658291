import { Hono } from "hono";
import { createPool } from "../lib/db";
import type { Env } from "../types/env";
import { rateLimit } from "../middleware/rateLimit";
import { turnstileVerify } from "../middleware/turnstile";
import { broadcastToOrg } from "../lib/realtime";

const app = new Hono<{ Bindings: Env }>();

const bookingRateLimit = rateLimit({
  limit: 30,
  windowSeconds: 900,
  endpoint: "public-booking",
  keyFn: (c) =>
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown",
});

const checkinRateLimit = rateLimit({
  limit: 60,
  windowSeconds: 900,
  endpoint: "public-checkin",
  keyFn: (c) =>
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown",
});

async function hasTable(pool: ReturnType<typeof createPool>, tableName: string): Promise<boolean> {
  const result = await pool.query(`SELECT to_regclass($1)::text AS table_name`, [
    `public.${tableName}`,
  ]);
  return Boolean(result.rows[0]?.table_name);
}

async function hasColumn(
  pool: ReturnType<typeof createPool>,
  table: string,
  column: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
    [table, column],
  );
  return result.rows.length > 0;
}

// GET /api/public-booking/booking/:slug — Profile info (no Turnstile)
app.get("/booking/:slug", bookingRateLimit, async (c) => {
  const pool = createPool(c.env);
  const { slug } = c.req.param();
  if (!(await hasTable(pool, "profiles")))
    return c.json({ error: "Perfis públicos indisponíveis" }, 404);

  const hasSpecialty = await hasColumn(pool, "profiles", "specialty");
  const hasAvatarUrl = await hasColumn(pool, "profiles", "avatar_url");
  const hasBio = await hasColumn(pool, "profiles", "bio");
  const hasIsActive = await hasColumn(pool, "profiles", "is_active");
  const hasPublicServices = await hasColumn(pool, "profiles", "public_services");

  const result = await pool.query(
    `SELECT id, user_id, full_name, slug, organization_id,
            ${hasSpecialty ? "specialty," : "NULL::text AS specialty,"}
            ${hasAvatarUrl ? "avatar_url," : "NULL::text AS avatar_url,"}
            ${hasBio ? "bio," : "NULL::text AS bio,"}
            ${hasPublicServices ? "public_services" : "'[]'::jsonb AS public_services"}
     FROM profiles
     WHERE slug = $1
     ${hasIsActive ? "AND is_active = true" : ""}
     LIMIT 1`,
    [slug],
  );

  if (!result.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

// GET /api/public-booking/booking/:slug/availability?date=YYYY-MM-DD
app.get("/booking/:slug/availability", bookingRateLimit, async (c) => {
  const pool = createPool(c.env);
  const { slug } = c.req.param();
  const date = c.req.query("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return c.json({ error: "date deve estar no formato YYYY-MM-DD" }, 400);

  const profileResult = await pool.query(
    `SELECT id, organization_id FROM profiles WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (!profileResult.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);

  const profile = profileResult.rows[0] as { id: string; organization_id: string };

  // Default business slots (08:00–18:00, 30-min intervals)
  const allSlots: string[] = [];
  for (let h = 8; h < 18; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  // Get already-booked slots for this therapist on this date
  let bookedSlots: string[] = [];
  try {
    const booked = await pool.query(
      `SELECT start_time FROM appointments
       WHERE therapist_id = $1 AND appointment_date = $2
         AND status NOT IN ('cancelado', 'falta')
         AND deleted_at IS NULL`,
      [profile.id, date],
    );
    bookedSlots = booked.rows.map((r: any) => String(r.start_time).substring(0, 5));
  } catch {
    // Table might not have expected columns — return all slots
  }

  const slots = allSlots.filter((s) => !bookedSlots.includes(s));
  return c.json({ slots, bookedSlots });
});

// POST /api/public-booking/booking — Create booking request (Turnstile required)
app.post("/booking", bookingRateLimit, turnstileVerify, async (c) => {
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  const slug = String(body.slug ?? "").trim();
  const requestedDate = String(body.date ?? "").slice(0, 10);
  const requestedTime = String(body.time ?? "").trim();
  const patient = (body.patient && typeof body.patient === "object" ? body.patient : {}) as Record<
    string,
    unknown
  >;

  if (!slug || !requestedDate || !requestedTime) {
    return c.json({ error: "slug, date e time são obrigatórios" }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || isNaN(Date.parse(requestedDate))) {
    return c.json({ error: "date deve estar no formato YYYY-MM-DD" }, 400);
  }
  if (!/^\d{2}:\d{2}$/.test(requestedTime)) {
    return c.json({ error: "time deve estar no formato HH:MM" }, 400);
  }
  if (
    !patient.name ||
    !String(patient.name).trim() ||
    !patient.phone ||
    !String(patient.phone).trim()
  ) {
    return c.json({ error: "Nome e telefone são obrigatórios" }, 400);
  }

  if (!(await hasTable(pool, "profiles")))
    return c.json({ error: "Perfis públicos indisponíveis" }, 404);
  if (!(await hasTable(pool, "public_booking_requests"))) {
    return c.json({ error: "Agendamento público indisponível" }, 501);
  }

  const profileResult = await pool.query(
    `SELECT id, user_id, organization_id, full_name, slug FROM profiles WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (!profileResult.rows.length) return c.json({ error: "Perfil não encontrado" }, 404);
  const profile = profileResult.rows[0] as Record<string, unknown>;

  const insert = await pool.query(
    `INSERT INTO public_booking_requests (
        organization_id, profile_id, profile_user_id, slug, professional_name,
        requested_date, requested_time,
        patient_name, patient_phone, patient_email, notes,
        status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',NOW(),NOW())
      RETURNING id, status, created_at`,
    [
      profile.organization_id ?? null,
      profile.id ?? null,
      profile.user_id ?? null,
      slug,
      profile.full_name ?? null,
      requestedDate,
      requestedTime,
      String(patient.name),
      String(patient.phone),
      patient.email ? String(patient.email) : null,
      patient.notes ? String(patient.notes) : null,
    ],
  );

  // Notify fisio org via push (fire-and-forget)
  if (profile.organization_id && (c.env as any).VAPID_PRIVATE_KEY) {
    const { sendPushToOrg } = await import("../lib/webpush");
    c.executionCtx?.waitUntil?.(
      sendPushToOrg(
        String(profile.organization_id),
        {
          title: "Novo agendamento via link público",
          body: `${String(patient.name)} — ${requestedDate} às ${requestedTime}`,
          url: "/agenda",
          tag: `booking-request-${insert.rows[0].id}`,
        },
        c.env,
      ).catch(() => {}),
    );
  }

  return c.json({ data: insert.rows[0], success: true }, 201);
});

// POST /api/public-booking/checkin — Patient scans QR and confirms presence
app.post("/checkin", checkinRateLimit, async (c) => {
  const body = (await c.req.json()) as { token?: string };
  const token = String(body.token ?? "").trim();

  if (!token || token.length < 32) {
    return c.json({ error: "Token inválido" }, 400);
  }

  const pool = createPool(c.env);

  const appt = await pool.query(
    `SELECT id, organization_id, patient_id, appointment_date, start_time,
            checkin_token_expires_at, checked_in_at
     FROM appointments
     WHERE checkin_token = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [token],
  );

  if (!appt.rows.length) {
    return c.json({ error: "Token de check-in inválido ou expirado" }, 404);
  }

  const row = appt.rows[0] as Record<string, unknown>;

  // Already checked in
  if (row.checked_in_at) {
    return c.json(
      {
        success: true,
        alreadyCheckedIn: true,
        checkedInAt: row.checked_in_at,
        message: "Check-in já realizado.",
      },
      409,
    );
  }

  // Token expired
  if (row.checkin_token_expires_at && new Date() > new Date(String(row.checkin_token_expires_at))) {
    return c.json({ error: "Token de check-in expirado" }, 410);
  }

  const now = new Date().toISOString();
  await pool.query(
    `UPDATE appointments
     SET checked_in_at = $1, checked_in_via = 'qr', status = 'presente'
     WHERE id = $2`,
    [now, row.id],
  );

  // Real-time broadcast to fisio org
  broadcastToOrg(c.env, String(row.organization_id), {
    type: "APPOINTMENT_UPDATED",
    payload: { id: row.id, action: "checked-in", checkedInAt: now },
  }).catch(() => {});

  return c.json({ success: true, data: { checkedInAt: now } });
});

export { app as publicBookingRoutes };
