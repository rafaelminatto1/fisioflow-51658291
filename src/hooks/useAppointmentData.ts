/**
 * useAppointmentData - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('appointments') → Firestore collection 'appointments'
 * - supabase.from('patients') → Firestore collection 'patients'
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
import { db } from '@/integrations/firebase/app';
import { doc, getDoc } from 'firebase/firestore';


export const useAppointmentData = (appointmentId: string | undefined) => {
    // Buscar dados do agendamento do Firebase com retry e timeout
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            devValidateAppointment(APPOINTMENT_SELECT.standard);

            const docRef = doc(db, 'appointments', appointmentId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
                return null;
            }

            const data = snapshot.data();
            return {
                id: snapshot.id,
                ...data,
            } as AppointmentDBStandard;
        },
        enabled: !!appointmentId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    const patientId = appointment?.patient_id;

    // Buscar informações do paciente do Firebase com retry e timeout
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            if (!patientId) throw new Error('ID do paciente não fornecido');

            devValidatePatient(PATIENT_SELECT.standard);

            const docRef = doc(db, 'patients', patientId);
            const snapshot = await getDoc(docRef);

            if (!snapshot.exists()) {
                return null;
            }

            const data = snapshot.data();
            return {
                id: snapshot.id,
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
