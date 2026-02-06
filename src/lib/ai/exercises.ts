/**
 * Exercise AI Assistant - Firebase AI Logic Implementation
 *
 * Uses Gemini 2.5 Flash-Lite for cost-efficient exercise suggestions
 * based on patient profile, SOAP notes, and pain map data.
 *
 * @module lib/ai/exercises
 * @version 2.0.0
 */


// ============================================================================
// TYPES
// ============================================================================

/**
 * Patient profile context for exercise recommendations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { Exercise, Patient, SOAPRecord } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface PatientProfileContext {
  /** Patient basic information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition'> & {
    age: number;
  };
  /** Recent SOAP records for clinical context */
  soapHistory: Array<Pick<SOAPRecord, 'id' | 'sessionNumber' | 'subjective' | 'objective' | 'assessment' | 'plan'>>;
  /** Current pain map data (body regions with intensity 0-10) */
  painMap?: Record<string, number>;
  /** Patient treatment goals */
  goals: string[];
  /** Available equipment for home exercises */
  availableEquipment?: string[];
  /** Current treatment phase */
  treatmentPhase?: 'initial' | 'progressive' | 'advanced' | 'maintenance';
  /** Number of sessions completed */
  sessionCount: number;
}

/**
 * Individual exercise recommendation with rationale
 */
export interface ExerciseRecommendation {
  /** Exercise ID from the exercise library */
  exerciseId: string;
  /** Exercise name */
  name: string;
  /** Exercise category */
  category: string;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Why this exercise is recommended */
  rationale: string;
  /** Primary target area */
  targetArea: string;
  /** Specific goals addressed */
  goalsAddressed: string[];
  /** Suggested sets */
  sets?: number;
  /** Suggested repetitions */
  reps?: number;
  /** Suggested duration in minutes */
  duration?: number;
  /** Frequency recommendation */
  frequency?: string;
  /** Contraindications or precautions */
  precautions?: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Partial exercise recommendation (from AI, before validation)
 */
export type PartialExerciseRecommendation = Partial<ExerciseRecommendation>;

/**
 * Complete exercise program recommendation
 */
export interface ExerciseProgramRecommendation {
  /** Recommended exercises */
  exercises: PartialExerciseRecommendation[];
  /** Overall program rationale */
  programRationale: string;
  /** Expected outcomes */
  expectedOutcomes: string[];
  /** Progression criteria */
  progressionCriteria: string[];
  /** Red flags to monitor */
  redFlags?: string[];
  /** Alternative exercises if primary not suitable */
  alternatives?: PartialExerciseRecommendation[];
  /** Total estimated session duration */
  estimatedDuration: number;
}

/**
 * Exercise suggestion response with metadata
 */
export interface ExerciseSuggestionResponse {
  /** Success status */
  success: boolean;
  /** Exercise program recommendation */
  data?: ExerciseProgramRecommendation;
  /** Error message if failed */
  error?: string;
  /** Model used for generation */
  model?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

/**
 * Zod schema for exercise recommendation (partial - AI may return partial data)
 */
const ExerciseRecommendationSchema = z.object({
  exerciseId: z.string().optional().describe('Unique exercise identifier from the library'),
  name: z.string().optional().describe('Exercise name'),
  category: z.string().optional().describe('Exercise category (e.g., stretching, strengthening, mobility)'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Difficulty level'),
  rationale: z.string().optional().describe('Why this exercise is recommended for this patient'),
  targetArea: z.string().optional().describe('Primary anatomical target area'),
  goalsAddressed: z.array(z.string()).optional().describe('Specific patient goals this exercise addresses'),
  sets: z.number().optional().describe('Recommended number of sets'),
  reps: z.number().optional().describe('Recommended number of repetitions'),
  duration: z.number().optional().describe('Duration in minutes for timed exercises'),
  frequency: z.string().optional().describe('How often to perform this exercise'),
  precautions: z.array(z.string()).optional().describe('Any contraindications or precautions'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence score 0-1'),
});

/**
 * Zod schema for complete exercise program
 */
const ExerciseProgramSchema = z.object({
  exercises: z.array(ExerciseRecommendationSchema).min(3).max(10).describe('3-10 recommended exercises'),
  programRationale: z.string().describe('Overall explanation of the exercise program'),
  expectedOutcomes: z.array(z.string()).describe('Expected therapeutic outcomes'),
  progressionCriteria: z.array(z.string()).describe('Criteria for advancing the program'),
  redFlags: z.array(z.string()).optional().describe('Any warning signs to monitor'),
  alternatives: z.array(ExerciseRecommendationSchema).optional().describe('Alternative exercises'),
  estimatedDuration: z.number().describe('Total estimated session duration in minutes'),
});

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * AI model configuration
 */
const AI_CONFIG = {
  model: 'gemini-2.5-flash-lite', // Cost-efficient model
  temperature: 0.4, // Lower temperature for clinical consistency
  maxTokens: 4096,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
} as const;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

/**
 * System prompt for exercise recommendations
 */
const EXERCISE_SYSTEM_PROMPT = `You are an expert physical therapist AI assistant specializing in exercise prescription for the Brazilian Portuguese market.

Your role is to recommend appropriate exercises from a comprehensive library of 500+ exercises based on:
1. Patient profile (age, gender, condition)
2. Clinical notes (SOAP records)
3. Current pain presentation
4. Treatment goals
5. Available equipment
6. Treatment phase

Guidelines:
- Recommend 3-10 exercises per session
- Prioritize exercises that directly address pain areas and functional limitations
- Match difficulty to patient's current phase and session count
- Consider available equipment
- Always provide clinical rationale
- Include progression criteria
- Flag any red flags or precautions
- Use evidence-based approaches
- Consider Brazilian physical therapy standards

Response Format:
Return ONLY valid JSON matching the provided schema. Do not include markdown code blocks or additional text.`;

/**
 * Build user prompt from patient context
 */
function buildExercisePrompt(context: PatientProfileContext): string {
  const {
    patient,
    soapHistory,
    painMap,
    goals,
    availableEquipment,
    treatmentPhase,
    sessionCount,
  } = context;

  // Format pain map for prompt
  const painMapText = painMap
    ? Object.entries(painMap)
        .filter(([_, intensity]) => intensity > 0)
        .map(([area, intensity]) => `${area}: ${intensity}/10`)
        .join(', ')
    : 'No pain data available';

  // Format recent SOAP notes
  const recentSOAP = soapHistory.slice(-3).map((soap, _idx) => `
Sessão ${soap.sessionNumber}:
- Queixa principal: ${soap.subjective || 'N/A'}
- Avaliação: ${soap.assessment || 'N/A'}
- Plano: ${typeof soap.plan === 'object' ? JSON.stringify(soap.plan) : soap.plan || 'N/A'}
`).join('\n');

  return `
## Perfil do Paciente

**Dados Demográficos:**
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Gênero: ${patient.gender}
- Condição Principal: ${patient.mainCondition}

**Apresentação Atual de Dor:**
${painMapText || 'Sem dados de dor'}

**Histórico Clínico Recente:**
${recentSOAP || 'Sem histórico disponível'}

**Objetivos do Tratamento:**
${goals.map(g => `- ${g}`).join('\n')}

**Contexto do Tratamento:**
- Fase Atual: ${treatmentPhase || 'initial'}
- Número de Sessões: ${sessionCount}
- Equipamentos Disponíveis: ${availableEquipment?.join(', ') || 'Nenhum / Equipamento básico'}

## Solicitação

Com base no perfil acima, recomende um programa de exercícios apropriado que:

1. Direcione as áreas de dor identificadas
2. Considere as limitações e contraindicações do SOAP
3. Ajude a alcançar os objetivos estabelecidos
4. Use equipamentos disponíveis ou nenhum equipamento
5. Seja apropriado para a fase de tratamento atual
6. Inclua critérios de progressão clara

Retorne APENAS JSON válido sem blocos de código markdown.`;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * Exercise AI Assistant Class
 *
 * Provides AI-powered exercise recommendations using Firebase AI Logic
 */
export class ExerciseAIAssistant {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey?: string) {
    const key = apiKey || AI_CONFIG.apiKey;
    if (!key) {
      throw new Error('Google Generative AI API key is required');
    }
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({
      model: AI_CONFIG.model,
      systemInstruction: EXERCISE_SYSTEM_PROMPT,
    });
  }

  /**
   * Suggest exercises based on patient context
   *
   * @param context - Patient profile and clinical context
   * @returns Exercise program recommendation with rationale
   *
   * @example
   * ```typescript
   * const assistant = new ExerciseAIAssistant();
   * const recommendations = await assistant.suggestExercises({
   *   patient: { ... },
   *   soapHistory: [ ... ],
   *   painMap: { 'lombar': 7, 'quadril direito': 5 },
   *   goals: ['Reduzir dor lombar', 'Melhorar mobilidade'],
   *   sessionCount: 5
   * });
   * ```
   */
  async suggestExercises(context: PatientProfileContext): Promise<ExerciseSuggestionResponse> {
    try {
      const _startTime = Date.now();

      // Build prompt
      const prompt = buildExercisePrompt(context);

      // Generate content
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: AI_CONFIG.temperature,
          maxOutputTokens: AI_CONFIG.maxTokens,
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      const _endTime = Date.now();

      // Clean response (remove markdown code blocks if present)
      const cleanedJson = this.cleanJsonResponse(responseText);

      // Parse and validate response
      let programData: ExerciseProgramRecommendation;
      try {
        const parsed = ExerciseProgramSchema.parse(JSON.parse(cleanedJson));
        programData = parsed as ExerciseProgramRecommendation;
      } catch (parseError) {
        logger.error('[ExerciseAI] JSON parse error', parseError, 'exercises');
        return {
          success: false,
          error: 'Failed to parse AI response as valid exercise program',
        };
      }

      // Estimate token usage
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(cleanedJson);

      return {
        success: true,
        data: programData,
        model: AI_CONFIG.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      logger.error('[ExerciseAI] Generation error', error, 'exercises');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate exercise program with specific exercise IDs from library
   *
   * This method matches recommended exercises to actual exercise IDs
   * from the exercise library based on name similarity.
   *
   * @param context - Patient profile and clinical context
   * @param exerciseLibrary - Available exercises to match against
   * @returns Exercise program with actual exercise IDs
   */
  async suggestExercisesFromLibrary(
    context: PatientProfileContext,
    exerciseLibrary: Exercise[]
  ): Promise<ExerciseSuggestionResponse> {
    // Get AI recommendations first
    const aiResponse = await this.suggestExercises(context);

    if (!aiResponse.success || !aiResponse.data) {
      return aiResponse;
    }

    // Match exercises to library
    const matchedExercises = aiResponse.data.exercises.map((rec) => {
      // Find matching exercise by name similarity
      const match = this.findBestExerciseMatch(rec.name, exerciseLibrary);

      return {
        ...rec,
        exerciseId: match?.id || rec.exerciseId,
        // Update name if we found a match
        ...(match && { name: match.name }),
      };
    });

    return {
      ...aiResponse,
      data: {
        ...aiResponse.data,
        exercises: matchedExercises,
      },
    };
  }

  /**
   * Find best matching exercise from library using fuzzy matching
   */
  private findBestExerciseMatch(
    recommendedName: string,
    library: Exercise[]
  ): Exercise | null {
    // Simple exact match first
    const exactMatch = library.find(
      (e) => e.name.toLowerCase() === recommendedName.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = library.find((e) =>
      e.name.toLowerCase().includes(recommendedName.toLowerCase()) ||
      recommendedName.toLowerCase().includes(e.name.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  }

  /**
   * Clean JSON response by removing markdown code blocks
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Extract JSON if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    return cleaned.trim();
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new Exercise AI Assistant instance
 *
 * @param apiKey - Optional Google Generative AI API key (defaults to env var)
 * @returns Configured ExerciseAIAssistant instance
 */
export function createExerciseAIAssistant(apiKey?: string): ExerciseAIAssistant {
  return new ExerciseAIAssistant(apiKey);
}

/**
 * Get singleton instance of Exercise AI Assistant
 */
let _exerciseAIInstance: ExerciseAIAssistant | null = null;

export function getExerciseAIAssistant(): ExerciseAIAssistant {
  if (!_exerciseAIInstance) {
    _exerciseAIInstance = new ExerciseAIAssistant();
  }
  return _exerciseAIInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate patient age from birth date
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Determine treatment phase from session count
 */
export function determineTreatmentPhase(sessionCount: number): PatientProfileContext['treatmentPhase'] {
  if (sessionCount <= 3) return 'initial';
  if (sessionCount <= 8) return 'progressive';
  if (sessionCount <= 15) return 'advanced';
  return 'maintenance';
}

/**
 * Build patient context from database records
 */
export async function buildPatientContext(
  patient: Patient,
  soapHistory: SOAPRecord[],
  additionalContext?: Partial<PatientProfileContext>
): Promise<PatientProfileContext> {
  const age = calculateAge(patient.birthDate);
  const sessionCount = soapHistory.length;
  const treatmentPhase = determineTreatmentPhase(sessionCount);

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      birthDate: patient.birthDate,
      gender: patient.gender,
      mainCondition: patient.mainCondition,
      age,
    },
    soapHistory: soapHistory.map((soap) => ({
      id: soap.id,
      sessionNumber: soap.sessionNumber,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
    })),
    painMap: additionalContext?.painMap || {},
    goals: additionalContext?.goals || [],
    availableEquipment: additionalContext?.availableEquipment,
    treatmentPhase: additionalContext?.treatmentPhase || treatmentPhase,
    sessionCount,
  };
}
