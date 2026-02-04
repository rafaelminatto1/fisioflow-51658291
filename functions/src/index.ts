/**
 * FisioFlow Cloud Functions Entry Point
 * Exporta todas as Cloud Functions do projeto
 *
 * OTIMIZADO - Removido duplicatas e funções desnecessárias
 */

import * as functions from 'firebase-functions/v2';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
    DB_PASS_SECRET,
    DB_USER_SECRET,
    DB_NAME_SECRET,
    DB_HOST_IP_SECRET,
    DB_HOST_IP_PUBLIC_SECRET,
    CLOUD_SQL_CONNECTION_NAME_SECRET,
    CORS_ORIGINS
} from './init';
import {
    WHATSAPP_PHONE_NUMBER_ID_SECRET,
    WHATSAPP_ACCESS_TOKEN_SECRET
} from './communications/whatsapp';

// Set global options for all functions
setGlobalOptions({
    region: 'southamerica-east1',
    secrets: [
        DB_PASS_SECRET,
        DB_USER_SECRET,
        DB_NAME_SECRET,
        CLOUD_SQL_CONNECTION_NAME_SECRET,
        DB_HOST_IP_SECRET,
        DB_HOST_IP_PUBLIC_SECRET,
        WHATSAPP_PHONE_NUMBER_ID_SECRET,
        WHATSAPP_ACCESS_TOKEN_SECRET
    ],
    // Reduced maxInstances to prevent cost spikes (most functions don't need 100)
    maxInstances: 10,
    // Set default memory for all functions
    memory: '512MiB',
    // Set timeout for all functions (default is 60s for Gen 2)
    timeoutSeconds: 60,
    // Keep minimum instances warm for critical functions (reduces cold starts)
    // Note: This applies globally but can be overridden per function
    minInstances: 0,
});

// ============================================================================
// INICIALIZAÇÃO IMPORTS
// ============================================================================

// Import init for local usage in Triggers, but DO NOT EXPORT complex objects
// which confuse the firebase-functions loader.
import { adminDb } from './init';

// Initialize Sentry for error tracking (side effect import)
import './lib/sentry';

// ============================================================================
// API FUNCTIONS (Callable - Lazy Loading)
// ============================================================================

import { onCall, onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

// API de Pacientes
export const listPatients = onCall(async (request) => {
    const { listPatientsHandler } = await import('./api/patients');
    return listPatientsHandler(request);
});
export const createPatient = onCall(async (request) => {
    const { createPatientHandler } = await import('./api/patients');
    return createPatientHandler(request);
});
export const updatePatient = onCall(async (request) => {
    const { updatePatientHandler } = await import('./api/patients');
    return updatePatientHandler(request);
});
export const getPatient = onCall(async (request) => {
    const { getPatientHandler } = await import('./api/patients');
    return getPatientHandler(request);
});
export const deletePatient = onCall(async (request) => {
    const { deletePatientHandler } = await import('./api/patients');
    return deletePatientHandler(request);
});
export const getPatientStats = onCall(async (request) => {
    const { getPatientStatsHandler } = await import('./api/patients');
    return getPatientStatsHandler(request);
});
// HTTP (CORS) - frontend callFunctionHttp uses these names
export {
  listPatientsHttp as listPatientsV2,
  getPatientStatsHttp as getPatientStatsV2,
  getPatientHttp,
  createPatientHttp as createPatientV2,
  updatePatientHttp as updatePatientV2,
  deletePatientHttp as deletePatientV2,
} from './api/patients';
// Gamification / patient quests (callable)
export { checkPatientAppointments, getLastPainMapDate } from './api/patient-quests';

// API de Agendamentos
export const createAppointment = onCall(async (request) => {
    const { createAppointmentHandler } = await import('./api/appointments');
    return createAppointmentHandler(request);
});
export const updateAppointment = onCall(async (request) => {
    const { updateAppointmentHandler } = await import('./api/appointments');
    return updateAppointmentHandler(request);
});
export const getAppointment = onCall(async (request) => {
    const { getAppointmentHandler } = await import('./api/appointments');
    return getAppointmentHandler(request);
});
export const cancelAppointment = onCall(async (request) => {
    const { cancelAppointmentHandler } = await import('./api/appointments');
    return cancelAppointmentHandler(request);
});
export const checkTimeConflict = onCall(async (request) => {
    const { checkTimeConflictHandler } = await import('./api/appointments');
    return checkTimeConflictHandler(request);
});
// HTTP (CORS) - frontend callFunctionHttp hits these URLs
export { listAppointmentsHttp as listAppointments } from './api/appointments';
export { getAppointmentHttp as getAppointmentV2 } from './api/appointments';
export { createAppointmentHttp as createAppointmentV2 } from './api/appointments';

// API de Exercícios
export const listExercises = onCall(async (request) => {
    const { listExercisesHandler } = await import('./api/exercises');
    return listExercisesHandler(request);
});
export const getExercise = onCall(async (request) => {
    const { getExerciseHandler } = await import('./api/exercises');
    return getExerciseHandler(request);
});
export const searchSimilarExercises = onCall(async (request) => {
    const { searchSimilarExercisesHandler } = await import('./api/exercises');
    return searchSimilarExercisesHandler(request);
});
export const getExerciseCategories = onCall(async (request) => {
    const { getExerciseCategoriesHandler } = await import('./api/exercises');
    return getExerciseCategoriesHandler(request);
});
export const getPrescribedExercises = onCall(async (request) => {
    const { getPrescribedExercisesHandler } = await import('./api/exercises');
    return getPrescribedExercisesHandler(request);
});
export const logExercise = onCall(async (request) => {
    const { logExerciseHandler } = await import('./api/exercises');
    return logExerciseHandler(request);
});
export const createExercise = onCall(async (request) => {
    const { createExerciseHandler } = await import('./api/exercises');
    return createExerciseHandler(request);
});
export const updateExercise = onCall(async (request) => {
    const { updateExerciseHandler } = await import('./api/exercises');
    return updateExerciseHandler(request);
});
export const deleteExercise = onCall(async (request) => {
    const { deleteExerciseHandler } = await import('./api/exercises');
    return deleteExerciseHandler(request);
});
export const mergeExercises = onCall(async (request) => {
    const { mergeExercisesHandler } = await import('./api/exercises');
    return mergeExercisesHandler(request);
});

// API de Avaliações
export const listAssessments = onCall(async (request) => {
    const { listAssessmentsHandler } = await import('./api/assessments');
    return listAssessmentsHandler(request);
});
export const getAssessment = onCall(async (request) => {
    const { getAssessmentHandler } = await import('./api/assessments');
    return getAssessmentHandler(request);
});
export const createAssessment = onCall(async (request) => {
    const { createAssessmentHandler } = await import('./api/assessments');
    return createAssessmentHandler(request);
});
export const updateAssessment = onCall(async (request) => {
    const { updateAssessmentHandler } = await import('./api/assessments');
    return updateAssessmentHandler(request);
});
export const listAssessmentTemplates = onCall(async (request) => {
    const { listAssessmentTemplatesHandler } = await import('./api/assessments');
    return listAssessmentTemplatesHandler(request);
});
export const getAssessmentTemplate = onCall(async (request) => {
    const { getAssessmentTemplateHandler } = await import('./api/assessments');
    return getAssessmentTemplateHandler(request);
});

// API de Perfis (onCall with CORS so callFunctionHttp works from browser)
export const getProfile = onCall(
    { cors: CORS_ORIGINS },
    async (request) => {
        const { getProfileHandler } = await import('./api/profile');
        return getProfileHandler(request);
    }
);
export const updateProfile = onCall(async (request) => {
    const { updateProfileHandler } = await import('./api/profile');
    return updateProfileHandler(request);
});

// API de Pagamentos
export const listPayments = onCall(async (request) => {
    const { listPaymentsHandler } = await import('./api/payments');
    return listPaymentsHandler(request);
});
export const getPatientFinancialSummary = onCall(async (request) => {
    const { getPatientFinancialSummaryHandler } = await import('./api/payments');
    return getPatientFinancialSummaryHandler(request);
});
export const createPayment = onCall(async (request) => {
    const { createPaymentHandler } = await import('./api/payments');
    return createPaymentHandler(request);
});

// API Financeira (Transações)
export const listTransactions = onCall(async (request) => {
    const { listTransactionsHandler } = await import('./api/financial');
    return listTransactionsHandler(request);
});
export const createTransaction = onCall(async (request) => {
    const { createTransactionHandler } = await import('./api/financial');
    return createTransactionHandler(request);
});
export const updateTransaction = onCall(async (request) => {
    const { updateTransactionHandler } = await import('./api/financial');
    return updateTransactionHandler(request);
});
export const deleteTransaction = onCall(async (request) => {
    const { deleteTransactionHandler } = await import('./api/financial');
    return deleteTransactionHandler(request);
});
export const findTransactionByAppointmentId = onCall(async (request) => {
    const { findTransactionByAppointmentIdHandler } = await import('./api/financial');
    return findTransactionByAppointmentIdHandler(request);
});
export const getEventReport = onCall(async (request) => {
    const { getEventReportHandler } = await import('./api/financial');
    return getEventReportHandler(request);
});
// HTTP (CORS) - V2 endpoints for frontend
export {
  listTransactionsHttp as listTransactionsV2,
  createTransactionHttp as createTransactionV2,
  updateTransactionHttp as updateTransactionV2,
  deleteTransactionHttp as deleteTransactionV2,
  findTransactionByAppointmentIdHttp as findTransactionByAppointmentIdV2,
  getEventReportHttp as getEventReportV2,
} from './api/financial';

// API de Prontuários
export const getPatientRecords = onCall(async (request) => {
    const { getPatientRecordsHandler } = await import('./api/medical-records');
    return getPatientRecordsHandler(request);
});
export const getPainRecords = onCall(async (request) => {
    const { getPainRecordsHandler } = await import('./api/medical-records');
    return getPainRecordsHandler(request);
});
export const savePainRecord = onCall(async (request) => {
    const { savePainRecordHandler } = await import('./api/medical-records');
    return savePainRecordHandler(request);
});
export const createMedicalRecord = onCall(async (request) => {
    const { createMedicalRecordHandler } = await import('./api/medical-records');
    return createMedicalRecordHandler(request);
});
export const updateMedicalRecord = onCall(async (request) => {
    const { updateMedicalRecordHandler } = await import('./api/medical-records');
    return updateMedicalRecordHandler(request);
});
export const listTreatmentSessions = onCall(async (request) => {
    const { listTreatmentSessionsHandler } = await import('./api/medical-records');
    return listTreatmentSessionsHandler(request);
});
export const createTreatmentSession = onCall(async (request) => {
    const { createTreatmentSessionHandler } = await import('./api/medical-records');
    return createTreatmentSessionHandler(request);
});
export const updateTreatmentSession = onCall(async (request) => {
    const { updateTreatmentSessionHandler } = await import('./api/medical-records');
    return updateTreatmentSessionHandler(request);
});

// API HTTP para avaliações
export const apiEvaluate = onRequest(async (req: Request, res: Response) => {
    const { apiEvaluateHandler } = await import('./api/evaluate');
    return apiEvaluateHandler(req, res);
});

// Health Check
export const healthCheck = onRequest(async (req: Request, res: Response) => {
    const { healthCheckHandler } = await import('./api/health');
    return healthCheckHandler(req, res);
});

// Upload API (replaces Vercel Blob /api/upload)
export const generateUploadToken = onCall(async (request) => {
    const { generateUploadTokenHandler } = await import('./api/upload');
    return generateUploadTokenHandler(request);
});
export const confirmUpload = onCall(async (request) => {
    const { confirmUploadHandler } = await import('./api/upload');
    return confirmUploadHandler(request);
});
export const deleteStorageFile = onCall(async (request) => {
    const { deleteFileHandler } = await import('./api/upload');
    return deleteFileHandler(request);
});
export const listUserFiles = onCall(async (request) => {
    const { listUserFilesHandler } = await import('./api/upload');
    return listUserFilesHandler(request);
});

// Cloud API Endpoints
export const synthesizeTTS = onRequest(async (req: any, res: any) => {
    const { synthesizeTTSHandler } = await import('./api/tts');
    return synthesizeTTSHandler(req, res);
});

export const transcribeAudio = onRequest(async (req: any, res: any) => {
    const { transcribeAudioHandler } = await import('./api/speech');
    return transcribeAudioHandler(req, res);
});

export const transcribeLongAudio = onRequest(async (req: any, res: any) => {
    const { transcribeLongAudioHandler } = await import('./api/speech');
    return transcribeLongAudioHandler(req, res);
});

export const translate = onRequest(async (req: any, res: any) => {
    const { translateHandler } = await import('./api/translation');
    return translateHandler(req, res);
});

export const detectLanguage = onRequest(async (req: any, res: any) => {
    const { detectLanguageHandler } = await import('./api/translation');
    return detectLanguageHandler(req, res);
});

export const getSupportedLanguages = onRequest(async (req: any, res: any) => {
    const { getSupportedLanguagesHandler } = await import('./api/translation');
    return getSupportedLanguagesHandler(req, res);
});

export const translateExercise = onRequest(async (req: any, res: any) => {
    const { translateExerciseHandler } = await import('./api/translation');
    return translateExerciseHandler(req, res);
});

// Exercise Image Proxy - bypasses CORS issues for Firebase Storage images
export const exerciseImageProxy = onRequest(async (req: any, res: any) => {
    const { exerciseImageProxy } = await import('./api/exerciseImage');
    return exerciseImageProxy(req, res);
});

// Admin Functions
export const createAdminUser = onCall(async (request) => {
    const { createAdminUserHandler } = await import('./admin/create-user');
    return createAdminUserHandler();
});

// Migration Functions
export const createPerformanceIndexes = onCall(async (request) => {
    const { createPerformanceIndexesHandler } = await import('./migrations/create-performance-indexes');
    return createPerformanceIndexesHandler(request);
});

// AI FUNCTIONS
export const aiExerciseSuggestion = onCall(async (request) => {
    const { exerciseSuggestionHandler } = await import('./ai/exercise-suggestion');
    return exerciseSuggestionHandler(request);
});

export const aiSoapGeneration = onCall(async (request) => {
    const { soapGenerationHandler } = await import('./ai/soap-generation');
    return soapGenerationHandler(request);
});

export const aiClinicalAnalysis = onCall(async (request) => {
    const { clinicalAnalysisHandler } = await import('./ai/clinical-analysis');
    return clinicalAnalysisHandler(request);
});

export const aiMovementAnalysis = onCall(async (request) => {
    const { movementAnalysisHandler } = await import('./ai/movement-analysis');
    return movementAnalysisHandler(request);
});

// New AI Functions (Clinical Assistant)
export const aiClinicalChat = onCall(async (request) => {
    const { aiClinicalChatHandler } = await import('./ai/clinical-chat');
    return aiClinicalChatHandler(request);
});

export const aiExerciseRecommendationChat = onCall(async (request) => {
    const { aiExerciseRecommendationChatHandler } = await import('./ai/clinical-chat');
    return aiExerciseRecommendationChatHandler(request);
});

export const aiSoapNoteChat = onCall(async (request) => {
    const { aiSoapNoteChatHandler } = await import('./ai/clinical-chat');
    return aiSoapNoteChatHandler(request);
});

export const aiGetSuggestions = onCall(async (request) => {
    const { aiGetSuggestionsHandler } = await import('./ai/clinical-chat');
    return aiGetSuggestionsHandler(request);
});

export const getPatientAISummaryHttp = onRequest(async (req: any, res: any) => {
    const { getPatientAISummaryHttpHandler } = await import('./api/ai-assistant');
    return getPatientAISummaryHttpHandler(req, res);
});

export const getClinicalInsightsHttp = onRequest(async (req: any, res: any) => {
    const { getClinicalInsightsHttpHandler } = await import('./api/clinical-insights');
    return getClinicalInsightsHttpHandler(req, res);
});

export const scanMedicalReportHttp = onRequest(async (req: any, res: any) => {
    const { scanMedicalReportHttpHandler } = await import('./api/ocr-scanner');
    return scanMedicalReportHttpHandler(req, res);
});

export { migrateClinicalSchema } from './migrations/clinical-setup';
export { dailyPatientDigest } from './crons/scheduled-tasks';
export { analyzeProgress } from './ai/flows';

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

// Webhook Management
export const subscribeWebhook = onCall(async (request) => {
    const { subscribeWebhookHandler } = await import('./webhooks/index');
    return subscribeWebhookHandler(request);
});
export const unsubscribeWebhook = onCall(async (request) => {
    const { unsubscribeWebhookHandler } = await import('./webhooks/index');
    return unsubscribeWebhookHandler(request);
});
export const listWebhooks = onCall(async (request) => {
    const { listWebhooksHandler } = await import('./webhooks/index');
    return listWebhooksHandler(request);
});
export const testWebhook = onCall(async (request) => {
    const { testWebhookHandler } = await import('./webhooks/index');
    return testWebhookHandler(request);
});
export const getWebhookEventTypes = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (req: any, res: any) => {
        const { getWebhookEventTypesHandler } = await import('./webhooks/index');
        return getWebhookEventTypesHandler(req, res);
    }
);

// ============================================================================
// INTEGRATIONS (Calendar, etc.)
// ============================================================================

// Integrations (Calendar, etc.)
export const syncToGoogleCalendar = onCall(async (request) => {
    const { syncToGoogleCalendarHandler } = await import('./integrations/calendar');
    return syncToGoogleCalendarHandler(request);
});
export const syncIntegration = onCall(async (request) => {
    const { syncIntegrationHandler } = await import('./integrations/calendar');
    return syncIntegrationHandler(request);
});
export const importFromGoogleCalendar = onCall(async (request) => {
    const { importFromGoogleCalendarHandler } = await import('./integrations/calendar');
    return importFromGoogleCalendarHandler(request);
});
export const connectGoogleCalendar = onCall(async (request) => {
    const { connectGoogleCalendarHandler } = await import('./integrations/calendar');
    return connectGoogleCalendarHandler(request);
});
export const disconnectGoogleCalendar = onCall(async (request) => {
    const { disconnectGoogleCalendarHandler } = await import('./integrations/calendar');
    return disconnectGoogleCalendarHandler(request);
});
export const getGoogleAuthUrl = onCall(async (request) => {
    const { getGoogleAuthUrlHandler } = await import('./integrations/calendar');
    return getGoogleAuthUrlHandler(request);
});
export { exportToICal } from './integrations/calendar';

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

// Export/Import Functions
export const exportPatients = onCall(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        maxInstances: 5,
        timeoutSeconds: 300,
    },
    async (request) => {
        const { exportPatientsHandler } = await import('./export-import/index');
        return exportPatientsHandler(request);
    }
);
export const importPatients = onCall(
    {
        region: 'southamerica-east1',
        memory: '512MiB',
        maxInstances: 5,
        timeoutSeconds: 300,
    },
    async (request) => {
        const { importPatientsHandler } = await import('./export-import/index');
        return importPatientsHandler(request);
    }
);
export const downloadExport = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (req: any, res: any) => {
        const { downloadExportHandler } = await import('./export-import/index');
        return downloadExportHandler(req, res);
    }
);

// ============================================================================
// MONITORING & OBSERVABILITY
// ============================================================================

// Monitoring & Observability
export { setupMonitoring } from './api/setup-monitoring';
export const getErrorStats = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getErrorStatsHandler } = await import('./monitoring/error-dashboard');
        return getErrorStatsHandler(request);
    }
);
export const getRecentErrors = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getRecentErrorsHandler } = await import('./monitoring/error-dashboard');
        return getRecentErrorsHandler(request);
    }
);
export const resolveError = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { resolveErrorHandler } = await import('./monitoring/error-dashboard');
        return resolveErrorHandler(request);
    }
);
export const getErrorDetails = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getErrorDetailsHandler } = await import('./monitoring/error-dashboard');
        return getErrorDetailsHandler(request);
    }
);
export const errorStream = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (req: any, res: any) => {
        const { errorStreamHandler } = await import('./monitoring/error-dashboard');
        return errorStreamHandler(req, res);
    }
);
export const getErrorTrends = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getErrorTrendsHandler } = await import('./monitoring/error-dashboard');
        return getErrorTrendsHandler(request);
    }
);
export const cleanupOldErrors = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
    },
    async (request) => {
        const { cleanupOldErrorsHandler } = await import('./monitoring/error-dashboard');
        return cleanupOldErrorsHandler(request);
    }
);

export const getPerformanceStats = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getPerformanceStatsHandler } = await import('./monitoring/performance-tracing');
        return getPerformanceStatsHandler(request);
    }
);
export const getSlowRequests = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getSlowRequestsHandler } = await import('./monitoring/performance-tracing');
        return getSlowRequestsHandler(request);
    }
);
export const getTraceTimeline = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getTraceTimelineHandler } = await import('./monitoring/performance-tracing');
        return getTraceTimelineHandler(request);
    }
);
export const getPerformanceTrends = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (request) => {
        const { getPerformanceTrendsHandler } = await import('./monitoring/performance-tracing');
        return getPerformanceTrendsHandler(request);
    }
);
export const performanceStream = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 10,
    },
    async (req: any, res: any) => {
        const { performanceStreamHandler } = await import('./monitoring/performance-tracing');
        return performanceStreamHandler(req, res);
    }
);
export const cleanupOldTraces = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
    },
    async (request) => {
        const { cleanupOldTracesHandler } = await import('./monitoring/performance-tracing');
        return cleanupOldTracesHandler(request);
    }
);

import * as aiReports from './monitoring/ai-reports';
export const generateAIReport = aiReports.generateAIReport;
export const listReports = aiReports.listReports;
export const getReport = aiReports.getReport;
export const downloadReport = aiReports.downloadReport;
export const scheduledDailyReport = aiReports.scheduledDailyReport;
export const scheduledWeeklyReport = aiReports.scheduledWeeklyReport;

// ============================================================================
// REALTIME FUNCTIONS
// ============================================================================

// Realtime Functions
export const realtimePublish = onRequest(async (req: any, res: any) => {
    const { realtimePublishHandler } = await import('./realtime/publisher');
    await realtimePublishHandler(req, res);
});

// ============================================================================
// BACKGROUND TRIGGERS
// ============================================================================

// Firestore triggers with proper error handling
export const onPatientCreated = functions.firestore.onDocumentCreated(
    'patients/{patientId}',
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const patient = snapshot.data();
        const db = adminDb;

        try {
            // Criar registro financeiro inicial
            await db.collection('patient_financial_summaries').doc(snapshot.id).set({
                patient_id: snapshot.id,
                organization_id: patient.organization_id,
                total_paid_cents: 0,
                individual_sessions_paid: 0,
                package_sessions_total: 0,
                package_sessions_used: 0,
                package_sessions_available: 0,
                updated_at: new Date().toISOString(),
            });
        } catch (error: any) {
            // Distinguish between retryable and non-retryable errors
            const errorCode = error.code;
            if (errorCode === 'already-exists' || errorCode === 'permission-denied') {
                // Non-retryable error - log and continue
                console.error('[onPatientCreated] Non-retryable error:', error.message);
                return; // Don't throw - allows trigger to complete
            }
            // Retryable error - rethrow for Cloud Functions to retry
            throw error;
        }
    }
);

/**
 * Firestore trigger unificado: publica eventos de agendamento no Ably (INSERT e UPDATE)
 */
export const onAppointmentWritten = functions.firestore.onDocumentWritten(
    'appointments/{appointmentId}',
    async (event) => {
        const after = event.data?.after?.data();
        const before = event.data?.before?.data();
        if (!after) return;

        const eventType = before ? 'UPDATE' : 'INSERT';
        try {
            const realtime = await import('./realtime/publisher');
            await realtime.publishAppointmentEvent(after.organization_id, {
                event: eventType,
                new: after,
                old: before ?? null,
            });
        } catch (err) {
            console.error('[onAppointmentWritten] Realtime publish failed (non-critical):', err);
        }
    }
);

// ============================================================================
// SCHEDULED FUNCTIONS (Cron Jobs)
// ============================================================================

export { dailyReports, weeklySummary } from './crons/daily-reports';
export { expiringVouchers, birthdays, cleanup, dataIntegrity } from './crons/additional-crons';

// ============================================================================
// WORKFLOWS (Substituem Inngest)
// ============================================================================

// Notification Workflows
export { sendNotification, sendNotificationBatch, processNotificationQueue, emailWebhook } from './workflows/notifications';

// Appointment Workflows
export { appointmentReminders, onAppointmentCreatedWorkflow, onAppointmentUpdatedWorkflow } from './workflows/appointments';

// Patient Reactivation Workflow
export { patientReactivation } from './workflows/reactivation';

// WhatsApp Test Functions
export { testWhatsAppMessage, testWhatsAppTemplate } from './communications/whatsapp';

// ============================================================================
// Auth Triggers
// ============================================================================

import { onUserCreated } from './auth/user-created';
export { onUserCreated }; // v1 trigger exported directly

export const createUserInvitation = onCall(
    { cors: true, memory: '512MiB', maxInstances: 10 },
    async (request) => {
        const { createUserInvitationHandler } = await import('./auth/invitations');
        return createUserInvitationHandler(request);
    }
);
export const getInvitationByToken = onCall(
    { cors: true, memory: '512MiB', maxInstances: 10 },
    async (request) => {
        const { getInvitationByTokenHandler } = await import('./auth/invitations');
        return getInvitationByTokenHandler(request);
    }
);
export const consumeInvitation = onCall(
    { cors: true, memory: '512MiB', maxInstances: 10 },
    async (request) => {
        const { consumeInvitationHandler } = await import('./auth/invitations');
        return consumeInvitationHandler(request);
    }
);

// User Management API
export const listUsers = onCall(async (request) => {
    const { listUsersHandler } = await import('./api/users');
    return listUsersHandler(request);
});
export const updateUserRole = onCall(async (request) => {
    const { updateUserRoleHandler } = await import('./api/users');
    return updateUserRoleHandler(request);
});

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
export { stripeWebhookHttp } from './stripe/webhook';

// ============================================================================
// GOOGLE CLOUD SERVICES EXPORTS
// ============================================================================

// Export helper functions (lib) - avoid re-exporting names already exported from api/
export {
    initCrashlytics,
    recordError,
    setUserId,
    clearUserId,
    setCustomKey,
    setCustomKeys,
    createCrashlyticsLogger,
} from './lib/crashlytics';

export {
    startTrace,
    measure,
    measureHttpCall,
    measureDatabase,
    measureFirestore,
    startHttpTrace,
    withPerformanceTracing,
} from './lib/performance';
