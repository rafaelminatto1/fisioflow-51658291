/**
 * useExerciseFavorites - Hook para gerenciar favoritos de exercícios
 *
 * MIGRAÇÃO: Sistema localStorage → API Backend (PostgreSQL)
 * - Usa useMyFavoriteExercises() para carregar favoritos
 * - Usa useFavoriteExercise() para mutations
 * - Dados sincronizados entre dispositivos
 */
import { useQueryClient } from "@tanstack/react-query";
import { useFavoriteExercise, useMyFavoriteExercises } from "./useWorkersExercises";

export const useExerciseFavorites = () => {
  const queryClient = useQueryClient();

  // Carregar favoritos do backend
  const { data: favoriteExercises = [], isLoading } = useMyFavoriteExercises();

  // Mutation para favoritar/desfavoritar
  const favoriteMutation = useFavoriteExercise();

  // Extrair apenas IDs dos exercícios favoritos
  const favorites = favoriteExercises.map((ex) => ex.id);

  const isFavorite = (exerciseId: string) => favorites.includes(exerciseId);

  const toggleFavorite = (exerciseId: string) => {
    const currentlyFavorite = isFavorite(exerciseId);
    favoriteMutation.mutate(
      { id: exerciseId, isFavorite: currentlyFavorite },
      {
        onSuccess: () => {
          // Invalidar cache para garantir dados atualizados
          queryClient.invalidateQueries({
            queryKey: ["workers", "exercises", "favorites"],
          });
        },
      },
    );
  };

  const addToFavorites = (exerciseId: string) => {
    if (!isFavorite(exerciseId)) {
      toggleFavorite(exerciseId);
    }
  };

  const removeFromFavorites = (exerciseId: string) => {
    if (isFavorite(exerciseId)) {
      toggleFavorite(exerciseId);
    }
  };

  return {
    favorites,
    loading: isLoading,
    error: null,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    isToggling: favoriteMutation.isPending,
  };
};
