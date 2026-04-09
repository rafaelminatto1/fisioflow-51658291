import { CancellationRulesManager } from "@/components/schedule/settings/CancellationRulesManager";
import { NotificationSettingsManager } from "@/components/schedule/settings/NotificationSettingsManager";
import { AlertTriangle, Bell } from "lucide-react";

export function SchedulePoliciesTab() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-md">
						<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
					</div>
					<div>
						<p className="text-sm font-semibold">Cancelamento</p>
						<p className="text-xs text-muted-foreground">Antecedência mínima, limites e taxas</p>
					</div>
				</div>
				<CancellationRulesManager />
			</div>

			<div className="border-t" />

			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-md">
						<Bell className="h-4 w-4 text-violet-600 dark:text-violet-400" />
					</div>
					<div>
						<p className="text-sm font-semibold">Notificações</p>
						<p className="text-xs text-muted-foreground">Confirmações, lembretes e mensagens</p>
					</div>
				</div>
				<NotificationSettingsManager />
			</div>
		</div>
	);
}
