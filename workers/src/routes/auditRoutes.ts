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
      `SELECT * FROM audit_logs WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    return c.json({ data: [] });
  }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = await createPool(c.env);
  const body = await c.req.json().catch(() => ({}));
  
  const { action, entity_type, entity_id, metadata, changes } = body;
  const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');

  try {
    const result = await pool.query(
      `
      INSERT INTO audit_logs (
        organization_id, user_id, action, entity_type, entity_id, 
        metadata, changes, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
      `,
      [
        user.organizationId, 
        user.uid, 
        action, 
        entity_type || 'system', 
        entity_id || null,
        JSON.stringify(metadata || {}),
        JSON.stringify(changes || {}),
        ipAddress || null,
        userAgent || null
      ]
    );
    return c.json({ data: result.rows[0] });
  } catch (error: any) {
    // Audit logs are non-critical — fail silently so the app isn't broken by missing table
    console.warn('[Audit] Could not save audit log (table may not exist):', error.message);
    return c.json({ data: null });
  }
});

export { app as auditRoutes };
