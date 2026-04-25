import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  getExercises as apiGetExercises,
  createExercise as apiCreateExercise,
  updateExercise as apiUpdateExercise,
  deleteExercise as apiDeleteExercise,
  type ApiExercise,
} from "@/lib/api";
import type { Exercise, ExerciseAssignment } from "@/types";

export interface UseExercisesLibraryOptions {
  category?: string;
  difficulty?: string;
  search?: string;
  bodyPart?: string;
  equipment?: string;
  limit?: number;
  favorites?: boolean;
}

// Map API exercise type to app Exercise type
function mapApiExercise(apiExercise: ApiExercise): Exercise {
  return {
    id: apiExercise.id,
    name: apiExercise.name,
    description: apiExercise.description || "",
    instructions: apiExercise.instructions || [],
    category: apiExercise.category || "Geral",
    difficulty: (apiExercise.difficulty === "iniciante" || apiExercise.difficulty === "easy"
      ? "easy"
      : apiExercise.difficulty === "intermediario" || apiExercise.difficulty === "medium"
        ? "medium"
        : "hard") as Exercise["difficulty"],
    videoUrl: apiExercise.videoUrl,
    imageUrl: apiExercise.imageUrl,
    sets: apiExercise.sets,
    reps: apiExercise.reps,
    duration: apiExercise.duration,
    embeddingSketch: apiExercise.embeddingSketch,
    referencePose: apiExercise.referencePose,
    createdAt: apiExercise.createdAt ? new Date(apiExercise.createdAt) : new Date(),
    updatedAt: apiExercise.updatedAt ? new Date(apiExercise.updatedAt) : new Date(),
  };
}

export function useExercisesLibrary(options?: UseExercisesLibraryOptions) {
  const query = useInfiniteQuery({
    queryKey: ["exercises", "library", options],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiGetExercises({
        ...options,
        favorites: options?.favorites ? "true" : undefined,
        page: pageParam as number,
        limit: options?.limit || 20,
      });
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.pages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const data = query.data?.pages.flatMap((page) => page.data).map(mapApiExercise) || [];

  return {
    data: data as Exercise[],
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    total: query.data?.pages[0]?.meta.total || 0,
  };
}

export function useExerciseCreate() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Exercise, "id" | "createdAt" | "updatedAt">) => {
      const apiExercise = await apiCreateExercise({
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        category: data.category,
        difficulty: data.difficulty,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl,
        sets: data.sets,
        reps: data.reps,
        duration: data.duration,
        embeddingSketch: data.embeddingSketch,
        referencePose: data.referencePose,
      });
      return mapApiExercise(apiExercise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    createExercise: createMutation.mutate,
    createExerciseAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function useExerciseUpdate() {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Exercise> }) => {
      const apiExercise = await apiUpdateExercise(id, {
        name: data.name,
        description: data.description,
        instructions: data.instructions,
        category: data.category,
        difficulty: data.difficulty,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl,
        sets: data.sets,
        reps: data.reps,
        duration: data.duration,
        embeddingSketch: data.embeddingSketch,
        referencePose: data.referencePose,
      });
      return mapApiExercise(apiExercise);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    updateExercise: updateMutation.mutate,
    updateExerciseAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export function useExerciseDelete() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });

  return {
    deleteExercise: deleteMutation.mutate,
    deleteExerciseAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

import { fetchApi } from "@/lib/api";

const assignExerciseToPatient = async (
  professionalId: string,
  patientId: string,
  assignment: any,
) => {
  return fetchApi<any>(`/api/patients/${patientId}/exercises`, {
    method: "POST",
    data: { ...assignment, professionalId },
  });
};

const getPatientExerciseAssignments = async (patientId: string) => {
  return fetchApi<any[]>(`/api/patients/${patientId}/exercises`);
};

export function usePatientExerciseAssignments() {
  const queryClient = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: ({
      patientId,
      assignment,
    }: {
      patientId: string;
      assignment: Omit<ExerciseAssignment, "id">;
    }) => assignExerciseToPatient("current-professional", patientId, assignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientExercises"] });
    },
  });

  return {
    assignExercise: assignMutation.mutate,
    isAssigning: assignMutation.isPending,
  };
}

export function usePatientExercises(patientId: string) {
  const exercises = useQuery({
    queryKey: ["patientExercises", patientId],
    queryFn: () => getPatientExerciseAssignments(patientId),
    enabled: !!patientId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: exercises.data || [],
    isLoading: exercises.isLoading,
    error: exercises.error,
    refetch: exercises.refetch,
  };
}
