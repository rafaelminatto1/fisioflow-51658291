import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TreatmentSession {
  id: string;
  patient_id: string;
  appointment_id?: string;
  exercise_plan_id?: string;
  observations: string;
  pain_level: number;
  evolution_notes: string;
  next_session_goals?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useTreatmentSessions() {
  const [treatmentSessions, setTreatmentSessions] = useState<TreatmentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTreatmentSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('treatment_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTreatmentSessions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar sessões de tratamento');
    } finally {
      setLoading(false);
    }
  };

  const addTreatmentSession = async (sessionData: Omit<TreatmentSession, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('treatment_sessions')
        .insert({
          patient_id: sessionData.patient_id,
          appointment_id: sessionData.appointment_id || null,
          exercise_plan_id: sessionData.exercise_plan_id || null,
          observations: sessionData.observations,
          pain_level: sessionData.pain_level,
          evolution_notes: sessionData.evolution_notes,
          next_session_goals: sessionData.next_session_goals || null,
          created_by: 'current_user' // TODO: Replace with actual user ID
        })
        .select()
        .single();

      if (error) throw error;
      await fetchTreatmentSessions();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sessão de tratamento');
      throw err;
    }
  };

  const updateTreatmentSession = async (id: string, updates: Partial<TreatmentSession>) => {
    try {
      const updateData: any = {};
      
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.appointment_id !== undefined) updateData.appointment_id = updates.appointment_id || null;
      if (updates.exercise_plan_id !== undefined) updateData.exercise_plan_id = updates.exercise_plan_id || null;
      if (updates.observations) updateData.observations = updates.observations;
      if (updates.pain_level !== undefined) updateData.pain_level = updates.pain_level;
      if (updates.evolution_notes) updateData.evolution_notes = updates.evolution_notes;
      if (updates.next_session_goals !== undefined) updateData.next_session_goals = updates.next_session_goals || null;

      const { error } = await supabase
        .from('treatment_sessions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchTreatmentSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar sessão de tratamento');
      throw err;
    }
  };

  const deleteTreatmentSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('treatment_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTreatmentSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir sessão de tratamento');
      throw err;
    }
  };

  const getTreatmentSession = (id: string) => {
    return treatmentSessions.find(session => session.id === id);
  };

  const getSessionsByPatient = (patientId: string) => {
    return treatmentSessions.filter(session => session.patient_id === patientId);
  };

  useEffect(() => {
    fetchTreatmentSessions();
  }, []);

  return {
    treatmentSessions,
    loading,
    error,
    addTreatmentSession,
    updateTreatmentSession,
    deleteTreatmentSession,
    getTreatmentSession,
    getSessionsByPatient,
    refetch: fetchTreatmentSessions,
  };
}