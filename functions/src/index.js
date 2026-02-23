"use strict";
/**
 * FisioFlow Cloud Functions Entry Point
 * Exporta todas as Cloud Functions do projeto
 *
 * OTIMIZADO - Removido duplicatas e funções desnecessárias
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventReportV2 = exports.findTransactionByAppointmentIdV2 = exports.deleteTransactionV2 = exports.updateTransactionV2 = exports.createTransactionV2 = exports.listTransactionsV2 = exports.createPayment = exports.getPatientFinancialSummary = exports.listPayments = exports.updateProfile = exports.getProfile = exports.getDashboardStatsV2 = exports.updateAssessmentV2 = exports.createAssessmentV2 = exports.getAssessmentV2 = exports.listAssessmentsV2 = exports.getAssessmentTemplateV2 = exports.listAssessmentTemplatesV2 = exports.searchSimilarExercisesV2 = exports.mergeExercisesV2 = exports.deleteExerciseV2 = exports.updateExerciseV2 = exports.createExerciseV2 = exports.logExerciseV2 = exports.getPrescribedExercisesV2 = exports.getExerciseCategoriesV2 = exports.getExerciseV2 = exports.listExercisesV2 = exports.searchDoctorsV2 = exports.listDoctors = exports.checkTimeConflictV2 = exports.cancelAppointmentV2 = exports.updateAppointmentV2 = exports.createAppointmentV2 = exports.getAppointmentV2 = exports.listAppointments = exports.getLastPainMapDate = exports.checkPatientAppointments = exports.deletePatientV2 = exports.updatePatientV2 = exports.createPatientV2 = exports.getPatientHttp = exports.getPatientStatsV2 = exports.listPatientsV2 = exports.evolutionServiceHttp = exports.evolutionService = exports.appointmentServiceHttp = exports.appointmentService = exports.patientServiceHttp = exports.patientService = void 0;
exports.aiServiceHttp = exports.aiService = exports.generateMarketingTemplateHttp = exports.generateMarketingTemplate = exports.scanMedicalReportHttp = exports.rebuildPatientRagIndexHttp = exports.fixUserOrganization = exports.runDoctorsTable = exports.runPatientRagSchema = exports.runPerformanceIndexes = exports.runPatientMedicalReturnCols = exports.createOptimizedIndexes = exports.fixAppointmentIndex = exports.createPerformanceIndexes = exports.migrateRolesToClaims = exports.createAdminUser = exports.exerciseImageProxy = exports.translateExercise = exports.getSupportedLanguages = exports.detectLanguage = exports.translate = exports.transcribeLongAudio = exports.transcribeAudio = exports.synthesizeTTS = exports.listUserFiles = exports.deleteStorageFile = exports.confirmUpload = exports.generateUploadToken = exports.healthCheck = exports.apiEvaluate = exports.updateTreatmentSession = exports.createTreatmentSession = exports.listTreatmentSessions = exports.updateMedicalRecord = exports.createMedicalRecord = exports.savePainRecord = exports.getPainRecords = exports.getPatientRecords = exports.markAsPaid = exports.deleteFinancialRecord = exports.updateFinancialRecord = exports.createFinancialRecord = exports.getPatientFinancialSummaryV2 = exports.listPatientFinancialRecords = exports.listAllFinancialRecordsV2 = exports.deletePartnership = exports.updatePartnership = exports.createPartnership = exports.getPartnership = exports.listPartnerships = void 0;
exports.measureFirestore = exports.measureDatabase = exports.measureHttpCall = exports.measure = exports.startTrace = exports.createCrashlyticsLogger = exports.setCustomKeys = exports.setCustomKey = exports.clearUserId = exports.setUserId = exports.recordError = exports.initCrashlytics = exports.createPatientDriveFolder = exports.listGoogleTemplates = exports.generateGoogleReport = exports.getBusinessReviews = exports.syncPatientCalendar = exports.createMeetLink = exports.googleAuthCallback = exports.getGoogleAuthUrlIntegration = exports.searchPlaces = exports.consumeInvitation = exports.getInvitationByToken = exports.createUserInvitation = exports.onUserCreated = exports.sendEmail = exports.patientReactivation = exports.onAppointmentUpdatedWorkflow = exports.onAppointmentCreatedWorkflow = exports.appointmentReminders2h = exports.appointmentReminders = exports.emailWebhook = exports.processNotificationQueue = exports.notifyAppointmentCancellation = exports.notifyAppointmentReschedule = exports.notifyAppointmentScheduled = exports.sendNotificationBatch = exports.sendNotification = exports.onAppointmentRtdbSync = exports.onAppointmentRtdbSyncTrigger = exports.onPatientCreated = exports.processPurchase = exports.getLeaderboard = exports.onAppointmentCompleted = exports.onExerciseCompleted = exports.assessmentService = exports.exerciseService = exports.dailyPatientDigest = exports.dailyExerciseReminder = exports.analyzeMovementVideo = void 0;
exports.customQuery = exports.usageStats = exports.churnPrediction = exports.gamificationStats = exports.painMapAnalysis = exports.topExercises = exports.organizationStats = exports.patientEvolution = exports.dashboardMetrics = exports.setupAnalytics = exports.getDataRetentionStats = exports.compactLogs = exports.deleteExpiredDocuments = exports.setDocumentTTL = exports.scheduledDataRetention = exports.enforceDataRetention = exports.getOptimizationStats = exports.cleanupOrphanThumbnails = exports.cleanupOldImages = exports.optimizeImageOnUpload = exports.getIndexingStats = exports.onEvolutionCreated = exports.removeEvolutionEmbedding = exports.reindexPatientEvolutions = exports.indexEvolution = exports.indexExistingEvolutions = exports.onReportCreated = exports.onDicomUpload = exports.withPerformanceTracing = exports.startHttpTrace = void 0;
var functions = require("firebase-functions/v2");
var v2_1 = require("firebase-functions/v2");
var init_1 = require("./init");
var cors_1 = require("./lib/cors");
var whatsapp_1 = require("./communications/whatsapp");
// Import optimization presets
var function_config_1 = require("./lib/function-config");
// Set global options for all functions - CONFIGURAÇÃO OTIMIZADA PARA GEN 2
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
        whatsapp_1.WHATSAPP_ACCESS_TOKEN_SECRET,
        init_1.RESEND_API_KEY_SECRET
    ],
    // Aumentado para permitir melhor escalabilidade em produção
    maxInstances: 10,
    memory: '512MiB', // Memória base aumentada para suportar concorrência
    cpu: 1, // CPU dedicado necessário para concorrência > 1
    timeoutSeconds: 60,
    concurrency: 80, // Aproveita concorrência do Gen 2 (reduz cold starts e custos)
    minInstances: 0,
});
// ============================================================================
// INICIALIZAÇÃO IMPORTS
// ============================================================================
// Import init for local usage in Triggers, but DO NOT EXPORT complex objects
// which confuse the firebase-functions loader.
var init_2 = require("./init");
// Initialize Sentry for error tracking (side effect import)
require("./lib/sentry");
// ============================================================================
// SERVIÇOS UNIFICADOS (RECOMENDADO PARA FRONTEND)
// ============================================================================
// Estes serviços consolidam múltiplas funções em um único Cloud Run Service
// Economia estimada: R$ 40-60/mês ao reduzir instâncias warm.
var patients_unified_1 = require("./api/patients-unified");
Object.defineProperty(exports, "patientService", { enumerable: true, get: function () { return patients_unified_1.patientService; } });
Object.defineProperty(exports, "patientServiceHttp", { enumerable: true, get: function () { return patients_unified_1.patientServiceHttp; } });
var appointments_unified_1 = require("./api/appointments-unified");
Object.defineProperty(exports, "appointmentService", { enumerable: true, get: function () { return appointments_unified_1.appointmentService; } });
Object.defineProperty(exports, "appointmentServiceHttp", { enumerable: true, get: function () { return appointments_unified_1.appointmentServiceHttp; } });
var evolutions_unified_1 = require("./api/evolutions-unified");
Object.defineProperty(exports, "evolutionService", { enumerable: true, get: function () { return evolutions_unified_1.evolutionService; } });
Object.defineProperty(exports, "evolutionServiceHttp", { enumerable: true, get: function () { return evolutions_unified_1.evolutionServiceHttp; } });
// ============================================================================
// API FUNCTIONS (Individual Handlers - Mantidos para Retrocompatibilidade)
// ============================================================================
var https_1 = require("firebase-functions/v2/https");
// API de Pacientes (V2 HTTP)
var patients_1 = require("./api/patients");
Object.defineProperty(exports, "listPatientsV2", { enumerable: true, get: function () { return patients_1.listPatientsHttp; } });
Object.defineProperty(exports, "getPatientStatsV2", { enumerable: true, get: function () { return patients_1.getPatientStatsHttp; } });
Object.defineProperty(exports, "getPatientHttp", { enumerable: true, get: function () { return patients_1.getPatientHttp; } });
Object.defineProperty(exports, "createPatientV2", { enumerable: true, get: function () { return patients_1.createPatientHttp; } });
Object.defineProperty(exports, "updatePatientV2", { enumerable: true, get: function () { return patients_1.updatePatientHttp; } });
Object.defineProperty(exports, "deletePatientV2", { enumerable: true, get: function () { return patients_1.deletePatientHttp; } });
// Gamification / patient quests (callable)
var patient_quests_1 = require("./api/patient-quests");
Object.defineProperty(exports, "checkPatientAppointments", { enumerable: true, get: function () { return patient_quests_1.checkPatientAppointments; } });
Object.defineProperty(exports, "getLastPainMapDate", { enumerable: true, get: function () { return patient_quests_1.getLastPainMapDate; } });
// API de Agendamentos (V2 HTTP)
var appointments_1 = require("./api/appointments");
Object.defineProperty(exports, "listAppointments", { enumerable: true, get: function () { return appointments_1.listAppointmentsHttp; } });
var appointments_2 = require("./api/appointments");
Object.defineProperty(exports, "getAppointmentV2", { enumerable: true, get: function () { return appointments_2.getAppointmentHttp; } });
var appointments_3 = require("./api/appointments");
Object.defineProperty(exports, "createAppointmentV2", { enumerable: true, get: function () { return appointments_3.createAppointmentHttp; } });
var appointments_4 = require("./api/appointments");
Object.defineProperty(exports, "updateAppointmentV2", { enumerable: true, get: function () { return appointments_4.updateAppointmentHttp; } });
var appointments_5 = require("./api/appointments");
Object.defineProperty(exports, "cancelAppointmentV2", { enumerable: true, get: function () { return appointments_5.cancelAppointmentHttp; } });
var appointments_6 = require("./api/appointments");
Object.defineProperty(exports, "checkTimeConflictV2", { enumerable: true, get: function () { return appointments_6.checkTimeConflictHttp; } });
// API de Médicos (HTTP com CORS configurado no handler)
var doctors_1 = require("./api/doctors");
Object.defineProperty(exports, "listDoctors", { enumerable: true, get: function () { return doctors_1.listDoctorsHttp; } });
Object.defineProperty(exports, "searchDoctorsV2", { enumerable: true, get: function () { return doctors_1.searchDoctorsHttp; } });
// API de Exercícios
var exercises_1 = require("./api/exercises");
Object.defineProperty(exports, "listExercisesV2", { enumerable: true, get: function () { return exercises_1.listExercisesHttp; } });
Object.defineProperty(exports, "getExerciseV2", { enumerable: true, get: function () { return exercises_1.getExerciseHttp; } });
Object.defineProperty(exports, "getExerciseCategoriesV2", { enumerable: true, get: function () { return exercises_1.getExerciseCategoriesHttp; } });
Object.defineProperty(exports, "getPrescribedExercisesV2", { enumerable: true, get: function () { return exercises_1.getPrescribedExercisesHttp; } });
Object.defineProperty(exports, "logExerciseV2", { enumerable: true, get: function () { return exercises_1.logExerciseHttp; } });
Object.defineProperty(exports, "createExerciseV2", { enumerable: true, get: function () { return exercises_1.createExerciseHttp; } });
Object.defineProperty(exports, "updateExerciseV2", { enumerable: true, get: function () { return exercises_1.updateExerciseHttp; } });
Object.defineProperty(exports, "deleteExerciseV2", { enumerable: true, get: function () { return exercises_1.deleteExerciseHttp; } });
Object.defineProperty(exports, "mergeExercisesV2", { enumerable: true, get: function () { return exercises_1.mergeExercisesHttp; } });
Object.defineProperty(exports, "searchSimilarExercisesV2", { enumerable: true, get: function () { return exercises_1.searchSimilarExercisesHttp; } });
// API de Evoluções (SOAP) - Redundante, use evolutionService
/*
export {
  listEvolutionsHttp as listEvolutionsV2,
  getEvolutionHttp as getEvolutionV2,
  createEvolutionHttp as createEvolutionV2,
  updateEvolutionHttp as updateEvolutionV2,
  deleteEvolutionHttp as deleteEvolutionV2,
} from './api/evolutions';
*/
// API de Avaliações
var assessments_1 = require("./api/assessments");
Object.defineProperty(exports, "listAssessmentTemplatesV2", { enumerable: true, get: function () { return assessments_1.listAssessmentTemplatesHttp; } });
Object.defineProperty(exports, "getAssessmentTemplateV2", { enumerable: true, get: function () { return assessments_1.getAssessmentTemplateHttp; } });
Object.defineProperty(exports, "listAssessmentsV2", { enumerable: true, get: function () { return assessments_1.listAssessmentsHttp; } });
Object.defineProperty(exports, "getAssessmentV2", { enumerable: true, get: function () { return assessments_1.getAssessmentHttp; } });
Object.defineProperty(exports, "createAssessmentV2", { enumerable: true, get: function () { return assessments_1.createAssessmentHttp; } });
Object.defineProperty(exports, "updateAssessmentV2", { enumerable: true, get: function () { return assessments_1.updateAssessmentHttp; } });
// API do Dashboard
var dashboard_1 = require("./api/dashboard");
Object.defineProperty(exports, "getDashboardStatsV2", { enumerable: true, get: function () { return dashboard_1.getDashboardStatsHttp; } });
// API de Perfis (HTTP onRequest - compatível com callFunctionHttp/fetch)
var profile_1 = require("./api/profile");
Object.defineProperty(exports, "getProfile", { enumerable: true, get: function () { return profile_1.getProfile; } });
Object.defineProperty(exports, "updateProfile", { enumerable: true, get: function () { return profile_1.updateProfile; } });
// API de Pagamentos
exports.listPayments = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var listPaymentsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/payments'); })];
            case 1:
                listPaymentsHandler = (_a.sent()).listPaymentsHandler;
                return [2 /*return*/, listPaymentsHandler(request)];
        }
    });
}); });
exports.getPatientFinancialSummary = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var getPatientFinancialSummaryHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/payments'); })];
            case 1:
                getPatientFinancialSummaryHandler = (_a.sent()).getPatientFinancialSummaryHandler;
                return [2 /*return*/, getPatientFinancialSummaryHandler(request)];
        }
    });
}); });
exports.createPayment = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createPaymentHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/payments'); })];
            case 1:
                createPaymentHandler = (_a.sent()).createPaymentHandler;
                return [2 /*return*/, createPaymentHandler(request)];
        }
    });
}); });
// API Financeira (Transações)
// OTIMIZAÇÃO: Removidas versões Callable duplicadas
// O frontend usa as versões HTTP (V2) com CORS
// HTTP (CORS) - V2 endpoints for frontend
var financial_1 = require("./api/financial");
Object.defineProperty(exports, "listTransactionsV2", { enumerable: true, get: function () { return financial_1.listTransactionsHttp; } });
Object.defineProperty(exports, "createTransactionV2", { enumerable: true, get: function () { return financial_1.createTransactionHttp; } });
Object.defineProperty(exports, "updateTransactionV2", { enumerable: true, get: function () { return financial_1.updateTransactionHttp; } });
Object.defineProperty(exports, "deleteTransactionV2", { enumerable: true, get: function () { return financial_1.deleteTransactionHttp; } });
Object.defineProperty(exports, "findTransactionByAppointmentIdV2", { enumerable: true, get: function () { return financial_1.findTransactionByAppointmentIdHttp; } });
Object.defineProperty(exports, "getEventReportV2", { enumerable: true, get: function () { return financial_1.getEventReportHttp; } });
// API de Parcerias (Partnerships)
var partnerships_1 = require("./api/partnerships");
Object.defineProperty(exports, "listPartnerships", { enumerable: true, get: function () { return partnerships_1.listPartnershipsHttp; } });
Object.defineProperty(exports, "getPartnership", { enumerable: true, get: function () { return partnerships_1.getPartnershipHttp; } });
Object.defineProperty(exports, "createPartnership", { enumerable: true, get: function () { return partnerships_1.createPartnershipHttp; } });
Object.defineProperty(exports, "updatePartnership", { enumerable: true, get: function () { return partnerships_1.updatePartnershipHttp; } });
Object.defineProperty(exports, "deletePartnership", { enumerable: true, get: function () { return partnerships_1.deletePartnershipHttp; } });
// API de Registros Financeiros de Pacientes
var patient_financial_1 = require("./api/patient-financial");
Object.defineProperty(exports, "listAllFinancialRecordsV2", { enumerable: true, get: function () { return patient_financial_1.listAllFinancialRecordsHttp; } });
Object.defineProperty(exports, "listPatientFinancialRecords", { enumerable: true, get: function () { return patient_financial_1.listPatientFinancialRecordsHttp; } });
Object.defineProperty(exports, "getPatientFinancialSummaryV2", { enumerable: true, get: function () { return patient_financial_1.getPatientFinancialSummaryHttp; } });
Object.defineProperty(exports, "createFinancialRecord", { enumerable: true, get: function () { return patient_financial_1.createFinancialRecordHttp; } });
Object.defineProperty(exports, "updateFinancialRecord", { enumerable: true, get: function () { return patient_financial_1.updateFinancialRecordHttp; } });
Object.defineProperty(exports, "deleteFinancialRecord", { enumerable: true, get: function () { return patient_financial_1.deleteFinancialRecordHttp; } });
Object.defineProperty(exports, "markAsPaid", { enumerable: true, get: function () { return patient_financial_1.markAsPaidHttp; } });
// API de Prontuários
exports.getPatientRecords = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var getPatientRecordsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                getPatientRecordsHandler = (_a.sent()).getPatientRecordsHandler;
                return [2 /*return*/, getPatientRecordsHandler(request)];
        }
    });
}); });
exports.getPainRecords = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var getPainRecordsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                getPainRecordsHandler = (_a.sent()).getPainRecordsHandler;
                return [2 /*return*/, getPainRecordsHandler(request)];
        }
    });
}); });
exports.savePainRecord = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var savePainRecordHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                savePainRecordHandler = (_a.sent()).savePainRecordHandler;
                return [2 /*return*/, savePainRecordHandler(request)];
        }
    });
}); });
exports.createMedicalRecord = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createMedicalRecordHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                createMedicalRecordHandler = (_a.sent()).createMedicalRecordHandler;
                return [2 /*return*/, createMedicalRecordHandler(request)];
        }
    });
}); });
exports.updateMedicalRecord = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var updateMedicalRecordHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                updateMedicalRecordHandler = (_a.sent()).updateMedicalRecordHandler;
                return [2 /*return*/, updateMedicalRecordHandler(request)];
        }
    });
}); });
exports.listTreatmentSessions = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var listTreatmentSessionsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                listTreatmentSessionsHandler = (_a.sent()).listTreatmentSessionsHandler;
                return [2 /*return*/, listTreatmentSessionsHandler(request)];
        }
    });
}); });
exports.createTreatmentSession = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createTreatmentSessionHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                createTreatmentSessionHandler = (_a.sent()).createTreatmentSessionHandler;
                return [2 /*return*/, createTreatmentSessionHandler(request)];
        }
    });
}); });
exports.updateTreatmentSession = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var updateTreatmentSessionHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/medical-records'); })];
            case 1:
                updateTreatmentSessionHandler = (_a.sent()).updateTreatmentSessionHandler;
                return [2 /*return*/, updateTreatmentSessionHandler(request)];
        }
    });
}); });
// API HTTP para avaliações
exports.apiEvaluate = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var apiEvaluateHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/evaluate'); })];
            case 1:
                apiEvaluateHandler = (_a.sent()).apiEvaluateHandler;
                return [2 /*return*/, apiEvaluateHandler(req, res)];
        }
    });
}); });
// Health Check
exports.healthCheck = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var healthCheckHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/health'); })];
            case 1:
                healthCheckHandler = (_a.sent()).healthCheckHandler;
                return [2 /*return*/, healthCheckHandler(req, res)];
        }
    });
}); });
// Upload API (replaces Vercel Blob /api/upload)
exports.generateUploadToken = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var generateUploadTokenHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/upload'); })];
            case 1:
                generateUploadTokenHandler = (_a.sent()).generateUploadTokenHandler;
                return [2 /*return*/, generateUploadTokenHandler(request)];
        }
    });
}); });
exports.confirmUpload = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var confirmUploadHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/upload'); })];
            case 1:
                confirmUploadHandler = (_a.sent()).confirmUploadHandler;
                return [2 /*return*/, confirmUploadHandler(request)];
        }
    });
}); });
exports.deleteStorageFile = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var deleteFileHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/upload'); })];
            case 1:
                deleteFileHandler = (_a.sent()).deleteFileHandler;
                return [2 /*return*/, deleteFileHandler(request)];
        }
    });
}); });
exports.listUserFiles = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var listUserFilesHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/upload'); })];
            case 1:
                listUserFilesHandler = (_a.sent()).listUserFilesHandler;
                return [2 /*return*/, listUserFilesHandler(request)];
        }
    });
}); });
// Cloud API Endpoints
exports.synthesizeTTS = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var synthesizeTTSHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/tts'); })];
            case 1:
                synthesizeTTSHandler = (_a.sent()).synthesizeTTSHandler;
                return [2 /*return*/, synthesizeTTSHandler(req, res)];
        }
    });
}); });
exports.transcribeAudio = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var transcribeAudioHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/speech'); })];
            case 1:
                transcribeAudioHandler = (_a.sent()).transcribeAudioHandler;
                return [2 /*return*/, transcribeAudioHandler(req, res)];
        }
    });
}); });
exports.transcribeLongAudio = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var transcribeLongAudioHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/speech'); })];
            case 1:
                transcribeLongAudioHandler = (_a.sent()).transcribeLongAudioHandler;
                return [2 /*return*/, transcribeLongAudioHandler(req, res)];
        }
    });
}); });
exports.translate = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var translateHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/translation'); })];
            case 1:
                translateHandler = (_a.sent()).translateHandler;
                return [2 /*return*/, translateHandler(req, res)];
        }
    });
}); });
exports.detectLanguage = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var detectLanguageHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/translation'); })];
            case 1:
                detectLanguageHandler = (_a.sent()).detectLanguageHandler;
                return [2 /*return*/, detectLanguageHandler(req, res)];
        }
    });
}); });
exports.getSupportedLanguages = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var getSupportedLanguagesHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/translation'); })];
            case 1:
                getSupportedLanguagesHandler = (_a.sent()).getSupportedLanguagesHandler;
                return [2 /*return*/, getSupportedLanguagesHandler(req, res)];
        }
    });
}); });
exports.translateExercise = (0, https_1.onRequest)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var translateExerciseHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/translation'); })];
            case 1:
                translateExerciseHandler = (_a.sent()).translateExerciseHandler;
                return [2 /*return*/, translateExerciseHandler(req, res)];
        }
    });
}); });
// Exercise Image Proxy - bypasses CORS issues for Firebase Storage images
// OTIMIZAÇÃO: Aumentado maxInstances para evitar erros 429 em carregamento de listas
exports.exerciseImageProxy = (0, https_1.onRequest)({
    maxInstances: 10,
    cpu: 1, // Required when concurrency > 1
    concurrency: 10,
    memory: '512MiB', // Aumentado memória para processamento de imagem
    timeoutSeconds: 60,
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var exerciseImageProxy;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/exerciseImage'); })];
            case 1:
                exerciseImageProxy = (_a.sent()).exerciseImageProxy;
                return [2 /*return*/, exerciseImageProxy(req, res)];
        }
    });
}); });
// Admin Functions
exports.createAdminUser = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createAdminUserHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./admin/create-user'); })];
            case 1:
                createAdminUserHandler = (_a.sent()).createAdminUserHandler;
                return [2 /*return*/, createAdminUserHandler()];
        }
    });
}); });
// Migration Functions
exports.migrateRolesToClaims = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var migrateRolesToClaimsHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/migrate-roles-to-claims'); })];
            case 1:
                migrateRolesToClaimsHandler = (_a.sent()).migrateRolesToClaimsHandler;
                return [2 /*return*/, migrateRolesToClaimsHandler(request)];
        }
    });
}); });
exports.createPerformanceIndexes = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createPerformanceIndexesHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/create-performance-indexes'); })];
            case 1:
                createPerformanceIndexesHandler = (_a.sent()).createPerformanceIndexesHandler;
                return [2 /*return*/, createPerformanceIndexesHandler(request)];
        }
    });
}); });
// OTIMIZAÇÃO: Função para corrigir índice de agendamentos (500 Error Fix)
exports.fixAppointmentIndex = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fixAppointmentIndexHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/fix-appointment-index'); })];
            case 1:
                fixAppointmentIndexHandler = (_a.sent()).fixAppointmentIndexHandler;
                return [2 /*return*/, fixAppointmentIndexHandler(req, res)];
        }
    });
}); });
// OTIMIZAÇÃO: Nova função HTTP para criar índices otimizados
exports.createOptimizedIndexes = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var createOptimizedIndexesHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/create-indexes-optimized'); })];
            case 1:
                createOptimizedIndexesHandler = (_a.sent()).createOptimizedIndexesHandler;
                return [2 /*return*/, createOptimizedIndexesHandler(req, res)];
        }
    });
}); });
exports.runPatientMedicalReturnCols = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var runPatientMedicalReturnCols;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/run-patient-medical-return-cols'); })];
            case 1:
                runPatientMedicalReturnCols = (_a.sent()).runPatientMedicalReturnCols;
                return [2 /*return*/, runPatientMedicalReturnCols(req, res)];
        }
    });
}); });
exports.runPerformanceIndexes = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '512MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var runPerformanceIndexes;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/run-performance-indexes'); })];
            case 1:
                runPerformanceIndexes = (_a.sent()).runPerformanceIndexes;
                return [2 /*return*/, runPerformanceIndexes(req, res)];
        }
    });
}); });
exports.runPatientRagSchema = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '512MiB',
    timeoutSeconds: 300,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var runPatientRagSchemaHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/run-patient-rag-schema'); })];
            case 1:
                runPatientRagSchemaHandler = (_a.sent()).runPatientRagSchemaHandler;
                return [2 /*return*/, runPatientRagSchemaHandler(req, res)];
        }
    });
}); });
exports.runDoctorsTable = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var runDoctorsTable;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/run-doctors-table'); })];
            case 1:
                runDoctorsTable = (_a.sent()).runDoctorsTable;
                return [2 /*return*/, runDoctorsTable(req, res)];
        }
    });
}); });
exports.fixUserOrganization = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fixUserOrganization;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./migrations/fix-user-organization'); })];
            case 1:
                fixUserOrganization = (_a.sent()).fixUserOrganization;
                return [2 /*return*/, fixUserOrganization(req, res)];
        }
    });
}); });
// OTIMIZAÇÃO: Removida versão Callable duplicada de rebuildPatientRagIndex
// Mantida apenas versão HTTP abaixo
exports.rebuildPatientRagIndexHttp = (0, https_1.onRequest)({
    secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
    cpu: 1,
    memory: '1GiB',
    timeoutSeconds: 540,
    region: 'southamerica-east1',
    cors: cors_1.CORS_ORIGINS,
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var rebuildPatientRagIndexHttpHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai/rag/rag-index-maintenance'); })];
            case 1:
                rebuildPatientRagIndexHttpHandler = (_a.sent()).rebuildPatientRagIndexHttpHandler;
                return [2 /*return*/, rebuildPatientRagIndexHttpHandler(req, res)];
        }
    });
}); });
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
// HTTP AI endpoints (Temporarily disabled - files moved to .bak)
/*
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
*/
exports.scanMedicalReportHttp = (0, https_1.onRequest)(__assign(__assign({}, function_config_1.AI_FUNCTION), (0, function_config_1.withCors)(function_config_1.AI_FUNCTION, cors_1.CORS_ORIGINS)), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var scanMedicalReportHttpHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./api/ocr-scanner'); })];
            case 1:
                scanMedicalReportHttpHandler = (_a.sent()).scanMedicalReportHttpHandler;
                return [2 /*return*/, scanMedicalReportHttpHandler(req, res)];
        }
    });
}); });
// Marketing AI Templates
exports.generateMarketingTemplate = (0, https_1.onCall)(function_config_1.AI_FUNCTION, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var marketingTemplateHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai/marketing-ai'); })];
            case 1:
                marketingTemplateHandler = (_a.sent()).marketingTemplateHandler;
                return [2 /*return*/, marketingTemplateHandler(request)];
        }
    });
}); });
exports.generateMarketingTemplateHttp = (0, https_1.onRequest)(__assign(__assign({}, function_config_1.AI_FUNCTION), (0, function_config_1.withCors)(function_config_1.AI_FUNCTION, cors_1.CORS_ORIGINS)), function (req) { return __awaiter(void 0, void 0, void 0, function () {
    var marketingTemplateHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai/marketing-ai'); })];
            case 1:
                marketingTemplateHandler = (_a.sent()).marketingTemplateHandler;
                return [2 /*return*/, marketingTemplateHandler(req)];
        }
    });
}); });
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
exports.aiService = (0, https_1.onCall)(function_config_1.AI_FUNCTION, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var aiServiceHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai/unified-ai-service'); })];
            case 1:
                aiServiceHandler = (_a.sent()).aiServiceHandler;
                return [2 /*return*/, aiServiceHandler(request)];
        }
    });
}); });
exports.aiServiceHttp = (0, https_1.onRequest)(__assign(__assign({}, function_config_1.AI_FUNCTION), (0, function_config_1.withCors)(function_config_1.AI_FUNCTION, cors_1.CORS_ORIGINS)), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var aiServiceHttpHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./ai/unified-ai-service'); })];
            case 1:
                aiServiceHttpHandler = (_a.sent()).aiServiceHttpHandler;
                return [2 /*return*/, aiServiceHttpHandler(req, res)];
        }
    });
}); });
var video_analysis_1 = require("./api/video-analysis");
Object.defineProperty(exports, "analyzeMovementVideo", { enumerable: true, get: function () { return video_analysis_1.analyzeMovementVideo; } });
// Cron Jobs
var patient_reminders_1 = require("./crons/patient-reminders");
Object.defineProperty(exports, "dailyExerciseReminder", { enumerable: true, get: function () { return patient_reminders_1.dailyExerciseReminder; } });
var scheduled_tasks_1 = require("./crons/scheduled-tasks");
Object.defineProperty(exports, "dailyPatientDigest", { enumerable: true, get: function () { return scheduled_tasks_1.dailyPatientDigest; } });
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
var exercises_unified_1 = require("./api/exercises-unified");
var assessments_unified_1 = require("./api/assessments-unified");
var function_config_2 = require("./lib/function-config");
exports.exerciseService = (0, https_1.onCall)(function_config_2.STANDARD_FUNCTION, exercises_unified_1.exerciseServiceHandler);
exports.assessmentService = (0, https_1.onCall)(function_config_2.STANDARD_FUNCTION, assessments_unified_1.assessmentServiceHandler);
// ============================================================================
// GAMIFICATION TRIGGERS & API
// ============================================================================
var triggers_1 = require("./gamification/triggers");
Object.defineProperty(exports, "onExerciseCompleted", { enumerable: true, get: function () { return triggers_1.onExerciseCompleted; } });
Object.defineProperty(exports, "onAppointmentCompleted", { enumerable: true, get: function () { return triggers_1.onAppointmentCompleted; } });
var api_1 = require("./gamification/api");
Object.defineProperty(exports, "getLeaderboard", { enumerable: true, get: function () { return api_1.getLeaderboard; } });
Object.defineProperty(exports, "processPurchase", { enumerable: true, get: function () { return api_1.processPurchase; } });
// ============================================================================
// BACKGROUND TRIGGERS
// ============================================================================
// Firestore triggers with proper error handling
exports.onPatientCreated = functions.firestore.onDocumentCreated('patients/{patientId}', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var snapshot, patient, db, error_1, errorCode;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                snapshot = event.data;
                if (!snapshot)
                    return [2 /*return*/];
                patient = snapshot.data();
                db = init_2.adminDb;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                // Criar registro financeiro inicial
                return [4 /*yield*/, db.collection('patient_financial_summaries').doc(snapshot.id).set({
                        patient_id: snapshot.id,
                        organization_id: patient.organization_id,
                        total_paid_cents: 0,
                        individual_sessions_paid: 0,
                        package_sessions_total: 0,
                        package_sessions_used: 0,
                        package_sessions_available: 0,
                        updated_at: new Date().toISOString(),
                    })];
            case 2:
                // Criar registro financeiro inicial
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                errorCode = error_1.code;
                if (errorCode === 'already-exists' || errorCode === 'permission-denied') {
                    // Non-retryable error - log and continue
                    console.error('[onPatientCreated] Non-retryable error:', error_1.message);
                    return [2 /*return*/]; // Don't throw - allows trigger to complete
                }
                // Retryable error - rethrow for Cloud Functions to retry
                throw error_1;
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Firestore trigger unificado: publica eventos de agendamento no RTDB
 */
exports.onAppointmentRtdbSyncTrigger = functions.firestore.onDocumentWritten('appointments/{appointmentId}', function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var after, rtdb, err_1;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                after = (_b = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after) === null || _b === void 0 ? void 0 : _b.data();
                if (!after)
                    return [2 /*return*/];
                _c.label = 1;
            case 1:
                _c.trys.push([1, 4, , 5]);
                return [4 /*yield*/, Promise.resolve().then(function () { return require('./lib/rtdb'); })];
            case 2:
                rtdb = (_c.sent()).rtdb;
                return [4 /*yield*/, rtdb.refreshAppointments(after.organization_id)];
            case 3:
                _c.sent();
                return [3 /*break*/, 5];
            case 4:
                err_1 = _c.sent();
                console.error('[onAppointmentRtdbSync] RTDB publish failed (non-critical):', err_1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
/**
 * Legacy HTTPS function mantida para evitar erro de migração de tipo em produção.
 * A sincronização real está em `onAppointmentRtdbSyncTrigger`.
 */
exports.onAppointmentRtdbSync = (0, https_1.onRequest)({ region: 'southamerica-east1', invoker: 'public' }, function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(204).send('onAppointmentRtdbSync legacy endpoint');
        return [2 /*return*/];
    });
}); });
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
var notifications_1 = require("./workflows/notifications");
Object.defineProperty(exports, "sendNotification", { enumerable: true, get: function () { return notifications_1.sendNotification; } });
Object.defineProperty(exports, "sendNotificationBatch", { enumerable: true, get: function () { return notifications_1.sendNotificationBatch; } });
Object.defineProperty(exports, "notifyAppointmentScheduled", { enumerable: true, get: function () { return notifications_1.notifyAppointmentScheduled; } });
Object.defineProperty(exports, "notifyAppointmentReschedule", { enumerable: true, get: function () { return notifications_1.notifyAppointmentReschedule; } });
Object.defineProperty(exports, "notifyAppointmentCancellation", { enumerable: true, get: function () { return notifications_1.notifyAppointmentCancellation; } });
Object.defineProperty(exports, "processNotificationQueue", { enumerable: true, get: function () { return notifications_1.processNotificationQueue; } });
Object.defineProperty(exports, "emailWebhook", { enumerable: true, get: function () { return notifications_1.emailWebhook; } });
// Appointment Workflows
var appointments_7 = require("./workflows/appointments");
Object.defineProperty(exports, "appointmentReminders", { enumerable: true, get: function () { return appointments_7.appointmentReminders; } });
Object.defineProperty(exports, "appointmentReminders2h", { enumerable: true, get: function () { return appointments_7.appointmentReminders2h; } });
Object.defineProperty(exports, "onAppointmentCreatedWorkflow", { enumerable: true, get: function () { return appointments_7.onAppointmentCreatedWorkflow; } });
Object.defineProperty(exports, "onAppointmentUpdatedWorkflow", { enumerable: true, get: function () { return appointments_7.onAppointmentUpdatedWorkflow; } });
// Patient Reactivation Workflow
var reactivation_1 = require("./workflows/reactivation");
Object.defineProperty(exports, "patientReactivation", { enumerable: true, get: function () { return reactivation_1.patientReactivation; } });
// ============================================================================
// COMMUNICATIONS (Email, WhatsApp)
// ============================================================================
exports.sendEmail = (0, https_1.onCall)(function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var sendEmailHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./communications/email-service'); })];
            case 1:
                sendEmailHandler = (_a.sent()).sendEmailHandler;
                return [2 /*return*/, sendEmailHandler(request)];
        }
    });
}); });
// WhatsApp Test Functions
// REMOVIDO: testWhatsAppMessage, testWhatsAppTemplate - funções de teste não usadas em produção
// ============================================================================
// Auth Triggers
// ============================================================================
var user_created_1 = require("./auth/user-created");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return user_created_1.onUserCreated; } });
exports.createUserInvitation = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var createUserInvitationHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./auth/invitations'); })];
            case 1:
                createUserInvitationHandler = (_a.sent()).createUserInvitationHandler;
                return [2 /*return*/, createUserInvitationHandler(request)];
        }
    });
}); });
exports.getInvitationByToken = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var getInvitationByTokenHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./auth/invitations'); })];
            case 1:
                getInvitationByTokenHandler = (_a.sent()).getInvitationByTokenHandler;
                return [2 /*return*/, getInvitationByTokenHandler(request)];
        }
    });
}); });
exports.consumeInvitation = (0, https_1.onCall)({ cors: true, memory: '512MiB', maxInstances: 1 }, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var consumeInvitationHandler;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.resolve().then(function () { return require('./auth/invitations'); })];
            case 1:
                consumeInvitationHandler = (_a.sent()).consumeInvitationHandler;
                return [2 /*return*/, consumeInvitationHandler(request)];
        }
    });
}); });
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
var googleIntegrations = require("./integrations/google");
exports.searchPlaces = googleIntegrations.searchPlaces;
exports.getGoogleAuthUrlIntegration = googleIntegrations.getGoogleAuthUrl;
exports.googleAuthCallback = googleIntegrations.googleAuthCallback;
exports.createMeetLink = googleIntegrations.createMeetLink;
exports.syncPatientCalendar = googleIntegrations.syncPatientCalendar;
exports.getBusinessReviews = googleIntegrations.getBusinessReviews;
exports.generateGoogleReport = googleIntegrations.generateGoogleReport;
exports.listGoogleTemplates = googleIntegrations.listGoogleTemplates;
exports.createPatientDriveFolder = googleIntegrations.createPatientDriveFolder;
// Export helper functions (lib) - avoid re-exporting names already exported from api/
var crashlytics_1 = require("./lib/crashlytics");
Object.defineProperty(exports, "initCrashlytics", { enumerable: true, get: function () { return crashlytics_1.initCrashlytics; } });
Object.defineProperty(exports, "recordError", { enumerable: true, get: function () { return crashlytics_1.recordError; } });
Object.defineProperty(exports, "setUserId", { enumerable: true, get: function () { return crashlytics_1.setUserId; } });
Object.defineProperty(exports, "clearUserId", { enumerable: true, get: function () { return crashlytics_1.clearUserId; } });
Object.defineProperty(exports, "setCustomKey", { enumerable: true, get: function () { return crashlytics_1.setCustomKey; } });
Object.defineProperty(exports, "setCustomKeys", { enumerable: true, get: function () { return crashlytics_1.setCustomKeys; } });
Object.defineProperty(exports, "createCrashlyticsLogger", { enumerable: true, get: function () { return crashlytics_1.createCrashlyticsLogger; } });
var performance_1 = require("./lib/performance");
Object.defineProperty(exports, "startTrace", { enumerable: true, get: function () { return performance_1.startTrace; } });
Object.defineProperty(exports, "measure", { enumerable: true, get: function () { return performance_1.measure; } });
Object.defineProperty(exports, "measureHttpCall", { enumerable: true, get: function () { return performance_1.measureHttpCall; } });
Object.defineProperty(exports, "measureDatabase", { enumerable: true, get: function () { return performance_1.measureDatabase; } });
Object.defineProperty(exports, "measureFirestore", { enumerable: true, get: function () { return performance_1.measureFirestore; } });
Object.defineProperty(exports, "startHttpTrace", { enumerable: true, get: function () { return performance_1.startHttpTrace; } });
Object.defineProperty(exports, "withPerformanceTracing", { enumerable: true, get: function () { return performance_1.withPerformanceTracing; } });
// Storage Triggers
var dicomTriggers_1 = require("./storage/dicomTriggers");
Object.defineProperty(exports, "onDicomUpload", { enumerable: true, get: function () { return dicomTriggers_1.onDicomUpload; } });
// Report Triggers
var reports_1 = require("./triggers/reports");
Object.defineProperty(exports, "onReportCreated", { enumerable: true, get: function () { return reports_1.onReportCreated; } });
// ============================================================================
// AI INDEXING (Vector Search)
// ============================================================================
var indexing_1 = require("./ai/indexing");
Object.defineProperty(exports, "indexExistingEvolutions", { enumerable: true, get: function () { return indexing_1.indexExistingEvolutions; } });
Object.defineProperty(exports, "indexEvolution", { enumerable: true, get: function () { return indexing_1.indexEvolution; } });
Object.defineProperty(exports, "reindexPatientEvolutions", { enumerable: true, get: function () { return indexing_1.reindexPatientEvolutions; } });
Object.defineProperty(exports, "removeEvolutionEmbedding", { enumerable: true, get: function () { return indexing_1.removeEvolutionEmbedding; } });
Object.defineProperty(exports, "onEvolutionCreated", { enumerable: true, get: function () { return indexing_1.onEvolutionCreated; } });
Object.defineProperty(exports, "getIndexingStats", { enumerable: true, get: function () { return indexing_1.getIndexingStats; } });
// ============================================================================
// STORAGE OPTIMIZATION (Cloud Functions Free Tier Otimizations)
// ============================================================================
var image_optimization_1 = require("./storage/image-optimization");
Object.defineProperty(exports, "optimizeImageOnUpload", { enumerable: true, get: function () { return image_optimization_1.optimizeImageOnUpload; } });
Object.defineProperty(exports, "cleanupOldImages", { enumerable: true, get: function () { return image_optimization_1.cleanupOldImages; } });
Object.defineProperty(exports, "cleanupOrphanThumbnails", { enumerable: true, get: function () { return image_optimization_1.cleanupOrphanThumbnails; } });
Object.defineProperty(exports, "getOptimizationStats", { enumerable: true, get: function () { return image_optimization_1.getOptimizationStats; } });
// ============================================================================
// DATA RETENTION & TTL MANAGEMENT
// ============================================================================
var data_retention_1 = require("./crons/data-retention");
Object.defineProperty(exports, "enforceDataRetention", { enumerable: true, get: function () { return data_retention_1.enforceDataRetention; } });
Object.defineProperty(exports, "scheduledDataRetention", { enumerable: true, get: function () { return data_retention_1.scheduledDataRetention; } });
Object.defineProperty(exports, "setDocumentTTL", { enumerable: true, get: function () { return data_retention_1.setDocumentTTL; } });
Object.defineProperty(exports, "deleteExpiredDocuments", { enumerable: true, get: function () { return data_retention_1.deleteExpiredDocuments; } });
Object.defineProperty(exports, "compactLogs", { enumerable: true, get: function () { return data_retention_1.compactLogs; } });
Object.defineProperty(exports, "getDataRetentionStats", { enumerable: true, get: function () { return data_retention_1.getDataRetentionStats; } });
// ============================================================================
// BIGQUERY ANALYTICS
// ============================================================================
var analytics_http_1 = require("./api/analytics-http");
Object.defineProperty(exports, "setupAnalytics", { enumerable: true, get: function () { return analytics_http_1.setupAnalytics; } });
Object.defineProperty(exports, "dashboardMetrics", { enumerable: true, get: function () { return analytics_http_1.dashboardMetrics; } });
Object.defineProperty(exports, "patientEvolution", { enumerable: true, get: function () { return analytics_http_1.patientEvolution; } });
Object.defineProperty(exports, "organizationStats", { enumerable: true, get: function () { return analytics_http_1.organizationStats; } });
Object.defineProperty(exports, "topExercises", { enumerable: true, get: function () { return analytics_http_1.topExercises; } });
Object.defineProperty(exports, "painMapAnalysis", { enumerable: true, get: function () { return analytics_http_1.painMapAnalysis; } });
Object.defineProperty(exports, "gamificationStats", { enumerable: true, get: function () { return analytics_http_1.gamificationStats; } });
Object.defineProperty(exports, "churnPrediction", { enumerable: true, get: function () { return analytics_http_1.churnPrediction; } });
Object.defineProperty(exports, "usageStats", { enumerable: true, get: function () { return analytics_http_1.usageStats; } });
Object.defineProperty(exports, "customQuery", { enumerable: true, get: function () { return analytics_http_1.customQuery; } });
