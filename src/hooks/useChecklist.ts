import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChecklistItemCreate, ChecklistItemUpdate } from '@/lib/validations/checklist';

export function useChecklist(eventoId: string) {
  return useQuery({
    queryKey: ['checklist', eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('evento_id', eventoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!eventoId,
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: ChecklistItemCreate) => {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.evento_id] });
      toast({
        title: 'Item adicionado!',
        description: 'Item do checklist criado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao adicionar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data, eventoId }: { id: string; data: ChecklistItemUpdate; eventoId: string }) => {
      const { data: updated, error } = await supabase
        .from('checklist_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...updated, evento_id: eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.evento_id] });
      toast({
        title: 'Item atualizado!',
        description: 'Alterações salvas com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { data: item, error: fetchError } = await supabase
        .from('checklist_items')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const novoStatus = item.status === 'OK' ? 'ABERTO' : 'OK';

      const { data, error } = await supabase
        .from('checklist_items')
        .update({ status: novoStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, eventoId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', data.eventoId] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eventoId }: { id: string; eventoId: string }) => {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return eventoId;
    },
    onSuccess: (eventoId) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', eventoId] });
      toast({
        title: 'Item removido!',
        description: 'Item excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao remover item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });
}
