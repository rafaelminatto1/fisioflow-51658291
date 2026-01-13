/**
 * Patient ML Data Collection Hook
 *
 * Automates the collection of anonymized patient data
 * for machine learning model training.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import crypto from 'crypto';
import type { MLTrainingData } from '@/types/patientAnalytics';

// Hash function for anonymization
function hashPatientId(patientId: string): string {
  return crypto
    .createHash('sha256')
    .update(patientId + process.env.VITE_ML_SALT || 'fisioflow-ml-salt')
    .digest('hex')
    .substring(0, 16);
}

// Age group categorization
function getAgeGroup(birthDate: string): string {
  const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
  if (age < 18) return '0-17';
  if (age <= 30) return '18-30';
  if (age <= 50) return '31-50';
  if (age <= 65) return '51-65';
  return '65+';
}

// Determine outcome category
function determineOutcomeCategory(
  totalSessions: number,
  painReduction: number,
  functionalImprovement: number
): 'success' | 'partial' | 'poor' {
  if (painReduction >= 50 || functionalImprovement >= 40) return 'success';
  if (painReduction >= 20 || functionalImprovement >= 15) return 'partial';
  return 'poor';
}

/**
 * Collect training data for a specific patient
 */
export async function collectPatientTrainingData(patientId: string) {
  // Get patient basic data
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('id, birth_date, gender, created_at')
    .eq('id', patientId)
    .single();

  if (patientError || !patient) {
    throw new Error('Patient not found');
  }

  // Get session metrics
  const { data: sessions, error: sessionsError } = await supabase
    .from('patient_session_metrics')
    .select('*')
    .eq('patient_id', patientId)
    .order('session_date', { ascending: true });

  if (sessionsError) throw sessionsError;

  // Get appointments for attendance calculation
  const { data: appointments } = await supabase
    .from('appointments')
    .select('status, appointment_date')
    .eq('patient_id', patientId);

  // Get primary pathology
  const { data: pathologies } = await supabase
    .from('patient_pathologies')
    .select('pathology_name, status')
    .eq('patient_id', patientId)
    .eq('status', 'em_tratamento')
    .limit(1);

  // Calculate metrics
  const totalSessions = sessions?.length || 0;
  const completedAppointments = appointments?.filter(a => a.status === 'concluido') || [];
  const totalAppointments = appointments?.length || 0;
  const attendanceRate = totalAppointments > 0 ? completedAppointments.length / totalAppointments : 0;

  const firstSession = sessions?.[0];
  const lastSession = sessions?.[sessions.length - 1];

  const initialPain = firstSession?.pain_level_before;
  const finalPain = lastSession?.pain_level_after;
  const painReduction = initialPain && finalPain ? ((initialPain - finalPain) / initialPain) * 100 : 0;

  const initialFunction = firstSession?.functional_score_before;
  const finalFunction = lastSession?.functional_score_after;
  const functionalImprovement = initialFunction && finalFunction
    ? ((finalFunction - initialFunction) / (100 - (initialFunction || 0))) * 100
    : 0;

  const avgSatisfaction = sessions?.reduce((sum, s) => sum + (s.patient_satisfaction || 0), 0) / (sessions?.length || 0) || 0;

  // Calculate session frequency (sessions per week)
  const firstDate = sessions?.[0]?.session_date ? new Date(sessions[0].session_date) : new Date();
  const lastDate = sessions?.[sessions.length - 1]?.session_date
    ? new Date(sessions[sessions.length - 1].session_date)
    : new Date();
  const weeksActive = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const sessionFrequency = totalSessions / weeksActive;

  // Build training data record
  const trainingData = {
    patient_hash: hashPatientId(patientId),
    age_group: getAgeGroup(patient.birth_date),
    gender: patient.gender || 'unknown',
    primary_pathology: pathologies?.[0]?.pathology_name || 'unknown',
    chronic_condition: pathologies?.some(p => p.status === 'cronica') || false,
    baseline_pain_level: initialPain || 0,
    baseline_functional_score: initialFunction || 0,
    treatment_type: 'physical_therapy', // Default for now
    session_frequency_weekly: Math.round(sessionFrequency * 10) / 10,
    total_sessions: totalSessions,
    attendance_rate: Math.round(attendanceRate * 100) / 100,
    home_exercise_compliance: 0.5, // Placeholder - would come from exercise tracking
    portal_login_frequency: 0.1, // Placeholder - would come from portal logs
    outcome_category: determineOutcomeCategory(totalSessions, painReduction, functionalImprovement),
    sessions_to_discharge: totalSessions,
    pain_reduction_percentage: Math.round(painReduction * 10) / 10,
    functional_improvement_percentage: Math.round(functionalImprovement * 10) / 10,
    patient_satisfaction_score: Math.round(avgSatisfaction * 10) / 10,
    data_collection_period_start: patient.created_at,
    data_collection_period_end: new Date().toISOString(),
  };

  return trainingData;
}

/**
 * Hook to collect and save ML training data
 */
export function useCollectPatientMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const trainingData = await collectPatientMLData(patientId);

      // Check if record exists
      const { data: existing } = await supabase
        .from('ml_training_data')
        .select('id')
        .eq('patient_hash', trainingData.patient_hash)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('ml_training_data')
          .update(trainingData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('ml_training_data')
          .insert(trainingData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success('Dados coletados para treinamento de ML');
    },
    onError: (error) => {
      toast.error('Erro ao coletar dados: ' + error.message);
    },
  });
}

/**
 * Hook to batch collect ML data for multiple patients
 */
export function useBatchCollectMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { limit?: number }) => {
      const limit = options?.limit || 50;

      // Get patients with sufficient data
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (patientsError) throw patientsError;

      const results = [];
      const errors = [];

      for (const patient of patients || []) {
        try {
          const trainingData = await collectPatientMLData(patient.id);

          // Upsert
          const { data: existing } = await supabase
            .from('ml_training_data')
            .select('id')
            .eq('patient_hash', trainingData.patient_hash)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('ml_training_data')
              .update(trainingData)
              .eq('id', existing.id);
          } else {
            await supabase
              .from('ml_training_data')
              .insert(trainingData);
          }

          results.push({ patientId: patient.id, success: true });
        } catch (e) {
          errors.push({ patientId: patient.id, error: (e as Error).message });
        }
      }

      return { collected: results.length, total: patients?.length || 0, errors };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success(
        `Coleta concluída: ${data.collected}/${data.total} pacientes processados`
      );
    },
    onError: (error) => {
      toast.error('Erro na coleta em lote: ' + error.message);
    },
  });
}

/**
 * Hook to get ML training data statistics
 */
export function useMLTrainingDataStats() {
  return useQuery({
    queryKey: ['ml-training-data-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ml_training_data')
        .select('*');

      if (error) throw error;

      const totalRecords = data?.length || 0;

      // Calculate stats with proper typing
      const outcomeCounts = data?.reduce<Record<string, number>>((acc, record: MLTrainingData) => {
        acc[record.outcome_category] = (acc[record.outcome_category] || 0) + 1;
        return acc;
      }, {}) || {};

      const ageDistribution = data?.reduce<Record<string, number>>((acc, record: MLTrainingData) => {
        acc[record.age_group] = (acc[record.age_group] || 0) + 1;
        return acc;
      }, {}) || {};

      const avgPainReduction = data?.reduce((sum, record: MLTrainingData) => sum + record.pain_reduction_percentage, 0) ?? 0;
      const avgFunctionalImprovement = data?.reduce((sum, record: MLTrainingData) => sum + record.functional_improvement_percentage, 0) ?? 0;

      return {
        totalRecords,
        outcomeCounts,
        ageDistribution,
        avgPainReduction: Math.round((avgPainReduction / (totalRecords || 1)) * 10) / 10,
        avgFunctionalImprovement: Math.round((avgFunctionalImprovement / (totalRecords || 1)) * 10) / 10,
        successRate: totalRecords > 0 ? Math.round((outcomeCounts.success || 0) / totalRecords * 100) : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate patient predictions based on ML models
 */
export function useGeneratePatientPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      // Get patient data
      const trainingData = await collectPatientMLData(patientId);

      // Simple rule-based prediction for now
      // In production, this would call an ML model endpoint
      const dropoutRisk = Math.min(100, Math.max(0,
        (1 - trainingData.attendance_rate) * 60 +
        (trainingData.total_sessions < 5 ? 30 : 0) +
        (trainingData.home_exercise_compliance < 0.3 ? 20 : 0)
      ));

      const successProbability = Math.min(100, Math.max(0,
        trainingData.attendance_rate * 40 +
        (trainingData.pain_reduction_percentage > 20 ? 30 : 0) +
        (trainingData.functional_improvement_percentage > 15 ? 30 : 0)
      ));

      const recoveryTimeline = trainingData.total_sessions > 0
        ? Math.max(1, Math.round(12 / (trainingData.attendance_rate * trainingData.session_frequency_weekly || 1)))
        : 12;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + recoveryTimeline * 7);

      // Insert predictions
      const predictions = [
        {
          patient_id: patientId,
          prediction_type: 'dropout_risk',
          features: trainingData,
          predicted_value: dropoutRisk,
          predicted_class: dropoutRisk > 50 ? 'high' : dropoutRisk > 20 ? 'medium' : 'low',
          confidence_score: 0.75,
          timeframe_days: 30,
          model_name: 'rule_based_v1',
        },
        {
          patient_id: patientId,
          prediction_type: 'outcome_success',
          features: trainingData,
          predicted_value: successProbability,
          predicted_class: successProbability > 70 ? 'high' : successProbability > 40 ? 'medium' : 'low',
          confidence_score: 0.7,
          timeframe_days: 90,
          model_name: 'rule_based_v1',
        },
        {
          patient_id: patientId,
          prediction_type: 'recovery_timeline',
          features: trainingData,
          predicted_value: recoveryTimeline,
          predicted_class: recoveryTimeline < 8 ? 'fast' : recoveryTimeline < 16 ? 'normal' : 'extended',
          confidence_score: 0.65,
          target_date: targetDate.toISOString(),
          timeframe_days: recoveryTimeline * 7,
          model_name: 'rule_based_v1',
        },
      ];

      // Deactivate old predictions
      await supabase
        .from('patient_predictions')
        .update({ is_active: false })
        .eq('patient_id', patientId)
        .eq('is_active', true);

      // Insert new predictions
      const { data, error } = await supabase
        .from('patient_predictions')
        .insert(predictions)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patient-predictions', patientId] });
      toast.success('Predições geradas com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao gerar predições: ' + error.message);
    },
  });
}
