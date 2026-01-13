/**
 * Patient Analytics Hooks
 *
 * Custom hooks for fetching and managing patient analytics data,
 * including predictions, risk scores, outcomes, and lifecycle tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PatientLifecycleEvent,
  PatientOutcomeMeasure,
  PatientSessionMetrics,
  PatientPrediction,
  PatientRiskScore,
  PatientGoalTracking,
  PatientInsight,
  ClinicalBenchmark,
  PatientProgressSummary,
  PatientAnalyticsData,
  OutcomeMeasureTrend,
  LifecycleEventType,
  PredictionType,
} from '@/types/patientAnalytics';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const PATIENT_ANALYTICS_KEYS = {
  all: ['patient-analytics'] as const,
  progress: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'progress'] as const,
  lifecycle: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'lifecycle'] as const,
  outcomes: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'outcomes'] as const,
  sessions: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'sessions'] as const,
  predictions: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'predictions'] as const,
  risk: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'risk'] as const,
  goals: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'goals'] as const,
  insights: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'insights'] as const,
  benchmarks: () => [...PATIENT_ANALYTICS_KEYS.all, 'benchmarks'] as const,
  dashboard: (patientId: string) => [...PATIENT_ANALYTICS_KEYS.all, patientId, 'dashboard'] as const,
};

// ============================================================================
// PROGRESS SUMMARY
// ============================================================================

export function usePatientProgressSummary(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.progress(patientId),
    queryFn: async (): Promise<PatientProgressSummary> => {
      const { data, error } = await supabase
        .rpc('get_patient_progress_summary', { p_patient_id: patientId });

      if (error) throw error;

      return data as PatientProgressSummary;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// LIFECYCLE EVENTS
// ============================================================================

export function usePatientLifecycleEvents(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.lifecycle(patientId),
    queryFn: async (): Promise<PatientLifecycleEvent[]> => {
      const { data, error } = await supabase
        .from('patient_lifecycle_events')
        .select('*')
        .eq('patient_id', patientId)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as PatientLifecycleEvent[];
    },
    enabled: !!patientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export interface PatientLifecycleSummaryData {
  current_stage: LifecycleEventType;
  days_in_current_stage: number;
  total_days_in_treatment: number;
  stage_history: Array<{
    stage: LifecycleEventType;
    date: string;
    duration_days?: number;
  }>;
}

export function usePatientLifecycleSummary(patientId: string) {
  const { data: events } = usePatientLifecycleEvents(patientId);

  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.lifecycle(patientId),
    queryFn: (): PatientLifecycleSummaryData => {
      if (!events || events.length === 0) {
        return {
          current_stage: 'lead_created',
          days_in_current_stage: 0,
          total_days_in_treatment: 0,
          stage_history: [],
        };
      }

      const now = new Date();
      const sortedEvents = [...events].sort((a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      const currentStage = sortedEvents[sortedEvents.length - 1].event_type;
      const currentStageDate = new Date(sortedEvents[sortedEvents.length - 1].event_date);
      const firstEventDate = new Date(sortedEvents[0].event_date);

      const stageHistory = sortedEvents.map((event, index) => {
        const nextEvent = sortedEvents[index + 1];
        return {
          stage: event.event_type,
          date: event.event_date,
          duration_days: nextEvent
            ? Math.floor((new Date(nextEvent.event_date).getTime() - new Date(event.event_date).getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
        };
      });

      return {
        current_stage: currentStage as LifecycleEventType,
        days_in_current_stage: Math.floor((now.getTime() - currentStageDate.getTime()) / (1000 * 60 * 60 * 24)),
        total_days_in_treatment: Math.floor((now.getTime() - firstEventDate.getTime()) / (1000 * 60 * 60 * 24)),
        stage_history: stageHistory,
      };
    },
    enabled: !!events,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateLifecycleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<PatientLifecycleEvent, 'id' | 'created_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_lifecycle_events')
        .insert({
          ...event,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.lifecycle(variables.patient_id) });
      toast.success('Evento de ciclo de vida registrado');
    },
    onError: (error) => {
      toast.error('Erro ao registrar evento: ' + error.message);
    },
  });
}

// ============================================================================
// OUTCOME MEASURES
// ============================================================================

export function usePatientOutcomeMeasures(
  patientId: string,
  measureType?: string,
  limit?: number
) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.outcomes(patientId), measureType, limit],
    queryFn: async (): Promise<PatientOutcomeMeasure[]> => {
      let query = supabase
        .from('patient_outcome_measures')
        .select('*')
        .eq('patient_id', patientId)
        .order('measurement_date', { ascending: true });

      if (measureType) {
        query = query.eq('measure_type', measureType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PatientOutcomeMeasure[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOutcomeMeasureTrends(patientId: string) {
  const { data: outcomes } = usePatientOutcomeMeasures(patientId);

  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.outcomes(patientId), 'trends'],
    queryFn: (): OutcomeMeasureTrend[] => {
      if (!outcomes || outcomes.length === 0) return [];

      // Group by measure name
      const grouped = outcomes.reduce((acc, outcome) => {
        if (!acc[outcome.measure_name]) {
          acc[outcome.measure_name] = [];
        }
        acc[outcome.measure_name].push(outcome);
        return acc;
      }, {} as Record<string, PatientOutcomeMeasure[]>);

      // Calculate trends for each measure
      return Object.entries(grouped).map(([measureName, measures]) => {
        const sortedMeasures = [...measures].sort((a, b) =>
          new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
        );

        const initialScore = sortedMeasures[0].normalized_score ?? sortedMeasures[0].score;
        const currentScore = sortedMeasures[sortedMeasures.length - 1].normalized_score ?? sortedMeasures[sortedMeasures.length - 1].score;
        const change = currentScore - initialScore;
        const changePercentage = initialScore !== 0 ? (change / Math.abs(initialScore)) * 100 : 0;

        // Determine trend direction
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        let trendStrength: 'strong' | 'moderate' | 'weak' = 'weak';

        if (Math.abs(changePercentage) >= 20) {
          trendStrength = 'strong';
        } else if (Math.abs(changePercentage) >= 10) {
          trendStrength = 'moderate';
        }

        // For pain, lower is better. For function, higher is better.
        const isPainMeasure = measureName.toLowerCase().includes('pain') || sortedMeasures[0].measure_type === 'pain_scale';
        const isImprovement = isPainMeasure ? change < 0 : change > 0;

        if (Math.abs(changePercentage) < 5) {
          trend = 'stable';
        } else {
          trend = isImprovement ? 'improving' : 'declining';
        }

        return {
          measure_name: measureName,
          current_score: currentScore,
          initial_score: initialScore,
          change,
          change_percentage: Math.round(changePercentage * 10) / 10,
          trend,
          trend_strength: trendStrength,
          data_points: sortedMeasures.map(m => ({
            date: m.measurement_date,
            score: m.score,
            normalized_score: m.normalized_score,
          })),
        };
      });
    },
    enabled: !!outcomes && outcomes.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateOutcomeMeasure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (measure: Omit<PatientOutcomeMeasure, 'id' | 'created_at' | 'normalized_score' | 'min_score' | 'max_score'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_outcome_measures')
        .insert({
          ...measure,
          recorded_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.outcomes(variables.patient_id) });
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.progress(variables.patient_id) });
      toast.success('Medida de resultado registrada');
    },
    onError: (error) => {
      toast.error('Erro ao registrar medida: ' + error.message);
    },
  });
}

// ============================================================================
// SESSION METRICS
// ============================================================================

export function usePatientSessionMetrics(patientId: string, limit?: number) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.sessions(patientId), limit],
    queryFn: async (): Promise<PatientSessionMetrics[]> => {
      let query = supabase
        .from('patient_session_metrics')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PatientSessionMetrics[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSessionMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Omit<PatientSessionMetrics, 'id' | 'pain_reduction' | 'functional_improvement' | 'created_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_session_metrics')
        .insert({
          ...metrics,
          therapist_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.sessions(variables.patient_id) });
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.progress(variables.patient_id) });
      toast.success('Métricas da sessão registradas');
    },
    onError: (error) => {
      toast.error('Erro ao registrar métricas: ' + error.message);
    },
  });
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export function usePatientPredictions(patientId: string, predictionType?: PredictionType) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.predictions(patientId), predictionType],
    queryFn: async (): Promise<PatientPrediction[]> => {
      let query = supabase
        .from('patient_predictions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('prediction_date', { ascending: false });

      if (predictionType) {
        query = query.eq('prediction_type', predictionType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PatientPrediction[];
    },
    enabled: !!patientId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

// ============================================================================
// RISK SCORES
// ============================================================================

export function usePatientRiskScore(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.risk(patientId),
    queryFn: async (): Promise<PatientRiskScore | null> => {
      const { data, error } = await supabase
        .from('patient_risk_scores')
        .select('*')
        .eq('patient_id', patientId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PatientRiskScore | null;
    },
    enabled: !!patientId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdatePatientRiskScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase
        .rpc('update_patient_risk_score', { p_patient_id: patientId });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.risk(patientId) });
      toast.success('Score de risco atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar score de risco: ' + error.message);
    },
  });
}

// ============================================================================
// GOALS
// ============================================================================

export function usePatientGoals(patientId: string) {
  return useQuery({
    queryKey: PATIENT_ANALYTICS_KEYS.goals(patientId),
    queryFn: async (): Promise<PatientGoalTracking[]> => {
      const { data, error } = await supabase
        .from('patient_goal_tracking')
        .select('*')
        .eq('patient_id', patientId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return data as PatientGoalTracking[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<PatientGoalTracking, 'id' | 'progress_percentage' | 'achieved_at' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_goal_tracking')
        .insert({
          ...goal,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.goals(variables.patient_id) });
      toast.success('Objetivo criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar objetivo: ' + error.message);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: Partial<PatientGoalTracking> }) => {
      const { data: goal, error } = await supabase
        .from('patient_goal_tracking')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return goal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id) });
      toast.success('Objetivo atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar objetivo: ' + error.message);
    },
  });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { data, error } = await supabase
        .from('patient_goal_tracking')
        .update({
          status: 'achieved',
          achieved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id) });
      toast.success('🎉 Parabéns! Objetivo alcançado!');
    },
    onError: (error) => {
      toast.error('Erro ao completar objetivo: ' + error.message);
    },
  });
}

// ============================================================================
// INSIGHTS
// ============================================================================

export function usePatientInsights(patientId: string, includeAcknowledged = false) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.insights(patientId), includeAcknowledged],
    queryFn: async (): Promise<PatientInsight[]> => {
      let query = supabase
        .from('patient_insights')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (!includeAcknowledged) {
        query = query.is('is_acknowledged', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PatientInsight[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, _patientId }: { insightId: string; patientId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('patient_insights')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userData.user.id,
        })
        .eq('id', insightId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PATIENT_ANALYTICS_KEYS.insights(variables.patientId) });
    },
    onError: (error) => {
      toast.error('Erro ao confirmar insight: ' + error.message);
    },
  });
}

// ============================================================================
// CLINICAL BENCHMARKS
// ============================================================================

export function useClinicalBenchmarks(benchmarkCategory?: string) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.benchmarks(), benchmarkCategory],
    queryFn: async (): Promise<ClinicalBenchmark[]> => {
      let query = supabase
        .from('clinical_benchmarks')
        .select('*')
        .order('benchmark_name', { ascending: true });

      if (benchmarkCategory) {
        query = query.eq('benchmark_category', benchmarkCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClinicalBenchmark[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// COMPREHENSIVE DASHBOARD
// ============================================================================

export function usePatientAnalyticsDashboard(patientId: string) {
  const progressSummary = usePatientProgressSummary(patientId);
  const lifecycleSummary = usePatientLifecycleSummary(patientId);
  const outcomeTrends = useOutcomeMeasureTrends(patientId);
  const sessionMetrics = usePatientSessionMetrics(patientId, 10);
  const riskScore = usePatientRiskScore(patientId);
  const predictions = usePatientPredictions(patientId);
  const goals = usePatientGoals(patientId);
  const insights = usePatientInsights(patientId, false);
  const benchmarks = useClinicalBenchmarks();

  const isLoading = [
    progressSummary,
    lifecycleSummary,
    outcomeTrends,
    sessionMetrics,
    riskScore,
    predictions,
    goals,
    insights,
    benchmarks,
  ].some(query => query.isLoading);

  const isError = [
    progressSummary,
    lifecycleSummary,
    outcomeTrends,
    sessionMetrics,
    riskScore,
    predictions,
    goals,
    insights,
    benchmarks,
  ].some(query => query.isError);

  const data: PatientAnalyticsData | undefined = !isLoading && !isError ? {
    patient_id: patientId,
    progress_summary: progressSummary.data ?? {
      total_sessions: 0,
      avg_pain_reduction: null,
      total_pain_reduction: 0,
      avg_functional_improvement: null,
      current_pain_level: null,
      initial_pain_level: null,
      goals_achieved: 0,
      goals_in_progress: 0,
      overall_progress_percentage: null,
    },
    pain_trend: outcomeTrends.data?.find(t => t.measure_name.toLowerCase().includes('pain')) || null,
    function_trend: outcomeTrends.data?.find(t => t.measure_name.toLowerCase().includes('func')) || null,
    risk_score: riskScore.data ?? null,
    predictions: {
      dropout_probability: predictions.data?.find(p => p.prediction_type === 'dropout_risk')?.predicted_value ?? 0,
      dropout_risk_level: riskScore.data?.risk_level ?? 'low',
      predicted_recovery_date: predictions.data?.find(p => p.prediction_type === 'recovery_timeline')?.target_date,
      predicted_recovery_confidence: predictions.data?.find(p => p.prediction_type === 'recovery_timeline')?.confidence_score ?? 0,
      expected_sessions_remaining: predictions.data?.find(p => p.prediction_type === 'recovery_timeline')?.predicted_value,
      success_probability: predictions.data?.find(p => p.prediction_type === 'outcome_success')?.predicted_value ?? 0,
      key_risk_factors: riskScore.data?.risk_factors ? Object.keys(riskScore.data.risk_factors) : [],
      recommendations: riskScore.data?.recommended_actions ?? [],
    },
    lifecycle: lifecycleSummary.data ?? null,
    benchmark_comparisons: [],
    recent_insights: insights.data?.slice(0, 5) ?? [],
    actionable_insights: insights.data?.filter(i => i.insight_type === 'recommendation' || i.insight_type === 'risk_detected') ?? [],
    goals: goals.data ?? [],
    recent_sessions: sessionMetrics.data?.slice(-5).map(s => ({
      date: s.session_date,
      pain_reduction: s.pain_reduction ?? 0,
      satisfaction: s.patient_satisfaction ?? 0,
    })) ?? [],
  } : undefined;

  return {
    data,
    isLoading,
    isError,
    refetch: () => {
      progressSummary.refetch();
      lifecycleSummary.refetch();
      outcomeTrends.refetch();
      sessionMetrics.refetch();
      riskScore.refetch();
      predictions.refetch();
      goals.refetch();
      insights.refetch();
      benchmarks.refetch();
    },
  };
}
