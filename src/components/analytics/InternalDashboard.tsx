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
	startOfWeek,
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
import {
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
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
			{/* Cards de Resumo */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
						<Users className="h-12 w-12 text-primary" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
							<Users className="h-4 w-4 text-primary" />
							Total de Pacientes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold tracking-tight">
							{totalPatients || 0}
						</div>
						<p className="text-xs text-muted-foreground mt-1 font-medium">
							Cadastrados no sistema
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-green-50/30 dark:from-gray-900 dark:to-green-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
						<TrendingUp className="h-12 w-12 text-green-500" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
							<TrendingUp className="h-4 w-4 text-green-500" />
							Pacientes Ativos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-green-600 tracking-tight">
							{loadingActive ? "..." : activePatients}
						</div>
						<p className="text-xs text-muted-foreground mt-1 font-medium">
							Consulta no período selecionado
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-900 dark:to-orange-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
						<UserMinus className="h-12 w-12 text-orange-500" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
							<UserMinus className="h-4 w-4 text-orange-500" />
							Pacientes Inativos
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-orange-600 tracking-tight">
							{loadingInactive ? "..." : inactivePatients?.total || 0}
						</div>
						<p className="text-xs text-muted-foreground mt-1 font-medium">
							Sem consulta há +30 dias
						</p>
					</CardContent>
				</Card>

				<Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-900 dark:to-blue-900/5 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-300">
						<CreditCard className="h-12 w-12 text-blue-500" />
					</div>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
							<CreditCard className="h-4 w-4 text-blue-500" />
							Sessões Disponíveis
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-blue-600 tracking-tight">
							{loadingSessions ? "..." : patientsWithSessions?.length || 0}
						</div>
						<p className="text-xs text-muted-foreground mt-1 font-medium">
							Pacotes ativos para uso
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Novos Pacientes */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
						<CardTitle className="flex items-center gap-2 text-lg">
							<UserPlus className="h-5 w-5 text-primary" />
							Novos Pacientes no Período
						</CardTitle>
						<CardDescription>
							Acompanhamento de novos cadastros no intervalo selecionado
						</CardDescription>
					</CardHeader>
					<CardContent className="pt-6">
						<div className="flex justify-center mb-8">
							<div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/10 min-w-[200px]">
								<div className="text-4xl font-bold text-primary">
									{newPatientsData?.periodTotal || 0}
								</div>
								<p className="text-xs font-semibold text-primary/70 mt-1 uppercase tracking-wider">
									Total Novos
								</p>
							</div>
						</div>
						<div className="h-[250px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={newPatientsData?.chartData || []}>
									<defs>
										<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0.1}
											/>
											<stop
												offset="95%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="#E2E8F0"
									/>
									<XAxis
										dataKey="label"
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#64748B", fontSize: 12 }}
										dy={10}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#64748B", fontSize: 12 }}
									/>
									<Tooltip
										contentStyle={{
											borderRadius: "12px",
											border: "none",
											boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
										}}
									/>
									<Line
										type="monotone"
										dataKey="count"
										stroke="hsl(var(--primary))"
										strokeWidth={3}
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
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
					<CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
						<CardTitle className="flex items-center gap-2 text-lg">
							<CreditCard className="h-5 w-5 text-blue-500" />
							Sessões Reutilizáveis
						</CardTitle>
						<CardDescription>
							Pacotes ativos de sessões pré-pagas
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ScrollArea className="h-[310px]">
							{loadingSessions ? (
								<p className="text-muted-foreground">Carregando...</p>
							) : patientsWithSessions?.length === 0 ? (
								<p className="text-muted-foreground text-center py-8">
									Nenhum paciente com sessões disponíveis
								</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Paciente</TableHead>
											<TableHead className="text-right">Restantes</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{patientsWithSessions?.map((item) => (
											<TableRow key={item.id}>
												<TableCell className="font-medium">
													{item.patientName}
												</TableCell>
												<TableCell className="text-right">
													<Badge variant="secondary">
														{item.remainingSessions} de {item.totalSessions}
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

			{/* Lista de Pacientes Inativos */}
			<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
				<CardHeader className="border-b border-gray-100/50 dark:border-gray-800/50 pb-4">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Clock className="h-5 w-5 text-orange-500" />
						Pacientes Inativos
					</CardTitle>
					<CardDescription>
						Pacientes sem consulta há mais de 30 dias - considere uma estratégia
						de reativação
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[300px]">
						{loadingInactive ? (
							<p className="text-muted-foreground">Carregando...</p>
						) : inactivePatients?.list?.length === 0 ? (
							<p className="text-muted-foreground text-center py-8">
								Nenhum paciente inativo encontrado
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Nome</TableHead>
										<TableHead>Telefone</TableHead>
										<TableHead>Última Consulta</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{inactivePatients?.list?.map((patient: any) => (
										<TableRow key={patient.id}>
											<TableCell className="font-medium">
												{PatientHelpers.getName(patient)}
											</TableCell>
											<TableCell>{patient.phone || "-"}</TableCell>
											<TableCell>
												{patient.lastAppointment
													? format(
															new Date(patient.lastAppointment),
															"dd/MM/yyyy",
															{ locale: ptBR },
														)
													: "Nunca"}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className="text-orange-600 border-orange-600"
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
