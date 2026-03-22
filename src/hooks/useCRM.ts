/**
 * useCRM - Rewritten to use Workers API (crmApi.tarefas + crmApi.leads)
 *
 * Campanhas, Automações and NPS are not in the Workers API yet — they return empty arrays.
 * Leads are now served from crmApi.leads (see useLeads.ts).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { crmApi, CrmTarefa } from "@/api/v2";

export type { CrmTarefa };

// --- Legacy types kept for callers that still reference them ---

export interface CRMTarefa {
	id: string;
	lead_id: string | null;
	titulo: string;
	descricao: string | null;
	tipo: "follow_up" | "ligacao" | "email" | "whatsapp" | "reuniao";
	prioridade: "baixa" | "normal" | "alta" | "urgente";
	status: "pendente" | "em_andamento" | "concluida" | "cancelada";
	data_vencimento: string | null;
	hora_vencimento: string | null;
	responsavel_id: string | null;
	concluida_em: string | null;
	created_at: string;
	lead?: { nome: string };
}

export interface CRMCampanha {
	id: string;
	nome: string;
	descricao: string | null;
	tipo: "email" | "whatsapp" | "sms";
	status: "rascunho" | "agendada" | "enviando" | "concluida" | "pausada";
	assunto: string | null;
	conteudo: string;
	filtro_estagios: string[];
	filtro_origens: string[];
	filtro_tags: string[];
	agendada_para: string | null;
	total_destinatarios: number;
	total_enviados: number;
	total_abertos: number;
	created_at: string;
}

export interface CRMAutomacao {
	id: string;
	nome: string;
	descricao: string | null;
	tipo:
		| "aniversario"
		| "reengajamento"
		| "pos_avaliacao"
		| "boas_vindas"
		| "follow_up_automatico";
	ativo: boolean;
	gatilho_config: Record<string, unknown>;
	acao_config: Record<string, unknown>;
	canal: "whatsapp" | "email" | "sms";
	template_mensagem: string | null;
	total_executado: number;
	created_at: string;
}

export interface NPSPesquisa {
	id: string;
	lead_id: string | null;
	patient_id: string | null;
	nota: number;
	categoria: "promotor" | "neutro" | "detrator";
	comentario: string | null;
	motivo_nota: string | null;
	sugestoes: string | null;
	origem: string | null;
	respondido_em: string;
	leads?: { nome: string };
	patients?: { full_name: string };
}

// ========== TAREFAS ==========

export function useCRMTarefas(leadId?: string) {
	return useQuery({
		queryKey: ["crm-tarefas", leadId],
		queryFn: async () => {
			const res = await crmApi.tarefas.list(leadId ? { leadId } : undefined);
			return (res?.data ?? res ?? []) as CrmTarefa[];
		},
	});
}

export function useTarefasPendentes() {
	return useQuery({
		queryKey: ["crm-tarefas-pendentes"],
		queryFn: async () => {
			const res = await crmApi.tarefas.list({ status: "pendente" });
			return (res?.data ?? res ?? []) as CrmTarefa[];
		},
	});
}

export function useCreateTarefa() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (tarefa: Partial<CrmTarefa>) => {
			const res = await crmApi.tarefas.create(tarefa);
			return (res?.data ?? res) as CrmTarefa;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas"] });
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas-pendentes"] });
			toast.success("Tarefa criada com sucesso.");
		},
		onError: () => toast.error("Erro ao criar tarefa."),
	});
}

export function useUpdateTarefa() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			...tarefa
		}: Partial<CrmTarefa> & { id: string }) => {
			const res = await crmApi.tarefas.update(id, tarefa);
			return (res?.data ?? res) as CrmTarefa;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas"] });
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas-pendentes"] });
			toast.success("Tarefa atualizada.");
		},
		onError: () => toast.error("Erro ao atualizar tarefa."),
	});
}

export function useConcluirTarefa() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const res = await crmApi.tarefas.update(id, { status: "concluida" });
			return (res?.data ?? res) as CrmTarefa;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas"] });
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas-pendentes"] });
			toast.success("Tarefa concluída!");
		},
		onError: () => toast.error("Erro ao concluir tarefa."),
	});
}

export function useDeleteTarefa() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await crmApi.tarefas.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas"] });
			queryClient.invalidateQueries({ queryKey: ["crm-tarefas-pendentes"] });
			toast.success("Tarefa excluída.");
		},
		onError: () => toast.error("Erro ao excluir tarefa."),
	});
}

// ========== CAMPANHAS — not in Workers API yet ==========

export function useCRMCampanhas() {
	return useQuery({
		queryKey: ["crm-campanhas"],
		queryFn: async (): Promise<CRMCampanha[]> => [],
		staleTime: Infinity,
	});
}

export function useCreateCampanha() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_campanha: Partial<CRMCampanha>) => {
			throw new Error("Campanhas ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

export function useUpdateCampanha() {
	return useMutation({
		mutationFn: async (_: Partial<CRMCampanha> & { id: string }) => {
			throw new Error("Campanhas ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

export function useDeleteCampanha() {
	return useMutation({
		mutationFn: async (_: string) => {
			throw new Error("Campanhas ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

// ========== AUTOMAÇÕES — not in Workers API yet ==========

export function useCRMAutomacoes() {
	return useQuery({
		queryKey: ["crm-automacoes"],
		queryFn: async (): Promise<CRMAutomacao[]> => [],
		staleTime: Infinity,
	});
}

export function useCreateAutomacao() {
	return useMutation({
		mutationFn: async (_automacao: Partial<CRMAutomacao>) => {
			throw new Error("Automações ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

export function useToggleAutomacao() {
	return useMutation({
		mutationFn: async (_: { id: string; ativo: boolean }) => {
			throw new Error("Automações ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

export function useDeleteAutomacao() {
	return useMutation({
		mutationFn: async (_: string) => {
			throw new Error("Automações ainda não disponíveis na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

// ========== NPS — not in Workers API yet ==========

export function useNPSPesquisas() {
	return useQuery({
		queryKey: ["crm-nps"],
		queryFn: async (): Promise<NPSPesquisa[]> => [],
		staleTime: Infinity,
	});
}

export function useNPSMetrics() {
	return useQuery({
		queryKey: ["crm-nps-metrics"],
		queryFn: async () => ({
			total: 0,
			promotores: 0,
			neutros: 0,
			detratores: 0,
			nps: 0,
		}),
		staleTime: Infinity,
	});
}

export function useCreateNPS() {
	return useMutation({
		mutationFn: async (_pesquisa: Partial<NPSPesquisa>) => {
			throw new Error("NPS ainda não disponível na API Workers");
		},
		onError: (e: Error) => toast.error(e.message),
	});
}

// ========== CRM ANALYTICS ==========

export function useCRMAnalytics() {
	return useQuery({
		queryKey: ["crm-analytics"],
		queryFn: async () => {
			const res = await crmApi.leads.list();
			const leads = (res?.data ?? res ?? []) as Array<{
				id: string;
				origem?: string;
				estagio?: string;
				data_ultimo_contato?: string;
				temperatura?: string;
				score?: number;
			}>;

			const conversionBySource = Object.entries(
				leads.reduce(
					(acc, lead) => {
						const origem = lead.origem || "Não informado";
						if (!acc[origem]) acc[origem] = { total: 0, convertidos: 0 };
						acc[origem].total++;
						if (lead.estagio === "efetivado") acc[origem].convertidos++;
						return acc;
					},
					{} as Record<string, { total: number; convertidos: number }>,
				),
			).map(([origem, data]) => ({
				origem,
				total: data.total,
				convertidos: data.convertidos,
				taxa:
					data.total > 0
						? Math.round((data.convertidos / data.total) * 100)
						: 0,
			}));

			const coldLeads = leads.filter((l) => {
				if (!l.data_ultimo_contato) return true;
				const lastContact = new Date(l.data_ultimo_contato);
				const daysAgo =
					(Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
				return daysAgo > 7;
			}).length;

			return {
				conversionBySource,
				coldLeads,
				totalLeads: leads.length,
				temperatureDistribution: {},
				stageAnalysis: [],
			};
		},
	});
}

// ========== IMPORT LEADS ==========

export interface LeadImportData {
	nome?: string;
	name?: string;
	Nome?: string;
	telefone?: string;
	phone?: string;
	Telefone?: string;
	email?: string;
	Email?: string;
	origem?: string;
	Origem?: string;
	interesse?: string;
	Interesse?: string;
	observacoes?: string;
	Observações?: string;
}

export function useImportLeads() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (leads: Array<Partial<LeadImportData>>) => {
			const formatted = leads
				.map((lead) => ({
					nome: lead.nome || lead.name || lead.Nome || "",
					telefone: lead.telefone || lead.phone || lead.Telefone || undefined,
					email: lead.email || lead.Email || undefined,
					origem: lead.origem || lead.Origem || "Importação",
					interesse: lead.interesse || lead.Interesse || undefined,
					observacoes:
						lead.observacoes ||
						((lead as Record<string, unknown>)["Observações"] as string) ||
						undefined,
					estagio: "aguardando",
					data_primeiro_contato: new Date().toISOString().split("T")[0],
				}))
				.filter((l) => l.nome);

			const results = [];
			for (const lead of formatted) {
				const res = await crmApi.leads.create(lead);
				results.push(res?.data ?? res);
			}
			return results;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ["leads"] });
			toast.success(`${data.length} leads importados com sucesso!`);
		},
		onError: () => toast.error("Erro ao importar leads."),
	});
}
