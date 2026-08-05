/**
 * Push de nova mensagem do inbox para o profissional.
 *
 * Todos os pushes existentes eram orientados ao paciente (lembrete de consulta,
 * marco de HEP). O profissional recebia mensagem no WhatsApp da clínica e só
 * descobria abrindo o app — o que, na prática, significa não descobrir.
 *
 * Regras que importam mais que o envio em si:
 *
 * - Conversa atribuída notifica só o responsável. Tocar o celular de sete
 *   pessoas por uma conversa que tem dono é o caminho mais curto para todo
 *   mundo desligar a notificação, e aí o recurso deixa de existir.
 * - Conversa adiada (`snoozed_until`) não notifica: o profissional já disse
 *   explicitamente que volta a ela depois.
 * - Preferência e horário de silêncio do usuário são respeitados.
 */

import { notifyOrganization, notifyUser, type PushPayload } from "../push";
import type { Env } from "../../types/env";

interface Pool {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>;
}

export interface InboxPushInput {
  organizationId: string;
  conversationId: string;
  contactName: string;
  preview: string;
  messageType: string;
  /** Injetável para teste; padrão é a hora corrente. */
  now?: Date;
}

/** Máximo que cabe na notificação sem virar parede de texto. */
const PREVIEW_MAX = 120;

const RESUMO_POR_TIPO: Record<string, string> = {
  image: "Enviou uma imagem",
  video: "Enviou um vídeo",
  audio: "Enviou um áudio",
  document: "Enviou um documento",
  sticker: "Enviou uma figurinha",
  location: "Enviou uma localização",
  contacts: "Enviou um contato",
};

export function buildPreview(messageType: string, content: string): string {
  const resumo = RESUMO_POR_TIPO[messageType];
  if (resumo) return resumo;

  const limpo = (content ?? "").replace(/\s+/g, " ").trim();
  if (!limpo) return "Nova mensagem";
  return limpo.length > PREVIEW_MAX ? `${limpo.slice(0, PREVIEW_MAX - 1)}…` : limpo;
}

/**
 * Horário de silêncio, no formato "HH:MM" que a tabela guarda.
 * A janela pode cruzar a meia-noite (22:00 → 08:00), então a comparação não é
 * um simples `entre`.
 */
export function dentroDoSilencio(now: Date, inicio?: string | null, fim?: string | null): boolean {
  if (!inicio || !fim) return false;

  const minutos = (hhmm: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  };

  const ini = minutos(inicio);
  const f = minutos(fim);
  if (ini === null || f === null) return false;

  const agora = now.getHours() * 60 + now.getMinutes();
  return ini <= f ? agora >= ini && agora < f : agora >= ini || agora < f;
}

interface Conversa {
  assignedTo: string | null;
  snoozedUntil: Date | null;
}

async function carregarConversa(
  pool: Pool,
  organizationId: string,
  conversationId: string,
): Promise<Conversa | null> {
  try {
    const result = await pool.query(
      `SELECT assigned_to, snoozed_until FROM wa_conversations
        WHERE id = $1 AND organization_id = $2`,
      [conversationId, organizationId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      assignedTo: row.assigned_to ?? null,
      snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until) : null,
    };
  } catch (error) {
    console.error("[InboxPush] falha ao carregar a conversa:", error);
    return null;
  }
}

/**
 * Na ausência de preferência gravada o padrão é notificar: uma conversa de
 * paciente sem resposta é pior que uma notificação a mais, e o usuário pode
 * desligar. `therapist_messages` é a coluna que a tabela realmente tem.
 */
async function querReceber(pool: Pool, userId: string, now: Date): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT therapist_messages, quiet_hours_start, quiet_hours_end
         FROM notification_preferences WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const prefs = result.rows[0];
    if (!prefs) return true;
    if (prefs.therapist_messages === false) return false;
    if (dentroDoSilencio(now, prefs.quiet_hours_start, prefs.quiet_hours_end)) return false;
    return true;
  } catch {
    return true;
  }
}

export async function notifyInboxMessage(
  env: Env,
  pool: Pool,
  input: InboxPushInput,
): Promise<{ notified: "user" | "organization" | "none"; userId?: string; reason?: string }> {
  const now = input.now ?? new Date();

  const payload: PushPayload = {
    title: input.contactName || "Nova mensagem",
    body: buildPreview(input.messageType, input.preview),
    channelId: "messages",
    data: {
      type: "whatsapp_inbox",
      conversationId: input.conversationId,
      // O app usa isto para abrir a conversa direto, em vez do inbox.
      route: `/whatsapp-chat/${input.conversationId}`,
    },
  };

  const conversa = await carregarConversa(pool, input.organizationId, input.conversationId);

  // Adiada de propósito pelo profissional: não trazer de volta antes da hora.
  if (conversa?.snoozedUntil && conversa.snoozedUntil.getTime() > now.getTime()) {
    return { notified: "none", reason: "snoozed" };
  }

  if (conversa?.assignedTo) {
    if (!(await querReceber(pool, conversa.assignedTo, now))) {
      return { notified: "none", reason: "preferencia" };
    }
    await notifyUser(env, pool, conversa.assignedTo, payload);
    return { notified: "user", userId: conversa.assignedTo };
  }

  await notifyOrganization(env, pool, input.organizationId, payload);
  return { notified: "organization" };
}
