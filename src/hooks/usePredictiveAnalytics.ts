/**
 * React Hook for Predictive Analytics
 *
 * Provides access to recovery predictions and risk assessments
 * Uses Cloudflare AI for predictions
 *
 * @module hooks/usePredictiveAnalytics
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	predictRecoveryTimeline,
	RecoveryPrediction,
	PredictionInput,
} from "@/lib/ai/predictive-analytics";
import type { PatientPrediction, RiskLevel } from "@/types/patientAnalytics";
import { analyticsApi } from "@/api/v2";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const PREDICTIVE_ANALYTICS_KEYS = {
	all: ["predictive-analytics"] as const,
	prediction: (patientId: string) =>
		[...PREDICTIVE_ANALYTICS_KEYS.all, "prediction", patientId] as const,
	riskFactors: (patientId: string) =>
		[...PREDICTIVE_ANALYTICS_KEYS.all, "risk", patientId] as const,
	milestones: (patientId: string) =>
		[...PREDICTIVE_ANALYTICS_KEYS.all, "milestones", patientId] as const,
	similarCases: (condition: string) =>
		[...PREDICTIVE_ANALYTICS_KEYS.all, "similar-cases", condition] as const,
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

// Risk factor entry structure
interface RiskFactorEntry {
	factor: string;
	impact: string;
}

const ensureArray = <T>(value: unknown): T[] =>
	Array.isArray(value) ? (value as T[]) : [];

const mapPredictionToRecoveryPrediction = (
	prediction: PatientPrediction &
		Partial<
			Record<
				| "milestones"
				| "risk_factors"
				| "treatment_recommendations"
				| "similar_cases",
				unknown
			>
		> &
		Record<string, unknown>,
): RecoveryPrediction => {
	const features = prediction.features ?? {};
	const confidenceRaw =
		prediction.confidence_interval ??
		(prediction as any).confidenceInterval ??
		{};
	const interval = {
		lower: String(confidenceRaw?.lower ?? prediction.prediction_date ?? ""),
		upper: String(
			confidenceRaw?.upper ??
				prediction.target_date ??
				prediction.prediction_date ??
				new Date().toISOString(),
		),
		lowerDays:
			Number(confidenceRaw?.lowerDays ?? confidenceRaw?.lower_days ?? 0) ||
			Number(prediction.predicted_value ?? 0),
		expectedDays:
			Number(
				confidenceRaw?.expectedDays ?? confidenceRaw?.expected_days ?? 0,
			) || Number(prediction.predicted_value ?? 0),
		upperDays:
			Number(confidenceRaw?.upperDays ?? confidenceRaw?.upper_days ?? 0) ||
			Number(prediction.predicted_value ?? 0),
	};

	const rawMilestones = prediction.milestones ?? (prediction as any).milestones;
	const rawRiskFactors =
		prediction.risk_factors ?? (prediction as any).risk_factors;
	const rawTreatment =
		prediction.treatment_recommendations ??
		(prediction as any).treatment_recommendations;
	const rawSimilarCases =
		prediction.similar_cases ?? (prediction as any).similar_cases;

	return {
		patientId: prediction.patient_id,
		condition: features.condition ?? (prediction as any).condition ?? "unknown",
		predictedAt: prediction.prediction_date,
		predictedRecoveryDate: prediction.target_date ?? new Date().toISOString(),
		confidenceInterval: {
			lower: interval.lower,
			upper: interval.upper,
			lowerDays: interval.lowerDays,
			expectedDays: interval.expectedDays,
			upperDays: interval.upperDays,
		},
		confidenceScore: prediction.confidence_score ?? 0,
		milestones: ensureArray<MilestoneRecord>(rawMilestones),
		riskFactors: ensureArray<RiskFactorEntry>(rawRiskFactors),
		treatmentRecommendations: {
			optimalFrequency:
				(rawTreatment as any)?.optimal_frequency ??
				(rawTreatment as any)?.optimalFrequency ??
				"",
			sessionsPerWeek: Number(
				(rawTreatment as any)?.sessions_per_week ??
					(rawTreatment as any)?.sessionsPerWeek ??
					0,
			),
			estimatedTotalSessions: Number(
				(rawTreatment as any)?.estimated_total_sessions ??
					(rawTreatment as any)?.estimatedTotalSessions ??
					0,
			),
			intensity: ((rawTreatment as any)?.intensity ??
				(prediction as any).intensity ??
				"moderate") as "low" | "moderate" | "high",
			focusAreas: ensureArray<string>(
				(rawTreatment as any)?.focus_areas ?? (rawTreatment as any)?.focusAreas,
			),
		},
		similarCases: {
			totalAnalyzed: Number(
				(rawSimilarCases as any)?.total_analyzed ??
					(rawSimilarCases as any)?.totalAnalyzed ??
					0,
			),
			matchingCriteria:
				(rawSimilarCases as any)?.matching_criteria ??
				(rawSimilarCases as any)?.matchingCriteria ??
				[],
			averageRecoveryTime: Number(
				(rawSimilarCases as any)?.average_recovery_time ??
					(rawSimilarCases as any)?.averageRecoveryTime ??
					0,
			),
			successRate: Number(
				(rawSimilarCases as any)?.success_rate ??
					(rawSimilarCases as any)?.successRate ??
					0,
			),
			keyInsights:
				(rawSimilarCases as any)?.key_insights ??
				(rawSimilarCases as any)?.keyInsights ??
				[],
		},
		modelVersion: prediction.model_version ?? "unknown",
		dataSource:
			(prediction as any).data_source ??
			(prediction as any).dataSource ??
			"historical",
		requiresValidation:
			(prediction as any).requires_validation ??
			(prediction as any).requiresValidation ??
			true,
	};
};

// ============================================================================
// HOOK: RECOVERY PREDICTION
// ============================================================================

/**
 * Hook to generate recovery prediction for a patient
 */
export function useRecoveryPrediction(
	input: PredictionInput | null,
	options: UsePredictiveAnalyticsOptions = {},
) {
	const { enabled = true, onSuccess, onError } = options;
	const _queryClient = useQueryClient();

	return useQuery({
		queryKey: PREDICTIVE_ANALYTICS_KEYS.prediction(input?.patientId || ""),
		queryFn: async (): Promise<RecoveryPrediction> => {
			if (!input) {
				throw new Error("Prediction input is required");
			}

			try {
				const prediction = await predictRecoveryTimeline(input);

				if (onSuccess) {
					onSuccess(prediction);
				}

				return prediction;
			} catch (error) {
				const err =
					error instanceof Error ? error : new Error("Prediction failed");
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

export function useStoredPrediction(patientId: string) {
	return useQuery({
		queryKey: PREDICTIVE_ANALYTICS_KEYS.prediction(patientId),
		queryFn: async (): Promise<RecoveryPrediction | null> => {
			const response = await analyticsApi.patientPredictions.list(patientId, {
				predictionType: "recovery_timeline",
				limit: 1,
			});
			const prediction = response?.data?.[0];
			if (!prediction) return null;
			return mapPredictionToRecoveryPrediction(prediction);
		},
		enabled: !!patientId,
		staleTime: 30 * 60 * 1000,
	});
}

// ============================================================================
// HOOK: RISK FACTORS
// ============================================================================

export function useRiskFactors(patientId: string) {
	return useQuery({
		queryKey: PREDICTIVE_ANALYTICS_KEYS.riskFactors(patientId),
		queryFn: async () => {
			const response = await analyticsApi.patientRisk(patientId);
			const data = response?.data ?? {
				dropout_risk: 0,
				no_show_risk: 0,
				poor_outcome_risk: 0,
				overall_risk: 0,
				risk_level: "low" as RiskLevel,
			};

			return {
				dropoutRisk: Number(data.dropout_risk ?? 0),
				riskLevel: (data.risk_level ?? "low") as RiskLevel,
				factors: [],
				recommendations: [],
			};
		},
		enabled: !!patientId,
		staleTime: 60 * 60 * 1000,
	});
}

// ============================================================================
// HOOK: MILESTONES PROGRESS
// ============================================================================

/**
 * Hook to track milestones progress
 */
export function useMilestonesProgress(patientId: string) {
	const storedPrediction = useStoredPrediction(patientId);
	const milestones = storedPrediction.data?.milestones ?? [];
	const achievedCount = milestones.filter((m) => m.achieved).length;

	const data = {
		milestones,
		achievedCount,
		totalCount: milestones.length,
		progressPercentage:
			milestones.length > 0
				? Math.round((achievedCount / milestones.length) * 100)
				: 0,
	};

	return {
		data,
		isLoading: storedPrediction.isLoading,
		isError: storedPrediction.isError,
		error: storedPrediction.error,
		refetch: storedPrediction.refetch,
	};
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

			toast.success("Previsão de recuperação gerada com sucesso", {
				description: `Previsão: ${formatDate(data.predictedRecoveryDate)}`,
			});
		},
		onError: (error: Error) => {
			toast.error("Erro ao gerar previsão", {
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
				label: "Início",
			},
			{
				date: lowerDate.toISOString(),
				value: confidenceInterval.lowerDays,
				predicted: true,
				label: "Caso pessimista",
			},
			{
				date: expectedDate.toISOString(),
				value: confidenceInterval.expectedDays,
				predicted: true,
				label: "Caso esperado",
			},
			{
				date: upperDate.toISOString(),
				value: confidenceInterval.upperDays,
				predicted: true,
				label: "Caso otimista",
			},
		];
	};

	const milestonesData = (): Array<{
		name: string;
		date: string;
		achieved: boolean;
	}> => {
		if (!prediction) return [];

		return prediction.milestones.map((m) => ({
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
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
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
	if (score < 30) return "text-green-600";
	if (score < 50) return "text-yellow-600";
	if (score < 70) return "text-orange-600";
	return "text-red-600";
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(score: number): string {
	if (score < 30) return "Baixo";
	if (score < 50) return "Moderado";
	if (score < 70) return "Alto";
	return "Crítico";
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
