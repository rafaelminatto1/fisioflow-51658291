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
} from "lucide-react";
import { useScheduleSettings } from "@/hooks/useScheduleSettings";
import { useScheduleCapacity } from "@/hooks/useScheduleCapacity";
import { useCardSize } from "@/hooks/useCardSize";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";

interface OverviewCardProps {
	icon: React.ReactNode;
	iconBg: string;
	label: string;
	value: string | number;
	sublabel?: string;
	status: "success" | "warning" | "neutral";
	tab?: string;
}

function OverviewCard({
	icon,
	iconBg,
	label,
	value,
	sublabel,
	status,
	tab,
}: OverviewCardProps) {
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
				"flex items-start gap-3 p-4 rounded-xl border text-left transition-all hover:shadow-sm hover:border-primary/30",
				status === "success" && "bg-emerald-50/50 dark:bg-emerald-950/20",
				status === "warning" && "bg-amber-50/50 dark:bg-amber-950/20",
				status === "neutral" && "bg-muted/30",
			)}
		>
			<div className={cn("p-2 rounded-lg shrink-0", iconBg)}>{icon}</div>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="text-lg font-bold mt-0.5">{value}</p>
				{sublabel && (
					<p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
				)}
			</div>
			<ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
		</button>
	);
}

export function ScheduleOverviewTab() {
	const {
		businessHours,
		cancellationRules,
		notificationSettings,
		blockedTimes,
		daysOfWeek,
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

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-base font-bold">Visão Geral</h2>
				<p className="text-sm text-muted-foreground">
					Resumo rápido de todas as configurações da agenda
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<OverviewCard
					icon={<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
					iconBg="bg-blue-100 dark:bg-blue-900/30"
					label="Horários de Funcionamento"
					value={`${openDays.length} dia${openDays.length !== 1 ? "s" : ""}`}
					sublabel={
						weeklyHours > 0
							? `${(weeklyHours / 60).toFixed(1)}h semanais`
							: undefined
					}
					status={openDays.length > 0 ? "success" : "warning"}
					tab="schedule"
				/>

				<OverviewCard
					icon={
						<Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
					}
					iconBg="bg-emerald-100 dark:bg-emerald-900/30"
					label="Capacidade"
					value={`${(capacities ?? []).length} grupo${(capacities ?? []).length !== 1 ? "s" : ""}`}
					sublabel="Vagas por horário"
					status={(capacities ?? []).length > 0 ? "success" : "warning"}
					tab="schedule"
				/>

				<OverviewCard
					icon={
						<Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
					}
					iconBg="bg-amber-100 dark:bg-amber-900/30"
					label="Política de Cancelamento"
					value={
						cancellationRules
							? `${cancellationRules.min_hours_before}h de antecedência`
							: "Não configurado"
					}
					sublabel={
						cancellationRules?.charge_late_cancellation
							? `Taxa: R$ ${cancellationRules.late_cancellation_fee}`
							: "Sem taxa"
					}
					status={cancellationRules ? "success" : "warning"}
					tab="policies"
				/>

				<OverviewCard
					icon={
						<Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
					}
					iconBg="bg-violet-100 dark:bg-violet-900/30"
					label="Notificações"
					value={`${activeNotifications} ativa${activeNotifications !== 1 ? "s" : ""}`}
					sublabel="Canais configurados"
					status={activeNotifications > 0 ? "success" : "warning"}
					tab="policies"
				/>

				<OverviewCard
					icon={
						<CalendarOff className="h-4 w-4 text-red-600 dark:text-red-400" />
					}
					iconBg="bg-red-100 dark:bg-red-900/30"
					label="Bloqueios Ativos"
					value={activeBlocked.length}
					sublabel={
						activeBlocked.length > 0
							? `Próximo: ${format(parseISO(activeBlocked[0].start_date), "dd/MM", { locale: ptBR })}`
							: "Nenhum bloqueio"
					}
					status={activeBlocked.length > 0 ? "warning" : "success"}
					tab="blocked"
				/>

				<OverviewCard
					icon={
						<Palette className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
					}
					iconBg="bg-fuchsia-100 dark:bg-fuchsia-900/30"
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
					sublabel="Tamanho dos cards"
					status="neutral"
					tab="visual"
				/>
			</div>

			{(openDays.length === 0 ||
				activeNotifications === 0 ||
				!cancellationRules) && (
				<div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
					<div className="flex items-start gap-3">
						<AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
								Configurações pendentes
							</p>
							<ul className="mt-1.5 space-y-1">
								{openDays.length === 0 && (
									<li className="text-xs text-amber-700 dark:text-amber-400">
										Nenhum dia de atendimento configurado
									</li>
								)}
								{activeNotifications === 0 && (
									<li className="text-xs text-amber-700 dark:text-amber-400">
										Nenhuma notificação ativa
									</li>
								)}
								{!cancellationRules && (
									<li className="text-xs text-amber-700 dark:text-amber-400">
										Política de cancelamento não definida
									</li>
								)}
							</ul>
						</div>
					</div>
				</div>
			)}

			{openDays.length > 0 && activeNotifications > 0 && cancellationRules && (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4">
					<div className="flex items-center gap-3">
						<CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
						<div>
							<p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
								Tudo configurado
							</p>
							<p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
								Todas as configurações essenciais da agenda estão ativas
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
