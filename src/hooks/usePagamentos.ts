import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PagamentoCreate, PagamentoUpdate } from '@/lib/validations/pagamento';

export function usePagamentos(eventoId: string) {
  return useQuery({
    queryKey: ['pagamentos', eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('evento_id', eventoId)
        .order('pago_em', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });
}

export function useCreatePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pagamento: PagamentoCreate & { pago_em: Date }) => {
      const dataToInsert = {
        ...pagamento,
        pago_em: pagamento.pago_em.toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from('pagamentos')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', data.evento_id] });
      toast({
        title: 'Pagamento adicionado!',
        description: 'Pagamento registrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: PagamentoUpdate & { pago_em?: Date }; eventoId: string }) => {
      const dataToUpdate = data.pago_em
        ? { ...data, pago_em: data.pago_em.toISOString().split('T')[0] }
        : data;

      const { data: updated, error } = await supabase
        .from('pagamentos')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...updated, evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', data.evento_id] });
      toast({
        title: 'Pagamento atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePagamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('pagamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['pagamentos', eventoId] });
      toast({
        title: 'Pagamento removido!',
        description: 'Pagamento excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover pagamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
