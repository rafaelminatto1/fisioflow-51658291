/**
 * useDocumentTemplates - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	documentTemplatesApi,
	type AtestadoTemplateRecord,
	type ContratoTemplateRecord,
} from "@/lib/api/workers-client";
import { toast } from "sonner";

export type AtestadoTemplate = AtestadoTemplateRecord;
export type ContratoTemplate = ContratoTemplateRecord;

export type AtestadoTemplateFormData = Partial<
	Pick<
		AtestadoTemplate,
		"organization_id" | "variaveis_disponiveis" | "created_by"
	>
> &
	Pick<AtestadoTemplate, "nome" | "descricao" | "conteudo" | "ativo">;

export type ContratoTemplateFormData = Partial<
	Pick<
		ContratoTemplate,
		"organization_id" | "variaveis_disponiveis" | "created_by"
	>
> &
	Pick<ContratoTemplate, "nome" | "descricao" | "conteudo" | "tipo" | "ativo">;

export function useAtestadoTemplates() {
	return useQuery({
		queryKey: ["atestado_templates"],
		queryFn: async () => {
			const res = await documentTemplatesApi.atestados.list();
			return res.data ?? [];
		},
	});
}

export function useCreateAtestadoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (template: AtestadoTemplateFormData) => {
			const res = await documentTemplatesApi.atestados.create({
				...template,
				variaveis_disponiveis: template.variaveis_disponiveis ?? [],
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["atestado_templates"] });
			toast.success("Modelo de atestado criado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar modelo: " + error.message);
		},
	});
}

export function useUpdateAtestadoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<AtestadoTemplate> & { id: string }) => {
			const res = await documentTemplatesApi.atestados.update(id, updates);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["atestado_templates"] });
			toast.success("Modelo de atestado atualizado");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar modelo: " + error.message);
		},
	});
}

export function useDeleteAtestadoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await documentTemplatesApi.atestados.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["atestado_templates"] });
			toast.success("Modelo removido com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover modelo: " + error.message);
		},
	});
}

export function useContratoTemplates() {
	return useQuery({
		queryKey: ["contrato_templates"],
		queryFn: async () => {
			const res = await documentTemplatesApi.contratos.list();
			return res.data ?? [];
		},
	});
}

export function useCreateContratoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (template: ContratoTemplateFormData) => {
			const res = await documentTemplatesApi.contratos.create({
				...template,
				variaveis_disponiveis: template.variaveis_disponiveis ?? [],
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contrato_templates"] });
			toast.success("Modelo de contrato criado com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao criar modelo: " + error.message);
		},
	});
}

export function useUpdateContratoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...updates
		}: Partial<ContratoTemplate> & { id: string }) => {
			const res = await documentTemplatesApi.contratos.update(id, updates);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contrato_templates"] });
			toast.success("Modelo de contrato atualizado");
		},
		onError: (error: Error) => {
			toast.error("Erro ao atualizar modelo: " + error.message);
		},
	});
}

export function useDeleteContratoTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await documentTemplatesApi.contratos.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["contrato_templates"] });
			toast.success("Modelo removido com sucesso");
		},
		onError: (error: Error) => {
			toast.error("Erro ao remover modelo: " + error.message);
		},
	});
}

export const templateVariables = {
	atestado: [
		{ key: "#cliente-nome", label: "Nome do Cliente" },
		{ key: "#cliente-cpf", label: "CPF do Cliente" },
		{ key: "#data-hoje", label: "Data de Hoje" },
		{ key: "#hora-atual", label: "Hora Atual" },
		{ key: "#clinica-cidade", label: "Cidade da Clínica" },
		{ key: "#profissional-nome", label: "Nome do Profissional" },
	],
	contrato: [
		{ key: "#cliente-nome", label: "Nome do Cliente" },
		{ key: "#cliente-cpf", label: "CPF do Cliente" },
		{ key: "#cliente-endereco", label: "Endereço do Cliente" },
		{ key: "#data-hoje", label: "Data de Hoje" },
		{ key: "#valor-total", label: "Valor Total" },
		{ key: "#servico-nome", label: "Nome do Serviço" },
		{ key: "#profissional-nome", label: "Nome do Profissional" },
	],
};
