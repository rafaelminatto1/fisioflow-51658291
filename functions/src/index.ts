/**
 * FisioFlow Cloud Functions Entry Point
 * Exporta todas as Cloud Functions do projeto
 */

import * as functions from 'firebase-functions/v2';

// ============================================================================
// INICIALIZAÇÃO IMPORTS
// ============================================================================

// Import init for local usage in Triggers, but DO NOT EXPORT complex objects
// which confuse the firebase-functions loader.
import { adminDb } from './init';

// ============================================================================
// API FUNCTIONS (Callable)
// ============================================================================

// API de Pacientes
import * as apiPatients from './api/patients';
export const listPatients = apiPatients.listPatients;
export const createPatient = apiPatients.createPatient;
export const updatePatient = apiPatients.updatePatient;
export const getPatient = apiPatients.getPatient;
export const deletePatient = apiPatients.deletePatient;

// API de Agendamentos
import * as apiAppointments from './api/appointments';
export const listAppointments = apiAppointments.listAppointments;
export const createAppointment = apiAppointments.createAppointment;
export const updateAppointment = apiAppointments.updateAppointment;
export const getAppointment = apiAppointments.getAppointment;
export const cancelAppointment = apiAppointments.cancelAppointment;
export const checkTimeConflict = apiAppointments.checkTimeConflict;

// API de Exercícios
import * as apiExercises from './api/exercises';
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

// API de Pagamentos
import * as apiPayments from './api/payments';
export const listPayments = apiPayments.listPayments;
export const createPayment = apiPayments.createPayment;
// API Financeira (Transações)
import * as apiFinancial from './api/financial';
export const listTransactions = apiFinancial.listTransactions;
export const createTransaction = apiFinancial.createTransaction;
export const updateTransaction = apiFinancial.updateTransaction;
export const deleteTransaction = apiFinancial.deleteTransaction;
export const findTransactionByAppointmentId = apiFinancial.findTransactionByAppointmentId;
export const getEventReport = apiFinancial.getEventReport;

// API de Prontuários
import * as apiMedicalRecords from './api/medical-records';
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

// Admin Functions
import { createAdminUser } from './admin/create-user';
export { createAdminUser };

// ============================================================================
// AI FUNCTIONS
// ============================================================================

export { exerciseSuggestion as aiExerciseSuggestion } from './ai/exercise-suggestion';
export { soapGeneration as aiSoapGeneration } from './ai/soap-generation';
export { clinicalAnalysis as aiClinicalAnalysis } from './ai/clinical-analysis';
export { movementAnalysis as aiMovementAnalysis } from './ai/movement-analysis';

// ============================================================================
// REALTIME FUNCTIONS
// ============================================================================

import * as realtimePublisher from './realtime/publisher';
export const realtimePublish = realtimePublisher.realtimePublish;

// ============================================================================
// HTTP FUNCTIONS
// ============================================================================

export const apiRouter = functions.https.onRequest(async (req, res) => {
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

// Firestore triggers
export const onPatientCreated = functions.firestore.onDocumentCreated('patients/{patientId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const patient = snapshot.data();
    const db = adminDb;

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

export const onAppointmentCreated = functions.firestore.onDocumentCreated('appointments/{appointmentId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const appointment = snapshot.data();

    // Publicar no Ably para atualização em tempo real

    const realtime = await import('./realtime/publisher');
    await realtime.publishAppointmentEvent(appointment.organization_id, {
        event: 'INSERT',
        new: appointment,
        old: null,
    });
});

export const onAppointmentUpdated = functions.firestore.onDocumentWritten('appointments/{appointmentId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (before && after) {
         
        const realtime = await import('./realtime/publisher');
        await realtime.publishAppointmentEvent(after.organization_id, {
            event: 'UPDATE',
            new: after,
            old: before,
        });
    }
});

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

// ============================================================================
// AUTH TRIGGERS
// ============================================================================

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
//         console.log(`[onUserCreated] Criando perfil para usuário: ${user.uid} (${user.email})`);
//
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
//
//         console.log(`[onUserCreated] Perfil criado com sucesso para ${user.uid}`);
//     } catch (error) {
//         console.error(`[onUserCreated] Erro ao criar perfil para ${user.uid}:`, error);
//     }
// });
