import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { AlertTriangle, Bell } from "lucide-react";

function SectionHeader({
	icon,
	iconBg,
	iconColor,
	title,
	description,
}: {
	icon: React.ReactNode;
	iconBg: string;
	iconColor: string;
	title: string;
	description: string;
}) {
	return (
		<div className="flex items-center gap-2 pb-3 border-b">
			<div className={`p-1.5 rounded-md ${iconBg}`}>
				<span className={iconColor}>{icon}</span>
			</div>
			<div>
				<p className="text-sm font-semibold">{title}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

export function SchedulePoliciesTab() {
	return (
		<div className="grid gap-4 lg:grid-cols-2 lg:items-start">
			{/* Cancelamento */}
			<div className="rounded-xl border bg-muted/10 p-4 space-y-4">
				<SectionHeader
					icon={<AlertTriangle className="h-4 w-4" />}
					iconBg="bg-amber-100 dark:bg-amber-900/30"
					iconColor="text-amber-600 dark:text-amber-400"
					title="Cancelamento"
					description="Antecedência mínima, limites e taxas"
				/>
				<CancellationRulesManager />
			</div>

			{/* Notificações */}
			<div className="rounded-xl border bg-muted/10 p-4 space-y-4">
				<SectionHeader
					icon={<Bell className="h-4 w-4" />}
					iconBg="bg-violet-100 dark:bg-violet-900/30"
					iconColor="text-violet-600 dark:text-violet-400"
					title="Notificações"
					description="Confirmações, lembretes e mensagens"
				/>
				<NotificationSettingsManager />
			</div>
		</div>
	);
}
