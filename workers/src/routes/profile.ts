import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  
  const fallbackProfile = {
    id: user.uid,
    user_id: user.uid,
    email: user.email ?? null,
    full_name: user.email?.split('@')[0] ?? 'Usuário',
    role: user.role ?? 'admin',
    organization_id: user.organizationId,
    email_verified: user.emailVerified,
  };

  try {
    const result = await pool.query(
      `SELECT id, user_id, email, full_name, role, organization_id FROM profiles WHERE user_id = $1 LIMIT 1`,
      [user.uid]
    );
    return c.json({ data: result.rows[0] || fallbackProfile });
  } catch (error) {
    return c.json({ data: fallbackProfile });
  }
});

app.get('/therapists', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  try {
    const result = await pool.query(
      `SELECT id, full_name as name FROM profiles WHERE organization_id = $1 AND role IN ('admin', 'fisioterapeuta')`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    return c.json({ data: [] });
  }
});

export { app as profileRoutes };
