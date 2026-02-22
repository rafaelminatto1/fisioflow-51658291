/**
 * Hook useAIScheduling - Integração com AI para agendamento
 *
 * Hook para interagir com os novos serviços de AI scheduling:
 * - suggestOptimalSlot: Sugere horários ótimos usando AI
 * - predictNoShow: Prediz probabilidade de falta
 * - optimizeCapacity: Otimiza capacidade dinamicamente
 * - waitlistPrioritization: Prioriza lista de espera com ML
 */

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SuggestOptimalSlotParams {
  patientId: string;
  desiredDate?: string;
  treatmentType?: string;
}

interface SlotSuggestion {
  date: string;
  time: string;
  confidence: number;
  reason: string;
}

interface NoShowPrediction {
  prediction: 'low' | 'medium' | 'high' | 'very-high';
  probability: number;
  riskFactors: string[];
  recommendation: string;
}

interface CapacityRecommendation {
  date: string;
  currentCapacity: number;
  recommendedCapacity: number;
  reason: string;
  expectedLoad: string;
}

interface UseAISchedulingProps {
  organizationId?: string;
}

export function useAIScheduling({ organizationId: propOrganizationId }: UseAISchedulingProps = {}) {
  const { organizationId: authOrganizationId } = useAuth();
  const finalOrgId = propOrganizationId || authOrganizationId || '';

  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const [noShowPrediction, setNoShowPrediction] = useState<NoShowPrediction | null>(null);
  const [capacityRecommendation, setCapacityRecommendation] = useState<CapacityRecommendation | null>(null);

  // Função auxiliar para chamar AI service
  const callAIService = useCallback(async (action: string, params: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ action, ...params, organizationId: finalOrgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to call AI service');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('AI service error:', error);
      toast({
        title: 'Erro ao processar solicitação',
        description: 'Não foi possível conectar com o serviço de IA.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [finalOrgId]);

  /**
   * Sugerir horários ótimos para um paciente
   */
  const suggestOptimalSlot = useCallback(async (params: SuggestOptimalSlotParams) => {
    try {
      const result = await callAIService('suggestOptimalSlot', params);

      if (result && result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);

        toast({
          title: '✅ Sugestões de horário geradas',
          description: `${result.suggestions.length} horários sugeridos pelo IA.`,
        });
      } else {
        setSuggestions([]);
        toast({
          title: 'Nenhuma sugestão encontrada',
          description: 'Não foi possível gerar sugestões de horário.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error in suggestOptimalSlot:', error);
    }
  }, [callAIService]);

  /**
   * Prediz probabilidade de não comparecimento (no-show)
   */
  const predictNoShow = useCallback(async ({
    patientId,
    appointmentDate,
    appointmentTime,
  }: {
    patientId: string;
    appointmentDate: string;
    appointmentTime: string;
  }) => {
    try {
      const result = await callAIService('predictNoShow', {
        patientId,
        appointmentDate,
        appointmentTime,
      });

      if (result) {
        setNoShowPrediction(result);

        const predictionLabels = {
          'low': 'Baixa',
          'medium': 'Média',
          'high': 'Alta',
          'very-high': 'Muito alta',
        };

        toast({
          title: 'Análise de risco completada',
          description: `Risco de não comparecimento: ${predictionLabels[result.prediction]} (${(result.probability * 100).toFixed(0)}%)`,
        });
      }
    } catch (error) {
      console.error('Error in predictNoShow:', error);
    }
  }, [callAIService]);

  /**
   * Otimizar capacidade dinamicamente
   */
  const optimizeCapacity = useCallback(async ({ date }: { date: string }) => {
    try {
      const result = await callAIService('optimizeCapacity', { date });

      if (result && result.recommendations && result.recommendations.length > 0) {
        setCapacityRecommendation(result.recommendations[0]);

        toast({
          title: 'Otimização de capacidade gerada',
          description: result.overallOptimization,
        });
      }
    } catch (error) {
      console.error('Error in optimizeCapacity:', error);
    }
  }, [callAIService]);

  /**
   * Priorizar lista de espera com ML
   */
  const prioritizeWaitlist = useCallback(async ({
    limit = 50,
    sortBy = 'priority',
  }: {
    limit?: number;
    sortBy?: 'priority' | 'waitingTime' | 'mixed';
  } = {}) => {
    try {
      const result = await callAIService('waitlistPrioritization', { limit, sortBy });

      if (result && result.rankedEntries) {
        toast({
          title: 'Lista de espera priorizada',
          description: `${result.rankedEntries.length} pacientes ordenados por prioridade.`,
        });

        return result.rankedEntries;
      }

      return [];
    } catch (error) {
      console.error('Error in prioritizeWaitlist:', error);
      return [];
    }
  }, [callAIService]);

  /**
   * Obter histórico de agendamentos de um paciente
   */
  const getPatientHistory = useCallback(async (patientId: string, limit = 30) => {
    try {
      const result = await callAIService('getPatientAppointmentHistory', { patientId, limit });
      return result;
    } catch (error) {
      console.error('Error in getPatientHistory:', error);
      return { appointments: [], stats: null };
    }
  }, [callAIService]);

  /**
   * Obter preferências de agendamento de um paciente
   */
  const getPatientPreferences = useCallback(async (patientId: string) => {
    try {
      const result = await callAIService('getPatientPreferences', { patientId });
      return result;
    } catch (error) {
      console.error('Error in getPatientPreferences:', error);
      return null;
    }
  }, [callAIService]);

  /**
   * Verificar capacidade disponível de um slot
   */
  const checkSlotCapacity = useCallback(async (date: string, time: string) => {
    try {
      const result = await callAIService('checkSlotCapacity', {
        date,
        time,
        organizationId: finalOrgId,
      });

      if (result) {
        return {
          capacity: result.capacity,
          occupied: result.occupied,
          available: result.available,
          isBlocked: result.isBlocked,
        };
      }

      return null;
    } catch (error) {
      console.error('Error in checkSlotCapacity:', error);
      return null;
    }
  }, [finalOrgId, callAIService]);

  return {
    isLoading,
    suggestions,
    noShowPrediction,
    capacityRecommendation,
    suggestOptimalSlot,
    predictNoShow,
    optimizeCapacity,
    prioritizeWaitlist,
    getPatientHistory,
    getPatientPreferences,
    checkSlotCapacity,
    clearSuggestions: useCallback(() => setSuggestions([]), []),
    clearNoShowPrediction: useCallback(() => setNoShowPrediction(null), []),
    clearCapacityRecommendation: useCallback(() => setCapacityRecommendation(null), []),
  };
}
