/**
 * FisioFlow Cloud Functions Entry Point
 * Exporta todas as Cloud Functions do projeto
 */

import * as functions from 'firebase-functions/v2';
import { setGlobalOptions } from 'firebase-functions/v2';
import {
    DB_PASS_SECRET,
    DB_USER_SECRET,
    DB_NAME_SECRET,
    CLOUD_SQL_CONNECTION_NAME_SECRET,
    DB_HOST_IP_SECRET,
    DB_HOST_IP_PUBLIC_SECRET
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
    // Allow up to 100 concurrent instances per function (removed bottleneck)
    maxInstances: 100,
    // 0.5 vCPU to stay within "total allowable CPU per project per region" quota during deploy
    cpu: 0.5,
    // Set default memory for all functions
    memory: '512MiB',
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
// API FUNCTIONS (Callable)
// ============================================================================

// API de Pacientes
import * as apiPatients from './api/patients';
export const listPatientsV2 = apiPatients.listPatientsHttp; // HTTP version - new name to avoid conflict
export const getPatientHttp = apiPatients.getPatientHttp; // HTTP version for web
export const getPatientStatsV2 = apiPatients.getPatientStatsHttp; // HTTP version - CORS fix
export const createPatientV2 = apiPatients.createPatientHttp; // HTTP version - CORS fix
export const updatePatientV2 = apiPatients.updatePatientHttp; // HTTP version - CORS fix
export const deletePatientV2 = apiPatients.deletePatientHttp; // HTTP version - CORS fix
export const listPatients = apiPatients.listPatients; // Original callable - TODO: remove after migration
export const createPatient = apiPatients.createPatient;
export const updatePatient = apiPatients.updatePatient;
export const getPatient = apiPatients.getPatient;
export const deletePatient = apiPatients.deletePatient;

// API de Agendamentos
import * as apiAppointments from './api/appointments';
export const listAppointments = apiAppointments.listAppointmentsHttp; // Use HTTP version for CORS fix
export const getAppointmentV2 = apiAppointments.getAppointmentHttp; // HTTP version - CORS fix
export const createAppointmentV2 = apiAppointments.createAppointmentHttp; // HTTP version - CORS fix
export const updateAppointmentV2 = apiAppointments.updateAppointmentHttp; // HTTP version - CORS fix
export const cancelAppointmentV2 = apiAppointments.cancelAppointmentHttp; // HTTP version - CORS fix
export const checkTimeConflictV2 = apiAppointments.checkTimeConflictHttp; // HTTP version - CORS fix
export const createAppointment = apiAppointments.createAppointment;
export const updateAppointment = apiAppointments.updateAppointment;
export const getAppointment = apiAppointments.getAppointment;
export const cancelAppointment = apiAppointments.cancelAppointment;
export const checkTimeConflict = apiAppointments.checkTimeConflict;

// API de Exercícios
import * as apiExercises from './api/exercises';
export const listExercisesV2 = apiExercises.listExercisesHttp;
export const getExerciseV2 = apiExercises.getExerciseHttp;
export const searchSimilarExercisesV2 = apiExercises.searchSimilarExercisesHttp;
export const getExerciseCategoriesV2 = apiExercises.getExerciseCategoriesHttp;
export const getPrescribedExercisesV2 = apiExercises.getPrescribedExercisesHttp;
export const logExerciseV2 = apiExercises.logExerciseHttp;
export const createExerciseV2 = apiExercises.createExerciseHttp;
export const updateExerciseV2 = apiExercises.updateExerciseHttp;
export const deleteExerciseV2 = apiExercises.deleteExerciseHttp;
export const mergeExercisesV2 = apiExercises.mergeExercisesHttp;
export const listExercises = apiExercises.listExercises;
export const getExercise = apiExercises.getExercise;
export const searchSimilarExercises = apiExercises.searchSimilarExercises;
export const getExerciseCategories = apiExercises.getExerciseCategories;
export const getPrescribedExercises = apiExercises.getPrescribedExercises;
export const logExercise = apiExercises.logExercise;
export const createExercise = apiExercises.createExercise;
export const updateExercise = apiExercises.updateExercise;
export const deleteExercise = apiExercises.deleteExercise;
export const mergeExercises = apiExercises.mergeExercises;

// API de Avaliações
import * as apiAssessments from './api/assessments';
export const listAssessments = apiAssessments.listAssessments;
export const getAssessment = apiAssessments.getAssessment;
export const createAssessment = apiAssessments.createAssessment;
export const updateAssessment = apiAssessments.updateAssessment;
export const listAssessmentTemplates = apiAssessments.listAssessmentTemplates;
export const getAssessmentTemplate = apiAssessments.getAssessmentTemplate;

// API de Perfis
import * as apiProfile from './api/profile';
export const getProfile = apiProfile.getProfile;
export const updateProfile = apiProfile.updateProfile;

// API de Estatísticas de Pacientes
import { getPatientStats } from './api/patient-stats';
export { getPatientStats };

// API de Pagamentos
import * as apiPayments from './api/payments';
export const listPayments = apiPayments.listPayments;
export const createPayment = apiPayments.createPayment;
// API Financeira (Transações)
import * as apiFinancial from './api/financial';
export const listTransactionsV2 = apiFinancial.listTransactionsHttp;
export const createTransactionV2 = apiFinancial.createTransactionHttp;
export const updateTransactionV2 = apiFinancial.updateTransactionHttp;
export const deleteTransactionV2 = apiFinancial.deleteTransactionHttp;
export const findTransactionByAppointmentIdV2 = apiFinancial.findTransactionByAppointmentIdHttp;
export const getEventReportV2 = apiFinancial.getEventReportHttp;
export const listTransactions = apiFinancial.listTransactions;
export const createTransaction = apiFinancial.createTransaction;
export const updateTransaction = apiFinancial.updateTransaction;
export const deleteTransaction = apiFinancial.deleteTransaction;
export const findTransactionByAppointmentId = apiFinancial.findTransactionByAppointmentId;
export const getEventReport = apiFinancial.getEventReport;

// API de Prontuários
import * as apiMedicalRecords from './api/medical-records';
export const getPatientRecordsV2 = apiMedicalRecords.getPatientRecordsHttp;
export const createMedicalRecordV2 = apiMedicalRecords.createMedicalRecordHttp;
export const updateMedicalRecordV2 = apiMedicalRecords.updateMedicalRecordHttp;
export const deleteMedicalRecordV2 = apiMedicalRecords.deleteMedicalRecordHttp;
export const listTreatmentSessionsV2 = apiMedicalRecords.listTreatmentSessionsHttp;
export const createTreatmentSessionV2 = apiMedicalRecords.createTreatmentSessionHttp;
export const getPainRecordsV2 = apiMedicalRecords.getPainRecordsHttp;
export const savePainRecordV2 = apiMedicalRecords.savePainRecordHttp;
export const getPatientRecords = apiMedicalRecords.getPatientRecords;
export const getPainRecords = apiMedicalRecords.getPainRecords;
export const savePainRecord = apiMedicalRecords.savePainRecord;
export const createMedicalRecord = apiMedicalRecords.createMedicalRecord;
export const updateMedicalRecord = apiMedicalRecords.updateMedicalRecord;
export const listTreatmentSessions = apiMedicalRecords.listTreatmentSessions;
export const createTreatmentSession = apiMedicalRecords.createTreatmentSession;
export const updateTreatmentSession = apiMedicalRecords.updateTreatmentSession;

// API HTTP para avaliações
import { apiEvaluate } from './api/evaluate';
export { apiEvaluate };

// Health Check
import { healthCheck } from './api/health';
export { healthCheck };

// Upload API (replaces Vercel Blob /api/upload)
export { generateUploadToken, confirmUpload, deleteFile as deleteStorageFile, listUserFiles } from './api/upload';

// ============================================================================
// GOOGLE CLOUD SERVICES API ENDPOINTS
// ============================================================================

import { synthesizeTTS } from './api/tts';
import { transcribeAudio, transcribeLongAudio } from './api/speech';
import { translate, detectLanguage, getSupportedLanguages, translateExercise } from './api/translation';

export { synthesizeTTS, transcribeAudio, transcribeLongAudio, translate, detectLanguage, getSupportedLanguages, translateExercise };

// Admin Functions
import { createAdminUser } from './admin/create-user';
export { createAdminUser };

// Migration Functions (temporary - can be removed after migration)
import { runMigration } from './runMigration';
export { runMigration };
import { runMigrationHttp } from './runMigrationHttp';
export { runMigrationHttp };
import { createPerformanceIndexes } from './migrations/create-performance-indexes';
export { createPerformanceIndexes };
import { runPerformanceIndexes } from './migrations/run-performance-indexes';
export { runPerformanceIndexes };
import { setupMonitoring } from './api/setup-monitoring';
export { setupMonitoring };

// ============================================================================
// AI FUNCTIONS
// ============================================================================

export { exerciseSuggestion as aiExerciseSuggestion } from './ai/exercise-suggestion';
export { soapGeneration as aiSoapGeneration } from './ai/soap-generation';
export { clinicalAnalysis as aiClinicalAnalysis } from './ai/clinical-analysis';
export { movementAnalysis as aiMovementAnalysis } from './ai/movement-analysis';

// New AI Functions (Clinical Assistant)
export {
    aiClinicalChat,
    aiExerciseRecommendationChat,
    aiSoapNoteChat,
    aiGetSuggestions
} from './ai/clinical-chat';

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

import * as webhooks from './webhooks/index';
export const subscribeWebhook = webhooks.subscribeWebhook;
export const unsubscribeWebhook = webhooks.unsubscribeWebhook;
export const listWebhooks = webhooks.listWebhooks;
export const testWebhook = webhooks.testWebhook;
export const getWebhookEventTypes = webhooks.getWebhookEventTypes;

// ============================================================================
// EXPORT/IMPORT FUNCTIONS
// ============================================================================

import * as exportImport from './export-import/index';
export const exportPatients = exportImport.exportPatients;
export const importPatients = exportImport.importPatients;
export const downloadExport = exportImport.downloadExport;

// ============================================================================
// MONITORING & OBSERVABILITY
// ============================================================================

import * as errorDashboard from './monitoring/error-dashboard';
export const getErrorStats = errorDashboard.getErrorStats;
export const getRecentErrors = errorDashboard.getRecentErrors;
export const resolveError = errorDashboard.resolveError;
export const getErrorDetails = errorDashboard.getErrorDetails;
export const errorStream = errorDashboard.errorStream;
export const getErrorTrends = errorDashboard.getErrorTrends;
export const cleanupOldErrors = errorDashboard.cleanupOldErrors;

import * as performanceTracing from './monitoring/performance-tracing';
export const getPerformanceStats = performanceTracing.getPerformanceStats;
export const getSlowRequests = performanceTracing.getSlowRequests;
export const getTraceTimeline = performanceTracing.getTraceTimeline;
export const getPerformanceTrends = performanceTracing.getPerformanceTrends;
export const performanceStream = performanceTracing.performanceStream;
export const cleanupOldTraces = performanceTracing.cleanupOldTraces;

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

import * as realtimePublisher from './realtime/publisher';
export const realtimePublish = realtimePublisher.realtimePublish;

// ============================================================================
// HTTP FUNCTIONS
// ============================================================================

export const apiRouter = functions.https.onRequest({
    cors: true,
}, async (req, res) => {
    // Router principal para endpoints HTTP
    const { path } = req;

    // Parse do path
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'api') {
        // Router de API
        res.json({ message: 'API Router', path: segments.join('/') });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// ============================================================================
// BACKGROUND TRIGGERS
// ============================================================================

// Firestore triggers with proper error handling
export const onPatientCreated = functions.firestore.onDocumentCreated(
    {
        document: 'patients/{patientId}',
        region: 'southamerica-east1',
        memory: '256MiB',
    },
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

export const onAppointmentCreated = functions.firestore.onDocumentCreated(
    {
        document: 'appointments/{appointmentId}',
        region: 'southamerica-east1',
        memory: '256MiB',
    },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const appointment = snapshot.data();

        // Publicar no Ably para atualização em tempo real com timeout protection
        try {
            const realtime = await import('./realtime/publisher');
            await realtime.publishAppointmentEvent(appointment.organization_id, {
                event: 'INSERT',
                new: appointment,
                old: null,
            });
        } catch (err) {
            // Non-critical error - log but don't fail the trigger
            console.error('[onAppointmentCreated] Realtime publish failed (non-critical):', err);
        }
    }
);

export const onAppointmentUpdated = functions.firestore.onDocumentWritten(
    {
        document: 'appointments/{appointmentId}',
        region: 'southamerica-east1',
        memory: '256MiB',
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();

        if (before && after) {
            try {
                const realtime = await import('./realtime/publisher');
                await realtime.publishAppointmentEvent(after.organization_id, {
                    event: 'UPDATE',
                    new: after,
                    old: before,
                });
            } catch (err) {
                // Non-critical error - log but don't fail the trigger
                console.error('[onAppointmentUpdated] Realtime publish failed (non-critical):', err);
            }
        }
    }
);

// ============================================================================
// SCHEDULED FUNCTIONS (Cron Jobs)
// ============================================================================

export { dailyReminders } from './crons/reminders';
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
import { onUserCreated } from './auth/user-created';
export { onUserCreated }; // v1 trigger exported directly

// User Management API
import { listUsers, updateUserRole } from './api/users';
export { listUsers, updateUserRole };

/**
 * Trigger disparado quando um novo usuário é criado no Firebase Auth.
 * Cria o perfil correspondente na tabela profiles do Cloud SQL.
 *
 * TODO: Temporarily disabled - onUserCreated not available in firebase-functions v2
 */
// export const onUserCreatedHandler = onUserCreatedFn(async (user: any) => {
//     const pool = getPool();
//     const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
//
//     try {
//         await pool.query(
//             `INSERT INTO profiles (
//                 user_id,
//                 organization_id,
//                 full_name,
//                 email,
//                 role,
//                 email_verified,
//                 is_active
//             ) VALUES ($1, $2, $3, $4, $5, $6, true)
//             ON CONFLICT (user_id) DO NOTHING`,
//             [
//                 user.uid,
//                 DEFAULT_ORG_ID,
//                 user.displayName || 'Novo Usuário',
//                 user.email,
//                 'fisioterapeuta', // Papel padrão
//                 user.emailVerified || false
//             ]
//         );
//     } catch (error) {
//         // Error logged by logger
//     }
// });

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
