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
    withCors
} from './lib/function-config';

// Set global options for all functions - CONFIGURAÇÃO OTIMIZADA PARA GEN 2
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
import { adminDb } from './init';

// Initialize Sentry for error tracking (side effect import)
import './lib/sentry';

// ============================================================================
// SERVIÇOS UNIFICADOS (RECOMENDADO PARA FRONTEND)
// ============================================================================
// Estes serviços consolidam múltiplas funções em um único Cloud Run Service
// Economia estimada: R$ 40-60/mês ao reduzir instâncias warm.

export { patientService, patientServiceHttp } from './api/patients-unified';
export { appointmentService, appointmentServiceHttp } from './api/appointments-unified';
export { evolutionService, evolutionServiceHttp } from './api/evolutions-unified';

// ============================================================================
// API FUNCTIONS (Individual Handlers - Mantidos para Retrocompatibilidade)
// ============================================================================

import { onCall, onRequest, Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

// API de Pacientes (V2 HTTP)
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

// API de Agendamentos (V2 HTTP)
export { listAppointmentsHttp as listAppointments } from './api/appointments';
export { getAppointmentHttp as getAppointmentV2 } from './api/appointments';
export { createAppointmentHttp as createAppointmentV2 } from './api/appointments';
export { updateAppointmentHttp as updateAppointmentV2 } from './api/appointments';
export { cancelAppointmentHttp as cancelAppointmentV2 } from './api/appointments';
export { checkTimeConflictHttp as checkTimeConflictV2 } from './api/appointments';
// API de Médicos (HTTP com CORS configurado no handler)
export { listDoctorsHttp as listDoctors, searchDoctorsHttp as searchDoctorsV2 } from './api/doctors';

// API de Exercícios
export {
    listExercisesHttp as listExercisesV2,
    getExerciseHttp as getExerciseV2,
    getExerciseCategoriesHttp as getExerciseCategoriesV2,
    getPrescribedExercisesHttp as getPrescribedExercisesV2,
    logExerciseHttp as logExerciseV2,
    createExerciseHttp as createExerciseV2,
    updateExerciseHttp as updateExerciseV2,
    deleteExerciseHttp as deleteExerciseV2,
    mergeExercisesHttp as mergeExercisesV2,
    searchSimilarExercisesHttp as searchSimilarExercisesV2,
} from './api/exercises';

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
export {
    listAssessmentTemplatesHttp as listAssessmentTemplatesV2,
    getAssessmentTemplateHttp as getAssessmentTemplateV2,
    listAssessmentsHttp as listAssessmentsV2,
    getAssessmentHttp as getAssessmentV2,
    createAssessmentHttp as createAssessmentV2,
    updateAssessmentHttp as updateAssessmentV2,
} from './api/assessments';

// API do Dashboard
export {
    getDashboardStatsHttp as getDashboardStatsV2,
} from './api/dashboard';

// API de Perfis (HTTP onRequest - compatível com callFunctionHttp/fetch)
export {
    getProfile,
    updateProfile,
} from './api/profile';

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

// API de Parcerias (Partnerships)
export {
    listPartnershipsHttp as listPartnerships,
    getPartnershipHttp as getPartnership,
    createPartnershipHttp as createPartnership,
    updatePartnershipHttp as updatePartnership,
    deletePartnershipHttp as deletePartnership,
} from './api/partnerships';

// API de Registros Financeiros de Pacientes
export {
    listAllFinancialRecordsHttp as listAllFinancialRecordsV2,
    listPatientFinancialRecordsHttp as listPatientFinancialRecords,
    getPatientFinancialSummaryHttp as getPatientFinancialSummaryV2,
    createFinancialRecordHttp as createFinancialRecord,
    updateFinancialRecordHttp as updateFinancialRecord,
    deleteFinancialRecordHttp as deleteFinancialRecord,
    markAsPaidHttp as markAsPaid,
} from './api/patient-financial';

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
// OTIMIZAÇÃO: Aumentado maxInstances para evitar erros 429 em carregamento de listas
export const exerciseImageProxy = onRequest(
    {
        maxInstances: 10,
        cpu: 1, // Required when concurrency > 1
        concurrency: 10,
        memory: '512MiB', // Aumentado memória para processamento de imagem
        timeoutSeconds: 60,
        cors: CORS_ORIGINS,
    },
    async (req: any, res: any) => {
        const { exerciseImageProxy } = await import('./api/exerciseImage');
        return exerciseImageProxy(req, res);
    });

// Admin Functions
export const createAdminUser = onCall(async (request) => {
    const { createAdminUserHandler } = await import('./admin/create-user');
    return createAdminUserHandler();
});

// Migration Functions
export const migrateRolesToClaims = onCall(async (request) => {
    const { migrateRolesToClaimsHandler } = await import('./migrations/migrate-roles-to-claims');
    return migrateRolesToClaimsHandler(request);
});

export const createPerformanceIndexes = onCall(async (request) => {
    const { createPerformanceIndexesHandler } = await import('./migrations/create-performance-indexes');
    return createPerformanceIndexesHandler(request);
});

// OTIMIZAÇÃO: Função para corrigir índice de agendamentos (500 Error Fix)
export const fixAppointmentIndex = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '256MiB',
        timeoutSeconds: 300,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { fixAppointmentIndexHandler } = await import('./migrations/fix-appointment-index');
        return fixAppointmentIndexHandler(req, res);
    }
);

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

export const runDoctorsTable = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '256MiB',
        timeoutSeconds: 60,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { runDoctorsTable } = await import('./migrations/run-doctors-table');
        return runDoctorsTable(req, res);
    }
);

export const fixUserOrganization = onRequest(
    {
        secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
        memory: '256MiB',
        timeoutSeconds: 60,
        region: 'southamerica-east1',
        cors: CORS_ORIGINS,
    },
    async (req, res) => {
        const { fixUserOrganization } = await import('./migrations/fix-user-organization');
        return fixUserOrganization(req, res);
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

export const scanMedicalReportHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any, res: any) => {
        const { scanMedicalReportHttpHandler } = await import('./api/ocr-scanner');
        return scanMedicalReportHttpHandler(req, res);
    }
);

// Marketing AI Templates
export const generateMarketingTemplate = onCall(
    AI_FUNCTION,
    async (request) => {
        const { marketingTemplateHandler } = await import('./ai/marketing-ai');
        return marketingTemplateHandler(request);
    }
);

export const generateMarketingTemplateHttp = onRequest(
    { ...AI_FUNCTION, ...withCors(AI_FUNCTION, CORS_ORIGINS) },
    async (req: any) => {
        const { marketingTemplateHandler } = await import('./ai/marketing-ai');
        return marketingTemplateHandler(req);
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

export { analyzeMovementVideo } from './api/video-analysis';

// Cron Jobs
export { dailyExerciseReminder } from './crons/patient-reminders';
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

import { exerciseServiceHandler } from './api/exercises-unified';
import { assessmentServiceHandler } from './api/assessments-unified';
import { STANDARD_FUNCTION } from './lib/function-config';

export const exerciseService = onCall(
    STANDARD_FUNCTION,
    exerciseServiceHandler
);

export const assessmentService = onCall(
    STANDARD_FUNCTION,
    assessmentServiceHandler
);

// ============================================================================
// GAMIFICATION TRIGGERS & API
// ============================================================================
export { onExerciseCompleted, onAppointmentCompleted } from './gamification/triggers';
export { getLeaderboard, processPurchase } from './gamification/api';

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
 * Firestore trigger unificado: publica eventos de agendamento no RTDB
 */
export const onAppointmentRtdbSyncTrigger = functions.firestore.onDocumentWritten(
    'appointments/{appointmentId}',
    async (event) => {
        const after = event.data?.after?.data();
        if (!after) return;

        // RTDB: Notificar clientes sobre atualização
        try {
            const { rtdb } = await import('./lib/rtdb');
            await rtdb.refreshAppointments(after.organization_id);
        } catch (err) {
            console.error('[onAppointmentRtdbSync] RTDB publish failed (non-critical):', err);
        }
    }
);

/**
 * Legacy HTTPS function mantida para evitar erro de migração de tipo em produção.
 * A sincronização real está em `onAppointmentRtdbSyncTrigger`.
 */
export const onAppointmentRtdbSync = onRequest(
    { region: 'southamerica-east1', invoker: 'public' },
    async (_req: Request, res: Response) => {
        res.status(204).send('onAppointmentRtdbSync legacy endpoint');
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
export { onUserCreated }; // v2 trigger exported directly

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

import * as googleIntegrations from './integrations/google';
export const searchPlaces = googleIntegrations.searchPlaces;
export const getGoogleAuthUrlIntegration = googleIntegrations.getGoogleAuthUrl;
export const googleAuthCallback = googleIntegrations.googleAuthCallback;
export const createMeetLink = googleIntegrations.createMeetLink;
export const syncPatientCalendar = googleIntegrations.syncPatientCalendar;
export const getBusinessReviews = googleIntegrations.getBusinessReviews;
export const generateGoogleReport = googleIntegrations.generateGoogleReport;
export const listGoogleTemplates = googleIntegrations.listGoogleTemplates;
export const createPatientDriveFolder = googleIntegrations.createPatientDriveFolder;

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

// Report Triggers
export { onReportCreated } from './triggers/reports';

// ============================================================================
// AI INDEXING (Vector Search)
// ============================================================================
export {
    indexExistingEvolutions,
    indexEvolution,
    reindexPatientEvolutions,
    removeEvolutionEmbedding,
    onEvolutionCreated,
    getIndexingStats,
} from './ai/indexing';

// ============================================================================
// STORAGE OPTIMIZATION (Cloud Functions Free Tier Otimizations)
// ============================================================================
export {
    optimizeImageOnUpload,
    cleanupOldImages,
    cleanupOrphanThumbnails,
    getOptimizationStats,
} from './storage/image-optimization';

// ============================================================================
// DATA RETENTION & TTL MANAGEMENT
// ============================================================================
export {
    enforceDataRetention,
    scheduledDataRetention,
    setDocumentTTL,
    deleteExpiredDocuments,
    compactLogs,
    getDataRetentionStats,
} from './crons/data-retention';

// ============================================================================
// BIGQUERY ANALYTICS
// ============================================================================
export {
    setupAnalytics,
    dashboardMetrics,
    patientEvolution,
    organizationStats,
    topExercises,
    painMapAnalysis,
    gamificationStats,
    churnPrediction,
    usageStats,
    customQuery,
} from './api/analytics-http';

