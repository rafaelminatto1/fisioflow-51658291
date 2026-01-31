/**
 * React Hook for Predictive Analytics
 *
 * Provides access to recovery predictions and risk assessments
 * Uses Firebase AI Logic for predictions
 *
 * @module hooks/usePredictiveAnalytics
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, limit } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { db } from '@/integrations/firebase/app';

import {
  predictRecoveryTimeline,
  RecoveryPrediction,
  PredictionInput,
} from '@/lib/ai/predictive-analytics';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const PREDICTIVE_ANALYTICS_KEYS = {
  all: ['predictive-analytics'] as const,
  prediction: (patientId: string) => [...PREDICTIVE_ANALYTICS_KEYS.all, 'prediction', patientId] as const,
  riskFactors: (patientId: string) => [...PREDICTIVE_ANALYTICS_KEYS.all, 'risk', patientId] as const,
  milestones: (patientId: string) => [...PREDICTIVE_ANALYTICS_KEYS.all, 'milestones', patientId] as const,
  similarCases: (condition: string) => [...PREDICTIVE_ANALYTICS_KEYS.all, 'similar-cases', condition] as const,
};

// ============================================================================
// TYPES
// ============================================================================

export interface UsePredictiveAnalyticsOptions {
  enabled?: boolean;
  onSuccess?: (data: RecoveryPrediction) => void;
  onError?: (error: Error) => void;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  predicted?: boolean;
  label?: string;
}

// Firestore milestone record structure
interface FirestoreMilestone {
  name: string;
  description?: string;
  expectedDate: string;
  achieved: boolean;
  criteria?: string[];
}

// Risk factor entry structure
interface RiskFactorEntry {
  factor: string;
  impact: string;
}

// ============================================================================
// HOOK: RECOVERY PREDICTION
// ============================================================================

/**
 * Hook to generate recovery prediction for a patient
 */
export function useRecoveryPrediction(
  input: PredictionInput | null,
  options: UsePredictiveAnalyticsOptions = {}
) {
  const { enabled = true, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: PREDICTIVE_ANALYTICS_KEYS.prediction(input?.patientId || ''),
    queryFn: async (): Promise<RecoveryPrediction> => {
      if (!input) {
        throw new Error('Prediction input is required');
      }

      try {
        const prediction = await predictRecoveryTimeline(input);

        if (onSuccess) {
          onSuccess(prediction);
        }

        return prediction;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Prediction failed');
        if (onError) {
          onError(err);
        }
        throw err;
      }
    },
    enabled: !!input && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// ============================================================================
// HOOK: FETCH STORED PREDICTION
// ============================================================================

/**
 * Hook to fetch previously stored prediction from Firestore
 */
export function useStoredPrediction(patientId: string) {

  return useQuery({
    queryKey: PREDICTIVE_ANALYTICS_KEYS.prediction(patientId),
    queryFn: async (): Promise<RecoveryPrediction | null> => {
      const q = firestoreQuery(
        collection(db, 'patient_predictions'),
        where('patient_id', '==', patientId),
        where('prediction_type', '==', 'recovery_timeline'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      // Transform Firestore data to RecoveryPrediction format
      return {
        patientId: data.patient_id,
        condition: data.features?.condition || 'Unknown',
        predictedAt: data.prediction_date,
        predictedRecoveryDate: data.target_date || '',
        confidenceInterval: data.confidence_interval || {
          lower: '',
          upper: '',
          lowerDays: 0,
          expectedDays: data.predicted_value || 0,
          upperDays: 0,
        },
        confidenceScore: data.confidence_score || 0,
        milestones: [], // Would need to be stored separately
        riskFactors: [],
        treatmentRecommendations: {
          optimalFrequency: '',
          sessionsPerWeek: 0,
          estimatedTotalSessions: 0,
          intensity: 'moderate',
          focusAreas: [],
        },
        similarCases: {
          totalAnalyzed: 0,
          matchingCriteria: [],
          averageRecoveryTime: 0,
          successRate: 0,
          keyInsights: [],
        },
        modelVersion: data.model_version || 'unknown',
        dataSource: 'historical',
        requiresValidation: true,
      };
    },
    enabled: !!patientId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ============================================================================
// HOOK: RISK FACTORS
// ============================================================================

/**
 * Hook to get risk factors for delayed recovery
 */
export function useRiskFactors(patientId: string) {

  return useQuery({
    queryKey: PREDICTIVE_ANALYTICS_KEYS.riskFactors(patientId),
    queryFn: async () => {
      const docRef = doc(db, 'patient_risk_scores', patientId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          dropoutRisk: 0,
          riskLevel: 'low' as const,
          factors: [],
          recommendations: [],
        };
      }

      const data = docSnap.data();

      return {
        dropoutRisk: data.dropout_risk_score || 0,
        riskLevel: data.risk_level || 'low',
        factors: Object.entries(data.risk_factors || {}).map(([key, value]): RiskFactorEntry => ({
          factor: key,
          impact: String(value),
        })),
        recommendations: data.recommended_actions || [],
      };
    },
    enabled: !!patientId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================================================
// HOOK: MILESTONES PROGRESS
// ============================================================================

/**
 * Hook to track milestones progress
 */
export function useMilestonesProgress(patientId: string) {

  return useQuery({
    queryKey: PREDICTIVE_ANALYTICS_KEYS.milestones(patientId),
    queryFn: async () => {
      const q = firestoreQuery(
        collection(db, 'patient_predictions'),
        where('patient_id', '==', patientId),
        where('prediction_type', '==', 'recovery_timeline'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return {
          milestones: [],
          achievedCount: 0,
          totalCount: 0,
          progressPercentage: 0,
        };
      }

      const prediction = snapshot.docs[0].data();
      const milestones = (prediction.milestones || []) as FirestoreMilestone[];

      const achievedCount = milestones.filter((m) => m.achieved).length;

      return {
        milestones: milestones.map((m): FirestoreMilestone => ({
          name: m.name,
          description: m.description,
          expectedDate: m.expectedDate,
          achieved: m.achieved,
          criteria: m.criteria || [],
        })),
        achievedCount,
        totalCount: milestones.length,
        progressPercentage: milestones.length > 0
          ? Math.round((achievedCount / milestones.length) * 100)
          : 0,
      };
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// HOOK: GENERATE PREDICTION MUTATION
// ============================================================================

/**
 * Mutation to generate a new prediction
 */
export function useGeneratePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PredictionInput): Promise<RecoveryPrediction> => {
      return predictRecoveryTimeline(input);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: PREDICTIVE_ANALYTICS_KEYS.prediction(variables.patientId),
      });
      queryClient.invalidateQueries({
        queryKey: PREDICTIVE_ANALYTICS_KEYS.milestones(variables.patientId),
      });
      queryClient.invalidateQueries({
        queryKey: PREDICTIVE_ANALYTICS_KEYS.riskFactors(variables.patientId),
      });

      toast.success('Previsão de recuperação gerada com sucesso', {
        description: `Previsão: ${formatDate(data.predictedRecoveryDate)}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar previsão', {
        description: error.message,
      });
    },
  });
}

// ============================================================================
// HOOK: CHART DATA FOR VISUALIZATION
// ============================================================================

/**
 * Hook to get prediction data formatted for charts
 */
export function usePredictionChartData(patientId: string) {
  const { data: prediction } = useStoredPrediction(patientId);

  const recoveryTimelineData = (): ChartDataPoint[] => {
    if (!prediction) return [];

    const { predictedRecoveryDate, confidenceInterval } = prediction;
    const now = new Date();

    const expectedDate = new Date(predictedRecoveryDate);
    const lowerDate = new Date(confidenceInterval.lower);
    const upperDate = new Date(confidenceInterval.upper);

    return [
      {
        date: now.toISOString(),
        value: 0,
        label: 'Início',
      },
      {
        date: lowerDate.toISOString(),
        value: confidenceInterval.lowerDays,
        predicted: true,
        label: 'Caso pessimista',
      },
      {
        date: expectedDate.toISOString(),
        value: confidenceInterval.expectedDays,
        predicted: true,
        label: 'Caso esperado',
      },
      {
        date: upperDate.toISOString(),
        value: confidenceInterval.upperDays,
        predicted: true,
        label: 'Caso otimista',
      },
    ];
  };

  const milestonesData = (): Array<{
    name: string;
    date: string;
    achieved: boolean;
  }> => {
    if (!prediction) return [];

    return prediction.milestones.map(m => ({
      name: m.name,
      date: m.expectedDate,
      achieved: m.achieved,
    }));
  };

  return {
    recoveryTimeline: recoveryTimelineData(),
    milestones: milestonesData(),
    confidenceInterval: prediction?.confidenceInterval,
    predictedRecoveryDate: prediction?.predictedRecoveryDate,
    confidenceScore: prediction?.confidenceScore || 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format confidence score to percentage
 */
export function formatConfidenceScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(score: number): string {
  if (score < 30) return 'text-green-600';
  if (score < 50) return 'text-yellow-600';
  if (score < 70) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(score: number): string {
  if (score < 30) return 'Baixo';
  if (score < 50) return 'Moderado';
  if (score < 70) return 'Alto';
  return 'Crítico';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useRecoveryPrediction,
  useStoredPrediction,
  useRiskFactors,
  useMilestonesProgress,
  useGeneratePrediction,
  usePredictionChartData,
  formatConfidenceScore,
  getRiskLevelColor,
  getRiskLevelLabel,
};
