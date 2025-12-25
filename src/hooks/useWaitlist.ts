import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  preferred_days: string[];
  preferred_periods: string[];
  preferred_therapist_id?: string;
  priority: 'normal' | 'high' | 'urgent';
  status: 'waiting' | 'offered' | 'scheduled' | 'removed';
  refusal_count: number;
  offered_slot?: string;
  offered_at?: string;
  offer_expires_at?: string;
  notes?: string;
  created_at: string;
  // Relações
  patient?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  preferred_therapist?: {
    id: string;
    name: string;
  };
}

interface AddToWaitlistInput {
  patient_id: string;
  preferred_days: string[];
  preferred_periods: string[];
  preferred_therapist_id?: string;
  priority?: 'normal' | 'high' | 'urgent';
  notes?: string;
}

interface OfferSlotInput {
  waitlist_id: string;
  appointment_slot: string;
}

const DAY_NAMES: Record<string, string> = {
  MON: 'Segunda',
  TUE: 'Terça',
  WED: 'Quarta',
  THU: 'Quinta',
  FRI: 'Sexta',
  SAT: 'Sábado',
  SUN: 'Domingo',
};

const PERIOD_NAMES: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
};

export const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'destructive', order: 0 },
  high: { label: 'Alta', color: 'warning', order: 1 },
  normal: { label: 'Normal', color: 'secondary', order: 2 },
} as const;

// Hook para listar a lista de espera
export function useWaitlist(filters?: {
  status?: string;
  priority?: string;
}) {
  return useQuery({
    queryKey: ['waitlist', filters],
    queryFn: async () => {
      let query = supabase
        .from('waitlist')
        .select(`
          *,
          patient:patients(id, name, phone, email),
          preferred_therapist:profiles(id, name)
        `)
        .order('created_at', { ascending: true });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else if (!filters?.status) {
        query = query.eq('status', 'waiting');
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Ordenar por prioridade (urgent > high > normal) e depois por data
      const sorted = (data || []).sort((a, b) => {
        const priorityDiff = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG].order - 
                            PRIORITY_CONFIG[b.priority as keyof typeof PRIORITY_CONFIG].order;
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      return sorted as WaitlistEntry[];
    },
  });
}

// Hook para obter contagem por status
export function useWaitlistCounts() {
  return useQuery({
    queryKey: ['waitlist', 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist')
        .select('status, priority');

      if (error) throw error;

      const counts = {
        total: data?.length || 0,
        waiting: 0,
        offered: 0,
        scheduled: 0,
        urgent: 0,
        high: 0,
      };

      data?.forEach(item => {
        if (item.status === 'waiting') counts.waiting++;
        if (item.status === 'offered') counts.offered++;
        if (item.status === 'scheduled') counts.scheduled++;
        if (item.priority === 'urgent' && item.status === 'waiting') counts.urgent++;
        if (item.priority === 'high' && item.status === 'waiting') counts.high++;
      });

      return counts;
    },
  });
}

// Hook para adicionar à lista de espera
export function useAddToWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddToWaitlistInput) => {
      // Verificar se paciente já está na lista
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id')
        .eq('patient_id', input.patient_id)
        .eq('status', 'waiting')
        .single();

      if (existing) {
        throw new Error('Paciente já está na lista de espera');
      }

      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          ...input,
          status: 'waiting',
          refusal_count: 0,
        })
        .select(`
          *,
          patient:patients(id, name, phone)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success(`${data.patient?.name} adicionado à lista de espera`);
    },
    onError: (error: any) => {
      console.error('Erro ao adicionar à lista:', error);
      toast.error(error.message || 'Erro ao adicionar à lista de espera');
    },
  });
}

// Hook para remover da lista de espera
export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'removed', removed_at: new Date().toISOString() })
        .eq('id', waitlistId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Removido da lista de espera');
    },
    onError: (error) => {
      console.error('Erro ao remover da lista:', error);
      toast.error('Erro ao remover da lista de espera');
    },
  });
}

// Hook para oferecer vaga
export function useOfferSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OfferSlotInput) => {
      const { waitlist_id, appointment_slot } = input;

      // Buscar entrada da lista
      const { data: entry, error: fetchError } = await supabase
        .from('waitlist')
        .select('*, patient:patients(id, name, phone)')
        .eq('id', waitlist_id)
        .eq('status', 'waiting')
        .single();

      if (fetchError || !entry) {
        throw new Error('Entrada não encontrada ou já processada');
      }

      // Atualizar status
      const { data, error } = await supabase
        .from('waitlist')
        .update({
          status: 'offered',
          offered_slot: appointment_slot,
          offered_at: new Date().toISOString(),
          offer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', waitlist_id)
        .select()
        .single();

      if (error) throw error;

      // Registrar oferta
      await supabase.from('waitlist_offers').insert({
        waitlist_id,
        patient_id: entry.patient_id,
        offered_slot: appointment_slot,
        response: 'pending',
      });

      return { ...data, patient: entry.patient };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success(`Vaga oferecida para ${data.patient?.name}`);
    },
    onError: (error: any) => {
      console.error('Erro ao oferecer vaga:', error);
      toast.error(error.message || 'Erro ao oferecer vaga');
    },
  });
}

// Hook para aceitar oferta
export function useAcceptOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      const { data, error } = await supabase
        .from('waitlist')
        .update({
          status: 'scheduled',
        })
        .eq('id', waitlistId)
        .eq('status', 'offered')
        .select()
        .single();

      if (error) throw error;

      // Atualizar histórico de ofertas
      await supabase
        .from('waitlist_offers')
        .update({ response: 'accepted', responded_at: new Date().toISOString() })
        .eq('waitlist_id', waitlistId)
        .eq('response', 'pending');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Oferta aceita! Agendamento confirmado.');
    },
    onError: (error) => {
      console.error('Erro ao aceitar oferta:', error);
      toast.error('Erro ao aceitar oferta');
    },
  });
}

// Hook para recusar oferta
export function useRejectOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      // Buscar entrada atual
      const { data: current, error: fetchError } = await supabase
        .from('waitlist')
        .select('refusal_count')
        .eq('id', waitlistId)
        .single();

      if (fetchError) throw fetchError;

      const newRefusalCount = (current?.refusal_count || 0) + 1;
      const maxRefusals = 3;

      // Se atingiu máximo de recusas, remover da lista
      const newStatus = newRefusalCount >= maxRefusals ? 'removed' : 'waiting';

      const { data, error } = await supabase
        .from('waitlist')
        .update({
          status: newStatus,
          offered_slot: null,
          offered_at: null,
          offer_expires_at: null,
          refusal_count: newRefusalCount,
        })
        .eq('id', waitlistId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar histórico de ofertas
      await supabase
        .from('waitlist_offers')
        .update({ response: 'rejected', responded_at: new Date().toISOString() })
        .eq('waitlist_id', waitlistId)
        .eq('response', 'pending');

      return { ...data, wasRemoved: newStatus === 'removed' };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      if (data.wasRemoved) {
        toast.info('Paciente removido da lista após 3 recusas');
      } else {
        toast.success('Oferta recusada. Paciente retornou à lista.');
      }
    },
    onError: (error) => {
      console.error('Erro ao recusar oferta:', error);
      toast.error('Erro ao recusar oferta');
    },
  });
}

// Hook para atualizar prioridade
export function useUpdatePriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      waitlistId, 
      priority 
    }: { 
      waitlistId: string; 
      priority: 'normal' | 'high' | 'urgent';
    }) => {
      const { data, error } = await supabase
        .from('waitlist')
        .update({ priority })
        .eq('id', waitlistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Prioridade atualizada');
    },
    onError: (error) => {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Erro ao atualizar prioridade');
    },
  });
}

// Hook para listar ofertas feitas
export function useWaitlistOffers(patientId?: string) {
  return useQuery({
    queryKey: ['waitlist-offers', patientId],
    queryFn: async () => {
      let query = supabase
        .from('waitlist_offers')
        .select(`
          *,
          waitlist:waitlist(
            id,
            patient_id,
            patient:patients(id, name, phone)
          )
        `)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

// Helper para formatar preferências
export function formatPreferences(entry: WaitlistEntry): string {
  const days = entry.preferred_days
    .map(d => DAY_NAMES[d] || d)
    .join(', ');
  
  const periods = entry.preferred_periods
    .map(p => PERIOD_NAMES[p] || p)
    .join(', ');

  return `${days} - ${periods}`;
}

// Helper para verificar se uma vaga é compatível
export function isSlotCompatible(
  entry: WaitlistEntry,
  slotDate: Date
): boolean {
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][slotDate.getDay()];
  const hour = slotDate.getHours();
  
  let period: string;
  if (hour < 12) period = 'morning';
  else if (hour < 18) period = 'afternoon';
  else period = 'evening';

  return entry.preferred_days.includes(dayOfWeek) && 
         entry.preferred_periods.includes(period);
}

// Encontrar candidatos para uma vaga cancelada
export function findCandidatesForSlot(
  waitlist: WaitlistEntry[],
  slotDate: Date,
  limit: number = 5
): WaitlistEntry[] {
  return waitlist
    .filter(entry => {
      if (entry.status !== 'waiting') return false;
      if (entry.refusal_count >= 3) return false;
      return isSlotCompatible(entry, slotDate);
    })
    .slice(0, limit);
}
