import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi, type AppointmentRow } from "@/api/v2";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import {
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	LineChart,
	Line,
	BarChart,
	Bar,
} from "recharts";
import { format, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";

const COMPLETED_STATUSES = new Set([
	"concluido",
	"completed",
	"realizado",
	"atendido",
]);
const CANCELED_STATUSES = new Set(["cancelado", "cancelled"]);
const SCHEDULED_STATUSES = new Set(["agendado", "scheduled"]);
const CONFIRMED_STATUSES = new Set(["confirmado", "confirmed"]);

const listAppointments = async (
	dateFrom: string,
	dateTo: string,
	therapistId?: string,
) => {
	const all: AppointmentRow[] = [];
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
		all.push(...chunk);
		if (chunk.length < limit) break;
		offset += limit;
	}

	return all;
};

export function AppointmentAnalytics() {
	const { filters } = useAnalyticsFilters();
	const { dateRange, professionalId } = filters;

	const { data: dailyData, isLoading: isLoadingDaily } = useQuery({
		queryKey: ["appointment-daily-analytics", dateRange, professionalId],
		enabled: !!dateRange?.from && !!dateRange?.to,
		queryFn: async () => {
			if (!dateRange?.from || !dateRange?.to) return [];

			const intervalDays = eachDayOfInterval({
				start: dateRange.from,
				end: dateRange.to,
			});

			const appointments = await listAppointments(
				format(dateRange.from, "yyyy-MM-dd"),
				format(dateRange.to, "yyyy-MM-dd"),
				professionalId,
			);

			const counts = new Map<string, number>();
			appointments.forEach((appointment) => {
				counts.set(appointment.date, (counts.get(appointment.date) ?? 0) + 1);
			});

			return intervalDays.map((day) => ({
				date: format(day, "dd/MM", { locale: ptBR }),
				fullDate: format(day, "yyyy-MM-dd"),
				agendamentos: counts.get(format(day, "yyyy-MM-dd")) ?? 0,
			}));
		},
	});

	const { data: statusData, isLoading: isLoadingStatus } = useQuery({
		queryKey: ["appointment-status-analytics", dateRange, professionalId],
		enabled: !!dateRange?.from && !!dateRange?.to,
		queryFn: async () => {
			if (!dateRange?.from || !dateRange?.to) return [];

			const appointments = await listAppointments(
				format(dateRange.from, "yyyy-MM-dd"),
				format(dateRange.to, "yyyy-MM-dd"),
				professionalId,
			);

			const totals = {
				Agendado: 0,
				Confirmado: 0,
				Concluido: 0,
				Cancelado: 0,
			};

			appointments.forEach((appointment) => {
				const status = String(appointment.status ?? "").toLowerCase();
				if (COMPLETED_STATUSES.has(status)) totals.Concluido += 1;
				else if (CANCELED_STATUSES.has(status)) totals.Cancelado += 1;
				else if (CONFIRMED_STATUSES.has(status)) totals.Confirmado += 1;
				else if (SCHEDULED_STATUSES.has(status)) totals.Agendado += 1;
			});

			return Object.entries(totals).map(([status, total]) => ({
				status,
				total,
			}));
		},
	});

	return (
		<div className="space-y-4">
			<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
				<CardHeader className="pb-4 sm:pb-6">
					<CardTitle className="text-base sm:text-lg">
						Agendamentos por Dia
					</CardTitle>
					<CardDescription className="text-xs sm:text-sm">
						Volume diário de agendamentos no período selecionado
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
						{isLoadingDaily ? (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								Carregando dados...
							</div>
						) : (
							<SafeResponsiveContainer className="h-full" minHeight={200}>
								<LineChart data={dailyData}>
									<defs>
										<linearGradient
											id="colorAgendamentos"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
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
										dataKey="date"
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#64748B", fontSize: 10 }}
										dy={10}
										interval="preserveStartEnd"
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
										labelFormatter={(value, items) =>
											items[0]?.payload?.fullDate || value
										}
									/>
									<Line
										type="monotone"
										dataKey="agendamentos"
										stroke="hsl(var(--primary))"
										strokeWidth={3}
										dot={{
											fill: "hsl(var(--primary))",
											strokeWidth: 2,
											r: 4,
											stroke: "#fff",
										}}
										activeDot={{ r: 6, strokeWidth: 0 }}
									/>
								</LineChart>
							</SafeResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>

			<Card className="border-none shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-800/50">
				<CardHeader className="pb-4 sm:pb-6">
					<CardTitle className="text-base sm:text-lg">
						Distribuição por Status
					</CardTitle>
					<CardDescription className="text-xs sm:text-sm">
						Status dos agendamentos no período selecionado
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full">
						{isLoadingStatus ? (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								Carregando dados...
							</div>
						) : (
							<SafeResponsiveContainer className="h-full" minHeight={200}>
								<BarChart data={statusData}>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="#E2E8F0"
									/>
									<XAxis
										dataKey="status"
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
										cursor={{ fill: "rgba(var(--primary-rgb), 0.05)" }}
										contentStyle={{
											borderRadius: "12px",
											border: "none",
											boxShadow: "0 4px 12px -2px rgba(0,0,0,0.05)",
										}}
									/>
									<Bar
										dataKey="total"
										fill="hsl(var(--primary))"
										radius={[4, 4, 0, 0]}
										barSize={40}
									/>
								</BarChart>
							</SafeResponsiveContainer>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
