/**
 * FisioFlow AI Clinical Assistants - Module Index
 *
 * Centralized exports for all AI clinical functionality.
 * FASE 2 - IA Clínica Assistiva implementation.
 * FASE 5 - Analytics e ML Avançado implementation.
 *
 * @module lib/ai
 * @version 5.0.0
 */

// ============================================================================
// Exercise AI Assistant
// ============================================================================

export {
  // Main class
  ExerciseAIAssistant,
  // Factory functions
  createExerciseAIAssistant,
  getExerciseAIAssistant,
  // Utility functions
  calculateAge,
  determineTreatmentPhase,
  buildPatientContext,
  // Types
  type PatientProfileContext,
  type ExerciseRecommendation,
  type ExerciseProgramRecommendation,
  type ExerciseSuggestionResponse,
} from './exercises';

// ============================================================================
// SOAP Assistant with Voice
// ============================================================================

export {
  // Main class
  SOAPAssistant,
  // Factory functions
  createSOAPAssistant,
  getSOAPAssistant,
  // Utility functions
  formatSOAPToRecord,
  calculatePatientAge,
  buildPatientSOAPContext,
  // Types
  type PatientSOAPContext,
  type TranscriptionResult,
  type SOAPSection,
  type SOAPGenerationResult,
  type SOAPGenerationResponse,
  type VoiceTranscriptionOptions,
} from './soap-assistant';

// ============================================================================
// Clinical Decision Support
// ============================================================================

export {
  // Main class
  ClinicalDecisionSupport,
  // Factory functions
  createClinicalDecisionSupport,
  getClinicalDecisionSupport,
  // Utility functions
  buildPatientCaseData,
  requiresImmediateReferral,
  getCriticalRedFlags,
  // Types
  type PatientCaseData,
  type ClinicalRedFlag,
  type TreatmentRecommendation,
  type PrognosisIndicator,
  type RecommendedAssessment,
  type ClinicalAnalysisResult,
  type ClinicalAnalysisResponse,
  type GroundingOptions,
} from './clinical-support';

// ============================================================================
// Version & Metadata
// ============================================================================

export const AI_VERSION = '5.0.0';
export const AI_MODULE_NAME = '@fisioflow/ai-clinical-assistants';

/**
 * AI Module feature flags
 */
export const AI_FEATURES = {
  exerciseSuggestions: true,
  soapAssistant: true,
  voiceTranscription: true,
  clinicalDecisionSupport: true,
  grounding: true,
  multiLanguage: true,
  predictiveAnalytics: true,
  populationHealth: true,
  treatmentOptimization: true,
} as const;

/**
 * Supported languages for AI features
 */
export const AI_SUPPORTED_LANGUAGES = {
  portuguese: 'pt',
  english: 'en',
  spanish: 'es',
} as const;

/**
 * Default AI configuration
 */
export const AI_DEFAULT_CONFIG = {
  exerciseModel: 'gemini-2.5-flash-lite',
  soapModel: 'gemini-2.5-pro',
  clinicalModel: 'gemini-2.5-pro',
  transcriptionModel: 'gemini-2.5-pro',
  predictiveModel: 'gemini-2.5-pro',
  populationHealthModel: 'gemini-2.5-flash',
  treatmentOptimizerModel: 'gemini-2.5-pro',
  temperature: {
    exercise: 0.4,
    soap: 0.3,
    clinical: 0.2,
    predictive: 0.3,
    population: 0.4,
    optimization: 0.4,
  },
  maxTokens: {
    exercise: 4096,
    soap: 8192,
    clinical: 8192,
    predictive: 8192,
    population: 4096,
    optimization: 8192,
  },
} as const;

// ============================================================================
// FASE 5: Analytics e ML Avançado
// ============================================================================

// Predictive Analytics
export {
  predictRecoveryTimeline,
  type RecoveryPrediction,
  type PredictionInput,
} from './predictive-analytics';

// Population Health Analytics
export {
  analyzeClinicPopulation,
  type PopulationHealthAnalysis,
  type PopulationAnalysisOptions,
} from './population-health';

// Treatment Optimizer
export {
  optimizeTreatmentPlan,
  type TreatmentOptimization,
  type OptimizationInput,
  type EvidenceLevel,
  type RecommendationType,
} from './treatment-optimizer';
