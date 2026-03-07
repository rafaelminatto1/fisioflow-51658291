/**
 * Rotas: Audit Logs
 * GET  /api/audit-logs
 * POST /api/audit-logs
 */
import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { entityType, entityId, limit = '100', offset = '0' } = c.req.query();

  const conditions = ['organization_id = $1'];
  const params: unknown[] = [user.organizationId];
  if (entityType) { params.push(entityType); conditions.push(`entity_type = $${params.length}`); }
  if (entityId) { params.push(entityId); conditions.push(`entity_id = $${params.length}`); }
  params.push(Number(limit), Number(offset));

  const result = await pool.query(
    `SELECT * FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return c.json({ data: result.rows });
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const b = (await c.req.json()) as Record<string, unknown>;

  const result = await pool.query(
    `INSERT INTO audit_logs (organization_id, action, entity_type, entity_id, user_id, changes, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
    [
      user.organizationId,
      String(b.action ?? ''),
      b.entity_type ?? null,
      b.entity_id ?? null,
      user.uid,
      b.changes != null ? JSON.stringify(b.changes) : null,
      b.ip_address ?? null,
    ],
  );
  return c.json({ data: result.rows[0] }, 201);
});

export { app as auditRoutes };
