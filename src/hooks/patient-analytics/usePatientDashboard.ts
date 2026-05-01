import { PatientAnalyticsData } from "@/types/patientAnalytics";
import { usePatientProgressSummary, usePatientSessionMetrics } from "./usePatientSessions";
import { usePatientLifecycleSummary } from "./usePatientLifecycle";
import { useOutcomeMeasureTrends } from "./usePatientOutcomes";
import { usePatientRiskScore, usePatientPredictions } from "./usePatientRisk";
import { usePatientGoals } from "./usePatientGoals";
import { usePatientInsights } from "./usePatientInsights";
import { DEFAULT_PROGRESS_SUMMARY } from "./constants";

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
  const optionalQueries = [outcomeTrends, riskScore, predictions, goals, insights];

  const isLoading = coreQueries.some((query) => query?.isLoading);
  const isError = coreQueries.every((query) => query?.isError);
  const isFetching = [...coreQueries, ...optionalQueries].some((query) => query?.isFetching);

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
    progress_summary: progressSummary.data ?? DEFAULT_PROGRESS_SUMMARY,
    pain_trend:
      outcomeTrends.data?.find((t) => t.measure_name.toLowerCase().includes("pain")) || null,
    function_trend:
      outcomeTrends.data?.find((t) => t.measure_name.toLowerCase().includes("func")) || null,
    risk_score: riskScore.data ?? null,
    predictions: {
      dropout_probability:
        predictions.data?.find((p) => p.prediction_type === "dropout_risk")?.predicted_value ?? 0,
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
        predictions.data?.find((p) => p.prediction_type === "outcome_success")?.predicted_value ??
        0,
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
        (i) => i.insight_type === "recommendation" || i.insight_type === "risk_detected",
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
