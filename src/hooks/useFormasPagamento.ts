import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FormaPagamento {
  id: string;
  organization_id: string | null;
  nome: string;
  tipo: 'geral' | 'entrada' | 'saida';
  taxa_percentual: number;
  dias_recebimento: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type FormaPagamentoFormData = Pick<FormaPagamento, 'nome' | 'tipo' | 'taxa_percentual' | 'dias_recebimento' | 'ativo'>;

export function useFormasPagamento() {
  return useQuery({
    queryKey: ['formas_pagamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as FormaPagamento[];
    },
  });
}

export function useCreateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (forma: FormaPagamentoFormData) => {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .insert(forma)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento criada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormaPagamento> & { id: string }) => {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFormaPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('formas_pagamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formas_pagamento'] });
      toast({ title: 'Forma de pagamento removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
