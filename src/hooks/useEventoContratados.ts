import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {

  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query as firestoreQuery,
  where,
  orderBy,
  getDoc,
} from '@/integrations/firebase/app';
import { useToast } from '@/hooks/use-toast';
import { EventoContratadoCreate, EventoContratadoUpdate } from '@/lib/validations/evento-contratado';
import { db } from '@/integrations/firebase/app';

export interface EventoContratado {
  id: string;
  evento_id: string;
  contratado_id: string;
  funcao?: string | null;
  valor_acordado?: number | null;
  horario_inicio: string;
  horario_fim: string;
  status_pagamento?: 'PENDENTE' | 'PAGO';
  created_at?: string;
  updated_at?: string;
}

type EventoSnapshot = {
  id: string;
  nome?: string;
  data_inicio?: string;
  data_fim?: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

const convertDoc = <T>(docSnap: { id: string; data: () => Record<string, unknown> }): T =>
  ({ id: docSnap.id, ...docSnap.data() } as T);

const buildRange = (evento: EventoSnapshot, horario_inicio?: string, horario_fim?: string) => {
  const startDate = evento.data_inicio;
  const endDate = evento.data_fim;
  if (!startDate || !endDate) return null;

  const startTime = horario_inicio || evento.hora_inicio || '00:00';
  const endTime = horario_fim || evento.hora_fim || '23:59';

  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);

  return { start, end };
};

const rangesOverlap = (a: { start: Date; end: Date }, b: { start: Date; end: Date }) =>
  a.start <= b.end && b.start <= a.end;

async function checkContratadoConflict(params: {
  contratadoId: string;
  eventoId: string;
  horario_inicio: string;
  horario_fim: string;
}) {
  const eventoRef = doc(db, 'eventos', params.eventoId);
  const eventoSnap = await getDoc(eventoRef);
  if (!eventoSnap.exists()) {
    throw new Error('Evento não encontrado para verificação de conflito.');
  }
  const evento = convertDoc<EventoSnapshot>(eventoSnap);
  const targetRange = buildRange(evento, params.horario_inicio, params.horario_fim);
  if (!targetRange) {
    throw new Error('Evento sem datas definidas para verificação de conflito.');
  }

  const q = firestoreQuery(
    collection(db, 'evento_contratados'),
    where('contratado_id', '==', params.contratadoId),
    orderBy('created_at', 'desc')
  );
  const snapshot = await getDocs(q);
  const assignments = snapshot.docs.map(convertDoc<EventoContratado>);

  for (const assignment of assignments) {
    if (assignment.evento_id === params.eventoId) continue;

    const otherEventoRef = doc(db, 'eventos', assignment.evento_id);
    const otherSnap = await getDoc(otherEventoRef);
    if (!otherSnap.exists()) continue;
    const otherEvento = convertDoc<EventoSnapshot>(otherSnap);

    const otherRange = buildRange(otherEvento, assignment.horario_inicio, assignment.horario_fim);
    if (!otherRange) continue;

    if (rangesOverlap(targetRange, otherRange)) {
      const nome = otherEvento.nome || 'Outro evento';
      throw new Error(`Conflito de horário: contratado já alocado em ${nome}.`);
    }
  }
}

export function useEventoContratados(eventoId: string) {
  return useQuery({
    queryKey: ['evento-contratados', eventoId],
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'evento_contratados'),
        where('evento_id', '==', eventoId),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertDoc<EventoContratado>);
    },
    enabled: !!eventoId,
  });
}

export function useCreateEventoContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: EventoContratadoCreate) => {
      const existingQ = firestoreQuery(
        collection(db, 'evento_contratados'),
        where('evento_id', '==', data.evento_id),
        where('contratado_id', '==', data.contratado_id)
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        throw new Error('Este contratado já está vinculado ao evento.');
      }

      await checkContratadoConflict({
        contratadoId: data.contratado_id,
        eventoId: data.evento_id,
        horario_inicio: data.horario_inicio,
        horario_fim: data.horario_fim,
      });

      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'evento_contratados'), {
        ...data,
        created_at: now,
        updated_at: now,
      });
      const snapshot = await getDoc(docRef);
      return convertDoc<EventoContratado>(snapshot);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', data.evento_id] });
      toast({
        title: 'Contratado vinculado!',
        description: 'Contratado adicionado ao evento com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao vincular contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEventoContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; data: EventoContratadoUpdate; eventoId: string; contratadoId: string }) => {
      const { id, data, eventoId, contratadoId } = params;
      const hasTime = data.horario_inicio || data.horario_fim;
      if (hasTime && data.horario_inicio && data.horario_fim) {
        await checkContratadoConflict({
          contratadoId,
          eventoId,
          horario_inicio: data.horario_inicio,
          horario_fim: data.horario_fim,
        });
      }

      const docRef = doc(db, 'evento_contratados', id);
      await updateDoc(docRef, { ...data, updated_at: new Date().toISOString() });
      const snapshot = await getDoc(docRef);
      return { ...convertDoc<EventoContratado>(snapshot), evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', data.evento_id] });
      toast({
        title: 'Contratado atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEventoContratado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await deleteDoc(doc(db, 'evento_contratados', id));
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', eventoId] });
      toast({
        title: 'Contratado removido!',
        description: 'Vínculo removido com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover contratado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
