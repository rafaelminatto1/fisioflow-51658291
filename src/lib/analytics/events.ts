/**
 * Firebase Analytics - Eventos Customizados
 *
 * Rastreia eventos específicos do FisioFlow para analytics
 */

import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { firebaseApp } from '@/integrations/firebase/client';
import { logger } from '@/lib/logging/logger';

let analyticsInstance: Analytics | null = null;

/**
 * Inicializa o Analytics
 */
export function initAnalytics() {
  try {
    if (analyticsInstance) return analyticsInstance;

    if (typeof window === 'undefined') return null;

    analyticsInstance = getAnalytics(firebaseApp);
    logger.info('[Analytics] Inicializado');
    return analyticsInstance;
  } catch (error) {
    logger.error('[Analytics] Erro ao inicializar:', error);
    return null;
  }
}

/**
 * Garante que o Analytics está inicializado
 */
function ensureInitialized(): Analytics | null {
  if (!analyticsInstance) {
    return initAnalytics();
  }
  return analyticsInstance;
}

/**
 * Loga um evento genérico
 */
function track(eventName: string, parameters?: Record<string, any>) {
  try {
    const analytics = ensureInitialized();
    if (!analytics) return;

    logEvent(analytics, eventName, parameters);
    logger.debug(`[Analytics] Event: ${eventName}`, parameters);
  } catch (error) {
    logger.error(`[Analytics] Erro ao logar evento ${eventName}:`, error);
  }
}

// ============================================================================
// EVENTOS DE AUTENTICAÇÃO
// ============================================================================

/**
 * Login bem-sucedido
 */
export function trackLogin(method: 'email' | 'google' | 'apple' | 'saml') {
  track('login', { method });
}

/**
 * Logout
 */
export function trackLogout() {
  track('logout');
}

/**
 * Registro de novo usuário
 */
export function trackSignUp(method: 'email' | 'google' | 'apple' | 'saml') {
  track('sign_up', { method });
}

// ============================================================================
// EVENTOS DE PACIENTES
// ============================================================================

/**
 * Paciente criado
 */
export function trackPatientCreated(data: {
  patientId: string;
  isNewPatient: boolean;
  source: 'manual' | 'crm' | 'import';
}) {
  track('patient_created', {
    patient_id: data.patientId,
    is_new_patient: data.isNewPatient,
    source: data.source,
  });
}

/**
 * Perfil do paciente visualizado
 */
export function trackPatientViewed(patientId: string) {
  track('patient_viewed', { patient_id: patientId });
}

/**
 * Paciente atualizado
 */
export function trackPatientUpdated(patientId: string, fields: string[]) {
  track('patient_updated', {
    patient_id: patientId,
    fields_updated: fields.join(','),
  });
}

// ============================================================================
// EVENTOS DE AGENDAMENTOS
// ============================================================================

/**
 * Agendamento criado
 */
export function trackAppointmentCreated(data: {
  appointmentId: string;
  type: string;
  duration: number;
  isNewPatient: boolean;
  source: 'calendar' | 'list' | 'patient-profile';
}) {
  track('appointment_created', {
    appointment_id: data.appointmentId,
    appointment_type: data.type,
    duration_minutes: data.duration,
    is_new_patient: data.isNewPatient,
    source: data.source,
  });
}

/**
 * Agendamento cancelado
 */
export function trackAppointmentCancelled(appointmentId: string, reason?: string) {
  track('appointment_cancelled', {
    appointment_id: appointmentId,
    reason,
  });
}

/**
 * Agendamento remarcado
 */
export function trackAppointmentRescheduled(appointmentId: string) {
  track('appointment_rescheduled', { appointment_id: appointmentId });
}

/**
 * Check-in realizado
 */
export function trackAppointmentCheckIn(appointmentId: string) {
  track('appointment_check_in', { appointment_id: appointmentId });
}

/**
 * Agendamento concluído
 */
export function trackAppointmentCompleted(data: {
  appointmentId: string;
  duration: number;
  hadSoap: boolean;
}) {
  track('appointment_completed', {
    appointment_id: data.appointmentId,
    duration_minutes: data.duration,
    had_soap: data.hadSoap,
  });
}

// ============================================================================
// EVENTOS DE EVOLUÇÕES (SOAP)
// ============================================================================

/**
 * Evolução SOAP criada
 */
export function trackEvolutionCreated(data: {
  evolutionId: string;
  patientId: string;
  appointmentId?: string;
  hasSubjective: boolean;
  hasObjective: boolean;
  hasAssessment: boolean;
  hasPlan: boolean;
}) {
  track('evolution_created', {
    evolution_id: data.evolutionId,
    patient_id: data.patientId,
    appointment_id: data.appointmentId || null,
    has_subjective: data.hasSubjective,
    has_objective: data.hasObjective,
    has_assessment: data.hasAssessment,
    has_plan: data.hasPlan,
  });
}

/**
 * Evolução SOAP atualizada
 */
export function trackEvolutionUpdated(evolutionId: string) {
  track('evolution_updated', { evolution_id: evolutionId });
}

/**
 * SOAP gerado por IA
 */
export function trackAISOAPGenerated(data: {
  evolutionId: string;
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  tokensUsed: number;
}) {
  track('ai_soap_generated', {
    evolution_id: data.evolutionId,
    model: data.model,
    tokens_used: data.tokensUsed,
  });
}

// ============================================================================
// EVENTOS DE EXERCÍCIOS
// ============================================================================

/**
 * Exercício criado
 */
export function trackExerciseCreated(data: {
  exerciseId: string;
  patientId: string;
  category?: string;
}) {
  track('exercise_created', {
    exercise_id: data.exerciseId,
    patient_id: data.patientId,
    category: data.category || null,
  });
}

/**
 * Plano de exercícios criado
 */
export function trackExercisePlanCreated(data: {
  planId: string;
  patientId: string;
  exerciseCount: number;
}) {
  track('exercise_plan_created', {
    plan_id: data.planId,
    patient_id: data.patientId,
    exercise_count: data.exerciseCount,
  });
}

/**
 * Exercício marcado como completo (Patient App)
 */
export function trackExerciseCompleted(data: {
  exerciseId: string;
  patientId: string;
  duration: number;
  difficulty: number; // 1-5
  painLevel?: number; // 0-10
}) {
  track('exercise_completed', {
    exercise_id: data.exerciseId,
    patient_id: data.patientId,
    duration_seconds: data.duration,
    difficulty_level: data.difficulty,
    pain_level: data.painLevel || null,
  });
}

/**
 * Exercício pulou (Patient App)
 */
export function trackExerciseSkipped(data: {
  exerciseId: string;
  patientId: string;
  reason: 'pain' | 'time' | 'difficulty' | 'other';
}) {
  track('exercise_skipped', {
    exercise_id: data.exerciseId,
    patient_id: data.patientId,
    reason: data.reason,
  });
}

// ============================================================================
// EVENTOS DE DOR/PROGRESSO
// ============================================================================

/**
 * Nível de dor registrado
 */
export function trackPainLevelRecorded(data: {
  patientId: string;
  level: number; // 0-10
  bodyPart: string;
  beforeTreatment: boolean;
}) {
  track('pain_level_recorded', {
    patient_id: data.patientId,
    pain_level: data.level,
    body_part: data.bodyPart,
    before_treatment: data.beforeTreatment,
  });
}

/**
 * Mapa de dor atualizado
 */
export function trackPainMapUpdated(data: {
  patientId: string;
  pointsCount: number;
  averagePain: number;
}) {
  track('pain_map_updated', {
    patient_id: data.patientId,
    points_count: data.pointsCount,
    average_pain: data.averagePain,
  });
}

/**
 * Medida antropométrica registrada
 */
export function trackMeasurementRecorded(data: {
  patientId: string;
  type: 'rom' | 'circumference' | 'strength' | 'other';
  location: string;
  value: number;
  unit: string;
}) {
  track('measurement_recorded', {
    patient_id: data.patientId,
    measurement_type: data.type,
    location: data.location,
    value: data.value,
    unit: data.unit,
  });
}

// ============================================================================
// EVENTOS DE AI
// ============================================================================

/**
 * Sugestão de IA exibida
 */
export function trackAISuggestionShown(data: {
  type: 'soap' | 'exercise' | 'treatment' | 'diagnosis';
  model: string;
}) {
  track('ai_suggestion_shown', {
    suggestion_type: data.type,
    model: data.model,
  });
}

/**
 * Sugestão de IA aceita
 */
export function trackAISuggestionAccepted(data: {
  type: 'soap' | 'exercise' | 'treatment' | 'diagnosis';
  model: string;
}) {
  track('ai_suggestion_accepted', {
    suggestion_type: data.type,
    model: data.model,
  });
}

/**
 * Sugestão de IA rejeitada
 */
export function trackAISuggestionRejected(data: {
  type: 'soap' | 'exercise' | 'treatment' | 'diagnosis';
  reason: 'incorrect' | 'irrelevant' | 'incomplete';
}) {
  track('ai_suggestion_rejected', {
    suggestion_type: data.type,
    reason,
  });
}

/**
 * Busca semântica realizada
 */
export function trackSemanticSearch(data: {
  queryLength: number;
  resultsCount: number;
  topSimilarity: number;
}) {
  track('semantic_search', {
    query_length: data.queryLength,
    results_count: data.resultsCount,
    top_similarity: data.topSimilarity,
  });
}

// ============================================================================
// EVENTOS DE GAMIFICAÇÃO
// ============================================================================

/**
 |* Pontos ganhos
 */
export function trackPointsEarned(data: {
  patientId: string;
  points: number;
  source: 'exercise' | 'appointment' | 'streak' | 'achievement';
}) {
  track('points_earned', {
    patient_id: data.patientId,
    points: data.points,
    source: data.source,
  });
}

/**
 * Nível alcançado
 */
export function trackLevelUp(data: {
  patientId: string;
  newLevel: number;
}) {
  track('level_up', {
    patient_id: data.patientId,
    new_level: data.newLevel,
  });
}

/**
 * Conquista desbloqueada
 */
export function trackAchievementUnlocked(data: {
  patientId: string;
  achievementId: string;
  achievementName: string;
}) {
  track('achievement_unlocked', {
    patient_id: data.patientId,
    achievement_id: data.achievementId,
    achievement_name: data.achievementName,
  });
}

/**
 * Streak alcançado
 */
export function trackStreakAchieved(data: {
  patientId: string;
  days: number;
}) {
  track('streak_achieved', {
    patient_id: data.patientId,
    days: data.days,
  });
}

// ============================================================================
// EVENTOS DE CRM
// ============================================================================

/**
 * Lead capturado
 */
export function trackLeadCaptured(data: {
  leadId: string;
  source: 'website' | 'instagram' | 'referral' | 'other';
}) {
  track('lead_captured', {
    lead_id: data.leadId,
    source: data.source,
  });
}

/**
 * Lead convertido para paciente
 */
export function trackLeadConverted(data: {
  leadId: string;
  patientId: string;
  daysToConvert: number;
}) {
  track('lead_converted', {
    lead_id: data.leadId,
    patient_id: data.patientId,
    days_to_convert: data.daysToConvert,
  });
}

/**
 * Campanha enviada
 */
export function trackCampaignSent(data: {
  campaignId: string;
  type: 'email' | 'whatsapp';
  recipientsCount: number;
}) {
  track('campaign_sent', {
    campaign_id: data.campaignId,
    campaign_type: data.type,
    recipients_count: data.recipientsCount,
  });
}

/**
 * Email aberto
 */
export function trackEmailOpened(data: {
  campaignId?: string;
  emailId: string;
}) {
  track('email_opened', {
    campaign_id: data.campaignId || null,
    email_id: data.emailId,
  });
}

/**
 * Link clicado no email
 */
export function trackEmailLinkClicked(data: {
  emailId: string;
  url: string;
}) {
  track('email_link_clicked', {
    email_id: data.emailId,
    url,
  });
}

// ============================================================================
// EVENTOS DE FINANCEIRO
// ============================================================================

/**
 |* Fatura gerada
 */
export function trackInvoiceGenerated(data: {
  invoiceId: string;
  patientId: string;
  amount: number;
  sessionCount: number;
}) {
  track('invoice_generated', {
    invoice_id: data.invoiceId,
    patient_id: data.patientId,
    amount: data.amount,
    session_count: data.sessionCount,
  });
}

/**
 * Pagamento recebido
 */
export function trackPaymentReceived(data: {
  invoiceId: string;
  amount: number;
  method: 'cash' | 'card' | 'pix' | 'boleto';
}) {
  track('payment_received', {
    invoice_id: data.invoiceId,
    amount: data.amount,
    payment_method: data.method,
  });
}

// ============================================================================
// EVENTOS DE UI/ENGAGEMENT
// ============================================================================

/**
 * Página visualizada
 */
export function trackPageView(pageName: string) {
  track('page_view', { page_name: pageName });
}

/**
 * Feature utilizada
 */
export function trackFeatureUsed(feature: string, method?: string) {
  track('feature_used', {
    feature_name: feature,
    method: method || null,
  });
}

/**
 * Filtro aplicado
 */
export function trackFilterApplied(data: {
  page: string;
  filterType: string;
  filterValue: string;
}) {
  track('filter_applied', {
    page: data.page,
    filter_type: data.filterType,
    filter_value: data.filterValue,
  });
}

/**
 * Export realizado
 */
export function trackExport(data: {
  type: 'patients' | 'appointments' | 'financial' | 'reports';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: string;
}) {
  track('export', {
    export_type: data.type,
    format: data.format,
    date_range: data.dateRange,
  });
}

/**
 * Busca realizada
 */
export function trackSearch(data: {
  page: string;
  queryLength: number;
  resultsCount: number;
}) {
  track('search', {
    page: data.page,
    query_length: data.queryLength,
    results_count: data.resultsCount,
  });
}

// ============================================================================
// EVENTOS DE ERROS
// ============================================================================

/**
 * Erro capturado
 */
export function trackError(data: {
  code: string;
  message: string;
  context: string;
  fatal?: boolean;
}) {
  track('error', {
    error_code: data.code,
    error_message: data.message,
    context: data.context,
    is_fatal: data.fatal || false,
  });
}

/**
 * Erro de validação
 */
export function trackValidationError(data: {
  field: string;
  message: string;
}) {
  track('validation_error', {
    field: data.field,
    message: data.message,
  });
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const analytics = {
  // Auth
  trackLogin,
  trackLogout,
  trackSignUp,

  // Patients
  trackPatientCreated,
  trackPatientViewed,
  trackPatientUpdated,

  // Appointments
  trackAppointmentCreated,
  trackAppointmentCancelled,
  trackAppointmentRescheduled,
  trackAppointmentCheckIn,
  trackAppointmentCompleted,

  // Evolutions
  trackEvolutionCreated,
  trackEvolutionUpdated,
  trackAISOAPGenerated,

  // Exercises
  trackExerciseCreated,
  trackExercisePlanCreated,
  trackExerciseCompleted,
  trackExerciseSkipped,

  // Pain/Progress
  trackPainLevelRecorded,
  trackPainMapUpdated,
  trackMeasurementRecorded,

  // AI
  trackAISuggestionShown,
  trackAISuggestionAccepted,
  trackAISuggestionRejected,
  trackSemanticSearch,

  // Gamification
  trackPointsEarned,
  trackLevelUp,
  trackAchievementUnlocked,
  trackStreakAchieved,

  // CRM
  trackLeadCaptured,
  trackLeadConverted,
  trackCampaignSent,
  trackEmailOpened,
  trackEmailLinkClicked,

  // Financial
  trackInvoiceGenerated,
  trackPaymentReceived,

  // UI/Engagement
  trackPageView,
  trackFeatureUsed,
  trackFilterApplied,
  trackExport,
  trackSearch,

  // Errors
  trackError,
  trackValidationError,
};
