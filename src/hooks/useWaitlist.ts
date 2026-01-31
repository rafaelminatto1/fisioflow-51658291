/**
 * useWaitlist - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('waitlist') → Firestore collection 'waitlist'
 * - supabase.from('waitlist_offers') → Firestore collection 'waitlist_offers'
 * - Joins com patients são feitos client-side
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query as firestoreQuery, where, orderBy, limit, getDocsFromCache, getDocsFromServer } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { db } from '@/integrations/firebase/app';



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
  const queryResult = useQuery({
    queryKey: ['waitlist', filters],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'waitlist'),
        orderBy('created_at', 'asc')
      );

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        q = firestoreQuery(
          collection(db, 'waitlist'),
          where('status', '==', filters.status),
          orderBy('created_at', 'asc')
        );
      } else if (!filters?.status) {
        q = firestoreQuery(
          collection(db, 'waitlist'),
          where('status', '==', 'waiting'),
          orderBy('created_at', 'asc')
        );
      }

      // Apply priority filter
      if (filters?.priority) {
        q = firestoreQuery(
          collection(db, 'waitlist'),
          where('priority', '==', filters.priority),
          orderBy('created_at', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const waitlistData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WaitlistEntry[];

      // Fetch patient data for each entry
      const entriesWithPatients = await Promise.all(
        waitlistData.map(async (entry) => {
          if (entry.patient_id) {
            const patientRef = doc(db, 'patients', entry.patient_id);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
              const p = patientSnap.data();
              return {
                ...entry,
                patient: {
                  id: patientSnap.id,
                  name: p.name || p.full_name || 'Desconhecido',
                  phone: p.phone,
                  email: p.email,
                },
              };
            }
          }
          return entry;
        })
      );

      // Ordenar por prioridade (urgent > high > normal) e depois por data
      const sorted = entriesWithPatients.sort((a: WaitlistEntry, b: WaitlistEntry) => {
        const priorityDiff = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG].order -
          PRIORITY_CONFIG[b.priority as keyof typeof PRIORITY_CONFIG].order;
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      return sorted;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    ...queryResult,
    isFromCache: queryResult.isStale && !queryResult.isLoading && !!queryResult.data,
    cacheTimestamp: queryResult.dataUpdatedAt
  };
}

// Hook para obter contagem por status
export function useWaitlistCounts() {
  return useQuery({
    queryKey: ['waitlist', 'counts'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'waitlist'));
      const data = snapshot.docs.map(doc => doc.data());

      const counts = {
        total: data.length || 0,
        waiting: 0,
        offered: 0,
        scheduled: 0,
        urgent: 0,
        high: 0,
      };

      data.forEach((item: { status: string; priority?: string }) => {
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
      const existingQ = firestoreQuery(
        collection(db, 'waitlist'),
        where('patient_id', '==', input.patient_id),
        where('status', '==', 'waiting'),
        limit(1)
      );
      const existingSnap = await getDocs(existingQ);

      if (!existingSnap.empty) {
        throw new Error('Paciente já está na lista de espera');
      }

      const waitlistData = {
        ...input,
        status: 'waiting' as const,
        refusal_count: 0,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'waitlist'), waitlistData);

      // Fetch patient data for response
      const patientRef = doc(db, 'patients', input.patient_id);
      const patientSnap = await getDoc(patientRef);

      const result = {
        id: docRef.id,
        ...waitlistData,
        patient: patientSnap.exists() ? {
          id: patientSnap.id,
          name: patientSnap.data().name || patientSnap.data().full_name,
          phone: patientSnap.data().phone,
        } : undefined,
      };

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success(`${data.patient?.name} adicionado à lista de espera`);
    },
    onError: (error: unknown) => {
      logger.error('Erro ao adicionar à lista de espera', error, 'useWaitlist');
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar à lista de espera');
    },
  });
}

// Hook para remover da lista de espera
export function useRemoveFromWaitlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      const docRef = doc(db, 'waitlist', waitlistId);
      await updateDoc(docRef, {
        status: 'removed',
        removed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Removido da lista de espera');
    },
    onError: (error: unknown) => {
      logger.error('Erro ao remover da lista de espera', error, 'useWaitlist');
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
      const entryRef = doc(db, 'waitlist', waitlist_id);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists() || entrySnap.data()?.status !== 'waiting') {
        throw new Error('Entrada não encontrada ou já processada');
      }

      const entryData = entrySnap.data();

      // Fetch patient data
      let patientData = null;
      if (entryData.patient_id) {
        const patientRef = doc(db, 'patients', entryData.patient_id);
        const patientSnap = await getDoc(patientRef);
        if (patientSnap.exists()) {
          const p = patientSnap.data();
          patientData = {
            id: patientSnap.id,
            name: p.name || p.full_name,
            phone: p.phone,
          };
        }
      }

      // Atualizar status
      await updateDoc(entryRef, {
        status: 'offered',
        offered_slot: appointment_slot,
        offered_at: new Date().toISOString(),
        offer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      // Registrar oferta
      await addDoc(collection(db, 'waitlist_offers'), {
        patient_id: entryData.patient_id,
        appointment_id: waitlist_id,
        offered_slot: appointment_slot,
        response: 'pending',
        status: 'pending',
        expiration_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });

      return {
        id: waitlist_id,
        ...entryData,
        patient: patientData,
      };
    },
    onSuccess: (data: WaitlistEntry & { patient?: { name?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success(`Vaga oferecida para ${data.patient?.name}`);
    },
    onError: (error: unknown) => {
      logger.error('Erro ao oferecer vaga', error, 'useWaitlist');
      toast.error(error instanceof Error ? error.message : 'Erro ao oferecer vaga');
    },
  });
}

// Hook para aceitar oferta
export function useAcceptOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (waitlistId: string) => {
      const docRef = doc(db, 'waitlist', waitlistId);

      await updateDoc(docRef, {
        status: 'scheduled',
        updated_at: new Date().toISOString(),
      });

      // Atualizar histórico de ofertas
      const offersQ = firestoreQuery(
        collection(db, 'waitlist_offers'),
        where('appointment_id', '==', waitlistId),
        where('response', '==', 'pending')
      );
      const offersSnap = await getDocs(offersQ);

      if (!offersSnap.empty) {
        await updateDoc(offersSnap.docs[0].ref, {
          response: 'accepted',
          responded_at: new Date().toISOString(),
        });
      }

      return { id: waitlistId, status: 'scheduled' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Oferta aceita! Agendamento confirmado.');
    },
    onError: (error: unknown) => {
      logger.error('Erro ao aceitar oferta', error, 'useWaitlist');
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
      const docRef = doc(db, 'waitlist', waitlistId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        throw new Error('Entrada não encontrada');
      }

      const current = snap.data();
      const newRefusalCount = ((current.refusal_count as number | undefined) ?? 0) + 1;
      const maxRefusals = 3;

      // Se atingiu máximo de recusas, remover da lista
      const newStatus = newRefusalCount >= maxRefusals ? 'removed' : 'waiting';

      await updateDoc(docRef, {
        status: newStatus,
        offered_slot: null,
        offered_at: null,
        offer_expires_at: null,
        refusal_count: newRefusalCount,
        updated_at: new Date().toISOString(),
      });

      // Atualizar histórico de ofertas
      const offersQ = firestoreQuery(
        collection(db, 'waitlist_offers'),
        where('appointment_id', '==', waitlistId),
        where('response', '==', 'pending')
      );
      const offersSnap = await getDocs(offersQ);

      if (!offersSnap.empty) {
        await updateDoc(offersSnap.docs[0].ref, {
          response: 'rejected',
          responded_at: new Date().toISOString(),
        });
      }

      return {
        id: waitlistId,
        ...current,
        refusal_count: newRefusalCount,
        status: newStatus,
        wasRemoved: newStatus === 'removed',
      };
    },
    onSuccess: (data: WaitlistEntry & { wasRemoved?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      if (data.wasRemoved) {
        toast.info('Paciente removido da lista após 3 recusas');
      } else {
        toast.success('Oferta recusada. Paciente retornou à lista.');
      }
    },
    onError: (error: unknown) => {
      logger.error('Erro ao recusar oferta', error, 'useWaitlist');
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
      const docRef = doc(db, 'waitlist', waitlistId);
      await updateDoc(docRef, { priority });
      return { id: waitlistId, priority };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      toast.success('Prioridade atualizada');
    },
    onError: (error: unknown) => {
      logger.error('Erro ao atualizar prioridade', error, 'useWaitlist');
      toast.error('Erro ao atualizar prioridade');
    },
  });
}

// Hook para listar ofertas feitas
export function useWaitlistOffers(patientId?: string) {
  return useQuery({
    queryKey: ['waitlist-offers', patientId],
    queryFn: async () => {
      let q = firestoreQuery(
        collection(db, 'waitlist_offers'),
        orderBy('created_at', 'desc')
      );

      if (patientId) {
        q = firestoreQuery(
          collection(db, 'waitlist_offers'),
          where('patient_id', '==', patientId),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);

      // Fetch waitlist and patient data for each offer
      const offersWithDetails = await Promise.all(
        snapshot.docs.map(async (docSnapshot) => {
          const offer = { id: docSnapshot.id, ...docSnapshot.data() };

          if (offer.appointment_id) {
            const waitlistRef = doc(db, 'waitlist', offer.appointment_id);
            const waitlistSnap = await getDoc(waitlistRef);

            if (waitlistSnap.exists()) {
              const waitlist = waitlistSnap.data();

              // Fetch patient
              let patient = null;
              if (waitlist.patient_id) {
                const patientRef = doc(db, 'patients', waitlist.patient_id);
                const patientSnap = await getDoc(patientRef);
                if (patientSnap.exists()) {
                  const p = patientSnap.data();
                  patient = {
                    id: patientSnap.id,
                    name: p.name || p.full_name,
                    phone: p.phone,
                  };
                }
              }

              return {
                ...offer,
                waitlist: {
                  id: waitlistSnap.id,
                  patient_id: waitlist.patient_id,
                  patient,
                },
              };
            }
          }

          return offer;
        })
      );

      return offersWithDetails;
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
