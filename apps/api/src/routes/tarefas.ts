import { Hono } from "hono";
import { createPool } from "../lib/db";
import { requireAuth, type AuthVariables } from "../lib/auth";
import { DEFAULT_TIMEOUTS } from "../lib/dbWrapper";
import type { Env } from "../types/env";
import { jsonSerialize } from "../lib/utils";
import { isUuid } from "../lib/validators";
import {
  assignmentTarget,
  notifyTaskAssignment,
  insertTaskNotification,
  extractMentionIds,
} from "../lib/tarefaNotifications";
import { parseRecurrence, computeNextDueDate } from "../lib/tarefaRecurrence";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// ─── Automation engine ────────────────────────────────────────────────────────
type DbClient = Awaited<ReturnType<typeof createPool>>;

interface AutomationRow {
  id: string;
  trigger: { type: string; from?: string; to?: string; label_id?: string };
  actions: Array<{
    type: string;
    column_id?: string;
    status?: string;
    label_id?: string;
    user_id?: string;
    message?: string;
    titulo?: string;
  }>;
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

    if (type === "task_created") {
      triggered = (taskAfter as Record<string, unknown>)._trigger === "task_created";
    } else if (type === "status_changed") {
      triggered =
        taskBefore.status !== taskAfter.status &&
        (!from || taskBefore.status === from) &&
        (!to || taskAfter.status === to);
    } else if (type === "column_moved") {
      triggered =
        taskBefore.column_id !== taskAfter.column_id &&
        (!from || taskBefore.column_id === from) &&
        (!to || taskAfter.column_id === to);
    } else if (type === "tag_added") {
      const before = (taskBefore.label_ids as string[]) ?? [];
      const after = (taskAfter.label_ids as string[]) ?? [];
      triggered = !!label_id && !before.includes(label_id) && after.includes(label_id);
    } else if (type === "checklist_completed") {
      type ChecklistItem = { checked?: boolean };
      const items = (taskAfter.checklists as Array<{ items?: ChecklistItem[] }>) ?? [];
      const allItems = items.flatMap((c) => c.items ?? []);
      const beforeItems = (
        (taskBefore.checklists as Array<{ items?: ChecklistItem[] }>) ?? []
      ).flatMap((c) => c.items ?? []);
      const wasComplete = beforeItems.length > 0 && beforeItems.every((i) => i.checked);
      const isNowComplete = allItems.length > 0 && allItems.every((i) => i.checked);
      triggered = !wasComplete && isNowComplete;
    }

    if (!triggered) continue;

    // Execute actions sequentially
    for (const action of automation.actions) {
      try {
        if (action.type === "change_status" && action.status) {
          await db.query(
            `UPDATE tarefas SET status = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.status, taskAfter.id, orgId],
          );
        } else if (action.type === "move_column" && action.column_id) {
          await db.query(
            `UPDATE tarefas SET column_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.column_id, taskAfter.id, orgId],
          );
        } else if (action.type === "assign_label" && action.label_id) {
          await db.query(
            `UPDATE tarefas SET label_ids = array_append(label_ids, $1::uuid), updated_at = NOW()
             WHERE id = $2 AND organization_id = $3 AND NOT ($1::uuid = ANY(label_ids))`,
            [action.label_id, taskAfter.id, orgId],
          );
        } else if (action.type === "assign_user" && action.user_id) {
          await db.query(
            `UPDATE tarefas SET responsavel_id = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`,
            [action.user_id, taskAfter.id, orgId],
          );
        } else if (action.type === "create_task" && action.titulo) {
          await db.query(
            `INSERT INTO tarefas
               (organization_id, board_id, column_id, parent_id, titulo, status, prioridade, tipo, order_index,
                created_by, tags, label_ids, checklists, attachments, task_references, dependencies, acknowledgments)
             VALUES ($1,$2,$3,$4,$5,'A_FAZER','MEDIA','TAREFA',0,'automation','{}','{}','[]','[]','[]','[]','[]')`,
            [orgId, taskAfter.board_id, taskAfter.column_id ?? null, taskAfter.id, action.titulo],
          );
        } else if (action.type === "send_notification") {
          // Notify the responsible user (or creator) via in-app notification
          const targetUserId = (taskAfter.responsavel_id ?? taskAfter.created_by) as string | null;
          if (targetUserId) {
            await db
              .query(
                `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
               VALUES ($1,$2,'automation',$3,$4,$5,$6::jsonb)`,
                [
                  orgId,
                  targetUserId,
                  action.message ?? "Automação do board",
                  `Tarefa "${taskAfter.titulo}" foi atualizada por uma automação.`,
                  `/boards/${taskAfter.board_id}`,
                  JSON.stringify({ task_id: taskAfter.id, automation_id: automation.id }),
                ],
              )
              .catch(() => null);
          }
        }
      } catch (err) {
        console.error(`[Automation] action ${action.type} failed for task ${taskAfter.id}:`, err);
      }
    }

    // Log execution
    await db
      .query(
        `UPDATE board_automations SET execution_count = execution_count + 1, last_executed_at = NOW() WHERE id = $1`,
        [automation.id],
      )
      .catch(() => null);
  }
}

/**
 * Cria a próxima instância de uma tarefa recorrente concluída.
 * Série identificada por recurrence_parent_id (raiz = primeira tarefa da série).
 * Dedup: não cria se já existe instância aberta na série.
 */
async function spawnNextRecurrence(
  db: DbClient,
  orgId: string,
  task: Record<string, unknown>,
) {
  const rec = parseRecurrence(task.recurrence);
  if (!rec) return;

  const rootId = (task.recurrence_parent_id ?? task.id) as string;
  const open = await db.query(
    `SELECT 1 FROM tarefas
     WHERE organization_id = $1 AND status NOT IN ('CONCLUIDO','ARQUIVADO')
       AND (recurrence_parent_id = $2 OR id = $2)
     LIMIT 1`,
    [orgId, rootId],
  );
  if (open.rows.length > 0) return;

  const baseDue = task.data_vencimento
    ? String(task.data_vencimento).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const nextDue = computeNextDueDate(rec, baseDue);

  await db.query(
    `INSERT INTO tarefas
       (organization_id, created_by, responsavel_id, project_id, board_id, column_id,
        titulo, descricao, status, prioridade, tipo, data_vencimento, order_index,
        tags, label_ids, checklists, attachments, task_references, dependencies,
        requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id,
        recurrence, recurrence_parent_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'A_FAZER',$9,$10,$11,$12,$13,$14,$15,'[]','[]',$16,$17,'[]',$18,$19,$20,$21)`,
    [
      orgId,
      task.created_by ?? "recurrence",
      task.responsavel_id ?? null,
      task.project_id ?? null,
      task.board_id ?? null,
      task.column_id ?? null,
      task.titulo,
      task.descricao ?? null,
      task.prioridade ?? "MEDIA",
      task.tipo ?? "TAREFA",
      nextDue,
      task.order_index ?? 0,
      task.tags ?? [],
      task.label_ids ?? [],
      jsonSerialize(resetChecklists(task.checklists)),
      jsonSerialize(task.dependencies ?? []),
      task.requires_acknowledgment ?? false,
      task.linked_entity_type ?? null,
      task.linked_entity_id ?? null,
      jsonSerialize(rec),
      rootId,
    ],
  );
}

/** Desmarca todos os itens de checklist para a nova instância recorrente. */
function resetChecklists(checklists: unknown): unknown[] {
  if (!Array.isArray(checklists)) return [];
  return checklists.map((cl) => ({
    ...(cl as Record<string, unknown>),
    items: Array.isArray((cl as Record<string, unknown>).items)
      ? ((cl as Record<string, unknown>).items as Array<Record<string, unknown>>).map((i) => ({
          ...i,
          checked: false,
        }))
      : [],
  }));
}

// Get tasks linked to a specific entity (patient, appointment, session, goal, exercise_plan)
app.get("/by-entity/:type/:entityId", requireAuth, async (c) => {
  const entityType = c.req.param("type");
  const entityId = c.req.param("entityId");
  if (!isUuid(entityId)) return c.json({ error: "ID inválido" }, 400);
  try {
    const user = c.get("user");
    const db = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
    const result = await db.query(
      `SELECT *, task_references as references FROM tarefas
       WHERE organization_id = $1 AND linked_entity_type = $2 AND linked_entity_id = $3
       ORDER BY order_index ASC, created_at DESC`,
      [user.organizationId, entityType, entityId],
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Tarefas] GET /by-entity error:", error);
    return c.json({ error: "Erro ao buscar tarefas", data: [] }, 500);
  }
});

// ─── Templates de tarefa (US-07) ─────────────────────────────────────────────
app.get("/templates", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const db = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
    const result = await db.query(
      `SELECT * FROM tarefa_templates WHERE organization_id = $1 ORDER BY created_at DESC`,
      [user.organizationId],
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Tarefas] GET /templates error:", error);
    return c.json({ error: "Erro ao buscar templates", data: [] }, 500);
  }
});

app.post("/templates", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    if (!body.name || !body.titulo)
      return c.json({ error: "name e titulo são obrigatórios" }, 400);
    const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
    const result = await db.query(
      `INSERT INTO tarefa_templates (organization_id, name, titulo, descricao, tipo, prioridade, tags, checklists, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        user.organizationId,
        body.name,
        body.titulo,
        body.descricao ?? null,
        body.tipo ?? "TAREFA",
        body.prioridade ?? "MEDIA",
        body.tags ?? [],
        jsonSerialize(body.checklists ?? []),
        user.uid,
      ],
    );
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Tarefas] POST /templates error:", error);
    return c.json({ error: "Erro ao criar template" }, 500);
  }
});

app.delete("/templates/:templateId", requireAuth, async (c) => {
  const user = c.get("user");
  const templateId = c.req.param("templateId");
  if (!isUuid(templateId)) return c.json({ error: "ID inválido" }, 400);
  const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
  await db.query(`DELETE FROM tarefa_templates WHERE id = $1 AND organization_id = $2`, [
    templateId,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

app.get("/", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const { projectId } = c.req.query();
    const db = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");

    const userRole = String(user.role ?? "").toLowerCase();

    let sql = `SELECT *, task_references as references FROM tarefas WHERE organization_id = $1`;
    const params: unknown[] = [user.organizationId];
    let idx = 2;

    // Premium Feature: Hierarchical Visibility
    // Admins see everything. Physiotherapists see everything. Interns see only their assigned tasks.
    if (userRole === "estagiario" || userRole === "intern") {
      sql += ` AND (responsavel_id = $${idx} OR created_by = $${idx})`;
      params.push(user.uid);
      idx++;
    }

    if (projectId) {
      sql += ` AND project_id = $${idx++}`;
      params.push(projectId);
    }
    sql += " ORDER BY order_index ASC, created_at DESC";

    const result = await db.query(sql, params);
    return c.json({ data: result.rows || result });
  } catch (error) {
    console.error("[Tarefas] GET / error:", error);
    return c.json(
      {
        error: "Erro ao buscar tarefas",
        details: error instanceof Error ? error.message : String(error),
        data: [],
      },
      500,
    );
  }
});

app.post("/", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");

    const result = await db.query(
      `INSERT INTO tarefas (organization_id, created_by, responsavel_id, project_id, parent_id,
         board_id, column_id, titulo, descricao, status, prioridade, tipo, data_vencimento, start_date,
         order_index, tags, label_ids, checklists, attachments, task_references, dependencies, requires_acknowledgment, acknowledgments,
         linked_entity_type, linked_entity_id, recurrence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *, task_references as references`,
      [
        user.organizationId,
        user.uid,
        body.responsavel_id ?? null,
        body.project_id ?? null,
        body.parent_id ?? null,
        body.board_id ?? null,
        body.column_id ?? null,
        body.titulo,
        body.descricao ?? null,
        body.status ?? "A_FAZER",
        body.prioridade ?? "MEDIA",
        body.tipo ?? "TAREFA",
        body.data_vencimento ?? null,
        body.start_date ?? null,
        body.order_index ?? 0,
        body.tags ?? [], // text[]  — array JS direto
        body.label_ids ?? [], // uuid[] — array JS direto
        jsonSerialize(body.checklists ?? []), // jsonb
        jsonSerialize(body.attachments ?? []), // jsonb
        jsonSerialize(body.task_references ?? body.references ?? []), // jsonb
        jsonSerialize(body.dependencies ?? []), // jsonb
        body.requires_acknowledgment ?? false, // boolean
        jsonSerialize(body.acknowledgments ?? []), // jsonb
        body.linked_entity_type ?? null, // VARCHAR(50)
        body.linked_entity_id ?? null, // UUID
        body.recurrence ? jsonSerialize(parseRecurrence(body.recurrence)) : null, // jsonb
      ],
    );
    const createdTask = result.rows[0] as Record<string, unknown>;

    // Notifica o responsável atribuído (in-app; WhatsApp se URGENTE) — best-effort
    const assignee = assignmentTarget(undefined, createdTask, user.uid);
    if (assignee) {
      notifyTaskAssignment(db, c.env, user.organizationId, createdTask, assignee).catch(() => null);
    }

    // Fire task_created automations (non-blocking)
    if (createdTask.board_id) {
      executeAutomations(
        db,
        user.organizationId,
        {},
        { ...createdTask, _trigger: "task_created" },
      ).catch(() => null);
    }

    return c.json({ data: createdTask }, 201);
  } catch (error) {
    console.error("[Tarefas] POST / error:", error);
    return c.json(
      {
        error: "Erro ao criar tarefa",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

app.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");

    // Map frontend field 'references' to DB column 'task_references'
    if ("references" in body && !("task_references" in body))
      body.task_references = body.references;

    const allowed = [
      "titulo",
      "descricao",
      "status",
      "prioridade",
      "tipo",
      "data_vencimento",
      "start_date",
      "completed_at",
      "order_index",
      "tags",
      "label_ids",
      "checklists",
      "attachments",
      "task_references",
      "dependencies",
      "responsavel_id",
      "project_id",
      "parent_id",
      "board_id",
      "column_id",
      "requires_acknowledgment",
      "acknowledgments",
      "linked_entity_type",
      "linked_entity_id",
      "recurrence",
    ];

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in body) {
        // tags/label_ids = native array (text[]/uuid[]); demais = jsonb (JSON.stringify)
        const val =
          key === "tags" || key === "label_ids"
            ? (body[key] ?? [])
            : [
                  "checklists",
                  "attachments",
                  "task_references",
                  "dependencies",
                  "acknowledgments",
                ].includes(key)
              ? jsonSerialize(body[key] ?? [])
              : key === "recurrence"
                ? body[key]
                  ? jsonSerialize(parseRecurrence(body[key]))
                  : null
                : body[key];
        sets.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }
    if (!sets.length) return c.json({ error: "No fields to update" }, 400);

    // Snapshot before state for automation diffing
    const beforeRes = await db.query(
      `SELECT status, column_id, board_id, label_ids, checklists, responsavel_id FROM tarefas WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    const taskBefore = beforeRes.rows[0] as Record<string, unknown> | undefined;

    sets.push(`updated_at = NOW()`);
    params.push(id, user.organizationId);

    const result = await db.query(
      `UPDATE tarefas SET ${sets.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx++} RETURNING *, task_references as references`,
      params,
    );
    if (!result.rowCount) return c.json({ error: "Not found" }, 404);
    const taskAfter = result.rows[0] as Record<string, unknown>;

    // Fire automations asynchronously (non-blocking)
    if (taskBefore) {
      executeAutomations(db, user.organizationId, taskBefore, taskAfter).catch((err) =>
        console.error("[Automation] engine error:", err),
      );
    }

    // Notifica reatribuição de responsável (in-app; WhatsApp se URGENTE)
    const reassigned = assignmentTarget(taskBefore, taskAfter, user.uid);
    if (reassigned) {
      notifyTaskAssignment(db, c.env, user.organizationId, taskAfter, reassigned).catch(
        () => null,
      );
    }

    // Recorrência: ao concluir, cria a próxima instância da série (dedup: 1 aberta)
    if (taskBefore?.status !== "CONCLUIDO" && taskAfter.status === "CONCLUIDO") {
      spawnNextRecurrence(db, user.organizationId, taskAfter).catch((err) =>
        console.error("[Tarefas] recurrence spawn error:", err),
      );
    }

    // Award XP when task is completed (gamification — non-blocking)
    if (taskBefore?.status !== "CONCLUIDO" && taskAfter.status === "CONCLUIDO") {
      const completedBy = (taskAfter.responsavel_id ?? user.uid) as string;
      const linkedPatientId =
        taskAfter.linked_entity_type === "patient" &&
        isUuid(String(taskAfter.linked_entity_id ?? ""))
          ? String(taskAfter.linked_entity_id)
          : null;

      if (linkedPatientId)
        db.query(
          `INSERT INTO xp_transactions (organization_id, patient_id, amount, reason, description, source, metadata, created_by)
         VALUES ($1, $2, 10, 'task_completed', 'Tarefa concluída', 'tarefa', $3::jsonb, $4)
         ON CONFLICT DO NOTHING`,
          [
            user.organizationId,
            linkedPatientId,
            jsonSerialize({ task_id: id }),
            isUuid(completedBy) ? completedBy : null,
          ],
        ).catch(() => null);
    }

    return c.json({ data: taskAfter });
  } catch (error) {
    console.error("[Tarefas] PATCH /:id error:", error);
    return c.json(
      {
        error: "Erro ao atualizar tarefa",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// ─── Comentários com @menção (US-02) ─────────────────────────────────────────
app.get("/:id/comments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  try {
    const user = c.get("user");
    const db = createPool(c.env, DEFAULT_TIMEOUTS.query, "read");
    const result = await db.query(
      `SELECT * FROM tarefa_comments WHERE tarefa_id = $1 AND organization_id = $2 ORDER BY created_at ASC`,
      [id, user.organizationId],
    );
    return c.json({ data: result.rows });
  } catch (error) {
    console.error("[Tarefas] GET /:id/comments error:", error);
    return c.json({ error: "Erro ao buscar comentários", data: [] }, 500);
  }
});

app.post("/:id/comments", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const content = String(body.content ?? "").trim();
    if (!content) return c.json({ error: "Comentário vazio" }, 400);
    const mentions = extractMentionIds(body.mentions);

    const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
    const taskRes = await db.query(
      `SELECT id, titulo, board_id, data_vencimento FROM tarefas WHERE id = $1 AND organization_id = $2`,
      [id, user.organizationId],
    );
    const task = taskRes.rows[0] as Record<string, unknown> | undefined;
    if (!task) return c.json({ error: "Not found" }, 404);

    const profileRes = await db.query(
      `SELECT COALESCE(full_name, name) AS name FROM profiles WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
      [user.uid, user.organizationId],
    );
    const authorName =
      (profileRes.rows[0] as { name?: string } | undefined)?.name ?? user.email ?? "Membro";

    const result = await db.query(
      `INSERT INTO tarefa_comments (organization_id, tarefa_id, author_id, author_name, content, mentions)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user.organizationId, id, user.uid, authorName, content, mentions],
    );

    // Notifica mencionados (best-effort, nunca falha o request)
    for (const mentioned of mentions) {
      if (mentioned === user.uid) continue;
      insertTaskNotification(db, user.organizationId, mentioned, task, {
        type: "task_mention",
        title: `${authorName} mencionou você em uma tarefa`,
      }).catch(() => null);
    }

    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Tarefas] POST /:id/comments error:", error);
    return c.json({ error: "Erro ao comentar" }, 500);
  }
});

app.delete("/:id/comments/:commentId", requireAuth, async (c) => {
  const id = c.req.param("id");
  const commentId = c.req.param("commentId");
  if (!isUuid(id) || !isUuid(commentId)) return c.json({ error: "ID inválido" }, 400);
  const user = c.get("user");
  const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
  const isAdmin = String(user.role ?? "").toLowerCase() === "admin";
  const result = await db.query(
    `DELETE FROM tarefa_comments
     WHERE id = $1 AND tarefa_id = $2 AND organization_id = $3
       AND ($4 OR author_id = $5)`,
    [commentId, id, user.organizationId, isAdmin, user.uid],
  );
  if (!result.rowCount) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

// ─── Duplicar tarefa (US-05) ─────────────────────────────────────────────────
app.post("/:id/duplicate", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  try {
    const user = c.get("user");
    const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
    const result = await db.query(
      `INSERT INTO tarefas
         (organization_id, created_by, responsavel_id, project_id, board_id, column_id,
          titulo, descricao, status, prioridade, tipo, data_vencimento, start_date, order_index,
          tags, label_ids, checklists, attachments, task_references, dependencies,
          requires_acknowledgment, acknowledgments, linked_entity_type, linked_entity_id)
       SELECT organization_id, $3, responsavel_id, project_id, board_id, column_id,
          titulo || ' (cópia)', descricao, 'A_FAZER', prioridade, tipo, data_vencimento, start_date, order_index + 1,
          tags, label_ids, checklists, attachments, task_references, dependencies,
          requires_acknowledgment, '[]'::jsonb, linked_entity_type, linked_entity_id
       FROM tarefas WHERE id = $1 AND organization_id = $2
       RETURNING *, task_references as references`,
      [id, user.organizationId, user.uid],
    );
    if (!result.rows.length) return c.json({ error: "Not found" }, 404);
    return c.json({ data: result.rows[0] }, 201);
  } catch (error) {
    console.error("[Tarefas] POST /:id/duplicate error:", error);
    return c.json({ error: "Erro ao duplicar tarefa" }, 500);
  }
});

app.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  if (!isUuid(id)) return c.json({ error: "ID inválido" }, 400);
  const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");
  await db.query(`DELETE FROM tarefas WHERE id = $1 AND organization_id = $2`, [
    id,
    user.organizationId,
  ]);
  return c.json({ ok: true });
});

// Bulk update (reorder / bulk status)
app.post("/bulk", requireAuth, async (c) => {
  const user = c.get("user");
  const { updates } = (await c.req.json()) as {
    updates: Array<{
      id: string;
      status?: string;
      order_index?: number;
      prioridade?: string;
      responsavel_id?: string | null;
      column_id?: string | null;
    }>;
  };
  const db = createPool(c.env, DEFAULT_TIMEOUTS.mutation, "read");

  await Promise.all(
    updates.map(({ id, ...fields }) => {
      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [];
      let idx = 1;
      if ("status" in fields) {
        sets.push(`status = $${idx++}`);
        params.push(fields.status);
      }
      if ("order_index" in fields) {
        sets.push(`order_index = $${idx++}`);
        params.push(fields.order_index);
      }
      if ("prioridade" in fields) {
        sets.push(`prioridade = $${idx++}`);
        params.push(fields.prioridade);
      }
      if ("responsavel_id" in fields) {
        sets.push(`responsavel_id = $${idx++}`);
        params.push(fields.responsavel_id);
      }
      if ("column_id" in fields) {
        sets.push(`column_id = $${idx++}`);
        params.push(fields.column_id);
      }
      params.push(id, user.organizationId);
      return db.query(
        `UPDATE tarefas SET ${sets.join(", ")} WHERE id = $${idx++} AND organization_id = $${idx++}`,
        params,
      );
    }),
  );

  return c.json({ ok: true });
});

export { app as tarefasRoutes };
