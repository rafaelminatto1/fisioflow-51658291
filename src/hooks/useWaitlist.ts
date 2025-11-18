import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  organization_id?: string;
  preferred_therapist_ids?: string[];
  preferred_days?: string[];
  preferred_time_slots?: string[];
  priority: 'normal' | 'high' | 'urgent';
  priority_reason?: string;
  status: 'active' | 'paused' | 'removed' | 'scheduled';
  last_notification_sent_at?: string;
  notification_count: number;
  last_offer_rejected_at?: string;
  rejection_count: number;
  notes?: string;
  added_at: string;
  removed_at?: string;
  scheduled_at?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface WaitlistOffer {
  id: string;
  waitlist_id: string;
  appointment_id: string;
  patient_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  slot_date: string;
  slot_time: string;
  therapist_id?: string;
  notification_sent_at: string;
  expiration_time: string;
  responded_at?: string;
  response_method?: string;
  rejection_reason?: string;
}

export const useWaitlist = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: waitlist = [], isLoading } = useQuery({
    queryKey: ['waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          *,
          patient:patients(id, name, phone, email)
        `)
        .order('priority', { ascending: false })
        .order('added_at', { ascending: true });

      if (error) throw error;
      return (data || []) as WaitlistEntry[];
    },
    enabled: !!user,
  });

  const addToWaitlist = useMutation({
    mutationFn: async (entry: Omit<WaitlistEntry, 'id' | 'added_at' | 'notification_count' | 'rejection_count' | 'status'>) => {
      const { data, error } = await supabase
        .from('waitlist')
        .insert([entry])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Paciente adicionado à lista de espera');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar à lista: ' + error.message);
    },
  });

  const updateWaitlist = useMutation({
    mutationFn: async ({ id, ...data }: Partial<WaitlistEntry> & { id: string }) => {
      const { error } = await supabase
        .from('waitlist')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Lista de espera atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar lista: ' + error.message);
    },
  });

  const removeFromWaitlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waitlist')
        .update({ status: 'removed', removed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Paciente removido da lista de espera');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover da lista: ' + error.message);
    },
  });

  return {
    waitlist: waitlist.filter(w => w.status === 'active'),
    allWaitlist: waitlist,
    loading: isLoading,
    addToWaitlist: addToWaitlist.mutate,
    updateWaitlist: updateWaitlist.mutate,
    removeFromWaitlist: removeFromWaitlist.mutate,
    isAdding: addToWaitlist.isPending,
    isUpdating: updateWaitlist.isPending,
    isRemoving: removeFromWaitlist.isPending,
  };
};

export const useWaitlistOffers = (waitlistId?: string) => {
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['waitlist-offers', waitlistId],
    queryFn: async () => {
      let query = supabase
        .from('waitlist_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (waitlistId) {
        query = query.eq('waitlist_id', waitlistId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as WaitlistOffer[];
    },
  });

  const createOffer = useMutation({
    mutationFn: async (offer: Omit<WaitlistOffer, 'id' | 'notification_sent_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('waitlist_offers')
        .insert([offer])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-offers'] });
      toast.success('Oferta de vaga enviada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar oferta: ' + error.message);
    },
  });

  const respondToOffer = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      rejection_reason 
    }: { 
      id: string; 
      status: 'accepted' | 'rejected'; 
      rejection_reason?: string;
    }) => {
      const { error } = await supabase
        .from('waitlist_offers')
        .update({
          status,
          responded_at: new Date().toISOString(),
          rejection_reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-offers'] });
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao responder oferta: ' + error.message);
    },
  });

  return {
    offers,
    loading: isLoading,
    createOffer: createOffer.mutate,
    respondToOffer: respondToOffer.mutate,
    isCreating: createOffer.isPending,
    isResponding: respondToOffer.isPending,
  };
};
