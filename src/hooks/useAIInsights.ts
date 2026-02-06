/**
 * AI Insights Hook
 *
 * Provides AI-powered clinical insights and recommendations
 * via Firebase Cloud Functions (Vertex AI / Gemini).
 */

import { useState, useMemo, useCallback } from 'react';

  getClinicalInsights,
  getTreatmentRecommendations,
  chatWithClinicalAssistant,
} from '@/services/ai/firebaseAIService';
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
 * Hook for generating AI-powered clinical insights (Firebase Cloud Functions)
 */
export function useAIInsights(options: AIInsightOptions) {
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prompt = useMemo(() => buildClinicalInsightsPrompt(options), [
    options.patientId,
    options.patientName,
    options.analyticsData,
    options.language,
  ]);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getClinicalInsights(prompt, {
        patientId: options.patientId,
        patientName: options.patientName,
        language: options.language,
      });
      setCompletion(result);
      logger.info('[AI Insights] Generation complete', { completionLength: result.length }, 'useAIInsights');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      logger.error('[AI Insights] Generation error', e, 'useAIInsights');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, options.patientId, options.patientName, options.language]);

  return {
    completion,
    complete: generate,
    isLoading,
    error,
    generate,
    isGenerating: isLoading,
  };
}

/**
 * Hook for generating AI-powered treatment recommendations (Firebase Cloud Functions)
 */
export function useAITreatmentRecommendations(
  options: AIInsightOptions & {
    primaryComplaint?: string;
    diagnosis?: string;
    sessionCount?: number;
  }
) {
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prompt = useMemo(() => buildTreatmentRecommendationsPrompt(options), [
    options.patientId,
    options.patientName,
    options.primaryComplaint,
    options.diagnosis,
    options.sessionCount,
    options.analyticsData,
    options.language,
  ]);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTreatmentRecommendations(prompt, {
        patientId: options.patientId,
        patientName: options.patientName,
        diagnosis: options.diagnosis,
        primaryComplaint: options.primaryComplaint,
        sessionCount: options.sessionCount,
        language: options.language,
      });
      setCompletion(result);
      logger.info('[AI Recommendations] Generation complete', { completionLength: result.length }, 'useAIInsights');
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      logger.error('[AI Recommendations] Generation error', e, 'useAIInsights');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, options.patientId, options.patientName, options.diagnosis, options.primaryComplaint, options.sessionCount, options.language]);

  return {
    completion,
    complete: generate,
    isLoading,
    error,
    generate,
    isGenerating: isLoading,
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Hook for AI chat assistant for patient analysis (Firebase Cloud Functions)
 */
export function useAIPatientAssistant(patientId: string, patientName: string) {
  const welcomeMessage: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: `Olá! Sou seu assistente de IA para análise do paciente ${patientName}. Posso ajudar com:\n\n` +
      `📊 **Análise de progresso** - Avaliar evolução do paciente\n` +
      `💡 **Recomendações** - Sugerir exercícios e tratamentos\n` +
      `⚠️ **Alertas** - Identificar riscos de abandono\n` +
      `📈 **Predições** - Estimar tempo de recuperação\n\n` +
      `Como posso ajudar hoje?`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const append = useCallback(async (msg: { role: 'user' | 'assistant'; content: string }) => {
    if (msg.role !== 'user') return;
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: msg.content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    try {
      const conversationHistory = [
        ...messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: msg.content },
      ];
      const response = await chatWithClinicalAssistant({
        message: msg.content,
        context: { patientId, condition: patientName, sessionCount: 0 },
        conversationHistory,
      });
      const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      logger.error('[AI Chat] Error', e, 'useAIInsights');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, patientName, messages]);

  return {
    messages,
    append,
    isLoading,
    error,
    askAboutProgress: () => append({ role: 'user', content: `Analise o progresso do paciente ${patientName} com base nos dados mais recentes.` }),
    askAboutRisks: () => append({ role: 'user', content: `Quais são os principais riscos para o paciente ${patientName}? Como podemos mitigá-los?` }),
    askAboutRecommendations: () => append({ role: 'user', content: `Quais recomendações você tem para melhorar os resultados do paciente ${patientName}?` }),
  };
}

/**
 * Hook for batch AI analysis of multiple patients (Firebase - sequential calls)
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
      const allResults: Array<{ patientId: string; insight: string }> = [];

      for (const patientId of patientIds) {
        const prompt = `Analise o paciente com ID ${patientId} e forneça insights clínicos gerais para fisioterapia em formato markdown.`;
        const insight = await getClinicalInsights(prompt, { patientId });
        allResults.push({ patientId, insight });
        setResults([...allResults]);
      }

      return allResults;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      setError(e);
      throw e;
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
