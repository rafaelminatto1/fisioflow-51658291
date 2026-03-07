/**
 * useWaitlist - Rewritten to use Workers API (schedulingApi.waitlist + schedulingApi.waitlistOffers)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { schedulingApi, WaitlistEntry } from '@/lib/api/workers-client';

export type { WaitlistEntry };

const DAY_NAMES: Record<string, string> = {
  MON: 'Segunda', TUE: 'Terça', WED: 'Quarta',
  THU: 'Quinta', FRI: 'Sexta', SAT: 'Sábado', SUN: 'Domingo',
};

const PERIOD_NAMES: Record<string, string> = {
  morning: 'Manhã', afternoon: 'Tarde', evening: 'Noite',
};

export const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'destructive', order: 0 },
  high: { label: 'Alta', color: 'warning', order: 1 },
  normal: { label: 'Normal', color: 'secondary', order: 2 },
} as const;

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

export function useWaitlist(filters?: { status?: string; priority?: string }) {
  const queryResult = useQuery({
    queryKey: ['waitlist', filters],
    queryFn: async () => {
      const res = await schedulingApi.waitlist.list({
        status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
        priority: filters?.priority,
      });
      const list = (res?.data ?? res ?? []) as WaitlistEntry[];

      // Sort by priority
      return list.sort((a, b) => {
        const pa = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 2;
        const pb = PRIORITY_CONFIG[b.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  return {
    ...queryResult,
    isFromCache: queryResult.isStale && !queryResult.isLoading && !!queryResult.data,
    cacheTimestamp: queryResult.dataUpdatedAt,
  };
}

export function useWaitlistCounts() {
  return useQuery({
    queryKey: ['waitlist', 'counts'],
    queryFn: async () => {
      const res = await schedulingApi.waitlist.list();
      const data = (res?.data ?? res ?? []) as WaitlistEntry[];

      const counts = { total: data.length, waiting: 0, offered: 0, scheduled: 0, urgent: 0, high: 0 };
      data.forEach((item) => {
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

export function useAddToWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddToWaitlistInput) => {
      const res = await schedulingApi.waitlist.create({
        ...input,
        status: 'waiting',
        priority: input.priority ?? 'normal',
        refusal_count: 0,
      });
      return (res?.data ?? res) as WaitlistEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Adicionado à lista de espera');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar à lista de espera');
    },
  });
}

export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      await schedulingApi.waitlist.update(waitlistId, { status: 'removed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Removido da lista de espera');
    },
    onError: () => {
      toast.error('Erro ao remover da lista de espera');
    },
  });
}

export function useOfferSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OfferSlotInput) => {
      const { waitlist_id, appointment_slot } = input;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await schedulingApi.waitlist.update(waitlist_id, {
        status: 'offered',
        offered_slot: appointment_slot,
        offered_at: new Date().toISOString(),
        offer_expires_at: expiresAt,
      });

      await schedulingApi.waitlistOffers.create({
        waitlist_id,
        offered_slot: appointment_slot,
        response: 'pending',
        status: 'pending',
        expiration_time: expiresAt,
      });

      return { id: waitlist_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Vaga oferecida com sucesso');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao oferecer vaga');
    },
  });
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      await schedulingApi.waitlist.update(waitlistId, { status: 'scheduled' });
      return { id: waitlistId, status: 'scheduled' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Oferta aceita! Agendamento confirmado.');
    },
    onError: () => {
      toast.error('Erro ao aceitar oferta');
    },
  });
}

export function useRejectOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      // Get current data
      const res = await schedulingApi.waitlist.list();
      const all = (res?.data ?? res ?? []) as WaitlistEntry[];
      const entry = all.find(e => e.id === waitlistId);
      const refusalCount = ((entry?.refusal_count as number | undefined) ?? 0) + 1;
      const maxRefusals = 3;
      const newStatus = refusalCount >= maxRefusals ? 'removed' : 'waiting';

      await schedulingApi.waitlist.update(waitlistId, {
        status: newStatus,
        refusal_count: refusalCount,
        offered_slot: undefined,
        offered_at: undefined,
        offer_expires_at: undefined,
      });

      return { id: waitlistId, refusal_count: refusalCount, status: newStatus, wasRemoved: newStatus === 'removed' };
    },
    onSuccess: (data: { wasRemoved?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      if (data.wasRemoved) {
        toast.info('Paciente removido da lista após 3 recusas');
      } else {
        toast.success('Oferta recusada. Paciente retornou à lista.');
      }
    },
    onError: () => {
      toast.error('Erro ao recusar oferta');
    },
  });
}

export function useUpdatePriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ waitlistId, priority }: { waitlistId: string; priority: 'normal' | 'high' | 'urgent' }) => {
      await schedulingApi.waitlist.update(waitlistId, { priority });
      return { id: waitlistId, priority };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Prioridade atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar prioridade');
    },
  });
}

export function useWaitlistOffers(waitlistId?: string) {
  return useQuery({
    queryKey: ['waitlist-offers', waitlistId],
    queryFn: async () => {
      const res = await schedulingApi.waitlistOffers.list(waitlistId);
      return (res?.data ?? res ?? []) as unknown[];
    },
  });
}

export function formatPreferences(entry: WaitlistEntry): string {
  const days = (entry.preferred_days ?? []).map(d => DAY_NAMES[d] || d).join(', ');
  const periods = (entry.preferred_periods ?? []).map(p => PERIOD_NAMES[p] || p).join(', ');
  return `${days} - ${periods}`;
}

export function isSlotCompatible(entry: WaitlistEntry, slotDate: Date): boolean {
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][slotDate.getDay()];
  const hour = slotDate.getHours();
  let period: string;
  if (hour < 12) period = 'morning';
  else if (hour < 18) period = 'afternoon';
  else period = 'evening';

  return (entry.preferred_days ?? []).includes(dayOfWeek) &&
    (entry.preferred_periods ?? []).includes(period);
}

export function findCandidatesForSlot(
  waitlist: WaitlistEntry[],
  slotDate: Date,
  limit: number = 5
): WaitlistEntry[] {
  return waitlist
    .filter(entry => {
      if (entry.status !== 'waiting') return false;
      if ((entry.refusal_count ?? 0) >= 3) return false;
      return isSlotCompatible(entry, slotDate);
    })
    .slice(0, limit);
}
