/**
 * FisioFlow Cloud Functions - Versão Otimizada
 * 
 * Limpeza realizada em 23/02/2026:
 * - Removidas APIs individuais em favor dos Unified Services
 * - Removidos scripts de migração concluídos
 * - Mantidas otimizações de custo e analytics
 */

import * as functions from 'firebase-functions/v2';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, onRequest } from 'firebase-functions/v2/https';

import {
    DB_PASS_SECRET,
    DB_USER_SECRET,
    DB_NAME_SECRET,
    DB_HOST_IP_SECRET,
    DB_HOST_IP_PUBLIC_SECRET,
    CLOUD_SQL_CONNECTION_NAME_SECRET,
    RESEND_API_KEY_SECRET
} from './init';
import { CORS_ORIGINS } from './lib/cors';
import {
    WHATSAPP_PHONE_NUMBER_ID_SECRET,
    WHATSAPP_ACCESS_TOKEN_SECRET
} from './communications/whatsapp';

// Import optimization presets
import {
    AI_FUNCTION,
    withCors,
} from './lib/function-config';

// CONFIGURAÇÃO GLOBAL OTIMIZADA
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
    maxInstances: 3,
    memory: '512MiB',
    timeoutSeconds: 60,
    concurrency: 80,
    minInstances: 0,
});

// ============================================================================
// SERVIÇOS UNIFICADOS (CORE API)
// ============================================================================
export { patientService, patientServiceHttp } from './api/patients-unified';
export { appointmentService, appointmentServiceHttp } from './api/appointments-unified';
export { evolutionService, evolutionServiceHttp } from './api/evolutions-unified';
export { exerciseService } from './api/exercises-unified';
export { assessmentService } from './api/assessments-unified';

// ============================================================================
// PERFIS E GESTÃO
// ============================================================================
export { getProfile, updateProfile } from './api/profile';
export { checkPatientAppointments, getLastPainMapDate } from './api/patient-quests';
export {
    listTransactionsHttp as listTransactionsV2,
    createTransactionHttp as createTransactionV2,
    updateTransactionHttp as updateTransactionV2,
    deleteTransactionHttp as deleteTransactionV2,
    findTransactionByAppointmentIdHttp as findTransactionByAppointmentIdV2,
    getEventReportHttp as getEventReportV2,
    getFinancialSummaryHttp as getFinancialSummaryV2
} from './api/financial';

// ============================================================================
// INTELIGÊNCIA ARTIFICIAL (UNIFICADA)
// ============================================================================
export const aiService = onCall(AI_FUNCTION, async (request) => {
    const { aiServiceHandler } = await import('./ai/unified-ai-service');
    return aiServiceHandler(request);
});

export const aiServiceHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { aiServiceHttpHandler } = await import('./ai/unified-ai-service');
        return aiServiceHttpHandler(req, res);
    }
);

export { analyzeMovementVideo } from './api/video-analysis';
export { scanMedicalReportHttp } from './api/ocr-scanner';

// ============================================================================
// COMUNICAÇÕES E NOTIFICAÇÕES
// ============================================================================
export const sendEmail = onCall(async (request) => {
    const { sendEmailHandler } = await import('./communications/email-service');
    return sendEmailHandler(request);
});

export {
    sendNotification,
    sendNotificationBatch,
    notifyAppointmentScheduled,
    notifyAppointmentReschedule,
    notifyAppointmentCancellation,
    processNotificationQueue,
    emailWebhook
} from './workflows/notifications';

// ============================================================================
// GATILHOS DE FUNDO (BACKGROUND TRIGGERS)
// ============================================================================
import { adminDb } from './init';

export const onPatientCreated = functions.firestore.onDocumentCreated(
    'patients/{patientId}',
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;
        const patient = snapshot.data();
        await adminDb.collection('patient_financial_summaries').doc(snapshot.id).set({
            patient_id: snapshot.id,
            organization_id: patient.organization_id,
            total_paid_cents: 0,
            updated_at: new Date().toISOString(),
        });
    }
);

export { onUserCreated } from './auth/user-created';
export { onDicomUpload } from './storage/dicomTriggers';
export { onReportCreated } from './triggers/reports';
export { onExerciseCompleted, onAppointmentCompleted } from './gamification/triggers';

// ============================================================================
// WORKFLOWS E AGENDAMENTOS (CRONS)
// ============================================================================
export { 
    appointmentReminders, 
    appointmentReminders2h, 
    onAppointmentCreatedWorkflow, 
    onAppointmentUpdatedWorkflow 
} from './workflows/appointments';

export { patientReactivation } from './workflows/reactivation';
export { dailyExerciseReminder } from './crons/patient-reminders';
export { dailyPatientDigest } from './crons/scheduled-tasks';

// ============================================================================
// OTIMIZAÇÃO E LIMPEZA AUTOMÁTICA
// ============================================================================
export {
    optimizeImageOnUpload,
    cleanupOldImages,
    getOptimizationStats
} from './storage/image-optimization';

export {
    setDocumentTTL,
    deleteExpiredDocuments,
    getDataRetentionStats
} from './crons/data-retention';

// ============================================================================
// ANALYTICS (BIGQUERY)
// ============================================================================
export {
    setupAnalytics,
    dashboardMetrics,
    patientEvolution,
    organizationStats,
    topExercises,
    painMapAnalysis,
    usageStats
} from './api/analytics-http';

// ============================================================================
// ADMIN E UTILITÁRIOS
// ============================================================================
export const createAdminUser = onCall(async () => {
    const { createAdminUserHandler } = await import('./admin/create-user');
    return createAdminUserHandler();
});

export const healthCheck = onRequest(async (req: any, res: any) => {
    const { healthCheckHandler } = await import('./api/health');
    return healthCheckHandler(req, res);
});

// Proxy de imagens para evitar problemas de CORS
export const exerciseImageProxy = onRequest(
    {
        maxInstances: 5,
        concurrency: 10,
        memory: '512MiB',
        cors: CORS_ORIGINS,
    },
    async (req: any, res: any) => {
        const { exerciseImageProxy } = await import('./api/exerciseImage');
        return exerciseImageProxy(req, res);
    });
