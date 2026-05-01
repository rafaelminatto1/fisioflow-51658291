import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2";
import { toast } from "sonner";
import { PatientOutcomeMeasure, OutcomeMeasureTrend } from "@/types/patientAnalytics";
import { PATIENT_ANALYTICS_KEYS } from "./constants";

export function usePatientOutcomeMeasures(
  patientId: string,
  measureType?: string,
  limitValue?: number,
) {
  return useQuery({
    queryKey: [...PATIENT_ANALYTICS_KEYS.outcomes(patientId), measureType, limitValue],
    queryFn: async (): Promise<PatientOutcomeMeasure[]> => {
      if (!patientId) return [];
      const response = await analyticsApi.patientOutcomeMeasures.list(patientId, {
        measureType,
        limit: limitValue,
      });
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

      return Object.entries(grouped).map(([measureName, measures]) => {
        const sortedMeasures = [...measures].sort(
          (a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime(),
        );

        const initialScore = sortedMeasures[0].normalized_score ?? sortedMeasures[0].score;
        const currentScore =
          sortedMeasures[sortedMeasures.length - 1].normalized_score ??
          sortedMeasures[sortedMeasures.length - 1].score;
        const change = currentScore - initialScore;
        const changePercentage = initialScore !== 0 ? (change / Math.abs(initialScore)) * 100 : 0;

        let trend: "improving" | "stable" | "declining" = "stable";
        let trendStrength: "strong" | "moderate" | "weak" = "weak";

        if (Math.abs(changePercentage) >= 20) {
          trendStrength = "strong";
        } else if (Math.abs(changePercentage) >= 10) {
          trendStrength = "moderate";
        }

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
    mutationFn: async (measure: Omit<PatientOutcomeMeasure, "id" | "created_at">) => {
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
    onError: (error: Error) => {
      toast.error("Erro ao registrar medida: " + error.message);
    },
  });
}
