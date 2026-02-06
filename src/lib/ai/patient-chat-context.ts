import type { ClinicalChatInput } from '@/services/ai/firebaseAIService';
import type { PatientAnalyticsData } from '@/types/patientAnalytics';

interface BuildPatientChatContextOptions {
  patientId: string;
  patientName?: string;
  analyticsData?: PatientAnalyticsData | null;
  maxRecentEvolutions?: number;
}

const DEFAULT_MAX_RECENT_EVOLUTIONS = 6;
const MAX_EVOLUTION_NOTE_LENGTH = 280;

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function truncateText(value: string, maxLength = MAX_EVOLUTION_NOTE_LENGTH): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function formatMetric(value: number | null | undefined, suffix = ''): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value * 10) / 10}${suffix}`;
}

function buildConditionSummary(
  patientName: string | undefined,
  analyticsData: PatientAnalyticsData | null | undefined
): string | undefined {
  if (!analyticsData && !patientName) return undefined;

  const summaryParts: string[] = [];
  if (patientName) summaryParts.push(`Paciente: ${patientName}`);

  const sessions = analyticsData?.progress_summary.total_sessions;
  if (typeof sessions === 'number') {
    summaryParts.push(`Sessoes concluidas: ${sessions}`);
  }

  const progress = formatMetric(analyticsData?.progress_summary.overall_progress_percentage, '%');
  if (progress) summaryParts.push(`Progresso geral: ${progress}`);

  const pain = formatMetric(analyticsData?.pain_trend?.current_score, '/10');
  if (pain) summaryParts.push(`Dor atual: ${pain}`);

  const functionScore = formatMetric(analyticsData?.function_trend?.current_score, '/100');
  if (functionScore) summaryParts.push(`Funcao atual: ${functionScore}`);

  const dropoutRisk = formatMetric(
    analyticsData?.risk_score?.dropout_risk_score ?? analyticsData?.predictions.dropout_probability,
    '%'
  );
  if (dropoutRisk) summaryParts.push(`Risco de abandono: ${dropoutRisk}`);

  const activeGoals = analyticsData?.goals.filter(goal => goal.status === 'in_progress').length ?? 0;
  if (activeGoals > 0) summaryParts.push(`Metas ativas: ${activeGoals}`);

  return summaryParts.join(' | ');
}

function buildRecentEvolutions(
  analyticsData: PatientAnalyticsData | null | undefined,
  maxItems: number
): Array<{ date: string; notes: string }> {
  if (!analyticsData) return [];

  const sessionEvents = analyticsData.recent_sessions.map(session => {
    const details: string[] = [];
    details.push('Resumo de sessao');

    const painReduction = formatMetric(session.pain_reduction);
    if (painReduction) details.push(`reducao de dor ${painReduction}`);

    const satisfaction = formatMetric(session.satisfaction, '/10');
    if (satisfaction) details.push(`satisfacao ${satisfaction}`);

    return {
      date: session.date,
      notes: truncateText(details.join(', ')),
      priority: 2,
    };
  });

  const insightEvents = analyticsData.recent_insights.map(insight => ({
    date: insight.created_at,
    notes: truncateText(`Insight (${insight.insight_type}): ${insight.insight_text}`),
    priority: insight.insight_type === 'risk_detected' ? 3 : 1,
  }));

  return [...sessionEvents, ...insightEvents]
    .filter(event => event.notes.trim().length > 0)
    .sort((a, b) => {
      const dateDiff = toTimestamp(b.date) - toTimestamp(a.date);
      if (dateDiff !== 0) return dateDiff;
      return b.priority - a.priority;
    })
    .slice(0, maxItems)
    .map(event => ({
      date: event.date,
      notes: event.notes,
    }));
}

export function buildPatientChatContext(
  options: BuildPatientChatContextOptions
): ClinicalChatInput['context'] {
  const { patientId, patientName, analyticsData, maxRecentEvolutions = DEFAULT_MAX_RECENT_EVOLUTIONS } = options;

  const context: NonNullable<ClinicalChatInput['context']> = {
    patientId,
  };

  if (patientName) {
    context.patientName = patientName;
  }

  const conditionSummary = buildConditionSummary(patientName, analyticsData);
  if (conditionSummary) {
    context.condition = conditionSummary;
  }

  const sessionCount = analyticsData?.progress_summary.total_sessions;
  if (typeof sessionCount === 'number' && Number.isFinite(sessionCount) && sessionCount >= 0) {
    context.sessionCount = sessionCount;
  }

  const recentEvolutions = buildRecentEvolutions(analyticsData, maxRecentEvolutions);
  if (recentEvolutions.length > 0) {
    context.recentEvolutions = recentEvolutions;
  }

  return context;
}
