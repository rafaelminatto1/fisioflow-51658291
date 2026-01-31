/**
 * Firebase Functions Integration
 * Utilitários para chamadas tipadas para as Cloud Functions da API
 *
 * @module integrations/firebase/functions
 */

import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { app } from './app';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Região padrão para as Cloud Functions */
const DEFAULT_REGION = 'southamerica-east1';

/** Timeout padrão para chamadas de função (em segundos) */
const DEFAULT_TIMEOUT = 60;

const functionsInstance = getFunctions(app, DEFAULT_REGION);

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

// ============================================================================
// API TYPES
// ============================================================================

/**
 * Tipos para API de Pacientes
 */
export namespace PatientApi {
  export interface ListParams {
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
   * Lista pacientes com filtros opcionais
   */
  list: (params: PatientApi.ListParams = {}): Promise<FunctionResponse<PatientApi.Patient[]>> =>
    callFunctionWithResponse('listPatients', params),

  /**
   * Obtém um paciente por ID
   */
  get: (idOrParams: string | PatientApi.GetParams): Promise<PatientApi.Patient> => {
    const data = typeof idOrParams === 'string' ? { patientId: idOrParams } : idOrParams;
    return callFunction('getPatient', data);
  },

  /**
   * Cria um novo paciente
   */
  create: (patient: PatientApi.CreateData): Promise<PatientApi.Patient> =>
    callFunction('createPatient', patient),

  /**
   * Atualiza um paciente existente
   */
  update: (patientId: string, updates: PatientApi.UpdateData): Promise<PatientApi.Patient> =>
    callFunction('updatePatient', { patientId, ...updates }),

  /**
   * Remove um paciente
   */
  delete: (patientId: string): Promise<{ success: boolean }> =>
    callFunction('deletePatient', { patientId }),

  /**
   * Obtém estatísticas de um paciente
   */
  getStats: (patientId: string): Promise<PatientApi.Stats> =>
    callFunction('getPatientStats', { patientId }),
};

/**
 * API de Exercícios no Firebase Functions
 */
export const exercisesApi = {
  /**
   * Lista exercícios com filtros opcionais
   */
  list: (params: ExerciseApi.ListParams = {}): Promise<FunctionResponse<ExerciseApi.Exercise[]>> =>
    callFunctionWithResponse('listExercises', params),

  /**
   * Obtém um exercício por ID
   */
  get: (exerciseId: string): Promise<ExerciseApi.Exercise> =>
    callFunction('getExercise', { exerciseId }),

  /**
   * Lista todas as categorias de exercícios
   */
  getCategories: (): Promise<ExerciseApi.Category[]> =>
    callFunction('getExerciseCategories', {}),

  /**
   * Obtém exercícios prescritos para um paciente
   */
  getPrescribedExercises: (patientId: string): Promise<ExerciseApi.PrescribedExercise[]> =>
    callFunction('getPrescribedExercises', { patientId }),

  /**
   * Registra a realização de um exercício
   */
  logExercise: (data: ExerciseApi.LogExerciseData): Promise<{ success: boolean; logId?: string }> =>
    callFunction('logExercise', data),

  /**
   * Cria um novo exercício
   */
  create: (exercise: ExerciseApi.CreateData): Promise<ExerciseApi.Exercise> =>
    callFunction('createExercise', exercise),

  /**
   * Atualiza um exercício existente
   */
  update: (id: string, updates: ExerciseApi.UpdateData): Promise<ExerciseApi.Exercise> =>
    callFunction('updateExercise', { id, ...updates }),

  /**
   * Remove um exercício
   */
  delete: (id: string): Promise<{ success: boolean }> =>
    callFunction('deleteExercise', { id }),

  /**
   * Mescla exercícios duplicados
   */
  merge: (keepId: string, mergeIds: string[]): Promise<{ success: boolean; mergedCount?: number }> =>
    callFunction('mergeExercises', { keepId, mergeIds }),
};

/**
 * API Financeira (Transações) no Firebase Functions
 */
export const financialApi = {
  /**
   * Lista transações com paginação
   */
  list: (limit?: number, offset?: number): Promise<FunctionResponse<FinancialApi.Transaction[]>> =>
    callFunctionWithResponse('listTransactions', { limit, offset }),

  /**
   * Cria uma nova transação
   */
  create: (transaction: FinancialApi.CreateData): Promise<FinancialApi.Transaction> =>
    callFunction('createTransaction', transaction),

  /**
   * Atualiza uma transação existente
   */
  update: (transactionId: string, updates: FinancialApi.UpdateData): Promise<FinancialApi.Transaction> =>
    callFunction('updateTransaction', { transactionId, ...updates }),

  /**
   * Remove uma transação
   */
  delete: (transactionId: string): Promise<{ success: boolean }> =>
    callFunction('deleteTransaction', { transactionId }),

  /**
   * Busca transação por agendamento
   */
  findByAppointment: (appointmentId: string): Promise<FinancialApi.Transaction | null> =>
    callFunction('findTransactionByAppointmentId', { appointmentId }),

  /**
   * Obtém relatório de um evento
   */
  getEventReport: (eventoId: string): Promise<FinancialApi.EventReport> =>
    callFunction('getEventReport', { eventoId }),
};

/**
 * API Clínica (Prontuários e Sessões) no Firebase Functions
 */
export const clinicalApi = {
  /**
   * Obtém prontuários de um paciente
   */
  getPatientRecords: (
    patientId: string,
    type?: string,
    limit?: number
  ): Promise<FunctionResponse<ClinicalApi.MedicalRecord[]>> =>
    callFunctionWithResponse('getPatientRecords', { patientId, type, limit }),

  /**
   * Cria um novo prontuário
   */
  createMedicalRecord: (data: ClinicalApi.CreateMedicalRecordData): Promise<ClinicalApi.MedicalRecord> =>
    callFunction('createMedicalRecord', data),

  /**
   * Atualiza um prontuário existente
   */
  updateMedicalRecord: (recordId: string, updates: ClinicalApi.UpdateMedicalRecordData): Promise<ClinicalApi.MedicalRecord> =>
    callFunction('updateMedicalRecord', { recordId, ...updates }),

  /**
   * Remove um prontuário
   */
  deleteMedicalRecord: (recordId: string): Promise<{ success: boolean }> =>
    callFunction('deleteMedicalRecord', { recordId }),

  /**
   * Lista sessões de tratamento de um paciente
   */
  listTreatmentSessions: (patientId: string, limit?: number): Promise<ClinicalApi.TreatmentSession[]> =>
    callFunction('listTreatmentSessions', { patientId, limit }),

  /**
   * Cria uma nova sessão de tratamento
   */
  createTreatmentSession: (data: ClinicalApi.CreateTreatmentSessionData): Promise<ClinicalApi.TreatmentSession> =>
    callFunction('createTreatmentSession', data),

  /**
   * Obtém registros de dor de um paciente
   */
  getPainRecords: (patientId: string): Promise<ClinicalApi.PainRecord[]> =>
    callFunction('getPainRecords', { patientId }),

  /**
   * Salva um registro de dor
   */
  savePainRecord: (data: ClinicalApi.SavePainRecordData): Promise<ClinicalApi.PainRecord> =>
    callFunction('savePainRecord', data),
};

/**
 * API de Agendamentos no Firebase Functions
 */
export const appointmentsApi = {
  /**
   * Lista agendamentos com filtros opcionais
   */
  list: (params: AppointmentApi.ListParams = {}): Promise<FunctionResponse<AppointmentApi.Appointment[]>> =>
    callFunctionWithResponse('listAppointments', params),

  /**
   * Obtém um agendamento por ID
   */
  get: (appointmentId: string): Promise<AppointmentApi.Appointment> =>
    callFunction('getAppointment', { appointmentId }),

  /**
   * Cria um novo agendamento
   */
  create: (appointment: AppointmentApi.CreateData): Promise<AppointmentApi.Appointment> =>
    callFunction('createAppointment', appointment),

  /**
   * Atualiza um agendamento existente
   */
  update: (appointmentId: string, updates: AppointmentApi.UpdateData): Promise<AppointmentApi.Appointment> =>
    callFunction('updateAppointment', { appointmentId, ...updates }),

  /**
   * Cancela um agendamento
   */
  cancel: (appointmentId: string, reason?: string): Promise<{ success: boolean }> =>
    callFunction('cancelAppointment', { appointmentId, reason }),

  /**
   * Verifica conflitos de horário
   */
  checkTimeConflict: (params: AppointmentApi.CheckConflictParams): Promise<AppointmentApi.ConflictResult> =>
    callFunction('checkTimeConflict', params),
};

/**
 * API de Perfis no Firebase Functions
 */
export const profileApi = {
  /**
   * Obtém o perfil do usuário atual
   */
  getCurrent: (): Promise<ProfileApi.Profile> =>
    callFunction('getProfile', {}),

  /**
   * Atualiza o perfil do usuário atual
   */
  update: (updates: ProfileApi.UpdateData): Promise<ProfileApi.Profile> =>
    callFunction('updateProfile', updates),
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
