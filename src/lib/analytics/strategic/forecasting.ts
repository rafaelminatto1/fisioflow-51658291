/**
 * Strategic Analytics - Time Series Forecasting
 * @module lib/analytics/strategic/forecasting
 *
 * Advanced forecasting algorithms: Holt-Winters, Moving Average, Exponential Smoothing
 */

import {
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  format,
  parseISO,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type {
  ForecastPrediction,
  TrendAnalysis,
  ForecastResponse,
  ForecastHorizon,
  SeasonalPattern,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface TimeSeriesPoint {
  date: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ForecastOptions {
  horizon: ForecastHorizon;
  confidenceLevel?: number; // 0-100, default 95
  seasonality?: 'none' | 'weekly' | 'monthly';
  method?: 'holt-winters' | 'moving-average' | 'exponential' | 'linear';
}

export interface HoltWintersParams {
  alpha: number; // Level smoothing (0-1)
  beta: number;  // Trend smoothing (0-1)
  gamma: number; // Seasonal smoothing (0-1)
  seasonPeriod: number; // 7 for weekly, 12 for monthly
}

export interface ForecastResult {
  predictions: TimeSeriesPoint[];
  confidence: {
    lower: number[];
    upper: number[];
    level: number;
  };
  metrics: {
    mae: number; // Mean Absolute Error
    mse: number; // Mean Squared Error
    rmse: number; // Root Mean Squared Error
    mape: number; // Mean Absolute Percentage Error
  };
  trend: TrendAnalysis;
}

// ============================================================================
// HOLT-WINTERS TRIPLE EXPONENTIAL SMOOTHING
// ============================================================================

/**
 * Holt-Winters method for time series with trend and seasonality
 * Best for data with clear patterns and seasonal variations
 */
export function holtWintersForecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResult {
  const { horizon, confidenceLevel = 95, seasonality = 'weekly' } = options;

  // Determine parameters
  const seasonPeriod = seasonality === 'weekly' ? 7 : seasonality === 'monthly' ? 12 : 1;
  const params: HoltWintersParams = {
    alpha: 0.3,  // Level smoothing
    beta: 0.1,   // Trend smoothing
    gamma: 0.1,  // Seasonal smoothing
    seasonPeriod,
  };

  // Need at least 2 * seasonPeriod data points
  const minDataPoints = 2 * seasonPeriod;
  if (data.length < minDataPoints) {
    throw new Error(`Need at least ${minDataPoints} data points for Holt-Winters with ${seasonality} seasonality`);
  }

  // Initialize: Use simple averages for first season
  const initialValues = initializeHoltWinters(data, seasonPeriod);
  let level = initialValues.level;
  let trend = initialValues.trend;
  let seasonal = [...initialValues.seasonal];

  // Fit the model (compute level, trend, seasonal for each point)
  const fittedValues: number[] = [];
  const residuals: number[] = [];

  for (let i = seasonPeriod; i < data.length; i++) {
    const prevLevel = level;
    const prevTrend = trend;
    const prevSeasonal = seasonal[i % seasonPeriod];

    const value = data[i].value;

    // Update level
    level = params.alpha * (value / prevSeasonal) +
            (1 - params.alpha) * (prevLevel + prevTrend);

    // Update trend
    trend = params.beta * (level - prevLevel) +
           (1 - params.beta) * prevTrend;

    // Update seasonal
    seasonal[i % seasonPeriod] = params.gamma * (value / (prevLevel + prevTrend)) +
                                (1 - params.gamma) * prevSeasonal;

    // Fitted value
    const fitted = (prevLevel + prevTrend) * prevSeasonal;
    fittedValues.push(fitted);
    residuals.push(value - fitted);
  }

  // Calculate error metrics
  const metrics = calculateForecastMetrics(data.slice(seasonPeriod), fittedValues);

  // Generate forecasts
  const forecastPeriods = horizonToPeriods(horizon);
  const predictions: TimeSeriesPoint[] = [];
  const lastDate = parseISO(data[data.length - 1].date);

  // Confidence intervals based on residuals
  const residualStdDev = calculateStdDev(residuals);
  const zScore = confidenceLevelToZScore(confidenceLevel);
  const confidenceInterval = zScore * residualStdDev * Math.sqrt(1 + 1 / data.length);

  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastDate = addDays(lastDate, i);
    const seasonalIndex = (seasonPeriod + (i - 1) % seasonPeriod) % seasonPeriod;

    const pointForecast = (level + i * trend) * seasonal[seasonalIndex];

    predictions.push({
      date: format(forecastDate, 'yyyy-MM-dd'),
      value: Math.max(0, Math.round(pointForecast * 100) / 100), // Ensure non-negative
    });
  }

  // Calculate confidence bounds
  const lower: number[] = [];
  const upper: number[] = [];

  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i].value;
    const width = confidenceInterval * Math.sqrt(i + 1); // Wider for longer horizons
    lower.push(Math.max(0, Math.round((prediction - width) * 100) / 100));
    upper.push(Math.round((prediction + width) * 100) / 100));
  }

  // Analyze trend
  const trendAnalysis = analyzeTrend(data, predictions);

  return {
    predictions,
    confidence: {
      lower,
      upper,
      level: confidenceLevel,
    },
    metrics,
    trend: trendAnalysis,
  };
}

/**
 * Initialize Holt-Winters parameters using first season data
 */
function initializeHoltWinters(
  data: TimeSeriesPoint[],
  seasonPeriod: number
): { level: number; trend: number; seasonal: number[] } {
  // Use first season for initialization
  const firstSeason = data.slice(0, seasonPeriod);

  // Calculate initial level (average of first season)
  const level = firstSeason.reduce((sum, p) => sum + p.value, 0) / seasonPeriod;

  // Calculate initial seasonal indices
  const seasonal = firstSeason.map(p => p.value / level);

  // Calculate initial trend (linear regression through first 2 seasons)
  if (data.length < 2 * seasonPeriod) {
    return { level, trend: 0, seasonal };
  }

  const secondSeason = data.slice(seasonPeriod, 2 * seasonPeriod);
  const secondLevel = secondSeason.reduce((sum, p) => sum + p.value, 0) / seasonPeriod;
  const trend = (secondLevel - level) / seasonPeriod;

  return { level, trend, seasonal };
}

// ============================================================================
// MOVING AVERAGE FORECAST
// ============================================================================

/**
 * Simple Moving Average forecast
 * Good for stable data without clear trends or seasonality
 */
export function movingAverageForecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResult {
  const { horizon } = options;
  const windowSize = Math.min(7, Math.floor(data.length / 3)); // Adaptive window size

  const predictions: TimeSeriesPoint[] = [];
  const lastDate = parseISO(data[data.length - 1].date);

  // Calculate residuals for confidence intervals
  const residuals: number[] = [];

  for (let i = 0; i < data.length - windowSize; i++) {
    const window = data.slice(i, i + windowSize);
    const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
    const actual = data[i + windowSize].value;
    residuals.push(actual - avg);
  }

  const residualStdDev = calculateStdDev(residuals);
  const zScore = confidenceLevelToZScore(95);
  const confidenceInterval = zScore * residualStdDev;

  // Generate forecasts
  for (let i = 1; i <= horizonToPeriods(horizon); i++) {
    const forecastDate = addDays(lastDate, i);

    // Use most recent window
    const recentData = data.slice(-windowSize);
    const forecast = recentData.reduce((sum, p) => sum + p.value, 0) / windowSize;

    predictions.push({
      date: format(forecastDate, 'yyyy-MM-dd'),
      value: Math.max(0, Math.round(forecast * 100) / 100),
    });
  }

  // Confidence bounds
  const lower = predictions.map(p => Math.max(0, p.value - confidenceInterval));
  const upper = predictions.map(p => p.value + confidenceInterval);

  // Metrics
  const fittedValues = data.slice(windowSize).map((_, i) => {
    const window = data.slice(i, i + windowSize);
    return window.reduce((sum, p) => sum + p.value, 0) / windowSize;
  });
  const metrics = calculateForecastMetrics(data.slice(windowSize), fittedValues);

  // Trend analysis
  const trendAnalysis = analyzeTrend(data, predictions);

  return {
    predictions,
    confidence: { lower, upper, level: 95 },
    metrics,
    trend: trendAnalysis,
  };
}

// ============================================================================
// EXPONENTIAL SMOOTHING FORECAST
// ============================================================================

/**
 * Single Exponential Smoothing forecast
 * Good for data with no clear trend or seasonality
 */
export function exponentialSmoothingForecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResult {
  const { horizon } = options;
  const alpha = 0.3; // Smoothing parameter

  // Compute smoothed values
  const smoothed: number[] = [data[0].value];

  for (let i = 1; i < data.length; i++) {
    const smoothedValue = alpha * data[i].value + (1 - alpha) * smoothed[i - 1];
    smoothed.push(smoothedValue);
  }

  // Forecasts are the last smoothed value
  const lastSmoothed = smoothed[smoothed.length - 1];
  const forecastPeriods = horizonToPeriods(horizon);
  const lastDate = parseISO(data[data.length - 1].date);

  const predictions: TimeSeriesPoint[] = [];
  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastDate = addDays(lastDate, i);
    predictions.push({
      date: format(forecastDate, 'yyyy-MM-dd'),
      value: Math.max(0, Math.round(lastSmoothed * 100) / 100),
    });
  }

  // Confidence intervals (simple approximation)
  const residuals = data.map((p, i) => p.value - smoothed[i]);
  const residualStdDev = calculateStdDev(residuals);
  const zScore = confidenceLevelToZScore(95);
  const confidenceInterval = zScore * residualStdDev;

  const lower = predictions.map(p => Math.max(0, p.value - confidenceInterval));
  const upper = predictions.map(p => p.value + confidenceInterval);

  // Metrics
  const metrics = calculateForecastMetrics(data, smoothed);

  // Trend analysis
  const trendAnalysis = analyzeTrend(data, predictions);

  return {
    predictions,
    confidence: { lower, upper, level: 95 },
    metrics,
    trend: trendAnalysis,
  };
}

// ============================================================================
// LINEAR REGRESSION FORECAST
// ============================================================================

/**
 * Linear Regression forecast
 * Good for data with clear linear trend
 */
export function linearRegressionForecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResult {
  const { horizon } = options;

  // Simple linear regression: y = a + bx
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].value;
    sumXY += i * data[i].value;
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate predictions
  const forecastPeriods = horizonToPeriods(horizon);
  const lastDate = parseISO(data[data.length - 1].date);

  const predictions: TimeSeriesPoint[] = [];
  for (let i = 1; i <= forecastPeriods; i++) {
    const forecastDate = addDays(lastDate, i);
    const forecast = intercept + slope * (n + i - 1);
    predictions.push({
      date: format(forecastDate, 'yyyy-MM-dd'),
      value: Math.max(0, Math.round(forecast * 100) / 100),
    });
  }

  // Calculate residuals and confidence
  const fittedValues = data.map((_, i) => intercept + slope * i);
  const residuals = data.map((p, i) => p.value - fittedValues[i]);
  const residualStdDev = calculateStdDev(residuals);
  const zScore = confidenceLevelToZScore(95);

  const lower: number[] = [];
  const upper: number[] = [];

  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i].value;
    const width = zScore * residualStdDev * Math.sqrt(1 + 1 / n + Math.pow(n + i, 2) / (n * calculateStdDev(data.map((_, j) => j))));
    lower.push(Math.max(0, Math.round((prediction - width) * 100) / 100));
    upper.push(Math.round((prediction + width) * 100) / 100);
  }

  // Metrics
  const metrics = calculateForecastMetrics(data, fittedValues);

  // Trend analysis
  const trendAnalysis = analyzeTrend(data, predictions);

  return {
    predictions,
    confidence: { lower, upper, level: 95 },
    metrics,
    trend: trendAnalysis,
  };
}

// ============================================================================
// COMBINED FORECAST (ENSEMBLE)
// ============================================================================

/**
 * Combined forecast using multiple methods
 * Averages predictions from different methods for more robust results
 */
export function combinedForecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResult {
  // Get forecasts from different methods
  const hwForecast = holtWintersForecast(data, options);
  const esForecast = exponentialSmoothingForecast(data, options);

  // Average predictions
  const predictions: TimeSeriesPoint[] = [];

  for (let i = 0; i < Math.min(hwForecast.predictions.length, esForecast.predictions.length); i++) {
    const avgValue = (hwForecast.predictions[i].value + esForecast.predictions[i].value) / 2;
    predictions.push({
      ...hwForecast.predictions[i],
      value: Math.round(avgValue * 100) / 100,
    });
  }

  // Average confidence intervals
  const lower = predictions.map((_, i) =>
    Math.round((hwForecast.confidence.lower[i] + esForecast.confidence.lower[i]) / 2 * 100) / 100
  );
  const upper = predictions.map((_, i) =>
    Math.round((hwForecast.confidence.upper[i] + esForecast.confidence.upper[i]) / 2 * 100) / 100
  );

  // Average metrics
  const metrics = {
    mae: (hwForecast.metrics.mae + esForecast.metrics.mae) / 2,
    mse: (hwForecast.metrics.mse + esForecast.metrics.mse) / 2,
    rmse: (hwForecast.metrics.rmse + esForecast.metrics.rmse) / 2,
    mape: (hwForecast.metrics.mape + esForecast.metrics.mape) / 2,
  };

  // Use trend from Holt-Winters (more sophisticated)
  const trendAnalysis = hwForecast.trend;

  return {
    predictions,
    confidence: { lower, upper, level: options.confidenceLevel || 95 },
    metrics,
    trend: trendAnalysis,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert horizon string to number of periods
 */
function horizonToPeriods(horizon: ForecastHorizon): number {
  switch (horizon) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 30;
  }
}

/**
 * Convert confidence level to z-score
 */
function confidenceLevelToZScore(confidenceLevel: number): number {
  // Approximate z-scores for common confidence levels
  const zScores: Record<number, number> = {
    80: 1.28,
    90: 1.645,
    95: 1.96,
    98: 2.33,
    99: 2.58,
  };
  return zScores[confidenceLevel] || 1.96;
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
 * Calculate forecast error metrics
 */
function calculateForecastMetrics(
  actual: Array<{ value: number }>,
  predicted: number[]
): { mae: number; mse: number; rmse: number; mape: number } {
  let sumAE = 0; // Absolute Error
  let sumSE = 0; // Squared Error
  let sumAPE = 0; // Absolute Percentage Error
  let validApeCount = 0;

  for (let i = 0; i < actual.length; i++) {
    const a = actual[i].value;
    const p = predicted[i];
    const error = a - p;

    sumAE += Math.abs(error);
    sumSE += error * error;

    if (a !== 0) {
      sumAPE += Math.abs(error / a) * 100;
      validApeCount++;
    }
  }

  const n = actual.length;
  return {
    mae: sumAE / n,
    mse: sumSE / n,
    rmse: Math.sqrt(sumSE / n),
    mape: validApeCount > 0 ? sumAPE / validApeCount : 0,
  };
}

/**
 * Analyze trend from historical data and predictions
 */
function analyzeTrend(
  historical: TimeSeriesPoint[],
  predictions: TimeSeriesPoint[]
): TrendAnalysis {
  // Calculate overall trend from historical data
  const firstValue = historical[0].value;
  const lastValue = historical[historical.length - 1].value;
  const avgValue = historical.reduce((sum, p) => sum + p.value, 0) / historical.length;

  // Growth rate
  const growthRate = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  // Determine trend direction
  let trend: TrendAnalysis['trend'];
  if (growthRate > 5) {
    trend = 'growing';
  } else if (growthRate < -5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Detect seasonality (7-day pattern)
  const seasonality = detectSeasonalityPattern(historical);

  // Detect anomalies
  const anomalies = detectAnomalies(historical);

  // Confidence based on data consistency
  const stdDev = calculateStdDev(historical.map(p => p.value));
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

/**
 * Detect seasonal pattern
 */
function detectSeasonalityPattern(data: TimeSeriesPoint[]): number[] {
  // Group by day of week (0-6)
  const dayGroups = new Map<number, number[]>();

  for (const point of data) {
    const date = parseISO(point.date);
    const dayOfWeek = date.getDay();
    if (!dayGroups.has(dayOfWeek)) {
      dayGroups.set(dayOfWeek, []);
    }
    dayGroups.get(dayOfWeek)!.push(point.value);
  }

  // Calculate average for each day
  const pattern: number[] = [];
  const overallAvg = data.reduce((sum, p) => sum + p.value, 0) / data.length;

  for (let day = 0; day < 7; day++) {
    const values = dayGroups.get(day) || [];
    const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : overallAvg;
    pattern.push(Math.round((avg / overallAvg) * 1000) / 1000); // Normalized to overall average
  }

  return pattern;
}

/**
 * Detect anomalies in time series
 */
function detectAnomalies(
  data: TimeSeriesPoint[],
  threshold: number = 2 // Standard deviations
): Array<{ date: string; value: number; expected: number; deviation: number; reason?: string }> {
  const anomalies: Array<{ date: string; value: number; expected: number; deviation: number; reason?: string }> = [];

  // Calculate moving average and std dev
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
        reason: Math.abs(zScore) > 3 ? 'Extreme outlier' : 'Statistical anomaly',
      });
    }
  }

  return anomalies;
}

// ============================================================================
// MAIN FORECAST FUNCTION
// ============================================================================

/**
 * Main forecast function - automatically selects best method
 */
export function forecast(
  data: TimeSeriesPoint[],
  options: ForecastOptions
): ForecastResponse {
  // Validate data
  if (data.length < 3) {
    throw new Error('Need at least 3 data points for forecasting');
  }

  // Auto-select method based on data characteristics
  let method = options.method || 'holt-winters';

  if (!options.method) {
    // Detect characteristics
    const hasTrend = detectTrend(data);
    const hasSeasonality = detectSeasonality(data);

    if (hasSeasonality && hasTrend) {
      method = 'holt-winters';
    } else if (hasTrend) {
      method = 'linear';
    } else if (hasSeasonality) {
      method = 'holt-winters';
    } else {
      method = 'exponential';
    }
  }

  // Generate forecast
  let result: ForecastResult;
  switch (method) {
    case 'moving-average':
      result = movingAverageForecast(data, options);
      break;
    case 'exponential':
      result = exponentialSmoothingForecast(data, options);
      break;
    case 'linear':
      result = linearRegressionForecast(data, options);
      break;
    case 'holt-winters':
    default:
      result = holtWintersForecast(data, options);
      break;
  }

  // Generate insights and recommendations
  const insights = generateForecastInsights(result, data);
  const metadata = {
    generatedAt: new Date().toISOString(),
    horizon: options.horizon,
    model: method,
    confidence: result.trend.confidence,
  };

  return {
    predictions: result.predictions.map((p, i) => ({
      date: p.date,
      appointments: {
        predicted: p.value,
        confidence: result.trend.confidence,
        range: [result.confidence.lower[i], result.confidence.upper[i]],
      },
      newPatients: { predicted: 0, confidence: result.trend.confidence },
      revenue: { predicted: 0, confidence: result.trend.confidence, range: [0, 0] },
      occupancy: { predicted: 0, confidence: result.trend.confidence },
    })),
    insights,
    metadata,
  };
}

/**
 * Detect if data has a trend
 */
function detectTrend(data: TimeSeriesPoint[]): boolean {
  if (data.length < 5) return false;

  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

  const change = Math.abs((secondAvg - firstAvg) / (firstAvg || 1)) * 100;
  return change > 10; // More than 10% change = trend
}

/**
 * Detect if data has seasonality
 */
function detectSeasonality(data: TimeSeriesPoint[]): boolean {
  if (data.length < 14) return false; // Need at least 2 weeks

  // Check for weekly pattern
  const dayGroups = new Map<number, number[]>();

  for (const point of data) {
    const date = parseISO(point.date);
    const dayOfWeek = date.getDay();
    if (!dayGroups.has(dayOfWeek)) {
      dayGroups.set(dayOfWeek, []);
    }
    dayGroups.get(dayOfWeek)!.push(point.value);
  }

  // Calculate variation between days
  const dayAvgs = Array.from(dayGroups.values()).map(values =>
    values.reduce((sum, v) => sum + v, 0) / values.length
  );

  const overallAvg = dayAvgs.reduce((sum, v) => sum + v, 0) / dayAvgs.length;
  const maxDeviation = Math.max(...dayAvgs.map(avg => Math.abs(avg - overallAvg)));
  const relativeDeviation = overallAvg > 0 ? (maxDeviation / overallAvg) * 100 : 0;

  return relativeDeviation > 20; // More than 20% variation = seasonality
}

/**
 * Generate insights from forecast results
 */
function generateForecastInsights(
  result: ForecastResult,
  historical: TimeSeriesPoint[]
): ForecastResponse['insights'] {
  const { trend, metrics } = result;
  const totalPredicted = result.predictions.reduce((sum, p) => sum + p.value, 0);
  const avgHistorical = historical.reduce((sum, p) => sum + p.value, 0) / historical.length;

  const recommendations: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  // Trend-based recommendations
  switch (trend.trend) {
    case 'growing':
      recommendations.push('Considerar aumentar capacidade para atender demanda crescente');
      recommendations.push('Avaliar contratação de novos fisioterapeutas');
      opportunities.push('Tendência de crescimento favorável - aproveitar momentum');
      break;
    case 'declining':
      recommendations.push('Revisar estratégias de marketing e captação');
      recommendations.push('Considerar promoções para reverter tendência de queda');
      risks.push('Tendência de queda - monitorar atentamente próximos dias');
      break;
    default:
      recommendations.push('Manter estratégias atuais - estabilidade nos resultados');
      break;
  }

  // Anomaly-based alerts
  if (trend.anomalies.length > 0) {
    risks.push(`${trend.anomalies.length} anomalias detectadas nos dados históricos`);
    recommendations.push('Investigar causas das anomalias para melhorar previsões');
  }

  // Seasonality-based recommendations
  const maxSeasonalIndex = trend.seasonality.indexOf(Math.max(...trend.seasonality));
  const minSeasonalIndex = trend.seasonality.indexOf(Math.min(...trend.seasonality));

  if (Math.max(...trend.seasonality) - Math.min(...trend.seasonality) > 0.3) {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    opportunities.push(`Dia mais forte: ${days[maxSeasonalIndex]} - maximizar agenda`);
    opportunities.push(`Dia mais fraco: ${days[minSeasonalIndex]} - considerar promoções`);
  }

  // MAPE-based recommendations
  if (metrics.mape > 30) {
    risks.push('Alta taxa de erro nas previsões - reduzir confiança nas projeções');
  } else if (metrics.mape < 10) {
    opportunities.push('Previsões muito precisas - alta confiança para planejamento');
  }

  return {
    trend,
    recommendations,
    risks,
    opportunities,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  holtWintersForecast,
  movingAverageForecast,
  exponentialSmoothingForecast,
  linearRegressionForecast,
  combinedForecast,
  detectSeasonality,
  detectTrend,
  calculateStdDev,
  calculateForecastMetrics,
  horizonToPeriods,
  confidenceLevelToZScore,
};

export type {
  TimeSeriesPoint,
  ForecastOptions,
  HoltWintersParams,
  ForecastResult,
};
