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
	type OrganizationMember,
} from "@/api/v2";
import {
	Users,
	TrendingUp,
	CheckCircle2,
	XCircle,
	Clock,
	Award,
} from "lucide-react";
import {
	format,
	startOfMonth,
	endOfMonth,
} from "date-fns";
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
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useOrganizations } from "@/hooks/useOrganizations";

function TeamPerformanceComponent() {
	const { filters } = useAnalyticsFilters();
	const { dateRange } = filters;
	const { currentOrganization } = useOrganizations();
	const { members, isLoading: loadingMembers } = useOrganizationMembers(currentOrganization?.id);

	const { data: performanceData, isLoading: loadingPerformance } = useQuery({
		queryKey: ["team-performance-data", dateRange, currentOrganization?.id],
		enabled: !!dateRange?.from && !!dateRange?.to && !!currentOrganization?.id,
		queryFn: async () => {
			const from = format(dateRange!.from!, "yyyy-MM-dd");
			const to = format(dateRange!.to!, "yyyy-MM-dd");
			
			// Em um cenário real, teríamos um endpoint específico. 
			// Aqui vamos agregar dados de agendamentos e faturamento por profissional.
			const response = await appointmentsApi.list({
				dateFrom: from,
				dateTo: to,
				limit: 2000,
			});
			const appointments = response?.data ?? [];

			const therapists = members?.filter(m => m.role === 'fisioterapeuta' || m.role === 'admin') || [];
			
			const stats = therapists.map(member => {
				const professionalApts = appointments.filter(a => a.therapist_id === member.user_id);
				const completed = professionalApts.filter(a => a.status === 'completed' || a.status === 'concluido').length;
				const cancelled = professionalApts.filter(a => a.status === 'cancelled' || a.status === 'cancelado').length;
				const noShow = professionalApts.filter(a => a.status === 'no_show').length;
				
				const total = professionalApts.length;
				const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

				return {
					id: member.user_id,
					name: member.user?.name || member.user_id,
					total,
					completed,
					cancelled,
					noShow,
					attendanceRate,
				};
			}).sort((a, b) => b.completed - a.completed);

			return stats;
		},
	});

	if (loadingMembers || loadingPerformance) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				Analisando métricas da equipe...
			</div>
		);
	}

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Top Performers Grid */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-emerald-500" />
							Maior Assiduidade
						</CardTitle>
					</CardHeader>
					<CardContent>
						{performanceData?.[0] ? (
							<div className="space-y-1">
								<div className="text-2xl font-black">{performanceData.reduce((prev, current) => (prev.attendanceRate > current.attendanceRate) ? prev : current).name}</div>
								<div className="text-xs text-muted-foreground font-medium">
									{performanceData.reduce((prev, current) => (prev.attendanceRate > current.attendanceRate) ? prev : current).attendanceRate}% de presença nas sessões
								</div>
							</div>
						) : "-"}
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Award className="h-4 w-4 text-primary" />
							Volume de Atendimento
						</CardTitle>
					</CardHeader>
					<CardContent>
						{performanceData?.[0] ? (
							<div className="space-y-1">
								<div className="text-2xl font-black">{performanceData[0].name}</div>
								<div className="text-xs text-muted-foreground font-medium">
									{performanceData[0].completed} sessões concluídas no período
								</div>
							</div>
						) : "-"}
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<Clock className="h-4 w-4 text-blue-500" />
							Média da Equipe
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-1">
							<div className="text-2xl font-black">
								{performanceData && performanceData.length > 0 
									? Math.round(performanceData.reduce((acc, curr) => acc + curr.attendanceRate, 0) / performanceData.length)
									: 0}%
							</div>
							<div className="text-xs text-muted-foreground font-medium">
								Taxa de conversão média global
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Chart & Table Row */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader>
						<CardTitle className="text-lg font-bold">Volume por Profissional</CardTitle>
						<CardDescription>Sessões concluídas no período selecionado</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={performanceData || []}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
									<XAxis 
										dataKey="name" 
										axisLine={false} 
										tickLine={false} 
										tick={{fontSize: 10, fontWeight: 600}}
									/>
									<YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
									<Tooltip 
										cursor={{fill: 'hsl(var(--muted)/0.2)'}}
										contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
									/>
									<Bar dataKey="completed" radius={[6, 6, 0, 0]} name="Concluídas">
										{performanceData?.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.4)'} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden">
					<CardHeader className="bg-muted/20 border-b border-border/40">
						<CardTitle className="text-lg font-bold">Detalhamento da Equipe</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<ScrollArea className="h-[380px]">
							<Table>
								<TableHeader className="bg-muted/30">
									<TableRow>
										<TableHead className="text-[10px] font-bold uppercase px-6">Profissional</TableHead>
										<TableHead className="text-[10px] font-bold uppercase text-center">Total</TableHead>
										<TableHead className="text-[10px] font-bold uppercase text-center">Faltas</TableHead>
										<TableHead className="text-[10px] font-bold uppercase text-right px-6">Conversão</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{performanceData?.map((row) => (
										<TableRow key={row.id} className="border-border/40">
											<TableCell className="font-bold py-4 px-6">{row.name}</TableCell>
											<TableCell className="text-center font-medium">{row.total}</TableCell>
											<TableCell className="text-center">
												<span className="text-rose-500 font-bold">{row.noShow}</span>
											</TableCell>
											<TableCell className="text-right px-6">
												<Badge variant="outline" className={`${row.attendanceRate >= 80 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/5 text-orange-600 border-orange-500/20'} font-bold`}>
													{row.attendanceRate}%
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</ScrollArea>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export const TeamPerformance = memo(TeamPerformanceComponent);
TeamPerformance.displayName = "TeamPerformance";
