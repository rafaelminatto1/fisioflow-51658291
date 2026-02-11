/**
 * RAG (Retrieval-Augmented Generation) para Sugestões Clínicas
 *
 * Combina busca vetorial com LLM para gerar sugestões baseadas em histórico
 */

import { flashModel, proModel } from '@/lib/firebase-ai';
import { logger } from '@/lib/errors/logger';
import { withPerformanceTrace, traceAIOperation } from '@/lib/monitoring/performance';
import {
  findSimilarEvolutions,
  indexEvolution,
  type VectorSearchResult,
} from '@/lib/services/vector-search';
import type { Evolution, Patient } from '@/types/clinical';

/**
 * Contexto clínico para geração de sugestões
 */
export interface ClinicalContext {
  patient: Patient;
  currentEvolution?: Evolution;
  recentEvolutions: Evolution[];
  similarCases: VectorSearchResult[];
}

/**
 * Sugestão clínica gerada
 */
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
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Busca casos similares e gera sugestões de tratamento
 *
 * @param patientId ID do paciente
 * @param currentEvolution Evolução atual (opcional)
 * @returns Sugestões clínicas
 */
export async function generateTreatmentSuggestion(
  patientId: string,
  currentEvolution?: Partial<Evolution>
): Promise<ClinicalSuggestion | null> {
  return withPerformanceTrace('rag_treatment_suggestion', async () => {
    try {
      // 1. Buscar contexto do paciente
      const context = await buildClinicalContext(patientId, currentEvolution);

      if (context.similarCases.length === 0) {
        logger.info(`[RAG] Nenhum caso similar encontrado para paciente ${patientId}`);
        return null;
      }

      // 2. Gerar sugestão usando RAG
      return await generateSuggestionWithContext(context);
    } catch (error) {
      logger.error(`[RAG] Erro ao gerar sugestão para paciente ${patientId}:`, error);
      return null;
    }
  });
}

/**
 * Constrói contexto clínico do paciente
 */
async function buildClinicalContext(
  patientId: string,
  currentEvolution?: Partial<Evolution>
): Promise<ClinicalContext> {
  // Buscar paciente (mock - implementar busca real)
  const patient = {} as Patient;

  // Buscar evoluções recentes
  const recentEvolutions: Evolution[] = []; // Mock

  // Se não tem evolução atual, usar a mais recente
  const evolution = currentEvolution || (recentEvolutions[0] as Evolution);

  // Buscar casos similares
  let similarCases: VectorSearchResult[] = [];

  if (evolution) {
    const queryText = [
      evolution.subjective || '',
      evolution.objective || '',
      evolution.assessment || '',
      evolution.plan || '',
    ].filter(Boolean).join('\n');

    similarCases = await findSimilarEvolutions(queryText, {
      limit: 5,
      minSimilarity: 0.7,
      patientId: patientId, // Incluir histórico do próprio paciente
    });
  }

  return {
    patient,
    currentEvolution: evolution,
    recentEvolutions,
    similarCases,
  };
}

/**
 * Gera sugestão com contexto usando RAG
 */
async function generateSuggestionWithContext(
  context: ClinicalContext
): Promise<ClinicalSuggestion> {
  return traceAIOperation('gemini-2.5-flash', 'rag_suggestion', async () => {
    // Preparar contexto
    const similarCasesText = context.similarCases
      .map((c, i) => `
Caso Similar #${i + 1} (similaridade: ${(c.similarity * 100).toFixed(0)}%):
Data: ${c.evolution.date}
Subjetivo: ${c.evolution.subjective || 'N/A'}
Objetivo: ${c.evolution.objective || 'N/A'}
Avaliação: ${c.evolution.assessment || 'N/A'}
Plano: ${c.evolution.plan || 'N/A'}
      `.trim())
      .join('\n\n');

    const recentEvolutionsText = context.recentEvolutions
      .slice(-3)
      .map((e, i) => `
Evolução Recente #${i + 1} (${e.date}):
${e.subjective || ''}
${e.assessment || ''}
      `.trim())
      .join('\n\n');

    const prompt = `
Você é um assistente clínico especializado em fisioterapia. Com base nos casos abaixo, sugira um tratamento.

# Caso Atual
Paciente: ${context.patient.name}
Idade: ${context.patient.age || 'N/A'}
Diagnósticos: ${context.patient.diagnosis?.join(', ') || 'N/A'}

${context.currentEvolution ? `
Evolução Atual:
Subjetivo: ${context.currentEvolution.subjective || 'N/A'}
Objetivo: ${context.currentEvolution.objective || 'N/A'}
Avaliação: ${context.currentEvolution.assessment || 'N/A'}
` : '# Evoluções Recentes do Paciente'}
${recentEvolutionsText}

# Casos Similares (Histórico de Tratamentos que Funcionaram)
${similarCasesText}

# Instruções
Com base nos casos similares acima, sugira:
1. Um plano de tratamento específico
2. 3-5 exercícios com nome, descrição, séries, repetições e justificativa
3. Precauções importantes
4. Resultados esperados
5. Nível de confiança (low/medium/high) baseado na similaridade dos casos

Responda em JSON com esta estrutura:
{
  "treatment": "descrição do tratamento",
  "exercises": [
    {
      "name": "nome do exercício",
      "description": "descrição detalhada",
      "sets": 3,
      "reps": 10,
      "rationale": "justificativa baseada nos casos similares"
    }
  ],
  "precautions": ["precaução 1", "precaução 2"],
  "expectedOutcomes": ["resultado 1", "resultado 2"],
  "confidence": "high"
}

IMPORTANTE: Baseie suas sugestões APENAS nos casos similares apresentados. Não invente informações.
`.trim();

    // Gerar resposta
    const result = await proModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const response = result.response;
    const text = response.text();

    // Extrair JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                     text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      logger.error('[RAG] Resposta não contém JSON válido:', text);
      return null;
    }

    const suggestion = JSON.parse(jsonMatch[1] || jsonMatch[0]) as ClinicalSuggestion;

    // Adicionar referências aos casos similares
    suggestion.references = context.similarCases.slice(0, 3).map(c => ({
      evolutionId: c.evolutionId,
      date: c.evolution.date,
      summary: `${c.evolution.assessment || 'Sem avaliação'} (similaridade: ${(c.similarity * 100).toFixed(0)}%)`,
    }));

    logger.info(`[RAG] Sugestão gerada com confiança ${suggestion.confidence}`);
    return suggestion;
  });
}

/**
 * Gera sugestão de exercícios baseada em diagnóstico
 *
 * @param diagnosis Diagnóstico do paciente
 * @param symptoms Sintomas atuais
 * @returns Lista de exercícios sugeridos
 */
export async function suggestExercisesByDiagnosis(
  diagnosis: string,
  symptoms?: string[]
): Promise<ClinicalSuggestion['exercises']> {
  return traceAIOperation('gemini-2.5-flash', 'suggest_exercises', async () => {
    const prompt = `
Sugira 3-5 exercícios de fisioterapia para:

Diagnóstico: ${diagnosis}
${symptoms ? `Sintomas: ${symptoms.join(', ')}` : ''}

Para cada exercício, forneça:
- name: nome do exercício
- description: descrição detalhada de como executar
- sets: número de séries (default 3)
- reps: número de repetições (default 10)
- rationale: por que este exercício ajuda

Responda em JSON array.
`.trim();

    const result = await flashModel.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                     text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      logger.error('[RAG] Resposta de exercícios não contém JSON válido:', text);
      return [];
    }

    const exercises = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return exercises;
  });
}

/**
 * Analisa evolução e sugere melhorias no plano
 *
 * @param evolutionId ID da evolução
 * @returns Análise e sugestões
 */
export async function analyzeEvolutionAndSuggest(
  evolutionId: string
): Promise<{
  analysis: string;
  suggestions: string[];
  considerations: string[];
} | null> {
  return withPerformanceTrace('rag_evolution_analysis', async () => {
    try {
      // Buscar evolução (mock - implementar busca real)
      const evolution = {} as Evolution;

      // Buscar evoluções anteriores do mesmo paciente
      // const previousEvolutions = await ...

      // Buscar casos similares
      const similarCases = await findSimilarEvolutions(
        [evolution.subjective, evolution.assessment].filter(Boolean).join('\n'),
        { limit: 5, minSimilarity: 0.6 }
      );

      if (similarCases.length === 0) {
        return null;
      }

      // Gerar análise
      const prompt = `
Analise esta evolução de fisioterapia e sugira melhorias:

# Evolução Atual
Data: ${evolution.date}
Subjetivo: ${evolution.subjective || 'N/A'}
Objetivo: ${evolution.objective || 'N/A'}
Avaliação: ${evolution.assessment || 'N/A'}
Plano: ${evolution.plan || 'N/A'}

# Casos Similares
${similarCases.map((c, i) => `
Caso #${i + 1} (${c.evolution.date}):
Avaliação: ${c.evolution.assessment}
Plano: ${c.evolution.plan}
Similaridade: ${(c.similarity * 100).toFixed(0)}%
`).join('\n')}

Forneça:
1. Uma análise breve da evolução atual
2. 3-5 sugestões de melhoria no plano de tratamento
3. Considerações importantes baseadas nos casos similares

Responda em JSON:
{
  "analysis": "análise da evolução",
  "suggestions": ["sugestão 1", "sugestão 2"],
  "considerations": ["consideração 1", "consideração 2"]
}
`.trim();

      const result = await flashModel.generateContent(prompt);
      const text = result.response.text();

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                       text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return null;
      }

      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (error) {
      logger.error(`[RAG] Erro ao analisar evolução ${evolutionId}:`, error);
      return null;
    }
  });
}

/**
 * Indexa evolução automaticamente após criação/edição
 */
export async function autoIndexEvolution(
  evolutionId: string,
  evolution: Partial<Evolution>
): Promise<void> {
  try {
    await indexEvolution(evolutionId, evolution);
    logger.info(`[RAG] Evolução ${evolutionId} indexada automaticamente`);
  } catch (error) {
    logger.error(`[RAG] Erro ao auto-indexar evolução ${evolutionId}:`, error);
  }
}

/**
 * Chat RAG - Perguntas e respostas sobre o paciente
 *
 * @param patientId ID do paciente
 * @param question Pergunta do profissional
 * @returns Resposta baseada no contexto do paciente
 */
export async function ragChatAboutPatient(
  patientId: string,
  question: string
): Promise<string | null> {
  return traceAIOperation('gemini-2.5-flash', 'rag_chat', async () => {
    try {
      // Buscar evoluções do paciente para contexto
      // const evolutions = await ...

      // Buscar contexto relevante baseado na pergunta
      // const relevantContext = await findSimilarEvolutions(question, { patientId });

      // Gerar resposta
      const prompt = `
Pergunta: ${question}

# Contexto do Paciente
ID: ${patientId}
[Inserir contexto completo do paciente aqui]

Baseado no contexto acima, responda à pergunta de forma clara e concisa.
Se a pergunta não puder ser respondida com o contexto disponível, diga que não há informações suficientes.
`.trim();

      const result = await flashModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error(`[RAG] Erro no chat RAG para paciente ${patientId}:`, error);
      return null;
    }
  });
}
