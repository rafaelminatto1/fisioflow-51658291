/**
 * Notificações de tarefas (specs/tarefas-integracoes US-01/US-02).
 *
 * In-app sempre; WhatsApp só p/ tarefa URGENTE e com gate duplo:
 * `settings.crm_whatsapp.automations_enabled` + template `tarefa_urgente_equipe`
 * aprovado na Meta + telefone cadastrado no perfil do membro. Tudo best-effort —
 * nunca falha o request principal.
 */
import type { Env } from "../types/env";
import type { DbPool } from "./db";
import { sendAutomationTemplate } from "./whatsappAutomations";

type TaskLike = {
  id?: unknown;
  titulo?: unknown;
  prioridade?: unknown;
  responsavel_id?: unknown;
  data_vencimento?: unknown;
  board_id?: unknown;
};

/**
 * Decide quem notificar após create/update: retorna o user_id do novo
 * responsável, ou null quando não houve (re)atribuição relevante.
 */
export function assignmentTarget(
  before: { responsavel_id?: unknown } | undefined,
  after: TaskLike,
  actorId: string,
): string | null {
  const newResp = typeof after.responsavel_id === "string" ? after.responsavel_id : null;
  if (!newResp) return null;
  if (before && before.responsavel_id === newResp) return null;
  if (newResp === actorId) return null;
  return newResp;
}

export function formatDueDateBR(dueDate: unknown): string {
  if (!dueDate) return "sem prazo";
  const raw = String(dueDate).slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return "sem prazo";
  return `${d}/${m}/${y}`;
}

export async function insertTaskNotification(
  pool: DbPool,
  orgId: string,
  userId: string,
  task: TaskLike,
  opts?: { type?: string; title?: string },
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (organization_id, user_id, type, title, message, link, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
    [
      orgId,
      userId,
      opts?.type ?? "task_assigned",
      opts?.title ?? "Nova tarefa atribuída a você",
      `Tarefa "${String(task.titulo ?? "")}" — prazo: ${formatDueDateBR(task.data_vencimento)}.`,
      `/tarefas?task=${String(task.id)}`,
      JSON.stringify({ task_id: task.id, board_id: task.board_id ?? null }),
    ],
  );
}

async function memberFirstNameAndPhone(
  pool: DbPool,
  orgId: string,
  userId: string,
): Promise<{ firstName: string; phone: string | null }> {
  const res = await pool.query(
    `SELECT COALESCE(full_name, name) AS name, phone FROM profiles
     WHERE user_id = $1 AND organization_id = $2 LIMIT 1`,
    [userId, orgId],
  );
  const row = res.rows[0] as { name?: string; phone?: string } | undefined;
  return {
    firstName: (row?.name || "colega").split(" ")[0],
    phone: row?.phone?.trim() || null,
  };
}

/**
 * Notifica o responsável recém-atribuído: in-app sempre; WhatsApp se URGENTE.
 */
export async function notifyTaskAssignment(
  pool: DbPool,
  env: Env,
  orgId: string,
  task: TaskLike,
  targetUserId: string,
): Promise<void> {
  try {
    await insertTaskNotification(pool, orgId, targetUserId, task);
  } catch (err) {
    console.error("[TarefaNotif] insert notification falhou:", err);
  }

  if (task.prioridade !== "URGENTE") return;
  try {
    const { firstName, phone } = await memberFirstNameAndPhone(pool, orgId, targetUserId);
    await sendAutomationTemplate(env, orgId, phone, "tarefa_urgente_equipe", [
      firstName,
      String(task.titulo ?? "").slice(0, 200),
      formatDueDateBR(task.data_vencimento),
    ]);
  } catch (err) {
    console.error("[TarefaNotif] WhatsApp urgente falhou:", err);
  }
}

/**
 * Tarefa URGENTE vencendo hoje: in-app + WhatsApp (mesmo gate da atribuição).
 */
export async function notifyUrgentTaskDue(
  pool: DbPool,
  env: Env,
  orgId: string,
  task: TaskLike,
  targetUserId: string,
): Promise<void> {
  try {
    await insertTaskNotification(pool, orgId, targetUserId, task, {
      type: "task_due",
      title: "Tarefa URGENTE vence hoje",
    });
  } catch (err) {
    console.error("[TarefaNotif] insert due notification falhou:", err);
  }
  try {
    const { firstName, phone } = await memberFirstNameAndPhone(pool, orgId, targetUserId);
    await sendAutomationTemplate(env, orgId, phone, "tarefa_urgente_equipe", [
      firstName,
      String(task.titulo ?? "").slice(0, 200),
      formatDueDateBR(task.data_vencimento),
    ]);
  } catch (err) {
    console.error("[TarefaNotif] WhatsApp vencimento falhou:", err);
  }
}

export function extractMentionIds(mentions: unknown): string[] {
  if (!Array.isArray(mentions)) return [];
  return mentions.filter((m): m is string => typeof m === "string" && m.length > 0).slice(0, 20);
}
