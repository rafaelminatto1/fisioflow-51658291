import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TreatmentSession {
  id: string;
  patient_id: string;
  therapist_id: string;
  session_date: string;
  session_type: 'consultation' | 'treatment' | 'evaluation' | 'follow_up';
  duration_minutes: number;
  pain_level_before: number;
  pain_level_after: number;
  functional_score_before: number;
  functional_score_after: number;
  exercises_performed: SessionExercise[];
  observations: string;
  next_session_date?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  created_at: string;
  updated_at: string;
}

export interface SessionExercise {
  id: string;
  exercise_name: string;
  sets_planned: number;
  sets_completed: number;
  reps_planned: number;
  reps_completed: number;
  weight_kg?: number;
  duration_seconds?: number;
  difficulty_level: number;
  patient_feedback: string;
  therapist_notes: string;
}

export interface SessionMetrics {
  pain_improvement: number;
  functional_improvement: number;
  exercise_compliance: number;
  session_effectiveness: number;
  completion_rate: number;
}

export interface PatientTimeline {
  session_id: string;
  session_date: string;
  session_type: string;
  pain_level: number;
  functional_score: number;
  key_achievements: string[];
  concerns: string[];
}

export function useTreatmentSessions() {
  const [sessions, setSessions] = useState<TreatmentSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('treatment_sessions')
        .select(`
          *,
          patients(name),
          profiles(full_name)
        `)
        .order('session_date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar sessões';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sessions by patient
  const fetchSessionsByPatient = async (patientId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('treatment_sessions')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar sessões do paciente';
      setError(errorMessage);
      toast.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create new session
  const createSession = async (sessionData: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('treatment_sessions')
        .insert([sessionData])
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      toast.success('Sessão criada com sucesso!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar sessão';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update session
  const updateSession = async (sessionId: string, updates: Partial<TreatmentSession>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('treatment_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === sessionId ? data : session
      ));
      toast.success('Sessão atualizada com sucesso!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar sessão';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('treatment_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Sessão excluída com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir sessão';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Calculate session metrics
  const calculateSessionMetrics = (session: TreatmentSession): SessionMetrics => {
    const painImprovement = session.pain_level_before - session.pain_level_after;
    const functionalImprovement = session.functional_score_after - session.functional_score_before;
    
    const totalExercises = session.exercises_performed.length;
    const completedExercises = session.exercises_performed.filter(
      ex => ex.sets_completed >= ex.sets_planned * 0.8
    ).length;
    const exerciseCompliance = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
    
    const sessionEffectiveness = (
      (painImprovement > 0 ? 25 : 0) +
      (functionalImprovement > 0 ? 25 : 0) +
      (exerciseCompliance * 0.5)
    );

    return {
      pain_improvement: painImprovement,
      functional_improvement: functionalImprovement,
      exercise_compliance: exerciseCompliance,
      session_effectiveness: Math.min(sessionEffectiveness, 100),
      completion_rate: exerciseCompliance
    };
  };

  // Get patient timeline
  const getPatientTimeline = async (patientId: string): Promise<PatientTimeline[]> => {
    try {
      const sessions = await fetchSessionsByPatient(patientId);
      
      return sessions.map(session => {
        const metrics = calculateSessionMetrics(session);
        const achievements: string[] = [];
        const concerns: string[] = [];

        if (metrics.pain_improvement > 0) {
          achievements.push(`Redução da dor em ${metrics.pain_improvement} pontos`);
        }
        if (metrics.functional_improvement > 0) {
          achievements.push(`Melhora funcional de ${metrics.functional_improvement} pontos`);
        }
        if (metrics.exercise_compliance > 80) {
          achievements.push('Excelente aderência aos exercícios');
        }

        if (metrics.pain_improvement < 0) {
          concerns.push('Aumento do nível de dor');
        }
        if (metrics.exercise_compliance < 50) {
          concerns.push('Baixa aderência aos exercícios');
        }

        return {
          session_id: session.id,
          session_date: session.session_date,
          session_type: session.session_type,
          pain_level: session.pain_level_after,
          functional_score: session.functional_score_after,
          key_achievements: achievements,
          concerns: concerns
        };
      });
    } catch (err) {
      console.error('Erro ao gerar timeline do paciente:', err);
      return [];
    }
  };

  // Get upcoming sessions
  const getUpcomingSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('treatment_sessions')
        .select(`
          *,
          patients(name),
          profiles(full_name)
        `)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Erro ao carregar próximas sessões:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    fetchSessionsByPatient,
    createSession,
    updateSession,
    deleteSession,
    calculateSessionMetrics,
    getPatientTimeline,
    getUpcomingSessions,
    // Legacy aliases
    treatmentSessions: sessions,
    addTreatmentSession: createSession,
    updateTreatmentSession: updateSession,
    deleteTreatmentSession: deleteSession,
    getTreatmentSession: (id: string) => sessions.find(s => s.id === id),
    getSessionsByPatient: fetchSessionsByPatient
  };
}