/**
 * useAppointmentData - Updated to use PostgreSQL via Firebase Functions
 *
 */
import { useQuery } from '@tanstack/react-query';
import {
    PATIENT_SELECT,
    devValidate as devValidatePatient,
    type PatientDBStandard
} from '@/lib/constants/patient-queries';
import {
    APPOINTMENT_SELECT,
    devValidateAppointment,
    type AppointmentDBStandard
} from '@/lib/constants/appointment-queries';
import { appointmentsApi, patientsApi } from '@/integrations/firebase/functions';
import { fisioLogger } from '@/lib/errors/logger';

export const useAppointmentData = (appointmentId: string | undefined) => {
    // Buscar dados do agendamento do PostgreSQL via Firebase Functions
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            devValidateAppointment(APPOINTMENT_SELECT.standard);

            fisioLogger.debug('Fetching appointment from PostgreSQL via API', { appointmentId }, 'useAppointmentData');
            const data = await appointmentsApi.get(appointmentId);
            fisioLogger.debug('Appointment loaded', {
                id: data.id,
                patient_id: data.patient_id,
                hasPatientId: !!data.patient_id
            }, 'useAppointmentData');

            return {
                id: data.id,
                ...data,
            } as AppointmentDBStandard;
        },
        enabled: !!appointmentId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    const patientId = appointment?.patient_id;

    // Log quando patientId muda
    if (appointment && import.meta.env.DEV) {
        fisioLogger.debug('Current state', {
            appointmentId: appointment.id,
            patientId: patientId,
            hasPatientId: !!patientId
        }, 'useAppointmentData');
    }

    // Buscar informações do paciente do PostgreSQL via Firebase Functions
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            if (!patientId) {
                fisioLogger.debug('No patientId provided, skipping patient query', undefined, 'useAppointmentData');
                throw new Error('ID do paciente não fornecido');
            }

            devValidatePatient(PATIENT_SELECT.standard);

            let response: { data?: PatientDBStandard | null } | null = null;
            try {
                response = await patientsApi.get(patientId);
            } catch (e) {
                // Fallback: getPatientHttp falha por CORS/rede; listPatientsV2 funciona — buscar na lista
                const isNetworkOrCors = (e as Error)?.message?.includes('Failed to fetch') || (e as Error)?.name === 'TypeError';
                if (isNetworkOrCors) {
                    const listRes = await patientsApi.list({ limit: 2000 });
                    const found = listRes.data?.find((p: { id?: string }) => p.id === patientId);
                    if (found) {
                        fisioLogger.debug('Patient loaded via list fallback', { id: found.id }, 'useAppointmentData');
                        const p = found as Record<string, unknown>;
                        return { id: p.id as string, full_name: (p.name ?? p.full_name ?? '') as string, ...p } as PatientDBStandard;
                    }
                }
                throw e;
            }

            if (!response?.data) {
                fisioLogger.warn('Patient not found in database', { patientId }, 'useAppointmentData');
                return null;
            }

            const data = response.data;
            fisioLogger.debug('Patient loaded', {
                id: data.id,
                name: data.name || data.full_name
            }, 'useAppointmentData');

            return {
                id: data.id,
                ...data,
            } as PatientDBStandard;
        },
        enabled: !!patientId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    return {
        appointment,
        patient,
        patientId,
        // isLoading deve ser true se o appointment ainda está carregando
        // OU se temos um appointment (e patientId) e o patient está carregando
        isLoading: appointmentLoading || (!!patientId && patientLoading),
        error: appointmentError || patientError,
        appointmentLoading,
        patientLoading,
        appointmentError,
        patientError
    };
};
