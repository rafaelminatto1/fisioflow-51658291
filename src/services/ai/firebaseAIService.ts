/**
 * AI Service - Migrated to Workers/Neon
 */

import { aiApi } from '@/lib/api/workers-client';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface ClinicalChatInput {
  message: string;
  context?: {
    patientId?: string;
    patientName?: string;
    condition?: string;
    sessionCount?: number;
    recentEvolutions?: Array<{ date: string; notes: string }>;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ClinicalChatResponse {
  response: string;
}

async function callAIService<TInput extends Record<string, unknown>, TOutput>(action: string, data: TInput): Promise<TOutput> {
  const result = await aiApi.service<TInput, TOutput>(action, data);
  return result.data;
}

export async function getClinicalInsights(prompt: string, options: {
  patientId?: string;
  patientName?: string;
  language?: string;
}): Promise<string> {
  const result = await callAIService<ClinicalChatInput, { response: string }>('clinicalChat', {
    message: prompt,
    context: {
      patientId: options.patientId,
      patientName: options.patientName,
      condition: options.patientName,
      sessionCount: 0,
    },
  });
  return result.response;
}

export async function getTreatmentRecommendations(prompt: string, options: {
  patientId?: string;
  patientName?: string;
  diagnosis?: string;
  primaryComplaint?: string;
  sessionCount?: number;
  language?: string;
}): Promise<string> {
  const result = await callAIService<ClinicalChatInput, { response: string }>('clinicalChat', {
    message: prompt,
    context: {
      patientId: options.patientId,
      patientName: options.patientName,
      condition: options.diagnosis || options.primaryComplaint,
      sessionCount: options.sessionCount ?? 0,
    },
  });
  return result.response;
}

export async function chatWithClinicalAssistant(input: ClinicalChatInput): Promise<string> {
  const result = await callAIService<ClinicalChatInput, ClinicalChatResponse>('clinicalChat', input);
  return result.response;
}

export interface ExerciseSuggestionInput {
  patientId: string;
  goals: string[];
  availableEquipment?: string[];
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  painMap?: Record<string, number>;
}

export interface ExerciseSuggestionResponse {
  success: boolean;
  data?: {
    exercises: Array<{
      exerciseId?: string;
      name: string;
      category?: string;
      difficulty?: string;
      rationale: string;
      targetArea: string;
      goalsAddressed: string[];
      sets?: number;
      reps?: number;
      duration?: number;
      frequency?: string;
      precautions?: string[];
      confidence: number;
    }>;
    programRationale: string;
    expectedOutcomes: string[];
    progressionCriteria: string[];
  };
  error?: string;
}

export async function getExerciseSuggestions(input: ExerciseSuggestionInput): Promise<ExerciseSuggestionResponse> {
  return callAIService<ExerciseSuggestionInput, ExerciseSuggestionResponse>('exerciseSuggestion', input);
}

export interface GenerateExercisePlanInput {
  patientName: string;
  age?: number;
  condition: string;
  painLevel: number;
  equipment: string[];
  goals: string;
  limitations?: string;
}

export interface ExercisePlanResponse {
  planName: string;
  goal: string;
  frequency: string;
  durationWeeks: number;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: string;
    notes?: string;
    videoQuery: string;
  }>;
  warmup: string;
  cooldown: string;
}

export async function generateExercisePlanWithIA(input: GenerateExercisePlanInput): Promise<ExercisePlanResponse> {
  return callAIService<GenerateExercisePlanInput, ExercisePlanResponse>('generateExercisePlan', input);
}

export interface ClinicalAnalysisInput {
  patientId: string;
  currentSOAP: {
    subjective?: string;
    objective?: unknown;
    assessment?: string;
    plan?: unknown;
    vitalSigns?: Record<string, unknown>;
    functionalTests?: Record<string, unknown>;
  };
  useGrounding?: boolean;
  treatmentDurationWeeks?: number;
  redFlagCheckOnly?: boolean;
}

export async function getClinicalAnalysis(input: ClinicalAnalysisInput) {
  return callAIService('clinicalAnalysis', input);
}

export interface SoapGenerationInput {
  patientContext: {
    patientName: string;
    condition: string;
    sessionNumber: number;
  };
  subjective?: string;
  objective?: string;
  assistantNeeded: 'assessment' | 'plan' | 'both' | 'full';
}

export interface SoapGenerationResponse {
  success: boolean;
  soapNote?: string;
  timestamp: string;
}

export async function generateSOAPNote(input: SoapGenerationInput): Promise<SoapGenerationResponse> {
  return callAIService<SoapGenerationInput, SoapGenerationResponse>('soapNoteChat', input);
}

export async function analyzeMovement(input: { videoData?: string; patientId?: string; context?: string }) {
  return callAIService('movementAnalysis', input);
}

export async function transcribeAudioBlob(blob: Blob, mimeType: string): Promise<{ transcription: string }> {
  const audioData = await blobToBase64(blob);
  const result = await aiApi.transcribeAudio({
    audioData,
    mimeType: mimeType || 'audio/webm',
    languageCode: 'pt-BR',
    context: 'medical',
  });
  return { transcription: result.data.transcription };
}

export async function analyzePainEvolution(patientId: string, currentPainLevel: number): Promise<Record<string, unknown>> {
  const response = await chatWithClinicalAssistant({
    message: `Analisar evolução da dor. Nível atual ${currentPainLevel}/10.`,
    context: { patientId, sessionCount: 0 },
  });
  return {
    overallTrend: currentPainLevel <= 3 ? 'improving' : currentPainLevel >= 7 ? 'worsening' : 'stable',
    trendDescription: response,
    keyFindings: [response],
    clinicalAlerts: currentPainLevel >= 8 ? ['Dor intensa relatada, revisar red flags.'] : [],
    globalPainChange: 0,
    percentageChange: 0,
    positiveIndicators: currentPainLevel <= 3 ? ['Dor em faixa controlada.'] : [],
  };
}

export async function predictRecovery(
  patientId: string,
  patientProfile: Record<string, unknown>,
  currentCondition: Record<string, unknown>,
  treatmentContext: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await chatWithClinicalAssistant({
    message: `Estimar recuperação com base em ${JSON.stringify({ patientProfile, currentCondition, treatmentContext })}`,
    context: { patientId, sessionCount: Number(treatmentContext.sessionsCompleted ?? 0) },
  });
  return {
    predictedRecoveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    confidenceScore: 0.7,
    milestones: [],
    riskFactors: [],
    treatmentRecommendations: {
      sessionsPerWeek: 2,
      estimatedTotalSessions: 12,
      intensity: 'moderate',
      focusAreas: [],
      rationale: response,
    },
    confidenceInterval: { lower: '', upper: '', expectedDays: 30 },
  };
}

export async function evaluateTreatmentResponse(
  patientId: string,
  sessionsCompleted: number,
  currentPainLevel: number,
): Promise<Record<string, unknown>> {
  const response = await chatWithClinicalAssistant({
    message: `Avaliar resposta ao tratamento após ${sessionsCompleted} sessões e dor ${currentPainLevel}/10.`,
    context: { patientId, sessionCount: sessionsCompleted },
  });
  return {
    responseRating: currentPainLevel <= 3 ? 'positive' : currentPainLevel >= 7 ? 'negative' : 'neutral',
    summary: response,
    recommendations: [],
    nextSteps: [],
  };
}

export interface SemanticSearchResponse {
  success: boolean;
  query: string;
  results: Array<{
    id: string;
    patient_id: string;
    record_date: string | Date;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    score?: number;
  }>;
}

export async function findSimilarClinicalRecords(query: string, limit: number = 5): Promise<SemanticSearchResponse> {
  const result = await callAIService<{ query: string; limit: number }, SemanticSearchResponse>('semanticSearch', { query, limit });
  return result;
}
