/**
 * React Hook for Population Health Analytics
 *
 * Provides access to clinic population health metrics and insights
 * Uses Firebase AI Logic for analysis
 *
 * @module hooks/usePopulationHealth
 * @version 1.0.0
 */


// ============================================================================
// QUERY KEYS
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';
import { analyzeClinicPopulation, PopulationHealthAnalysis, PopulationAnalysisOptions } from '@/lib/ai/population-health';

export const POPULATION_HEALTH_KEYS = {
  all: ['population-health'] as const,
  analysis: (clinicId: string, period: string) => [...POPULATION_HEALTH_KEYS.all, 'analysis', clinicId, period] as const,
  conditions: (clinicId: string) => [...POPULATION_HEALTH_KEYS.all, 'conditions', clinicId] as const,
  retention: (clinicId: string) => [...POPULATION_HEALTH_KEYS.all, 'retention', clinicId] as const,
  benchmarks: (clinicId: string) => [...POPULATION_HEALTH_KEYS.all, 'benchmarks', clinicId] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface UsePopulationHealthOptions {
  clinicId?: string;
  period?: '30d' | '90d' | '180d' | '365d' | 'custom';
  startDate?: Date;
  endDate?: Date;
  includeBenchmarks?: boolean;
  enabled?: boolean;
}

export type TimePeriod = '30d' | '90d' | '180d' | '365d' | 'custom';

// ============================================================================
// HOOK: POPULATION HEALTH ANALYSIS
// ============================================================================

/**
 * Hook to analyze clinic population health
 */
export function usePopulationHealthAnalysis(options: UsePopulationHealthOptions = {}) {
  const {
    clinicId = 'default',
    period = '90d',
    startDate,
    endDate,
    includeBenchmarks = true,
    enabled = true,
  } = options;

  // Calculate date range
  let startDateCalculated: Date;
  const endDateCalculated = endDate || new Date();

  if (startDate) {
    startDateCalculated = startDate;
  } else {
    switch (period) {
      case '30d':
        startDateCalculated = subDays(endDateCalculated, 30);
        break;
      case '90d':
        startDateCalculated = subDays(endDateCalculated, 90);
        break;
      case '180d':
        startDateCalculated = subDays(endDateCalculated, 180);
        break;
      case '365d':
        startDateCalculated = subDays(endDateCalculated, 365);
        break;
      case 'custom':
      default:
        startDateCalculated = startOfMonth(endDateCalculated);
    }
  }

  return useQuery({
    queryKey: POPULATION_HEALTH_KEYS.analysis(clinicId, period),
    queryFn: async (): Promise<PopulationHealthAnalysis> => {
      return analyzeClinicPopulation({
        clinicId,
        startDate: startDateCalculated,
        endDate: endDateCalculated,
        includeBenchmarks,
        minSampleSize: 10,
      });
    },
    enabled,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ============================================================================
// HOOK: TOP CONDITIONS
// ============================================================================

/**
 * Hook to get most common conditions in the clinic
 */
export function useTopConditions(options: UsePopulationHealthOptions = {}) {
  const { clinicId = 'default', period = '90d', enabled = true } = options;

  const analysis = usePopulationHealthAnalysis({ clinicId, period, enabled });

  const topConditions = analysis.data?.topConditions || [];

  return {
    ...analysis,
    topConditions,
    totalConditions: topConditions.length,
  };
}

// ============================================================================
// HOOK: TREATMENT EFFECTIVENESS
// ============================================================================

/**
 * Hook to get treatment effectiveness metrics
 */
export function useTreatmentEffectiveness(options: UsePopulationHealthOptions = {}) {
  const { clinicId = 'default', period = '90d', enabled = true } = options;

  const analysis = usePopulationHealthAnalysis({ clinicId, period, enabled });

  const effectiveness = analysis.data?.treatmentEffectiveness;

  return {
    ...analysis,
    effectiveness,
    overallSuccessRate: effectiveness?.overallSuccessRate || 0,
    bestPerforming: effectiveness?.bestPerformingTreatments || [],
    needsImprovement: effectiveness?.areasForImprovement || [],
  };
}

// ============================================================================
// HOOK: RETENTION ANALYSIS
// ============================================================================

/**
 * Hook to get patient retention metrics
 */
export function useRetentionAnalysis(options: UsePopulationHealthOptions = {}) {
  const { clinicId = 'default', period = '90d', enabled = true } = options;

  const analysis = usePopulationHealthAnalysis({ clinicId, period, enabled });

  const retention = analysis.data?.retentionAnalysis;

  return {
    ...analysis,
    retention,
    retentionRate: retention?.overallRetentionRate || 0,
    dropoutRate: retention?.dropoutRate || 0,
    avgSessions: retention?.averageSessionsPerPatient || 0,
    keyFactors: retention?.keyDropoutFactors || [],
    recommendations: retention?.recommendations || [],
  };
}

// ============================================================================
// HOOK: BENCHMARKS COMPARISON
// ============================================================================

/**
 * Hook to get clinic benchmarks and comparisons
 */
export function useBenchmarks(options: UsePopulationHealthOptions = {}) {
  const { clinicId = 'default', period = '90d', includeBenchmarks = true, enabled = true } = options;

  const analysis = usePopulationHealthAnalysis({ clinicId, period, includeBenchmarks, enabled });

  const benchmarks = analysis.data?.benchmarks;

  return {
    ...analysis,
    benchmarks,
    nationalAverages: benchmarks?.nationalAverages,
    clinicPerformance: benchmarks?.clinicPerformance,
    isBetterThanAverage: benchmarks?.clinicPerformance?.betterThanAverage || [],
    isComparable: benchmarks?.clinicPerformance?.comparableToAverage || [],
    isBelowAverage: benchmarks?.clinicPerformance?.belowAverage || [],
  };
}

// ============================================================================
// HOOK: REFRESH ANALYSIS
// ============================================================================

/**
 * Mutation to manually refresh population health analysis
 */
export function useRefreshPopulationAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: PopulationAnalysisOptions): Promise<PopulationHealthAnalysis> => {
      return analyzeClinicPopulation(options);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: POPULATION_HEALTH_KEYS.analysis(variables.clinicId || 'default', '90d'),
      });

      toast.success('Análise de saúde populacional atualizada', {
        description: `${data.populationOverview.totalPatients} pacientes analisados`,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar análise', {
        description: error.message,
      });
    },
  });
}

// ============================================================================
// HOOK: CHART DATA
// ============================================================================

/**
 * Hook to get population health data formatted for charts
 */
export function usePopulationHealthChartData(options: UsePopulationHealthOptions = {}) {
  const analysis = usePopulationHealthAnalysis(options);

  const conditionsDistribution = () => {
    if (!analysis.data) return [];

    return analysis.data.chartData.conditionsDistribution.map(item => ({
      label: item.label,
      value: item.value,
      percentage: ((item.value / analysis.data!.populationOverview.totalPatients) * 100).toFixed(1),
    }));
  };

  const recoveryTimeChart = () => {
    if (!analysis.data) return [];

    return analysis.data.chartData.recoveryTimeChart.map(item => ({
      condition: item.condition,
      days: item.days,
      benchmark: item.benchmark,
      difference: item.benchmark ? item.days - item.benchmark : 0,
      isBetter: item.benchmark ? item.days < item.benchmark : null,
    }));
  };

  const retentionFunnel = () => {
    if (!analysis.data) return [];

    return analysis.data.chartData.retentionFunnel.map(stage => ({
      stage: stage.stage,
      count: stage.count,
      percentage: stage.percentage,
    }));
  };

  const treatmentComparison = () => {
    if (!analysis.data?.treatmentEffectiveness.byTreatmentType) return [];

    return analysis.data.treatmentEffectiveness.byTreatmentType
      .filter(t => t.sampleSize >= 5)
      .sort((a, b) => b.successRate - a.successRate)
      .map(t => ({
        treatment: t.treatment,
        successRate: t.successRate,
        satisfaction: t.patientSatisfaction,
        outcome: t.averageOutcomeScore,
        sampleSize: t.sampleSize,
      }));
  };

  return {
    ...analysis,
    chartData: {
      conditionsDistribution: conditionsDistribution(),
      recoveryTimeChart: recoveryTimeChart(),
      retentionFunnel: retentionFunnel(),
      treatmentComparison: treatmentComparison(),
    },
  };
}

// ============================================================================
// HOOK: INSIGHTS
// ============================================================================

/**
 * Hook to get actionable insights from population health analysis
 */
export function usePopulationInsights(options: UsePopulationHealthOptions = {}) {
  const analysis = usePopulationHealthAnalysis(options);

  const insights = analysis.data?.insights || [];

  const categorizedInsights = {
    strengths: insights.filter(i => i.category === 'strength'),
    opportunities: insights.filter(i => i.category === 'opportunity'),
    concerns: insights.filter(i => i.category === 'concern'),
    trends: insights.filter(i => i.category === 'trend'),
  };

  const actionableInsights = insights.filter(i => i.actionable);
  const highPriorityInsights = insights.filter(i => i.impact === 'high');

  return {
    ...analysis,
    insights,
    categorizedInsights,
    actionableInsights,
    highPriorityInsights,
    totalInsights: insights.length,
    hasActionableInsights: actionableInsights.length > 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format retention rate as percentage
 */
export function formatRetentionRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Get retention rate color based on value
 */
export function getRetentionRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get success rate color
 */
export function getSuccessRateColor(rate: number): string {
  if (rate >= 85) return 'text-green-600';
  if (rate >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Format large numbers
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

/**
 * Get period label
 */
export function getPeriodLabel(period: TimePeriod): string {
  switch (period) {
    case '30d':
      return 'Últimos 30 dias';
    case '90d':
      return 'Últimos 90 dias';
    case '180d':
      return 'Últimos 6 meses';
    case '365d':
      return 'Último ano';
    case 'custom':
      return 'Período personalizado';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  usePopulationHealthAnalysis,
  useTopConditions,
  useTreatmentEffectiveness,
  useRetentionAnalysis,
  useBenchmarks,
  useRefreshPopulationAnalysis,
  usePopulationHealthChartData,
  usePopulationInsights,
  formatRetentionRate,
  getRetentionRateColor,
  getSuccessRateColor,
  formatNumber,
  getPeriodLabel,
};
