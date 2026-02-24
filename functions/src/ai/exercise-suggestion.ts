/**
 * Cloud Function: Exercise Suggestion
 *
 * Provides AI-powered exercise recommendations based on patient profile,
 * clinical notes, and treatment goals using Gemini Flash-Lite for cost efficiency.
 *
 * @route ai/exerciseSuggestion
 * @method onCall
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from '../lib/logger';
import { withIdempotency } from '../lib/idempotency';

const firestore = admin.firestore();

// Firebase Functions v2 CORS - explicitly list allowed origins
const CORS_ORIGINS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /moocafisio\.com\.br$/,
  /fisioflow\.web\.app$/,
];

// ============================================================================
// TYPES
// ============================================================================

interface ExerciseSuggestionRequest {
  /** Patient ID */
  patientId: string;
  /** Treatment goals */
  goals: string[];
  /** Available equipment */
  availableEquipment?: string[];
  /** Treatment phase override */
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  /** Pain map data (body region -> intensity 0-10) */
  painMap?: Record<string, number>;
}

interface ExerciseSuggestionResponse {
  success: boolean;
  data?: {
    exercises: Array<{
      exerciseId?: string;
      name: string;
      category?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
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
    redFlags?: string[];
    alternatives?: Array<{
      name: string;
      rationale: string;
    }>;
    estimatedDuration: number;
  };
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================

const RATE_LIMITS = {
  maxRequestsPerHour: 20,
  maxRequestsPerDay: 100,
};

// ============================================================================
// AI CLIENT CACHE
// ============================================================================

let cachedVertexAI: any = null;

async function getVertexAI() {
  if (!cachedVertexAI) {
    const { VertexAI } = await import('@google-cloud/vertexai');
    cachedVertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
    });
  }
  return cachedVertexAI;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const exerciseSuggestionHandler = async (request: any): Promise<ExerciseSuggestionResponse> => {
  const startTime = Date.now();

  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = request.auth.uid;
  const { auth } = request;

  // Rate limiting check
  const rateLimitStatus = await checkRateLimit(userId);
  if (rateLimitStatus.isLimited) {
    logger.warn(`[ExerciseSuggestion] Rate limit exceeded for user ${userId}`);
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Try again later.`,
      {
        resetAt: rateLimitStatus.resetAt.toISOString(),
        remaining: rateLimitStatus.remaining,
      }
    );
  }

  // Validate request data
  const data = request.data as ExerciseSuggestionRequest;

  if (!data.patientId) {
    throw new HttpsError('invalid-argument', 'patientId is required');
  }

  if (!data.goals || data.goals.length === 0) {
    throw new HttpsError('invalid-argument', 'goals array is required');
  }

  try {
    logger.info(`[ExerciseSuggestion] Processing request for patient ${data.patientId}`);

    // Fetch patient data
    const patientDoc = await firestore
      .collection('patients')
      .doc(data.patientId)
      .get();

    if (!patientDoc.exists) {
      throw new HttpsError('not-found', 'Patient not found');
    }

    const patient = patientDoc.data()!;

    // Verify user has access to this patient
    if (patient?.organization_id !== auth.token.organization_id) {
      throw new HttpsError('permission-denied', 'Access denied to this patient');
    }

    // Fetch recent SOAP records
    const soapSnapshot = await firestore
      .collection('patients')
      .doc(data.patientId)
      .collection('soap_records')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const soapHistory = soapSnapshot.docs.map(doc => doc.data());

    // Build context for AI
    const age = calculateAge(patient.birth_date);
    const context = {
      patient: {
        id: patient.id,
        name: patient.name,
        age,
        gender: patient.gender,
        mainCondition: patient.main_condition,
      },
      soapHistory: soapHistory.map((soap: any) => ({
        sessionNumber: soap.session_number,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
      })),
      painMap: data.painMap || {},
      goals: data.goals,
      availableEquipment: data.availableEquipment,
      treatmentPhase: data.treatmentPhase || determineTreatmentPhase(soapHistory.length),
      sessionCount: soapHistory.length,
    };

    // Call Gemini 2.5 Flash-Lite for exercise suggestions (with idempotency cache)
    const cacheParams = {
      patientId: data.patientId,
      goals: data.goals,
      availableEquipment: data.availableEquipment,
      treatmentPhase: data.treatmentPhase,
      painMap: data.painMap,
      sessionCount: (context as any).sessionCount,
    };

    const aiResult = await withIdempotency(
      'EXERCISE_RECOMMENDATION',
      userId,
      cacheParams,
      () => generateExerciseSuggestions(context),
      { cacheTtl: 5 * 60 * 1000 } // 5 minute cache
    );

    if (!aiResult.success) {
      throw new HttpsError('internal', aiResult.error || 'AI generation failed');
    }

    // Record usage
    const duration = Date.now() - startTime;
    await recordUsage({
      userId,
      feature: 'EXERCISE_RECOMMENDATION',
      model: 'gemini-2.5-flash-lite',
      inputTokens: aiResult.usage!.promptTokens,
      outputTokens: aiResult.usage!.completionTokens,
      duration,
      success: true,
    });

    return {
      success: true,
      data: aiResult.data,
      usage: aiResult.usage,
    };
  } catch (error) {
    // Record failed usage
    const duration = Date.now() - startTime;
    await recordUsage({
      userId,
      feature: 'EXERCISE_RECOMMENDATION',
      model: 'gemini-2.5-flash-lite',
      inputTokens: 0,
      outputTokens: 0,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('[ExerciseSuggestion] Error:', error);
    throw new HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to generate exercise suggestions'
    );
  }
};

export const exerciseSuggestion = onCall({
  cors: CORS_ORIGINS,
  region: 'southamerica-east1',
  memory: '1GiB',
  cpu: 1,
  maxInstances: 1,
  timeoutSeconds: 300, // 5 minutes for AI generation
}, exerciseSuggestionHandler);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate exercise suggestions using Gemini Flash-Lite
 */
async function generateExerciseSuggestions(context: any): Promise<{
  success: boolean;
  data?: ExerciseSuggestionResponse['data'];
  usage?: ExerciseSuggestionResponse['usage'];
  error?: string;
}> {
  try {
    const vertexAI = await getVertexAI();

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
    });

    // Build prompt
    const prompt = buildExercisePrompt(context);

    // Generate using Flash-Lite for cost efficiency
    const systemInstruction = `You are an expert physical therapist AI assistant specializing in exercise prescription for Brazilian patients.

Recommend 3-10 appropriate exercises based on the patient's profile, considering:
- Current pain presentation
- Treatment goals
- Available equipment
- Treatment phase
- Clinical history

For each exercise, provide:
- Name and category
- Difficulty level
- Clinical rationale
- Target area
- Goals addressed
- Sets, reps, duration
- Progression criteria
- Precautions if needed

Return ONLY valid JSON matching this structure:
{
  "exercises": [...],
  "programRationale": "...",
  "expectedOutcomes": ["...", "..."],
  "progressionCriteria": ["...", "..."],
  "redFlags": ["...", "..."],
  "alternatives": [{ "name": "...", "rationale": "..." }],
  "estimatedDuration": minutes
}`;

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemInstruction }],
      },
    });

    // Parse response - Vertex AI returns different structure
    const candidates = result.response?.candidates;
    const responseText = candidates && candidates[0]?.content?.parts[0]?.text
      ? candidates[0].content.parts[0].text
      : '';

    if (!responseText) {
      throw new HttpsError('internal', 'Failed to get AI response');
    }

    const cleanedJson = cleanJsonResponse(responseText);
    const exerciseData = JSON.parse(cleanedJson);

    // Estimate tokens (rough approximation)
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);

    // Estimate cost (Flash-Lite: $0.075/M input, $0.15/M output)
    const estimatedCost = (promptTokens / 1_000_000) * 0.075 +
      (completionTokens / 1_000_000) * 0.15;

    return {
      success: true,
      data: exerciseData,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost,
      },
    };
  } catch (error) {
    logger.error('[ExerciseSuggestion] AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI generation failed',
    };
  }
}

/**
 * Build exercise recommendation prompt
 */
function buildExercisePrompt(context: any): string {
  const { patient, soapHistory, painMap, goals, availableEquipment, treatmentPhase, sessionCount } = context;

  // Format pain map
  const painMapText = Object.entries(painMap || {})
    .filter(([_, intensity]) => (intensity as number) > 0)
    .map(([area, intensity]) => `${area}: ${intensity}/10`)
    .join(', ') || 'No pain reported';

  // Format recent SOAP notes
  const recentSOAP = (soapHistory || []).slice(-3).map((soap: any) => `
Sessão ${soap.sessionNumber}:
- Queixa: ${soap.subjective || 'N/A'}
- Avaliação: ${soap.assessment || 'N/A'}
- Plano: ${typeof soap.plan === 'object' ? JSON.stringify(soap.plan) : soap.plan || 'N/A'}
`).join('\n');

  return `
## Perfil do Paciente

**Dados Demográficos:**
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Gênero: ${patient.gender}
- Condição Principal: ${patient.mainCondition}

**Apresentação Atual de Dor:**
${painMapText}

**Histórico Clínico Recente:**
${recentSOAP || 'Sem histórico disponível'}

**Objetivos do Tratamento:**
${goals.map((g: string) => `- ${g}`).join('\n')}

**Contexto do Tratamento:**
- Fase Atual: ${treatmentPhase}
- Número de Sessões: ${sessionCount}
- Equipamentos Disponíveis: ${availableEquipment?.join(', ') || 'Nenhum / Equipamento básico'}

## Solicitação

Recomende um programa de exercícios apropriado que:
1. Direcione as áreas de dor identificadas
2. Considere as limitações do histórico clínico
3. Ajude a alcançar os objetivos estabelecidos
4. Use equipamentos disponíveis ou nenhum equipamento
5. Seja apropriado para a fase de tratamento atual
6. Inclua critérios de progressão clara

Retorne APENAS JSON válido sem blocos de código markdown.`;
}

/**
 * Calculate patient age from birth date
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Determine treatment phase from session count
 */
function determineTreatmentPhase(sessionCount: number): string {
  if (sessionCount <= 3) return 'initial';
  if (sessionCount <= 8) return 'progressive';
  if (sessionCount <= 15) return 'advanced';
  return 'maintenance';
}

/**
 * Clean JSON response by removing markdown code blocks
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  return cleaned.trim();
}

/**
 * Check rate limit for user
 */
async function checkRateLimit(userId: string): Promise<{
  isLimited: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  currentCount: number;
}> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000);
  const dayAgo = new Date(now.getTime() - 86400000);

  // Check hourly rate limit
  const hourSnapshot = await firestore
    .collection('ai_usage_records')
    .where('userId', '==', userId)
    .where('feature', '==', 'EXERCISE_RECOMMENDATION')
    .where('timestamp', '>=', hourAgo)
    .get();

  const hourCount = hourSnapshot.size;

  if (hourCount >= RATE_LIMITS.maxRequestsPerHour) {
    return {
      isLimited: true,
      remaining: 0,
      limit: RATE_LIMITS.maxRequestsPerHour,
      resetAt: new Date(hourAgo.getTime() + 3600000),
      currentCount: hourCount,
    };
  }

  // Check daily rate limit
  const daySnapshot = await firestore
    .collection('ai_usage_records')
    .where('userId', '==', userId)
    .where('feature', '==', 'EXERCISE_RECOMMENDATION')
    .where('timestamp', '>=', dayAgo)
    .get();

  const dayCount = daySnapshot.size;

  return {
    isLimited: dayCount >= RATE_LIMITS.maxRequestsPerDay,
    remaining: Math.max(0, RATE_LIMITS.maxRequestsPerDay - dayCount),
    limit: RATE_LIMITS.maxRequestsPerDay,
    resetAt: new Date(dayAgo.getTime() + 86400000),
    currentCount: dayCount,
  };
}

/**
 * Record AI usage
 */
async function recordUsage(data: {
  userId: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  duration: number;
  success: boolean;
  error?: string;
}): Promise<void> {
  try {
    const id = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await firestore
      .collection('ai_usage_records')
      .doc(id)
      .set({
        id,
        userId: data.userId,
        feature: data.feature,
        model: data.model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens: data.inputTokens + data.outputTokens,
        duration: data.duration,
        success: data.success,
        error: data.error,
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    logger.error('[ExerciseSuggestion] Failed to record usage:', error);
  }
}
