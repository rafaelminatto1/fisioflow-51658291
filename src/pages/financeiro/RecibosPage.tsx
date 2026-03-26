import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	CustomModal,
	CustomModalHeader,
	CustomModalTitle,
	CustomModalBody,
	CustomModalFooter,
} from "@/components/ui/custom-modal";
import {
	FileText,
	Plus,
	Search,
	Eye,
	Settings,
	Loader2,
	BadgeCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	ReciboPreview,
	ReciboPDF,
	ReciboData,
} from "@/components/financial/ReciboPDF";
import { ReceiptOCR } from "@/components/financial/ReceiptOCR";
import {
	useRecibos,
	useCreateRecibo,
	valorPorExtenso,
} from "@/hooks/useRecibos";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi, profileApi } from "@/api/v2";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";

interface PatientSelect {
	id: string;
	full_name: string;
	cpf?: string;
}

interface OrganizationData {
	name?: string;
	address?: string;
	logo_url?: string;
}

export function RecibosContent() {
	const { user } = useAuth();
	const isMobile = useIsMobile();
	const { currentOrganization: orgData } = useOrganizations();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [previewRecibo, setPreviewRecibo] = useState<ReciboData | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTab, setActiveTab] = useState<"lista" | "criar" | "config">(
		"lista",
	);

	const [formData, setFormData] = useState({
		patient_id: "",
		valor: "",
		referente: "",
		cpf_cnpj_pagador: "",
		usar_dados_clinica: true,
		card_last_digits: "",
		is_first_payment: false,
		package_sessions: "10",
		is_package: false,
	});

	const { data: recibos = [], isLoading } = useRecibos();
	const createRecibo = useCreateRecibo();

	const handleOCRExtracted = (data: {
		valor: number;
		nome?: string;
		cardLastDigits?: string;
		isFirstPayment?: boolean;
		patientId?: string;
	}) => {
		const isHighValue = data.valor >= 300;

		setFormData((prev) => ({
			...prev,
			valor: String(data.valor),
			card_last_digits: data.cardLastDigits || "",
			is_first_payment: data.isFirstPayment || false,
			patient_id: data.patientId || prev.patient_id,
			is_package: isHighValue,
			referente: data.nome ? `Pagamento - ${data.nome}` : prev.referente,
		}));

		if (data.nome && !data.patientId) {
			const match = pacientes.find((p) =>
				p.full_name.toLowerCase().includes(data.nome!.toLowerCase()),
			);
			if (match) {
				setFormData((prev) => ({ ...prev, patient_id: match.id }));
			}
		}

		if (isHighValue) {
			toast("Valor de pacote detectado!", {
				description: "Deseja registrar como um pacote de 5 ou 10 sessões?",
				action: {
					label: "Ver Detalhes",
					onClick: () => {},
				},
			});
		}
	};

	// Buscar configurações da clínica
	const { data: clinicaConfig } = useQuery({
		queryKey: ["clinica-config", user?.uid],
		queryFn: async () => {
			if (!user) return null;
			const res = await profileApi.me();
			return { profile: res?.data ?? null, org: orgData };
		},
		enabled: !!user,
	});

	// Buscar pacientes para seleção
	const { data: pacientes = [] } = useQuery({
		queryKey: ["pacientes-select"],
		queryFn: async () => {
			const res = await patientsApi.list({ limit: 500, sortBy: "name_asc" });
			return (res?.data ?? []).map((p) => ({
				id: p.id,
				full_name: p.name || p.full_name || "Paciente",
				cpf: p.cpf,
			}));
		},
	});

	const filteredRecibos = recibos.filter(
		(r) =>
			r.numero_recibo.toString().includes(searchTerm) ||
			(r.referente &&
				r.referente.toLowerCase().includes(searchTerm.toLowerCase())),
	);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();

		const valorNumerico = parseFloat(formData.valor);
		if (isNaN(valorNumerico)) return;

		// Buscar dados do paciente se selecionado
		let pagadorNome = "";
		let pagadorCpf = formData.cpf_cnpj_pagador;

		if (formData.patient_id) {
			const paciente = pacientes.find((p) => p.id === formData.patient_id);
			if (paciente) {
				pagadorNome = paciente.full_name;
				if (!pagadorCpf) pagadorCpf = paciente.cpf;
			}
		}

		const created = await createRecibo.mutateAsync({
			patient_id: formData.patient_id || null,
			valor: valorNumerico,
			valor_extenso: valorPorExtenso(valorNumerico),
			referente: formData.referente,
			data_emissao: new Date().toISOString(),
			emitido_por: clinicaConfig?.profile?.full_name || "Sistema",
			cpf_cnpj_emitente: clinicaConfig?.profile?.cpf_cnpj,
			assinado: true,
		});

		// Salvar mapeamento de cartão para automação futura
		if (formData.card_last_digits && formData.patient_id) {
			try {
				await fetch("/api/financial/card-mapping", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						patientId: formData.patient_id,
						cardLastDigits: formData.card_last_digits,
					}),
				});
			} catch (e) {
				console.error("Failed to save card mapping:", e);
			}
		}

		const novoRecibo: ReciboData = {
			numero: created.numero_recibo,
			valor: created.valor,
			valor_extenso: created.valor_extenso ?? valorPorExtenso(valorNumerico),
			referente: created.referente ?? formData.referente,
			dataEmissao: created.data_emissao,
			emitente: {
				nome: formData.usar_dados_clinica
					? clinicaConfig?.org?.name ||
						clinicaConfig?.profile?.full_name ||
						"Profissional de Saúde"
					: clinicaConfig?.profile?.full_name || "Profissional",
				cpfCnpj: created.cpf_cnpj_emitente ?? clinicaConfig?.profile?.cpf_cnpj,
				telefone: clinicaConfig?.profile?.phone,
				email: clinicaConfig?.profile?.email,
				endereco: (clinicaConfig?.org as OrganizationData | undefined)?.address,
			},
			pagador: pagadorNome
				? {
						nome: pagadorNome,
						cpfCnpj: pagadorCpf,
					}
				: undefined,
			assinado: created.assinado,
			logoUrl: (clinicaConfig?.org as OrganizationData | undefined)?.logo_url,
		};

		// Mostrar preview
		setPreviewRecibo(novoRecibo as ReciboData);
		setIsDialogOpen(false);
		setFormData({
			patient_id: "",
			valor: "",
			referente: "",
			cpf_cnpj_pagador: "",
			usar_dados_clinica: true,
		});
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
						<FileText className="h-6 w-6 text-primary" />
						Emissão de Recibos
					</h2>
					<p className="text-muted-foreground mt-1">
						Gere comprovantes profissionais para seus pacientes
					</p>
				</div>
				<Button
					onClick={() => {
						setActiveTab("criar");
						setIsDialogOpen(true);
					}}
					className="rounded-xl shadow-lg gap-2"
				>
					<Plus className="h-4 w-4" />
					Novo Recibo
				</Button>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "lista" | "criar" | "config")}
			>
				<TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
					<TabsTrigger
						value="lista"
						className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
					>
						Histórico
					</TabsTrigger>
					<TabsTrigger
						value="criar"
						className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
					>
						Novo Recibo
					</TabsTrigger>
					<TabsTrigger
						value="config"
						className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider"
					>
						Configurar
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista" className="space-y-4 mt-4">
					<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
						<CardContent className="p-4">
							<div className="relative">
								<Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
								<Input
									placeholder="Buscar recibos..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 rounded-xl border-none bg-slate-50 dark:bg-slate-800 h-10 font-medium"
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
						<CardContent className="p-0">
							{isLoading ? (
								<div className="flex items-center justify-center py-20">
									<Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
								</div>
							) : filteredRecibos.length === 0 ? (
								<div className="text-center py-20 text-muted-foreground">
									<FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
									<p className="font-bold text-xs uppercase tracking-widest">
										Nenhum registro
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
											<TableRow className="border-none">
												<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
													Nº Recibo
												</TableHead>
												<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
													Emissão
												</TableHead>
												<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
													Referência
												</TableHead>
												<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
													Valor
												</TableHead>
												<TableHead className="px-6 py-4 text-right font-black text-[10px] uppercase tracking-widest">
													Ações
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredRecibos.map((recibo) => {
												const reciboData: ReciboData = {
													numero: recibo.numero_recibo,
													valor: recibo.valor,
													referente: recibo.referente,
													dataEmissao: recibo.data_emissao,
													emitente: {
														nome: recibo.emitido_por,
														cpfCnpj: recibo.cpf_cnpj_emitente || undefined,
													},
													assinado: recibo.assinado,
												};
												return (
													<TableRow
														key={recibo.id}
														className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 border-slate-50 dark:border-slate-800/50"
													>
														<TableCell className="px-6 py-4">
															<Badge
																variant="outline"
																className="font-mono text-xs rounded-lg"
															>
																#
																{recibo.numero_recibo
																	.toString()
																	.padStart(6, "0")}
															</Badge>
														</TableCell>
														<TableCell className="px-6 py-4 text-xs font-medium text-slate-500">
															{format(
																new Date(recibo.data_emissao),
																"dd/MM/yyyy",
																{ locale: ptBR },
															)}
														</TableCell>
														<TableCell className="px-6 py-4 max-w-xs truncate font-bold text-slate-700 dark:text-slate-300">
															{recibo.referente}
														</TableCell>
														<TableCell className="px-6 py-4 font-black text-slate-900 dark:text-white">
															R${" "}
															{recibo.valor.toLocaleString("pt-BR", {
																minimumFractionDigits: 2,
															})}
														</TableCell>
														<TableCell className="px-6 py-4 text-right">
															<div className="flex items-center justify-end gap-1">
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => setPreviewRecibo(reciboData)}
																	className="h-8 rounded-lg text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-wider"
																>
																	<Eye className="h-3.5 w-3.5 mr-1.5" />
																	Ver
																</Button>
																<ReciboPDF
																	data={reciboData}
																	fileName={`recibo-${recibo.numero_recibo}`}
																/>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="criar" className="mt-4">
					<Card className="max-w-2xl mx-auto rounded-2xl border-none shadow-premium-sm bg-white dark:bg-slate-900 overflow-hidden">
						<CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
							<CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
								<Plus className="h-5 w-5 text-primary" />
								Emitir Novo Recibo
							</CardTitle>
						</CardHeader>
						<CardContent className="p-8">
							<div className="mb-8">
								<ReceiptOCR onDataExtracted={handleOCRExtracted} />
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								{formData.card_last_digits && (
									<div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3 animate-in fade-in zoom-in duration-500">
										<div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
											<Plus className="h-5 w-5 text-amber-600" />
										</div>
										<div className="flex-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
												Novo Cartão: **** {formData.card_last_digits}
											</p>
											<p className="text-xs font-bold text-amber-600/80">
												Vincule a um paciente para automatizar o próximo
												faturamento.
											</p>
										</div>
									</div>
								)}

								{(formData.is_first_payment ||
									(formData.valor && Number(formData.valor) > 0)) && (
									<div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
										<div className="flex items-center justify-between mb-2">
											<h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
												Classificação Inteligente
											</h4>
											{formData.is_first_payment && (
												<Badge className="bg-purple-500 text-white border-none text-[9px] uppercase font-black">
													Primeiro Pagamento
												</Badge>
											)}
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label className="text-[9px] font-black uppercase text-slate-400">
													Tipo de Atendimento
												</Label>
												<Select
													onValueChange={(v) => {
														const patient = pacientes.find(
															(p) => p.id === formData.patient_id,
														);
														const name = patient?.full_name || "";
														setFormData((prev) => ({
															...prev,
															referente: `${v} - ${name}`,
														}));
													}}
												>
													<SelectTrigger className="rounded-xl h-10 bg-white">
														<SelectValue placeholder="Selecione o serviço" />
													</SelectTrigger>
													<SelectContent className="rounded-xl">
														<SelectItem value="Avaliação Inicial">
															Avaliação Inicial
														</SelectItem>
														<SelectItem value="Sessão de Fisioterapia">
															Sessão Individual
														</SelectItem>
														<SelectItem value="Recovery Esportivo">
															Recovery
														</SelectItem>
														<SelectItem value="Pacote de Tratamento">
															Pacote de Tratamento
														</SelectItem>
													</SelectContent>
												</Select>
											</div>

											{Number(formData.valor) >= 300 && (
												<div className="space-y-2 animate-in slide-in-from-top-2">
													<Label className="text-[9px] font-black uppercase text-slate-400">
														Qtd. Sessões no Pacote
													</Label>
													<Select
														defaultValue="10"
														onValueChange={(v) =>
															setFormData((prev) => ({
																...prev,
																package_sessions: v,
																is_package: true,
															}))
														}
													>
														<SelectTrigger className="rounded-xl h-10 bg-white">
															<SelectValue />
														</SelectTrigger>
														<SelectContent className="rounded-xl">
															<SelectItem value="5">05 Sessões</SelectItem>
															<SelectItem value="10">
																10 Sessões (Padrão)
															</SelectItem>
															<SelectItem value="12">12 Sessões</SelectItem>
															<SelectItem value="20">20 Sessões</SelectItem>
														</SelectContent>
													</Select>
												</div>
											)}
										</div>
									</div>
								)}

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
										Paciente
									</Label>
									<Select
										value={formData.patient_id}
										onValueChange={(v) =>
											setFormData({ ...formData, patient_id: v })
										}
									>
										<SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 h-11">
											<SelectValue placeholder="Selecione o paciente" />
										</SelectTrigger>
										<SelectContent className="rounded-xl">
											{pacientes.map((p: PatientSelect) => (
												<SelectItem key={p.id} value={p.id}>
													{p.full_name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											CPF/CNPJ do Pagador
										</Label>
										<Input
											placeholder="000.000.000-00"
											value={formData.cpf_cnpj_pagador}
											onChange={(e) =>
												setFormData({
													...formData,
													cpf_cnpj_pagador: e.target.value,
												})
											}
											className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
										/>
									</div>

									<div className="space-y-2">
										<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
											Valor (R$)*
										</Label>
										<div className="relative">
											<span className="absolute left-3 top-3 text-slate-400 font-black text-sm">
												R$
											</span>
											<Input
												type="number"
												step="0.01"
												placeholder="0,00"
												value={formData.valor}
												onChange={(e) =>
													setFormData({ ...formData, valor: e.target.value })
												}
												required
												className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 h-11 text-lg font-black"
											/>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
										Referente a *
									</Label>
									<Textarea
										placeholder="Ex: Sessão de fisioterapia realizada em..."
										value={formData.referente}
										onChange={(e) =>
											setFormData({ ...formData, referente: e.target.value })
										}
										required
										className="rounded-xl border-slate-200 dark:border-slate-800 min-h-[100px] resize-none bg-slate-50/50 dark:bg-slate-800/20"
									/>
								</div>

								<div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
										<Settings className="h-5 w-5 text-primary" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												id="usar-clinica"
												checked={formData.usar_dados_clinica}
												onChange={(e) =>
													setFormData({
														...formData,
														usar_dados_clinica: e.target.checked,
													})
												}
												className="h-4 w-4 rounded border-slate-300 text-primary"
											/>
											<Label
												htmlFor="usar-clinica"
												className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
											>
												Usar dados da organização no cabeçalho
											</Label>
										</div>
										<p className="text-[10px] text-slate-400 font-medium truncate mt-1">
											Emissor:{" "}
											{formData.usar_dados_clinica
												? clinicaConfig?.org?.name || "Clínica"
												: clinicaConfig?.profile?.full_name}
										</p>
									</div>
								</div>

								<div className="flex gap-3 pt-4">
									<Button
										type="submit"
										disabled={createRecibo.isPending}
										className="flex-1 rounded-xl h-12 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-xl font-bold uppercase tracking-wider gap-2"
									>
										{createRecibo.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<BadgeCheck className="h-5 w-5" />
										)}
										Emitir Recibo Oficial
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="config" className="mt-4">
					{/* ... Content stays same but within Hub ... */}
					<Card className="max-w-2xl mx-auto rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
						<CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
							<CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
								<Settings className="h-5 w-5 text-primary" />
								Configurações do Emitente
							</CardTitle>
						</CardHeader>
						<CardContent className="p-8 space-y-8">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
								<div className="space-y-1">
									<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
										Clínica / Empresa
									</Label>
									<p className="font-bold text-slate-700 dark:text-slate-300">
										{clinicaConfig?.org?.name || "Não configurado"}
									</p>
								</div>
								<div className="space-y-1">
									<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
										Profissional Responsável
									</Label>
									<p className="font-bold text-slate-700 dark:text-slate-300">
										{clinicaConfig?.profile?.full_name || "Não configurado"}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Modal Visualização */}
			<CustomModal
				open={!!previewRecibo}
				onOpenChange={(open) => !open && setPreviewRecibo(null)}
				isMobile={isMobile}
				contentClassName="max-w-4xl h-[95vh]"
			>
				<CustomModalHeader onClose={() => setPreviewRecibo(null)}>
					<div className="flex flex-col gap-1">
						<Badge className="w-fit rounded-lg bg-emerald-500/10 text-emerald-600 border-none uppercase text-[10px] font-black tracking-widest">
							Documento Digital
						</Badge>
						<CustomModalTitle className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
							Recibo #{previewRecibo?.numero.toString().padStart(6, "0")}
						</CustomModalTitle>
					</div>
				</CustomModalHeader>

				<CustomModalBody className="p-0 sm:p-0 bg-slate-50/50 dark:bg-slate-950/50">
					<ScrollArea className="h-full">
						<div className="p-6 md:p-10">
							{previewRecibo && <ReciboPreview data={previewRecibo} />}
						</div>
					</ScrollArea>
				</CustomModalBody>

				<CustomModalFooter
					isMobile={isMobile}
					className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
				>
					<Button
						variant="ghost"
						onClick={() => setPreviewRecibo(null)}
						className="rounded-xl h-11 px-6 font-bold text-slate-500 uppercase text-xs tracking-wider"
					>
						Fechar
					</Button>
					<div className="flex-1" />
					{previewRecibo && (
						<ReciboPDF
							data={previewRecibo}
							fileName={`recibo-${previewRecibo.numero}`}
						/>
					)}
				</CustomModalFooter>
			</CustomModal>

			{/* Modal Rápido */}
			<CustomModal
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				isMobile={isMobile}
				contentClassName="max-w-md"
			>
				<CustomModalHeader onClose={() => setIsDialogOpen(false)}>
					<CustomModalTitle className="flex items-center gap-2 text-xl font-black tracking-tighter">
						<Plus className="h-5 w-5 text-primary" />
						Recibo Rápido
					</CustomModalTitle>
				</CustomModalHeader>

				<CustomModalBody className="p-6">
					<form
						id="quick-recibo-form"
						onSubmit={handleSubmit}
						className="space-y-6"
					>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
								Valor Recebido (R$)*
							</Label>
							<div className="relative">
								<span className="absolute left-3 top-3 text-slate-400 font-black text-sm">
									R$
								</span>
								<Input
									type="number"
									step="0.01"
									placeholder="0,00"
									value={formData.valor}
									onChange={(e) =>
										setFormData({ ...formData, valor: e.target.value })
									}
									required
									className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 h-11 text-lg font-black"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
								Descrição *
							</Label>
							<Textarea
								placeholder="Ex: Sessão individual..."
								value={formData.referente}
								onChange={(e) =>
									setFormData({ ...formData, referente: e.target.value })
								}
								required
								rows={3}
								className="rounded-xl border-slate-200 dark:border-slate-800 resize-none bg-slate-50/50"
							/>
						</div>
					</form>
				</CustomModalBody>

				<CustomModalFooter isMobile={isMobile}>
					<Button
						variant="ghost"
						onClick={() => setIsDialogOpen(false)}
						className="rounded-xl h-11 px-6 font-bold text-slate-500"
					>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="quick-recibo-form"
						disabled={createRecibo.isPending}
						className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl font-bold uppercase tracking-wider"
					>
						Emitir Agora
					</Button>
				</CustomModalFooter>
			</CustomModal>
		</div>
	);
}

export default function RecibosPage() {
	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto">
				<RecibosContent />
			</div>
		</MainLayout>
	);
}
