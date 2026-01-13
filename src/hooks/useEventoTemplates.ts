import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type EventoTemplate = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  gratuito: boolean;
  valor_padrao_prestador: number;
  checklist_padrao?: string[];
};

export function useEventoTemplates() {
  return useQuery({
    queryKey: ['evento-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evento_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EventoTemplate[];
    },
  });
}

export function useCreateTemplateFromEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventoId, nome }: { eventoId: string; nome: string }) => {
      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .select('*, checklist_items(*)')
        .eq('id', eventoId)
        .single();

      if (eventoError) throw eventoError;

      const { data, error } = await supabase
        .from('evento_templates')
        .insert({
          nome,
          descricao: evento.descricao,
          categoria: evento.categoria,
          gratuito: evento.gratuito,
          valor_padrao_prestador: evento.valor_padrao_prestador,
          checklist_padrao: evento.checklist_items?.map((item: Record<string, unknown>) => ({
            titulo: item.titulo,
            tipo: item.tipo,
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
          })),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evento-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar template');
    },
  });
}

export function useCreateEventoFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      nomeEvento,
      dataInicio,
      dataFim,
      local,
    }: {
      templateId: string;
      nomeEvento: string;
      dataInicio: string;
      dataFim: string;
      local: string;
    }) => {
      const { data: template, error: templateError } = await supabase
        .from('evento_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .insert({
          nome: nomeEvento,
          descricao: template.descricao,
          categoria: template.categoria,
          local,
          data_inicio: dataInicio,
          data_fim: dataFim,
          gratuito: template.gratuito,
          valor_padrao_prestador: template.valor_padrao_prestador,
        })
        .select()
        .single();

      if (eventoError) throw eventoError;

      if (template.checklist_padrao && Array.isArray(template.checklist_padrao)) {
        const checklistItems = template.checklist_padrao.map((item: Record<string, unknown>) => ({
          evento_id: evento.id,
          titulo: item.titulo,
          tipo: item.tipo,
          quantidade: typeof item.quantidade === 'number' ? item.quantidade : 1,
          custo_unitario: typeof item.custo_unitario === 'number' ? item.custo_unitario : 0,
        }));

        const { error: checklistError } = await supabase
          .from('checklist_items')
          .insert(checklistItems);

        if (checklistError) throw checklistError;
      }

      return evento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      toast.success('Evento criado a partir do template');
    },
    onError: () => {
      toast.error('Erro ao criar evento');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('evento_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evento-templates'] });
      toast.success('Template excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir template');
    },
  });
}
