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
    RESEND_API_KEY_SECRET,
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
        WHATSAPP_ACCESS_TOKEN_SECRET,
        RESEND_API_KEY_SECRET
    ],
    // Reduced maxInstances to prevent cost spikes and CPU Quota errors
    maxInstances: 1,
    // Set default memory for all functions (reduced to save quota)
    memory: '256MiB',
    // Set default CPU for all functions (lowered to fit within quota)
    cpu: 0.1,
    // Set timeout for all functions (default is 60s for Gen 2)
    timeoutSeconds: 60,
    // Set concurrency to 1 to allow CPU < 1
    concurrency: 1,
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
export { updateAppointmentHttp as updateAppointmentV2 } from './api/appointments';
export { cancelAppointmentHttp as cancelAppointmentV2 } from './api/appointments';
export { checkTimeConflictHttp as checkTimeConflictV2 } from './api/appointments';

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

export const runPatientMedicalReturnCols = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '256MiB',
        timeoutSeconds: 300,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { runPatientMedicalReturnCols } = await import('./migrations/run-patient-medical-return-cols');
        return runPatientMedicalReturnCols(req, res);
    }
);

export const runPerformanceIndexes = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '512MiB',
        timeoutSeconds: 300,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { runPerformanceIndexes } = await import('./migrations/run-performance-indexes');
        return runPerformanceIndexes(req, res);
    }
);

// AI FUNCTIONS
// AI FUNCTIONS (Genkit Modernized)
export const generateExercisePlan = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { exerciseGeneratorHandler } = await import('./ai/flow-wrappers');
        return exerciseGeneratorHandler(request);
    }
);

export const aiClinicalAnalysis = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { clinicalAnalysisHandler } = await import('./ai/flow-wrappers');
        return clinicalAnalysisHandler(request);
    }
);

export const aiExerciseSuggestion = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { exerciseSuggestionHandler } = await import('./ai/flow-wrappers');
        return exerciseSuggestionHandler(request);
    }
);

export const aiSoapGeneration = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { soapGenerationHandler } = await import('./ai/flow-wrappers');
        return soapGenerationHandler(request);
    }
);

export const aiMovementAnalysis = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { movementAnalysisHandler } = await import('./ai/movement-analysis');
        return movementAnalysisHandler(request);
    }
);

// New AI Functions (Clinical Assistant)
export const aiClinicalChat = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { aiClinicalChatHandler } = await import('./ai/clinical-chat');
        return aiClinicalChatHandler(request);
    }
);

export const aiExerciseRecommendationChat = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { aiExerciseRecommendationChatHandler } = await import('./ai/clinical-chat');
        return aiExerciseRecommendationChatHandler(request);
    }
);

export const aiSoapNoteChat = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { aiSoapNoteChatHandler } = await import('./ai/clinical-chat');
        return aiSoapNoteChatHandler(request);
    }
);

export const aiGetSuggestions = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { aiGetSuggestionsHandler } = await import('./ai/clinical-chat');
        return aiGetSuggestionsHandler(request);
    }
);

export const getPatientAISummaryHttp = onRequest(
    { cpu: 2, memory: '1GiB', maxInstances: 1, cors: CORS_ORIGINS },
    async (req: any, res: any) => {
        const { getPatientAISummaryHttpHandler } = await import('./api/ai-assistant');
        return getPatientAISummaryHttpHandler(req, res);
    }
);

export const getClinicalInsightsHttp = onRequest(
    { cpu: 2, memory: '1GiB', maxInstances: 1, cors: CORS_ORIGINS },
    async (req: any, res: any) => {
        const { getClinicalInsightsHttpHandler } = await import('./api/clinical-insights');
        return getClinicalInsightsHttpHandler(req, res);
    }
);

export const scanMedicalReportHttp = onRequest(
    { cpu: 2, memory: '1GiB', maxInstances: 1, cors: CORS_ORIGINS },
    async (req: any, res: any) => {
        const { scanMedicalReportHttpHandler } = await import('./api/ocr-scanner');
        return scanMedicalReportHttpHandler(req, res);
    }
);

// REMOVIDO: migrateClinicalSchema - migração já executada
export { dailyPatientDigest } from './crons/scheduled-tasks';
export const analyzeProgress = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1, region: 'southamerica-east1' },
    async (request) => {
        const { analyzeProgressHandler } = await import('./ai/flow-wrappers');
        return analyzeProgressHandler(request);
    }
);

export const aiFastProcessing = onCall(
    { cpu: 2, memory: '1GiB', maxInstances: 1 },
    async (request) => {
        const { aiFastProcessingHandler } = await import('./ai/groq-service');
        return aiFastProcessingHandler(request);
    }
);

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

// Webhook Management - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
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
// REMOVIDO: testWebhook - função de teste não usada em produção
export const getWebhookEventTypes = onRequest(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
    },
    async (req: any, res: any) => {
        const { getWebhookEventTypesHandler } = await import('./webhooks/index');
        return getWebhookEventTypesHandler(req, res);
    }
);
*/

// ============================================================================
// INTEGRATIONS (Calendar, etc.)
// ============================================================================

// Integrations (Calendar, etc.) - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
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
*/

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

// Export/Import Functions
// TEMPORARILY DISABLED: export const exportPatients = onCall(
// TEMPORARILY DISABLED:     {
// TEMPORARILY DISABLED:         region: 'southamerica-east1',
// TEMPORARILY DISABLED:         memory: '512MiB',
// TEMPORARILY DISABLED:         maxInstances: 1,
// TEMPORARILY DISABLED:         timeoutSeconds: 300,
// TEMPORARILY DISABLED:     },
// TEMPORARILY DISABLED:     async (request) => {
// TEMPORARILY DISABLED:         const { exportPatientsHandler } = await import('./export-import/index');
// TEMPORARILY DISABLED:         return exportPatientsHandler(request);
// TEMPORARILY DISABLED:     }
// TEMPORARILY DISABLED: );
// TEMPORARILY DISABLED: export const importPatients = onCall(
// TEMPORARILY DISABLED:     {
// TEMPORARILY DISABLED:         region: 'southamerica-east1',
// TEMPORARILY DISABLED:         memory: '512MiB',
// TEMPORARILY DISABLED:         maxInstances: 1,
// TEMPORARILY DISABLED:         timeoutSeconds: 300,
// TEMPORARILY DISABLED:     },
// TEMPORARILY DISABLED:     async (request) => {
// TEMPORARILY DISABLED:         const { importPatientsHandler } = await import('./export-import/index');
// TEMPORARILY DISABLED:         return importPatientsHandler(request);
// TEMPORARILY DISABLED:     }
// TEMPORARILY DISABLED: );
// TEMPORARILY DISABLED: export const downloadExport = onRequest(
// TEMPORARILY DISABLED:     {
// TEMPORARILY DISABLED:         region: 'southamerica-east1',
// TEMPORARILY DISABLED:         memory: '256MiB',
// TEMPORARILY DISABLED:         maxInstances: 1,
// TEMPORARILY DISABLED:     },
// TEMPORARILY DISABLED:     async (req: any, res: any) => {
// TEMPORARILY DISABLED:         const { downloadExportHandler } = await import('./export-import/index');
// TEMPORARILY DISABLED:         return downloadExportHandler(req, res);
// TEMPORARILY DISABLED:     }
// TEMPORARILY DISABLED: );

// ============================================================================
// MONITORING & OBSERVABILITY
// ============================================================================

// Monitoring & Observability - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
// REMOVIDO: setupMonitoring - função de setup não usada em produção
export const getErrorStats = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
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
        maxInstances: 1,
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
        maxInstances: 1,
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
        maxInstances: 1,
    },
    async (request) => {
        const { getErrorDetailsHandler } = await import('./monitoring/error-dashboard');
        return getErrorDetailsHandler(request);
    }
);
// REMOVIDO: errorStream - stream não essencial, usar polling
// REMOVIDO: getErrorTrends, cleanupOldErrors - monitoramento não essencial

export const getPerformanceStats = onCall(
    {
        region: 'southamerica-east1',
        memory: '256MiB',
        maxInstances: 1,
    },
    async (request) => {
        const { getPerformanceStatsHandler } = await import('./monitoring/performance-tracing');
        return getPerformanceStatsHandler(request);
    }
);

import * as aiReports from './monitoring/ai-reports';
export const generateAIReport = aiReports.generateAIReport;
export const listReports = aiReports.listReports;
export const getReport = aiReports.getReport;
export const downloadReport = aiReports.downloadReport;
export const scheduledDailyReport = aiReports.scheduledDailyReport;
export const scheduledWeeklyReport = aiReports.scheduledWeeklyReport;
*/

// ============================================================================
// REALTIME FUNCTIONS
// ============================================================================

// Realtime Functions - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
export const realtimePublish = onRequest(async (req: any, res: any) => {
    const { realtimePublishHandler } = await import('./realtime/publisher');
    await realtimePublishHandler(req, res);
});
*/

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

// [NEW] Sync Firestore changes back to Cloud SQL (Offline/Mobile support)
export const syncPatientToSql = functions.firestore.onDocumentWritten(
    'patients/{patientId}',
    async (event) => {
        const { handlePatientSync } = await import('./triggers/sync-patients');
        return handlePatientSync(event as any);
    }
);

export const syncAppointmentToSql = functions.firestore.onDocumentWritten(
    'appointments/{appointmentId}',
    async (event) => {
        const { handleAppointmentSync } = await import('./triggers/sync-appointments');
        return handleAppointmentSync(event as any);
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

// Cron Jobs - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
export { dailyReports, weeklySummary } from './crons/daily-reports';
export { expiringVouchers, birthdays, cleanup, dataIntegrity } from './crons/additional-crons';
*/

// ============================================================================
// WORKFLOWS (Substituem Inngest)
// ============================================================================

// Notification Workflows
export {
    sendNotification,
    sendNotificationBatch,
    notifyAppointmentScheduled,
    notifyAppointmentReschedule,
    notifyAppointmentCancellation,
    processNotificationQueue,
    emailWebhook
} from './workflows/notifications';

// Appointment Workflows
export { appointmentReminders, onAppointmentCreatedWorkflow, onAppointmentUpdatedWorkflow } from './workflows/appointments';

// Patient Reactivation Workflow
export { patientReactivation } from './workflows/reactivation';

// ============================================================================
// COMMUNICATIONS (Email, WhatsApp)
// ============================================================================

export const sendEmail = onCall(async (request) => {
    const { sendEmailHandler } = await import('./communications/email-service');
    return sendEmailHandler(request);
});

// WhatsApp Test Functions
// REMOVIDO: testWhatsAppMessage, testWhatsAppTemplate - funções de teste não usadas em produção

// ============================================================================
// Auth Triggers
// ============================================================================

import { onUserCreated } from './auth/user-created';
export { onUserCreated }; // v1 trigger exported directly

export const createUserInvitation = onCall(
    { cors: true, memory: '512MiB', maxInstances: 1 },
    async (request) => {
        const { createUserInvitationHandler } = await import('./auth/invitations');
        return createUserInvitationHandler(request);
    }
);
export const getInvitationByToken = onCall(
    { cors: true, memory: '512MiB', maxInstances: 1 },
    async (request) => {
        const { getInvitationByTokenHandler } = await import('./auth/invitations');
        return getInvitationByTokenHandler(request);
    }
);
export const consumeInvitation = onCall(
    { cors: true, memory: '512MiB', maxInstances: 1 },
    async (request) => {
        const { consumeInvitationHandler } = await import('./auth/invitations');
        return consumeInvitationHandler(request);
    }
);

// User Management API - TEMPORARILY DISABLED TO SAVE RESOURCES
/*
export const listUsers = onCall(async (request) => {
    const { listUsersHandler } = await import('./api/users');
    return listUsersHandler(request);
});
export const updateUserRole = onCall(async (request) => {
    const { updateUserRoleHandler } = await import('./api/users');
    return updateUserRoleHandler(request);
});
*/

// ============================================================================
// STRIPE WEBHOOK
// ============================================================================
// TEMPORARILY DISABLED TO SAVE RESOURCES
// export { stripeWebhookHttp } from './stripe/webhook';

// ============================================================================
// GOOGLE CLOUD SERVICES EXPORTS
// ============================================================================

// ============================================================================
// GOOGLE INTEGRATIONS (Maps, Meet, Calendar)
// ============================================================================
// TEMPORARILY DISABLED TO SAVE RESOURCES
/*
import * as googleIntegrations from './integrations/google';
export const searchPlaces = googleIntegrations.searchPlaces;
// export const getGoogleAuthUrl = googleIntegrations.getGoogleAuthUrl; // Already exported in integrations/calendar, using unique name here
export const getGoogleAuthUrlIntegration = googleIntegrations.getGoogleAuthUrl;
export const googleAuthCallback = googleIntegrations.googleAuthCallback;
export const createMeetLink = googleIntegrations.createMeetLink;
export const syncPatientCalendar = googleIntegrations.syncPatientCalendar;
export const getBusinessReviews = googleIntegrations.getBusinessReviews;
*/

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
}
    from './lib/performance';


// Storage Triggers
export { onDicomUpload } from './storage/dicomTriggers';
