/**
 * Firebase Functions Integration
 * Utilitários para chamadas tipadas para as Cloud Functions da API
 *
 * @module integrations/firebase/functions
 */

/* eslint-disable @typescript-eslint/no-namespace */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Região padrão para as Cloud Functions */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app, getFirebaseAuth } from './app';
import { API_URLS } from '@/lib/api/v2/config';

const DEFAULT_REGION = 'southamerica-east1';

/** Timeout padrão para chamadas de função (em segundos) */
const _DEFAULT_TIMEOUT = 60;

/** Firebase Functions instance (exported for callers that need the raw instance, e.g. httpsCallable) */
export const functionsInstance = getFunctions(app, DEFAULT_REGION);

/**
 * Map of HTTP function names to run.app URLs (Firebase Functions v2 onRequest).
 * When present, callFunctionHttp uses this URL instead of cloudfunctions.net.
 */
const HTTP_FUNCTION_URLS: Record<string, string> = {
  getProfile: API_URLS.profile.get,
  updateProfile: API_URLS.profile.update,
  listAssessmentTemplatesV2: API_URLS.assessments.listTemplates,
  getPatientHttp: API_URLS.patients.get,
  listPatientsV2: API_URLS.patients.list,
  getPatientStatsV2: API_URLS.patients.stats,
  updatePatientV2: API_URLS.patients.update,
  deletePatientV2: API_URLS.patients.delete,
  listAppointments: API_URLS.appointments.list,
  getAppointmentV2: API_URLS.appointments.get,
  createAppointmentV2: API_URLS.appointments.create,
  updateAppointmentV2: API_URLS.appointments.update,
  cancelAppointmentV2: API_URLS.appointments.cancel,
  checkTimeConflictV2: API_URLS.appointments.checkConflict,
  listDoctors: API_URLS.doctors.list,
  searchDoctorsV2: API_URLS.doctors.search,
  listExercisesV2: API_URLS.exercises.list,
  getExerciseV2: API_URLS.exercises.get,
  searchSimilarExercises: API_URLS.exercises.searchSimilar,
  searchSimilarExercisesV2: API_URLS.exercises.searchSimilar,
  listTransactionsV2: API_URLS.financial.listTransactions,
  createTransactionV2: API_URLS.financial.createTransaction,
  updateTransactionV2: API_URLS.financial.updateTransaction,
  deleteTransactionV2: API_URLS.financial.deleteTransaction,
  findTransactionByAppointmentIdV2: API_URLS.financial.findTransactionByAppointmentId,
  getEventReportV2: API_URLS.financial.getEventReport,
  getFinancialSummaryV2: API_URLS.financial.getSummary,
  patientServiceHttp: API_URLS.services.patient,
  appointmentServiceHttp: API_URLS.services.appointment,
  evolutionServiceHttp: API_URLS.services.evolution,
  setupAnalytics: API_URLS.analytics.setup,
  dashboardMetrics: API_URLS.analytics.dashboard,
  patientEvolution: API_URLS.analytics.evolution,
  organizationStats: API_URLS.analytics.organization,
  topExercises: API_URLS.analytics.exercises,
  painMapAnalysis: API_URLS.analytics.painMap,
  usageStats: API_URLS.analytics.usage,
};
const LOCAL_FUNCTIONS_PROXY =
  import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_PROXY === 'true'
    ? (import.meta.env.VITE_FUNCTIONS_PROXY || '/functions')
    : undefined;
const ENABLE_CANONICAL_FUNCTION_FALLBACK =
  import.meta.env.VITE_ENABLE_CANONICAL_FUNCTION_FALLBACK !== 'false';

/**
 * Get Firebase Functions instance
 * Export this for use in services that need the raw instance
 */
export function getFirebaseFunctions() {
  return functionsInstance;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Interface genérica para resposta de função com erro
 */
export interface FunctionResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

/**
 * Tipo de erro para falhas em chamadas de função
 */
export class FunctionCallError extends Error {
  constructor(
    public functionName: string,
    public originalError: unknown,
    public payload?: unknown,
    message?: string
  ) {
    super(
      message || `Error calling function '${functionName}': ${String(originalError)}`
    );
    this.name = 'FunctionCallError';
  }
}

/**
 * Opções para chamada de função
 */
interface CallFunctionOptions {
  /** Timeout em segundos */
  timeout?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Auxiliar para chamar funções https com tratamento de erro e tipagem forte
 *
 * @param functionName - Nome da função a ser chamada
 * @param data - Dados a serem enviados
 * @param options - Opções adicionais
 * @returns Promise com a resposta da função
 * @throws {FunctionCallError} Quando a chamada falha
 */
export async function callFunction<TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions
): Promise<TResponse> {
  try {
    const callable = httpsCallable<TRequest, TResponse>(
      functionsInstance,
      functionName,
      options?.timeout ? { timeout: options.timeout * 1000 } : undefined
    );
    const result: HttpsCallableResult<TResponse> = await callable(data);
    return result.data;
  } catch (error) {
    throw new FunctionCallError(functionName, error);
  }
}

/**
 * Wrapper para chamadas de função que retorna resultados tipados
 * com tratamento automático de erros da resposta
 */
export async function callFunctionWithResponse<TRequest, TData>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions
): Promise<FunctionResponse<TData>> {
  const response = await callFunction<TRequest, FunctionResponse<TData>>(
    functionName,
    data,
    options
  );

  if (response.error && !response.data) {
    throw new FunctionCallError(functionName, response.error);
  }

  return response;
}

/**
 * Chamada HTTP com Bearer token para funções onRequest (Cloud Run).
 * Requer que o endpoint tenha invoker: 'public' para o preflight OPTIONS
 * chegar ao handler e retornar headers CORS; a autenticação é feita no handler.
 */
export async function callFunctionHttp<TRequest, TResponse>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions
): Promise<TResponse> {
  const auth = getFirebaseAuth();
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new FunctionCallError(functionName, 'No authentication token available');
  }

  const region = DEFAULT_REGION;
  const projectId = app.options.projectId;
  const mappedUrl = HTTP_FUNCTION_URLS[functionName];
  const canonicalUrl = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
  // Proxy local only when explicitly enabled (e.g. emulator workflow)
  const shouldProxy = Boolean(LOCAL_FUNCTIONS_PROXY);
  const proxyBase = LOCAL_FUNCTIONS_PROXY?.replace(/\/$/, '');
  const primaryUrl = shouldProxy ? `${proxyBase}/${functionName}` : (mappedUrl ?? canonicalUrl);
  const shouldRetryWithCanonical =
    Boolean(mappedUrl) &&
    !shouldProxy &&
    primaryUrl !== canonicalUrl &&
    ENABLE_CANONICAL_FUNCTION_FALLBACK;
  const timeoutMs = Math.max(1, options?.timeout ?? 15) * 1000;

  const fetchJson = async (targetUrl: string): Promise<TResponse> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;

    try {
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if ((fetchError as { name?: string })?.name === 'AbortError') {
        throw new FunctionCallError(
          functionName,
          fetchError,
          { targetUrl, timeoutMs },
          `Request timeout after ${timeoutMs}ms`
        );
      }
      throw fetchError;
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let serverMessage = errorText;
      let parsed: Record<string, unknown> | null = null;
      try {
        const errJson = JSON.parse(errorText) as Record<string, unknown>;
        parsed = errJson;
        if (errJson?.error) serverMessage = String(errJson.error);
      } catch {
        // keep errorText as-is
      }
      const err = new FunctionCallError(functionName, errorText, parsed ?? undefined, serverMessage);
      (err as FunctionCallError & { status?: number }).status = response.status;
      throw err;
    }

    const result = await response.json();
    return result as TResponse;
  };

  const shouldFallbackToCanonical = (error: unknown): boolean => {
    if (!(error instanceof FunctionCallError)) return true;
    const status = (error as FunctionCallError & { status?: number }).status;
    if (typeof status !== 'number') return true;
    return status === 403 || status === 404 || status >= 500;
  };

  try {
    return await fetchJson(primaryUrl);
  } catch (error) {
    if (shouldRetryWithCanonical && primaryUrl !== canonicalUrl && shouldFallbackToCanonical(error)) {
      try {
        return await fetchJson(canonicalUrl);
      } catch (fallbackError) {
        const message = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new FunctionCallError(
          functionName,
          fallbackError,
          { primaryUrl, fallbackUrl: canonicalUrl },
          message
        );
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new FunctionCallError(functionName, error, { primaryUrl }, message);
  }
}

/**
 * Wrapper para chamadas HTTP com tratamento de erro
 */
export async function callFunctionHttpWithResponse<TRequest, TData>(
  functionName: string,
  data: TRequest,
  options?: CallFunctionOptions
): Promise<FunctionResponse<TData>> {
  const response = await callFunctionHttp<TRequest, FunctionResponse<TData>>(
    functionName,
    data,
    options
  );

  if (response.error && !response.data) {
    throw new FunctionCallError(functionName, response.error);
  }

  return response;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Tipos para API de Pacientes
 */
export namespace PatientApi {
  export interface ListParams {
    organizationId?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }

  export interface GetParams {
    patientId?: string;
    profileId?: string;
  }

  export interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
  }

  export interface CreateData {
    name: string;
    email?: string;
    phone?: string;
    status?: string;
    [key: string]: unknown;
  }

  export interface UpdateData {
    [key: string]: unknown;
  }

  export interface Stats {
    totalSessions: number;
    upcomingAppointments: number;
    lastVisit?: string;
    [key: string]: unknown;
  }
}

/**
 * Tipos para API de Exercícios
 */
export namespace ExerciseApi {
  export interface ListParams {
    category?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }

  export interface Exercise {
    id: string;
    name: string;
    category?: string;
    difficulty?: string;
    description?: string;
    [key: string]: unknown;
  }

  export interface CreateData {
    name: string;
    category?: string;
    difficulty?: string;
    description?: string;
    [key: string]: unknown;
  }

  export interface UpdateData {
    [key: string]: unknown;
  }

  export interface PrescribedExercise {
    id: string;
    patientId: string;
    exerciseId: string;
    prescribedAt: string;
    [key: string]: unknown;
  }

  export interface LogExerciseData {
    patientId: string;
    prescriptionId: string;
    difficulty: number;
    notes?: string;
  }

  export interface Category {
    id: string;
    name: string;
    [key: string]: unknown;
  }
}

/**
 * Tipos para API Financeira
 */
export namespace FinancialApi {
  export type Period = 'daily' | 'weekly' | 'monthly' | 'all';

  export interface Transaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
    status: string;
    createdAt: string;
    [key: string]: unknown;
  }

  export interface CreateData {
    amount: number;
    type: 'income' | 'expense';
    category?: string;
    appointmentId?: string;
    [key: string]: unknown;
  }

  export interface UpdateData {
    [key: string]: unknown;
  }

  export interface EventReport {
    eventoId: string;
    eventoNome?: string;
    receitas: number;
    custosPrestadores?: number;
    custosInsumos?: number;
    outrosCustos?: number;
    custoTotal: number;
    saldo: number;
    margem?: number;
    pagamentosPendentes?: number;
    detalhePagamentos?: Array<{
      tipo: string;
      descricao: string;
      valor: number;
      pagoEm: string | null;
    }>;
    [key: string]: unknown;
  }

  export interface Summary {
    period: Period;
    totalRevenue: number;
    pendingPayments: number;
    monthlyGrowth: number;
    paidCount: number;
    totalCount: number;
    averageTicket: number;
  }
}

/**
 * Tipos para API Clínica
 */
export namespace ClinicalApi {
  export interface MedicalRecord {
    id: string;
    patientId: string;
    type: string;
    title: string;
    content: string;
    recordDate: string;
    createdAt: string;
    [key: string]: unknown;
  }

  export interface CreateMedicalRecordData {
    patientId: string;
    type: string;
    title: string;
    content: string;
    recordDate?: string;
  }

  export interface UpdateMedicalRecordData {
    [key: string]: unknown;
  }

  export interface TreatmentSession {
    id: string;
    patientId: string;
    sessionDate: string;
    notes?: string;
    [key: string]: unknown;
  }

  export interface CreateTreatmentSessionData {
    patientId: string;
    sessionDate: string;
    notes?: string;
    [key: string]: unknown;
  }

  export interface PainRecord {
    id: string;
    patientId: string;
    level: number;
    type: string;
    bodyPart: string;
    notes?: string;
    recordedAt: string;
  }

  export interface SavePainRecordData {
    patientId: string;
    level: number;
    type: string;
    bodyPart: string;
    notes?: string;
  }
}

/**
 * Tipos para API de Agendamentos
 */
export namespace AppointmentApi {
  export interface Appointment {
    id: string;
    patientId: string;
    therapistId?: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    patient?: PatientApi.Patient;
    [key: string]: unknown;
  }

  export interface ListParams {
    dateFrom?: string;
    dateTo?: string;
    therapistId?: string;
    status?: string;
    patientId?: string;
    limit?: number;
    offset?: number;
  }

  export interface CreateData {
    patientId: string;
    date: string;
    startTime: string;
    endTime: string;
    therapistId?: string;
    [key: string]: unknown;
  }

  export interface UpdateData {
    [key: string]: unknown;
  }

  export interface CheckConflictParams {
    therapistId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeAppointmentId?: string;
  }

  export interface ConflictResult {
    hasConflict: boolean;
    conflictingAppointments?: Appointment[];
  }
}

/**
 * Tipos para API de Perfis
 */
export namespace ProfileApi {
  export interface Profile {
    id: string;
    email?: string;
    displayName?: string;
    role?: string;
    [key: string]: unknown;
  }

  export interface UpdateData {
    [key: string]: unknown;
  }
}

/**
 * Tipos para API de Médicos
 */
export namespace DoctorApi {
  export interface ListParams {
    search?: string;
    limit?: number;
    offset?: number;
  }

  export interface SearchParams {
    searchTerm: string;
    limit?: number;
  }

  export interface Doctor {
    id: string;
    name: string;
    specialty?: string;
    crm?: string;
    crm_state?: string;
    phone?: string;
    email?: string;
    clinic_name?: string;
    clinic_address?: string;
    clinic_phone?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
}

// ============================================================================
// APIs
// ============================================================================

/**
 * API de Pacientes no Firebase Functions
 */
export const patientsApi = {
  /**
   * Lista pacientes com filtros opcionais (uses Unified Service)
   */
  list: (params: PatientApi.ListParams = {}): Promise<FunctionResponse<PatientApi.Patient[]>> =>
    callFunctionHttpWithResponse('patientServiceHttp', { ...params, action: 'list' }),

  /**
   * Obtém um paciente por ID (uses Unified Service)
   */
  get: (idOrParams: string | PatientApi.GetParams): Promise<PatientApi.Patient> => {
    const data = typeof idOrParams === 'string' ? { patientId: idOrParams } : idOrParams;
    return callFunctionHttp<{ action: string } & PatientApi.GetParams, { data: PatientApi.Patient }>(
      'patientServiceHttp', 
      { ...data, action: 'get' }
    ).then(res => res.data);
  },

  /**
   * Cria um novo paciente (uses Unified Service)
   */
  create: async (patient: PatientApi.CreateData): Promise<PatientApi.Patient> => {
    const res = await callFunctionHttp<any, { data: PatientApi.Patient }>(
      'patientServiceHttp',
      { ...patient, action: 'create' }
    );
    return res.data;
  },

  /**
   * Atualiza um paciente existente (uses Unified Service)
   */
  update: async (patientId: string, updates: PatientApi.UpdateData): Promise<PatientApi.Patient> => {
    const res = await callFunctionHttp<any, { data: PatientApi.Patient }>(
      'patientServiceHttp',
      { patientId, ...updates, action: 'update' }
    );
    return res.data;
  },

  /**
   * Remove um paciente (uses Unified Service)
   */
  delete: (patientId: string): Promise<{ success: boolean }> =>
    callFunctionHttp('patientServiceHttp', { patientId, action: 'delete' }),

  /**
   * Obtém estatísticas de um paciente (uses Unified Service)
   */
  getStats: async (patientId: string): Promise<PatientApi.Stats> => {
    const res = await callFunctionHttp<any, { data: PatientApi.Stats }>(
      'patientServiceHttp',
      { patientId, action: 'stats' }
    );
    return res.data;
  },
};

/**
 * API de Exercícios no Firebase Functions
 */
export const exercisesApi = {
  list: (params: ExerciseApi.ListParams = {}): Promise<FunctionResponse<ExerciseApi.Exercise[]>> =>
    callFunctionHttpWithResponse('listExercisesV2', params),
  get: async (exerciseId: string): Promise<ExerciseApi.Exercise> => {
    const res = await callFunctionHttp<{ exerciseId: string }, { data: ExerciseApi.Exercise }>('getExerciseV2', { exerciseId });
    return res.data;
  },
  searchSimilar: (params: { exerciseId?: string; query?: string; limit?: number }): Promise<ExerciseApi.Exercise[]> =>
    callFunctionHttp<{ exerciseId?: string; query?: string; limit?: number }, { data: ExerciseApi.Exercise[] }>('searchSimilarExercisesV2', params).then((r) => r.data),
  getCategories: async (): Promise<ExerciseApi.Category[]> => {
    const res = await callFunctionHttp<Record<string, never>, { data: ExerciseApi.Category[] }>('getExerciseCategoriesV2', {});
    return res.data;
  },
  getPrescribedExercises: async (patientId: string): Promise<ExerciseApi.PrescribedExercise[]> => {
    const res = await callFunctionHttp<{ patientId: string }, { data: ExerciseApi.PrescribedExercise[] }>('getPrescribedExercisesV2', { patientId });
    return res.data;
  },
  logExercise: (data: ExerciseApi.LogExerciseData): Promise<{ success: boolean; logId?: string }> =>
    callFunctionHttp('logExerciseV2', data),
  create: async (exercise: ExerciseApi.CreateData): Promise<ExerciseApi.Exercise> => {
    const res = await callFunctionHttp<ExerciseApi.CreateData, { data: ExerciseApi.Exercise }>('createExerciseV2', exercise);
    return res.data;
  },
  update: async (id: string, updates: ExerciseApi.UpdateData): Promise<ExerciseApi.Exercise> => {
    const res = await callFunctionHttp<{ id: string } & ExerciseApi.UpdateData, { data: ExerciseApi.Exercise }>('updateExerciseV2', { id, ...updates });
    return res.data;
  },
  delete: (id: string): Promise<{ success: boolean }> =>
    callFunctionHttp('deleteExerciseV2', { id }),
  merge: (keepId: string, mergeIds: string[]): Promise<{ success: boolean; mergedCount?: number }> =>
    callFunctionHttp('mergeExercisesV2', { keepId, mergeIds }),
};

/**
 * API Financeira (Transações) no Firebase Functions
 */
export const financialApi = {
  list: (limit?: number, offset?: number): Promise<FunctionResponse<FinancialApi.Transaction[]>> =>
    callFunctionHttpWithResponse('listTransactionsV2', { limit, offset }),
  summary: async (period: FinancialApi.Period = 'monthly'): Promise<FinancialApi.Summary> => {
    const res = await callFunctionHttp<{ period: FinancialApi.Period }, { data: FinancialApi.Summary }>('getFinancialSummaryV2', { period });
    return res.data;
  },
  create: async (transaction: FinancialApi.CreateData): Promise<FinancialApi.Transaction> => {
    const res = await callFunctionHttp<FinancialApi.CreateData, { data: FinancialApi.Transaction }>('createTransactionV2', transaction);
    return res.data;
  },
  update: async (transactionId: string, updates: FinancialApi.UpdateData): Promise<FinancialApi.Transaction> => {
    const res = await callFunctionHttp<{ transactionId: string } & FinancialApi.UpdateData, { data: FinancialApi.Transaction }>('updateTransactionV2', { transactionId, ...updates });
    return res.data;
  },
  delete: (transactionId: string): Promise<{ success: boolean }> =>
    callFunctionHttp('deleteTransactionV2', { transactionId }),
  findByAppointment: async (appointmentId: string): Promise<FinancialApi.Transaction | null> => {
    const res = await callFunctionHttp<{ appointmentId: string }, { data: FinancialApi.Transaction | null }>('findTransactionByAppointmentIdV2', { appointmentId });
    return res.data;
  },
  getEventReport: async (eventoId: string): Promise<FinancialApi.EventReport> => {
    const res = await callFunctionHttp<{ eventoId: string }, { data: FinancialApi.EventReport }>('getEventReportV2', { eventoId });
    return res.data;
  },
};

/**
 * API Clínica (Prontuários e Sessões) no Firebase Functions
 */
export const clinicalApi = {
  getPatientRecords: (
    patientId: string,
    type?: string,
    limit?: number
  ): Promise<FunctionResponse<ClinicalApi.MedicalRecord[]>> =>
    callFunctionHttpWithResponse('getPatientRecordsV2', { patientId, type, limit }),
  createMedicalRecord: async (data: ClinicalApi.CreateMedicalRecordData): Promise<ClinicalApi.MedicalRecord> => {
    const res = await callFunctionHttp<ClinicalApi.CreateMedicalRecordData, { data: ClinicalApi.MedicalRecord }>('createMedicalRecordV2', data);
    return res.data;
  },
  updateMedicalRecord: async (recordId: string, updates: ClinicalApi.UpdateMedicalRecordData): Promise<ClinicalApi.MedicalRecord> => {
    const res = await callFunctionHttp<{ recordId: string } & ClinicalApi.UpdateMedicalRecordData, { data: ClinicalApi.MedicalRecord }>('updateMedicalRecordV2', { recordId, ...updates });
    return res.data;
  },
  deleteMedicalRecord: (recordId: string): Promise<{ success: boolean }> =>
    callFunctionHttp('deleteMedicalRecordV2', { recordId }),
  listTreatmentSessions: async (patientId: string, limit?: number): Promise<ClinicalApi.TreatmentSession[]> => {
    const res = await callFunctionHttp<{ patientId: string; limit?: number }, { data: ClinicalApi.TreatmentSession[] }>('listTreatmentSessionsV2', { patientId, limit });
    return res.data;
  },
  createTreatmentSession: async (data: ClinicalApi.CreateTreatmentSessionData): Promise<ClinicalApi.TreatmentSession> => {
    const res = await callFunctionHttp<ClinicalApi.CreateTreatmentSessionData, { data: ClinicalApi.TreatmentSession }>('createTreatmentSessionV2', data);
    return res.data;
  },
  getPainRecords: async (patientId: string): Promise<ClinicalApi.PainRecord[]> => {
    const res = await callFunctionHttp<{ patientId: string }, { data: ClinicalApi.PainRecord[] }>('getPainRecordsV2', { patientId });
    return res.data;
  },
  savePainRecord: async (data: ClinicalApi.SavePainRecordData): Promise<ClinicalApi.PainRecord> => {
    const res = await callFunctionHttp<ClinicalApi.SavePainRecordData, { data: ClinicalApi.PainRecord }>('savePainRecordV2', data);
    return res.data;
  },
};

/**
 * API de Evoluções no Firebase Functions
 */
export const evolutionsApi = {
  /**
   * Lista evoluções de um paciente (uses Unified Service)
   */
  list: (patientId: string): Promise<FunctionResponse<ClinicalApi.MedicalRecord[]>> =>
    callFunctionHttpWithResponse('evolutionServiceHttp', { patientId, action: 'list' }),

  /**
   * Obtém uma evolução por ID (uses Unified Service)
   */
  get: async (evolutionId: string): Promise<ClinicalApi.MedicalRecord> => {
    const res = await callFunctionHttp<any, { data: ClinicalApi.MedicalRecord }>(
      'evolutionServiceHttp',
      { evolutionId, action: 'get' }
    );
    return res.data;
  },

  /**
   * Cria uma nova evolução (uses Unified Service)
   */
  create: async (data: any): Promise<ClinicalApi.MedicalRecord> => {
    const res = await callFunctionHttp<any, { data: ClinicalApi.MedicalRecord }>(
      'evolutionServiceHttp',
      { ...data, action: 'create' }
    );
    return res.data;
  },

  /**
   * Atualiza uma evolução existente (uses Unified Service)
   */
  update: async (evolutionId: string, updates: any): Promise<ClinicalApi.MedicalRecord> => {
    const res = await callFunctionHttp<any, { data: ClinicalApi.MedicalRecord }>(
      'evolutionServiceHttp',
      { evolutionId, ...updates, action: 'update' }
    );
    return res.data;
  },

  /**
   * Remove uma evolução (uses Unified Service)
   */
  delete: (evolutionId: string): Promise<{ success: boolean }> =>
    callFunctionHttp('evolutionServiceHttp', { evolutionId, action: 'delete' }),
};

/**
 * API de Agendamentos no Firebase Functions
 */
export const appointmentsApi = {
  /**
   * Lista agendamentos com filtros opcionais (uses Unified Service)
   */
  list: (params: AppointmentApi.ListParams = {}): Promise<FunctionResponse<AppointmentApi.Appointment[]>> =>
    callFunctionHttpWithResponse('appointmentServiceHttp', { ...params, action: 'list' }),

  /**
   * Obtém um agendamento por ID (uses Unified Service)
   */
  get: async (appointmentId: string): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<any, { data: AppointmentApi.Appointment }>(
      'appointmentServiceHttp',
      { appointmentId, action: 'get' }
    );
    return res.data;
  },

  /**
   * Cria um novo agendamento (uses Unified Service)
   */
  create: async (appointment: AppointmentApi.CreateData): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<any, { data: AppointmentApi.Appointment }>(
      'appointmentServiceHttp',
      { ...appointment, action: 'create' }
    );
    return res.data;
  },

  /**
   * Atualiza um agendamento existente (uses Unified Service)
   */
  update: async (appointmentId: string, updates: AppointmentApi.UpdateData): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<any, { data: AppointmentApi.Appointment }>(
      'appointmentServiceHttp',
      { appointmentId, ...updates, action: 'update' }
    );
    return res.data;
  },

  /**
   * Cancela um agendamento (uses Unified Service)
   */
  cancel: (appointmentId: string, reason?: string): Promise<{ success: boolean }> =>
    callFunctionHttp('appointmentServiceHttp', { appointmentId, reason, action: 'cancel' }),

  /**
   * Verifica conflitos de horário (uses Unified Service)
   */
  checkTimeConflict: (params: AppointmentApi.CheckConflictParams): Promise<AppointmentApi.ConflictResult> =>
    callFunctionHttp('appointmentServiceHttp', { ...params, action: 'checkConflict' }),
};

/**
 * API de Perfis no Firebase Functions
 */
export const profileApi = {
  /**
   * Obtém o perfil do usuário atual.
   * Usa endpoint HTTP com bearer token para manter compatibilidade CORS.
   */
  getCurrent: async (): Promise<ProfileApi.Profile> => {
    try {
      const res = await callFunctionHttp<Record<string, never>, { data: ProfileApi.Profile }>('getProfile', {});
      return res.data;
    } catch (error) {
      // Compatibilidade com deployments antigos que ainda expõem getProfile como callable.
      const status = (error as FunctionCallError & { status?: number })?.status;
      const message = error instanceof Error ? error.message : String(error);
      const isLegacyCallableError =
        status === 400 &&
        /invalid_argument|bad request/i.test(message);

      if (isLegacyCallableError) {
        const fallback = await callFunction<Record<string, never>, { data: ProfileApi.Profile } | ProfileApi.Profile>(
          'getProfile',
          {}
        );
        const payload = (fallback as { data?: ProfileApi.Profile })?.data ?? fallback;
        return payload as ProfileApi.Profile;
      }

      throw error;
    }
  },

  /**
   * Atualiza o perfil do usuário atual
   */
  update: (updates: ProfileApi.UpdateData): Promise<ProfileApi.Profile> =>
    callFunctionHttp('updateProfile', updates),
};

/**
 * API de Médicos no Firebase Functions
 */
export const doctorsApi = {
  /**
   * Lista médicos (Cloud SQL)
   */
  list: (params: DoctorApi.ListParams = {}): Promise<FunctionResponse<DoctorApi.Doctor[]>> =>
    callFunctionHttpWithResponse('listDoctors', params),

  /**
   * Busca médicos para autocomplete (Cloud SQL - High Performance)
   */
  search: (params: DoctorApi.SearchParams): Promise<{ data: DoctorApi.Doctor[] }> =>
    callFunctionHttp('searchDoctorsV2', params),
};

/**
 * API de Analytics (BigQuery)
 */
export const analyticsApi = {
  setup: () => callFunctionHttp('setupAnalytics', {}),
  getDashboard: (organizationId: string) => callFunctionHttp('dashboardMetrics', { organizationId }),
  getPatientEvolution: (patientId: string) => callFunctionHttp('patientEvolution', { patientId }),
  getOrganizationStats: (organizationId: string) => callFunctionHttp('organizationStats', { organizationId }),
  getTopExercises: (organizationId: string) => callFunctionHttp('topExercises', { organizationId }),
  getPainMap: (organizationId: string) => callFunctionHttp('painMapAnalysis', { organizationId }),
  getUsage: () => callFunctionHttp('usageStats', {}),
};

/**
 * API de Análise de Exercícios (Cloud Run Externo)
 */
export const exerciseAnalysisApi = {
  analyze: async (imageUrl: string) => {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(API_URLS.external.exerciseService + 'api/exercises/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ imageUrl }),
    });
    if (!response.ok) throw new Error('Failed to analyze exercise');
    return response.json();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Objeto consolidado com todas as APIs
 */
export const api = {
  patients: patientsApi,
  doctors: doctorsApi,
  exercises: exercisesApi,
  financial: financialApi,
  clinical: clinicalApi,
  appointments: appointmentsApi,
  profile: profileApi,
  evolutions: evolutionsApi,
  analytics: analyticsApi,
  exerciseAnalysis: exerciseAnalysisApi,
};
