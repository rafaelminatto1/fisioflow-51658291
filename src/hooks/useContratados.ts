/**
 * useContratados - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contratadosApi, type Contratado } from '@/lib/api/workers-client';
import { ContratadoCreate, ContratadoUpdate } from '@/lib/validations/contratado';

export type { Contratado };

export function useContratados() {
  return useQuery({
    queryKey: ['contratados'],
    queryFn: async () => {
      const res = await contratadosApi.list();
      return (res?.data ?? []) as Contratado[];
    },
  });
}

export function useCreateContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contratado: ContratadoCreate) => {
      const res = await contratadosApi.create(contratado as Partial<Contratado>);
      return (res?.data ?? res) as Contratado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      toast.success('Contratado cadastrado com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao criar contratado: ${error.message}`),
  });
}

export function useUpdateContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContratadoUpdate }) => {
      const res = await contratadosApi.update(id, data as Partial<Contratado>);
      return (res?.data ?? res) as Contratado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      toast.success('Contratado atualizado com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao atualizar contratado: ${error.message}`),
  });
}

export function useDeleteContratado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contratadosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratados'] });
      queryClient.invalidateQueries({ queryKey: ['evento-contratados'] });
      toast.success('Contratado removido com sucesso.');
    },
    onError: (error: Error) => toast.error(`Erro ao remover contratado: ${error.message}`),
  });
}
