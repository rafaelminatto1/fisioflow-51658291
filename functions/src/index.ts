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

// Import optimization presets
import {
    AI_FUNCTION,
    STANDARD_FUNCTION,
    withCors
} from './lib/function-config';

// Set global options for all functions - CONFIGURAÇÃO ORIGINAL (ajustada para quota Spark)
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
    // Mantido baixo para não exceder quota do plano Spark
    maxInstances: 1,
    memory: '256MiB',
    cpu: 0.1,
    timeoutSeconds: 60,
    concurrency: 1,
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
// OTIMIZAÇÃO: Removidas versões Callable duplicadas (lines 75-98)
// O frontend usa as versões HTTP (V2) com CORS
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
// OTIMIZAÇÃO: Removidas versões Callable duplicadas
// O frontend usa as versões HTTP (V2) com CORS
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
// OTIMIZAÇÃO: Removidas versões Callable duplicadas
// O frontend usa as versões HTTP (V2) com CORS
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

// API de Médicos
export const listDoctors = onRequest(async (req, res) => {
    const { listDoctorsHttp } = await import('./api/doctors');
    return listDoctorsHttp(req, res);
});
export const searchDoctorsV2 = onRequest(async (req, res) => {
    const { searchDoctorsHttp } = await import('./api/doctors');
    return searchDoctorsHttp(req, res);
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

// OTIMIZAÇÃO: Nova função HTTP para criar índices otimizados
export const createOptimizedIndexes = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '256MiB',
        timeoutSeconds: 300,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { createOptimizedIndexesHandler } = await import('./migrations/create-indexes-optimized');
        return createOptimizedIndexesHandler(req, res);
    }
);

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

export const runPatientRagSchema = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '512MiB',
        timeoutSeconds: 300,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { runPatientRagSchemaHandler } = await import('./migrations/run-patient-rag-schema');
        return runPatientRagSchemaHandler(req, res);
    }
);

// OTIMIZAÇÃO: Removida versão Callable duplicada de rebuildPatientRagIndex
// Mantida apenas versão HTTP abaixo
export const rebuildPatientRagIndexHttp = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        cpu: 1,
        memory: '1GiB',
        timeoutSeconds: 540,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { rebuildPatientRagIndexHttpHandler } = await import('./ai/rag/rag-index-maintenance');
        return rebuildPatientRagIndexHttpHandler(req, res);
    }
);

// ============================================================================
// OTIMIZAÇÃO FASE 3: AI SERVICE UNIFICADO
// ============================================================================
// As seguintes funções AI individuais foram REMOVIDAS e consolidadas no aiService:
// - generateExercisePlan → use aiService com action: 'generateExercisePlan'
// - aiClinicalAnalysis → use aiService com action: 'clinicalAnalysis'
// - aiExerciseSuggestion → use aiService com action: 'exerciseSuggestion'
// - aiSoapGeneration → use aiService com action: 'soapGeneration'
// - aiMovementAnalysis → use aiService com action: 'movementAnalysis'
// - aiClinicalChat → use aiService com action: 'clinicalChat'
// - aiExerciseRecommendationChat → use aiService com action: 'exerciseRecommendationChat'
// - aiSoapNoteChat → use aiService com action: 'soapNoteChat'
// - aiGetSuggestions → use aiService com action: 'getSuggestions'
// - analyzeProgress → use aiService com action: 'analyzeProgress'
// - aiFastProcessing → use aiService com action: 'fastProcessing'
//
// Economia: R$ 15-20/mês (13 serviços Cloud Run → 1 serviço unificado)
// ============================================================================

// HTTP AI endpoints (mantidos - funcionalidades diferentes)
export const getPatientAISummaryHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { getPatientAISummaryHttpHandler } = await import('./api/ai-assistant');
        return getPatientAISummaryHttpHandler(req, res);
    }
);

export const getClinicalInsightsHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { getClinicalInsightsHttpHandler } = await import('./api/clinical-insights');
        return getClinicalInsightsHttpHandler(req, res);
    }
);

export const scanMedicalReportHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { scanMedicalReportHttpHandler } = await import('./api/ocr-scanner');
        return scanMedicalReportHttpHandler(req, res);
    }
);

// ============================================================================
// OTIMIZAÇÃO FASE 2: AI SERVICE UNIFICADO
// ============================================================================
// Nova função unificada que consolida múltiplas funções AI em um único serviço
// Uso: chamar aiService com { action: 'nomeDaAcao', ...params }
// Ações disponíveis: generateExercisePlan, clinicalAnalysis, exerciseSuggestion,
//                    soapGeneration, analyzeProgress, movementAnalysis, clinicalChat,
//                    exerciseRecommendationChat, soapNoteChat, getSuggestions, fastProcessing
//
// Economia: ~R$ 15-20/mês ao migrar das funções individuais para esta versão unificada
// As funções individuais acima são mantidas para compatibilidade durante a migração
// ============================================================================
export const aiService = onCall(
    AI_FUNCTION,
    async (request) => {
        const { aiServiceHandler } = await import('./ai/unified-ai-service');
        return aiServiceHandler(request);
    }
);

export const aiServiceHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { aiServiceHttpHandler } = await import('./ai/unified-ai-service');
        return aiServiceHttpHandler(req, res);
    }
);

// REMOVIDO: migrateClinicalSchema - migração já executada
export { dailyPatientDigest } from './crons/scheduled-tasks';

// ============================================================================
// OTIMIZAÇÃO FASE 3: Funções AI individuais removidas
// ============================================================================
// analyzeProgress e aiFastProcessing foram consolidadas no aiService
// Use: aiService com action: 'analyzeProgress' ou 'fastProcessing'
// ============================================================================

// ============================================================================
// OTIMIZAÇÃO FASE 3: Serviços Unificados (Exercícios e Avaliações)
// ============================================================================
// Serviços unificados criados para migração futura:
// - exerciseService: Consolida listExercises, getExercise, searchSimilarExercises, etc.
// - assessmentService: Consolida listAssessments, getAssessment, createAssessment, etc.
//
// Para migrar o frontend, substituir:
// await callFunction('listExercises', { data })
// Por:
// await callFunction('exerciseService', { action: 'list', data })
//
// Economia potencial: ~R$ 8-12/mês (16 serviços → 2 serviços)
// ============================================================================

export const exerciseService = onCall(
    STANDARD_FUNCTION,
    async (request) => {
        const { exerciseServiceHandler } = await import('./api/exercises-unified');
        return exerciseServiceHandler(request);
    }
);

export const assessmentService = onCall(
    STANDARD_FUNCTION,
    async (request) => {
        const { assessmentServiceHandler } = await import('./api/assessments-unified');
        return assessmentServiceHandler(request);
    }
);

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

export const syncDoctorToSql = functions.firestore.onDocumentWritten(
    'doctors/{doctorId}',
    async (event) => {
        const { syncDoctorToSqlHandler } = await import('./api/doctors');
        const doctorId = event.params.doctorId;
        const doctorData = event.data?.after.data();

        if (!doctorData) {
            const { getPool } = await import('./init');
            const pool = getPool();
            await pool.query('UPDATE doctors SET is_active = false, updated_at = NOW() WHERE id = $1', [doctorId]);
            return;
        }

        return syncDoctorToSqlHandler(doctorId, doctorData);
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
export { appointmentReminders, appointmentReminders2h, onAppointmentCreatedWorkflow, onAppointmentUpdatedWorkflow } from './workflows/appointments';

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
