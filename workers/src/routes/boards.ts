import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { isUuid } from '../lib/validators';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ===== BOARDS =====

app.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { archived } = c.req.query();
    const db = await createPool(c.env);

    const result = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM tarefas t WHERE t.board_id = b.id) AS task_count,
        (SELECT json_agg(bc ORDER BY bc.order_index)
           FROM board_columns bc WHERE bc.board_id = b.id) AS columns
       FROM boards b
       WHERE b.organization_id = $1
         AND b.is_archived = $2
       ORDER BY b.is_starred DESC, b.updated_at DESC`,
      [user.organizationId, archived === 'true']
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Boards] GET / error:', error);
    return c.json({ error: 'Erro ao buscar boards', data: [] }, 500);
  }
});

app.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = await createPool(c.env);

    const result = await db.query(
      `INSERT INTO boards (organization_id, created_by, name, description, background_color, background_image, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.organizationId,
        user.uid,
        body.name,
        body.description ?? null,
        body.background_color ?? '#0079BF',
        body.background_image ?? null,
        body.icon ?? '📋',
      ]
    );

    const board = result.rows[0];

    // Create default columns
    const defaultColumns = [
      { name: 'A Fazer', color: '#E2E8F0', order_index: 0 },
      { name: 'Em Progresso', color: '#BEE3F8', order_index: 1 },
      { name: 'Concluído', color: '#C6F6D5', order_index: 2 },
    ];

    await Promise.all(
      defaultColumns.map(col =>
        db.query(
          `INSERT INTO board_columns (board_id, name, color, order_index) VALUES ($1, $2, $3, $4)`,
          [board.id, col.name, col.color, col.order_index]
        )
      )
    );

    const colsResult = await db.query(
      `SELECT * FROM board_columns WHERE board_id = $1 ORDER BY order_index`,
      [board.id]
    );

    return c.json({ data: { ...board, columns: colsResult.rows, task_count: 0 } }, 201);
  } catch (error) {
    console.error('[Boards] POST / error:', error);
    return c.json({ error: 'Erro ao criar board', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.get('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    const boardResult = await db.query(
      `SELECT * FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardResult.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    const colsResult = await db.query(
      `SELECT * FROM board_columns WHERE board_id = $1 ORDER BY order_index`,
      [id]
    );

    const board = { ...boardResult.rows[0], columns: colsResult.rows };
    return c.json({ data: board });
  } catch (error) {
    console.error('[Boards] GET /:id error:', error);
    return c.json({ error: 'Erro ao buscar board' }, 500);
  }
});

app.patch('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const allowed = ['name', 'description', 'background_color', 'background_image', 'icon', 'is_starred', 'is_archived'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = $${idx++}`);
        params.push(body[key]);
      }
    }
    if (!sets.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

    sets.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);

    const result = await db.query(
      `UPDATE boards SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Board não encontrado' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[Boards] PATCH /:id error:', error);
    return c.json({ error: 'Erro ao atualizar board' }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    await db.query(
      `UPDATE boards SET is_archived = true, updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[Boards] DELETE /:id error:', error);
    return c.json({ error: 'Erro ao arquivar board' }, 500);
  }
});

// ===== BOARD COLUMNS =====

app.get('/:id/columns', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    // Verify board belongs to org
    const boardCheck = await db.query(
      `SELECT id FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardCheck.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    const result = await db.query(
      `SELECT * FROM board_columns WHERE board_id = $1 ORDER BY order_index`,
      [id]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[BoardColumns] GET /:id/columns error:', error);
    return c.json({ error: 'Erro ao buscar colunas', data: [] }, 500);
  }
});

app.post('/:id/columns', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    // Verify ownership
    const boardCheck = await db.query(
      `SELECT id FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardCheck.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    // Get next order_index
    const maxResult = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx FROM board_columns WHERE board_id = $1`,
      [id]
    );
    const nextIdx = maxResult.rows[0]?.next_idx ?? 0;

    const result = await db.query(
      `INSERT INTO board_columns (board_id, name, color, wip_limit, order_index) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, body.name, body.color ?? '#E2E8F0', body.wip_limit ?? null, body.order_index ?? nextIdx]
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[BoardColumns] POST /:id/columns error:', error);
    return c.json({ error: 'Erro ao criar coluna', details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// Update column (any board's column)
app.patch('/columns/:colId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const colId = c.req.param('colId');
    if (!isUuid(colId)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    // Verify ownership via join
    const allowed = ['name', 'color', 'wip_limit', 'order_index'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = $${idx++}`);
        params.push(body[key]);
      }
    }
    if (!sets.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

    params.push(colId, user.organizationId);
    const result = await db.query(
      `UPDATE board_columns bc SET ${sets.join(', ')}
       FROM boards b
       WHERE bc.id = $${idx++} AND bc.board_id = b.id AND b.organization_id = $${idx++}
       RETURNING bc.*`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Coluna não encontrada' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[BoardColumns] PATCH /columns/:colId error:', error);
    return c.json({ error: 'Erro ao atualizar coluna' }, 500);
  }
});

app.delete('/columns/:colId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const colId = c.req.param('colId');
    if (!isUuid(colId)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    // Nullify tasks in this column, then delete
    await db.query(
      `UPDATE tarefas SET column_id = NULL WHERE column_id = $1`,
      [colId]
    );
    await db.query(
      `DELETE FROM board_columns bc USING boards b
       WHERE bc.id = $1 AND bc.board_id = b.id AND b.organization_id = $2`,
      [colId, user.organizationId]
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[BoardColumns] DELETE /columns/:colId error:', error);
    return c.json({ error: 'Erro ao deletar coluna' }, 500);
  }
});

// Reorder columns
app.post('/columns/reorder', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { updates } = await c.req.json() as { updates: Array<{ id: string; order_index: number }> };
    const db = await createPool(c.env);

    await Promise.all(
      updates.map(({ id, order_index }) =>
        db.query(
          `UPDATE board_columns bc SET order_index = $1
           FROM boards b
           WHERE bc.id = $2 AND bc.board_id = b.id AND b.organization_id = $3`,
          [order_index, id, user.organizationId]
        )
      )
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[BoardColumns] POST /columns/reorder error:', error);
    return c.json({ error: 'Erro ao reordenar colunas' }, 500);
  }
});

// Get tarefas for a board (grouped by column_id)
app.get('/:id/tarefas', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    const result = await db.query(
      `SELECT *, task_references as references FROM tarefas
       WHERE board_id = $1 AND organization_id = $2
       ORDER BY order_index ASC, created_at DESC`,
      [id, user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Boards] GET /:id/tarefas error:', error);
    return c.json({ error: 'Erro ao buscar tarefas', data: [] }, 500);
  }
});

export { app as boardsRoutes };
