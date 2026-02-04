/**
 * Cloud Function: SOAP Note Generation
 *
 * Generates structured SOAP notes from consultation text or audio transcription
 * using Gemini Pro for high clinical accuracy.
 *
 * @route ai/soapGeneration
 * @method onCall
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
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

interface SOAPGenerationRequest {
  /** Patient ID */
  patientId: string;
  /** Consultation text transcript or notes */
  consultationText: string;
  /** Optional audio data (base64) */
  audioData?: string;
  /** Audio MIME type */
  audioMimeType?: 'audio/mp3' | 'audio/mp4' | 'audio/wav' | 'audio/webm' | 'audio/mpeg';
  /** Session number */
  sessionNumber: number;
  /** Session type */
  sessionType?: 'initial' | 'follow-up' | 'reassessment' | 'discharge';
  /** Include transcription in response */
  includeTranscription?: boolean;
}

interface SOAPGenerationResponse {
  success: boolean;
  data?: {
    soap: {
      subjective: string;
      objective?: {
        inspection?: string;
        palpation?: string;
        movement_tests?: Record<string, string>;
        special_tests?: Record<string, string>;
        posture_analysis?: string;
        gait_analysis?: string;
      };
      assessment: string;
      plan?: {
        short_term_goals?: string[];
        long_term_goals?: string[];
        interventions?: string[];
        frequency?: string;
        duration?: string;
        home_exercises?: string[];
        precautions?: string[];
      };
    };
    transcription?: string;
    keyFindings: string[];
    recommendations: string[];
    redFlags?: string[];
    suggestedCodes?: string[];
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
  maxRequestsPerHour: 30,
  maxRequestsPerDay: 150,
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

export const soapGenerationHandler = async (request: any): Promise<SOAPGenerationResponse> => {
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
    logger.warn(`[SOAPGeneration] Rate limit exceeded for user ${userId}`);
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
  const data = request.data as SOAPGenerationRequest;

  if (!data.patientId) {
    throw new HttpsError('invalid-argument', 'patientId is required');
  }

  if (!data.consultationText && !data.audioData) {
    throw new HttpsError('invalid-argument', 'consultationText or audioData is required');
  }

  if (!data.sessionNumber) {
    throw new HttpsError('invalid-argument', 'sessionNumber is required');
  }

  try {
    logger.info(`[SOAPGeneration] Processing request for patient ${data.patientId}`);

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

    // Fetch previous SOAP records for context
    const soapSnapshot = await firestore
      .collection('patients')
      .doc(data.patientId)
      .collection('soap_records')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get();

    const previousSOAP = soapSnapshot.docs.map(doc => doc.data());

    // Build patient context
    const age = calculateAge(patient?.birth_date || '');
    const patientContext = {
      patient: {
        id: patient?.id || data.patientId,
        name: patient?.name || 'Unknown',
        age,
        gender: patient?.gender || 'unknown',
        mainCondition: patient?.main_condition || 'N/A',
        medicalHistory: patient?.medical_history || 'N/A',
      },
      previousSOAP: previousSOAP.map((soap: any) => ({
        sessionNumber: soap.session_number,
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
      })),
      sessionNumber: data.sessionNumber,
      sessionType: data.sessionType || 'follow-up',
      language: 'pt',
    };

    let consultationText = data.consultationText;
    let transcription = consultationText;

    // Transcribe audio if provided
    if (data.audioData) {
      logger.info('[SOAPGeneration] Transcribing audio...');
      const transcriptionResult = await transcribeAudio(data.audioData, data.audioMimeType);

      if (!transcriptionResult.success) {
        throw new HttpsError('internal', `Audio transcription failed: ${transcriptionResult.error}`);
      }

      transcription = transcriptionResult.transcription!;
      consultationText = transcription;
    }

    // Generate SOAP note using Gemini Pro (with idempotency cache)
    const cacheParams = {
      patientId: data.patientId,
      sessionNumber: data.sessionNumber,
      sessionType: data.sessionType,
      consultationText: consultationText.substring(0, 500), // First 500 chars for cache key
    };

    const aiResult = await withIdempotency(
      'SOAP_GENERATION',
      userId,
      cacheParams,
      () => generateSOAPNote(consultationText, patientContext),
      { cacheTtl: 5 * 60 * 1000 } // 5 minute cache
    );

    if (!aiResult.success) {
      throw new HttpsError('internal', aiResult.error || 'SOAP generation failed');
    }

    // Add transcription if requested
    if (data.includeTranscription) {
      aiResult.data!.transcription = transcription;
    }

    // Record usage
    const duration = Date.now() - startTime;
    await recordUsage({
      userId,
      feature: 'CLINICAL_ANALYSIS',
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
      feature: 'CLINICAL_ANALYSIS',
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

    logger.error('[SOAPGeneration] Error:', error);
    throw new HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to generate SOAP note'
    );
  }
};

export const soapGeneration = onCall({
  cors: CORS_ORIGINS,
  region: 'southamerica-east1',
  memory: '1GiB',
  cpu: 1,
  maxInstances: 10,
  timeoutSeconds: 300, // 5 minutes for AI generation
}, soapGenerationHandler);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate SOAP note using Gemini Pro
 */
async function generateSOAPNote(consultationText: string, patientContext: any): Promise<{
  success: boolean;
  data?: SOAPGenerationResponse['data'];
  usage?: SOAPGenerationResponse['usage'];
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

    // Build prompt
    const prompt = buildSOAPPrompt(consultationText, patientContext);

    // Generate using Pro for clinical accuracy
    const result = await generativeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
      systemInstruction: `You are an expert physical therapist clinical documentation assistant for Brazilian healthcare.

Generate structured, professional SOAP notes in Portuguese from consultation transcripts.

SOAP Format Guidelines:
- **Subjective (S)**: Patient's reported symptoms, complaints, and concerns. Include pain levels (0-10), functional limitations, and progress since last session.
- **Objective (O)**: Measurable findings from physical examination. Include inspection, palpation, range of motion, strength, special tests, posture, and gait analysis.
- **Assessment (A)**: Clinical evaluation including diagnosis, prognosis, and response to treatment. Use professional terminology.
- **Plan (P)**: Evidence-based treatment plan with specific goals, interventions, frequency, and home exercises.

Quality Standards:
- Use professional Portuguese physical therapy terminology
- Be concise but complete
- Focus on function and outcomes
- Include measurable goals when possible
- Note any red flags or contraindications
- Align with Brazilian physical therapy best practices
- Include ICD-10 codes when relevant

Return ONLY valid JSON with this structure:
{
  "soap": {
    "subjective": "...",
    "objective": { ... },
    "assessment": "...",
    "plan": { ... }
  },
  "keyFindings": ["...", "..."],
  "recommendations": ["...", "..."],
  "redFlags": ["...", "..."],
  "suggestedCodes": ["...", "..."]
}`,
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
    const soapData = JSON.parse(cleanedJson);

    // Estimate tokens
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);

    // Estimate cost (Pro: $1.25/M input, $5.00/M output)
    const estimatedCost = (promptTokens / 1_000_000) * 1.25 +
      (completionTokens / 1_000_000) * 5.00;

    return {
      success: true,
      data: soapData,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost,
      },
    };
  } catch (error) {
    logger.error('[SOAPGeneration] AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SOAP generation failed',
    };
  }
}

/**
 * Transcribe audio using Gemini Pro
 */
async function transcribeAudio(
  audioData: string,
  mimeType: string = 'audio/mp3'
): Promise<{
  success: boolean;
  transcription?: string;
  error?: string;
}> {
  try {
    const vertexAI = await getVertexAI();

    const generativeModel = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
    });

    const result = await generativeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          inlineData: {
            mimeType,
            data: audioData,
          },
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
      systemInstruction: 'Transcreva esta consulta de fisioterapia para português brasileiro. Inclua todas as falas do paciente e do terapeuta. Mantenha terminologia médica precisa.',
    });

    // Get transcription with safety check
    const transcriptionCandidates = result.response?.candidates;
    if (!transcriptionCandidates || transcriptionCandidates.length === 0) {
      throw new Error('No transcription response from AI model');
    }
    const transcriptionText = transcriptionCandidates[0]?.content?.parts?.[0]?.text;
    if (!transcriptionText) {
      throw new Error('No text in transcription response');
    }

    return {
      success: true,
      transcription: transcriptionText,
    };
  } catch (error) {
    logger.error('[SOAPGeneration] Transcription error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcription failed',
    };
  }
}

/**
 * Build SOAP generation prompt
 */
function buildSOAPPrompt(consultationText: string, context: any): string {
  const { patient, previousSOAP, sessionNumber, sessionType } = context;

  const sessionTypeLabels: Record<string, string> = {
    initial: 'Consulta Inicial',
    'follow-up': 'Consulta de Retorno',
    reassessment: 'Reavaliação',
    discharge: 'Alta',
  };
  const sessionTypeLabel = sessionTypeLabels[sessionType || 'follow-up'] || sessionTypeLabels['follow-up'];

  // Format previous SOAP history
  const historyText = previousSOAP && previousSOAP.length > 0
    ? `

## Histórico de Sessões Anteriores

${previousSOAP.slice(-2).map((soap: any) => `
Sessão ${soap.sessionNumber}:
- S: ${soap.subjective?.substring(0, 200)}...
- A: ${soap.assessment?.substring(0, 200)}...
`).join('\n')}
`
    : '';

  return `
## Contexto da Consulta

**Tipo de Sessão:** ${sessionTypeLabel}
**Número da Sessão:** ${sessionNumber}

**Dados do Paciente:**
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Gênero: ${patient.gender}
- Condição Principal: ${patient.mainCondition}
- Histórico Médico: ${patient.medicalHistory || 'N/A'}
${historyText}

## Transcrição da Consulta

${consultationText}

## Solicitação

Gere uma nota SOAP estruturada e completa em português brasileiro com base na transcrição acima.

Inclua:
1. **Subjective**: Queixas e relatos do paciente com nível de dor (0-10)
2. **Objective**: Exame físico detalhado (inspeção, palpação, testes de movimento, testes especiais)
3. **Assessment**: Avaliação clínica, diagnóstico funcional e prognóstico
4. **Plan**: Plano de tratamento com objetivos específicos, intervenções, frequência e exercícios domiciliares

Adicione também:
- Principais achados clínicos da sessão
- Recomendações para próxima sessão
- Sinais de alerta (red flags) se houver
- Códigos CID-10 sugeridos

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
    .where('feature', '==', 'CLINICAL_ANALYSIS')
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
    .where('feature', '==', 'CLINICAL_ANALYSIS')
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
    logger.error('[SOAPGeneration] Failed to record usage:', error);
  }
}
