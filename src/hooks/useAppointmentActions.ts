import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAppointmentActions = () => {
  const queryClient = useQueryClient();

  const confirmAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'confirmado' })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento confirmado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar agendamento: ' + error.message);
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelado' })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento cancelado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar agendamento: ' + error.message);
    },
  });

  const rescheduleAppointment = useMutation({
    mutationFn: async ({ 
      appointmentId, 
      newDate, 
      newTime 
    }: { 
      appointmentId: string; 
      newDate: string; 
      newTime: string;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          appointment_date: newDate,
          appointment_time: newTime,
          status: 'reagendado'
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
      toast.error('Erro ao reagendar: ' + error.message);
    },
  });

  const completeAppointment = useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'concluido' })
        .eq('id', appointmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Consulta marcada como concluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao concluir consulta: ' + error.message);
    },
  });

  return {
    confirmAppointment: confirmAppointment.mutate,
    cancelAppointment: cancelAppointment.mutate,
    rescheduleAppointment: rescheduleAppointment.mutate,
    completeAppointment: completeAppointment.mutate,
    isConfirming: confirmAppointment.isPending,
    isCanceling: cancelAppointment.isPending,
    isRescheduling: rescheduleAppointment.isPending,
    isCompleting: completeAppointment.isPending,
  };
};
