import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { executeWithRetry } from '@/lib/utils/async';

export const useAppointmentData = (appointmentId: string | undefined) => {
    // Buscar dados do agendamento do Supabase com retry e timeout
    const { data: appointment, isLoading: appointmentLoading, error: appointmentError } = useQuery({
        queryKey: ['appointment', appointmentId],
        queryFn: async () => {
            if (!appointmentId) throw new Error('ID do agendamento não fornecido');

            const result = await executeWithRetry(
                () =>
                    supabase
                        .from('appointments')
                        .select(`
              *,
              patients!left(
                id,
                full_name,
                phone,
                email,
                birth_date,
                status,
                created_at
              )
            `)
                        .eq('id', appointmentId)
                        .maybeSingle(),
                { timeoutMs: 8000, maxRetries: 3 }
            );
            // Retornar null em vez de undefined para evitar erro do React Query
            return result.data ?? null;
        },
        enabled: !!appointmentId,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });

    const patientId = appointment?.patient_id;

    // Buscar informações do paciente do Supabase com retry e timeout
    const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: async () => {
            if (!patientId) throw new Error('ID do paciente não fornecido');

            const result = await executeWithRetry(
                () =>
                    supabase
                        .from('patients')
                        .select('*')
                        .eq('id', patientId)
                        .maybeSingle(),
                { timeoutMs: 8000, maxRetries: 3 }
            );
            // Retornar null em vez de undefined para evitar erro do React Query
            return result.data ?? null;
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
        isLoading: appointmentLoading || patientLoading,
        error: appointmentError || patientError,
        appointmentLoading,
        patientLoading,
        appointmentError,
        patientError
    };
};
