/**
 * AI Insights Hook
 *
 * Provides AI-powered clinical insights and recommendations
 * using Vercel AI SDK with streaming support.
 */

import { useCompletion, useChat } from '@ai-sdk/react';
import { useState, useMemo } from 'react';
import type { PatientAnalyticsData } from '@/types/patientAnalytics';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AIInsightOptions {
  patientId: string;
  patientName: string;
  analyticsData?: PatientAnalyticsData;
  language?: 'pt-BR' | 'en';
}

export interface AIRecommendation {
  type: 'exercise' | 'session_frequency' | 'home_care' | 'specialist_referral';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  evidenceLevel: 'anecdotal' | 'clinical' | 'research_based';
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildClinicalInsightsPrompt(options: AIInsightOptions): string {
  const { patientName, analyticsData, language = 'pt-BR' } = options;

  const isPT = language === 'pt-BR';

  if (!analyticsData) {
    return isPT
      ? `Analise o paciente ${patientName} e forneça insights clínicos gerais para fisioterapia.`
      : `Analyze patient ${patientName} and provide general clinical insights for physical therapy.`;
  }

  const { progress_summary, pain_trend, function_trend, risk_score, predictions, goals } = analyticsData;

  const prompt = isPT
    ? `
Como especialista em fisioterapia e analytics, analise os dados do paciente ${patientName}:

## Dados de Progresso:
- Total de sessões: ${progress_summary.total_sessions}
- Redução total da dor: ${progress_summary.total_pain_reduction}%
- Objetivos alcançados: ${progress_summary.goals_achieved}
- Progresso geral: ${Math.round(progress_summary.overall_progress_percentage || 0)}%

## Tendências:
${pain_trend ? `- Dor atual: ${pain_trend.current_score}/10\n  Mudança: ${pain_trend.change > 0 ? '+' : ''}${pain_trend.change} (${pain_trend.change_percentage > 0 ? '+' : ''}${pain_trend.change_percentage}%)` : '- Dados de dor não disponíveis'}
${function_trend ? `- Função atual: ${function_trend.current_score}/100\n  Mudança: ${function_trend.change > 0 ? '+' : ''}${function_trend.change} (${function_trend.change_percentage > 0 ? '+' : ''}${function_trend.change_percentage}%)` : '- Dados de função não disponíveis'}

## Riscos:
- Risco de abandono: ${risk_score?.dropout_risk_score || 0}%
- Risco de não comparecimento: ${risk_score?.no_show_risk_score || 0}%
- Probabilidade de sucesso: ${predictions?.success_probability || 0}%

## Objetivos Ativos:
${goals.map(g => `- ${g.goal_title}: ${g.progress_percentage}% concluído (${g.status})`).join('\n')}

Forneça:
1. Análise do progresso atual (2-3 frases)
2. 3-5 recomendações específicas e acionáveis
3. Fatores de risco a monitorar
4. Sugestão de frequência ideal de sessões

Responda em formato markdown, em português do Brasil.
`
    : `
As a physical therapy analytics specialist, analyze patient ${patientName} data:

## Progress Data:
- Total sessions: ${progress_summary.total_sessions}
- Total pain reduction: ${progress_summary.total_pain_reduction}%
- Goals achieved: ${progress_summary.goals_achieved}
- Overall progress: ${Math.round(progress_summary.overall_progress_percentage || 0)}%

## Trends:
${pain_trend ? `- Current pain: ${pain_trend.current_score}/10\n  Change: ${pain_trend.change > 0 ? '+' : ''}${pain_trend.change} (${pain_trend.change_percentage > 0 ? '+' : ''}${pain_trend.change_percentage}%)` : '- Pain data not available'}
${function_trend ? `- Current function: ${function_trend.current_score}/100\n  Change: ${function_trend.change > 0 ? '+' : ''}${function_trend.change} (${function_trend.change_percentage > 0 ? '+' : ''}${function_trend.change_percentage}%)` : '- Function data not available'}

## Risks:
- Dropout risk: ${risk_score?.dropout_risk_score || 0}%
- No-show risk: ${risk_score?.no_show_risk_score || 0}%
- Success probability: ${predictions?.success_probability || 0}%

## Active Goals:
${goals.map(g => `- ${g.goal_title}: ${g.progress_percentage}% complete (${g.status})`).join('\n')}

Provide:
1. Analysis of current progress (2-3 sentences)
2. 3-5 specific actionable recommendations
3. Risk factors to monitor
4. Suggested ideal session frequency

Respond in markdown format.
`;

  return prompt;
}

function buildTreatmentRecommendationsPrompt(options: AIInsightOptions & {
  primaryComplaint?: string;
  diagnosis?: string;
  sessionCount?: number;
}): string {
  const { patientName, primaryComplaint, diagnosis, sessionCount, analyticsData, language = 'pt-BR' } = options;
  const isPT = language === 'pt-BR';

  let prompt = isPT
    ? `Como fisioterapeuta especialista, sugira um plano de tratamento para ${patientName}.`
    : `As a specialist physical therapist, suggest a treatment plan for ${patientName}.`;

  if (primaryComplaint) {
    prompt += isPT
      ? `\n\nQueixa principal: ${primaryComplaint}`
      : `\n\nChief complaint: ${primaryComplaint}`;
  }

  if (diagnosis) {
    prompt += isPT
      ? `\n\nDiagnóstico: ${diagnosis}`
      : `\n\nDiagnosis: ${diagnosis}`;
  }

  if (sessionCount) {
    prompt += isPT
      ? `\n\nNúmero de sessões realizadas: ${sessionCount}`
      : `\n\nSessions completed: ${sessionCount}`;
  }

  if (analyticsData?.pain_trend?.current_score) {
    prompt += isPT
      ? `\n\nNível de dor atual: ${analyticsData.pain_trend.current_score}/10`
      : `\n\nCurrent pain level: ${analyticsData.pain_trend.current_score}/10`;
  }

  prompt += isPT
    ? `\n\nForneça recomendações específicas para:\n1. Exercícios terapêuticos\n2. Frequência de sessões\n3. Cuidados domiciliares\n4. Critérios de alta\n\nResponda em formato markdown.`
    : `\n\nProvide specific recommendations for:\n1. Therapeutic exercises\n2. Session frequency\n3. Home care instructions\n4. Discharge criteria\n\nRespond in markdown format.`;

  return prompt;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for generating AI-powered clinical insights with streaming
 */
export function useAIInsights(options: AIInsightOptions) {
  const [isGenerating, setIsGenerating] = useState(false);

  const prompt = useMemo(() => buildClinicalInsightsPrompt(options), [
    options.patientId,
    options.patientName,
    options.analyticsData,
    options.language,
  ]);

  const completion = useCompletion({
    api: '/api/ai/insights',
    body: {
      patientId: options.patientId,
      patientName: options.patientName,
      language: options.language || 'pt-BR',
    },
    onFinish: (_prompt, completion) => {
      setIsGenerating(false);
      logger.info('[AI Insights] Generation complete', { completionLength: completion.length }, 'useAIInsights');
    },
    onError: (error) => {
      setIsGenerating(false);
      logger.error('[AI Insights] Generation error', error, 'useAIInsights');
    },
  });

  const generate = () => {
    setIsGenerating(true);
    completion.complete(prompt);
  };

  return {
    ...completion,
    generate,
    isGenerating: isGenerating || completion.isLoading,
  };
}

/**
 * Hook for generating AI-powered treatment recommendations with streaming
 */
export function useAITreatmentRecommendations(
  options: AIInsightOptions & {
    primaryComplaint?: string;
    diagnosis?: string;
    sessionCount?: number;
  }
) {
  const [isGenerating, setIsGenerating] = useState(false);

  const prompt = buildTreatmentRecommendationsPrompt(options);

  const completion = useCompletion({
    api: '/api/ai/recommendations',
    body: {
      patientId: options.patientId,
      patientName: options.patientName,
      diagnosis: options.diagnosis,
      language: options.language || 'pt-BR',
    },
    onFinish: (_prompt, completion) => {
      setIsGenerating(false);
      logger.info('[AI Recommendations] Generation complete', { completionLength: completion.length }, 'useAIInsights');
    },
    onError: (error) => {
      setIsGenerating(false);
      logger.error('[AI Recommendations] Generation error', error, 'useAIInsights');
    },
  });

  const generate = () => {
    setIsGenerating(true);
    completion.complete(prompt);
  };

  return {
    ...completion,
    generate,
    isGenerating: isGenerating || completion.isLoading,
  };
}

/**
 * Hook for AI chat assistant for patient analysis
 */
export function useAIPatientAssistant(patientId: string, patientName: string) {
  const chat = useChat({
    api: '/api/ai/chat/v2',
    body: {
      patientId,
      patientName,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Olá! Sou seu assistente de IA para análise do paciente ${patientName}. Posso ajudar com:\n\n` +
          `📊 **Análise de progresso** - Avaliar evolução do paciente\n` +
          `💡 **Recomendações** - Sugerir exercícios e tratamentos\n` +
          `⚠️ **Alertas** - Identificar riscos de abandono\n` +
          `📈 **Predições** - Estimar tempo de recuperação\n\n` +
          `Como posso ajudar hoje?`,
      },
    ],
    onError: (error) => {
      logger.error('[AI Chat] Error', error, 'useAIInsights');
    },
  });

  return {
    ...chat,
    // Helper to ask about specific aspects
    askAboutProgress: () => {
      chat.append({
        role: 'user',
        content: `Analise o progresso do paciente ${patientName} com base nos dados mais recentes.`,
      });
    },
    askAboutRisks: () => {
      chat.append({
        role: 'user',
        content: `Quais são os principais riscos para o paciente ${patientName}? Como podemos mitigá-los?`,
      });
    },
    askAboutRecommendations: () => {
      chat.append({
        role: 'user',
        content: `Quais recomendações você tem para melhorar os resultados do paciente ${patientName}?`,
      });
    },
  };
}

/**
 * Hook for batch AI analysis of multiple patients
 */
export function useAIBatchInsights() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<Array<{ patientId: string; insight: string }>>([]);
  const [error, setError] = useState<Error | null>(null);

  const analyzeBatch = async (patientIds: string[]) => {
    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const batchSize = 5; // Process 5 patients at a time
      const allResults: Array<{ patientId: string; insight: string }> = [];

      for (let i = 0; i < patientIds.length; i += batchSize) {
        const batch = patientIds.slice(i, i + batchSize);
        const promises = batch.map(async (patientId) => {
          const response = await fetch('/api/ai/batch-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientIds: [patientId] }),
          });

          if (!response.ok) throw new Error(`Failed to analyze patient ${patientId}`);

          const data = await response.json();
          return { patientId, insight: data.insights?.[patientId] || '' };
        });

        const batchResults = await Promise.all(promises);
        allResults.push(...batchResults);

        setResults([...allResults]);
      }

      return allResults;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeBatch,
    isAnalyzing,
    results,
    error,
    clearResults: () => setResults([]),
  };
}
