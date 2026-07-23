import { Hono } from "hono";
import { createPool } from "../lib/db";
import type { Env } from "../types/env";
import { rateLimit } from "../middleware/rateLimit";
import { turnstileVerify } from "../middleware/turnstile";
import { broadcastToOrg } from "../lib/realtime";
import { requireAuth, type AuthVariables } from "../lib/auth";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

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

export async function getBookedSlots(
  pool: ReturnType<typeof createPool>,
  therapistId: string,
  date: string,
): Promise<string[]> {
  try {
    const booked = await pool.query(
      `SELECT start_time FROM appointments
       WHERE therapist_id = $1 AND appointment_date = $2
         AND status NOT IN ('cancelado', 'falta')
         AND deleted_at IS NULL`,
      [therapistId, date],
    );
    return booked.rows.map((r: any) => String(r.start_time).substring(0, 5));
  } catch {
    // colunas ausentes -> devolve nenhum horário ocupado
    return [];
  }
}

export function buildSlotGrid(): string[] {
  const allSlots: string[] = [];
  for (let h = 8; h < 18; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return allSlots;
}

export async function computeAvailableSlots(
  pool: ReturnType<typeof createPool>,
  therapistId: string,
  date: string,
): Promise<string[]> {
  const bookedSlots = await getBookedSlots(pool, therapistId, date);
  return buildSlotGrid().filter((s) => !bookedSlots.includes(s));
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

  const bookedSlots = await getBookedSlots(pool, profile.id, date);
  const slots = buildSlotGrid().filter((s) => !bookedSlots.includes(s));
  return c.json({ slots, bookedSlots });
});

// POST /api/public-booking/booking — Create booking request (Turnstile required)
app.post("/booking", bookingRateLimit, turnstileVerify, async (c) => {
  const body = (await c.req.json()) as {
    slug: string;
    date: string;
    time: string;
    patient: {
      name: string;
      phone: string;
      email?: string;
      notes?: string;
    };
  };

  if (!body.slug || !body.date || !body.time || !body.patient?.name || !body.patient?.phone) {
    return c.json({ error: "Dados incompletos" }, 400);
  }

  const pool = createPool(c.env);

  try {
    // 1. Get profile by slug
    const profiles = await pool.query(
      `SELECT id, user_id, full_name, organization_id, whatsapp_number 
       FROM profiles WHERE slug = $1 LIMIT 1`,
      [body.slug],
    );

    if (!profiles.rows.length) {
      return c.json({ error: "Perfil não encontrado" }, 404);
    }
    const profile = profiles.rows[0];

    // Format date properly if it comes as ISO string
    const bookingDate = body.date.split("T")[0];

    // 2. Check availability
    const booked = await pool.query(
      `SELECT id FROM appointments
       WHERE therapist_id = $1 AND appointment_date = $2 AND start_time = $3
         AND status NOT IN ('cancelado', 'falta')
         AND deleted_at IS NULL`,
      [profile.id, bookingDate, `${body.time}:00`],
    );

    if (booked.rows.length > 0) {
      return c.json({ error: "Horário não está mais disponível", code: "UNAVAILABLE" }, 409);
    }

    // 3. Create booking request
    const result = await pool.query(
      `INSERT INTO public_booking_requests (
        organization_id, profile_user_id, patient_name, patient_phone, patient_email,
        requested_date, requested_time, notes, professional_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING id`,
      [
        profile.organization_id,
        profile.user_id,
        body.patient.name,
        body.patient.phone,
        body.patient.email || null,
        bookingDate,
        body.time,
        body.patient.notes || null,
        profile.full_name,
      ],
    );

    // 4. Send WhatsApp Notification to Professional
    if (c.env.WHATSAPP_ACCESS_TOKEN && profile.whatsapp_number) {
      const { WhatsAppService } = await import("../lib/whatsapp");
      const wa = new WhatsAppService(c.env);
      await wa
        .sendTextMessage(
          String(profile.whatsapp_number),
          `🔔 *Novo Agendamento (FisioLink)*\n\n👤 Paciente: ${body.patient.name}\n📅 Data: ${bookingDate.split("-").reverse().join("/")}\n⏰ Horário: ${body.time}\n📞 Contato: ${body.patient.phone}\n\nAcesse o FisioFlow Web para confirmar ou rejeitar.`,
        )
        .catch(() => {});
    }

    return c.json({
      success: true,
      id: result.rows[0].id,
      message: "Agendamento solicitado com sucesso! O profissional confirmará em breve.",
    });
  } catch (error: any) {
    console.error("[Booking] Error:", error);
    return c.json({ error: "Erro interno ao processar agendamento" }, 500);
  }
});

// GET /api/public-booking/requests — List booking requests (fisio management)
app.get("/requests", requireAuth, async (c) => {
  const user = c.get("user");
  const { status, limit: limitStr } = c.req.query();
  const pool = createPool(c.env);
  const limit = Math.min(Number(limitStr) || 50, 200);

  if (!(await hasTable(pool, "public_booking_requests"))) return c.json({ data: [] });

  let sql = `SELECT id, patient_name, patient_phone, patient_email, notes,
                    requested_date, requested_time, professional_name,
                    status, created_at, updated_at
             FROM public_booking_requests
             WHERE profile_user_id = $1`;
  const params: unknown[] = [user.uid];

  if (status) {
    sql += ` AND status = $2`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT ${limit}`;

  const result = await pool.query(sql, params);
  return c.json({ data: result.rows });
});

// PATCH /api/public-booking/requests/:id — Accept or reject a booking request
app.patch("/requests/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  const body = (await c.req.json()) as { status: "confirmed" | "rejected"; notes?: string };

  if (!["confirmed", "rejected"].includes(body.status))
    return c.json({ error: "status deve ser 'confirmed' ou 'rejected'" }, 400);

  const pool = createPool(c.env);
  const result = await pool.query(
    `UPDATE public_booking_requests
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND profile_user_id = $3
     RETURNING *`,
    [body.status, id, user.uid],
  );
  if (!result.rowCount) return c.json({ error: "Solicitação não encontrada" }, 404);
  const row = result.rows[0] as Record<string, unknown>;

  // On confirm: send WhatsApp to patient
  if (body.status === "confirmed" && c.env.WHATSAPP_ACCESS_TOKEN && row.patient_phone) {
    const { WhatsAppService } = await import("../lib/whatsapp");
    const wa = new WhatsAppService(c.env);
    const dateFormatted = new Date(String(row.requested_date) + "T12:00:00").toLocaleDateString(
      "pt-BR",
      { weekday: "long", day: "numeric", month: "long" },
    );
    await wa
      .sendTextMessage(
        String(row.patient_phone),
        `Olá${row.patient_name ? " " + String(row.patient_name).split(" ")[0] : ""}! ✅ Seu agendamento foi confirmado.\n\n📅 ${dateFormatted} às ${row.requested_time}.\n\nAguardamos você!`,
      )
      .catch(() => {});
  }

  return c.json({ data: row });
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
