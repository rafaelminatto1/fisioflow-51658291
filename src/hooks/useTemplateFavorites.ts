/**
 * useTemplateFavorites - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { evaluationFormsApi, type EvaluationFormRow } from '@/lib/api/workers-client';

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      await evaluationFormsApi.update(templateId, {
        is_favorite: !isFavorite,
      } as Partial<EvaluationFormRow>);

      return { templateId, newFavoriteStatus: !isFavorite };
    },
    onMutate: async ({ templateId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['evaluation-forms'] });

      const previousForms = queryClient.getQueryData(['evaluation-forms']);

      queryClient.setQueryData(
        ['evaluation-forms'],
        (old: { id: string; is_favorite?: boolean }[] | undefined) => {
          if (!old) return old;
          return old.map((form) =>
            form.id === templateId
              ? { ...form, is_favorite: !isFavorite }
              : form,
          );
        },
      );

      return { previousForms };
    },
    onError: (_error, _variables, context) => {
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
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-forms', 'favorites'] });
    },
  });
}

export function useFavoriteTemplates() {
  return useQuery({
    queryKey: ['evaluation-forms', 'favorites'],
    queryFn: async () => {
      const res = await evaluationFormsApi.list({ ativo: true, favorite: true });
      const data = (res?.data ?? []) as EvaluationFormRow[];
      return data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },
  });
}

export default useToggleFavorite;
