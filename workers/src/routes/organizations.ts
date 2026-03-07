import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use('*', requireAuth);

app.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();
  const pool = createPool(c.env);

  const result = await pool.query(
    `
      SELECT id, name, slug, settings, active, created_at, updated_at
      FROM organizations
      WHERE id = $1 AND id = $2
      LIMIT 1
    `,
    [id, user.organizationId],
  );

  if (!result.rows.length) {
    return c.json({ error: 'Organização não encontrada' }, 404);
  }

  return c.json({ data: result.rows[0] });
});

app.post('/', async (c) => {
  const { name, slug, settings = {}, active = true } = (await c.req.json()) as Record<string, unknown>;
  if (!name || typeof name !== 'string') {
    return c.json({ error: 'Nome obrigatório' }, 400);
  }
  if (!slug || typeof slug !== 'string') {
    return c.json({ error: 'Slug obrigatório' }, 400);
  }

  const pool = createPool(c.env);
  const result = await pool.query(
    `
      INSERT INTO organizations (name, slug, settings, active, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
      RETURNING id, name, slug, settings, active, created_at, updated_at
    `,
    [name, slug, JSON.stringify(settings), active],
  );

  return c.json({ data: result.rows[0] }, 201);
});

app.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json()) as Record<string, unknown>;
  const pool = createPool(c.env);

  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    params.push(body.name);
    sets.push(`name = $${params.length}`);
  }
  if (body.slug !== undefined) {
    params.push(body.slug);
    sets.push(`slug = $${params.length}`);
  }
  if (body.active !== undefined) {
    params.push(Boolean(body.active));
    sets.push(`active = $${params.length}`);
  }
  if (body.settings !== undefined) {
    params.push(JSON.stringify(body.settings));
    sets.push(`settings = $${params.length}::jsonb`);
  }

  if (!sets.length) {
    return c.json({ error: 'Nada para atualizar' }, 400);
  }

  params.push(id, c.get('user').organizationId);
  const result = await pool.query(
    `
      UPDATE organizations
      SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND id = $${params.length}
      RETURNING id, name, slug, settings, active, created_at, updated_at
    `,
    params,
  );

  if (!result.rows.length) {
    return c.json({ error: 'Organização não encontrada' }, 404);
  }

  return c.json({ data: result.rows[0] });
});

export { app as organizationsRoutes };
