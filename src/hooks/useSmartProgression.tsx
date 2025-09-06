import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PatientProgress } from './usePatientProgress';
import { ExercisePlan, ExercisePlanItem } from './useExercisePlans';

export interface ProgressionRule {
  id: string;
  exercise_plan_id: string;
  metric_type: 'pain_level' | 'functional_score' | 'exercise_compliance';
  threshold_value: number;
  comparison_operator: 'greater_than' | 'less_than' | 'equal_to';
  action_type: 'increase_intensity' | 'decrease_intensity' | 'maintain' | 'complete_plan';
  adjustment_percentage: number;
  created_at: string;
}

export interface ProgressionSuggestion {
  exercise_plan_id: string;
  patient_id: string;
  suggested_action: string;
  reason: string;
  confidence_score: number;
  metrics_used: {
    pain_level?: number;
    functional_score?: number;
    exercise_compliance?: number;
  };
  suggested_adjustments: {
    sets?: number;
    reps?: number;
    rest_time?: number;
  };
}

export function useSmartProgression() {
  const [progressionRules, setProgressionRules] = useState<ProgressionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar regras de progressão (mock implementation)
  const fetchProgressionRules = async (_exercisePlanId?: string) => {
    try {
      setLoading(true);
      // Mock implementation - no database table exists yet
      setProgressionRules([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar regras de progressão');
    } finally {
      setLoading(false);
    }
  };

  // Criar regra de progressão (mock implementation)
  const createProgressionRule = async (ruleData: Omit<ProgressionRule, 'id' | 'created_at'>) => {
    try {
      // Mock implementation - no database table exists yet
      const mockRule: ProgressionRule = {
        ...ruleData,
        id: Math.random().toString(),
        created_at: new Date().toISOString()
      };
      return mockRule;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar regra de progressão');
      throw err;
    }
  };

  // Analisar progresso e gerar sugestões
  const analyzeProgressAndSuggest = async (
    exercisePlan: ExercisePlan,
    recentProgress: PatientProgress[]
  ): Promise<ProgressionSuggestion | null> => {
    if (recentProgress.length === 0) return null;

    const latestProgress = recentProgress[0];
    const previousProgress = recentProgress[1];

    // Calcular tendências
    const painTrend = previousProgress 
      ? latestProgress.pain_level - previousProgress.pain_level
      : 0;
    
    const functionalTrend = previousProgress
      ? latestProgress.functional_score - previousProgress.functional_score
      : 0;

    const _complianceTrend = previousProgress
      ? latestProgress.exercise_compliance - previousProgress.exercise_compliance
      : 0;

    // Lógica de análise inteligente
    let suggestedAction = 'maintain';
    let reason = 'Mantendo intensidade atual';
    let confidenceScore = 0.5;
    let suggestedAdjustments = {};

    // Cenário 1: Dor diminuindo, função melhorando, boa aderência
    if (painTrend <= -1 && functionalTrend >= 5 && latestProgress.exercise_compliance >= 80) {
      suggestedAction = 'increase_intensity';
      reason = 'Paciente apresenta melhora significativa com boa aderência';
      confidenceScore = 0.9;
      suggestedAdjustments = {
        sets: 1, // Aumentar 1 série
        reps: 2, // Aumentar 2 repetições
      };
    }
    // Cenário 2: Dor aumentando ou função piorando
    else if (painTrend >= 2 || functionalTrend <= -5) {
      suggestedAction = 'decrease_intensity';
      reason = 'Paciente apresenta sinais de sobrecarga ou piora';
      confidenceScore = 0.8;
      suggestedAdjustments = {
        sets: -1, // Diminuir 1 série
        rest_time: 30, // Aumentar descanso em 30s
      };
    }
    // Cenário 3: Baixa aderência
    else if (latestProgress.exercise_compliance < 60) {
      suggestedAction = 'decrease_intensity';
      reason = 'Baixa aderência pode indicar exercícios muito difíceis';
      confidenceScore = 0.7;
      suggestedAdjustments = {
        reps: -2, // Diminuir 2 repetições
        rest_time: 15, // Aumentar descanso em 15s
      };
    }
    // Cenário 4: Progresso estável e bom
    else if (latestProgress.pain_level <= 3 && latestProgress.functional_score >= 70 && latestProgress.exercise_compliance >= 70) {
      suggestedAction = 'maintain';
      reason = 'Progresso estável e satisfatório';
      confidenceScore = 0.8;
    }

    return {
      exercise_plan_id: exercisePlan.id,
      patient_id: exercisePlan.patient_id,
      suggested_action: suggestedAction,
      reason,
      confidence_score: confidenceScore,
      metrics_used: {
        pain_level: latestProgress.pain_level,
        functional_score: latestProgress.functional_score,
        exercise_compliance: latestProgress.exercise_compliance,
      },
      suggested_adjustments: suggestedAdjustments,
    };
  };

  // Aplicar ajustes automáticos
  const applyAutomaticAdjustments = async (
    exercisePlanId: string,
    adjustments: ProgressionSuggestion['suggested_adjustments']
  ) => {
    try {
      // Buscar itens do plano atual
      const { data: planItems, error } = await supabase
        .from('exercise_plan_items')
        .select('*')
        .eq('exercise_plan_id', exercisePlanId);

      if (error) throw error;

      // Aplicar ajustes a cada item
      const updatePromises = planItems?.map(async (item) => {
        const updates: Partial<Pick<ExercisePlanItem, 'sets' | 'reps' | 'rest_time'>> = {};
        
        if (adjustments.sets) {
          updates.sets = Math.max(1, item.sets + adjustments.sets);
        }
        
        if (adjustments.reps) {
          updates.reps = Math.max(1, item.reps + adjustments.reps);
        }
        
        if (adjustments.rest_time) {
          updates.rest_time = Math.max(30, item.rest_time + adjustments.rest_time);
        }

        return supabase
          .from('exercise_plan_items')
          .update(updates)
          .eq('id', item.id);
      }) || [];

      await Promise.all(updatePromises);
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aplicar ajustes automáticos');
      throw err;
    }
  };

  // Calcular aderência do paciente
  const calculateAdherence = (progressHistory: PatientProgress[], days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentProgress = progressHistory.filter(
      progress => new Date(progress.progress_date) >= cutoffDate
    );

    if (recentProgress.length === 0) return 0;

    const averageCompliance = recentProgress.reduce(
      (sum, progress) => sum + progress.exercise_compliance, 0
    ) / recentProgress.length;

    const consistencyScore = (recentProgress.length / days) * 100;
    
    return Math.min(100, (averageCompliance * 0.7) + (consistencyScore * 0.3));
  };

  return {
    progressionRules,
    loading,
    error,
    fetchProgressionRules,
    createProgressionRule,
    analyzeProgressAndSuggest,
    applyAutomaticAdjustments,
    calculateAdherence,
  };
}