import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
} from "@/components/ui/chart";
import {
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
	XAxis,
	YAxis,
	ResponsiveContainer,
} from "recharts";
import { TrendingUp, Activity, Calendar, Users } from "lucide-react";

interface PatientAnalyticsProps {
	totalPatients: number;
	classificationStats: {
		active: number;
		inactive7: number;
		inactive30: number;
		inactive60: number;
		noShowRisk: number;
		hasUnpaid: number;
		newPatients: number;
		completed: number;
	};
}

const chartConfig = {
	active: {
		label: "Ativos",
		color: "#10b981",
	},
	inactive7: {
		label: "Inativos 7d",
		color: "#f59e0b",
	},
	inactive30: {
		label: "Inativos 30d",
		color: "#ef4444",
	},
	inactive60: {
		label: "Inativos 60d+",
		color: "#6b7280",
	},
	noShowRisk: {
		label: "Risco No-Show",
		color: "#f97316",
	},
	hasUnpaid: {
		label: "Com Pendências",
		color: "#eab308",
	},
	newPatients: {
		label: "Novos",
		color: "#3b82f6",
	},
	completed: {
		label: "Concluídos",
		color: "#22c55e",
	},
};

export function PatientAnalytics({
	totalPatients,
	classificationStats,
}: PatientAnalyticsProps) {
	// Dados para o gráfico de barras - Distribuição de Classificações
	const classificationData = [
		{ name: "Ativos", value: classificationStats.active, fill: chartConfig.active.color },
		{ name: "Novos", value: classificationStats.newPatients, fill: chartConfig.newPatients.color },
		{ name: "Risco", value: classificationStats.noShowRisk, fill: chartConfig.noShowRisk.color },
		{ name: "Pendentes", value: classificationStats.hasUnpaid, fill: chartConfig.hasUnpaid.color },
		{ name: "Inativos", value: classificationStats.inactive7 + classificationStats.inactive30 + classificationStats.inactive60, fill: chartConfig.inactive30.color },
	];

	// Dados para o gráfico de pizza - Visão Geral
	const overviewData = [
		{ name: "Ativos", value: classificationStats.active, color: chartConfig.active.color },
		{ name: "Inativos", value: classificationStats.inactive7 + classificationStats.inactive30 + classificationStats.inactive60, color: chartConfig.inactive30.color },
		{ name: "Concluídos", value: classificationStats.completed, color: chartConfig.completed.color },
		{ name: "Novos", value: classificationStats.newPatients, color: chartConfig.newPatients.color },
	];

	// Calcular porcentagens
	const activePercentage = totalPatients > 0 ? ((classificationStats.active / totalPatients) * 100).toFixed(1) : "0";
	const riskPercentage = totalPatients > 0 ? ((((classificationStats.noShowRisk + classificationStats.hasUnpaid) / totalPatients) * 100)).toFixed(1) : "0";
	const newPatientsPercentage = totalPatients > 0 ? ((classificationStats.newPatients / totalPatients) * 100).toFixed(1) : "0";

	return (
		<div className="space-y-8 p-1">
			{/* Métricas Principais - Premium Glass Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<AnalyticsMiniCard
					label="Taxa de Atividade"
					value={`${activePercentage}%`}
					icon={Activity}
					color="emerald"
					description="Pacientes com tratamento em dia"
				/>
				<AnalyticsMiniCard
					label="Risco de Evasão"
					value={`${riskPercentage}%`}
					icon={TrendingUp}
					color="orange"
					description="Risco de no-show ou pendências"
				/>
				<AnalyticsMiniCard
					label="Crescimento"
					value={`${newPatientsPercentage}%`}
					icon={Users}
					color="blue"
					description="Novos pacientes este mês"
				/>
			</div>

			{/* Gráficos em Containers de Vidro */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<Card className="rounded-[2rem] border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-premium overflow-hidden border">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
							Fluxo de Classificação
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[240px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={classificationData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
									<XAxis
										dataKey="name"
										tick={{ fontSize: 10, fontWeight: 800 }}
										tickLine={false}
										axisLine={false}
									/>
									<YAxis
										tick={{ fontSize: 10, fontWeight: 800 }}
										tickLine={false}
										axisLine={false}
									/>
									<ChartTooltip content={<ChartTooltipContent className="rounded-2xl shadow-2xl border-none backdrop-blur-xl" />} />
									<Bar 
										dataKey="value" 
										radius={[12, 12, 12, 12]} 
										barSize={40}
										animationDuration={1500}
									/>
								</BarChart>
							</ResponsiveContainer>
						</ChartContainer>
					</CardContent>
				</Card>

				<Card className="rounded-[2rem] border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-premium overflow-hidden border">
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">
							Composição da Base
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[240px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={overviewData}
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={80}
										paddingAngle={8}
										dataKey="value"
										animationDuration={1500}
									>
										{overviewData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
										))}
									</Pie>
									<ChartTooltip content={<ChartTooltipContent className="rounded-2xl shadow-2xl border-none backdrop-blur-xl" />} />
								</PieChart>
							</ResponsiveContainer>
						</ChartContainer>
						<div className="flex flex-wrap justify-center gap-4 mt-2">
							{overviewData.map((item) => (
								<div key={item.name} className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
									<span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.name}</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Insights e Recomendações - Premium Flow */}
			<div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 p-8">
				<div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
					<div className="h-16 w-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
						<Calendar className="h-8 w-8" />
					</div>
					<div className="space-y-4 flex-1">
						<h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">IA Clinical Insights & Ações</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{classificationStats.noShowRisk > 0 && (
								<InsightPill 
									icon="⚠️" 
									color="orange"
									text={`Contacte os ${classificationStats.noShowRisk} pacientes em risco de no-show.`}
								/>
							)}
							{classificationStats.inactive30 > 0 && (
								<InsightPill 
									icon="🔴" 
									color="red"
									text={`${classificationStats.inactive30} pacientes inativos há mais de 30 dias.`}
								/>
							)}
							{parseFloat(activePercentage) > 70 && (
								<InsightPill 
									icon="✅" 
									color="emerald"
									text="Excelente taxa de atividade! Engajamento acima da média."
								/>
							)}
							{classificationStats.newPatients > 0 && (
								<InsightPill 
									icon="📈" 
									color="blue"
									text={`${classificationStats.newPatients} novos pacientes. Foco no onboarding.`}
								/>
							)}
						</div>
					</div>
				</div>
				<div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
			</div>
		</div>
	);
}

function AnalyticsMiniCard({ label, value, icon: Icon, color, description }: { 
	label: string, 
	value: string, 
	icon: any, 
	color: 'emerald' | 'orange' | 'blue',
	description: string
}) {
	const colors = {
		emerald: "from-emerald-500/20 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
		orange: "from-orange-500/20 text-orange-600 bg-orange-500/10 border-orange-500/20 shadow-orange-500/5",
		blue: "from-blue-500/20 text-blue-600 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
	};

	return (
		<div className={cn(
			"group relative overflow-hidden p-6 rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
			colors[color]
		)}>
			<div className="relative z-10 flex items-start justify-between">
				<div className="space-y-2">
					<p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</p>
					<h4 className="text-4xl font-black tracking-tighter">{value}</h4>
					<p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">{description}</p>
				</div>
				<div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110", colors[color])}>
					<Icon className="h-6 w-6" />
				</div>
			</div>
			<div className="absolute bottom-0 right-0 -mr-4 -mb-4 w-24 h-24 bg-gradient-to-br opacity-10 rounded-full blur-2xl transition-all duration-500 group-hover:scale-150" />
		</div>
	);
}

function InsightPill({ icon, text, color }: { icon: string, text: string, color: 'orange' | 'red' | 'emerald' | 'blue' }) {
	const colors = {
		orange: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200/50",
		red: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200/50",
		emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50",
		blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/50",
	};

	return (
		<div className={cn("flex items-center gap-3 p-3 rounded-2xl border backdrop-blur-sm transition-all hover:translate-x-1", colors[color])}>
			<span className="text-lg">{icon}</span>
			<p className="text-xs font-bold leading-tight">{text}</p>
		</div>
	);
}
