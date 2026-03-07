import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/logs', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const limit = Math.min(200, Math.max(10, Number(c.req.query('limit') ?? 50)));

  const result = await pool.query(
    `
      SELECT id, automation_id, automation_name, status,
             started_at, completed_at, duration_ms, error
      FROM automation_logs
      WHERE organization_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `,
    [user.organizationId, limit],
  );

  return c.json({ data: result.rows });
});

export { app as automationRoutes };
