/**
 * Configuração das URLs da API V2 (Cloud Functions)
 *
 * Prioridade de Configuração:
 * 1. VITE_CLOUD_FUNCTIONS_URL (URL base completa)
 * 2. Construção dinâmica via PROJECT_ID + REGION + HASH
 * 3. Fallback hardcoded (último deploy conhecido)
 */

const _PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'fisioflow-migration';
const _REGION = import.meta.env.VITE_FIREBASE_REGION || 'southamerica-east1';
const HASH = import.meta.env.VITE_CLOUD_FUNCTIONS_HASH || 'tfecm5cqoq'; 

// URL Base única para Cloud Run (Firebase Functions V2)
const CLOUD_RUN_BASE_URL = (func: string) => `https://${func.toLowerCase()}-${HASH}-rj.a.run.app`;

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
