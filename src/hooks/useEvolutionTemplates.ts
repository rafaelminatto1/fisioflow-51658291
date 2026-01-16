import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvolutionTemplate {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  conteudo: string;
  campos_padrao: unknown[];
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
      // Optimized: Select only required columns instead of *
      let query = supabase
        .from('evolution_templates')
        .select('id, nome, tipo, descricao, conteudo, campos_padrao, ativo, organization_id, created_by, created_at, updated_at')
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EvolutionTemplate[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos - templates mudam pouco
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

export function useCreateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: EvolutionTemplateFormData) => {
      // Optimized: Select only required columns
      const { data, error } = await supabase
        .from('evolution_templates')
        .insert(template)
        .select('id, nome, tipo, descricao, conteudo, campos_padrao, ativo, organization_id, created_by, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update - adiciona template à lista antes da resposta do servidor
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      // Adicionar template otimista com ID temporário
      const optimisticTemplate: EvolutionTemplate = {
        ...newTemplate,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
        organization_id: null,
      };

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) => [
        ...(old || []),
        optimisticTemplate,
      ]);

      return { previousTemplates };
    },
    onError: (err, newTemplate, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao criar template de evolução.');
    },
    onSuccess: (data) => {
      // Substituir template otimista pelo real (com ID do servidor)
      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.map((t) => (t.id.startsWith('temp-') ? data : t)) || [data]
      );
      toast.success('Template de evolução criado com sucesso.');
    },
  });
}

export function useUpdateEvolutionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<EvolutionTemplate> & { id: string }) => {
      // Optimized: Select only required columns
      const { data, error } = await supabase
        .from('evolution_templates')
        .update(template)
        .eq('id', id)
        .select('id, nome, tipo, descricao, conteudo, campos_padrao, ativo, organization_id, created_by, created_at, updated_at')
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update - atualiza template na lista antes da resposta do servidor
    onMutate: async ({ id, ...template }) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, ...template, updated_at: new Date().toISOString() }
            : t
        ) || []
      );

      return { previousTemplates };
    },
    onError: (err, variables, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao atualizar template de evolução.');
    },
    onSuccess: (data) => {
      toast.success('Template de evolução atualizado com sucesso.');
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
    // Optimistic update - remove template da lista visualmente
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['evolution-templates'] });

      const previousTemplates = queryClient.getQueryData<EvolutionTemplate[]>(['evolution-templates']);

      queryClient.setQueryData<EvolutionTemplate[]>(['evolution-templates'], (old) =>
        old?.filter((t) => t.id !== id) || []
      );

      return { previousTemplates };
    },
    onError: (err, id, context) => {
      // Rollback para os dados anteriores
      queryClient.setQueryData(['evolution-templates'], context?.previousTemplates);
      toast.error('Erro ao excluir template de evolução.');
    },
    onSuccess: () => {
      toast.success('Template de evolução excluído com sucesso.');
    },
  });
}
