import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvolutionTemplate {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  conteudo: string;
  campos_padrao: any[];
  ativo: boolean;
  organization_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type EvolutionTemplateFormData = Omit<EvolutionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'organization_id'>;

export function useEvolutionTemplates(tipo?: string) {
  return useQuery({
    queryKey: ['evolution-templates', tipo],
    queryFn: async () => {
      let query = supabase
        .from('evolution_templates')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EvolutionTemplate[];
    },
  });
}

export function useCreateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: EvolutionTemplateFormData) => {
      const { data, error } = await supabase
        .from('evolution_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-templates'] });
      toast.success('Template de evolução criado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao criar template de evolução.');
    },
  });
}

export function useUpdateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EvolutionTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('evolution_templates')
        .update(template)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-templates'] });
      toast.success('Template de evolução atualizado com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao atualizar template de evolução.');
    },
  });
}

export function useDeleteEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evolution_templates')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-templates'] });
      toast.success('Template de evolução excluído com sucesso.');
    },
    onError: () => {
      toast.error('Erro ao excluir template de evolução.');
    },
  });
}
