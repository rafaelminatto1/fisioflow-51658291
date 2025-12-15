import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type CommunicationType = Database['public']['Enums']['communication_type'];
type CommunicationStatus = Database['public']['Enums']['communication_status'];

export interface Communication {
  id: string;
  type: CommunicationType;
  recipient: string;
  patient_id: string | null;
  appointment_id: string | null;
  subject: string | null;
  body: string;
  status: CommunicationStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
  organization_id: string;
  patient?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export function useCommunications(filters?: { channel?: string; status?: string }) {
  return useQuery({
    queryKey: ['communications', filters],
    queryFn: async () => {
      let query = supabase
        .from('communication_logs')
        .select(`
          *,
          patient:patients(id, name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('type', filters.channel as CommunicationType);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as CommunicationStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Communication[];
    },
  });
}

export function useCommunicationStats() {
  return useQuery({
    queryKey: ['communication-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('type, status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        sent: data?.filter(c => c.status === 'enviado').length || 0,
        delivered: data?.filter(c => c.status === 'entregue').length || 0,
        failed: data?.filter(c => c.status === 'falha').length || 0,
        pending: data?.filter(c => c.status === 'pendente').length || 0,
        byChannel: {
          email: data?.filter(c => c.type === 'email').length || 0,
          whatsapp: data?.filter(c => c.type === 'whatsapp').length || 0,
          sms: data?.filter(c => c.type === 'sms').length || 0,
        },
      };

      return stats;
    },
  });
}

interface SendCommunicationData {
  type: CommunicationType;
  patient_id: string;
  recipient: string;
  subject?: string;
  body: string;
}

export function useSendCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendCommunicationData) => {
      // Get organization_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single();

      if (!profile?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const { data: result, error } = await supabase
        .from('communication_logs')
        .insert({
          type: data.type,
          patient_id: data.patient_id,
          recipient: data.recipient,
          subject: data.subject || null,
          body: data.body,
          status: 'pendente' as CommunicationStatus,
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      toast.success('Comunicação enviada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar comunicação: ' + error.message);
    },
  });
}

export function useDeleteCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('communication_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats'] });
      toast.success('Comunicação excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}

export function useResendCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('communication_logs')
        .update({ status: 'pendente' as CommunicationStatus, error_message: null })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success('Comunicação reenviada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao reenviar: ' + error.message);
    },
  });
}

// Helper to translate status to Portuguese display
export function getStatusLabel(status: CommunicationStatus): string {
  const labels: Record<CommunicationStatus, string> = {
    pendente: 'Pendente',
    enviado: 'Enviado',
    entregue: 'Entregue',
    lido: 'Lido',
    falha: 'Falha',
  };
  return labels[status] || status;
}

// Helper to translate type to Portuguese display
export function getTypeLabel(type: CommunicationType): string {
  const labels: Record<CommunicationType, string> = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    push: 'Push',
  };
  return labels[type] || type;
}
