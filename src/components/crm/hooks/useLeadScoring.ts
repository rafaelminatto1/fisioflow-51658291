/**
 * Lead Scoring Hook - Migrated to Workers/Neon
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { crmApi, type Lead } from "@/api/v2";

interface ScoreFactor {
	type: string;
	description: string;
	points: number;
}

export interface CalculatedLeadScore {
	leadId: string;
	totalScore: number;
	engagementScore: number;
	demographicScore: number;
	behavioralScore: number;
	factors: ScoreFactor[];
	category: "hot" | "warm" | "cold";
}

export async function fetchCalculatedLeadScores(leadId?: string) {
	const res = await crmApi.leads.scores({ leadId });
	return (res?.data ?? []) as CalculatedLeadScore[];
}

export function useLeadScoring() {
	const calculateScores = useMutation({
		mutationFn: async (leadId?: string) => fetchCalculatedLeadScores(leadId),
		onSuccess: () => {
			toast.success("Scores recalculados com sucesso!");
		},
		onError: (error: Error) => {
			toast.error("Erro ao calcular scores: " + error.message);
		},
	});

	return { calculateScores };
}
