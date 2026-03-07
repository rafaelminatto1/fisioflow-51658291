/**
 * Rotas: Notificações
 * GET    /api/notifications
 * POST   /api/notifications
 * PUT    /api/notifications/:id/read
 * PUT    /api/notifications/read-all
 * DELETE /api/notifications/:id
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { unreadOnly, limit = '50' } = c.req.query();

  const conditions = ['user_id = $1'];
  const params: unknown[] = [user.uid];
  if (unreadOnly === 'true') conditions.push('is_read = false');
  params.push(Number(limit));

  const result = await pool.query(
    `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *`,
    [
      user.organizationId,
      String(body.user_id ?? user.uid),
      String(body.type ?? 'info'),
      String(body.title ?? ''),
      body.message ?? null,
      body.link ?? null,
      JSON.stringify(body.metadata ?? {}),
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.put('/read-all', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user.uid]);
  return c.json({ ok: true });
});

app.put('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, user.uid]);
  return c.json({ ok: true });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, user.uid]);
  return c.json({ ok: true });
});

export { app as notificationsRoutes };
