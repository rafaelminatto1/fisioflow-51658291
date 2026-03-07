import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

export const organizationMembersRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

organizationMembersRoutes.use('*', requireAuth);

organizationMembersRoutes.get('/', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const { organizationId, userId, limit = '250' } = c.req.query();
  const orgId = organizationId ?? user.organizationId;
  const limitNum = Math.max(1, Math.min(1000, Number.parseInt(limit, 10) || 250));

  const conditions: string[] = ['om.active = true'];
  const params: unknown[] = [];

  if (orgId) {
    params.push(orgId);
    conditions.push(`om.organization_id = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conditions.push(`om.user_id = $${params.length}`);
  }

  if (!orgId && !userId) {
    params.push(user.organizationId);
    conditions.push(`om.organization_id = $${params.length}`);
  }

  params.push(limitNum);

  const membersRes = await pool.query(
    `
      SELECT
        om.id,
        om.organization_id,
        om.user_id,
        om.role,
        om.active,
        om.joined_at,
        json_build_object('full_name', p.full_name, 'email', p.email) AS profiles
      FROM organization_members om
      LEFT JOIN profiles p ON p.id = om.user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY om.joined_at DESC
      LIMIT $${params.length}
    `,
    params,
  );

  return c.json({ data: membersRes.rows, total: membersRes.rowCount });
});

organizationMembersRoutes.post('/', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = await c.req.json();
  const { organizationId, userId, role } = body;
  if (!organizationId && !user.organizationId) {
    return c.json({ error: 'Organização obrigatória' }, 400);
  }

  const orgId = organizationId ?? user.organizationId;
  const createdAt = new Date().toISOString();

  const insertRes = await pool.query(
    `
      INSERT INTO organization_members (organization_id, user_id, role, active, joined_at)
      VALUES ($1, $2, $3, true, $4)
      RETURNING id, organization_id, user_id, role, active, joined_at
    `,
    [orgId, userId, role ?? 'admin', createdAt],
  );

  return c.json({ data: insertRes.rows[0] });
});

organizationMembersRoutes.patch('/:id', async (c) => {
  const pool = createPool(c.env);
  const { id } = c.req.param();
  const updates = await c.req.json();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.role) {
    fields.push(`role = $${fields.length + 1}`);
    values.push(updates.role);
  }
  if (updates.active !== undefined) {
    fields.push(`active = $${fields.length + 1}`);
    values.push(Boolean(updates.active));
  }
  if (!fields.length) {
    return c.json({ error: 'Nada para atualizar' }, 400);
  }

  values.push(id);
  const updateRes = await pool.query(
    `
      UPDATE organization_members
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, organization_id, user_id, role, active, joined_at
    `,
    values,
  );

  if (!updateRes.rows.length) {
    return c.json({ error: 'Membro não encontrado' }, 404);
  }

  return c.json({ data: updateRes.rows[0] });
});

organizationMembersRoutes.delete('/:id', async (c) => {
  const pool = createPool(c.env);
  const { id } = c.req.param();
  await pool.query(`UPDATE organization_members SET active = false, updated_at = NOW() WHERE id = $1`, [id]);
  return c.json({ success: true });
});
