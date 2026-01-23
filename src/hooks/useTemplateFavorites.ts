import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para gerenciar favoritos de templates
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('evaluation_forms')
        .update({ is_favorite: !isFavorite })
        .eq('id', templateId);

      if (error) throw error;
      return { templateId, newFavoriteStatus: !isFavorite };
    },
    onMutate: async ({ templateId, isFavorite }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['evaluation-forms'] });

      const previousForms = queryClient.getQueryData(['evaluation-forms']);

      queryClient.setQueryData(['evaluation-forms'], (old: any) => {
        if (!old) return old;
        return old.map((form: any) =>
          form.id === templateId
            ? { ...form, is_favorite: !isFavorite }
            : form
        );
      });

      return { previousForms };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousForms) {
        queryClient.setQueryData(['evaluation-forms'], context.previousForms);
      }
      toast.error('Erro ao atualizar favorito');
    },
    onSuccess: (data) => {
      const message = data.newFavoriteStatus
        ? 'Template adicionado aos favoritos'
        : 'Template removido dos favoritos';
      toast.success(message);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
    },
  });
}

/**
 * Hook para listar apenas templates favoritos
 */
export function useFavoriteTemplates() {
  return useQuery({
    queryKey: ['evaluation-forms', 'favorites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_forms')
        .select('*')
        .eq('is_favorite', true)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data;
    },
  });
}

export default useToggleFavorite;
