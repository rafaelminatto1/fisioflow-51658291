/**
 * useTemplateFavorites - Migrated to Firebase
 *
 * Migration from Supabase to Firebase Firestore:
 * - supabase.from('evaluation_forms') → Firestore collection 'evaluation_forms'
 * - Optimistic updates preserved
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, updateDoc, doc, query as firestoreQuery, where, orderBy } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';



/**
 * Hook para gerenciar favoritos de templates
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isFavorite }: { templateId: string; isFavorite: boolean }) => {
      const docRef = doc(db, 'evaluation_forms', templateId);
      await updateDoc(docRef, { is_favorite: !isFavorite });
      return { templateId, newFavoriteStatus: !isFavorite };
    },
    onMutate: async ({ templateId, isFavorite }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['evaluation-forms'] });

      const previousForms = queryClient.getQueryData(['evaluation-forms']);

      queryClient.setQueryData(['evaluation-forms'], (old: { id: string; is_favorite: boolean }[] | undefined) => {
        if (!old) return old;
        return old.map((form) =>
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
      const q = firestoreQuery(
        collection(db, 'evaluation_forms'),
        where('is_favorite', '==', true),
        where('ativo', '==', true),
        orderBy('nome', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  });
}

export default useToggleFavorite;
