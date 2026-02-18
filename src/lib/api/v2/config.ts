/**
 * Configuração das URLs da API V2 (Cloud Functions)
 *
 * Prioridade de Configuração:
 * 1. VITE_CLOUD_RUN_BASE_URL (URL base completa sem a função, ex: https://<function>-<project>.region.run.app)
 * 2. Construção dinâmica via PROJECT_NUMBER + REGION (padrão Cloud Functions v2)
 * 3. Fallback legado por HASH (compatibilidade)
 */

const _REGION = import.meta.env.VITE_FIREBASE_REGION || 'southamerica-east1';
const _PROJECT_NUMBER = import.meta.env.VITE_FIREBASE_PROJECT_NUMBER || '412418905255';
const _LEGACY_HASH = import.meta.env.VITE_CLOUD_FUNCTIONS_HASH || 'tfecm5cqoq';
const _RUN_APP_PATTERN = import.meta.env.VITE_CLOUD_RUN_PATTERN || 'legacy-hash';

// URL base para Cloud Run (Firebase Functions v2)
// Mantém barra final para evitar preflight em endpoint sem slash que costuma responder 404.
const CLOUD_RUN_BASE_URL = (func: string) => {
  const normalized = func.toLowerCase();
  if (_RUN_APP_PATTERN === 'legacy-hash') {
    return `https://${normalized}-${_LEGACY_HASH}-rj.a.run.app/`;
  }
  return `https://${normalized}-${_PROJECT_NUMBER}.${_REGION}.run.app/`;
};

export const API_URLS = {
  patients: {
    list: CLOUD_RUN_BASE_URL('listPatientsV2'),
    get: CLOUD_RUN_BASE_URL('getPatientHttp'),
    create: CLOUD_RUN_BASE_URL('createPatientV2'),
    update: CLOUD_RUN_BASE_URL('updatePatientV2'),
    delete: CLOUD_RUN_BASE_URL('deletePatientV2'),
    stats: CLOUD_RUN_BASE_URL('getPatientStatsV2'),
  },
  appointments: {
    list: CLOUD_RUN_BASE_URL('listAppointments'),
    get: CLOUD_RUN_BASE_URL('getAppointmentV2'),
    create: CLOUD_RUN_BASE_URL('createAppointmentV2'),
    update: CLOUD_RUN_BASE_URL('updateAppointmentV2'),
    cancel: CLOUD_RUN_BASE_URL('cancelAppointmentV2'),
    checkConflict: CLOUD_RUN_BASE_URL('checkTimeConflictV2'),
  },
  doctors: {
    list: CLOUD_RUN_BASE_URL('listDoctors'),
    search: CLOUD_RUN_BASE_URL('searchDoctorsV2'),
  },
  exercises: {
    list: CLOUD_RUN_BASE_URL('listExercisesV2'),
    get: CLOUD_RUN_BASE_URL('getExerciseV2'),
    searchSimilar: CLOUD_RUN_BASE_URL('searchSimilarExercisesV2'),
  },
  assessments: {
    listTemplates: CLOUD_RUN_BASE_URL('listAssessmentTemplatesV2'),
  },
  profile: {
    get: CLOUD_RUN_BASE_URL('getProfile'),
    update: CLOUD_RUN_BASE_URL('updateProfile'),
  },
  services: {
    patient: CLOUD_RUN_BASE_URL('patientServiceHttp'),
    appointment: CLOUD_RUN_BASE_URL('appointmentServiceHttp'),
    evolution: CLOUD_RUN_BASE_URL('evolutionServiceHttp'),
    ai: CLOUD_RUN_BASE_URL('aiServiceHttp'),
  },
  financial: {
    listTransactions: CLOUD_RUN_BASE_URL('listTransactionsV2'),
    createTransaction: CLOUD_RUN_BASE_URL('createTransactionV2'),
    updateTransaction: CLOUD_RUN_BASE_URL('updateTransactionV2'),
    deleteTransaction: CLOUD_RUN_BASE_URL('deleteTransactionV2'),
    findTransactionByAppointmentId: CLOUD_RUN_BASE_URL('findTransactionByAppointmentIdV2'),
    getEventReport: CLOUD_RUN_BASE_URL('getEventReportV2'),
  },
  clinical: {
    listGoals: CLOUD_RUN_BASE_URL('listpatientgoalshttp'),
    createGoal: CLOUD_RUN_BASE_URL('createpatientgoalhttp'),
    listPathologies: CLOUD_RUN_BASE_URL('listpatientpathologieshttp'),
    createPathology: CLOUD_RUN_BASE_URL('createpatientpathologyhttp'),
    getInsights: CLOUD_RUN_BASE_URL('getclinicalinsightshttp'),
    getAiSummary: CLOUD_RUN_BASE_URL('getpatientaisummaryhttp'),
    transcribe: CLOUD_RUN_BASE_URL('transcribeaudio'),
    scanReport: CLOUD_RUN_BASE_URL('scanmedicalreporthttp'),
  }
};
