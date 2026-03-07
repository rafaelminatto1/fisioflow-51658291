/**
 * useEventoContratados - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  eventoContratadosApi,
  eventosApi,
  type EventoContratado,
  type Evento,
} from '@/lib/api/workers-client';
import { EventoContratadoCreate, EventoContratadoUpdate } from '@/lib/validations/evento-contratado';

export type { EventoContratado };

type EventoSnapshot = Pick<Evento, 'id' | 'nome' | 'data_inicio' | 'data_fim' | 'hora_inicio' | 'hora_fim'>;

const buildRange = (
  evento: EventoSnapshot,
  horarioInicio?: string | null,
  horarioFim?: string | null,
) => {
  if (!evento.data_inicio || !evento.data_fim) return null;
  const startTime = horarioInicio || evento.hora_inicio || '00:00';
  const endTime = horarioFim || evento.hora_fim || '23:59';
  const start = new Date(`${evento.data_inicio}T${startTime}:00`);
  const end = new Date(`${evento.data_fim}T${endTime}:00`);
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
  const eventoRes = await eventosApi.get(params.eventoId);
  const evento = (eventoRes?.data ?? null) as EventoSnapshot | null;
  if (!evento) throw new Error('Evento não encontrado para verificação de conflito.');

  const targetRange = buildRange(evento, params.horario_inicio, params.horario_fim);
  if (!targetRange) throw new Error('Evento sem datas definidas para verificação de conflito.');

  const assignmentsRes = await eventoContratadosApi.list({ contratadoId: params.contratadoId });
  const assignments = (assignmentsRes?.data ?? []) as EventoContratado[];

  for (const assignment of assignments) {
    if (!assignment.evento_id || assignment.evento_id === params.eventoId) continue;

    try {
      const otherEventoRes = await eventosApi.get(assignment.evento_id);
      const otherEvento = (otherEventoRes?.data ?? null) as EventoSnapshot | null;
      if (!otherEvento) continue;

      const otherRange = buildRange(otherEvento, assignment.horario_inicio, assignment.horario_fim);
      if (!otherRange) continue;

      if (rangesOverlap(targetRange, otherRange)) {
        const nome = otherEvento.nome || 'Outro evento';
        throw new Error(`Conflito de horário: contratado já alocado em ${nome}.`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Conflito de horário')) throw error;
    }
  }
}

export function useEventoContratados(eventoId: string) {
  return useQuery({
    queryKey: ['evento-contratados', eventoId],
    queryFn: async () => {
      const res = await eventoContratadosApi.list({ eventoId });
      return (res?.data ?? []) as EventoContratado[];
    },
    enabled: !!eventoId,
  });
}

export function useCreateEventoContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EventoContratadoCreate) => {
      const existingRes = await eventoContratadosApi.list({
        eventoId: data.evento_id,
        contratadoId: data.contratado_id,
      });
      const existing = (existingRes?.data ?? []) as EventoContratado[];
      if (existing.length > 0) throw new Error('Este contratado já está vinculado ao evento.');

      await checkContratadoConflict({
        contratadoId: data.contratado_id,
        eventoId: data.evento_id,
        horario_inicio: data.horario_inicio,
        horario_fim: data.horario_fim,
      });

      const res = await eventoContratadosApi.create(data as Partial<EventoContratado>);
      return (res?.data ?? res) as EventoContratado;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', created.evento_id] });
      toast.success('Contratado vinculado ao evento com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao vincular contratado: ${error.message}`),
  });
}

export function useUpdateEventoContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: EventoContratadoUpdate; eventoId: string; contratadoId: string }) => {
      const { id, data, eventoId, contratadoId } = params;

      if (data.horario_inicio && data.horario_fim) {
        await checkContratadoConflict({
          contratadoId,
          eventoId,
          horario_inicio: data.horario_inicio,
          horario_fim: data.horario_fim,
        });
      }

      const res = await eventoContratadosApi.update(id, data as Partial<EventoContratado>);
      return { ...(res?.data ?? res), evento_id: eventoId } as EventoContratado;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', updated.evento_id] });
      toast.success('Vínculo de contratado atualizado com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar contratado: ${error.message}`),
  });
}

export function useDeleteEventoContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      await eventoContratadosApi.delete(id);
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['evento-contratados', eventoId] });
      toast.success('Contratado removido do evento com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao remover contratado: ${error.message}`),
  });
}
