import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment } from '@/types/appointment';

// Main hook for fetching data
export const useAppointments = () => {
    return useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:patients(name),
          professional:profiles(full_name)
        `)
                .order('appointment_date', { ascending: true });

            if (error) throw error;
            return data as unknown as Appointment[];
        },
    });
};

export const useCreateAppointment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (appointment: Partial<Appointment>) => {
            const { data, error } = await supabase
                .from('appointments')
                .insert([appointment])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Agendamento criado com sucesso');
        },
        onError: (error: Error) => {
            toast.error('Erro ao criar agendamento: ' + error.message);
        }
    });
};

export const useUpdateAppointment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ appointmentId, updates }: { appointmentId: string; updates: Partial<Appointment> }) => {
            const { data, error } = await supabase
                .from('appointments')
                .update(updates)
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Agendamento atualizado com sucesso');
        },
        onError: (error: Error) => {
            toast.error('Erro ao atualizar agendamento: ' + error.message);
        }
    });
};

export const useDeleteAppointment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (appointmentId: string) => {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', appointmentId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Agendamento excluído com sucesso');
        },
        onError: (error: Error) => {
            toast.error('Erro ao excluir agendamento: ' + error.message);
        }
    });
};

export const useRescheduleAppointment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ appointmentId, appointment_date, appointment_time, duration }: { appointmentId: string, appointment_date: string, appointment_time: string, duration: number }) => {
            // Recalculate end_time
            const endTime = new Date(new Date(`${appointment_date}T${appointment_time}`).getTime() + duration * 60000);
            const endTimeString = endTime.toTimeString().slice(0, 5);

            const { data, error } = await supabase
                .from('appointments')
                .update({
                    appointment_date: appointment_date, // Legacy
                    appointment_time: appointment_time, // Legacy
                    date: appointment_date,
                    start_time: appointment_time,
                    end_time: endTimeString
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Agendamento reagendado com sucesso');
        },
        onError: (error: Error) => {
            toast.error('Erro ao reagendar agendamento: ' + error.message);
        }
    });
};
