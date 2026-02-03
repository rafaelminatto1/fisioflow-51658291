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



export const useAppointmentData = (appointmentId: string | undefined) => {
    // Buscar dados do agendamento do PostgreSQL via Firebase Functions
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            devValidateAppointment(APPOINTMENT_SELECT.standard);

            console.log('[useAppointmentData] Fetching appointment from PostgreSQL via API:', appointmentId);
            const data = await appointmentsApi.get(appointmentId);
            console.log('[useAppointmentData] Appointment loaded:', {
                id: data.id,
                patient_id: data.patient_id,
                hasPatientId: !!data.patient_id
            });

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
        console.log('[useAppointmentData] Current state:', {
            appointmentId: appointment.id,
            patientId: patientId,
            hasPatientId: !!patientId
        });
    }

    // Buscar informações do paciente do PostgreSQL via Firebase Functions
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            if (!patientId) {
                console.warn('[useAppointmentData] No patientId provided, skipping patient query');
                throw new Error('ID do paciente não fornecido');
            }

            devValidatePatient(PATIENT_SELECT.standard);

            const response = await patientsApi.get(patientId);

            if (!response.data) {
                console.error('[useAppointmentData] Patient not found in database:', patientId);
                return null;
            }

            const data = response.data;
            console.log('[useAppointmentData] Patient loaded:', {
                id: data.id,
                name: data.name || data.full_name
            });

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
