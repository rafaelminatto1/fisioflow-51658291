/**
 * AI Flows Index
 * 
 * Central export point for all Genkit AI flows
 */

export {
    generateExercisePlan,
} from './exerciseGenerator';

export {
    exerciseSuggestionFlow,
    exerciseProgressionFlow,
    type ExerciseSuggestionInput,
    type ExerciseRecommendation,
    type ExerciseProgramOutput,
} from './exerciseSuggestion';

export {
    redFlagCheckFlow,
    clinicalAnalysisFlow,
    comprehensiveClinicalFlow,
    type ClinicalAnalysisInput,
    type ClinicalAnalysisOutput,
} from './clinicalAnalysis';

export {
    soapGenerationFlow,
    soapEnhancementFlow,
    type SoapGenerationInput,
    type SoapNoteOutput,
} from './soapGeneration';
