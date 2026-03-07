/**
 * useCentrosCusto - Rewritten to use Workers API (financialApi.centrosCusto)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialApi, CentroCusto } from '@/lib/api/workers-client';
import { toast } from 'sonner';

export type { CentroCusto };

export type CentroCustoFormData = Pick<CentroCusto, 'nome' | 'descricao' | 'ativo'>;

export function useCentrosCusto() {
  return useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const res = await financialApi.centrosCusto.list();
      return (res?.data ?? res ?? []) as CentroCusto[];
    },
  });
}

export function useCreateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (centro: CentroCustoFormData) => {
      const res = await financialApi.centrosCusto.create(centro);
      return (res?.data ?? res) as CentroCusto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast.success('Centro de custo criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar centro de custo: ' + error.message);
    },
  });
}

export function useUpdateCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CentroCusto> & { id: string }) => {
      const res = await financialApi.centrosCusto.update(id, updates);
      return (res?.data ?? res) as CentroCusto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast.success('Centro de custo atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteCentroCusto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await financialApi.centrosCusto.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros_custo'] });
      toast.success('Centro de custo removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover: ' + error.message);
    },
  });
}
