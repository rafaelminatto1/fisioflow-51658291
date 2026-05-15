import type { Env } from "../types/env";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function isExpoPushToken(token: string): boolean {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendExpoPushBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  const resp = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!resp.ok) {
    console.error(`[Push] Expo API error: ${resp.status} ${await resp.text()}`);
    return messages.map(() => ({ status: "error" as const, message: `HTTP ${resp.status}` }));
  }

  const json = (await resp.json()) as { data: ExpoPushTicket[] };
  return json.data ?? [];
}

export async function sendPushBatch(_env: Env, tokens: string[], payload: PushPayload) {
  if (!tokens || tokens.length === 0) return [];

  const expoTokens = tokens.filter(isExpoPushToken);

  if (expoTokens.length === 0) {
    console.log(`[Push] No Expo tokens among ${tokens.length} provided`);
    return [];
  }

  const CHUNK = 100;
  const results: ExpoPushTicket[] = [];

  for (let i = 0; i < expoTokens.length; i += CHUNK) {
    const chunk = expoTokens.slice(i, i + CHUNK);
    const messages: ExpoPushMessage[] = chunk.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound ?? "default",
      badge: payload.badge,
      channelId: payload.channelId ?? "default",
      priority: "high",
    }));

    try {
      const tickets = await sendExpoPushBatch(messages);
      results.push(...tickets);
      const errors = tickets.filter((t) => t.status === "error");
      if (errors.length > 0) {
        console.warn(`[Push] ${errors.length}/${tickets.length} tickets with errors:`, errors);
      }
    } catch (err) {
      console.error("[Push] sendExpoPushBatch error:", err);
    }
  }

  return results;
}

export async function notifyOrganization(
  env: Env,
  pool: any,
  organizationId: string,
  payload: PushPayload,
) {
  try {
    const result = await pool.query(
      `SELECT token FROM fcm_tokens WHERE tenant_id = $1 AND active = true`,
      [organizationId],
    );
    const tokens = (result.rows || []).map((r: any) => r.token as string);
    if (tokens.length > 0) return sendPushBatch(env, tokens, payload);
  } catch (error) {
    console.error("[NotifyOrg] Error fetching tokens:", error);
  }
}

export async function notifyUser(env: Env, pool: any, userId: string, payload: PushPayload) {
  try {
    const result = await pool.query(
      `SELECT token FROM fcm_tokens WHERE user_id = $1 AND active = true`,
      [userId],
    );
    const tokens = (result.rows || []).map((r: any) => r.token as string);
    if (tokens.length > 0) return sendPushBatch(env, tokens, payload);
  } catch (error) {
    console.error("[NotifyUser] Error fetching tokens:", error);
  }
}

export async function notifyPatientAppointment(
  env: Env,
  pool: any,
  patientId: string,
  opts: {
    appointmentId: string;
    datetime: string;
    therapistName?: string;
    type: "reminder_48h" | "reminder_2h" | "confirmed" | "cancelled";
  },
) {
  const labels: Record<typeof opts.type, { title: string; body: string }> = {
    reminder_48h: {
      title: "Lembrete de Sessão",
      body: `Você tem uma sessão${opts.therapistName ? ` com ${opts.therapistName}` : ""} em ${opts.datetime}. Confirme sua presença!`,
    },
    reminder_2h: {
      title: "Sessão em 2 horas",
      body: `Sua sessão${opts.therapistName ? ` com ${opts.therapistName}` : ""} começa em 2 horas.`,
    },
    confirmed: {
      title: "Sessão Confirmada ✅",
      body: `Sua sessão de ${opts.datetime} foi confirmada.`,
    },
    cancelled: {
      title: "Sessão Cancelada",
      body: `Sua sessão de ${opts.datetime} foi cancelada. Entre em contato para reagendar.`,
    },
  };

  const label = labels[opts.type];
  return notifyUser(env, pool, patientId, {
    title: label.title,
    body: label.body,
    data: { type: "appointment", appointmentId: opts.appointmentId },
    channelId: "appointments",
  });
}

export async function notifyHEPMilestone(
  env: Env,
  pool: any,
  patientId: string,
  opts: { exerciseName: string; streakDays?: number },
) {
  const body = opts.streakDays
    ? `Incrível! ${opts.streakDays} dias consecutivos fazendo seus exercícios! 🔥`
    : `Parabéns por completar: ${opts.exerciseName}! Continue assim! 💪`;

  return notifyUser(env, pool, patientId, {
    title: "Meta Alcançada! 🏆",
    body,
    data: { type: "hep_milestone" },
    channelId: "reminders",
  });
}
