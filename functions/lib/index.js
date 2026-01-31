"use strict";
/**
 * FisioFlow Cloud Functions Entry Point
 * Exporta todas as Cloud Functions do projeto
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmUpload = exports.generateUploadToken = exports.healthCheck = exports.apiEvaluate = exports.updateTreatmentSession = exports.createTreatmentSession = exports.listTreatmentSessions = exports.updateMedicalRecord = exports.createMedicalRecord = exports.savePainRecord = exports.getPainRecords = exports.getPatientRecords = exports.getEventReport = exports.findTransactionByAppointmentId = exports.deleteTransaction = exports.updateTransaction = exports.createTransaction = exports.listTransactions = exports.createPayment = exports.listPayments = exports.getPatientStats = exports.updateProfile = exports.getProfile = exports.getAssessmentTemplate = exports.listAssessmentTemplates = exports.updateAssessment = exports.createAssessment = exports.getAssessment = exports.listAssessments = exports.mergeExercises = exports.deleteExercise = exports.updateExercise = exports.createExercise = exports.logExercise = exports.getPrescribedExercises = exports.getExerciseCategories = exports.searchSimilarExercises = exports.getExercise = exports.listExercises = exports.checkTimeConflict = exports.cancelAppointment = exports.getAppointment = exports.updateAppointment = exports.createAppointment = exports.listAppointments = exports.deletePatient = exports.getPatient = exports.updatePatient = exports.createPatient = exports.listPatients = void 0;
exports.updateUserRole = exports.listUsers = exports.onUserCreated = exports.testWhatsAppTemplate = exports.testWhatsAppMessage = exports.patientReactivation = exports.onAppointmentUpdatedWorkflow = exports.onAppointmentCreatedWorkflow = exports.appointmentReminders = exports.emailWebhook = exports.processNotificationQueue = exports.sendNotificationBatch = exports.sendNotification = exports.dataIntegrity = exports.cleanup = exports.birthdays = exports.expiringVouchers = exports.weeklySummary = exports.dailyReports = exports.dailyReminders = exports.onAppointmentUpdated = exports.onAppointmentCreated = exports.onPatientCreated = exports.apiRouter = exports.realtimePublish = exports.aiMovementAnalysis = exports.aiClinicalAnalysis = exports.aiSoapGeneration = exports.aiExerciseSuggestion = exports.setupMonitoring = exports.runPerformanceIndexes = exports.createPerformanceIndexes = exports.runMigrationHttp = exports.runMigration = exports.createAdminUser = exports.listUserFiles = exports.deleteStorageFile = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const v2_1 = require("firebase-functions/v2");
const init_1 = require("./init");
const whatsapp_1 = require("./communications/whatsapp");
// Set global options for all functions
(0, v2_1.setGlobalOptions)({
    region: 'southamerica-east1',
    secrets: [
        init_1.DB_PASS_SECRET,
        init_1.DB_USER_SECRET,
        init_1.DB_NAME_SECRET,
        init_1.CLOUD_SQL_CONNECTION_NAME_SECRET,
        init_1.DB_HOST_IP_SECRET,
        init_1.DB_HOST_IP_PUBLIC_SECRET,
        whatsapp_1.WHATSAPP_PHONE_NUMBER_ID_SECRET,
        whatsapp_1.WHATSAPP_ACCESS_TOKEN_SECRET
    ],
    // Allow up to 100 concurrent instances per function (removed bottleneck)
    maxInstances: 100,
    // Use full CPU vCPU for better performance
    cpu: 1,
    // Set default memory for all functions
    memory: '512MiB',
});
// ============================================================================
// INICIALIZAÇÃO IMPORTS
// ============================================================================
// Import init for local usage in Triggers, but DO NOT EXPORT complex objects
// which confuse the firebase-functions loader.
const init_2 = require("./init");
// Initialize Sentry for error tracking (side effect import)
require("./lib/sentry");
// ============================================================================
// API FUNCTIONS (Callable)
// ============================================================================
// API de Pacientes
const apiPatients = __importStar(require("./api/patients"));
exports.listPatients = apiPatients.listPatients;
exports.createPatient = apiPatients.createPatient;
exports.updatePatient = apiPatients.updatePatient;
exports.getPatient = apiPatients.getPatient;
exports.deletePatient = apiPatients.deletePatient;
// API de Agendamentos
const apiAppointments = __importStar(require("./api/appointments"));
exports.listAppointments = apiAppointments.listAppointments;
exports.createAppointment = apiAppointments.createAppointment;
exports.updateAppointment = apiAppointments.updateAppointment;
exports.getAppointment = apiAppointments.getAppointment;
exports.cancelAppointment = apiAppointments.cancelAppointment;
exports.checkTimeConflict = apiAppointments.checkTimeConflict;
// API de Exercícios
const apiExercises = __importStar(require("./api/exercises"));
exports.listExercises = apiExercises.listExercises;
exports.getExercise = apiExercises.getExercise;
exports.searchSimilarExercises = apiExercises.searchSimilarExercises;
exports.getExerciseCategories = apiExercises.getExerciseCategories;
exports.getPrescribedExercises = apiExercises.getPrescribedExercises;
exports.logExercise = apiExercises.logExercise;
exports.createExercise = apiExercises.createExercise;
exports.updateExercise = apiExercises.updateExercise;
exports.deleteExercise = apiExercises.deleteExercise;
exports.mergeExercises = apiExercises.mergeExercises;
// API de Avaliações
const apiAssessments = __importStar(require("./api/assessments"));
exports.listAssessments = apiAssessments.listAssessments;
exports.getAssessment = apiAssessments.getAssessment;
exports.createAssessment = apiAssessments.createAssessment;
exports.updateAssessment = apiAssessments.updateAssessment;
exports.listAssessmentTemplates = apiAssessments.listAssessmentTemplates;
exports.getAssessmentTemplate = apiAssessments.getAssessmentTemplate;
// API de Perfis
const apiProfile = __importStar(require("./api/profile"));
exports.getProfile = apiProfile.getProfile;
exports.updateProfile = apiProfile.updateProfile;
// API de Estatísticas de Pacientes
const patient_stats_1 = require("./api/patient-stats");
Object.defineProperty(exports, "getPatientStats", { enumerable: true, get: function () { return patient_stats_1.getPatientStats; } });
// API de Pagamentos
const apiPayments = __importStar(require("./api/payments"));
exports.listPayments = apiPayments.listPayments;
exports.createPayment = apiPayments.createPayment;
// API Financeira (Transações)
const apiFinancial = __importStar(require("./api/financial"));
exports.listTransactions = apiFinancial.listTransactions;
exports.createTransaction = apiFinancial.createTransaction;
exports.updateTransaction = apiFinancial.updateTransaction;
exports.deleteTransaction = apiFinancial.deleteTransaction;
exports.findTransactionByAppointmentId = apiFinancial.findTransactionByAppointmentId;
exports.getEventReport = apiFinancial.getEventReport;
// API de Prontuários
const apiMedicalRecords = __importStar(require("./api/medical-records"));
exports.getPatientRecords = apiMedicalRecords.getPatientRecords;
exports.getPainRecords = apiMedicalRecords.getPainRecords;
exports.savePainRecord = apiMedicalRecords.savePainRecord;
exports.createMedicalRecord = apiMedicalRecords.createMedicalRecord;
exports.updateMedicalRecord = apiMedicalRecords.updateMedicalRecord;
exports.listTreatmentSessions = apiMedicalRecords.listTreatmentSessions;
exports.createTreatmentSession = apiMedicalRecords.createTreatmentSession;
exports.updateTreatmentSession = apiMedicalRecords.updateTreatmentSession;
// API HTTP para avaliações
const evaluate_1 = require("./api/evaluate");
Object.defineProperty(exports, "apiEvaluate", { enumerable: true, get: function () { return evaluate_1.apiEvaluate; } });
// Health Check
const health_1 = require("./api/health");
Object.defineProperty(exports, "healthCheck", { enumerable: true, get: function () { return health_1.healthCheck; } });
// Upload API (replaces Vercel Blob /api/upload)
var upload_1 = require("./api/upload");
Object.defineProperty(exports, "generateUploadToken", { enumerable: true, get: function () { return upload_1.generateUploadToken; } });
Object.defineProperty(exports, "confirmUpload", { enumerable: true, get: function () { return upload_1.confirmUpload; } });
Object.defineProperty(exports, "deleteStorageFile", { enumerable: true, get: function () { return upload_1.deleteFile; } });
Object.defineProperty(exports, "listUserFiles", { enumerable: true, get: function () { return upload_1.listUserFiles; } });
// Admin Functions
const create_user_1 = require("./admin/create-user");
Object.defineProperty(exports, "createAdminUser", { enumerable: true, get: function () { return create_user_1.createAdminUser; } });
// Migration Functions (temporary - can be removed after migration)
const runMigration_1 = require("./runMigration");
Object.defineProperty(exports, "runMigration", { enumerable: true, get: function () { return runMigration_1.runMigration; } });
const runMigrationHttp_1 = require("./runMigrationHttp");
Object.defineProperty(exports, "runMigrationHttp", { enumerable: true, get: function () { return runMigrationHttp_1.runMigrationHttp; } });
const create_performance_indexes_1 = require("./migrations/create-performance-indexes");
Object.defineProperty(exports, "createPerformanceIndexes", { enumerable: true, get: function () { return create_performance_indexes_1.createPerformanceIndexes; } });
const run_performance_indexes_1 = require("./migrations/run-performance-indexes");
Object.defineProperty(exports, "runPerformanceIndexes", { enumerable: true, get: function () { return run_performance_indexes_1.runPerformanceIndexes; } });
const setup_monitoring_1 = require("./api/setup-monitoring");
Object.defineProperty(exports, "setupMonitoring", { enumerable: true, get: function () { return setup_monitoring_1.setupMonitoring; } });
// ============================================================================
// AI FUNCTIONS
// ============================================================================
var exercise_suggestion_1 = require("./ai/exercise-suggestion");
Object.defineProperty(exports, "aiExerciseSuggestion", { enumerable: true, get: function () { return exercise_suggestion_1.exerciseSuggestion; } });
var soap_generation_1 = require("./ai/soap-generation");
Object.defineProperty(exports, "aiSoapGeneration", { enumerable: true, get: function () { return soap_generation_1.soapGeneration; } });
var clinical_analysis_1 = require("./ai/clinical-analysis");
Object.defineProperty(exports, "aiClinicalAnalysis", { enumerable: true, get: function () { return clinical_analysis_1.clinicalAnalysis; } });
var movement_analysis_1 = require("./ai/movement-analysis");
Object.defineProperty(exports, "aiMovementAnalysis", { enumerable: true, get: function () { return movement_analysis_1.movementAnalysis; } });
// ============================================================================
// REALTIME FUNCTIONS
// ============================================================================
const realtimePublisher = __importStar(require("./realtime/publisher"));
exports.realtimePublish = realtimePublisher.realtimePublish;
// ============================================================================
// HTTP FUNCTIONS
// ============================================================================
exports.apiRouter = functions.https.onRequest({
    cors: init_2.CORS_ORIGINS,
}, async (req, res) => {
    // Router principal para endpoints HTTP
    const { path } = req;
    // Parse do path
    const segments = path.split('/').filter(Boolean);
    if (segments[0] === 'api') {
        // Router de API
        res.json({ message: 'API Router', path: segments.join('/') });
    }
    else {
        res.status(404).json({ error: 'Not found' });
    }
});
// ============================================================================
// BACKGROUND TRIGGERS
// ============================================================================
// Firestore triggers with proper error handling
exports.onPatientCreated = functions.firestore.onDocumentCreated({
    document: 'patients/{patientId}',
    region: 'southamerica-east1',
    memory: '256MiB',
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const patient = snapshot.data();
    const db = init_2.adminDb;
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
    }
    catch (error) {
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
});
exports.onAppointmentCreated = functions.firestore.onDocumentCreated({
    document: 'appointments/{appointmentId}',
    region: 'southamerica-east1',
    memory: '256MiB',
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const appointment = snapshot.data();
    // Publicar no Ably para atualização em tempo real com timeout protection
    try {
        const realtime = await Promise.resolve().then(() => __importStar(require('./realtime/publisher')));
        await realtime.publishAppointmentEvent(appointment.organization_id, {
            event: 'INSERT',
            new: appointment,
            old: null,
        });
    }
    catch (err) {
        // Non-critical error - log but don't fail the trigger
        console.error('[onAppointmentCreated] Realtime publish failed (non-critical):', err);
    }
});
exports.onAppointmentUpdated = functions.firestore.onDocumentWritten({
    document: 'appointments/{appointmentId}',
    region: 'southamerica-east1',
    memory: '256MiB',
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before && after) {
        try {
            const realtime = await Promise.resolve().then(() => __importStar(require('./realtime/publisher')));
            await realtime.publishAppointmentEvent(after.organization_id, {
                event: 'UPDATE',
                new: after,
                old: before,
            });
        }
        catch (err) {
            // Non-critical error - log but don't fail the trigger
            console.error('[onAppointmentUpdated] Realtime publish failed (non-critical):', err);
        }
    }
});
// ============================================================================
// SCHEDULED FUNCTIONS (Cron Jobs)
// ============================================================================
var reminders_1 = require("./crons/reminders");
Object.defineProperty(exports, "dailyReminders", { enumerable: true, get: function () { return reminders_1.dailyReminders; } });
var daily_reports_1 = require("./crons/daily-reports");
Object.defineProperty(exports, "dailyReports", { enumerable: true, get: function () { return daily_reports_1.dailyReports; } });
Object.defineProperty(exports, "weeklySummary", { enumerable: true, get: function () { return daily_reports_1.weeklySummary; } });
var additional_crons_1 = require("./crons/additional-crons");
Object.defineProperty(exports, "expiringVouchers", { enumerable: true, get: function () { return additional_crons_1.expiringVouchers; } });
Object.defineProperty(exports, "birthdays", { enumerable: true, get: function () { return additional_crons_1.birthdays; } });
Object.defineProperty(exports, "cleanup", { enumerable: true, get: function () { return additional_crons_1.cleanup; } });
Object.defineProperty(exports, "dataIntegrity", { enumerable: true, get: function () { return additional_crons_1.dataIntegrity; } });
// ============================================================================
// WORKFLOWS (Substituem Inngest)
// ============================================================================
// Notification Workflows
var notifications_1 = require("./workflows/notifications");
Object.defineProperty(exports, "sendNotification", { enumerable: true, get: function () { return notifications_1.sendNotification; } });
Object.defineProperty(exports, "sendNotificationBatch", { enumerable: true, get: function () { return notifications_1.sendNotificationBatch; } });
Object.defineProperty(exports, "processNotificationQueue", { enumerable: true, get: function () { return notifications_1.processNotificationQueue; } });
Object.defineProperty(exports, "emailWebhook", { enumerable: true, get: function () { return notifications_1.emailWebhook; } });
// Appointment Workflows
var appointments_1 = require("./workflows/appointments");
Object.defineProperty(exports, "appointmentReminders", { enumerable: true, get: function () { return appointments_1.appointmentReminders; } });
Object.defineProperty(exports, "onAppointmentCreatedWorkflow", { enumerable: true, get: function () { return appointments_1.onAppointmentCreatedWorkflow; } });
Object.defineProperty(exports, "onAppointmentUpdatedWorkflow", { enumerable: true, get: function () { return appointments_1.onAppointmentUpdatedWorkflow; } });
// Patient Reactivation Workflow
var reactivation_1 = require("./workflows/reactivation");
Object.defineProperty(exports, "patientReactivation", { enumerable: true, get: function () { return reactivation_1.patientReactivation; } });
// WhatsApp Test Functions
var whatsapp_2 = require("./communications/whatsapp");
Object.defineProperty(exports, "testWhatsAppMessage", { enumerable: true, get: function () { return whatsapp_2.testWhatsAppMessage; } });
Object.defineProperty(exports, "testWhatsAppTemplate", { enumerable: true, get: function () { return whatsapp_2.testWhatsAppTemplate; } });
// ============================================================================
// Auth Triggers
const user_created_1 = require("./auth/user-created");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return user_created_1.onUserCreated; } });
// User Management API
const users_1 = require("./api/users");
Object.defineProperty(exports, "listUsers", { enumerable: true, get: function () { return users_1.listUsers; } });
Object.defineProperty(exports, "updateUserRole", { enumerable: true, get: function () { return users_1.updateUserRole; } });
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
//# sourceMappingURL=index.js.map