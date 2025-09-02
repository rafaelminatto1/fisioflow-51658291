import { useState, useCallback } from 'react';
import { aiOrchestrator } from '@/services/ai/AIOrchestrator';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface AIQueryContext {
  patientId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface AIResponse {
  response: string;
  source: 'knowledge_base' | 'cache' | 'provider' | 'fallback';
  confidence: number;
  processingTime: number;
  provider?: string;
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const query = useCallback(async (
    question: string,
    context: AIQueryContext = {}
  ): Promise<AIResponse | null> => {
    if (!question.trim()) {
      toast({
        title: 'Pergunta vazia',
        description: 'Por favor, digite uma pergunta válida',
        variant: 'destructive'
      });
      return null;
    }

    setIsLoading(true);
    
    try {
      const queryContext = {
        ...context,
        userId: user?.id
      };

      const response = await aiOrchestrator.query(question, queryContext);
      setLastResponse(response);

      // Feedback sobre a fonte da resposta
      const sourceMessages = {
        'knowledge_base': 'Resposta da base de conhecimento interna',
        'cache': 'Resposta do cache inteligente (rápida)',
        'provider': `Resposta gerada por ${response.provider}`,
        'fallback': 'Resposta baseada em diretrizes gerais'
      };

      if (response.source !== 'fallback') {
        toast({
          description: sourceMessages[response.source],
          duration: 2000
        });
      }

      return response;
    } catch (error) {
      console.error('Error in AI query:', error);
      
      toast({
        title: 'Erro no assistente',
        description: 'Não foi possível processar sua pergunta. Tente novamente.',
        variant: 'destructive'
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  const generateProtocol = useCallback(async (
    patientData: {
      age: number;
      gender: string;
      diagnosis: string;
      limitations?: string;
      goal?: string;
    }
  ): Promise<AIResponse | null> => {
    const prompt = `Desenvolva um protocolo de fisioterapia para:
      
      Paciente: ${patientData.age} anos, ${patientData.gender}
      Diagnóstico: ${patientData.diagnosis}
      ${patientData.limitations ? `Limitações: ${patientData.limitations}` : ''}
      ${patientData.goal ? `Objetivo: ${patientData.goal}` : ''}
      
      Inclua: fases do tratamento, exercícios específicos, progressão temporal e critérios de evolução.`;

    return await query(prompt, {
      category: 'protocolo',
      priority: 'high'
    });
  }, [query]);

  const suggestExercises = useCallback(async (
    currentExercise: string,
    patientLevel: string,
    progress: string,
    limitations?: string
  ): Promise<AIResponse | null> => {
    const prompt = `Sugira progressão de exercícios para:
      
      Exercício atual: ${currentExercise}
      Nível do paciente: ${patientLevel}
      Evolução: ${progress}
      ${limitations ? `Limitações: ${limitations}` : ''}
      
      Inclua: próximo nível, variações, critérios para progressão e adaptações necessárias.`;

    return await query(prompt, {
      category: 'exercicio',
      priority: 'medium'
    });
  }, [query]);

  const differentialDiagnosis = useCallback(async (
    symptoms: string,
    physicalExam: string,
    history: string
  ): Promise<AIResponse | null> => {
    const prompt = `Análise para diagnóstico diferencial:
      
      Sintomas: ${symptoms}
      Exame físico: ${physicalExam}
      História: ${history}
      
      Forneça: hipóteses diagnósticas, testes específicos, sinais de alerta e encaminhamentos.`;

    return await query(prompt, {
      category: 'diagnostico',
      priority: 'high'
    });
  }, [query]);

  const rateResponse = useCallback(async (
    queryId: string,
    rating: number,
    feedback?: string
  ): Promise<void> => {
    try {
      await aiOrchestrator.rateResponse(queryId, rating, feedback);
      
      toast({
        description: rating >= 4 ? 'Obrigado pelo feedback positivo!' : 'Feedback registrado, vamos melhorar!',
        duration: 2000
      });
    } catch (error) {
      console.error('Error rating response:', error);
    }
  }, [toast]);

  const getUsageStats = useCallback(async () => {
    try {
      return await aiOrchestrator.getUsageStats();
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }, []);

  return {
    query,
    generateProtocol,
    suggestExercises,
    differentialDiagnosis,
    rateResponse,
    getUsageStats,
    isLoading,
    lastResponse
  };
}