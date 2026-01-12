import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment } from '@/types/appointment';
import { VerifiedAppointmentSchema, VerifiedAppointment } from '@/schemas/appointment';
import { reportError } from '@/lib/errorReporting';

// Main hook for fetching data
export const useAppointments = () => {
    const query = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:patients(name:full_name),
          professional:profiles(full_name)
        `)
                .order('appointment_date', { ascending: true });

            if (error) {
                reportError(error, { userMessage: "Erro ao carregar agendamentos" });
                throw error;
            }

            // Map Supabase response to Appointment type securely using Zod
            const mappedAppointments = (data || []).map((item: any) => {
                const result = VerifiedAppointmentSchema.safeParse(item);

                if (!result.success) {
                    // Log validation error but don't crash the app for the user
                    console.warn(`[useAppointments] Invalid appointment data details:`, {
                        id: item.id,
                        errors: result.error.format()
                    });
                    return null;
                }

                return result.data;
            }).filter(Boolean); // Remove failed mappings

            return mappedAppointments as unknown as Appointment[];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 24 * 60 * 60 * 1000, // 24 hours
    });

    return {
        ...query,
        // Helper to determine if we are showing cached data
        isFromCache: query.isStale && !query.isLoading && !!query.data,
        cacheTimestamp: query.dataUpdatedAt
    };
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
        onMutate: async (newAppointment) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['appointments'] });

            // Snapshot the previous value
            const previousAppointments = queryClient.getQueryData(['appointments']);

            // Optimistically update to the new value
            queryClient.setQueryData(['appointments'], (old: Appointment[] = []) => {
                const optimisticAppointment = {
                    ...newAppointment,
                    id: 'temp-' + Date.now(),
                    patientName: 'Carregando...', // Will be filled by backend or local lookup if smart
                    therapistName: '...',
                    date: new Date(newAppointment.date as any || new Date()), // Simplified fallback
                } as unknown as Appointment;
                return [...old, optimisticAppointment];
            });

            // Return a context object with the snapshotted value
            return { previousAppointments };
        },
        onError: (err, _newAppointment, context) => {
            queryClient.setQueryData(['appointments'], context?.previousAppointments);
            reportError(err, { userMessage: "Erro ao criar agendamento" });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onSuccess: () => {
            toast.success('Agendamento criado com sucesso');
        },
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
        onMutate: async ({ appointmentId, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['appointments'] });
            const previousAppointments = queryClient.getQueryData(['appointments']);

            queryClient.setQueryData(['appointments'], (old: Appointment[] = []) => {
                return old.map((appointment) =>
                    appointment.id === appointmentId ? { ...appointment, ...updates } : appointment
                );
            });

            return { previousAppointments };
        },
        onError: (err, _variables, context) => {
            queryClient.setQueryData(['appointments'], context?.previousAppointments);
            reportError(err, { userMessage: "Erro ao atualizar agendamento" });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onSuccess: () => {
            toast.success('Agendamento atualizado com sucesso');
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
        onMutate: async (appointmentId) => {
            await queryClient.cancelQueries({ queryKey: ['appointments'] });
            const previousAppointments = queryClient.getQueryData(['appointments']);

            queryClient.setQueryData(['appointments'], (old: Appointment[] = []) => {
                return old.filter((appointment) => appointment.id !== appointmentId);
            });

            return { previousAppointments };
        },
        onError: (err, _variables, context) => {
            queryClient.setQueryData(['appointments'], context?.previousAppointments);
            reportError(err, { userMessage: "Erro ao excluir agendamento" });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onSuccess: () => {
            toast.success('Agendamento excluído com sucesso');
        }
    });
};

export const useRescheduleAppointment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ appointmentId, appointment_date, appointment_time, duration }: { appointmentId: string, appointment_date: string, appointment_time: string, duration: number }) => {
            // Use the Robust RPC function
            const { data, error } = await supabase.rpc('reschedule_appointment', {
                p_appointment_id: appointmentId,
                p_date: appointment_date, // Pass as string (YYYY-MM-DD), Postgres casts to DATE
                p_start_time: appointment_time, // Pass as string (HH:MM), Postgres casts to TIME
                p_duration_minutes: duration
            });

            if (error) throw error;
            return data;
        },
        onMutate: async ({ appointmentId, appointment_date, appointment_time }) => {
            await queryClient.cancelQueries({ queryKey: ['appointments'] });
            const previousAppointments = queryClient.getQueryData(['appointments']);

            queryClient.setQueryData(['appointments'], (old: Appointment[] = []) => {
                return (old || []).map((appointment) => {
                    if (appointment.id === appointmentId) {
                        // Construct new date object carefully for optimistic UI update
                        const newDateTimeStr = `${appointment_date}T${appointment_time}`;
                        return {
                            ...appointment,
                            appointment_date,
                            appointment_time,
                            // Update the parsed date object so the UI updates position immediately
                            date: new Date(newDateTimeStr)
                        };
                    }
                    return appointment;
                });
            });

            return { previousAppointments };
        },
        onError: (err, _variables, context) => {
            queryClient.setQueryData(['appointments'], context?.previousAppointments);
            reportError(err, {
                userMessage: "Falha ao reagendar",
                context: { action: 'reschedule', variables: _variables }
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
        },
        onSuccess: () => {
            toast.success('Agendamento reagendado com sucesso (Sincronizado)');
        },
    });
};
