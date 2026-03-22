import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	AlertTriangle,
	ArrowLeft,
	BookOpen,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	ClipboardCheck,
	Clock,
	Download,
	Dumbbell,
	Edit,
	Play,
	Share2,
	Shield,
	Target,
	Trash2,
	TrendingUp,
	Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExerciseProtocol } from "@/hooks/useExerciseProtocols";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
	getProtocolCategory,
	PROTOCOL_CATEGORIES,
	PROTOCOL_DETAILS,
} from "@/data/protocols";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { generateProtocolPdf } from "@/utils/generateProtocolPdf";
import { clinicalTestsApi } from "@/api/v2";
import { ApplyProtocolModal } from "./ApplyProtocolModal";

interface ProtocolDetailViewProps {
	protocol: ExerciseProtocol;
	onBack: () => void;
	onEdit: () => void;
	onDelete: () => void;
}

interface Milestone {
	week: number;
	title: string;
	criteria: string[];
	notes?: string;
}

interface Restriction {
	weekStart: number;
	weekEnd?: number;
	description: string;
	type: "weight_bearing" | "range_of_motion" | "activity" | "general";
}

interface LinkedClinicalTest {
	id: string;
	name: string;
	target_joint: string;
	category: string;
}

interface ProtocolPhase {
	name: string;
	weeks?: string;
	weekStart?: number;
	weekEnd?: number;
	goals?: string[];
	criteria?: string[];
	exercises?: string[];
	exerciseIds?: string[];
	precautions?: string[];
}

export function ProtocolDetailView({
	protocol,
	onBack,
	onEdit,
	onDelete,
}: ProtocolDetailViewProps) {
	const details = PROTOCOL_DETAILS[protocol.condition_name];
	const milestones = (protocol.milestones as Milestone[] | undefined) ?? [];
	const restrictions =
		(protocol.restrictions as Restriction[] | undefined) ?? [];
	const phases = (
		protocol.phases && protocol.phases.length > 0
			? protocol.phases
			: details?.phases || []
	) as ProtocolPhase[];
	const [expandedPhases, setExpandedPhases] = useState<string[]>(() =>
		phases[0]?.name ? [phases[0].name] : [],
	);
	const [applyModalOpen, setApplyModalOpen] = useState(false);
	const { currentOrganization } = useOrganizations();
	const navigate = useNavigate();

	const { data: linkedTests = [] } = useQuery({
		queryKey: ["protocol-linked-tests", protocol.id, protocol.clinical_tests],
		queryFn: async () => {
			const testIds = protocol.clinical_tests || [];
			if (testIds.length === 0) return [];
			const res = await clinicalTestsApi.list({ ids: testIds });
			return ((res?.data ?? []) as LinkedClinicalTest[]).map((test) => ({
				id: test.id,
				name: test.name,
				target_joint: test.target_joint,
				category: test.category,
			}));
		},
		enabled: !!protocol.clinical_tests && protocol.clinical_tests.length > 0,
	});

	const togglePhase = (phaseName: string) => {
		setExpandedPhases((prev) =>
			prev.includes(phaseName)
				? prev.filter((phase) => phase !== phaseName)
				: [...prev, phaseName],
		);
	};

	const category = getProtocolCategory(protocol.condition_name);
	const categoryInfo =
		PROTOCOL_CATEGORIES.find((item) => item.id === category) ||
		PROTOCOL_CATEGORIES[0];
	const overviewObjectives = details?.objectives?.slice(0, 6) ?? [];
	const contraindications = details?.contraindications ?? [];
	const expectedOutcomes = details?.expectedOutcomes ?? [];
	const summaryCards = [
		{
			label: "Semanas",
			value: protocol.weeks_total,
			icon: Calendar,
			tone: "text-primary",
		},
		{
			label: "Fases",
			value: phases.length,
			icon: Dumbbell,
			tone: "text-indigo-600",
		},
		{
			label: "Marcos",
			value: milestones.length,
			icon: Target,
			tone: "text-emerald-600",
		},
		{
			label: "Alertas",
			value: restrictions.length,
			icon: Shield,
			tone: "text-amber-600",
		},
	];

	const handleExportPDF = () => {
		try {
			generateProtocolPdf(protocol, currentOrganization);
			toast.success("PDF do protocolo gerado com sucesso!");
		} catch (error) {
			logger.error("Error generating PDF", error, "ProtocolDetailView");
			toast.error("Erro ao gerar PDF do protocolo");
		}
	};

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success("Link copiado para a área de transferência!");
	};

	return (
		<div className="space-y-6 animate-fade-in">
			<div className="sticky top-0 z-20 -mx-4 flex flex-col gap-4 border-b border-border/50 bg-background/85 px-4 pb-4 pt-1 backdrop-blur-xl">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="flex items-start gap-3">
						<Button
							variant="ghost"
							size="icon"
							onClick={onBack}
							className="mt-0.5 rounded-full border border-border/60 bg-background/80"
						>
							<ArrowLeft className="h-5 w-5" />
						</Button>

						<div className="flex min-w-0 items-start gap-4">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
								<categoryInfo.icon className="h-6 w-6" />
							</div>

							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="text-2xl font-bold tracking-tight text-foreground">
										{protocol.name}
									</h1>
									<Badge
										variant={
											protocol.protocol_type === "pos_operatorio"
												? "default"
												: "secondary"
										}
										className="h-5 px-2 text-[10px] font-bold uppercase tracking-[0.18em]"
									>
										{protocol.protocol_type === "pos_operatorio"
											? "Pós-Operatório"
											: "Patologia"}
									</Badge>
									{protocol.evidence_level && (
										<Badge
											variant="outline"
											className={cn(
												"h-5 gap-1 px-2 text-[10px] font-bold uppercase tracking-[0.18em]",
												protocol.evidence_level === "A"
													? "border-amber-500/20 bg-amber-500/10 text-amber-600"
													: "border-primary/20 bg-primary/10 text-primary",
											)}
										>
											<Zap className="h-3 w-3 fill-current" />
											Nível {protocol.evidence_level}
										</Badge>
									)}
								</div>

								<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
									<span className="font-medium">{protocol.condition_name}</span>
									<span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
									<span className="inline-flex items-center gap-1">
										<Clock className="h-3.5 w-3.5" />
										{protocol.weeks_total} semanas
									</span>
									<span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
									<span className="inline-flex items-center gap-1">
										<ClipboardCheck className="h-3.5 w-3.5" />
										{linkedTests.length} testes vinculados
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{protocol.wiki_page_id && (
							<Button
								variant="secondary"
								onClick={() => navigate(`/wiki/${protocol.wiki_page_id}`)}
								className="gap-2 border border-primary/10 bg-primary/5 text-primary hover:bg-primary/10"
							>
								<BookOpen className="h-4 w-4" />
								Ver na Wiki
							</Button>
						)}
						<Button
							onClick={() => setApplyModalOpen(true)}
							className="gap-2 shadow-sm"
						>
							<Play className="h-4 w-4" />
							Aplicar a Paciente
						</Button>

						<TooltipProvider>
							<div className="flex items-center gap-2">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={handleShare}
											className="rounded-full"
										>
											<Share2 className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Compartilhar</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={onEdit}
											className="rounded-full"
										>
											<Edit className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Editar Protocolo</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={handleExportPDF}
											className="rounded-full"
										>
											<Download className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Exportar PDF</TooltipContent>
								</Tooltip>

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={onDelete}
											className="rounded-full text-destructive hover:bg-destructive/10"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Excluir Protocolo</TooltipContent>
								</Tooltip>
							</div>
						</TooltipProvider>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_340px]">
				<div className="space-y-6">
					<Card className="overflow-hidden border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-6 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.96))]">
						<div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)]">
							<div className="space-y-5">
								<div className="flex items-start gap-3">
									<div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
										<Activity className="h-5 w-5" />
									</div>
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
											Resumo clínico
										</p>
										<h2 className="mt-1 text-xl font-semibold tracking-tight">
											Leitura rápida do protocolo
										</h2>
										<p className="mt-2 text-sm leading-6 text-muted-foreground">
											{details?.description ||
												"Protocolo organizado para aplicação clínica com foco em acompanhamento, progressão e segurança."}
										</p>
									</div>
								</div>

								{overviewObjectives.length > 0 && (
									<div className="grid gap-3 sm:grid-cols-2">
										{overviewObjectives.map((objective, index) => (
											<div
												key={`${objective}-${index}`}
												className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-background/75 px-4 py-3"
											>
												<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
													<CheckCircle2 className="h-3.5 w-3.5" />
												</div>
												<span className="text-sm font-medium leading-5">
													{objective}
												</span>
											</div>
										))}
									</div>
								)}
							</div>

							<div className="rounded-[28px] border border-border/60 bg-background/80 p-5 shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
											Jornada clínica
										</p>
										<h3 className="mt-1 text-lg font-semibold">
											Marcos principais
										</h3>
									</div>
									<Badge
										variant="outline"
										className="border-primary/15 bg-primary/5 text-primary"
									>
										{milestones.length || phases.length} checkpoints
									</Badge>
								</div>

								<div className="mt-5 flex items-center gap-3">
									<span className="text-xs font-medium text-muted-foreground">
										Início
									</span>
									<div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
										<div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-sky-400 to-emerald-500" />
									</div>
									<span className="text-xs font-medium text-muted-foreground">
										Alta
									</span>
								</div>

								{milestones.length > 0 ? (
									<div className="mt-5 flex flex-wrap gap-2.5">
										{milestones.slice(0, 6).map((milestone, index) => (
											<div
												key={`${milestone.week}-${index}`}
												className="min-w-[92px] rounded-2xl border border-border/60 bg-background px-3 py-2 shadow-sm"
											>
												<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
													W{milestone.week}
												</p>
												<p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-foreground">
													{milestone.title}
												</p>
											</div>
										))}
									</div>
								) : (
									<div className="mt-5 rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
										Nenhum marco definido. Use as fases abaixo para acompanhar a
										progressão clínica.
									</div>
								)}
							</div>
						</div>
					</Card>

					{phases.length > 0 && (
						<Card className="border-border/60 bg-background/70 p-4 shadow-sm sm:p-5">
							<div className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
										Execução do protocolo
									</p>
									<h2 className="mt-1 text-xl font-semibold tracking-tight">
										Fases do tratamento
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										Cada fase agora fica compacta por padrão e expande só quando
										você precisa entrar em detalhe.
									</p>
								</div>
								<Badge
									variant="outline"
									className="w-fit border-border/70 bg-background/80 text-muted-foreground"
								>
									{phases.length} fases
								</Badge>
							</div>

							<div className="mt-4 space-y-3">
								{phases.map((phase, index) => {
									const phaseName = phase.name || `Fase ${index + 1}`;
									const weekInfo = phase.weeks
										? phase.weeks
										: phase.weekStart != null
											? `${phase.weekStart}${phase.weekEnd != null ? ` - ${phase.weekEnd}` : "+"} semanas`
											: `${index + 1}`;
									const goals = phase.goals || [];
									const criteria = phase.criteria || [];
									const exercises = phase.exercises || phase.exerciseIds || [];
									const precautions = phase.precautions || [];
									const isExpanded = expandedPhases.includes(phaseName);

									return (
										<Collapsible
											key={`${phaseName}-${index}`}
											open={isExpanded}
											onOpenChange={() => togglePhase(phaseName)}
										>
											<div className="overflow-hidden rounded-[28px] border border-border/60 bg-background shadow-sm">
												<CollapsibleTrigger asChild>
													<button
														type="button"
														className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
													>
														<div className="flex min-w-0 items-start gap-4">
															<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
																{index + 1}
															</div>
															<div className="min-w-0">
																<div className="flex flex-wrap items-center gap-2">
																	<h3 className="text-base font-semibold text-foreground">
																		{phaseName}
																	</h3>
																	<Badge
																		variant="outline"
																		className="border-primary/15 bg-primary/5 text-primary"
																	>
																		{weekInfo}
																	</Badge>
																</div>

																<div className="mt-2 flex flex-wrap gap-2">
																	<Badge
																		variant="secondary"
																		className="bg-muted text-muted-foreground"
																	>
																		{goals.length} objetivos
																	</Badge>
																	<Badge
																		variant="secondary"
																		className="bg-muted text-muted-foreground"
																	>
																		{criteria.length} critérios
																	</Badge>
																	<Badge
																		variant="secondary"
																		className="bg-muted text-muted-foreground"
																	>
																		{exercises.length} intervenções
																	</Badge>
																	<Badge
																		variant="secondary"
																		className="bg-muted text-muted-foreground"
																	>
																		{precautions.length} alertas
																	</Badge>
																</div>
															</div>
														</div>

														<div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground">
															{isExpanded ? (
																<ChevronUp className="h-4 w-4" />
															) : (
																<ChevronDown className="h-4 w-4" />
															)}
														</div>
													</button>
												</CollapsibleTrigger>

												<CollapsibleContent className="border-t border-border/60 px-5 pb-5 pt-4">
													<div className="grid gap-4 lg:grid-cols-3">
														<div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
															<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
																<Target className="h-3.5 w-3.5 text-primary" />
																Objetivos terapêuticos
															</div>
															<div className="space-y-2.5">
																{goals.length > 0 ? (
																	goals.map((goal, goalIndex) => (
																		<div
																			key={`${goal}-${goalIndex}`}
																			className="flex items-start gap-2.5 text-sm leading-5"
																		>
																			<span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
																			<span>{goal}</span>
																		</div>
																	))
																) : (
																	<p className="text-sm text-muted-foreground">
																		Sem objetivos específicos nesta fase.
																	</p>
																)}
															</div>
														</div>

														<div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
															<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
																<CheckCircle2 className="h-3.5 w-3.5" />
																Critérios de progressão
															</div>
															<div className="space-y-2.5">
																{criteria.length > 0 ? (
																	criteria.map((item, criteriaIndex) => (
																		<div
																			key={`${item}-${criteriaIndex}`}
																			className="flex items-start gap-2.5 text-sm leading-5 text-emerald-900 dark:text-emerald-200"
																		>
																			<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
																			<span>{item}</span>
																		</div>
																	))
																) : (
																	<p className="text-sm text-emerald-700/80 dark:text-emerald-200/80">
																		Sem critérios formais definidos.
																	</p>
																)}
															</div>
														</div>

														<div className="space-y-4">
															<div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.04] p-4">
																<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
																	<Dumbbell className="h-3.5 w-3.5" />
																	Intervenções chave
																</div>
																<div className="flex flex-wrap gap-2">
																	{exercises.length > 0 ? (
																		exercises.map((exercise, exerciseIndex) => (
																			<Badge
																				key={`${exercise}-${exerciseIndex}`}
																				variant="outline"
																				className="border-indigo-500/15 bg-background/80 text-indigo-700 dark:text-indigo-300"
																			>
																				{exercise}
																			</Badge>
																		))
																	) : (
																		<span className="text-sm text-indigo-700/80 dark:text-indigo-200/80">
																			Nenhuma intervenção vinculada.
																		</span>
																	)}
																</div>
															</div>

															<div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
																<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
																	<AlertTriangle className="h-3.5 w-3.5" />
																	Precauções
																</div>
																<div className="space-y-2.5">
																	{precautions.length > 0 ? (
																		precautions.map((item, precautionIndex) => (
																			<div
																				key={`${item}-${precautionIndex}`}
																				className="flex items-start gap-2.5 text-sm leading-5 text-amber-900 dark:text-amber-200"
																			>
																				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
																				<span>{item}</span>
																			</div>
																		))
																	) : (
																		<p className="text-sm text-amber-700/80 dark:text-amber-200/80">
																			Sem alertas específicos nesta fase.
																		</p>
																	)}
																</div>
															</div>
														</div>
													</div>
												</CollapsibleContent>
											</div>
										</Collapsible>
									);
								})}
							</div>
						</Card>
					)}

					{protocol.references && protocol.references.length > 0 && (
						<Card className="border-border/60 bg-background/70 p-5 shadow-sm">
							<div className="flex flex-col gap-2 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
										Evidência
									</p>
									<h2 className="mt-1 text-xl font-semibold tracking-tight">
										Referências científicas
									</h2>
								</div>
								<Badge
									variant="outline"
									className="w-fit border-border/70 bg-background/80 text-muted-foreground"
								>
									{protocol.references.length} referências
								</Badge>
							</div>

							<div className="mt-4 grid gap-4 lg:grid-cols-2">
								{protocol.references.map((reference, index) => (
									<div
										key={`${reference.title}-${index}`}
										className="rounded-[26px] border border-border/60 bg-background p-4 shadow-sm transition-colors hover:border-primary/15"
									>
										<div className="flex items-center gap-2">
											<Badge className="bg-primary text-[10px] font-bold">
												{reference.year}
											</Badge>
											<span className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
												{reference.journal || "Study"}
											</span>
										</div>

										{reference.url ? (
											<a
												href={reference.url}
												target="_blank"
												rel="noopener noreferrer"
												className="mt-3 flex items-start gap-2 text-base font-semibold leading-6 text-foreground transition-colors hover:text-primary"
											>
												<span className="flex-1">{reference.title}</span>
												<Share2 className="mt-1 h-4 w-4 shrink-0" />
											</a>
										) : (
											<p className="mt-3 text-base font-semibold leading-6 text-foreground">
												{reference.title}
											</p>
										)}

										<p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
											{reference.authors}
										</p>
									</div>
								))}
							</div>
						</Card>
					)}
				</div>

				<div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
					<Card className="border-border/60 bg-background/70 p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
							Resumo rápido
						</p>
						<h2 className="mt-1 text-lg font-semibold">Visão condensada</h2>

						<div className="mt-4 grid grid-cols-2 gap-3">
							{summaryCards.map((item) => (
								<div
									key={item.label}
									className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm"
								>
									<div className="flex items-center justify-between gap-2">
										<item.icon className={cn("h-4 w-4", item.tone)} />
										<span className={cn("text-lg font-bold", item.tone)}>
											{item.value}
										</span>
									</div>
									<p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
										{item.label}
									</p>
								</div>
							))}
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<Badge
								variant="outline"
								className="border-primary/15 bg-primary/5 text-primary"
							>
								{categoryInfo.name}
							</Badge>
							{protocol.wiki_page_id && (
								<Badge
									variant="outline"
									className="border-primary/15 bg-primary/5 text-primary"
								>
									Wiki vinculada
								</Badge>
							)}
							{protocol.references && protocol.references.length > 0 && (
								<Badge
									variant="outline"
									className="border-primary/15 bg-primary/5 text-primary"
								>
									{protocol.references.length} estudos
								</Badge>
							)}
						</div>
					</Card>

					<Card className="border-border/60 bg-background/70 p-5 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600/80">
									Linha do tempo
								</p>
								<h2 className="mt-1 text-lg font-semibold">
									Marcos do protocolo
								</h2>
							</div>
							<Badge
								variant="outline"
								className="border-emerald-500/15 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
							>
								{milestones.length}
							</Badge>
						</div>

						<div className="mt-4 space-y-3">
							{milestones.length > 0 ? (
								milestones.slice(0, 5).map((milestone, index) => (
									<div
										key={`${milestone.week}-${index}`}
										className="flex items-start gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-3"
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-sm">
											W{milestone.week}
										</div>
										<div className="min-w-0">
											<p className="text-sm font-semibold text-foreground">
												{milestone.title}
											</p>
											{milestone.criteria?.[0] && (
												<p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
													{milestone.criteria[0]}
												</p>
											)}
										</div>
									</div>
								))
							) : (
								<div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
									Nenhum marco definido.
								</div>
							)}
						</div>
					</Card>

					<Card className="border-border/60 bg-background/70 p-5 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600/80">
									Avaliação
								</p>
								<h2 className="mt-1 text-lg font-semibold">Testes clínicos</h2>
							</div>
							<Badge
								variant="outline"
								className="border-cyan-500/15 bg-cyan-500/5 text-cyan-700 dark:text-cyan-300"
							>
								{linkedTests.length}
							</Badge>
						</div>

						<div className="mt-4 space-y-3">
							{linkedTests.length > 0 ? (
								linkedTests.map((test) => (
									<div
										key={test.id}
										className="rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.04] px-4 py-3"
									>
										<p className="text-sm font-semibold text-foreground">
											{test.name}
										</p>
										<div className="mt-2 flex flex-wrap items-center gap-2">
											<Badge
												variant="outline"
												className="border-cyan-500/15 bg-background/80 text-cyan-700 dark:text-cyan-300"
											>
												{test.target_joint}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{test.category}
											</span>
										</div>
									</div>
								))
							) : (
								<div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
									Nenhum teste vinculado ao protocolo.
								</div>
							)}
						</div>
					</Card>

					<Card className="border-border/60 bg-background/70 p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600/80">
							Segurança clínica
						</p>
						<h2 className="mt-1 text-lg font-semibold">Alertas e resultados</h2>

						<div className="mt-4 space-y-3">
							{restrictions.length > 0 ? (
								restrictions.slice(0, 4).map((restriction, index) => (
									<div
										key={`${restriction.description}-${index}`}
										className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] px-4 py-3"
									>
										<div className="flex items-center gap-2">
											<AlertTriangle className="h-4 w-4 text-amber-600" />
											<Badge
												variant="outline"
												className="border-amber-500/15 bg-background/80 text-amber-700 dark:text-amber-300"
											>
												W{restriction.weekStart}
												{restriction.weekEnd != null
													? ` - W${restriction.weekEnd}`
													: "+"}
											</Badge>
										</div>
										<p className="mt-2 text-sm leading-5 text-foreground">
											{restriction.description}
										</p>
									</div>
								))
							) : (
								<div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
									Nenhuma restrição especial cadastrada.
								</div>
							)}
						</div>

						{contraindications.length > 0 && (
							<div className="mt-5 rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-4">
								<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-600">
									<Shield className="h-3.5 w-3.5" />
									Contraindicações
								</div>
								<div className="space-y-2.5">
									{contraindications.slice(0, 3).map((item, index) => (
										<div
											key={`${item}-${index}`}
											className="flex items-start gap-2.5 text-sm leading-5 text-red-900 dark:text-red-200"
										>
											<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
											<span>{item}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{expectedOutcomes.length > 0 && (
							<div className="mt-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
								<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
									<TrendingUp className="h-3.5 w-3.5" />
									Resultados esperados
								</div>
								<div className="space-y-2.5">
									{expectedOutcomes.slice(0, 3).map((item, index) => (
										<div
											key={`${item}-${index}`}
											className="flex items-start gap-2.5 text-sm leading-5 text-emerald-900 dark:text-emerald-200"
										>
											<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
											<span>{item}</span>
										</div>
									))}
								</div>
							</div>
						)}
					</Card>
				</div>
			</div>

			<ApplyProtocolModal
				protocol={protocol}
				open={applyModalOpen}
				onOpenChange={setApplyModalOpen}
			/>
		</div>
	);
}
