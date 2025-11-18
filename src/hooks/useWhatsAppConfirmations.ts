import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppMessage {
  id: string;
  appointment_id?: string;
  patient_id?: string;
  message_type: 'reminder_24h' | 'reminder_2h' | 'confirmation' | 'cancellation' | 'rescheduling';
  message_content: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  response_received_at?: string;
  response_content?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'responded';
}

export const useWhatsAppConfirmations = (appointmentId?: string) => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['whatsapp-messages', appointmentId],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_messages')
        .select('*')
        .order('sent_at', { ascending: false });

      if (appointmentId) {
        query = query.eq('appointment_id', appointmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WhatsAppMessage[];
    },
  });

  const { data: pendingConfirmations = [], isLoading: loadingPending } = useQuery({
    queryKey: ['pending-confirmations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients(id, name, phone)
        `)
        .eq('confirmation_status', 'pending')
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .order('appointment_date')
        .order('appointment_time');

      if (error) throw error;
      return data || [];
    },
  });

  const sendReminder = useMutation({
    mutationFn: async ({
      appointmentId,
      patientId,
      messageType,
      messageContent,
    }: {
      appointmentId: string;
      patientId: string;
      messageType: WhatsAppMessage['message_type'];
      messageContent: string;
    }) => {
      // Inserir registro da mensagem
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert([{
          appointment_id: appointmentId,
          patient_id: patientId,
          message_type: messageType,
          message_content: messageContent,
          status: 'sent',
        }]);

      if (error) throw error;

      // Atualizar appointment com timestamp do lembrete
      const updateField = messageType === 'reminder_24h' 
        ? 'reminder_sent_24h' 
        : 'reminder_sent_2h';

      await supabase
        .from('appointments')
        .update({ [updateField]: new Date().toISOString() })
        .eq('id', appointmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      toast.success('Lembrete enviado via WhatsApp');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar lembrete: ' + error.message);
    },
  });

  const confirmAppointment = useMutation({
    mutationFn: async ({
      appointmentId,
      method = 'manual',
    }: {
      appointmentId: string;
      method?: 'whatsapp' | 'phone' | 'email' | 'manual';
    }) => {
      const { error } = await supabase
        .from('appointments')
        .update({
          confirmation_status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          confirmation_method: method,
        })
        .eq('id', appointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-confirmations'] });
      toast.success('Sessão confirmada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar sessão: ' + error.message);
    },
  });

  return {
    messages,
    pendingConfirmations,
    loading: isLoading || loadingPending,
    sendReminder: sendReminder.mutate,
    confirmAppointment: confirmAppointment.mutate,
    isSending: sendReminder.isPending,
    isConfirming: confirmAppointment.isPending,
  };
};
