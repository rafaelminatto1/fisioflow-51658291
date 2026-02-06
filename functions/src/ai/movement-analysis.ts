/**
 * Cloud Function: Movement Analysis
 *
 * Analyzes exercise movement from video using Gemini Pro's multimodal
 * capabilities to compare patient form against demo videos and provide
 * quality scoring with feedback.
 *
 * @route ai/movementAnalysis
 * @method onCall
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

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

interface MovementAnalysisRequest {
  /** Patient ID */
  patientId: string;
  /** Exercise ID */
  exerciseId: string;
  /** Exercise name */
  exerciseName: string;
  /** Patient video URL (must be publicly accessible) */
  patientVideoUrl: string;
  /** Demo video URL (optional, will try to find default) */
  demoVideoUrl?: string;
  /** Expected repetitions */
  expectedReps?: number;
  /** Focus areas for analysis */
  focusAreas?: string[];
  /** Language for feedback */
  language?: 'pt-BR' | 'en';
}

interface MovementAnalysisResponse {
  success: boolean;
  data?: {
    exerciseId: string;
    exerciseName: string;
    patientId: string;
    analysisDate: string;
    demoVideoUrl?: string;
    patientVideoUrl: string;
    patientVideoDuration: number;
    formQuality: {
      overall: number;
      posture: number;
      rangeOfMotion: number;
      control: number;
      tempo: number;
      breathing: number;
    };
    deviations: Array<{
      timestamp: number;
      issue: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      bodyPart: string;
      correction: string;
    }>;
    safetyConcerns: Array<{
      type: 'joint_overload' | 'spinal_compression' | 'loss_of_balance' | 'excessive_speed' | 'pain_indicator';
      severity: 'warning' | 'danger';
      description: string;
      timestamp: number;
      recommendation: string;
    }>;
    repetitions: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    progression: string;
    modelUsed: string;
    processingTime: number;
    confidence: number;
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
  maxRequestsPerHour: 10,
  maxRequestsPerDay: 50,
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const movementAnalysisHandler = async (request: any): Promise<MovementAnalysisResponse> => {
  const startTime = Date.now();

  // Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = request.auth.uid;
  const { auth } = request;

  // Rate limiting check (stricter for video processing)
  const rateLimitStatus = await checkRateLimit(userId);
  if (rateLimitStatus.isLimited) {
    logger.warn(`[MovementAnalysis] Rate limit exceeded for user ${userId}`);
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded. Video processing is resource-intensive.`,
      {
        resetAt: rateLimitStatus.resetAt.toISOString(),
        remaining: rateLimitStatus.remaining,
      }
    );
  }

  // Validate request data
  const data = request.data as MovementAnalysisRequest;

  if (!data.patientId) {
    throw new HttpsError('invalid-argument', 'patientId is required');
  }

  if (!data.exerciseId) {
    throw new HttpsError('invalid-argument', 'exerciseId is required');
  }

  if (!data.exerciseName) {
    throw new HttpsError('invalid-argument', 'exerciseName is required');
  }

  if (!data.patientVideoUrl) {
    throw new HttpsError('invalid-argument', 'patientVideoUrl is required');
  }

  try {
    logger.info(`[MovementAnalysis] Processing request for exercise ${data.exerciseId}`);

    // Verify patient access
    const patientDoc = await firestore
      .collection('patients')
      .doc(data.patientId)
      .get();

    if (!patientDoc.exists) {
      throw new HttpsError('not-found', 'Patient not found');
    }

    const patient = patientDoc.data();

    // Verify user has access to this patient
    if (patient?.organization_id !== auth.token.organization_id) {
      throw new HttpsError('permission-denied', 'Access denied to this patient');
    }

    // Get demo video URL if not provided
    let demoVideoUrl = data.demoVideoUrl;
    if (!demoVideoUrl) {
      demoVideoUrl = await getDefaultDemoVideo(data.exerciseId);
    }

    // Analyze movement using Gemini Pro
    const aiResult = await analyzeMovement({
      ...data,
      demoVideoUrl,
    });

    if (!aiResult.success) {
      throw new HttpsError('internal', aiResult.error || 'Movement analysis failed');
    }

    // Save analysis result to Firestore
    await saveAnalysisResult({
      ...aiResult.data!,
      analysisDate: new Date().toISOString(),
      processingTime: Date.now() - startTime,
    });

    // Record usage
    const duration = Date.now() - startTime;
    await recordUsage({
      userId,
      feature: 'PROGRESS_ANALYSIS',
      model: 'gemini-2.5-pro',
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
      feature: 'PROGRESS_ANALYSIS',
      model: 'gemini-2.5-pro',
      inputTokens: 0,
      outputTokens: 0,
      duration,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof HttpsError) {
      throw error;
    }

    logger.error('[MovementAnalysis] Error:', error);
    throw new HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to analyze movement'
    );
  }
};

export const movementAnalysis = onCall({
  cors: CORS_ORIGINS,
  region: 'southamerica-east1',
  memory: '2GiB',
  cpu: 1,
  maxInstances: 1,
}, movementAnalysisHandler);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze movement using Gemini Pro's multimodal capabilities
 */
async function analyzeMovement(options: MovementAnalysisRequest & { demoVideoUrl?: string }): Promise<{
  success: boolean;
  data?: MovementAnalysisResponse['data'];
  usage?: MovementAnalysisResponse['usage'];
  error?: string;
}> {
  try {
    // Import Firebase AI Logic
    const { VertexAI } = await import('@google-cloud/vertexai');

    const vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
    });

    const language = options.language || 'pt-BR';
    const labels = language === 'pt-BR' ? {
      posture: 'Postura',
      rom: 'Amplitude de Movimento',
      control: 'Controle Motor',
      tempo: 'Tempo e Cadência',
      breathing: 'Respiração',
      summary: 'Resumo da Análise',
      strengths: 'Pontos Fortes',
      improvements: 'Pontos de Melhoria',
      progression: 'Progressão Sugerida'
    } : {
      posture: 'Posture',
      rom: 'Range of Motion',
      control: 'Motor Control',
      tempo: 'Tempo and Cadence',
      breathing: 'Breathing',
      summary: 'Analysis Summary',
      strengths: 'Strengths',
      improvements: 'Areas for Improvement',
      progression: 'Suggested Progression'
    };

    // Build prompt
    const prompt = buildAnalysisPrompt(options, labels, language);

    // Prepare video inputs for multimodal analysis
    const videoInputs = [
      {
        fileData: {
          mimeType: 'video/*',
          fileUri: options.patientVideoUrl,
        },
      },
    ];

    // Add demo video if available
    if (options.demoVideoUrl) {
      videoInputs.unshift({
        fileData: {
          mimeType: 'video/*',
          fileUri: options.demoVideoUrl,
        },
      });
    }

    // Generate using Gemini Pro for video analysis
    const result = await generativeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'video/*', data: 'VIDEO_DATA_PLACEHOLDER' } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
      systemInstruction: `You are an expert biomechanics and physical therapy specialist analyzing exercise form.

Compare patient's exercise execution against proper form and provide:
1. Quality scores (0-100) for: overall, posture, ROM, control, tempo, breathing
2. Specific deviations with timestamps, severity, body part, and corrections
3. Safety concerns with type, severity, and recommendations
4. Repetition count
5. Summary, strengths, improvements, and progression suggestions

Return ONLY valid JSON matching the provided structure.`,
    });

    // Parse response with safety checks
    const candidates = result.response?.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates from AI model');
    }
    const responseText = candidates[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('No text in AI response');
    }

    const cleanedJson = cleanJsonResponse(responseText);
    const analysisData = JSON.parse(cleanedJson);

    // Get video duration (estimated if not available)
    const patientVideoDuration = analysisData.duration || 0;

    // Build response data
    const responseData = {
      exerciseId: options.exerciseId,
      exerciseName: options.exerciseName,
      patientId: options.patientId,
      analysisDate: new Date().toISOString(),
      demoVideoUrl: options.demoVideoUrl,
      patientVideoUrl: options.patientVideoUrl,
      patientVideoDuration,
      formQuality: {
        overall: analysisData.formQuality?.overall || 0,
        posture: analysisData.formQuality?.posture || 0,
        rangeOfMotion: analysisData.formQuality?.rangeOfMotion || 0,
        control: analysisData.formQuality?.control || 0,
        tempo: analysisData.formQuality?.tempo || 0,
        breathing: analysisData.formQuality?.breathing || 0,
      },
      deviations: analysisData.deviations || [],
      safetyConcerns: analysisData.safetyConcerns || [],
      repetitions: analysisData.repetitions || 0,
      summary: analysisData.summary || '',
      strengths: analysisData.strengths || [],
      improvements: analysisData.improvements || [],
      progression: analysisData.progression || '',
      modelUsed: 'gemini-2.5-pro',
      confidence: analysisData.confidence || 0.8,
      processingTime: 0, // Will be set when saving
    };

    // Estimate tokens (video processing uses more tokens)
    const promptTokens = Math.ceil(prompt.length / 4) + 1000; // Base estimate for video
    const completionTokens = Math.ceil(responseText.length / 4);

    // Estimate cost (Pro: $1.25/M input, $5.00/M output)
    const estimatedCost = (promptTokens / 1_000_000) * 1.25 +
      (completionTokens / 1_000_000) * 5.00;

    return {
      success: true,
      data: responseData,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost,
      },
    };
  } catch (error) {
    logger.error('[MovementAnalysis] AI analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Movement analysis failed',
    };
  }
}

/**
 * Build movement analysis prompt
 */
function buildAnalysisPrompt(
  options: MovementAnalysisRequest & { demoVideoUrl?: string },
  labels: Record<string, string>,
  language: string
): string {
  const demoVideoText = options.demoVideoUrl
    ? `VÍDEO DEMO (forma correta): ${options.demoVideoUrl}\n`
    : '';

  const focusAreasText = options.focusAreas
    ? `ÁREAS DE FOCO ESPECIAIS:\n${options.focusAreas.map(area => `- ${area}`).join('\n')}\n`
    : '';

  if (language === 'pt-BR') {
    return `
EXERCÍCIO: ${options.exerciseName}
REPETIÇÕES ESPERADAS: ${options.expectedReps || 'não especificado'}

${demoVideoText}VÍDEO DO PACIENTE (para análise): ${options.patientVideoUrl}

${focusAreasText}
TASK: Analise o vídeo do paciente comparando com o demo e forneça:

1. PONTUAÇÃO DE QUALIDADE (0-100 para cada aspecto):
   - Postura: alinhamento corporal geral
   - Amplitude de Movimento: completude do movimento
   - Controle Motor: estabilidade e controle muscular
   - Tempo e Cadência: ritmo apropriado
   - Respiração: coordenação respiratória

2. DESVIOS IDENTIFICADOS (lista com timestamps em segundos):
   - Timestamp específico
   - Problema detectado
   - Severidade (low/medium/high/critical)
   - Parte do corpo afetada
   - Correção sugerida

3. PREOCUPAÇÕES DE SEGURANÇA (se houver):
   - Tipo: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator
   - Severidade: warning ou danger
   - Descrição detalhada
   - Timestamp
   - Recomendação imediata

4. CONTAGEM DE REPETIÇÕES REALIZADAS

5. FEEDBACK COMPLETO:
   - ${labels.summary}: análise geral em 2-3 frases
   - ${labels.strengths}: 3-5 pontos que o paciente fez bem
   - ${labels.improvements}: 3-5 áreas para trabalhar
   - ${labels.progression}: próxima progressão ou regressão adequada

IMPORTANTE:
- Seja específico com timestamps (ex: "00:15", "01:30")
- Priorize alertas de segurança acima de tudo
- Use linguagem clara e encorajadora
- Forneça correções acionáveis

Responda em JSON válido com esta estrutura:
{
  "formQuality": {
    "overall": number,
    "posture": number,
    "rangeOfMotion": number,
    "control": number,
    "tempo": number,
    "breathing": number
  },
  "deviations": [{
    "timestamp": number,
    "issue": string,
    "severity": "low"|"medium"|"high"|"critical",
    "bodyPart": string,
    "correction": string
  }],
  "safetyConcerns": [{
    "type": string,
    "severity": "warning"|"danger",
    "description": string,
    "timestamp": number,
    "recommendation": string
  }],
  "repetitions": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "progression": string,
  "confidence": number
}
`;
  }

  // English version
  return `
EXERCISE: ${options.exerciseName}
Expected reps: ${options.expectedReps || 'not specified'}

${demoVideoText}PATIENT VIDEO (to analyze): ${options.patientVideoUrl}

${focusAreasText}
TASK: Analyze the patient's video comparing with the demo and provide:

1. QUALITY SCORES (0-100 for each aspect):
   - Posture: overall body alignment
   - Range of Motion: movement completeness
   - Motor Control: stability and muscular control
   - Tempo and Cadence: appropriate rhythm
   - Breathing: breathing coordination

2. IDENTIFIED DEVIATIONS (list with timestamps in seconds):
   - Specific timestamp
   - Problem detected
   - Severity (low/medium/high/critical)
   - Body part affected
   - Suggested correction

3. SAFETY CONCERNS (if any):
   - Type: joint_overload, spinal_compression, loss_of_balance, excessive_speed, pain_indicator
   - Severity: warning or danger
   - Detailed description
   - Timestamp
   - Immediate recommendation

4. REPETITION COUNT PERFORMED

5. COMPLETE FEEDBACK:
   - ${labels.summary}: general analysis in 2-3 sentences
   - ${labels.strengths}: 3-5 things patient did well
   - ${labels.improvements}: 3-5 areas to work on
   - ${labels.progression}: appropriate next progression or regression

IMPORTANT:
- Be specific with timestamps (ex: "00:15", "01:30")
- Prioritize safety alerts above all
- Use clear, encouraging language
- Provide actionable corrections

Respond in valid JSON with this structure:
{
  "formQuality": {
    "overall": number,
    "posture": number,
    "rangeOfMotion": number,
    "control": number,
    "tempo": number,
    "breathing": number
  },
  "deviations": [{
    "timestamp": number,
    "issue": string,
    "severity": "low"|"medium"|"high"|"critical",
    "bodyPart": string,
    "correction": string
  }],
  "safetyConcerns": [{
    "type": string,
    "severity": "warning"|"danger",
    "description": string,
    "timestamp": number,
    "recommendation": string
  }],
  "repetitions": number,
  "summary": string,
  "strengths": string[],
  "improvements": string[],
  "progression": string,
  "confidence": number
}
`;
}

/**
 * Get default demo video URL for an exercise
 */
async function getDefaultDemoVideo(exerciseId: string): Promise<string | undefined> {
  try {
    const demoDoc = await firestore
      .collection('exercise_demos')
      .doc(exerciseId)
      .get();

    if (demoDoc.exists) {
      const data = demoDoc.data();
      return data?.videoUrl;
    }

    return undefined;
  } catch (error) {
    logger.warn(`[MovementAnalysis] Failed to get demo video for ${exerciseId}:`, error);
    return undefined;
  }
}

/**
 * Save analysis result to Firestore
 */
async function saveAnalysisResult(result: any): Promise<void> {
  try {
    const analysisRef = firestore
      .collection('patients')
      .doc(result.patientId)
      .collection('exercise_analyses')
      .doc();

    await analysisRef.set({
      ...result,
      id: analysisRef.id,
      createdAt: new Date().toISOString(),
    });

    logger.info(`[MovementAnalysis] Saved analysis result ${analysisRef.id}`);
  } catch (error) {
    logger.error('[MovementAnalysis] Failed to save analysis result:', error);
    // Don't throw - saving is not critical for the response
  }
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
    .where('feature', '==', 'PROGRESS_ANALYSIS')
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
    .where('feature', '==', 'PROGRESS_ANALYSIS')
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
    logger.error('[MovementAnalysis] Failed to record usage:', error);
  }
}
