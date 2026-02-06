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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { VertexAI } from '@google-cloud/vertexai';
import * as admin from 'firebase-admin';
import { getLogger } from '../lib/logger';
import { withIdempotency } from '../lib/idempotency';
import { retrievePatientKnowledgeContext } from './rag/patient-context-rag';

const logger = getLogger('ai-clinical-chat');
const db = admin.firestore();
const CLINICAL_CHAT_MODEL = process.env.CLINICAL_CHAT_MODEL || 'gemini-2.5-flash';

// Usage tracking for cost management
const MAX_DAILY_REQUESTS = 100;
const COST_PER_1K_TOKENS = 0.0001; // Estimated cost
const MAX_RECENT_EVOLUTIONS = 6;
const MAX_CONTEXT_MEDICAL_RETURNS = 4;
const MAX_CONTEXT_SURGERIES = 6;
const MAX_CONTEXT_PATHOLOGIES = 6;
const MAX_CONTEXT_GOALS = 6;
const MAX_CONTEXT_SOAP_RECORDS = 5;
const MAX_CONTEXT_MEASUREMENT_TRENDS = 8;
const MAX_CONTEXT_APPOINTMENTS = 90;
const MAX_CONTEXT_UPCOMING_APPOINTMENTS = 5;
const MAX_CONTEXT_PRESCRIPTIONS = 8;
const MAX_CONTEXT_EXAMS = 6;
const MAX_CONTEXT_DOCUMENTS = 8;
const EXERCISE_ADHERENCE_WINDOW_DAYS = 30;

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

  try {
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
  } catch (error) {
    // Fail-open to keep clinical assistant available even when a Firestore index is missing.
    logger.warn('Usage limit check failed; allowing request without quota enforcement', {
      userId,
      error: (error as Error).message,
    });
    return { allowed: true, remaining: MAX_DAILY_REQUESTS };
  }
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

interface ClinicalChatContext {
  patientId?: string;
  patientName?: string;
  condition?: string;
  sessionCount?: number;
  recentEvolutions?: Array<{ date: string; notes: string }>;
  patientProfileSummary?: string[];
  medicalReturns?: Array<{
    date?: string;
    doctorName?: string;
    doctorPhone?: string;
    period?: string;
    reportDone?: boolean;
    reportSent?: boolean;
    notes?: string;
  }>;
  surgeries?: Array<{
    date?: string;
    surgeryName?: string;
    surgeryType?: string;
    affectedSide?: string;
    surgeon?: string;
    hospital?: string;
    complications?: string;
    notes?: string;
  }>;
  activePathologies?: Array<{
    name: string;
    status?: string;
    severity?: string;
  }>;
  activeGoals?: Array<{
    title: string;
    status?: string;
    priority?: string;
    targetDate?: string;
  }>;
  soapRecords?: Array<{
    date?: string;
    sessionNumber?: number;
    painLevel?: number;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  }>;
  measurementTrends?: Array<{
    name: string;
    measurementType?: string;
    latestValue: number;
    previousValue?: number;
    delta?: number;
    unit?: string;
    measuredAt?: string;
    notes?: string;
  }>;
  appointmentsSummary?: {
    total: number;
    completed: number;
    noShow: number;
    cancelled: number;
    upcoming: Array<{
      date?: string;
      time?: string;
      status?: string;
      type?: string;
      notes?: string;
    }>;
    lastCompleted?: {
      date?: string;
      time?: string;
      status?: string;
      type?: string;
    };
  };
  exerciseAdherence?: {
    activePrescriptions: Array<{
      exerciseName?: string;
      frequency?: string;
      sets?: number;
      reps?: number;
      durationSeconds?: number;
      notes?: string;
    }>;
    logsLast30Days: number;
    adherencePercentage?: number;
    lastLogDate?: string;
  };
  examSummary?: {
    exams: Array<{
      title?: string;
      examType?: string;
      examDate?: string;
      description?: string;
      filesCount?: number;
    }>;
    documents: Array<{
      fileName?: string;
      category?: string;
      createdAt?: string;
      description?: string;
    }>;
  };
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function toNonNegativeInteger(value: unknown): number | undefined {
  const numericValue = toFiniteNumber(value);
  if (numericValue === undefined || numericValue < 0) return undefined;
  return Math.floor(numericValue);
}

function toInteger(value: unknown): number | undefined {
  const numericValue = toFiniteNumber(value);
  if (numericValue === undefined) return undefined;
  return Math.floor(numericValue);
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    return undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getFirstString(
  data: Record<string, unknown> | undefined,
  keys: string[]
): string | undefined {
  if (!data) return undefined;
  for (const key of keys) {
    const value = toStringValue(data[key]);
    if (value) return value;
  }
  return undefined;
}

function getFirstBoolean(
  data: Record<string, unknown> | undefined,
  keys: string[]
): boolean | undefined {
  if (!data) return undefined;
  for (const key of keys) {
    const value = toBooleanValue(data[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function composeDateTime(dateValue?: string, timeValue?: string): string | undefined {
  if (!dateValue && !timeValue) return undefined;
  if (!dateValue) return timeValue;
  if (!timeValue) return dateValue;

  const dateOnly = dateValue.includes('T') ? dateValue.split('T')[0] : dateValue;
  const timeOnly = timeValue.includes('T')
    ? (timeValue.split('T')[1] || timeValue)
    : timeValue;
  const normalizedTime = timeOnly.length === 5 ? `${timeOnly}:00` : timeOnly;
  return `${dateOnly}T${normalizedTime}`;
}

function normalizeAppointmentStatus(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;

  if (normalized === 'completed') return 'concluido';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelado';
  if (normalized === 'no_show' || normalized === 'no-show') return 'faltou';
  return normalized;
}

function isCompletedAppointmentStatus(status?: string): boolean {
  return status === 'concluido' || status === 'atendido';
}

function isNoShowAppointmentStatus(status?: string): boolean {
  return status === 'faltou' || status === 'falta' || status === 'paciente_faltou';
}

function isCancelledAppointmentStatus(status?: string): boolean {
  return status === 'cancelado' || status === 'remarcado' || status === 'reagendado';
}

function isUpcomingAppointmentStatus(status?: string): boolean {
  if (!status) return true;
  return !isCompletedAppointmentStatus(status)
    && !isNoShowAppointmentStatus(status)
    && !isCancelledAppointmentStatus(status);
}

function inferWeeklyFrequencyFromText(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();

  if (normalized.includes('diar')) return 7;
  if (normalized.includes('quinzen')) return 0.5;
  if (normalized.includes('mensal')) return 0.25;

  const matchPerWeek = normalized.match(/(\d+(?:[.,]\d+)?)\s*x?\s*(?:\/|\s*)\s*(?:semana|semanal|week)/);
  if (matchPerWeek) {
    const parsed = Number(matchPerWeek[1].replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const genericMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (genericMatch && (normalized.includes('semana') || normalized.includes('semanal'))) {
    const parsed = Number(genericMatch[1].replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return undefined;
}

function truncateText(value: string, maxLength = 280): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeRecentEvolutions(value: unknown): Array<{ date: string; notes: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const date = toStringValue((item as Record<string, unknown>).date);
      const notes = toStringValue((item as Record<string, unknown>).notes);
      if (!notes) return null;

      return {
        date: date || new Date().toISOString(),
        notes: truncateText(notes),
      };
    })
    .filter((item): item is { date: string; notes: string } => !!item)
    .slice(0, MAX_RECENT_EVOLUTIONS);
}

function getPatientNameFromDoc(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;

  return toStringValue(data.name)
    || toStringValue(data.full_name)
    || toStringValue(data.patient_name);
}

function getConditionFromDoc(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined;

  const mainCondition = toStringValue(data.main_condition);
  if (mainCondition) return mainCondition;

  return toStringValue(data.condition)
    || toStringValue(data.primaryComplaint)
    || toStringValue(data.primary_complaint)
    || toStringValue(data.diagnosis)
    || toStringValue(data.mainDiagnosis)
    || toStringValue(data.main_diagnosis);
}

function getEventDate(record: Record<string, unknown>): string {
  return (
    toStringValue(record.session_date)
    || toStringValue(record.created_at)
    || toStringValue(record.updated_at)
    || new Date().toISOString()
  );
}

function getInsightDate(record: Record<string, unknown>): string {
  return (
    toStringValue(record.created_at)
    || toStringValue(record.timestamp)
    || new Date().toISOString()
  );
}

function buildSessionEventNotes(record: Record<string, unknown>): string {
  const details: string[] = ['Resumo de sessao'];

  const painReduction = toFiniteNumber(record.pain_reduction);
  if (painReduction !== undefined) details.push(`reducao de dor ${painReduction}`);

  const satisfaction = toInteger(record.patient_satisfaction);
  if (satisfaction !== undefined) details.push(`satisfacao ${satisfaction}/10`);

  const painBefore = toInteger(record.pain_level_before);
  if (painBefore !== undefined) details.push(`dor antes ${painBefore}/10`);

  const painAfter = toInteger(record.pain_level_after);
  if (painAfter !== undefined) details.push(`dor apos ${painAfter}/10`);

  return truncateText(details.join(', '));
}

async function enrichClinicalContext(baseContext: ClinicalChatContext): Promise<ClinicalChatContext> {
  if (!baseContext.patientId) return baseContext;

  const patientId = baseContext.patientId;
  const enriched: ClinicalChatContext = {
    ...baseContext,
    recentEvolutions: normalizeRecentEvolutions(baseContext.recentEvolutions),
  };

  const loadMedicalReturns = async () => {
    try {
      return await db
        .collection('patient_medical_returns')
        .where('patient_id', '==', patientId)
        .orderBy('return_date', 'desc')
        .limit(MAX_CONTEXT_MEDICAL_RETURNS + 6)
        .get();
    } catch (error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'failed-precondition') {
        logger.warn('Missing Firestore index for patient_medical_returns in AI context. Using fallback query.', {
          patientId,
        });
        return db
          .collection('patient_medical_returns')
          .where('patient_id', '==', patientId)
          .limit(MAX_CONTEXT_MEDICAL_RETURNS + 10)
          .get();
      }
      throw error;
    }
  };

  const patientDocPromise = db.collection('patients').doc(patientId).get().catch((error) => {
    logger.warn('Failed to fetch patient document for context enrichment', {
      patientId,
      error: (error as Error).message,
    });
    return null;
  });

  const sessionsCountPromise = (
    enriched.sessionCount === undefined
      ? db.collection('patient_session_metrics').where('patient_id', '==', patientId).count().get()
      : Promise.resolve(null)
  ).catch((error) => {
    logger.warn('Failed to count sessions for context enrichment', {
      patientId,
      error: (error as Error).message,
    });
    return null;
  });

  const recentSessionsPromise = (
    enriched.recentEvolutions && enriched.recentEvolutions.length > 0
      ? Promise.resolve(null)
      : db.collection('patient_session_metrics').where('patient_id', '==', patientId).limit(4).get()
  ).catch((error) => {
    logger.warn('Failed to fetch recent sessions for context enrichment', {
      patientId,
      error: (error as Error).message,
    });
    return null;
  });

  const recentInsightsPromise = (
    enriched.recentEvolutions && enriched.recentEvolutions.length > 0
      ? Promise.resolve(null)
      : db.collection('patient_insights').where('patient_id', '==', patientId).limit(3).get()
  ).catch((error) => {
    logger.warn('Failed to fetch recent insights for context enrichment', {
      patientId,
      error: (error as Error).message,
    });
    return null;
  });

  const medicalReturnsPromise = loadMedicalReturns().catch((error) => {
    logger.warn('Failed to fetch patient medical returns for context enrichment', {
      patientId,
      error: (error as Error).message,
    });
    return null;
  });

  const surgeriesPromise = db
    .collection('patient_surgeries')
    .where('patient_id', '==', patientId)
    .limit(MAX_CONTEXT_SURGERIES + 8)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch patient surgeries for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const pathologiesPromise = db
    .collection('patient_pathologies')
    .where('patient_id', '==', patientId)
    .limit(MAX_CONTEXT_PATHOLOGIES + 8)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch patient pathologies for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const goalsPromise = db
    .collection('patient_goals')
    .where('patient_id', '==', patientId)
    .limit(MAX_CONTEXT_GOALS + 8)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch patient goals for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const soapRecordsPromise = db
    .collection('soap_records')
    .where('patient_id', '==', patientId)
    .limit(MAX_CONTEXT_SOAP_RECORDS + 12)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch SOAP records for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const measurementsPromise = db
    .collection('evolution_measurements')
    .where('patient_id', '==', patientId)
    .limit(80)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch evolution measurements for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const appointmentsPromise = db
    .collection('appointments')
    .where('patient_id', '==', patientId)
    .limit(MAX_CONTEXT_APPOINTMENTS)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch appointments for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const prescribedExercisesPromise = db
    .collection('prescribed_exercises')
    .where('patient_id', '==', patientId)
    .limit(40)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch prescribed exercises for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const exerciseLogsPromise = db
    .collection('exercise_logs')
    .where('patient_id', '==', patientId)
    .limit(220)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch exercise logs for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const patientExamsPromise = db
    .collection('patient_exams')
    .where('patient_id', '==', patientId)
    .limit(30)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch patient exams for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const patientDocumentsPromise = db
    .collection('patient_documents')
    .where('patient_id', '==', patientId)
    .limit(40)
    .get()
    .catch((error) => {
      logger.warn('Failed to fetch patient documents for context enrichment', {
        patientId,
        error: (error as Error).message,
      });
      return null;
    });

  const [patientDoc, sessionsCountSnap, recentSessionsSnap, recentInsightsSnap, medicalReturnsSnap, surgeriesSnap, pathologiesSnap, goalsSnap, soapRecordsSnap, measurementsSnap, appointmentsSnap, prescribedExercisesSnap, exerciseLogsSnap, patientExamsSnap, patientDocumentsSnap] = await Promise.all([
    patientDocPromise,
    sessionsCountPromise,
    recentSessionsPromise,
    recentInsightsPromise,
    medicalReturnsPromise,
    surgeriesPromise,
    pathologiesPromise,
    goalsPromise,
    soapRecordsPromise,
    measurementsPromise,
    appointmentsPromise,
    prescribedExercisesPromise,
    exerciseLogsPromise,
    patientExamsPromise,
    patientDocumentsPromise,
  ]);

  const patientData = patientDoc?.exists ? (patientDoc.data() as Record<string, unknown>) : undefined;

  if (!enriched.patientName) {
    enriched.patientName = getPatientNameFromDoc(patientData);
  }

  if (!enriched.condition) {
    enriched.condition = getConditionFromDoc(patientData);
  }

  const profileSummary: string[] = [];
  const profileMainCondition = getFirstString(patientData, [
    'main_condition',
    'condition',
    'primaryComplaint',
    'primary_complaint',
    'diagnosis',
  ]);
  const profileMedicalHistory = getFirstString(patientData, ['medical_history', 'medicalHistory']);
  const referringDoctorName = getFirstString(patientData, ['referring_doctor_name', 'referringDoctorName']);
  const referringDoctorPhone = getFirstString(patientData, ['referring_doctor_phone', 'referringDoctorPhone']);
  const patientReturnDate = getFirstString(patientData, ['medical_return_date', 'medicalReturnDate']);
  const patientReportDone = getFirstBoolean(patientData, ['medical_report_done', 'medicalReportDone']);
  const patientReportSent = getFirstBoolean(patientData, ['medical_report_sent', 'medicalReportSent']);

  if (profileMainCondition) profileSummary.push(`Condicao principal: ${profileMainCondition}`);
  if (profileMedicalHistory) profileSummary.push(`Historico clinico: ${truncateText(profileMedicalHistory, 220)}`);
  if (referringDoctorName) {
    profileSummary.push(
      `Medico assistente: ${referringDoctorName}${referringDoctorPhone ? ` (${referringDoctorPhone})` : ''}`
    );
  }
  if (patientReturnDate) profileSummary.push(`Retorno medico previsto no perfil: ${patientReturnDate}`);
  if (patientReportDone !== undefined || patientReportSent !== undefined) {
    const reportStatus = patientReportDone ? 'feito' : 'pendente';
    const sentStatus = patientReportSent ? 'enviado' : 'nao enviado';
    profileSummary.push(`Relatorio medico: ${reportStatus}; envio: ${sentStatus}`);
  }
  if (profileSummary.length > 0) {
    enriched.patientProfileSummary = profileSummary.slice(0, 8);
  }

  if (enriched.sessionCount === undefined && sessionsCountSnap) {
    const counted = sessionsCountSnap.data().count;
    if (typeof counted === 'number' && Number.isFinite(counted) && counted >= 0) {
      enriched.sessionCount = counted;
    }
  }

  if (enriched.sessionCount === undefined && soapRecordsSnap) {
    const counted = soapRecordsSnap.size;
    if (typeof counted === 'number' && Number.isFinite(counted) && counted >= 0) {
      enriched.sessionCount = counted;
    }
  }

  if (!enriched.recentEvolutions || enriched.recentEvolutions.length === 0) {
    const sessionEvents =
      recentSessionsSnap?.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          date: getEventDate(data),
          notes: buildSessionEventNotes(data),
        };
      }) ?? [];

    const insightEvents =
      recentInsightsSnap?.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const insightText = toStringValue(data.insight_text) || 'Insight clinico recente';
        const insightType = toStringValue(data.insight_type);
        const note = insightType
          ? `Insight (${insightType}): ${insightText}`
          : `Insight: ${insightText}`;
        return {
          date: getInsightDate(data),
          notes: truncateText(note),
        };
      }) ?? [];

    enriched.recentEvolutions = [...sessionEvents, ...insightEvents]
      .filter((item) => item.notes.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_RECENT_EVOLUTIONS);
  }

  const medicalReturns = (medicalReturnsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      date: getFirstString(record, ['return_date', 'medical_return_date']),
      doctorName: getFirstString(record, ['doctor_name', 'doctorName', 'referring_doctor_name']),
      doctorPhone: getFirstString(record, ['doctor_phone', 'doctorPhone', 'referring_doctor_phone']),
      period: getFirstString(record, ['return_period', 'period']),
      reportDone: getFirstBoolean(record, ['report_done', 'medical_report_done']),
      reportSent: getFirstBoolean(record, ['report_sent', 'medical_report_sent']),
      notes: getFirstString(record, ['notes', 'observation', 'observations']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
    }))
    .filter((record) => record.date || record.doctorName || record.notes)
    .sort((a, b) => toTimestamp(b.date || b.createdAt) - toTimestamp(a.date || a.createdAt))
    .slice(0, MAX_CONTEXT_MEDICAL_RETURNS)
    .map(({ createdAt, ...record }) => record);

  if (medicalReturns.length === 0 && patientReturnDate) {
    medicalReturns.push({
      date: patientReturnDate,
      doctorName: referringDoctorName,
      doctorPhone: referringDoctorPhone,
      period: undefined,
      reportDone: patientReportDone,
      reportSent: patientReportSent,
      notes: 'Data de retorno registrada no perfil do paciente.',
    });
  }

  if (medicalReturns.length > 0) {
    enriched.medicalReturns = medicalReturns;
  }

  const surgeries = (surgeriesSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      date: getFirstString(record, ['surgery_date', 'date']),
      surgeryName: getFirstString(record, ['surgery_name', 'procedure', 'name', 'title']),
      surgeryType: getFirstString(record, ['surgery_type', 'type']),
      affectedSide: getFirstString(record, ['affected_side', 'side']),
      surgeon: getFirstString(record, ['surgeon_name', 'surgeon']),
      hospital: getFirstString(record, ['hospital', 'clinic_name']),
      complications: getFirstString(record, ['complications']),
      notes: getFirstString(record, ['notes']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
    }))
    .filter((record) => record.surgeryName || record.date || record.notes)
    .sort((a, b) => toTimestamp(b.date || b.createdAt) - toTimestamp(a.date || a.createdAt))
    .slice(0, MAX_CONTEXT_SURGERIES)
    .map(({ createdAt, ...record }) => record);

  if (surgeries.length > 0) {
    enriched.surgeries = surgeries;
  }

  const activePathologies = (pathologiesSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      name: getFirstString(record, ['pathology_name', 'name']) || '',
      status: getFirstString(record, ['status']),
      severity: getFirstString(record, ['severity']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
    }))
    .filter((record) => record.name.length > 0)
    .filter((record) => {
      const normalized = (record.status || '').toLowerCase();
      return (
        normalized.length === 0 ||
        normalized === 'em_tratamento' ||
        normalized === 'in_progress' ||
        normalized === 'ativa' ||
        normalized === 'ativo' ||
        normalized === 'cronica' ||
        normalized === 'chronic'
      );
    })
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_CONTEXT_PATHOLOGIES)
    .map(({ createdAt, ...record }) => record);

  if (activePathologies.length > 0) {
    enriched.activePathologies = activePathologies;
  }

  const activeGoals = (goalsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      title: getFirstString(record, ['goal_title', 'description', 'title']) || '',
      status: getFirstString(record, ['status']),
      priority: getFirstString(record, ['priority']),
      targetDate: getFirstString(record, ['target_date', 'targetDate']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
    }))
    .filter((record) => record.title.length > 0)
    .filter((record) => {
      const normalized = (record.status || '').toLowerCase();
      return (
        normalized.length === 0 ||
        normalized === 'em_andamento' ||
        normalized === 'in_progress' ||
        normalized === 'not_started' ||
        normalized === 'ativo' ||
        normalized === 'active'
      );
    })
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_CONTEXT_GOALS)
    .map(({ createdAt, ...record }) => record);

  if (activeGoals.length > 0) {
    enriched.activeGoals = activeGoals;
  }

  const soapRecords = (soapRecordsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => {
      const date =
        getFirstString(record, ['record_date', 'session_date', 'created_at', 'updated_at'])
        || composeDateTime(
          getFirstString(record, ['appointment_date', 'date']),
          getFirstString(record, ['start_time', 'appointment_time'])
        );
      return {
        date,
        sessionNumber: toInteger(record.session_number),
        painLevel: toNumberValue(record.pain_level),
        subjective: getFirstString(record, ['subjective']),
        objective: getFirstString(record, ['objective']),
        assessment: getFirstString(record, ['assessment']),
        plan: getFirstString(record, ['plan']),
      };
    })
    .filter((record) => (
      !!record.date
      || record.sessionNumber !== undefined
      || record.painLevel !== undefined
      || !!record.subjective
      || !!record.objective
      || !!record.assessment
      || !!record.plan
    ))
    .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date))
    .slice(0, MAX_CONTEXT_SOAP_RECORDS)
    .map((record) => ({
      ...record,
      subjective: record.subjective ? truncateText(record.subjective, 180) : undefined,
      objective: record.objective ? truncateText(record.objective, 180) : undefined,
      assessment: record.assessment ? truncateText(record.assessment, 180) : undefined,
      plan: record.plan ? truncateText(record.plan, 180) : undefined,
    }));

  if (soapRecords.length > 0) {
    enriched.soapRecords = soapRecords;
  }

  const measurementRows = (measurementsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      name: getFirstString(record, ['measurement_name', 'test_name']) || '',
      measurementType: getFirstString(record, ['measurement_type', 'test_type']),
      value: toNumberValue(record.value),
      unit: getFirstString(record, ['unit', 'measurement_unit']),
      notes: getFirstString(record, ['notes']),
      measuredAt: getFirstString(record, ['measured_at', 'measurement_date', 'created_at', 'updated_at']),
    }))
    .filter((record) => record.name.length > 0 && record.value !== undefined)
    .sort((a, b) => toTimestamp(b.measuredAt) - toTimestamp(a.measuredAt));

  if (measurementRows.length > 0) {
    const groupedMeasurements = new Map<string, typeof measurementRows>();
    measurementRows.forEach((measurement) => {
      const key = `${measurement.measurementType || 'tipo_nao_informado'}::${measurement.name}`;
      const group = groupedMeasurements.get(key) || [];
      group.push(measurement);
      groupedMeasurements.set(key, group);
    });

    const measurementTrends = Array.from(groupedMeasurements.values())
      .map((series) => {
        const latest = series[0];
        const previous = series[1];
        if (!latest || latest.value === undefined) return null;
        const delta = previous && previous.value !== undefined
          ? latest.value - previous.value
          : undefined;
        return {
          name: latest.name,
          measurementType: latest.measurementType,
          latestValue: latest.value,
          previousValue: previous?.value,
          delta,
          unit: latest.unit || previous?.unit,
          measuredAt: latest.measuredAt,
          notes: latest.notes ? truncateText(latest.notes, 140) : undefined,
        };
      })
      .filter((record): record is NonNullable<typeof record> => !!record)
      .sort((a, b) => toTimestamp(b.measuredAt) - toTimestamp(a.measuredAt))
      .slice(0, MAX_CONTEXT_MEASUREMENT_TRENDS);

    if (measurementTrends.length > 0) {
      enriched.measurementTrends = measurementTrends;
    }
  }

  const appointmentRows = (appointmentsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => {
      const date = getFirstString(record, ['appointment_date', 'date', 'start_time', 'appointment_time']);
      const time = getFirstString(record, ['appointment_time', 'start_time', 'time']);
      const status = normalizeAppointmentStatus(getFirstString(record, ['status']));
      const dateTime = composeDateTime(
        getFirstString(record, ['appointment_date', 'date']),
        getFirstString(record, ['appointment_time', 'start_time', 'time'])
      ) || date;
      return {
        date,
        time,
        status,
        type: getFirstString(record, ['type', 'session_type']),
        notes: getFirstString(record, ['notes']),
        dateTime,
      };
    })
    .filter((record) => record.date || record.time || record.status || record.type)
    .sort((a, b) => toTimestamp(b.dateTime) - toTimestamp(a.dateTime));

  if (appointmentRows.length > 0) {
    const nowTimestamp = Date.now();
    const total = appointmentRows.length;
    const completed = appointmentRows.filter((item) => isCompletedAppointmentStatus(item.status)).length;
    const noShow = appointmentRows.filter((item) => isNoShowAppointmentStatus(item.status)).length;
    const cancelled = appointmentRows.filter((item) => isCancelledAppointmentStatus(item.status)).length;

    const upcoming = appointmentRows
      .filter((item) => isUpcomingAppointmentStatus(item.status))
      .filter((item) => {
        const timestamp = toTimestamp(item.dateTime);
        return timestamp > 0 && timestamp >= nowTimestamp;
      })
      .sort((a, b) => toTimestamp(a.dateTime) - toTimestamp(b.dateTime))
      .slice(0, MAX_CONTEXT_UPCOMING_APPOINTMENTS)
      .map(({ date, time, status, type, notes }) => ({
        date,
        time,
        status,
        type,
        notes: notes ? truncateText(notes, 120) : undefined,
      }));

    const lastCompleted = appointmentRows
      .filter((item) => isCompletedAppointmentStatus(item.status))
      .sort((a, b) => toTimestamp(b.dateTime) - toTimestamp(a.dateTime))[0];

    enriched.appointmentsSummary = {
      total,
      completed,
      noShow,
      cancelled,
      upcoming,
      lastCompleted: lastCompleted
        ? {
          date: lastCompleted.date,
          time: lastCompleted.time,
          status: lastCompleted.status,
          type: lastCompleted.type,
        }
        : undefined,
    };
  }

  const prescribedExercisesRaw = (prescribedExercisesSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      exerciseId: getFirstString(record, ['exercise_id']),
      exerciseName: getFirstString(record, ['exercise_name', 'name', 'title']),
      frequency: getFirstString(record, ['frequency']),
      sets: toInteger(record.sets),
      reps: toInteger(record.reps),
      durationSeconds: toInteger(record.duration_seconds),
      notes: getFirstString(record, ['notes']),
      isActive: getFirstBoolean(record, ['is_active']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
    }));

  const activePrescriptionsRaw = prescribedExercisesRaw
    .filter((record) => record.isActive !== false)
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_CONTEXT_PRESCRIPTIONS);

  if (activePrescriptionsRaw.length > 0 || (exerciseLogsSnap?.docs.length ?? 0) > 0) {
    const exerciseNameById = new Map<string, string>();
    const missingExerciseIds = activePrescriptionsRaw
      .filter((record) => !record.exerciseName && !!record.exerciseId)
      .map((record) => record.exerciseId as string);
    const uniqueMissingIds = Array.from(new Set(missingExerciseIds)).slice(0, 20);

    if (uniqueMissingIds.length > 0) {
      await Promise.all(
        uniqueMissingIds.map(async (exerciseId) => {
          try {
            const exerciseDoc = await db.collection('exercises').doc(exerciseId).get();
            if (!exerciseDoc.exists) return;
            const data = exerciseDoc.data() as Record<string, unknown> | undefined;
            const name = getFirstString(data, ['name', 'title']);
            if (name) exerciseNameById.set(exerciseId, name);
          } catch (error) {
            logger.warn('Failed to resolve exercise name for context enrichment', {
              patientId,
              exerciseId,
              error: (error as Error).message,
            });
          }
        })
      );
    }

    const activePrescriptions = activePrescriptionsRaw.map((record) => ({
      exerciseName: record.exerciseName || (record.exerciseId ? exerciseNameById.get(record.exerciseId) : undefined) || record.exerciseId,
      frequency: record.frequency,
      sets: record.sets,
      reps: record.reps,
      durationSeconds: record.durationSeconds,
      notes: record.notes ? truncateText(record.notes, 120) : undefined,
    }));

    const exerciseLogs = (exerciseLogsSnap?.docs ?? [])
      .map((doc) => doc.data() as Record<string, unknown>)
      .map((record) => ({
        date: getFirstString(record, ['performed_at', 'complete_date', 'completed_at', 'timestamp', 'created_at']),
      }))
      .filter((record) => !!record.date)
      .sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

    const now = Date.now();
    const windowStart = now - (EXERCISE_ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const logsLast30Days = exerciseLogs.filter((log) => toTimestamp(log.date) >= windowStart).length;
    const lastLogDate = exerciseLogs[0]?.date;

    const inferredWeeklyLoad = activePrescriptions
      .map((exercise) => inferWeeklyFrequencyFromText(exercise.frequency))
      .filter((value): value is number => value !== undefined)
      .reduce((sum, value) => sum + value, 0);

    const expectedLogsInWindow = inferredWeeklyLoad > 0
      ? Math.max(4, Math.round((inferredWeeklyLoad * EXERCISE_ADHERENCE_WINDOW_DAYS) / 7))
      : 12;

    const adherencePercentage = expectedLogsInWindow > 0
      ? Math.min(100, Math.round((logsLast30Days / expectedLogsInWindow) * 100))
      : undefined;

    enriched.exerciseAdherence = {
      activePrescriptions,
      logsLast30Days,
      adherencePercentage,
      lastLogDate,
    };
  }

  const examsRaw = (patientExamsSnap?.docs ?? [])
    .map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        title: getFirstString(data, ['title', 'name']),
        examType: getFirstString(data, ['exam_type', 'type']),
        examDate: getFirstString(data, ['exam_date', 'date']),
        description: getFirstString(data, ['description']),
        createdAt: getFirstString(data, ['created_at', 'updated_at']),
      };
    })
    .sort((a, b) => toTimestamp(b.examDate || b.createdAt) - toTimestamp(a.examDate || a.createdAt))
    .slice(0, MAX_CONTEXT_EXAMS);

  const documents = (patientDocumentsSnap?.docs ?? [])
    .map((doc) => doc.data() as Record<string, unknown>)
    .map((record) => ({
      fileName: getFirstString(record, ['file_name', 'title', 'name']),
      category: getFirstString(record, ['category']),
      createdAt: getFirstString(record, ['created_at', 'updated_at']),
      description: getFirstString(record, ['description']),
    }))
    .filter((record) => record.fileName || record.category || record.description)
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, MAX_CONTEXT_DOCUMENTS)
    .map((record) => ({
      ...record,
      description: record.description ? truncateText(record.description, 120) : undefined,
    }));

  if (examsRaw.length > 0 || documents.length > 0) {
    const examFileCountByExamId = new Map<string, number>();

    if (examsRaw.length > 0) {
      await Promise.all(
        examsRaw.map(async (exam) => {
          try {
            const filesSnap = await db
              .collection('patient_exam_files')
              .where('exam_id', '==', exam.id)
              .limit(25)
              .get();
            examFileCountByExamId.set(exam.id, filesSnap.size);
          } catch (error) {
            logger.warn('Failed to fetch exam files for context enrichment', {
              patientId,
              examId: exam.id,
              error: (error as Error).message,
            });
          }
        })
      );
    }

    enriched.examSummary = {
      exams: examsRaw.map((exam) => ({
        title: exam.title,
        examType: exam.examType,
        examDate: exam.examDate,
        description: exam.description ? truncateText(exam.description, 120) : undefined,
        filesCount: examFileCountByExamId.get(exam.id) ?? 0,
      })),
      documents,
    };
  }

  if (!enriched.condition && enriched.patientName) {
    enriched.condition = `Paciente: ${enriched.patientName}`;
  }

  return enriched;
}

/**
 * Clinical chat with AI (with safety guardrails)
 */
export const aiClinicalChatHandler = async (request: any) => {
  const { data } = request;
  const userId = request.auth?.uid;

  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const payload = data && typeof data === 'object'
    ? (data as Record<string, unknown>)
    : {};

  const message = toStringValue(payload.message) || '';
  const conversationHistory = Array.isArray(payload.conversationHistory)
    ? (payload.conversationHistory as Array<{ role: 'user' | 'assistant' | 'model'; content: string }>)
    : [];

  const rawContext = payload.context && typeof payload.context === 'object'
    ? (payload.context as Record<string, unknown>)
    : undefined;

  const baseContext: ClinicalChatContext = {
    patientId: toStringValue(rawContext?.patientId),
    patientName: toStringValue(rawContext?.patientName),
    condition: toStringValue(rawContext?.condition),
    sessionCount: toNonNegativeInteger(rawContext?.sessionCount),
    recentEvolutions: normalizeRecentEvolutions(rawContext?.recentEvolutions),
  };

  const context = await enrichClinicalContext(baseContext);

  const requestOrganizationId =
    toStringValue(request.auth?.token?.organizationId)
    || toStringValue(request.auth?.token?.organization_id);

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
    const ragContext = context.patientId
      ? await retrievePatientKnowledgeContext({
        patientId: context.patientId,
        userId,
        question: sanitizedMessage,
        organizationId: requestOrganizationId,
        maxSnippets: 6,
      })
      : null;

    if (ragContext) {
      if (!context.patientName && ragContext.patientName) {
        context.patientName = ragContext.patientName;
      }
      if (!context.condition && ragContext.patientCondition) {
        context.condition = ragContext.patientCondition;
      }
      if (context.sessionCount === undefined && ragContext.sessionCount !== undefined) {
        context.sessionCount = ragContext.sessionCount;
      }
    }

    logger.info('AI clinical chat request', {
      userId,
      patientId: context?.patientId,
      organizationId: ragContext?.organizationId || requestOrganizationId || null,
      remainingRequests: usageCheck.remaining,
      phiDetected: phiCheck.hasPHI,
      ragMode: ragContext?.retrievalMode || 'none',
      ragSnippetCount: ragContext?.snippets.length || 0,
      medicalReturnsCount: context?.medicalReturns?.length || 0,
      surgeriesCount: context?.surgeries?.length || 0,
      pathologiesCount: context?.activePathologies?.length || 0,
      goalsCount: context?.activeGoals?.length || 0,
      soapRecordsCount: context?.soapRecords?.length || 0,
      measurementsCount: context?.measurementTrends?.length || 0,
      upcomingAppointmentsCount: context?.appointmentsSummary?.upcoming?.length || 0,
      activePrescriptionsCount: context?.exerciseAdherence?.activePrescriptions?.length || 0,
      examCount: context?.examSummary?.exams?.length || 0,
      documentsCount: context?.examSummary?.documents?.length || 0,
    });

    // Build conversation context
    let contextPrompt = CLINICAL_SYSTEM_PROMPT + '\n\n';

    if (context) {
      contextPrompt += '**Contexto do Paciente:**\n';
      if (context.patientId) contextPrompt += `- ID do Paciente: ${context.patientId}\n`;
      if (context.patientName) contextPrompt += `- Nome: ${context.patientName}\n`;
      if (context.condition) contextPrompt += `- Condicao / Resumo clinico: ${context.condition}\n`;
      if (typeof context.sessionCount === 'number') contextPrompt += `- Sessoes realizadas: ${context.sessionCount}\n`;
      if (context.patientProfileSummary && context.patientProfileSummary.length > 0) {
        contextPrompt += '\n**Perfil Clinico Estruturado:**\n';
        context.patientProfileSummary.forEach((item) => {
          contextPrompt += `- ${item}\n`;
        });
      }
      if (context.medicalReturns && context.medicalReturns.length > 0) {
        contextPrompt += '\n**Retornos Medicos Registrados:**\n';
        context.medicalReturns.forEach((medicalReturn, index) => {
          const date = medicalReturn.date ? `data ${medicalReturn.date}` : 'data nao informada';
          const doctor = medicalReturn.doctorName ? `medico ${medicalReturn.doctorName}` : 'medico nao informado';
          const phone = medicalReturn.doctorPhone ? ` | tel ${medicalReturn.doctorPhone}` : '';
          const period = medicalReturn.period ? ` | periodo ${medicalReturn.period}` : '';
          const reportDone = medicalReturn.reportDone === true
            ? ' | relatorio feito'
            : (medicalReturn.reportDone === false ? ' | relatorio pendente' : '');
          const reportSent = medicalReturn.reportSent === true
            ? ' | relatorio enviado'
            : (medicalReturn.reportSent === false ? ' | relatorio nao enviado' : '');
          const notes = medicalReturn.notes ? ` | obs: ${truncateText(medicalReturn.notes, 180)}` : '';
          contextPrompt += `${index + 1}. ${date}; ${doctor}${phone}${period}${reportDone}${reportSent}${notes}\n`;
        });
      }
      if (context.surgeries && context.surgeries.length > 0) {
        contextPrompt += '\n**Historico de Cirurgias:**\n';
        context.surgeries.forEach((surgery, index) => {
          const name = surgery.surgeryName || 'cirurgia sem nome';
          const date = surgery.date ? ` | data ${surgery.date}` : '';
          const type = surgery.surgeryType ? ` | tipo ${surgery.surgeryType}` : '';
          const side = surgery.affectedSide ? ` | lado ${surgery.affectedSide}` : '';
          const surgeon = surgery.surgeon ? ` | cirurgiao ${surgery.surgeon}` : '';
          const hospital = surgery.hospital ? ` | hospital ${surgery.hospital}` : '';
          const complications = surgery.complications ? ` | complicacoes ${truncateText(surgery.complications, 120)}` : '';
          const notes = surgery.notes ? ` | obs ${truncateText(surgery.notes, 120)}` : '';
          contextPrompt += `${index + 1}. ${name}${date}${type}${side}${surgeon}${hospital}${complications}${notes}\n`;
        });
      }
      if (context.activePathologies && context.activePathologies.length > 0) {
        contextPrompt += '\n**Patologias Ativas:**\n';
        context.activePathologies.forEach((pathology, index) => {
          const status = pathology.status ? ` | status ${pathology.status}` : '';
          const severity = pathology.severity ? ` | gravidade ${pathology.severity}` : '';
          contextPrompt += `${index + 1}. ${pathology.name}${status}${severity}\n`;
        });
      }
      if (context.activeGoals && context.activeGoals.length > 0) {
        contextPrompt += '\n**Metas Ativas do Tratamento:**\n';
        context.activeGoals.forEach((goal, index) => {
          const status = goal.status ? ` | status ${goal.status}` : '';
          const priority = goal.priority ? ` | prioridade ${goal.priority}` : '';
          const target = goal.targetDate ? ` | prazo ${goal.targetDate}` : '';
          contextPrompt += `${index + 1}. ${goal.title}${status}${priority}${target}\n`;
        });
      }
      if (context.appointmentsSummary) {
        contextPrompt += '\n**Resumo de Agendamentos:**\n';
        contextPrompt += `- Total registrados: ${context.appointmentsSummary.total}\n`;
        contextPrompt += `- Concluidos: ${context.appointmentsSummary.completed}\n`;
        contextPrompt += `- Faltas: ${context.appointmentsSummary.noShow}\n`;
        contextPrompt += `- Cancelados/Reagendados: ${context.appointmentsSummary.cancelled}\n`;
        if (context.appointmentsSummary.lastCompleted) {
          const lastCompleted = context.appointmentsSummary.lastCompleted;
          const dateLabel = lastCompleted.date || 'data nao informada';
          const timeLabel = lastCompleted.time ? ` ${lastCompleted.time}` : '';
          const typeLabel = lastCompleted.type ? ` | tipo ${lastCompleted.type}` : '';
          contextPrompt += `- Ultimo atendimento concluido: ${dateLabel}${timeLabel}${typeLabel}\n`;
        }
        if (context.appointmentsSummary.upcoming.length > 0) {
          contextPrompt += '- Proximos agendamentos:\n';
          context.appointmentsSummary.upcoming.forEach((appointment, index) => {
            const dateLabel = appointment.date || 'data nao informada';
            const timeLabel = appointment.time ? ` ${appointment.time}` : '';
            const statusLabel = appointment.status ? ` | status ${appointment.status}` : '';
            const typeLabel = appointment.type ? ` | tipo ${appointment.type}` : '';
            const notesLabel = appointment.notes ? ` | obs ${truncateText(appointment.notes, 90)}` : '';
            contextPrompt += `  ${index + 1}. ${dateLabel}${timeLabel}${statusLabel}${typeLabel}${notesLabel}\n`;
          });
        }
      }
      if (context.soapRecords && context.soapRecords.length > 0) {
        contextPrompt += '\n**SOAP Recente (Prontuario):**\n';
        context.soapRecords.forEach((soap, index) => {
          const dateLabel = soap.date ? `data ${soap.date}` : 'data nao informada';
          const sessionLabel = soap.sessionNumber !== undefined ? ` | sessao ${soap.sessionNumber}` : '';
          const painLabel = soap.painLevel !== undefined ? ` | EVA ${soap.painLevel}/10` : '';
          contextPrompt += `${index + 1}. ${dateLabel}${sessionLabel}${painLabel}\n`;
          if (soap.subjective) contextPrompt += `   - S: ${soap.subjective}\n`;
          if (soap.objective) contextPrompt += `   - O: ${soap.objective}\n`;
          if (soap.assessment) contextPrompt += `   - A: ${soap.assessment}\n`;
          if (soap.plan) contextPrompt += `   - P: ${soap.plan}\n`;
        });
      }
      if (context.measurementTrends && context.measurementTrends.length > 0) {
        contextPrompt += '\n**Medicoes de Evolucao:**\n';
        context.measurementTrends.forEach((measurement, index) => {
          const typeLabel = measurement.measurementType ? `${measurement.measurementType} - ` : '';
          const unitLabel = measurement.unit || '';
          const previousLabel = measurement.previousValue !== undefined
            ? ` | anterior ${measurement.previousValue}${unitLabel}`
            : '';
          const deltaLabel = measurement.delta !== undefined
            ? ` | delta ${measurement.delta >= 0 ? '+' : ''}${Math.round(measurement.delta * 100) / 100}${unitLabel}`
            : '';
          const dateLabel = measurement.measuredAt ? ` | data ${measurement.measuredAt}` : '';
          const notesLabel = measurement.notes ? ` | obs ${measurement.notes}` : '';
          contextPrompt += `${index + 1}. ${typeLabel}${measurement.name}: ${measurement.latestValue}${unitLabel}${previousLabel}${deltaLabel}${dateLabel}${notesLabel}\n`;
        });
      }
      if (context.exerciseAdherence) {
        contextPrompt += '\n**Exercicios Prescritos e Adesao:**\n';
        contextPrompt += `- Prescricoes ativas: ${context.exerciseAdherence.activePrescriptions.length}\n`;
        contextPrompt += `- Logs de execucao nos ultimos ${EXERCISE_ADHERENCE_WINDOW_DAYS} dias: ${context.exerciseAdherence.logsLast30Days}\n`;
        if (typeof context.exerciseAdherence.adherencePercentage === 'number') {
          contextPrompt += `- Adesao estimada: ${context.exerciseAdherence.adherencePercentage}%\n`;
        }
        if (context.exerciseAdherence.lastLogDate) {
          contextPrompt += `- Ultimo registro de exercicio: ${context.exerciseAdherence.lastLogDate}\n`;
        }
        if (context.exerciseAdherence.activePrescriptions.length > 0) {
          context.exerciseAdherence.activePrescriptions.forEach((exercise, index) => {
            const name = exercise.exerciseName || 'exercicio sem nome';
            const frequency = exercise.frequency ? ` | freq ${exercise.frequency}` : '';
            const load = (exercise.sets !== undefined || exercise.reps !== undefined)
              ? ` | ${exercise.sets ?? '?'}x${exercise.reps ?? '?'}`
              : '';
            const duration = exercise.durationSeconds !== undefined
              ? ` | duracao ${exercise.durationSeconds}s`
              : '';
            const notes = exercise.notes ? ` | obs ${exercise.notes}` : '';
            contextPrompt += `  ${index + 1}. ${name}${frequency}${load}${duration}${notes}\n`;
          });
        }
      }
      if (context.examSummary && (context.examSummary.exams.length > 0 || context.examSummary.documents.length > 0)) {
        contextPrompt += '\n**Exames e Documentos Recentes:**\n';
        if (context.examSummary.exams.length > 0) {
          contextPrompt += '- Exames:\n';
          context.examSummary.exams.forEach((exam, index) => {
            const title = exam.title || 'exame sem titulo';
            const type = exam.examType ? ` | tipo ${exam.examType}` : '';
            const date = exam.examDate ? ` | data ${exam.examDate}` : '';
            const files = typeof exam.filesCount === 'number' ? ` | arquivos ${exam.filesCount}` : '';
            const description = exam.description ? ` | obs ${exam.description}` : '';
            contextPrompt += `  ${index + 1}. ${title}${type}${date}${files}${description}\n`;
          });
        }
        if (context.examSummary.documents.length > 0) {
          contextPrompt += '- Documentos:\n';
          context.examSummary.documents.forEach((document, index) => {
            const fileName = document.fileName || 'documento sem nome';
            const category = document.category ? ` | categoria ${document.category}` : '';
            const createdAt = document.createdAt ? ` | data ${document.createdAt}` : '';
            const description = document.description ? ` | obs ${document.description}` : '';
            contextPrompt += `  ${index + 1}. ${fileName}${category}${createdAt}${description}\n`;
          });
        }
      }
      if (context.recentEvolutions && context.recentEvolutions.length > 0) {
        contextPrompt += '\n**Evolucoes Recentes:**\n';
        context.recentEvolutions.forEach(evo => {
          contextPrompt += `- ${evo.date}: ${evo.notes}\n`;
        });
      }
      contextPrompt += '\n';
    }

    if (ragContext?.snippets.length) {
      contextPrompt += '**Evidencias Clinicas Recuperadas (RAG):**\n';
      ragContext.snippets.forEach((snippet, index) => {
        const dateLabel = snippet.date ? ` | ${snippet.date}` : '';
        contextPrompt += `${index + 1}. [${snippet.sourceType}${dateLabel}] ${snippet.text}\n`;
      });
      contextPrompt += '\nUse as evidencias acima como base factual prioritaria na resposta.\n\n';
    }

    contextPrompt += '**Regra Factual de Resposta:**\n';
    contextPrompt += '- Se houver data de retorno medico ou cirurgias no contexto, responda com esses dados explicitamente.\n';
    contextPrompt += '- Se houver dados de agendamento, medições, SOAP, exercicios, exames ou documentos, use esses dados para responder com datas/valores concretos.\n';
    contextPrompt += '- Quando o usuario pedir "quantidade de sessoes", priorize o campo "Sessoes realizadas" e o resumo de agendamentos.\n';
    contextPrompt += '- Se o dado nao existir no contexto, diga "sem registro disponivel" (nao invente).\n';
    contextPrompt += '- Nao responda que "nao tem acesso ao prontuario" quando o contexto clinico foi fornecido.\n\n';

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
      model: CLINICAL_CHAT_MODEL,
      systemInstruction: contextPrompt,
    });

    // Sanitize conversation history
    const sanitizedHistory = conversationHistory.slice(-12).map(msg => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: detectAndRedactPHI(msg.content || '').sanitized }],
    }));

    // Build chat history
    const contents = [
      ...sanitizedHistory,
      { role: 'user', parts: [{ text: sanitizedMessage }] },
    ];

    // Generate response
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
};

export const aiClinicalChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
  },
  aiClinicalChatHandler
);

/**
 * AI-powered exercise recommendation (enhanced)
 */
export const aiExerciseRecommendationChatHandler = async (request: any) => {
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
};

export const aiExerciseRecommendationChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
  },
  aiExerciseRecommendationChatHandler
);

/**
 * AI SOAP note generator with chat
 */
export const aiSoapNoteChatHandler = async (request: any) => {
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
      model: CLINICAL_CHAT_MODEL,
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
};

export const aiSoapNoteChat = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 120,
  },
  aiSoapNoteChatHandler
);

/**
 * Auto-suggestions based on patient history
 */
export const aiGetSuggestionsHandler = async (request: any) => {
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
};

export const aiGetSuggestions = onCall(
  {
    region: 'southamerica-east1',
    memory: '1GiB',
    cpu: 1,
    maxInstances: 1,
    timeoutSeconds: 90,
  },
  aiGetSuggestionsHandler
);

// Helper functions

async function generateExerciseRecommendation(patientData: any, question: string): Promise<string> {
  const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'fisioflow-migration',
    location: 'us-central1',
  });

  const model = vertexAI.getGenerativeModel({
    model: CLINICAL_CHAT_MODEL,
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
    model: CLINICAL_CHAT_MODEL,
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
