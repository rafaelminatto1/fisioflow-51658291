import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Sala {
  id: string;
  organization_id: string | null;
  nome: string;
  capacidade: number;
  descricao: string | null;
  cor: string;
  equipamentos: string[] | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type SalaFormData = Pick<Sala, 'nome' | 'capacidade' | 'descricao' | 'cor' | 'equipamentos' | 'ativo'>;

export function useSalas() {
  return useQuery({
    queryKey: ['salas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salas')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Sala[];
    },
  });
}

export function useCreateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sala: SalaFormData) => {
      const { data, error } = await supabase
        .from('salas')
        .insert(sala)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar sala', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Sala> & { id: string }) => {
      const { data, error } = await supabase
        .from('salas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSala() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salas'] });
      toast({ title: 'Sala removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });
}
