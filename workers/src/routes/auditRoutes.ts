import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    return c.json({ data: [] });
  }
});

export { app as auditRoutes };
