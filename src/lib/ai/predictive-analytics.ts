/**
 * Predictive Analytics for Patient Recovery
 *
 * Uses Firebase AI Logic (gemini-2.5-pro) to predict:
 * - Recovery timeline with confidence intervals
 * - Key milestones and checkpoints
 * - Risk factors for delayed recovery
 * - Treatment intensity recommendations
 * - Similar case analysis from database
 *
 * @module lib/ai/predictive-analytics
 * @version 1.0.0
 */


// ============================================================================
// TYPES
// ============================================================================

import { getAdminDb } from '@/lib/firebase/admin';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface RecoveryPrediction {
  patientId: string;
  condition: string;
  predictedAt: string;

  // Timeline predictions
  predictedRecoveryDate: string;
  confidenceInterval: {
    lower: string; // Pessimistic case date
    upper: string; // Optimistic case date
    lowerDays: number;
    expectedDays: number;
    upperDays: number;
  };
  confidenceScore: number; // 0-1

  // Milestones
  milestones: Array<{
    name: string;
    description: string;
    expectedDate: string;
    sessionNumber?: number;
    achieved: boolean;
    criteria: string[];
  }>;

  // Risk factors
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    mitigation?: string;
  }>;

  // Treatment recommendations
  treatmentRecommendations: {
    optimalFrequency: string;
    sessionsPerWeek: number;
    estimatedTotalSessions: number;
    intensity: 'low' | 'moderate' | 'high';
    focusAreas: string[];
  };

  // Similar cases
  similarCases: {
    totalAnalyzed: number;
    matchingCriteria: string[];
    averageRecoveryTime: number;
    successRate: number;
    keyInsights: string[];
  };

  // Statistical info
  modelVersion: string;
  dataSource: 'clinical' | 'historical' | 'hybrid';
  requiresValidation: boolean;
}

export interface PredictionInput {
  patientId: string;
  patientProfile: {
    age: number;
    gender: string;
    chronicCondition?: boolean;
    baselinePainLevel: number;
    baselineFunctionalScore: number;
    mainComplaint: string;
    comorbidities?: string[];
    previousTreatments?: string[];
  };
  currentCondition: {
    primaryPathology: string;
    secondaryPathologies?: string[];
    onsetDate: string;
    acuteOrChronic: 'acute' | 'subacute' | 'chronic';
    bodyParts: string[];
  };
  treatmentContext: {
    sessionsCompleted: number;
    currentFrequency: string;
    treatmentType: string;
    techniquesUsed: string[];
    therapistNotes?: string;
  };
  progressData?: {
    painLevelHistory: Array<{ date: string; level: number }>;
    functionalScores: Array<{ date: string; score: number }>;
    attendanceRate: number;
    homeExerciseCompliance?: number;
  };
}

// ============================================================================
// ZOD SCHEMAS FOR AI OUTPUT
// ============================================================================

const recoveryPredictionSchema = z.object({
  predictedRecoveryDate: z.string().describe('ISO date string for expected recovery'),
  confidenceInterval: z.object({
    lowerDays: z.number().describe('Days for pessimistic case'),
    expectedDays: z.number().describe('Days for expected case'),
    upperDays: z.number().describe('Days for optimistic case'),
  }),
  confidenceScore: z.number().min(0).max(1).describe('Confidence in prediction (0-1)'),
  milestones: z.array(z.object({
    name: z.string(),
    description: z.string(),
    expectedDays: z.number(),
    sessionNumber: z.number().optional(),
    criteria: z.array(z.string()),
  })),
  riskFactors: z.array(z.object({
    factor: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    mitigation: z.string().optional(),
  })),
  treatmentRecommendations: z.object({
    sessionsPerWeek: z.number(),
    estimatedTotalSessions: z.number(),
    intensity: z.enum(['low', 'moderate', 'high']),
    focusAreas: z.array(z.string()),
  }),
  similarCasesInsights: z.array(z.string()),
});

// ============================================================================
// AI CLIENT SETUP
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
// DATA FETCHING
// ============================================================================

/**
 * Fetch anonymized similar cases from Firestore
 */
interface SimilarCase {
  id: string;
  primary_pathology: string;
  age_group: string;
  sessions_to_discharge?: number;
  outcome_category?: string;
  pain_reduction_percentage?: number;
}

async function fetchSimilarCases(
  condition: string,
  ageRange: { min: number; max: number },
  limit: number = 50
): Promise<SimilarCase[]> {
  const db = getAdminDb();

  try {
    // Query similar cases from anonymized predictions collection
    const snapshot = await db
      .collection('ml_training_data')
      .where('primary_pathology', '==', condition)
      .where('age_group', '>=', ageRange.min.toString())
      .where('age_group', '<=', ageRange.max.toString())
      .limit(limit)
      .get();

    if (snapshot.empty) {
      // Fallback to all cases with same condition
      const fallbackSnapshot = await db
        .collection('ml_training_data')
        .where('primary_pathology', '==', condition)
        .limit(limit * 2)
        .get();

      return fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    logger.error('[Predictive Analytics] Error fetching similar cases', error, 'predictive-analytics');
    return [];
  }
}

/**
 * Calculate statistics from similar cases
 */
function calculateSimilarCaseStats(cases: SimilarCase[]) {
  if (cases.length === 0) {
    return {
      totalAnalyzed: 0,
      averageRecoveryTime: 0,
      successRate: 0,
      keyInsights: ['Dados insuficientes para comparação'],
    };
  }

  const recoveryTimes = cases
    .map(c => c.sessions_to_discharge)
    .filter((t): t is number => typeof t === 'number');

  const averageRecoveryTime = recoveryTimes.length > 0
    ? recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
    : 0;

  const successfulCases = cases.filter(c => c.outcome_category === 'success').length;
  const successRate = (successfulCases / cases.length) * 100;

  // Generate insights from data
  const keyInsights: string[] = [];

  if (averageRecoveryTime > 0) {
    keyInsights.push(`Tempo médio de recuperação: ${Math.round(averageRecoveryTime)} sessões`);
  }

  if (successRate > 80) {
    keyInsights.push('Alta taxa de sucesso para esta condição');
  } else if (successRate > 60) {
    keyInsights.push('Taxa de sucesso moderada para esta condição');
  } else {
    keyInsights.push('Condição desafiadora com resultados variados');
  }

  const avgPainReduction = cases
    .map(c => c.pain_reduction_percentage)
    .filter((p): p is number => typeof p === 'number')
    .reduce((sum, p) => sum + p, 0) / cases.length;

  if (!isNaN(avgPainReduction)) {
    keyInsights.push(`Redução média de dor: ${avgPainReduction.toFixed(0)}%`);
  }

  return {
    totalAnalyzed: cases.length,
    averageRecoveryTime: Math.round(averageRecoveryTime),
    successRate: Math.round(successRate),
    keyInsights,
  };
}

// ============================================================================
// MAIN PREDICTION FUNCTION
// ============================================================================

/**
 * Generate recovery prediction using AI
 */
export async function predictRecoveryTimeline(
  input: PredictionInput
): Promise<RecoveryPrediction> {
  const { patientId, patientProfile, currentCondition, treatmentContext, progressData } = input;

  // Fetch similar cases
  const ageRange = {
    min: Math.max(18, patientProfile.age - 10),
    max: Math.min(80, patientProfile.age + 10),
  };

  const similarCases = await fetchSimilarCases(
    currentCondition.primaryPathology,
    ageRange,
    50
  );

  const similarCaseStats = calculateSimilarCaseStats(similarCases);

  // Prepare context for AI
  const context = {
    patient: {
      ...patientProfile,
      ageGroup: patientProfile.age < 30 ? 'jovem' :
                patientProfile.age < 50 ? 'adulto' :
                patientProfile.age < 65 ? 'meia-idade' : 'idoso',
    },
    condition: currentCondition,
    treatment: treatmentContext,
    progress: progressData || {
      painLevelHistory: [],
      functionalScores: [],
      attendanceRate: 1,
    },
    similarCasesData: similarCaseStats,
  };

  // Generate prediction with AI
  const prompt = buildPredictionPrompt(context);

  try {
    const { object } = await generateObject({
      model: getGoogleAI()('gemini-2.5-pro'),
      schema: recoveryPredictionSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more accurate predictions
    });

    // Process and format the prediction
    const now = new Date();
    const expectedDate = new Date(now);
    expectedDate.setDate(expectedDate.getDate() + object.confidenceInterval.expectedDays);

    const lowerDate = new Date(now);
    lowerDate.setDate(lowerDate.getDate() + object.confidenceInterval.lowerDays);

    const upperDate = new Date(now);
    upperDate.setDate(upperDate.getDate() + object.confidenceInterval.upperDays);

    // Format milestones with dates
    const milestones = object.milestones.map(m => {
      const milestoneDate = new Date(now);
      milestoneDate.setDate(milestoneDate.getDate() + m.expectedDays);

      return {
        ...m,
        expectedDate: milestoneDate.toISOString(),
        achieved: false,
      };
    });

    const prediction: RecoveryPrediction = {
      patientId,
      condition: currentCondition.primaryPathology,
      predictedAt: now.toISOString(),
      predictedRecoveryDate: expectedDate.toISOString(),
      confidenceInterval: {
        lower: lowerDate.toISOString(),
        upper: upperDate.toISOString(),
        lowerDays: object.confidenceInterval.lowerDays,
        expectedDays: object.confidenceInterval.expectedDays,
        upperDays: object.confidenceInterval.upperDays,
      },
      confidenceScore: object.confidenceScore,
      milestones,
      riskFactors: object.riskFactors,
      treatmentRecommendations: {
        ...object.treatmentRecommendations,
        optimalFrequency: `${object.treatmentRecommendations.sessionsPerWeek}x por semana`,
      },
      similarCases: {
        ...similarCaseStats,
        matchingCriteria: [
          `Patologia: ${currentCondition.primaryPathology}`,
          `Faixa etária: ${ageRange.min}-${ageRange.max} anos`,
          similarCases.length > 0 ? `Dados de ${similarCases.length} casos similares` : 'Dados limitados',
        ],
      },
      modelVersion: 'gemini-2.5-pro-v1',
      dataSource: similarCases.length > 10 ? 'clinical' : 'hybrid',
      requiresValidation: similarCases.length < 10,
    };

    // Store prediction in Firestore
    await storePrediction(patientId, prediction);

    return prediction;
  } catch (error) {
    logger.error('[Predictive Analytics] AI prediction error', error, 'predictive-analytics');

    // Fallback to statistical prediction
    return generateFallbackPrediction(patientId, currentCondition, similarCaseStats);
  }
}

// ============================================================================
// PROMPT BUILDER
// ============================================================================

// Type for prediction context
interface PredictionContext {
  patient: PredictionInput['patientProfile'] & { ageGroup: string };
  condition: PredictionInput['currentCondition'];
  treatment: PredictionInput['treatmentContext'];
  progress: PredictionInput['progressData'] & { painLevelHistory: Array<{ date: string; level: number }>; functionalScores: Array<{ date: string; score: number }>; attendanceRate: number };
  similarCasesData: ReturnType<typeof calculateSimilarCaseStats>;
}

function buildPredictionPrompt(context: PredictionContext): string {
  return `Você é um sistema especializado em prever tempo de recuperação para fisioterapia.

ANÁLISE ESTE CASO CLÍNICO E FORNEÇA PREVISÕES BASEADAS EM EVIDÊNCIAS:

## PACIENTE
- Idade: ${context.patient.age} (${context.patient.ageGroup})
- Gênero: ${context.patient.gender}
- Condição crônica: ${context.patient.chronicCondition ? 'Sim' : 'Não'}
- Nível de dor inicial: ${context.patient.baselinePainLevel}/10
- Score funcional inicial: ${context.patient.baselineFunctionalScore}/100
- Queixa principal: ${context.patient.mainComplaint}
${context.patient.comorbidities ? `- Comorbidades: ${context.patient.comorbidities.join(', ')}` : ''}

## CONDIÇÃO ATUAL
- Patologia primária: ${context.condition.primaryPathology}
${context.condition.secondaryPathologies ? `- Patologias secundárias: ${context.condition.secondaryPathologies.join(', ')}` : ''}
- Início: ${context.condition.onsetDate}
- Tipo: ${context.condition.acuteOrChronic}
- Regiões afetadas: ${context.condition.bodyParts.join(', ')}

## TRATAMENTO ATUAL
- Sessões completas: ${context.treatment.sessionsCompleted}
- Frequência atual: ${context.treatment.currentFrequency}
- Tipo de tratamento: ${context.treatment.treatmentType}
- Técnicas utilizadas: ${context.treatment.techniquesUsed.join(', ')}
${context.treatment.therapistNotes ? `- Notas do terapeuta: ${context.treatment.therapistNotes}` : ''}

## PROGRESSO
${context.progress.painLevelHistory.length > 0 ? `- Histórico de dor: ${context.progress.painLevelHistory.length} medições` : '- Sem histórico de dor'}
${context.progress.functionalScores.length > 0 ? `- Scores funcionais: ${context.progress.functionalScores.length} medições` : '- Sem scores funcionais'}
- Taxa de comparecimento: ${(context.progress.attendanceRate * 100).toFixed(0)}%
${context.progress.homeExerciseCompliance ? `- Adesão aos exercícios: ${(context.progress.homeExerciseCompliance * 100).toFixed(0)}%` : ''}

## DADOS DE CASOS SIMILARES
${context.similarCasesData.totalAnalyzed > 0 ? `
- Casos analisados: ${context.similarCasesData.totalAnalyzed}
- Tempo médio de recuperação: ${context.similarCasesData.averageRecoveryTime} sessões
- Taxa de sucesso: ${context.similarCasesData.successRate}%
- Insights: ${context.similarCasesData.keyInsights.join('; ')}
` : 'Dados limitados de casos similares'}

## INSTRUÇÕES

Forneça uma previsão completa respondendo em PORTUGUÊS:

1. **PREVISÃO DE TEMPO**: Estime dias para recuperação em três cenários:
   - Caso pessimista (complicações possíveis)
   - Caso esperado (baseado na média)
   - Caso otimista (resposta favorável)

2. **MARCOS DE RECUPERAÇÃO**: Defina 4-6 marcos importantes como:
   - Redução inicial de dor
   - Melhora funcional
   - Retorno às atividades diárias
   - Alta clínica

3. **FATORES DE RISCO**: Identifique 3-5 fatores que podem atrasar a recuperação, com impacto (alto/médio/baixo) e possíveis mitigações.

4. **RECOMENDAÇÕES DE TRATAMENTO**:
   - Frequência semanal ideal
   - Número total estimado de sessões
   - Intensidade (baixa/moderada/alta)
   - Áreas de foco

5. **NÍVEL DE CONFIANÇA**: 0-1 indicando o quão confiante você está na previsão

Considere:
- Condições crônicas levam mais tempo
- Comparecimento irregular piora prognóstico
- Resposta inicial ao tratamento é indicador importante
- Idade avançada pode retardar recuperação
- Comorbidades complicam prognóstico

Retorne APENAS o JSON válido com a estrutura especificada.`;
}

// ============================================================================
// FALLBACK PREDICTION
// ============================================================================

function generateFallbackPrediction(
  patientId: string,
  condition: PredictionInput['currentCondition'],
  similarStats: ReturnType<typeof calculateSimilarCaseStats>
): RecoveryPrediction {
  const now = new Date();

  // Conservative estimates based on condition type
  let baseDays = 30; // Default 30 days
  const conditionLower = condition.primaryPathology.toLowerCase();

  if (conditionLower.includes('aguda') || conditionLower.includes('agudo')) {
    baseDays = 14;
  } else if (conditionLower.includes('crônica') || conditionLower.includes('crônico')) {
    baseDays = 60;
  } else if (conditionLower.includes('lombalgia') || conditionLower.includes('dor lombar')) {
    baseDays = 21;
  } else if (conditionLower.includes('lesão') || conditionLower.includes('entorse')) {
    baseDays = 28;
  } else if (conditionLower.includes('pós-operatório') || conditionLower.includes('pos-operatorio')) {
    baseDays = 45;
  }

  const expectedDays = similarStats.averageRecoveryTime > 0
    ? similarStats.averageRecoveryTime * 7 // Convert sessions to days
    : baseDays;

  const lowerDate = new Date(now);
  lowerDate.setDate(lowerDate.getDate() + Math.round(expectedDays * 1.3));

  const upperDate = new Date(now);
  upperDate.setDate(upperDate.getDate() + Math.round(expectedDays * 0.7));

  const expectedDate = new Date(now);
  expectedDate.setDate(expectedDate.getDate() + Math.round(expectedDays));

  return {
    patientId,
    condition: condition.primaryPathology,
    predictedAt: now.toISOString(),
    predictedRecoveryDate: expectedDate.toISOString(),
    confidenceInterval: {
      lower: lowerDate.toISOString(),
      upper: upperDate.toISOString(),
      lowerDays: Math.round(expectedDays * 0.7),
      expectedDays: Math.round(expectedDays),
      upperDays: Math.round(expectedDays * 1.3),
    },
    confidenceScore: similarStats.totalAnalyzed > 10 ? 0.7 : 0.5,
    milestones: [
      {
        name: 'Redução inicial de dor',
        description: 'Redução de 30% no nível de dor basal',
        expectedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        criteria: ['Nível de dor < 70% do basal', 'Melhora subjetiva relatada'],
        achieved: false,
      },
      {
        name: 'Melhora funcional',
        description: 'Aumento significativo na funcionalidade',
        expectedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        criteria: ['Score funcional aumentado', 'Maior amplitude de movimento'],
        achieved: false,
      },
      {
        name: 'Alta clínica',
        description: 'Retorno às atividades normais',
        expectedDate: expectedDate.toISOString(),
        criteria: ['Dor mínima ou ausente', 'Funcionalidade restaurada', 'Metas atingidas'],
        achieved: false,
      },
    ],
    riskFactors: [
      {
        factor: 'Dados limitados',
        impact: 'medium',
        description: 'Poucos casos similares disponíveis para análise',
        mitigation: 'Reavalie conforme mais dados forem coletados',
      },
    ],
    treatmentRecommendations: {
      optimalFrequency: '2x por semana',
      sessionsPerWeek: 2,
      estimatedTotalSessions: Math.round(expectedDays / 3.5),
      intensity: 'moderate',
      focusAreas: [condition.primaryPathology],
    },
    similarCases: similarStats,
    modelVersion: 'statistical-fallback-v1',
    dataSource: 'historical',
    requiresValidation: true,
  };
}

// ============================================================================
// STORAGE
// ============================================================================

async function storePrediction(
  patientId: string,
  prediction: RecoveryPrediction
): Promise<void> {
  const db = getAdminDb();

  try {
    await db.collection('patient_predictions').add({
      patient_id: patientId,
      prediction_type: 'recovery_timeline',
      prediction_date: new Date().toISOString(),
      features: {
        condition: prediction.condition,
        predictedAt: prediction.predictedAt,
      },
      predicted_value: prediction.confidenceInterval.expectedDays,
      confidence_score: prediction.confidenceScore,
      confidence_interval: prediction.confidenceInterval,
      target_date: prediction.predictedRecoveryDate,
      timeframe_days: prediction.confidenceInterval.expectedDays,
      model_version: prediction.modelVersion,
      model_name: 'RecoveryPredictor',
      is_active: true,
      created_at: new Date().toISOString(),
    });

    logger.info(`[Predictive Analytics] Prediction stored for patient ${patientId}`, undefined, 'predictive-analytics');
  } catch (error) {
    logger.error('[Predictive Analytics] Error storing prediction', error, 'predictive-analytics');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  predictRecoveryTimeline,
};
