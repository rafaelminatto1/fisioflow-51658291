/**
 * useEvaluationForms - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	evaluationFormsApi,
	type EvaluationFormRow,
	type EvaluationFormFieldRow,
	type EvaluationFormWithFieldsRow,
} from "@/lib/api/workers-client";
import {
	EvaluationForm,
	EvaluationFormWithFields,
	EvaluationFormField,
} from "@/types/clinical-forms";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type EvaluationFormFormData = {
	nome: string;
	descricao?: string | null;
	referencias?: string | null;
	tipo: string;
	ativo?: boolean;
};

export type EvaluationFormFieldFormData = Omit<
	EvaluationFormField,
	"id" | "created_at" | "form_id"
>;

const mapForm = (row: EvaluationFormRow): EvaluationForm => ({
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
});

const mapField = (row: EvaluationFormFieldRow): EvaluationFormField => ({
	id: row.id,
	form_id: row.form_id,
	tipo_campo: row.tipo_campo as EvaluationFormField["tipo_campo"],
	label: row.label,
	placeholder: row.placeholder ?? null,
	opcoes: Array.isArray(row.opcoes) ? (row.opcoes as string[]) : null,
	ordem: Number(row.ordem ?? 0),
	obrigatorio: Boolean(row.obrigatorio),
	grupo: row.grupo ?? null,
	descricao: row.descricao ?? null,
	minimo: row.minimo ?? null,
	maximo: row.maximo ?? null,
	created_at: row.created_at,
});

const mapFormWithFields = (
	row: EvaluationFormWithFieldsRow,
): EvaluationFormWithFields => ({
	...mapForm(row),
	fields: (row.fields ?? []).map(mapField),
});

export function useEvaluationForms(tipo?: string) {
	return useQuery({
		queryKey: ["evaluation-forms", tipo],
		queryFn: async () => {
			const res = await evaluationFormsApi.list({ tipo, ativo: true });
			const data = (res?.data ?? []) as EvaluationFormRow[];
			return data
				.map(mapForm)
				.filter((form) => (!tipo ? true : form.tipo === tipo));
		},
	});
}

export function useEvaluationFormWithFields(formId: string | undefined) {
	return useQuery({
		queryKey: ["evaluation-form", formId],
		queryFn: async () => {
			if (!formId) return null;
			const res = await evaluationFormsApi.get(formId);
			return mapFormWithFields(
				(res?.data ?? null) as EvaluationFormWithFieldsRow,
			);
		},
		enabled: !!formId,
	});
}

export function useCreateEvaluationForm() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (form: EvaluationFormFormData) => {
			const res = await evaluationFormsApi.create({
				...form,
				ativo: form.ativo ?? true,
			});
			return mapForm((res?.data ?? res) as EvaluationFormRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			toast.success("Ficha de avaliação criada com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao criar ficha de avaliação.");
		},
	});
}

export function useUpdateEvaluationForm() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...form
		}: Partial<EvaluationForm> & { id: string }) => {
			const res = await evaluationFormsApi.update(
				id,
				form as Partial<EvaluationFormRow>,
			);
			return mapForm((res?.data ?? res) as EvaluationFormRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			toast.success("Ficha de avaliação atualizada com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao atualizar ficha de avaliação.");
		},
	});
}

export function useDeleteEvaluationForm() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await evaluationFormsApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			toast.success("Ficha de avaliação excluída com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao excluir ficha de avaliação.");
		},
	});
}

export function useDuplicateEvaluationForm() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const duplicated = await evaluationFormsApi.duplicate(id);
			const duplicatedId = (duplicated?.data?.id ??
				duplicated?.data?.data?.id) as string | undefined;

			if (!duplicatedId) {
				throw new Error("Não foi possível duplicar ficha");
			}

			const full = await evaluationFormsApi.get(duplicatedId);
			return mapForm((full?.data ?? full) as EvaluationFormRow);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			toast.success("Ficha duplicada com sucesso.");
		},
		onError: (error) => {
			logger.error("Erro ao duplicar ficha", error, "useEvaluationForms");
			toast.error("Erro ao duplicar ficha.");
		},
	});
}

export function useAddFormField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			formId,
			field,
		}: {
			formId: string;
			field: EvaluationFormFieldFormData;
		}) => {
			const res = await evaluationFormsApi.addField(formId, {
				...field,
				opcoes: field.opcoes ?? null,
			});
			return mapField((res?.data ?? res) as EvaluationFormFieldRow);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["evaluation-form", variables.formId],
			});
			toast.success("Campo adicionado com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao adicionar campo.");
		},
	});
}

export function useUpdateFormField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			formId: _formId,
			...field
		}: Partial<EvaluationFormField> & { id: string; formId: string }) => {
			const res = await evaluationFormsApi.updateField(id, {
				...field,
				opcoes: field.opcoes ?? null,
			});
			return mapField((res?.data ?? res) as EvaluationFormFieldRow);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["evaluation-form", variables.formId],
			});
			toast.success("Campo atualizado com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao atualizar campo.");
		},
	});
}

export function useDeleteFormField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			formId: _formId,
		}: {
			id: string;
			formId: string;
		}) => {
			await evaluationFormsApi.deleteField(id);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["evaluation-form", variables.formId],
			});
			toast.success("Campo excluído com sucesso.");
		},
		onError: () => {
			toast.error("Erro ao excluir campo.");
		},
	});
}

export type EvaluationFormImportData = {
	nome: string;
	descricao?: string | null;
	referencias?: string | null;
	tipo: string;
	fields: EvaluationFormFieldFormData[];
};

export function useImportEvaluationForm() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: EvaluationFormImportData) => {
			const formRes = await evaluationFormsApi.create({
				nome: data.nome,
				descricao: data.descricao,
				referencias: data.referencias,
				tipo: data.tipo,
				ativo: true,
			});

			const form = (formRes?.data ?? formRes) as EvaluationFormRow;

			if (data.fields && data.fields.length > 0) {
				await Promise.all(
					data.fields.map((field) =>
						evaluationFormsApi.addField(form.id, {
							...field,
							opcoes: field.opcoes ?? null,
						}),
					),
				);
			}

			return mapForm(form);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["evaluation-forms"] });
			toast.success("Ficha importada com sucesso.");
		},
		onError: (error) => {
			logger.error("Erro ao importar ficha", error, "useEvaluationForms");
			toast.error("Erro ao importar ficha.");
		},
	});
}
