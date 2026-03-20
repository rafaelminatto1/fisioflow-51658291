import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Calendar,
	Users,
	DollarSign,
	Clock,
	UserCheck,
	AlertCircle,
	TrendingUp,
	Activity,
	MessageSquare,
	ArrowUpRight,
	ArrowDownRight,
	ClipboardCheck,
	Bell,
	ChevronRight,
	Sparkles,
	Send,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/v2/insights";
import { appointmentsApi } from "@/api/v2/appointments";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";

export const BentoDashboard: React.FC = () => {
	const navigate = useNavigate();
	const { profile } = useAuth();
	const isTherapist = profile?.role === "fisioterapeuta";

	const { data: dashboardData, isLoading: metricsLoading } = useQuery({
		queryKey: ["bento-dashboard-metrics"],
		queryFn: () => analyticsApi.dashboard({ period: "month" }),
		refetchInterval: 60000,
	});

	const { data: todayAppts, isLoading: appointmentsLoading } = useQuery({
		queryKey: ["bento-dashboard-appointments-today"],
		queryFn: () =>
			appointmentsApi.list({
				dateFrom: new Date().toISOString().split("T")[0],
				dateTo: new Date().toISOString().split("T")[0],
				limit: 10,
			}),
	});

	const metrics = dashboardData?.data;
	const appointments = todayAppts?.data ?? [];

	if (metricsLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
				{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
					<Skeleton key={i} className="h-32 w-full rounded-3xl" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6 md:space-y-8 animate-fade-in pb-10 max-w-[1600px] mx-auto">
			{/* Top command metrics - 4 priority cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Atendimentos Hoje */}
				<Card
					className="rounded-[2.5rem] border-none shadow-premium-sm bg-primary text-primary-foreground overflow-hidden relative group cursor-pointer hover:shadow-premium-lg transition-all duration-500"
					onClick={() => navigate("/agenda")}
				>
					<div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
						<Calendar className="w-20 h-20" />
					</div>
					<CardContent className="p-6 relative z-10">
						<p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">
							Agenda de Hoje
						</p>
						<h3 className="text-4xl font-black tracking-tighter mb-2">
							{metrics?.appointmentsToday || 0}
						</h3>
						<div className="flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-3 py-1 rounded-full">
							<Clock className="w-3 h-3" />
							<span>Próximo às 14:30</span>
						</div>
					</CardContent>
				</Card>

				{/* Evoluções Pendentes */}
				<Card
					className={cn(
						"rounded-[2.5rem] border-none shadow-premium-sm overflow-hidden relative group cursor-pointer hover:shadow-premium-lg transition-all duration-500",
						(metrics?.pendingEvolutions || 0) > 0
							? "bg-amber-500 text-white"
							: "bg-white dark:bg-slate-900 border border-border/40",
					)}
					onClick={() => navigate("/atendimentos")}
				>
					<div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
						<ClipboardCheck className="w-20 h-20" />
					</div>
					<CardContent className="p-6 relative z-10">
						<p
							className={cn(
								"text-[10px] font-black uppercase tracking-[0.2em] mb-1",
								(metrics?.pendingEvolutions || 0) > 0
									? "text-white/80"
									: "text-muted-foreground",
							)}
						>
							Evoluções Pendentes
						</p>
						<h3 className="text-4xl font-black tracking-tighter mb-2">
							{metrics?.pendingEvolutions || 0}
						</h3>
						<div
							className={cn(
								"flex items-center gap-2 text-[10px] font-bold w-fit px-3 py-1 rounded-full",
								(metrics?.pendingEvolutions || 0) > 0
									? "bg-white/20"
									: "bg-amber-500/10 text-amber-600",
							)}
						>
							<AlertCircle className="w-3 h-3" />
							<span>
								{metrics?.pendingEvolutions === 0
									? "Tudo em dia!"
									: "Ação Necessária"}
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Confirmações WhatsApp */}
				<Card
					className="rounded-[2.5rem] bg-emerald-500 text-white border-none shadow-premium-sm overflow-hidden relative group cursor-pointer hover:shadow-premium-lg transition-all duration-500"
					onClick={() => navigate("/comunicacoes")}
				>
					<div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
						<MessageSquare className="w-20 h-20" />
					</div>
					<CardContent className="p-6 relative z-10">
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80 mb-1">
							Confirmações p/ Amanhã
						</p>
						<h3 className="text-4xl font-black tracking-tighter mb-2">
							{metrics?.whatsappConfirmationsPending || 0}
						</h3>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white rounded-full px-3"
						>
							<Send className="w-3 h-3 mr-1.5" /> Enviar Lembretes
						</Button>
					</CardContent>
				</Card>

				{/* Financeiro Hoje */}
				<Card className="rounded-[2.5rem] bg-white dark:bg-slate-900 border border-border/40 shadow-premium-sm overflow-hidden relative group hover:shadow-premium-lg transition-all duration-500">
					<div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
						<DollarSign className="w-20 h-20" />
					</div>
					<CardContent className="p-6 relative z-10">
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
							Receita Hoje (Confirmada)
						</p>
						<h3 className="text-4xl font-black tracking-tighter mb-2">
							R$ {metrics?.financialToday.received.toLocaleString("pt-BR")}
						</h3>
						<div className="flex items-center gap-2">
							<Progress
								value={
									((metrics?.financialToday.received || 0) /
										(metrics?.financialToday.projected || 1)) *
									100
								}
								className="h-1.5 flex-1"
							/>
							<span className="text-[9px] font-black text-muted-foreground uppercase">
								Meta: R${" "}
								{metrics?.financialToday.projected.toLocaleString("pt-BR")}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Bento Grid Main Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[240px]">
				{/* Agenda do Dia - Large Block (6x2) */}
				<Card className="lg:col-span-8 lg:row-span-2 rounded-[3rem] border-none shadow-premium-md overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl group">
					<CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
						<div>
							<p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
								Próximos Pacientes
							</p>
							<CardTitle className="text-2xl font-black tracking-tighter">
								Agenda Inteligente
							</CardTitle>
						</div>
						<Button
							variant="outline"
							className="rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-black text-[10px] uppercase tracking-widest h-10"
							onClick={() => navigate("/agenda")}
						>
							Ver Agenda Completa <ChevronRight className="w-3 h-3 ml-1" />
						</Button>
					</CardHeader>
					<CardContent className="px-4 pb-8 h-[calc(100%-100px)] overflow-y-auto scrollbar-hide">
						{appointments.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
								<Calendar className="w-16 h-16 mb-4" />
								<p className="text-sm font-bold">
									Nenhum agendamento para hoje.
								</p>
							</div>
						) : (
							<div className="space-y-3 px-4">
								{appointments.map((apt: any) => (
									<div
										key={apt.id}
										className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[2rem] border border-border/30 hover:border-primary/40 hover:shadow-lg transition-all group/item cursor-pointer"
									>
										<div className="flex items-center gap-5">
											<div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/50 group-hover/item:border-primary/30 transition-colors">
												<span className="text-xs font-black text-primary">
													{apt.appointment_time || apt.time}
												</span>
												<span className="text-[8px] font-black uppercase tracking-tighter text-muted-foreground">
													60 min
												</span>
											</div>
											<div>
												<h4 className="font-black text-slate-900 dark:text-white group-hover/item:text-primary transition-colors">
													{apt.patient_name}
												</h4>
												<div className="flex items-center gap-2 mt-1">
													<Badge
														variant="outline"
														className="text-[8px] font-black uppercase tracking-widest border-border/50 px-2 py-0"
													>
														Reabilitação
													</Badge>
													<span className="text-[10px] text-muted-foreground flex items-center gap-1">
														<Clock className="w-3 h-3" /> Sessão 8 de 12
													</span>
												</div>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div className="hidden sm:flex flex-col items-end mr-4">
												<span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1">
													<MessageSquare className="w-3 h-3" /> Confirmado via
													Whats
												</span>
											</div>
											<Badge
												className={cn(
													"rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-none shadow-sm",
													apt.status === "completed"
														? "bg-emerald-500 text-white"
														: apt.status === "atendido"
															? "bg-primary text-white"
															: "bg-slate-100 dark:bg-slate-700 text-slate-500",
												)}
											>
												{apt.status === "completed"
													? "Finalizado"
													: apt.status === "atendido"
														? "Em Sala"
														: "Aguardando"}
											</Badge>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* AI Insights - Vertical Block (4x2) */}
				<Card className="lg:col-span-4 lg:row-span-2 rounded-[3rem] border-none shadow-premium-md bg-slate-900 text-white overflow-hidden relative group">
					<div className="absolute top-0 right-0 p-8 opacity-10">
						<Sparkles className="w-32 h-32 text-primary animate-pulse" />
					</div>
					<CardHeader className="p-8 pb-4">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4 w-fit">
							<Sparkles className="w-3 h-3 text-primary" />
							<span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
								FisioAI Insights
							</span>
						</div>
						<CardTitle className="text-2xl font-black tracking-tighter">
							Inteligência Clínica
						</CardTitle>
					</CardHeader>
					<CardContent className="p-8 pt-0 space-y-6">
						<div className="space-y-4">
							<div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/insight">
								<div className="flex items-center gap-3 mb-2">
									<div className="p-2 bg-amber-500/20 rounded-xl">
										<AlertCircle className="h-4 w-4 text-amber-500" />
									</div>
									<span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
										Alerta de Churn
									</span>
								</div>
								<p className="text-xs text-white/70 leading-relaxed font-medium">
									O paciente{" "}
									<span className="text-white font-bold">Marcos Silva</span> não
									realiza agendamentos há 18 dias. Ele costumava vir 2x por
									semana.
								</p>
								<Button
									variant="link"
									className="p-0 h-auto text-[10px] font-black uppercase text-primary mt-3 group-hover/insight:underline"
								>
									Recuperar Paciente →
								</Button>
							</div>

							<div className="p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/insight">
								<div className="flex items-center gap-3 mb-2">
									<div className="p-2 bg-emerald-500/20 rounded-xl">
										<TrendingUp className="h-4 w-4 text-emerald-500" />
									</div>
									<span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
										Oportunidade
									</span>
								</div>
								<p className="text-xs text-white/70 leading-relaxed font-medium">
									Sua taxa de ocupação nas terças-feiras está em{" "}
									<span className="text-white font-bold">95%</span>. Considere
									abrir um novo horário às 07:00.
								</p>
							</div>

							<div className="p-5 rounded-[2rem] bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
								<div className="flex items-center gap-3 mb-2">
									<Activity className="h-4 w-4 text-primary" />
									<span className="text-[10px] font-black uppercase tracking-widest text-primary">
										Resumo da Semana
									</span>
								</div>
								<p className="text-xs text-white/70 leading-relaxed font-medium">
									Você atendeu 42 pacientes (+12% que a semana passada) e gerou
									R$ 8.400 em receita bruta.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Receita Semanal - 6x1 */}
				<Card className="lg:col-span-6 rounded-[3rem] border-none shadow-premium-md bg-white dark:bg-slate-900 overflow-hidden group">
					<CardHeader className="px-8 pt-8 pb-0 flex flex-row items-center justify-between">
						<div>
							<p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-1">
								Performance
							</p>
							<CardTitle className="text-xl font-black tracking-tighter">
								Receita Realizada
							</CardTitle>
						</div>
						<div className="flex items-center gap-2 text-emerald-500">
							<ArrowUpRight className="w-5 h-5" />
							<span className="text-sm font-black">+14.2%</span>
						</div>
					</CardHeader>
					<CardContent className="p-0 h-full">
						<div className="h-[160px] w-full mt-2">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={metrics?.revenueChart || []}
									margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
								>
									<defs>
										<linearGradient
											id="colorRevenue"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="rgb(16, 185, 129)"
												stopOpacity={0.3}
											/>
											<stop
												offset="95%"
												stopColor="rgb(16, 185, 129)"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<Area
										type="monotone"
										dataKey="revenue"
										stroke="#10b981"
										strokeWidth={4}
										fillOpacity={1}
										fill="url(#colorRevenue)"
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "rgba(0,0,0,0.8)",
											border: "none",
											borderRadius: "16px",
											color: "#fff",
											fontSize: "10px",
											fontWeight: "bold",
										}}
										itemStyle={{ color: "#fff" }}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				{/* Métricas de Saúde da Clínica - 3x1 */}
				<Card className="lg:col-span-3 rounded-[3rem] border-none shadow-premium-md bg-white dark:bg-slate-900 p-8 flex flex-col justify-between">
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
							Adesão ao Plano
						</p>
						<div className="flex items-center justify-between mb-2">
							<span className="text-3xl font-black tracking-tighter">
								{metrics?.engagementScore || 0}%
							</span>
							<Activity className="w-6 h-6 text-primary" />
						</div>
						<Progress value={metrics?.engagementScore || 0} className="h-2" />
					</div>
					<p className="text-[9px] text-muted-foreground font-medium leading-tight">
						Medida baseada em presenças, faltas e tarefas domiciliares.
					</p>
				</Card>

				{/* Métricas de Saúde da Clínica - 3x1 */}
				<Card className="lg:col-span-3 rounded-[3rem] border-none shadow-premium-md bg-white dark:bg-slate-900 p-8 flex flex-col justify-between">
					<div>
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
							Taxa de No-Show
						</p>
						<div className="flex items-center justify-between mb-2">
							<span className="text-3xl font-black tracking-tighter text-amber-500">
								{metrics?.noShowRate || 0}%
							</span>
							<XCircle className="w-6 h-6 text-amber-500" />
						</div>
						<p className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit">
							Meta: Máx 10%
						</p>
					</div>
					<p className="text-[9px] text-muted-foreground font-medium leading-tight">
						Pacientes que faltaram sem aviso prévio nos últimos 30 dias.
					</p>
				</Card>
			</div>

			{/* Quick Actions Footer - Floating style */}
			<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-premium-2xl border border-white/10 flex items-center gap-2">
				<Button
					className="rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest px-6 h-12"
					onClick={() => navigate("/pacientes/novo")}
				>
					<Plus className="w-4 h-4 mr-2" /> Novo Paciente
				</Button>
				<div className="w-px h-6 bg-white/20 mx-2" />
				<Button
					variant="ghost"
					className="rounded-full text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest px-4 h-12"
					onClick={() => navigate("/agenda")}
				>
					<Calendar className="w-4 h-4 mr-2" /> Agenda
				</Button>
				<Button
					variant="ghost"
					className="rounded-full text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest px-4 h-12"
					onClick={() => navigate("/financeiro")}
				>
					<DollarSign className="w-4 h-4 mr-2" /> Financeiro
				</Button>
				<Button
					variant="ghost"
					className="rounded-full text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest px-4 h-12"
					onClick={() => navigate("/comunicacoes")}
				>
					<Bell className="w-4 h-4 mr-2" />{" "}
					<span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
						3
					</span>{" "}
					Notificações
				</Button>
			</div>
		</div>
	);
};

const Plus = ({ className }: { className?: string }) => (
	<svg
		className={className}
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M5 12h14" />
		<path d="M12 5v14" />
	</svg>
);

const XCircle = ({ className }: { className?: string }) => (
	<svg
		className={className}
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<circle cx="12" cy="12" r="10" />
		<path d="m15 9-6 6" />
		<path d="m9 9 6 6" />
	</svg>
);
