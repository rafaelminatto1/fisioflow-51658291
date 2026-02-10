/**
 * Firebase AI Service
 *
 * Wrapper para Cloud Functions de IA do Firebase/Google Cloud.
 * OTIMIZAÇÃO FASE 3: Usa aiService unificado ao invés de funções individuais.
 * Reduz de 13 serviços Cloud Run para 1, economizando ~R$ 15-20/mês.
 */

import { httpsCallable } from 'firebase/functions';
import { functionsInstance, callFunctionHttp } from '@/integrations/firebase/functions';

const functions = functionsInstance;

// ============================================================================
// UNIFIED AI SERVICE WRAPPER
// ============================================================================

/**
 * Wrapper genérico para o aiService unificado.
 * Todas as chamadas AI passam por esta única função.
 */
async function callAIService<TInput = unknown, TOutput = unknown>(action: string, data: TInput): Promise<TOutput> {
  const fn = httpsCallable<{ action: string; data: TInput }, TOutput>(functions, 'aiService');
  const { data: result } = await fn({ action, data });
  return result;
}

/** Convert blob to base64 */
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

// ============================================================================
// INSIGHTS & RECOMMENDATIONS (via aiClinicalChat)
// ============================================================================

export interface ClinicalChatInput {
  message: string;
  context?: {
    patientId?: string;
    patientName?: string;
    condition?: string;
    sessionCount?: number;
    recentEvolutions?: Array< { date: string; notes: string }>;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ClinicalChatResponse {
  response: string;
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
      condition: options.diagnosis || options.primaryComplaint,
      sessionCount: options.sessionCount ?? 0,
    },
  });
  return result.response;
}

export async function chatWithClinicalAssistant(input: ClinicalChatInput): Promise<string> {
  const result = await callAIService<ClinicalChatInput, { response: string }>('clinicalChat', input);
  return result.response;
}

// ============================================================================
// EXERCISE SUGGESTIONS (via aiExerciseSuggestion)
// ============================================================================

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
  return await callAIService<ExerciseSuggestionInput, ExerciseSuggestionResponse>('exerciseSuggestion', input);
}

// ============================================================================
// EXERCISE PLAN GENERATION (via generateExercisePlan Genkit Flow)
// ============================================================================

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

/**
 * Gera um plano de exercícios completo usando o fluxo Genkit/Gemini 1.5 Flash.
 * Retorna dados altamente estruturados e validados.
 */
export async function generateExercisePlanWithIA(input: GenerateExercisePlanInput): Promise<ExercisePlanResponse> {
  return await callAIService<GenerateExercisePlanInput, ExercisePlanResponse>('generateExercisePlan', input);
}

// ============================================================================
// CLINICAL ANALYSIS (via aiClinicalAnalysis)
// ============================================================================

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
  return await callAIService('clinicalAnalysis', input);
}

// ============================================================================
// SOAP GENERATION (via aiSoapNoteChat)
// ============================================================================

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
  return await callAIService<SoapGenerationInput, SoapGenerationResponse>('soapNoteChat', input);
}

// ============================================================================
// MOVEMENT ANALYSIS (via aiMovementAnalysis)
// ============================================================================

export async function analyzeMovement(input: { videoData?: string; patientId?: string; context?: string }) {
  return await callAIService('movementAnalysis', input);
}

// ============================================================================
// AUDIO TRANSCRIPTION (via transcribeAudio HTTP)
// ============================================================================

export async function transcribeAudioBlob(blob: Blob, mimeType: string): Promise<{ transcription: string }> {
  const audioData = await blobToBase64(blob);
  const result = await callFunctionHttp<{ audioData: string; mimeType: string }, { transcription: string; confidence?: number }>(
    'transcribeAudio',
    { audioData, mimeType: mimeType || 'audio/webm', languageCode: 'pt-BR', context: 'medical' }
  );
  return { transcription: result.transcription };
}

// ============================================================================
// CLINICAL DECISION SUPPORT (pain, recovery, treatment - via aiClinicalChat)
// ============================================================================

export async function analyzePainEvolution(patientId: string, currentPainLevel: number): Promise<Record<string, unknown>> {
  const prompt = `Como especialista em fisioterapia, analise a evolução da dor do paciente. Nível atual: ${currentPainLevel}/10. Retorne um JSON com: overallTrend (improving|stable|worsening), trendDescription, keyFindings (array), clinicalAlerts (array).`;
  const response = await chatWithClinicalAssistant({
    message: prompt,
    context: { patientId, sessionCount: 0 },
  });
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    /* fallback */
  }
  return {
    overallTrend: 'stable',
    trendDescription: response,
    keyFindings: [response],
    clinicalAlerts: [],
    globalPainChange: 0,
    percentageChange: 0,
    positiveIndicators: [],
  };
}

export async function predictRecovery(
  patientId: string,
  patientProfile: Record<string, unknown>,
  currentCondition: Record<string, unknown>,
  treatmentContext: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const prompt = `Como especialista, estime a recuperação. Perfil: ${JSON.stringify(patientProfile)}. Condição: ${JSON.stringify(currentCondition)}. Tratamento: ${JSON.stringify(treatmentContext)}. Retorne JSON com: predictedRecoveryDate, confidenceScore, milestones (array), riskFactors (array), treatmentRecommendations.`;
  const response = await chatWithClinicalAssistant({
    message: prompt,
    context: { patientId, sessionCount: (treatmentContext as { sessionsCompleted?: number }).sessionsCompleted ?? 0 },
  });
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    /* fallback */
  }
  return {
    predictedRecoveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    confidenceScore: 0.7,
    milestones: [],
    riskFactors: [],
    treatmentRecommendations: { sessionsPerWeek: 2, estimatedTotalSessions: 12, intensity: 'moderate', focusAreas: [] },
    confidenceInterval: { lower: '', upper: '', expectedDays: 30 },
  };
}

export async function evaluateTreatmentResponse(
  patientId: string,
  sessionsCompleted: number,
  currentPainLevel: number
): Promise<Record<string, unknown>> {
  const prompt = `Avalie a resposta ao tratamento. Sessões: ${sessionsCompleted}. Dor atual: ${currentPainLevel}/10. Retorne JSON com: responseRating (positive|neutral|negative), summary, recommendations (array), nextSteps (array).`;
  const response = await chatWithClinicalAssistant({
    message: prompt,
    context: { patientId, sessionCount: sessionsCompleted },
  });
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    /* fallback */
  }
  return {
    responseRating: 'neutral',
    summary: response,
    recommendations: [],
    nextSteps: [],
  };
}

// ============================================================================
// SEMANTIC SEARCH (via Firestore Vector Search)
// ============================================================================

export interface SemanticSearchResponse {
  success: boolean;
  query: string;
  results: Array<{
    id: string;
    patient_id: string;
    record_date: any;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    score?: number;
  }>;
}

/**
 * Realiza busca semântica em registros SOAP por similaridade.
 */
export async function findSimilarClinicalRecords(query: string, limit: number = 5): Promise<SemanticSearchResponse> {
  return await callAIService<{ query: string; limit: number }, SemanticSearchResponse>('semanticSearch', { query, limit });
}
