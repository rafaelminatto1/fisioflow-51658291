/**
 * Recorrência minimalista de tarefas (specs/tarefas-integracoes).
 * A próxima instância é criada quando a atual é concluída (PATCH → CONCLUIDO).
 */
export type TarefaRecurrenceFreq = "daily" | "weekly" | "biweekly" | "monthly";

export type TarefaRecurrence = {
  freq: TarefaRecurrenceFreq;
  interval?: number;
};

const FREQS: TarefaRecurrenceFreq[] = ["daily", "weekly", "biweekly", "monthly"];

export function parseRecurrence(value: unknown): TarefaRecurrence | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (!FREQS.includes(rec.freq as TarefaRecurrenceFreq)) return null;
  const interval = Number(rec.interval ?? 1);
  return {
    freq: rec.freq as TarefaRecurrenceFreq,
    interval: Number.isInteger(interval) && interval >= 1 ? interval : 1,
  };
}

/**
 * Próximo vencimento a partir de uma data YYYY-MM-DD (date-only, sem TZ).
 * Mensal clampa para o último dia do mês (31/jan → 28/fev).
 */
export function computeNextDueDate(rec: TarefaRecurrence, fromDate: string): string {
  const [y, m, d] = fromDate.slice(0, 10).split("-").map(Number);
  const interval = rec.interval ?? 1;

  if (rec.freq === "monthly") {
    const targetMonth = m - 1 + interval;
    const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
    const next = new Date(Date.UTC(y, targetMonth, Math.min(d, lastDay)));
    return next.toISOString().slice(0, 10);
  }

  const days = rec.freq === "daily" ? 1 : rec.freq === "weekly" ? 7 : 14;
  const next = new Date(Date.UTC(y, m - 1, d + days * interval));
  return next.toISOString().slice(0, 10);
}
