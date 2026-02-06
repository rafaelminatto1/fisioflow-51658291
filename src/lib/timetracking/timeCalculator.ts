/**
 * Time Tracking - Calculadora de Tempo
 * Utilitários para cálculos de tempo e duração
 */
import {

  TimeEntry,
  DailyBreakdown,
  WeeklyTimeSheet,
  ProductivityReport,
  ProjectTimeSummary,
  TaskTimeSummary,
  TimeStats,
} from '@/types/timetracking';

/**
 * Formata segundos em formato legível
 */
export function formatDuration(seconds: number, style: 'short' | 'long' = 'short'): string {
  if (seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (style === 'long') {
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    if (minutes > 0) {
      return `${minutes}min ${secs}s`;
    }
    return `${secs}s`;
  }

  // Short format: HH:MM:SS
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Formata segundos em formato decimal de horas
 */
export function formatHoursDecimal(seconds: number, decimals: number = 2): string {
  const hours = seconds / 3600;
  return hours.toFixed(decimals);
}

/**
 * Calcula a duração em segundos entre duas datas
 */
export function calculateDuration(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Arredonda segundos para o minuto mais próximo
 */
export function roundToMinutes(seconds: number, roundingMinutes: number = 1): number {
  const minutes = Math.floor(seconds / 60);
  const rounded = Math.round(minutes / roundingMinutes) * roundingMinutes;
  return rounded * 60;
}

/**
 * Calcula o valor monetário baseado em tempo
 */
export function calculateBillableAmount(
  seconds: number,
  hourlyRate: number,
  roundToCents: boolean = true
): number {
  const amount = (seconds / 3600) * hourlyRate;
  return roundToCents ? Math.round(amount * 100) / 100 : amount;
}

/**
 * Calcula o total de segundos de um array de entradas
 */
export function sumDurations(entries: TimeEntry[]): number {
  return entries.reduce((total, entry) => total + entry.duration_seconds, 0);
}

/**
 * Separa tempo faturável de não faturável
 */
export function splitBillableTime(entries: TimeEntry[]): {
  billable: TimeEntry[];
  nonBillable: TimeEntry[];
  billableSeconds: number;
  nonBillableSeconds: number;
} {
  const billable = entries.filter((e) => e.is_billable);
  const nonBillable = entries.filter((e) => !e.is_billable);

  return {
    billable,
    nonBillable,
    billableSeconds: sumDurations(billable),
    nonBillableSeconds: sumDurations(nonBillable),
  };
}

/**
 * Calcula taxa de utilização (tempo faturável / tempo total)
 */
export function calculateUtilizationRate(entries: TimeEntry[]): number {
  const total = sumDurations(entries);
  if (total === 0) return 0;

  const { billableSeconds } = splitBillableTime(entries);
  return (billableSeconds / total) * 100;
}

/**
 * Agrupa entradas por dia
 */
export function groupByDay(entries: TimeEntry[], timeZone: string = 'UTC'): DailyBreakdown[] {
  const grouped = new Map<string, TimeEntry[]>();

  entries.forEach((entry) => {
    const date = new Date(entry.start_time.toDate());
    const key = formatDateKey(date, timeZone);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(entry);
  });

  return Array.from(grouped.entries())
    .map(([date, dayEntries]) => {
      const { billableSeconds, _nonBillableSeconds } = splitBillableTime(dayEntries);
      return {
        date,
        total_seconds: sumDurations(dayEntries),
        billable_seconds: billableSeconds,
        entries: dayEntries,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Agrupa entradas por semana
 */
export function groupByWeek(entries: TimeEntry[], timeZone: string = 'UTC'): WeeklyTimeSheet[] {
  const grouped = new Map<string, TimeEntry[]>();

  entries.forEach((entry) => {
    const date = new Date(entry.start_time.toDate());
    const weekKey = getWeekKey(date, timeZone);

    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }
    grouped.get(weekKey)!.push(entry);
  });

  return Array.from(grouped.entries()).map(([key, weekEntries]) => {
    const { billableSeconds, nonBillableSeconds } = splitBillableTime(weekEntries);
    const daily = groupByDay(weekEntries, timeZone);

    // Parse week key to get start/end dates
    const [year, week] = key.split('-W').map(Number);
    const { week_start, week_end } = getWeekBounds(year, week);

    return {
      user_id: weekEntries[0]?.user_id || '',
      week_start,
      week_end,
      entries: weekEntries,
      total_seconds: sumDurations(weekEntries),
      billable_seconds: billableSeconds,
      non_billable_seconds: nonBillableSeconds,
      total_value: weekEntries.reduce((sum, e) => sum + (e.total_value || 0), 0),
      daily_breakdown: daily,
    };
  });
}

/**
 * Agrupa tempo por projeto
 */
export function groupByProject(entries: TimeEntry[]): ProjectTimeSummary[] {
  const grouped = new Map<string, { entries: TimeEntry[]; totalValue: number }>();

  entries.forEach((entry) => {
    const projectId = entry.project_id || 'no-project';
    if (!grouped.has(projectId)) {
      grouped.set(projectId, { entries: [], totalValue: 0 });
    }
    const group = grouped.get(projectId)!;
    group.entries.push(entry);
    group.totalValue += entry.total_value || 0;
  });

  return Array.from(grouped.entries()).map(([projectId, { entries, totalValue }]) => ({
    project_id: projectId,
    project_title: entries[0]?.project_id ? `Project ${projectId}` : 'Sem projeto',
    total_seconds: sumDurations(entries),
    total_value: totalValue,
    entry_count: entries.length,
  }));
}

/**
 * Agrupa tempo por tarefa
 */
export function groupByTask(entries: TimeEntry[]): TaskTimeSummary[] {
  const grouped = new Map<string, TimeEntry[]>();

  entries.forEach((entry) => {
    const taskId = entry.task_id || 'no-task';
    if (!grouped.has(taskId)) {
      grouped.set(taskId, []);
    }
    grouped.get(taskId)!.push(entry);
  });

  return Array.from(grouped.entries()).map(([taskId, taskEntries]) => ({
    task_id: taskId,
    task_title: taskEntries[0]?.task_id ? `Task ${taskId}` : 'Sem tarefa',
    total_seconds: sumDurations(taskEntries),
    entry_count: taskEntries.length,
  }));
}

/**
 * Calcula estatísticas de tempo para um período
 */
export function calculateTimeStats(
  entries: TimeEntry[],
  timeZone: string = 'UTC'
): TimeStats {
  const now = new Date();
  const todayKey = formatDateKey(now, timeZone);
  const { week_start: thisWeekStart, week_end: thisWeekEnd } = getWeekBounds(
    now.getFullYear(),
    getWeekNumber(now)
  );
  const { week_start: _lastWeekStart } = getWeekBounds(
    now.getFullYear(),
    getWeekNumber(now) - 1
  );

  const todayEntries = entries.filter((e) => {
    const date = new Date(e.start_time.toDate());
    return formatDateKey(date, timeZone) === todayKey;
  });

  const thisWeekEntries = entries.filter((e) => {
    const date = new Date(e.start_time.toDate());
    return date >= thisWeekStart && date <= thisWeekEnd;
  });

  const thisMonthEntries = entries.filter((e) => {
    const date = new Date(e.start_time.toDate());
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  const last30DaysEntries = entries.filter((e) => {
    const date = new Date(e.start_time.toDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return date >= thirtyDaysAgo;
  });

  const averageDaily =
    last30DaysEntries.length > 0
      ? sumDurations(last30DaysEntries) / 30
      : 0;

  return {
    today: {
      total_seconds: sumDurations(todayEntries),
      billable_seconds: sumDurations(todayEntries.filter((e) => e.is_billable)),
      entries: todayEntries.length,
    },
    this_week: {
      total_seconds: sumDurations(thisWeekEntries),
      billable_seconds: sumDurations(thisWeekEntries.filter((e) => e.is_billable)),
      entries: thisWeekEntries.length,
    },
    this_month: {
      total_seconds: sumDurations(thisMonthEntries),
      billable_seconds: sumDurations(thisMonthEntries.filter((e) => e.is_billable)),
      entries: thisMonthEntries.length,
    },
    average_daily: Math.round(averageDaily),
  };
}

/**
 * Gera relatório de produtividade
 */
export function generateProductivityReport(
  entries: TimeEntry[],
  startDate: Date,
  endDate: Date
): ProductivityReport {
  const filteredEntries = entries.filter((e) => {
    const date = new Date(e.start_time.toDate());
    return date >= startDate && date <= endDate;
  });

  const totalSeconds = sumDurations(filteredEntries);
  const billableSeconds = sumDurations(filteredEntries.filter((e) => e.is_billable));

  return {
    user_id: undefined,
    organization_id: filteredEntries[0]?.organization_id || '',
    start_date: startDate,
    end_date: endDate,
    total_seconds: totalSeconds,
    billable_seconds: billableSeconds,
    utilization_rate: totalSeconds > 0 ? (billableSeconds / totalSeconds) * 100 : 0,
    top_projects: groupByProject(filteredEntries)
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 5),
    top_tasks: groupByTask(filteredEntries)
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 5),
    hourly_average:
      totalSeconds > 0
        ? (filteredEntries.reduce((sum, e) => sum + (e.total_value || 0), 0) /
            totalSeconds) *
          3600
        : 0,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formata data como chave YYYY-MM-DD
 */
function formatDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Obtém chave da semana YYYY-Www
 */
function getWeekKey(date: Date, _timeZone: string): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Obtém número da semana (1-53)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Obtém bounds da semana (domingo a sábado)
 */
function getWeekBounds(year: number, week: number): {
  week_start: Date;
  week_end: Date;
} {
  const januaryFirst = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7;
  const weekStart = new Date(januaryFirst);
  weekStart.setDate(januaryFirst.getDate() + daysToAdd);

  // Ajustar para domingo
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Reset hours
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);

  return { week_start: weekStart, week_end: weekEnd };
}
