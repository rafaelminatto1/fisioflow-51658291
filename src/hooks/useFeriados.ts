import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Feriado {
  id: string;
  organization_id: string | null;
  nome: string;
  data: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'ponto_facultativo';
  recorrente: boolean;
  bloqueia_agenda: boolean;
  created_at: string;
  updated_at: string;
}

export type FeriadoFormData = Omit<Feriado, 'id' | 'created_at' | 'updated_at'>;

export function useFeriados(year?: number) {
  return useQuery({
    queryKey: ['feriados', year],
    queryFn: async () => {
      let query = supabase
        .from('feriados')
        .select('*')
        .order('data');

      if (year) {
        query = query
          .gte('data', `${year}-01-01`)
          .lte('data', `${year}-12-31`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Feriado[];
    },
  });
}

export function useCreateFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feriado: FeriadoFormData) => {
      const { data, error } = await supabase
        .from('feriados')
        .insert(feriado)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar feriado', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Feriado> & { id: string }) => {
      const { data, error } = await supabase
        .from('feriados')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado atualizado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar feriado', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFeriado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feriados')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast({ title: 'Feriado removido com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover feriado', description: error.message, variant: 'destructive' });
    },
  });
}
