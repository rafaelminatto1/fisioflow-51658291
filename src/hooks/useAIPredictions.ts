/**
 * useAIPredictions - Migrated to Neon/Workers
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { analyticsApi } from "@/lib/api/workers-client";

const nowIso = () => new Date().toISOString();

export function useAIPredictions() {
	const predictAdherence = useMutation({
		mutationFn: async (patientId: string) => {
			const response = await analyticsApi.patientPredictions.upsert({
				patient_id: patientId,
				predictions: [
					{
						prediction_type: "adherence",
						predicted_class: "pending_analysis",
						confidence_score: 0.5,
						target_date: nowIso(),
						timeframe_days: 30,
						model_version: "workers-manual-v1",
						model_name: "adherence-proxy",
						risk_factors: [],
						treatment_recommendations: {
							source: "workers",
							action: "predict_adherence",
						},
					},
				],
			});

			return response?.data?.[0] ?? null;
		},
		onSuccess: () => {
			toast({
				title: "Predição concluída",
				description: "Análise de aderência gerada com sucesso",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro na predição",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const predictOutcome = useMutation({
		mutationFn: async (patientId: string) => {
			const response = await analyticsApi.patientPredictions.upsert({
				patient_id: patientId,
				predictions: [
					{
						prediction_type: "outcome",
						predicted_class: "pending_analysis",
						confidence_score: 0.5,
						target_date: nowIso(),
						timeframe_days: 90,
						model_version: "workers-manual-v1",
						model_name: "outcome-proxy",
						milestones: [],
						risk_factors: [],
						treatment_recommendations: {
							source: "workers",
							action: "predict_outcome",
						},
					},
				],
			});

			return response?.data?.[0] ?? null;
		},
		onSuccess: () => {
			toast({
				title: "Previsão gerada",
				description: "Resultado do tratamento previsto com sucesso",
			});
		},
		onError: (error: Error) => {
			toast({
				title: "Erro na previsão",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	return {
		predictAdherence,
		predictOutcome,
	};
}
