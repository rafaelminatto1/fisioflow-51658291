import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useExerciseFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFavorites = async () => {
    if (!user) {
      setFavorites(new Set());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('exercise_favorites')
        .select('exercise_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteIds = new Set(data?.map(fav => fav.exercise_id) || []);
      setFavorites(favoriteIds);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (exerciseId: string) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para favoritar exercícios',
        variant: 'destructive'
      });
      return false;
    }

    const isFavorite = favorites.has(exerciseId);

    try {
      if (isFavorite) {
        // Remover dos favoritos
        const { error } = await supabase
          .from('exercise_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('exercise_id', exerciseId);

        if (error) throw error;

        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(exerciseId);
          return newFavorites;
        });

        toast({ title: 'Removido dos favoritos' });
      } else {
        // Adicionar aos favoritos
        const { error } = await supabase
          .from('exercise_favorites')
          .insert({
            user_id: user.id,
            exercise_id: exerciseId
          });

        if (error) throw error;

        setFavorites(prev => new Set([...prev, exerciseId]));
        toast({ title: 'Adicionado aos favoritos' });
      }

      return true;
    } catch (error) {
      console.error('Erro ao alterar favorito:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar favorito',
        variant: 'destructive'
      });
      return false;
    }
  };

  const isFavorite = (exerciseId: string) => favorites.has(exerciseId);

  const getFavoriteExercises = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('exercise_favorites')
        .select(`
          exercise_id,
          exercises (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return data?.map(fav => fav.exercises).filter(Boolean) || [];
    } catch (error) {
      console.error('Erro ao carregar exercícios favoritos:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  return {
    favorites: Array.from(favorites),
    loading,
    toggleFavorite,
    isFavorite,
    getFavoriteExercises,
    refetch: fetchFavorites
  };
}