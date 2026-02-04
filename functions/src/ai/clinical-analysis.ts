/**
 * Cloud Function: Clinical Decision Support Analysis
 *
 * Provides evidence-based clinical analysis, red flag identification,
 * and treatment recommendations using Gemini Pro with optional Google Search grounding.
 *
 * @route ai/clinicalAnalysis
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

interface ClinicalAnalysisRequest {
  /** Patient ID */
  patientId: string;
  /** Current SOAP data */
  currentSOAP: {
    subjective?: string;
    objective?: any;
    assessment?: string;
    plan?: any;
    vitalSigns?: Record<string, any>;
    functionalTests?: Record<string, any>;
  };
  /** Enable Google Search grounding for evidence */
  useGrounding?: boolean;
  /** Treatment duration in weeks */
  treatmentDurationWeeks?: number;
  /** Quick red flag check only */
  redFlagCheckOnly?: boolean;
}

interface ClinicalAnalysisResponse {
  success: boolean;
  data?: {
    redFlags?: Array<{
      description: string;
      urgency: 'immediate' | 'urgent' | 'monitor' | 'informational';
      action: string;
      justification: string;
      category?: 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'systemic' | 'other';
    }>;
    treatmentRecommendations?: Array<{
      intervention: string;
      evidenceLevel: 'strong' | 'moderate' | 'limited' | 'expert_opinion';
      rationale: string;
      references?: string[];
      expectedOutcomes?: string[];
      contraindications?: string[];
    }>;
    prognosis?: Array<{
      indicator: string;
      value: 'good' | 'fair' | 'poor';
      confidence: number;
      explanation: string;
      factors: string[];
    }>;
    recommendedAssessments?: Array<{
      assessment: string;
      purpose: string;
      priority: 'essential' | 'recommended' | 'optional';
      timing: string;
    }>;
    caseSummary?: string;
    keyConsiderations?: string[];
    differentialDiagnoses?: string[];
    searchQueries?: string[];
  };
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  groundingUsed?: boolean;
}

// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================

const RATE_LIMITS = {
  maxRequestsPerHour: 25,
  maxRequestsPerDay: 100,
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const clinicalAnalysisHandler = async (request: any): Promise<ClinicalAnalysisResponse> => {
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
    logger.warn(`[ClinicalAnalysis] Rate limit exceeded for user ${userId}`);
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
  const data = request.data as ClinicalAnalysisRequest;

  if (!data.patientId) {
    throw new HttpsError('invalid-argument', 'patientId is required');
  }

  if (!data.currentSOAP) {
    throw new HttpsError('invalid-argument', 'currentSOAP is required');
  }

  try {
    logger.info(`[ClinicalAnalysis] Processing request for patient ${data.patientId}`);

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

    // Fetch previous SOAP records for trend analysis
    const soapSnapshot = await firestore
      .collection('patients')
      .doc(data.patientId)
      .collection('soap_records')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const previousSessions = soapSnapshot.docs.map(doc => doc.data());

    // Calculate patient age and session count
    const age = calculateAge(patient?.birth_date || '');
    const sessionNumber = previousSessions.length + 1;

    // Build case data
    const caseData = {
      patient: {
        id: patient?.id || data.patientId,
        name: patient?.name || 'Unknown',
        age,
        gender: patient?.gender || 'unknown',
        mainCondition: patient?.main_condition || 'N/A',
        medicalHistory: patient?.medical_history || 'N/A',
      },
      currentSOAP: data.currentSOAP,
      previousSessions: previousSessions.map((soap: any) => ({
        sessionNumber: soap.session_number,
        subjective: soap.subjective,
        assessment: soap.assessment,
        plan: soap.plan,
      })),
      sessionNumber,
      treatmentDurationWeeks: data.treatmentDurationWeeks,
    };

    // Generate clinical analysis
    const aiResult = await generateClinicalAnalysis(
      caseData,
      data.useGrounding ?? false,
      data.redFlagCheckOnly ?? false
    );

    if (!aiResult.success) {
      throw new HttpsError('internal', aiResult.error || 'Clinical analysis failed');
    }

    // Record usage
    const duration = Date.now() - startTime;
    const modelName = data.redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

    await recordUsage({
      userId,
      feature: 'TREATMENT_PLANNING',
      model: modelName,
      inputTokens: aiResult.usage!.promptTokens,
      outputTokens: aiResult.usage!.completionTokens,
      duration,
      success: true,
    });

    return {
      success: true,
      data: aiResult.data,
      usage: aiResult.usage,
      groundingUsed: aiResult.groundingUsed,
    };
  } catch (error) {
    // Record failed usage
    const duration = Date.now() - startTime;
    await recordUsage({
      userId,
      feature: 'TREATMENT_PLANNING',
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

    logger.error('[ClinicalAnalysis] Error:', error);
    throw new HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Failed to generate clinical analysis'
    );
  }
};

export const clinicalAnalysis = onCall({
  cors: CORS_ORIGINS,
  region: 'southamerica-east1',
  memory: '1GiB',
  cpu: 1,
  maxInstances: 10,
  timeoutSeconds: 300, // 5 minutes for AI generation
}, clinicalAnalysisHandler);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate clinical analysis using Gemini Pro
 */
async function generateClinicalAnalysis(
  caseData: any,
  useGrounding: boolean,
  redFlagCheckOnly: boolean
): Promise<{
  success: boolean;
  data?: ClinicalAnalysisResponse['data'];
  usage?: ClinicalAnalysisResponse['usage'];
  groundingUsed?: boolean;
  error?: string;
}> {
  try {
    // Import Firebase AI Logic
    const { VertexAI } = await import('@google-cloud/vertexai');

    const vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT || 'fisioflow-migration',
    });

    const generativeModel = vertexAI.getGenerativeModel({
      model: redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
    });
    const temperature = redFlagCheckOnly ? 0.1 : 0.2;
    const maxTokens = redFlagCheckOnly ? 2048 : 8192;

    // Build prompt
    const prompt = buildClinicalPrompt(caseData, redFlagCheckOnly);

    // Build system instruction
    const systemInstruction = redFlagCheckOnly
      ? `You are an expert clinical decision support system for physical therapy.

Analyze the patient case and identify ONLY red flags that require attention.

Red Flag Categories:
- **Cardiovascular**: Chest pain, dyspnea, abnormal vital signs, edema
- **Neurological**: Progressive weakness, sensory changes, gait disturbances
- **Systemic**: Fever, unexplained weight loss, night pain
- **Musculoskeletal**: Fracture signs, severe pain, loss of function

Return ONLY valid JSON with red flags array containing:
- description: description of the red flag
- urgency: "immediate" | "urgent" | "monitor" | "informational"
- action: recommended action
- justification: clinical reasoning
- category: "cardiovascular" | "neurological" | "musculoskeletal" | "systemic" | "other"`
      : `You are an expert clinical decision support system for physical therapy practice in Brazil.

Core Principles:
1. **Safety First**: Always flag potential red flags requiring medical attention
2. **Evidence-Based**: Base recommendations on current research and clinical guidelines
3. **Brazilian Standards**: Consider Brazilian physical therapy guidelines and healthcare context
4. **Professional Judgment**: Support, never replace, clinical judgment
5. **Clear Communication**: Use clear, professional Portuguese

Evidence Levels:
- **Strong**: Multiple high-quality RCTs, systematic reviews, meta-analyses
- **Moderate**: Some RCTs, well-designed cohort studies
- **Limited**: Case series, expert consensus, low-quality studies
- **Expert Opinion**: Clinical experience, no direct research

${useGrounding ? `
Google Search Integration:
When analyzing cases, search for:
1. Latest research on the patient's condition
2. Current clinical guidelines (Brazilian and international)
3. Evidence for recommended interventions
4. Contraindications or precautions
5. Red flags specific to the condition

Include search queries used in the response.
` : ''}

Return ONLY valid JSON matching the provided schema.`;

    // Configure options
    const options: any = {
      model: redFlagCheckOnly ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
      prompt,
      temperature,
      maxOutputTokens: maxTokens,
      systemInstruction,
    };

    // Add grounding tools if enabled
    if (useGrounding && !redFlagCheckOnly) {
      options.tools = [{ googleSearch: {} }];
    }

    // Generate content
    const result = await generativeModel.generateContent(options);

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

    // Estimate tokens
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);

    // Estimate cost
    const costPerMillionInput = redFlagCheckOnly ? 0.075 : 1.25;
    const costPerMillionOutput = redFlagCheckOnly ? 0.30 : 5.00;
    const estimatedCost = (promptTokens / 1_000_000) * costPerMillionInput +
      (completionTokens / 1_000_000) * costPerMillionOutput;

    return {
      success: true,
      data: redFlagCheckOnly ? { redFlags: analysisData.redFlags || analysisData } : analysisData,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost,
      },
      groundingUsed: useGrounding && !redFlagCheckOnly,
    };
  } catch (error) {
    logger.error('[ClinicalAnalysis] AI generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Clinical analysis failed',
    };
  }
}

/**
 * Build clinical analysis prompt
 */
function buildClinicalPrompt(caseData: any, redFlagCheckOnly: boolean): string {
  const { patient, currentSOAP, previousSessions, sessionNumber, treatmentDurationWeeks } = caseData;

  // Format previous sessions
  const historyText = previousSessions && previousSessions.length > 0
    ? `

## Histórico de Tratamento

Sessões Anteriores: ${previousSessions.length}
${previousSessions.slice(-3).map((s: any) => `
Sessão ${s.sessionNumber}:
- Queixa: ${s.subjective?.substring(0, 150)}...
- Avaliação: ${s.assessment?.substring(0, 150)}...
`).join('\n')}
`
    : '';

  // Format vital signs
  const vitalSignsText = currentSOAP.vitalSigns
    ? `
**Sinais Vitais:**
${Object.entries(currentSOAP.vitalSigns)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')}
`
    : '';

  // Format functional tests
  const functionalTestsText = currentSOAP.functionalTests
    ? `
**Testes Funcionais:**
${JSON.stringify(currentSOAP.functionalTests, null, 2)}
`
    : '';

  if (redFlagCheckOnly) {
    return `
## Caso do Paciente

**Dados do Paciente:**
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Gênero: ${patient.gender}
- Condição Principal: ${patient.mainCondition}
- Histórico Médico: ${patient.medicalHistory || 'N/A'}

**SOAP Atual:**
${vitalSignsText}
- Subjetivo: ${currentSOAP.subjective || 'Não informado'}
- Objetivo: ${typeof currentSOAP.objective === 'object'
        ? JSON.stringify(currentSOAP.objective, null, 2)
        : currentSOAP.objective || 'Não realizado'}
- Avaliação: ${currentSOAP.assessment || 'Não realizada'}

${historyText}

## Solicitação

Analise APENAS sinais de alerta (red flags) que requerem atenção.

Retorne JSON com array de red flags contendo:
- description: descrição do sinal de alerta
- urgency: "immediate" | "urgent" | "monitor" | "informational"
- action: ação recomendada
- justification: justificativa clínica
- category: "cardiovascular" | "neurological" | "musculoskeletal" | "systemic" | "other"

Retorne APENAS JSON válido.`;
  }

  return `
## Caso Clínico para Análise

### Dados do Paciente
- **Nome:** ${patient.name}
- **Idade:** ${patient.age} anos
- **Gênero:** ${patient.gender}
- **Condição Principal:** ${patient.mainCondition}
- **Histórico Médico:** ${patient.medicalHistory || 'N/A'}

### Consulta Atual
- **Número da Sessão:** ${sessionNumber}
- **Duração do Tratamento:** ${treatmentDurationWeeks || 'N/A'} semanas
${vitalSignsText}
${functionalTestsText}

### SOAP Atual
**Subjetivo (Queixa do Paciente):**
${currentSOAP.subjective || 'Não informado'}

**Objetivo (Exame Físico):**
${typeof currentSOAP.objective === 'object'
      ? JSON.stringify(currentSOAP.objective, null, 2)
      : currentSOAP.objective || 'Não realizado'}

**Avaliação Clínica:**
${currentSOAP.assessment || 'Não realizada'}

**Plano de Tratamento:**
${typeof currentSOAP.plan === 'object'
      ? JSON.stringify(currentSOAP.plan, null, 2)
      : currentSOAP.plan || 'Não definido'}
${historyText}

## Análise Solicitada

Forneça uma análise completa incluindo:

1. **Red Flags:** Identifique sinais de alerta que requerem atenção imediata, urgente, ou monitoramento
2. **Recomendações de Tratamento:** Intervenções baseadas em evidências com nível de evidência
3. **Prognóstico:** Indicadores prognósticos com confiança e fatores influentes
4. **Avaliações Recomendadas:** Testes ou avaliações adicionais a considerar
5. **Resumo do Caso:** Síntese clínica concisa
6. **Considerações Chave:** Pontos importantes para tratamento
7. **Diagnósticos Diferenciais:** Condições a considerar (se aplicável)

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
    .where('feature', '==', 'TREATMENT_PLANNING')
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
    .where('feature', '==', 'TREATMENT_PLANNING')
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
    logger.error('[ClinicalAnalysis] Failed to record usage:', error);
  }
}
