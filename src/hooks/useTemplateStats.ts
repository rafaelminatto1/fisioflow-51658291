/**
 * useTemplateStats - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EvaluationForm } from "@/types/clinical-forms";
import {
	evaluationFormsApi,
	type EvaluationFormRow,
} from "@/lib/api/workers-client";

const toForm = (row: EvaluationFormRow): EvaluationForm => ({
	id: row.id,
	organization_id: row.organization_id ?? null,
	created_by: row.created_by ?? null,
	nome: row.nome,
	descricao: row.descricao ?? null,
	referencias: row.referencias ?? null,
	tipo: row.tipo,
	ativo: Boolean(row.ativo),
	created_at: row.created_at,
	updated_at: row.updated_at,
	is_favorite: Boolean(
		(row as unknown as { is_favorite?: boolean }).is_favorite,
	),
	usage_count: Number(
		(row as unknown as { usage_count?: number }).usage_count ?? 0,
	),
	last_used_at:
		(row as unknown as { last_used_at?: string | null }).last_used_at ?? null,
	cover_image:
		(row as unknown as { cover_image?: string | null }).cover_image ?? null,
	estimated_time: (row as unknown as { estimated_time?: number })
		.estimated_time,
});

export function useTemplateStats() {
	return useQuery({
		queryKey: ["template-stats"],
		queryFn: async () => {
			const res = await evaluationFormsApi.list({ ativo: true });
			const forms = ((res?.data ?? []) as EvaluationFormRow[]).map(toForm);

			const total = forms.length;
			const favorites = forms.filter((f) => f.is_favorite).length;

			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const recentlyUsed = forms
				.filter((f) => {
					const lastUsed = f.last_used_at ? new Date(f.last_used_at) : null;
					return (
						lastUsed &&
						!Number.isNaN(lastUsed.getTime()) &&
						lastUsed >= thirtyDaysAgo
					);
				})
				.reduce((sum, f) => sum + Number(f.usage_count || 0), 0);

			const byCategory: Record<string, number> = {};
			forms.forEach((form) => {
				const tipo = form.tipo;
				byCategory[tipo] = (byCategory[tipo] || 0) + 1;
			});

			return {
				total,
				favorites,
				recentlyUsed,
				byCategory,
			};
		},
	});
}

export function useIncrementTemplateUsage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (templateId: string) => {
			const currentRes = await evaluationFormsApi.get(templateId);
			const current = toForm(
				(currentRes?.data ?? currentRes) as EvaluationFormRow,
			);
			const nextUsage = Number(current.usage_count || 0) + 1;

			await evaluationFormsApi.update(templateId, {
				usage_count: nextUsage,
				last_used_at: new Date().toISOString(),
			} as Partial<EvaluationFormRow>);

			queryClient.invalidateQueries({ queryKey: ["template-stats"] });
			queryClient.invalidateQueries({
				queryKey: ["evaluation-forms", "most-used"],
			});
			queryClient.invalidateQueries({
				queryKey: ["evaluation-forms", "recently-used"],
			});

			return { id: templateId, usage_count: nextUsage };
		},
	});
}

export function useMostUsedTemplates(limitNum = 10) {
	return useQuery({
		queryKey: ["evaluation-forms", "most-used", limitNum],
		queryFn: async () => {
			const res = await evaluationFormsApi.list({ ativo: true });
			const forms = ((res?.data ?? []) as EvaluationFormRow[])
				.map(toForm)
				.filter((f) => Number(f.usage_count || 0) > 0)
				.sort((a, b) => Number(b.usage_count || 0) - Number(a.usage_count || 0))
				.slice(0, limitNum);

			return forms as EvaluationForm[];
		},
	});
}

export function useRecentlyUsedTemplates(limitNum = 6) {
	return useQuery({
		queryKey: ["evaluation-forms", "recently-used", limitNum],
		queryFn: async () => {
			const res = await evaluationFormsApi.list({ ativo: true });
			const forms = ((res?.data ?? []) as EvaluationFormRow[])
				.map(toForm)
				.filter((f) => Boolean(f.last_used_at))
				.sort((a, b) => {
					const aTime = new Date(a.last_used_at || "").getTime();
					const bTime = new Date(b.last_used_at || "").getTime();
					return bTime - aTime;
				})
				.slice(0, limitNum);

			return forms as EvaluationForm[];
		},
	});
}

export default useTemplateStats;
