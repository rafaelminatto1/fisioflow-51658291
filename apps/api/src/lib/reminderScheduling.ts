/**
 * Agendamento de lembretes de sessão — lógica pura e testável.
 *
 * Regra (configurável por organização em organizations.settings.crm_whatsapp.reminders):
 *  - Padrão: enviar `defaultHoursBefore` (5h) antes do horário da sessão.
 *  - Exceções por faixa de horário da sessão (evitam disparo de madrugada):
 *      • sessão 07h–08h  → enviar às 19h do dia anterior
 *      • sessão 09h–10h  → enviar às 07h do mesmo dia
 *      • sessão 11h–12h  → enviar às 08h do mesmo dia
 *  - Demais horários seguem a regra das 5h.
 *
 * Horários são tratados no fuso da clínica (America/Sao_Paulo = UTC-3, sem DST desde 2019),
 * configurável via `tzOffsetMinutes`.
 */

export interface ReminderBand {
  /** Faixa de horário da SESSÃO (hora local, inclusive). */
  fromHour: number;
  toHour: number;
  /** Quando ENVIAR: deslocamento de dias (0 = mesmo dia, -1 = véspera) + hora/min locais. */
  sendDayOffset: number;
  sendHour: number;
  sendMinute: number;
}

export interface ReminderConfig {
  enabled: boolean;
  defaultHoursBefore: number;
  tzOffsetMinutes: number;
  bands: ReminderBand[];
  sendAddressOnlyFirstVisit: boolean;
  addressText: string;
  // #3 — usar template com botões Confirmar/Remarcar (requer `lembrete_consulta_botoes` aprovado).
  useButtons: boolean;
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  defaultHoursBefore: 5,
  tzOffsetMinutes: -180, // America/Sao_Paulo
  bands: [
    { fromHour: 7, toHour: 8, sendDayOffset: -1, sendHour: 19, sendMinute: 0 },
    { fromHour: 9, toHour: 10, sendDayOffset: 0, sendHour: 7, sendMinute: 0 },
    { fromHour: 11, toHour: 12, sendDayOffset: 0, sendHour: 8, sendMinute: 0 },
  ],
  sendAddressOnlyFirstVisit: true,
  addressText: "",
  useButtons: false,
};

/** Mescla config persistida sobre os defaults (tolerante a campos ausentes). */
export function resolveReminderConfig(raw: unknown): ReminderConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_REMINDER_CONFIG };
  const r = raw as Partial<ReminderConfig>;
  return {
    enabled: r.enabled !== false,
    defaultHoursBefore:
      typeof r.defaultHoursBefore === "number" && r.defaultHoursBefore > 0
        ? r.defaultHoursBefore
        : DEFAULT_REMINDER_CONFIG.defaultHoursBefore,
    tzOffsetMinutes:
      typeof r.tzOffsetMinutes === "number" ? r.tzOffsetMinutes : DEFAULT_REMINDER_CONFIG.tzOffsetMinutes,
    bands:
      Array.isArray(r.bands) && r.bands.length > 0
        ? r.bands.map((b) => ({
            fromHour: Number(b.fromHour),
            toHour: Number(b.toHour),
            sendDayOffset: Number(b.sendDayOffset),
            sendHour: Number(b.sendHour),
            sendMinute: Number(b.sendMinute) || 0,
          }))
        : DEFAULT_REMINDER_CONFIG.bands,
    sendAddressOnlyFirstVisit: r.sendAddressOnlyFirstVisit !== false,
    addressText: typeof r.addressText === "string" ? r.addressText : "",
    useButtons: r.useButtons === true,
  };
}

function shiftDateStr(dateStr: string, days: number): string {
  const ms = Date.parse(`${dateStr}T00:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Converte um horário de parede local (no fuso da clínica) para o instante UTC correspondente. */
function localToUtcMs(dateStr: string, hour: number, minute: number, tzOffsetMinutes: number): number {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  // Ex.: local 08:00 em UTC-3 ⇒ UTC 11:00 ⇒ parse("08:00Z") - (-180)*60000
  return Date.parse(`${dateStr}T${hh}:${mm}:00Z`) - tzOffsetMinutes * 60_000;
}

/**
 * Calcula o instante (UTC) em que o lembrete deve ser enviado.
 * @param apptDateStr data da sessão "YYYY-MM-DD" (local)
 * @param apptTimeStr horário da sessão "HH:MM" (local)
 */
export function computeReminderSendAt(
  apptDateStr: string,
  apptTimeStr: string,
  config: ReminderConfig,
): Date {
  const apptHour = Number(apptTimeStr.slice(0, 2));
  const apptMinute = Number(apptTimeStr.slice(3, 5)) || 0;

  const band = config.bands.find((b) => apptHour >= b.fromHour && apptHour <= b.toHour);
  if (band) {
    const dateStr = shiftDateStr(apptDateStr, band.sendDayOffset);
    return new Date(localToUtcMs(dateStr, band.sendHour, band.sendMinute, config.tzOffsetMinutes));
  }

  const apptUtcMs = localToUtcMs(apptDateStr, apptHour, apptMinute, config.tzOffsetMinutes);
  return new Date(apptUtcMs - config.defaultHoursBefore * 3_600_000);
}
