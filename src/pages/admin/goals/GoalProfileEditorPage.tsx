import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
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
	Plus,
	Save,
	ArrowLeft,
	Trash2,
	ArrowUp,
	ArrowDown,
	AlertCircle,
	Loader2,
	Target,
	BookOpen,
	Settings,
	ShieldCheck,
	CheckCircle2,
	History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	goalsAdminService,
	ProfileDetail,
} from "@/services/goals/goalsAdminService";
import { metricRegistry } from "@/lib/metrics/metricRegistry";
import { GoalTarget, TargetMode } from "@/lib/goals/goalProfiles.seed";
import { fisioLogger as logger } from "@/lib/errors/logger";



const METRIC_OPTIONS = Object.values(metricRegistry)
	.filter((m) => m.key && m.label)
	.map((m) => ({
		value: m.key,
		label: m.label,
		group: m.group || "OUTROS",
	}))
	.sort((a, b) => a.label.localeCompare(b.label));

const TARGET_MODES: {
	value: TargetMode;
	label: string;
	description: string;
}[] = [
	{
		value: "CUT_OFF",
		label: "Ponto de Corte",
		description: "Valor fixo a ser atingido (ex: Score > 80).",
	},
	{
		value: "IMPROVEMENT_ABS",
		label: "Melhora Absoluta",
		description: "Ganho bruto em relação à primeira avaliação.",
	},
	{
		value: "IMPROVEMENT_PCT",
		label: "Melhora Percentual",
		description: "Ganho em % (ex: melhorar 20% a força).",
	},
	{
		value: "RANGE",
		label: "Faixa de Valores",
		description: "Manter métrica dentro de um intervalo (mín/máx).",
	},
	{
		value: "CUSTOM",
		label: "Personalizado",
		description: "Critério manual definido pelo fisioterapeuta.",
	},
];

export default function GoalProfileEditorPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState("targets");

	const [formData, setFormData] = useState<Partial<ProfileDetail>>({
		name: "",
		description: "",
		targets: [],
	});

	const isNew = id === "new";

	const {
		data: profile,
		isLoading,
		isError,
		error,
	} = useQuery({
		queryKey: ["goalProfile", id],
		queryFn: () => goalsAdminService.getProfile(id!),
		enabled: !!id && !isNew,
	});

	useEffect(() => {
		if (profile) {
			setFormData({
				name: profile.name,
				description: profile.description,
				targets: profile.targets || [],
			});
		}
	}, [profile]);

	const updateProfileMutation = useMutation({
		mutationFn: (data: Partial<ProfileDetail>) =>
			goalsAdminService.updateProfile(id!, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["goalProfiles"] });
			queryClient.invalidateQueries({ queryKey: ["goalProfile", id] });
			toast({
				title: "Configurações Salvas",
				description: "O template foi atualizado com sucesso.",
				variant: "default",
			});
		},
		onError: (error: any) => {
			logger.error("Failed to save profile", error, "GoalProfileEditorPage");
			toast({
				title: "Erro ao salvar",
				description: error.message || "Erro desconhecido",
				variant: "destructive",
			});
		},
	});

	const handleSave = () => {
		if (!formData.name) {
			toast({
				title: "Nome obrigatório",
				description: "Por favor, insira um nome para o perfil.",
				variant: "destructive",
			});
			return;
		}
		updateProfileMutation.mutate(formData);
	};

	const addTarget = () => {
		const newTarget: GoalTarget = {
			key: METRIC_OPTIONS[0]?.value || "",
			mode: "IMPROVEMENT_PCT",
			minDeltaPct: 10,
			notes: "",
		};
		setFormData((prev) => ({
			...prev,
			targets: [...(prev.targets || []), newTarget],
		}));
	};

	const removeTarget = (index: number) => {
		setFormData((prev) => ({
			...prev,
			targets: prev.targets?.filter((_, i) => i !== index),
		}));
	};

	const moveTarget = (index: number, direction: "up" | "down") => {
		setFormData((prev) => {
			const newTargets = [...(prev.targets || [])];
			if (direction === "up" && index > 0) {
				[newTargets[index], newTargets[index - 1]] = [
					newTargets[index - 1],
					newTargets[index],
				];
			} else if (direction === "down" && index < newTargets.length - 1) {
				[newTargets[index], newTargets[index + 1]] = [
					newTargets[index + 1],
					newTargets[index],
				];
			}
			return { ...prev, targets: newTargets };
		});
	};

	const updateTarget = (index: number, field: keyof GoalTarget, value: any) => {
		setFormData((prev) => {
			const newTargets = [...(prev.targets || [])];
			newTargets[index] = { ...newTargets[index], [field]: value };
			return { ...prev, targets: newTargets };
		});
	};

	if (isLoading) {
		return (
			<MainLayout>
				<div className="flex h-[80vh] items-center justify-center flex-col gap-6 bg-[#f8faff]">
					<div className="relative">
						<Loader2 className="h-12 w-12 animate-spin text-blue-600" />
						<Target className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
					</div>
					<p className="text-slate-500 font-medium animate-pulse">
						Carregando evidências clínicas...
					</p>
				</div>
			</MainLayout>
		);
	}

	if (isError) {
		return (
			<MainLayout>
				<div className="container p-6 flex justify-center bg-[#f8faff] min-h-screen">
					<Card className="max-w-md w-full border-red-100 shadow-xl shadow-red-900/5 rounded-2xl overflow-hidden">
						<div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
							<AlertCircle className="h-12 w-12 text-red-500" />
						</div>
						<CardHeader className="text-center">
							<CardTitle className="text-xl">Erro de Sincronização</CardTitle>
							<CardDescription>
								Não foi possível localizar este template de metas.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-xs font-mono bg-slate-50 p-4 rounded-xl text-slate-500 overflow-auto border border-slate-100">
								{error instanceof Error ? error.message : "Erro desconhecido"}
							</div>
							<Button
								onClick={() => navigate("/admin/goals")}
								variant="outline"
								className="w-full h-11 rounded-xl"
							>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Voltar para Lista
							</Button>
						</CardContent>
					</Card>
				</div>
			</MainLayout>
		);
	}

	return (
		<MainLayout>
			<div className="container mx-auto p-6 space-y-8 max-w-6xl bg-[#f8faff] min-h-screen pb-24">
				{/* Top Navigation */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-50"
							onClick={() => navigate("/admin/goals")}
							title="Voltar"
						>
							<ArrowLeft className="h-5 w-5 text-slate-600" />
						</Button>
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
									{formData.name || "Novo Perfil"}
								</h1>
								{profile?.status && (
									<Badge
										className={
											profile.status === "PUBLISHED"
												? "bg-emerald-100 text-emerald-800 border-emerald-200"
												: "bg-amber-100 text-amber-800 border-amber-200"
										}
									>
										{profile.status === "PUBLISHED" ? "Publicado" : "Rascunho"}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-2 mt-1">
								<span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
									{id}
								</span>
								<span className="text-slate-300">|</span>
								<span className="text-xs text-slate-500 flex items-center gap-1">
									<ShieldCheck className="w-3 h-3" />
									Template de Governança
								</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							className="text-slate-600 hidden sm:flex"
							onClick={() => navigate("/admin/goals")}
						>
							Descartar
						</Button>
						<Button
							onClick={handleSave}
							disabled={updateProfileMutation.isPending}
							className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 h-11 px-8 rounded-xl transition-all hover:scale-[1.02]"
						>
							{updateProfileMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-2 h-4 w-4" />
							)}
							Salvar Template
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					{/* Left Sidebar - Navigation */}
					<div className="lg:col-span-1 space-y-6">
						<Card className="border-none shadow-none bg-transparent">
							<CardContent className="p-0">
								<div className="space-y-1">
									<button
										onClick={() => setActiveTab("targets")}
										className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "targets" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"}`}
									>
										<Target className="w-4 h-4" />
										Metas e Alvos
									</button>
									<button
										onClick={() => setActiveTab("metadata")}
										className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "metadata" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"}`}
									>
										<BookOpen className="w-4 h-4" />
										Informações Básicas
									</button>
									<button
										onClick={() => setActiveTab("json")}
										className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "json" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"}`}
									>
										<Settings className="w-4 h-4" />
										Estrutura Avançada
									</button>
								</div>
							</CardContent>
						</Card>

						{/* Quick Tips */}
						<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
							<h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
								<CheckCircle2 className="w-4 h-4 text-emerald-500" />
								Dica Clínica
							</h4>
							<p className="text-xs text-slate-500 leading-relaxed">
								Para metas de retorno ao esporte (RTS), combine sempre métricas
								de <strong>percepção subjetiva</strong> (PROMs) com{" "}
								<strong>biomecânica</strong>.
							</p>
							<hr className="border-slate-50" />
							<div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-tight">
								<History className="w-3 h-3" />
								Última versão: v{profile?.version || 1}
							</div>
						</div>
					</div>

					{/* Main Content Area */}
					<div className="lg:col-span-3 space-y-6">
						{activeTab === "targets" && (
							<div className="space-y-6">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-xl font-bold text-slate-900">
											Configuração de Alvos Clínicos
										</h2>
										<p className="text-sm text-slate-500">
											Defina quais métricas o sistema deve monitorar para este
											template.
										</p>
									</div>
									<Button
										variant="outline"
										className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 bg-white"
										onClick={addTarget}
									>
										<Plus className="mr-2 h-4 w-4" /> Adicionar Métrica
									</Button>
								</div>

								{formData.targets?.length === 0 ? (
									<Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-2xl py-16 text-center">
										<div className="flex flex-col items-center gap-4">
											<div className="p-4 rounded-full bg-slate-100 text-slate-400">
												<Target className="w-8 h-8" />
											</div>
											<div>
												<p className="font-bold text-slate-800">
													Nenhuma meta configurada
												</p>
												<p className="text-sm text-slate-500 max-w-xs mx-auto">
													Adicione métricas para que o sistema possa analisar
													automaticamente o progresso do paciente.
												</p>
											</div>
											<Button
												variant="default"
												className="bg-blue-600 rounded-xl"
												onClick={addTarget}
											>
												Começar Agora
											</Button>
										</div>
									</Card>
								) : (
									<div className="space-y-4">
										{formData.targets?.map((target, index) => (
											<Card
												key={index}
												className="border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all rounded-2xl overflow-hidden group"
											>
												<div className="flex">
													{/* Sort Handle Area */}
													<div className="w-12 bg-slate-50/50 flex flex-col items-center justify-center border-r border-slate-50 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 text-slate-400"
															disabled={index === 0}
															onClick={() => moveTarget(index, "up")}
														>
															<ArrowUp className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 text-slate-400"
															disabled={
																index === (formData.targets?.length || 0) - 1
															}
															onClick={() => moveTarget(index, "down")}
														>
															<ArrowDown className="h-4 w-4" />
														</Button>
													</div>

													<div className="flex-1 p-5 space-y-4">
														<div className="flex justify-between items-start">
															<div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mr-4">
																<div className="space-y-1.5">
																	<Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
																		Métrica Monitorada
																	</Label>
																	<Select
																		value={target.key}
																		onValueChange={(val) =>
																			updateTarget(index, "key", val)
																		}
																	>
																		<SelectTrigger className="rounded-lg h-10 border-slate-200 focus:ring-blue-100">
																			<SelectValue placeholder="Selecione uma métrica" />
																		</SelectTrigger>
																		<SelectContent>
																			{METRIC_OPTIONS.map((opt) => (
																				<SelectItem
																					key={opt.value}
																					value={opt.value}
																				>
																					<div className="flex flex-col">
																						<span className="font-medium text-sm">
																							{opt.label}
																						</span>
																						<span className="text-[10px] text-slate-400">
																							{opt.group} — {opt.value}
																						</span>
																					</div>
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>

																<div className="space-y-1.5">
																	<Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
																		Modo de Avaliação
																	</Label>
																	<Select
																		value={target.mode}
																		onValueChange={(val) =>
																			updateTarget(
																				index,
																				"mode",
																				val as TargetMode,
																			)
																		}
																	>
																		<SelectTrigger className="rounded-lg h-10 border-slate-200 focus:ring-blue-100">
																			<SelectValue />
																		</SelectTrigger>
																		<SelectContent>
																			{TARGET_MODES.map((m) => (
																				<SelectItem
																					key={m.value}
																					value={m.value}
																				>
																					<div className="flex flex-col">
																						<span className="font-medium text-sm">
																							{m.label}
																						</span>
																						<span className="text-[10px] text-slate-400">
																							{m.description}
																						</span>
																					</div>
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																</div>
															</div>
															<Button
																variant="ghost"
																size="icon"
																className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
																onClick={() => removeTarget(index)}
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														</div>

														{/* Target Values Configuration */}
														<div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
															{(target.mode === "CUT_OFF" ||
																target.mode === "RANGE") && (
																<div className="space-y-1.5">
																	<Label className="text-xs font-bold text-blue-700">
																		Valor Mínimo
																	</Label>
																	<Input
																		type="number"
																		value={target.min ?? ""}
																		onChange={(e) =>
																			updateTarget(
																				index,
																				"min",
																				e.target.value
																					? Number(e.target.value)
																					: undefined,
																			)
																		}
																		className="h-9 border-blue-200 bg-white rounded-lg focus-visible:ring-blue-400"
																	/>
																</div>
															)}
															{target.mode === "RANGE" && (
																<div className="space-y-1.5">
																	<Label className="text-xs font-bold text-blue-700">
																		Valor Máximo
																	</Label>
																	<Input
																		type="number"
																		value={target.max ?? ""}
																		onChange={(e) =>
																			updateTarget(
																				index,
																				"max",
																				e.target.value
																					? Number(e.target.value)
																					: undefined,
																			)
																		}
																		className="h-9 border-blue-200 bg-white rounded-lg focus-visible:ring-blue-400"
																	/>
																</div>
															)}
															{target.mode === "IMPROVEMENT_ABS" && (
																<div className="space-y-1.5">
																	<Label className="text-xs font-bold text-blue-700">
																		Delta Mínimo
																	</Label>
																	<Input
																		type="number"
																		value={target.minDeltaAbs ?? ""}
																		onChange={(e) =>
																			updateTarget(
																				index,
																				"minDeltaAbs",
																				e.target.value
																					? Number(e.target.value)
																					: undefined,
																			)
																		}
																		className="h-9 border-blue-200 bg-white rounded-lg focus-visible:ring-blue-400"
																	/>
																</div>
															)}
															{target.mode === "IMPROVEMENT_PCT" && (
																<div className="space-y-1.5">
																	<Label className="text-xs font-bold text-blue-700">
																		Melhora Mínima (%)
																	</Label>
																	<div className="relative">
																		<Input
																			type="number"
																			className="pr-6 h-9 border-blue-200 bg-white rounded-lg focus-visible:ring-blue-400"
																			value={target.minDeltaPct ?? ""}
																			onChange={(e) =>
																				updateTarget(
																					index,
																					"minDeltaPct",
																					e.target.value
																						? Number(e.target.value)
																						: undefined,
																				)
																			}
																		/>
																		<span className="absolute right-2 top-2 text-xs font-bold text-blue-300">
																			%
																		</span>
																	</div>
																</div>
															)}

															<div className="col-span-2 space-y-1.5">
																<Label className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
																	Observação Clínica para o Sistema
																</Label>
																<Input
																	value={target.notes || ""}
																	onChange={(e) =>
																		updateTarget(index, "notes", e.target.value)
																	}
																	placeholder="Explique o motivo deste alvo..."
																	className="h-9 border-slate-200 bg-white rounded-lg"
																/>
															</div>
														</div>
													</div>
												</div>
											</Card>
										))}
									</div>
								)}
							</div>
						)}

						{activeTab === "metadata" && (
							<Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
								<CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
									<CardTitle className="text-lg">
										Informações Descritivas
									</CardTitle>
									<CardDescription>
										Estes detalhes ajudam a identificar e selecionar o template
										no prontuário.
									</CardDescription>
								</CardHeader>
								<CardContent className="p-8 space-y-6">
									<div className="space-y-2">
										<Label className="font-bold text-slate-700">
											Nome do Template
										</Label>
										<Input
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
											placeholder="Ex: Reabilitação LCA - Fase 2"
											className="h-11 rounded-xl border-slate-200 shadow-sm focus:ring-blue-100"
										/>
									</div>
									<div className="space-y-2">
										<Label className="font-bold text-slate-700">
											Descrição e Objetivo Clínico
										</Label>
										<Textarea
											value={formData.description || ""}
											onChange={(e) =>
												setFormData({
													...formData,
													description: e.target.value,
												})
											}
											rows={6}
											placeholder="Descreva detalhadamente o propósito deste template e para quais tipos de pacientes ele é indicado..."
											className="rounded-xl border-slate-200 shadow-sm focus:ring-blue-100"
										/>
									</div>
								</CardContent>
							</Card>
						)}

						{activeTab === "json" && (
							<Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-slate-900">
								<CardHeader className="bg-slate-800 border-b border-slate-700 p-6">
									<CardTitle className="text-lg text-slate-100">
										Estrutura Bruta de Dados (JSON)
									</CardTitle>
									<CardDescription className="text-slate-400">
										Modo de leitura técnica do template para auditoria.
									</CardDescription>
								</CardHeader>
								<CardContent className="p-0">
									<div className="p-6">
										<div className="bg-slate-950 rounded-xl p-4 overflow-auto max-h-[500px]">
											<pre className="text-xs text-blue-300 font-mono leading-relaxed">
												{JSON.stringify(formData, null, 2)}
											</pre>
										</div>
									</div>
								</CardContent>
								<CardFooter className="bg-slate-800/50 p-4 justify-center">
									<p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
										Uso exclusivo para desenvolvedores e administradores
									</p>
								</CardFooter>
							</Card>
						)}
					</div>
				</div>
			</div>
		</MainLayout>
	);
}
