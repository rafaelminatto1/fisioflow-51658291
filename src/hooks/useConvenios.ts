import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Convenio {
  id: string;
  organization_id: string | null;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  contato_responsavel: string | null;
  valor_repasse: number;
  prazo_pagamento_dias: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type ConvenioFormData = Pick<Convenio, 'nome' | 'cnpj' | 'telefone' | 'email' | 'contato_responsavel' | 'valor_repasse' | 'prazo_pagamento_dias' | 'observacoes' | 'ativo'>;

export function useConvenios() {
  return useQuery({
    queryKey: ['convenios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Convenio[];
    },
  });
}

export function useCreateConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (convenio: ConvenioFormData) => {
      const { data, error } = await supabase
        .from('convenios')
        .insert(convenio)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar convênio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Convenio> & { id: string }) => {
      const { data, error } = await supabase
        .from('convenios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteConvenio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('convenios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast({ title: 'Convênio removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
