/**
 * useConductLibrary - Migrado para Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clinicalApi, type ConductLibraryRecord } from '@/lib/api/workers-client';

export type ConductTemplate = ConductLibraryRecord;

export interface CreateConductData {
  title: string;
  description?: string;
  conduct_text: string;
  category: string;
  organization_id?: string;
}

export const useConductLibrary = (category?: string) =>
  useQuery({
    queryKey: ['conduct-library', category],
    queryFn: async () => {
      const res = await clinicalApi.conductLibrary.list(category ? { category } : undefined);
      return (res?.data ?? []) as ConductTemplate[];
    },
  });

export const useCreateConduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConductData) => {
      const res = await clinicalApi.conductLibrary.create(data);
      return (res?.data ?? res) as ConductTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast.success('A conduta foi adicionada à biblioteca.');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar conduta');
    },
  });
};

export const useUpdateConduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateConductData> & { id: string }) => {
      const res = await clinicalApi.conductLibrary.update(id, data);
      return (res?.data ?? res) as ConductTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast.success('A conduta foi atualizada.');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar conduta');
    },
  });
};

export const useDeleteConduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conductId: string) => {
      await clinicalApi.conductLibrary.delete(conductId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conduct-library'] });
      toast.success('A conduta foi removida da biblioteca.');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover conduta');
    },
  });
};
