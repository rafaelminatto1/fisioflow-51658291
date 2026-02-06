/**
 * React Hook for AI Exercise Suggestions
 *
 * Provides React Query integration for Exercise AI Assistant.
 * Handles caching, loading states, and error handling.
 *
 * @module hooks/useAIExercises
 * @version 2.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import type { Exercise } from '@/types';
import {

  PatientProfileContext,
  ExerciseProgramRecommendation,
  ExerciseSuggestionResponse,
} from '@/lib/ai/exercises';
import { createExerciseAIAssistant } from '@/lib/ai/exercises';
import { fisioLogger as logger } from '@/lib/errors/logger';
// ============================================================================
// TYPES
// ============================================================================

/**
 * Hook options for useAIExercises
 */
export interface UseAIExercisesOptions {
  /** Enable/disable the hook */
  enabled?: boolean;
  /** Stale time for cache (default: 5 minutes) */
  staleTime?: number;
  /** Retry count on failure (default: 1) */
  retry?: number;
  /** Custom API key (uses env var by default) */
  apiKey?: string;
}

/**
 * Exercise suggestion mutation variables
 */
export interface ExerciseSuggestionVariables {
  /** Patient context */
  patientContext: PatientProfileContext;
  /** Exercise library to match against */
  exerciseLibrary?: Exercise[];
}

/**
 * Return type for useAIExercises hook
 */
export interface UseAIExercisesReturn {
  /** Suggested exercise program */
  suggestions: ExerciseProgramRecommendation | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether suggestions are being generated */
  isGenerating: boolean;
  /** Generate exercise suggestions */
  generateSuggestions: (variables: ExerciseSuggestionVariables) => Promise<ExerciseSuggestionResponse>;
  /** Clear cached suggestions */
  clearSuggestions: () => void;
  /** Refetch suggestions */
  refetch: () => void;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Query keys factory for AI exercises
 */
export const aiExercisesQueryKeys = {
  all: ['ai', 'exercises'] as const,
  suggestions: (patientId: string) => ['ai', 'exercises', 'suggestions', patientId] as const,
  lastRequest: (patientId: string) => ['ai', 'exercises', 'lastRequest', patientId] as const,
} as const;

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * React hook for AI-powered exercise suggestions
 *
 * @param patientId - Patient ID for caching
 * @param options - Hook configuration options
 * @returns Exercise suggestions and controls
 *
 * @example
 * ```tsx
 * function ExerciseRecommendations({ patient }) {
 *   const { suggestions, isLoading, generateSuggestions } = useAIExercises(patient.id);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *
 *   return (
 *     <div>
 *       <Button onClick={() => generateSuggestions({ patientContext: {...} })}>
 *         Generate Suggestions
 *       </Button>
 *       {suggestions && <ExerciseList exercises={suggestions.exercises} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIExercises(
  patientId: string,
  options: UseAIExercisesOptions = {}
): UseAIExercisesReturn {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    retry = 1,
    apiKey,
  } = options;

  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Query for cached suggestions
  const { data: suggestions, isLoading, error, refetch } = useQuery({
    queryKey: aiExercisesQueryKeys.suggestions(patientId),
    queryFn: () => {
      // Return cached data if exists
      const cached = queryClient.getQueryData<ExerciseProgramRecommendation>(
        aiExercisesQueryKeys.suggestions(patientId)
      );
      return Promise.resolve(cached);
    },
    enabled: enabled && !!patientId,
    staleTime,
    retry,
  });

  // Mutation to generate new suggestions
  const generateMutation = useMutation({
    mutationFn: async ({
      patientContext,
      exerciseLibrary,
    }: ExerciseSuggestionVariables): Promise<ExerciseSuggestionResponse> => {
      setIsGenerating(true);
      setLastError(null);

      try {
        const assistant = createExerciseAIAssistant(apiKey);

        // Generate with or without exercise library matching
        const response = exerciseLibrary
          ? await assistant.suggestExercisesFromLibrary(patientContext, exerciseLibrary)
          : await assistant.suggestExercises(patientContext);

        if (!response.success) {
          throw new Error(response.error || 'Failed to generate exercise suggestions');
        }

        return response;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Cache the suggestions
        queryClient.setQueryData(
          aiExercisesQueryKeys.suggestions(patientId),
          response.data
        );

        // Cache the timestamp
        queryClient.setQueryData(
          aiExercisesQueryKeys.lastRequest(patientId),
          Date.now()
        );
      }
    },
    onError: (err: Error) => {
      setLastError(err);
      logger.error('[useAIExercises] Generation error', err, 'useAIExercises');
    },
  });

  /**
   * Generate exercise suggestions
   */
  const generateSuggestions = useCallback(
    async (variables: ExerciseSuggestionVariables): Promise<ExerciseSuggestionResponse> => {
      return generateMutation.mutateAsync(variables);
    },
    [generateMutation]
  );

  /**
   * Clear cached suggestions
   */
  const clearSuggestions = useCallback(() => {
    queryClient.removeQueries({ queryKey: aiExercisesQueryKeys.suggestions(patientId) });
    queryClient.removeQueries({ queryKey: aiExercisesQueryKeys.lastRequest(patientId) });
  }, [queryClient, patientId]);

  return {
    suggestions,
    isLoading,
    error: lastError,
    isGenerating,
    generateSuggestions,
    clearSuggestions,
    refetch,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for exercise suggestions with automatic library loading
 *
 * @param patientId - Patient ID
 * @param patientContext - Patient profile context
 * @param options - Hook options
 * @returns Exercise suggestions with library integration
 */
export function useAIExercisesWithLibrary(
  patientId: string,
  patientContext: PatientProfileContext,
  options: UseAIExercisesOptions = {}
): UseAIExercisesReturn & {
  /** Generate suggestions with library */
  generateWithLibrary: () => Promise<ExerciseSuggestionResponse>;
} {
  const queryClient = useQueryClient();
  const baseHook = useAIExercises(patientId, options);

  // Load exercise library
  const { data: exerciseLibrary = [] } = useQuery({
    queryKey: ['exercises', 'list'],
    queryFn: async () => {
      // Import dynamically to avoid circular dependencies
      const { exerciseService } = await import('@/services/exercises');
      return exerciseService.getExercises();
    },
    staleTime: 60 * 60 * 1000, // 1 hour (static data)
  });

  /**
   * Generate suggestions with exercise library matching
   */
  const generateWithLibrary = useCallback(async () => {
    return baseHook.generateSuggestions({
      patientContext,
      exerciseLibrary,
    });
  }, [baseHook, patientContext, exerciseLibrary]);

  return {
    ...baseHook,
    generateWithLibrary,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if suggestions are stale
 */
export function useAIExercisesStale(
  patientId: string,
  staleTimeMs: number = 10 * 60 * 1000 // 10 minutes default
): {
  isStale: boolean;
  lastRequestTime: number | undefined;
} {
  const { data: lastRequestTime } = useQuery({
    queryKey: aiExercisesQueryKeys.lastRequest(patientId),
    queryFn: () => Promise.resolve(undefined),
    staleTime: staleTimeMs,
  });

  const isStale = lastRequestTime
    ? Date.now() - lastRequestTime > staleTimeMs
    : true;

  return {
    isStale,
    lastRequestTime,
  };
}

/**
 * Hook for batch exercise suggestions (multiple patients)
 */
export function useBatchAIExercises(
  patientIds: string[],
  options: UseAIExercisesOptions = {}
): {
  suggestions: Record<string, ExerciseProgramRecommendation | undefined>;
  isLoading: boolean;
  errors: Record<string, Error | null>;
  generateAll: (contexts: Record<string, PatientProfileContext>) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, Error | null>>({});

  // Fetch all cached suggestions
  const suggestionsMap = Object.fromEntries(
    patientIds.map((id) => [
      id,
      queryClient.getQueryData<ExerciseProgramRecommendation>(
        aiExercisesQueryKeys.suggestions(id)
      ),
    ])
  );

  /**
   * Generate suggestions for all patients
   */
  const generateAll = useCallback(
    async (contexts: Record<string, PatientProfileContext>) => {
      setIsLoading(true);

      try {
        const assistant = createExerciseAIAssistant(options.apiKey);

        await Promise.all(
          patientIds.map(async (patientId) => {
            const context = contexts[patientId];
            if (!context) return;

            try {
              const response = await assistant.suggestExercises(context);

              if (response.success && response.data) {
                queryClient.setQueryData(
                  aiExercisesQueryKeys.suggestions(patientId),
                  response.data
                );
                setErrors((prev) => ({ ...prev, [patientId]: null }));
              } else {
                setErrors((prev) => ({
                  ...prev,
                  [patientId]: new Error(response.error || 'Unknown error'),
                }));
              }
            } catch (err) {
              setErrors((prev) => ({
                ...prev,
                [patientId]: err instanceof Error ? err : new Error('Unknown error'),
              }));
            }
          })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [patientIds, options.apiKey, queryClient]
  );

  return {
    suggestions: suggestionsMap,
    isLoading,
    errors,
    generateAll,
  };
}

// ============================================================================
// PREFETCHING UTILITIES
// ============================================================================

/**
 * Prefetch exercise suggestions for a patient
 */
export function prefetchAIExercises(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string,
  patientContext: PatientProfileContext,
  apiKey?: string
): void {
  queryClient.prefetchQuery({
    queryKey: aiExercisesQueryKeys.suggestions(patientId),
    queryFn: async () => {
      const assistant = createExerciseAIAssistant(apiKey);
      const response = await assistant.suggestExercises(patientContext);

      if (!response.success) {
        throw new Error(response.error || 'Failed to prefetch suggestions');
      }

      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Invalidate exercise suggestions cache
 */
export function invalidateAIExercises(
  queryClient: ReturnType<typeof useQueryClient>,
  patientId: string
): void {
  queryClient.invalidateQueries({
    queryKey: aiExercisesQueryKeys.suggestions(patientId),
  });
}

/**
 * Invalidate all AI exercise caches
 */
export function invalidateAllAIExercises(
  queryClient: ReturnType<typeof useQueryClient>
): void {
  queryClient.invalidateQueries({
    queryKey: aiExercisesQueryKeys.all,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { useAIExercises as default };
