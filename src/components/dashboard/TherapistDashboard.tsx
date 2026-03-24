import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
	Activity,
	AlertTriangle,
	Calendar,
	Clock,
	MessageSquare,
	Plus,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	format,
	isSameDay,
	isWithinInterval,
	startOfWeek,
	endOfWeek,
	startOfMonth,
	differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartWidget } from "./ChartWidget";
import { PredictiveRetentionWidget } from "@/components/analytics/PredictiveRetentionWidget";
import { Profile } from "@/types/auth";
import { useAppointments } from "@/hooks/useAppointments";
import { useRenderTracking } from "@/hooks/useRenderTracking";
import type { DashboardPeriod } from "@/hooks/useDashboardMetrics";
import { cn } from "@/lib/utils";

interface TherapistDashboardProps {
	lastUpdate: Date;
	profile: Profile;
	period?: DashboardPeriod;
}

interface SummaryCardProps {
	icon: React.ElementType;
	label: string;
	value: string | number;
	description: string;
	tone?: "primary" | "emerald" | "amber";
}

const toneStyles = {
	primary: "bg-primary/10 text-primary",
	emerald: "bg-emerald-500/10 text-emerald-600",
	amber: "bg-amber-500/10 text-amber-600",
};

function SummaryCard({
	icon: Icon,
	label,
	value,
	description,
	tone = "primary",
}: SummaryCardProps) {
	return (
		<Card className="rounded-[1.75rem] border-border/60 bg-background/85 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
			<CardHeader className="space-y-3 pb-2">
				<div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-2xl",
						toneStyles[tone],
					)}
				>
					<Icon className="h-4 w-4" />
				</div>
				<CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="text-3xl font-bold tracking-tight text-foreground">
					{value}
				</div>
				<p className="mt-2 text-xs leading-5 text-muted-foreground">
					{description}
				</p>
			</CardContent>
		</Card>
	);
}

export function TherapistDashboard({
	lastUpdate,
	profile,
	period = "hoje",
}: TherapistDashboardProps) {
	useRenderTracking("TherapistDashboard", { period });
	const navigate = useNavigate();
	const { data: allAppointments = [], isLoading: appointmentsLoading } =
		useAppointments();

	const dashboardStats = useMemo(() => {
		if (!profile?.id || allAppointments.length === 0) {
			return {
				todayAppointments: [],
				stats: {
					todayAppointments: 0,
					myPatients: 0,
					completedSessions: 0,
					avgSatisfaction: 4.8,
					occupancyRate: 0,
					avgSessionsPerPatient: 0,
					patientsAtRisk: 0,
				},
				progressData: [],
				periodLabel: "Hoje",
			};
		}

		const today = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const periodRange =
			period === "semana"
				? {
						start: startOfWeek(today, { weekStartsOn: 1 }),
						end: endOfWeek(today, { weekStartsOn: 1 }),
					}
				: period === "mes"
					? { start: startOfMonth(today), end: today }
					: { start: today, end: today };

		const periodLabel =
			period === "semana"
				? "Esta Semana"
				: period === "mes"
					? "Mês Atual"
					: "Hoje";

		const todayApts = allAppointments
			.filter((apt) => {
				const aptDate = new Date(apt.date);
				const inPeriod =
					period === "hoje"
						? isSameDay(aptDate, today)
						: isWithinInterval(aptDate, periodRange);
				return inPeriod && apt.therapistId === profile.id;
			})
			.map((apt) => ({
				id: apt.id,
				patient_name: apt.patientName,
				appointment_time: apt.time,
				appointment_date: format(new Date(apt.date), "yyyy-MM-dd"),
				status: apt.status,
				type: apt.type,
				room: "",
				patient_phone: apt.phone,
			}));

		const totalCapacityMinutes = 480;
		const bookedMinutes = todayApts.length * 60;
		const occupancyRate = Math.round(
			(bookedMinutes / totalCapacityMinutes) * 100,
		);

		const uniquePatientsSet = new Set(
			allAppointments
				.filter(
					(apt) =>
						new Date(apt.date) >= thirtyDaysAgo &&
						apt.therapistId === profile.id,
				)
				.map((apt) => apt.patientId),
		);
		const myPatients = uniquePatientsSet.size;

		const completedSessions = allAppointments.filter((apt) => {
			const s = (apt.status || "").toLowerCase();
			return (
				(s === "atendido" || s === "concluido" || s === "realizado") &&
				apt.therapistId === profile.id
			);
		}).length;

		const lastAppointmentsByPatient = new Map<string, Date>();
		allAppointments.forEach((apt) => {
			if (apt.patientId && apt.therapistId === profile.id) {
				const existing = lastAppointmentsByPatient.get(apt.patientId);
				const aptDate = new Date(apt.date);
				if (!existing || aptDate > existing) {
					lastAppointmentsByPatient.set(apt.patientId, aptDate);
				}
			}
		});

		let patientsAtRisk = 0;
		lastAppointmentsByPatient.forEach((lastDate) => {
			if (differenceInDays(new Date(), lastDate) > 30) {
				patientsAtRisk++;
			}
		});

		const recentAptsCount = allAppointments.filter(
			(apt) =>
				new Date(apt.date) >= thirtyDaysAgo && apt.therapistId === profile.id,
		).length;

		const avgSessionsPerPatient =
			myPatients > 0
				? parseFloat((recentAptsCount / myPatients).toFixed(1))
				: 0;

		const progressChartData = [];
		for (let i = 6; i >= 0; i -= 1) {
			const date = new Date();
			date.setDate(date.getDate() - i * 5);
			progressChartData.push({
				name: format(date, "dd/MM"),
				value: Math.floor(Math.random() * 20) + 70,
			});
		}

		return {
			todayAppointments: todayApts,
			stats: {
				todayAppointments: todayApts.length,
				myPatients,
				completedSessions,
				avgSatisfaction: 4.8,
				occupancyRate,
				avgSessionsPerPatient,
				patientsAtRisk,
			},
			progressData: progressChartData,
			periodLabel,
		};
	}, [allAppointments, profile.id, period]);

	const { todayAppointments, stats, progressData, periodLabel } =
		dashboardStats;
	const isLoading = appointmentsLoading;

	const occupancyLabel =
		stats.occupancyRate < 30
			? "Baixa ocupação"
			: stats.occupancyRate < 70
				? "Ocupação moderada"
				: "Alta ocupação";

	return (
		<div className="space-y-6">
			<Card className="rounded-[2rem] border-border/60 bg-background/75 shadow-sm backdrop-blur-xl">
				<CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
							Visão clínica
						</p>
						<h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
							Dr(a). {profile.full_name?.split(" ")[0]}
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							{periodLabel} • atualização às{" "}
							{format(lastUpdate, "HH:mm", { locale: ptBR })}
						</p>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
						<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Sessões concluídas
							</p>
							<p className="mt-2 text-lg font-semibold text-foreground">
								{stats.completedSessions}
							</p>
						</div>
						<div className="rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm">
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Satisfação média
							</p>
							<p className="mt-2 text-lg font-semibold text-foreground">
								{stats.avgSatisfaction.toFixed(1)}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-3" data-testid="stats-cards">
				<SummaryCard
					icon={TrendingUp}
					label="Ocupação"
					value={`${stats.occupancyRate}%`}
					description={`${occupancyLabel} • ${periodLabel}`}
					tone="primary"
				/>
				<SummaryCard
					icon={Calendar}
					label="Retenção"
					value={stats.avgSessionsPerPatient}
					description="Sessões por paciente nos últimos 30 dias"
					tone="emerald"
				/>
				<SummaryCard
					icon={AlertTriangle}
					label="Pacientes em risco"
					value={stats.patientsAtRisk}
					description="Sem consulta há mais de 30 dias"
					tone="amber"
				/>
			</div>

			<div className="grid gap-6 lg:grid-cols-12">
				<Card
					className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl lg:col-span-7"
					data-testid="today-schedule"
				>
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
										Atendimentos do período
									</CardTitle>
								</div>
							</div>
							<Badge
								variant="outline"
								className="border-primary/15 bg-primary/5 text-primary"
							>
								{periodLabel}
							</Badge>
						</div>
					</CardHeader>

					<CardContent className="p-5">
						{isLoading ? (
							<div className="space-y-3">
								{[1, 2, 3, 4].map((index) => (
									<div
										key={index}
										className="h-16 animate-pulse rounded-2xl bg-muted/50"
									/>
								))}
							</div>
						) : todayAppointments.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
								<p className="text-sm font-medium text-foreground">
									Nenhum agendamento neste período
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									A agenda será atualizada assim que novos atendimentos
									entrarem.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{todayAppointments.slice(0, 6).map((appointment) => (
									<div
										key={appointment.id}
										className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3 shadow-sm transition-colors hover:border-primary/20"
									>
										<div className="flex min-w-0 items-center gap-3">
											<div className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
												{appointment.appointment_time}
											</div>
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-foreground">
													{appointment.patient_name}
												</p>
												<p className="text-xs text-muted-foreground">
													Atendimento clínico
												</p>
											</div>
										</div>
										<Badge
											variant="outline"
											className={cn(
												"text-[10px] uppercase tracking-[0.14em]",
												appointment.status === "atendido" ||
													appointment.status === "concluido"
													? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
													: appointment.status === "cancelado" ||
															appointment.status === "faltou"
														? "border-red-500/20 bg-red-500/10 text-red-600"
														: "border-primary/20 bg-primary/10 text-primary",
											)}
										>
											{appointment.status === "atendido" ||
											appointment.status === "concluido"
												? "Atendido"
												: appointment.status === "cancelado"
													? "Cancelado"
													: appointment.status === "faltou"
														? "Faltou"
														: "Agendado"}
										</Badge>
									</div>
								))}
							</div>
						)}

						<div className="mt-4">
							<Button
								variant="outline"
								className="rounded-xl border-border/60 bg-background/80"
								onClick={() => navigate("/agenda")}
							>
								Ver agenda completa
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6 lg:col-span-5">
					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<Plus className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
										Operação
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Ações rápidas
									</CardTitle>
								</div>
							</div>
						</CardHeader>

						<CardContent className="grid gap-3 p-5 sm:grid-cols-2">
							<Button
								className="h-24 flex-col items-start justify-between rounded-2xl px-4 py-4 text-left"
								onClick={() => navigate("/pacientes")}
							>
								<Users className="h-5 w-5" />
								<span className="text-sm font-semibold">Novo paciente</span>
							</Button>
							<Button
								variant="outline"
								className="h-24 flex-col items-start justify-between rounded-2xl border-border/60 bg-background"
								onClick={() => navigate("/agenda")}
							>
								<Calendar className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Agendar</span>
							</Button>
							<Button
								variant="outline"
								className="h-24 flex-col items-start justify-between rounded-2xl border-border/60 bg-background"
								onClick={() => navigate("/relatorios")}
							>
								<TrendingUp className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Relatórios</span>
							</Button>
							<Button
								variant="outline"
								className="h-24 flex-col items-start justify-between rounded-2xl border-border/60 bg-background"
								onClick={() => navigate("/comunicacao")}
							>
								<MessageSquare className="h-5 w-5 text-primary" />
								<span className="text-sm font-semibold">Mensagens</span>
							</Button>
						</CardContent>
					</Card>

					<PredictiveRetentionWidget />

					<Card className="rounded-[2rem] border-border/60 bg-background/80 shadow-sm backdrop-blur-xl">
						<CardHeader className="border-b border-border/60 pb-4">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<Activity className="h-4 w-4" />
								</div>
								<div>
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
										Evolução
									</p>
									<CardTitle className="mt-1 text-lg font-semibold">
										Evolução global
									</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-5">
							<ChartWidget
								title=""
								data={progressData}
								type="line"
								loading={isLoading}
								height={260}
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
