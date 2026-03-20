/**
 * useLeads - Rewritten to use Workers API (crmApi.leads)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { crmApi, Lead, LeadHistorico } from "@/lib/api/workers-client";

export type { Lead, LeadHistorico };

export function useLeads(estagio?: string) {
	return useQuery({
		queryKey: ["leads", estagio],
		queryFn: async () => {
			const res = await crmApi.leads.list(estagio ? { estagio } : undefined);
			return (res?.data ?? res ?? []) as Lead[];
		},
	});
}

export function useLeadHistorico(leadId: string | undefined) {
	return useQuery({
		queryKey: ["lead-historico", leadId],
		queryFn: async () => {
			if (!leadId) return [];
			const res = await crmApi.leads.historico(leadId);
			return (res?.data ?? res ?? []) as LeadHistorico[];
		},
		enabled: !!leadId,
	});
}

export function useCreateLead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (lead: Partial<Lead>) => {
			const res = await crmApi.leads.create(lead);
			return (res?.data ?? res) as Lead;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
			toast.success("Lead cadastrado com sucesso.");
		},
		onError: () => toast.error("Erro ao cadastrar lead."),
	});
}

export function useUpdateLead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...lead }: Partial<Lead> & { id: string }) => {
			const res = await crmApi.leads.update(id, lead);
			return (res?.data ?? res) as Lead;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
			toast.success("Lead atualizado.");
		},
		onError: () => toast.error("Erro ao atualizar lead."),
	});
}

export function useDeleteLead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await crmApi.leads.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
			toast.success("Lead excluído.");
		},
		onError: () => toast.error("Erro ao excluir lead."),
	});
}

export function useAddLeadHistorico() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (
			historico: Partial<LeadHistorico> & { lead_id: string },
		) => {
			const res = await crmApi.leads.addHistorico(historico.lead_id, historico);
			return (res?.data ?? res) as LeadHistorico;
		},
		onSuccess: (_, vars) => {
			queryClient.invalidateQueries({
				queryKey: ["lead-historico", vars.lead_id],
			});
			queryClient.invalidateQueries({ queryKey: ["leads"] });
			toast.success("Histórico adicionado.");
		},
		onError: () => toast.error("Erro ao adicionar histórico."),
	});
}

export function useLeadMetrics() {
	return useQuery({
		queryKey: ["lead-metrics"],
		queryFn: async () => {
			const res = await crmApi.leads.list();
			const leads = (res?.data ?? res ?? []) as Lead[];
			const total = leads.length;
			const porEstagio = {
				aguardando: leads.filter((l) => l.estagio === "aguardando").length,
				em_contato: leads.filter((l) => l.estagio === "em_contato").length,
				avaliacao_agendada: leads.filter(
					(l) => l.estagio === "avaliacao_agendada",
				).length,
				avaliacao_realizada: leads.filter(
					(l) => l.estagio === "avaliacao_realizada",
				).length,
				efetivado: leads.filter((l) => l.estagio === "efetivado").length,
				nao_efetivado: leads.filter((l) => l.estagio === "nao_efetivado")
					.length,
			};
			const taxaConversao =
				total > 0 ? ((porEstagio.efetivado / total) * 100).toFixed(1) : "0";
			return { total, porEstagio, taxaConversao };
		},
	});
}
