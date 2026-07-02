import { Env } from "../types/env";
import { runAi, readAiText } from "../lib/ai-native";
import { WORKERS_AI_MODELS } from "../lib/workersAi";
import { createPool } from "../lib/db";

export type ConciergeHistoryItem = { role: "user" | "assistant"; content: string };
type ConciergeAvailabilityScope = "organization" | "public_profile";
type ConciergeSettings = {
  availabilityAutoReply: boolean;
  availabilityScope: ConciergeAvailabilityScope;
  availabilityProfileSlug: string;
};
type AvailabilityPeriod = "manha" | "tarde" | "noite" | null;
type AvailabilityTimeWindow = {
  minHour?: number;
  maxHour?: number;
  labelSuffix?: string;
};
type AvailabilityRequest = {
  dates: string[];
  label: string;
  period: AvailabilityPeriod;
  timeWindow?: AvailabilityTimeWindow | null;
};
type BookedSlotRow = { slot: string; booked_count?: number };
type TherapistRow = { id: string };

/** Assinatura estável da apresentação (independe da saudação por horário). */
const GREETING_SIGNATURE = "Sou o Rafael da Activity Fisioterapia";
const DEFAULT_CONCIERGE_SETTINGS: ConciergeSettings = {
  availabilityAutoReply: false,
  availabilityScope: "organization",
  availabilityProfileSlug: "",
};
const WEEKDAY_PATTERNS = [
  { index: 1, pattern: /segunda(?:-feira)?/i, label: "segunda" },
  { index: 2, pattern: /ter[cç]a(?:-feira)?/i, label: "terça" },
  { index: 3, pattern: /quarta(?:-feira)?/i, label: "quarta" },
  { index: 4, pattern: /quinta(?:-feira)?/i, label: "quinta" },
  { index: 5, pattern: /sexta(?:-feira)?/i, label: "sexta" },
  { index: 6, pattern: /s[áa]bado/i, label: "sábado" },
  { index: 0, pattern: /domingo/i, label: "domingo" },
] as const;
const WEEKDAY_NAME_BY_INDEX = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MONTH_PATTERNS = [
  { month: 1, pattern: /janeiro/i },
  { month: 2, pattern: /fevereiro/i },
  { month: 3, pattern: /mar[cç]o/i },
  { month: 4, pattern: /abril/i },
  { month: 5, pattern: /maio/i },
  { month: 6, pattern: /junho/i },
  { month: 7, pattern: /julho/i },
  { month: 8, pattern: /agosto/i },
  { month: 9, pattern: /setembro/i },
  { month: 10, pattern: /outubro/i },
  { month: 11, pattern: /novembro/i },
  { month: 12, pattern: /dezembro/i },
] as const;

function parseHourWindow(message: string): AvailabilityTimeWindow | null {
  const hasExplicitMorning = /(^|[\s,.-])manh[ãa]([?.!,\s]|$)/i.test(message);

  if (/logo cedo|cedinho|\bcedo\b/i.test(message)) {
    return { minHour: 7, maxHour: 10, labelSuffix: " cedo" };
  }

  if (/logo depois do almo[cç]o|depois do almo[cç]o/i.test(message)) {
    return { minHour: 13, maxHour: 15, labelSuffix: " logo depois do almoço" };
  }

  const between = message.match(/entre\s+(\d{1,2})\s*h?(?:oras?)?\s*e\s+(\d{1,2})\s*h?/i);
  if (between) {
    const start = Number(between[1]);
    const end = Number(between[2]);
    if (start >= 0 && start <= 23 && end >= 0 && end <= 23 && start <= end) {
      return { minHour: start, maxHour: end + 1, labelSuffix: ` entre ${start}h e ${end}h` };
    }
  }

  const after = message.match(/depois\s+das?\s+(\d{1,2})\s*h?/i);
  if (after) {
    let hour = Number(after[1]);
    if (hour >= 1 && hour <= 7 && !hasExplicitMorning && !/\bnoite\b|\btarde\b/i.test(message)) {
      hour += 12;
    }
    if (hour >= 0 && hour <= 23) {
      return { minHour: hour, labelSuffix: ` depois das ${hour}h` };
    }
  }

  const before = message.match(/antes\s+das?\s+(\d{1,2})\s*h?/i);
  if (before) {
    const hour = Number(before[1]);
    if (hour >= 0 && hour <= 23) {
      return { maxHour: hour, labelSuffix: ` antes das ${hour}h` };
    }
  }

  return null;
}

/** True se a resposta é a apresentação/saudação padrão do concierge. */
export function isGreetingReply(reply: string): boolean {
  return typeof reply === "string" && reply.includes(GREETING_SIGNATURE);
}

/**
 * Decide se devemos PULAR o envio de uma saudação para não repetir a
 * apresentação a cada mensagem: pula só quando a resposta é uma saudação E o
 * assistente já saudou antes nesta conversa.
 */
export function shouldSkipGreeting(reply: string, history: ConciergeHistoryItem[]): boolean {
  if (!isGreetingReply(reply)) return false;
  return history.some((h) => h.role === "assistant" && isGreetingReply(h.content));
}

/**
 * Remove a frase/linha da apresentação de uma saudação, mantendo o resto
 * ("Boa noite, tudo bem? Como posso ajudar?"). Usado quando já saudamos nesta
 * conversa: respondemos a saudação de volta sem nos reapresentar (não ficamos
 * mudos). Fallback quando a resposta era só a apresentação.
 */
export function stripGreetingIntro(reply: string): string {
  if (!isGreetingReply(reply)) return reply;
  const stripped = reply
    .replace(new RegExp(`[^.!?\\n]*${GREETING_SIGNATURE}[^.!?\\n]*[.!?]?`, "g"), "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return stripped || "Como posso ajudar?";
}

/**
 * Converte linhas de wa_messages em histórico p/ o LLM: inbound→user,
 * outbound→assistant. Ignora mensagens internas e sem conteúdo de texto.
 */
export function buildConciergeHistory(
  rows: Array<{ direction?: string; content?: string }>,
): ConciergeHistoryItem[] {
  const out: ConciergeHistoryItem[] = [];
  for (const row of rows) {
    const content = (row.content ?? "").trim();
    if (!content) continue;
    if (row.direction === "inbound") out.push({ role: "user", content });
    else if (row.direction === "outbound") out.push({ role: "assistant", content });
  }
  return out;
}

function isAvailabilityQuestion(message: string): boolean {
  return /(hor[aá]ri|dispon[ií]v|agenda|vaga|tem (algo|algum|alguma))/i.test(message);
}

function detectAvailabilityPeriod(message: string): AvailabilityPeriod {
  if (/(^|[\s,.-])manh[ãa]([?.!,\s]|$)/i.test(message)) return "manha";
  if (/\btarde\b/i.test(message)) return "tarde";
  if (/\bnoite\b/i.test(message)) return "noite";
  return null;
}

function getBrtTodayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return new Date().toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

function addDaysIso(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseExplicitDate(message: string, todayIso: string): AvailabilityRequest | null {
  const match = message.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const explicitYear = match[3] ? Number(match[3].length === 2 ? `20${match[3]}` : match[3]) : null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const [todayYear] = todayIso.split("-").map(Number);
  let year = explicitYear ?? todayYear;
  let dateIso = isoFromParts(year, month, day);
  const parsed = new Date(`${dateIso}T12:00:00Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCMonth() + 1 !== month
  ) {
    return null;
  }

  if (!explicitYear && dateIso < todayIso) {
    year += 1;
    dateIso = isoFromParts(year, month, day);
  }

  return {
    dates: [dateIso],
    label: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseRelativeDaysRequest(message: string, todayIso: string): AvailabilityRequest | null {
  const match = message.match(/daqui\s+a?\s*(\d{1,3})\s+dias?/i);
  if (!match) return null;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days < 0) return null;
  return {
    dates: [addDaysIso(todayIso, days)],
    label: `daqui a ${days} dias`,
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseRelativeWeeksRequest(message: string, todayIso: string): AvailabilityRequest | null {
  const numericMatch = message.match(/daqui\s+a?\s*(\d{1,2})\s+semanas?/i);
  if (numericMatch) {
    const weeks = Number(numericMatch[1]);
    if (!Number.isFinite(weeks) || weeks < 1) return null;
    return {
      dates: [addDaysIso(todayIso, weeks * 7)],
      label: `daqui a ${weeks} semanas`,
      period: detectAvailabilityPeriod(message),
      timeWindow: parseHourWindow(message),
    };
  }

  const wordMatch = message.match(/daqui\s+(uma|duas)\s+semanas?/i);
  if (wordMatch) {
    const weeks = wordMatch[1].toLowerCase() === "duas" ? 2 : 1;
    return {
      dates: [addDaysIso(todayIso, weeks * 7)],
      label: `daqui a ${weeks} semanas`,
      period: detectAvailabilityPeriod(message),
      timeWindow: parseHourWindow(message),
    };
  }

  return null;
}

function parseFortnightRequest(message: string, todayIso: string): AvailabilityRequest | null {
  if (!/quinzena/i.test(message)) return null;
  return {
    dates: [addDaysIso(todayIso, 14)],
    label: "na próxima quinzena",
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseNextMonthRequest(message: string, todayIso: string): AvailabilityRequest | null {
  if (!/pr[oó]ximo m[eê]s|fim do m[eê]s|final do m[eê]s|mais pro fim do m[eê]s|come[cç]o do m[eê]s|in[ií]cio do m[eê]s|meio do m[eê]s/i.test(message)) return null;
  const [year, month] = todayIso.split("-").map(Number);
  const explicitNextMonth = /pr[oó]ximo m[eê]s/i.test(message);
  const targetMonth = explicitNextMonth ? (month === 12 ? 1 : month + 1) : month;
  const targetYear = explicitNextMonth ? (month === 12 ? year + 1 : year) : year;
  const label = explicitNextMonth
    ? "no próximo mês"
    : /fim do m[eê]s|final do m[eê]s|mais pro fim do m[eê]s/i.test(message)
      ? "no fim do mês"
      : /meio do m[eê]s/i.test(message)
        ? "no meio do mês"
        : "no começo do mês";
  const dates =
    label === "no fim do mês"
      ? [25, 26, 27, 28].map((day) => isoFromParts(targetYear, targetMonth, day))
      : label === "no meio do mês"
        ? [14, 15, 16].map((day) => isoFromParts(targetYear, targetMonth, day))
        : label === "no começo do mês"
          ? [1, 2, 3].map((day) => isoFromParts(targetYear, targetMonth, day))
          : [isoFromParts(targetYear, targetMonth, 1)];
  return {
    dates,
    label,
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseMonthNameRequest(message: string, todayIso: string): AvailabilityRequest | null {
  for (const item of MONTH_PATTERNS) {
    if (item.pattern.test(message)) {
      const dayMatch = message.match(/\b(\d{1,2})\s+de\s+[a-zç]+\b/i);
      const monthSection = /fim de|final de|mais pro fim de/i.test(message)
        ? "fim"
        : /come[cç]o de|in[ií]cio de/i.test(message)
          ? "inicio"
          : /meio de/i.test(message)
            ? "meio"
            : "dia";
      const requestedDay = dayMatch
        ? Number(dayMatch[1])
        : monthSection === "fim"
          ? 25
          : monthSection === "meio"
            ? 15
            : 1;
      const [currentYear, currentMonth] = todayIso.split("-").map(Number);
      let year = currentYear;
      if (item.month < currentMonth || (item.month === currentMonth && requestedDay < Number(todayIso.slice(8, 10)))) {
        year += 1;
      }
      const dateIso = isoFromParts(year, item.month, requestedDay);
      const parsed = new Date(`${dateIso}T12:00:00Z`);
      if (
        Number.isNaN(parsed.getTime()) ||
        parsed.getUTCDate() !== requestedDay ||
        parsed.getUTCMonth() + 1 !== item.month
      ) {
        return null;
      }
      const dates =
        monthSection === "fim"
          ? [25, 26, 27, 28].map((day) => isoFromParts(year, item.month, day))
          : monthSection === "meio"
            ? [14, 15, 16].map((day) => isoFromParts(year, item.month, day))
            : monthSection === "inicio"
              ? [1, 2, 3].map((day) => isoFromParts(year, item.month, day))
              : [dateIso];
      const monthLabel = message.match(item.pattern)?.[0] ?? "mês solicitado";
      return {
        dates,
        label: dayMatch
          ? `${String(requestedDay).padStart(2, "0")} de ${monthLabel}`
          : monthSection === "fim"
            ? `no fim de ${monthLabel}`
            : monthSection === "meio"
              ? `no meio de ${monthLabel}`
              : monthSection === "inicio"
                ? `no começo de ${monthLabel}`
                : monthLabel,
        period: detectAvailabilityPeriod(message),
        timeWindow: parseHourWindow(message),
      };
    }
  }
  return null;
}

function nextWeekdayIso(todayIso: string, targetWeekday: number, forceNextWeek: boolean): string {
  const base = new Date(`${todayIso}T12:00:00Z`);
  const currentWeekday = base.getUTCDay();
  let delta = (targetWeekday - currentWeekday + 7) % 7;
  if (delta === 0 || forceNextWeek) delta += 7;
  return addDaysIso(todayIso, delta);
}

function parseWeekdayRequest(message: string, todayIso: string): AvailabilityRequest | null {
  const nextWeek = /pr[oó]xim[ao]|semana que vem|que vem|outra semana/i.test(message);
  for (const weekday of WEEKDAY_PATTERNS) {
    if (weekday.pattern.test(message)) {
      return {
        dates: [nextWeekdayIso(todayIso, weekday.index, nextWeek)],
        label: nextWeek ? `${weekday.label} que vem` : weekday.label,
        period: detectAvailabilityPeriod(message),
        timeWindow: parseHourWindow(message),
      };
    }
  }
  return null;
}

function parseWeekdayRangeRequest(message: string, todayIso: string): AvailabilityRequest | null {
  const rangeMatch = message.match(
    /entre\s+(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)\s+e\s+(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)/i,
  );
  if (!rangeMatch) return null;

  const first = WEEKDAY_PATTERNS.find((weekday) => weekday.pattern.test(rangeMatch[1]));
  const second = WEEKDAY_PATTERNS.find((weekday) => weekday.pattern.test(rangeMatch[2]));
  if (!first || !second) return null;

  const nextWeek = /pr[oó]xim[ao]|semana que vem|que vem|outra semana/i.test(message);
  const startDate = nextWeekdayIso(todayIso, first.index, nextWeek);
  let delta = (second.index - first.index + 7) % 7;
  if (delta === 0) delta = 7;
  const dates = Array.from({ length: delta + 1 }, (_, index) => addDaysIso(startDate, index));
  return {
    dates,
    label: `entre ${WEEKDAY_NAME_BY_INDEX[first.index]} e ${WEEKDAY_NAME_BY_INDEX[second.index]}`,
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseWeekdayChoiceRequest(message: string, todayIso: string): AvailabilityRequest | null {
  const choiceMatch = message.match(
    /(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)\s+ou\s+(segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)/i,
  );
  if (!choiceMatch) return null;

  const first = WEEKDAY_PATTERNS.find((weekday) => weekday.pattern.test(choiceMatch[1]));
  const second = WEEKDAY_PATTERNS.find((weekday) => weekday.pattern.test(choiceMatch[2]));
  if (!first || !second) return null;

  const nextWeek = /pr[oó]xim[ao]|semana que vem|que vem|outra semana/i.test(message);
  return {
    dates: [
      nextWeekdayIso(todayIso, first.index, nextWeek),
      nextWeekdayIso(todayIso, second.index, nextWeek),
    ],
    label: nextWeek
      ? `${WEEKDAY_NAME_BY_INDEX[first.index]} ou ${WEEKDAY_NAME_BY_INDEX[second.index]} que vem`
      : `${WEEKDAY_NAME_BY_INDEX[first.index]} ou ${WEEKDAY_NAME_BY_INDEX[second.index]}`,
    period: detectAvailabilityPeriod(message),
    timeWindow: parseHourWindow(message),
  };
}

function parseAvailabilityRequest(message: string): AvailabilityRequest | null {
  if (!isAvailabilityQuestion(message)) return null;

  const todayIso = getBrtTodayIso();
  const nextMonth = parseNextMonthRequest(message, todayIso);
  if (nextMonth) return nextMonth;
  const monthName = parseMonthNameRequest(message, todayIso);
  if (monthName) return monthName;
  const relativeWeeks = parseRelativeWeeksRequest(message, todayIso);
  if (relativeWeeks) return relativeWeeks;
  const fortnight = parseFortnightRequest(message, todayIso);
  if (fortnight) return fortnight;
  const relativeDays = parseRelativeDaysRequest(message, todayIso);
  if (relativeDays) return relativeDays;
  const explicitDate = parseExplicitDate(message, todayIso);
  if (explicitDate) return explicitDate;

  if (/amanh[ãa]/i.test(message)) {
    return {
      dates: [addDaysIso(todayIso, 1)],
      label: "amanhã",
      period: detectAvailabilityPeriod(message),
      timeWindow: parseHourWindow(message),
    };
  }
  if (/\bhoje\b/i.test(message)) {
    return {
      dates: [todayIso],
      label: "hoje",
      period: detectAvailabilityPeriod(message),
      timeWindow: parseHourWindow(message),
    };
  }

  const weekdayRange = parseWeekdayRangeRequest(message, todayIso);
  if (weekdayRange) return weekdayRange;
  const weekdayChoice = parseWeekdayChoiceRequest(message, todayIso);
  if (weekdayChoice) return weekdayChoice;
  const weekdayRequest = parseWeekdayRequest(message, todayIso);
  if (weekdayRequest) return weekdayRequest;

  return null;
}

function clinicHoursForDate(dateIso: string): { startHour: number; endHour: number } | null {
  const weekday = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  if (weekday === 0) return null;
  if (weekday === 6) return { startHour: 7, endHour: 13 };
  return { startHour: 7, endHour: 21 };
}

function buildDaySlots(dateIso: string): string[] {
  const hours = clinicHoursForDate(dateIso);
  if (!hours) return [];
  const slots: string[] = [];
  for (let hour = hours.startHour; hour < hours.endHour; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
    slots.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return slots;
}

function filterSlotsByTiming(
  slots: string[],
  period: AvailabilityPeriod,
  timeWindow?: AvailabilityTimeWindow | null,
): string[] {
  let filtered = slots;
  if (period) {
    filtered = filtered.filter((slot) => {
      const hour = Number(slot.slice(0, 2));
      if (period === "manha") return hour < 12;
      if (period === "tarde") return hour >= 12 && hour < 18;
      return hour >= 18;
    });
  }

  if (!timeWindow) return filtered;
  return filtered.filter((slot) => {
    const hour = Number(slot.slice(0, 2));
    if (timeWindow.minHour != null && hour < timeWindow.minHour) return false;
    if (timeWindow.maxHour != null && hour >= timeWindow.maxHour) return false;
    return true;
  });
}

function periodLabel(period: AvailabilityPeriod): string {
  if (period === "manha") return " de manhã";
  if (period === "tarde") return " à tarde";
  if (period === "noite") return " à noite";
  return "";
}

function timeWindowLabel(timeWindow?: AvailabilityTimeWindow | null): string {
  return timeWindow?.labelSuffix ?? "";
}

function formatDateShort(dateIso: string): string {
  const [year, month, day] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

async function loadConciergeSettings(
  env: Env,
  orgId: string,
): Promise<ConciergeSettings> {
  try {
    const pool = createPool(env);
    const result = await pool.query(
      `SELECT settings->'crm_whatsapp'->'concierge' AS concierge
       FROM organizations
       WHERE id = $1
       LIMIT 1`,
      [orgId],
    );
    const raw = (result.rows[0]?.concierge ?? {}) as Record<string, unknown>;
    return {
      availabilityAutoReply: raw.availabilityAutoReply === true,
      availabilityScope: raw.availabilityScope === "public_profile" ? "public_profile" : "organization",
      availabilityProfileSlug:
        typeof raw.availabilityProfileSlug === "string" ? raw.availabilityProfileSlug.trim() : "",
    };
  } catch (error) {
    console.warn("[AI Concierge] failed to load concierge settings:", error);
    return DEFAULT_CONCIERGE_SETTINGS;
  }
}

async function queryOrganizationAvailability(
  env: Env,
  orgId: string,
  date: string,
): Promise<string[]> {
  const pool = createPool(env);
  const therapistResult = await pool.query<TherapistRow>(
    `SELECT id
     FROM profiles
     WHERE organization_id = $1
       AND (role = 'fisioterapeuta' OR ('fisioterapeuta' = ANY(roles) AND roles IS NOT NULL))
       AND (is_active IS NULL OR is_active = true)`,
    [orgId],
  );
  const therapistCount = Math.max(therapistResult.rows.length, 1);

  const bookedResult = await pool.query<BookedSlotRow>(
    `SELECT LEFT(start_time::text, 5) AS slot, COUNT(*)::int AS booked_count
     FROM appointments
     WHERE organization_id = $1
       AND date = $2
       AND COALESCE(status::text, 'agendado') NOT IN (
         'cancelado', 'faltou', 'faltou_com_aviso', 'faltou_sem_aviso',
         'nao_atendido', 'nao_atendido_sem_cobranca', 'remarcar'
       )
       AND deleted_at IS NULL
     GROUP BY LEFT(start_time::text, 5)`,
    [orgId, date],
  );

  const bookedMap = new Map(bookedResult.rows.map((row) => [row.slot, Number(row.booked_count ?? 0)]));
  return buildDaySlots(date).filter((slot) => (bookedMap.get(slot) ?? 0) < therapistCount);
}

async function queryPublicProfileAvailability(
  env: Env,
  slug: string,
  date: string,
): Promise<string[] | null> {
  if (!slug) return null;
  const pool = createPool(env);
  const profileResult = await pool.query<TherapistRow>(
    `SELECT id
     FROM profiles
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  const therapistId = profileResult.rows[0]?.id;
  if (!therapistId) return null;

  const bookedResult = await pool.query<{ slot: string }>(
    `SELECT LEFT(start_time::text, 5) AS slot
     FROM appointments
     WHERE therapist_id = $1
       AND date = $2
       AND COALESCE(status::text, 'agendado') NOT IN ('cancelado', 'faltou', 'remarcar')
       AND deleted_at IS NULL`,
    [therapistId, date],
  );
  const bookedSlots = new Set(bookedResult.rows.map((row) => row.slot));
  return buildDaySlots(date).filter((slot) => !bookedSlots.has(slot));
}

function buildAvailabilityReply(
  request: AvailabilityRequest,
  slotsByDate: Array<{ date: string; slots: string[] }>,
): ConciergeResponse {
  const nonEmpty = slotsByDate
    .map((item) => ({ ...item, slots: item.slots.slice(0, 8) }))
    .filter((item) => item.slots.length > 0);

  if (nonEmpty.length === 0) {
    return {
      reply: `Para ${request.label}${periodLabel(request.period)}${timeWindowLabel(request.timeWindow)} não temos horários livres no momento.`,
      intent: "scheduling",
      answerable: true,
    };
  }

  if (nonEmpty.length === 1) {
    const limited = nonEmpty[0].slots;
    return {
      reply: `Para ${request.label}${periodLabel(request.period)}${timeWindowLabel(request.timeWindow)} temos estes horários disponíveis: ${limited.join(", ")}.`,
      intent: "scheduling",
      answerable: true,
    };
  }

  const parts = nonEmpty
    .slice(0, 4)
    .map((item) => `${formatDateShort(item.date)}: ${item.slots.join(", ")}`)
    .join(" | ");
  return {
    reply: `Para ${request.label}${periodLabel(request.period)}${timeWindowLabel(request.timeWindow)} temos disponibilidade nestes dias: ${parts}.`,
    intent: "scheduling",
    answerable: true,
  };
}

async function maybeAnswerAvailability(
  env: Env,
  orgId: string,
  message: string,
): Promise<ConciergeResponse | null> {
  const request = parseAvailabilityRequest(message);
  if (!request) return null;

  const settings = await loadConciergeSettings(env, orgId);
  if (!settings.availabilityAutoReply) return null;

  try {
    const uniqueDates = [...new Set(request.dates)].slice(0, 7);
    const slotsByDate = await Promise.all(
      uniqueDates.map(async (date) => {
        const allSlots =
          settings.availabilityScope === "public_profile"
            ? await queryPublicProfileAvailability(env, settings.availabilityProfileSlug, date)
            : await queryOrganizationAvailability(env, orgId, date);
        return { date, slots: allSlots ?? [] };
      }),
    );

    if (slotsByDate.some((item) => item.slots == null)) {
      return { reply: "", intent: "scheduling", answerable: false };
    }
    const filtered = slotsByDate.map((item) => ({
      date: item.date,
      slots: filterSlotsByTiming(item.slots, request.period, request.timeWindow),
    }));
    return buildAvailabilityReply(request, filtered);
  } catch (error) {
    console.error("[AI Concierge] availability lookup failed:", error);
    return { reply: "", intent: "scheduling", answerable: false };
  }
}

export interface ConciergeResponse {
  reply: string;
  intent: "scheduling" | "information" | "urgent" | "other";
  /**
   * true apenas quando a resposta está 100% coberta pelas informações oficiais
   * da clínica. Quando false, NÃO se deve enviar nada automaticamente — um
   * humano assume (evita respostas inventadas).
   */
  answerable: boolean;
  patientData?: {
    name?: string;
    condition?: string;
    insurance?: string;
  };
}

/**
 * Base de conhecimento OFICIAL da clínica — única fonte de verdade.
 * O modelo só pode responder com o que está aqui; qualquer pergunta fora disto
 * deve cair em answerable=false (humano responde). Não inventar nada.
 */
const CLINIC_KB = `
Activity Fisioterapia — informações oficiais:
- Clínica PARTICULAR de fisioterapia. NÃO aceita convênios. Para o reembolso pelo convênio, fornecemos nota fiscal e relatório.
- Endereço: Rua Manuel Vieira de Sousa, 166 — Mooca, São Paulo/SP, CEP 03124-110 (próximo ao Clube Juventus da Mooca). Localização no mapa: https://maps.app.goo.gl/m6ckoNd8m97z4Nyq5
- Contato: WhatsApp (11) 93433-5858; telefone (11) 5874-9885; e-mail contato@activityfisioterapia.com.br.
- Estrutura: há vaga de estacionamento em frente à clínica; calçada rebaixada (acessível para cadeirantes).
- Especialidades: fisioterapia esportiva, ortopédica, gerontológica (atendimento a idosos) e reabilitação pré e pós-operatória.
- Atendimento 100% individualizado, sessões de 60 minutos, com equipamentos de alta tecnologia.
- Tratamentos e técnicas: Laser Terapia, Ultrassom, Liberação Miofascial, Eletroestimulação, Crioterapia, RPG (Reeducação Postural Global), Dry Needling (agulhamento a seco), Recovery Esportivo e Recovery Pump (botas pneumáticas de compressão), entre outros.
- Horário de funcionamento: segunda a sexta das 07h às 21h; sábado das 07h às 13h. Não atende aos domingos.
- Valores: avaliação R$ 180,00; sessão avulsa R$ 180,00; pacote de 10 sessões por R$ 170,00 cada sessão.
- Formas de pagamento: transferência, pix, cartão de débito ou crédito em até 6x.
- Para iniciar o tratamento é necessário agendar uma avaliação. A avaliação dura cerca de 1 hora e inclui anamnese, testes físicos e a definição do plano de tratamento.
- Orientações para o atendimento: em caso de atraso ou necessidade de remarcar o horário, avisar com no mínimo 3 horas de antecedência. Venha com roupas leves e de fácil acesso (recomendamos às mulheres shorts e top de academia); há espaço para se trocar na clínica.
- Atendente: Rafael, da Activity Fisioterapia.
`.trim();

/**
 * AI Concierge Service — triagem 24/7 (WhatsApp + Instagram).
 * Aterrado SOMENTE nas informações oficiais da clínica; nunca inventa dados.
 */
export class AIConciergeService {
  static async processMessage(
    env: Env,
    orgId: string,
    message: string,
    history: any[] = [],
  ): Promise<ConciergeResponse> {
    // Bloqueio determinístico: menções em stories, compartilhamentos, mídia sem
    // texto ou rótulos entre colchetes NÃO são respondidos (não dependemos do LLM).
    const trimmed = (message || "").trim();
    if (
      !trimmed ||
      /^\[.*\]$/.test(trimmed) ||
      /^(📲|📎|🎥|🖼|🎙|🎤|📷)/.test(trimmed) ||
      /Stories do Instagram|Compartilhou uma publica/i.test(trimmed)
    ) {
      return { reply: "", intent: "other", answerable: false };
    }

    const availabilityReply = await maybeAnswerAvailability(env, orgId, trimmed);
    if (availabilityReply) return availabilityReply;

    // Saudação conforme o horário de Brasília (UTC-3).
    const brtHour = (new Date().getUTCHours() - 3 + 24) % 24;
    const saudacao = brtHour >= 5 && brtHour < 12 ? "Bom dia" : brtHour < 18 ? "Boa tarde" : "Boa noite";
    const apresentacao = `${saudacao}, tudo bem?\nSou o Rafael da Activity Fisioterapia.\nComo posso ajudar?`;

    const systemPrompt = `
Você é o atendente virtual da Activity Fisioterapia (assine como "Rafael" quando fizer sentido).
Atende leads e pacientes via WhatsApp e Instagram.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE as informações oficiais abaixo. NUNCA invente preços, horários, endereço, telefone, nomes de profissionais, disponibilidade de agenda, promoções, prazos ou qualquer dado que não esteja listado.
2. APRESENTAÇÃO: se a mensagem for apenas uma saudação (ex.: "oi", "olá", "bom dia", "boa tarde", "tudo bem?") OU não contiver nenhuma pergunta ou solicitação concreta, responda EXATAMENTE com o texto a seguir (e nada mais) e defina "answerable": true:
"${apresentacao}"
NÃO adiante informações (valores, horário, endereço etc.) enquanto a pessoa não perguntar algo.
3. SEM TEXTO/SEM PERGUNTA: se a mensagem não tiver pergunta nem for uma saudação (ex.: menção em stories, compartilhamento de publicação, mídia/foto/áudio sem texto, ou texto entre colchetes como "[story_mention]"), defina "answerable": false e deixe "reply" vazio. Não responda nada.
4. Se houver uma pergunta coberta pelas informações oficiais (endereço/localização, telefone, WhatsApp, e-mail, valores, formas de pagamento, horário de funcionamento, se aceita convênio, especialidades, tratamentos oferecidos, como funciona/dura a avaliação, estacionamento/acessibilidade, como agendar) → responda de forma acolhedora e concisa e defina "answerable": true.
5. Se a pergunta NÃO puder ser respondida com as informações oficiais (disponibilidade de horário na agenda, reagendamento, confirmação de agendamento, dúvida clínica sobre um caso, se tratam uma condição/lesão específica, se atendem um público específico como crianças/gestantes/idade mínima, qualquer assunto não listado), defina "answerable": false e "reply" vazio. NÃO afirme nem negue que tratam condição específica nem que atendem determinado público — isso é com o humano.
6. Se houver sinal de urgência, dor forte ou queixa clínica, defina "answerable": false e "intent": "urgent" (um humano assume imediatamente).
7. Responda em português do Brasil, tom acolhedor e profissional, conciso para chat. Sem excesso de emojis.

INFORMAÇÕES OFICIAIS (única fonte permitida):
${CLINIC_KB}

Retorne APENAS um JSON válido neste formato, sem texto fora do JSON:
{"reply": "string", "intent": "scheduling" | "information" | "urgent" | "other", "answerable": true | false}
`.trim();

    try {
      const response = await runAi(
        env,
        WORKERS_AI_MODELS.llama_3_1_8b,
        {
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((h) => ({ role: h.role, content: h.content })),
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        },
        { cache: false },
      );

      // Modelos -fast (vLLM/OpenAI) populam choices[].message.content, não .response.
      const raw = readAiText(response);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? "{}") as Partial<ConciergeResponse>;

      const answerable = parsed.answerable === true;
      const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      const intent = parsed.intent ?? "other";

      return {
        // Garante que nada é enviado quando não há resposta segura.
        reply: answerable ? reply : "",
        intent,
        answerable: answerable && reply.length >= 2,
      };
    } catch (error) {
      console.error("[AI Concierge] LLM Error:", error);
      // Em caso de falha NÃO inventamos resposta — deixa para o humano.
      return { reply: "", intent: "other", answerable: false };
    }
  }
}
