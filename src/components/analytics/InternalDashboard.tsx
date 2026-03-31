import React, { memo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
	appointmentsApi,
	financialApi,
	patientsApi,
	type AppointmentRow,
	type PatientPackageRow,
	type PatientRow,
} from "@/api/v2";
import {
	Users,
	UserMinus,
	UserPlus,
	TrendingUp,
	Clock,
	CreditCard,
} from "lucide-react";
import {
	format,
	subDays,
	subMonths,
	startOfDay,
	startOfMonth,
	eachMonthOfInterval,
	differenceInMonths,
	eachDayOfInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	LineChart,
	Line,
} from "recharts";
import { PatientHelpers } from "@/types";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";

const listPatients = async () => {
	const items: PatientRow[] = [];
	let offset = 0;
	const limit = 1000;

	while (offset < 10000) {
		const response = await patientsApi.list({
			sortBy: "name_asc",
			limit,
			offset,
		});
		const chunk = response?.data ?? [];
		items.push(...chunk);
		if (chunk.length < limit) break;
		offset += limit;
	}

	return items;
};

const listAppointments = async (
	dateFrom?: string,
	dateTo?: string,
	therapistId?: string,
) => {
	const items: AppointmentRow[] = [];
	let offset = 0;
	const limit = 1000;

	while (offset < 10000) {
		const response = await appointmentsApi.list({
			dateFrom,
			dateTo,
			limit,
			offset,
			therapistId: therapistId === "all" ? undefined : therapistId,
		});
		const chunk = response?.data ?? [];
		items.push(...chunk);
		if (chunk.length < limit) break;
		offset += limit;
	}

	return items;
};

function InternalDashboardComponent() {
	const { filters } = useAnalyticsFilters();
	const { dateRange, professionalId } = filters;

	// Pacientes ativos (com consulta no período selecionado)
	const { data: activePatients, isLoading: loadingActive } = useQuery({
		queryKey: ["active-patients-dashboard", dateRange, professionalId],
		enabled: !!dateRange?.from && !!dateRange?.to,
		queryFn: async () => {
			const from = format(dateRange!.from!, "yyyy-MM-dd");
			const to = format(dateRange!.to!, "yyyy-MM-dd");
			const snapshot = await listAppointments(from, to, professionalId);
			const patientIds = new Set(
				snapshot.map((appointment) => appointment.patient_id).filter(Boolean),
			);

			return patientIds.size;
		},
	});

	// Pacientes inativos (sem consulta há mais de 30 dias - mantemos 30 como padrão de inatividade, mas filtramos por profissional)
	const { data: inactivePatients, isLoading: loadingInactive } = useQuery({
		queryKey: ["inactive-patients-list", professionalId],
		queryFn: async () => {
			const thirtyDaysAgo = subDays(new Date(), 30);

			const [allPatients, recentAppointments] = await Promise.all([
				listPatients(),
				listAppointments(
					format(thirtyDaysAgo, "yyyy-MM-dd"),
					undefined,
					professionalId,
				),
			]);

			const activePatientIds = new Set(
				recentAppointments
					.map((appointment) => appointment.patient_id)
					.filter(Boolean),
			);

			// Filtrar inativos
			const inactive = allPatients.filter((p) => !activePatientIds.has(p.id));

			const allAppointments = await listAppointments(
				undefined,
				undefined,
				professionalId,
			);
			const lastAppointmentMap = new Map<string, string>();
			allAppointments.forEach((appointment) => {
				if (!appointment.patient_id || !appointment.date) return;
				const current = lastAppointmentMap.get(appointment.patient_id);
				if (!current || new Date(appointment.date) > new Date(current)) {
					lastAppointmentMap.set(appointment.patient_id, appointment.date);
				}
			});

			const inactiveWithLastAppointment = inactive
				.slice(0, 20)
				.map((patient) => ({
					...patient,
					lastAppointment: lastAppointmentMap.get(patient.id) || null,
				}));

			return {
				total: inactive.length,
				list: inactiveWithLastAppointment,
			};
		},
	});

	// Pacientes com sessões pagas disponíveis
	const { data: patientsWithSessions, isLoading: loadingSessions } = useQuery({
		queryKey: ["patients-with-sessions"],
		queryFn: async () => {
			const response = await financialApi.patientPackages.list({
				status: "active",
				limit: 500,
			});
			const packages = (response?.data ?? []) as PatientPackageRow[];

			return packages
				.filter((pkg) => Number(pkg.remaining_sessions ?? 0) > 0)
				.map((pkg) => ({
					id: pkg.id,
					patientId: pkg.patient_id,
					patientName: pkg.patient_name || "N/A",
					patientPhone: pkg.patient_phone || null,
					totalSessions: pkg.total_sessions,
					usedSessions: pkg.used_sessions,
					remainingSessions: pkg.remaining_sessions,
				}));
		},
	});

	// Novos pacientes por período
	const { data: newPatientsData } = useQuery({
		queryKey: ["new-patients-by-period", dateRange],
		enabled: !!dateRange?.from && !!dateRange?.to,
		queryFn: async () => {
			const from = dateRange!.from!;
			const to = dateRange!.to!;

			const patients = await listPatients();

			const periodCount = patients.filter((patient) => {
				const createdAt = new Date(patient.created_at);
				return createdAt >= from && createdAt <= to;
			}).length;

			// Dinâmico: Diário se < 2 meses, Mensal se >= 2 meses
			const monthsDiff = differenceInMonths(to, from);
			let chartData;

			if (monthsDiff >= 2) {
				const intervalMonths = eachMonthOfInterval({ start: from, end: to });
				chartData = intervalMonths.map((month) => {
					const start = startOfMonth(month);
					const end = startOfMonth(subMonths(month, -1));
					return {
						label: format(month, "MMM/yy", { locale: ptBR }),
						count: patients.filter((p) => {
							const created = new Date(p.created_at);
							return created >= start && created < end;
						}).length,
					};
				});
			} else {
				const intervalDays = eachDayOfInterval({ start: from, end: to });
				// Agrupar por dia para não ficar poluído, mas mostrar alguns pontos
				chartData = intervalDays
					.filter((_, i) => intervalDays.length <= 15 || i % 2 === 0)
					.map((day) => {
						const dStart = startOfDay(day);
						const dEnd = startOfDay(subDays(day, -1));
						return {
							label: format(day, "dd/MM", { locale: ptBR }),
							count: patients.filter((p) => {
								const created = new Date(p.created_at);
								return created >= dStart && created < dEnd;
							}).length,
						};
					});
			}

			return {
				periodTotal: periodCount,
				chartData,
			};
		},
	});

	// Total de pacientes
	const { data: totalPatients } = useQuery({
		queryKey: ["total-patients-count"],
		queryFn: async () => {
			const patients = await listPatients();
			return patients.length;
		},
	});

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Cards de Resumo - Grid mais robusto */}
			<div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
					<div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
						<Users className="h-16 w-16 text-primary" />
					</div>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2.5">
							<div className="p-2 bg-primary/10 rounded-lg">
								<Users className="h-4 w-4 text-primary" />
							</div>
							<CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
								Total de Pacientes
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="pt-2">
						<div className="text-3xl font-black tracking-tighter text-foreground">
							{totalPatients || 0}
						</div>
						<div className="flex items-center gap-1.5 mt-2">
							<Badge
								variant="secondary"
								className="bg-primary/5 text-primary text-[10px] font-bold border-none"
							>
								Base total
							</Badge>
							<span className="text-[10px] text-muted-foreground font-medium">
								Cadastrados no sistema
							</span>
						</div>
					</CardContent>
					<div className="absolute bottom-0 left-0 h-1 w-full bg-primary/20" />
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
					<div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
						<TrendingUp className="h-16 w-16 text-emerald-500" />
					</div>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2.5">
							<div className="p-2 bg-emerald-500/10 rounded-lg">
								<TrendingUp className="h-4 w-4 text-emerald-500" />
							</div>
							<CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
								Pacientes Ativos
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="pt-2">
						<div className="text-3xl font-black tracking-tighter text-emerald-600">
							{loadingActive ? "..." : activePatients}
						</div>
						<div className="flex items-center gap-1.5 mt-2">
							<Badge
								variant="secondary"
								className="bg-emerald-500/5 text-emerald-600 text-[10px] font-bold border-none"
							>
								Em atividade
							</Badge>
							<span className="text-[10px] text-muted-foreground font-medium">
								Consulta no período
							</span>
						</div>
					</CardContent>
					<div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500/20" />
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
					<div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
						<UserMinus className="h-16 w-16 text-orange-500" />
					</div>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2.5">
							<div className="p-2 bg-orange-500/10 rounded-lg">
								<UserMinus className="h-4 w-4 text-orange-500" />
							</div>
							<CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
								Pacientes Inativos
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="pt-2">
						<div className="text-3xl font-black tracking-tighter text-orange-600">
							{loadingInactive ? "..." : inactivePatients?.total || 0}
						</div>
						<div className="flex items-center gap-1.5 mt-2">
							<Badge
								variant="secondary"
								className="bg-orange-500/5 text-orange-600 text-[10px] font-bold border-none"
							>
								Risco de evasão
							</Badge>
							<span className="text-[10px] text-muted-foreground font-medium">
								Sem consulta há +30 dias
							</span>
						</div>
					</CardContent>
					<div className="absolute bottom-0 left-0 h-1 w-full bg-orange-500/20" />
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-none bg-background shadow-sm ring-1 ring-border/50">
					<div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
						<CreditCard className="h-16 w-16 text-blue-500" />
					</div>
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2.5">
							<div className="p-2 bg-blue-500/10 rounded-lg">
								<CreditCard className="h-4 w-4 text-blue-500" />
							</div>
							<CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
								Sessões em Aberto
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="pt-2">
						<div className="text-3xl font-black tracking-tighter text-blue-600">
							{loadingSessions ? "..." : patientsWithSessions?.length || 0}
						</div>
						<div className="flex items-center gap-1.5 mt-2">
							<Badge
								variant="secondary"
								className="bg-blue-500/5 text-blue-600 text-[10px] font-bold border-none"
							>
								Créditos ativos
							</Badge>
							<span className="text-[10px] text-muted-foreground font-medium">
								Pacotes com saldo
							</span>
						</div>
					</CardContent>
					<div className="absolute bottom-0 left-0 h-1 w-full bg-blue-500/20" />
				</Card>
			</div>

			{/* Novos Pacientes e Sessões - Grid equilibrado */}
			<div className="grid gap-6 lg:grid-cols-5">
				<Card className="lg:col-span-3 border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden">
					<CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<CardTitle className="flex items-center gap-2 text-lg font-bold">
									<UserPlus className="h-5 w-5 text-primary" />
									Novos Pacientes
								</CardTitle>
								<CardDescription className="text-xs font-medium">
									Crescimento da base no período selecionado
								</CardDescription>
							</div>
							<div className="text-right">
								<div className="text-2xl font-black text-primary leading-tight">
									{newPatientsData?.periodTotal || 0}
								</div>
								<div className="text-[10px] font-bold text-muted-foreground uppercase">
									Total Novos
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="pt-8">
						<div className="h-[280px] w-full">
							<SafeResponsiveContainer className="h-full" minHeight={280}>
								<LineChart data={newPatientsData?.chartData || []}>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="hsl(var(--border))"
										strokeOpacity={0.5}
									/>
									<XAxis
										dataKey="label"
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "hsl(var(--muted-foreground))",
											fontSize: 10,
											fontWeight: 600,
										}}
										dy={15}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{
											fill: "hsl(var(--muted-foreground))",
											fontSize: 10,
											fontWeight: 600,
										}}
									/>
									<Tooltip
										contentStyle={{
											borderRadius: "16px",
											border: "1px solid hsl(var(--border))",
											boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
											fontSize: "12px",
											fontWeight: "bold",
										}}
									/>
									<Line
										type="monotone"
										dataKey="count"
										stroke="hsl(var(--primary))"
										strokeWidth={4}
										dot={{
											fill: "hsl(var(--primary))",
											strokeWidth: 2,
											r: 4,
											stroke: "#fff",
										}}
										activeDot={{ r: 6, strokeWidth: 0 }}
										name="Novos Pacientes"
									/>
								</LineChart>
							</SafeResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				<Card className="lg:col-span-2 border-none shadow-sm ring-1 ring-border/50 bg-background flex flex-col">
					<CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
						<CardTitle className="flex items-center gap-2 text-lg font-bold">
							<CreditCard className="h-5 w-5 text-blue-500" />
							Sessões Disponíveis
						</CardTitle>
						<CardDescription className="text-xs font-medium">
							Pacientes com saldo de sessões pré-pagas
						</CardDescription>
					</CardHeader>
					<CardContent className="p-0 flex-1">
						<ScrollArea className="h-[340px]">
							{loadingSessions ? (
								<div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">
									Carregando dados...
								</div>
							) : patientsWithSessions?.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-[340px] text-center px-6">
									<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
										<CreditCard className="h-6 w-6 text-muted-foreground/50" />
									</div>
									<p className="text-muted-foreground text-sm font-medium">
										Nenhum paciente com saldo encontrado
									</p>
								</div>
							) : (
								<Table>
									<TableHeader className="bg-muted/30">
										<TableRow className="hover:bg-transparent border-none">
											<TableHead className="text-[10px] font-bold uppercase h-9">
												Paciente
											</TableHead>
											<TableHead className="text-right text-[10px] font-bold uppercase h-9 px-6">
												Saldo
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{patientsWithSessions?.map((item) => (
											<TableRow key={item.id} className="border-border/40">
												<TableCell className="font-bold text-sm py-3 px-4">
													{item.patientName}
												</TableCell>
												<TableCell className="text-right py-3 px-6">
													<Badge
														variant="outline"
														className="bg-blue-500/5 text-blue-600 border-blue-500/20 font-bold"
													>
														{item.remainingSessions} / {item.totalSessions}
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</ScrollArea>
					</CardContent>
				</Card>
			</div>

			{/* Lista de Pacientes Inativos - Layout Horizontal */}
			<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
				<CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<CardTitle className="flex items-center gap-2 text-lg font-bold">
								<Clock className="h-5 w-5 text-orange-500" />
								Reativação de Pacientes
							</CardTitle>
							<CardDescription className="text-xs font-medium">
								Pacientes sem consulta há mais de 30 dias
							</CardDescription>
						</div>
						<Badge
							variant="outline"
							className="border-orange-500/30 text-orange-600 bg-orange-500/5"
						>
							Ação Necessária
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<ScrollArea className="h-[300px]">
						{loadingInactive ? (
							<div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm font-medium">
								Analisando base de dados...
							</div>
						) : inactivePatients?.list?.length === 0 ? (
							<div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm font-medium">
								Excelente! Todos os seus pacientes estão ativos.
							</div>
						) : (
							<Table>
								<TableHeader className="bg-muted/30">
									<TableRow className="hover:bg-transparent border-none">
										<TableHead className="text-[10px] font-bold uppercase h-10 px-6">
											Nome do Paciente
										</TableHead>
										<TableHead className="text-[10px] font-bold uppercase h-10">
											Contato
										</TableHead>
										<TableHead className="text-[10px] font-bold uppercase h-10">
											Última Visita
										</TableHead>
										<TableHead className="text-[10px] font-bold uppercase h-10 text-right px-6">
											Status
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{inactivePatients?.list?.map((patient: any) => (
										<TableRow
											key={patient.id}
											className="border-border/40 hover:bg-muted/10 transition-colors"
										>
											<TableCell className="font-bold text-sm py-4 px-6">
												{PatientHelpers.getName(patient)}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm font-medium">
												{patient.phone || "-"}
											</TableCell>
											<TableCell className="text-sm font-semibold">
												{patient.lastAppointment
													? format(
															new Date(patient.lastAppointment),
															"dd/MM/yyyy",
															{ locale: ptBR },
														)
													: "Sem registro"}
											</TableCell>
											<TableCell className="text-right px-6">
												<Badge
													variant="outline"
													className="bg-orange-500/5 text-orange-600 border-orange-500/20 font-bold"
												>
													Inativo
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	);
}

// Memoize InternalDashboard to prevent unnecessary re-renders
export const InternalDashboard = memo(InternalDashboardComponent);
InternalDashboard.displayName = "InternalDashboard";
