/**
 * Rotas NPS
 *
 *   GET    /api/nps                          — lista surveys (admin)
 *   POST   /api/nps                          — cria survey manualmente (sem enviar mensagem)
 *   GET    /api/nps/stats                    — promotores/neutros/detratores + NPS
 *   GET    /api/nps/:id                      — detalhe (admin)
 *   DELETE /api/nps/:id                      — apaga survey
 *
 *   GET    /api/public-nps/:token            — devolve dados mínimos (nome paciente)
 *   POST   /api/public-nps/:token/respond    — paciente responde (sem auth)
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { isUuid } from "../lib/validators";
import type { Env } from "../types/env";

// ===== ADMIN =====

const admin = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

admin.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { classification, status, limit = "100" } = c.req.query();

  const conditions: string[] = ["organization_id = $1"];
  const params: unknown[] = [user.organizationId];

  if (classification) {
    params.push(classification);
    conditions.push(`classification = $${params.length}`);
  }
  if (status === "responded") conditions.push("responded_at IS NOT NULL");
  if (status === "pending") conditions.push("responded_at IS NULL");

  params.push(Math.min(Math.max(Number(limit) || 100, 1), 500));

  const result = await pool.query(
    `SELECT * FROM nps_surveys
      WHERE ${conditions.join(" AND ")}
      ORDER BY sent_at DESC
      LIMIT $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

admin.get("/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const { days = "90" } = c.req.query();
  const sinceDays = Math.min(Math.max(Number(days) || 90, 7), 365);

  const result = await pool.query(
    `SELECT
       COUNT(*)::int                                                            AS total_sent,
       COUNT(responded_at)::int                                                 AS total_responded,
       COUNT(*) FILTER (WHERE classification = 'promoter')::int                 AS promotores,
       COUNT(*) FILTER (WHERE classification = 'passive')::int                  AS neutros,
       COUNT(*) FILTER (WHERE classification = 'detractor')::int                AS detratores,
       AVG(score) FILTER (WHERE score IS NOT NULL)::numeric(4,2)                AS score_medio,
       (
         (COUNT(*) FILTER (WHERE classification = 'promoter') -
          COUNT(*) FILTER (WHERE classification = 'detractor'))::numeric
         / NULLIF(COUNT(classification), 0) * 100
       )::numeric(5,1)                                                          AS nps
       FROM nps_surveys
      WHERE organization_id = $1
        AND sent_at >= NOW() - ($2 || ' days')::interval`,
    [user.organizationId, String(sinceDays)],
  );
  return c.json({ data: result.rows[0], days: sinceDays });
});

admin.get("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT * FROM nps_surveys WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "NPS não encontrado" }, 404);
  return c.json({ data: result.rows[0] });
});

admin.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;
  if (!body.contact_id || typeof body.contact_id !== "string") {
    return c.json({ error: "contact_id é obrigatório" }, 400);
  }
  if (!isUuid(body.contact_id)) return c.json({ error: "contact_id inválido" }, 400);

  // Garante que o contato pertence à org
  const own = await pool.query(
    `SELECT primary_patient_id FROM contacts
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [body.contact_id, user.organizationId],
  );
  if (!own.rows.length) return c.json({ error: "Contato não encontrado" }, 404);

  const result = await pool.query(
    `INSERT INTO nps_surveys
       (organization_id, contact_id, patient_id, channel, message_sent, campaign_id, rule_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      user.organizationId,
      body.contact_id,
      own.rows[0].primary_patient_id,
      (body.channel as string) ?? "manual",
      (body.message_sent as string) ?? null,
      (body.campaign_id as string | null) ?? null,
      (body.rule_id as string | null) ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

admin.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const { id } = c.req.param();
  if (!isUuid(id)) return c.json({ error: "id inválido" }, 400);
  const pool = createPool(c.env);
  const result = await pool.query(
    `DELETE FROM nps_surveys WHERE id = $1 AND organization_id = $2 RETURNING id`,
    [id, user.organizationId],
  );
  if (!result.rows.length) return c.json({ error: "NPS não encontrado" }, 404);
  return c.json({ ok: true });
});

// ===== PUBLIC =====

const publicApp = new Hono<{ Bindings: Env }>();

publicApp.get("/:token", async (c) => {
  const { token } = c.req.param();
  const pool = createPool(c.env);
  const result = await pool.query(
    `SELECT ns.id, ns.score, ns.responded_at, ns.expires_at,
            c.nome AS contact_name
       FROM nps_surveys ns
       JOIN contacts c ON c.id = ns.contact_id
      WHERE ns.token = $1`,
    [token],
  );
  if (!result.rows.length) return c.json({ error: "Pesquisa não encontrada" }, 404);
  const survey = result.rows[0];
  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return c.json({ error: "Pesquisa expirou" }, 410);
  }
  return c.json({
    data: {
      already_answered: survey.responded_at != null,
      contact_name: survey.contact_name,
    },
  });
});

publicApp.post("/:token/respond", async (c) => {
  const { token } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return c.json({ error: "score deve ser inteiro 0-10" }, 400);
  }
  const comentario = typeof body.comentario === "string" ? body.comentario.slice(0, 2000) : null;

  const pool = createPool(c.env);
  const result = await pool.query(
    `UPDATE nps_surveys
        SET score = $1,
            comentario = $2
      WHERE token = $3
        AND responded_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id, classification`,
    [score, comentario, token],
  );
  if (!result.rows.length) {
    return c.json({ error: "Pesquisa já respondida, expirada ou inexistente" }, 409);
  }
  return c.json({ data: result.rows[0] }, 201);
});

export const npsRoutes = admin;
export const npsPublicRoutes = publicApp;
