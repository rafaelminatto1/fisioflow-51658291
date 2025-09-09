import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseProtocol {
  id: string;
  name: string;
  description: string;
  condition: string;
  body_region: string;
  phase: 'acute' | 'subacute' | 'chronic' | 'maintenance';
  evidence_level: 'A' | 'B' | 'C' | 'D';
  duration_weeks: number;
  frequency_per_week: number;
  exercises: ProtocolExercise[];
  objectives: string[];
  contraindications: string[];
  expected_outcomes: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  usage_count: number;
}

export interface ProtocolExercise {
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  rest_time: number;
  progression_week: number;
  order_index: number;
  notes?: string;
  modifications?: string[];
  progression_criteria?: string;
  weight_percentage?: number; // Percentage of 1RM or body weight
  duration_seconds?: number;
}

export interface PatientExerciseProgress {
  id: string;
  patient_id: string;
  exercise_id: string;
  exercise_name: string;
  date: Date;
  sets_planned: number;
  sets_completed: number;
  reps_planned: number;
  reps_completed: number;
  weight_kg?: number;
  duration_seconds?: number;
  difficulty_rating: 'easy' | 'appropriate' | 'difficult';
  pain_before: number; // 0-10 scale
  pain_after: number; // 0-10 scale
  patient_feedback?: string;
  therapist_notes?: string;
  adherence_percentage: number;
  session_id?: string;
}

export interface ExerciseAnalytics {
  exercise_id: string;
  exercise_name: string;
  total_sessions: number;
  average_adherence: number;
  trend: 'improving' | 'stable' | 'declining';
  last_performed: Date;
  progression_rate: number;
  patient_satisfaction: number;
  effectiveness_score: number;
}

export function useExerciseProtocols() {
  const [protocols, setProtocols] = useState<ExerciseProtocol[]>([]);
  const [patientProgress, setPatientProgress] = useState<PatientExerciseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_protocols')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;

      setProtocols(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar protocolos');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientProgress = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('patient_exercise_progress')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedProgress: PatientExerciseProgress[] = data?.map(progress => ({
        ...progress,
        date: new Date(progress.date),
        difficulty_rating: progress.difficulty_rating as 'easy' | 'appropriate' | 'difficult',
      })) || [];

      setPatientProgress(formattedProgress);
      return formattedProgress;
    } catch (err) {
      console.error('Error fetching patient progress:', err);
      return [];
    }
  };

  const addProtocol = async (protocolData: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => {
    try {
      const { data, error } = await supabase
        .from('exercise_protocols')
        .insert({
          name: protocolData.name,
          description: protocolData.description,
          condition: protocolData.condition,
          body_region: protocolData.body_region,
          phase: protocolData.phase,
          evidence_level: protocolData.evidence_level,
          duration_weeks: protocolData.duration_weeks,
          frequency_per_week: protocolData.frequency_per_week,
          exercises: protocolData.exercises,
          objectives: protocolData.objectives,
          contraindications: protocolData.contraindications,
          expected_outcomes: protocolData.expected_outcomes,
          created_by: protocolData.created_by,
          is_template: protocolData.is_template,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchProtocols();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar protocolo');
      throw err;
    }
  };

  const updateProtocol = async (id: string, updates: Partial<ExerciseProtocol>) => {
    try {
      const { error } = await supabase
        .from('exercise_protocols')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchProtocols();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar protocolo');
      throw err;
    }
  };

  const deleteProtocol = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exercise_protocols')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchProtocols();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir protocolo');
      throw err;
    }
  };

  const recordExerciseProgress = async (progressData: Omit<PatientExerciseProgress, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('patient_exercise_progress')
        .insert({
          patient_id: progressData.patient_id,
          exercise_id: progressData.exercise_id,
          exercise_name: progressData.exercise_name,
          date: progressData.date.toISOString(),
          sets_planned: progressData.sets_planned,
          sets_completed: progressData.sets_completed,
          reps_planned: progressData.reps_planned,
          reps_completed: progressData.reps_completed,
          weight_kg: progressData.weight_kg,
          duration_seconds: progressData.duration_seconds,
          difficulty_rating: progressData.difficulty_rating,
          pain_before: progressData.pain_before,
          pain_after: progressData.pain_after,
          patient_feedback: progressData.patient_feedback,
          therapist_notes: progressData.therapist_notes,
          adherence_percentage: progressData.adherence_percentage,
          session_id: progressData.session_id,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPatientProgress(progressData.patient_id);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar progresso');
      throw err;
    }
  };

  const incrementProtocolUsage = async (protocolId: string) => {
    try {
      const protocol = protocols.find(p => p.id === protocolId);
      if (!protocol) return;

      await supabase
        .from('exercise_protocols')
        .update({ usage_count: protocol.usage_count + 1 })
        .eq('id', protocolId);

      await fetchProtocols();
    } catch (err) {
      console.error('Error incrementing protocol usage:', err);
    }
  };

  // Protocol search and filtering
  const searchProtocols = (query: string, filters?: {
    condition?: string;
    bodyRegion?: string;
    phase?: string;
    evidenceLevel?: string;
  }) => {
    return protocols.filter(protocol => {
      const matchesQuery = !query || 
        protocol.name.toLowerCase().includes(query.toLowerCase()) ||
        protocol.description.toLowerCase().includes(query.toLowerCase()) ||
        protocol.condition.toLowerCase().includes(query.toLowerCase());

      const matchesCondition = !filters?.condition || protocol.condition === filters.condition;
      const matchesRegion = !filters?.bodyRegion || protocol.body_region === filters.bodyRegion;
      const matchesPhase = !filters?.phase || protocol.phase === filters.phase;
      const matchesEvidence = !filters?.evidenceLevel || protocol.evidence_level === filters.evidenceLevel;

      return matchesQuery && matchesCondition && matchesRegion && matchesPhase && matchesEvidence;
    });
  };

  // Get recommended protocols for patient condition
  const getRecommendedProtocols = (condition: string, phase: 'acute' | 'subacute' | 'chronic' | 'maintenance') => {
    return protocols.filter(protocol => 
      protocol.condition.toLowerCase().includes(condition.toLowerCase()) &&
      protocol.phase === phase
    ).sort((a, b) => {
      // Sort by evidence level and usage count
      const evidenceWeight = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      return (evidenceWeight[b.evidence_level] * 10 + b.usage_count) - 
             (evidenceWeight[a.evidence_level] * 10 + a.usage_count);
    });
  };

  // Analytics and progress tracking
  const getExerciseAnalytics = (patientId: string): ExerciseAnalytics[] => {
    const patientProgressData = patientProgress.filter(p => p.patient_id === patientId);
    
    const exerciseGroups = patientProgressData.reduce((acc, progress) => {
      if (!acc[progress.exercise_id]) {
        acc[progress.exercise_id] = [];
      }
      acc[progress.exercise_id].push(progress);
      return acc;
    }, {} as Record<string, PatientExerciseProgress[]>);

    return Object.entries(exerciseGroups).map(([exerciseId, progressData]) => {
      const sortedData = progressData.sort((a, b) => a.date.getTime() - b.date.getTime());
      const latest = sortedData[sortedData.length - 1];
      
      const totalSessions = progressData.length;
      const averageAdherence = progressData.reduce((sum, p) => sum + p.adherence_percentage, 0) / totalSessions;
      
      // Calculate trend based on recent sessions
      const recentSessions = sortedData.slice(-5);
      const earlyAverage = recentSessions.slice(0, Math.ceil(recentSessions.length / 2))
        .reduce((sum, p) => sum + p.adherence_percentage, 0) / Math.ceil(recentSessions.length / 2);
      const lateAverage = recentSessions.slice(Math.floor(recentSessions.length / 2))
        .reduce((sum, p) => sum + p.adherence_percentage, 0) / Math.floor(recentSessions.length / 2);
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (lateAverage > earlyAverage + 10) trend = 'improving';
      else if (lateAverage < earlyAverage - 10) trend = 'declining';

      // Calculate progression rate (weight/reps improvement over time)
      const progressionRate = sortedData.length > 1 
        ? ((latest.sets_completed * latest.reps_completed) - 
           (sortedData[0].sets_completed * sortedData[0].reps_completed)) / sortedData.length
        : 0;

      // Patient satisfaction based on difficulty rating
      const satisfactionScores = progressData.map(p => 
        p.difficulty_rating === 'appropriate' ? 5 : 
        p.difficulty_rating === 'easy' ? 3 : 2
      );
      const patientSatisfaction = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;

      // Effectiveness score based on pain improvement and adherence
      const painImprovements = progressData.map(p => Math.max(0, p.pain_before - p.pain_after));
      const averagePainImprovement = painImprovements.reduce((sum, imp) => sum + imp, 0) / painImprovements.length;
      const effectivenessScore = (averageAdherence / 100) * 0.6 + (averagePainImprovement / 10) * 0.4;

      return {
        exercise_id: exerciseId,
        exercise_name: latest.exercise_name,
        total_sessions: totalSessions,
        average_adherence: Math.round(averageAdherence),
        trend,
        last_performed: latest.date,
        progression_rate: Math.round(progressionRate * 100) / 100,
        patient_satisfaction: Math.round(patientSatisfaction * 10) / 10,
        effectiveness_score: Math.round(effectivenessScore * 100) / 100,
      };
    });
  };

  const getPatientProgressSummary = (patientId: string) => {
    const patientData = patientProgress.filter(p => p.patient_id === patientId);
    const analytics = getExerciseAnalytics(patientId);

    return {
      totalExercisesSessions: patientData.length,
      averageAdherence: patientData.reduce((sum, p) => sum + p.adherence_percentage, 0) / patientData.length || 0,
      averagePainImprovement: patientData.reduce((sum, p) => sum + Math.max(0, p.pain_before - p.pain_after), 0) / patientData.length || 0,
      exercisesTracked: analytics.length,
      improvingExercises: analytics.filter(a => a.trend === 'improving').length,
      stableExercises: analytics.filter(a => a.trend === 'stable').length,
      decliningExercises: analytics.filter(a => a.trend === 'declining').length,
      overallEffectiveness: analytics.reduce((sum, a) => sum + a.effectiveness_score, 0) / analytics.length || 0,
    };
  };

  // Protocol statistics
  const protocolStats = useMemo(() => {
    const totalProtocols = protocols.length;
    const protocolsByCondition = protocols.reduce((acc, protocol) => {
      acc[protocol.condition] = (acc[protocol.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const protocolsByPhase = protocols.reduce((acc, protocol) => {
      acc[protocol.phase] = (acc[protocol.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const protocolsByEvidence = protocols.reduce((acc, protocol) => {
      acc[protocol.evidence_level] = (acc[protocol.evidence_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedProtocols = protocols
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5)
      .map(p => ({ name: p.name, usage_count: p.usage_count }));

    return {
      totalProtocols,
      protocolsByCondition,
      protocolsByPhase,
      protocolsByEvidence,
      mostUsedProtocols,
    };
  }, [protocols]);

  useEffect(() => {
    fetchProtocols();
  }, []);

  return {
    protocols,
    patientProgress,
    loading,
    error,
    protocolStats,
    addProtocol,
    updateProtocol,
    deleteProtocol,
    recordExerciseProgress,
    incrementProtocolUsage,
    searchProtocols,
    getRecommendedProtocols,
    getExerciseAnalytics,
    getPatientProgressSummary,
    fetchPatientProgress,
    refetch: fetchProtocols,
  };
}