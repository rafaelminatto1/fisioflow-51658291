import { useMutation } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/workers-client";

export interface AISummaryResponse {
	summary: string;
	timestamp: string;
}

export const usePatientAISummary = () => {
	return useMutation({
		mutationKey: ["patient-ai-summary"],
		mutationFn: async (patientId: string) => {
			const response = await aiApi.service<
				{
					patientId: string;
					message: string;
					context: Record<string, unknown>;
				},
				{ response: string }
			>("clinicalChat", {
				patientId,
				message: "Gerar um resumo clinico objetivo do paciente.",
				context: { patientId },
			});

			return {
				summary: response.data.response,
				timestamp: new Date().toISOString(),
			};
		},
	});
};
