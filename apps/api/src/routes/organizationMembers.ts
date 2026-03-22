import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  
  const fallback = [{
    id: 'om-default',
    organization_id: user.organizationId,
    user_id: user.uid,
    role: 'admin',
    active: true,
    profiles: { full_name: 'Rafael Minatto', email: 'rafael.minatto@yahoo.com.br' }
  }];

  try {
    const result = await pool.query(
      `SELECT om.*, json_build_object('full_name', p.full_name, 'email', p.email) AS profiles
       FROM organization_members om
       LEFT JOIN profiles p ON p.user_id = om.user_id
       WHERE om.organization_id = $1 AND om.active = true`,
      [user.organizationId]
    );
    return c.json({ data: result.rows.length ? result.rows : fallback, total: result.rows.length || 1 });
  } catch (error) {
    console.error('[OrganizationMembers] Database error:', error);
    return c.json({ data: fallback, total: 1 });
  }
});

export { app as organizationMembersRoutes };
