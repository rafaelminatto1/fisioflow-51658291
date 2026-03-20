/**
 * usePatientAnalytics - Migrated to Neon/Cloudflare
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	analyticsApi,
	type PatientProgressSummary,
} from "@/lib/api/workers-client";
import { toast } from "sonner";

import {
	PatientLifecycleEvent,
	PatientOutcomeMeasure,
	PatientSessionMetrics,
	PatientPrediction,
	PatientRiskScore,
	PatientGoalTracking,
	PatientInsight,
	ClinicalBenchmark,
	PatientAnalyticsData,
	OutcomeMeasureTrend,
	LifecycleEventType,
	PredictionType,
} from "@/types/patientAnalytics";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const PATIENT_ANALYTICS_KEYS = {
	all: ["patient-analytics"] as const,
	progress: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "progress"] as const,
	lifecycle: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "lifecycle"] as const,
	lifecycleEvents: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "lifecycle-events"] as const,
	outcomes: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "outcomes"] as const,
	sessions: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "sessions"] as const,
	predictions: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "predictions"] as const,
	risk: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "risk"] as const,
	goals: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "goals"] as const,
	insights: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "insights"] as const,
	benchmarks: () => [...PATIENT_ANALYTICS_KEYS.all, "benchmarks"] as const,
	dashboard: (patientId: string) =>
		[...PATIENT_ANALYTICS_KEYS.all, patientId, "dashboard"] as const,
};

const DEFAULT_PROGRESS_SUMMARY: PatientProgressSummary = {
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

// ============================================================================
// PROGRESS SUMMARY
// ============================================================================

export function usePatientProgressSummary(patientId: string) {
	return useQuery({
		queryKey: PATIENT_ANALYTICS_KEYS.progress(patientId),
		queryFn: async (): Promise<PatientProgressSummary> => {
			try {
				const response = await analyticsApi.patientProgress(patientId);
				return response?.data ?? DEFAULT_PROGRESS_SUMMARY;
			} catch {
				return DEFAULT_PROGRESS_SUMMARY;
			}
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
		queryKey: PATIENT_ANALYTICS_KEYS.lifecycleEvents(patientId),
		queryFn: async (): Promise<PatientLifecycleEvent[]> => {
			if (!patientId) return [];
			const response =
				await analyticsApi.patientLifecycleEvents.list(patientId);
			return response?.data ?? [];
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
	const lifecycleEventsQuery = usePatientLifecycleEvents(patientId);
	const events = Array.isArray(lifecycleEventsQuery.data)
		? lifecycleEventsQuery.data
		: [];

	const data: PatientLifecycleSummaryData =
		events.length === 0
			? {
					current_stage: "lead_created",
					days_in_current_stage: 0,
					total_days_in_treatment: 0,
					stage_history: [],
				}
			: (() => {
					const now = new Date();
					const sortedEvents = [...events].sort(
						(a, b) =>
							new Date(a.event_date).getTime() -
							new Date(b.event_date).getTime(),
					);

					const currentStage = sortedEvents[sortedEvents.length - 1].event_type;
					const currentStageDate = new Date(
						sortedEvents[sortedEvents.length - 1].event_date,
					);
					const firstEventDate = new Date(sortedEvents[0].event_date);

					const stageHistory = sortedEvents.map((event, index) => {
						const nextEvent = sortedEvents[index + 1];
						return {
							stage: event.event_type,
							date: event.event_date,
							duration_days: nextEvent
								? Math.floor(
										(new Date(nextEvent.event_date).getTime() -
											new Date(event.event_date).getTime()) /
											(1000 * 60 * 60 * 24),
									)
								: undefined,
						};
					});

					return {
						current_stage: currentStage as LifecycleEventType,
						days_in_current_stage: Math.floor(
							(now.getTime() - currentStageDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
						total_days_in_treatment: Math.floor(
							(now.getTime() - firstEventDate.getTime()) /
								(1000 * 60 * 60 * 24),
						),
						stage_history: stageHistory,
					};
				})();

	return {
		data,
		isLoading: lifecycleEventsQuery.isLoading,
		isFetching: lifecycleEventsQuery.isFetching,
		isError: lifecycleEventsQuery.isError,
		error: lifecycleEventsQuery.error,
		refetch: lifecycleEventsQuery.refetch,
	};
}

export function useCreateLifecycleEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			event: Omit<PatientLifecycleEvent, "id" | "created_at">,
		) => {
			const response = await analyticsApi.patientLifecycleEvents.create({
				patient_id: event.patient_id,
				event_type: event.event_type,
				event_date: event.event_date,
				notes: event.notes,
			});
			return response?.data ?? event;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.lifecycleEvents(variables.patient_id),
			});
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.lifecycle(variables.patient_id),
			});
			toast.success("Evento de ciclo de vida registrado");
		},
		onError: (error) => {
			toast.error("Erro ao registrar evento: " + error.message);
		},
	});
}

// ============================================================================
// OUTCOME MEASURES
// ============================================================================

export function usePatientOutcomeMeasures(
	patientId: string,
	measureType?: string,
	limitValue?: number,
) {
	return useQuery({
		queryKey: [
			...PATIENT_ANALYTICS_KEYS.outcomes(patientId),
			measureType,
			limitValue,
		],
		queryFn: async (): Promise<PatientOutcomeMeasure[]> => {
			if (!patientId) return [];
			const response = await analyticsApi.patientOutcomeMeasures.list(
				patientId,
				{
					measureType,
					limit: limitValue,
				},
			);
			return response?.data ?? [];
		},
		enabled: !!patientId,
		staleTime: 5 * 60 * 1000,
	});
}

export function useOutcomeMeasureTrends(patientId: string) {
	const { data: outcomes } = usePatientOutcomeMeasures(patientId);

	return useQuery({
		queryKey: [...PATIENT_ANALYTICS_KEYS.outcomes(patientId), "trends"],
		queryFn: (): OutcomeMeasureTrend[] => {
			if (!outcomes || outcomes.length === 0) return [];

			// Group by measure name
			const grouped = outcomes.reduce(
				(acc, outcome) => {
					if (!acc[outcome.measure_name]) {
						acc[outcome.measure_name] = [];
					}
					acc[outcome.measure_name].push(outcome);
					return acc;
				},
				{} as Record<string, PatientOutcomeMeasure[]>,
			);

			// Calculate trends for each measure
			return Object.entries(grouped).map(([measureName, measures]) => {
				const sortedMeasures = [...measures].sort(
					(a, b) =>
						new Date(a.measurement_date).getTime() -
						new Date(b.measurement_date).getTime(),
				);

				const initialScore =
					sortedMeasures[0].normalized_score ?? sortedMeasures[0].score;
				const currentScore =
					sortedMeasures[sortedMeasures.length - 1].normalized_score ??
					sortedMeasures[sortedMeasures.length - 1].score;
				const change = currentScore - initialScore;
				const changePercentage =
					initialScore !== 0 ? (change / Math.abs(initialScore)) * 100 : 0;

				// Determine trend direction
				let trend: "improving" | "stable" | "declining" = "stable";
				let trendStrength: "strong" | "moderate" | "weak" = "weak";

				if (Math.abs(changePercentage) >= 20) {
					trendStrength = "strong";
				} else if (Math.abs(changePercentage) >= 10) {
					trendStrength = "moderate";
				}

				// For pain, lower is better. For function, higher is better.
				const isPainMeasure =
					measureName.toLowerCase().includes("pain") ||
					sortedMeasures[0].measure_type === "pain_scale";
				const isImprovement = isPainMeasure ? change < 0 : change > 0;

				if (Math.abs(changePercentage) < 5) {
					trend = "stable";
				} else {
					trend = isImprovement ? "improving" : "declining";
				}

				return {
					measure_name: measureName,
					current_score: currentScore,
					initial_score: initialScore,
					change,
					change_percentage: Math.round(changePercentage * 10) / 10,
					trend,
					trend_strength: trendStrength,
					data_points: sortedMeasures.map((m) => ({
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
		mutationFn: async (
			measure: Omit<PatientOutcomeMeasure, "id" | "created_at">,
		) => {
			const response = await analyticsApi.patientOutcomeMeasures.create({
				patient_id: measure.patient_id,
				measure_type: measure.measure_type,
				measure_name: measure.measure_name,
				score: measure.score,
				normalized_score: measure.normalized_score,
				min_score: measure.min_score,
				max_score: measure.max_score,
				measurement_date: measure.measurement_date,
				body_part: measure.body_part,
				context: measure.context,
				notes: measure.notes,
			});
			const data = response?.data;
			if (!data) throw new Error("Falha ao registrar medida");
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.outcomes(variables.patient_id),
			});
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.progress(variables.patient_id),
			});
			toast.success("Medida de resultado registrada");
		},
		onError: (error) => {
			toast.error("Erro ao registrar medida: " + error.message);
		},
	});
}

// ============================================================================
// SESSION METRICS
// ============================================================================

export function usePatientSessionMetrics(
	patientId: string,
	limitValue?: number,
) {
	return useQuery({
		queryKey: [...PATIENT_ANALYTICS_KEYS.sessions(patientId), limitValue],
		queryFn: async (): Promise<PatientSessionMetrics[]> => {
			if (!patientId) return [];
			const response = await analyticsApi.patientSessionMetrics.list(
				patientId,
				{ limit: limitValue },
			);
			return response?.data ?? [];
		},
		enabled: !!patientId,
		staleTime: 5 * 60 * 1000,
	});
}

export function useCreateSessionMetrics() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			metrics: Omit<PatientSessionMetrics, "id" | "created_at">,
		) => {
			const response = await analyticsApi.patientSessionMetrics.create({
				patient_id: metrics.patient_id,
				session_id: metrics.session_id,
				session_date: metrics.session_date,
				session_number: metrics.session_number,
				pain_level_before: metrics.pain_level_before,
				functional_score_before: metrics.functional_score_before,
				mood_before: metrics.mood_before,
				duration_minutes: metrics.duration_minutes,
				treatment_type: metrics.treatment_type,
				techniques_used: metrics.techniques_used,
				areas_treated: metrics.areas_treated,
				pain_level_after: metrics.pain_level_after,
				functional_score_after: metrics.functional_score_after,
				mood_after: metrics.mood_after,
				patient_satisfaction: metrics.patient_satisfaction,
				pain_reduction: metrics.pain_reduction,
				functional_improvement: metrics.functional_improvement,
				notes: metrics.notes,
				therapist_id: metrics.therapist_id,
			});
			return response?.data ?? metrics;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.sessions(variables.patient_id),
			});
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.progress(variables.patient_id),
			});
			toast.success("Métricas da sessão registradas");
		},
		onError: (error) => {
			toast.error("Erro ao registrar métricas: " + error.message);
		},
	});
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export function usePatientPredictions(
	patientId: string,
	predictionType?: PredictionType,
) {
	return useQuery({
		queryKey: [
			...PATIENT_ANALYTICS_KEYS.predictions(patientId),
			predictionType,
		],
		queryFn: async (): Promise<PatientPrediction[]> => {
			if (!patientId) return [];
			const response = await analyticsApi.patientPredictions.list(patientId, {
				predictionType,
				limit: 50,
			});
			return response?.data ?? [];
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
			if (!patientId) return null;
			const response = await analyticsApi.patientRisk(patientId);
			return response?.data ?? null;
		},
		enabled: !!patientId,
		staleTime: 30 * 60 * 1000, // 30 minutes
	});
}

export function useUpdatePatientRiskScore() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (_patientId: string) => {
			// Endpoint to be implemented in Cloudflare Workers
			throw new Error(
				"RPC function not implemented - needs Cloudflare Worker endpoint",
			);
		},
		onSuccess: (_, patientId) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.risk(patientId),
			});
			toast.success("Score de risco atualizado");
		},
		onError: (error) => {
			toast.error("Erro ao atualizar score de risco: " + error.message);
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
			if (!patientId) return [];
			const response = await analyticsApi.patientGoals.list(patientId);
			return response?.data ?? [];
		},
		enabled: !!patientId,
		staleTime: 5 * 60 * 1000,
	});
}

export function useCreateGoal() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			goal: Omit<PatientGoalTracking, "id" | "created_at" | "updated_at">,
		) => {
			const response = await analyticsApi.patientGoals.create(goal);
			return response?.data ?? goal;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.goals(variables.patient_id),
			});
			toast.success("Objetivo criado com sucesso");
		},
		onError: (error) => {
			toast.error("Erro ao criar objetivo: " + error.message);
		},
	});
}

export function useUpdateGoal() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			goalId,
			data,
		}: {
			goalId: string;
			data: Partial<PatientGoalTracking>;
		}) => {
			const response = await analyticsApi.patientGoals.update(goalId, data);
			return response?.data ?? { id: goalId, ...data };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id),
			});
			toast.success("Objetivo atualizado");
		},
		onError: (error) => {
			toast.error("Erro ao atualizar objetivo: " + error.message);
		},
	});
}

export function useCompleteGoal() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (goalId: string) => {
			const response = await analyticsApi.patientGoals.complete(goalId);
			return response?.data ?? { id: goalId, status: "achieved" };
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.goals(data.patient_id),
			});
			toast.success("🎉 Parabéns! Objetivo alcançado!");
		},
		onError: (error) => {
			toast.error("Erro ao completar objetivo: " + error.message);
		},
	});
}

// ============================================================================
// INSIGHTS
// ============================================================================

export function usePatientInsights(
	patientId: string,
	includeAcknowledged = false,
) {
	return useQuery({
		queryKey: [
			...PATIENT_ANALYTICS_KEYS.insights(patientId),
			includeAcknowledged,
		],
		queryFn: async (): Promise<PatientInsight[]> => {
			if (!patientId) return [];
			const response = await analyticsApi.patientInsights.list(patientId, {
				includeAcknowledged,
			});
			return response?.data ?? [];
		},
		enabled: !!patientId,
		staleTime: 5 * 60 * 1000,
	});
}

export function useAcknowledgeInsight() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			insightId,
			patientId,
		}: {
			insightId: string;
			patientId: string;
		}) => {
			const response =
				await analyticsApi.patientInsights.acknowledge(insightId);
			return response?.data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: PATIENT_ANALYTICS_KEYS.insights(variables.patientId),
			});
		},
		onError: (error) => {
			toast.error("Erro ao confirmar insight: " + error.message);
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
			const response =
				await analyticsApi.clinicalBenchmarks.list(benchmarkCategory);
			return response?.data ?? [];
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
	const coreQueries = [progressSummary, lifecycleSummary, sessionMetrics];
	const optionalQueries = [
		outcomeTrends,
		riskScore,
		predictions,
		goals,
		insights,
	];

	// Render dashboard as soon as core data is ready; optional data can arrive progressively.
	const isLoading = coreQueries.some((query) => query?.isLoading);

	// Only show hard-error state when all core queries fail.
	const isError = coreQueries.every((query) => query?.isError);
	const isFetching = [...coreQueries, ...optionalQueries].some(
		(query) => query?.isFetching,
	);
	const hasAnalyticsData = Boolean(
		(progressSummary.data?.total_sessions ?? 0) > 0 ||
			(lifecycleSummary.data?.stage_history?.length ?? 0) > 0 ||
			(outcomeTrends.data?.length ?? 0) > 0 ||
			(sessionMetrics.data?.length ?? 0) > 0 ||
			riskScore.data ||
			(predictions.data?.length ?? 0) > 0 ||
			(goals.data?.length ?? 0) > 0 ||
			(insights.data?.length ?? 0) > 0,
	);
	const isEmpty = !isLoading && !isError && !hasAnalyticsData;

	const data: PatientAnalyticsData = {
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
		pain_trend:
			outcomeTrends.data?.find((t) =>
				t.measure_name.toLowerCase().includes("pain"),
			) || null,
		function_trend:
			outcomeTrends.data?.find((t) =>
				t.measure_name.toLowerCase().includes("func"),
			) || null,
		risk_score: riskScore.data ?? null,
		predictions: {
			dropout_probability:
				predictions.data?.find((p) => p.prediction_type === "dropout_risk")
					?.predicted_value ?? 0,
			dropout_risk_level: riskScore.data?.risk_level ?? "low",
			predicted_recovery_date: predictions.data?.find(
				(p) => p.prediction_type === "recovery_timeline",
			)?.target_date,
			predicted_recovery_confidence:
				predictions.data?.find((p) => p.prediction_type === "recovery_timeline")
					?.confidence_score ?? 0,
			expected_sessions_remaining: predictions.data?.find(
				(p) => p.prediction_type === "recovery_timeline",
			)?.predicted_value,
			success_probability:
				predictions.data?.find((p) => p.prediction_type === "outcome_success")
					?.predicted_value ?? 0,
			key_risk_factors: riskScore.data?.risk_factors
				? Object.keys(riskScore.data.risk_factors)
				: [],
			recommendations: riskScore.data?.recommended_actions ?? [],
		},
		lifecycle: lifecycleSummary.data ?? null,
		benchmark_comparisons: [],
		recent_insights: insights.data?.slice(0, 5) ?? [],
		actionable_insights:
			insights.data?.filter(
				(i) =>
					i.insight_type === "recommendation" ||
					i.insight_type === "risk_detected",
			) ?? [],
		goals: goals.data ?? [],
		recent_sessions:
			sessionMetrics.data?.slice(-5).map((s) => ({
				date: s.session_date,
				pain_reduction: s.pain_reduction ?? 0,
				satisfaction: s.patient_satisfaction ?? 0,
			})) ?? [],
	};

	return {
		data,
		isLoading,
		isFetching,
		isError,
		isEmpty,
		refetch: async () => {
			await Promise.all([
				progressSummary.refetch(),
				lifecycleSummary.refetch(),
				outcomeTrends.refetch(),
				sessionMetrics.refetch(),
				riskScore.refetch(),
				predictions.refetch(),
				goals.refetch(),
				insights.refetch(),
			]);
		},
	};
}
