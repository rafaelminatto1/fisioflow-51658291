import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PatientProgress {
  id: string;
  patient_id: string;
  progress_date: string;
  pain_level: number;
  functional_score: number;
  exercise_compliance: number;
  notes?: string;
  created_at: string;
  created_by: string;
}

export function usePatientProgress() {
  const [patientProgress, setPatientProgress] = useState<PatientProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientProgress = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patient_progress')
        .select('*')
        .order('progress_date', { ascending: false });

      if (error) throw error;
      setPatientProgress(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar progresso dos pacientes');
    } finally {
      setLoading(false);
    }
  };

  const addPatientProgress = async (progressData: Omit<PatientProgress, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('patient_progress')
        .insert({
          patient_id: progressData.patient_id,
          progress_date: progressData.progress_date,
          pain_level: progressData.pain_level,
          functional_score: progressData.functional_score,
          exercise_compliance: progressData.exercise_compliance,
          notes: progressData.notes || null,
          created_by: 'current_user' // TODO: Replace with actual user ID
        })
        .select()
        .single();

      if (error) throw error;
      await fetchPatientProgress();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar progresso');
      throw err;
    }
  };

  const updatePatientProgress = async (id: string, updates: Partial<PatientProgress>) => {
    try {
      const updateData: any = {};
      
      if (updates.patient_id) updateData.patient_id = updates.patient_id;
      if (updates.progress_date) updateData.progress_date = updates.progress_date;
      if (updates.pain_level !== undefined) updateData.pain_level = updates.pain_level;
      if (updates.functional_score !== undefined) updateData.functional_score = updates.functional_score;
      if (updates.exercise_compliance !== undefined) updateData.exercise_compliance = updates.exercise_compliance;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('patient_progress')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchPatientProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar progresso');
      throw err;
    }
  };

  const deletePatientProgress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patient_progress')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchPatientProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir registro de progresso');
      throw err;
    }
  };

  const getProgressByPatient = (patientId: string) => {
    return patientProgress.filter(progress => progress.patient_id === patientId);
  };

  const getLatestProgress = (patientId: string) => {
    const progressList = getProgressByPatient(patientId);
    return progressList.length > 0 ? progressList[0] : null;
  };

  useEffect(() => {
    fetchPatientProgress();
  }, []);

  return {
    patientProgress,
    loading,
    error,
    addPatientProgress,
    updatePatientProgress,
    deletePatientProgress,
    getProgressByPatient,
    getLatestProgress,
    refetch: fetchPatientProgress,
  };
}