/**
 * Rotas Indicações (referrals)
 *
 *   GET /api/referrals/ranking     — ranking de pacientes indicadores
 *   GET /api/referrals/codes       — lista códigos da org
 *   POST /api/referrals/codes      — cria código para paciente
 *   GET /api/referrals/fisio-links — fisio_links da org
 *   GET /api/referrals/clicks-daily — cliques nos fisio_links por dia (série temporal)
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get("/ranking", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { days = "180", limit = "20" } = c.req.query();
  const sinceDays = Math.min(Math.max(Number(days) || 180, 30), 730);
  const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const result = await pool.query(
    `SELECT
        rc.patient_id,
        p.full_name                                                    AS patient_name,
        rc.code,
        rc.uses,
        COUNT(rr.id)::int                                              AS total_redemptions,
        COUNT(rr.id) FILTER (WHERE rr.redeemed_at >= NOW() - ($1 || ' days')::interval)::int
                                                                       AS recent_redemptions,
        MAX(rr.redeemed_at)                                            AS last_redemption_at
       FROM referral_codes rc
       LEFT JOIN patients p ON p.id = rc.patient_id
       LEFT JOIN referral_redemptions rr ON rr.referral_id = rc.id
      WHERE rc.organization_id = $2
      GROUP BY rc.patient_id, p.full_name, rc.code, rc.uses
      ORDER BY recent_redemptions DESC, total_redemptions DESC
      LIMIT $3`,
    [String(sinceDays), user.organizationId, lim],
  );
  return c.json({ data: result.rows, days: sinceDays });
});

app.get("/codes", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT rc.*, p.full_name AS patient_name
       FROM referral_codes rc
       LEFT JOIN patients p ON p.id = rc.patient_id
      WHERE rc.organization_id = $1
      ORDER BY rc.created_at DESC
      LIMIT 200`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.post("/codes", requireAuth, async (c) => {
  const user = c.get("user");
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.patient_id || typeof body.patient_id !== "string" || !isUuid(body.patient_id)) {
    return c.json({ error: "patient_id obrigatório" }, 400);
  }
  const code =
    typeof body.code === "string" && body.code.trim().length >= 4
      ? body.code.trim().toUpperCase()
      : `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `INSERT INTO referral_codes (organization_id, patient_id, code, max_uses)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [user.organizationId, body.patient_id, code, body.max_uses ?? null],
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return c.json({ error: "Código já existe" }, 409);
    }
    throw err;
  }
});

app.get("/fisio-links", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT fl.*,
            COUNT(fla.id)::int AS total_clicks,
            COUNT(fla.id) FILTER (WHERE fla.clicked_at >= NOW() - INTERVAL '30 days')::int
              AS clicks_30d
       FROM fisio_links fl
       LEFT JOIN fisio_link_analytics fla ON fla.slug = fl.slug
      WHERE fl.organization_id = $1
      GROUP BY fl.id
      ORDER BY fl.created_at DESC`,
    [user.organizationId],
  );
  return c.json({ data: result.rows });
});

app.get("/clicks-daily", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { days = "30", slug = "" } = c.req.query();
  const sinceDays = Math.min(Math.max(Number(days) || 30, 7), 180);

  // Cliques por dia, preenchendo dias sem cliques com 0 (generate_series).
  // Escopo de org via JOIN em fisio_links.slug (mesmo padrão do /fisio-links).
  const result = await pool.query(
    `SELECT to_char(d.day::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0)::int AS clicks
       FROM generate_series(
              (CURRENT_DATE - ($1::int - 1)),
              CURRENT_DATE,
              INTERVAL '1 day'
            ) AS d(day)
       LEFT JOIN (
         SELECT date_trunc('day', fla.clicked_at)::date AS day, COUNT(*) AS n
           FROM fisio_link_analytics fla
           JOIN fisio_links fl
             ON fl.slug = fla.slug
            AND fl.organization_id = $2
          WHERE fla.clicked_at >= (CURRENT_DATE - ($1::int - 1))
            AND ($3 = '' OR fla.slug = $3)
          GROUP BY 1
       ) c ON c.day = d.day::date
      ORDER BY d.day`,
    [sinceDays, user.organizationId, slug],
  );
  return c.json({ data: result.rows, days: sinceDays });
});

export const referralsRoutes = app;
