/**
 * AI Hooks - Module Index
 *
 * React hooks for AI clinical features.
 *
 * @module hooks/ai
 * @version 2.0.0
 */

// ============================================================================
// Exercise AI Hooks
// ============================================================================

export {
  // Main hook
  useAIExercises,
  // Specialized hooks
  useAIExercisesWithLibrary,
  useAIExercisesStale,
  useBatchAIExercises,
  // Utility functions
  prefetchAIExercises,
  invalidateAIExercises,
  invalidateAllAIExercises,
  // Query keys
  aiExercisesQueryKeys,
  // Types
  type UseAIExercisesOptions,
  type UseAIExercisesReturn,
  type ExerciseSuggestionVariables,
} from './useAIExercises';

// ============================================================================
// Re-exports from AI library (for convenience)
// ============================================================================

export type {
  // Exercise types
  PatientProfileContext,
  ExerciseRecommendation,
  ExerciseProgramRecommendation,
  // SOAP types
  PatientSOAPContext,
  SOAPSection,
  SOAPGenerationResult,
  // Clinical types
  PatientCaseData,
  ClinicalRedFlag,
  ClinicalAnalysisResult,
} from '@/lib/ai';
