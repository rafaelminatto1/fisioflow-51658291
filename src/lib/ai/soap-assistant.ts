/**
 * SOAP Note Assistant with Voice Transcription
 *
 * Uses Gemini 2.5 Pro for accurate clinical documentation.
 * Supports audio transcription and structured SOAP note generation.
 *
 * @module lib/ai/soap-assistant
 * @version 2.0.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { SOAPRecord, Patient } from '@/types';
import { logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Patient context for SOAP generation
 */
export interface PatientSOAPContext {
  /** Patient basic information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition' | 'medicalHistory'> & {
    age: number;
  };
  /** Previous SOAP records for context */
  previousSOAP?: Array<Pick<SOAPRecord, 'sessionNumber' | 'subjective' | 'objective' | 'assessment' | 'plan'>>;
  /** Current session number */
  sessionNumber: number;
  /** Session type */
  sessionType?: 'initial' | 'follow-up' | 'reassessment' | 'discharge';
  /** Consultation language */
  language?: 'pt' | 'en' | 'es';
}

/**
 * Transcription result from audio
 */
export interface TranscriptionResult {
  /** Full transcription text */
  transcription: string;
  /** Language detected */
  language: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Segments with timestamps */
  segments?: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  /** Processing duration in ms */
  processingTime: number;
}

/**
 * SOAP section data
 */
export interface SOAPSection {
  /** Subjective - What the patient says */
  subjective: string;
  /** Objective - Physical examination findings */
  objective: {
    inspection?: string;
    palpation?: string;
    movement_tests?: Record<string, string>;
    special_tests?: Record<string, string>;
    posture_analysis?: string;
    gait_analysis?: string;
  };
  /** Assessment - Clinical evaluation and diagnosis */
  assessment: string;
  /** Plan - Treatment plan and goals */
  plan: {
    short_term_goals?: string[];
    long_term_goals?: string[];
    interventions?: string[];
    frequency?: string;
    duration?: string;
    home_exercises?: string[];
    precautions?: string[];
  };
}

/**
 * Complete SOAP generation result
 */
export interface SOAPGenerationResult {
  /** Structured SOAP sections */
  soap: SOAPSection;
  /** Full transcription if audio was provided */
  transcription?: string;
  /** Key findings summary */
  keyFindings: string[];
  /** Recommended follow-up actions */
  recommendations: string[];
  /** Any red flags identified */
  redFlags?: string[];
  /** ICD-10 codes suggested */
  suggestedCodes?: string[];
}

/**
 * SOAP generation response with metadata
 */
export interface SOAPGenerationResponse {
  /** Success status */
  success: boolean;
  /** SOAP generation result */
  data?: SOAPGenerationResult;
  /** Error message if failed */
  error?: string;
  /** Model used */
  model?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Voice transcription options
 */
export interface VoiceTranscriptionOptions {
  /** Audio file as Buffer or base64 string */
  audioData: Buffer | string;
  /** Audio MIME type */
  mimeType?: 'audio/mp3' | 'audio/mp4' | 'audio/wav' | 'audio/webm' | 'audio/mpeg' | 'audio/x-wav';
  /** Enable timestamps */
  enableTimestamps?: boolean;
  /** Target language (auto-detect if not specified) */
  language?: 'pt' | 'en' | 'es';
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for objective section
 */
const ObjectiveSchema = z.object({
  inspection: z.string().optional(),
  palpation: z.string().optional(),
  movement_tests: z.record(z.string()).optional(),
  special_tests: z.record(z.string()).optional(),
  posture_analysis: z.string().optional(),
  gait_analysis: z.string().optional(),
});

/**
 * Schema for plan section
 */
const PlanSchema = z.object({
  short_term_goals: z.array(z.string()).optional(),
  long_term_goals: z.array(z.string()).optional(),
  interventions: z.array(z.string()).optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  home_exercises: z.array(z.string()).optional(),
  precautions: z.array(z.string()).optional(),
});

/**
 * Schema for complete SOAP section
 */
const SOAPSectionSchema = z.object({
  subjective: z.string().describe('Patient reported symptoms and complaints in Portuguese'),
  objective: ObjectiveSchema.optional().describe('Physical examination findings'),
  assessment: z.string().describe('Clinical assessment and diagnosis in Portuguese'),
  plan: PlanSchema.optional().describe('Treatment plan and goals'),
});

/**
 * Schema for SOAP generation result
 */
const SOAPGenerationSchema = z.object({
  soap: SOAPSectionSchema.describe('Structured SOAP note sections'),
  keyFindings: z.array(z.string()).describe('Key clinical findings from this session'),
  recommendations: z.array(z.string()).describe('Recommended actions for next session'),
  redFlags: z.array(z.string()).optional().describe('Any red flags requiring immediate attention'),
  suggestedCodes: z.array(z.string()).optional().describe('Suggested ICD-10 codes'),
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOAP_AI_CONFIG = {
  model: 'gemini-2.5-pro', // Higher accuracy for clinical documentation
  transcriptionModel: 'gemini-2.5-pro', // Same model supports audio
  temperature: 0.3, // Lower for clinical accuracy
  maxTokens: 8192, // Allow longer outputs
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
} as const;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

/**
 * System prompt for SOAP generation from text
 */
const SOAP_SYSTEM_PROMPT = `You are an expert physical therapist clinical documentation assistant specializing in SOAP note format for Brazilian healthcare.

Your role is to generate structured, professional SOAP notes in Portuguese from consultation transcripts or summaries.

Guidelines for SOAP format:
- **Subjective (S)**: Patient's reported symptoms, complaints, and concerns in their own words. Include pain levels, functional limitations, and progress since last session.
- **Objective (O)**: Measurable findings from physical examination. Include inspection, palpation, range of motion, strength, special tests, posture, and gait analysis.
- **Assessment (A)**: Clinical evaluation including diagnosis, prognosis, and response to treatment. Use professional terminology.
- **Plan (P)**: Evidence-based treatment plan with specific goals, interventions, frequency, and home exercises.

Quality Standards:
- Use professional Portuguese physical therapy terminology
- Be concise but complete
- Focus on function and outcomes
- Include measurable goals when possible
- Note any red flags or contraindications
- Align with Brazilian physical therapy best practices
- Use ICD-10 codes when relevant

Response Format:
Return ONLY valid JSON matching the provided schema. Do not include markdown code blocks.`;

/**
 * System prompt for voice transcription
 */
const TRANSCRIPTION_SYSTEM_PROMPT = `You are a medical transcription specialist for physical therapy consultations.

Your role is to accurately transcribe Portuguese audio from physical therapy consultations, maintaining:
- All medical terminology
- Patient quotes and expressions
- Therapist questions and instructions
- Non-verbal cues if described (e.g., [patient points to lower back])

Guidelines:
- Transcribe in Portuguese unless otherwise specified
- Use standard spelling and grammar
- Include timestamps if requested
- Maintain speaker distinctions (Paciente/Terapeuta)
- Note any unclear sections with [inaudível]
- Preserve emphasis and emotional content where relevant

Return the transcription as plain text (not JSON).`;

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * SOAP Assistant with Voice Transcription
 *
 * Provides AI-powered SOAP note generation from audio or text
 */
export class SOAPAssistant {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  private transcriptionModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(apiKey?: string) {
    const key = apiKey || SOAP_AI_CONFIG.apiKey;
    if (!key) {
      throw new Error('Google Generative AI API key is required');
    }
    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({
      model: SOAP_AI_CONFIG.model,
      systemInstruction: SOAP_SYSTEM_PROMPT,
    });
    this.transcriptionModel = this.genAI.getGenerativeModel({
      model: SOAP_AI_CONFIG.transcriptionModel,
      systemInstruction: TRANSCRIPTION_SYSTEM_PROMPT,
    });
  }

  /**
   * Generate SOAP note from consultation text
   *
   * @param consultationText - Full text of consultation notes or transcript
   * @param patientContext - Patient demographic and clinical context
   * @returns Structured SOAP note with metadata
   *
   * @example
   * ```typescript
   * const assistant = new SOAPAssistant();
   * const soap = await assistant.generateSOAPFromText(
   *   "Paciente relata dor lombar há 2 semanas...",
   *   { patient: { ... }, sessionNumber: 3 }
   * );
   * ```
   */
  async generateSOAPFromText(
    consultationText: string,
    patientContext: PatientSOAPContext
  ): Promise<SOAPGenerationResponse> {
    try {
      const startTime = Date.now();

      // Build prompt
      const prompt = this.buildSOAPPrompt(consultationText, patientContext);

      // Generate content
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: SOAP_AI_CONFIG.temperature,
          maxOutputTokens: SOAP_AI_CONFIG.maxTokens,
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();

      // Clean and parse response
      const cleanedJson = this.cleanJsonResponse(responseText);
      let soapData: SOAPGenerationResult;

      try {
        const parsed = SOAPGenerationSchema.parse(JSON.parse(cleanedJson));
        soapData = parsed as SOAPGenerationResult;
      } catch (parseError) {
        logger.error('JSON parse error', parseError, 'SOAPAssistant');
        return {
          success: false,
          error: 'Failed to parse AI response as valid SOAP note',
        };
      }

      // Estimate token usage
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(cleanedJson);

      return {
        success: true,
        data: soapData,
        model: SOAP_AI_CONFIG.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      logger.error('Generation error', error, 'SOAPAssistant');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Transcribe consultation audio and generate SOAP note
   *
   * @param audioData - Audio file as Buffer or base64 string
   * @param mimeType - Audio MIME type
   * @param patientContext - Patient context
   * @returns Transcription and generated SOAP note
   *
   * @example
   * ```typescript
   * const audioBuffer = fs.readFileSync('consultation.mp3');
   * const result = await assistant.generateSOAPFromAudio(
   *   audioBuffer,
   *   'audio/mp3',
   *   patientContext
   * );
   * ```
   */
  async generateSOAPFromAudio(
    audioData: Buffer | string,
    mimeType: VoiceTranscriptionOptions['mimeType'] = 'audio/mp3',
    patientContext: PatientSOAPContext
  ): Promise<SOAPGenerationResponse> {
    try {
      // Step 1: Transcribe audio
      const transcription = await this.transcribeAudio(audioData, mimeType);

      if (!transcription.success) {
        return {
          success: false,
          error: `Transcription failed: ${transcription.error}`,
        };
      }

      // Step 2: Generate SOAP from transcription
      const soapResult = await this.generateSOAPFromText(
        transcription.data!.transcription,
        patientContext
      );

      // Add transcription to result
      if (soapResult.success && soapResult.data) {
        soapResult.data.transcription = transcription.data!.transcription;
      }

      return soapResult;
    } catch (error) {
      logger.error('Audio processing error', error, 'SOAPAssistant');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Audio processing failed',
      };
    }
  }

  /**
   * Transcribe audio to text
   *
   * @param audioData - Audio data as Buffer or base64 string
   * @param mimeType - Audio MIME type
   * @returns Transcription result
   */
  async transcribeAudio(
    audioData: Buffer | string,
    mimeType: VoiceTranscriptionOptions['mimeType'] = 'audio/mp3'
  ): Promise<{ success: boolean; data?: TranscriptionResult; error?: string }> {
    try {
      const startTime = Date.now();

      // Prepare audio data
      const audioBase64 = Buffer.isBuffer(audioData)
        ? audioData.toString('base64')
        : audioData;

      // Generate content with audio
      const result = await this.transcriptionModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcreva esta consulta de fisioterapia para português. Inclua todas as falas do paciente e do terapeuta.',
              },
            ],
          },
        ],
      });

      const transcription = result.response.text();
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          transcription,
          language: 'pt',
          confidence: 0.9, // Gemini doesn't provide confidence, using default
          processingTime,
        },
      };
    } catch (error) {
      logger.error('Transcription error', error, 'SOAPAssistant');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      };
    }
  }

  /**
   * Translate SOAP note to another language
   *
   * @param soapNote - SOAP note to translate
   * @param targetLanguage - Target language code
   * @returns Translated SOAP note
   */
  async translateSOAP(
    soapNote: SOAPSection,
    targetLanguage: 'pt' | 'en' | 'es'
  ): Promise<{ success: boolean; data?: SOAPSection; error?: string }> {
    const langNames = { pt: 'Português', en: 'Inglês', es: 'Espanhol' };

    const prompt = `Traduza esta nota SOAP para ${langNames[targetLanguage]}, mantendo a estrutura JSON:

${JSON.stringify(soapNote)}

Retorne APENAS JSON válido.`;

    try {
      const result = await this.model.generateContent(prompt);
      const translatedText = result.response.text();
      const cleanedJson = this.cleanJsonResponse(translatedText);

      const translatedParsed = SOAPSectionSchema.parse(JSON.parse(cleanedJson));
      const translated = translatedParsed as SOAPSection;

      return { success: true, data: translated };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  }

  /**
   * Build SOAP generation prompt from context
   */
  private buildSOAPPrompt(
    consultationText: string,
    context: PatientSOAPContext
  ): string {
    const { patient, previousSOAP, sessionNumber, sessionType, language } = context;

    const sessionTypeLabel = {
      initial: 'Consulta Inicial',
      'follow-up': 'Consulta de Retorno',
      reassessment: 'Reavaliação',
      discharge: 'Alta',
    }[sessionType || 'follow-up'];

    // Format previous SOAP history
    const historyText = previousSOAP && previousSOAP.length > 0
      ? `

## Histórico de Sessões Anteriores

${previousSOAP.slice(-2).map((soap) => `
Sessão ${soap.sessionNumber}:
- S: ${soap.subjective?.substring(0, 200)}...
- A: ${soap.assessment?.substring(0, 200)}...
`).join('\n')}
`
      : '';

    return `
## Contexto da Consulta

**Tipo de Sessão:** ${sessionTypeLabel}
**Número da Sessão:** ${sessionNumber}

**Dados do Paciente:**
- Nome: ${patient.name}
- Idade: ${patient.age} anos
- Gênero: ${patient.gender}
- Condição Principal: ${patient.mainCondition}
- Histórico Médico: ${patient.medicalHistory || 'N/A'}
${historyText}

## Transcrição da Consulta

${consultationText}

## Solicitação

Gere uma nota SOAP estruturada e completa em português brasileiro com base na transcrição acima.

Inclua:
1. **Subjective**: Queixas e relatos do paciente
2. **Objective**: Exame físico detalhado (inspeção, palpação, testes)
3. **Assessment**: Avaliação clínica e diagnóstico funcional
4. **Plan**: Plano de tratamento com objetivos e intervenções

Adicione também:
- Principais achados clínicos
- Recomendações para próxima sessão
- Sinais de alerta (se houver)
- Códigos CID-10 sugeridos

Retorne APENAS JSON válido sem blocos de código markdown.`;
  }

  /**
   * Clean JSON response
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
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new SOAP Assistant instance
 */
export function createSOAPAssistant(apiKey?: string): SOAPAssistant {
  return new SOAPAssistant(apiKey);
}

/**
 * Get singleton instance
 */
let _soapAssistantInstance: SOAPAssistant | null = null;

export function getSOAPAssistant(): SOAPAssistant {
  if (!_soapAssistantInstance) {
    _soapAssistantInstance = new SOAPAssistant();
  }
  return _soapAssistantInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format SOAP section to database record
 */
export function formatSOAPToRecord(
  soap: SOAPSection,
  patientId: string,
  sessionNumber: number,
  createdBy: string
): Omit<SOAPRecord, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    patientId,
    sessionNumber,
    subjective: soap.subjective,
    objective: soap.objective,
    assessment: soap.assessment,
    plan: soap.plan,
    createdBy,
  };
}

/**
 * Calculate patient age from birth date
 */
export function calculatePatientAge(birthDate: string | Date): number {
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
 * Build patient context from database records
 */
export function buildPatientSOAPContext(
  patient: Patient,
  sessionNumber: number,
  previousSOAP?: SOAPRecord[],
  sessionType?: PatientSOAPContext['sessionType']
): PatientSOAPContext {
  return {
    patient: {
      id: patient.id,
      name: patient.name,
      birthDate: patient.birthDate,
      gender: patient.gender,
      mainCondition: patient.mainCondition,
      medicalHistory: patient.medicalHistory,
      age: calculatePatientAge(patient.birthDate),
    },
    previousSOAP: previousSOAP?.map((soap) => ({
      sessionNumber: soap.sessionNumber,
      subjective: soap.subjective,
      objective: soap.objective,
      assessment: soap.assessment,
      plan: soap.plan,
    })),
    sessionNumber,
    sessionType,
    language: 'pt',
  };
}
