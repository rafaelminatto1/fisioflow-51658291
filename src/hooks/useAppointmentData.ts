/**
 * useAppointmentData - Updated to use PostgreSQL via Firebase Functions
 *
 */

import { useQuery } from '@tanstack/react-query';


import {
    APPOINTMENT_SELECT,
    devValidateAppointment
} from '@/lib/constants/appointment-queries';
import { appointmentsApi, patientsApi } from '@/lib/api/workers-client';
import { fisioLogger } from '@/lib/errors/logger';
import { type Patient, type AppointmentUnified } from '@/types';
import { mapPatientDBToApp } from '@/utils/patientDataMappers';

export const useAppointmentData = (
    appointmentId: string | undefined,
    options?: {
        initialPatientId?: string;
        initialPatientData?: Partial<Patient>;
    }
) => {
    // Buscar dados do agendamento do PostgreSQL via Firebase Functions
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            devValidateAppointment(APPOINTMENT_SELECT.standard);

            fisioLogger.debug('Fetching appointment from Workers API', { appointmentId }, 'useAppointmentData');
            const response = await appointmentsApi.get(appointmentId);
            const data = response.data;

            // Check if patient data is embedded
            const patientData = data.patient;

            fisioLogger.debug('Appointment loaded', {
                id: data.id,
                patient_id: data.patientId,
                hasPatientId: !!data.patientId,
                hasEmbeddedPatient: !!patientData
            }, 'useAppointmentData');

            // Map to AppointmentUnified (or compatible) structure
            return {
                ...data,
                id: data.id,
                patientId: (data.patient_id || data.patientId) as string,
                patient_id: (data.patient_id || data.patientId) as string,
                patientName: (data.patient?.full_name || data.patient?.name) as string,
                date: (data.appointment_date || data.date) as string,
                time: (data.appointment_time || data.time) as string,
                // Ensure patient is passed through and mapped if present
                patient: data.patient ? mapPatientDBToApp(data.patient) : undefined
            } as unknown as AppointmentUnified;
        },
        enabled: !!appointmentId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    // Use initialPatientId from navigation state if available, otherwise fall back to appointment data
    const patientId = options?.initialPatientId || appointment?.patientId || appointment?.patient_id;

    // Log quando patientId muda
    if ((appointment || options?.initialPatientId) && import.meta.env.DEV) {
        fisioLogger.debug('Current state', {
            appointmentId: appointment?.id,
            patientId: patientId,
            hasPatientId: !!patientId,
            hasEmbeddedPatient: !!appointment?.patient,
            fromNavigation: !!options?.initialPatientId
        }, 'useAppointmentData');
    }

    // Buscar informações do paciente do PostgreSQL via Firebase Functions
    // Se vier embutido no appointment, usa como initialData e evita fetch imediato
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            if (!patientId) {
                fisioLogger.debug('No patientId provided, skipping patient query', undefined, 'useAppointmentData');
                throw new Error('ID do paciente não fornecido');
            }

            // Use extended selection to ensure we get gender, alerts etc.
            // devValidatePatient(PATIENT_SELECT.extended); 


            // If we somehow got here but have the data (should likely hit cache/initialData first), return it
            if (appointment?.patient && appointment.patient.id === patientId) {
                return mapPatientDBToApp(appointment.patient);
            }

            if (options?.initialPatientData && options.initialPatientData.id === patientId) {
                return options.initialPatientData as Patient;
            }

            try {
                // 1. Try direct get first (most efficient)
            const response = await patientsApi.get(patientId);
            const data = response?.data;
            if (data) return mapPatientDBToApp(data);
                throw new Error(`Patient API returned empty for ID: ${patientId}`);
            } catch (err) {
                fisioLogger.warn(`[useAppointmentData] Direct fetch failed for ${patientId}`, { error: err }, 'useAppointmentData');

                // 2. Smart Fallback: Search by name if available
                const patientName = appointment?.patientName || appointment?.patient?.full_name || options?.initialPatientData?.full_name;
                if (patientName) {
                    try {
                        fisioLogger.debug(`[useAppointmentData] Attempting fallback by name: ${patientName}`, undefined, 'useAppointmentData');
                        const searchResult = await patientsApi.list({
                            search: patientName,
                            limit: 10
                        });
                        const found = searchResult.data.find((p: any) =>
                            p.id === patientId || p.objectID === patientId || p.uuid === patientId
                        );
                        if (found) {
                            fisioLogger.info(`[useAppointmentData] Found patient via name search fallback: ${patientName}`, { patientId }, 'useAppointmentData');
                            return mapPatientDBToApp(found);
                        }
                    } catch (searchErr) {
                        fisioLogger.warn(`[useAppointmentData] Name search fallback failed`, { error: searchErr }, 'useAppointmentData');
                    }
                }

                // 3. Fallback: List recent patients and filter manually
                // Sometimes IDs might be indexed differently (objectID vs id vs uuid)
                try {
                    fisioLogger.debug('[useAppointmentData] Attempting fallback by listing recent patients', undefined, 'useAppointmentData');
                    const fallbackData = await patientsApi.list({
                        limit: 100,
                        status: 'Em Tratamento'
                    });

                    const found = fallbackData.data.find((p: any) =>
                        p.id === patientId || p.objectID === patientId || p.uuid === patientId
                    );

                    if (found) {
                        fisioLogger.info('[useAppointmentData] Found patient via list fallback', { patientId }, 'useAppointmentData');
                        return mapPatientDBToApp(found);
                    }
                } catch (fallbackErr) {
                    fisioLogger.error('[useAppointmentData] All patient fallbacks failed', { error: fallbackErr, patientId }, 'useAppointmentData');
                }

                // If all else fails, rethrow to trigger UI error state
                throw err;
            }
        },
        enabled: !!patientId,
        initialData: (appointment?.patient || options?.initialPatientData) as Patient | undefined,
        initialDataUpdatedAt: (appointment || options?.initialPatientData) ? Date.now() : undefined,
        retry: 2, // Reducing retries slightly since we have internal fallbacks
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 5,
    });

    return {
        appointment,
        patient,
        patientId,
        // isLoading deve ser true se:
        // 1. Appointment está carregando
        // 2. OU temos patientId (via prop ou appointment) e patient está carregando
        // MAS se tivermos initialData (via prop ou embedded), patient e appointment podem não estar "loading" visualmente
        isLoading: appointmentLoading || (!!patientId && patientLoading && !patient),
        error: appointmentError || patientError,
        appointmentLoading,
        patientLoading,
        appointmentError,
        patientError
    };
};
