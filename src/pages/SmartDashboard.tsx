import { format, parseISO } from "date-fns";
import {
	Activity,
	AlertTriangle,
	ArrowUpRight,
	BarChart3,
	Brain,
	Cake,
	Calendar,
	CheckCircle,
	ClipboardList,
	DollarSign,
	FileText,
	LayoutDashboard,
	MessageCircle,
	MoreHorizontal,
	Plus,
	RotateCcw,
	Save,
	Send,
	Sparkles,
	Stethoscope,
	Target,
	Thermometer,
	TrendingUp,
	Users,
	Wand2,
	Zap,
} from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import type { Layout } from "react-grid-layout";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { toast } from "sonner";
import { type Notification } from "@/api/v2/communications";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import type { GridItem } from "@/components/ui/DraggableGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { GridWidget } from "@/components/ui/GridWidget";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSmartDashboardData } from "@/hooks/useSmartDashboard";
import type { AppointmentRow, PatientRow } from "@/types/workers";

// --- Types & Constants ---
type ViewMode = "today" | "week" | "month" | "custom";

const DraggableGrid = lazy(() =>
	import("@/components/ui/DraggableGrid").then((module) => ({
		default: module.DraggableGrid,
	})),
);
export default function SmartDashboard() {
	const [searchParams, setSearchParams] = useSearchParams();
	const viewMode = (searchParams.get("view") || "today") as ViewMode;

	const { data, mutations } = useSmartDashboardData(viewMode);
	const {
		metrics,
		predictions,
		medicalReturnsUpcoming,
		forecasts,
		staffPerformance,
		selfAssessments,
		notifications,
		birthdaysToday,
		staffBirthdaysToday,
		patients,
		appointmentsToday,
	} = data;

	const navigate = useNavigate();

	const [isEditable, setIsEditable] = useState(false);
	const [savedLayout, setSavedLayout] = useState<Layout[]>([]);
	const [genkitSummary, setGenkitSummary] = useState<any>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

	const handleViewModeChange = (mode: ViewMode) => {
		setSearchParams({ view: mode }, { replace: true });
	};

	// --- Memoized Data for Charts ---
	const performanceData = useMemo(
		() =>
			staffPerformance.map((s: any) => ({
				name: s.therapist_name?.split(" ")[0] || "Terapêuta",
				rebook: Math.round((s.rebook_rate || 0) * 100),
				appointments: s.total_appointments,
			})),
		[staffPerformance],
	);

	const assessmentData = useMemo(
		() =>
			selfAssessments
				.map((a: any) => ({
					date: format(parseISO(a.created_at), "dd/MM"),
					pain: a.pain_level,
					mobility: a.mobility_score,
				}))
				.slice(-10),
		[selfAssessments],
	);

	const revenueChartData = useMemo(
		() =>
			forecasts.map((f: any) => ({
				date: format(parseISO(f.date), "dd/MM"),
				previsao: f.predicted_revenue,
				real: f.actual_revenue,
			})),
		[forecasts],
	);

	const handleGenerateSummary = async () => {
		setIsGeneratingSummary(true);
		try {
			const summary = await mutations.generateSummary({
				patients,
				appointments: appointmentsToday,
			});
			setGenkitSummary(summary);
		} catch {
			// errors handled in hook (toast.error)
		} finally {
			setIsGeneratingSummary(false);
		}
	};

	const handleSaveLayout = (layout: Layout[]) => {
		// In a real app, this would call an API. For now, we just toast.
		localStorage.setItem("dashboard-layout", JSON.stringify(layout));
		toast.success("Layout salvo com sucesso!");
		setIsEditable(false);
	};

	const SMART_DASHBOARD_GRID_COLS = { xl: 12, lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 };

	const statsCards = [
		{
			id: "stat-appointments",
			icon: Calendar,
			label: "Agendamentos",
			value:
				viewMode === "today"
					? metrics?.agendamentosHoje || 0
					: metrics?.agendamentosSemana || 0,
			subLabel: "vs. período anterior",
			trend: "+12%",
			gradient: "from-blue-600 to-indigo-600",
			bgGradient: "from-blue-500/10 to-indigo-500/5",
			borderColor: "border-blue-500/20",
		},
		{
			id: "stat-revenue",
			icon: DollarSign,
			label: "Faturamento",
			value: `R$ ${metrics?.receitaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}`,
			subLabel: `${metrics?.crescimentoMensal || 0}% cresc.`,
			trend:
				metrics?.crescimentoMensal && metrics.crescimentoMensal > 0
					? `+${metrics.crescimentoMensal}%`
					: `${metrics?.crescimentoMensal || 0}%`,
			gradient: "from-emerald-600 to-teal-600",
			bgGradient: "from-emerald-500/10 to-teal-500/5",
			borderColor: "border-emerald-500/20",
		},
		{
			id: "stat-patients",
			icon: Users,
			label: "Pacientes Ativos",
			value: metrics?.pacientesAtivos || 0,
			subLabel: "em tratamento",
			trend: "+5",
			gradient: "from-violet-600 to-purple-600",
			bgGradient: "from-violet-500/10 to-purple-500/5",
			borderColor: "border-violet-500/20",
		},
		{
			id: "stat-nps",
			icon: Target,
			label: "Retenção Média",
			value: `${Math.round((staffPerformance[0]?.rebook_rate || 0.85) * 100)}%`,
			subLabel: "Taxa de re-agend.",
			trend: "+2%",
			gradient: "from-orange-600 to-amber-600",
			bgGradient: "from-orange-500/10 to-amber-500/5",
			borderColor: "border-orange-500/20",
		},
	];

	const gridItems: GridItem[] = useMemo(
		() => [
			// 1. QUICK STATS
			...statsCards.map((stat, i) => ({
				id: stat.id,
				content: (
					<GridWidget
						isDraggable={isEditable}
						className="h-full"
						variant="glass"
					>
						<div
							className={cn(
								"h-full relative overflow-hidden bg-gradient-to-br transition-all duration-500 group rounded-2xl border border-white/20 dark:border-white/5",
								stat.bgGradient,
							)}
						>
							<CardContent className="p-4 h-full flex flex-col justify-between">
								<div className="flex items-center justify-between mb-1">
									<div
										className={cn(
											"h-10 w-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110transition-transform duration-300",
											stat.gradient,
										)}
									>
										<stat.icon className="h-5 w-5 text-white" />
									</div>
									<div className="flex flex-col items-end">
										<Badge
											variant="outline"
											className="bg-white/10 border-white/20 text-[10px] py-0 px-1.5 font-bold text-foreground"
										>
											<ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />{" "}
											{stat.trend}
										</Badge>
									</div>
								</div>
								<div>
									<p className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
										{stat.label}
									</p>
									<p className="text-2xl font-black tracking-tighter mt-1">
										{stat.value}
									</p>
									<p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
										{stat.subLabel}
									</p>
								</div>
							</CardContent>
						</div>
					</GridWidget>
				),
				defaultLayout: { w: 3, h: 3, x: (i * 3) % 12, y: 0, minW: 3, minH: 3 },
			})),

			// 2. RECOVERY TRENDS
			{
				id: "chart-recovery",
				content: (
					<GridWidget
						title="Evolução de Recuperação"
						icon={<Activity className="h-4 w-4 text-primary" />}
						isDraggable={isEditable}
						variant="glass"
						headerActions={
							<Badge variant="secondary" className="text-[10px] bg-primary/5">
								Real-time Data
							</Badge>
						}
					>
						<div className="h-full p-2">
							{assessmentData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={assessmentData}>
										<defs>
											<linearGradient
												id="colorPain"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#ef4444"
													stopOpacity={0.2}
												/>
												<stop
													offset="95%"
													stopColor="#ef4444"
													stopOpacity={0}
												/>
											</linearGradient>
											<linearGradient
												id="colorMobility"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor="#10b981"
													stopOpacity={0.2}
												/>
												<stop
													offset="95%"
													stopColor="#10b981"
													stopOpacity={0}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											className="stroke-muted/30"
											vertical={false}
										/>
										<XAxis
											dataKey="date"
											className="text-[10px]"
											tick={{ fontSize: 10 }}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											className="text-[10px]"
											tick={{ fontSize: 10 }}
											axisLine={false}
											tickLine={false}
											domain={[0, 10]}
										/>
										<Tooltip
											contentStyle={{
												borderRadius: "12px",
												border: "none",
												boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
											}}
											itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
										/>
										<Area
											type="monotone"
											dataKey="pain"
											stroke="#ef4444"
											strokeWidth={3}
											fill="url(#colorPain)"
											name="Nível de Dor"
										/>
										<Area
											type="monotone"
											dataKey="mobility"
											stroke="#10b981"
											strokeWidth={3}
											fill="url(#colorMobility)"
											name="Mobilidade"
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="h-full flex flex-col items-center justify-center text-center p-4">
									<Thermometer className="h-8 w-8 text-muted-foreground/30 mb-2" />
									<p className="text-xs text-muted-foreground">
										Aguardando avaliações dos pacientes para gerar tendências de
										recuperação.
									</p>
								</div>
							)}
						</div>
					</GridWidget>
				),
				defaultLayout: { w: 6, h: 6, x: 0, y: 3, minW: 4, minH: 4 },
			},

			// 3. REVENUE FORECAST
			{
				id: "chart-revenue",
				content: (
					<GridWidget
						title="Projeção Financeira"
						icon={<DollarSign className="h-4 w-4" />}
						isDraggable={isEditable}
						variant="glass"
					>
						<div className="h-full p-2">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={revenueChartData}>
									<defs>
										<linearGradient
											id="colorPrevisao"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
											<stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-muted/30"
										vertical={false}
									/>
									<XAxis
										dataKey="date"
										className="text-[10px]"
										tick={{ fontSize: 10 }}
										axisLine={false}
										tickLine={false}
									/>
									<YAxis
										className="text-[10px]"
										tick={{ fontSize: 10 }}
										axisLine={false}
										tickLine={false}
									/>
									<Tooltip />
									<Area
										type="stepAfter"
										dataKey="previsao"
										stroke="#3B82F6"
										strokeWidth={2}
										fill="url(#colorPrevisao)"
										name="Previsão"
									/>
									<Area
										type="monotone"
										dataKey="real"
										stroke="#10B981"
										strokeWidth={2}
										fill="none"
										name="Real"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</GridWidget>
				),
				defaultLayout: { w: 6, h: 6, x: 6, y: 3, minW: 4, minH: 4 },
			},

			// 4. AI INSIGHTS
			{
				id: "ai-insights",
				content: (
					<GridWidget
						title="Insights Preditivos"
						icon={<Sparkles className="h-4 w-4 text-amber-500" />}
						isDraggable={isEditable}
						variant="glass"
						headerActions={
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 rounded-full hover:bg-primary/10"
								onClick={handleGenerateSummary}
								disabled={isGeneratingSummary}
							>
								<Wand2
									className={cn(
										"h-3.5 w-3.5",
										isGeneratingSummary && "animate-spin text-primary",
									)}
								/>
							</Button>
						}
					>
						<ScrollArea className="h-full pr-4">
							<div className="space-y-4 pb-4">
								{genkitSummary ? (
									<div className="p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 animate-in fade-in zoom-in-95 duration-500">
										<div className="flex items-start gap-3">
											<div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
												<Brain className="h-4 w-4 text-primary" />
											</div>
											<div className="min-w-0">
												<p className="text-sm font-bold text-primary tracking-tight">
													Análise Genkit AI
												</p>
												<p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-medium">
													{genkitSummary.summary}
												</p>
												{genkitSummary.clinicalAdvice && (
													<div className="mt-3 p-2.5 rounded-xl bg-white/50 dark:bg-black/20 border border-primary/10">
														<p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-1">
															Recomendação:
														</p>
														<p className="text-[11px] text-muted-foreground leading-snug">
															{genkitSummary.clinicalAdvice}
														</p>
													</div>
												)}
											</div>
										</div>
									</div>
								) : (
									<div
										className="p-4 rounded-2xl bg-muted/20 border border-dashed border-border/50 text-center group cursor-pointer hover:border-primary/30 transition-colors"
										onClick={handleGenerateSummary}
									>
										<Zap className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2 group-hover:text-primary/50 transition-colors" />
										<p className="text-xs font-semibold text-muted-foreground/60">
											Gerar análise preditiva baseada nos dados atuais dos
											pacientes.
										</p>
									</div>
								)}

								<div className="space-y-2">
									<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
										Risco de Abandono (No-Show)
									</p>
									{predictions.filter((p) => p.no_show_probability > 0.4)
										.length > 0 ? (
										predictions
											.filter((p) => p.no_show_probability > 0.4)
											.slice(0, 3)
											.map((p, i) => (
												<div
													key={i}
													className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
												>
													<div className="flex items-center gap-2.5">
														<div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
														<span className="text-xs font-bold text-foreground">
															Paciente #{p.patient_id.slice(0, 4)}
														</span>
													</div>
													<Badge
														variant="outline"
														className="text-[10px] font-bold bg-amber-500/10 text-amber-700 border-amber-500/20"
													>
														{Math.round(p.no_show_probability * 100)}% Risco
													</Badge>
												</div>
											))
									) : (
										<div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
											<CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
											<span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
												Nenhum risco crítico detectado
											</span>
										</div>
									)}
								</div>
							</div>
						</ScrollArea>
					</GridWidget>
				),
				defaultLayout: { w: 4, h: 8, x: 0, y: 9, minW: 3, minH: 4 },
			},

			// 5. THERAPIST PERFORMANCE
			{
				id: "staff-performance",
				content: (
					<GridWidget
						title="Performance da Equipe"
						icon={<Users className="h-4 w-4" />}
						isDraggable={isEditable}
						variant="glass"
					>
						<div className="h-full p-2 flex flex-col">
							<ResponsiveContainer width="100%" height="60%">
								<BarChart data={performanceData}>
									<CartesianGrid
										strokeDasharray="3 3"
										className="stroke-muted/30"
										vertical={false}
									/>
									<XAxis
										dataKey="name"
										className="text-[10px]"
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										className="text-[10px]"
										tickLine={false}
										axisLine={false}
										hide
									/>
									<Tooltip />
									<Bar
										dataKey="rebook"
										fill="#6366f1"
										radius={[4, 4, 0, 0]}
										name="Re-agendamento %"
									/>
								</BarChart>
							</ResponsiveContainer>
							<div className="mt-2 space-y-2 overflow-y-auto pr-1">
								{staffPerformance.slice(0, 3).map((s, i) => (
									<div
										key={i}
										className="flex items-center justify-between text-[11px] p-1.5 rounded-lg hover:bg-muted/30"
									>
										<span className="font-bold text-muted-foreground">
											{s.therapist_name?.split(" ")[0]}
										</span>
										<div className="flex items-center gap-3">
											<span className="text-foreground font-medium">
												{s.total_appointments} atend.
											</span>
											<span
												className={cn(
													"font-black",
													(s.rebook_rate || 0) > 0.8
														? "text-emerald-500"
														: "text-amber-500",
												)}
											>
												{Math.round((s.rebook_rate || 0) * 100)}%
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					</GridWidget>
				),
				defaultLayout: { w: 4, h: 8, x: 4, y: 9, minW: 3, minH: 4 },
			},

			// 6. QUICK ACTIONS
			{
				id: "quick-actions",
				content: (
					<GridWidget
						title="Ações Rápidas"
						icon={<Zap className="h-4 w-4 text-primary" />}
						isDraggable={isEditable}
						variant="glass"
					>
						<div className="grid grid-cols-2 gap-2 p-2 h-full">
							{[
								{
									label: "Relatório Médico",
									icon: FileText,
									color: "bg-blue-500",
									path: "/relatorios/medico",
								},
								{
									label: "Novo Agend.",
									icon: Plus,
									color: "bg-emerald-500",
									path: "/agendamentos",
								},
								{
									label: "Avaliação",
									icon: ClipboardList,
									color: "bg-violet-500",
									path: "/pacientes",
								},
								{
									label: "Enviar Whats",
									icon: Send,
									color: "bg-teal-500",
									path: "/marketing",
								},
							].map((action, i) => (
								<button
									key={i}
									onClick={() => navigate(action.path)}
									className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/20 transition-all group"
								>
									<div
										className={cn(
											"h-8 w-8 rounded-xl flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform text-white",
											action.color,
										)}
									>
										<action.icon className="h-4 w-4" />
									</div>
									<span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
										{action.label}
									</span>
								</button>
							))}
						</div>
					</GridWidget>
				),
				defaultLayout: { w: 4, h: 4, x: 8, y: 9, minW: 3, minH: 3 },
			},

			// 7. REAL-TIME ACTIVITY
			{
				id: "activity-feed",
				content: (
					<GridWidget
						title="Feed de Atividades"
						icon={<Activity className="h-4 w-4" />}
						isDraggable={isEditable}
						variant="glass"
					>
						<ScrollArea className="h-full">
							<div className="space-y-3 p-3">
								{notifications.length > 0 ? (
									notifications.map((notif) => (
										<div
											key={notif.id}
											className="flex gap-3 group animate-in slide-in-from-right-2 duration-300"
										>
											<div
												className={cn(
													"h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-12",
													notif.type === "success"
														? "bg-emerald-100 text-emerald-600"
														: notif.type === "warning"
															? "bg-amber-100 text-amber-600"
															: notif.type === "error"
																? "bg-red-100 text-red-600"
																: "bg-blue-100 text-blue-600",
												)}
											>
												{notif.type === "payment" ? (
													<DollarSign className="h-4 w-4" />
												) : notif.type === "appointment" ? (
													<Calendar className="h-4 w-4" />
												) : (
													<CheckCircle className="h-4 w-4" />
												)}
											</div>
											<div className="min-w-0">
												<p className="text-[11px] font-bold text-foreground truncate">
													{notif.title}
												</p>
												<p className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
													{notif.message}
												</p>
											</div>
										</div>
									))
								) : (
									<div className="text-center py-8 text-muted-foreground/40 italic text-xs">
										Aguardando novas atividades...
									</div>
								)}
							</div>
						</ScrollArea>
					</GridWidget>
				),
				defaultLayout: { w: 4, h: 4, x: 8, y: 13, minW: 3, minH: 3 },
			},
		],
		[
			statsCards,
			revenueChartData,
			assessmentData,
			performanceData,
			predictions,
			isEditable,
			notifications,
			navigate,
			genkitSummary,
			isGeneratingSummary,
			staffPerformance,
		],
	);

	return (
		<MainLayout maxWidth="7xl">
			<div
				className="space-y-6 pb-20 px-4 md:px-8"
				data-testid="smart-dashboard-page"
			>
				{/* Modern Header */}
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pt-4">
					<div className="flex items-center gap-5">
						<div className="relative">
							<div className="h-14 w-14 rounded-2xl bg-slate-900 dark:bg-white/10 flex items-center justify-center shadow-2xl ring-1 ring-white/20">
								<Brain className="h-7 w-7 text-white" />
							</div>
							<div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-background animate-pulse">
								<Sparkles className="h-3 w-3 text-white" />
							</div>
						</div>
						<div>
							<div className="flex items-center gap-2 mb-1">
								<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
								<p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
									Inteligência Clínica Ativa
								</p>
							</div>
							<h1 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
								Smart Dashboard
								<Badge
									variant="outline"
									className="text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20 tracking-widest px-2 py-0"
								>
									v2.0 Beta
								</Badge>
							</h1>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="flex items-center bg-secondary/30 p-1 rounded-2xl border border-border/50 shadow-inner">
							{["today", "week", "month"].map((mode) => (
								<Button
									key={mode}
									variant={viewMode === mode ? "default" : "ghost"}
									size="sm"
									onClick={() => handleViewModeChange(mode as ViewMode)}
									className={cn(
										"rounded-xl px-4 text-[10px] font-black uppercase tracking-widest h-8 transition-all duration-300",
										viewMode === mode && "shadow-lg scale-105",
									)}
								>
									{mode === "today"
										? "Hoje"
										: mode === "week"
											? "Semana"
											: "Mês"}
								</Button>
							))}
						</div>
						<Button
							variant="outline"
							size="icon"
							className="h-10 w-10 rounded-2xl bg-background/50 border-border/50 hover:bg-primary/5 hover:border-primary/20"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</div>
				</div>

				{/* Dynamic Alerts Section */}
				{medicalReturnsUpcoming.length > 0 && (
					<div
						className="bg-gradient-to-r from-blue-600/10 via-primary/5 to-transparent border-l-4 border-l-primary rounded-r-2xl p-4 flex items-center gap-5 group cursor-pointer hover:bg-primary/10 transition-all duration-300"
						onClick={() => navigate("/relatorios/medico")}
					>
						<div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
							<Stethoscope className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="font-black text-sm text-foreground flex items-center gap-2">
								Preparar Relatórios Médicos
								<Badge className="bg-primary text-white text-[10px] px-1.5 py-0 border-0">
									{medicalReturnsUpcoming.length}
								</Badge>
							</h3>
							<p className="text-xs text-muted-foreground font-medium truncate">
								{medicalReturnsUpcoming.length} pacientes possuem retornos
								médicos agendados para os próximos 14 dias.
								<span className="text-primary ml-1 font-bold underline-offset-4 hover:underline">
									Gerar documentação agora
								</span>
							</p>
						</div>
						<ArrowUpRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors mr-2" />
					</div>
				)}

				{/* Dashboard Control Bar */}
				<div className="flex items-center justify-between bg-background/40 backdrop-blur-md p-3 rounded-2xl border border-border/50 shadow-sm sticky top-4 z-40">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<LayoutDashboard className="h-4 w-4 text-primary" />
						</div>
						<div>
							<h2 className="text-sm font-black tracking-tight">
								Personalização
							</h2>
							<p className="text-[10px] text-muted-foreground font-medium">
								Layout Dinâmico
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						{isEditable ? (
							<>
								<Button
									variant="ghost"
									onClick={() => setIsEditable(false)}
									size="sm"
									className="text-[10px] font-black uppercase tracking-widest rounded-xl px-4 h-9"
								>
									Cancelar
								</Button>
								<Button
									onClick={() => handleSaveLayout(savedLayout)}
									size="sm"
									className="text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl px-5 h-9 shadow-lg shadow-primary/20"
								>
									<Save className="h-3.5 w-3.5" />
									Salvar Layout
								</Button>
							</>
						) : (
							<Button
								variant="outline"
								onClick={() => setIsEditable(true)}
								size="sm"
								className="text-[10px] font-black uppercase tracking-widest gap-2 rounded-xl px-4 h-9 border-border/50 hover:border-primary/30 transition-all"
							>
								<LayoutDashboard className="h-3.5 w-3.5" />
								Editar Grid
							</Button>
						)}
					</div>
				</div>

				{/* DRAGGABLE GRID */}
				<Suspense
					fallback={
						<div className="h-96 w-full flex flex-col items-center justify-center gap-4 bg-muted/5 rounded-3xl border border-dashed border-border/40">
							<div className="h-12 w-12 rounded-2xl bg-muted/10 border border-border/50 animate-pulse" />
							<p className="text-sm font-black text-muted-foreground/50 uppercase tracking-[0.2em] animate-pulse">
								Orquestrando Widgets...
							</p>
						</div>
					}
				>
					<DraggableGrid
						items={gridItems}
						onLayoutChange={(layout) => {
							if (isEditable) setSavedLayout(layout);
						}}
						layouts={
							savedLayout.length > 0
								? ({ 
									xl: savedLayout, 
									lg: savedLayout, 
									md: savedLayout, 
									sm: savedLayout, 
									xs: savedLayout, 
									xxs: savedLayout 
								} as any)
								: undefined
						}
						isEditable={isEditable}
						cols={SMART_DASHBOARD_GRID_COLS}
						rowHeight={70}
					/>
				</Suspense>
			</div>
		</MainLayout>
	);
}
