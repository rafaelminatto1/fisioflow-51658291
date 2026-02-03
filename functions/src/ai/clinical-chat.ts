/**
 * AI Clinical Assistant Chat
 * Provides clinical insights and assistance using Vertex AI Gemini
 *
 * SAFETY FEATURES:
 * - PHI detection and redaction
 * - Content safety filtering
 * - Usage tracking and rate limiting
 * - Medical disclaimers
 * - Input sanitization
 */

import { onCall } from 'firebase-functions/v2/https';
import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';
import { withIdempotency } from '../lib/idempotency';

const logger = getLogger('ai-clinical-chat');
const db = admin.firestore();

// Usage tracking for cost management
const MAX_DAILY_REQUESTS = 100;
const COST_PER_1K_TOKENS = 0.0001; // Estimated cost

// PHI (Protected Health Information) patterns for detection
const PHI_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, // Email addresses
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN-like patterns
  /\b(?:Rua|Av|Avenida|Rua|Travessa|Alameda)\s+[\w\s]+,\s*\d+/gi, // Addresses (PT)
  /\b(?:Street|St|Avenue|Av|Road|Rd)\s+[\w\s]+,\s*\d+/gi, // Addresses (EN)
];

// Blocked content patterns
const BLOCKED_PATTERNS = [
  /(?:suicide|kill myself|end my life)/i,
  /(?:medical emergency|call 911|call 192)/i,
  /(?:prescribe|medication|dosage|mg pill)/i, // Prescription requests
];

// System prompt for clinical assistant
const CLINICAL_SYSTEM_PROMPT = `Você é um assistente clínico de fisioterapia do FisioFlow, especializado em ajudar fisioterapeutas com:

1. **Análise de Pacientes**: Interpretar histórico clínico, avaliações e evoluções
2. **Sugestões de Exercícios**: Recomendar exercícios baseados em condições e limitações
3. **Planejamento de Tratamento**: Auxiliar na estruturação de planos de tratamento
4. **Análise de Progresso**: Interpretar evolução e sugerir ajustes

**⚠️ AVISO LEGAL OBRIGATÓRIO:**
Este assistente NÃO substitui avaliação médica profissional. Sempre consulte um médico para:
- Emergências médicas
- Condições agudas ou graves
- Prescrição de medicamentos
- Procedimentos invasivos
- Dor torácica, falta de ar, sintomas neurológicos

**Restrições:**
- NÃO faça diagnósticos definitivos
- NÃO prescreva medicamentos
- NÃO ignore protocolos de emergência
- SEMPRE recomende avaliação presencial quando apropriado

**Formato de Resposta:**
Use markdown. Inclua avisos quando relevante. Seja específico e prático.

**Lembre-se:** Você é um assistente de apoio, NÃO um substituto para avaliação profissional.`;

/**
 * Detect and redact PHI from text
 */
function detectAndRedactPHI(text: string): { sanitized: string; hasPHI: boolean; detectedTypes: string[] } {
  let sanitized = text;
  const detectedTypes: string[] = [];

  // Check for PHI patterns
  if (PHI_PATTERNS[0].test(text)) detectedTypes.push('phone');
  if (PHI_PATTERNS[1].test(text)) detectedTypes.push('email');
  if (PHI_PATTERNS[2].test(text)) detectedTypes.push('ssn-like');
  if (PHI_PATTERNS[3].test(text) || PHI_PATTERNS[4].test(text)) detectedTypes.push('address');

  // Redact PHI
  PHI_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return { sanitized, hasPHI: detectedTypes.length > 0, detectedTypes };
}

/**
 * Check for blocked content
 */
function checkBlockedContent(text: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        blocked: true,
        reason: pattern.toString().includes('suicide') ? 'emergency-crisis' :
                pattern.toString().includes('prescribe') ? 'prescription-request' :
                'emergency-warning',
      };
    }
  }
  return { blocked: false };
}

/**
 * Check daily usage limit
 */
async function checkUsageLimit(userId: string): Promise<{ allowed: boolean; remaining?: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const snapshot = await db
    .collection('clinical_chat_logs')
    .where('userId', '==', userId)
    .where('timestamp', '>=', today)
    .count()
    .get();

  const count = snapshot.data().count;
  const remaining = Math.max(0, MAX_DAILY_REQUESTS - count);

  if (count >= MAX_DAILY_REQUESTS) {
    return { allowed: false };
  }

  return { allowed: true, remaining };
}

/**
 * Sanitize input by limiting length and removing dangerous patterns
 */
function sanitizeInput(message: string): { valid: boolean; sanitized: string; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Message is required' };
  }

  if (message.length > 5000) {
    return { valid: false, sanitized: '', error: 'Message too long (max 5000 characters)' };
  }

  // Check for blocked content
  const blockedCheck = checkBlockedContent(message);
  if (blockedCheck.blocked) {
    return {
      valid: false,
      sanitized: '',
      error: blockedCheck.reason === 'emergency-crisis' ?
        'Se você estiver em crise, ligue imediatamente para o CVV (188) ou emergência (192).' :
        blockedCheck.reason === 'prescription-request' ?
        'Este assistente não pode prescrever medicamentos. Consulte um médico.' :
        'Conteúdo não permitido nesta consulta.'
    };
  }

  return { valid: true, sanitized: message.trim() };
}

/**
 * Calculate estimated cost from token usage
 */
function estimateCost(inputTokens: number, outputTokens: number): number {
  const totalTokens = inputTokens + outputTokens;
  return (totalTokens / 1000) * COST_PER_1K_TOKENS;
}

/**
 * Clinical chat with AI (with safety guardrails)
 */
export const aiClinicalChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 10,
    timeoutSeconds: 120,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { message, context, conversationHistory } = data as {
      message: string;
      context?: {
        patientId?: string;
        condition?: string;
        sessionCount?: number;
        recentEvolutions?: Array<{ date: string; notes: string }>;
      };
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    // Sanitize input
    const inputCheck = sanitizeInput(message);
    if (!inputCheck.valid) {
      throw new HttpsError('invalid-argument', inputCheck.error || 'Invalid input');
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(userId);
    if (!usageCheck.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Daily limit reached (${MAX_DAILY_REQUESTS} requests). Try again tomorrow.`
      );
    }

    // Detect and redact PHI
    const phiCheck = detectAndRedactPHI(inputCheck.sanitized);
    const sanitizedMessage = phiCheck.sanitized;

    if (phiCheck.hasPHI) {
      logger.warn('PHI detected and redacted in clinical chat', {
        userId,
        detectedTypes: phiCheck.detectedTypes,
      });
    }

    try {
      logger.info('AI clinical chat request', {
        userId,
        patientId: context?.patientId,
        remainingRequests: usageCheck.remaining,
        phiDetected: phiCheck.hasPHI,
      });

      // Build conversation context
      let contextPrompt = CLINICAL_SYSTEM_PROMPT + '\n\n';

      if (context) {
        contextPrompt += '**Contexto do Paciente:**\n';
        if (context.patientId) contextPrompt += `- ID do Paciente: ${context.patientId}\n`;
        if (context.condition) contextPrompt += `- Condição: ${context.condition}\n`;
        if (context.sessionCount) contextPrompt += `- Sessões realizadas: ${context.sessionCount}\n`;
        if (context.recentEvolutions && context.recentEvolutions.length > 0) {
          contextPrompt += '\n**Evoluções Recentes:**\n';
          context.recentEvolutions.forEach(evo => {
            contextPrompt += `- ${evo.date}: ${evo.notes}\n`;
          });
        }
        contextPrompt += '\n';
      }

      // Add PHI warning if detected
      if (phiCheck.hasPHI) {
        contextPrompt += '**Nota:** Informações sensíveis foram automaticamente removidas da consulta.\n\n';
      }

      // Initialize Vertex AI
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      });

      const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: contextPrompt,
      });

      // Sanitize conversation history
      const sanitizedHistory = (conversationHistory || []).map(msg => ({
        role: msg.role,
        parts: [{ text: detectAndRedactPHI(msg.content).sanitized }],
      }));

      // Build chat history
      const contents = [
        ...sanitizedHistory,
        { role: 'user', parts: [{ text: sanitizedMessage }] },
      ];

      // Generate response
      // @ts-ignore - Type mismatch between conversation history format and Content[]
      const result = await generativeModel.generateContent({ contents });
      const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!response) {
        throw new Error('No response from AI model');
      }

      // Estimate token usage and cost
      const usageMetadata = result.response.usageMetadata;
      const estimatedCost = usageMetadata
        ? estimateCost(usageMetadata.totalTokenCount || 0, usageMetadata.totalTokenCount || 0)
        : 0;

      // Log the interaction with safety metadata
      await db.collection('clinical_chat_logs').add({
        userId,
        patientId: context?.patientId || null,
        message: sanitizedMessage, // Store sanitized version
        originalMessage: phiCheck.hasPHI ? message : null, // Store original only if PHI was redacted
        response,
        context: context || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        safetyMetadata: {
          phiDetected: phiCheck.hasPHI,
          phiTypes: phiCheck.detectedTypes,
          estimatedCost,
          tokenCount: usageMetadata?.totalTokenCount,
        },
      });

      return {
        success: true,
        response,
        timestamp: new Date().toISOString(),
        disclaimers: phiCheck.hasPHI ? ['Informações sensíveis foram removidas automaticamente.'] : [],
        usage: {
          remaining: (usageCheck.remaining || 1) - 1,
          limit: MAX_DAILY_REQUESTS,
        },
      };
    } catch (error) {
      logger.error('AI clinical chat failed', { error, userId });
      throw new HttpsError(
        'internal',
        `Failed to get AI response: ${(error as Error).message}`
      );
    }
  }
);

/**
 * AI-powered exercise recommendation (enhanced)
 */
export const aiExerciseRecommendationChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 10,
    timeoutSeconds: 120,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { patientData, question } = data as {
      patientData: {
        name: string;
        condition: string;
        limitations: string[];
        goals: string[];
        sessionCount: number;
        equipment?: string[];
      };
      question: string;
    };

    if (!patientData || !question) {
      throw new HttpsError('invalid-argument', 'patientData and question are required');
    }

    try {
      // Use idempotency for caching similar recommendations
      const cacheParams = {
        condition: patientData.condition,
        limitations: patientData.limitations.sort(),
        goals: patientData.goals.sort(),
        question,
      };

      const response = await withIdempotency(
        'EXERCISE_RECOMMENDATION_CHAT',
        userId,
        cacheParams,
        async () => generateExerciseRecommendation(patientData, question),
        { cacheTtl: 10 * 60 * 1000 } // 10 minutes cache
      );

      return {
        success: true,
        response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('AI exercise recommendation failed', { error, userId });
      throw new HttpsError(
        'internal',
        `Failed to get recommendation: ${(error as Error).message}`
      );
    }
  }
);

/**
 * AI SOAP note generator with chat
 */
export const aiSoapNoteChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 10,
    timeoutSeconds: 120,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { patientContext, subjective, objective, assistantNeeded } = data as {
      patientContext: {
        patientName: string;
        condition: string;
        sessionNumber: number;
      };
      subjective?: string;
      objective?: string;
      assistantNeeded: 'assessment' | 'plan' | 'both' | 'full';
    };

    if (!patientContext) {
      throw new HttpsError('invalid-argument', 'patientContext is required');
    }

    try {
      const prompt = buildSOAPPrompt(patientContext, subjective, objective, assistantNeeded);

      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
        location: 'us-central1',
      });

      const model = vertexAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: `Você é um especialista em documentação fisioterapêutica. Gere notas SOAP profissionais e concisas.`,
      });

      const result = await model.generateContent(prompt);
      const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;

      return {
        success: true,
        soapNote: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('AI SOAP note generation failed', { error, userId });
      throw new HttpsError(
        'internal',
        `Failed to generate SOAP note: ${(error as Error).message}`
      );
    }
  }
);

/**
 * Auto-suggestions based on patient history
 */
export const aiGetSuggestions = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 10,
    timeoutSeconds: 90,
  },
  async (request) => {
    const { data } = request;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { patientId, suggestionType } = data as {
      patientId: string;
      suggestionType: 'exercises' | 'treatment' | 'homecare' | 'all';
    };

    if (!patientId) {
      throw new HttpsError('invalid-argument', 'patientId is required');
    }

    try {
      // Fetch patient history
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists) {
        throw new HttpsError('not-found', 'Patient not found');
      }

      const patient = patientDoc.data();

      // Fetch recent evolutions
      const evolutionsSnapshot = await db
        .collection('evolutions')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      const recentEvolutions = evolutionsSnapshot.docs.map(doc => doc.data());

      // Fetch treatment sessions
      const sessionsSnapshot = await db
        .collection('treatment_sessions')
        .where('patientId', '==', patientId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const recentSessions = sessionsSnapshot.docs.map(doc => doc.data());

      // Generate suggestions
      const suggestions = await generateSuggestions(
        patient,
        recentEvolutions,
        recentSessions,
        suggestionType
      );

      return {
        success: true,
        suggestions,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if ((error as HttpsError).code === 'not-found') {
        throw error;
      }
      logger.error('AI suggestions failed', { error, userId, patientId });
      throw new HttpsError(
        'internal',
        `Failed to generate suggestions: ${(error as Error).message}`
      );
    }
  }
);

// Helper functions

async function generateExerciseRecommendation(patientData: any, question: string): Promise<string> {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
    location: 'us-central1',
  });

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  const prompt = `Como fisioterapeuta especialista, recomende exercícios para:

**Paciente:** ${patientData.name}
**Condição:** ${patientData.condition}
**Limitações:** ${patientData.limitations.join(', ')}
**Objetivos:** ${patientData.goals.join(', ')}
**Sessão número:** ${patientData.sessionCount}
**Equipamentos disponíveis:** ${patientData.equipment?.join(', ') || 'Nenhum'}

**Pergunta do profissional:** ${question}

Forneça recomendações específicas, incluindo:
1. Exercícios recomendados (séries, repetições, descanso)
2. Progressão esperada
3. Precauções e contraindicações
4. Dicas para execução correta`;

  const result = await model.generateContent(prompt);
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function buildSOAPPrompt(
  patientContext: any,
  subjective: string | undefined,
  objective: string | undefined,
  assistantNeeded: string
): string {
  let prompt = `Paciente: ${patientContext.patientName}\n`;
  prompt += `Condição: ${patientContext.condition}\n`;
  prompt += `Sessão: ${patientContext.sessionNumber}\n\n`;

  if (subjective) {
    prompt += `**S (Subjetivo):** ${subjective}\n\n`;
  }

  if (objective) {
    prompt += `**O (Objetivo):** ${objective}\n\n`;
  }

  prompt += '**Complete a nota SOAP fornecendo:**\n';

  if (assistantNeeded === 'assessment' || assistantNeeded === 'both' || assistantNeeded === 'full') {
    prompt += '- **A (Avaliação):** Análise clínica baseada nas informações\n';
  }

  if (assistantNeeded === 'plan' || assistantNeeded === 'both' || assistantNeeded === 'full') {
    prompt += '- **P (Plano):** Plano de tratamento e próximos passos\n';
  }

  if (assistantNeeded === 'full') {
    prompt += '\nForneça também S e O se não foram fornecidos.';
  }

  return prompt;
}

async function generateSuggestions(
  patient: any,
  evolutions: any[],
  sessions: any[],
  type: string
): Promise<any> {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
    location: 'us-central1',
  });

  const model = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  // Build context from patient history
  const context = {
    condition: patient.condition,
    sessionCount: sessions.length,
    recentProgress: evolutions.slice(0, 3).map(e => e.notes).join('\n'),
  };

  let prompt = '';

  if (type === 'exercises' || type === 'all') {
    prompt += `Sugira 3-5 exercícios apropriados baseados no histórico do paciente.\n`;
  }

  if (type === 'treatment' || type === 'all') {
    prompt += `Sugira ajustes no plano de tratamento baseado no progresso recente.\n`;
  }

  if (type === 'homecare' || type === 'all') {
    prompt += `Sugira cuidados domiciliares que o paciente pode realizar.\n`;
  }

  prompt += `\n**Contexto do Paciente:**\n${JSON.stringify(context, null, 2)}`;

  prompt += `\n\nResponda em formato JSON com estrutura:
{
  "exercises": [{name, sets, reps, rest, instructions}],
  "treatmentAdjustments": [{area, suggestion, rationale}],
  "homeCare": [{activity, frequency, instructions}]
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    return JSON.parse(response);
  } catch {
    // If JSON parsing fails, return structured fallback
    return {
      exercises: [],
      treatmentAdjustments: [],
      homeCare: [],
      rawResponse: response,
    };
  }
}

import { HttpsError } from 'firebase-functions/v2/https';
