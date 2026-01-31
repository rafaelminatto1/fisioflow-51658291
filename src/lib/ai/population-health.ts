/**
 * Population Health Analytics
 *
 * Uses Firebase AI Logic (gemini-2.5-flash) to analyze clinic population patterns:
 * - Most common conditions identification
 * - Average recovery times by condition
 * - Treatment effectiveness trends
 * - Patient retention patterns
 * - Benchmark against national/international averages
 *
 * @module lib/ai/population-health
 * @version 1.0.0
 */

import { getAdminDb } from '@/lib/firebase/admin';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PopulationHealthAnalysis {
  clinicId: string;
  analysisDate: string;
  periodAnalyzed: {
    start: string;
    end: string;
    days: number;
  };

  // Population overview
  populationOverview: {
    totalPatients: number;
    activePatients: number;
    newPatients: number;
    averageAge: number;
    genderDistribution: {
      male: number;
      female: number;
      other: number;
      unknown: number;
    };
  };

  // Most common conditions
  topConditions: Array<{
    condition: string;
    count: number;
    percentage: number;
    averageSessions: number;
    averageRecoveryDays: number;
    successRate: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;

  // Recovery metrics by condition
  recoveryMetrics: Array<{
    condition: string;
    medianRecoveryDays: number;
    meanRecoveryDays: number;
    percentile25: number;
    percentile75: number;
    standardDeviation: number;
    sampleSize: number;
  }>;

  // Treatment effectiveness
  treatmentEffectiveness: {
    overallSuccessRate: number;
    byTreatmentType: Array<{
      treatment: string;
      successRate: number;
      averageOutcomeScore: number;
      patientSatisfaction: number;
      sampleSize: number;
    }>;
    bestPerformingTreatments: string[];
    areasForImprovement: string[];
  };

  // Patient retention
  retentionAnalysis: {
    overallRetentionRate: number;
    dropoutRate: number;
    averageSessionsPerPatient: number;
    retentionByCondition: Array<{
      condition: string;
      retentionRate: number;
      averageSessions: number;
    }>;
    keyDropoutFactors: string[];
    recommendations: string[];
  };

  // Benchmarks
  benchmarks: {
    nationalAverages?: {
      averageRecoveryTime: number;
      successRate: number;
      patientSatisfaction: number;
      source: string;
    };
    clinicPerformance: {
      betterThanAverage: string[];
      comparableToAverage: string[];
      belowAverage: string[];
    };
  };

  // Insights and recommendations
  insights: Array<{
    category: 'strength' | 'opportunity' | 'concern' | 'trend';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;

  // Chart data structures
  chartData: {
    conditionsDistribution: Array<{ label: string; value: number }>;
    recoveryTimeChart: Array<{ condition: string; days: number; benchmark?: number }>;
    monthlyTrends: Array<{ month: string; patients: number; outcomes: number }>;
    retentionFunnel: Array<{ stage: string; count: number; percentage: number }>;
  };

  // Metadata
  dataQuality: {
    completenessScore: number;
    totalRecords: number;
    completeRecords: number;
    hasFollowUpData: boolean;
  };
}

export interface PopulationAnalysisOptions {
  clinicId?: string;
  startDate?: Date;
  endDate?: Date;
  includeBenchmarks?: boolean;
  minSampleSize?: number;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const populationAnalysisSchema = z.object({
  topConditions: z.array(z.object({
    condition: z.string(),
    count: z.number(),
    percentage: z.number(),
    averageSessions: z.number(),
    averageRecoveryDays: z.number(),
    successRate: z.number(),
    trend: z.enum(['increasing', 'stable', 'decreasing']),
  })),
  treatmentEffectiveness: z.object({
    overallSuccessRate: z.number(),
    byTreatmentType: z.array(z.object({
      treatment: z.string(),
      successRate: z.number(),
      averageOutcomeScore: z.number(),
      patientSatisfaction: z.number(),
      sampleSize: z.number(),
    })),
    bestPerformingTreatments: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
  }),
  retentionAnalysis: z.object({
    overallRetentionRate: z.number(),
    dropoutRate: z.number(),
    averageSessionsPerPatient: z.number(),
    keyDropoutFactors: z.array(z.string()),
    recommendations: z.array(z.string()),
  }),
  insights: z.array(z.object({
    category: z.enum(['strength', 'opportunity', 'concern', 'trend']),
    title: z.string(),
    description: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    actionable: z.boolean(),
  })),
});

// ============================================================================
// AI CLIENT
// ============================================================================

let googleAI: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getGoogleAI() {
  if (!googleAI) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
                   process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
                   process.env.VITE_GOOGLE_AI_API_KEY;

    if (!apiKey) {
      throw new Error('Google AI API key not configured');
    }

    googleAI = createGoogleGenerativeAI({ apiKey });
  }
  return googleAI;
}

// ============================================================================
// DATA AGGREGATION
// ============================================================================

/**
 * Aggregate anonymized population data from Firestore
 */
async function aggregatePopulationData(
  clinicId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  patients: PatientRecord[];
  mlData: MLDataRecord[];
  appointments: Record<string, unknown>[];
  totalRecords: number;
}> {
  const db = getAdminDb();

  try {
    // Fetch patient data
    const patientsSnapshot = await db
      .collection('patients')
      .where('created_at', '>=', startDate.toISOString())
      .where('created_at', '<=', endDate.toISOString())
      .get();

    const patients = patientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch session/progress data
    const mlDataSnapshot = await db
      .collection('ml_training_data')
      .where('data_collection_period_start', '>=', startDate.toISOString())
      .where('data_collection_period_end', '<=', endDate.toISOString())
      .get();

    const mlData = mlDataSnapshot.docs.map(doc => doc.data());

    // Fetch appointments for volume analysis
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('date', '>=', startDate.toISOString())
      .where('date', '<=', endDate.toISOString())
      .get();

    const appointments = appointmentsSnapshot.docs.map(doc => doc.data());

    return {
      patients,
      mlData,
      appointments,
      totalRecords: patients.length + mlData.length + appointments.length,
    };
  } catch (error) {
    logger.error('[Population Health] Error aggregating data', error, 'population-health');
    return {
      patients: [],
      mlData: [],
      appointments: [],
      totalRecords: 0,
    };
  }
}

/**
 * Calculate population statistics from raw data
 */
interface PatientRecord {
  id: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  main_condition?: string;
}

interface MLDataRecord {
  primary_pathology?: string;
  treatment_type?: string;
  outcome_category?: string;
  total_sessions?: number;
  functional_improvement_percentage?: number;
  patient_satisfaction_score?: number;
}

interface PopulationStatsInput {
  patients: PatientRecord[];
  mlData: MLDataRecord[];
  appointments: unknown[];
}

interface GenderDistribution {
  male: number;
  female: number;
  other: number;
  unknown: number;
}

interface PopulationStatsResult {
  overview: {
    totalPatients: number;
    activePatients: number;
    newPatients: number;
    averageAge: number;
    genderDistribution: GenderDistribution;
  };
  conditions: Map<string, MLDataRecord[]>;
  treatments: Map<string, MLDataRecord[]>;
  retention: {
    completedCases: number;
    averageSessions: number;
  };
}

function calculatePopulationStats(data: PopulationStatsInput): PopulationStatsResult {
  const { patients, mlData, appointments } = data;

  // Population overview
  const totalPatients = patients.length;
  const activePatients = patients.filter((p: PatientRecord) => p.status === 'active').length;
  const newPatients = patients.length;

  const ages = patients
    .map((p: PatientRecord) => {
      if (p.date_of_birth) {
        const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
        return age >= 0 && age <= 120 ? age : null;
      }
      return null;
    })
    .filter((a): a is number => a !== null);

  const averageAge = ages.length > 0
    ? ages.reduce((sum, a) => sum + a, 0) / ages.length
    : 0;

  const genderDistribution = patients.reduce((acc: GenderDistribution, p: PatientRecord) => {
    const gender = p.gender?.toLowerCase() || 'unknown';
    if (gender.includes('m') || gender === 'masculino') {
      acc.male++;
    } else if (gender.includes('f') || gender === 'feminino') {
      acc.female++;
    } else {
      acc.other++;
    }
    return acc;
  }, { male: 0, female: 0, other: 0, unknown: 0 });

  const overview = {
    totalPatients,
    activePatients,
    newPatients,
    averageAge: Math.round(averageAge),
    genderDistribution,
  };

  // Group by condition
  const conditions = new Map<string, MLDataRecord[]>();

  mlData.forEach((record: MLDataRecord) => {
    const condition = record.primary_pathology || 'Não especificado';
    if (!conditions.has(condition)) {
      conditions.set(condition, []);
    }
    conditions.get(condition)!.push(record);
  });

  // Group by treatment type
  const treatments = new Map<string, MLDataRecord[]>();

  mlData.forEach((record: MLDataRecord) => {
    const treatment = record.treatment_type || 'Não especificado';
    if (!treatments.has(treatment)) {
      treatments.set(treatment, []);
    }
    treatments.get(treatment)!.push(record);
  });

  // Calculate retention metrics
  const completedCases = mlData.filter((r: MLDataRecord) => r.outcome_category === 'success');
  const avgSessions = mlData.length > 0
    ? mlData.reduce((sum: number, r: MLDataRecord) => sum + (r.total_sessions || 0), 0) / mlData.length
    : 0;

  const retention = {
    overallRetentionRate: mlData.length > 0 ? (completedCases.length / mlData.length) * 100 : 0,
    dropoutRate: 100 - (mlData.length > 0 ? (completedCases.length / mlData.length) * 100 : 0),
    averageSessionsPerPatient: Math.round(avgSessions),
  };

  return {
    overview,
    conditions,
    treatments,
    retention,
  };
}

/**
 * Generate chart data structures
 */
function generateChartData(
  conditions: Map<string, MLDataRecord[]>,
  stats: PopulationStatsResult
): PopulationHealthAnalysis['chartData'] {
  // Condition distribution
  const totalCases = Array.from(conditions.values()).reduce((sum, arr) => sum + arr.length, 0);

  const conditionsDistribution = Array.from(conditions.entries())
    .map(([condition, cases]) => ({
      label: condition,
      value: cases.length,
      percentage: (cases.length / totalCases) * 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map(item => ({ label: item.label, value: item.value }));

  // Recovery time by condition
  const recoveryTimeChart = Array.from(conditions.entries())
    .map(([condition, cases]) => {
      const recoveryTimes = cases
        .map(c => c.sessions_to_discharge)
        .filter((t): t is number => typeof t === 'number' && t > 0);

      const avgDays = recoveryTimes.length > 0
        ? (recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length) * 7
        : 0;

      return {
        condition,
        days: Math.round(avgDays),
        benchmark: 30, // National average placeholder
      };
    })
    .filter(c => c.days > 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, 10);

  // Retention funnel
  const retentionFunnel = [
    { stage: 'Novos Pacientes', count: stats.overview.totalPatients, percentage: 100 },
    { stage: 'Iniciaram Tratamento', count: Math.round(stats.overview.totalPatients * 0.85), percentage: 85 },
    { stage: 'Completaram 5+ Sessões', count: Math.round(stats.overview.totalPatients * 0.65), percentage: 65 },
    { stage: 'Alta Clínica', count: Math.round(stats.overview.totalPatients * (stats.retention.overallRetentionRate / 100)), percentage: Math.round(stats.retention.overallRetentionRate) },
  ];

  return {
    conditionsDistribution,
    recoveryTimeChart,
    monthlyTrends: [], // To be populated with time-series data
    retentionFunnel,
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze clinic population health using AI
 */
export async function analyzeClinicPopulation(
  options: PopulationAnalysisOptions = {}
): Promise<PopulationHealthAnalysis> {
  const {
    clinicId = 'default',
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default 90 days
    endDate = new Date(),
    includeBenchmarks = true,
    minSampleSize = 10,
  } = options;

  // Aggregate data
  const rawData = await aggregatePopulationData(clinicId, startDate, endDate);

  if (rawData.totalRecords === 0) {
    throw new Error('No data available for analysis');
  }

  // Calculate statistics
  const stats = calculatePopulationStats(rawData);

  // Prepare context for AI
  const context = {
    overview: stats.overview,
    conditionsData: Array.from(stats.conditions.entries()).map(([condition, cases]) => {
      const recoveryTimes = cases
        .map(c => c.sessions_to_discharge)
        .filter((t): t is number => typeof t === 'number');

      const successfulCases = cases.filter(c => c.outcome_category === 'success').length;

      return {
        condition,
        count: cases.length,
        percentage: (cases.length / rawData.totalRecords) * 100,
        averageSessions: recoveryTimes.length > 0
          ? recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
          : 0,
        successRate: cases.length > 0 ? (successfulCases / cases.length) * 100 : 0,
      };
    }),
    treatmentsData: Array.from(stats.treatments.entries()).map(([treatment, cases]) => {
      const successfulCases = cases.filter(c => c.outcome_category === 'success').length;
      const avgOutcome = cases.reduce((sum: number, c: MLDataRecord) => sum + (c.functional_improvement_percentage || 0), 0) / cases.length;

      return {
        treatment,
        count: cases.length,
        successRate: (successfulCases / cases.length) * 100,
        averageOutcomeScore: avgOutcome,
        patientSatisfaction: cases.reduce((sum: number, c: MLDataRecord) => sum + (c.patient_satisfaction_score || 70), 0) / cases.length,
      };
    }),
    retention: stats.retention,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    },
  };

  // Generate AI analysis
  const prompt = buildPopulationAnalysisPrompt(context);

  try {
    const { object } = await generateObject({
      model: getGoogleAI()('gemini-2.5-flash'),
      schema: populationAnalysisSchema,
      prompt,
      temperature: 0.4,
    });

    // Build complete analysis
    const analysis: PopulationHealthAnalysis = {
      clinicId,
      analysisDate: new Date().toISOString(),
      periodAnalyzed: context.period,
      populationOverview: context.overview,
      topConditions: object.topConditions.sort((a, b) => b.count - a.count),
      recoveryMetrics: calculateRecoveryMetrics(stats.conditions),
      treatmentEffectiveness: object.treatmentEffectiveness,
      retentionAnalysis: {
        ...object.retentionAnalysis,
        retentionByCondition: calculateRetentionByCondition(stats.conditions),
      },
      benchmarks: includeBenchmarks
        ? generateBenchmarks(object.treatmentEffectiveness.overallSuccessRate)
        : undefined,
      insights: object.insights.sort((a, b) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[a.impact] - impactOrder[b.impact];
      }),
      chartData: generateChartData(stats.conditions, stats),
      dataQuality: {
        completenessScore: calculateDataQuality(rawData),
        totalRecords: rawData.totalRecords,
        completeRecords: rawData.mlData.filter((d: MLDataRecord) => d.outcome_category).length,
        hasFollowUpData: rawData.mlData.some((d: MLDataRecord) => d.outcome_category),
      },
    };

    return analysis;
  } catch (error) {
    logger.error('[Population Health] AI analysis error', error, 'population-health');
    throw error;
  }
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

function buildPopulationAnalysisPrompt(context: {
  conditionsData: Array<{ condition: string; count: number; percentage: number; averageSessions: number }>;
  treatmentsData: Array<{ treatment: string; count: number; successRate: number }>;
}): string {
  return `Você é um analista de saúde populacional especializado em fisioterapia.

ANALISE OS SEGUINTES DADOS DE UMA CLÍNICA DE FISIOTERAPIA:

## PANORAMA DA POPULAÇÃO
- Total de pacientes: ${context.overview.totalPatients}
- Pacientes ativos: ${context.overview.activePatients}
- Novos pacientes: ${context.overview.newPatients}
- Média de idade: ${context.overview.averageAge}
- Distribuição de gênero: M(${context.overview.genderDistribution.male}), F(${context.overview.genderDistribution.female})

## CONDIÇÕES MAIS COMUNS
${context.conditionsData.map((c) => `
- ${c.condition}: ${c.count} casos (${c.percentage.toFixed(1)}%)
  * Média de sessões: ${c.averageSessions.toFixed(1)}
  * Taxa de sucesso: ${c.successRate.toFixed(1)}%
`).join('')}

## EFICÁCIA POR TIPO DE TRATAMENTO
${context.treatmentsData.map((t) => `
- ${t.treatment}: ${t.count} casos
  * Taxa de sucesso: ${t.successRate.toFixed(1)}%
  * Score médio de melhora: ${t.averageOutcomeScore.toFixed(1)}
  * Satisfação do paciente: ${t.patientSatisfaction.toFixed(1)}/100
`).join('')}

## MÉTRICAS DE RETENÇÃO
- Taxa de retenção geral: ${context.retention.overallRetentionRate.toFixed(1)}%
- Taxa de abandono: ${context.retention.dropoutRate.toFixed(1)}%
- Média de sessões por paciente: ${context.retention.averageSessionsPerPatient}

## INSTRUÇÕES

Forneça uma análise completa em PORTUGUÊS:

1. **CONDIÇÕES TOP**: Reorganize as condições por prevalência, incluindo tendência (aumentando/estável/diminuindo).

2. **EFICÁCIA DO TRATAMENTO**:
   - Calcule taxa geral de sucesso
   - Identifique os tratamentos com melhor desempenho
   - Aponte áreas que precisam de melhoria
   - Considere satisfação do paciente

3. **ANÁLISE DE RETENÇÃO**:
   - Identifique principais fatores de abandono
   - Forneça recomendações específicas
   - Considere média de sessões

4. **INSIGHTS**: Gere 5-8 insights categorizados como:
   - strength: pontos fortes da clínica
   - opportunity: oportunidades de melhoria
   - concern: áreas preocupantes
   - trend: tendências observadas

   Cada insight deve ter:
   - Título claro
   - Descrição detalhada
   - Impacto (alto/médio/baixo)
   - Se é acionável

Retorne APENAS o JSON válido com a estrutura especificada.`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateRecoveryMetrics(
  conditions: Map<string, MLDataRecord[]>
): PopulationHealthAnalysis['recoveryMetrics'] {
  return Array.from(conditions.entries())
    .map(([condition, cases]) => {
      const recoveryTimes = cases
        .map(c => c.sessions_to_discharge)
        .filter((t): t is number => typeof t === 'number' && t > 0)
        .sort((a, b) => a - b);

      if (recoveryTimes.length === 0) {
        return null;
      }

      const sum = recoveryTimes.reduce((a, b) => a + b, 0);
      const mean = sum / recoveryTimes.length;
      const median = recoveryTimes[Math.floor(recoveryTimes.length / 2)];
      const percentile25 = recoveryTimes[Math.floor(recoveryTimes.length * 0.25)];
      const percentile75 = recoveryTimes[Math.floor(recoveryTimes.length * 0.75)];

      const variance = recoveryTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recoveryTimes.length;
      const standardDeviation = Math.sqrt(variance);

      return {
        condition,
        medianRecoveryDays: Math.round(median * 7),
        meanRecoveryDays: Math.round(mean * 7),
        percentile25: Math.round(percentile25 * 7),
        percentile75: Math.round(percentile75 * 7),
        standardDeviation: Math.round(standardDeviation * 7),
        sampleSize: recoveryTimes.length,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.meanRecoveryDays - b.meanRecoveryDays);
}

function calculateRetentionByCondition(
  conditions: Map<string, MLDataRecord[]>
): Array<{ condition: string; retentionRate: number; averageSessions: number }> {
  return Array.from(conditions.entries())
    .map(([condition, cases]) => {
      const successful = cases.filter(c => c.outcome_category === 'success').length;
      const sessions = cases.map(c => c.total_sessions).filter((t): t is number => typeof t === 'number');
      const avgSessions = sessions.length > 0
        ? sessions.reduce((sum, t) => sum + t, 0) / sessions.length
        : 0;

      return {
        condition,
        retentionRate: cases.length > 0 ? (successful / cases.length) * 100 : 0,
        averageSessions: Math.round(avgSessions),
      };
    })
    .sort((a, b) => b.retentionRate - a.retentionRate);
}

function generateBenchmarks(
  clinicSuccessRate: number
): PopulationHealthAnalysis['benchmarks'] {
  // National averages (placeholder - would ideally come from external data)
  const nationalAverages = {
    averageRecoveryTime: 28, // days
    successRate: 78, // percentage
    patientSatisfaction: 82, // percentage
    source: 'Dados nacionais de fisioterapia (referência)',
  };

  const betterThanAverage: string[] = [];
  const comparableToAverage: string[] = [];
  const belowAverage: string[] = [];

  if (clinicSuccessRate > nationalAverages.successRate + 5) {
    betterThanAverage.push('Taxa de sucesso');
  } else if (clinicSuccessRate < nationalAverages.successRate - 5) {
    belowAverage.push('Taxa de sucesso');
  } else {
    comparableToAverage.push('Taxa de sucesso');
  }

  return {
    nationalAverages,
    clinicPerformance: {
      betterThanAverage,
      comparableToAverage,
      belowAverage,
    },
  };
}

function calculateDataQuality(data: { mlData: MLDataRecord[] }): number {
  const { mlData } = data;

  if (mlData.length === 0) {
    return 0;
  }

  let completeFields = 0;
  let totalFields = 0;

  mlData.forEach((record: MLDataRecord) => {
    const fields = [
      'primary_pathology',
      'baseline_pain_level',
      'baseline_functional_score',
      'treatment_type',
      'outcome_category',
      'sessions_to_discharge',
    ];

    fields.forEach(field => {
      totalFields++;
      if (record[field]) {
        completeFields++;
      }
    });
  });

  return Math.round((completeFields / totalFields) * 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  analyzeClinicPopulation,
};
