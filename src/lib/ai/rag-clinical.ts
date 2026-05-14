/**
 * RAG (Retrieval-Augmented Generation) para Sugestões Clínicas
 *
 * Reescrito após migração SOAP → observação livre (Maio 2026):
 * o contexto agora é montado a partir de `observacao` (texto livre) +
 * estruturados (EVA, procedimentos, exercícios, medições). Não há mais
 * blocos S/O/A/P.
 *
 * @module lib/ai/rag-clinical
 * @version 2.0.0
 */

import { flashModel, proModel } from "@/lib/gemini-ai";
import { logger } from "@/lib/errors/logger";
import { withPerformanceTrace, traceAIOperation } from "@/lib/monitoring/performance";
import {
  findSimilarEvolutions,
  indexEvolution,
  type VectorSearchResult,
} from "@/lib/services/vector-search";
import type {
  ProcedureItem,
  ExerciseItem,
  MeasurementItem,
} from "@/types/evolution";

/** Evolução clínica (shape comum usado por retrieval/prompt). */
export interface RagEvolution {
  id?: string;
  date?: string;
  observacao?: string;
  painScale?: number | null;
  procedures?: ProcedureItem[];
  exercises?: ExerciseItem[];
  measurements?: MeasurementItem[];
}

/** Paciente em forma mínima para contexto. */
export interface RagPatient {
  id: string;
  name: string;
  age?: number;
  diagnosis?: string[];
}

export interface ClinicalContext {
  patient: RagPatient;
  currentEvolution?: RagEvolution;
  recentEvolutions: RagEvolution[];
  similarCases: VectorSearchResult[];
}

export interface ClinicalSuggestion {
  treatment: string;
  exercises: Array<{
    name: string;
    description: string;
    sets?: number;
    reps?: number;
    rationale: string;
  }>;
  precautions: string[];
  expectedOutcomes: string[];
  references: Array<{
    evolutionId: string;
    date: string;
    summary: string;
  }>;
  confidence: "low" | "medium" | "high";
}

// ============================================================================
// HELPERS
// ============================================================================

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function evolutionToText(ev: Partial<RagEvolution>, maxObsChars = 400): string {
  const obs = stripHtml(ev.observacao || "").slice(0, maxObsChars);
  const eva = ev.painScale != null ? `EVA ${ev.painScale}/10` : null;
  const procs = ev.procedures?.length
    ? `Procedimentos: ${ev.procedures.map((p) => p.name).filter(Boolean).join(", ")}`
    : null;
  const exs = ev.exercises?.length
    ? `Exercícios: ${ev.exercises.map((e) => e.name).filter(Boolean).join(", ")}`
    : null;
  return [obs, eva, procs, exs].filter(Boolean).join("\n");
}

function evolutionToQueryText(ev: Partial<RagEvolution>): string {
  return [
    stripHtml(ev.observacao || ""),
    ev.painScale != null ? `dor ${ev.painScale}/10` : "",
    (ev.procedures || []).map((p) => p.name).filter(Boolean).join(" "),
    (ev.exercises || []).map((e) => e.name).filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join("\n");
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Busca casos similares e gera sugestão de tratamento.
 */
export async function generateTreatmentSuggestion(
  patientId: string,
  currentEvolution?: Partial<RagEvolution>,
): Promise<ClinicalSuggestion | null> {
  return withPerformanceTrace("rag_treatment_suggestion", async () => {
    try {
      const context = await buildClinicalContext(patientId, currentEvolution);

      if (context.similarCases.length === 0) {
        logger.info(
          `[RAG] Nenhum caso similar encontrado para paciente ${patientId}`,
          undefined,
          "rag-clinical",
        );
        return null;
      }

      return await generateSuggestionWithContext(context);
    } catch (error) {
      logger.error(
        `[RAG] Erro ao gerar sugestão para paciente ${patientId}:`,
        error,
        "rag-clinical",
      );
      return null;
    }
  });
}

async function buildClinicalContext(
  patientId: string,
  currentEvolution?: Partial<RagEvolution>,
): Promise<ClinicalContext> {
  // TODO: integrar com patientsApi para obter dados reais.
  const patient: RagPatient = { id: patientId, name: "" };
  const recentEvolutions: RagEvolution[] = [];

  const evolution = currentEvolution || (recentEvolutions[0] as RagEvolution | undefined);

  let similarCases: VectorSearchResult[] = [];

  if (evolution) {
    const queryText = evolutionToQueryText(evolution);
    if (queryText) {
      similarCases = await findSimilarEvolutions(queryText, {
        limit: 5,
        minSimilarity: 0.7,
        patientId,
      });
    }
  }

  return {
    patient,
    currentEvolution: evolution,
    recentEvolutions,
    similarCases,
  };
}

async function generateSuggestionWithContext(
  context: ClinicalContext,
): Promise<ClinicalSuggestion | null> {
  return traceAIOperation("gemini-2.5-flash", "rag_suggestion", async () => {
    const similarCasesText = context.similarCases
      .map((c, i) => {
        const evo = (c.evolution as unknown) as RagEvolution;
        return `
Caso similar #${i + 1} (similaridade: ${(c.similarity * 100).toFixed(0)}%)
Data: ${evo.date ?? "—"}
${evolutionToText(evo)}
        `.trim();
      })
      .join("\n\n");

    const recentEvolutionsText = context.recentEvolutions
      .slice(-3)
      .map(
        (e, i) =>
          `
Evolução recente #${i + 1} (${e.date ?? "—"})
${evolutionToText(e, 250)}
        `.trim(),
      )
      .join("\n\n");

    const currentText = context.currentEvolution
      ? `
## Evolução atual
${evolutionToText(context.currentEvolution)}
`.trim()
      : "";

    const prompt = `
Você é um assistente clínico especializado em fisioterapia. Com base nos casos abaixo, sugira um plano de tratamento.

## Paciente
- Nome: ${context.patient.name || "—"}
- Idade: ${context.patient.age ?? "N/A"}
- Diagnósticos: ${context.patient.diagnosis?.join(", ") || "N/A"}

${currentText || `## Evoluções recentes do paciente\n${recentEvolutionsText}`}

## Casos similares (histórico de tratamentos que funcionaram)
${similarCasesText}

## Instruções
Com base nos casos similares acima, sugira:
1. Um plano de tratamento específico
2. 3-5 exercícios com nome, descrição, séries, repetições e justificativa
3. Precauções importantes
4. Resultados esperados
5. Nível de confiança (low/medium/high) baseado na similaridade dos casos

Responda em JSON com esta estrutura:
{
  "treatment": "...",
  "exercises": [
    { "name": "...", "description": "...", "sets": 3, "reps": 10, "rationale": "..." }
  ],
  "precautions": ["..."],
  "expectedOutcomes": ["..."],
  "confidence": "high"
}

IMPORTANTE: baseie suas sugestões APENAS nos casos similares apresentados. Não invente informações.
`.trim();

    const result = await proModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
    });

    const text = result.response.text();
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.error("[RAG] Resposta não contém JSON válido:", text, "rag-clinical");
      return null;
    }

    const suggestion = JSON.parse(jsonMatch[1] || jsonMatch[0]) as ClinicalSuggestion;

    suggestion.references = context.similarCases.slice(0, 3).map((c) => {
      const evo = (c.evolution as unknown) as RagEvolution;
      const snippet = stripHtml(evo.observacao || "").slice(0, 120) || "Sem observação";
      return {
        evolutionId: c.evolutionId,
        date: evo.date ?? "",
        summary: `${snippet} (similaridade: ${(c.similarity * 100).toFixed(0)}%)`,
      };
    });

    logger.info(
      `[RAG] Sugestão gerada com confiança ${suggestion.confidence}`,
      undefined,
      "rag-clinical",
    );
    return suggestion;
  });
}

/**
 * Sugere exercícios a partir de diagnóstico (sem contexto RAG).
 */
export async function suggestExercisesByDiagnosis(
  diagnosis: string,
  symptoms?: string[],
): Promise<ClinicalSuggestion["exercises"]> {
  return traceAIOperation("gemini-2.5-flash", "suggest_exercises", async () => {
    const prompt = `
Sugira 3-5 exercícios de fisioterapia para:

Diagnóstico: ${diagnosis}
${symptoms ? `Sintomas: ${symptoms.join(", ")}` : ""}

Para cada exercício, forneça:
- name, description, sets (default 3), reps (default 10), rationale.

Responda em JSON array.
`.trim();

    const result = await flashModel.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      logger.error(
        "[RAG] Resposta de exercícios não contém JSON válido:",
        text,
        "rag-clinical",
      );
      return [];
    }

    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  });
}

/**
 * Analisa uma evolução e sugere melhorias no plano.
 *
 * O caller deve passar a evolução completa — a função não busca no DB.
 */
export async function analyzeEvolutionAndSuggest(
  evolution: RagEvolution,
): Promise<{
  analysis: string;
  suggestions: string[];
  considerations: string[];
} | null> {
  return withPerformanceTrace("rag_evolution_analysis", async () => {
    try {
      const queryText = evolutionToQueryText(evolution);
      if (!queryText) return null;

      const similarCases = await findSimilarEvolutions(queryText, {
        limit: 5,
        minSimilarity: 0.6,
      });

      if (similarCases.length === 0) {
        return null;
      }

      const prompt = `
Analise esta evolução de fisioterapia e sugira melhorias:

## Evolução atual
Data: ${evolution.date ?? "—"}
${evolutionToText(evolution)}

## Casos similares
${similarCases
  .map((c, i) => {
    const evo = (c.evolution as unknown) as RagEvolution;
    return `Caso #${i + 1} (${evo.date ?? "—"}, similaridade ${(c.similarity * 100).toFixed(0)}%)\n${evolutionToText(evo, 250)}`;
  })
  .join("\n\n")}

Forneça:
1. Uma análise breve da evolução atual
2. 3-5 sugestões de melhoria no plano de tratamento
3. Considerações importantes baseadas nos casos similares

Responda em JSON:
{
  "analysis": "...",
  "suggestions": ["..."],
  "considerations": ["..."]
}
`.trim();

      const result = await flashModel.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (error) {
      logger.error("[RAG] Erro ao analisar evolução:", error, "rag-clinical");
      return null;
    }
  });
}

/** Indexa evolução automaticamente após criação/edição. */
export async function autoIndexEvolution(
  evolutionId: string,
  evolution: Partial<RagEvolution>,
): Promise<void> {
  try {
    await indexEvolution(evolutionId, evolution as never);
    logger.info(
      `[RAG] Evolução ${evolutionId} indexada automaticamente`,
      undefined,
      "rag-clinical",
    );
  } catch (error) {
    logger.error(`[RAG] Erro ao auto-indexar evolução ${evolutionId}:`, error, "rag-clinical");
  }
}

/** Chat RAG sobre o paciente (placeholder: contexto completo é responsabilidade do caller). */
export async function ragChatAboutPatient(
  patientId: string,
  question: string,
  contextSummary?: string,
): Promise<string | null> {
  return traceAIOperation("gemini-2.5-flash", "rag_chat", async () => {
    try {
      const prompt = `
Pergunta: ${question}

## Contexto do paciente
ID: ${patientId}
${contextSummary || "(sem contexto fornecido)"}

Baseado no contexto acima, responda à pergunta de forma clara e concisa.
Se a pergunta não puder ser respondida com o contexto disponível, diga que não há informações suficientes.
`.trim();

      const result = await flashModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error(
        `[RAG] Erro no chat RAG para paciente ${patientId}:`,
        error,
        "rag-clinical",
      );
      return null;
    }
  });
}
