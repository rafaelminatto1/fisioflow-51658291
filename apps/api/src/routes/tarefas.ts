import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { jsonSerialize } from '../lib/utils';
import { isUuid } from '../lib/validators';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Automation engine ────────────────────────────────────────────────────────
type DbClient = Awaited<ReturnType<typeof createPool>>;

interface AutomationRow {
  id: string;
  trigger: { type: string; from?: string; to?: string; label_id?: string };
  actions: Array<{ type: string; column_id?: string; status?: string; label_id?: string; user_id?: string; message?: string; titulo?: string }>;
}

async function executeAutomations(
  db: DbClient,
  orgId: string,
  taskBefore: Record<string, unknown>,
  taskAfter: Record<string, unknown>,
) {
  if (!taskAfter.board_id) return;

  let automations: AutomationRow[];
  try {
    const res = await db.query<AutomationRow>(
      `SELECT id, trigger, actions FROM board_automations
       WHERE board_id = $1 AND organization_id = $2 AND is_active = true`,
      [taskAfter.board_id, orgId],
    );
    automations = res.rows;
  } catch {
    return; // automation table may not exist in all envs — fail silently
  }

  for (const automation of automations) {
    const { type, from, to, label_id } = automation.trigger;
    let triggered = false;

    if (type === 'task_created') {
      triggered = (taskAfter as Record<string, unknown>)._trigger === 'task_created';
    } else if (type === 'status_changed') {
      triggered =
        taskBefore.status !== taskAfter.status &&
        (!from || taskBefore.status === from) &&
        (!to || taskAfter.status === to);
    } else if (type === 'column_moved') {
      triggered =
        taskBefore.column_id !== taskAfter.column_id &&
        (!from || taskBefore.column_id === from) &&
        (!to || taskAfter.column_id === to);
    } else if (type === 'tag_added') {
      const before = (taskBefore.label_ids as string[]) ?? [];
      const after = (taskAfter.label_ids as string[]) ?? [];
      triggered = !!label_id && !before.includes(label_id) && after.includes(label_id);
    } else if (type === 'checklist_completed') {
      type ChecklistItem = { checked?: boolean };
      const items = (taskAfter.checklists as Array<{ items?: ChecklistItem[] }>) ?? [];
      const allItems = items.flatMap((c) => c.items ?? []);
      const beforeItems = ((taskBefore.checklists as Array<{ items?: ChecklistItem[] }>) ?? []).flatMap((c) => c.items ?? []);
      const wasComplete = beforeItems.length > 0 && beforeItems.every((i) => i.checked);
      const isNowComplete = allItems.length > 0 && allItems.every((i) => i.checked);
      triggered = !wasComplete && isNowComplete;
    }

    if (!triggered) continue;

    // Execute actions sequentially
    for (const action of automation.actions) {
      try {
        if (action.type === 'change_status' && action.status) {
          await db.query(
            `UPDATE tarefas SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.status, taskAfter.id, orgId],
          );
        } else if (action.type === 'move_column' && action.column_id) {
          await db.query(
            `UPDATE tarefas SET column_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.column_id, taskAfter.id, orgId],
          );
        } else if (action.type === 'assign_label' && action.label_id) {
          await db.query(
            `UPDATE tarefas SET label_ids = array_append(label_ids, $1::uuid), updated_at = NOW()
             WHERE id = $2 AND organization_id = $3 AND NOT ($1::uuid = ANY(label_ids))`,
            [action.label_id, taskAfter.id, orgId],
          );
        } else if (action.type === 'assign_user' && action.user_id) {
          await db.query(
            `UPDATE tarefas SET responsavel_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.user_id, taskAfter.id, orgId],
          );
        } else if (action.type === 'create_task' && action.titulo) {
          await db.query(
            `INSERT INTO tarefas
               (organization_id, board_id, column_id, parent_id, titulo, status, prioridade, tipo, order_index,
                created_by, tags, label_ids, checklists, attachments, task_references, dependencies, acknowledgments)
             VALUES ($1,$2,$3,$4,$5,'A_FAZER','MEDIA','TAREFA',0,'automation','{}','{}','[]','[]','[]','[]','[]')`,
            [orgId, taskAfter.board_id, taskAfter.column_id ?? null, taskAfter.id, action.titulo],
          );
        } else if (action.type === 'send_notification') {
          // Notify the responsible user (or creator) via in-app notification
          const targetUserId = (taskAfter.responsavel_id ?? taskAfter.created_by) as string | null;
          if (targetUserId) {
            await db.query(
              `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
               VALUES ($1,$2,'automation',$3,$4,$5,$6::jsonb)`,
              [
                orgId,
                targetUserId,
                action.message ?? 'Automação do board',
                `Tarefa "${taskAfter.titulo}" foi atualizada por uma automação.`,
                `/boards/${taskAfter.board_id}`,
                JSON.stringify({ task_id: taskAfter.id, automation_id: automation.id }),
              ],
            ).catch(() => null);
          }
        }
      } catch (err) {
        console.error(`[Automation] action ${action.type} failed for task ${taskAfter.id}:`, err);
      }
    }

    // Log execution
    await db.query(
      `UPDATE board_automations SET execution_count = execution_count + 1, last_executed_at = NOW() WHERE id = $1`,
      [automation.id],
    ).catch(() => null);
  }
}

// Get tasks linked to a specific entity (patient, appointment, session, goal, exercise_plan)
app.get('/by-entity/:type/:entityId', requireAuth, async (c) => {
  const entityType = c.req.param('type');
  const entityId = c.req.param('entityId');
  if (!isUuid(entityId)) return c.json({ error: 'ID inválido' }, 400);
  try {
    const user = c.get('user');
    const db = await createPool(c.env);
    const result = await db.query(
      `SELECT *, task_references as references FROM tarefas
       WHERE organization_id = $1 AND linked_entity_type = $2 AND linked_entity_id = $3
       ORDER BY order_index ASC, created_at DESC`,
      [user.organizationId, entityType, entityId],
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error('[Tarefas] GET /by-entity error:', error);
    return c.json({ error: 'Erro ao buscar tarefas', data: [] }, 500);
  }
});

app.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { projectId } = c.req.query();
    const db = await createPool(c.env);

    // Get user role from profiles
    const profileRes = await db.query(`SELECT role FROM profiles WHERE user_id = $1 LIMIT 1`, [user.uid]);
    const userRole = profileRes.rows[0]?.role?.toLowerCase() || 'ESTAGIARIO';

    let sql = `SELECT *, task_references as references FROM tarefas WHERE organization_id = $1`;
    const params: unknown[] = [user.organizationId];
    let idx = 2;

    // Premium Feature: Hierarchical Visibility
    // Admins see everything. Physiotherapists see everything. Interns see only their assigned tasks.
    if (userRole === 'estagiario' || userRole === 'intern') {
      sql += ` AND (responsavel_id = $${idx} OR created_by = $${idx})`;
      params.push(user.uid);
      idx++;
    }

    if (projectId) { sql += ` AND project_id = $${idx++}`; params.push(projectId); }
    sql += ' ORDER BY order_index ASC, created_at DESC';

    const result = await db.query(sql, params);
    return c.json({ data: result.rows || result });
  } catch (error) {
    console.error('[Tarefas] GET / error:', error);
    return c.json({ 
      error: 'Erro ao buscar tarefas', 
      details: error instanceof Error ? error.message : String(error),
      data: [] 
    }, 500);
  }
});

app.post('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = await createPool(c.env);

    const result = await db.query(
      `INSERT INTO tarefas (organization_id, created_by, responsavel_id, project_id, parent_id,
         board_id, column_id, titulo, descricao, status, prioridade, tipo, data_vencimento, start_date,
         order_index, tags, label_ids, checklists, attachments, task_references, dependencies, requires_acknowledgment, acknowledgments,
         linked_entity_type, linked_entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *, task_references as references`,
      [
        user.organizationId, user.uid, body.responsavel_id ?? null, body.project_id ?? null,
        body.parent_id ?? null, body.board_id ?? null, body.column_id ?? null,
        body.titulo, body.descricao ?? null,
        body.status ?? 'A_FAZER', body.prioridade ?? 'MEDIA', body.tipo ?? 'TAREFA',
        body.data_vencimento ?? null, body.start_date ?? null, body.order_index ?? 0,
        body.tags ?? [],                                                        // text[]  — array JS direto
        body.label_ids ?? [],                                                   // uuid[] — array JS direto
        jsonSerialize(body.checklists ?? []),                                  // jsonb
        jsonSerialize(body.attachments ?? []),                                 // jsonb
        jsonSerialize(body.task_references ?? body.references ?? []),          // jsonb
        jsonSerialize(body.dependencies ?? []),                                // jsonb
        body.requires_acknowledgment ?? false,                                  // boolean
        jsonSerialize(body.acknowledgments ?? []),                             // jsonb
        body.linked_entity_type ?? null,                                        // VARCHAR(50)
        body.linked_entity_id ?? null,                                          // UUID
      ]
    );
    const createdTask = result.rows[0] as Record<string, unknown>;

    // Fire task_created automations (non-blocking)
    if (createdTask.board_id) {
      executeAutomations(db, user.organizationId, {}, { ...createdTask, _trigger: 'task_created' }).catch(() => null);
    }

    return c.json({ data: createdTask }, 201);
  } catch (error) {
    console.error('[Tarefas] POST / error:', error);
    return c.json({ 
      error: 'Erro ao criar tarefa', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

app.patch('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = await createPool(c.env);

    // Map frontend field 'references' to DB column 'task_references'
    if ('references' in body && !('task_references' in body)) body.task_references = body.references;

    const allowed = ['titulo', 'descricao', 'status', 'prioridade', 'tipo', 'data_vencimento',
      'start_date', 'completed_at', 'order_index', 'tags', 'label_ids', 'checklists', 'attachments',
      'task_references', 'dependencies', 'responsavel_id', 'project_id', 'parent_id',
      'board_id', 'column_id', 'requires_acknowledgment', 'acknowledgments',
      'linked_entity_type', 'linked_entity_id'];

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in body) {
        // tags/label_ids = native array (text[]/uuid[]); demais = jsonb (JSON.stringify)
        const val = (key === 'tags' || key === 'label_ids')
          ? (body[key] ?? [])
          : ['checklists', 'attachments', 'task_references', 'dependencies', 'acknowledgments'].includes(key)
            ? jsonSerialize(body[key] ?? [])
            : body[key];
        sets.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }
    if (!sets.length) return c.json({ error: 'No fields to update' }, 400);

    // Snapshot before state for automation diffing
    const beforeRes = await db.query(
      `SELECT status, column_id, board_id, label_ids, checklists FROM tarefas WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    const taskBefore = beforeRes.rows[0] as Record<string, unknown> | undefined;

    sets.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);

    const result = await db.query(
      `UPDATE tarefas SET ${sets.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *, task_references as references`,
      params
    );
    if (!result.rowCount) return c.json({ error: 'Not found' }, 404);
    const taskAfter = result.rows[0] as Record<string, unknown>;

    // Fire automations asynchronously (non-blocking)
    if (taskBefore) {
      executeAutomations(db, user.organizationId, taskBefore, taskAfter).catch((err) =>
        console.error('[Automation] engine error:', err),
      );
    }

    // Award XP when task is completed (gamification — non-blocking)
    if (taskBefore?.status !== 'CONCLUIDO' && taskAfter.status === 'CONCLUIDO') {
      const completedBy = (taskAfter.responsavel_id ?? user.uid) as string;
      db.query(
        `INSERT INTO xp_transactions (organization_id, patient_id, user_id, type, points, description, reference_id, reference_type)
         VALUES ($1, NULL, $2, 'task_completed', 10, 'Tarefa concluída', $3, 'tarefa')
         ON CONFLICT DO NOTHING`,
        [user.organizationId, completedBy, id],
      ).catch(() => null);
    }

    return c.json({ data: taskAfter });
  } catch (error) {
    console.error('[Tarefas] PATCH /:id error:', error);
    return c.json({ 
      error: 'Erro ao atualizar tarefa', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

app.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!isUuid(id)) return c.json({ error: 'ID inválido' }, 400);
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
