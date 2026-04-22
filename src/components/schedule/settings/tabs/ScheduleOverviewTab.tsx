import {
	Clock,
	Shield,
	CalendarOff,
	Palette,
	Bell,
	Users,
	CheckCircle2,
	AlertCircle,
	ArrowRight,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useCardSize } from "@/hooks/useCardSize";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";

interface KpiCardProps {
	icon: React.ReactNode;
	iconBg: string;
	iconColor: string;
	label: string;
	value: string | number;
	sublabel?: string;
	status: "success" | "warning" | "neutral";
	tab?: string;
	accent: string;
}

function KpiCard({
	icon,
	iconBg,
	iconColor,
	label,
	value,
	sublabel,
	status,
	tab,
	accent,
}: KpiCardProps) {
	const [, setSearchParams] = useSearchParams();

	const handleClick = () => {
		if (tab) {
			setSearchParams(
				(prev) => {
					prev.set("tab", tab);
					return prev;
				},
				{ replace: true },
			);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"group relative flex flex-col gap-3 p-5 rounded-2xl border text-left transition-all duration-200",
				"hover:shadow-md hover:-translate-y-0.5 overflow-hidden",
				status === "success" &&
					"bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40",
				status === "warning" &&
					"bg-amber-50/60 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40",
				status === "neutral" &&
					"bg-card border-border/60 hover:border-border",
			)}
		>
			{/* Top accent line */}
			<div
				className={cn(
					"absolute top-0 left-4 right-4 h-0.5 rounded-b-full opacity-0 transition-opacity group-hover:opacity-100",
					accent,
				)}
			/>

			{/* Header row */}
			<div className="flex items-center justify-between">
				<div
					className={cn(
						"flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
						iconBg,
						iconColor,
					)}
				>
					{icon}
				</div>
				<div
					className={cn(
						"flex h-5 w-5 items-center justify-center rounded-full transition-colors",
						status === "success"
							? "bg-emerald-100 dark:bg-emerald-900/40"
							: status === "warning"
								? "bg-amber-100 dark:bg-amber-900/40"
								: "bg-muted",
					)}
				>
					{status === "success" ? (
						<CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
					) : status === "warning" ? (
						<AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
					) : (
						<ArrowRight className="h-3 w-3 text-muted-foreground" />
					)}
				</div>
			</div>

			{/* Content */}
			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground leading-none">
					{label}
				</p>
				<p className="text-2xl font-bold leading-none tracking-tight">{value}</p>
				{sublabel && (
					<p className="text-xs text-muted-foreground leading-snug">{sublabel}</p>
				)}
			</div>
		</button>
	);
}

function SetupProgressBar({
	score,
	pendingItems,
}: {
	score: number;
	pendingItems: string[];
}) {
	const isComplete = pendingItems.length === 0;

	return (
		<div
			className={cn(
				"rounded-2xl border p-5 transition-colors",
				isComplete
					? "bg-emerald-50/60 border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-900/40"
					: "bg-amber-50/60 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900/40",
			)}
		>
			<div className="flex items-center justify-between gap-4 mb-4">
				<div className="flex items-center gap-2.5">
					<div
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-lg",
							isComplete
								? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
								: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
						)}
					>
						{isComplete ? (
							<CheckCircle2 className="h-4 w-4" />
						) : (
							<Zap className="h-4 w-4" />
						)}
					</div>
					<div>
						<p
							className={cn(
								"text-sm font-semibold",
								isComplete
									? "text-emerald-800 dark:text-emerald-300"
									: "text-amber-800 dark:text-amber-300",
							)}
						>
							{isComplete ? "Agenda 100% configurada!" : "Configuração da agenda"}
						</p>
						<p
							className={cn(
								"text-xs",
								isComplete
									? "text-emerald-700/80 dark:text-emerald-400/80"
									: "text-amber-700/80 dark:text-amber-400/80",
							)}
						>
							{isComplete
								? "Todas as configurações essenciais estão ativas"
								: `${pendingItems.length} item${pendingItems.length !== 1 ? "s" : ""} ${pendingItems.length !== 1 ? "pendentes" : "pendente"}`}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					<TrendingUp
						className={cn(
							"h-4 w-4",
							isComplete
								? "text-emerald-600 dark:text-emerald-400"
								: "text-amber-600 dark:text-amber-400",
						)}
					/>
					<span
						className={cn(
							"text-lg font-bold",
							isComplete
								? "text-emerald-700 dark:text-emerald-300"
								: "text-amber-700 dark:text-amber-300",
						)}
					>
						{score}%
					</span>
				</div>
			</div>

			{/* Progress bar */}
			<div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all duration-700",
						isComplete
							? "bg-emerald-500 dark:bg-emerald-400"
							: "bg-amber-500 dark:bg-amber-400",
					)}
					style={{ width: `${score}%` }}
				/>
			</div>

			{/* Pending list */}
			{!isComplete && (
				<ul className="mt-3 space-y-1">
					{pendingItems.map((item) => (
						<li key={item} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
							<span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
							{item}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function ScheduleOverviewTab() {
	const {
		businessHours,
		cancellationRules,
		notificationSettings,
		blockedTimes,
	} = useScheduleSettings();
	const { capacities } = useScheduleCapacity();
	const { cardSize } = useCardSize();

	const openDays = (businessHours ?? []).filter((h) => h.is_open);
	const activeBlocked = (blockedTimes ?? []).filter((b) =>
		isAfter(parseISO(b.end_date), new Date()),
	);

	const activeNotifications = notificationSettings
		? [
				notificationSettings.send_confirmation_email && "E-mail",
				notificationSettings.send_confirmation_whatsapp && "WhatsApp",
				notificationSettings.send_reminder_24h && "Lembrete 24h",
				notificationSettings.send_reminder_2h && "Lembrete 2h",
				notificationSettings.send_cancellation_notice && "Cancelamento",
			].filter(Boolean).length
		: 0;

	const weeklyHours = openDays.reduce((acc, day) => {
		if (!day.open_time || !day.close_time) return acc;
		const [oh, om] = day.open_time.split(":").map(Number);
		const [ch, cm] = day.close_time.split(":").map(Number);
		let diff = ch * 60 + cm - (oh * 60 + om);
		if (day.break_start && day.break_end) {
			const [bh, bm] = day.break_start.split(":").map(Number);
			const [ah, am] = day.break_end.split(":").map(Number);
			diff -= ah * 60 + am - (bh * 60 + bm);
		}
		return acc + diff;
	}, 0);

	// Health score calculation
	const pendingItems: string[] = [];
	if (openDays.length === 0) pendingItems.push("Nenhum dia de atendimento configurado");
	if (activeNotifications === 0) pendingItems.push("Nenhuma notificação ativa");
	if (!cancellationRules) pendingItems.push("Política de cancelamento não definida");

	const totalChecks = 3;
	const passedChecks = totalChecks - pendingItems.length;
	const score = Math.round((passedChecks / totalChecks) * 100);

	return (
		<div className="space-y-6">
			{/* KPI Grid */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<KpiCard
					icon={<Clock className="h-4 w-4" />}
					iconBg="bg-blue-100 dark:bg-blue-900/40"
					iconColor="text-blue-600 dark:text-blue-400"
					accent="bg-blue-400"
					label="Horários de Funcionamento"
					value={`${openDays.length} dia${openDays.length !== 1 ? "s" : ""}`}
					sublabel={
						weeklyHours > 0
							? `${(weeklyHours / 60).toFixed(1)}h semanais`
							: "Nenhum dia configurado"
					}
					status={openDays.length > 0 ? "success" : "warning"}
					tab="schedule"
				/>

				<KpiCard
					icon={<Users className="h-4 w-4" />}
					iconBg="bg-teal-100 dark:bg-teal-900/40"
					iconColor="text-teal-600 dark:text-teal-400"
					accent="bg-teal-400"
					label="Capacidade"
					value={`${(capacities ?? []).length} grupo${(capacities ?? []).length !== 1 ? "s" : ""}`}
					sublabel="Vagas por horário"
					status={(capacities ?? []).length > 0 ? "success" : "warning"}
					tab="schedule"
				/>

				<KpiCard
					icon={<Shield className="h-4 w-4" />}
					iconBg="bg-amber-100 dark:bg-amber-900/40"
					iconColor="text-amber-600 dark:text-amber-400"
					accent="bg-amber-400"
					label="Política de Cancelamento"
					value={
						cancellationRules
							? `${cancellationRules.min_hours_before}h`
							: "Não definido"
					}
					sublabel={
						cancellationRules?.charge_late_cancellation
							? `Taxa: R$ ${cancellationRules.late_cancellation_fee}`
							: "Sem taxa de cancelamento"
					}
					status={cancellationRules ? "success" : "warning"}
					tab="policies"
				/>

				<KpiCard
					icon={<Bell className="h-4 w-4" />}
					iconBg="bg-sky-100 dark:bg-sky-900/40"
					iconColor="text-sky-600 dark:text-sky-400"
					accent="bg-sky-400"
					label="Notificações"
					value={`${activeNotifications} ativa${activeNotifications !== 1 ? "s" : ""}`}
					sublabel="Canais configurados"
					status={activeNotifications > 0 ? "success" : "warning"}
					tab="policies"
				/>

				<KpiCard
					icon={<CalendarOff className="h-4 w-4" />}
					iconBg="bg-red-100 dark:bg-red-900/40"
					iconColor="text-red-600 dark:text-red-400"
					accent="bg-red-400"
					label="Bloqueios Ativos"
					value={activeBlocked.length}
					sublabel={
						activeBlocked.length > 0
							? `Próximo: ${format(parseISO(activeBlocked[0].start_date), "dd/MM", { locale: ptBR })}`
							: "Nenhum bloqueio ativo"
					}
					status={activeBlocked.length > 0 ? "warning" : "success"}
					tab="blocked"
				/>

				<KpiCard
					icon={<Palette className="h-4 w-4" />}
					iconBg="bg-pink-100 dark:bg-pink-900/40"
					iconColor="text-pink-600 dark:text-pink-400"
					accent="bg-pink-400"
					label="Aparência"
					value={
						cardSize === "extra_small"
							? "Compacto"
							: cardSize === "small"
								? "Pequeno"
								: cardSize === "large"
									? "Grande"
									: "Médio"
					}
					sublabel="Tamanho dos cards da agenda"
					status="neutral"
					tab="visual"
				/>
			</div>

			{/* Health Score / Setup Progress */}
			<SetupProgressBar score={score} pendingItems={pendingItems} />
		</div>
	);
}
