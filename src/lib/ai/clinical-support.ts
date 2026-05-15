/**
 * Clinical Decision Support System
 *
 * Recebe a evolução clínica (observação livre + dados estruturados) e
 * devolve red flags, recomendações baseadas em evidência e prognóstico.
 *
 * Reescrito após migração SOAP → observação livre (Maio 2026):
 *   - input: `currentEvolution` (observação + EVA + procedimentos + exercícios + medições)
 *   - prompts narrativos, sem seções S/O/A/P
 *
 * @module lib/ai/clinical-support
 * @version 3.0.0
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import type { Patient } from "@/types";
import type {
  ProcedureItem,
  ExerciseItem,
  MeasurementItem,
} from "@/types/evolution";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { stripHtml } from "@/lib/utils/stripHtml";

// ============================================================================
// TYPES
// ============================================================================

/** Resumo da evolução atual da sessão para análise da IA. */
export interface CurrentEvolutionContext {
  /** Texto livre escrito pelo fisioterapeuta (HTML ou plain). */
  observacao: string;
  /** EVA 0-10. */
  painScale: number | null;
  procedures: ProcedureItem[];
  exercises: ExerciseItem[];
  measurements?: MeasurementItem[];
  /** PROMs aplicados nesta sessão (opcional). */
  proms?: Array<{ name: string; score: number | string; unit?: string }>;
}

/** Resumo de uma sessão anterior — para análise de tendência. */
export interface PreviousEvolutionSummary {
  sessionNumber: number;
  observacao: string;
  painScale: number | null;
  proceduresCount?: number;
  exercisesCount?: number;
}

/** Dados de paciente + caso para análise. */
export interface PatientCaseData {
  patient: Pick<
    Patient,
    "id" | "name" | "birthDate" | "gender" | "mainCondition" | "medicalHistory"
  > & {
    age: number;
  };
  /** Evolução atual desta sessão. */
  currentEvolution: CurrentEvolutionContext;
  /** Sessões anteriores (últimas N) — para análise de progresso. */
  previousSessions?: PreviousEvolutionSummary[];
  sessionNumber: number;
  treatmentDurationWeeks?: number;
}

/**
 * Clinical red flag with urgency level
 */
export interface ClinicalRedFlag {
  description: string;
  urgency: "immediate" | "urgent" | "monitor" | "informational";
  action: string;
  justification: string;
  category?: "cardiovascular" | "neurological" | "musculoskeletal" | "systemic" | "other";
}

export interface TreatmentRecommendation {
  intervention: string;
  evidenceLevel: "strong" | "moderate" | "limited" | "expert_opinion";
  rationale: string;
  references?: string[];
  expectedOutcomes?: string[];
  contraindications?: string[];
}

export interface PrognosisIndicator {
  indicator: string;
  value: "good" | "fair" | "poor";
  confidence: number;
  explanation: string;
  factors: string[];
}

export interface RecommendedAssessment {
  assessment: string;
  purpose: string;
  priority: "essential" | "recommended" | "optional";
  timing: string;
}

export interface ClinicalAnalysisResult {
  redFlags: ClinicalRedFlag[];
  treatmentRecommendations: TreatmentRecommendation[];
  prognosis: PrognosisIndicator[];
  recommendedAssessments: RecommendedAssessment[];
  caseSummary: string;
  keyConsiderations: string[];
  differentialDiagnoses?: string[];
  searchQueries?: string[];
}

export interface ClinicalAnalysisResponse {
  success: boolean;
  data?: ClinicalAnalysisResult;
  error?: string;
  model?: string;
  groundingUsed?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GroundingOptions {
  enabled: boolean;
  maxResults?: number;
  region?: "us" | "br" | "global";
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const RedFlagSchema = z.object({
  description: z.string(),
  urgency: z.enum(["immediate", "urgent", "monitor", "informational"]),
  action: z.string(),
  justification: z.string(),
  category: z
    .enum(["cardiovascular", "neurological", "musculoskeletal", "systemic", "other"])
    .optional(),
});

const TreatmentRecommendationSchema = z.object({
  intervention: z.string(),
  evidenceLevel: z.enum(["strong", "moderate", "limited", "expert_opinion"]),
  rationale: z.string(),
  references: z.array(z.string()).optional(),
  expectedOutcomes: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
});

const PrognosisIndicatorSchema = z.object({
  indicator: z.string(),
  value: z.enum(["good", "fair", "poor"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  factors: z.array(z.string()),
});

const RecommendedAssessmentSchema = z.object({
  assessment: z.string(),
  purpose: z.string(),
  priority: z.enum(["essential", "recommended", "optional"]),
  timing: z.string(),
});

const ClinicalAnalysisSchema = z.object({
  redFlags: z.array(RedFlagSchema),
  treatmentRecommendations: z.array(TreatmentRecommendationSchema).min(1),
  prognosis: z.array(PrognosisIndicatorSchema),
  recommendedAssessments: z.array(RecommendedAssessmentSchema),
  caseSummary: z.string(),
  keyConsiderations: z.array(z.string()),
  differentialDiagnoses: z.array(z.string()).optional(),
  searchQueries: z.array(z.string()).optional(),
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CLINICAL_AI_CONFIG = {
  model: "gemini-2.5-pro",
  temperature: 0.2,
  maxTokens: 8192,
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
  grounding: {
    enabled: true,
    maxResults: 5,
    region: "br" as const,
  },
} as const;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const CLINICAL_SUPPORT_SYSTEM_PROMPT = `Você é um sistema de apoio à decisão clínica para fisioterapia no Brasil.

Sua tarefa é analisar a evolução clínica de um paciente (observação narrativa do fisioterapeuta + dados estruturados de dor, procedimentos, exercícios e medições) e devolver recomendações baseadas em evidência, mantendo a segurança do paciente em primeiro lugar.

Princípios:
1. **Segurança em primeiro lugar**: sinalize red flags que requerem atenção médica.
2. **Evidência atual**: baseie-se em guidelines e pesquisas recentes (BR e internacionais).
3. **Apoio, não substituição**: a decisão final é sempre do fisioterapeuta.
4. **Português profissional, claro e objetivo.**

Red flags a monitorar:
- Cardiovascular: dor torácica, dispneia, sinais vitais anormais, edema súbito.
- Neurológico: fraqueza progressiva, alterações sensoriais, perda funcional, alterações de marcha.
- Sistêmico: febre, perda de peso inexplicada, dor noturna, sintomas sistêmicos.
- Musculoesquelético: sinais de fratura, dor incapacitante, perda funcional severa.

Níveis de evidência:
- strong: múltiplos RCTs / revisões sistemáticas.
- moderate: RCTs isolados ou estudos de coorte bem desenhados.
- limited: séries de casos, consenso de especialistas.
- expert_opinion: prática clínica sem pesquisa direta.

Retorne APENAS JSON válido conforme o schema. Recomendações devem ser específicas, acionáveis, com racional clínico claro.`;

const CLINICAL_SUPPORT_GROUNDING_PROMPT = `${CLINICAL_SUPPORT_SYSTEM_PROMPT}

Integração com Google Search:
Ao analisar, pesquise:
1. Pesquisas recentes sobre a condição do paciente.
2. Guidelines atuais (brasileiras e internacionais).
3. Evidência para as intervenções recomendadas.
4. Contraindicações ou precauções.
5. Red flags específicos da condição.

Inclua as queries usadas no campo \`searchQueries\` da resposta.`;

// ============================================================================
// HELPERS
// ============================================================================

function formatProcedures(items: ProcedureItem[]): string {
  if (!items?.length) return "Nenhum procedimento registrado.";
  return items
    .map((p) => {
      const parts = [`- ${p.name}`];
      if (p.intensity != null) parts.push(`(intensidade ${p.intensity})`);
      if (p.durationMinutes != null) parts.push(`(${p.durationMinutes} min)`);
      if (p.notes) parts.push(`— ${p.notes}`);
      return parts.join(" ");
    })
    .join("\n");
}

function formatExercises(items: ExerciseItem[]): string {
  if (!items?.length) return "Nenhum exercício prescrito.";
  return items
    .map((e) => {
      const dosage = [
        e.sets ? `${e.sets} séries` : null,
        e.reps ? `${e.reps} reps` : null,
        e.duration ? e.duration : null,
      ]
        .filter(Boolean)
        .join(" x ");
      const parts = [`- ${e.name}`];
      if (dosage) parts.push(`(${dosage})`);
      if (e.prescription) parts.push(`— ${e.prescription}`);
      if (e.patientFeedback) parts.push(`[feedback: ${e.patientFeedback}]`);
      return parts.join(" ");
    })
    .join("\n");
}

function formatMeasurements(items: MeasurementItem[] | undefined): string {
  if (!items?.length) return "Nenhuma medição registrada.";
  return items
    .map((m) => {
      const side = m.side ? ` (${m.side})` : "";
      const delta = m.previousValue != null ? ` [antes ${m.previousValue}${m.unit}]` : "";
      return `- ${m.name}${side}: ${m.value} ${m.unit}${delta}`;
    })
    .join("\n");
}

function formatProms(
  proms: CurrentEvolutionContext["proms"] | undefined,
): string {
  if (!proms?.length) return "Nenhuma escala aplicada nesta sessão.";
  return proms
    .map((p) => `- ${p.name}: ${p.score}${p.unit ? ` ${p.unit}` : ""}`)
    .join("\n");
}

function formatPreviousSessions(prev: PreviousEvolutionSummary[] | undefined): string {
  if (!prev?.length) return "";
  const last = prev.slice(-3);
  return `

## Histórico recente (últimas ${last.length} sessões)

${last
  .map((s) => {
    const obs = stripHtml(s.observacao).slice(0, 200);
    const pain = s.painScale != null ? `EVA ${s.painScale}/10` : "EVA não registrado";
    return `**Sessão ${s.sessionNumber}** — ${pain}
${obs}${obs.length === 200 ? "…" : ""}`;
  })
  .join("\n\n")}`;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class ClinicalDecisionSupport {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  private groundingModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null;
  private groundingEnabled: boolean;

  constructor(apiKey?: string, groundingOptions?: Partial<GroundingOptions>) {
    const key = apiKey || CLINICAL_AI_CONFIG.apiKey;
    if (!key) {
      throw new Error("Google Generative AI API key is required");
    }

    this.genAI = new GoogleGenerativeAI(key);
    this.model = this.genAI.getGenerativeModel({
      model: CLINICAL_AI_CONFIG.model,
      systemInstruction: CLINICAL_SUPPORT_SYSTEM_PROMPT,
    });

    this.groundingEnabled = groundingOptions?.enabled ?? CLINICAL_AI_CONFIG.grounding.enabled;

    if (this.groundingEnabled) {
      this.groundingModel = this.genAI.getGenerativeModel({
        model: CLINICAL_AI_CONFIG.model,
        systemInstruction: CLINICAL_SUPPORT_GROUNDING_PROMPT,
        // @ts-expect-error - googleSearch is a valid tool for Gemini
        tools: [{ googleSearch: {} }],
      });
    } else {
      this.groundingModel = null;
    }
  }

  async analyzeCase(
    caseData: PatientCaseData,
    useGrounding?: boolean,
  ): Promise<ClinicalAnalysisResponse> {
    try {
      const enableGrounding = useGrounding ?? this.groundingEnabled;
      const prompt = this.buildCaseAnalysisPrompt(caseData);
      const selectedModel =
        enableGrounding && this.groundingModel ? this.groundingModel : this.model;

      const result = await selectedModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: CLINICAL_AI_CONFIG.temperature,
          maxOutputTokens: CLINICAL_AI_CONFIG.maxTokens,
          responseMimeType: "application/json",
        },
      });

      const responseText = result.response.text();
      const cleanedJson = this.cleanJsonResponse(responseText);

      let analysisData: ClinicalAnalysisResult;
      try {
        analysisData = ClinicalAnalysisSchema.parse(JSON.parse(cleanedJson)) as ClinicalAnalysisResult;
      } catch (parseError) {
        logger.error("[ClinicalSupport] JSON parse error", parseError, "clinical-support");
        return {
          success: false,
          error: "Failed to parse AI response as valid clinical analysis",
        };
      }

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
      logger.error("[ClinicalSupport] Analysis error", error, "clinical-support");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  }

  async checkRedFlags(
    caseData: PatientCaseData,
  ): Promise<{ success: boolean; data?: ClinicalRedFlag[]; error?: string }> {
    const prompt = `${this.buildCaseAnalysisPrompt(caseData)}

## Tarefa focada

Analise APENAS sinais de alerta (red flags) que requerem atenção.

Retorne JSON com array de red flags contendo:
- description, urgency ("immediate"|"urgent"|"monitor"|"informational"), action, justification, category.

Retorne APENAS JSON válido.`;

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      });

      const cleaned = this.cleanJsonResponse(result.response.text());
      const redFlags = z.array(RedFlagSchema).parse(JSON.parse(cleaned)) as ClinicalRedFlag[];

      return { success: true, data: redFlags };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Red flag check failed",
      };
    }
  }

  async searchEvidence(query: string): Promise<{
    success: boolean;
    data?: { summary: string; references: string[]; evidenceLevel: string };
    error?: string;
  }> {
    if (!this.groundingModel) {
      return {
        success: false,
        error: "Grounding not enabled. Enable grounding to use evidence search.",
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
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const cleaned = this.cleanJsonResponse(result.response.text());
      const data = z
        .object({
          summary: z.string(),
          references: z.array(z.string()),
          evidenceLevel: z.string(),
        })
        .parse(JSON.parse(cleaned));

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Evidence search failed",
      };
    }
  }

  private buildCaseAnalysisPrompt(caseData: PatientCaseData): string {
    const { patient, currentEvolution, previousSessions, sessionNumber, treatmentDurationWeeks } =
      caseData;

    const observacaoText = stripHtml(currentEvolution.observacao || "") ||
      "Sem observação clínica registrada nesta sessão.";

    return `## Caso clínico para análise

### Paciente
- **Nome:** ${patient.name}
- **Idade:** ${patient.age} anos
- **Gênero:** ${patient.gender}
- **Condição principal:** ${patient.mainCondition}
- **Histórico médico:** ${patient.medicalHistory || "N/A"}

### Sessão atual
- **Número da sessão:** ${sessionNumber}
- **Tempo de tratamento:** ${treatmentDurationWeeks != null ? `${treatmentDurationWeeks} semanas` : "N/A"}

### Observação clínica do fisioterapeuta
${observacaoText}

### Dados estruturados desta sessão
- **Dor (EVA):** ${currentEvolution.painScale != null ? `${currentEvolution.painScale}/10` : "não registrado"}

**Procedimentos realizados:**
${formatProcedures(currentEvolution.procedures)}

**Exercícios prescritos:**
${formatExercises(currentEvolution.exercises)}

**Medições:**
${formatMeasurements(currentEvolution.measurements)}

**Escalas / PROMs aplicados:**
${formatProms(currentEvolution.proms)}
${formatPreviousSessions(previousSessions)}

## Análise solicitada

Devolva uma análise completa contendo:

1. **Red flags** — sinais de alerta com urgência (immediate/urgent/monitor/informational).
2. **Recomendações de tratamento** — intervenções baseadas em evidência com nível de evidência.
3. **Prognóstico** — indicadores prognósticos com confiança e fatores influentes.
4. **Avaliações recomendadas** — testes ou escalas adicionais.
5. **Resumo do caso** — síntese clínica curta.
6. **Considerações-chave** — pontos importantes para o plano.
7. **Diagnósticos diferenciais** — opcional, se aplicável.

Retorne APENAS JSON válido, sem blocos markdown.`;
  }

  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    return cleaned.trim();
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createClinicalDecisionSupport(
  apiKey?: string,
  groundingOptions?: Partial<GroundingOptions>,
): ClinicalDecisionSupport {
  return new ClinicalDecisionSupport(apiKey, groundingOptions);
}

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

/** Constrói o caso clínico a partir do EvolutionRecord atual e histórico. */
export function buildPatientCaseData(
  patient: Patient,
  currentEvolution: {
    observacao?: string;
    pain_scale?: number | null;
    procedures?: ProcedureItem[];
    exercises?: ExerciseItem[];
    measurements?: MeasurementItem[];
    session_number?: number;
  },
  previousSessions?: Array<{
    session_number?: number;
    observacao?: string;
    pain_scale?: number | null;
    procedures?: ProcedureItem[];
    exercises?: ExerciseItem[];
  }>,
  treatmentDurationWeeks?: number,
  proms?: CurrentEvolutionContext["proms"],
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
    currentEvolution: {
      observacao: currentEvolution.observacao ?? "",
      painScale: currentEvolution.pain_scale ?? null,
      procedures: currentEvolution.procedures ?? [],
      exercises: currentEvolution.exercises ?? [],
      measurements: currentEvolution.measurements ?? [],
      proms,
    },
    previousSessions: previousSessions?.map((s, idx) => ({
      sessionNumber: s.session_number ?? idx + 1,
      observacao: s.observacao ?? "",
      painScale: s.pain_scale ?? null,
      proceduresCount: s.procedures?.length,
      exercisesCount: s.exercises?.length,
    })),
    sessionNumber: currentEvolution.session_number ?? 1,
    treatmentDurationWeeks,
  };
}

function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export function requiresImmediateReferral(redFlags: ClinicalRedFlag[]): boolean {
  return redFlags.some((flag) => flag.urgency === "immediate" || flag.urgency === "urgent");
}

export function getCriticalRedFlags(redFlags: ClinicalRedFlag[]): ClinicalRedFlag[] {
  return redFlags.filter((flag) => flag.urgency === "immediate" || flag.urgency === "urgent");
}
