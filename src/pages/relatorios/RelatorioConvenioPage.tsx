import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	FileText,
	Plus,
	Download,
	Edit,
	Eye,
	CheckCircle2,
	Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useOrganizations } from "@/hooks/useOrganizations";
import { LazyPdfDownloadButton } from "@/components/pdf/LazyPdfDownloadButton";
import { Activity } from "lucide-react";
import {
	appointmentsApi,
	financialApi,
	reportsApi,
	patientsApi,
} from "@/api/v2";

interface DadosPaciente {
	nome: string;
	cpf?: string;
	data_nascimento?: string;
	telefone?: string;
	email?: string;
	endereco?: string;
	numero_convenio?: string;
	carteirinha?: string;
}

interface DadosProfissional {
	nome: string;
	cpf: string;
	rne?: string;
	registro_profissional?: string;
	uf_registro?: string;
	assinatura?: string;
	carimbo?: string;
}

interface DadosAtendimento {
	data: string;
	horario_inicio: string;
	horario_fim: string;
	tipo: "avaliacao" | "evolucao" | "alta" | "retorno";
	procedimentos: string[];
	cid?: string;
	codigos_tuss?: string[];
	numero_sessoes: number;
	sessao_atual: number;
}

export interface RelatorioConvenioData {
	id: string;
	patientId?: string;
	paciente: DadosPaciente;
	profissional: DadosProfissional;
	convenio: {
		nome: string;
		cnpj: string;
		ans: string;
	};
	clinica: {
		nome: string;
		cnpj: string;
		endereco: string;
		telefone: string;
	};
	atendimentos: DadosAtendimento[];
	observacoes?: string;
	evolucao?: string;
	prognostico?: string;
	conduta?: string;
	data_emissao: string;
}

const loadRelatorioConvenioPdf = () =>
	import("./RelatorioConvenioPDF").then((module) => ({
		default: module.RelatorioConvenioPDF,
	}));

// Componente de Editor do Relatório
function RelatorioEditor({
	data,
	onChange,
	onSave,
}: {
	data: RelatorioConvenioData;
	onChange: (data: RelatorioConvenioData) => void;
	onSave: () => void;
}) {
	return (
		<ScrollArea className="h-[70vh] pr-4">
			<div className="space-y-6">
				{/* Dados do Paciente */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Dados do Paciente</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Nome Completo *</Label>
								<Input
									value={data.paciente.nome}
									onChange={(e) =>
										onChange({
											...data,
											paciente: { ...data.paciente, nome: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>CPF</Label>
								<Input
									placeholder="000.000.000-00"
									value={data.paciente.cpf}
									onChange={(e) =>
										onChange({
											...data,
											paciente: { ...data.paciente, cpf: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Data de Nascimento</Label>
								<Input
									type="date"
									value={data.paciente.data_nascimento || ""}
									onChange={(e) =>
										onChange({
											...data,
											paciente: {
												...data.paciente,
												data_nascimento: e.target.value,
											},
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Número da Carteira do Convênio</Label>
								<Input
									placeholder="Número da carteirinha"
									value={data.paciente.numero_convenio || ""}
									onChange={(e) =>
										onChange({
											...data,
											paciente: {
												...data.paciente,
												numero_convenio: e.target.value,
											},
										})
									}
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Telefone</Label>
								<Input
									placeholder="(00) 00000-0000"
									value={data.paciente.telefone || ""}
									onChange={(e) =>
										onChange({
											...data,
											paciente: { ...data.paciente, telefone: e.target.value },
										})
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Email</Label>
								<Input
									type="email"
									placeholder="paciente@email.com"
									value={data.paciente.email || ""}
									onChange={(e) =>
										onChange({
											...data,
											paciente: { ...data.paciente, email: e.target.value },
										})
									}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Informações Clínicas */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Informações Clínicas</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Prognóstico</Label>
							<Textarea
								placeholder="Descreva o prognóstico do paciente..."
								value={data.prognostico || ""}
								onChange={(e) =>
									onChange({ ...data, prognostico: e.target.value })
								}
								rows={2}
							/>
						</div>
						<div className="space-y-2">
							<Label>Evolução do Paciente</Label>
							<Textarea
								placeholder="Descreva a evolução do tratamento..."
								value={data.evolucao || ""}
								onChange={(e) =>
									onChange({ ...data, evolucao: e.target.value })
								}
								rows={3}
							/>
						</div>
						<div className="space-y-2">
							<Label>Conduta Terapêutica</Label>
							<Textarea
								placeholder="Descreva a conduta adotada..."
								value={data.conduta || ""}
								onChange={(e) => onChange({ ...data, conduta: e.target.value })}
								rows={3}
							/>
						</div>
						<div className="space-y-2">
							<Label>Observações Adicionais</Label>
							<Textarea
								placeholder="Observações complementares..."
								value={data.observacoes || ""}
								onChange={(e) =>
									onChange({ ...data, observacoes: e.target.value })
								}
								rows={2}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Atendimentos */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base flex items-center justify-between">
							<span>Atendimentos Realizados</span>
							<Badge>{data.atendimentos.length} sessões</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{data.atendimentos.map((atendimento, index) => (
							<div key={index} className="border rounded-lg p-4 space-y-3">
								<div className="flex items-center justify-between">
									<Badge>Sessão {index + 1}</Badge>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											const newAtendimentos = data.atendimentos.filter(
												(_, i) => i !== index,
											);
											onChange({ ...data, atendimentos: newAtendimentos });
										}}
									>
										Remover
									</Button>
								</div>
								<div className="grid grid-cols-3 gap-4">
									<div className="space-y-2">
										<Label>Data</Label>
										<Input
											type="date"
											value={atendimento.data}
											onChange={(e) => {
												const newAtendimentos = [...data.atendimentos];
												newAtendimentos[index] = {
													...atendimento,
													data: e.target.value,
												};
												onChange({ ...data, atendimentos: newAtendimentos });
											}}
										/>
									</div>
									<div className="space-y-2">
										<Label>Horário Início</Label>
										<Input
											type="time"
											value={atendimento.horario_inicio}
											onChange={(e) => {
												const newAtendimentos = [...data.atendimentos];
												newAtendimentos[index] = {
													...atendimento,
													horario_inicio: e.target.value,
												};
												onChange({ ...data, atendimentos: newAtendimentos });
											}}
										/>
									</div>
									<div className="space-y-2">
										<Label>Horário Fim</Label>
										<Input
											type="time"
											value={atendimento.horario_fim}
											onChange={(e) => {
												const newAtendimentos = [...data.atendimentos];
												newAtendimentos[index] = {
													...atendimento,
													horario_fim: e.target.value,
												};
												onChange({ ...data, atendimentos: newAtendimentos });
											}}
										/>
									</div>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Tipo</Label>
										<Select
											value={atendimento.tipo}
											onValueChange={(v) => {
												const newAtendimentos = [...data.atendimentos];
												newAtendimentos[index] = {
													...atendimento,
													tipo: v as
														| "avaliacao"
														| "evolucao"
														| "alta"
														| "retorno",
												};
												onChange({ ...data, atendimentos: newAtendimentos });
											}}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="avaliacao">Avaliação</SelectItem>
												<SelectItem value="evolucao">Evolução</SelectItem>
												<SelectItem value="alta">Alta</SelectItem>
												<SelectItem value="retorno">Retorno</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>CID</Label>
										<Input
											placeholder="Ex: M54.5"
											value={atendimento.cid || ""}
											onChange={(e) => {
												const newAtendimentos = [...data.atendimentos];
												newAtendimentos[index] = {
													...atendimento,
													cid: e.target.value,
												};
												onChange({ ...data, atendimentos: newAtendimentos });
											}}
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label>
										Procedimentos Realizados (separados por vírgula)
									</Label>
									<Textarea
										placeholder="Ex: Fisioterapia manual, Cinesioterapia, RPG"
										value={atendimento.procedimentos.join(", ")}
										onChange={(e) => {
											const newAtendimentos = [...data.atendimentos];
											newAtendimentos[index] = {
												...atendimento,
												procedimentos: e.target.value
													.split(",")
													.map((s) => s.trim())
													.filter(Boolean),
											};
											onChange({ ...data, atendimentos: newAtendimentos });
										}}
										rows={2}
									/>
								</div>
								<div className="space-y-2">
									<Label>Códigos TUSS (separados por vírgula)</Label>
									<Input
										placeholder="Ex: 0102003, 0201004"
										value={atendimento.codigos_tuss?.join(", ") || ""}
										onChange={(e) => {
											const newAtendimentos = [...data.atendimentos];
											newAtendimentos[index] = {
												...atendimento,
												codigos_tuss: e.target.value
													.split(",")
													.map((s) => s.trim())
													.filter(Boolean),
											};
											onChange({ ...data, atendimentos: newAtendimentos });
										}}
									/>
								</div>
							</div>
						))}
						<Button
							variant="outline"
							className="w-full"
							onClick={() => {
								onChange({
									...data,
									atendimentos: [
										...data.atendimentos,
										{
											data: new Date().toISOString().split("T")[0],
											horario_inicio: "",
											horario_fim: "",
											tipo: "evolucao",
											procedimentos: [],
											cid: "",
											codigos_tuss: [],
											sessao_atual: data.atendimentos.length + 1,
											numero_sessoes: 0,
										},
									],
								});
							}}
						>
							<Plus className="h-4 w-4 mr-2" />
							Adicionar Sessão
						</Button>
					</CardContent>
				</Card>

				{/* Botões de Ação */}
				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={onCancel}>
						Cancelar
					</Button>
					<Button onClick={onSave}>
						<Save className="h-4 w-4 mr-2" />
						Salvar Alterações
					</Button>
				</div>
			</div>
		</ScrollArea>
	);
}

export default function RelatorioConvenioPage() {
	const { user } = useAuth();
	const { profile } = useUserProfile();
	const organizationId = profile?.organization_id;
	const { currentOrganization: orgData } = useOrganizations();
	const queryClient = useQueryClient();
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [previewRelatorio, setPreviewRelatorio] =
		useState<RelatorioConvenioData | null>(null);
	const [editingRelatorio, setEditingRelatorio] =
		useState<RelatorioConvenioData | null>(null);
	const [activeTab, setActiveTab] = useState<"criar" | "lista" | "modelos">(
		"criar",
	);

	// Buscar relatórios salvos
	const { data: relatorios = [], isLoading } = useQuery({
		queryKey: ["relatorios-convenio", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await reportsApi.convenio.list();
			return (res.data ?? []) as RelatorioConvenioData[];
		},
		enabled: !!organizationId,
	});

	// Buscar pacientes
	const { data: pacientes = [] } = useQuery({
		queryKey: ["pacientes-select", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await patientsApi.list({ limit: 200, sortBy: "name_asc" });
			return (res.data ?? []) as Array<{
				id: string;
				full_name: string;
				cpf?: string;
				birth_date?: string;
				phone?: string;
				email?: string;
			}>;
		},
		enabled: !!organizationId,
	});

	// Buscar convênios
	const { data: convenios = [] } = useQuery({
		queryKey: ["convenios-select", organizationId],
		queryFn: async () => {
			if (!organizationId) return [];
			const res = await financialApi.convenios.list();
			return (res.data ?? []) as Array<{
				id: string;
				nome: string;
				cnpj?: string;
				codigo_ans?: string;
			}>;
		},
		enabled: !!organizationId,
	});

	// Salvar relatório
	const saveRelatorio = useMutation({
		mutationFn: async (data: RelatorioConvenioData) => {
			if (!organizationId) throw new Error("Organização não identificada");
			if (data.id) {
				await reportsApi.convenio.update(data.id, {
					...data,
					organization_id: organizationId,
				});
				return data;
			} else {
				const { id: _id, ...rest } = data;
				const created = await reportsApi.convenio.create({
					...rest,
					organization_id: organizationId,
				});
				return created.data as RelatorioConvenioData;
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["relatorios-convenio", organizationId],
			});
			toast.success("Relatório salvo com sucesso!");
			setIsEditorOpen(false);
			setEditingRelatorio(null);
		},
		onError: () => toast.error("Erro ao salvar relatório"),
	});

	// Criar relatório a partir de atendimentos
	const criarRelatorio = async (pacienteId: string) => {
		if (!organizationId) return;
		// Buscar atendimentos do paciente
		const oneMonthAgo = new Date();
		oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

		const appointmentsRes = await appointmentsApi.list({
			patientId: pacienteId,
			dateFrom: oneMonthAgo.toISOString().slice(0, 10),
			dateTo: new Date().toISOString().slice(0, 10),
			limit: 200,
		});
		const atendimentos = appointmentsRes.data ?? [];

		if (!atendimentos || atendimentos.length === 0) {
			toast.error("Nenhum atendimento encontrado no último mês.");
			return;
		}

		// Buscar dados do paciente
		const paciente = pacientes.find((p) => p.id === pacienteId);
		if (!paciente) return;

		// Buscar dados do profissional
		if (!user) return;
		const profissional = profile;

		// Buscar dados da clínica
		const org = orgData;

		// Buscar convênio do paciente
		const convenio =
			(
				convenios as Array<{
					id: string;
					nome: string;
					cnpj?: string;
					codigo_ans?: string;
				}>
			)[0] ?? null;

		const novoRelatorio: RelatorioConvenioData = {
			id: "",
			paciente: {
				nome: paciente.full_name,
				cpf: paciente.cpf || "",
				data_nascimento: paciente.birth_date || "",
				telefone: paciente.phone || "",
				email: paciente.email || "",
				numero_convenio: "",
			},
			profissional: {
				nome: profissional?.full_name || "",
				cpf: profissional?.cpf || "",
				registro_profissional: profissional?.crefito || "",
				uf_registro: "",
			},
			convenio: {
				nome: convenio?.nome || "Particular",
				cnpj: convenio?.cnpj || "",
				ans:
					(convenio as { codigo_ans?: string; ans?: string } | null)
						?.codigo_ans ||
					(convenio as { ans?: string } | null)?.ans ||
					"",
			},
			clinica: {
				nome: org?.name || "",
				cnpj: org?.cnpj || "",
				endereco: org?.address || "",
				telefone: org?.phone || "",
			},
			atendimentos: atendimentos.map((att) => ({
				data: att.date,
				horario_inicio: String(att.start_time || "").slice(0, 5),
				horario_fim: String(att.end_time || "").slice(0, 5),
				tipo: att.status === "completed" ? "evolucao" : "retorno",
				procedimentos: att.notes ? [att.notes] : [],
				cid: "",
				codigos_tuss: [],
				numero_sessoes: atendimentos.length,
				sessao_atual: 0,
			})),
			patientId: pacienteId,
			evolucao: "",
			data_emissao: new Date().toISOString(),
		};

		setEditingRelatorio(novoRelatorio);
		setIsEditorOpen(true);
	};

	const handleSave = () => {
		if (editingRelatorio) {
			saveRelatorio.mutate(editingRelatorio);
		}
	};

	return (
		<MainLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold flex items-center gap-2">
							<FileText className="h-8 w-8 text-primary" />
							Relatório para Convênios
						</h1>
						<p className="text-muted-foreground mt-1">
							Gere relatórios de atendimento fisioterapêutico para reembolso
						</p>
					</div>
				</div>

				<Tabs
					value={activeTab}
					onValueChange={(v) =>
						setActiveTab(v as "criar" | "lista" | "modelos")
					}
				>
					<TabsList>
						<TabsTrigger value="criar">Criar Relatório</TabsTrigger>
						<TabsTrigger value="lista">Relatórios Salvos</TabsTrigger>
						<TabsTrigger value="modelos">Modelos Prontos</TabsTrigger>
					</TabsList>

					<TabsContent value="criar" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Selecione o Paciente</CardTitle>
								<CardDescription>
									O relatório será gerado automaticamente com base nos
									atendimentos do último mês
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>Paciente *</Label>
										<Select onValueChange={(v) => criarRelatorio(v)}>
											<SelectTrigger>
												<SelectValue placeholder="Selecione um paciente" />
											</SelectTrigger>
											<SelectContent>
												{pacientes.map((paciente) => (
													<SelectItem key={paciente.id} value={paciente.id}>
														{paciente.full_name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Modelos de Relatório</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<Card
										className="cursor-pointer hover:shadow-md transition-shadow"
										onClick={() => toast.info("Selecione um paciente primeiro")}
									>
										<CardContent className="pt-4">
											<FileText className="h-10 w-10 text-primary mb-2" />
											<h3 className="font-semibold">Relatório Padrão TISS</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Relatório completo seguindo padrão TUSS para reembolso
											</p>
										</CardContent>
									</Card>
									<Card
										className="cursor-pointer hover:shadow-md transition-shadow"
										onClick={() => toast.info("Selecione um paciente primeiro")}
									>
										<CardContent className="pt-4">
											<Activity className="h-10 w-10 text-green-500 mb-2" />
											<h3 className="font-semibold">Relatório de Evolução</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Foco na evolução clínica do paciente
											</p>
										</CardContent>
									</Card>
									<Card
										className="cursor-pointer hover:shadow-md transition-shadow"
										onClick={() => toast.info("Selecione um paciente primeiro")}
									>
										<CardContent className="pt-4">
											<CheckCircle2 className="h-10 w-10 text-blue-500 mb-2" />
											<h3 className="font-semibold">Relatório de Alta</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Documento para encerramento do tratamento
											</p>
										</CardContent>
									</Card>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="lista" className="space-y-4">
						<Card>
							<CardContent className="pt-4">
								{isLoading ? (
									<div className="text-center py-8 text-muted-foreground">
										Carregando...
									</div>
								) : !relatorios.length ? (
									<div className="text-center py-12 text-muted-foreground">
										<FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
										<p>Nenhum relatório salvo ainda.</p>
									</div>
								) : (
									<div className="space-y-2">
										{relatorios.map((relatorio) => (
											<div
												key={relatorio.id}
												className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5"
											>
												<div className="flex-1">
													<p className="font-semibold">
														{relatorio.paciente?.nome}
													</p>
													<p className="text-sm text-muted-foreground">
														{format(
															new Date(relatorio.data_emissao),
															"dd/MM/yyyy 'às' HH:mm",
															{ locale: ptBR },
														)}
													</p>
													<div className="flex items-center gap-2 mt-1">
														<Badge>{relatorio.convenio?.nome}</Badge>
														<Badge variant="outline">
															{relatorio.atendimentos?.length} sessões
														</Badge>
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setPreviewRelatorio(relatorio)}
													>
														<Eye className="h-4 w-4 mr-1" />
														Visualizar
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															setEditingRelatorio(relatorio);
															setIsEditorOpen(true);
														}}
													>
														<Edit className="h-4 w-4 mr-1" />
														Editar
													</Button>
													<LazyPdfDownloadButton
														loadDocument={loadRelatorioConvenioPdf}
														documentProps={{ data: relatorio }}
														fileName={`relatorio-${relatorio.paciente?.nome?.replace(/\s+/g, "-")}-${format(new Date(relatorio.data_emissao), "dd-MM-yyyy")}.pdf`}
														label="PDF"
														icon={<Download className="mr-1 h-4 w-4" />}
														buttonProps={{ size: "sm" }}
													/>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="modelos" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Modelos de Relatório Disponíveis</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Card className="border-2 border-primary/20">
										<CardHeader>
											<CardTitle className="text-base">
												Relatório TISS Completo
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground mb-4">
												Relatório completo seguindo o padrão TUSS/TISS da ANS.
												Inclui todos os dados necessários para reembolso junto a
												convênios.
											</p>
											<div className="text-xs text-muted-foreground space-y-1">
												<p>✅ Dados do paciente e profissional</p>
												<p>✅ Lista completa de atendimentos</p>
												<p>✅ Códigos TUSS e CID</p>
												<p>✅ Prognóstico e evolução</p>
												<p>✅ Termo de responsabilidade</p>
											</div>
										</CardContent>
									</Card>

									<Card className="border-2 border-green-500/20">
										<CardHeader>
											<CardTitle className="text-base">
												Relatório de Alta
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground mb-4">
												Documento específico para encerramento de tratamento,
												incluindo resumo de todas as sessões realizadas e
												evolução final.
											</p>
											<div className="text-xs text-muted-foreground space-y-1">
												<p>✅ Resumo do tratamento</p>
												<p>✅ Data de início e fim</p>
												<p>✅ Evolução final do paciente</p>
												<p>✅ Condutas adotadas</p>
												<p>✅ Recomendações</p>
											</div>
										</CardContent>
									</Card>

									<Card className="border-2 border-blue-500/20">
										<CardHeader>
											<CardTitle className="text-base">
												Relatório de Evolução Mensal
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground mb-4">
												Relatório detalhado da evolução do paciente em um
												período, ideal para acompanhamento contínuo.
											</p>
											<div className="text-xs text-muted-foreground space-y-1">
												<p>✅ Avaliações realizadas</p>
												<p>✅ Progresso semanal</p>
												<p>✅ Gráfico de evolução</p>
												<p>✅ Metas alcançadas</p>
											</div>
										</CardContent>
									</Card>

									<Card className="border-2 border-purple-500/20">
										<CardHeader>
											<CardTitle className="text-base">
												Relatório para Especialista
											</CardTitle>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground mb-4">
												Relatório técnico detalhado para ser enviado a médicos
												especialistas, incluindo histórico completo e
												avaliações.
											</p>
											<div className="text-xs text-muted-foreground space-y-1">
												<p>✅ Histórico completo</p>
												<p>✅ Avaliações posturais</p>
												<p>✅ Testes funcionais</p>
												<p>✅ Exames realizados</p>
											</div>
										</CardContent>
									</Card>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Dialog Editor */}
				<Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
					<DialogContent className="max-w-4xl max-h-[90vh]">
						<DialogHeader>
							<DialogTitle>
								{editingRelatorio?.paciente?.nome
									? `Relatório: ${editingRelatorio.paciente.nome}`
									: "Novo Relatório"}
							</DialogTitle>
							<DialogDescription>
								Edite as informações do relatório. As alterações serão salvas.
							</DialogDescription>
						</DialogHeader>

						{editingRelatorio && (
							<RelatorioEditor
								data={editingRelatorio}
								onChange={setEditingRelatorio}
								onSave={handleSave}
								onCancel={() => {
									setIsEditorOpen(false);
									setEditingRelatorio(null);
								}}
							/>
						)}
					</DialogContent>
				</Dialog>

				{/* Dialog Preview */}
				{previewRelatorio && (
					<Dialog
						open={!!previewRelatorio}
						onOpenChange={() => setPreviewRelatorio(null)}
					>
						<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>Visualização do Relatório</DialogTitle>
							</DialogHeader>
							<div className="space-y-4">
								<div className="bg-gray-50 p-4 rounded-lg">
									<pre className="text-xs text-gray-700 whitespace-pre-wrap">
										{JSON.stringify(previewRelatorio, null, 2)}
									</pre>
								</div>
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										onClick={() => {
											setEditingRelatorio(previewRelatorio);
											setPreviewRelatorio(null);
											setIsEditorOpen(true);
										}}
									>
										<Edit className="h-4 w-4 mr-2" />
										Editar
									</Button>
									<LazyPdfDownloadButton
										loadDocument={loadRelatorioConvenioPdf}
										documentProps={{ data: previewRelatorio }}
										fileName={`relatorio-${previewRelatorio.paciente?.nome?.replace(/\s+/g, "-")}-${format(new Date(previewRelatorio.data_emissao), "dd-MM-yyyy")}.pdf`}
										label="Baixar PDF"
										icon={<Download className="mr-2 h-4 w-4" />}
									/>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>
		</MainLayout>
	);
}

export { RelatorioEditor };
