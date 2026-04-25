/**
 * Rotas: Notificações de Gamificação
 * GET    /api/gamification-notifications?patientId=...
 * PUT    /api/gamification-notifications/:id/read
 * PUT    /api/gamification-notifications/read-all
 * DELETE /api/gamification-notifications/:id
 */
import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env }>();

app.get("/", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { patientId, limit = "50" } = c.req.query();

  if (!patientId) {
    return c.json({ error: "patientId is required" }, 400);
  }

  const result = await pool.query(
    `SELECT * FROM gamification_notifications
     WHERE patient_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [patientId, Number(limit)],
  );

  try {
    return c.json({ data: result.rows || result });
  } catch {
    return c.json({ data: [] });
  }
});

app.put("/:id/read", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query("UPDATE gamification_notifications SET read_at = NOW() WHERE id = $1", [id]);
  return c.json({ ok: true });
});

app.put("/read-all", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const body = (await c.req.json()) as { patientId?: string };

  if (!body?.patientId) {
    return c.json({ error: "patientId is required" }, 400);
  }

  await pool.query(
    "UPDATE gamification_notifications SET read_at = NOW() WHERE patient_id = $1 AND read_at IS NULL",
    [body.patientId],
  );

  return c.json({ ok: true });
});

app.delete("/:id", requireAuth, async (c) => {
  const pool = await createPool(c.env);
  const { id } = c.req.param();
  await pool.query("DELETE FROM gamification_notifications WHERE id = $1", [id]);
  return c.json({ ok: true });
});

export { app as gamificationNotificationsRoutes };
