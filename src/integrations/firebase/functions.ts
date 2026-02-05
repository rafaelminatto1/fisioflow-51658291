/**
 * Firebase Functions Integration
 * Utilitários para chamadas tipadas para as Cloud Functions da API
 *
 * @module integrations/firebase/functions
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app, getFirebaseAuth } from './app';
import { API_URLS } from '@/lib/api/v2/config';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Região padrão para as Cloud Functions */
const DEFAULT_REGION = 'southamerica-east1';

/** Timeout padrão para chamadas de função (em segundos) */
const DEFAULT_TIMEOUT = 60;

/** Firebase Functions instance (exported for callers that need the raw instance, e.g. httpsCallable) */
export const functionsInstance = getFunctions(app, DEFAULT_REGION);

/**
 * Map of HTTP function names to run.app URLs (Firebase Functions v2 onRequest).
 * When present, callFunctionHttp uses this URL instead of cloudfunctions.net.
 */
const HTTP_FUNCTION_URLS: Record<string, string> = {
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
};

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
  const url =
    HTTP_FUNCTION_URLS[functionName] ??
    `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let serverMessage = errorText;
      try {
        const errJson = JSON.parse(errorText) as { error?: string };
        if (errJson?.error) serverMessage = errJson.error;
      } catch {
        // keep errorText as-is
      }
      const err = new Error(`HTTP ${response.status}: ${serverMessage}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }

    const result = await response.json();
    return result as TResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FunctionCallError(functionName, error, message);
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
    eventId: string;
    totalRevenue: number;
    totalExpenses: number;
    transactionCount: number;
    [key: string]: unknown;
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

// ============================================================================
// APIs
// ============================================================================

/**
 * API de Pacientes no Firebase Functions
 */
export const patientsApi = {
  /**
   * Lista pacientes com filtros opcionais (uses HTTP V2 to avoid App Check issues)
   */
  list: (params: PatientApi.ListParams = {}): Promise<FunctionResponse<PatientApi.Patient[]>> =>
    callFunctionHttpWithResponse('listPatientsV2', params),

  /**
   * Obtém um paciente por ID (uses HTTP to avoid CORS issues)
   */
  get: (idOrParams: string | PatientApi.GetParams): Promise<PatientApi.Patient> => {
    const data = typeof idOrParams === 'string' ? { patientId: idOrParams } : idOrParams;
    return callFunctionHttp('getPatientHttp', data);
  },

  /**
   * Cria um novo paciente (usa URL HTTP direta para evitar CORS no cadastro rápido)
   */
  create: async (patient: PatientApi.CreateData): Promise<PatientApi.Patient> => {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new FunctionCallError('createPatientV2', 'No authentication token available');
    }
    const url = API_URLS.patients.create;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(patient),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new FunctionCallError('createPatientV2', new Error(`HTTP ${response.status}: ${errorText}`));
    }
    const result = await response.json() as { data: PatientApi.Patient };
    return result.data;
  },

  /**
   * Atualiza um paciente existente
   */
  update: async (patientId: string, updates: PatientApi.UpdateData): Promise<PatientApi.Patient> => {
    const res = await callFunctionHttp<{ patientId: string } & PatientApi.UpdateData, { data: PatientApi.Patient }>(
      'updatePatientV2',
      { patientId, ...updates }
    );
    return res.data;
  },

  /**
   * Remove um paciente
   */
  delete: (patientId: string): Promise<{ success: boolean }> =>
    callFunctionHttp('deletePatientV2', { patientId }),

  /**
   * Obtém estatísticas de um paciente (usa HTTP para evitar CORS)
   */
  getStats: async (patientId: string): Promise<PatientApi.Stats> => {
    const res = await callFunctionHttp<{ patientId: string }, { data: PatientApi.Stats }>(
      'getPatientStatsV2',
      { patientId }
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
    callFunctionHttp('searchSimilarExercisesV2', params).then((r: { data: ExerciseApi.Exercise[] }) => r.data),
  getCategories: async (): Promise<ExerciseApi.Category[]> => {
    const res = await callFunctionHttp<{}, { data: ExerciseApi.Category[] }>('getExerciseCategoriesV2', {});
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
 * API de Agendamentos no Firebase Functions
 */
export const appointmentsApi = {
  /**
   * Lista agendamentos com filtros opcionais
   */
  list: (params: AppointmentApi.ListParams = {}): Promise<FunctionResponse<AppointmentApi.Appointment[]>> =>
    callFunctionHttpWithResponse('listAppointments', params),

  /**
   * Obtém um agendamento por ID
   */
  get: async (appointmentId: string): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<{ appointmentId: string }, { data: AppointmentApi.Appointment }>(
      'getAppointmentV2',
      { appointmentId }
    );
    return res.data;
  },

  /**
   * Cria um novo agendamento
   */
  create: async (appointment: AppointmentApi.CreateData): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<AppointmentApi.CreateData, { data: AppointmentApi.Appointment }>(
      'createAppointmentV2',
      appointment
    );
    return res.data;
  },

  /**
   * Atualiza um agendamento existente
   */
  update: async (appointmentId: string, updates: AppointmentApi.UpdateData): Promise<AppointmentApi.Appointment> => {
    const res = await callFunctionHttp<{ appointmentId: string } & AppointmentApi.UpdateData, { data: AppointmentApi.Appointment }>(
      'updateAppointmentV2',
      { appointmentId, ...updates }
    );
    return res.data;
  },

  /**
   * Cancela um agendamento
   */
  cancel: (appointmentId: string, reason?: string): Promise<{ success: boolean }> =>
    callFunctionHttp('cancelAppointmentV2', { appointmentId, reason }),

  /**
   * Verifica conflitos de horário
   */
  checkTimeConflict: (params: AppointmentApi.CheckConflictParams): Promise<AppointmentApi.ConflictResult> =>
    callFunctionHttp('checkTimeConflictV2', params),
};

/**
 * API de Perfis no Firebase Functions
 */
export const profileApi = {
  /**
   * Obtém o perfil do usuário atual.
   * Usa callFunction (SDK) porque getProfile é callable e espera body { data }.
   */
  getCurrent: async (): Promise<ProfileApi.Profile> => {
    const res = await callFunction<Record<string, never>, { data: ProfileApi.Profile }>('getProfile', {});
    return res.data;
  },

  /**
   * Atualiza o perfil do usuário atual
   */
  update: (updates: ProfileApi.UpdateData): Promise<ProfileApi.Profile> =>
    callFunctionHttp('updateProfile', updates),
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Objeto consolidado com todas as APIs
 */
export const api = {
  patients: patientsApi,
  exercises: exercisesApi,
  financial: financialApi,
  clinical: clinicalApi,
  appointments: appointmentsApi,
  profile: profileApi,
};
