import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { request } from "@/lib/api/workers-client";

export interface StandardizedTestResult {
	id: string;
	organization_id?: string;
	patient_id: string;
	scale_name: string;
	score: number;
	interpretation?: string | null;
	responses?: Record<string, unknown> | null;
	applied_at: string;
	applied_by?: string | null;
	session_id?: string | null;
	notes?: string | null;
	created_at?: string;
	updated_at?: string;
}

// Keep legacy alias for backwards compatibility
export type StandardizedTestResultRow = StandardizedTestResult;

interface UseStandardizedTestsOptions {
	scale?: string;
	limit?: number;
}

export const useStandardizedTests = (
	patientId: string,
	options?: UseStandardizedTestsOptions,
) => {
	const { scale, limit } = options ?? {};

	return useQuery({
		queryKey: ["standardized-tests", patientId, scale, limit],
		queryFn: async (): Promise<StandardizedTestResult[]> => {
			const params = new URLSearchParams({ patientId });
			if (scale) params.set("scale", scale.toUpperCase());
			if (limit) params.set("limit", String(limit));
			const res = await request<{ data: StandardizedTestResult[] }>(
				`/api/standardized-tests?${params.toString()}`,
			);
			return (res?.data ?? []) as StandardizedTestResult[];
		},
		enabled: !!patientId,
	});
};

interface CreateStandardizedTestInput {
	patient_id: string;
	scale_name: string;
	score: number;
	interpretation?: string;
	responses?: Record<string, unknown>;
	session_id?: string;
	applied_at?: string;
	notes?: string;
}

export const useCreateStandardizedTest = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			data: CreateStandardizedTestInput,
		): Promise<StandardizedTestResult> => {
			const res = await request<{ data: StandardizedTestResult }>(
				"/api/standardized-tests",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
			return (res?.data ?? res) as StandardizedTestResult;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["standardized-tests", variables.patient_id],
			});
			queryClient.invalidateQueries({
				queryKey: ["standardized-tests-timeline", variables.patient_id],
			});
		},
		onError: (error) => {
			logger.error("Erro ao salvar PROM", error, "useCreateStandardizedTest");
			toast.error("Não foi possível salvar a avaliação");
		},
	});
};

export const useDeleteStandardizedTest = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
		}: {
			id: string;
			patientId: string;
		}): Promise<void> => {
			await request<{ success: boolean }>(`/api/standardized-tests/${id}`, {
				method: "DELETE",
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["standardized-tests", variables.patientId],
			});
			queryClient.invalidateQueries({
				queryKey: ["standardized-tests-timeline", variables.patientId],
			});
			toast.success("Avaliação removida");
		},
		onError: (error) => {
			logger.error("Erro ao remover PROM", error, "useDeleteStandardizedTest");
			toast.error("Não foi possível remover a avaliação");
		},
	});
};

// Legacy alias — kept for backwards compatibility with existing usages
export const useSaveStandardizedTest = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (testData: {
			patient_id: string;
			test_type: "oswestry" | "lysholm" | "dash";
			test_name: string;
			score: number;
			max_score: number;
			interpretation: string;
			answers: Record<string, number>;
		}) => {
			const res = await request<{ data: StandardizedTestResult }>(
				"/api/standardized-tests",
				{
					method: "POST",
					body: JSON.stringify({
						patient_id: testData.patient_id,
						scale_name: (
							testData.test_type ??
							testData.test_name ??
							"CUSTOM"
						).toUpperCase(),
						score: testData.score,
						interpretation: testData.interpretation,
						responses: testData.answers,
					}),
				},
			);
			return (res?.data ?? res) as StandardizedTestResult;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["standardized-tests", variables.patient_id],
			});
			toast.success("Teste salvo com sucesso!");
		},
		onError: (error) => {
			logger.error("Erro ao salvar teste", error, "useStandardizedTests");
			toast.error("Não foi possível salvar o teste");
		},
	});
};
