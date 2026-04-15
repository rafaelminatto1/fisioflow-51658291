import React, { memo, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi } from "@/api/v2";
import { request } from "@/api/v2/base";
import {
	CheckCircle2,
	Clock,
	Award,
	TrendingUp,
	RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
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
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Cell,
} from "recharts";
import { useAnalyticsFilters } from "@/contexts/AnalyticsFiltersContext";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useOrganizations } from "@/hooks/useOrganizations";
import { formatCurrency } from "@/lib/utils";

const MONTHS_OPTIONS = [3, 6, 12] as const;

interface BITopTherapist {
	therapist_id: string;
	name: string;
	sessions_completed: number;
	no_shows: number;
	revenue: string;
}

interface BIData {
	top_therapists: BITopTherapist[];
}

function TeamPerformanceComponent() {
	const { filters } = useAnalyticsFilters();
	const { dateRange } = filters;
	const { currentOrganization } = useOrganizations();
	const { members, isLoading: loadingMembers } = useOrganizationMembers(currentOrganization?.id);
	const [biMonths, setBiMonths] = useState<number>(3);

	// ── Performance por período (filtro global) ──────────────────────────────────
	const { data: performanceData, isLoading: loadingPerformance } = useQuery({
		queryKey: ["team-performance-data", dateRange, currentOrganization?.id],
		enabled: !!dateRange?.from && !!dateRange?.to && !!currentOrganization?.id,
		queryFn: async () => {
			const from = format(dateRange!.from!, "yyyy-MM-dd");
			const to = format(dateRange!.to!, "yyyy-MM-dd");

			const response = await appointmentsApi.list({ dateFrom: from, dateTo: to, limit: 2000 });
			const appointments = response?.data ?? [];

			const therapists = members?.filter(m => m.role === "fisioterapeuta" || m.role === "admin") || [];

			return therapists.map(member => {
				const apts = appointments.filter(a => a.therapist_id === member.user_id);
				const completed = apts.filter(a => a.status === "completed" || a.status === "concluido").length;
				const cancelled = apts.filter(a => a.status === "cancelled" || a.status === "cancelado").length;
				const noShow = apts.filter(a => a.status === "no_show").length;
				const total = apts.length;
				const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
				return { id: member.user_id, name: member.user?.name || member.user_id, total, completed, cancelled, noShow, attendanceRate };
			}).sort((a, b) => b.completed - a.completed);
		},
	});

	// ── Top terapeutas por receita (BI endpoint) ─────────────────────────────────
	const { data: biData, isLoading: loadingBi, refetch: refetchBi, isFetching: isFetchingBi } = useQuery({
		queryKey: ["analytics", "bi", biMonths],
		queryFn: () => request<{ data: BIData }>(`/api/analytics/bi?months=${biMonths}`),
		staleTime: 5 * 60 * 1000,
		select: (res) => res.data?.top_therapists ?? [],
	});

	if (loadingMembers || loadingPerformance) {
		return (
			<div className="flex items-center justify-center h-64 text-muted-foreground">
				Analisando métricas da equipe...
			</div>
		);
	}

	const bestAttendance = performanceData?.reduce(
		(prev, curr) => (prev.attendanceRate > curr.attendanceRate ? prev : curr),
		performanceData[0],
	);

	return (
		<div className="space-y-8 animate-fade-in">
			{/* ── Top Performers (filtro global) ── */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-bold flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-emerald-500" />
							Maior Assiduidade
						</CardTitle>
					</CardHeader>
					<CardContent>
						{bestAttendance ? (
							<div className="space-y-1">
								<div className="text-2xl font-black">{bestAttendance.name}</div>
								<div className="text-xs text-muted-foreground font-medium">
									{bestAttendance.attendanceRate}% de presença
								</div>
							</div>
						) : <span className="text-muted-foreground text-sm">—</span>}
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
									{performanceData[0].completed} sessões no período
								</div>
							</div>
						) : <span className="text-muted-foreground text-sm">—</span>}
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
							<div className="text-xs text-muted-foreground font-medium">Taxa de conversão média</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ── Chart & Tabela ── */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardHeader>
						<CardTitle className="text-lg font-bold">Volume por Profissional</CardTitle>
						<CardDescription>Sessões concluídas no período selecionado</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px] w-full">
							<SafeResponsiveContainer className="h-full" minHeight={300}>
								<BarChart data={performanceData || []}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
									<YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
									<Tooltip cursor={{ fill: "hsl(var(--muted)/0.2)" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }} />
									<Bar dataKey="completed" radius={[6, 6, 0, 0]} name="Concluídas">
										{performanceData?.map((_, index) => (
											<Cell key={`cell-${index}`} fill={index === 0 ? "hsl(var(--primary))" : "hsl(var(--primary)/0.4)"} />
										))}
									</Bar>
								</BarChart>
							</SafeResponsiveContainer>
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
												<Badge variant="outline" className={`${row.attendanceRate >= 80 ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" : "bg-orange-500/5 text-orange-600 border-orange-500/20"} font-bold`}>
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

			{/* ── Ranking por Receita (BI endpoint) ── */}
			<div>
				<div className="flex items-center justify-between gap-4 mb-4">
					<div>
						<h3 className="text-base font-bold flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-primary" />
							Ranking por Receita
						</h3>
						<p className="text-xs text-muted-foreground">Top terapeutas por faturamento gerado</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex items-center bg-muted/50 p-1 rounded-xl border">
							{MONTHS_OPTIONS.map((m) => (
								<Button key={m} variant={biMonths === m ? "default" : "ghost"} size="sm" className="h-7 px-3 rounded-lg text-xs" onClick={() => setBiMonths(m)}>
									{m}M
								</Button>
							))}
						</div>
						<Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refetchBi()} disabled={isFetchingBi}>
							<RefreshCw className={`h-3.5 w-3.5 ${isFetchingBi ? "animate-spin" : ""}`} />
						</Button>
					</div>
				</div>

				<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background">
					<CardContent className="px-5 pb-4 pt-4">
						{loadingBi ? (
							<div className="space-y-2">
								{Array.from({ length: 4 }).map((_, i) => (
									<div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
								))}
							</div>
						) : (biData ?? []).length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
						) : (
							<div className="space-y-2">
								{(biData ?? []).map((t, i) => (
									<div key={t.therapist_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
										<span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : "bg-muted text-muted-foreground"}`}>
											{i + 1}
										</span>
										<span className="font-medium text-sm flex-1 truncate">{t.name}</span>
										<Badge variant="secondary" className="rounded-lg text-xs">{t.sessions_completed} sessões</Badge>
										{t.no_shows > 0 && (
											<Badge variant="outline" className="rounded-lg text-xs text-amber-600 border-amber-200">{t.no_shows} faltas</Badge>
										)}
										<span className="text-sm font-bold text-emerald-600 shrink-0">{formatCurrency(Number(t.revenue))}</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export const TeamPerformance = memo(TeamPerformanceComponent);
TeamPerformance.displayName = "TeamPerformance";
