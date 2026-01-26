/**
 * Clinical Decision Support System
 *
 * Uses Gemini 2.5 Pro with Google Search grounding for evidence-based
 * clinical recommendations and red flag identification.
 *
 * @module lib/ai/clinical-support
 * @version 2.0.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { Patient, SOAPRecord } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Patient case data for clinical analysis
 */
export interface PatientCaseData {
  /** Patient basic information */
  patient: Pick<Patient, 'id' | 'name' | 'birthDate' | 'gender' | 'mainCondition' | 'medicalHistory'> & {
    age: number;
  };
  /** Current SOAP record being analyzed */
  currentSOAP: Pick<SOAPRecord, 'subjective' | 'objective' | 'assessment' | 'plan' | 'vitalSigns' | 'functionalTests'>;
  /** Previous sessions for trend analysis */
  previousSessions?: Array<Pick<SOAPRecord, 'sessionNumber' | 'subjective' | 'assessment' | 'plan'>>;
  /** Session number */
  sessionNumber: number;
  /** Treatment duration in weeks */
  treatmentDurationWeeks?: number;
}

/**
 * Clinical red flag with urgency level
 */
export interface ClinicalRedFlag {
  /** Description of the red flag */
  description: string;
  /** Urgency level */
  urgency: 'immediate' | 'urgent' | 'monitor' | 'informational';
  /** Recommended action */
  action: string;
  /** Clinical justification */
  justification: string;
  /** Related body system or condition */
  category?: 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'systemic' | 'other';
}

/**
 * Evidence-based treatment recommendation
 */
export interface TreatmentRecommendation {
  /** Intervention or technique recommended */
  intervention: string;
  /** Evidence level */
  evidenceLevel: 'strong' | 'moderate' | 'limited' | 'expert_opinion';
  /** Brief rationale */
  rationale: string;
  /** Supporting references or guidelines */
  references?: string[];
  /** Expected outcomes */
  expectedOutcomes?: string[];
  /** Contraindications */
  contraindications?: string[];
}

/**
 * Prognosis indicator
 */
export interface PrognosisIndicator {
  /** Indicator name */
  indicator: string;
  /** Value (good, fair, poor) */
  value: 'good' | 'fair' | 'poor';
  /** Confidence level */
  confidence: number;
  /** Explanation */
  explanation: string;
  /** Factors influencing this prognosis */
  factors: string[];
}

/**
 * Recommended assessments or tests
 */
export interface RecommendedAssessment {
  /** Assessment or test name */
  assessment: string;
  /** Purpose or rationale */
  purpose: string;
  /** Priority */
  priority: 'essential' | 'recommended' | 'optional';
  /** When to perform */
  timing: string;
}

/**
 * Complete clinical analysis result
 */
export interface ClinicalAnalysisResult {
  /** Identified red flags */
  redFlags: ClinicalRedFlag[];
  /** Evidence-based treatment approaches */
  treatmentRecommendations: TreatmentRecommendation[];
  /** Prognosis indicators */
  prognosis: PrognosisIndicator[];
  /** Recommended assessments */
  recommendedAssessments: RecommendedAssessment[];
  /** Overall case summary */
  caseSummary: string;
  /** Key clinical considerations */
  keyConsiderations: string[];
  /** Differential diagnoses to consider */
  differentialDiagnoses?: string[];
  /** Search queries used for evidence (if grounding enabled) */
  searchQueries?: string[];
}

/**
 * Clinical analysis response with metadata
 */
export interface ClinicalAnalysisResponse {
  /** Success status */
  success: boolean;
  /** Clinical analysis result */
  data?: ClinicalAnalysisResult;
  /** Error message if failed */
  error?: string;
  /** Model used */
  model?: string;
  /** Whether grounding was used */
  groundingUsed?: boolean;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Grounding configuration options
 */
export interface GroundingOptions {
  /** Enable Google Search grounding */
  enabled: boolean;
  /** Maximum number of search results */
  maxResults?: number;
  /** Search region */
  region?: 'us' | 'br' | 'global';
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for red flag
 */
const RedFlagSchema = z.object({
  description: z.string().describe('Description of the clinical red flag'),
  urgency: z.enum(['immediate', 'urgent', 'monitor', 'informational']).describe('Urgency level'),
  action: z.string().describe('Recommended clinical action'),
  justification: z.string().describe('Clinical reasoning'),
  category: z.enum(['cardiovascular', 'neurological', 'musculoskeletal', 'systemic', 'other']).optional(),
});

/**
 * Schema for treatment recommendation
 */
const TreatmentRecommendationSchema = z.object({
  intervention: z.string().describe('Specific intervention or technique'),
  evidenceLevel: z.enum(['strong', 'moderate', 'limited', 'expert_opinion']).describe('Level of evidence'),
  rationale: z.string().describe('Clinical rationale'),
  references: z.array(z.string()).optional().describe('Supporting references'),
  expectedOutcomes: z.array(z.string()).optional().describe('Expected therapeutic outcomes'),
  contraindications: z.array(z.string()).optional().describe('Contraindications or precautions'),
});

/**
 * Schema for prognosis indicator
 */
const PrognosisIndicatorSchema = z.object({
  indicator: z.string().describe('Prognosis factor'),
  value: z.enum(['good', 'fair', 'poor']).describe('Prognosis value'),
  confidence: z.number().min(0).max(1).describe('Confidence score'),
  explanation: z.string().describe('Explanation of the prognosis'),
  factors: z.array(z.string()).describe('Factors influencing prognosis'),
});

/**
 * Schema for recommended assessment
 */
const RecommendedAssessmentSchema = z.object({
  assessment: z.string().describe('Assessment or test name'),
  purpose: z.string().describe('Purpose of the assessment'),
  priority: z.enum(['essential', 'recommended', 'optional']).describe('Priority level'),
  timing: z.string().describe('When to perform the assessment'),
});

/**
 * Schema for complete clinical analysis
 */
const ClinicalAnalysisSchema = z.object({
  redFlags: z.array(RedFlagSchema).describe('Identified clinical red flags'),
  treatmentRecommendations: z.array(TreatmentRecommendationSchema).min(1).describe('Evidence-based treatment recommendations'),
  prognosis: z.array(PrognosisIndicatorSchema).describe('Prognosis indicators'),
  recommendedAssessments: z.array(RecommendedAssessmentSchema).describe('Recommended assessments'),
  caseSummary: z.string().describe('Overall case summary'),
  keyConsiderations: z.array(z.string()).describe('Key clinical considerations'),
  differentialDiagnoses: z.array(z.string()).optional().describe('Differential diagnoses to consider'),
  searchQueries: z.array(z.string()).optional().describe('Search queries used for evidence'),
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLINICAL_AI_CONFIG = {
  model: 'gemini-2.5-pro', // Higher accuracy for clinical decisions
  temperature: 0.2, // Low temperature for clinical consistency
  maxTokens: 8192,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  grounding: {
    enabled: true,
    maxResults: 5,
    region: 'br' as const,
  },
} as const;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

/**
 * System prompt for clinical decision support
 */
const CLINICAL_SUPPORT_SYSTEM_PROMPT = `You are an expert clinical decision support system for physical therapy practice in Brazil.

Your role is to analyze patient cases and provide evidence-based recommendations while maintaining patient safety.

Core Principles:
1. **Safety First**: Always flag potential red flags that require medical attention
2. **Evidence-Based**: Base recommendations on current research and clinical guidelines
3. **Brazilian Standards**: Consider Brazilian physical therapy guidelines and healthcare context
4. **Professional Judgment**: Support, never replace, clinical judgment
5. **Clear Communication**: Use clear, professional Portuguese

Red Flag Categories to Monitor:
- **Cardiovascular**: Chest pain, dyspnea, abnormal vital signs, edema
- **Neurological**: Progressive weakness, sensory changes, gait disturbances, loss of function
- **Systemic**: Fever, unexplained weight loss, night pain, systemic symptoms
- **Musculoskeletal**: Fracture signs, severe pain, loss of function

Evidence Levels:
- **Strong**: Multiple high-quality RCTs, systematic reviews, meta-analyses
- **Moderate**: Some RCTs, well-designed cohort studies
- **Limited**: Case series, expert consensus, low-quality studies
- **Expert Opinion**: Clinical experience, no direct research

Response Format:
Return ONLY valid JSON matching the provided schema. Include specific, actionable recommendations with clear rationale.`;

/**
 * System prompt with Google Search grounding
 */
const CLINICAL_SUPPORT_GROUNDING_PROMPT = `${CLINICAL_SUPPORT_SYSTEM_PROMPT}

Google Search Integration:
When analyzing cases, search for:
1. Latest research on the patient's condition
2. Current clinical guidelines (Brazilian and international)
3. Evidence for recommended interventions
4. Contraindications or precautions
5. Red flags specific to the condition

Use search results to:
- Support recommendations with current evidence
- Identify recent advances in treatment
- Flag outdated practices
- Provide specific references

Include search queries used in the response.`;

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * Clinical Decision Support System
 *
 * Provides evidence-based analysis and recommendations
 */
export class ClinicalDecisionSupport {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private groundingModel: any;
  private groundingEnabled: boolean;

  constructor(
    apiKey?: string,
    groundingOptions?: Partial<GroundingOptions>
  ) {
    const key = apiKey || CLINICAL_AI_CONFIG.apiKey;
    if (!key) {
      throw new Error('Google Generative AI API key is required');
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({
      model: CLINICAL_AI_CONFIG.model,
      systemInstruction: CLINICAL_SUPPORT_SYSTEM_PROMPT,
    });

    // Configure grounding model
    this.groundingEnabled = groundingOptions?.enabled ?? CLINICAL_AI_CONFIG.grounding.enabled;

    if (this.groundingEnabled) {
      this.groundingModel = this.genAI.getGenerativeModel({
        model: CLINICAL_AI_CONFIG.model,
        systemInstruction: CLINICAL_SUPPORT_GROUNDING_PROMPT,
        // @ts-ignore - googleSearch is a valid tool for Gemini
        tools: [{ googleSearch: {} }],
      });
    }
  }

  /**
   * Analyze patient case for clinical decision support
   *
   * @param caseData - Patient case information
   * @param useGrounding - Enable Google Search grounding (default: from config)
   * @returns Clinical analysis with recommendations and red flags
   *
   * @example
   * ```typescript
   * const cds = new ClinicalDecisionSupport();
   * const analysis = await cds.analyzeCase({
   *   patient: { ... },
   *   currentSOAP: { ... },
   *   sessionNumber: 5
   * });
   * ```
   */
  async analyzeCase(
    caseData: PatientCaseData,
    useGrounding?: boolean
  ): Promise<ClinicalAnalysisResponse> {
    try {
      const startTime = Date.now();
      const enableGrounding = useGrounding ?? this.groundingEnabled;

      // Build prompt
      const prompt = this.buildCaseAnalysisPrompt(caseData);

      // Choose model based on grounding
      const selectedModel = enableGrounding && this.groundingModel
        ? this.groundingModel
        : this.model;

      // Generate content
      const result = await selectedModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: CLINICAL_AI_CONFIG.temperature,
          maxOutputTokens: CLINICAL_AI_CONFIG.maxTokens,
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();

      // Clean and parse
      const cleanedJson = this.cleanJsonResponse(responseText);
      let analysisData: ClinicalAnalysisResult;

      try {
        const parsed = ClinicalAnalysisSchema.parse(JSON.parse(cleanedJson));
        analysisData = parsed as ClinicalAnalysisResult;
      } catch (parseError) {
        console.error('[ClinicalSupport] JSON parse error:', parseError);
        return {
          success: false,
          error: 'Failed to parse AI response as valid clinical analysis',
        };
      }

      // Estimate token usage
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(cleanedJson);

      return {
        success: true,
        data: analysisData,
        model: CLINICAL_AI_CONFIG.model,
        groundingUsed: enableGrounding,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
      };
    } catch (error) {
      console.error('[ClinicalSupport] Analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  /**
   * Quick red flag check (focused analysis)
   *
   * @param caseData - Patient case information
   * @returns Only red flags and urgent recommendations
   */
  async checkRedFlags(
    caseData: PatientCaseData
  ): Promise<{ success: boolean; data?: ClinicalRedFlag[]; error?: string }> {
    const prompt = `
## Caso do Paciente

${this.formatCaseData(caseData)}

## Solicitação

Analise APENAS sinais de alerta (red flags) que requerem atenção.

Retorne JSON com array de red flags contendo:
- description: descrição do sinal de alerta
- urgency: "immediate" | "urgent" | "monitor" | "informational"
- action: ação recomendada
- justification: justificativa clínica
- category: "cardiovascular" | "neurological" | "musculoskeletal" | "systemic" | "other"

Retorne APENAS JSON válido.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Very low for safety
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      const cleaned = this.cleanJsonResponse(result.response.text());
      const redFlagsParsed = z.array(RedFlagSchema).parse(JSON.parse(cleaned));
      const redFlags = redFlagsParsed as ClinicalRedFlag[];

      return { success: true, data: redFlags };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Red flag check failed',
      };
    }
  }

  /**
   * Search for latest evidence on a specific condition or treatment
   *
   * @param query - Clinical question or topic
   * @returns Summary of evidence with references
   */
  async searchEvidence(
    query: string
  ): Promise<{
    success: boolean;
    data?: { summary: string; references: string[]; evidenceLevel: string };
    error?: string;
  }> {
    if (!this.groundingModel) {
      return {
        success: false,
        error: 'Grounding not enabled. Enable grounding to use evidence search.',
      };
    }

    const prompt = `Pesquise as evidências mais recentes sobre: "${query}"

Forneça:
1. Resumo das evidências atuais
2. Principais referências (guidelines, estudos)
3. Nível de evidência geral

Retorne APENAS JSON válido com campos: summary, references (array), evidenceLevel.`;

    try {
      const result = await this.groundingModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      });

      const cleaned = this.cleanJsonResponse(result.response.text());
      const dataParsed = z.object({
        summary: z.string(),
        references: z.array(z.string()),
        evidenceLevel: z.string(),
      }).parse(JSON.parse(cleaned));
      const data = {
        summary: dataParsed.summary,
        references: dataParsed.references,
        evidenceLevel: dataParsed.evidenceLevel,
      };

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Evidence search failed',
      };
    }
  }

  /**
   * Build case analysis prompt
   */
  private buildCaseAnalysisPrompt(caseData: PatientCaseData): string {
    const { patient, currentSOAP, previousSessions, sessionNumber, treatmentDurationWeeks } = caseData;

    // Format previous sessions
    const historyText = previousSessions && previousSessions.length > 0
      ? `

## Histórico de Tratamento

Sessões Anteriores: ${previousSessions.length}
${previousSessions.slice(-3).map((s) => `
Sessão ${s.sessionNumber}:
- Queixa: ${s.subjective?.substring(0, 150)}...
- Avaliação: ${s.assessment?.substring(0, 150)}...
`).join('\n')}
`
      : '';

    // Format vital signs
    const vitalSignsText = currentSOAP.vitalSigns
      ? `
**Sinais Vitais:**
${Object.entries(currentSOAP.vitalSigns)
  .filter(([k, v]) => v !== undefined)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}
`
      : '';

    // Format functional tests
    const functionalTestsText = currentSOAP.functionalTests
      ? `
**Testes Funcionais:**
${JSON.stringify(currentSOAP.functionalTests, null, 2)}
`
      : '';

    return `
## Caso Clínico para Análise

### Dados do Paciente
- **Nome:** ${patient.name}
- **Idade:** ${patient.age} anos
- **Gênero:** ${patient.gender}
- **Condição Principal:** ${patient.mainCondition}
- **Histórico Médico:** ${patient.medicalHistory || 'N/A'}

### Consulta Atual
- **Número da Sessão:** ${sessionNumber}
- **Duração do Tratamento:** ${treatmentDurationWeeks || 'N/A'} semanas
${vitalSignsText}
${functionalTestsText}

### SOAP Atual
**Subjetivo (Queixa do Paciente):**
${currentSOAP.subjective || 'Não informado'}

**Objetivo (Exame Físico):**
${typeof currentSOAP.objective === 'object'
    ? JSON.stringify(currentSOAP.objective, null, 2)
    : currentSOAP.objective || 'Não realizado'}

**Avaliação Clínica:**
${currentSOAP.assessment || 'Não realizada'}

**Plano de Tratamento:**
${typeof currentSOAP.plan === 'object'
    ? JSON.stringify(currentSOAP.plan, null, 2)
    : currentSOAP.plan || 'Não definido'}
${historyText}

## Análise Solicitada

Forneça uma análise completa incluindo:

1. **Red Flags:** Identifique sinais de alerta que requerem atenção imediata, urgente, ou monitoramento
2. **Recomendações de Tratamento:** Intervenções baseadas em evidências com nível de evidência
3. **Prognóstico:** Indicadores prognósticos com confiança e fatores influentes
4. **Avaliações Recomendadas:** Testes ou avaliações adicionais a considerar
5. **Resumo do Caso:** Síntese clínica concisa
6. **Considerações Chave:** Pontos importantes para tratamento
7. **Diagnósticos Diferenciais:** Condições a considerar (se aplicável)

Retorne APENAS JSON válido sem blocos de código markdown.`;
  }

  /**
   * Format case data for prompts
   */
  private formatCaseData(caseData: PatientCaseData): string {
    return JSON.stringify(caseData, null, 2);
  }

  /**
   * Clean JSON response
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '');
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
 * Create Clinical Decision Support instance
 */
export function createClinicalDecisionSupport(
  apiKey?: string,
  groundingOptions?: Partial<GroundingOptions>
): ClinicalDecisionSupport {
  return new ClinicalDecisionSupport(apiKey, groundingOptions);
}

/**
 * Get singleton instance
 */
let _clinicalSupportInstance: ClinicalDecisionSupport | null = null;

export function getClinicalDecisionSupport(): ClinicalDecisionSupport {
  if (!_clinicalSupportInstance) {
    _clinicalSupportInstance = new ClinicalDecisionSupport();
  }
  return _clinicalSupportInstance;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build patient case data from database records
 */
export function buildPatientCaseData(
  patient: Patient,
  currentSOAP: SOAPRecord,
  previousSessions?: SOAPRecord[],
  treatmentDurationWeeks?: number
): PatientCaseData {
  return {
    patient: {
      id: patient.id,
      name: patient.name,
      birthDate: patient.birthDate,
      gender: patient.gender,
      mainCondition: patient.mainCondition,
      medicalHistory: patient.medicalHistory,
      age: calculateAge(patient.birthDate),
    },
    currentSOAP: {
      subjective: currentSOAP.subjective,
      objective: currentSOAP.objective,
      assessment: currentSOAP.assessment,
      plan: currentSOAP.plan,
      vitalSigns: currentSOAP.vitalSigns,
      functionalTests: currentSOAP.functionalTests,
    },
    previousSessions: previousSessions?.map((s) => ({
      sessionNumber: s.sessionNumber,
      subjective: s.subjective,
      assessment: s.assessment,
      plan: s.plan,
    })),
    sessionNumber: currentSOAP.sessionNumber,
    treatmentDurationWeeks,
  };
}

/**
 * Calculate patient age from birth date
 */
function calculateAge(birthDate: string | Date): number {
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
 * Check if red flags require immediate referral
 */
export function requiresImmediateReferral(redFlags: ClinicalRedFlag[]): boolean {
  return redFlags.some((flag) => flag.urgency === 'immediate' || flag.urgency === 'urgent');
}

/**
 * Get high-priority red flags only
 */
export function getCriticalRedFlags(redFlags: ClinicalRedFlag[]): ClinicalRedFlag[] {
  return redFlags.filter((flag) => flag.urgency === 'immediate' || flag.urgency === 'urgent');
}
