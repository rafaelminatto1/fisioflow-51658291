import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise } from '@/types';

export type ExerciseDifficulty = 'Fácil' | 'Médio' | 'Difícil';
export type ExerciseCategory = string;

export interface ExercisesState {
  exercises: Exercise[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  difficultyFilter: ExerciseDifficulty | 'all';
  categoryFilter: string | 'all';
  fetchExercises: () => Promise<void>;
  updateExercise: (id: string, data: Partial<Exercise>) => void;
  addExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setDifficultyFilter: (difficulty: ExerciseDifficulty | 'all') => void;
  setCategoryFilter: (category: string | 'all') => void;
  clearError: () => void;
}

export const useExercisesStore = create<ExercisesState>()(
  persist(
    (set) => ({
      exercises: [],
      isLoading: false,
      error: null,
      searchQuery: '',
      difficultyFilter: 'all',
      categoryFilter: 'all',

      fetchExercises: async () => {
        set({ isLoading: true, error: null });
        try {
          // Aqui seria chamada a API ou Firebase
          // const response = await fetchExercises();
          // set({ exercises: response.data, isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Erro ao buscar exercícios',
          });
        }
      },

      updateExercise: (id, data) => {
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.id === id ? { ...e, ...data } : e
          ),
        }));
      },

      addExercise: (exercise) => {
        set((state) => ({
          exercises: [exercise, ...state.exercises],
        }));
      },

      deleteExercise: (id) => {
        set((state) => ({
          exercises: state.exercises.filter((e) => e.id !== id),
        }));
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setDifficultyFilter: (difficulty) => {
        set({ difficultyFilter: difficulty });
      },

      setCategoryFilter: (category) => {
        set({ categoryFilter: category });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'exercises-storage',
      partialize: (state) => {
        // Persistir apenas campos essenciais para economizar espaço
        return {
          exercises: state.exercises,
          isLoading: false, // Não persistir loading state
          searchQuery: state.searchQuery,
          difficultyFilter: state.difficultyFilter,
          categoryFilter: state.categoryFilter,
          error: null, // Não persistir erro
        } as Partial<ExercisesState>;
      },
    }
  )
);

// Selectors derivados para acesso otimizado
export const useExercisesSelectors = () => {
  return useExercisesStore((state) => ({
    filteredExercises: () => {
      let filtered = state.exercises;

      // Filtrar por dificuldade
      if (state.difficultyFilter !== 'all') {
        filtered = filtered.filter((e) => e.difficulty === state.difficultyFilter);
      }

      // Filtrar por categoria
      if (state.categoryFilter !== 'all') {
        filtered = filtered.filter((e) =>
          e.category === state.categoryFilter ||
          e.body_parts?.includes(state.categoryFilter)
        );
      }

      // Filtrar por busca
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter((e) =>
          e.name?.toLowerCase().includes(query)
        );
      }

      return filtered;
    },
    totalExercises: () => state.exercises.length,
    exercisesByDifficulty: () => {
      const byDifficulty: Record<ExerciseDifficulty | number> = {
        'Fácil': 0,
        'Médio': 0,
        'Difícil': 0,
        'all': 0,
      };

      state.exercises.forEach((e) => {
        byDifficulty[e.difficulty]++;
        byDifficulty.all++;
      });

      return byDifficulty;
    },
    isLoading: state.isLoading,
    hasError: !!state.error,
  }));
};
