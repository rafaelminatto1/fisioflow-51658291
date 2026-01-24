/**
 * Firebase Functions Integration
 * Utilitários para chamadas tipadas para as Cloud Functions da API
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './app';

const functions = getFunctions(app, 'southamerica-east1');

/**
 * Interface genérica para resposta de função
 */
export interface FunctionResponse<T> {
    data: T;
    error?: string;
    total?: number;
}

/**
 * Auxiliar para chamar funções https
 */
export async function callFunction<TRequest, TResponse>(
    functionName: string,
    data: TRequest
): Promise<TResponse> {
    const callable = httpsCallable<TRequest, TResponse>(functions, functionName);
    const result = await callable(data);
    return result.data;
}

/**
 * API de Pacientes no Firebase Functions
 */
export const patientsApi = {
    list: (params: { status?: string; search?: string; limit?: number; offset?: number }) =>
        callFunction<any, any>('listPatients', params),

    get: (idOrParams: string | { patientId?: string; profileId?: string }) => {
        const data = typeof idOrParams === 'string' ? { patientId: idOrParams } : idOrParams;
        return callFunction<any, any>('getPatient', data);
    },

    create: (patient: any) =>
        callFunction<any, any>('createPatient', patient),

    update: (patientId: string, updates: any) =>
        callFunction<any, any>('updatePatient', { patientId, ...updates }),

    delete: (patientId: string) =>
        callFunction<any, any>('deletePatient', { patientId }),

    getStats: (patientId: string) =>
        callFunction<any, any>('getPatientStats', { patientId }),
};

/**
 * API de Agendamentos no Firebase Functions
 */

/**
 * API de Exercícios no Firebase Functions
 */
export const exercisesApi = {
    list: (params: { category?: string; difficulty?: string; search?: string; limit?: number; offset?: number }) =>
        callFunction<any, any>('listExercises', params),

    get: (exerciseId: string) =>
        callFunction<any, any>('getExercise', { exerciseId }),

    getCategories: () =>
        callFunction<any, any>('getExerciseCategories', {}),

    getPrescribedExercises: (patientId: string) =>
        callFunction<any, any>('getPrescribedExercises', { patientId }),

    logExercise: (data: { patientId: string; prescriptionId: string; difficulty: number; notes?: string }) =>
        callFunction<any, any>('logExercise', data),

    create: (exercise: any) =>
        callFunction<any, any>('createExercise', exercise),

    update: (id: string, updates: any) =>
        callFunction<any, any>('updateExercise', { id, ...updates }),

    delete: (id: string) =>
        callFunction<any, any>('deleteExercise', { id }),

    merge: (keepId: string, mergeIds: string[]) =>
        callFunction<any, any>('mergeExercises', { keepId, mergeIds }),
};

/**
 * API Financeira (Transações) no Firebase Functions
 */
export const financialApi = {
    list: (limit?: number, offset?: number) =>
        callFunction<any, any>('listTransactions', { limit, offset }),

    create: (transaction: any) =>
        callFunction<any, any>('createTransaction', transaction),

    update: (transactionId: string, updates: any) =>
        callFunction<any, any>('updateTransaction', { transactionId, ...updates }),

    delete: (transactionId: string) =>
        callFunction<any, any>('deleteTransaction', { transactionId }),

    findByAppointment: (appointmentId: string) =>
        callFunction<any, any>('findTransactionByAppointmentId', { appointmentId }),

    getEventReport: (eventoId: string) =>
        callFunction<any, any>('getEventReport', { eventoId }),
};

/**
 * API Clínica (Prontuários e Sessões) no Firebase Functions
 */
export const clinicalApi = {
    getPatientRecords: (patientId: string, type?: string, limit?: number) =>
        callFunction<any, any>('getPatientRecords', { patientId, type, limit }),

    createMedicalRecord: (data: { patientId: string; type: string; title: string; content: string; recordDate?: string }) =>
        callFunction<any, any>('createMedicalRecord', data),

    updateMedicalRecord: (recordId: string, updates: any) =>
        callFunction<any, any>('updateMedicalRecord', { recordId, ...updates }),

    deleteMedicalRecord: (recordId: string) =>
        callFunction<any, any>('deleteMedicalRecord', { recordId }),

    listTreatmentSessions: (patientId: string, limit?: number) =>
        callFunction<any, any>('listTreatmentSessions', { patientId, limit }),

    createTreatmentSession: (data: any) =>
        callFunction<any, any>('createTreatmentSession', data),

    getPainRecords: (patientId: string) =>
        callFunction<any, any>('getPainRecords', { patientId }),

    savePainRecord: (data: { patientId: string; level: number; type: string; bodyPart: string; notes?: string }) =>
        callFunction<any, any>('savePainRecord', data),
};

/**
 * API de Agendamentos no Firebase Functions
 */
export const appointmentsApi = {
    list: (params: { dateFrom?: string; dateTo?: string; therapistId?: string; status?: string; patientId?: string; limit?: number; offset?: number }) =>
        callFunction<any, any>('listAppointments', params),

    get: (appointmentId: string) =>
        callFunction<any, any>('getAppointment', { appointmentId }),

    create: (appointment: any) =>
        callFunction<any, any>('createAppointment', appointment),

    update: (appointmentId: string, updates: any) =>
        callFunction<any, any>('updateAppointment', { appointmentId, ...updates }),

    cancel: (appointmentId: string, reason?: string) =>
        callFunction<any, any>('cancelAppointment', { appointmentId, reason }),

    checkTimeConflict: (params: { therapistId: string; date: string; startTime: string; endTime: string; excludeAppointmentId?: string }) =>
        callFunction<any, any>('checkTimeConflict', params),
};

/**
 * API de Perfis no Firebase Functions
 */
export const profileApi = {
    getCurrent: () =>
        callFunction<any, any>('getProfile', {}),

    update: (updates: any) =>
        callFunction<any, any>('updateProfile', updates),
};
