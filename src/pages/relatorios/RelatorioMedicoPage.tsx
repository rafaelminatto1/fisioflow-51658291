import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FileText,
	Stethoscope,
	Activity,
	CheckCircle2,
	PenTool,
	Bone,
	TrendingUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/hooks/useOrganizations";
import { usePatients } from "@/hooks/patients/usePatients";
import { reportsApi, sessionsApi } from "@/api/v2";
import { useGoogleDocs } from "@/hooks/useGoogleDocs";
import { useGoogleOAuth } from "@/hooks/useGoogleOAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RelatorioMedicoEditor } from "@/components/reports/RelatorioMedicoEditor";
import { RelatorioMedicoPreviewDialog } from "@/components/reports/RelatorioMedicoPreviewDialog";
import {
	RelatorioMedicoGoogleTemplateDialog,
	RelatorioMedicoTemplateDialog,
} from "@/components/reports/RelatorioMedicoDialogs";
import { RelatorioMedicoContent } from "@/components/reports/RelatorioMedicoContent";

const TEMPLATE_FIELD_OPTIONS = [
	{ id: "queixa_principal", label: "Queixa principal" },
	{ id: "historico_doencas_atuais", label: "Histórico de doenças atuais" },
	{ id: "medicamentos_em_uso", label: "Medicamentos em uso" },
	{ id: "alergias", label: "Alergias" },
	{ id: "cirurgias_previas", label: "Cirurgias prévias" },
	{ id: "inspecao_visual", label: "Inspeção visual" },
	{ id: "palpacao", label: "Palpação" },
	{ id: "goniometria", label: "Goniometria" },
	{ id: "forca_muscular", label: "Força muscular" },
	{ id: "reflexos", label: "Reflexos" },
	{ id: "sensibilidade", label: "Sensibilidade" },
	{ id: "teste_funcional", label: "Teste funcional" },
	{ id: "diagnostico_fisioterapeutico", label: "Diagnóstico fisioterapêutico" },
	{ id: "codigos_cid", label: "Códigos CID" },
	{ id: "objetivos", label: "Objetivos do tratamento" },
	{ id: "procedimentos", label: "Procedimentos" },
	{ id: "equipamentos_utilizados", label: "Equipamentos utilizados" },
	{ id: "frequencia", label: "Frequência" },
	{ id: "duracao_prevista", label: "Duração prevista" },
	{ id: "evolucoes", label: "Evoluções" },
	{ id: "resumo_tratamento", label: "Resumo do tratamento" },
	{ id: "conduta_sugerida", label: "Conduta sugerida" },
	{ id: "recomendacoes", label: "Recomendações" },
];

interface DadosPaciente {
	nome: string;
	cpf?: string;
	data_nascimento?: string;
	idade?: string;
	telefone?: string;
	email?: string;
	endereco?: string;
}

interface DadosProfissionalEmissor {
	nome: string;
	registro: string;
	uf_registro?: string;
	especialidade: string;
	email?: string;
	telefone?: string;
}

interface DadosProfissionalDestino {
	nome?: string;
	especialidade?: string;
	instituicao?: string;
	email?: string;
	telefone?: string;
}

interface HistoricoClinico {
	queixa_principal?: string;
	historico_doencas_atuais?: string;
	historico_familiar?: string;
	medicamentos_em_uso?: string;
	alergias?: string;
	cirurgias_previas?: string;
}

interface AvaliacaoFisioterapeutica {
	data_avaliacao?: string;
	inspecao_visual?: string;
	palpacao?: string;
	goniometria?: string;
	forca_muscular?: string;
	reflexos?: string;
	sensibilidade?: string;
	teste_funcional?: string;
	diagnostico_fisioterapeutico?: string;
	codigos_cid?: string[];
}

interface PlanoTratamento {
	objetivos?: string;
	procedimentos?: string[];
	frequencia?: string;
	duracao_prevista?: string;
	equipamentos_utilizados?: string[];
}

interface Evolucao {
	data: string;
	sessao: number;
	descricao: string;
	resposta_paciente?: string;
	ajustes_realizados?: string;
}

export interface RelatorioTemplate {
	id: string;
	nome: string;
	descricao: string;
	tipo_relatorio: RelatorioMedicoData["tipo_relatorio"];
	campos: string[];
	organization_id?: string | null;
	created_at: string;
	updated_at: string;
}

const BUILTIN_TEMPLATES: RelatorioTemplate[] = [
	{
		id: "builtin-avaliacao-inicial",
		nome: "Avaliação Inicial Completa",
		descricao: "Relatório completo de avaliação inicial para enviar ao médico",
		tipo_relatorio: "inicial",
		campos: [
			"queixa_principal",
			"historico_doencas_atuais",
			"medicamentos_em_uso",
			"alergias",
			"inspecao_visual",
			"palpacao",
			"goniometria",
			"forca_muscular",
			"teste_funcional",
			"diagnostico_fisioterapeutico",
			"codigos_cid",
			"objetivos",
			"procedimentos",
			"frequencia",
			"duracao_prevista",
		],
		organization_id: "__builtin__",
		created_at: "2024-01-01T00:00:00.000Z",
		updated_at: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "builtin-evolucao-mensal",
		nome: "Evolução Mensal",
		descricao:
			"Atualização mensal da evolução do paciente para o médico assistente",
		tipo_relatorio: "evolucao",
		campos: [
			"evolucoes",
			"resumo_tratamento",
			"conduta_sugerida",
			"recomendacoes",
		],
		organization_id: "__builtin__",
		created_at: "2024-01-01T00:00:00.000Z",
		updated_at: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "builtin-alta-medica",
		nome: "Relatório de Alta",
		descricao:
			"Documento de alta com resumo do tratamento e recomendações finais",
		tipo_relatorio: "alta",
		campos: ["resumo_tratamento", "conduta_sugerida", "recomendacoes"],
		organization_id: "__builtin__",
		created_at: "2024-01-01T00:00:00.000Z",
		updated_at: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "builtin-interconsulta",
		nome: "Solicitação de Interconsulta",
		descricao:
			"Pedido de avaliação com especialista com queixa e conduta sugerida",
		tipo_relatorio: "interconsulta",
		campos: [
			"queixa_principal",
			"historico_doencas_atuais",
			"conduta_sugerida",
		],
		organization_id: "__builtin__",
		created_at: "2024-01-01T00:00:00.000Z",
		updated_at: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "builtin-pos-operatorio",
		nome: "Pós-Operatório",
		descricao:
			"Acompanhamento de reabilitação pós-cirúrgica com foco em evolução",
		tipo_relatorio: "cirurgico",
		campos: [
			"inspecao_visual",
			"palpacao",
			"goniometria",
			"forca_muscular",
			"teste_funcional",
			"evolucoes",
			"resumo_tratamento",
			"conduta_sugerida",
		],
		organization_id: "__builtin__",
		created_at: "2024-01-01T00:00:00.000Z",
		updated_at: "2024-01-01T00:00:00.000Z",
	},
];

export interface RelatorioMedicoData {
	id: string;
	tipo_relatorio:
		| "inicial"
		| "evolucao"
		| "alta"
		| "interconsulta"
		| "cirurgico";
	paciente: DadosPaciente;
	profissional_emissor: DadosProfissionalEmissor;
	profissional_destino: DadosProfissionalDestino;
	clinica: {
		nome: string;
		cnpj?: string;
		endereco?: string;
		telefone?: string;
	};
	historico_clinico?: HistoricoClinico;
	avaliacao?: AvaliacaoFisioterapeutica;
	plano_tratamento?: PlanoTratamento;
	evolucoes?: Evolucao[];
	resumo_tratamento?: string;
	conduta_sugerida?: string;
	recomendacoes?: string;
	data_emissao: string;
	urgencia?: "baixa" | "media" | "alta";
	/** ID do paciente (para atualizar relatório feito/enviado no cadastro) */
	patientId?: string;
	/** Controle: relatório já foi feito / já foi enviado (persistido no paciente) */
	relatorio_feito?: boolean;
	relatorio_enviado?: boolean;
}

const loadRelatorioMedicoPdf = () =>
	import("./RelatorioMedicoPDF").then((module) => ({
		default: module.RelatorioMedicoPDF,
	}));

export default function RelatorioMedicoPage() {
	const { user } = useAuth();
	const { profile } = useUserProfile();
	const { currentOrganization: org } = useOrganizations();
	const organizationId = org?.id;
	const queryClient = useQueryClient();
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [previewRelatorio, setPreviewRelatorio] =
		useState<RelatorioMedicoData | null>(null);
	const [editingRelatorio, setEditingRelatorio] =
		useState<RelatorioMedicoData | null>(null);
	const [activeTab, setActiveTab] = useState<"criar" | "lista">("criar");
	const location = useLocation();
	const statePatientId = (location.state as { patientId?: string } | null)
		?.patientId;
	const [selectedPatientId, setSelectedPatientId] = useState<string>("");
	const buildEmptyTemplate = (): RelatorioTemplate => ({
		id: "",
		nome: "Novo modelo",
		descricao: "",
		tipo_relatorio: "inicial",
		campos: ["queixa_principal", "resumo_tratamento", "conduta_sugerida"],
		organization_id: org?.id ?? null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	});
	const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
	const [editingTemplate, setEditingTemplate] =
		useState<RelatorioTemplate | null>(null);
	const [templateForm, setTemplateForm] =
		useState<RelatorioTemplate>(buildEmptyTemplate);

	useEffect(() => {
		setTemplateForm((prev) => ({ ...prev, organization_id: org?.id ?? null }));
	}, [org?.id]);

	const { data: customTemplates = [], isLoading: isLoadingTemplates } =
		useQuery({
			queryKey: ["relatorio-medico-templates", org?.id],
			queryFn: async () => {
				const res = await reportsApi.medicalTemplates.list();
				return (res.data ?? []) as RelatorioTemplate[];
			},
		});

	const templates = [...BUILTIN_TEMPLATES, ...customTemplates];

	// Buscar relatórios salvos
	const { data: relatorios = [], isLoading } = useQuery({
		queryKey: ["relatorios-medicos", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await reportsApi.medical.list();
			return (res.data ?? []) as RelatorioMedicoData[];
		},
		enabled: !!organizationId,
	});

	const { data: pacientes = [] } = usePatients();
	const { generateReport, isGenerating, listTemplates } = useGoogleDocs();
	const { connect: connectGoogle, } = useGoogleOAuth();
	const [googleTemplates, setGoogleTemplates] = useState<any[]>([]);
	const [isGoogleTemplateDialogOpen, setIsGoogleTemplateDialogOpen] =
		useState(false);
	const [selectedReportForGoogle, setSelectedReportForGoogle] =
		useState<RelatorioMedicoData | null>(null);

	const handleGenerateGoogleDocs = async (relatorio: RelatorioMedicoData) => {
		try {
			setSelectedReportForGoogle(relatorio);
			const templates = await listTemplates();
			setGoogleTemplates(templates);
			setIsGoogleTemplateDialogOpen(true);
		} catch  {
			toast.error("Conecte sua conta Google primeiro");
			connectGoogle();
		}
	};

	const confirmGenerateGoogleDocs = async (templateId: string) => {
		if (!selectedReportForGoogle) return;

		generateReport(
			{
				templateId,
				patientName: selectedReportForGoogle.paciente.nome,
				data: {
					PACIENTE_NOME: selectedReportForGoogle.paciente.nome,
					PACIENTE_CPF: selectedReportForGoogle.paciente.cpf || "",
					QUEIXA_PRINCIPAL:
						selectedReportForGoogle.historico_clinico?.queixa_principal || "",
					DIAGNOSTICO:
						selectedReportForGoogle.avaliacao?.diagnostico_fisioterapeutico ||
						"",
					PLANO_TRATAMENTO:
						selectedReportForGoogle.plano_tratamento?.objetivos || "",
					DATA_EMISSAO: format(
						new Date(selectedReportForGoogle.data_emissao),
						"dd/MM/yyyy",
					),
					TERAPEUTA_NOME: selectedReportForGoogle.profissional_emissor.nome,
				},
			},
			{
				onSuccess: (data) => {
					if (data.webViewLink) {
						window.open(data.webViewLink, "_blank");
					}
					setIsGoogleTemplateDialogOpen(false);
				},
			},
		);
	};

	// Abrir relatório para o paciente quando vier do dashboard/evolução
	useEffect(() => {
		if (statePatientId && pacientes.length > 0) {
			setSelectedPatientId(statePatientId);
			criarRelatorioPaciente(statePatientId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [statePatientId, pacientes.length]);

	// Salvar relatório
	const saveRelatorio = useMutation({
		mutationFn: async (data: RelatorioMedicoData) => {
			if (!organizationId) throw new Error("Organização não identificada");
			if (data.id) {
				await reportsApi.medical.update(data.id, {
					...data,
					organization_id: organizationId,
				});
			} else {
				const { id: _id, ...rest } = data;
				const created = await reportsApi.medical.create({
					...rest,
					organization_id: organizationId,
				});
				(data as RelatorioMedicoData & { id: string }).id = created.data.id;
			}
			return data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: ["relatorios-medicos", organizationId],
			});
			if (data.patientId) {
				queryClient.invalidateQueries({ queryKey: ["patients"] });
				queryClient.invalidateQueries({
					queryKey: ["patient", data.patientId],
				});
			}
			toast.success("Relatório salvo com sucesso!");
			setIsEditorOpen(false);
			setEditingRelatorio(null);
		},
		onError: () => toast.error("Erro ao salvar relatório"),
	});

	const deleteRelatorio = useMutation({
		mutationFn: async (id: string) => {
			await reportsApi.medical.delete(id);
			return id;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["relatorios-medicos", organizationId],
			});
			toast.success("Relatório excluído");
		},
		onError: () => toast.error("Erro ao excluir relatório"),
	});

	const saveTemplateMutation = useMutation({
		mutationFn: async (template: RelatorioTemplate) => {
			const payload = {
				nome: template.nome,
				descricao: template.descricao,
				tipo_relatorio: template.tipo_relatorio,
				campos: template.campos,
				organization_id: template.organization_id ?? org?.id ?? null,
				created_at: template.created_at || new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			if (template.id && !template.id.startsWith("builtin-")) {
				const updated = await reportsApi.medicalTemplates.update(
					template.id,
					payload,
				);
				return updated.data as RelatorioTemplate;
			}

			const created = await reportsApi.medicalTemplates.create(payload);
			return created.data as RelatorioTemplate;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["relatorio-medico-templates", org?.id],
			});
			setTemplateDialogOpen(false);
			setEditingTemplate(null);
			toast.success("Modelo salvo");
		},
		onError: () => toast.error("Erro ao salvar modelo"),
	});

	const deleteTemplateMutation = useMutation({
		mutationFn: async (id: string) => {
			await reportsApi.medicalTemplates.delete(id);
			return id;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["relatorio-medico-templates", org?.id],
			});
			toast.success("Modelo removido");
		},
		onError: () => toast.error("Erro ao remover modelo"),
	});

	// Carregar dados do profissional
	const carregarDadosProfissional = async () => {
		if (!user) return { profile: null, org: null };
		return { profile, org };
	};

	// Criar relatório a partir de paciente
	const criarRelatorioPaciente = async (
		pacienteId: string,
		options?: { openEditor?: boolean },
	) => {
		const paciente = pacientes.find((p) => p.id === pacienteId);
		if (!paciente) return;

		const { profile, org } = await carregarDadosProfissional();

		// Buscar evoluções do paciente
		const sessionsRes = await sessionsApi.list({
			patientId: pacienteId,
			limit: 200,
		});
		const evolucoes = (sessionsRes.data ?? []).map((session, index) => ({
			data: session.record_date ?? session.created_at,
			sessao: session.session_number ?? index + 1,
			descricao:
				session.assessment ||
				session.plan ||
				session.objective ||
				session.subjective ||
				"",
		}));

		const doctorName = (paciente.referring_doctor_name ??
			paciente.referringDoctorName) as string | undefined;
		const doctorPhone = (paciente.referring_doctor_phone ??
			paciente.referringDoctorPhone) as string | undefined;

		const relatorio: RelatorioMedicoData = {
			id: "",
			tipo_relatorio: "inicial",
			paciente: {
				nome: (paciente.full_name ?? paciente.name) as string,
				cpf: (paciente.cpf ?? "") as string,
				data_nascimento: (paciente.birth_date ?? "") as string,
				telefone: ((paciente as Partial<Record<string, unknown>>).telefone ??
					(paciente as Partial<Record<string, unknown>>).phone ??
					"") as string,
				email: (paciente.email ?? "") as string,
			},
			profissional_emissor: {
				nome: profile?.full_name || "",
				registro: profile?.crefito || "",
				uf_registro: "",
				especialidade: "Fisioterapia",
				email: user?.email || "",
				telefone: profile?.phone || "",
			},
			profissional_destino:
				doctorName || doctorPhone
					? { nome: doctorName, telefone: doctorPhone }
					: {},
			clinica: {
				nome: org?.name || "",
				cnpj: org?.cnpj || "",
				endereco: org?.address || "",
				telefone: org?.phone || "",
			},
			evolucoes,
			data_emissao: new Date().toISOString(),
			urgencia: "baixa",
			patientId: pacienteId,
			relatorio_feito: (paciente.medical_report_done ??
				paciente.medicalReportDone) as boolean | undefined,
			relatorio_enviado: (paciente.medical_report_sent ??
				paciente.medicalReportSent) as boolean | undefined,
		};

		setEditingRelatorio(relatorio);
		if (options?.openEditor !== false) {
			setIsEditorOpen(true);
		}

		return relatorio;
	};

	const handlePatientSelect = (patientId: string) => {
		setSelectedPatientId(patientId);
		if (patientId) {
			criarRelatorioPaciente(patientId);
		}
	};

	const handleSave = () => {
		if (editingRelatorio) {
			saveRelatorio.mutate(editingRelatorio);
		}
	};

	const handleCancel = () => {
		setIsEditorOpen(false);
		setEditingRelatorio(null);
	};

	const templateIcon = (tipo: RelatorioMedicoData["tipo_relatorio"]) => {
		switch (tipo) {
			case "inicial":
				return <Activity className="h-6 w-6 text-blue-500" />;
			case "evolucao":
				return <TrendingUp className="h-6 w-6 text-green-500" />;
			case "alta":
				return <CheckCircle2 className="h-6 w-6 text-purple-500" />;
			case "interconsulta":
				return <Stethoscope className="h-6 w-6 text-orange-500" />;
			case "cirurgico":
				return <Bone className="h-6 w-6 text-red-500" />;
			default:
				return <FileText className="h-6 w-6 text-primary" />;
		}
	};

	const cloneRelatorio = (r: RelatorioMedicoData): RelatorioMedicoData => ({
		...r,
		paciente: { ...r.paciente },
		profissional_emissor: { ...r.profissional_emissor },
		profissional_destino: { ...r.profissional_destino },
		clinica: { ...r.clinica },
		historico_clinico: r.historico_clinico
			? { ...r.historico_clinico }
			: undefined,
		avaliacao: r.avaliacao
			? {
					...r.avaliacao,
					codigos_cid: r.avaliacao.codigos_cid
						? [...r.avaliacao.codigos_cid]
						: [],
				}
			: undefined,
		plano_tratamento: r.plano_tratamento
			? {
					...r.plano_tratamento,
					procedimentos: r.plano_tratamento.procedimentos
						? [...r.plano_tratamento.procedimentos]
						: [],
					equipamentos_utilizados: r.plano_tratamento.equipamentos_utilizados
						? [...r.plano_tratamento.equipamentos_utilizados]
						: [],
				}
			: undefined,
		evolucoes: r.evolucoes ? [...r.evolucoes] : undefined,
	});

	const ensureField = (draft: RelatorioMedicoData, field: string) => {
		switch (field) {
			case "queixa_principal":
			case "historico_doencas_atuais":
			case "medicamentos_em_uso":
			case "alergias":
			case "cirurgias_previas": {
				const historico = draft.historico_clinico
					? { ...draft.historico_clinico }
					: {};
				(historico as Record<string, unknown>)[field] =
					(historico as Record<string, unknown>)[field] ?? "";
				draft.historico_clinico = historico;
				break;
			}
			case "inspecao_visual":
			case "palpacao":
			case "goniometria":
			case "forca_muscular":
			case "reflexos":
			case "sensibilidade":
			case "teste_funcional":
			case "diagnostico_fisioterapeutico": {
				const avaliacao = draft.avaliacao ? { ...draft.avaliacao } : {};
				(avaliacao as Record<string, unknown>)[field] =
					(avaliacao as Record<string, unknown>)[field] ?? "";
				draft.avaliacao = avaliacao;
				break;
			}
			case "codigos_cid": {
				const avaliacao = draft.avaliacao ? { ...draft.avaliacao } : {};
				avaliacao.codigos_cid = avaliacao.codigos_cid ?? [];
				draft.avaliacao = avaliacao;
				break;
			}
			case "objetivos":
			case "frequencia":
			case "duracao_prevista": {
				const plano = draft.plano_tratamento
					? { ...draft.plano_tratamento }
					: {};
				(plano as Record<string, unknown>)[field] =
					(plano as Record<string, unknown>)[field] ?? "";
				draft.plano_tratamento = plano;
				break;
			}
			case "procedimentos":
			case "equipamentos_utilizados": {
				const plano = draft.plano_tratamento
					? { ...draft.plano_tratamento }
					: {};
				(plano as Record<string, unknown>)[field] =
					(plano as Record<string, unknown>)[field] ?? [];
				draft.plano_tratamento = plano;
				break;
			}
			case "evolucoes":
				draft.evolucoes = draft.evolucoes ?? [];
				break;
			case "resumo_tratamento":
				draft.resumo_tratamento = draft.resumo_tratamento ?? "";
				break;
			case "conduta_sugerida":
				draft.conduta_sugerida = draft.conduta_sugerida ?? "";
				break;
			case "recomendacoes":
				draft.recomendacoes = draft.recomendacoes ?? "";
				break;
			default:
				break;
		}
		return draft;
	};

	const applyTemplate = async (template: RelatorioTemplate) => {
		if (!selectedPatientId) {
			toast.error(
				'Selecione um paciente na aba "Criar" antes de usar um modelo',
			);
			setActiveTab("criar");
			return;
		}

		let base = editingRelatorio;
		if (!base) {
			base = await criarRelatorioPaciente(selectedPatientId, {
				openEditor: false,
			});
		}
		if (!base) return;

		let updated = cloneRelatorio(base);
		updated.tipo_relatorio = template.tipo_relatorio;
		template.campos.forEach((campo) => {
			updated = ensureField({ ...updated }, campo);
		});
		setEditingRelatorio(updated);
		setIsEditorOpen(true);
		setActiveTab("criar");
		toast.success(`Modelo "${template.nome}" aplicado`);
	};

	const startCreateTemplate = () => {
		setEditingTemplate(null);
		setTemplateForm(buildEmptyTemplate());
		setTemplateDialogOpen(true);
	};

	const startEditTemplate = (template: RelatorioTemplate) => {
		setEditingTemplate(template);
		setTemplateForm({ ...template });
		setTemplateDialogOpen(true);
	};

	const duplicateTemplate = (template: RelatorioTemplate) => {
		const clone: RelatorioTemplate = {
			...template,
			id: "",
			nome: `${template.nome} (cópia)`,
			organization_id: org?.id ?? template.organization_id ?? null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		saveTemplateMutation.mutate(clone);
	};

	const handleTemplateSubmit = () => {
		saveTemplateMutation.mutate(templateForm);
	};

	const toggleCampo = (campoId: string) => {
		setTemplateForm((prev) => {
			const exists = prev.campos.includes(campoId);
			const campos = exists
				? prev.campos.filter((c) => c !== campoId)
				: [...prev.campos, campoId];
			return { ...prev, campos };
		});
	};

	return (
		<>
			<RelatorioMedicoContent
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				pacientes={pacientes}
				selectedPatientId={selectedPatientId}
				handlePatientSelect={handlePatientSelect}
				templates={templates}
				isLoadingTemplates={isLoadingTemplates}
				templateFieldOptions={TEMPLATE_FIELD_OPTIONS}
				templateIcon={templateIcon}
				startCreateTemplate={startCreateTemplate}
				applyTemplate={applyTemplate}
				startEditTemplate={startEditTemplate}
				duplicateTemplate={duplicateTemplate}
				deleteTemplatePending={deleteTemplateMutation.isPending}
				onDeleteTemplate={(templateId) =>
					deleteTemplateMutation.mutate(templateId)
				}
				relatorios={relatorios}
				isLoading={isLoading}
				onPreviewRelatorio={setPreviewRelatorio}
				onEditRelatorio={(relatorio) => {
					setEditingRelatorio(relatorio);
					setIsEditorOpen(true);
				}}
				onDeleteRelatorio={(relatorioId) => deleteRelatorio.mutate(relatorioId)}
				deleteRelatorioPending={deleteRelatorio.isPending}
				onGenerateGoogleDocs={handleGenerateGoogleDocs}
				loadRelatorioMedicoPdf={loadRelatorioMedicoPdf}
			/>

				{/* Dialog Editor */}
				<Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
					<DialogContent className="max-w-4xl max-h-[90vw]">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<PenTool className="h-5 w-5" />
								{editingRelatorio?.paciente?.nome
									? `Relatório: ${editingRelatorio.paciente.nome}`
									: "Novo Relatório"}
							</DialogTitle>
							<DialogDescription>
								Edite as informações do relatório. As alterações serão salvas.
							</DialogDescription>
						</DialogHeader>

						{editingRelatorio && (
							<RelatorioMedicoEditor
								data={editingRelatorio}
								onChange={setEditingRelatorio}
								onSave={handleSave}
								onCancel={handleCancel}
							/>
						)}
					</DialogContent>
				</Dialog>

				<RelatorioMedicoPreviewDialog
					relatorio={previewRelatorio}
					onClose={() => setPreviewRelatorio(null)}
					onEdit={(relatorio) => {
						setEditingRelatorio(relatorio);
						setPreviewRelatorio(null);
						setIsEditorOpen(true);
					}}
					loadDocument={loadRelatorioMedicoPdf}
				/>

				<RelatorioMedicoTemplateDialog
					open={templateDialogOpen}
					onOpenChange={(open) => {
						setTemplateDialogOpen(open);
						if (!open) setEditingTemplate(null);
					}}
					editingTemplate={editingTemplate}
					templateForm={templateForm}
					setTemplateForm={setTemplateForm}
					toggleCampo={toggleCampo}
					handleSubmit={handleTemplateSubmit}
					isSaving={saveTemplateMutation.isPending}
					fieldOptions={TEMPLATE_FIELD_OPTIONS}
				/>

				<RelatorioMedicoGoogleTemplateDialog
					open={isGoogleTemplateDialogOpen}
					onOpenChange={setIsGoogleTemplateDialogOpen}
					templates={googleTemplates}
					onSelectTemplate={confirmGenerateGoogleDocs}
					isGenerating={isGenerating}
				/>
		</>
	);
}
