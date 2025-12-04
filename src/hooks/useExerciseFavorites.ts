import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useExerciseFavorites = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storageKey = `exercise-favorites-${user?.id || 'anonymous'}`;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['exercise-favorites', user?.id],
    queryFn: async () => {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) as string[] : [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const current = [...favorites];
      if (!current.includes(exerciseId)) {
        const updated = [...current, exerciseId];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      }
      return current;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['exercise-favorites', user?.id], data);
      toast.success('Adicionado aos favoritos');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (exerciseId: string) => {
      const updated = favorites.filter(id => id !== exerciseId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['exercise-favorites', user?.id], data);
      toast.success('Removido dos favoritos');
    },
  });

  const isFavorite = (exerciseId: string) => favorites.includes(exerciseId);

  const toggleFavorite = (exerciseId: string) => {
    if (isFavorite(exerciseId)) {
      removeMutation.mutate(exerciseId);
    } else {
      addMutation.mutate(exerciseId);
    }
  };

  return {
    favorites,
    loading: isLoading,
    error: null,
    addToFavorites: addMutation.mutate,
    removeFromFavorites: removeMutation.mutate,
    isFavorite,
    toggleFavorite,
    isToggling: addMutation.isPending || removeMutation.isPending,
  };
};