import React, { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
	Calendar,
	CalendarDays,
	Clock,
	DollarSign,
	TrendingUp,
	UserCheck,
	Users,
	XCircle,
} from "lucide-react";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	useDashboardMetrics,
	type DashboardPeriod,
} from "@/hooks/useDashboardMetrics";
import { appointmentsApi, type AppointmentRow } from "@/api/v2";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateToLocalISO } from "@/utils/dateUtils";
import { endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { AIInsightsWidget } from "./AIInsightsWidget";
import { ClinicalEfficacyDashboard } from "@/components/analytics/ClinicalEfficacyDashboard";
import { EmptyStateEnhanced } from "@/components/ui/EmptyStateEnhanced";
import { LazyWidget } from "./LazyWidget";
import { EventosStatsWidget } from "@/components/eventos/EventosStatsWidget";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
	period?: DashboardPeriod;
}

interface SummaryCardProps {
	icon: React.ElementType;
	title: string;
	value: string | number;
	subtitle: string;
	tone?: "primary" | "blue" | "emerald" | "amber";
	badge?: string;
}

const toneMap = {
	primary: {
		icon: "bg-primary/10 text-primary",
		badge: "border-primary/15 bg-primary/5 text-primary",
	},
	blue: {
		icon: "bg-blue-500/10 text-blue-600",
		badge: "border-blue-500/15 bg-blue-500/5 text-blue-600",
	},
	emerald: {
		icon: "bg-emerald-500/10 text-emerald-600",
		badge: "border-emerald-500/15 bg-emerald-500/5 text-emerald-600",
	},
	amber: {
		icon: "bg-amber-500/10 text-amber-600",
		badge: "border-amber-500/15 bg-amber-500/5 text-amber-600",
	},
};

const SummaryCard = memo(function SummaryCard({
	icon: Icon,
	title,
	value,
	subtitle,
	tone = "primary",
	badge,
}: SummaryCardProps) {
	const styles = toneMap[tone];

	return (
		<Card className="rounded-[1.75rem] border-border/60 bg-background/85 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-md">
			<CardHeader className="space-y-3 pb-2">
				<div className="flex items-start justify-between gap-3">
					<div
						className={cn(
							"flex h-10 w-10 items-center justify-center rounded-2xl",
							styles.icon,
						)}
					>
						<Icon className="h-4 w-4" />
					</div>
					{badge ? (
						<Badge variant="outline" className={styles.badge}>
							{badge}
						</Badge>
					) : null}
				</div>
				<CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="text-3xl font-bold tracking-tight text-foreground">
					{value}
				</div>
				<p className="mt-2 text-xs leading-5 text-muted-foreground">
					{subtitle}
				</p>
			</CardContent>
		</Card>
	);
});

const CustomChartTooltip = memo(({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;

	return (
		<div className="rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur-xl">
			<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
				{label}
			</p>
			<div className="space-y-2">
				{payload.map((entry: any, index: number) => (
					<div
						key={index}
						className="flex items-center justify-between gap-4 text-xs"
					>
						<div className="flex items-center gap-2">
							<span
								className="h-2.5 w-2.5 rounded-full"
								style={{ backgroundColor: entry.color }}
							/>
							<span className="font-medium text-foreground/80">
								{entry.name}
							</span>
						</div>
						<span className="font-semibold text-foreground">
							{typeof entry.value === "number" &&
							entry.name.toLowerCase().includes("receita")
								? `R$ ${entry.value.toLocaleString("pt-BR")}`
								: entry.value}
						</span>
					</div>
				))}
			</div>
		</div>
	);
});

CustomChartTooltip.displayName = "CustomChartTooltip";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
	period = "hoje",
}) => {
	const navigate = useNavigate();
	const { organizationId } = useAuth();
	const { data: metrics, isLoading: metricsLoading } =
		useDashboardMetrics(period);

	const { data: agendamentosData, isLoading: appointmentsLoading } = useQuery({
		queryKey: ["admin-agenda", organizationId, period],
		enabled: !!organizationId,
		staleTime: 1000 * 60 * 2,
		queryFn: async () => {
			const now = new Date();
			const dateFrom =
				period === "semana"
					? formatDateToLocalISO(startOfWeek(now, { weekStartsOn: 1 }))
					: period === "mes"
						? formatDateToLocalISO(startOfMonth(now))
						: formatDateToLocalISO(now);
			const dateTo =
				period === "semana"
					? formatDateToLocalISO(endOfWeek(now, { weekStartsOn: 1 }))
					: formatDateToLocalISO(now);
			const response = await appointmentsApi.list({
				dateFrom,
				dateTo,
				limit: 20,
				offset: 0,
			});
			return (response?.data ?? []) as AppointmentRow[];
		},
	});

	const loading = metricsLoading || appointmentsLoading;

	const agendamentosProximos = useMemo(
		() =>
			(agendamentosData ?? [])
				.filter((item) => item.status !== "cancelado")
				.sort((a, b) =>
					String(a.appointment_time ?? a.time ?? "").localeCompare(
						String(b.appointment_time ?? b.time ?? ""),
					),
				)
				.slice(0, 6)
				.map((item) => ({
					id: item.id,
					horario: String(item.appointment_time ?? item.time ?? "--:--"),
					paciente: String(item.patient_name ?? "Paciente"),
					status: String(item.status ?? "agendado"),
				})),
		[agendamentosData],
	);

	const formattedRevenue = useMemo(() => {
		const revenue = metrics?.receitaMensal || 0;
		return revenue >= 1000
			? `R$ ${(revenue / 1000).toFixed(1)}k`
			: `R$ ${revenue.toLocaleString("pt-BR")}`;
	}, [metrics?.receitaMensal]);

	const maxAtendimentos = useMemo(
		() =>
			Math.max(
				...(metrics?.receitaPorFisioterapeuta?.map(
					(item) => item.atendimentos,
				) || [1]),
				1,
			),
		[metrics?.receitaPorFisioterapeuta],
	);

	const statusBadgeVariant = (
		status: string,
	): "default" | "secondary" | "destructive" | "outline" => {
		const s = String(status || "").toLowerCase();
		switch (s) {
			case "atendido":
			case "presenca_confirmada":
				return "default";
			case "agendado":
			case "avaliacao":
				return "secondary";
			case "cancelado":
			case "faltou":
			case "faltou_sem_aviso":
				return "destructive";
			case "faltou_com_aviso":
			case "remarcar":
				return "outline";
			default:
				return "default";
		}
	};

	const growthBadge =
		metrics?.crescimentoMensal != null
			? `${metrics.crescimentoMensal >= 0 ? "+" : ""}${metrics.crescimentoMensal}%`
			: undefined;

	return (
		<div className="space-y-5 pb-8">
			{/* ── 1. KPI Summary Cards ── */}
			{loading ? (
				<div
					className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
					data-testid="stats-cards"
				>
					{[1, 2, 3, 4].map((index) => (
						<Skeleton key={index} className="h-36 rounded-[1.75rem]" />
					))}
				</div>
			) : (
				<section data-testid="stats-cards">
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<SummaryCard
							icon={Users}
							title="Pacientes ativos"
							value={metrics?.pacientesAtivos || 0}
							subtitle={`Base total: ${metrics?.totalPacientes || 0} pacientes`}
							tone="primary"
							badge={`+${metrics?.pacientesNovos || 0}`}
						/>
						<SummaryCard
							icon={Calendar}
							title={`Ocupação ${metrics?.periodLabel ?? "Hoje"}`}
							value={`${metrics?.taxaOcupacao || 0}%`}
							subtitle={`${metrics?.agendamentosHoje || 0} slots ocupados no período`}
							tone="blue"
						/>
						<SummaryCard
							icon={DollarSign}
							title="Receita mensal"
							value={formattedRevenue}
							subtitle={`Mês anterior: R$ ${metrics?.receitaMesAnterior?.toLocaleString("pt-BR") || 0}`}
							tone="emerald"
							badge={growthBadge}
						/>
						<SummaryCard
							icon={XCircle}
							title="No-show"
							value={`${metrics?.taxaNoShow || 0}%`}
							subtitle="Média móvel dos últimos 30 dias"
							tone="amber"
							badge="Meta 10%"
						/>
					</div>
				</section>
			)}

			{/* ── 2. Agenda + Atalhos ── */}
			<section aria-label="Agenda e atalhos">
				<div className="grid gap-5 lg:grid-cols-7">
					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl lg:col-span-4">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
										<Clock className="h-4 w-4" />
									</div>
									<div>
										<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
											Agenda
										</p>
										<CardTitle className="mt-1 text-lg font-semibold">
											Próximos atendimentos
										</CardTitle>
									</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="rounded-xl border-border/60 bg-background/80"
									onClick={() => navigate("/agenda")}
								>
									Ver todos
								</Button>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							{appointmentsLoading ? (
								<div className="space-y-3">
									{[1, 2, 3].map((index) => (
										<Skeleton key={index} className="h-16 rounded-2xl" />
									))}
								</div>
							) : agendamentosProximos.length === 0 ? (
								<EmptyStateEnhanced
									icon={Clock}
									title="Agenda livre"
									description="Não há compromissos para este período."
									actionLabel="Abrir agenda"
									onAction={() => navigate("/agenda")}
									className="py-12"
								/>
							) : (
								<div className="space-y-3">
									{agendamentosProximos.map((agendamento) => (
										<div
											key={agendamento.id}
											className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm transition-colors hover:border-primary/20"
										>
											<div className="flex min-w-0 items-center gap-3">
												<div className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary shrink-0">
													{agendamento.horario}
												</div>
												<div className="min-w-0">
													<p className="truncate text-sm font-semibold text-foreground">
														{agendamento.paciente}
													</p>
													<p className="text-xs text-muted-foreground">
														Atendimento clínico
													</p>
												</div>
											</div>
											<Badge
												variant={statusBadgeVariant(agendamento.status)}
												className="text-[10px] uppercase tracking-[0.14em] shrink-0"
											>
												{agendamento.status}
											</Badge>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl lg:col-span-3">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<CalendarDays className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
										Operação
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Atalhos do gestor
									</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="grid gap-3 p-5 sm:grid-cols-2">
							<Button
								className="h-20 flex-col items-start justify-between rounded-2xl px-4 py-4 text-left"
								onClick={() => navigate("/patients")}
							>
								<Users className="h-5 w-5" />
								<span className="text-sm font-semibold">Pacientes</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex-col items-start justify-between rounded-2xl border-border/60 bg-background px-4 py-4 text-left"
								onClick={() => navigate("/agenda")}
							>
								<Calendar className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Agenda</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex-col items-start justify-between rounded-2xl border-border/60 bg-background px-4 py-4 text-left"
								onClick={() => navigate("/eventos")}
							>
								<CalendarDays className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Eventos</span>
							</Button>
							<Button
								variant="outline"
								className="h-20 flex-col items-start justify-between rounded-2xl border-border/60 bg-background px-4 py-4 text-left"
								onClick={() => navigate("/financeiro")}
							>
								<DollarSign className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Financeiro</span>
							</Button>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* ── 3. Charts ── */}
			<section aria-label="Gráficos e desempenho">
				<div className="grid gap-5 lg:grid-cols-2">
					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<TrendingUp className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
										Tendência
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Tendência semanal
									</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							<div className="h-[220px] w-full">
								<ResponsiveContainer width="100%" height="100%">
									{!metrics?.tendenciaSemanal ||
									metrics.tendenciaSemanal.length === 0 ? (
										<EmptyStateEnhanced
											icon={TrendingUp}
											title="Sem dados semanais"
											description="Aguardando os primeiros agendamentos."
											className="py-10"
										/>
									) : (
										<BarChart
											data={metrics.tendenciaSemanal}
											margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
										>
											<defs>
												<linearGradient
													id="adminPrimaryGradient"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="hsl(var(--primary))"
														stopOpacity={0.9}
													/>
													<stop
														offset="95%"
														stopColor="hsl(var(--primary))"
														stopOpacity={0.18}
													/>
												</linearGradient>
												<linearGradient
													id="adminSuccessGradient"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="hsl(var(--success))"
														stopOpacity={0.9}
													/>
													<stop
														offset="95%"
														stopColor="hsl(var(--success))"
														stopOpacity={0.18}
													/>
												</linearGradient>
											</defs>
											<XAxis
												dataKey="dia"
												axisLine={false}
												tickLine={false}
												tick={{
													fill: "hsl(var(--muted-foreground))",
													fontSize: 10,
													fontWeight: 700,
												}}
												dy={10}
											/>
											<YAxis
												axisLine={false}
												tickLine={false}
												tick={{
													fill: "hsl(var(--muted-foreground))",
													fontSize: 10,
													fontWeight: 700,
												}}
												width={36}
											/>
											<Tooltip
												content={<CustomChartTooltip />}
												cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
											/>
											<Bar
												dataKey="agendamentos"
												name="Agendamentos"
												radius={[8, 8, 0, 0]}
												fill="url(#adminPrimaryGradient)"
												barSize={18}
											/>
											<Bar
												dataKey="concluidos"
												name="Concluídos"
												radius={[8, 8, 0, 0]}
												fill="url(#adminSuccessGradient)"
												barSize={18}
											/>
										</BarChart>
									)}
								</ResponsiveContainer>
							</div>
						</CardContent>
					</Card>

					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
									<UserCheck className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600/80">
										Profissionais
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Ranking de desempenho
									</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							{(metrics?.receitaPorFisioterapeuta?.length || 0) === 0 ? (
								<EmptyStateEnhanced
									icon={UserCheck}
									title="Nenhum atendimento"
									description="Dados de desempenho em breve."
									className="py-10"
								/>
							) : (
								<div className="space-y-3">
									{metrics?.receitaPorFisioterapeuta.map((fisio, index) => (
										<div
											key={fisio.id}
											className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm"
										>
											<div className="flex items-center justify-between gap-3">
												<div className="flex min-w-0 items-center gap-3">
													<span
														className={cn(
															"flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold",
															index === 0
																? "bg-primary text-primary-foreground"
																: "bg-muted text-muted-foreground",
														)}
													>
														{index + 1}
													</span>
													<div className="min-w-0">
														<p className="truncate text-sm font-semibold text-foreground">
															{fisio.nome}
														</p>
														<p className="text-xs text-muted-foreground">
															{fisio.atendimentos} atendimentos
														</p>
													</div>
												</div>
												<span className="text-sm font-semibold text-emerald-600 shrink-0">
													R$ {fisio.receita.toLocaleString("pt-BR")}
												</span>
											</div>
											<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/70">
												<div
													className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
													style={{
														width: `${(fisio.atendimentos / maxAtendimentos) * 100}%`,
													}}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</section>

			{/* ── 4. Clinical Efficacy ── */}
			<section aria-label="Eficácia Clínica">
				<ClinicalEfficacyDashboard />
			</section>

			{/* ── 5. AI Insights + Eventos ── */}
			<section>
				<div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
					<AIInsightsWidget metrics={metrics} />

					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
										Sinais operacionais
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Eventos e ritmo da operação
									</CardTitle>
								</div>
								<Badge
									variant="outline"
									className="border-primary/15 bg-primary/5 text-primary shrink-0"
								>
									{metrics?.periodLabel ?? "Hoje"}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							<LazyWidget height={168}>
								<EventosStatsWidget />
							</LazyWidget>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
};

function adminDashboardAreEqual(
	prev: AdminDashboardProps,
	next: AdminDashboardProps,
) {
	return prev.period === next.period;
}

export default memo(AdminDashboard, adminDashboardAreEqual);
AdminDashboard.displayName = "AdminDashboard";
