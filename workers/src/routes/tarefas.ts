import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const { projectId } = c.req.query();
  const db = await createPool(c.env);

  let sql = `SELECT *, task_references as references FROM tarefas WHERE organization_id = $1`;
  const params: unknown[] = [user.organizationId];
  let idx = 2;
  if (projectId) { sql += ` AND project_id = $${idx++}`; params.push(projectId); }
  sql += ' ORDER BY order_index ASC, created_at DESC';

  const result = await db.query(sql, params);
  try { return c.json({ data: result.rows || result }); } catch(e) { return c.json({ data: [] }); }
});

app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const db = await createPool(c.env);

  const result = await db.query(
    `INSERT INTO tarefas (organization_id, created_by, responsavel_id, project_id, parent_id,
       titulo, descricao, status, prioridade, tipo, data_vencimento, start_date,
       order_index, tags, checklists, attachments, task_references, dependencies)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *, task_references as references`,
    [
      user.organizationId, user.uid, body.responsavel_id ?? null, body.project_id ?? null,
      body.parent_id ?? null, body.titulo, body.descricao ?? null,
      body.status ?? 'A_FAZER', body.prioridade ?? 'MEDIA', body.tipo ?? 'TAREFA',
      body.data_vencimento ?? null, body.start_date ?? null, body.order_index ?? 0,
      body.tags ?? [],                                                        // text[]  — array JS direto
      JSON.stringify(body.checklists ?? []),                                  // jsonb
      JSON.stringify(body.attachments ?? []),                                 // jsonb
      JSON.stringify(body.task_references ?? body.references ?? []),          // jsonb
      JSON.stringify(body.dependencies ?? []),                                // jsonb
    ]
  );
  return c.json({ data: result.rows[0] }, 201);
});

app.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = await createPool(c.env);

  // Map frontend field 'references' to DB column 'task_references'
  if ('references' in body && !('task_references' in body)) body.task_references = body.references;

  const allowed = ['titulo', 'descricao', 'status', 'prioridade', 'tipo', 'data_vencimento',
    'start_date', 'completed_at', 'order_index', 'tags', 'checklists', 'attachments',
    'task_references', 'dependencies', 'responsavel_id', 'project_id', 'parent_id'];

  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const key of allowed) {
    if (key in body) {
      // tags = text[] (array JS puro); demais = jsonb (JSON.stringify)
      const val = key === 'tags'
        ? (body[key] ?? [])
        : ['checklists', 'attachments', 'task_references', 'dependencies'].includes(key)
          ? JSON.stringify(body[key] ?? [])
          : body[key];
      sets.push(`${key} = $${idx++}`);
      params.push(val);
    }
  }
  if (!sets.length) return c.json({ error: 'No fields to update' }, 400);
  sets.push(`updated_at = NOW()`);
  params.push(id, user.organizationId);

  const result = await db.query(
    `UPDATE tarefas SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *, task_references as references`,
    params
  );
  if (!result.rowCount) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: result.rows[0] });
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const db = await createPool(c.env);
  await db.query(`DELETE FROM tarefas WHERE id = $1 AND organization_id = $2`, [id, user.organizationId]);
  return c.json({ ok: true });
});

// Bulk update (reorder / bulk status)
app.post('/bulk', requireAuth, async (c) => {
  const user = c.get('user');
  const { updates } = await c.req.json() as { updates: Array<{ id: string; status?: string; order_index?: number }> };
  const db = await createPool(c.env);

  await Promise.all(updates.map(({ id, ...fields }) => {
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let idx = 1;
    if ('status' in fields) { sets.push(`status = $${idx++}`); params.push(fields.status); }
    if ('order_index' in fields) { sets.push(`order_index = $${idx++}`); params.push(fields.order_index); }
    params.push(id, user.organizationId);
    return db.query(`UPDATE tarefas SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++}`, params);
  }));

  return c.json({ ok: true });
});

export { app as tarefasRoutes };
