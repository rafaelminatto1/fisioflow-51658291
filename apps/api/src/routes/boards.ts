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

    await db.transaction(
      defaultColumns.map(col => ({
        text: `INSERT INTO board_columns (board_id, name, color, order_index) VALUES ($1, $2, $3, $4)`,
        values: [board.id, col.name, col.color, col.order_index]
      }))
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

    await db.transaction(
      updates.map(({ id, order_index }) => ({
        text: `UPDATE board_columns bc SET order_index = $1
               FROM boards b
               WHERE bc.id = $2 AND bc.board_id = b.id AND b.organization_id = $3`,
        values: [order_index, id, user.organizationId]
      }))
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

// ===== BOARD LABELS =====

app.get('/:id/labels', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    const boardCheck = await db.query(
      `SELECT id FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardCheck.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    const result = await db.query(
      `SELECT * FROM board_labels WHERE board_id = $1 AND is_active = true ORDER BY order_index, created_at`,
      [id]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[BoardLabels] GET /:id/labels error:', error);
    return c.json({ error: 'Erro ao buscar etiquetas', data: [] }, 500);
  }
});

app.post('/:id/labels', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const boardCheck = await db.query(
      `SELECT id FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardCheck.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    const maxResult = await db.query(
      `SELECT COALESCE(MAX(order_index), -1) + 1 AS next_idx FROM board_labels WHERE board_id = $1`,
      [id]
    );
    const nextIdx = maxResult.rows[0]?.next_idx ?? 0;

    const result = await db.query(
      `INSERT INTO board_labels (board_id, organization_id, name, color, description, order_index)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, user.organizationId, body.name, body.color ?? '#94A3B8', body.description ?? null, nextIdx]
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[BoardLabels] POST /:id/labels error:', error);
    return c.json({ error: 'Erro ao criar etiqueta' }, 500);
  }
});

app.patch('/labels/:labelId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const labelId = c.req.param('labelId');
    if (!isUuid(labelId)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const allowed = ['name', 'color', 'description', 'is_active', 'order_index'];
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

    params.push(labelId, user.organizationId);
    const result = await db.query(
      `UPDATE board_labels bl SET ${sets.join(', ')}
       FROM boards b
       WHERE bl.id = $${idx++} AND bl.board_id = b.id AND b.organization_id = $${idx++}
       RETURNING bl.*`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Etiqueta não encontrada' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[BoardLabels] PATCH /labels/:labelId error:', error);
    return c.json({ error: 'Erro ao atualizar etiqueta' }, 500);
  }
});

app.delete('/labels/:labelId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const labelId = c.req.param('labelId');
    if (!isUuid(labelId)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    // Soft delete
    await db.query(
      `UPDATE board_labels bl SET is_active = false
       FROM boards b
       WHERE bl.id = $1 AND bl.board_id = b.id AND b.organization_id = $2`,
      [labelId, user.organizationId]
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[BoardLabels] DELETE /labels/:labelId error:', error);
    return c.json({ error: 'Erro ao deletar etiqueta' }, 500);
  }
});

app.post('/labels/reorder', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { updates } = await c.req.json() as { updates: Array<{ id: string; order_index: number }> };
    const db = await createPool(c.env);

    await db.transaction(
      updates.map(({ id, order_index }) => ({
        text: `UPDATE board_labels bl SET order_index = $1
               FROM boards b
               WHERE bl.id = $2 AND bl.board_id = b.id AND b.organization_id = $3`,
        values: [order_index, id, user.organizationId]
      }))
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[BoardLabels] POST /labels/reorder error:', error);
    return c.json({ error: 'Erro ao reordenar etiquetas' }, 500);
  }
});

// ===== CHECKLIST TEMPLATES =====

app.get('/:id/checklist-templates', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    // Return board-specific + org-global templates
    const result = await db.query(
      `SELECT * FROM board_checklist_templates
       WHERE organization_id = $1 AND (board_id = $2 OR board_id IS NULL)
       ORDER BY usage_count DESC, created_at DESC`,
      [user.organizationId, id]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[ChecklistTemplates] GET /:id/checklist-templates error:', error);
    return c.json({ error: 'Erro ao buscar templates', data: [] }, 500);
  }
});

app.post('/:id/checklist-templates', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const result = await db.query(
      `INSERT INTO board_checklist_templates
         (board_id, organization_id, name, description, items, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        body.is_global ? null : id,
        user.organizationId,
        body.name,
        body.description ?? null,
        JSON.stringify(body.items ?? []),
        body.category ?? null,
        user.uid,
      ]
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[ChecklistTemplates] POST /:id/checklist-templates error:', error);
    return c.json({ error: 'Erro ao criar template' }, 500);
  }
});

app.patch('/checklist-templates/:templateId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const templateId = c.req.param('templateId');
    if (!isUuid(templateId)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const allowed = ['name', 'description', 'items', 'category'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = $${idx++}`);
        params.push(key === 'items' ? JSON.stringify(body[key]) : body[key]);
      }
    }
    if (!sets.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

    params.push(templateId, user.organizationId);
    const result = await db.query(
      `UPDATE board_checklist_templates SET ${sets.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Template não encontrado' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[ChecklistTemplates] PATCH error:', error);
    return c.json({ error: 'Erro ao atualizar template' }, 500);
  }
});

app.delete('/checklist-templates/:templateId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const templateId = c.req.param('templateId');
    if (!isUuid(templateId)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    await db.query(
      `DELETE FROM board_checklist_templates WHERE id = $1 AND organization_id = $2`,
      [templateId, user.organizationId]
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[ChecklistTemplates] DELETE error:', error);
    return c.json({ error: 'Erro ao deletar template' }, 500);
  }
});

// Incrementa usage_count e retorna o template (para aplicar)
app.post('/checklist-templates/:templateId/use', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const templateId = c.req.param('templateId');
    if (!isUuid(templateId)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    const result = await db.query(
      `UPDATE board_checklist_templates SET usage_count = usage_count + 1
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [templateId, user.organizationId]
    );
    if (!result.rowCount) return c.json({ error: 'Template não encontrado' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[ChecklistTemplates] POST /use error:', error);
    return c.json({ error: 'Erro ao usar template' }, 500);
  }
});

// ===== BOARD AUTOMATIONS =====

app.get('/:id/automations', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    const result = await db.query(
      `SELECT * FROM board_automations WHERE board_id = $1 AND organization_id = $2 ORDER BY created_at`,
      [id, user.organizationId]
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[BoardAutomations] GET error:', error);
    return c.json({ error: 'Erro ao buscar automações', data: [] }, 500);
  }
});

app.post('/:id/automations', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const boardCheck = await db.query(
      `SELECT id FROM boards WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId]
    );
    if (!boardCheck.rows.length) return c.json({ error: 'Board não encontrado' }, 404);

    const result = await db.query(
      `INSERT INTO board_automations
         (board_id, organization_id, name, description, trigger, conditions, actions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        user.organizationId,
        body.name,
        body.description ?? null,
        JSON.stringify(body.trigger),
        JSON.stringify(body.conditions ?? []),
        JSON.stringify(body.actions ?? []),
        user.uid,
      ]
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error('[BoardAutomations] POST error:', error);
    return c.json({ error: 'Erro ao criar automação' }, 500);
  }
});

app.patch('/automations/:automationId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const automationId = c.req.param('automationId');
    if (!isUuid(automationId)) return c.json({ error: 'ID inválido' }, 400);
    const body = await c.req.json();
    const db = await createPool(c.env);

    const allowed = ['name', 'description', 'is_active', 'trigger', 'conditions', 'actions'];
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in body) {
        sets.push(`${key} = $${idx++}`);
        const jsonKeys = ['trigger', 'conditions', 'actions'];
        params.push(jsonKeys.includes(key) ? JSON.stringify(body[key]) : body[key]);
      }
    }
    if (!sets.length) return c.json({ error: 'Nenhum campo para atualizar' }, 400);

    sets.push(`updated_at = NOW()`);
    params.push(automationId, user.organizationId);
    const result = await db.query(
      `UPDATE board_automations SET ${sets.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Automação não encontrada' }, 404);
    return c.json({ data: result.rows[0] });
  } catch (error) {
    console.error('[BoardAutomations] PATCH error:', error);
    return c.json({ error: 'Erro ao atualizar automação' }, 500);
  }
});

app.delete('/automations/:automationId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const automationId = c.req.param('automationId');
    if (!isUuid(automationId)) return c.json({ error: 'ID inválido' }, 400);
    const db = await createPool(c.env);

    await db.query(
      `DELETE FROM board_automations WHERE id = $1 AND organization_id = $2`,
      [automationId, user.organizationId]
    );
    return c.json({ ok: true });
  } catch (error) {
    console.error('[BoardAutomations] DELETE error:', error);
    return c.json({ error: 'Erro ao deletar automação' }, 500);
  }
});

// ─── Board Templates ──────────────────────────────────────────────────────────

// POST /api/boards/templates/financial — create a pre-configured financial management board
app.post('/templates/financial', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);

  const boardRes = await db.query(
    `INSERT INTO boards (organization_id, created_by, name, description, color, icon)
     VALUES ($1, $2, 'Gestão Financeira', 'Board para controle de cobranças, inadimplência e fluxo de caixa', '#22C55E', 'banknotes')
     RETURNING *`,
    [user.organizationId, user.uid],
  );
  const board = boardRes.rows[0] as Record<string, unknown>;

  const columns = [
    { name: 'A Cobrar', color: '#EAB308', order_index: 0 },
    { name: 'Enviado', color: '#3B82F6', order_index: 1 },
    { name: 'Em Atraso', color: '#EF4444', order_index: 2, wip_limit: 10 },
    { name: 'Negociando', color: '#F97316', order_index: 3 },
    { name: 'Pago', color: '#22C55E', order_index: 4 },
    { name: 'Cancelado', color: '#6B7280', order_index: 5 },
  ];

  const labels = [
    { name: 'Particular', color: '#3B82F6' },
    { name: 'Convênio', color: '#8B5CF6' },
    { name: 'PIX', color: '#22C55E' },
    { name: 'Boleto', color: '#EAB308' },
    { name: 'Cartão', color: '#EC4899' },
  ];

  const childrenQueries = [
    ...columns.map((col) => ({
      text: `INSERT INTO board_columns (board_id, organization_id, name, color, order_index, wip_limit)
             VALUES ($1, $2, $3, $4, $5, $6)`,
      values: [board.id, user.organizationId, col.name, col.color, col.order_index, col.wip_limit ?? null],
    })),
    ...labels.map((l, i) => ({
      text: `INSERT INTO board_labels (board_id, organization_id, name, color, order_index)
             VALUES ($1, $2, $3, $4, $5)`,
      values: [board.id, user.organizationId, l.name, l.color, i],
    }))
  ];

  await db.transaction(childrenQueries);

  return c.json({ data: board }, 201);
});

// POST /api/boards/templates/goals — create a pre-configured patient goals tracking board
app.post('/templates/goals', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createPool(c.env);

  const boardRes = await db.query(
    `INSERT INTO boards (organization_id, created_by, name, description, color, icon)
     VALUES ($1, $2, 'Objetivos dos Pacientes', 'Acompanhamento de metas funcionais e reabilitação', '#8B5CF6', 'target')
     RETURNING *`,
    [user.organizationId, user.uid],
  );
  const board = boardRes.rows[0] as Record<string, unknown>;

  const columns = [
    { name: 'Definindo Metas', color: '#94A3B8', order_index: 0 },
    { name: 'Em Tratamento', color: '#3B82F6', order_index: 1 },
    { name: 'Progresso Parcial', color: '#F97316', order_index: 2 },
    { name: 'Meta Atingida', color: '#22C55E', order_index: 3 },
    { name: 'Manutenção', color: '#8B5CF6', order_index: 4 },
    { name: 'Encerrado', color: '#6B7280', order_index: 5 },
  ];

  const labels = [
    { name: 'Coluna', color: '#EF4444' },
    { name: 'MMII', color: '#3B82F6' },
    { name: 'MMSS', color: '#22C55E' },
    { name: 'Neurológico', color: '#8B5CF6' },
    { name: 'Pós-cirúrgico', color: '#F97316' },
    { name: 'Pediátrico', color: '#EC4899' },
  ];

  const childrenQueries = [
    ...columns.map((col) => ({
      text: `INSERT INTO board_columns (board_id, organization_id, name, color, order_index, wip_limit)
             VALUES ($1, $2, $3, $4, $5, $6)`,
      values: [board.id, user.organizationId, col.name, col.color, col.order_index, null],
    })),
    ...labels.map((l, i) => ({
      text: `INSERT INTO board_labels (board_id, organization_id, name, color, order_index)
             VALUES ($1, $2, $3, $4, $5)`,
      values: [board.id, user.organizationId, l.name, l.color, i],
    })),
    {
      text: `INSERT INTO board_checklist_templates (board_id, organization_id, name, description, items, category, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      values: [
        board.id,
        user.organizationId,
        'Planejamento de Meta',
        'Checklist padrão para definição de objetivos funcionais',
        JSON.stringify([
          { text: 'Avaliar linha de base funcional (escala adequada)' },
          { text: 'Definir meta SMART com o paciente' },
          { text: 'Alinhar expectativas com familiar/cuidador' },
          { text: 'Estabelecer prazo estimado de reavaliação' },
          { text: 'Documentar na evolução SOAP' },
        ]),
        'fisioterapia',
        user.uid,
      ]
    }
  ];

  await db.transaction(childrenQueries);

  return c.json({ data: board }, 201);
});

export { app as boardsRoutes };
