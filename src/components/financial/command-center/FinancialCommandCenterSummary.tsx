import {
	Activity,
	AlertTriangle,
	ArrowRight,
	CalendarDays,
	ChevronRight,
	ClipboardList,
	FileSpreadsheet,
	HeartPulse,
	LineChart,
	Megaphone,
	Receipt,
	Sparkles,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	type FinancialCommandCenterAlert,
	type FinancialCommandCenterData,
} from "@/api/v2/financial";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROUTES } from "@/lib/routing/appRoutes";
import { cn, formatCurrency } from "@/lib/utils";

interface FinancialCommandCenterSummaryProps {
	data: FinancialCommandCenterData;
	onNewTransaction: () => void;
}

function alertToneClasses(tone: FinancialCommandCenterAlert["tone"]) {
	if (tone === "critical") {
		return "border-rose-200/80 bg-rose-50/90 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-100";
	}

	if (tone === "warning") {
		return "border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100";
	}

	return "border-sky-200/80 bg-sky-50/90 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100";
}

function toneBadgeClasses(tone: FinancialCommandCenterAlert["tone"]) {
	if (tone === "critical") return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
	if (tone === "warning") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
	return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function StatCard({
	label,
	value,
	description,
	icon: Icon,
	tone = "default",
}: {
	label: string;
	value: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	tone?: "default" | "success" | "warning" | "danger";
}) {
	return (
		<Card className="overflow-hidden rounded-3xl border-white/70 bg-white/90 shadow-[0_20px_70px_-45px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
			<CardContent className="p-5">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
							{label}
						</p>
						<p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
							{value}
						</p>
						<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
							{description}
						</p>
					</div>
					<div
						className={cn(
							"rounded-2xl p-3",
							tone === "success" && "bg-emerald-500/10 text-emerald-600",
							tone === "warning" && "bg-amber-500/10 text-amber-600",
							tone === "danger" && "bg-rose-500/10 text-rose-600",
							tone === "default" && "bg-primary/10 text-primary",
						)}
					>
						<Icon className="h-5 w-5" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function QuickAction({
	to,
	label,
	description,
	icon: Icon,
}: {
	to: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
}) {
	return (
		<Link
			to={to}
			className="group flex min-w-[200px] items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-[0_18px_40px_-35px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/70 dark:hover:border-primary/40"
		>
			<div className="flex items-center gap-3">
				<div className="rounded-2xl bg-primary/10 p-2 text-primary">
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<p className="text-sm font-bold text-slate-950 dark:text-white">
						{label}
					</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{description}
					</p>
				</div>
			</div>
			<ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
		</Link>
	);
}

export function FinancialCommandCenterSummary({
	data,
	onNewTransaction,
}: FinancialCommandCenterSummaryProps) {
	const growthPositive = data.summary.monthlyGrowth >= 0;

	return (
		<div className="space-y-6">
			<div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
				<Card className="overflow-hidden rounded-[28px] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,248,255,0.94),rgba(238,252,246,0.88))] shadow-[0_30px_90px_-55px_rgba(37,99,235,0.45)] dark:border-primary/20 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(17,24,39,0.92),rgba(6,78,59,0.18))]">
					<CardContent className="flex h-full flex-col justify-between gap-6 p-5 md:p-6">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="space-y-3">
								<Badge className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-200">
									Command Center Financeiro
								</Badge>
								<div className="space-y-2">
									<h2 className="max-w-2xl text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
										O financeiro agora abre pelo que realmente exige decisão.
									</h2>
									<p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
										Período {data.period.label.toLowerCase()} com visão unificada
										de caixa, cobranças, agenda, CRM e marketing.
									</p>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								<Button
									onClick={onNewTransaction}
									className="h-10 rounded-2xl px-5 font-bold shadow-sm"
								>
									Nova transação
								</Button>
								<Button
									asChild
									variant="outline"
									className="h-10 rounded-2xl border-primary/20 bg-white/70 px-5 font-bold dark:bg-slate-950/40"
								>
									<Link to={`${APP_ROUTES.FINANCIAL}?tab=collections`}>
										Ir para cobrança
									</Link>
								</Button>
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-3">
							<div className="rounded-3xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/40">
								<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
									Saldo do período
								</p>
								<p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
									{formatCurrency(data.summary.netBalance)}
								</p>
								<div className="mt-3 flex items-center gap-2">
									<Badge
										className={cn(
											"rounded-full border-0 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
											growthPositive
												? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
												: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
										)}
									>
										{growthPositive ? (
											<TrendingUp className="mr-1 h-3 w-3" />
										) : (
											<TrendingDown className="mr-1 h-3 w-3" />
										)}
										{Math.abs(data.summary.monthlyGrowth).toFixed(1)}%
									</Badge>
									<span className="text-xs text-slate-500 dark:text-slate-400">
										vs período anterior
									</span>
								</div>
							</div>

							<div className="rounded-3xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/40">
								<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
									Receita projetada 30d
								</p>
								<p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
									{formatCurrency(data.summary.projectedNext30Days)}
								</p>
								<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
									Com ajuste de no-show e agenda futura.
								</p>
							</div>

							<div className="rounded-3xl border border-white/70 bg-white/70 p-4 dark:border-slate-800/70 dark:bg-slate-950/40">
								<p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
									Pacientes ativos
								</p>
								<p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
									{data.summary.activePatients}
								</p>
								<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
									Base em acompanhamento com impacto direto em receita e retenção.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
					<CardContent className="space-y-4 p-5 md:p-6">
						<div className="flex items-center gap-3">
							<div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-600">
								<Sparkles className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-black text-slate-950 dark:text-white">
									Ações rápidas conectadas
								</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Atalhos para os fluxos que destravam caixa.
								</p>
							</div>
						</div>

						<div className="grid gap-2">
							<QuickAction
								to={APP_ROUTES.AGENDA}
								label="Agenda"
								description="Ajustar ocupação e faltas"
								icon={CalendarDays}
							/>
							<QuickAction
								to={APP_ROUTES.PATIENTS}
								label="Pacientes"
								description="Ver risco e saldos"
								icon={Users}
							/>
							<QuickAction
								to="/crm"
								label="CRM"
								description="Atacar pipeline quente"
								icon={ClipboardList}
							/>
							<QuickAction
								to="/marketing/dashboard"
								label="Marketing"
								description="ROI, recall e referrals"
								icon={Megaphone}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
				<StatCard
					label="Receita realizada"
					value={formatCurrency(data.summary.realizedRevenue)}
					description="Entradas conciliadas no período."
					icon={TrendingUp}
					tone="success"
				/>
				<StatCard
					label="Saídas realizadas"
					value={formatCurrency(data.summary.realizedExpenses)}
					description="Despesas já executadas."
					icon={TrendingDown}
					tone="danger"
				/>
				<StatCard
					label="A receber"
					value={formatCurrency(data.summary.pendingReceivables)}
					description={`${data.collections.overdueCount} vencidas + ${data.collections.dueTodayCount} hoje`}
					icon={Wallet}
					tone="warning"
				/>
				<StatCard
					label="A pagar"
					value={formatCurrency(data.summary.pendingPayables)}
					description="Passivos abertos do financeiro."
					icon={FileSpreadsheet}
					tone="default"
				/>
				<StatCard
					label="Ticket médio"
					value={formatCurrency(data.summary.averageTicket)}
					description="Baseado em sessões atendidas."
					icon={Activity}
					tone="default"
				/>
				<StatCard
					label="Efetivação"
					value={`${data.summary.collectionRate.toFixed(0)}%`}
					description="Lançamentos liquidados no período."
					icon={LineChart}
					tone="default"
				/>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.6fr_0.95fr]">
				<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
					<CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
						<div>
							<CardTitle className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
								Fluxo de caixa do período
							</CardTitle>
							<p className="text-sm text-slate-500 dark:text-slate-400">
								Entradas, saídas e saldo acumulado numa mesma leitura.
							</p>
						</div>
						<Button
							asChild
							variant="ghost"
							className="rounded-2xl text-xs font-bold"
						>
							<Link to={`${APP_ROUTES.FINANCIAL}?tab=cashflow`}>
								Abrir fluxo
								<ArrowRight className="ml-2 h-3.5 w-3.5" />
							</Link>
						</Button>
					</CardHeader>
					<CardContent className="space-y-4 pt-2">
						<div className="grid gap-3 sm:grid-cols-3">
							<div className="rounded-2xl bg-emerald-500/8 p-3">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/70 dark:text-emerald-300/70">
									Entradas
								</p>
								<p className="mt-2 text-xl font-black text-emerald-700 dark:text-emerald-300">
									{formatCurrency(data.cashflow.totals.income)}
								</p>
							</div>
							<div className="rounded-2xl bg-rose-500/8 p-3">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700/70 dark:text-rose-300/70">
									Saídas
								</p>
								<p className="mt-2 text-xl font-black text-rose-700 dark:text-rose-300">
									{formatCurrency(data.cashflow.totals.expense)}
								</p>
							</div>
							<div className="rounded-2xl bg-primary/8 p-3">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
									Saldo acumulado
								</p>
								<p className="mt-2 text-xl font-black text-slate-950 dark:text-white">
									{formatCurrency(data.cashflow.totals.balance)}
								</p>
							</div>
						</div>

						<div className="h-[280px] w-full">
							<SafeResponsiveContainer className="h-full" minHeight={280}>
								<AreaChart data={data.cashflow.points}>
									<defs>
										<linearGradient id="command-center-income" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
											<stop offset="100%" stopColor="#10b981" stopOpacity={0} />
										</linearGradient>
										<linearGradient id="command-center-expense" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#ef4444" stopOpacity={0.24} />
											<stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} strokeDasharray="4 6" stroke="#E2E8F0" />
									<XAxis
										dataKey="label"
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#64748b", fontSize: 12 }}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#64748b", fontSize: 12 }}
										tickFormatter={(value) => `R$${Math.round(value / 1000)}k`}
									/>
									<Tooltip
										formatter={(value: number) => formatCurrency(Number(value))}
										contentStyle={{
											borderRadius: "18px",
											border: "1px solid rgba(226,232,240,0.8)",
											boxShadow: "0 24px 60px -40px rgba(15,23,42,0.45)",
										}}
									/>
									<Area
										type="monotone"
										dataKey="income"
										stroke="#10b981"
										fill="url(#command-center-income)"
										strokeWidth={2.5}
									/>
									<Area
										type="monotone"
										dataKey="expense"
										stroke="#ef4444"
										fill="url(#command-center-expense)"
										strokeWidth={2.5}
									/>
									<Line
										type="monotone"
										dataKey="balance"
										stroke="hsl(var(--primary))"
										strokeWidth={2.5}
										dot={false}
									/>
								</AreaChart>
							</SafeResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
								<AlertTriangle className="h-4 w-4 text-amber-500" />
								Alertas operacionais
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{data.alerts.length === 0 ? (
								<div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-100">
									Nenhum alerta crítico no momento. O hub segue estável para o
									período selecionado.
								</div>
							) : (
								data.alerts.map((alert) => (
									<Link
										key={alert.id}
										to={alert.href}
										className={cn(
											"block rounded-2xl border p-4 transition-all hover:-translate-y-0.5",
											alertToneClasses(alert.tone),
										)}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="space-y-2">
												<Badge className={cn("rounded-full border-0 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]", toneBadgeClasses(alert.tone))}>
													{alert.tone === "critical"
														? "Crítico"
														: alert.tone === "warning"
															? "Atenção"
															: "Monitorar"}
												</Badge>
												<div>
													<p className="text-sm font-black">{alert.title}</p>
													<p className="mt-1 text-xs opacity-80">
														{alert.description}
													</p>
												</div>
											</div>
											<ChevronRight className="mt-1 h-4 w-4 opacity-60" />
										</div>
									</Link>
								))
							)}
						</CardContent>
					</Card>

					<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
								<Wallet className="h-4 w-4 text-primary" />
								Cobrança prioritária
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{data.collections.topAccounts.length === 0 ? (
								<p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
									Não há contas em aberto relevantes no momento.
								</p>
							) : (
								data.collections.topAccounts.map((account) => (
									<div
										key={account.id}
										className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-sm font-bold text-slate-950 dark:text-white">
													{account.patientName}
												</p>
												<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
													{account.description}
												</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-black text-slate-950 dark:text-white">
													{formatCurrency(account.amount)}
												</p>
												<p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
													Vence {account.dueDate || "sem data"}
												</p>
											</div>
										</div>
									</div>
								))
							)}
							<Button
								asChild
								variant="outline"
								className="w-full rounded-2xl font-bold"
							>
								<Link to={`${APP_ROUTES.FINANCIAL}?tab=collections`}>
									Abrir central de cobrança
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<div className="grid gap-4 xl:grid-cols-[1.05fr_1.05fr_0.9fr]">
				<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
							<HeartPulse className="h-4 w-4 text-rose-500" />
							Pacientes com risco financeiro
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.integrations.patients.riskPatients.length === 0 ? (
							<p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
								Nenhum paciente em destaque por saldo ou faltas no período.
							</p>
						) : (
							data.integrations.patients.riskPatients.map((patient) => (
								<div
									key={patient.id}
									className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-sm font-bold text-slate-950 dark:text-white">
												{patient.fullName}
											</p>
											<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
												Última sessão: {patient.lastAppointment || "sem registro"} • {patient.missedCount} faltas
											</p>
										</div>
										<p className="text-sm font-black text-rose-600">
											{formatCurrency(patient.openAmount)}
										</p>
									</div>
								</div>
							))
						)}
						<Button
							asChild
							variant="ghost"
							className="rounded-2xl px-0 text-xs font-bold"
						>
							<Link to={APP_ROUTES.PATIENTS}>
								Abrir pacientes
								<ArrowRight className="ml-2 h-3.5 w-3.5" />
							</Link>
						</Button>
					</CardContent>
				</Card>

				<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
							<ClipboardList className="h-4 w-4 text-primary" />
							CRM + Marketing no caixa
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-2xl bg-primary/8 p-4">
								<p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/70">
									Pipeline ativo
								</p>
								<p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
									{data.integrations.crm.pipelineLeads}
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									{data.integrations.crm.hotLeads} leads quentes • estágio líder{" "}
									{data.integrations.crm.topStage.name}
								</p>
							</div>
							<div className="rounded-2xl bg-emerald-500/8 p-4">
								<p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700/70 dark:text-emerald-300/70">
									Marketing acionável
								</p>
								<p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
									{data.integrations.marketing.recallActive}
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									recalls ativos • {data.integrations.marketing.referralRedemptions} referrals no período
								</p>
							</div>
						</div>

						<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-sm font-bold text-slate-950 dark:text-white">
										Tarefas atrasadas no CRM
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										{data.integrations.crm.overdueTasks} atrasadas • {data.integrations.crm.openTasks} abertas
									</p>
								</div>
								<Button
									asChild
									variant="outline"
									className="rounded-2xl font-bold"
								>
									<Link to="/crm">Abrir CRM</Link>
								</Button>
							</div>
						</div>

						<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-sm font-bold text-slate-950 dark:text-white">
										Agenda com impacto em receita
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										{data.integrations.schedule.scheduledNext7Days} sessões em 7 dias • no-show recente {(data.integrations.schedule.noShowRate90d * 100).toFixed(1)}%
									</p>
								</div>
								<Button
									asChild
									variant="outline"
									className="rounded-2xl font-bold"
								>
									<Link to={APP_ROUTES.AGENDA}>Ver agenda</Link>
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="grid gap-4">
					<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
								<Receipt className="h-4 w-4 text-primary" />
								Documentos
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-900/60">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
									Recibos emitidos
								</p>
								<p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
									{data.documents.receiptsInPeriod}
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									Último número #{data.documents.lastReceiptNumber}
								</p>
							</div>
							<div className="rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-900/60">
								<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
									NFS-e
								</p>
								<p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
									{data.documents.pendingNfse}
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									pendentes • {data.documents.authorizedNfse} autorizadas • {data.documents.failedNfse} com erro
								</p>
							</div>
							<Button
								asChild
								variant="outline"
								className="w-full rounded-2xl font-bold"
							>
								<Link to={`${APP_ROUTES.FINANCIAL}?tab=documents`}>
									Abrir documentos
								</Link>
							</Button>
						</CardContent>
					</Card>

					<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
						<CardHeader className="pb-2">
							<CardTitle className="text-base font-black text-slate-950 dark:text-white">
								Próximos movimentos
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{data.suggestions.length === 0 ? (
								<p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
									Sem sugestões adicionais para o período atual.
								</p>
							) : (
								data.suggestions.map((suggestion) => (
									<Link
										key={suggestion.id}
										to={suggestion.href}
										className="block rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/60"
									>
										<p className="text-sm font-bold text-slate-950 dark:text-white">
											{suggestion.title}
										</p>
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											{suggestion.description}
										</p>
									</Link>
								))
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
