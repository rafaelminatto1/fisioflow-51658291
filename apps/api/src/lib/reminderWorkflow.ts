import type { Env } from "../types/env";
import type { AppointmentReminderParams } from "../workflows/appointmentReminder";
import { resolveReminderConfig, computeReminderSendAt } from "./reminderScheduling";

export interface ReminderApptInput {
  id: string;
  organizationId: string;
  patientId?: string | null;
  patientPhone: string | null;
  patientName: string | null;
  therapistName?: string | null;
  dateStr: string; // YYYY-MM-DD (local)
  timeStr: string; // HH:mm
}

/** Único template de lembrete APROVADO na WABA. Não inventar outro. */
export const REMINDER_TEMPLATE = "lembrete_consulta_botoes";

/** Id determinístico → uma instância por agendamento (idempotente). */
export function reminderWorkflowId(appointmentId: string): string {
  return `reminder-${appointmentId}`;
}

/**
 * Monta os params do workflow a partir do agendamento + config da org.
 * Retorna null se: lembrete desabilitado, sem telefone/horário, sendAt inválido
 * ou já passou do início da consulta (não faz sentido lembrar depois).
 */
export function buildReminderParams(
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): AppointmentReminderParams | null {
  const cfg = resolveReminderConfig(orgReminderCfg);
  if (!cfg.enabled) return null;
  if (!appt.patientPhone || !appt.timeStr) return null;

  const sendAt = computeReminderSendAt(appt.dateStr, appt.timeStr, cfg).getTime();
  const apptMs = Date.parse(`${appt.dateStr}T${appt.timeStr}:00-03:00`);
  if (!Number.isFinite(sendAt)) return null;
  if (Number.isFinite(apptMs) && sendAt >= apptMs) return null;

  return {
    appointmentId: appt.id,
    organizationId: appt.organizationId,
    patientId: appt.patientId ?? "",
    patientPhone: appt.patientPhone,
    patientName: appt.patientName ?? "paciente",
    therapistName: appt.therapistName ?? "Fisioterapeuta",
    apptDateStr: appt.dateStr,
    apptTimeStr: appt.timeStr,
    sendAtMs: sendAt,
    templateName: REMINDER_TEMPLATE,
  };
}

/** Best-effort: agenda o lembrete; nunca propaga erro para a rota. */
export async function scheduleReminder(
  env: Env,
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): Promise<void> {
  try {
    if (!env.WORKFLOW_APPOINTMENT_REMINDER) return;
    const params = buildReminderParams(appt, orgReminderCfg);
    if (!params) return;
    await env.WORKFLOW_APPOINTMENT_REMINDER.create({
      id: reminderWorkflowId(appt.id),
      params: params as unknown as Record<string, unknown>,
    });
  } catch (err) {
    console.warn("[Reminder] scheduleReminder falhou:", err);
  }
}

/** Best-effort: encerra o lembrete; tolera instância inexistente. */
export async function cancelReminder(env: Env, appointmentId: string): Promise<void> {
  try {
    if (!env.WORKFLOW_APPOINTMENT_REMINDER) return;
    const instance = await env.WORKFLOW_APPOINTMENT_REMINDER.get(reminderWorkflowId(appointmentId));
    await instance.terminate();
  } catch {
    // instância inexistente / já encerrada — ok
  }
}

/**
 * Status (normalizados) em que o lembrete deve ser CANCELADO ao atualizar o
 * agendamento (terminal / não faz sentido lembrar). `normalizeStatus` já mapeia
 * aliases EN→PT (completed→atendido, no_show→faltou, cancelled→cancelado).
 */
export const REMINDER_CANCEL_STATUSES = new Set([
  "cancelado",
  "cancelled",
  "faltou",
  "faltou_com_aviso",
  "faltou_sem_aviso",
  "nao_atendido",
  "no_show",
  "concluido",
  "completed",
  "atendido",
  "remarcado",
  "rescheduled",
]);

/** Decide o efeito de um UPDATE de agendamento sobre o lembrete agendado. */
export function reminderActionForUpdate(opts: {
  dateChanged: boolean;
  timeChanged: boolean;
  newStatus?: string | null;
}): "reschedule" | "cancel" | "none" {
  const status = opts.newStatus ? String(opts.newStatus).toLowerCase() : null;
  if (status && REMINDER_CANCEL_STATUSES.has(status)) return "cancel";
  if (opts.dateChanged || opts.timeChanged) return "reschedule";
  return "none";
}

/** Reagendamento = encerra o antigo + cria um novo com o novo horário. */
export async function rescheduleReminder(
  env: Env,
  appt: ReminderApptInput,
  orgReminderCfg: unknown,
): Promise<void> {
  await cancelReminder(env, appt.id);
  await scheduleReminder(env, appt, orgReminderCfg);
}
