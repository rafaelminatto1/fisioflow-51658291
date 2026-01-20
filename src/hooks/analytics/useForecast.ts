/**
 * React Hook for Time Series Forecasting
 * @module hooks/analytics/useForecast
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, format, parseISO, differenceInDays } from 'date-fns';

import type {
  ForecastPrediction,
  ForecastResponse,
  ForecastHorizon,
  ForecastMetric,
  TrendAnalysis,
} from '@/lib/analytics/strategic/types';

// ============================================================================
// MAIN FORECAST HOOK
// ============================================================================

export interface UseForecastOptions {
  organizationId?: string;
  horizon?: ForecastHorizon;
  metrics?: ForecastMetric[];
  enabled?: boolean;
}

export function useForecast(options: UseForecastOptions = {}) {
  const {
    organizationId,
    horizon = '30d',
    metrics = ['appointments', 'patients', 'revenue'],
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['forecast', organizationId, horizon, metrics],
    queryFn: async () => {
      // Fetch historical data
      const days = horizon === '7d' ? 30 : horizon === '30d' ? 90 : 180;
      const startDate = subDays(new Date(), days);

      // Fetch appointments data
      const { data: appointmentsData, error: aptError } = await supabase
        .from('appointments')
        .select('appointment_date, status, payment_amount')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true });

      if (aptError) throw aptError;

      // Fetch patients data
      const { data: patientsData, error: patError } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', format(startDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: true });

      if (patError) throw patError;

      // Generate forecast
      const forecast = await generateForecast(
        appointmentsData || [],
        patientsData || [],
        horizon
      );

      return forecast;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 6, // 6 hours
  });
}

// ============================================================================
// GENERATE FORECAST FUNCTION
// ============================================================================

async function generateForecast(
  appointments: Array<{ appointment_date: string; status: string; payment_amount?: number | null }>,
  patients: Array<{ created_at: string }>,
  horizon: ForecastHorizon
): Promise<ForecastResponse> {
  const periods = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
  const now = new Date();

  // Prepare time series data for appointments
  const appointmentTimeSeries = prepareTimeSeries(
    appointments.map(a => ({ date: a.appointment_date, value: 1 }))
  );

  // Prepare time series data for patients
  const patientTimeSeries = prepareTimeSeries(
    patients.map(p => ({ date: p.created_at, value: 1 }))
  );

  // Prepare time series data for revenue
  const revenueTimeSeries = prepareTimeSeries(
    appointments
      .filter(a => a.payment_amount && a.status === 'concluido')
      .map(a => ({ date: a.appointment_date, value: a.payment_amount || 0 }))
  );

  // Generate predictions using simple moving average + trend
  const appointmentPredictions = predictSeries(appointmentTimeSeries, periods);
  const patientPredictions = predictSeries(patientTimeSeries, periods);
  const revenuePredictions = predictSeries(revenueTimeSeries, periods);

  // Calculate confidence intervals (simple approximation)
  const aptStdDev = calculateStdDev(appointmentTimeSeries.map(p => p.value));
  const patStdDev = calculateStdDev(patientTimeSeries.map(p => p.value));
  const revStdDev = calculateStdDev(revenueTimeSeries.map(p => p.value));

  const predictions: ForecastPrediction[] = [];

  for (let i = 0; i < periods; i++) {
    const date = format(addDays(now, i + 1), 'yyyy-MM-dd');

    predictions.push({
      date,
      appointments: {
        predicted: Math.max(0, Math.round(appointmentPredictions[i])),
        confidence: 75,
        range: [
          Math.max(0, Math.round(appointmentPredictions[i] - 1.96 * aptStdDev)),
          Math.round(appointmentPredictions[i] + 1.96 * aptStdDev),
        ],
      },
      newPatients: {
        predicted: Math.max(0, Math.round(patientPredictions[i])),
        confidence: 70,
      },
      revenue: {
        predicted: Math.max(0, Math.round(revenuePredictions[i] * 100) / 100),
        confidence: 70,
        range: [
          Math.max(0, Math.round((revenuePredictions[i] - 1.96 * revStdDev) * 100) / 100),
          Math.round((revenuePredictions[i] + 1.96 * revStdDev) * 100) / 100,
        ],
      },
      occupancy: {
        predicted: 0, // Will be calculated if we have slot data
        confidence: 0,
      },
    });
  }

  // Analyze trend
  const trend = analyzeTrend(appointmentTimeSeries);

  // Generate insights
  const insights = generateForecastInsights(predictions, trend, appointments);

  return {
    predictions,
    insights,
    metadata: {
      generatedAt: now.toISOString(),
      horizon,
      model: 'moving-average-with-trend',
      confidence: trend.confidence,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function prepareTimeSeries(data: Array<{ date: string; value: number }>): Array<{ date: string; value: number }> {
  // Group by date and sum values
  const grouped = new Map<string, number>();

  for (const point of data) {
    const date = point.date.split('T')[0];
    grouped.set(date, (grouped.get(date) || 0) + point.value);
  }

  // Fill missing dates with zeros
  const sortedDates = Array.from(grouped.keys()).sort();
  if (sortedDates.length === 0) return [];

  const startDate = parseISO(sortedDates[0]);
  const endDate = parseISO(sortedDates[sortedDates.length - 1]);
  const result: Array<{ date: string; value: number }> = [];

  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    result.push({
      date: dateStr,
      value: grouped.get(dateStr) || 0,
    });
    currentDate = addDays(currentDate, 1);
  }

  return result;
}

function predictSeries(data: Array<{ date: string; value: number }>, periods: number): number[] {
  if (data.length < 3) return Array(periods).fill(0);

  // Calculate moving average of last 7 days
  const windowSize = Math.min(7, data.length);
  const recentData = data.slice(-windowSize);
  const avg = recentData.reduce((sum, p) => sum + p.value, 0) / windowSize;

  // Calculate trend (slope) from last 14 days
  const trendWindow = Math.min(14, data.length);
  const trendData = data.slice(-trendWindow);
  const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
  const secondHalf = trendData.slice(Math.floor(trendData.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;
  const trendPerDay = (secondAvg - firstAvg) / (trendData.length / 2);

  // Generate predictions
  const predictions: number[] = [];
  for (let i = 1; i <= periods; i++) {
    const prediction = avg + (i * trendPerDay);
    predictions.push(Math.max(0, prediction));
  }

  return predictions;
}

function analyzeTrend(data: Array<{ date: string; value: number }>): TrendAnalysis {
  if (data.length < 3) {
    return {
      trend: 'stable',
      growthRate: 0,
      seasonality: [],
      anomalies: [],
      confidence: 0,
    };
  }

  // Calculate overall trend
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const avgValue = data.reduce((sum, p) => sum + p.value, 0) / data.length;
  const growthRate = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  let trend: TrendAnalysis['trend'];
  if (growthRate > 10) {
    trend = 'growing';
  } else if (growthRate < -10) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Detect seasonality (weekly pattern)
  const seasonality = detectWeeklySeasonality(data);

  // Detect anomalies
  const anomalies = detectAnomalies(data);

  // Calculate confidence
  const stdDev = calculateStdDev(data.map(p => p.value));
  const coefficientOfVariation = avgValue > 0 ? (stdDev / avgValue) * 100 : 100;
  const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation));

  return {
    trend,
    growthRate: Math.round(growthRate * 10) / 10,
    seasonality,
    anomalies,
    confidence: Math.round(confidence),
  };
}

function detectWeeklySeasonality(data: Array<{ date: string; value: number }>): number[] {
  const dayGroups = new Map<number, number[]>();

  for (const point of data) {
    const date = parseISO(point.date);
    const dayOfWeek = date.getDay();
    if (!dayGroups.has(dayOfWeek)) {
      dayGroups.set(dayOfWeek, []);
    }
    dayGroups.get(dayOfWeek)!.push(point.value);
  }

  const overallAvg = data.reduce((sum, p) => sum + p.value, 0) / data.length;
  const pattern: number[] = [];

  for (let day = 0; day < 7; day++) {
    const values = dayGroups.get(day) || [];
    const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : overallAvg;
    pattern.push(Math.round((avg / overallAvg) * 1000) / 1000);
  }

  return pattern;
}

function detectAnomalies(
  data: Array<{ date: string; value: number }>,
  threshold: number = 2
): Array<{ date: string; value: number; expected: number; deviation: number; reason?: string }> {
  const anomalies: Array<{ date: string; value: number; expected: number; deviation: number; reason?: string }> = [];

  const windowSize = Math.min(14, Math.floor(data.length / 3));

  for (let i = windowSize; i < data.length; i++) {
    const window = data.slice(i - windowSize, i);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
    const stdDev = calculateStdDev(window.map(p => p.value));

    const current = data[i];
    const zScore = stdDev > 0 ? (current.value - avg) / stdDev : 0;

    if (Math.abs(zScore) > threshold) {
      anomalies.push({
        date: current.date,
        value: current.value,
        expected: Math.round(avg * 100) / 100,
        deviation: Math.round(zScore * 100) / 100,
        reason: Math.abs(zScore) > 3 ? 'Outlier extremo' : 'Anomalia estatística',
      });
    }
  }

  return anomalies;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(squareDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function generateForecastInsights(
  predictions: ForecastPrediction[],
  trend: TrendAnalysis,
  historicalAppointments: Array<{ appointment_date: string; status: string }>
): ForecastResponse['insights'] {
  const recommendations: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  const totalPredicted = predictions.reduce((sum, p) => sum + p.appointments.predicted, 0);
  const avgPredicted = totalPredicted / predictions.length;

  // Trend-based insights
  switch (trend.trend) {
    case 'growing':
      recommendations.push('Considerar aumentar capacidade para atender demanda crescente');
      opportunities.push('Tendência de crescimento - aproveitar para expandir');
      break;
    case 'declining':
      recommendations.push('Revisar estratégias de marketing e retenção');
      risks.push('Tendência de queda - monitorar atentamente');
      break;
    default:
      recommendations.push('Manter estratégias atuais - estabilidade nos resultados');
      break;
  }

  // Seasonality insights
  if (trend.seasonality.length > 0) {
    const maxDay = trend.seasonality.indexOf(Math.max(...trend.seasonality));
    const minDay = trend.seasonality.indexOf(Math.min(...trend.seasonality));
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    if (Math.max(...trend.seasonality) - Math.min(...trend.seasonality) > 0.3) {
      opportunities.push(`Dia mais forte: ${dayNames[maxDay]} - maximizar agenda`);
      opportunities.push(`Dia mais fraco: ${dayNames[minDay]} - considerar promoções`);
    }
  }

  // Anomaly alerts
  if (trend.anomalies.length > 0) {
    risks.push(`${trend.anomalies.length} anomalias detectadas recentemente`);
  }

  return {
    trend,
    recommendations,
    risks,
    opportunities,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

export function useAppointmentsForecast(options: UseForecastOptions = {}) {
  const { organizationId, horizon = '30d', enabled = true } = options;

  return useQuery({
    queryKey: ['forecast', 'appointments', organizationId, horizon],
    queryFn: async () => {
      const days = horizon === '7d' ? 30 : horizon === '30d' ? 90 : 180;
      const startDate = subDays(new Date(), days);

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      const timeSeries = prepareTimeSeries((data || []).map(a => ({ date: a.appointment_date, value: 1 })));
      const periods = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
      const predictions = predictSeries(timeSeries, periods);

      return predictions.map((value, i) => ({
        date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
        predicted: Math.max(0, Math.round(value)),
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useRevenueForecast(options: UseForecastOptions = {}) {
  const { organizationId, horizon = '30d', enabled = true } = options;

  return useQuery({
    queryKey: ['forecast', 'revenue', organizationId, horizon],
    queryFn: async () => {
      const days = horizon === '7d' ? 30 : horizon === '30d' ? 90 : 180;
      const startDate = subDays(new Date(), days);

      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_date, payment_amount')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .not('payment_amount', 'is', null)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      const timeSeries = prepareTimeSeries(
        (data || []).map(a => ({ date: a.appointment_date, value: a.payment_amount || 0 }))
      );
      const periods = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
      const predictions = predictSeries(timeSeries, periods);

      return predictions.map((value, i) => ({
        date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
        predicted: Math.max(0, Math.round(value * 100) / 100),
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useNewPatientsForecast(options: UseForecastOptions = {}) {
  const { organizationId, horizon = '30d', enabled = true } = options;

  return useQuery({
    queryKey: ['forecast', 'new-patients', organizationId, horizon],
    queryFn: async () => {
      const days = horizon === '7d' ? 30 : horizon === '30d' ? 90 : 180;
      const startDate = subDays(new Date(), days);

      const { data, error } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', format(startDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: true });

      if (error) throw error;

      const timeSeries = prepareTimeSeries((data || []).map(p => ({ date: p.created_at, value: 1 })));
      const periods = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
      const predictions = predictSeries(timeSeries, periods);

      return predictions.map((value, i) => ({
        date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
        predicted: Math.max(0, Math.round(value)),
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  useAppointmentsForecast,
  useRevenueForecast,
  useNewPatientsForecast,
};

export type {
  UseForecastOptions,
};

// Helper functions exported for testing
export {
  prepareTimeSeries,
  predictSeries,
  analyzeTrend,
  detectWeeklySeasonality,
  detectAnomalies,
  calculateStdDev,
};
