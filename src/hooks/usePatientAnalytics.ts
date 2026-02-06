/**
 * usePatientAnalytics - Migrated to Firebase
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query as firestoreQuery, where, orderBy, limit, getFirebaseAuth, db } from '@/integrations/firebase/app';
import { toast } from 'sonner';

const auth = getFirebaseAuth();

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
import { normalizeFirestoreData } from '@/utils/firestoreData';

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
      // Firebase doesn't support RPC functions directly
      // This would need to be implemented as a Cloud Function or computed client-side
      const defaultSummary = {
        total_sessions: 0,
        avg_pain_reduction: null,
        total_pain_reduction: 0,
        avg_functional_improvement: null,
        current_pain_level: null,
        initial_pain_level: null,
        goals_achieved: 0,
        goals_in_progress: 0,
        overall_progress_percentage: null,
      };

      // For now, return default. In production, this should call a Cloud Function
      return defaultSummary;
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
      const q = firestoreQuery(
        collection(db, 'patient_lifecycle_events'),
        where('patient_id', '==', patientId),
        orderBy('event_date', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientLifecycleEvent[];
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
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const eventData = {
        ...event,
        created_by: firebaseUser.uid,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_lifecycle_events'), eventData);
      return { id: docRef.id, ...eventData };
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
  limitValue?: number
) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.outcomes(patientId), measureType, limitValue],
    queryFn: async (): Promise<PatientOutcomeMeasure[]> => {
      let q = firestoreQuery(
        collection(db, 'patient_outcome_measures'),
        where('patient_id', '==', patientId),
        orderBy('measurement_date', 'asc')
      );

      if (measureType) {
        q = firestoreQuery(
          collection(db, 'patient_outcome_measures'),
          where('patient_id', '==', patientId),
          where('measure_type', '==', measureType),
          orderBy('measurement_date', 'asc')
        );
      }

      if (limitValue) {
        // Firestore doesn't have a direct limit after where, need to apply client-side
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) }))
          .slice(0, limitValue) as PatientOutcomeMeasure[];
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientOutcomeMeasure[];
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
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const measureData = {
        ...measure,
        recorded_by: firebaseUser.uid,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_outcome_measures'), measureData);
      return { id: docRef.id, ...measureData };
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

export function usePatientSessionMetrics(patientId: string, limitValue?: number) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.sessions(patientId), limitValue],
    queryFn: async (): Promise<PatientSessionMetrics[]> => {
      const q = firestoreQuery(
        collection(db, 'patient_session_metrics'),
        where('patient_id', '==', patientId),
        orderBy('session_date', 'asc')
      );

      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientSessionMetrics[];

      if (limitValue) {
        data = data.slice(-limitValue);
      }

      return data;
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSessionMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Omit<PatientSessionMetrics, 'id' | 'pain_reduction' | 'functional_improvement' | 'created_at'>) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const metricsData = {
        ...metrics,
        therapist_id: firebaseUser.uid,
        created_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_session_metrics'), metricsData);
      return { id: docRef.id, ...metricsData };
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
      let q = firestoreQuery(
        collection(db, 'patient_predictions'),
        where('patient_id', '==', patientId),
        where('is_active', '==', true),
        orderBy('prediction_date', 'desc')
      );

      if (predictionType) {
        q = firestoreQuery(
          collection(db, 'patient_predictions'),
          where('patient_id', '==', patientId),
          where('prediction_type', '==', predictionType),
          where('is_active', '==', true),
          orderBy('prediction_date', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientPrediction[];
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
      const q = firestoreQuery(
        collection(db, 'patient_risk_scores'),
        where('patient_id', '==', patientId),
        orderBy('calculated_at', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PatientRiskScore;
    },
    enabled: !!patientId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useUpdatePatientRiskScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_patientId: string) => {
      // Firebase doesn't support RPC functions directly
      // This would need to be implemented as a Cloud Function
      throw new Error('RPC function not implemented - needs Cloud Function');
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
      const q = firestoreQuery(
        collection(db, 'patient_goal_tracking'),
        where('patient_id', '==', patientId),
        orderBy('target_date', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientGoalTracking[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<PatientGoalTracking, 'id' | 'progress_percentage' | 'achieved_at' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const goalData = {
        ...goal,
        created_by: firebaseUser.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'patient_goal_tracking'), goalData);
      return { id: docRef.id, ...goalData };
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
      const docRef = doc(db, 'patient_goal_tracking', goalId);

      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      const snapshot = await getDoc(docRef);
      return { id: snapshot.id, ...snapshot.data() };
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
      const docRef = doc(db, 'patient_goal_tracking', goalId);

      await updateDoc(docRef, {
        status: 'achieved',
        achieved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const snapshot = await getDoc(docRef);
      return { id: snapshot.id, ...snapshot.data() };
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
      let q = firestoreQuery(
        collection(db, 'patient_insights'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc')
      );

      if (!includeAcknowledged) {
        q = firestoreQuery(
          collection(db, 'patient_insights'),
          where('patient_id', '==', patientId),
          where('is_acknowledged', '==', false),
          orderBy('created_at', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as PatientInsight[];
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ insightId, _patientId }: { insightId: string; patientId: string }) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Usuário não autenticado');

      const docRef = doc(db, 'patient_insights', insightId);

      await updateDoc(docRef, {
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: firebaseUser.uid,
      });

      const snapshot = await getDoc(docRef);
      return { id: snapshot.id, ...snapshot.data() };
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
      let q = firestoreQuery(
        collection(db, 'clinical_benchmarks'),
        orderBy('benchmark_name', 'asc')
      );

      if (benchmarkCategory) {
        q = firestoreQuery(
          collection(db, 'clinical_benchmarks'),
          where('benchmark_category', '==', benchmarkCategory),
          orderBy('benchmark_name', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) })) as ClinicalBenchmark[];
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
  const { data: outcomeTrends } = useOutcomeMeasureTrends(patientId);
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
    pain_trend: outcomeTrends?.find(t => t.measure_name.toLowerCase().includes('pain')) || null,
    function_trend: outcomeTrends?.find(t => t.measure_name.toLowerCase().includes('func')) || null,
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
      outcomeTrends?.();
      sessionMetrics.refetch();
      riskScore.refetch();
      predictions.refetch();
      goals.refetch();
      insights.refetch();
      benchmarks.refetch();
    },
  };
}