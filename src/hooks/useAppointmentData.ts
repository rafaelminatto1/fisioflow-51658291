/**
 * useAppointmentData - Updated to use PostgreSQL via Firebase Functions
 *
 */

import { useQuery } from '@tanstack/react-query';


import {
    APPOINTMENT_SELECT,
    devValidateAppointment
} from '@/lib/constants/appointment-queries';
import { appointmentsApi, patientsApi } from '@/integrations/firebase/functions';
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

            fisioLogger.debug('Fetching appointment from PostgreSQL via API', { appointmentId }, 'useAppointmentData');
            const data = await appointmentsApi.get(appointmentId);

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
                const data = await patientsApi.get(patientId);
                return mapPatientDBToApp(data);
            } catch (err) {
                console.warn(`[useAppointmentData] Direct fetch failed for ${patientId}, trying fallbacks...`, err);

                // 2. Smart Fallback: Search by name if available (O(1) lookup effectively)
                const patientName = appointment?.patientName;
                if (patientName) {
                    try {
                        const searchResult = await patientsApi.list({
                            search: patientName,
                            limit: 5 // Keep it tight, we expect exact name match or close to it
                        });
                        const found = searchResult.data.find((p: any) =>
                            p.id === patientId || p.objectID === patientId
                        );
                        if (found) {
                            console.log(`[useAppointmentData] Found patient via name search fallback: ${patientName}`);
                            return mapPatientDBToApp(found);
                        }
                    } catch (searchErr) {
                        console.warn(`[useAppointmentData] Name search fallback failed`, searchErr);
                    }
                }

                // 3. Last Resort Fallback: List recent/active patients
                // Reduced limit from 2000 to 100 for performance. 
                // If the patient isn't in the top 100 active/recent, they likely need manual refresh or there's a bigger issue.
                try {
                    const fallbackData = await patientsApi.list({
                        limit: 100,
                        status: 'Em Tratamento' // Prioritize active patients
                    });

                    const found = fallbackData.data.find((p: any) =>
                        p.id === patientId || p.objectID === patientId
                    );

                    if (found) {
                        console.log('[useAppointmentData] Found patient via list fallback');
                        return mapPatientDBToApp(found);
                    }
                } catch (fallbackErr) {
                    console.error('[useAppointmentData] All fallbacks failed', fallbackErr);
                }

                // If all else fails, throw the original error to let React Query handle retry/error state
                // OR return initialData if we have it (handled by initialData prop, but query fails)
                throw err;
            }
        },
        enabled: !!patientId,
        initialData: (appointment?.patient || options?.initialPatientData) as Patient | undefined,
        initialDataUpdatedAt: (appointment || options?.initialPatientData) ? Date.now() : undefined,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Se veio do appointment ou navigation, considera fresco por 5 min
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
