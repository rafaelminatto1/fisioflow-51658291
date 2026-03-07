/**
 * Patient ML Data Collection Hook - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { analyticsApi } from '@/lib/api/workers-client';
import type { MLTrainingData } from '@/types/patientAnalytics';

export async function collectPatientTrainingData(patientId: string) {
  if (!patientId) {
    throw new Error('Patient ID is required');
  }

  const response = await analyticsApi.mlTrainingData.collect(patientId);
  if (!response?.data) {
    throw new Error('Dados de treinamento não encontrados');
  }

  return response.data as MLTrainingData;
}

export function useCollectPatientMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const trainingData = await collectPatientTrainingData(patientId);
      const res = await analyticsApi.mlTrainingData.upsert(trainingData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success('Dados coletados para treinamento de ML');
    },
    onError: (error: Error) => {
      toast.error('Erro ao coletar dados: ' + error.message);
    },
  });
}

export function useBatchCollectMLData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { limit?: number }) => {
      const limitNum = options?.limit ?? 50;
      const patientsResponse = await analyticsApi.mlTrainingData.patients({ limit: limitNum });
      const patients = patientsResponse?.data ?? [];

      const results: Array<{ patientId: string; success: boolean }> = [];
      const errors: Array<{ patientId: string; error: string }> = [];

      for (const patient of patients) {
        try {
          const trainingData = await collectPatientTrainingData(patient.id);
          await analyticsApi.mlTrainingData.upsert(trainingData);
          results.push({ patientId: patient.id, success: true });
        } catch (error) {
          errors.push({ patientId: patient.id, error: (error as Error).message });
        }
      }

      return {
        collected: results.length,
        total: patients.length,
        errors,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ml-training-data'] });
      toast.success(`Coleta concluída: ${data.collected}/${data.total} pacientes processados`);
    },
    onError: (error: Error) => {
      toast.error('Erro na coleta em lote: ' + error.message);
    },
  });
}

export function useMLTrainingDataStats() {
  return useQuery({
    queryKey: ['ml-training-data-stats'],
    queryFn: async () => {
      const response = await analyticsApi.mlTrainingData.stats();
      return (
        response?.data ?? {
          totalRecords: 0,
          outcomeCounts: {},
          ageDistribution: {},
          avgPainReduction: 0,
          avgFunctionalImprovement: 0,
          successRate: 0,
        }
      );
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useGeneratePatientPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      const trainingData = await collectPatientTrainingData(patientId);
      const attendanceRate = Number(trainingData.attendance_rate ?? 0);
      const painReduction = Number(trainingData.pain_reduction_percentage ?? 0);
      const functionalImprovement = Number(trainingData.functional_improvement_percentage ?? 0);
      const sessionFrequency = Number(trainingData.session_frequency_weekly ?? 0);

      const dropoutRisk = Math.min(
        100,
        Math.max(
          0,
          (1 - attendanceRate) * 60 +
            (trainingData.total_sessions < 5 ? 30 : 0) +
            (trainingData.home_exercise_compliance < 0.3 ? 20 : 0),
        ),
      );

      const successProbability = Math.min(
        100,
        Math.max(
          0,
          attendanceRate * 40 +
            (painReduction > 20 ? 30 : 0) +
            (functionalImprovement > 15 ? 30 : 0),
        ),
      );

      const recoveryTimeline =
        trainingData.total_sessions > 0
          ? Math.max(
              1,
              Math.round(
                12 / (attendanceRate * sessionFrequency || 1),
              ),
            )
          : 12;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + recoveryTimeline * 7);

      const predictionsPayload = [
        {
          prediction_type: 'dropout_risk',
          features: trainingData,
          predicted_value: dropoutRisk,
          predicted_class: dropoutRisk > 50 ? 'high' : dropoutRisk > 20 ? 'medium' : 'low',
          confidence_score: 0.75,
          timeframe_days: 30,
          model_version: 'rule_based_v1',
          model_name: 'rule_based_v1',
        },
        {
          prediction_type: 'outcome_success',
          features: trainingData,
          predicted_value: successProbability,
          predicted_class: successProbability > 70 ? 'high' : successProbability > 40 ? 'medium' : 'low',
          confidence_score: 0.7,
          timeframe_days: 90,
          model_version: 'rule_based_v1',
          model_name: 'rule_based_v1',
        },
        {
          prediction_type: 'recovery_timeline',
          features: trainingData,
          predicted_value: recoveryTimeline,
          predicted_class: recoveryTimeline < 8 ? 'fast' : recoveryTimeline < 16 ? 'normal' : 'extended',
          confidence_score: 0.65,
          target_date: targetDate.toISOString(),
          timeframe_days: recoveryTimeline * 7,
          model_version: 'rule_based_v1',
          model_name: 'rule_based_v1',
        },
      ];

      await analyticsApi.patientPredictions.upsert({
        patient_id: patientId,
        predictions: predictionsPayload,
      });

      return predictionsPayload;
    },
    onSuccess: (_, patientId) => {
      queryClient.invalidateQueries({ queryKey: ['patient-predictions', patientId] });
      toast.success('Predições geradas com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar predições: ' + error.message);
    },
  });
}
