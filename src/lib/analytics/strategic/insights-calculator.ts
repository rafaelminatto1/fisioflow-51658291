/**
 * Strategic Insights Calculator
 * @module lib/analytics/strategic/insights-calculator
 *
 * Core library for calculating strategic insights from clinic data
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  differenceInWeeks,
  subDays,
  subMonths,
  format,
  parseISO,
  isSameDay,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type {
  TimeSlotInsight,
  AcquisitionGap,
  InsightPriority,
  SuggestedAction,
  TimeSlotAnalysisOptions,
  AcquisitionAnalysisOptions,
} from './types';

// ============================================================================
// TIME SLOT ANALYSIS
// ============================================================================

export interface AppointmentSlot {
  date: string;
  time: string;
  status: string;
  patient_id?: string;
  duration?: number;
}

export interface BusinessHours {
  start: number; // Hour (0-23)
  end: number;   // Hour (0-23)
  slotDuration: number; // Minutes per slot
  workDays: number[]; // 1-7 (ISO: Monday=1, Sunday=7)
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  start: 8,
  end: 19,
  slotDuration: 60,
  workDays: [1, 2, 3, 4, 5], // Monday to Friday
};

/**
 * Calculate time slot opportunities from appointment data
 */
export function calculateTimeSlotOpportunities(
  appointments: AppointmentSlot[],
  options: TimeSlotAnalysisOptions = {}
): TimeSlotInsight[] {
  const {
    minOpportunityScore = 30,
    minOccupancyRate = 0,
    maxOccupancyRate = 100,
    daysOfWeek = DEFAULT_BUSINESS_HOURS.workDays,
    hours = Array.from({ length: DEFAULT_BUSINESS_HOURS.end - DEFAULT_BUSINESS_HOURS.start }, (_, i) => DEFAULT_BUSINESS_HOURS.start + i),
    sortBy = 'opportunity_score',
    sortOrder = 'desc',
    limit = 20,
  } = options;

  // Group appointments by day of week and hour
  const slotGroups = new Map<string, AppointmentSlot[]>();
  const possibleSlots = new Map<string, number>();

  // Calculate all possible slots
  for (const day of daysOfWeek) {
    for (const hour of hours) {
      const key = `${day}-${hour}`;
      slotGroups.set(key, []);
      // Each day-hour combination has one possible slot
      possibleSlots.set(key, 1);
    }
  }

  // Populate with actual appointments
  const validAppointments = appointments.filter(apt => {
    const aptDate = parseISO(apt.date);
    if (!isValid(aptDate)) return false;

    const dayOfWeek = aptDate.getDay() || 7; // Convert Sunday from 0 to 7
    const [hour] = apt.time.split(':').map(Number);

    return daysOfWeek.includes(dayOfWeek) && hours.includes(hour);
  });

  // Group by slot
  for (const apt of validAppointments) {
    const aptDate = parseISO(apt.date);
    const dayOfWeek = aptDate.getDay() || 7;
    const [hour] = apt.time.split(':').map(Number);
    const key = `${dayOfWeek}-${hour}`;

    if (slotGroups.has(key)) {
      slotGroups.get(key)!.push(apt);
    }
  }

  // Calculate insights for each slot
  const insights: TimeSlotInsight[] = [];

  for (const [key, slotAppointments] of slotGroups) {
    const [dayOfWeek, hour] = key.split('-').map(Number);

    // Calculate metrics
    const totalAttempts = slotAppointments.length;
    const occupiedSlots = slotAppointments.filter(a =>
      a.status === 'concluido' || a.status === 'completed'
    ).length;
    const totalPossible = possibleSlots.get(key)!;
    const occupancyRate = totalPossible > 0 ? (occupiedSlots / totalPossible) * 100 : 0;

    // Check filters
    if (occupancyRate < minOccupancyRate || occupancyRate > maxOccupancyRate) {
      continue;
    }

    // Calculate opportunity score (inverse of occupancy)
    const opportunityScore = Math.max(0, 100 - occupancyRate);

    // Skip if below minimum opportunity score
    if (opportunityScore < minOpportunityScore) {
      continue;
    }

    // Determine opportunity level
    const opportunityLevel: TimeSlotInsight['opportunityLevel'] =
      occupancyRate < 30 ? 'high' :
      occupancyRate < 50 ? 'medium' : 'low';

    // Calculate trend (compare recent vs older data)
    const now = new Date();
    const recentCutoff = subDays(now, 30);
    const olderCutoff = subDays(now, 60);

    const recentAppointments = slotAppointments.filter(a => parseISO(a.date) >= recentCutoff);
    const olderAppointments = slotAppointments.filter(a => {
      const d = parseISO(a.date);
      return d >= olderCutoff && d < recentCutoff;
    });

    const recentOccupancy = recentAppointments.length > 0
      ? (recentAppointments.filter(a => a.status === 'concluido').length / recentAppointments.length) * 100
      : 0;

    const olderOccupancy = olderAppointments.length > 0
      ? (olderAppointments.filter(a => a.status === 'concluido').length / olderAppointments.length) * 100
      : 0;

    const trend: TimeSlotInsight['trend'] =
      recentOccupancy > olderOccupancy + 5 ? 'improving' :
      recentOccupancy < olderOccupancy - 5 ? 'declining' : 'stable';

    // Day name
    const dayName = getDayNamePortuguese(dayOfWeek);

    // Generate suggested actions
    const suggestedActions = generateTimeSlotActions(opportunityScore, dayOfWeek, hour);

    insights.push({
      dayOfWeek: getDayNamePortuguese(dayOfWeek),
      dayName,
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}:00`,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      opportunityScore: Math.round(opportunityScore * 10) / 10,
      opportunityLevel,
      trend,
      suggestedActions,
      historicalAverage: olderOccupancy,
      recentAverage: recentOccupancy,
    });
  }

  // Sort results
  insights.sort((a, b) => {
    const comparison = sortOrder === 'desc' ? -1 : 1;

    switch (sortBy) {
      case 'opportunity_score':
        return (b.opportunityScore - a.opportunityScore) * comparison;
      case 'occupancy_rate':
        return (b.occupancyRate - a.occupancyRate) * comparison;
      case 'day_hour':
        return (a.dayOfWeek - b.dayOfWeek || a.hour - b.hour) * comparison;
      default:
        return 0;
    }
  });

  return insights.slice(0, limit);
}

/**
 * Generate suggested actions for a time slot
 */
function generateTimeSlotActions(
  opportunityScore: number,
  dayOfWeek: number,
  hour: number
): string[] {
  const actions: string[] = [];
  const dayName = getDayNamePortuguese(dayOfWeek);
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  if (opportunityScore > 70) {
    actions.push(`Oferecer desconto de 20% para ${dayName}s às ${hourLabel}`);
    actions.push(`Lançar "Semana da ${dayName}" com promoção relâmpago`);
    actions.push(`Enviar SMS para pacientes inativos para este horário`);
  } else if (opportunityScore > 50) {
    actions.push(`Oferecer desconto de 10% para ${dayName}s às ${hourLabel}`);
    actions.push(`Criar campanha específica para preencher este horário`);
    actions.push(`Considerar reduzir disponibilidade de fisioterapeutas`);
  } else {
    actions.push(`Monitorar ocupação nas próximas semanas`);
    actions.push(`Considerar ajuste leve de estratégia de marketing`);
  }

  return actions;
}

/**
 * Get Portuguese day name from ISO day number (1-7)
 */
function getDayNamePortuguese(dayOfWeek: number): string {
  const names = [
    '', // 0 = undefined
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
    'Domingo',
  ];
  return names[dayOfWeek] || '';
}

// ============================================================================
// PATIENT ACQUISITION ANALYSIS
// ============================================================================

export interface PatientData {
  id: string;
  created_at: string;
  first_appointment_date?: string;
  last_appointment_date?: string;
}

export interface AppointmentWithPatient {
  id: string;
  date: string;
  patient_id: string;
  type: string;
  status: string;
}

/**
 * Calculate acquisition gaps by analyzing patient acquisition patterns
 */
export function calculateAcquisitionGaps(
  patients: PatientData[],
  appointments: AppointmentWithPatient[],
  options: AcquisitionAnalysisOptions = {}
): AcquisitionGap[] {
  const {
    periodType = 'week',
    minZScore = -Infinity,
    maxZScore = Infinity,
    classification = ['critical_low', 'low'],
    sortBy = 'new_patients_count',
    sortOrder = 'asc',
    limit = 10,
  } = options;

  // Determine date range
  const now = new Date();
  const startDate = subMonths(now, 12); // Analyze last 12 months

  // Group patients by period
  const periodMap = new Map<string, {
    patients: Set<string>;
    evaluations: number;
  }>();

  // Initialize periods
  let currentDate = startOfMonth(startDate);
  const endDate = endOfMonth(now);

  while (currentDate <= endDate) {
    const periodKey = getPeriodKey(currentDate, periodType);
    periodMap.set(periodKey, {
      patients: new Set(),
      evaluations: 0,
    });

    currentDate = getNextPeriod(currentDate, periodType);
  }

  // Populate with patient data
  for (const patient of patients) {
    const createdAt = parseISO(patient.created_at);
    if (!isValid(createdAt) || createdAt < startDate || createdAt > endDate) {
      continue;
    }

    const periodKey = getPeriodKey(createdAt, periodType);
    const period = periodMap.get(periodKey);
    if (period) {
      period.patients.add(patient.id);
    }
  }

  // Count evaluations by period
  for (const apt of appointments) {
    const aptDate = parseISO(apt.date);
    if (!isValid(aptDate) || aptDate < startDate || aptDate > endDate) {
      continue;
    }

    if (apt.type === 'avaliacao' || apt.type === 'evaluation') {
      const periodKey = getPeriodKey(aptDate, periodType);
      const period = periodMap.get(periodKey);
      if (period) {
        period.evaluations++;
      }
    }
  }

  // Calculate statistics
  const periodData = Array.from(periodMap.entries()).map(([key, data]) => ({
    key,
    newPatients: data.patients.size,
    evaluations: data.evaluations,
  }));

  const avgNewPatients = periodData.reduce((sum, p) => sum + p.newPatients, 0) / periodData.length;
  const stdDevNewPatients = calculateStdDev(periodData.map(p => p.newPatients));

  const avgEvaluations = periodData.reduce((sum, p) => sum + p.evaluations, 0) / periodData.length;
  const stdDevEvaluations = calculateStdDev(periodData.map(p => p.evaluations));

  // Generate gaps
  const gaps: AcquisitionGap[] = [];

  for (const [key, data] of periodMap) {
    const periodInfo = parsePeriodKey(key, periodType);
    const newPatients = data.patients.size;

    // Calculate z-score
    const zScore = stdDevNewPatients > 0
      ? (newPatients - avgNewPatients) / stdDevNewPatients
      : 0;

    // Calculate percentage vs average
    const vsAvg = avgNewPatients > 0
      ? ((newPatients - avgNewPatients) / avgNewPatients) * 100
      : 0;

    // Classify
    let gapClassification: AcquisitionGap['classification'];
    if (zScore < -1.5) {
      gapClassification = 'critical';
    } else if (zScore < -1) {
      gapClassification = 'low';
    } else if (zScore > 1) {
      gapClassification = 'high';
    } else {
      gapClassification = 'normal';
    }

    // Skip if not in requested classifications
    if (!classification.includes(gapClassification)) {
      continue;
    }

    // Skip if outside z-score range
    if (zScore < minZScore || zScore > maxZScore) {
      continue;
    }

    // Generate suggested actions
    const suggestedActions = generateAcquisitionActions(
      gapClassification,
      vsAvg,
      periodInfo.type
    );

    gaps.push({
      period: periodInfo,
      metrics: {
        newPatients,
        evaluations: data.evaluations,
        conversionRate: newPatients > 0 ? (data.evaluations / newPatients) * 100 : 0,
      },
      comparison: {
        vsAverage: Math.round(vsAvg * 10) / 10,
        zScore: Math.round(zScore * 100) / 100,
      },
      classification: gapClassification,
      suggestedActions,
    });
  }

  // Sort results
  gaps.sort((a, b) => {
    const comparison = sortOrder === 'desc' ? -1 : 1;

    switch (sortBy) {
      case 'new_patients_count':
        return (a.metrics.newPatients - b.metrics.newPatients) * comparison;
      case 'vs_avg_pct':
        return (a.comparison.vsAverage - b.comparison.vsAverage) * comparison;
      case 'z_score':
        return (a.comparison.zScore - b.comparison.zScore) * comparison;
      default:
        return 0;
    }
  });

  return gaps.slice(0, limit);
}

/**
 * Get period key for grouping
 */
function getPeriodKey(date: Date, periodType: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  switch (periodType) {
    case 'month':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'week':
      const week = getWeekOfMonth(date);
      return `${year}-${String(month).padStart(2, '0')}-W${week}`;
    case 'fortnight':
      const day = date.getDate();
      const fortnight = day <= 15 ? 1 : 2;
      return `${year}-${String(month).padStart(2, '0')}-F${fortnight}`;
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * Parse period key back to date range
 */
function parsePeriodKey(key: string, periodType: string): AcquisitionGap['period'] {
  const [year, month, rest] = key.split('-');

  const baseDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  let label: string;
  let type: AcquisitionGap['period']['type'];

  switch (periodType) {
    case 'week':
      const week = rest?.replace('W', '');
      label = `Semana ${week}`;
      type = 'week';
      break;
    case 'fortnight':
      const fortnight = rest?.replace('F', '');
      label = fortnight === '1' ? 'Primeira quinzena' : 'Segunda quinzena';
      type = 'fortnight';
      break;
    case 'month':
    default:
      label = format(baseDate, 'MMMM/yyyy', { locale: ptBR });
      type = 'month';
      break;
  }

  return {
    type,
    label,
    startDate: startOfMonth(baseDate),
    endDate: endOfMonth(baseDate),
  };
}

/**
 * Get next period date
 */
function getNextPeriod(date: Date, periodType: string): Date {
  switch (periodType) {
    case 'week':
      return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'fortnight':
      return new Date(date.getTime() + 15 * 24 * 60 * 60 * 1000);
    case 'month':
    default:
      return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
}

/**
 * Get week of month (1-5)
 */
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = startOfMonth(date);
  const dayOfMonth = date.getDate();
  return Math.ceil((dayOfMonth + firstDayOfMonth.getDay()) / 7);
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squareDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Generate suggested actions for acquisition gaps
 */
function generateAcquisitionActions(
  classification: AcquisitionGap['classification'],
  vsAvg: number,
  periodType: string
): string[] {
  const actions: string[] = [];

  if (classification === 'critical' || vsAvg < -30) {
    actions.push('Lançar campanha agressiva de captação imediatamente');
    actions.push('Oferecer avaliação gratuita por tempo limitado');
    actions.push('Estabelecer parcerias com empresas locais');
    actions.push('Implementar programa de indicação com bônus generosos');
    actions.push('Considerar reduzir preços temporariamente');
  } else if (classification === 'low' || vsAvg < -15) {
    actions.push('Aumentar investimentos em marketing digital');
    actions.push('Oferecer desconto de 15% para primeira consulta');
    actions.push('Recuperar pacientes inativos com campanha específica');
    actions.push('Criar conteúdo educativo para redes sociais');
  } else if (classification === 'high') {
    actions.push('Capitalizar no período forte - maximizar capacidade');
    actions.push('Aumentar investimento em marketing para este período');
    actions.push('Oferecer pacotes especiais para novos pacientes');
  } else {
    actions.push('Continuar monitorando tendências de captação');
    actions.push('Manter estratégias atuais');
  }

  return actions;
}

// ============================================================================
// SEASONAL PATTERN DETECTION
// ============================================================================

export interface SeasonalPattern {
  type: 'weekly' | 'monthly' | 'yearly';
  period: number; // 0-6 for weekly (Sun-Sat), 0-11 for monthly (Jan-Dec)
  label: string;
  averageValue: number;
  vsOverallAverage: number; // Percentage difference
  zScore: number;
  confidence: number; // 0-100
  consistent: boolean; // True if pattern holds across multiple periods
}

/**
 * Detect seasonal patterns in time series data
 */
export function detectSeasonalPatterns(
  data: Array<{ date: string; value: number }>,
  patternType: 'weekly' | 'monthly' | 'yearly' = 'weekly'
): SeasonalPattern[] {
  const overallAvg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const overallStdDev = calculateStdDev(data.map(d => d.value));

  // Group by period
  const periodGroups = new Map<number, number[]>();

  for (const point of data) {
    const date = parseISO(point.date);
    if (!isValid(date)) continue;

    let period: number;
    switch (patternType) {
      case 'weekly':
        period = date.getDay(); // 0-6 (Sun-Sat)
        break;
      case 'monthly':
        period = date.getMonth(); // 0-11
        break;
      case 'yearly':
        period = getDayOfYear(date);
        break;
    }

    if (!periodGroups.has(period)) {
      periodGroups.set(period, []);
    }
    periodGroups.get(period)!.push(point.value);
  }

  // Calculate patterns
  const patterns: SeasonalPattern[] = [];

  for (const [period, values] of periodGroups) {
    if (values.length < 2) continue; // Need at least 2 data points

    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = calculateStdDev(values);
    const zScore = overallStdDev > 0 ? (avg - overallAvg) / overallStdDev : 0;
    const vsOverallAvg = overallAvg > 0 ? ((avg - overallAvg) / overallAvg) * 100 : 0;

    // Confidence based on consistency (low stdDev = high confidence)
    const coefficientOfVariation = avg > 0 ? (stdDev / avg) * 100 : 100;
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation));

    // Label
    let label: string;
    if (patternType === 'weekly') {
      label = format(setDay(new Date(), period), 'EEEE', { locale: ptBR });
    } else if (patternType === 'monthly') {
      label = format(new Date(2024, period, 1), 'MMMM', { locale: ptBR });
    } else {
      label = `Dia ${period}`;
    }

    patterns.push({
      type: patternType,
      period,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      averageValue: Math.round(avg * 100) / 100,
      vsOverallAverage: Math.round(vsOverallAvg * 10) / 10,
      zScore: Math.round(zScore * 100) / 100,
      confidence: Math.round(confidence),
      consistent: coefficientOfVariation < 30, // Less than 30% variation = consistent
    });
  }

  // Sort by z-score (absolute) to show most significant patterns first
  patterns.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  return patterns;
}

/**
 * Get day of year (1-366)
 */
function getDayOfYear(date: Date): number {
  const start = startOfYear(date);
  return differenceInDays(date, start) + 1;
}

/**
 * Set day of week (0 = Sunday, 6 = Saturday)
 */
function setDay(date: Date, day: number): Date {
  const currentDay = date.getDay();
  const diff = day - currentDay;
  return new Date(date.getTime() + diff * 24 * 60 * 60 * 1000);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

// ============================================================================
// OPPORTUNITY SCORING
// ============================================================================

export interface OpportunityScore {
  score: number; // 0-100
  level: 'critical' | 'high' | 'medium' | 'low';
  factors: Array<{
    name: string;
    impact: number; // 0-100
    weight: number; // 0-1
  }>;
  confidence: number; // 0-100
}

/**
 * Calculate overall opportunity score from multiple factors
 */
export function calculateOpportunityScore(
  factors: Array<{ name: string; value: number; weight: number; invert?: boolean }>
): OpportunityScore {
  let totalScore = 0;
  let totalWeight = 0;

  const normalizedFactors = factors.map(f => {
    // Normalize value to 0-100 range
    let normalized = Math.max(0, Math.min(100, f.value));

    // Invert if necessary (e.g., occupancy rate - lower is better for opportunities)
    if (f.invert) {
      normalized = 100 - normalized;
    }

    const impact = normalized * f.weight;
    totalScore += impact;
    totalWeight += f.weight;

    return {
      name: f.name,
      impact: Math.round(normalized * 10) / 10,
      weight: f.weight,
    };
  });

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  // Determine level
  let level: OpportunityScore['level'];
  if (finalScore >= 80) {
    level = 'critical';
  } else if (finalScore >= 60) {
    level = 'high';
  } else if (finalScore >= 40) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Calculate confidence based on number of factors and their weights
  const confidence = Math.min(
    100,
    50 + factors.length * 5 + totalWeight * 10
  );

  return {
    score: Math.round(finalScore * 10) / 10,
    level,
    factors: normalizedFactors,
    confidence: Math.round(confidence),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_BUSINESS_HOURS,
  calculateStdDev,
  getDayNamePortuguese,
};

export type {
  AppointmentSlot,
  BusinessHours,
  PatientData,
  AppointmentWithPatient,
};
