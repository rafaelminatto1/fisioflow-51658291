/**
 * Exercise Search Service
 *
 * Provides semantic and full-text search for exercises using PGroonga.
 * Features:
 * - Multilingual search (Portuguese optimized)
 * - Fuzzy search with typo tolerance
 * - Similar exercise recommendations
 * - Search suggestions/autocomplete
 * - Advanced filtering
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ExerciseSearchResult {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  muscle_groups: string[] | null;
  equipment: string[] | null;
  image_url: string | null;
  video_url: string | null;
  instructions: string | null;
  relevance_score: number;
}

export interface ExerciseSearchParams {
  query?: string;
  category?: string;
  difficulty?: string;
  muscleGroup?: string;
  limit?: number;
  offset?: number;
}

export interface AdvancedExerciseSearchParams {
  query?: string;
  categories?: string[];
  difficulties?: string[];
  muscleGroups?: string[];
  equipment?: string[];
  minDuration?: number;
  maxDuration?: number;
  limit?: number;
  offset?: number;
}

export interface ExerciseSuggestion {
  name: string;
  category: string | null;
  suggestion_count: number;
}

export interface SimilarExerciseResult {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  similarity_score: number;
}

export interface ExerciseSearchStats {
  category: string;
  difficulty: string;
  exercise_count: number;
  unique_muscle_groups: string[];
  unique_equipment: string[];
}

// ============================================================================
// EXERCISE SEARCH SERVICE
// ============================================================================

class ExerciseSearchServiceClass {
  /**
   * Basic full-text search using PGroonga
   */
  async search(params: ExerciseSearchParams = {}): Promise<ExerciseSearchResult[]> {
    const { query = '', category, difficulty, muscleGroup, limit = 20, offset = 0 } = params;

    const { data, error } = await supabase.rpc('search_exercises_pgroonga', {
      search_query: query,
      category_filter: category || null,
      difficulty_filter: difficulty || null,
      muscle_group_filter: muscleGroup || null,
      max_results: limit,
      offset_count: offset,
    });

    if (error) {
      console.error('Exercise search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }

    return (data || []) as ExerciseSearchResult[];
  }

  /**
   * Fuzzy search - tolerant of typos
   */
  async fuzzySearch(query: string, maxDistance: number = 2, limit: number = 10): Promise<ExerciseSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const { data, error } = await supabase.rpc('search_exercises_fuzzy', {
      search_query: query,
      max_distance: maxDistance,
      max_results: limit,
    });

    if (error) {
      console.error('Fuzzy search error:', error);
      throw new Error(`Fuzzy search failed: ${error.message}`);
    }

    return (data || []) as ExerciseSearchResult[];
  }

  /**
   * Find similar exercises to a given exercise
   */
  async findSimilar(exerciseId: string, limit: number = 5): Promise<SimilarExerciseResult[]> {
    const { data, error } = await supabase.rpc('find_similar_exercises', {
      exercise_id: exerciseId,
      max_results: limit,
    });

    if (error) {
      console.error('Similar exercises error:', error);
      throw new Error(`Failed to find similar exercises: ${error.message}`);
    }

    return (data || []) as SimilarExerciseResult[];
  }

  /**
   * Get search suggestions as user types
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<ExerciseSuggestion[]> {
    if (!partialQuery || partialQuery.trim().length < 1) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_exercise_suggestions', {
      partial_query: partialQuery,
      max_results: limit,
    });

    if (error) {
      console.error('Suggestions error:', error);
      return [];
    }

    return (data || []) as ExerciseSuggestion[];
  }

  /**
   * Advanced search with multiple filters
   */
  async advancedSearch(params: AdvancedExerciseSearchParams = {}): Promise<ExerciseSearchResult[]> {
    const {
      query = '',
      categories,
      difficulties,
      muscleGroups,
      equipment,
      minDuration,
      maxDuration,
      limit = 20,
      offset = 0,
    } = params;

    const { data, error } = await supabase.rpc('search_exercises_advanced', {
      search_query: query || null,
      categories: categories || null,
      difficulties: difficulties || null,
      muscle_groups: muscleGroups || null,
      equipment_filter: equipment || null,
      min_duration_seconds: minDuration || null,
      max_duration_seconds: maxDuration || null,
      max_results: limit,
      offset_count: offset,
    });

    if (error) {
      console.error('Advanced search error:', error);
      throw new Error(`Advanced search failed: ${error.message}`);
    }

    return (data || []) as ExerciseSearchResult[];
  }

  /**
   * Get search statistics and available filters
   */
  async getStats(): Promise<ExerciseSearchStats[]> {
    const { data, error } = await supabase
      .from('exercise_search_stats')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Stats error:', error);
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    return (data || []) as ExerciseSearchStats[];
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('category')
      .not('category', 'is', null)
      .order('category');

    if (error) {
      console.error('Categories error:', error);
      return [];
    }

    const categories = [...new Set(data.map((d) => d.category).filter(Boolean))];
    return categories;
  }

  /**
   * Get all available muscle groups
   */
  async getMuscleGroups(): Promise<string[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('muscle_groups');

    if (error) {
      console.error('Muscle groups error:', error);
      return [];
    }

    const allGroups = data.flatMap((d) => d.muscle_groups || []);
    const uniqueGroups = [...new Set(allGroups)].sort();
    return uniqueGroups;
  }

  /**
   * Get all available equipment
   */
  async getEquipment(): Promise<string[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('equipment');

    if (error) {
      console.error('Equipment error:', error);
      return [];
    }

    const allEquipment = data.flatMap((d) => d.equipment || []);
    const uniqueEquipment = [...new Set(allEquipment)].sort();
    return uniqueEquipment;
  }

  /**
   * Hybrid search combining PGroonga and vector embeddings
   * This provides the best of both worlds: exact text matching + semantic understanding
   */
  async hybridSearch(
    query: string,
    options: {
      textWeight?: number; // Weight for PGroonga text search (0-1)
      vectorWeight?: number; // Weight for vector semantic search (0-1)
      limit?: number;
      filters?: ExerciseSearchParams;
    } = {}
  ): Promise<ExerciseSearchResult[]> {
    const {
      textWeight = 0.5,
      vectorWeight = 0.5,
      limit = 20,
      filters = {},
    } = options;

    // Run both searches in parallel
    const [textResults, vectorResults] = await Promise.allSettled([
      this.search({ ...filters, query, limit: Math.ceil(limit * 1.5) }),
      this.vectorSearch(query, limit),
    ]);

    // Combine results with weighted scores
    const combinedMap = new Map<string, ExerciseSearchResult>();

    // Process text results
    if (textResults.status === 'success') {
      for (const result of textResults.value) {
        const existing = combinedMap.get(result.id);
        if (existing) {
          existing.relevance_score += result.relevance_score * textWeight;
        } else {
          result.relevance_score *= textWeight;
          combinedMap.set(result.id, result);
        }
      }
    }

    // Process vector results
    if (vectorResults.status === 'success') {
      for (const result of vectorResults.value) {
        const existing = combinedMap.get(result.id);
        if (existing) {
          existing.relevance_score += result.relevance_score * vectorWeight;
        } else {
          result.relevance_score *= vectorWeight;
          combinedMap.set(result.id, result);
        }
      }
    }

    // Sort by combined score and return top results
    return Array.from(combinedMap.values())
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  }

  /**
   * Vector-based semantic search using pgvector
   * This finds exercises with similar meanings, not just similar text
   */
  private async vectorSearch(query: string, limit: number = 20): Promise<ExerciseSearchResult[]> {
    try {
      // This would call an Edge Function that:
      // 1. Generates embedding for the query
      // 2. Uses pgvector to find similar exercises
      const response = await fetch('/api/exercises/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      });

      if (!response.ok) {
        return [];
      }

      const results = await response.json();
      return results || [];
    } catch (error) {
      console.error('Vector search error:', error);
      return [];
    }
  }

  /**
   * Search by pathology indication
   * Finds exercises that are good for specific conditions
   */
  async searchByPathology(pathology: string, limit: number = 10): Promise<ExerciseSearchResult[]> {
    // Search using the pathology term with some variations
    const variations = [
      pathology,
      pathology.replace('ão', 'ação').replace('ões', 'ações'),
      pathology.replace('dor de ', 'dolor'),
      pathology.replace('lesão', 'lesado'),
    ];

    const results: ExerciseSearchResult[] = [];

    for (const variation of variations) {
      const matches = await this.search({
        query: variation,
        limit: Math.ceil(limit / variations.length),
      });
      results.push(...matches);
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = Array.from(
      new Map(results.map((r) => [r.id, r])).values()
    ).sort((a, b) => b.relevance_score - a.relevance_score);

    return uniqueResults.slice(0, limit);
  }

  /**
   * Get exercise recommendations based on patient profile
   */
  async getRecommendations(options: {
    pathologies?: string[];
    goals?: string[];
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
    limitations?: string[];
    limit?: number;
  }): Promise<ExerciseSearchResult[]> {
    const { pathologies = [], goals = [], fitnessLevel, limitations = [], limit = 10 } = options;

    // Build search query from options
    const queryParts = [
      ...pathologies,
      ...goals,
      ...limitations.map((l) => `sem ${l}`),
    ];

    const difficultyMap: Record<string, string> = {
      beginner: 'Iniciante',
      intermediate: 'Intermediário',
      advanced: 'Avançado',
    };

    const results = await this.advancedSearch({
      query: queryParts.join(' '),
      difficulties: fitnessLevel ? [difficultyMap[fitnessLevel]] : undefined,
      limit,
    });

    return results;
  }

  /**
   * Real-time search suggestions as user types
   * Debounced for performance
   */
  private debounceTimer: NodeJS.Timeout | null = null;
  async getSuggestionsDebounced(
    query: string,
    callback: (suggestions: ExerciseSuggestion[]) => void,
    delay: number = 300
  ): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const suggestions = await this.getSuggestions(query);
      callback(suggestions);
    }, delay);
  }

  /**
   * Clear the debounce timer
   */
  clearDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const exerciseSearchService = new ExerciseSearchServiceClass();

// Convenience functions for common use cases
export const searchExercises = (query: string, limit?: number) =>
  exerciseSearchService.search({ query, limit });

export const findSimilarExercises = (exerciseId: string, limit?: number) =>
  exerciseSearchService.findSimilar(exerciseId, limit);

export const getExerciseSuggestions = (query: string) =>
  exerciseSearchService.getSuggestions(query);

export const getExerciseRecommendations = (options: Parameters<
  typeof exerciseSearchService.getRecommendations
>[0]) => exerciseSearchService.getRecommendations(options);
