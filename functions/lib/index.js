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
exports.onAppointmentUpdated = exports.onAppointmentCreated = exports.onPatientCreated = exports.apiRouter = exports.realtimePublish = exports.createAdminUser = exports.healthCheck = exports.apiEvaluate = exports.updateTreatmentSession = exports.createTreatmentSession = exports.listTreatmentSessions = exports.updateMedicalRecord = exports.createMedicalRecord = exports.getPatientRecords = exports.getPatientFinancialSummary = exports.createPayment = exports.listPayments = exports.getAssessmentTemplate = exports.listAssessmentTemplates = exports.updateAssessment = exports.createAssessment = exports.getAssessment = exports.listAssessments = exports.getExerciseCategories = exports.searchSimilarExercises = exports.getExercise = exports.listExercises = exports.checkTimeConflict = exports.cancelAppointment = exports.getAppointment = exports.updateAppointment = exports.createAppointment = exports.listAppointments = exports.deletePatient = exports.getPatient = exports.updatePatient = exports.createPatient = exports.listPatients = void 0;
const functions = __importStar(require("firebase-functions/v2"));
// import { onRequest } from 'firebase-functions/v2/https';
// ============================================================================
// INICIALIZAÇÃO IMPORTS
// ============================================================================
// Import init for local usage in Triggers, but DO NOT EXPORT complex objects
// which confuse the firebase-functions loader.
const init_1 = require("./init");
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
// API de Avaliações
const apiAssessments = __importStar(require("./api/assessments"));
exports.listAssessments = apiAssessments.listAssessments;
exports.getAssessment = apiAssessments.getAssessment;
exports.createAssessment = apiAssessments.createAssessment;
exports.updateAssessment = apiAssessments.updateAssessment;
exports.listAssessmentTemplates = apiAssessments.listAssessmentTemplates;
exports.getAssessmentTemplate = apiAssessments.getAssessmentTemplate;
// API de Pagamentos
const apiPayments = __importStar(require("./api/payments"));
exports.listPayments = apiPayments.listPayments;
exports.createPayment = apiPayments.createPayment;
exports.getPatientFinancialSummary = apiPayments.getPatientFinancialSummary;
// API de Prontuários
const apiMedicalRecords = __importStar(require("./api/medical-records"));
exports.getPatientRecords = apiMedicalRecords.getPatientRecords;
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
// Admin Functions
const create_user_1 = require("./admin/create-user");
Object.defineProperty(exports, "createAdminUser", { enumerable: true, get: function () { return create_user_1.createAdminUser; } });
// ============================================================================
// REALTIME FUNCTIONS
// ============================================================================
const realtimePublisher = __importStar(require("./realtime/publisher"));
exports.realtimePublish = realtimePublisher.realtimePublish;
// ============================================================================
// HTTP FUNCTIONS
// ============================================================================
exports.apiRouter = functions.https.onRequest(async (req, res) => {
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
// Firestore triggers
exports.onPatientCreated = functions.firestore.onDocumentCreated('patients/{patientId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const patient = snapshot.data();
    const db = init_1.adminDb;
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
});
exports.onAppointmentCreated = functions.firestore.onDocumentCreated('appointments/{appointmentId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const appointment = snapshot.data();
    // Publicar no Ably para atualização em tempo real
    const realtime = await Promise.resolve().then(() => __importStar(require('./realtime/publisher')));
    await realtime.publishAppointmentEvent(appointment.organization_id, {
        event: 'INSERT',
        new: appointment,
        old: null,
    });
});
exports.onAppointmentUpdated = functions.firestore.onDocumentWritten('appointments/{appointmentId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (before && after) {
        const realtime = await Promise.resolve().then(() => __importStar(require('./realtime/publisher')));
        await realtime.publishAppointmentEvent(after.organization_id, {
            event: 'UPDATE',
            new: after,
            old: before,
        });
    }
});
//# sourceMappingURL=index.js.map