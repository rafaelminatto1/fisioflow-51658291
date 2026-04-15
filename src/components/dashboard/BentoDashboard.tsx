import {
	AlertCircle,
	Calendar,
	ChevronRight,
	ClipboardCheck,
	DollarSign,
	Users,
} from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import {
	AreaChart,
	Area,
	CartesianGrid,
	Tooltip,
	XAxis,
} from "recharts";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardViewMode } from "@/hooks/useSmartDashboard";
import { useSmartDashboardData } from "@/hooks/useSmartDashboard";

interface BentoDashboardProps {
	viewMode?: DashboardViewMode;
}

export const BentoDashboard: React.FC<BentoDashboardProps> = ({ viewMode = "today" }) => {
	const navigate = useNavigate();

	const { data, isLoading: metricsLoading } = useSmartDashboardData(viewMode);
	const metrics = data?.metrics;
	const appointments = data?.appointmentsToday || [];

	if (metricsLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{[1, 2, 3, 4, 5].map((i) => (
					<Skeleton key={i} className="h-32 w-full rounded-3xl" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-6 md:space-y-8 animate-fade-in pb-10 max-w-[1600px] mx-auto">
			{/* Top 3 operational KPIs */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{/* Agenda & Ocupação */}
				<Card
					className="rounded-[2.5rem] border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-white dark:bg-slate-900 overflow-hidden relative group cursor-pointer"
					onClick={() => navigate("/agenda")}
				>
					<div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700">
						<Calendar className="w-24 h-24 text-primary" />
					</div>
					<CardContent className="p-7 relative z-10">
						<p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
							Agenda & Ocupação
						</p>
						<div className="flex items-baseline gap-2">
							<h3 className="font-display text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
								{metrics?.appointmentsToday || 0}
							</h3>
							<span className="text-xs font-bold text-slate-400">Pacientes</span>
						</div>
						<div className="mt-4 flex items-center gap-3">
							<div className="flex-1">
								<div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
									<span>Ocupação</span>
									<span className="text-primary">{metrics?.occupancyRate || 0}%</span>
								</div>
								<Progress value={metrics?.occupancyRate || 0} className="h-1 bg-slate-100" />
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Evoluções Pendentes */}
				<Card
					className={cn(
						"rounded-[2.5rem] border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden relative group cursor-pointer",
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

				{/* Financeiro Hoje */}
				<Card className="rounded-[2.5rem] bg-white dark:bg-slate-950 border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden relative group">
					<div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
						<DollarSign className="w-20 h-20" />
					</div>
					<CardContent className="p-6 relative z-10">
						<p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
							Receita Hoje (Confirmada)
						</p>
						<h3 className="text-4xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">
							R$ {metrics?.financialToday.received.toLocaleString("pt-BR")}
						</h3>
						<div className="flex items-center gap-2 mt-4">
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

			{/* Bento Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 auto-rows-[240px]">
				{/* Agenda do Dia */}
				<Card className="lg:col-span-8 lg:row-span-2 rounded-[3.5rem] border-none shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden group">
					<CardHeader className="px-10 pt-10 pb-6 flex flex-row items-center justify-between">
						<div>
							<p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
								Fluxo de Atendimento
							</p>
							<CardTitle className="font-display text-3xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
								Agenda Inteligente
							</CardTitle>
						</div>
						<Button
							variant="ghost"
							className="rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 font-display font-bold text-[10px] uppercase tracking-widest h-11 px-6 transition-all"
							onClick={() => navigate("/agenda")}
						>
							Ver Tudo <ChevronRight className="w-3 h-3 ml-2" />
						</Button>
					</CardHeader>
					<CardContent className="px-6 pb-10 h-[calc(100%-120px)] overflow-y-auto scrollbar-hide">
						{appointments.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-20">
								<Calendar className="w-16 h-16 mb-4" />
								<p className="text-sm font-bold">Nenhum agendamento ativo.</p>
							</div>
						) : (
							<div className="space-y-4 px-4">
								{appointments.map((apt: any) => (
									<div
										key={apt.id}
										className="flex items-center justify-between p-6 bg-[#f7f9fb] dark:bg-slate-900/50 rounded-[2rem] hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all duration-300 group/item cursor-pointer border border-transparent hover:border-slate-100"
									>
										<div className="flex items-center gap-6">
											<div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm group-hover/item:shadow-md transition-all">
												<span className="text-sm font-black text-primary">
													{apt.appointment_time || apt.time}
												</span>
											</div>
											<div>
												<h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
													{apt.patient_name}
												</h4>
												<Badge variant="outline" className="text-[8px] font-black uppercase border-slate-100 px-3 mt-1">
													RPG / Pilates
												</Badge>
											</div>
										</div>
										<Badge
											className={cn(
												"rounded-xl px-6 h-10 text-[10px] font-extrabold uppercase border-none shadow-sm",
												apt.status === "completed"
													? "bg-emerald-500 text-white"
													: apt.status === "atendido"
														? "bg-primary text-white"
														: "bg-white text-slate-400 dark:bg-slate-800",
											)}
										>
											{apt.status === "completed" ? "Pronto" : apt.status === "atendido" ? "No Box" : "Espera"}
										</Badge>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recovery Forecast / Clinical Evolution */}
				<Card className="lg:col-span-4 lg:row-span-2 rounded-[3.5rem] border-none shadow-[0_4px_24px_rgba(0,0,0,0.02)] bg-white dark:bg-slate-950 overflow-hidden relative group">
					<CardHeader className="p-10 pb-6">
						<p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
							Recovery Forecast
						</p>
						<CardTitle className="font-display text-2xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
							Clinical Evolution
						</CardTitle>
					</CardHeader>
					<CardContent className="px-10 pb-10 pt-0">
						<div className="h-[200px] w-full">
							<SafeResponsiveContainer className="h-full" minHeight={200}>
								<AreaChart data={metrics?.evolutionChart || []}>
									<defs>
										<linearGradient id="colorPain" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
											<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
										</linearGradient>
										<linearGradient id="colorMobility" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
											<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
									<XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#94a3b8" }} />
									<Tooltip
										contentStyle={{
											backgroundColor: "rgba(255, 255, 255, 0.9)",
											borderRadius: "16px",
											border: "none",
											boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
										}}
									/>
									<Area
										type="monotone"
										dataKey="actualPain"
										stroke="#ef4444"
										strokeWidth={3}
										fillOpacity={1}
										fill="url(#colorPain)"
										name="Dor"
									/>
									<Area
										type="monotone"
										dataKey="actualMobility"
										stroke="#10b981"
										strokeWidth={3}
										fillOpacity={1}
										fill="url(#colorMobility)"
										name="Mobilidade"
									/>
								</AreaChart>
							</SafeResponsiveContainer>
						</div>

						<div className="mt-6 flex items-center gap-4">
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-red-400" />
								<span className="text-[10px] font-bold text-slate-400 uppercase">Dor</span>
							</div>
							<div className="flex items-center gap-1.5">
								<span className="w-3 h-3 rounded-full bg-emerald-400" />
								<span className="text-[10px] font-bold text-slate-400 uppercase">Mobilidade</span>
							</div>
						</div>

						<div className="mt-6 p-5 rounded-[2rem] bg-[#f7f9fb] dark:bg-slate-900/50">
							<div className="flex items-center gap-2 mb-1">
								<Users className="w-3 h-3 text-primary" />
								<p className="text-[10px] font-black uppercase tracking-widest text-primary">Pacientes em Evolução</p>
							</div>
							<p className="text-xs text-slate-500 font-medium leading-relaxed">
								Acompanhe a evolução clínica dos seus pacientes em{" "}
								<span
									className="text-primary font-bold cursor-pointer underline-offset-2 hover:underline"
									onClick={() => navigate("/pacientes")}
								>
									Pacientes
								</span>
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
