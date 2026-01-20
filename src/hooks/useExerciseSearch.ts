/**
 * Exercise Search Hook
 *
 * React hook for searching exercises with PGroonga full-text search.
 * Provides debounced search, suggestions, and filters.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  exerciseSearchService,
  ExerciseSearchResult,
  ExerciseSearchParams,
  AdvancedExerciseSearchParams,
  ExerciseSuggestion,
  ExerciseSearchStats,
  SimilarExerciseResult,
} from '@/lib/services/ExerciseSearchService';

// ============================================================================
// TYPES
// ============================================================================

export interface UseExerciseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  enabled?: boolean;
}

export interface UseExerciseSearchResult {
  results: ExerciseSearchResult[];
  suggestions: ExerciseSuggestion[];
  loading: boolean;
  error: Error | null;
  search: (query: string, params?: Partial<ExerciseSearchParams>) => Promise<void>;
  clear: () => void;
  query: string;
}

export interface UseAdvancedExerciseSearchResult {
  results: ExerciseSearchResult[];
  loading: boolean;
  error: Error | null;
  search: (params: AdvancedExerciseSearchParams) => Promise<void>;
  clear: () => void;
}

export interface UseExerciseFiltersResult {
  categories: string[];
  difficulties: string[];
  muscleGroups: string[];
  equipment: string[];
  stats: ExerciseSearchStats[];
  loading: boolean;
}

// ============================================================================
// BASIC SEARCH HOOK
// ============================================================================

export function useExerciseSearch(
  initialQuery: string = '',
  options: UseExerciseSearchOptions = {}
): UseExerciseSearchResult {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    enabled = true,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [params, setParams] = useState<Partial<ExerciseSearchParams>>({});
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce query updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Fetch search results
  const {
    data: results = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['exercise-search', debouncedQuery, params],
    queryFn: () => exerciseSearchService.search({
      query: debouncedQuery,
      ...params,
    }),
    enabled: enabled && debouncedQuery.length >= minQueryLength,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch suggestions
  const {
    data: suggestions = [],
  } = useQuery({
    queryKey: ['exercise-suggestions', debouncedQuery],
    queryFn: () => exerciseSearchService.getSuggestions(debouncedQuery),
    enabled: enabled && debouncedQuery.length >= 1 && debouncedQuery.length < minQueryLength,
    staleTime: 1000 * 60 * 5,
  });

  const search = useCallback(async (newQuery: string, newParams?: Partial<ExerciseSearchParams>) => {
    setQuery(newQuery);
    if (newParams) {
      setParams(newParams);
    }
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setParams({});
    setDebouncedQuery('');
  }, []);

  return {
    results,
    suggestions,
    loading,
    error,
    search,
    clear,
    query,
  };
}

// ============================================================================
// ADVANCED SEARCH HOOK
// ============================================================================

export function useAdvancedExerciseSearch(): UseAdvancedExerciseSearchResult {
  const [searchParams, setSearchParams] = useState<AdvancedExerciseSearchParams>({});
  const queryClient = useQueryClient();

  const {
    data: results = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['exercise-advanced-search', searchParams],
    queryFn: () => exerciseSearchService.advancedSearch(searchParams),
    enabled: false, // Manual trigger
    staleTime: 1000 * 60 * 5,
  });

  const search = useCallback(async (params: AdvancedExerciseSearchParams) => {
    setSearchParams(params);
    const result = await refetch();
    return result.data || [];
  }, [refetch]);

  const clear = useCallback(() => {
    setSearchParams({});
    queryClient.invalidateQueries({ queryKey: ['exercise-advanced-search'] });
  }, [queryClient]);

  return {
    results,
    loading,
    error,
    search,
    clear,
  };
}

// ============================================================================
// SIMILAR EXERCISES HOOK
// ============================================================================

export function useSimilarExercises(exerciseId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ['similar-exercises', exerciseId, limit],
    queryFn: () => exerciseSearchService.findSimilar(exerciseId!, limit),
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================================================
// EXERCISE FILTERS HOOK
// ============================================================================

export function useExerciseFilters(): UseExerciseFiltersResult {
  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ['exercise-categories'],
    queryFn: () => exerciseSearchService.getCategories(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const {
    data: muscleGroups = [],
    isLoading: muscleGroupsLoading,
  } = useQuery({
    queryKey: ['exercise-muscle-groups'],
    queryFn: () => exerciseSearchService.getMuscleGroups(),
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: equipment = [],
    isLoading: equipmentLoading,
  } = useQuery({
    queryKey: ['exercise-equipment'],
    queryFn: () => exerciseSearchService.getEquipment(),
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: stats = [],
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['exercise-stats'],
    queryFn: () => exerciseSearchService.getStats(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Extract unique difficulties from stats
  const difficulties = [...new Set(stats.map((s) => s.difficulty).filter(Boolean))];

  return {
    categories,
    difficulties,
    muscleGroups,
    equipment,
    stats,
    loading: categoriesLoading || muscleGroupsLoading || equipmentLoading || statsLoading,
  };
}

// ============================================================================
// HYBRID SEARCH HOOK (Text + Vector)
// ============================================================================

export function useHybridExerciseSearch(
  query: string,
  options: {
    textWeight?: number;
    vectorWeight?: number;
    filters?: Partial<ExerciseSearchParams>;
    minQueryLength?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    textWeight = 0.5,
    vectorWeight = 0.5,
    filters = {},
    minQueryLength = 2,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['exercise-hybrid-search', query, filters, textWeight, vectorWeight],
    queryFn: () => exerciseSearchService.hybridSearch(query, {
      textWeight,
      vectorWeight,
      filters,
    }),
    enabled: enabled && query.length >= minQueryLength,
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// PATHOLOGY-BASED SEARCH HOOK
// ============================================================================

export function usePathologyExerciseSearch(
  pathology: string | null,
  limit: number = 10
) {
  return useQuery({
    queryKey: ['exercise-pathology-search', pathology, limit],
    queryFn: () => exerciseSearchService.searchByPathology(pathology!, limit),
    enabled: !!pathology && pathology.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================================================
// RECOMMENDATIONS HOOK
// ============================================================================

export function useExerciseRecommendations(options: Parameters<
  typeof exerciseSearchService.getRecommendations
>[0]) {
  return useQuery({
    queryKey: ['exercise-recommendations', options],
    queryFn: () => exerciseSearchService.getRecommendations(options),
    enabled: !!options,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// ============================================================================
// REAL-TIME SEARCH INPUT HOOK
// ============================================================================

export function useSearchInput(options: UseExerciseSearchOptions = {}) {
  const { debounceMs = 300 } = options;
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    results,
    suggestions,
    loading,
    search,
    clear,
  } = useExerciseSearch(value, options);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    search(newValue);
  };

  const handleClear = () => {
    setValue('');
    clear();
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Delay to allow click events on suggestions
    setTimeout(() => setIsFocused(false), 200);
  };

  return {
    value,
    setValue: handleChange,
    clear: handleClear,
    results,
    suggestions,
    loading,
    isFocused,
    setIsFocused,
    inputRef,
    hasValue: value.length > 0,
  };
}

// ============================================================================
// INFINITE SCROLL SEARCH HOOK
// ============================================================================

export function useInfiniteExerciseSearch(
  initialQuery: string = '',
  options: {
    pageSize?: number;
    minQueryLength?: number;
    enabled?: boolean;
  } = {}
) {
  const { pageSize = 20, minQueryLength = 2, enabled = true } = options;

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(0);
  const [allResults, setAllResults] = useState<ExerciseSearchResult[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const searchMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newResults = await exerciseSearchService.search({
        query,
        limit: pageSize,
        offset: page * pageSize,
      });

      if (newResults.length < pageSize) {
        setHasMore(false);
      }

      setAllResults((prev) => [...prev, ...newResults]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [query, page, pageSize, loading, hasMore]);

  const resetSearch = useCallback(async (newQuery: string) => {
    setQuery(newQuery);
    setPage(0);
    setAllResults([]);
    setHasMore(true);

    if (newQuery.length < minQueryLength) {
      return;
    }

    setLoading(true);
    try {
      const results = await exerciseSearchService.search({
        query: newQuery,
        limit: pageSize,
      });

      setAllResults(results);
      setPage(1);

      if (results.length < pageSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } finally {
      setLoading(false);
    }
  }, [minQueryLength, pageSize]);

  return {
    results: allResults,
    loading,
    hasMore,
    searchMore,
    resetSearch,
    query,
    setQuery: resetSearch,
  };
}
